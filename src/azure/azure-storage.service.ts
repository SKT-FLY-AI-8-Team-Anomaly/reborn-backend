import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

/** blob 하나당 업로드용 SAS URL 생성 결과 */
export interface UploadSasUrl {
  /** PUT 요청 보낼 URL (SAS 포함) */
  uploadUrl: string;
  /** SAS 제거한 blob URL (DB 저장·공개 접근용) */
  blobUrl: string;
}

@Injectable()
export class AzureStorageService {
  private readonly credential: StorageSharedKeyCredential;
  private readonly containerName: string;
  /** 게임 생성물 업로드용 컨테이너 (예: generated-games) */
  private readonly gamesContainerName: string;
  private readonly sasExpiryMinutes: number;
  private readonly accountName: string;

  constructor(private readonly config: ConfigService) {
    const conn = String(this.config.get('AZURE_STORAGE_CONNECTION_STRING') ?? '');
    const accountName = this.parseFromConnectionString(conn, 'AccountName');
    const accountKey = this.parseFromConnectionString(conn, 'AccountKey');
    this.accountName = accountName ?? '';
    this.credential = new StorageSharedKeyCredential(
      this.accountName,
      accountKey ?? '',
    );
    this.containerName = this.config.get(
      'AZURE_STORAGE_CONTAINER_NAME',
      'character',
    );
    this.gamesContainerName = this.config.get(
      'AZURE_STORAGE_GAMES_CONTAINER_NAME',
      'generated-games',
    );
    this.sasExpiryMinutes = parseInt(
      this.config.get('AZURE_SAS_EXPIRY_MINUTES', '60'),
      10,
    );
  }

  private parseFromConnectionString(
    conn: string,
    key: string,
  ): string | null {
    const match = conn.match(new RegExp(`${key}=([^;]+)`, 'i'));
    return match ? match[1].trim() : null;
  }

  /**
   * 특정 blob 경로에 업로드할 수 있는 SAS URL 생성
   * @param blobPath 컨테이너 안 경로 (예: "userId/token/front.png")
   */
  createUploadSasUrl(blobPath: string): UploadSasUrl {
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + this.sasExpiryMinutes);

    const sasOptions = {
      containerName: this.containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('cw'), // create, write (업로드용)
      startsOn: new Date(),
      expiresOn,
    };

    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      this.credential,
    ).toString();

    const blobUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobPath}`;
    const uploadUrl = `${blobUrl}?${sasToken}`;

    return { uploadUrl, blobUrl };
  }

  /** 읽기 SAS 기본 유효 기간: 1년 (분) */
  private static readonly READ_SAS_EXPIRY_MINUTES = 365 * 24 * 60;

  /**
   * 저장된 blob URL에 읽기 전용 SAS를 붙여 프론트에서 접근 가능한 URL 반환
   * character, generated-games 등 동일 계정 컨테이너 URL 지원
   * @param blobUrl DB에 저장된 blob URL (예: https://account.../container/... 또는 .../generated-games/게임코드/...)
   * @param expiryMinutes 유효 시간 (기본 1년)
   */
  createReadSasUrl(
    blobUrl: string,
    expiryMinutes: number = AzureStorageService.READ_SAS_EXPIRY_MINUTES,
  ): string {
    const base = `https://${this.accountName}.blob.core.windows.net/`;
    if (!blobUrl.startsWith(base)) {
      return blobUrl;
    }
    const pathWithoutQuery = blobUrl.split('?')[0];
    const pathAfterContainer = pathWithoutQuery.slice(base.length);
    const slashIdx = pathAfterContainer.indexOf('/');
    if (slashIdx === -1) return blobUrl;
    const containerName = pathAfterContainer.slice(0, slashIdx);
    const blobPath = pathAfterContainer.slice(slashIdx + 1);
    if (!blobPath) return blobUrl;
    const now = new Date();
    const startsOn = new Date(now.getTime() - 15 * 60 * 1000);
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);
    const sasOptions = {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    };
    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      this.credential,
    ).toString();
    return `${pathWithoutQuery}?${sasToken}`;
  }

  /**
   * 모션 시트 1장 업로드용 SAS URL 생성
   * @param prefix 컨테이너 안 상위 경로 (예: "motion/userId/jobId")
   */
  createMotionSheetUploadSasUrl(prefix: string): UploadSasUrl {
    return this.createUploadSasUrl(`${prefix}/sheet.png`);
  }

  /**
   * 게임 생성용 blob base URL (AI 업로드용)
   * 형태: https://{account}.blob.core.windows.net/generated-games/{게임코드}/
   * @param _userId 사용하지 않음 (호환성 유지)
   * @param sessionId 게임 코드(세션 ID)
   */
  getGameStorageBaseUrl(_userId: number, sessionId: string): string {
    const path = sessionId.replace(/^\/+|\/+$/g, '');
    const base = `https://${this.accountName}.blob.core.windows.net/${this.gamesContainerName}/${path}`;
    return base.endsWith('/') ? base : base + '/';
  }

  /**
   * generated-games 컨테이너에 버퍼 업로드 후 blob URL 반환.
   * 연결 문자열로 BlobServiceClient 생성 후 컨테이너 없으면 생성.
   */
  async uploadToGamesContainer(
    blobPath: string,
    buffer: Buffer,
    contentType: string = 'image/png',
  ): Promise<string> {
    const conn = String(this.config.get('AZURE_STORAGE_CONNECTION_STRING') ?? '').trim();
    if (!conn || !conn.includes('AccountKey=')) {
      throw new Error(
        'AZURE_STORAGE_CONNECTION_STRING이 설정되지 않았습니다. .env 및 Docker env_file 확인.',
      );
    }
    const normalizedPath = blobPath.replace(/^\/+/, '');
    const containerName = this.gamesContainerName;
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      const blockBlobClient = containerClient.getBlockBlobClient(normalizedPath);
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
      const base = blobServiceClient.url.replace(/\/$/, '');
      return `${base}/${containerName}/${normalizedPath}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('does not exist') || msg.includes('ResourceNotFound')) {
        throw new Error(
          `Azure Blob 리소스 없음. 스토리지 계정·연결 문자열 확인. ` +
            `컨테이너 "${containerName}" 생성 시도함. 원인: ${msg}`,
        );
      }
      throw err;
    }
  }
}
