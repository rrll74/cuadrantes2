import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza un error si se envían propiedades no permitidas
      transform: true, // Transforma los payloads a instancias de DTO
    }),
  );

  // CORS config to let petitions from frontend
  const gestionPort = process.env.GESTION_PORT ?? 3002;
  app.enableCors({
    origin: `http://localhost:${gestionPort}`, // Especificar el origen del frontend explícitamente
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger Coonfiguration
  const config = new DocumentBuilder()
    .setTitle('API DE Gestión de Personal')
    .setDescription('Documentación de la API para la aplicación de gestión.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // Doc in /api-docs

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
