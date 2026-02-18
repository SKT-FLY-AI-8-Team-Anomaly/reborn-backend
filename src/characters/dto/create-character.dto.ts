import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateCharacterDto {
  @ApiProperty({ description: '수락한 프로필 이미지 Blob URL (POST /characters/profiles 응답의 profileUrl)' })
  @IsString()
  @IsNotEmpty({ message: 'profileUrl을 입력해 주세요.' })
  @IsUrl()
  profileUrl: string;
}
