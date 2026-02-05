/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { seedDatabase } from './e2e-setup';
import { AppModule } from '../src/app.module';

describe('Permisos (e2e)', () => {
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

    const connection = app.get(getDataSourceToken('new'));
    await connection.synchronize(true);
    await seedDatabase(connection);

    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(adminCredentials)
      .expect(201);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      console.warn('Error closing app:', (error as Error).message);
    }
  });

  it('incluye el permiso de partes de trabajo en el listado', async () => {
    const response = await request(app.getHttpServer())
      .get('/permisos')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: 'partes_trabajo:write',
          descripcion: 'Generar Partes de Trabajo',
        }),
      ]),
    );
  });
});
