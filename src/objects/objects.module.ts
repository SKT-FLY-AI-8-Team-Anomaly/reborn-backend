import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameObject } from './entities/object.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GameObject])],
  exports: [TypeOrmModule],
})
export class ObjectsModule {}
