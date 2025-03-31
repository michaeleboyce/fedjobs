// File path: packages/crawler/src/utils/Logger.ts
/**
 * Logger levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Centralized logger for the crawler package
 * Provides structured logging with context and configurable levels
 */
export class Logger {
  private context: string;
  private static globalLevel: LogLevel = LogLevel.INFO;
  
  /**
   * Set the global logging level
   */
  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }
  
  /**
   * Create a new logger with the given context
   */
  constructor(context: string) {
    this.context = context;
  }
  
  /**
   * Log a debug message (most verbose)
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log an informational message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   */
  error(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    // Skip if below the configured level
    if (level < Logger.globalLevel) {
      return;
    }
    
    // Format the context prefix
    const prefix = `[${this.context}]`;
    
    // Choose the appropriate console method
    const logMethod = this.getLogMethod(level);
    
    // Log the message with or without data
    if (data) {
      logMethod(`${prefix} ${message}`, data);
    } else {
      logMethod(`${prefix} ${message}`);
    }
  }
  
  /**
   * Get the appropriate console method for the log level
   */
  private getLogMethod(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.log;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }
}