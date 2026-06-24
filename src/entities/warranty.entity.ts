import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type WarrantyDocument = Warranty & Document;

@Schema()
export class Warranty {
  @Prop({ type: String, required: true , trim: true, index: true, unique: true, sparse: true})
  beatName: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String , index: true})
  city: string;

  @Prop({ type: String , index: true})
  state: string;

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'User' , index: true}])
  userid: Types.ObjectId;

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true}])
  customerid: Types.ObjectId;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;
}

export const WarrantySchema = SchemaFactory.createForClass(Warranty);