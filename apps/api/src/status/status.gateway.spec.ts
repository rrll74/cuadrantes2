import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException } from '@nestjs/common';
import { StatusGateway } from './status.gateway';
import { ConnectionStatusService } from './connection-status.service';
import { UsersService } from '@/newdatabase/users/users.service';
import { TokenDenylistService } from '@/auth/token-denylist.service';
import { User } from '@/newdatabase/users/entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';

// --- Mocks de Servicios ---
const mockConnectionStatusService = {
  addUser: jest.fn(),
  removeUserBySocketId: jest.fn(),
  getUserIdBySocketId: jest.fn(),
  getSocketIdByUserId: jest.fn(),
  getTokenByUserId: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
  decode: jest.fn(),
};

const mockUsersService = {
  findOneById: jest.fn(),
};

const mockTokenDenylistService = {
  deny: jest.fn(),
};

// --- Mocks de Socket.IO ---
// Mock de un cliente Socket
const createMockSocket = (token: string | null, id: string): Socket =>
  ({
    id,
    handshake: {
      auth: { token },
      // Añadimos las propiedades que faltan para satisfacer el tipo Handshake
      headers: {},
      time: new Date().toString(),
      address: '127.0.0.1',
      xdomain: false,
      secure: false,
      issued: Date.now(),
      url: '/socket.io/',
      query: {},
    },
    disconnect: jest.fn(),
    emit: jest.fn(),
    // Hacemos un type assertion para añadir cualquier otra propiedad que necesitemos mockear
    // y para que TypeScript lo acepte como un Socket completo.
  }) as unknown as Socket;

// Mock del servidor WebSocket
const createMockServer = (targetSocket?: Socket): Partial<Server> => ({
  // La propiedad 'sockets' es de tipo Namespace. Mockeamos la estructura que usamos.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  sockets: {
    sockets: new Map(targetSocket ? [[targetSocket.id, targetSocket]] : []),
    // Añadimos un type assertion para que TS no se queje de las 40+ propiedades faltantes.
  } as any,
  emit: jest.fn(),
});

describe('StatusGateway', () => {
  let gateway: StatusGateway;
  let connectionStatus: typeof mockConnectionStatusService;
  let jwtService: typeof mockJwtService;
  let usersService: typeof mockUsersService;
  let tokenDenylist: typeof mockTokenDenylistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusGateway,
        {
          provide: ConnectionStatusService,
          useValue: mockConnectionStatusService,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TokenDenylistService, useValue: mockTokenDenylistService },
      ],
    }).compile();

    gateway = module.get<StatusGateway>(StatusGateway);
    connectionStatus = module.get(ConnectionStatusService);
    jwtService = module.get(JwtService);
    usersService = module.get(UsersService);
    tokenDenylist = module.get(TokenDenylistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should disconnect if no token is provided', async () => {
      const mockClient = createMockSocket(null, 'client-1');
      await gateway.handleConnection(mockClient);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect if token verification fails', async () => {
      const mockClient = createMockSocket('invalid-token', 'client-1');
      jwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());
      await gateway.handleConnection(mockClient);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should add user to connection status on successful authentication', async () => {
      const token = 'valid-token';
      const mockClient = createMockSocket(token, 'client-1');
      const payload = { sub: 1, username: 'test' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      // Asignamos un mock de servidor al gateway para la prueba
      gateway.server = createMockServer() as Server;

      await gateway.handleConnection(mockClient);

      expect(connectionStatus.addUser).toHaveBeenCalledWith(
        payload.sub,
        mockClient.id,
        token,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(gateway.server.emit).toHaveBeenCalledWith('user:connected', {
        userId: payload.sub,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user from connection status and broadcast', () => {
      const mockClient = createMockSocket('any-token', 'client-1');
      const userId = 1;
      connectionStatus.removeUserBySocketId.mockReturnValue(userId);
      gateway.server = createMockServer() as Server;

      gateway.handleDisconnect(mockClient);

      expect(connectionStatus.removeUserBySocketId).toHaveBeenCalledWith(
        mockClient.id,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(gateway.server.emit).toHaveBeenCalledWith('user:disconnected', {
        userId,
      });
    });
  });

  describe('handleAdminDisconnect', () => {
    const adminId = 1;
    const targetUserId = 2;
    const adminSocketId = 'admin-socket';
    const targetSocketId = 'target-socket';
    const targetToken = 'target-token';

    const adminUser = {
      id: adminId,
      permisos: [{ tipo: 'users:update' }] as Permiso[],
    } as User;
    const nonAdminUser = { id: adminId, permisos: [] as Permiso[] } as User;

    const mockAdminClient = createMockSocket('admin-token', adminSocketId);
    const mockTargetClient = createMockSocket(targetToken, targetSocketId);

    beforeEach(() => {
      // Configuramos el servidor para que pueda "encontrar" el socket del objetivo
      gateway.server = createMockServer(mockTargetClient) as Server;
      connectionStatus.getUserIdBySocketId.mockReturnValue(adminId);
      connectionStatus.getSocketIdByUserId.mockReturnValue(targetSocketId);
      connectionStatus.getTokenByUserId.mockReturnValue(targetToken);
      jwtService.decode.mockReturnValue({ exp: Date.now() / 1000 + 3600 }); // Expira en 1 hora
    });

    it('should disconnect user, deny token, and log if admin has permission', async () => {
      usersService.findOneById.mockResolvedValue(adminUser);

      await gateway.handleAdminDisconnect(mockAdminClient, {
        userId: targetUserId,
      });

      expect(usersService.findOneById).toHaveBeenCalledWith(adminId);
      expect(tokenDenylist.deny).toHaveBeenCalledWith(
        targetToken,
        expect.any(Number),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTargetClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should throw ForbiddenException if admin lacks permission', async () => {
      usersService.findOneById.mockResolvedValue(nonAdminUser);

      await gateway.handleAdminDisconnect(mockAdminClient, {
        userId: targetUserId,
      });

      expect(usersService.findOneById).toHaveBeenCalledWith(adminId);
      expect(tokenDenylist.deny).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTargetClient.disconnect).not.toHaveBeenCalled();
      // Verificamos que se emite un error de vuelta al admin
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockAdminClient.emit).toHaveBeenCalledWith('admin:action_error', {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('ForbiddenException'),
      });
    });

    it('should not disconnect if target user is not found', async () => {
      usersService.findOneById.mockResolvedValue(adminUser);
      connectionStatus.getSocketIdByUserId.mockReturnValue(undefined); // Simulamos que el usuario no está conectado

      await gateway.handleAdminDisconnect(mockAdminClient, {
        userId: targetUserId,
      });

      expect(tokenDenylist.deny).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTargetClient.disconnect).not.toHaveBeenCalled();
    });

    it('should not deny an already expired token', async () => {
      usersService.findOneById.mockResolvedValue(adminUser);
      // Simulamos que el token ya expiró
      jwtService.decode.mockReturnValue({ exp: Date.now() / 1000 - 60 });

      await gateway.handleAdminDisconnect(mockAdminClient, {
        userId: targetUserId,
      });

      expect(tokenDenylist.deny).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTargetClient.disconnect).toHaveBeenCalled(); // La desconexión aún debe ocurrir
    });
  });
});
