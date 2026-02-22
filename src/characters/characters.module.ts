import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character } from './entities/character.entity';
import { CharacterPending } from './entities/character-pending.entity';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { MotionProcessor } from './motion.processor';
import { QueuesModule } from '../queues/queues.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, CharacterPending]),
    QueuesModule,
    AuthModule,
  ],
  controllers: [CharactersController],
  providers: [CharactersService, MotionProcessor],
  exports: [TypeOrmModule, CharactersService],
})
export class CharactersModule {}
