import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@/app.controller';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseStatusService } from './status/database-status.service';
import { AppService } from '@/app.service';
import { OldUsersModule } from '@/oldatabase/users/oldusers.module';
import { OldPermisosModule } from '@/oldatabase/permisos/oldpermisos.module';
import { UsersModule } from '@/newdatabase/users/users.module';
import { PermisosModule } from '@/newdatabase/permisos/permisos.module';
import { SeederModule } from '@/newdatabase/seeder.module';
import { AuthModule } from './auth/auth.module';
import { StatusModule } from './status/status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      name: 'new',
      imports: [ConfigModule, StatusModule],
      inject: [ConfigService, DatabaseStatusService],
      useFactory: async (
        configService: ConfigService,
        dbStatusService: DatabaseStatusService,
      ): Promise<DataSourceOptions> => {
        const realOptions: DataSourceOptions = {
          type: 'mariadb',
          host: configService.get<string>('DB_NEW_HOST'),
          port: parseInt(
            configService.get<string>('DB_NEW_PORT') || '3306',
            10,
          ),
          username: configService.get<string>('DB_NEW_USERNAME'),
          password: configService.get<string>('DB_NEW_PASSWORD'),
          database: configService.get<string>('DB_NEW_DATABASE'),
          entities: [__dirname + '/newdatabase/**/*.entity{.ts,.js}'],
          synchronize: true,
        };

        const dataSource = new DataSource(realOptions);
        try {
          await dataSource.initialize();
          dbStatusService.setNewDbStatus('ok');
          await dataSource.destroy(); // Cerramos la conexión temporal
          return realOptions;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          dbStatusService.setNewDbStatus('error', errorMessage);
          // Devolvemos una configuración "dummy" para que la app no se detenga.
          return {
            name: 'new',
            type: 'sqlite',
            database: ':memory:',
            // ¡Clave! Incluimos las entidades para que la inyección de repositorios no falle.
            entities: [__dirname + '/newdatabase/**/*.entity{.ts,.js}'],
            synchronize: true, // Necesario para que TypeORM cree el esquema en la DB en memoria.
          };
        }
      },
    }),
    TypeOrmModule.forRootAsync({
      name: 'old',
      imports: [ConfigModule, StatusModule],
      inject: [ConfigService, DatabaseStatusService],
      useFactory: async (
        configService: ConfigService,
        dbStatusService: DatabaseStatusService,
      ): Promise<DataSourceOptions> => {
        const realOptions: DataSourceOptions = {
          type: 'mysql',
          host: configService.get<string>('DB_OLD_HOST'),
          port: parseInt(
            configService.get<string>('DB_OLD_PORT') || '3306',
            10,
          ),
          username: configService.get<string>('DB_OLD_USERNAME'),
          password: configService.get<string>('DB_OLD_PASSWORD'),
          database: configService.get<string>('DB_OLD_DATABASE'),
          entities: [__dirname + '/oldatabase/**/*.entity{.ts,.js}'],
          synchronize: false,
        };
        const dataSource = new DataSource(realOptions);
        try {
          await dataSource.initialize();
          dbStatusService.setOldDbStatus('ok');
          await dataSource.destroy(); // Cerramos la conexión temporal
          return realOptions;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          dbStatusService.setOldDbStatus('error', errorMessage);
          // Devolvemos una configuración "dummy" para que la app no se detenga.
          return {
            name: 'old',
            type: 'sqlite',
            database: ':memory:',
            // ¡Clave! Incluimos las entidades para que la inyección de repositorios no falle.
            entities: [__dirname + '/oldatabase/**/*.entity{.ts,.js}'],
            synchronize: true, // Necesario para que TypeORM cree el esquema en la DB en memoria.
          };
        }
      },
    }),
    OldUsersModule,
    OldPermisosModule,
    UsersModule,
    PermisosModule,
    SeederModule,
    AuthModule,
    StatusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
