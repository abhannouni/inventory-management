import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { syncRbac } from '../prisma/rbac';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

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

  const devOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
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
