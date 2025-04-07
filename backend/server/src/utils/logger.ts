class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: Record<string, unknown> | unknown | string): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${typeof meta === 'string' ? meta : JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] [${this.context}] ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, unknown> | string): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  error(message: string, error?: unknown): void {
    console.error(this.formatMessage('ERROR', message, error));
  }

  warn(message: string, meta?: Record<string, unknown> | string): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  debug(message: string, meta?: Record<string, unknown> | string): void {
    console.debug(this.formatMessage('DEBUG', message, meta));
  }
}

export default Logger; 