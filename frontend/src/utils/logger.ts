/**
 * Frontend Structured Logger Utility
 * Handles log formatting, console output, and forwarding severe errors to backend/Sentry.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private sendToBackend(level: LogLevel, message: string, context?: LogContext) {
    try {
      const endpoint = `${this.apiBaseUrl}/api/logs`;
      const body = JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore transport errors to prevent log feedback loop
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message), context || '');
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message), context || '');
    this.sendToBackend('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    console.error(this.formatMessage('error', message), context || '');
    this.sendToBackend('error', message, context);
  }
}

export const logger = new Logger();
