import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          // Creamos un mock de AppService para aislar el controlador.
          // Solo nos interesa saber que el controlador llama al método correcto.
          useValue: {
            getApiStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  describe('getApiStatus', () => {
    it('should call appService.getApiStatus and return its result', () => {
      const mockApiStatus = {
        welcomeMessage: 'API Status OK',
        databaseStatus: {},
      };
      // Configuramos el mock para que devuelva nuestro objeto de prueba.
      (appService.getApiStatus as jest.Mock).mockReturnValue(mockApiStatus);

      const result = appController.getApiStatus();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(appService.getApiStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockApiStatus);
    });
  });
});
