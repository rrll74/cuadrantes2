import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HasPermissions } from '@/auth/decorators/permissions.decorator';
import { HasAnyPermission } from '@/auth/decorators/any-permissions.decorator';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios recuperada con éxito.',
    type: [User],
  })
  @HasAnyPermission(
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
  )
  findAllUsers(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Post()
  @HasPermissions('users:create')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @HasPermissions('users:update')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HasPermissions('users:delete')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
