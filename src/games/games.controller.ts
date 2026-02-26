import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import 'multer';
import { GamesService, GamePlayPayload, GenerationCallbackBody } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/current-user.decorator';
import { FormDataFieldsInterceptor } from './interceptors/form-data-fields.interceptor';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('generate-with-preview')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FormDataFieldsInterceptor)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '게임 생성',
    description:
      '프론트는 이미지·텍스트만 전달. 백엔드에서 session_id(게임id), storage_url 생성 후 AI에 전달. AI 응답 후 Game 즉시 저장. 콜백 없음.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', description: '스토리 소스 텍스트 (필수)' },
        sessionId: { type: 'string', description: '게임 ID (선택, 미제공 시 백엔드에서 생성)' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: '참고 이미지 (선택, 최대 5장)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'session_id, accepted 등. AI 응답 + 백엔드에서 저장한 Game 반영',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 400, description: 'text 누락 또는 스토리 생성 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async generateWithPreview(
    @UserId() userId: number | undefined,
    @Req() req: Request,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    const body = req.body as Record<string, unknown>;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text) {
      throw new BadRequestException('text를 입력해 주세요.');
    }
    if (text.length > 10000) {
      throw new BadRequestException('text는 10000자 이하여야 합니다.');
    }
    const files = req.files as { images?: Express.Multer.File[] } | undefined;
    const imageFiles = files?.images?.filter((f) => f?.buffer) ?? [];
    return this.gamesService.generateWithPreview(userId, {
      sessionId: sessionId || undefined,
      text,
      imageFiles: imageFiles.map((f) => ({
        buffer: f.buffer,
        mimetype: f.mimetype || 'image/png',
        originalname: f.originalname || 'image.png',
      })),
    });
  }

  /** 게임 실행: game id → input_file_url에서 input.json 로드 후, JWT user의 character로 userNickname·playerSheet·characterDetail1/2 덮어씌워 반환 */
  @Get(':id/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '게임 실행 페이로드',
    description:
      'game id로 Game 조회 → input_file_url에서 input.json fetch → JWT 유저의 character로 userNickname, playerSheet, characterDetail1, characterDetail2 치환 후 JSON 반환.',
  })
  @ApiResponse({ status: 200, description: 'input.json 구조 (일부 필드 치환됨)' })
  @ApiResponse({ status: 404, description: '게임 없음 / input_file_url 없음 / input.json 로드 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getGameRun(
    @Param('id', ParseIntPipe) gameId: number,
    @UserId() userId: number | undefined,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (userId == null) {
      throw new BadRequestException('로그인이 필요합니다.');
    }
    const payload = await this.gamesService.getGameRunPayload(gameId, userId);
    res.json(payload);
  }

  /** 게임 코드로 실행 데이터 조회 (background, object, layout.json, result.json 등 불러오기) */
  @Get('by-code/:gameCode/play')
  @ApiOperation({
    summary: '게임 코드로 실행 데이터',
    description:
      '생성 시 사용한 game_code로 play 페이로드 조회. assets.background, interactiveObjects[].image, layout/result 병합 데이터 포함.',
  })
  @ApiResponse({ status: 200, description: 'GamePlayPayload' })
  @ApiResponse({ status: 404, description: 'game_code에 해당하는 게임 없음' })
  async getPlayDataByGameCode(@Param('gameCode') gameCode: string): Promise<GamePlayPayload> {
    return this.gamesService.getPlayDataByGameCode(gameCode);
  }

  /** 게임 실행 시 필요한 전체 데이터 (title, userNickname, assets, interactiveObjects 등) */
  @Get(':id/play')
  @ApiOperation({
    summary: '게임 실행 데이터 (ID)',
    description:
      '게임 실행 시 프론트에 전달할 페이로드. title, userNickname, assetVersion, objectScale, layoutType, mood, assets, interactiveObjects(quiz 포함). historySamples는 현재 빈 배열.',
  })
  @ApiResponse({ status: 200, description: 'GamePlayPayload' })
  @ApiResponse({ status: 404, description: '게임 없음' })
  async getPlayData(@Param('id', ParseIntPipe) id: number): Promise<GamePlayPayload> {
    return this.gamesService.getPlayData(id);
  }

  /** 게임 생성 AI 백그라운드 완료 시 AI 서버가 호출하는 웹훅 (콜백). 인증 없음. 성공 시 Game만 저장 (layout/result URL만 보관). */
  @Post('generation-callback')
  @ApiOperation({
    summary: '게임 생성 완료 웹훅',
    description:
      'AI 서버가 백그라운드 생성 완료 시 POST로 호출. body: session_id, status, game_code, storage_url, files, file_urls. status=success면 Game 저장 시 layout.json·result.json의 blob URL만 저장. play 시 해당 URL로 fetch 후 병합.',
  })
  @ApiResponse({ status: 200, description: '수신 완료' })
  async generationCallback(@Body() body: GenerationCallbackBody) {
    console.log('[games/generation-callback] 수신', {
      at: new Date().toISOString(),
      keys: Object.keys(body ?? {}),
      session_id: body?.session_id ?? body?.sessionId,
      status: body?.status,
      success: body?.success,
      body: body,
    });
    await this.gamesService.handleGenerationCallback(body);
    console.log('[games/generation-callback] 처리 완료');
    return { received: true };
  }
}
