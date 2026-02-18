import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamePlayed } from './entities/game-played.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GamePlayed])],
  exports: [TypeOrmModule],
})
export class GamePlayedModule {}
