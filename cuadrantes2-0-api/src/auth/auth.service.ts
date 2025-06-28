import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/newdatabase/users/users.service';
import { User } from '@/newdatabase/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findOneByUsername(username);
    if (user && (await user.validatePassword(pass))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id, // 'sub' es el nombre estándar para el subject (ID del usuario)
      permisos: user.permisos.map((p) => p.tipo), // Incluimos los permisos en el token
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
