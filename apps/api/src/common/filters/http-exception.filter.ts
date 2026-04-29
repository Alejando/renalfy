import {
  ExceptionFilter,
  Catch,
  HttpException,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    let message = exception.getResponse();

    // In production, mask sensitive error messages
    if (process.env.NODE_ENV === 'production') {
      const originalMessage = JSON.stringify(message);

      // Log the actual error for debugging
      this.logger.warn(`[${status}] ${originalMessage}`, exception.stack);

      // Check if message contains sensitive keywords
      if (
        typeof originalMessage === 'string' &&
        (originalMessage.toLowerCase().includes('database') ||
          originalMessage.toLowerCase().includes('query') ||
          originalMessage.toLowerCase().includes('connection') ||
          originalMessage.toLowerCase().includes('prisma') ||
          originalMessage.toLowerCase().includes('sql'))
      ) {
        // Replace with generic message for database errors
        message = {
          statusCode: status,
          message: 'An error occurred while processing your request',
          error: 'Server Error',
        };
      }
    }

    response.status(status).json(message);
  }
}
