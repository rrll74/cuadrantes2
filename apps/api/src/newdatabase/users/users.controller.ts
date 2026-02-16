/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HasPermissions } from '@/auth/decorators/permissions.decorator';
import { HasAnyPermission } from '@/auth/decorators/any-permissions.decorator';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { PERMISSIONS } from '@cuadrantes/shared-dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSelfUserDto } from './dto/update-self-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener los datos del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Datos del usuario autenticado recuperados con éxito.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  getSelfUser(@Req() req: Request & { user: { userId: number } }) {
    return this.usersService.getSelfUser(req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios recuperada con éxito.',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @HasAnyPermission(
    PERMISSIONS.ADMIN,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
  )
  findAllUsers(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado con éxito.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @HasPermissions(PERMISSIONS.USERS_CREATE)
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Actualizar email o contraseña del usuario autenticado',
  })
  @ApiBody({ type: UpdateSelfUserDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado con éxito.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  updateSelfUser(
    @Req() req: Request & { user: { userId: number } },
    @Body() updateSelfUserDto: UpdateSelfUserDto,
  ) {
    return this.usersService.updateSelfUser(req.user.userId, updateSelfUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario existente' })
  @ApiParam({ name: 'id', description: 'ID del usuario a actualizar' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado con éxito.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @HasPermissions(PERMISSIONS.USERS_UPDATE)
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario a eliminar' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado con éxito.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @HasPermissions(PERMISSIONS.USERS_DELETE)
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
