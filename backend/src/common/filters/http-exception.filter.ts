import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// Единый формат ошибок API согласно SRS, раздел 11.1:
// { "error": { "code": "...", "message": "...", "details": {} } }
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const serverError = status >= HttpStatus.INTERNAL_SERVER_ERROR;

    const message = serverError
      ? 'Внутренняя ошибка сервера'
      : (body && typeof body === 'object' && (body as any).message) || 'Ошибка запроса';

    const code =
      (serverError ? 'INTERNAL_ERROR' : body && typeof body === 'object' && (body as any).code) ||
      HttpStatus[status] ||
      'INTERNAL_ERROR';

    response.status(status).json({
      error: {
        code,
        message,
        details: serverError ? {} : (body && typeof body === 'object' && (body as any).details) || {},
      },
    });
  }
}
