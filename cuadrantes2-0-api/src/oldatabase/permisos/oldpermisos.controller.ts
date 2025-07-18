import { OldPermisosService } from './oldpermisos.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OldPermiso } from './entities/oldpermiso.entity';

@ApiTags('OldPermisos')
@Controller('oldpermisos')
export class OldPermisosController {
  constructor(private readonly oldPermisosService: OldPermisosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los permisos antiguos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos antiguos recuperados con éxito.',
    type: [OldPermiso],
  })
  findAll() {
    return this.oldPermisosService.findAll();
  }
}
