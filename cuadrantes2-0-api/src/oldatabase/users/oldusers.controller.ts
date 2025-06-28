import { Controller, Get } from '@nestjs/common';
import { OldUsersService } from './oldusers.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OldUser } from './entities/olduser.entity';

@ApiTags('OldUsers') // Agrupa los endpoints en Swagger bajo la etiqueta 'OldUsers'
@Controller('oldusers')
export class OldUsersController {
  constructor(private readonly usersService: OldUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de antiguos usuarios recuperada con éxito.',
    type: [OldUser],
  })
  findAll() {
    return this.usersService.findAll();
  }
}
