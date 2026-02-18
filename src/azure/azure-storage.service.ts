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

  /**
   * 캐릭터용 4방향 blob에 대한 업로드 SAS URL 4개 생성
   * @param prefix 컨테이너 안 상위 경로 (예: "userId/token")
   */
  createCharacterUploadSasUrls(prefix: string): {
    front: UploadSasUrl;
    back: UploadSasUrl;
    left: UploadSasUrl;
    right: UploadSasUrl;
  } {
    return {
      front: this.createUploadSasUrl(`${prefix}/front.png`),
      back: this.createUploadSasUrl(`${prefix}/back.png`),
      left: this.createUploadSasUrl(`${prefix}/left.png`),
      right: this.createUploadSasUrl(`${prefix}/right.png`),
    };
  }
}
