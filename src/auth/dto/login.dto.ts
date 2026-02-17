import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '닉네임', example: '닉네임' })
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해 주세요.' })
  nickname: string;

  @ApiProperty({ description: '비밀번호', example: 'password123', minLength: 4 })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해 주세요.' })
  @MinLength(4, { message: '비밀번호는 4자 이상이어야 합니다.' })
  password: string;
}
