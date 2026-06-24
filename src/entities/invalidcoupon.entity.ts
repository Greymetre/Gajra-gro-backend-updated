import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
import { CouponInfo } from './couponprofile.entity';
export type InvalidCouponDocument = InvalidCoupon & Document;

export enum StatusTypeEnum {
  Rejected = 'Rejected',
  Pending = 'Pending',
  Approved = 'Approved',
  Hold = 'Hold',
  }

@Schema()
export class InvalidCoupon {

  @Prop({ type: [String] })
  couponImage: string[];
  

    @Prop({ type: String ,default:""  })
    couponCode: string;

    @Prop({ type: String ,default:"" })
    couponGg: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true })
    customerid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true })
    modifyByid: Types.ObjectId;

    @Prop({ type: String , index: true })
    customerType: string;

    @Prop({ type: Boolean , default: true })
    active: Boolean;

    @Prop({ type: String, enum: StatusTypeEnum,default:"Pending" })
    statusType: StatusTypeEnum;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: String , index: true })
    remark: string;
}

export const InvalidCouponSchema = SchemaFactory.createForClass(InvalidCoupon);

