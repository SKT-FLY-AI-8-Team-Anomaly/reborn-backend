import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';

const AUTH_TAG = 'auth';

/** Auth 컨트롤러용 Swagger 태그 */
export function ApiAuthTag() {
  return applyDecorators(ApiTags(AUTH_TAG));
}

/** POST /auth/login API 문서 */
export function ApiLogin() {
  return applyDecorators(
    ApiOperation({
      summary: '로그인',
      description: '닉네임과 비밀번호로 로그인합니다.',
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 201,
      description: '로그인 성공',
      schema: {
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: { id: { type: 'number' }, nickname: { type: 'string' } },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '닉네임 또는 비밀번호가 올바르지 않습니다.',
    }),
  );
}
