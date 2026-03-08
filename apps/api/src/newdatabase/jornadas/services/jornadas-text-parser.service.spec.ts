import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { JornadasTextParserService } from './jornadas-text-parser.service';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

describe('JornadasTextParserService', () => {
  let service: JornadasTextParserService;

  beforeEach(() => {
    service = new JornadasTextParserService();
    jest.clearAllMocks();
  });

  describe('parseTextFile', () => {
    it('deberia extraer rutas validas y eliminar duplicados', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        [
          'Carpeta/Hoja _ 101.pdf',
          'Carpeta/Hoja _ 202.webp',
          'Carpeta/Hoja _ 101.pdf',
        ].join('\n'),
      );

      const result = service.parseTextFile('fake-path.txt');

      expect(result).toEqual(new Set([101, 202]));
      expect(fs.readFileSync).toHaveBeenCalledWith('fake-path.txt', 'utf-8');
    });

    it('deberia ignorar lineas vacias y no validas', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        [' ', 'linea invalida', 'Carpeta/Hoja _ 333.pdf'].join('\n'),
      );

      const result = service.parseTextFile('fake-path.txt');

      expect(result).toEqual(new Set([333]));
    });

    it('deberia lanzar BadRequestException cuando falla la lectura', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('read failed');
      });

      expect(() => service.parseTextFile('fake-path.txt')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateTextFile', () => {
    it('deberia devolver true para archivo vacio', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('   \n\n  ');

      expect(service.validateTextFile('fake-path.txt')).toBe(true);
    });

    it('deberia devolver true para lineas validas', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        ['Carpeta/Hoja _ 10.pdf', 'Otra/Hoja _ 99.webp'].join('\n'),
      );

      expect(service.validateTextFile('fake-path.txt')).toBe(true);
    });

    it('deberia devolver false para linea invalida', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        ['Carpeta/Hoja _ 10.pdf', 'Hoja 77.pdf'].join('\n'),
      );

      expect(service.validateTextFile('fake-path.txt')).toBe(false);
    });

    it('deberia devolver false cuando falla la lectura', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('read failed');
      });

      expect(service.validateTextFile('fake-path.txt')).toBe(false);
    });
  });
});
