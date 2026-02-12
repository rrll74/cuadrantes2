/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConsultaCuadrantesController } from './consulta-cuadrantes.controller';
import { ConsultaCuadrantesService } from './consulta-cuadrantes.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';

describe('ConsultaCuadrantesController (Integration)', () => {
  let app: INestApplication;
  let consultaCuadrantesService: ConsultaCuadrantesService;

  const mockConsultaCuadrantesService = {
    obtenerEmpleados: jest.fn().mockResolvedValue([
      {
        id: 1,
        nombre: 'Juan',
        apellido1: 'Pérez',
        email: 'juan@example.com',
      },
      {
        id: 2,
        nombre: 'María',
        apellido1: 'García',
        email: 'maria@example.com',
      },
    ]),
    obtenerCuadrantesDisponibles: jest.fn().mockResolvedValue([
      {
        id: 1,
        nombre: 'Cuadrante A',
        descripcion: 'Descripción del cuadrante A',
      },
    ]),
    obtenerConsultaCuadrante: jest.fn().mockResolvedValue({
      empleado: {
        id: 1,
        nombre: 'Juan',
        apellido1: 'Pérez',
        email: 'juan@example.com',
      },
      cuadrante: {
        id: 1,
        nombre: 'Cuadrante A',
        anio: 2024,
      },
      meses: [],
    }),
    generarPDF: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
    generarYEnviarPDF: jest.fn().mockResolvedValue({
      success: true,
      message: 'PDF generado y enviado correctamente',
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConsultaCuadrantesController],
      providers: [
        {
          provide: ConsultaCuadrantesService,
          useValue: mockConsultaCuadrantesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    jest.clearAllMocks();
    consultaCuadrantesService = moduleFixture.get<ConsultaCuadrantesService>(
      ConsultaCuadrantesService,
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /consulta-cuadrantes/empleados', () => {
    it('debería retornar lista de empleados', async () => {
      const response = await request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].nombre).toBe('Juan');
      expect(response.body[1].nombre).toBe('María');
      expect(consultaCuadrantesService.obtenerEmpleados).toHaveBeenCalled();
    });

    it('debería retornar array vacío si no hay empleados', async () => {
      mockConsultaCuadrantesService.obtenerEmpleados.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/consulta-cuadrantes/empleados')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /consulta-cuadrantes/cuadrantes-disponibles', () => {
    it('debería retornar cuadrantes disponibles para el empleado', async () => {
      const requestBody = {
        empleadoId: 1,
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 3,
        anioFin: 2024,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .send(requestBody)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].nombre).toBe('Cuadrante A');
      expect(
        consultaCuadrantesService.obtenerCuadrantesDisponibles,
      ).toHaveBeenCalledWith(1, 1, 2024, 3, 2024);
    });

    it('debería validar que empleadoId es requerido', async () => {
      const requestBody = {
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 3,
        anioFin: 2024,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .send(requestBody);

      expect(response.status).toBe(400);
    });

    it('debería retornar array vacío si no hay cuadrantes', async () => {
      mockConsultaCuadrantesService.obtenerCuadrantesDisponibles.mockResolvedValue(
        [],
      );

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/cuadrantes-disponibles')
        .send({
          empleadoId: 999,
          mesInicio: 1,
          anioInicio: 2024,
          mesFin: 3,
          anioFin: 2024,
        })
        .expect(201);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /consulta-cuadrantes/consultar', () => {
    it('debería retornar datos completos de la consulta', async () => {
      const requestBody = {
        empleadoId: 1,
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 1,
        anioFin: 2024,
        cuadranteId: 1,
        tipoInicial: true,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .send(requestBody)
        .expect(201);

      expect(response.body).toHaveProperty('empleado');
      expect(response.body).toHaveProperty('cuadrante');
      expect(response.body).toHaveProperty('meses');
      expect(response.body.empleado.nombre).toBe('Juan');
      expect(
        consultaCuadrantesService.obtenerConsultaCuadrante,
      ).toHaveBeenCalled();
    });

    it('debería validar parámetros requeridos', async () => {
      const requestBody = {
        empleadoId: 1,
        mesInicio: 1,
        // faltan otros parámetros
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/consultar')
        .send(requestBody);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /consulta-cuadrantes/generar-pdf', () => {
    it('debería generar y retornar un archivo PDF', async () => {
      const requestBody = {
        empleadoId: 1,
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 1,
        anioFin: 2024,
        cuadranteId: 1,
        tipoInicial: true,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/generar-pdf')
        .send(requestBody)
        .expect(201);

      expect(response.type).toMatch(/application\/pdf/);
      expect(consultaCuadrantesService.generarPDF).toHaveBeenCalledWith(
        1, // empleadoId
        1, // mesInicio
        2024, // anioInicio
        1, // mesFin
        2024, // anioFin
        1, // cuadranteId
        true, // tipoInicial
      );
    });

    it('debería tener header Content-Disposition para descarga', async () => {
      const requestBody = {
        empleadoId: 1,
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 1,
        anioFin: 2024,
        cuadranteId: 1,
        tipoInicial: true,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/generar-pdf')
        .send(requestBody)
        .expect(201);

      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(response.headers['content-disposition']).toMatch(/filename/);
    });
  });

  describe('POST /consulta-cuadrantes/enviar-pdf-email', () => {
    it('debería enviar PDF por email y retornar success', async () => {
      const requestBody = {
        empleadoId: 1,
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 1,
        anioFin: 2024,
        cuadranteId: 1,
        tipoInicial: true,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/enviar-pdf-email')
        .send(requestBody)
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(consultaCuadrantesService.generarYEnviarPDF).toHaveBeenCalledWith(
        1,
        1,
        2024,
        1,
        2024,
        1,
        true,
      );
    });

    it('debería retornar error si falta empleadoId', async () => {
      const requestBody = {
        mesInicio: 1,
        anioInicio: 2024,
        mesFin: 1,
        anioFin: 2024,
        cuadranteId: 1,
        tipoInicial: true,
      };

      const response = await request(app.getHttpServer())
        .post('/consulta-cuadrantes/enviar-pdf-email')
        .send(requestBody);

      expect(response.status).toBe(400);
    });
  });
});
