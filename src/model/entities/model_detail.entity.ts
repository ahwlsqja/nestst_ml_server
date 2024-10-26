import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Model } from "./model.entity";
import { ModelPhone } from "./model_phone.entity";

@Entity()
export class ModelDetail{
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    detail: string;

    @OneToOne(
        () => Model,
        model => model.id
    )
    model: Model

    @OneToMany(
        ()=> ModelPhone,
        modelPhone => modelPhone.modelDetail
    )
    modelPhones: ModelPhone[];
}