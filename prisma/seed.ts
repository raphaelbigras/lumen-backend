import { PrismaClient, TicketStatus, TicketPriority, Role } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  'Réseau',
  'Logiciel',
  'Matériel',
  'Accès / Permissions',
  'Messagerie',
  'Autre',
];

async function main() {
  // Seed default categories
  for (const name of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, isDefault: true },
    });
  }
  console.log('Seeded default categories');

  // Create departments
  const itDept = await prisma.department.upsert({
    where: { name: 'IT Support' },
    update: {},
    create: { name: 'IT Support' },
  });

  const hrDept = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' },
  });

  const facilitiesDept = await prisma.department.upsert({
    where: { name: 'Facilities' },
    update: {},
    create: { name: 'Facilities' },
  });

  const financeDept = await prisma.department.upsert({
    where: { name: 'Finance' },
    update: {},
    create: { name: 'Finance' },
  });

  // Create seed users (these are local DB records; keycloakId is a placeholder)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lumen.local' },
    update: {},
    create: {
      keycloakId: 'seed-admin-001',
      email: 'admin@lumen.local',
      firstName: 'Alice',
      lastName: 'Admin',
      role: Role.ADMIN,
      departmentId: itDept.id,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@lumen.local' },
    update: {},
    create: {
      keycloakId: 'seed-agent-001',
      email: 'agent@lumen.local',
      firstName: 'Bob',
      lastName: 'Agent',
      role: Role.AGENT,
      departmentId: itDept.id,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user1@lumen.local' },
    update: {},
    create: {
      keycloakId: 'seed-user-001',
      email: 'user1@lumen.local',
      firstName: 'Charlie',
      lastName: 'Brown',
      role: Role.USER,
      departmentId: hrDept.id,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@lumen.local' },
    update: {},
    create: {
      keycloakId: 'seed-user-002',
      email: 'user2@lumen.local',
      firstName: 'Diana',
      lastName: 'Prince',
      role: Role.USER,
      departmentId: financeDept.id,
    },
  });

  // Create tags
  const tags = await Promise.all(
    ['hardware', 'software', 'network', 'access', 'email', 'onboarding', 'vpn', 'printer'].map(
      (name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
    ),
  );

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]));

  // 25 test tickets
  const tickets = [
    { title: 'Laptop won\'t turn on after update', description: 'My laptop installed a Windows update overnight and now it shows a blue screen on boot. Model: Dell Latitude 5540. I have a client presentation tomorrow morning.', status: TicketStatus.OPEN, priority: TicketPriority.CRITICAL, submitter: user1, dept: itDept, tags: ['hardware'] },
    { title: 'Cannot connect to VPN from home', description: 'Getting "connection timed out" when trying to connect to GlobalProtect VPN. Was working fine last week. I\'ve restarted my router and laptop.', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH, submitter: user2, dept: itDept, tags: ['vpn', 'network'] },
    { title: 'New hire onboarding - Sarah Chen', description: 'Sarah Chen starts in Finance on April 1st. Need email account, laptop, badge access to 3rd floor, and access to SAP and SharePoint Finance folder.', status: TicketStatus.OPEN, priority: TicketPriority.MEDIUM, submitter: user2, dept: hrDept, tags: ['onboarding', 'access'] },
    { title: 'Printer on 2nd floor jammed again', description: 'The HP LaserJet on the 2nd floor near the kitchen is jammed. Paper tray seems fine but it keeps showing "paper jam" error. This is the 3rd time this month.', status: TicketStatus.OPEN, priority: TicketPriority.LOW, submitter: user1, dept: facilitiesDept, tags: ['printer', 'hardware'] },
    { title: 'Request access to Jira project BACKEND', description: 'I need contributor access to the BACKEND project in Jira to track my tasks. My manager (David Lee) has approved this.', status: TicketStatus.RESOLVED, priority: TicketPriority.MEDIUM, submitter: user1, dept: itDept, tags: ['access', 'software'] },
    { title: 'Outlook keeps crashing on Mac', description: 'Outlook for Mac crashes every time I try to open an attachment. Version 16.82. Already tried reinstalling from the Company Portal. Affects all .xlsx files.', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH, submitter: user2, dept: itDept, tags: ['software', 'email'] },
    { title: 'Wi-Fi dropping in Building B conference rooms', description: 'During meetings in rooms B201-B205, Wi-Fi drops every 10-15 minutes. Multiple people affected. Started after last weekend\'s maintenance.', status: TicketStatus.OPEN, priority: TicketPriority.HIGH, submitter: user1, dept: itDept, tags: ['network'] },
    { title: 'Need larger monitor for design work', description: 'I\'m doing UI/UX design work and my current 22" monitor isn\'t sufficient. Requesting a 27" 4K monitor. Budget approved by my manager.', status: TicketStatus.PENDING, priority: TicketPriority.LOW, submitter: user1, dept: itDept, tags: ['hardware'] },
    { title: 'Password reset for SAP account', description: 'Locked out of my SAP account after too many failed attempts. Need a password reset. Employee ID: E-4521.', status: TicketStatus.RESOLVED, priority: TicketPriority.MEDIUM, submitter: user2, dept: itDept, tags: ['access', 'software'] },
    { title: 'Email not syncing on mobile phone', description: 'My work email stopped syncing on my iPhone since yesterday. I can access it from my laptop fine. Already removed and re-added the account.', status: TicketStatus.OPEN, priority: TicketPriority.MEDIUM, submitter: user1, dept: itDept, tags: ['email'] },
    { title: 'Request for Adobe Creative Suite license', description: 'The marketing team needs 3 additional Adobe Creative Suite licenses for the new designers starting next month. PO number: PO-2026-0892.', status: TicketStatus.PENDING, priority: TicketPriority.MEDIUM, submitter: user2, dept: itDept, tags: ['software'] },
    { title: 'Server room AC unit making noise', description: 'The AC unit in server room A is making a loud rattling noise. Temperature is still okay (68°F) but want to get it checked before it fails.', status: TicketStatus.OPEN, priority: TicketPriority.HIGH, submitter: admin, dept: facilitiesDept, tags: ['hardware'] },
    { title: 'Cannot access shared drive \\\\files\\marketing', description: 'Getting "access denied" when trying to access the marketing shared drive. I was transferred from Sales to Marketing last week and need access to campaign files.', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.MEDIUM, submitter: user1, dept: itDept, tags: ['access', 'network'] },
    { title: 'Zoom meeting room setup for Board Room', description: 'The Board Room on the 5th floor needs a permanent Zoom Rooms setup before the quarterly review on April 10th. Need camera, mic, and a display.', status: TicketStatus.OPEN, priority: TicketPriority.MEDIUM, submitter: user2, dept: itDept, tags: ['hardware'] },
    { title: 'Offboarding - Mark Thompson', description: 'Mark Thompson (Engineering) last day is March 28th. Need to disable all accounts, revoke badge access, and collect laptop and equipment.', status: TicketStatus.OPEN, priority: TicketPriority.CRITICAL, submitter: admin, dept: hrDept, tags: ['onboarding', 'access'] },
    { title: 'Slack integration with GitHub not working', description: 'The GitHub notifications channel in Slack stopped posting updates 3 days ago. The integration shows as "connected" in Slack admin.', status: TicketStatus.RESOLVED, priority: TicketPriority.LOW, submitter: agent, dept: itDept, tags: ['software'] },
    { title: 'Request for standing desk', description: 'I\'d like to request a standing desk converter for my workstation. I have a doctor\'s note recommending one for back issues. Desk location: 3rd floor, seat 3-42.', status: TicketStatus.PENDING, priority: TicketPriority.LOW, submitter: user1, dept: facilitiesDept, tags: [] },
    { title: 'Two-factor authentication locked out', description: 'My phone broke and I can\'t receive 2FA codes for any work applications. Need a temporary bypass or new 2FA setup. Very urgent as I can\'t access anything.', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.CRITICAL, submitter: user2, dept: itDept, tags: ['access'] },
    { title: 'Install Python 3.12 on dev machine', description: 'Need Python 3.12 installed on my dev machine (asset tag IT-L-0892). Don\'t have admin rights to install it myself. Also need pip and virtualenv.', status: TicketStatus.OPEN, priority: TicketPriority.LOW, submitter: user1, dept: itDept, tags: ['software'] },
    { title: 'Network port dead at desk 4-18', description: 'The ethernet port at desk 4-18 on the 4th floor is not working. Tried two different cables. Need it for connecting to the lab network which isn\'t on Wi-Fi.', status: TicketStatus.OPEN, priority: TicketPriority.MEDIUM, submitter: agent, dept: itDept, tags: ['network', 'hardware'] },
    { title: 'Expense report system showing wrong manager', description: 'Concur is showing my old manager (Jane Doe) as approver. I transferred to the Data team under Mike Ross two weeks ago. Need the approval chain updated.', status: TicketStatus.OPEN, priority: TicketPriority.MEDIUM, submitter: user2, dept: financeDept, tags: ['software'] },
    { title: 'Meeting room display stuck on "offline"', description: 'The scheduling display outside room 3-A has been showing "offline" for a week. Can\'t see room availability without walking in. Tried unplugging and replugging.', status: TicketStatus.OPEN, priority: TicketPriority.LOW, submitter: user1, dept: facilitiesDept, tags: ['hardware'] },
    { title: 'Request for bulk data export from HR system', description: 'Need a CSV export of all active employees with department, start date, and job title for the annual compliance audit. Due by April 5th.', status: TicketStatus.PENDING, priority: TicketPriority.HIGH, submitter: admin, dept: hrDept, tags: ['access', 'software'] },
    { title: 'Suspicious email received - possible phishing', description: 'Received an email from "it-support@lumen-corp.com" (note: not our real domain) asking to reset my password. Did not click any links. Forwarding as attachment.', status: TicketStatus.OPEN, priority: TicketPriority.CRITICAL, submitter: user1, dept: itDept, tags: ['email'] },
    { title: 'Backup job failing on file server FS-02', description: 'Nightly backup job for file server FS-02 has been failing since March 22nd. Error: "insufficient disk space on target." Backup target is NAS-01.', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH, submitter: agent, dept: itDept, tags: ['network', 'software'] },
  ];

  for (const t of tickets) {
    const ticket = await prisma.ticket.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        submitterId: t.submitter.id,
        departmentId: t.dept.id,
      },
    });

    // Attach tags
    if (t.tags.length > 0) {
      await prisma.ticketTag.createMany({
        data: t.tags.map((tag) => ({ ticketId: ticket.id, tagId: tagMap[tag] })),
      });
    }

    // Assign agent to in-progress/resolved tickets
    if (t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.RESOLVED) {
      await prisma.ticketAssignment.create({
        data: { ticketId: ticket.id, agentId: agent.id },
      });
    }

    // Create an initial event
    await prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: t.submitter.id,
        type: 'CREATED',
        payload: { status: t.status, priority: t.priority },
      },
    });
  }

  console.log('Seeded 25 tickets with departments, users, tags, and events.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
