import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OldUsersService } from './oldusers.service';
import { OldUser } from './entities/olduser.entity';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';

@ApiTags('OldUsers') // Agrupa los endpoints en Swagger bajo la etiqueta 'OldUsers'
@Controller('oldusers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
