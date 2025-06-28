import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from './entities/user.entity';

@ApiTags('Users') // Agrupa los endpoints en Swagger bajo la etiqueta 'Users'
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios recuperada con éxito.',
    type: [User],
  })
  findAll() {
    return this.usersService.findAll();
  }
}
