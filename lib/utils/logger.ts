// lib/utils/logger.ts - Structured logging utility
type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  /**
   * Format timestamp for logs
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitize(context: LogContext): LogContext {
    const sanitized = { ...context };
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "apiKey",
      "creditCard",
    ];

    for (const key in sanitized) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = "***REDACTED***";
      }

      // Partially mask email addresses
      if (key === "email" && typeof sanitized[key] === "string") {
        const email = sanitized[key] as string;
        sanitized[key] = email.replace(/(.{3}).*(@.*)/, "$1***$2");
      }
    }

    return sanitized;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = this.getTimestamp();
    const sanitizedContext = context ? this.sanitize(context) : {};

    if (this.isProduction) {
      // In production, use structured JSON logging
      console.log(
        JSON.stringify({
          timestamp,
          level,
          message,
          ...sanitizedContext,
        }),
      );
    } else {
      // In development, use human-readable format
      const emoji = {
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
        debug: "🐛",
      }[level];

      console.log(`${emoji} [${level.toUpperCase()}] ${message}`);

      if (Object.keys(sanitizedContext).length > 0) {
        console.log("  Context:", sanitizedContext);
      }
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  /**
   * Log errors
   */
  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log("debug", message, context);
    }
  }

  /**
   * Log with custom level
   */
  custom(level: LogLevel, message: string, context?: LogContext) {
    this.log(level, message, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
