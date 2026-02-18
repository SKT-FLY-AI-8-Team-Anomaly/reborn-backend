import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: unknown, info: unknown, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization;
    const hasBearer = authHeader?.startsWith('Bearer ');
    const tokenPreview = authHeader ? `${authHeader.slice(0, 25)}...` : '(없음)';

    console.log('[JwtAuthGuard]', {
      path: req.url,
      hasAuth: !!authHeader,
      hasBearer,
      tokenPreview,
      err: err != null ? String(err) : null,
      info: info != null ? String(info) : null,
    });

    return super.handleRequest(err, user, info, context);
  }
}
