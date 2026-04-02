import type { LoggerService } from '@nestjs/common';

/**
 * Emits one JSON object per line (CloudWatch / log aggregators).
 * Use in production or when LOG_FORMAT=json.
 */
export class JsonLoggerService implements LoggerService {
  /**
   * @param message - Mensaje principal
   * @param context - Contexto Nest (nombre de clase)
   */
  public log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  /**
   * @param message - Mensaje de error
   * @param stack - Stack trace opcional
   * @param context - Contexto Nest
   */
  public error(message: unknown, stack?: string, context?: string): void {
    this.write('error', message, context, stack);
  }

  /**
   * @param message - Advertencia
   * @param context - Contexto Nest
   */
  public warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  /**
   * @param message - Mensaje debug
   * @param context - Contexto Nest
   */
  public debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  /**
   * @param message - Mensaje verbose
   * @param context - Contexto Nest
   */
  public verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  /**
   * Serializa un evento de log a una línea JSON.
   * @param level - Nivel lógico
   * @param message - Carga útil
   * @param context - Contexto opcional
   * @param stack - Stack opcional (errores)
   */
  private write(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const payload: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      context: context ?? 'Application',
      msg: this.serializeMessage(message),
    };
    if (stack !== undefined && stack.length > 0) {
      payload.stack = stack;
    }
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  /**
   * Convierte un mensaje a string seguro para JSON.
   * @param message - Valor de Nest Logger
   * @returns Representación en string
   */
  private serializeMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof Error) {
      return message.message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
