/**
 * Conditional logger utility
 * Only logs in development mode, silent in production
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

const createLogger = (level: LogLevel) => {
  return (...args: unknown[]) => {
    if (isDevelopment) {
      console[level](...args);
    }
  };
};

export const logger = {
  log: createLogger('log'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  debug: createLogger('debug'),
  
  // Group logs for related operations
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
  
  // Table for structured data
  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
  
  // Time operations
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

export default logger;
