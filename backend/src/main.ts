import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';



async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    console.log('Cookies received:', req.cookies); // Diagnostic log
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  app.use(express.urlencoded({ limit: '50mb', extended: true }));


  const uploadsPath = join(process.cwd(), 'uploads');

  console.log('Static files serving from:', uploadsPath);

  const fs = require('fs');

  if (!fs.existsSync(uploadsPath)) {
    console.warn('Uploads directory does not exist. Creating it...');
    fs.mkdirSync(uploadsPath, { recursive: true });
    fs.mkdirSync(join(uploadsPath, 'leaves'), { recursive: true });
  }

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }, fallthrough: false
  }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const config = new DocumentBuilder()
    .setTitle('HR System API')
    .setDescription('API documentation — limited to safe public models (no secrets).')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', }, 'access-token',).build();

  const document = SwaggerModule.createDocument(app, config, {});

  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT) || 5000;

  await app.listen(port);

  console.log(`Application running on http://localhost:${port}`);

  console.log(`Swagger running on http://localhost:${port}/api`);
}
bootstrap()


