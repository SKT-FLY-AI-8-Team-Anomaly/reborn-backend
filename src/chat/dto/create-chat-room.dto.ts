import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNotEmpty, MinLength, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatRoomDto {
  @ApiProperty({ description: '방 이름', example: '우리 방', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: '방 이름을 입력해 주세요.' })
  @MinLength(1, { message: '방 이름은 1자 이상이어야 합니다.' })
  @MaxLength(100, { message: '방 이름은 100자 이하여야 합니다.' })
  name: string;

  @ApiProperty({ description: '초대할 친구의 userId', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  friendUserId: number;
}
