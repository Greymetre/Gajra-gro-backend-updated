import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema()
export class Category {

    @Prop({ type: String , required : true , trim: true, index: true, unique: true, sparse: true})
    categoryName: string;

    @Prop({ type: String , index: true})
    categoryDescription: string;
  
    @Prop({ type: Number })
    ranking: number;

    @Prop({ type: String })
    categoryImage: string;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

