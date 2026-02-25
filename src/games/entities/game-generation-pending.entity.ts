import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('game_generation_pending')
export class GameGenerationPending {
  @PrimaryColumn({ name: 'session_id', type: 'varchar', length: 255 })
  sessionId: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'room_id', type: 'int', nullable: true })
  roomId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '게임 제목 (preview에서 올 수 있음)' })
  title: string | null;

  @Column({ name: 'storage_url', type: 'text', nullable: true, comment: 'AI에 넘긴 저장소 주소 (generate-multipart 호출 시 저장)' })
  storageUrl: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: '첫 응답 language (예: ko)' })
  language: string | null;

  @Column({ name: 'preview_json', type: 'text', nullable: true, comment: '첫 응답 preview 객체 JSON' })
  previewJson: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
