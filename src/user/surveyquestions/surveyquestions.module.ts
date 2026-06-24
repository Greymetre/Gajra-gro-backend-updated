import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SurveyquestionsService } from '../../services/surveyquestions.service';
import { SurveyquestionsController } from './surveyquestions.controller';
import { LoginMiddleware } from 'src/common/middleware/login.middleware';
import { Surveyquestion, SurveyquestionSchema } from '../../entities/surveyquestion.entity';
import { MongooseModule } from '@nestjs/mongoose'

@Module({
  imports: [ MongooseModule.forFeature([{ name: Surveyquestion.name, schema: SurveyquestionSchema }])],
  controllers: [SurveyquestionsController],
  providers: [SurveyquestionsService]
})
export class SurveyquestionsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoginMiddleware)
    .forRoutes(SurveyquestionsController)
  }
}
