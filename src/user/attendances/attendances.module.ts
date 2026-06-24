import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AttendancesService } from '../../services/attendances.service';
import { AttendancesController } from './attendances.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Attendance, AttendanceSchema } from '../../entities/attendance.entity';
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [ MongooseModule.forFeature([{ name: Attendance.name, schema: AttendanceSchema }])],
  controllers: [AttendancesController],
  providers: [AttendancesService]
})
export class AttendancesModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(AttendancesController)
  }
}
