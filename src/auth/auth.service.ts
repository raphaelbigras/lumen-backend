import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateAndProvisionUser(payload: any) {
    const keycloakId = payload.sub;
    let user = await this.usersService.findByKeycloakId(keycloakId);
    if (!user) {
      user = await this.usersService.create({
        keycloakId,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        role: payload.realm_access?.roles?.includes('admin') ? 'ADMIN'
          : payload.realm_access?.roles?.includes('agent') ? 'AGENT'
          : 'USER',
      });
    }
    return user;
  }
}
