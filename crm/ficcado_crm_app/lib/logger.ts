type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
  switch (level) {
    case 'error':
      console.error(prefix, message, context !== undefined ? context : '');
      break;
    case 'warn':
      console.warn(prefix, message, context !== undefined ? context : '');
      break;
    case 'info':
    case 'debug':
    default:
      console.log(prefix, message, context !== undefined ? context : '');
      break;
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
};
