import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type RemarkDocument = Remark & Document;

@Schema()
export class Remark {
  @Prop({ type: String, required: true , index: true})
  remark: string;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

}

export const RemarkSchema = SchemaFactory.createForClass(Remark);
