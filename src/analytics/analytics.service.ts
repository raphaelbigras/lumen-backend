import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private repo: AnalyticsRepository) {}

  async getDashboard(user: { id: string; role: string }) {
    if (user.role === 'USER') {
      return this.getUserDashboard(user.id);
    }
    return this.getAdminDashboard();
  }

  private async getUserDashboard(userId: string) {
    const [counts, myTickets, volumeByWeek, byCategory, resolvedTickets] = await Promise.all([
      this.repo.getUserTicketCounts(userId),
      this.repo.getUserTickets(userId),
      this.repo.getUserVolumeByWeek(userId, 8),
      this.repo.getUserCountByCategoryWithNames(userId),
      this.repo.getUserResolvedTicketsWithTimes(userId),
    ]);

    const medianResolutionHours = this.computeMedianHours(resolvedTickets);

    return { ...counts, myTickets, volumeByWeek, byCategory, medianResolutionHours };
  }

  private async getAdminDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [counts, resolvedMonth, resolvedLastMonth, openThisWeek, openLastWeek, ipThisWeek, ipLastWeek, volumeByWeek, byCategory, agents, attentionNeeded, resolvedTickets, resolvedTicketsLastMonth] = await Promise.all([
      this.repo.getTicketCounts(),
      this.repo.getResolvedCount(monthStart),
      this.repo.getResolvedCount(lastMonthStart, monthStart),
      this.repo.getCreatedCountByStatusInRange('OPEN', weekAgo),
      this.repo.getCreatedCountByStatusInRange('OPEN', twoWeeksAgo, weekAgo),
      this.repo.getCreatedCountByStatusInRange('IN_PROGRESS', weekAgo),
      this.repo.getCreatedCountByStatusInRange('IN_PROGRESS', twoWeeksAgo, weekAgo),
      this.repo.getVolumeByWeek(8),
      this.repo.getCountByCategoryWithNames(),
      this.repo.getAgentPerformance(monthStart),
      this.repo.getAttentionNeeded(10),
      this.repo.getResolvedTicketsWithTimes(monthStart),
      this.repo.getResolvedTicketsWithTimes(lastMonthStart, monthStart),
    ]);

    // Compute trends
    const resolvedMonthTrend = resolvedLastMonth > 0
      ? Math.round(((resolvedMonth - resolvedLastMonth) / resolvedLastMonth) * 100)
      : 0;

    // Median resolution time
    const medianResolutionHours = this.computeMedianHours(resolvedTickets);
    const medianResolutionLastMonth = this.computeMedianHours(resolvedTicketsLastMonth);
    const medianResolutionTrend = +(medianResolutionHours - medianResolutionLastMonth).toFixed(1);

    // Agent performance
    const agentPerformance = agents.map((agent) => {
      const assignedTickets = agent.assignedTickets.map((a) => a.ticket);
      const resolved = assignedTickets.filter((t) => t.status === 'RESOLVED' && t.resolvedAt);
      const current = assignedTickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status));
      return {
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        resolvedCount: resolved.length,
        medianResolutionHours: this.computeMedianHours(resolved),
        currentAssigned: current.length,
      };
    }).sort((a, b) => b.resolvedCount - a.resolvedCount);

    return {
      kpis: {
        ...counts,
        openTrend: openLastWeek > 0 ? Math.round(((openThisWeek - openLastWeek) / openLastWeek) * 100) : 0,
        inProgressTrend: ipLastWeek > 0 ? Math.round(((ipThisWeek - ipLastWeek) / ipLastWeek) * 100) : 0,
        resolvedMonthCount: resolvedMonth,
        resolvedMonthTrend,
        medianResolutionHours,
        medianResolutionTrend,
      },
      volumeByWeek,
      byCategory,
      agentPerformance,
      attentionNeeded,
    };
  }

  private computeMedianHours(tickets: { createdAt: Date; resolvedAt: Date | null }[]): number {
    const durations = tickets
      .filter((t) => t.resolvedAt)
      .map((t) => (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60))
      .sort((a, b) => a - b);
    if (durations.length === 0) return 0;
    const mid = Math.floor(durations.length / 2);
    return +(durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2).toFixed(1);
  }
}
