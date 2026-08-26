import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { syncRbac } from '../prisma/rbac';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // In production the API sits behind a reverse proxy (Railway), so the client
  // IP is in X-Forwarded-For. Trust it so rate limiting keys on the real caller
  // rather than lumping every request under the proxy's single address.
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.use(cookieParser());
  // Sets a baseline of security response headers (X-Content-Type-Options,
  // X-Frame-Options, HSTS, etc.). CSP is left off here because the API also
  // serves the SPA and uploaded images cross-origin — enabling it would need a
  // policy tailored to those, which belongs in a follow-up.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  // Reconciles the Permission/Role tables with the in-code catalogue
  // (apps/api/src/auth/permissions.ts) on every boot — idempotent and
  // non-destructive, so a new permission added in code is live in every
  // environment (including production) on the next deploy, with no separate
  // manual `db:seed:rbac` step to remember. Logged but not fatal: a
  // transient DB hiccup here shouldn't crash-loop the whole API.
  try {
    const { permissions, roles } = await syncRbac(app.get(PrismaService));
    console.log(`RBAC synced — ${permissions} permissions across ${roles} roles.`);
  } catch (err) {
    console.error('RBAC sync failed — permissions may be stale until the next successful boot.', err);
  }

  // Localhost dev origins are only trusted outside production. In production the
  // browser app runs on FRONTEND_URL, so that is the sole allowed origin — a
  // stray localhost entry there would let any locally-hosted page ride the
  // user's cookies against the live API.
  const isProd = process.env.NODE_ENV === 'production';
  const devOrigins = isProd
    ? []
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
  const allowedOrigins = process.env.FRONTEND_URL
    ? [...devOrigins, process.env.FRONTEND_URL]
    : devOrigins;

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Inventory Management API')
    .setDescription('REST API for the inventory management system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
