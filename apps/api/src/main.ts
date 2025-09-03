/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
  const gestionPort = process.env.GESTION_PORT ?? '3002'; // Puerto del frontend

  // Lista de orígenes permitidos explícitamente
  const whitelist = [
    `http://localhost:${gestionPort}`,
    `http://127.0.0.1:${gestionPort}`,
  ];

  app.enableCors({
    origin: function (origin, callback) {
      // Permitir peticiones sin 'origin' (como Postman o apps móviles) y las de la whitelist
      // En desarrollo, también permitimos IPs de la red local.
      if (
        !origin ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        whitelist.indexOf(origin) !== -1 ||
        origin.startsWith('http://10.1.') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://172.')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
