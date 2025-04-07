// File path: packages/crawler/src/utils/Logger.ts
import chalk from 'chalk';

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
  
  // ANSI color codes for various log types
  private static colors = {
    reset: chalk.reset,
    debug: chalk.gray,
    info: chalk.white,
    warn: chalk.yellow,
    error: chalk.red,
    success: chalk.green,
    highlight: chalk.cyan,
    navigation: chalk.bgBlue.white.bold,
    site: chalk.bgCyan.black.bold,
    job: chalk.bgGreen.black,
    step: chalk.magenta.bold,
    context: chalk.blue.bold,
    timestamp: chalk.gray
  };
  
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
   * Log a success message (green)
   */
  success(message: string, data?: Record<string, any>): void {
    this.logStyled(LogLevel.INFO, message, 'success', data);
  }
  
  /**
   * Log a navigation event (when crawler moves to a new URL)
   * Visually distinct with a blue background
   */
  navigation(url: string, data?: Record<string, any>): void {
    const message = `NAVIGATING TO: ${url}`;
    this.logStyled(LogLevel.INFO, message, 'navigation', data);
    
    // Add a visual separator for better readability
    const separator = "━".repeat(Math.min(100, url.length + 20));
    console.log(Logger.colors.reset(separator));
  }
  
  /**
   * Log when entering a new website or domain
   * Visually distinct with a cyan background
   */
  site(domain: string, data?: Record<string, any>): void {
    const message = `NEW SITE: ${domain}`;
    this.logStyled(LogLevel.INFO, message, 'site', data);
    
    // Add a visual separator for better readability
    const separator = "═".repeat(Math.min(100, domain.length + 15));
    console.log(Logger.colors.reset(separator));
  }
  
  /**
   * Log a job discovery event
   * Visually distinct with a green background
   */
  job(title: string, organization: string, data?: Record<string, any>): void {
    const message = `JOB FOUND: ${title} at ${organization}`;
    this.logStyled(LogLevel.INFO, message, 'job', data);
  }
  
  /**
   * Log a process step with a number
   * Visually distinct with magenta color
   */
  step(stepNumber: number, stepName: string, data?: Record<string, any>): void {
    const message = `STEP ${stepNumber}: ${stepName}`;
    this.logStyled(LogLevel.INFO, message, 'step', data);
  }
  
  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    this.logStyled(level, message, level === LogLevel.ERROR ? 'error' : 
                                    level === LogLevel.WARN ? 'warn' : 
                                    level === LogLevel.DEBUG ? 'debug' : 'info', data);
  }
  
  /**
   * Log a message with a specific style
   */
  private logStyled(level: LogLevel, message: string, style: keyof typeof Logger.colors, data?: Record<string, any>): void {
    // Skip if below the configured level
    if (level < Logger.globalLevel) {
      return;
    }
    
    // Format timestamp
    const timestamp = Logger.colors.timestamp(new Date().toISOString().substring(11, 19));
    
    // Format the context prefix
    const contextPrefix = Logger.colors.context(`[${this.context}]`);
    
    // Choose the appropriate console method
    const logMethod = this.getLogMethod(level);
    
    // Get the style function
    const styleMethod = Logger.colors[style] || Logger.colors.info;
    
    // Format the message
    const formattedMessage = `${timestamp} ${contextPrefix} ${styleMethod(message)}`;
    
    // Log the message with or without data
    if (data) {
      logMethod(formattedMessage);
      // Format data in a nicer way
      console.dir(data, { depth: 3, colors: true });
    } else {
      logMethod(formattedMessage);
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