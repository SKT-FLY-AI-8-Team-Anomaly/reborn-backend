import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { AzureStorageService } from '../azure/azure-storage.service';
import { Game } from './entities/game.entity';
import { GameGenerationPending } from './entities/game-generation-pending.entity';
import { GameObject } from '../objects/entities/object.entity';
import { Quiz } from '../quiz/entities/quiz.entity';
import { Character } from '../characters/entities/character.entity';
import { GenerateGameWithPreviewDto } from './dto/generate-game-with-preview.dto';

/** clearBanner blob URL (응답 시 SAS 붙여서 반환) */
const CLEAR_BANNER_BLOB_URL =
  'https://stanomaly01.blob.core.windows.net/character/banner/1c723091f53a82654b5ef76e7266778414525910000bf9db75ab6c325848.jpg';

/** 게임 실행 시 프론트에 전달하는 페이로드 */
export interface GamePlayPayload {
  title: string;
  userNickname: string;
  assetVersion: string;
  objectScale: number;
  layoutType: string;
  mood: string;
  /** API가 생성한 파일을 불러올 때 사용 (layout.json, result.json, background.png, object_1/2/3.png 등) */
  storage?: {
    baseUrl: string;
    layoutJsonUrl: string;
    resultJsonUrl: string;
  };
  assets: {
    background: string;
    clearBanner: string;
    playerSheet: string;
    characterDetail: string;
  };
  interactiveObjects: Array<{
    textureKey: string;
    image: string;
    x: number;
    y: number;
    displayHeight: number;
    introStory: string;
    outroStory: string;
    quiz: {
      question: string;
      historySamples: Array<{ inputText: string; matchRate: number; nickname: string }>;
    };
  }>;
}

/** 콜백 body (result.json 구조). AI에 따라 session_id 또는 sessionId로 올 수 있음. */
export interface GenerationCallbackBody {
  session_id?: string;
  sessionId?: string;
  status?: string;
  success?: boolean | string;
  game_code?: string;
  storage_url?: string;
  files?: string[];
  file_urls?: string[];
  blob?: {
    uploaded?: boolean;
    container?: string;
    prefix?: string;
    file_count?: number;
    files?: string[];
    skipped?: string[];
  };
  [key: string]: unknown;
}

/** layout.json 구조: placements + objectScale, layoutType */
export interface LayoutPlacement {
  object_id: string;
  x: number;
  y: number;
  displayHeight: number;
}

export interface LayoutJson {
  objectScale?: number;
  layoutType?: string;
  placements?: LayoutPlacement[];
  non_walkable_zones?: unknown[];
}

/** result.json 구조: mood + objects */
export interface ResultObject {
  object_id: string;
  intro?: string;
  quiz?: string;
  outro?: string;
}

export interface ResultJson {
  mood?: string;
  objects?: ResultObject[];
}

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GameGenerationPending)
    private readonly pendingRepo: Repository<GameGenerationPending>,
    @InjectRepository(GameObject)
    private readonly objectRepo: Repository<GameObject>,
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(Character)
    private readonly characterRepo: Repository<Character>,
    private readonly aiService: AiService,
    private readonly azureStorage: AzureStorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 게임 생성. 프론트는 이미지·텍스트만 보냄. 백엔드에서 session_id(게임id), storage_url 생성해 AI에 전달.
   * AI 응답(200/202) 후 Game 즉시 저장. 콜백 없음.
   */
  async generateWithPreview(
    userId: number,
    dto: GenerateGameWithPreviewDto,
    options?: { roomId?: number | null; title?: string | null },
  ): Promise<Record<string, unknown>> {
    const sessionId =
      (typeof dto.sessionId === 'string' && dto.sessionId.trim()) ||
      this.generateGameId();
    const storageUrl = this.azureStorage.getGameStorageBaseUrl(userId, sessionId);

    console.log('[generateWithPreview] 진입', {
      userId,
      sessionId,
      textLen: dto.text?.length,
      imageCount: dto.imageFiles?.length ?? 0,
    });

    try {
      const result = await this.aiService.generateGameWithPreview({
        sessionId,
        text: dto.text,
        storageUrl,
        imageFiles: dto.imageFiles,
      });
      console.log('[generateWithPreview] AI 서버 응답 완료', { sessionId, keys: Object.keys(result ?? {}) });

      const base = storageUrl.endsWith('/') ? storageUrl : storageUrl + '/';
      const layoutJsonUrl = base + 'layout.json';
      const resultJsonUrl = base + 'result.json';
      const thumbnailUrl = this.toReadSasUrl(base + 'thumbnail.png');
      const backgroundUrl = this.toReadSasUrl(base + 'background.png');

      await this.gameRepo.save(
        this.gameRepo.create({
          userId,
          roomId: options?.roomId ?? null,
          title: (options?.title && String(options.title).trim()) || '게임',
          gameCode: sessionId,
          storageUrl,
          layoutJsonUrl,
          resultJsonUrl,
          thumbnailUrl,
          backgroundUrl,
        }),
      );
      console.log('[generateWithPreview] Game 저장 완료', { sessionId });

      return { session_id: sessionId, ...result } as Record<string, unknown>;
    } catch (err) {
      console.error('[generateWithPreview] AI 서버 호출 실패', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** session_id 미제공 시 사용할 게임 ID 생성 */
  private generateGameId(): string {
    return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * body.files / body.file_urls에서 파일명(또는 경로 끝)이 일치하는 URL 반환.
   * 예: findFileUrl(body, 'background.png'), findFileUrl(body, 'layout.json')
   */
  private findFileUrl(body: GenerationCallbackBody, filename: string): string | null {
    const files = body.files;
    const fileUrls = body.file_urls;
    if (!Array.isArray(files) || !Array.isArray(fileUrls) || files.length !== fileUrls.length) {
      return null;
    }
    const normalized = filename.replace(/\\/g, '/');
    const idx = files.findIndex((f) => String(f).replace(/\\/g, '/').endsWith(normalized));
    return idx >= 0 ? fileUrls[idx] ?? null : null;
  }

  /**
   * layout.json URL에서 JSON 가져오기 (objectScale, layoutType, placements).
   */
  private async fetchLayout(layoutUrl: string): Promise<LayoutJson> {
    const url = this.toReadSasUrl(layoutUrl);
    const res = await fetch(url);
    if (!res.ok) return {};
    return (await res.json()) as LayoutJson;
  }

  /**
   * result.json URL에서 JSON 가져오기 (mood, objects).
   */
  private async fetchResult(resultUrl: string): Promise<ResultJson> {
    const url = this.toReadSasUrl(resultUrl);
    const res = await fetch(url);
    if (!res.ok) return {};
    return (await res.json()) as ResultJson;
  }

  /**
   * blob URL을 읽기용 SAS URL로 변환. 본인 Azure 컨테이너가 아니면 그대로 반환.
   */
  private toReadSasUrl(url: string): string {
    if (!url || typeof url !== 'string') return url;
    return this.azureStorage.createReadSasUrl(url.split('?')[0]);
  }

  /**
   * object_id(예: obj_01) → blob 파일명(예: object_1.png).
   */
  private objectIdToFilename(objectId: string): string {
    const m = String(objectId).match(/^obj_?(\d+)$/i);
    const num = m ? String(parseInt(m[1], 10)) : objectId.replace(/\D/g, '') || '0';
    return `object_${num}.png`;
  }

  /**
   * object_id(예: obj_01) → textureKey(예: obj1).
   */
  private objectIdToTextureKey(objectId: string): string {
    return String(objectId).replace(/_/g, '');
  }

  /**
   * AI 서버가 백그라운드 완료 시 호출. 성공이면 result.json·layout.json 기반으로 Game·Object 저장.
   * body: { session_id, status, game_code, storage_url, files, file_urls, blob } 또는 { session_id, success, ... }
   */
  async handleGenerationCallback(body: GenerationCallbackBody): Promise<void> {
    const statusRaw = body?.status;
    const successRaw = body?.success;
    const statusStr =
      typeof statusRaw === 'string' ? statusRaw.toLowerCase().trim() : '';
    const success =
      statusStr === 'success' ||
      statusStr === 'partial' ||
      successRaw === true ||
      (typeof successRaw === 'string' && successRaw.toLowerCase() === 'true');

    console.log('[handleGenerationCallback] 진입', {
      session_id: body?.session_id,
      sessionId: body?.sessionId,
      status: body?.status,
      statusStr,
      success: body?.success,
      success판정: success,
    });

    const sessionId =
      (typeof body.session_id === 'string' && body.session_id.trim()) ||
      (typeof body.sessionId === 'string' && body.sessionId.trim()) ||
      (typeof body.game_code === 'string' && body.game_code.trim()) ||
      undefined;

    if (!sessionId) {
      console.warn('[handleGenerationCallback] 스킵 사유: session_id/game_code 없음', {
        keys: Object.keys(body || {}),
        body: JSON.stringify(body).slice(0, 500),
      });
      return;
    }

    const pending = await this.pendingRepo.findOne({
      where: { sessionId },
    });
    if (!pending) {
      console.warn(
        '[handleGenerationCallback] 스킵 사유: pending 없음 (이 session_id로 먼저 POST /games/generate-with-preview 호출 필요)',
        { sessionId },
      );
      return;
    }
    console.log('[handleGenerationCallback] pending 찾음', {
      sessionId,
      userId: pending.userId,
      roomId: pending.roomId,
      title: pending.title,
    });

    if (!success) {
      console.warn('[handleGenerationCallback] 스킵 사유: success 아님', {
        sessionId,
        status: body.status,
        success: body.success,
        statusStr,
      });
      await this.pendingRepo.delete({ sessionId });
      return;
    }

    try {
      const storageBase = this.azureStorage.getGameStorageBaseUrl(
        pending.userId,
        sessionId,
      );
      const storageUrl =
        (typeof body.storage_url === 'string' && body.storage_url.trim()) ||
        (typeof pending.storageUrl === 'string' && pending.storageUrl.trim()) ||
        storageBase;
      let thumbnailUrl =
        this.findFileUrl(body, 'thumbnail.png') ??
        this.findFileUrl(body, 'preview.png') ??
        `${storageBase}thumbnail.png`;
      let backgroundUrl =
        this.findFileUrl(body, 'background.png') ?? `${storageBase}background.png`;
      thumbnailUrl = this.toReadSasUrl(thumbnailUrl);
      backgroundUrl = this.toReadSasUrl(backgroundUrl);

      const title =
        typeof pending.title === 'string' && pending.title ? pending.title : '게임';
      const gameCode =
        typeof body.game_code === 'string' ? body.game_code : null;

      console.log('[handleGenerationCallback] Game 저장 시도 (SAS URL 적용)', {
        sessionId,
        title,
        gameCode,
        storageUrl: storageUrl?.slice(0, 80),
        thumbnailUrl: thumbnailUrl?.slice(0, 80),
        backgroundUrl: backgroundUrl?.slice(0, 80),
      });

      let layoutJsonUrl = this.findFileUrl(body, 'layout.json') ?? null;
      let resultJsonUrl = this.findFileUrl(body, 'result.json') ?? null;
      if (!layoutJsonUrl || !resultJsonUrl) {
        const base = storageUrl.endsWith('/') ? storageUrl : storageUrl + '/';
        if (!layoutJsonUrl) layoutJsonUrl = base + 'layout.json';
        if (!resultJsonUrl) resultJsonUrl = base + 'result.json';
      }
      console.log('[handleGenerationCallback] layout/result URL', {
        layoutJsonUrl: layoutJsonUrl?.slice(0, 80) ?? null,
        resultJsonUrl: resultJsonUrl?.slice(0, 80) ?? null,
      });

      const game = await this.gameRepo.save(
        this.gameRepo.create({
          userId: pending.userId,
          roomId: pending.roomId,
          title,
          gameCode,
          storageUrl,
          layoutJsonUrl,
          resultJsonUrl,
          thumbnailUrl,
          backgroundUrl,
          language: pending.language ?? null,
          previewJson: pending.previewJson ?? null,
        }),
      );
      console.log('[handleGenerationCallback] Game 저장됨 (layout/result URL만 저장, objects 테이블 미사용)', {
        gameId: game.id,
      });

      console.log('[handleGenerationCallback] 전체 완료', {
        sessionId,
        userId: pending.userId,
        gameId: game.id,
      });
    } catch (err) {
      console.error('[handleGenerationCallback] DB 저장 실패', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }

    await this.pendingRepo.delete({ sessionId });
    console.log('[handleGenerationCallback] pending 삭제 완료', { sessionId });
  }

  /**
   * game_code(문자열)로 Game 조회 후 play 페이로드 반환.
   * background, object, layout.json, result.json 등이 URL로 담겨 불러올 수 있음.
   */
  async getPlayDataByGameCode(gameCode: string): Promise<GamePlayPayload> {
    const game = await this.gameRepo.findOne({
      where: { gameCode: gameCode?.trim() || '' },
      relations: ['user'],
    });
    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다. (game_code: ${gameCode})`);
    }
    return this.getPlayData(game.id);
  }

  /**
   * 게임 실행 시 필요한 전체 페이로드 반환.
   * layout/result URL이 있으면 fetch 후 placements + result.objects 병합. 없으면 DB objects 사용.
   */
  async getPlayData(gameId: number): Promise<GamePlayPayload> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['user'],
    });
    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다. (id: ${gameId})`);
    }

    const character = await this.characterRepo.findOne({
      where: { userId: game.userId },
      order: { id: 'DESC' },
    });

    const baseUrl = game.storageUrl
      ? game.storageUrl.endsWith('/')
        ? game.storageUrl
        : game.storageUrl + '/'
      : '';

    const assets = {
      background: this.toReadSasUrl(
        game.backgroundUrl ?? (baseUrl ? baseUrl + 'background.png' : ''),
      ),
      clearBanner: this.toReadSasUrl(CLEAR_BANNER_BLOB_URL),
      playerSheet:
        character?.motionSheetUrl ??
        (baseUrl ? this.toReadSasUrl(baseUrl + 'player_sheet.png') : ''),
      characterDetail:
        (character?.characterDetailUrl ?? character?.characterImageUrl)
        ?? (baseUrl ? this.toReadSasUrl(baseUrl + 'player_detail.png') : ''),
    };

    let objectScale = game.objectScale ?? 1.0;
    let layoutType = 'wall';
    let mood = 'happy';
    let interactiveObjects: GamePlayPayload['interactiveObjects'];

    if (game.layoutJsonUrl && game.resultJsonUrl) {
      const [layout, result] = await Promise.all([
        this.fetchLayout(game.layoutJsonUrl),
        this.fetchResult(game.resultJsonUrl),
      ]);
      objectScale = layout.objectScale ?? objectScale;
      layoutType = layout.layoutType ?? 'wall';
      mood = result.mood ?? 'happy';
      const placements = Array.isArray(layout.placements) ? layout.placements : [];
      const resultObjects = Array.isArray(result.objects) ? result.objects : [];
      const resultByObjectId = new Map(resultObjects.map((o) => [o.object_id, o]));

      interactiveObjects = placements.map((p) => {
        const res = resultByObjectId.get(p.object_id);
        const imageUrl = baseUrl
          ? this.toReadSasUrl(baseUrl + this.objectIdToFilename(p.object_id))
          : '';
        return {
          textureKey: this.objectIdToTextureKey(p.object_id),
          image: imageUrl,
          x: p.x,
          y: p.y,
          displayHeight: p.displayHeight,
          introStory: res?.intro ?? '',
          outroStory: res?.outro ?? '',
          quiz: {
            question: res?.quiz ?? '',
            historySamples: [] as Array<{ inputText: string; matchRate: number; nickname: string }>,
          },
        };
      });
    } else {
      const objects = await this.objectRepo.find({
        where: { gameId },
        order: { id: 'ASC' },
      });
      const objectIds = objects.map((o) => o.id);
      const quizzes = objectIds.length
        ? await this.quizRepo.find({
            where: { objectId: In(objectIds) },
          })
        : [];
      const quizByObjectId = new Map(quizzes.map((q) => [q.objectId, q]));

      interactiveObjects = objects.map((obj) => {
        const quiz = quizByObjectId.get(obj.id);
        const objectImageUrl = baseUrl
          ? this.toReadSasUrl(baseUrl + obj.name + '.png')
          : obj.objectDirectory ?? '';
        return {
          textureKey: obj.name,
          image: objectImageUrl,
          x: obj.xPos,
          y: obj.yPos,
          displayHeight: obj.height,
          introStory: obj.interactionText ?? '',
          outroStory: obj.outroStory ?? '',
          quiz: {
            question: quiz?.question ?? '',
            historySamples: [] as Array<{ inputText: string; matchRate: number; nickname: string }>,
          },
        };
      });
    }

    const assetVersion =
      game.createdAt instanceof Date
        ? game.createdAt.toISOString().slice(0, 10).replace(/-/g, '')
        : '20260213';

    const layoutJsonUrl = game.layoutJsonUrl ?? (baseUrl ? baseUrl + 'layout.json' : '');
    const resultJsonUrl = game.resultJsonUrl ?? (baseUrl ? baseUrl + 'result.json' : '');

    return {
      title: game.title,
      userNickname: game.user?.nickname ?? '',
      assetVersion,
      objectScale,
      layoutType,
      mood,
      storage: baseUrl
        ? {
            baseUrl: baseUrl,
            layoutJsonUrl: layoutJsonUrl ? this.toReadSasUrl(layoutJsonUrl) : '',
            resultJsonUrl: resultJsonUrl ? this.toReadSasUrl(resultJsonUrl) : '',
          }
        : undefined,
      assets,
      interactiveObjects,
    };
  }
}
