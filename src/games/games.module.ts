import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { GameGenerationPending } from './entities/game-generation-pending.entity';
import { InputSource } from './entities/input-source.entity';
import { InputImage } from './entities/input-image.entity';
import { GameObject } from '../objects/entities/object.entity';
import { Quiz } from '../quiz/entities/quiz.entity';
import { Character } from '../characters/entities/character.entity';
import { AzureModule } from '../azure/azure.module';
import { AiModule } from '../ai/ai.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      GameGenerationPending,
      InputSource,
      InputImage,
      GameObject,
      Quiz,
      Character,
    ]),
    AzureModule,
    AiModule,
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [TypeOrmModule, GamesService],
})
export class GamesModule {}
