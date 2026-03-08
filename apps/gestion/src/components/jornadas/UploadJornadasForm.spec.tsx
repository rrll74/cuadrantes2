import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IMPORT_TYPES } from '@cuadrantes/shared-dto';
import { UploadJornadasForm } from './UploadJornadasForm';
import { useFileUpload } from '@/hooks/useFileUpload';
import api from '@/lib/api';

jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => true,
}));

jest.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 1 } }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('UploadJornadasForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <UploadJornadasForm />
      </QueryClientProvider>,
    );

  it('muestra por defecto los campos del tipo 2', () => {
    (useFileUpload as jest.Mock).mockImplementation(() => ({
      files: {
        trabajadores: null,
        fichajes: null,
        rutas: null,
        rutasDocumento: null,
      },
      handleFileChange: jest.fn(),
      validateFiles: jest.fn().mockReturnValue(null),
      resetFiles: jest.fn(),
    }));

    renderComponent();

    expect(screen.getByText(/Tipo 2: Formato Secundario/i)).toBeInTheDocument();
    expect(screen.getByText(/Rutas \(Excel\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Rutas con documento \(Txt\) - Opcional/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Rutas Titulares \(Excel\)/i)).not.toBeInTheDocument();
  });

  it('muestra error de validacion al enviar si faltan archivos requeridos', async () => {
    (useFileUpload as jest.Mock).mockReturnValue({
      files: {},
      handleFileChange: jest.fn(),
      validateFiles: jest
        .fn()
        .mockReturnValue('Faltan archivos requeridos: trabajadores, fichajes, rutas.'),
      resetFiles: jest.fn(),
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /procesar archivos/i }));

    expect(
      await screen.findByText(/Faltan archivos requeridos: trabajadores, fichajes, rutas\./i),
    ).toBeInTheDocument();
  });

  it('envia importType=2 y archivos tipo 2 al procesar', async () => {
    const trabajadores = new File(['w'], 'trabajadores.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fichajes = new File(['f'], 'fichajes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const rutas = new File(['r'], 'rutas.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const rutasDocumento = new File(['txt'], 'rutas.txt', { type: 'text/plain' });

    (useFileUpload as jest.Mock).mockImplementation(() => ({
      files: {
        trabajadores,
        fichajes,
        rutas,
        rutasDocumento,
      },
      handleFileChange: jest.fn(),
      validateFiles: jest.fn().mockReturnValue(null),
      resetFiles: jest.fn(),
    }));

    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        sessionId: 321,
        stats: { procesados: 10, conflictos: 0, totalRutas: 10 },
      },
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /procesar archivos/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    const [, formData] = (api.post as jest.Mock).mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('importType')).toBe(String(IMPORT_TYPES.SECONDARY));
    expect(formData.get('trabajadores')).toBe(trabajadores);
    expect(formData.get('fichajes')).toBe(fichajes);
    expect(formData.get('rutas')).toBe(rutas);
    expect(formData.get('rutasDocumento')).toBe(rutasDocumento);

    const monthInfoRaw = String(formData.get('monthInfo'));
    const monthInfo = JSON.parse(monthInfoRaw) as { isHighSeason: boolean };
    expect(monthInfo.isHighSeason).toBe(true);
  });

  it('al cambiar a tipo 1 envia los archivos de tipo 1 e importType=1', async () => {
    const titulares = new File(['t'], 'titulares.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const auxiliares = new File(['a'], 'auxiliares.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const trabajadores = new File(['w'], 'trabajadores.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fichajes = new File(['f'], 'fichajes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    (useFileUpload as jest.Mock).mockImplementation((importType: number) => {
      if (importType === IMPORT_TYPES.PRIMARY) {
        return {
          files: {
            titulares,
            auxiliares,
            trabajadores,
            fichajes,
          },
          handleFileChange: jest.fn(),
          validateFiles: jest.fn().mockReturnValue(null),
          resetFiles: jest.fn(),
        };
      }

      return {
        files: {
          trabajadores: null,
          fichajes: null,
          rutas: null,
          rutasDocumento: null,
        },
        handleFileChange: jest.fn(),
        validateFiles: jest.fn().mockReturnValue(null),
        resetFiles: jest.fn(),
      };
    });

    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        sessionId: 987,
        stats: { procesados: 8, conflictos: 0, totalRutas: 8 },
      },
    });

    renderComponent();

    fireEvent.click(screen.getByRole('radio', { name: /Tipo 1: Formato Original/i }));
    expect(screen.getByText(/Rutas Titulares \(Excel\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /procesar archivos/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    const [, formData] = (api.post as jest.Mock).mock.calls[0];
    expect(formData.get('importType')).toBe(String(IMPORT_TYPES.PRIMARY));
    expect(formData.get('titulares')).toBe(titulares);
    expect(formData.get('auxiliares')).toBe(auxiliares);
    expect(formData.get('trabajadores')).toBe(trabajadores);
    expect(formData.get('fichajes')).toBe(fichajes);
    expect(formData.get('rutas')).toBeNull();
  });
});
