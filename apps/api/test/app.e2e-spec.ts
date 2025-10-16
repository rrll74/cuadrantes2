/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { seedDatabase } from './e2e-setup';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const adminCredentials = {
    username: 'testadmin',
    password: 'adminpass',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    // Limpiamos y sembramos la BD para este test también
    const connection = app.get(getDataSourceToken('new'));
    await connection.synchronize(true);
    await seedDatabase(connection);

    await app.init();

    // Obtenemos un token para usar en las peticiones
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(adminCredentials);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return the API status object for an authenticated user', () => {
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
});
