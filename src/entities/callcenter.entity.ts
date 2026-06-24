import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type CallCenterDocument = CallCenter & Document;

@Schema()
export class CallCenter {

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true, required : true})
  userid: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true, required : true})
  customerid: Types.ObjectId;

  @Prop({ type: String })
  callType: string;

  @Prop({ type: String })
  summary: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: String })
  callStatus: string;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;
}

export const CallCenterSchema = SchemaFactory.createForClass(CallCenter);