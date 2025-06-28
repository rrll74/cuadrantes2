import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { OldUsersModule } from '@/oldatabase/users/oldusers.module';
import { OldPermisosModule } from '@/oldatabase/permisos/oldpermisos.module';
import { UsersModule } from '@/newdatabase/users/users.module';
import { PermisosModule } from '@/newdatabase/permisos/permisos.module';
import { SeederModule } from '@/newdatabase/seeder.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      name: 'new',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get<string>('DB_NEW_HOST'),
        port: parseInt(configService.get<string>('DB_NEW_PORT') || '3306', 10),
        username: configService.get<string>('DB_NEW_USERNAME'),
        password: configService.get<string>('DB_NEW_PASSWORD'),
        database: configService.get<string>('DB_NEW_DATABASE'),
        entities: [__dirname + '/newdatabase/**/*.entity{.ts,.js}'], // Busca entidades solo en la carpeta newdatabase
        synchronize: true, // true en desarrollo para que TypeORM cree las tablas automáticamente
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'old',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_OLD_HOST'),
        port: parseInt(configService.get<string>('DB_OLD_PORT') || '3306', 10),
        username: configService.get<string>('DB_OLD_USERNAME'),
        password: configService.get<string>('DB_OLD_PASSWORD'),
        database: configService.get<string>('DB_OLD_DATABASE'),
        entities: [__dirname + '/oldatabase/**/*.entity{.ts,.js}'], // Busca entidades solo en la carpeta oldatabase
        synchronize: false, // ¡MUY IMPORTANTE! Poner en 'false' en producción para no sobreescribir tu BD existente
      }),
    }),
    OldUsersModule,
    OldPermisosModule,
    UsersModule,
    PermisosModule,
    SeederModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
