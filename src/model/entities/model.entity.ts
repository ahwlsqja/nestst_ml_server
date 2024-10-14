import { BaseTable } from 'src/common/entities/common.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Table, TableInheritance, UpdateDateColumn, VersionColumn } from 'typeorm'
import { ModelDetail } from './model_detail.entity';

@Entity()
export class Model extends BaseTable{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @OneToOne(
        () => ModelDetail,
        modelDetail => modelDetail.id,
        {
          cascade: true,
          nullable: false,
        }
      )
      @JoinColumn()
      detail: ModelDetail;
}
