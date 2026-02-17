import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// 실행 위치와 관계없이 프로젝트 루트의 .env 로드 (node dist/main.js 시 dist 기준 상위)
loadEnv({ path: resolve(__dirname, '../.env') });

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
