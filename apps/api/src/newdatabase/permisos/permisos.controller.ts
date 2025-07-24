import { HasPermissions } from '@/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permiso } from './entities/permiso.entity';
import { PermisosService } from './permisos.service';

@ApiTags('Permisos')
@Controller('permisos')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los permisos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos recuperada con éxito.',
    type: [Permiso],
  })
  @HasPermissions('users:read')
  findAll() {
    return this.permisosService.findAll();
  }
}
