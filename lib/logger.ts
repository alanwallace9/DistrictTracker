type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

class Logger {
  private redactSensitiveFields(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['email', 'password', 'token', 'secret', 'key', 'api_key', 'access_token'];
    const redacted = { ...data };

    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }

    return redacted;
  }

  private formatLog(level: LogLevel, message: string, data?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this.redactSensitiveFields(data) : undefined,
    };
  }

  info(message: string, data?: Record<string, any>) {
    const log = this.formatLog('info', message, data);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${log.message}`, log.data || '');
    }
  }

  warn(message: string, data?: Record<string, any>) {
    const log = this.formatLog('warn', message, data);
    console.warn(`[WARN] ${log.message}`, log.data || '');
  }

  error(message: string, error?: any) {
    const log = this.formatLog('error', message, {
      error: error?.message || error,
    });
    console.error(`[ERROR] ${log.message}`, log.data);
  }

  debug(message: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      const log = this.formatLog('debug', message, data);
      console.debug(`[DEBUG] ${log.message}`, log.data || '');
    }
  }
}

export const logger = new Logger();
