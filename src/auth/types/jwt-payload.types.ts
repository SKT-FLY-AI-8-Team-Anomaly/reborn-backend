/** JWT 토큰 payload (로그인 시 sign에 사용, 검증 후 request.user에 담김) */
export interface JwtPayload {
  sub: number; // userId
  nickname: string;
}
