import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.types';

/** request.user (JWT payload) 전체 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | number | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return undefined as unknown as JwtPayload;
    if (data) return user[data];
    return user;
  },
);

/** request.user.sub → userId */
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): number | undefined => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as JwtPayload | undefined;
  return user?.sub;
});

/** request.user.nickname */
export const UserNickname = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as JwtPayload | undefined;
  return user?.nickname;
});
