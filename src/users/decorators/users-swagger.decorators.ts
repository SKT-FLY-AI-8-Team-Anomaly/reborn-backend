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

/** GET /users/me API 문서 */
export function ApiGetProfile() {
  return applyDecorators(
    ApiOperation({
      summary: '내 프로필',
      description: 'JWT로 로그인한 유저의 닉네임과 프로필 이미지 URL을 반환합니다. 프로필은 최신 캐릭터 이미지입니다.',
    }),
    ApiResponse({
      status: 200,
      description: '성공',
      schema: {
        type: 'object',
        properties: {
          nickname: { type: 'string', example: 'Anomaly' },
          profileUrl: { type: 'string', nullable: true, example: 'https://...' },
        },
      },
    }),
    ApiResponse({ status: 401, description: '인증 필요' }),
  );
}

/** POST /users/friends API 문서 */
export function ApiAddFriend() {
  return applyDecorators(
    ApiOperation({
      summary: '친구 추가',
      description: '닉네임으로 친구를 추가합니다. 본인 닉네임은 추가할 수 없고, 이미 친구인 경우 409를 반환합니다.',
    }),
    ApiResponse({
      status: 201,
      description: '친구 추가 성공',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: '친구가 추가되었습니다.' },
          friendId: { type: 'number', example: 2 },
          friendNickname: { type: 'string', example: '친구닉네임' },
        },
      },
    }),
    ApiResponse({ status: 400, description: '본인 닉네임은 추가할 수 없음' }),
    ApiResponse({ status: 404, description: '해당 닉네임의 유저를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '이미 친구인 유저' }),
    ApiResponse({ status: 401, description: '인증 필요' }),
  );
}

/** GET /users/friends API 문서 */
export function ApiGetFriends() {
  return applyDecorators(
    ApiOperation({
      summary: '친구 목록',
      description: '로그인한 유저의 친구 목록을 닉네임과 프로필 URL과 함께 반환합니다.',
    }),
    ApiResponse({
      status: 200,
      description: '성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            friendId: { type: 'number', example: 2 },
            nickname: { type: 'string', example: '친구닉네임' },
            profileUrl: { type: 'string', nullable: true, example: 'https://...' },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: '인증 필요' }),
  );
}
