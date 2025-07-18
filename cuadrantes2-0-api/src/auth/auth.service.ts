import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/newdatabase/users/users.service';
import { User } from '@/newdatabase/users/entities/user.entity';
import { AuthModel, LoginModel } from './auth.model';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<LoginModel | null> {
    const user = await this.usersService.findOneByUsername(username);
    console.log(user);
    if (user && (await user.validatePassword(pass))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: LoginModel) {
    const payload: AuthModel = {
      sub: user.id, // 'sub' es el nombre estándar para el subject (ID del usuario)
      username: user.username,
      permisos: user.permisos.map((p) => p.tipo), // Incluimos los permisos en el token
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersService.findOneByUsername(username);
  }
}
