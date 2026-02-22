import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddChatRoomMembersDto {
  @ApiProperty({
    description: '추가할 멤버의 userId 목록 (친구만 가능)',
    example: [3, 4],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '최소 1명 이상의 멤버를 선택해 주세요.' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  userIds: number[];
}
