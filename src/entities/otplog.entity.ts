import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type OtpLogDocument = OtpLog & Document;

@Schema()
export class OtpLog {
  @Prop({ type: Number, required: true , index: true})
  otp: number;

  @Prop({ type: String, required: true , index: true})
  mobile: string;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

}

export const OtpLogSchema = SchemaFactory.createForClass(OtpLog);
