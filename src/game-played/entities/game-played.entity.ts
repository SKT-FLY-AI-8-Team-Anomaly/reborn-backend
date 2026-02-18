import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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

  @Column({ name: 'play_user_id', comment: 'play한 유저 id' })
  playUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'play_user_id' })
  playUser: User;
}
