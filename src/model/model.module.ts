import { Module } from '@nestjs/common';
import { ModelService } from './model.service';
import { ModelController } from './model.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Model } from './entities/model.entity';
import { ModelDetail } from './entities/model_detail.entity';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ML_CRUD_QUEUE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://mo:mo@localhost:5672'],
          queue: 'ml_crud_queue',
          queueOptions:{
            durable: false,
          },
        },
      },
    ]),
  TypeOrmModule.forFeature([
    Model,
    ModelDetail
  ]),
],
  controllers: [ModelController],
  providers: [ModelService],
})
export class ModelModule {}
