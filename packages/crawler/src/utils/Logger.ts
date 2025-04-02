// src/utils/Logger.ts
import { ILogger } from '../interfaces/ILogger';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export class Logger implements ILogger {
  private context: string;
  private static globalLevel: LogLevel = LogLevel.INFO;
  
  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }
  
  constructor(context: string) {
    this.context = context;
  }
  
  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (level < Logger.globalLevel) return;
    
    const prefix = `[${this.context}]`;
    const logMethod = this.getLogMethod(level);
    
    if (data) {
      logMethod(`${prefix} ${message}`, data);
    } else {
      logMethod(`${prefix} ${message}`);
    }
  }
  
  private getLogMethod(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG: return console.debug;
      case LogLevel.INFO: return console.log;
      case LogLevel.WARN: return console.warn;
      case LogLevel.ERROR: return console.error;
      default: return console.log;
    }
  }
}