import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class AddFriendDto {
  @ApiProperty({ description: '추가할 친구의 닉네임', example: '친구닉네임', minLength: 2, maxLength: 50 })
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해 주세요.' })
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '닉네임은 50자 이하여야 합니다.' })
  nickname: string;
}
