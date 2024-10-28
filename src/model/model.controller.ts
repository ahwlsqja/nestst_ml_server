import { Controller, Inject, UseInterceptors } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { ModelService } from './model.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunner } from '../common/decorator/query-runner.decorator'
import { QueryRunner as QR } from 'typeorm';
import { MyModelDto } from './dto/my-model-find.dto';
import { exist } from 'joi';

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

  @MessagePattern({ cmd: 'recent_model'})
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

  @MessagePattern({ cmd : 'get_my_model'})
  async findOne(@Payload() payload : {userId: number}) {
    try{
        const result = this.modelService.findOne(payload.userId);

        this.client.emit('my_model_find', {result});

        return result;
    }catch(error){
        this.client.emit('my_model_find_error', { error: error.message});

        throw error
    }
  }

  @MessagePattern({cmd: 'get_my_model_one'})
  async findMyModelOne(@Payload() payload: {id: number}){
    try{ 
      console.log("hided")

      console.log(payload.id)
      const result = await this.modelService.findMyModelOne(payload.id)
      console.log(123123)
      this.client.emit('model_one_get', {result});

      return result;
    }catch(error){
      this.client.emit('model_one_get_error', {error: error.message});

      throw error
    }
  }



  @MessagePattern({cmd: 'update_model'})
  @UseInterceptors(TransactionInterceptor)
  async update(
    @Payload() payload: { updateModelDto: UpdateModelDto },
    @QueryRunner() queryRunner: QR,
  ) {
    try{
      const updateModelDto = payload.updateModelDto;
      console.log('업데이트 요청:', updateModelDto); // DTO 로그
      console.log('업데이트 DTO ID:', updateModelDto.id); // ID 로그
      console.log('업데이트 DTO ID:', updateModelDto.detail); // ID 로그

      const result = await this.modelService.update(updateModelDto, queryRunner);

      this.client.emit('updated_model', {result});

      return result
    }catch(error){
      this.client.emit('update_model_error', {error: error.message});

      throw error
    }
  }

  @MessagePattern({cmd: 'delete_model'})
  async remove(@Payload() payload: { id: number }) {
    try{
      console.log(payload.id)
      const result = this.modelService.remove(payload.id);

      this.client.send('deleted_model', {result});

      return result;
    }catch(error){
      this.client.send('deleted_model_error', {error: error.message});

      throw error;
    }
  }

  @MessagePattern({cmd: 'model_check'})
  async handleModelCheck(@Payload() data:{modelId:number}):Promise<boolean>{
    console.log(1)
    const model = await this.modelService.findMyModelOne(data.modelId);
    console.log(model)
    if(model){
      return true
    }
    else{
      return false
    }
  }
}
