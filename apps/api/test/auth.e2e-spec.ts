/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  // Las credenciales se definen en el archivo e2e-setup.ts
  const adminCredentials = {
    username: 'testadmin',
    password: 'adminpass', // La contraseña se envía en texto plano, como lo haría un cliente real.
  };

  beforeAll(async () => {
    // El entorno de prueba (NODE_ENV=test) ya está configurado por jest-e2e.json
    // y el setup global (e2e-setup.ts) ya se ha ejecutado.

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Es buena práctica usar los mismos pipes que en producción
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return 401 Unauthorized for incorrect credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: adminCredentials.username,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return a JWT access_token for correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(adminCredentials)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');

      // Guardamos el token para usarlo en pruebas posteriores
      adminToken = response.body.access_token;
    });
  });

  describe('GET /auth/profile', () => {
    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return user profile data for a valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            userId: expect.any(Number),
            username: adminCredentials.username,
            permisos: expect.arrayContaining([
              'admin',
              'users:read',
              'users:create',
              'users:update',
              'users:delete',
            ]),
          });
        });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('should return a new access_token for a valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');

      // El nuevo token debe ser diferente al original
      const newAdminToken = response.body.access_token;
      expect(newAdminToken).not.toEqual(adminToken);

      // Verificamos que el nuevo token también es válido
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${newAdminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.username).toBe(adminCredentials.username);
        });
    });
  });
});
