import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateCharacterDto {
  @ApiProperty({ description: '사진 base64 (data:image/... 또는 순수 base64)' })
  @IsString()
  @IsNotEmpty({ message: '이미지를 입력해 주세요.' })
  imageBase64: string;
}
