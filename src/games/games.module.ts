import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { InputSource } from './entities/input-source.entity';
import { InputImage } from './entities/input-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, InputSource, InputImage]),
  ],
  exports: [TypeOrmModule],
})
export class GamesModule {}
