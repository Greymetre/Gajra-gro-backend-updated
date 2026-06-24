import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type StateDocument = State & Document;

@Schema()
export class State {
  @Prop({ type: String, required: true , trim: true, index: true, unique: true, sparse: true })
  stateName: string;

  @Prop({ type: String , index: true})
  iso: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Country' , index: true})
  countryid: Types.ObjectId;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;
}

export const StateSchema = SchemaFactory.createForClass(State);

