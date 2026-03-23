import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  providers: [JwtStrategy, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
