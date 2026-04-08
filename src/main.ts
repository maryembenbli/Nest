/*import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/*async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:8081', // React Native Web
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000, '0.0.0.0');
}
bootstrap();*/

/*async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:8081', // React Native Web
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000, '0.0.0.0');
}
bootstrap();*/
/*async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Autorise mobile + web pendant dev
  app.enableCors();

  await app.listen(3000, '0.0.0.0');
}

bootstrap();
*/
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  //  app.enableCors({
  //   origin: ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:5173'],
  //   credentials: true,
  // });
  app.enableCors({
  origin: (origin, callback) => {
    const allowed = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
    ];

    // allow Postman / curl (no origin)
    if (!origin) return callback(null, true);

    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
   app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);

  // app.useStaticAssets(join(__dirname, '..', 'uploads'), {
  //   prefix: '/uploads/',
  // });
   // ✅ serve uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
