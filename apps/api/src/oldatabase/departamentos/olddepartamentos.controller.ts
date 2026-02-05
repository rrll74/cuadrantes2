import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OldDepartamentosService } from './olddepartamentos.service';
import { OldDepartamento } from './entities/olddepartamento.entity';
import { Public } from '@/auth/decorators/public.decorator';

@ApiTags('Departamentos (Old)')
@Controller('api/departamentos')
export class OldDepartamentosController {
  constructor(private readonly departamentosService: OldDepartamentosService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener todos los departamentos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de departamentos',
    type: [OldDepartamento],
  })
  async findAll(): Promise<OldDepartamento[]> {
    return this.departamentosService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un departamento por ID' })
  @ApiResponse({
    status: 200,
    description: 'Departamento encontrado',
    type: OldDepartamento,
  })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OldDepartamento | null> {
    return this.departamentosService.findById(id);
  }
}
