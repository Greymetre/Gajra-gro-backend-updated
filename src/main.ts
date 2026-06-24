import * as dotenv from 'dotenv';
dotenv.config();
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/dispatchers/all-exceptions.filter';
import { swagger } from './swagger';
import { ValidationPipe } from './validations/validation.pipe';
import * as bodyParser from 'body-parser';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

// import * as cluster from 'cluster';
// import * as os from 'os';
// const clusterModule = cluster as any;
// if (clusterModule.isMaster) {
//   // This is the master process
//   console.log(`Master ${process.pid} is running`);

//   // Fork workers for each CPU core
//   const numCPUs = os.cpus().length;
//   for (let i = 0; i < numCPUs; i++) {
//     clusterModule.fork();
//   }

//   // Handle worker process events
//   clusterModule.on('exit', (worker, code, signal) => {
//     console.log(`Worker ${worker.process.pid} died`);
//   });
// } else {
//   // This is a worker process
//   console.log(`Worker ${process.pid} started`);
//   async function bootstrap() {
//     const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
//     const port = process.env.NODE_PORT || 5000;
//     if ((process.env.NODE_ENV === 'production')) {
//       // app.useStaticAssets(join(__dirname, 'uploaded'), {
//       //   index: false,
//       //   prefix: '/uploaded',
//       // });
//     }
//     else {
//       // app.useStaticAssets(join(__dirname, '..', 'uploaded'), {
//       //   index: false,
//       //   prefix: '/uploaded',
//       // });
//     }
//     const logger = new Logger('bootstrap');
//     app.use(compression());
//     app.use(bodyParser.json({ limit: '50mb' }));
//     app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
//     app.setGlobalPrefix('api');
//     swagger(app);
//     app.use(helmet());
//     app.useGlobalFilters(new AllExceptionsFilter());
//     app.useGlobalPipes(new ValidationPipe());
    
//     await app.listen(port);
//     logger.log(`Application start on port ${port} `);
//   }
//   bootstrap();
// }


  // This is a worker process
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  const port = process.env.PORT || process.env.NODE_PORT || 4000;
  if ((process.env.NODE_ENV === 'production')) {
    app.useStaticAssets(join(__dirname, 'uploaded'), {
      index: false,
      prefix: '/uploaded',
    });
  }
  else {
    app.useStaticAssets(join(__dirname, '..', 'uploaded'), {
      index: false,
      prefix: '/uploaded',
    });
  }
  const logger = new Logger('bootstrap');
  app.use(compression());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.setGlobalPrefix('api');
  swagger(app);
  app.use(helmet());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(port);
  logger.log(`Application start on port ${port} `);
}
bootstrap();
