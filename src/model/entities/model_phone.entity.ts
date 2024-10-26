import { BaseTable } from "src/common/entities/common.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ModelDetail } from "./model_detail.entity";

@Entity()
export class ModelPhone extends BaseTable{
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    phone: string;

    @ManyToOne(
        () => ModelDetail,
        modeldetail => modeldetail.modelPhones,
        {
            cascade:true,
            nullable: false,
        }
    )
    modelDetail: ModelDetail

}