import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity';
import { User } from '../../users/entities/user.entity';

@Entity('game_played')
export class GamePlayed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', comment: '게임 아이디' })
  gameId: number;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'played_user_id', comment: '플레이한 유저 아이디' })
  playedUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'played_user_id' })
  playUser: User;

  @Column({ type: 'int', nullable: true, comment: '점수' })
  score: number | null;

  @Column({ name: 'play_time_seconds', type: 'int', nullable: true, comment: '플레이 시간(초)' })
  playTimeSeconds: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
