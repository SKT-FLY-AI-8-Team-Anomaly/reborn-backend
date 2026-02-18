import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';
import { Game } from './games/entities/game.entity';
import { Character } from './characters/entities/character.entity';
import { CharacterPending } from './characters/entities/character-pending.entity';
import { GamePlayed } from './game-played/entities/game-played.entity';
import { Quiz } from './quiz/entities/quiz.entity';
import { GameObject } from './objects/entities/object.entity';
import { AuthModule } from './auth/auth.module';
import { AzureModule } from './azure/azure.module';
import { AiModule } from './ai/ai.module';
import { QueuesModule } from './queues/queues.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { CharactersModule } from './characters/characters.module';
import { GamePlayedModule } from './game-played/game-played.module';
import { QuizModule } from './quiz/quiz.module';
import { ObjectsModule } from './objects/objects.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '3306'), 10),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_DATABASE', 'reborn'),
        entities: [User, Game, Character, CharacterPending, GamePlayed, Quiz, GameObject],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    UsersModule,
    AuthModule,
    AzureModule,
    AiModule,
    QueuesModule,
    GamesModule,
    CharactersModule,
    GamePlayedModule,
    QuizModule,
    ObjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
