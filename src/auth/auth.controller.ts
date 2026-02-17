import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiAuthTag, ApiLogin } from './decorators/auth-swagger.decorators';

@ApiAuthTag()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiLogin()
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.nickname, dto.password);
  }
}
