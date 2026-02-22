import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity';

@Entity('objects')
export class GameObject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', comment: '게임 아이디' })
  gameId: number;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'object_directory', type: 'varchar', length: 255, comment: '오브젝트 디렉터리/경로' })
  objectDirectory: string;

  @Column({ type: 'varchar', length: 100, comment: '오브젝트 이름' })
  name: string;

  @Column({ name: 'x_pos', type: 'int', comment: 'x 좌표' })
  xPos: number;

  @Column({ name: 'y_pos', type: 'int', comment: 'y 좌표' })
  yPos: number;

  @Column({ type: 'int', comment: '높이' })
  height: number;

  @Column({ name: 'interaction_text', type: 'text', nullable: true, comment: '상호작용 텍스트' })
  interactionText: string | null;

  @Column({ name: 'outro_story', type: 'text', nullable: true, comment: '아웃트로 스토리' })
  outroStory: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
