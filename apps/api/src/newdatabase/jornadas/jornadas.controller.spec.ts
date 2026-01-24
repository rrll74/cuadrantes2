/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JornadasController } from './jornadas.controller';
import { JornadasService } from './jornadas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { EstadoPresencia } from './entities/presence-result.entity';

describe('JornadasController (Integration)', () => {
  let app: INestApplication;
  let jornadasService: JornadasService;

  // Mock del servicio para espiar las llamadas
  const mockJornadasService = {
    getUnmatchedResults: jest.fn().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    }),
    findAllSessions: jest.fn().mockResolvedValue([]),
    procesarArchivos: jest.fn(),
    getSessionResults: jest.fn().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      stats: {
        total: 0,
        completo: 0,
        incompleto: 0,
        sinPresencia: 0,
        revisar: 0,
      },
    }),
    deleteSession: jest.fn(),
    generateExcelExport: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [JornadasController],
      providers: [
        {
          provide: JornadasService,
          useValue: mockJornadasService,
        },
      ],
    })
      // Sobrescribimos los guards para evitar la autenticación real en el test
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    jest.clearAllMocks();
    jornadasService = moduleFixture.get<JornadasService>(JornadasService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/jornadas/:sessionId/unmatched (GET) - should pass search and status parameters to service', async () => {
    const sessionId = 123;
    const search = 'Lopez';
    const status = EstadoPresencia.INCOMPLETO;

    await request(app.getHttpServer())
      .get(`/jornadas/${sessionId}/unmatched`)
      .query({
        page: 2,
        limit: 20,
        search: search,
        status: status,
      })
      .expect(200);

    expect(jornadasService.getUnmatchedResults).toHaveBeenCalledWith(
      sessionId,
      2, // page
      20, // limit
      search,
      status,
    );
  });

  it('/jornadas/:sessionId/unmatched (GET) - should handle missing optional parameters', async () => {
    const sessionId = 456;

    await request(app.getHttpServer())
      .get(`/jornadas/${sessionId}/unmatched`)
      .expect(200);

    expect(jornadasService.getUnmatchedResults).toHaveBeenCalledWith(
      sessionId,
      1, // default page
      10, // default limit
      '', // default search
      undefined, // default status
    );
  });

  it('/jornadas/:sessionId (GET) - should pass search and status parameters to getSessionResults', async () => {
    const sessionId = 789;
    const search = 'Garcia';
    const status = EstadoPresencia.COMPLETO;

    await request(app.getHttpServer())
      .get(`/jornadas/${sessionId}`)
      .query({
        page: 3,
        limit: 50,
        search: search,
        status: status,
      })
      .expect(200);

    expect(jornadasService.getSessionResults).toHaveBeenCalledWith(
      sessionId,
      3, // page
      50, // limit
      search,
      status,
      undefined, // discounted
    );
  });
});
