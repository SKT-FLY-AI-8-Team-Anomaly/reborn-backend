import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const USERS_TAG = 'users';

/** Users 컨트롤러용 Swagger 태그 (컨트롤러에 1회만 적용) */
export function ApiUsersTag() {
  return applyDecorators(ApiTags(USERS_TAG));
}

/** POST /users/sign-up API 문서 */
export function ApiSignUp() {
  return applyDecorators(
    ApiOperation({
      summary: '회원가입',
      description: '닉네임과 비밀번호로 회원가입합니다.',
    }),
    ApiResponse({ status: 201, description: '회원가입 성공' }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 (비밀번호 불일치, 유효성 검증 실패)',
    }),
    ApiResponse({ status: 409, description: '이미 사용 중인 닉네임' }),
  );
}
