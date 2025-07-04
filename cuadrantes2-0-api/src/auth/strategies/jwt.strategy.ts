import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModel, UserPayload } from '../auth.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Passport verifica el token y si es válido, llama a este método con el payload decodificado
  validate(payload: AuthModel): UserPayload {
    // Lo que retornemos aquí se adjuntará a request.user
    return {
      userId: payload.sub,
      username: payload.username,
      permisos: payload.permisos,
    };
  }
}
