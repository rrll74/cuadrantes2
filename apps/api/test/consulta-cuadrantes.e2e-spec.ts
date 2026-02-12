/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { seedDatabase } from './e2e-setup';
import { AppModule } from '../src/app.module';

/**
 * NOTA IMPORTANTE: Estos tests requieren que la base de datos 'old' esté disponible y poblada.
 *
 * La base de datos 'old' NO puede ser SQLite in-memory porque contiene tipos de datos (ENUM, etc.)
 * que no son compatibles con SQLite. Por lo tanto, estos tests E2E requieren:
 *
 * 1. Una base de datos MySQL/MariaDB real configurada para 'old' en .env.test.local
 * 2. Datos de prueba insertados en esa base de datos (empleados, cuadrantes, asignaciones, etc.)
 *
 * Si no tienes una base de datos 'old' configurada, estos tests FALLARÁN.
 * Los tests unitarios del controlador y servicio (*.spec.ts) NO tienen esta dependencia.
 *
 * Para ejecutar estos tests, debes:
 * - Configurar DB_OLD_* variables en .env.test.local apuntando a MySQL/MariaDB
 * - Poblar la base de datos con datos de prueba
 *
 * Alternativamente, puedes OMITIR estos tests y confiar en los tests unitarios.
 */
describe('ConsultaCuadrantesController (e2e) - REQUIERE DB OLD POBLADA', () => {
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
    // Configurar NODE_ENV para usar SQLite in-memory
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    const connection = app.get(getDataSourceToken('new'));
    await connection.synchronize(true);
    await seedDatabase(connection);

    await app.init();

    // Obtener tokens de admin y usuario regular
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(adminCredentials);
    adminToken = adminLoginRes.body.access_token;

    const userLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(userCredentials);
    userToken = userLoginRes.body.access_token;
  }, 30000); // Aumentar timeout a 30 segundos

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      console.warn('Error closing app:', (error as Error).message);
    }
  });

  describe('Autenticación y Autorización', () => {
    it('debería retornar 401 si no hay token', () => {
      return request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .expect(401);
    });

    it('debería retornar 401 si el token es inválido', () => {
      return request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(401);
    });

    it('debería retornar 403 si el usuario no tiene permiso cuadrantes:read', () => {
      // userToken no tiene permiso cuadrantes:read
      return request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /consulta-cuadrantes/empleados', () => {
    it('debería retornar lista de empleados activos para admin', () => {
      return request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // La lista debería estar ordenada por nombre
          if (res.body.length > 1) {
            expect(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              res.body[0].nombre.localeCompare(res.body[1].nombre),
            ).toBeLessThanOrEqual(0);
          }
        });
    });

    it('debería retornar empleados con estructura correcta', () => {
      return request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('nombre');
            expect(res.body[0]).toHaveProperty('email');
          }
        });
    });
  });

  describe('POST /consulta-cuadrantes/cuadrantes-disponibles', () => {
    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          // faltan mesInicio, anioInicio, mesFin, anioFin
        })
        .expect(400);
    });

    it('debería retornar cuadrantes disponibles para un empleado válido', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 3,
          anioFin: 2024,
        })
        .expect(201)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('debería retornar array vacío para empleado que no existe', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 999999,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 3,
          anioFin: 2024,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });

    it('debería validar que empleadoId sea un número positivo', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: -1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 3,
          anioFin: 2024,
        })
        .expect(400);
    });
  });

  describe('POST /consulta-cuadrantes/consultar', () => {
    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          // faltan otros campos
        })
        .expect(400);
    });

    it('debería retornar estructura completa de consulta', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 1,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('empleado');
          expect(res.body).toHaveProperty('cuadrante');
          expect(res.body).toHaveProperty('meses');
          expect(res.body.empleado).toHaveProperty('id');
          expect(res.body.empleado).toHaveProperty('nombre');
          expect(res.body.cuadrante).toHaveProperty('id');
          expect(res.body.cuadrante).toHaveProperty('nombre');
        });
    });

    it('debería soportar consulta de múltiples meses', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 3,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201)
        .expect((res) => {
          expect(Array.isArray(res.body.meses)).toBe(true);
          // Debería tener entre 1 y 3 meses
          expect(res.body.meses.length).toBeGreaterThanOrEqual(1);
          expect(res.body.meses.length).toBeLessThanOrEqual(3);
        });
    });
  });

  describe('POST /consulta-cuadrantes/generar-pdf', () => {
    it('debería generar PDF correctamente', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/generar-pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 1,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.type).toMatch(/application\/pdf/);
          expect(res.headers['content-disposition']).toMatch(/attachment/);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('debería incluir el nombre del empleado en el filename', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/generar-pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 1,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.headers['content-disposition']).toMatch(/cuadrante-/);
        });
    });

    it('debería validar parámetros requeridos', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/generar-pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          // faltan otros parámetros
        })
        .expect(400);
    });
  });

  describe('POST /consulta-cuadrantes/enviar-pdf-email', () => {
    it('debería validar parámetros requeridos', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/enviar-pdf-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          // faltan otros parámetros
        })
        .expect(400);
    });

    it('debería retornar respuesta con success y message', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/enviar-pdf-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 1,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('message');
          expect(typeof res.body.success).toBe('boolean');
          expect(typeof res.body.message).toBe('string');
        });
    });
  });

  describe('Validación de Períodos', () => {
    it('debería permitir consulta de un solo mes', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 6,
          anioInicio: 2024,
          mesFin: 6,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201);
    });

    it('debería permitir consulta que atraviesa años', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 11,
          anioInicio: 2023,
          mesFin: 2,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(201);
    });

    it('debería validar meses válidos (1-12)', () => {
      return request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          empleadoId: 1,
          mesInicio: 13, // Mes inválido
          anioInicio: 2024,
          mesFin: 1,
          anioFin: 2024,
          cuadranteId: 1,
          tipoInicial: true,
        })
        .expect(400);
    });
  });
});
