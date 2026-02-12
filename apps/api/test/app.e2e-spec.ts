/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// ¡IMPORTANTE! Establecer NODE_ENV=test ANTES de cualquier otra importación
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { seedDatabase } from './e2e-setup';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const adminCredentials = {
    username: 'testadmin',
    password: 'adminpass',
  };

  const userCredentials = {
    username: 'testuser',
    password: 'userpass',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          envFilePath: '.env.test.local', // Carga explicitamente el fichero de entorno de tests
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    // Limpiamos y sembramos la BD para este test también
    const connection = app.get(getDataSourceToken('new'));
    await connection.synchronize(true);
    await seedDatabase(connection);

    await app.init();

    // Obtenemos un token de admin para usar en las peticiones
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(adminCredentials);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    adminToken = adminLoginResponse.body.access_token;

    // Obtenemos un token de usuario normal
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(userCredentials);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    userToken = userLoginResponse.body.access_token;
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      // Ignora errores de cierre de la aplicación (problema común con TypeORM)
      console.warn('Error closing app:', (error as Error).message);
    }
  });

  describe('GET /', () => {
    it('should return the API status object without authentication (public endpoint)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('welcomeMessage');
          expect(res.body).toHaveProperty('databaseStatus');
          expect(typeof res.body.welcomeMessage).toBe('string');
          expect(typeof res.body.databaseStatus).toBe('object');
        });
    });

    it('should return the API status object for an authenticated admin user', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('welcomeMessage');
          expect(res.body).toHaveProperty('databaseStatus');
          expect(typeof res.body.welcomeMessage).toBe('string');
          expect(typeof res.body.databaseStatus).toBe('object');
        });
    });

    it('should return the API status object for an authenticated regular user', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('welcomeMessage');
          expect(res.body).toHaveProperty('databaseStatus');
          expect(typeof res.body.welcomeMessage).toBe('string');
          expect(typeof res.body.databaseStatus).toBe('object');
        });
    });

    it('should return the API status object with invalid token (ignored since endpoint is public)', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('welcomeMessage');
          expect(res.body).toHaveProperty('databaseStatus');
        });
    });

    it('should return the correct response structure with valid properties', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('welcomeMessage');
          expect(typeof res.body.welcomeMessage).toBe('string');
          expect(res.body.welcomeMessage).toMatch(/[Aa]pi|[Gg]estión/i); // Verifica que el mensaje sea en español

          expect(res.body).toHaveProperty('databaseStatus');
          expect(typeof res.body.databaseStatus).toBe('object');

          // Validar la estructura de databaseStatus - tiene propiedades 'new' y 'old'
          expect(res.body.databaseStatus).toHaveProperty('new');
          expect(res.body.databaseStatus).toHaveProperty('old');

          // Cada uno debe tener un status
          expect(res.body.databaseStatus.new).toHaveProperty('status');
          expect(res.body.databaseStatus.old).toHaveProperty('status');

          // El status debe ser uno de los valores válidos
          const validStatuses = ['ok', 'error', 'pending'];
          expect(validStatuses).toContain(res.body.databaseStatus.new.status);
          expect(validStatuses).toContain(res.body.databaseStatus.old.status);
        });
    });

    it('should include message property in database status when available', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          // El old database siempre tiene un mensaje
          expect(res.body.databaseStatus.old).toHaveProperty('message');
          expect(typeof res.body.databaseStatus.old.message).toBe('string');
        });
    });

    it('should be accessible from different endpoints formats', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          // Verificar que la respuesta es un objeto válido JSON
          expect(res.body).toBeDefined();
          expect(typeof res.body).toBe('object');
          expect(!Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return 200 OK status code consistently', async () => {
      // Sin autenticación
      const response1 = await request(app.getHttpServer()).get('/');
      expect(response1.status).toBe(200);

      // Con autenticación de admin
      const response2 = await request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response2.status).toBe(200);

      // Con autenticación de usuario
      const response3 = await request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response3.status).toBe(200);
    });
  });
});
