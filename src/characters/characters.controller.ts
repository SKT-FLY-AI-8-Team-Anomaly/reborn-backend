import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer'; // Express.Multer.File 타입 로드
import { ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { GenerateCharacterDto } from './dto/generate-character.dto';
import { CreateCharacterDto } from './dto/create-character.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserId } from '../auth/decorators/current-user.decorator';

@ApiBearerAuth()
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  /** 프로필 생성 (동기) - multipart 파일 업로드 */
  @Post('profiles/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: '이미지 파일 (PNG/JPG)' },
      },
      required: ['image'],
    },
  })
  async createProfileUpload(
    @UserId() userId: number | undefined,
    @CurrentUser() user: { sub?: number; nickname?: string } | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('[profiles/upload] JWT 추출:', { userId, user });
    if (userId == null) {
      throw new Error('userId is required');
    }
    if (!file?.buffer) {
      throw new BadRequestException('image 파일이 필요합니다.');
    }
    return this.charactersService.generateProfile(userId, file.buffer);
  }

  /** 프로필 생성 (동기) - JSON base64 */
  @Post('profiles')
  @UseGuards(JwtAuthGuard)
  async createProfile(@UserId() userId: number | undefined, @Body() dto: GenerateCharacterDto) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.charactersService.generateProfile(userId, dto.imageBase64);
  }

  /** 캐릭터 생성 (수락한 프로필로 모션 시트 생성 시작) */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@UserId() userId: number | undefined, @Body() dto: CreateCharacterDto) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.charactersService.accept(userId, dto.profileUrl);
  }

  /** AI 서버 콜백 - 모션 생성 완료/실패 시 호출 (JWT 없음, 내부/AI 전용) */
  @Post('motion-callback')
  async motionCallback(
    @Body() body: { jobId?: string; userId?: number; success?: boolean | string },
  ) {
    const { jobId, userId, success: rawSuccess } = body;
    if (jobId == null || userId == null) {
      throw new BadRequestException('jobId, userId 필요');
    }
    // success: boolean 또는 "true"/"false" 문자열 허용
    const success: boolean | undefined =
      rawSuccess === true || rawSuccess === 'true'
        ? true
        : rawSuccess === false || rawSuccess === 'false'
          ? false
          : undefined;
    if (success === undefined) {
      throw new BadRequestException('success (boolean) 필요');
    }
    console.log('[motion-callback]', { jobId, userId, success });
    await this.charactersService.handleMotionCallback(String(jobId), Number(userId), success);
    return { ok: true };
  }

  /** 캐릭터 조회 (상태 포함) */
  @Get(':jobId')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @UserId() userId: number | undefined,
    @Param('jobId') jobId: string,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.charactersService.getStatus(userId, jobId);
  }
}
