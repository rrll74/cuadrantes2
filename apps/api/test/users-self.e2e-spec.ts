/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { seedDatabase } from './e2e-setup';
import { AppModule } from '../src/app.module';

describe('Users self endpoints (e2e)', () => {
  let app: INestApplication;
  let userToken: string;

  const userCredentials = {
    username: 'testuser',
    password: 'userpass',
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
      .send(userCredentials)
      .expect(201);

    userToken = loginResponse.body.access_token as string;
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      console.warn('Error closing app:', (error as Error).message);
    }
  });

  it('should return the authenticated user profile', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            username: userCredentials.username,
            email: 'user@test.com',
          }),
        );
      });
  });

  it('should reject updates without current password', () => {
    return request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'nuevo@test.com' })
      .expect(400);
  });

  it('should update email and password for the authenticated user', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        email: 'nuevo@test.com',
        currentPassword: userCredentials.password,
        newPassword: 'userpass123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('nuevo@test.com');
      });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: userCredentials.username,
        password: 'userpass123',
      })
      .expect(201);
  });
});
