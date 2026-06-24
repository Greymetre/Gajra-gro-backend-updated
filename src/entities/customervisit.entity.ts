import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type CustomervisitDocument = Customervisit & Document;

@Schema()
export class Customervisit {
  @Prop({ type: Date,default: new Date() })
  checkinAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true, required : true})
  userid: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true, required : true})
  customerid: Types.ObjectId;

  @Prop({ type: Object })
  checkinLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    address: { type: String },
  };

  @Prop({ type: Date })
  checkoutAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Beatschedule' , index: true})
  beatscheduleid: Types.ObjectId;

  @Prop({ type: String })
  summary: string;

  @Prop({ type: String })
  summaryType: string;

  @Prop({ type: String })
  visitImage: string;

  @Prop({ type: Number })
  distance: number;

  @Prop({ type: Date })
  nextVisitAt: Date;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;
}

export const CustomervisitSchema = SchemaFactory.createForClass(Customervisit);

