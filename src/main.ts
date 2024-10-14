import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://mo:mo@localhost:5672'],
      queue: 'ml_crud_queue',
      queueOptions: {
        durable: false,
      },
    },
  });
  await app.startAllMicroservices(); // 마이크로서비스 
  await app.listen(3001);
}
bootstrap();
