import { Module } from '@nestjs/common';
import { RemarkController } from './remark.controller';
import { RemarkService } from './remark.service';
import { Remark, RemarkSchema } from '../../entities/remark.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([
    { name: Remark.name, schema: RemarkSchema }
  ])],
  controllers: [RemarkController],
  providers: [RemarkService]
})
export class RemarkModule {}
