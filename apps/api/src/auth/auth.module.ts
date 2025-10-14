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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Usamos getOrThrow para asegurar que JWT_SECRET existe.
        // Si no, la aplicación fallará al iniciar con un error claro.
        // Esto garantiza a TypeScript que el valor nunca será 'undefined'.
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // La librería acepta un número de segundos.
          expiresIn: parseInt(configService.get('JWT_EXPIRATION', '3600'), 10),
        },
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
