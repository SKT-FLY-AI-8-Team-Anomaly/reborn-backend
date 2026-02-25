import { FileFieldsInterceptor } from '@nestjs/platform-express';

/** 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** CJS에서 multer는 default가 없을 수 있음. require로 런타임에 로드 */
function getMemoryStorage(): ReturnType<typeof import('multer').memoryStorage> {
  const m = require('multer');
  const multer = m?.default ?? m;
  return multer.memoryStorage();
}

/**
 * multipart/form-data에서 sessionId, text(필드)와 images(파일 배열) 파싱.
 * req.body에 sessionId, text, req.files에 { images?: Express.Multer.File[] } 설정.
 */
export const FormDataFieldsInterceptor = FileFieldsInterceptor(
  [{ name: 'images', maxCount: 5 }],
  {
    storage: getMemoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
  },
);
