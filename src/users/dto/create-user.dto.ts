import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '닉네임', example: '닉네임', minLength: 2, maxLength: 20 })
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해 주세요.' })
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 20자 이하여야 합니다.' })
  nickname: string;

  @ApiProperty({ description: '비밀번호', example: 'password123', minLength: 4 })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해 주세요.' })
  @MinLength(4, { message: '비밀번호는 4자 이상이어야 합니다.' })
  password: string;

  @ApiProperty({ description: '비밀번호 확인', example: 'password123', minLength: 4 })
  @IsString()
  @IsNotEmpty({ message: '비밀번호 확인을 입력해 주세요.' })
  passwordConfirm: string;
}
