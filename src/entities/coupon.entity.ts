import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
import { CouponInfo } from './couponprofile.entity';
export type CouponDocument = Coupon & Document;

@Schema()
export class Coupon {
    @Prop({ type: String, required: true , trim: true, index: true, unique: true, sparse: true })
    coupon: string;

    @Prop({ type: String , index: true })
    customerType: string;

    @Prop([{ type: String , index: true }])
    type: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'CouponProfile' , index: true })
    couponProfileid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'CouponInfo' , index: true })
    couponInfoId: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

