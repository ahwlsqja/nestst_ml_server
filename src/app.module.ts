import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ModelModule } from './model/model.module';
import { CommonModule } from './common/common.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheConfigService } from './cache/cacheConfig.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi'
import { TypeOrmModule } from '@nestjs/typeorm';
import { envVariableKeys } from './common/const/env.const';
import { Model } from './model/entities/model.entity';
import { ModelDetail } from './model/entities/model_detail.entity';
import { ModelPhone } from './model/entities/model_phone.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        ENV: Joi.string().valid('dev', 'prod').required(),
        DB_TYPE:Joi.string().valid('postgres').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        HASH_ROUNDS:Joi.number().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory:(configService:ConfigService) => ({
        type: configService.get<string>(envVariableKeys.dbType) as "postgres",
        host: configService.get<string>(envVariableKeys.dbHost),
        port: configService.get<number>(envVariableKeys.dbPort),
        username: configService.get<string>(envVariableKeys.dbUsername),
        password: configService.get<string>(envVariableKeys.dbPassword),
        database: configService.get<string>(envVariableKeys.dbDatabase),
        entities: [
          Model,
          ModelDetail,
          ModelPhone,
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ClientsModule.register([
      {
        name: 'ML_CRUD_QUEUE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'ml_crud_queue',
          queueOptions:{
            durable: false,
          },
        },
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfigService,
    }),
    ModelModule,
    CommonModule
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule {}
