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

    return await qr.manager.findOne(Model, {
      where: {
        id: modelId,
      },
      relations: ['detail']
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
    const model = await this.modelrepository.createQueryBuilder('model')
    .leftJoinAndSelect('model.detail', 'detail')
    .where('model.userId =: userId', {userId})
    .getOne();

    if(!model){
      throw new NotFoundException('존재하지 않는 ID의 모델입니다.');
    }

    return model
  }

  async findMyModelOne(id: number){
    const cacheKey = `model_${id}`
    
    const cachedModel = await this.cacheManager.get<Model>(cacheKey);
    if(cachedModel){
      return cachedModel;
    }

    const model = await this.modelrepository.findOne({
      where: {
        id: id
      }
    });

    if(!model){
      throw new BadRequestException('존재하지 않는 모델입니다!');
    }

    await this.cacheManager.set(cacheKey, model, 60*60*24*30)

    return model;
  }

  async update(updateModelDto: UpdateModelDto, qr: QueryRunner) {
    let updatedModel;
    const cacheKey = `model_${updateModelDto.id}`
    
    const cachemodel = await this.cacheManager.get<Model>(cacheKey);
    if(!cachemodel){
      const cachemodel = await qr.manager.findOne(Model, {
        where: {
          id: updateModelDto.id,
        },
        relations: ['detail']
      });

      if(!cachemodel){
        throw new NotFoundException('존재하지 않는 모델입니다.')
      }
    }

    await qr.manager.update(Model, updateModelDto.id, {
      userId: updateModelDto.userId,
    });

    if(updateModelDto.detail){
      await qr.manager.update(ModelDetail, cachemodel.detail.id, {
        detail: updateModelDto.detail,
      })
    }

    updatedModel = await qr.manager.findOne(Model, {
      where: {
        id: updateModelDto.id,
      },
      relations: ['detail'],
    })

    await this.cacheManager.set(cacheKey, updatedModel, 60*60*24*30)

    return updatedModel


  }

  async remove(id: number) {
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

      await this.modelDetailRepository.delete(cachemodel.id);

      return id;
    }
  }
}
