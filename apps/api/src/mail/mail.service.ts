/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  MailConfig,
  SendMailOptions,
} from './interfaces/mail-config.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private mailConfig: MailConfig;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporte de email basado en las variables de entorno
   * Intenta múltiples configuraciones si es necesario
   */
  private initializeTransporter(): void {
    try {
      let host = this.configService.get<string>('SMTP_HOST');
      const port = this.configService.get<number>('SMTP_PORT');
      let user = this.configService.get<string>('SMTP_USER');
      let pass = this.configService.get<string>('SMTP_PASSWORD');
      let from = this.configService.get<string>('SMTP_FROM');
      // Parsear correctamente el valor booleano desde string
      const secureString = this.configService.get<string>(
        'SMTP_SECURE',
        'false',
      );
      const secure = secureString === 'true' || secureString === '1';

      // Limpiar espacios en blanco de credenciales (común en contraseñas de aplicación)
      if (host) host = host.trim();
      if (user) user = user.trim();
      if (pass) pass = pass.trim();
      if (from) from = from.trim();

      // Si no están configuradas todas las variables, loguear y continuar sin transporte
      if (!host || !port || !user || !pass || !from) {
        this.logger.warn(
          'Email no configurado: faltan variables de entorno SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD o SMTP_FROM',
        );
        return;
      }

      // Configuración del transporte SMTP
      // Para puerto 587: usar TLS (secure=false, requiere STARTTLS)
      // Para puerto 465: usar SSL (secure=true)
      const transportConfig: any = {
        host,
        port,
        secure, // true para SSL/465, false para TLS/587
        auth: {
          user,
          pass,
        },
        from,
        // Opciones de conexión más robustas
        pool: {
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 4000,
          rateLimit: 14,
        },
        // Reintentos y timeouts
        socketTimeout: 5 * 60 * 1000, // 5 minutos
        connectionTimeout: 5 * 60 * 1000, // 5 minutos
        // Logging para debugging
        logger: true,
        debug: false, // Cambiar a true para más verbosidad
      };

      // Configuración específica según puerto
      if (port === 587 && !secure) {
        // TLS con STARTTLS (puerto 587)
        transportConfig.requireTLS = true;
        transportConfig.tls = {
          rejectUnauthorized: false, // Entorno de desarrollo
          minVersion: 'TLSv1.2',
        };
        this.logger.log('Usando TLS/STARTTLS (puerto 587)');
      } else if (port === 465 && secure) {
        // SSL directo (puerto 465)
        transportConfig.tls = {
          rejectUnauthorized: false, // Entorno de desarrollo
          minVersion: 'TLSv1.2',
        };
        this.logger.log('Usando SSL/SMTPS (puerto 465)');
      } else if (port !== 587 && port !== 465) {
        // Otro puerto (ej: 25 sin encriptación)
        transportConfig.tls = {
          rejectUnauthorized: false,
        };
        this.logger.log(`Usando puerto personalizado: ${port}`);
      }

      this.mailConfig = {
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        from,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.transporter = nodemailer.createTransport(transportConfig);

      this.logger.log(
        `✅ Servicio de email inicializado: ${host}:${port} (usuario: ${user}, secure: ${secure})`,
      );
    } catch (error) {
      this.logger.error('❌ Error al inicializar el servicio de email', error);
    }
  }

  /**
   * Verifica si el servicio de email está configurado correctamente
   */
  isConfigured(): boolean {
    return !!this.transporter;
  }

  /**
   * Envía un email con los parámetros especificados
   */
  async sendMail(
    options: SendMailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      const errorMsg =
        'El servicio de email no está configurado. Configure las variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM';
      this.logger.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    try {
      this.logger.log(
        `Enviando email a: ${options.to}, asunto: ${options.subject}`,
      );

      const result = await this.transporter.sendMail({
        from: this.mailConfig.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(
        `Email enviado exitosamente a ${options.to}. MessageId: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido al enviar email';
      const fullError =
        error instanceof Error
          ? error.stack || error.message
          : JSON.stringify(error);

      this.logger.error(
        `Error al enviar email a ${options.to}: ${errorMessage}`,
      );
      this.logger.debug(`Stack trace completo: ${fullError}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Prueba la conexión SMTP con información detallada
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return {
        success: false,
        message:
          'Transporte de email no configurado. Verifica variables SMTP en .env',
      };
    }

    try {
      this.logger.log('Iniciando verificación de conexión SMTP...');
      await this.transporter.verify();

      const config = this.mailConfig;
      this.logger.log('Conexión SMTP verificada exitosamente');

      return {
        success: true,
        message: `✅ Conexión SMTP exitosa: ${config.host}:${config.port} (usuario: ${config.auth.user}, de: ${config.from})`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      const errorCode =
        error instanceof Error && 'code' in error ? (error as any).code : 'N/A';

      this.logger.error(
        `Error conexión SMTP: ${errorMessage} (código: ${errorCode})`,
        error,
      );

      let advice = '';
      if (
        errorMessage.includes('wrong version') ||
        errorMessage.includes('ssl3_get_record')
      ) {
        advice =
          ' → Verifica SMTP_SECURE: puerto 587 usa false, puerto 465 usa true';
      } else if (errorMessage.includes('authentication')) {
        advice =
          ' → Verifica SMTP_USER y SMTP_PASSWORD (especialmente caracteres especiales)';
      } else if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT')
      ) {
        advice = ' → Timeout: Verifica host, puerto y conectividad de red';
      }

      return {
        success: false,
        message: `❌ Error SMTP: ${errorMessage}${advice}`,
      };
    }
  }
}
