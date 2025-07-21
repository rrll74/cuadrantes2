import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthModel, UserPayload } from '../auth.model';
import { TokenDenylistService } from '../token-denylist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly tokenDenylistService: TokenDenylistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Passport verifica el token y si es válido, llama a este método con el payload decodificado
  validate(req: Request, payload: AuthModel): UserPayload {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token || this.tokenDenylistService.isDenied(token)) {
      throw new UnauthorizedException('Token inválido o revocado.');
    }
    // Lo que retornemos aquí se adjuntará a request.user
    return {
      userId: payload.sub,
      username: payload.username,
      permisos: payload.permisos,
    };
  }
}
