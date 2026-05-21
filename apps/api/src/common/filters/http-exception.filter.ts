import {
  ExceptionFilter,
  Catch,
  HttpException,
  ArgumentsHost,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      let message = exception.getResponse();

      // In production, mask sensitive error messages
      if (isProduction) {
        const originalMessage = JSON.stringify(message);

        // Log the actual error for debugging (no stack trace in logs)
        this.logger.warn(`[${status}] ${exception.name}: ${originalMessage}`);

        // Check if message contains sensitive keywords
        if (typeof originalMessage === 'string') {
          const lower = originalMessage.toLowerCase();
          const sensitiveKeywords = [
            'database',
            'query',
            'connection',
            'prisma',
            'sql',
            'stack',
            'trace',
            'internal',
            'postgres',
            'syntax',
          ];
          if (sensitiveKeywords.some((kw) => lower.includes(kw))) {
            message = {
              statusCode: status,
              message: 'An error occurred while processing your request',
              error: 'Server Error',
            };
          }
        }
      }

      response.status(status).json(message);
    } else {
      // Non-HttpException (TypeError, Prisma errors, unhandled rejections)
      this.logger.error('Unhandled exception', {
        error: (exception as Error).name,
        message: (exception as Error).message,
      });

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        isProduction
          ? {
              statusCode: 500,
              message: 'Internal server error',
              error: 'Server Error',
            }
          : {
              statusCode: 500,
              message: (exception as Error).message || 'Internal server error',
              error: 'Server Error',
            },
      );
    }
  }
}
