import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// 실행 위치와 관계없이 프로젝트 루트의 .env 로드 (node dist/main.js 시 dist 기준 상위)
loadEnv({ path: resolve(__dirname, '../.env') });

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // AI 콜백이 큰 JSON(files, file_urls 등) 보낼 수 있으므로 제한 완화 (기본 100kb → 10mb)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: true, // 개발 시 모든 origin 허용. 운영에서는 특정 도메인만 넣기 (예: ['https://example.com'])
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Reborn API')
    .setDescription('Reborn 백엔드 API 문서')
    .setVersion('1.0')
    .addTag('users', '회원 관련')
    .addTag('auth', '인증')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(String(process.env.PORT ?? 3000), 10);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
