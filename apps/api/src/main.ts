/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita el apagado correcto para los hooks del ciclo de vida (OnModuleDestroy, etc.)
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza un error si se envían propiedades no permitidas
      transform: true, // Transforma los payloads a instancias de DTO
    }),
  );

  // CORS config to let petitions from frontend
  const gestionPort = process.env.GESTION_PORT ?? '3002'; // Puerto del frontend
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Lista de orígenes estáticos siempre permitidos (desarrollo)
  const staticAllowedOrigins = [
    `http://localhost:${gestionPort}`,
    `http://127.0.0.1:${gestionPort}`,
  ];

  // Orígenes y patrones dinámicos desde variables de entorno
  const dynamicOrigins = process.env.CORS_ALLOWED_ORIGIN
    ? process.env.CORS_ALLOWED_ORIGIN.split(',')
    : [];

  app.enableCors({
    origin: function (origin, callback) {
      // 1. Permitir peticiones sin 'origin' (Postman, apps móviles, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // 2. Comprobar si el origen coincide con la lista estática
      const isInStaticList = staticAllowedOrigins.includes(origin);
      if (isInStaticList) {
        callback(null, true);
        return;
      }

      // 3. Comprobar si coincide con patrones dinámicos de CORS_ALLOWED_ORIGIN
      const isInDynamicPatterns = dynamicOrigins.some((pattern) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        origin.startsWith(pattern),
      );
      if (isInDynamicPatterns) {
        callback(null, true);
        return;
      }

      // 4. En desarrollo, permitir conexiones locales desde IPs internas
      if (isDevelopment) {
        try {
          const originUrl = new URL(origin);
          const hostname = originUrl.hostname;

          // Permitir IPs privadas: 192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x
          const isPrivateIP =
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            (hostname.startsWith('172.') &&
              !hostname.startsWith('172.0.') &&
              !hostname.startsWith('172.1.') &&
              !hostname.startsWith('172.2.') &&
              !hostname.startsWith('172.3.'));

          if (
            isPrivateIP ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1'
          ) {
            callback(null, true);
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Continuar con el rechazo si no se puede parsear la URL
        }
      }

      // Si llegamos aquí, rechazar la conexión
      callback(new Error('Not allowed by CORS'));
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

  const port = process.env.PORT ?? 3101;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
void bootstrap();
