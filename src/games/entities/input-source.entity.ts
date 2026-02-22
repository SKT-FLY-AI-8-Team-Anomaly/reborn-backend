import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Game } from './game.entity';

@Entity('input_source')
export class InputSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', comment: '게임 아이디' })
  gameId: number;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'content_text', type: 'text', comment: '입력 텍스트' })
  contentText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
