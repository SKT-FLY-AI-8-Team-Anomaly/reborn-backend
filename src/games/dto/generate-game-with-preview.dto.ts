/** 게임 생성 요청 DTO. 프론트는 text·images만 보내도 됨. sessionId 미제공 시 백엔드에서 생성. */
export interface GenerateGameWithPreviewDto {
  sessionId?: string;
  text?: string;
  imageFiles?: Array<{
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }>;
}
