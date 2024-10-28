import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from './entities/model.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager'
import { ModelDetail } from './entities/model_detail.entity';
import { MyModelDto } from './dto/my-model-find.dto';
import { QueryRunner as QR } from 'typeorm';
import { ModelPhone } from './entities/model_phone.entity';
import { cache } from 'joi';

@Injectable()
export class ModelService{
  constructor(
    @InjectRepository(Model)
    private readonly modelrepository: Repository<Model>,
    @InjectRepository(ModelDetail)
    private readonly modelDetailRepository: Repository<ModelDetail>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ){}

  async create(createModelDto: CreateModelDto, qr: QueryRunner) {
    const modelDetail = await qr.manager.createQueryBuilder()
      .insert()
      .into(ModelDetail)
      .values({
        detail: createModelDto.detail
      })
      .execute()

    const modelDetailId = modelDetail.identifiers[0].id;

    const model = await qr.manager.createQueryBuilder()
    .insert()
    .into(Model)
    .values({
      userId: createModelDto.userId,
      detail: {
        id: modelDetailId
      },
    })
    .execute()

    const modelId = model.identifiers[0].id

    if(createModelDto.modelPhones && createModelDto.modelPhones.length > 0){
      for(const phone of createModelDto.modelPhones){
        await qr.manager.createQueryBuilder()
          .insert()
          .into(ModelPhone)
          .values({
            phone: phone,
            modelDetail: {
              id: modelDetailId,
            }
          })
          .execute()
      }
    }

    return await qr.manager.findOne(Model, {
      where: {
        id: modelId,
      },
      relations: ['detail', 'detail.modelPhones']
    });
  }

  async findModelRecent() {
    const cacheData = await this.cacheManager.get('MODEL_RECENT');

    if(cacheData){
      return cacheData;
    }
    
    const data = await this.modelrepository.find({
      order: {
        createdAt: 'DESC',
      },
      take: 10,
    })
    
    await this.cacheManager.set('MODEL_RECENT', data)

    return data
  }

  async findOne(userId: number) {
    const models = await this.modelrepository.createQueryBuilder('model')
    .leftJoinAndSelect('model.detail', 'detail')
    .leftJoinAndSelect('detail.modelPhones', 'phone')
    .where('model.userId = :userId', {userId})
    .getMany();

    if(models.length === 0){
      throw new NotFoundException('존재하지 않는 ID의 모델입니다.');
    }

    return models
  }

  async findMyModelOne(id: number){
    console.log(1232131)
    const cacheKey = `model_${id}`
    
    const cachedModel = await this.cacheManager.get<Model>(cacheKey);
    console.log(cachedModel)
    console.log(13213)
    if(cachedModel){
      return cachedModel;
    }
    console.log(1)
    const model = await this.modelrepository.findOne({
      where: {
        id: id
      },
      relations: ['detail', 'detail.modelPhones']
    });
    console.log(1)

    if(!model){
      throw new BadRequestException('존재하지 않는 모델입니다!');
    }
    console.log(1)

    await this.cacheManager.set(cacheKey, model, 60*60*24*30)
    console.log(model)
    return model;
  }

  async update(updateModelDto: UpdateModelDto, qr: QueryRunner) {
    let updatedModel;
    const cacheKey = `model_${updateModelDto.id}`
    
    let cachemodel = await this.cacheManager.get<Model>(cacheKey);
    console.log(`${cachemodel}1`)
    if(!cachemodel){
      const cachemodel = await qr.manager.findOne(Model, {
        where: {
          id: updateModelDto.id,
        },
        relations: ['detail', 'detail.modelPhones']
      });
      console.log(`${cachemodel}2`)

      if(!cachemodel){
        throw new NotFoundException('존재하지 않는 모델입니다.')
      }

      await this.cacheManager.set(cacheKey, cachemodel, 60*60*24*30)
    }

    await qr.manager.update(Model, updateModelDto.id, {
      userId: updateModelDto.userId,
    });

    cachemodel = await this.cacheManager.get<Model>(cacheKey)
    console.log(cachemodel)
    if(updateModelDto.detail){
      await qr.manager.update(ModelDetail, cachemodel.detail.id, {
        detail: updateModelDto.detail,
      })
    }
    const existingPhones = cachemodel.detail.modelPhones.map(phone => phone.phone);
    const newPhones = updateModelDto.modelPhones;
    console.log(newPhones)
    
    if(newPhones !== undefined){
      if(existingPhones.length === 3) {
        for(let i=0; i < newPhones.length; i++){
          const phoneToReplace = existingPhones[i];
          await qr.manager.update(ModelPhone, { phone: phoneToReplace }, { phone: newPhones[i]})
          existingPhones[i] = newPhones[i]
        }
        
      } else {
        for (const newPhone of newPhones){
          if(existingPhones.length < 3){
            existingPhones.push(newPhone);
            console.log(`${existingPhones} 잘들어갔나`)
            await qr.manager.insert(ModelPhone, { phone: newPhone,modelDetail: cachemodel.detail})
          } else {
            const phoneToReplace = existingPhones[0];
            await qr.manager.update(ModelPhone, { phoneToReplace }, { phone: newPhone })
            existingPhones[0] = newPhone
          }
        }
      }
    }

    updatedModel = await qr.manager.findOne(Model, {
      where: {
        id: updateModelDto.id,
      },
      relations: ['detail', 'detail.modelPhones'],
    })
    console.log(updatedModel)
    await this.cacheManager.set(cacheKey, updatedModel, 60*60*24*30)

    return updatedModel
  }

  async remove(id: number) {
    console.log(id)
    const cacheKey = `model_${id}`
    
    const cachemodel = await this.cacheManager.get<Model>(cacheKey);

    if(cachemodel){
      await this.modelrepository.createQueryBuilder()
      .delete()
      .where('id = :id', {id})
      .execute();

      await this.modelDetailRepository.delete(cachemodel.id);

      await this.cacheManager.del(cacheKey);

      return id;

    }else{
      const model = await this.modelrepository.findOne({
        where: {
          id,
        },
        relations: ['detail']
      });

      if(!model){
        throw new NotFoundException('존재하지 않는 ID의 모델입니다.')
      }

      await this.modelrepository.createQueryBuilder()
      .delete()
      .where('id = :id', {id})
      .execute();


      return id;
    }
  }
}
