import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Model } from "./model.entity";

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
}