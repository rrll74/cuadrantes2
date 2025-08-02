import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '@/newdatabase/users/users.module';
import { TokenDenylistService } from './token-denylist.service';
import { AuthLockdownService } from './auth-lockdown.service';
import { StatusModule } from '@/status/status.module';

@Module({
  imports: [
    // Usamos forwardRef para romper la dependencia circular:
    // AuthModule -> UsersModule -> StatusModule -> AuthModule
    forwardRef(() => UsersModule),
    forwardRef(() => StatusModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    TokenDenylistService,
    AuthLockdownService, // Registramos el nuevo servicio
  ],
  // Exportamos los servicios para que otros módulos los usen
  exports: [JwtModule, TokenDenylistService, AuthLockdownService],
})
export class AuthModule {}
