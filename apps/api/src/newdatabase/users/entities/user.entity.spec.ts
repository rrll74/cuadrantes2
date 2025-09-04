import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

// Hacemos un mock del módulo 'bcrypt' para que las pruebas no dependan
// de la implementación real, sean más rápidas y predecibles.
jest.mock('bcrypt');

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    // Limpiamos los mocks antes de cada prueba para evitar interferencias
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash the password if it is plain text', async () => {
      const plainPassword = 'password123';
      const hashedPassword = 'hashed_password';
      user.password = plainPassword;

      // Configuramos el mock para que devuelva un valor predecible
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(user.password).toBe(hashedPassword);
    });

    it('should not hash the password if it is already hashed', async () => {
      const hashedPassword = '$2b$10$someRandomHashValue';
      user.password = hashedPassword;

      await user.hashPassword();

      // Verificamos que la función de hasheo NO fue llamada
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe(hashedPassword);
    });

    it('should do nothing if the password is not set', async () => {
      // user.password es 'undefined' por defecto al crear un nuevo User.
      // La siguiente línea es explícita pero redundante y causa el error de TS.
      // user.password = undefined;

      await user.hashPassword();

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBeUndefined();
    });

    it('should return false from validatePassword if password is not set', async () => {
      user.password = undefined;
      const isValid = await user.validatePassword('some-password');
      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return true for a correct password', async () => {
      const plainPassword = 'password123';
      user.password = 'hashed_password'; // El valor real no importa, solo que exista

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const isValid = await user.validatePassword(plainPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, user.password);
      expect(isValid).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const wrongPassword = 'wrong_password';
      user.password = 'hashed_password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const isValid = await user.validatePassword(wrongPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(wrongPassword, user.password);
      expect(isValid).toBe(false);
    });
  });
});
