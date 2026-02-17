import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Swagger 컨트롤러 태그만 적용하는 데코레이터.
 * 컨트롤러에서 @ApiTag('users') 대신 도메인별 데코레이터 사용용.
 */
export function ApiTag(tag: string) {
  return applyDecorators(ApiTags(tag));
}
