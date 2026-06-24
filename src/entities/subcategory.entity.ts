import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type SubcategoryDocument = Subcategory & Document;

@Schema()
export class Subcategory {

    @Prop({ type: String , required : true , trim: true, index: true, unique: true, sparse: true})
    subcategoryName: string;

    @Prop({ type: String , index: true})
    subcategoryDescription: string;
  
    @Prop({ type: Number })
    ranking: number;

    @Prop({ type: String })
    subcategoryImage: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Category' , index: true})
    categoryid: Types.ObjectId;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);

