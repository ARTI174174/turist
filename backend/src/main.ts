import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Treat every environment other than an explicitly local/test run as production.
  // An unset NODE_ENV must never silently enable permissive CORS or HTTP cookies.
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const isProduction = !isDevelopment;
  const jwtSecret = process.env.JWT_ACCESS_SECRET;

  if (!isDevelopment && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('JWT_ACCESS_SECRET must be set and contain at least 32 characters outside development/test');
  }

  const app = await NestFactory.create(AppModule, { cors: false });

  // Минимальные security headers без добавления новой зависимости.
  app.use((req: any, res: any, next: () => void) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  const allowedOrigins = (
    process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean)
    ?? []
  );

  // В production не открываем API для произвольных сайтов.
  // Если CORS_ORIGIN не задан, разрешаем только официальный frontend.
  const corsOrigins = allowedOrigins.length > 0
    ? allowedOrigins
    : isProduction
      ? ['https://turist-zeta.vercel.app']
      : true;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('ТУРИСТ API')
    .setDescription('API геолокационной игры "ТУРИСТ" — Челябинская область')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ТУРИСТ API запущен на порту ${port}`);
}

bootstrap();
