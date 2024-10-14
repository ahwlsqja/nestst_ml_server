import { Controller, Inject, UseInterceptors } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { ModelService } from './model.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunner } from '../common/decorator/query-runner.decorator'
import { QueryRunner as QR } from 'typeorm';
import { MyModelDto } from './dto/my-model-find.dto';

@Controller()
export class ModelController {
  constructor(
    private readonly modelService: ModelService,
    @Inject('ML_CRUD_QUEUE') private client: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'create_model'})
  @UseInterceptors(TransactionInterceptor)
  async create(
    @Payload() createModelDto: CreateModelDto,
    @QueryRunner() queryRunner: QR,
  ) {
    try{
      console.log('create_model 메시지를 수신했습니다:', createModelDto); // 로그 추가
      const result = await this.modelService.create(createModelDto, queryRunner)

      this.client.emit('model_created', { result })

      return result;
    }catch(error){
      this.client.emit('model_creation_error', { error: error.message });

      throw error;
    }

  }

  @MessagePattern('recent_model')
  async findAll() {
    try{
      const result = await this.modelService.findModelRecent();

      this.client.emit('model_findRecent', { result })

      return result;

    }
    catch(error){
      this.client.emit('model_findRecent_error', { error: error.message });

      throw error;
    }

  }

  @MessagePattern('get_my_model')
  findOne(@Payload() userId: number) {
    try{
        const result = this.modelService.findOne(userId);

        this.client.emit('my_model_find', {result});

        return result;
    }catch(error){
        this.client.emit('my_model_find_error', { error: error.message});

        throw error
    }
  }

  @MessagePattern('get_my_model_one')
  findMyModelOne(@Payload() id: number){
    try{
      const result = this.modelService.findMyModelOne(id)

      this.client.emit('model_one_get', {result});

      return result;
    }catch(error){
      this.client.emit('model_one_get_error', {error: error.message});

      throw error
    }
  }



  @MessagePattern('update_model')
  @UseInterceptors(TransactionInterceptor)
  update(
    @Payload() updateModelDto: UpdateModelDto,
    @QueryRunner() queryRunner: QR,
  ) {
    try{
      const result = this.modelService.update(updateModelDto, queryRunner);

      this.client.emit('updated_model', {result});

      return result
    }catch(error){
      this.client.emit('update_model_error', {error: error.message});

      throw error
    }
  }

  @MessagePattern('delete_model')
  remove(@Payload() id: number) {
    try{
      const result = this.modelService.remove(id);

      this.client.emit('deleted_model', {result});

      return result;
    }catch(error){
      this.client.emit('deleted_model_error', {error: error.message});

      throw error;
    }
    
  }
}
