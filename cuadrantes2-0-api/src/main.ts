import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS config to let petitions from frontend
  app.enableCors({
    origin: true,
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
