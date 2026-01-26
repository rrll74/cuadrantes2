/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
// import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { io, Socket } from 'socket.io-client';
import { AddressInfo } from 'net';
import { seedDatabase } from './e2e-setup';

/**
 * Función de ayuda que crea una Promesa que se resuelve cuando un socket
 * recibe un evento específico. Esto nos permite esperar de forma asíncrona
 * en nuestros tests.
 * @param socket El cliente socket que está escuchando.
 * @param event El nombre del evento a esperar.
 * @returns Una promesa que se resuelve con los datos del evento.
 */
const waitForEvent = (socket: Socket, event: string) => {
  return new Promise((resolve) => {
    socket.once(event, (data) => {
      resolve(data);
    });
  });
};

describe('StatusGateway (e2e)', () => {
  let app: INestApplication;
  let httpServer;
  let socketUrl: string;
  let adminToken: string;
  let userToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let adminUserId: number;
  let userId: number;

  // Credenciales definidas en e2e-setup.ts
  const adminCredentials = { username: 'testadmin', password: 'adminpass' };
  const userCredentials = { username: 'testuser', password: 'userpass' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // AppModule ya importa la configuración de TypeORM
    }).compile();

    app = moduleFixture.createNestApplication();

    // --- INICIO: Limpieza y Sembrado de la Base de Datos ---
    // Esta es la parte clave. La ejecutamos antes de levantar el servidor.
    const connection = app.get(getDataSourceToken('new')); // Obtener la conexión de TypeORM
    await connection.synchronize(true); // true = drop and re-create schema
    await seedDatabase(connection);
    // --- FIN: Limpieza y Sembrado de la Base de Datos ---

    // Ahora que la BD está limpia y sembrada, podemos iniciar la aplicación.
    // Usamos app.listen() para que el servidor HTTP comience a escuchar en un puerto.
    // `app.init()` solo inicializa la app, pero no la pone en escucha.
    // Usar el puerto 0 le dice al SO que elija un puerto efímero disponible.
    await app.listen(0);
    httpServer = app.getHttpServer();
    const address = httpServer.address() as AddressInfo;
    socketUrl = `http://localhost:${address.port}`;

    // 1. Obtener tokens y IDs para ambos usuarios vía HTTP
    const adminLoginRes = await request(httpServer)
      .post('/auth/login')
      .send(adminCredentials);
    expect(adminLoginRes.status).toBe(201); // Verificamos que el login fue exitoso
    adminToken = adminLoginRes.body.access_token;
    const adminProfileRes = await request(httpServer)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    adminUserId = adminProfileRes.body.userId;

    const userLoginRes = await request(httpServer)
      .post('/auth/login')
      .send(userCredentials);
    expect(userLoginRes.status).toBe(201); // Verificamos que el login fue exitoso
    userToken = userLoginRes.body.access_token;
    const userProfileRes = await request(httpServer)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);
    userId = userProfileRes.body.userId;
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      // Ignora errores de cierre de la aplicación (problema común con TypeORM)
      console.warn('Error closing app:', (error as Error).message);
    }
  });

  describe('WebSocket Connection Flow', () => {
    let clientA: Socket; // Admin
    let clientB: Socket; // User

    afterEach(() => {
      // Asegurarse de que los sockets se desconectan después de cada test
      clientA?.disconnect();
      clientB?.disconnect();
    });

    it('should refuse connection with an invalid token', async () => {
      const client = io(socketUrl, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'], // Forzar websocket para consistencia
      });

      // El servidor fuerza un 'disconnect' en caso de token inválido.
      // Esperamos ese evento en lugar de 'connect_error'.
      const reason = await new Promise((resolve) =>
        client.once('disconnect', resolve),
      );

      expect(reason).toBe('io server disconnect');
      expect(client.connected).toBe(false);
    });

    it('should notify clients when a user connects and disconnects', async () => {
      // 1. Conectar Cliente A (admin)
      clientA = io(socketUrl, { auth: { token: adminToken } });
      await new Promise<void>((resolve) => clientA.once('connect', resolve));
      expect(clientA.connected).toBe(true);

      // 2. Preparar al Cliente A para escuchar la conexión del Cliente B
      const connectedPromise = waitForEvent(clientA, 'user:connected');

      // 3. Conectar Cliente B (user)
      clientB = io(socketUrl, { auth: { token: userToken } });
      await new Promise<void>((resolve) => clientB.once('connect', resolve));
      expect(clientB.connected).toBe(true);

      // 4. Verificar que el Cliente A recibió la notificación
      const connectedData = await connectedPromise;
      expect(connectedData).toEqual({ userId });

      // 5. Preparar al Cliente A para escuchar la desconexión del Cliente B
      const disconnectedPromise = waitForEvent(clientA, 'user:disconnected');

      // 6. Desconectar Cliente B
      clientB.disconnect();

      // 7. Verificar que el Cliente A recibió la notificación de desconexión
      const disconnectedData = await disconnectedPromise;
      expect(disconnectedData).toEqual({ userId });
    }, 10000); // Aumentamos el timeout por si la conexión es lenta
  });

  describe('Admin Forced Disconnection Flow', () => {
    let clientA: Socket; // Admin
    let clientB: Socket; // User

    beforeEach(async () => {
      // Conectar ambos clientes antes de cada test en esta suite
      clientA = io(socketUrl, {
        auth: { token: adminToken },
        transports: ['websocket'],
      });
      clientB = io(socketUrl, {
        auth: { token: userToken },
        transports: ['websocket'],
      });

      // Esperar a que ambos se conecten
      await Promise.all([
        new Promise<void>((resolve) => clientA.once('connect', resolve)),
        new Promise<void>((resolve) => clientB.once('connect', resolve)),
      ]);
    });

    afterEach(() => {
      // Asegurarse de que los sockets se desconectan
      clientA?.disconnect();
      clientB?.disconnect();
    });

    it('should allow an admin to disconnect a user and invalidate their token', async () => {
      // 1. Preparar listeners para los resultados esperados
      const clientBDisconnectPromise = new Promise<void>((resolve) => {
        clientB.once('disconnect', (reason) => {
          expect(reason).toBe('io server disconnect');
          resolve();
        });
      });
      const adminReceivesNotificationPromise = waitForEvent(
        clientA,
        'user:disconnected',
      );

      // 2. El admin emite el evento para desconectar al usuario
      clientA.emit('admin:disconnect_user', { userId });

      // 3. Esperar a que ocurran los eventos WebSocket
      await Promise.all([
        clientBDisconnectPromise,
        adminReceivesNotificationPromise,
      ]);

      // 4. Verificar que el token del usuario ahora es inválido para peticiones HTTP
      await request(httpServer)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401); // Esperamos Unauthorized
    }, 10000);
  });

  describe('Login Lockdown Flow (HTTP)', () => {
    afterEach(async () => {
      // Nos aseguramos de que el bloqueo se desactiva después de la prueba
      // para no afectar a otros tests, obteniendo primero el estado actual.
      const statusRes = await request(httpServer)
        .get('/auth/lockdown-status')
        .set('Authorization', `Bearer ${adminToken}`);

      if (statusRes.body.isLocked) {
        await request(httpServer)
          .post('/auth/toggle-lockdown')
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    it('should block non-admin logins when lockdown is active', async () => {
      // 1. El admin activa el bloqueo de inicio de sesión
      await request(httpServer)
        .post('/auth/toggle-lockdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // 2. Un usuario normal intenta iniciar sesión y es bloqueado
      await request(httpServer)
        .post('/auth/login')
        .send(userCredentials)
        .expect(503); // Service Unavailable

      // 3. Un admin intenta iniciar sesión y tiene éxito (bypass)
      await request(httpServer)
        .post('/auth/login')
        .send(adminCredentials)
        .expect(201);

      // 4. El admin desactiva el bloqueo
      await request(httpServer)
        .post('/auth/toggle-lockdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // 5. El usuario normal ahora puede iniciar sesión
      await request(httpServer)
        .post('/auth/login')
        .send(userCredentials)
        .expect(201);
    }, 15000);
  });
});
