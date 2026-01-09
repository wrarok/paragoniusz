/* eslint-disable no-console */
/**
 * Logger utility
 *
 * Provides structured logging with environment-aware behavior:
 * - Development: Logs to console with formatted output
 * - Production: Silent (can be extended to send to error tracking service)
 *
 * Replaces direct console.log calls throughout the application
 *
 * Note: console usage is intentional here - this is the logging abstraction layer
 */

type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown>;

/**
 * Check if we're in development environment
 * Uses runtime check that works across all environments
 */
const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Logger class with environment-aware methods
 */
class Logger {
  /**
   * Log informational message
   */
  info(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.info(formatMessage("info", message, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.warn(formatMessage("warn", message, context));
    }
  }

  /**
   * Log error message
   * In production, this should send to error tracking service (Sentry, etc.)
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (isDevelopment) {
      console.error(formatMessage("error", message, context));
      if (error) {
        console.error(error);
      }
    }

    // TODO: In production, send to error tracking service
    // Example: Sentry.captureException(error, { extra: context });
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.debug(formatMessage("debug", message, context));
    }
  }

  /**
   * Create a child logger with a specific namespace
   */
  namespace(ns: string): NamespacedLogger {
    return new NamespacedLogger(ns);
  }
}

/**
 * Namespaced logger for better organization
 */
class NamespacedLogger {
  constructor(private namespace: string) {}

  info(message: string, context?: LogContext): void {
    logger.info(`[${this.namespace}] ${message}`, context);
  }

  warn(message: string, context?: LogContext): void {
    logger.warn(`[${this.namespace}] ${message}`, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    logger.error(`[${this.namespace}] ${message}`, error, context);
  }

  debug(message: string, context?: LogContext): void {
    logger.debug(`[${this.namespace}] ${message}`, context);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create namespaced loggers for specific modules
 */
export const scanFlowLogger = logger.namespace("ScanFlow");
export const authLogger = logger.namespace("Auth");
export const apiLogger = logger.namespace("API");
