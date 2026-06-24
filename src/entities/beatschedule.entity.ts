import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type BeatscheduleDocument = Beatschedule & Document;

@Schema()
export class Beatschedule {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'User' , index: true}])
  userid: Types.ObjectId;

  @Prop({ type: String , index: true})
  title: string;

  @Prop([{ type: String , index: true}])
  type: string;

  @Prop({ type: String , index: true})
  objectives: string;

  @Prop({ type: Date})
  visitedAt: Date;

  @Prop([{ type: String , index: true}])
  cities: string;

  @Prop([{ type: String , index: true}])
  visitedcities: string;

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'Beat' , index: true}])
  beatid: Types.ObjectId;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;
}

export const BeatscheduleSchema = SchemaFactory.createForClass(Beatschedule);
