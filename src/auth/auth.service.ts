import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

interface CachedUser {
  user: any;
  expiresAt: number;
}

const USER_CACHE_TTL = 60_000; // 1 minute

@Injectable()
export class AuthService {
  private userCache = new Map<string, CachedUser>();

  constructor(private usersService: UsersService) {}

  async validateAndProvisionUser(payload: any) {
    const keycloakId = payload.sub;
    const keycloakRole = payload.realm_access?.roles?.includes('ADMIN') ? 'ADMIN'
      : payload.realm_access?.roles?.includes('AGENT') ? 'AGENT'
      : 'USER';

    const cached = this.userCache.get(keycloakId);
    if (cached && cached.expiresAt > Date.now() && cached.user.role === keycloakRole) {
      return cached.user;
    }

    let user = await this.usersService.findByKeycloakId(keycloakId);
    if (!user) {
      user = await this.usersService.findByEmail(payload.email);
      if (user) {
        // Seed user exists with this email — link their real Keycloak ID and sync role
        user = await this.usersService.update(user.id, { keycloakId, role: keycloakRole });
      } else {
        user = await this.usersService.create({
          keycloakId,
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          role: keycloakRole,
        });
      }
    } else if (user.role !== keycloakRole) {
      user = await this.usersService.updateRole(keycloakId, keycloakRole);
    }

    this.userCache.set(keycloakId, { user, expiresAt: Date.now() + USER_CACHE_TTL });
    return user;
  }
}
