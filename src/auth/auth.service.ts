import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    nickname: string,
    password: string,
  ): Promise<{ accessToken: string; user: { id: number; nickname: string } }> {
    const user = await this.usersService.findByNickname(nickname);
    if (!user) {
      throw new UnauthorizedException('닉네임 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('닉네임 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload = { sub: user.id, nickname: user.nickname };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, nickname: user.nickname },
    };
  }
}
