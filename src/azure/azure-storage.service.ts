import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobSASPermissions,
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
   * @param blobUrl DB에 저장된 blob URL (예: https://account.../container/profiles/2/uuid.png)
   * @param expiryMinutes 유효 시간 (기본 1년)
   */
  createReadSasUrl(
    blobUrl: string,
    expiryMinutes: number = AzureStorageService.READ_SAS_EXPIRY_MINUTES,
  ): string {
    const prefix = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/`;
    if (!blobUrl.startsWith(prefix)) {
      return blobUrl;
    }
    const blobPath = blobUrl.replace(prefix, '').split('?')[0];
    const now = new Date();
    const startsOn = new Date(now.getTime() - 15 * 60 * 1000); // 15분 전 (clock skew 대비)
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);
    const sasOptions = {
      containerName: this.containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('r'), // read only
      startsOn,
      expiresOn,
    };
    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      this.credential,
    ).toString();
    return `${blobUrl}?${sasToken}`;
  }

  /**
   * 모션 시트 1장 업로드용 SAS URL 생성
   * @param prefix 컨테이너 안 상위 경로 (예: "motion/userId/jobId")
   */
  createMotionSheetUploadSasUrl(prefix: string): UploadSasUrl {
    return this.createUploadSasUrl(`${prefix}/sheet.png`);
  }
}
