import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type CouponProfileDocument = CouponProfile & Document;


@Schema()
export class CouponInfo extends Document {
    @Prop({ type: Number, required: true })
    couponCount: number;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', index: true })
    productid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', index: true })
    categoryid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Subcategory', index: true })
    subcategoryid: Types.ObjectId;

    @Prop({type: String, required: false})
    packingList : string;

}
export const CouponInfoSchema = SchemaFactory.createForClass(CouponInfo);
@Schema()
export class CouponProfile {
    @Prop({ type: String, required: true })
    profileName: string;

    @Prop({ type: Date })
    startDate: Date;

    @Prop({ type: Date })
    expiryDate: Date;

    @Prop([{ type: String, index: true }])
    customerType: string;

    @Prop({ type: [CouponInfoSchema], default: [] })
    couponInfo: Array<CouponInfo>;

    @Prop({
        type: Date,
        default: () => new Date(),
        immutable: true
    })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    active: Boolean;
}

export const CouponProfileSchema = SchemaFactory.createForClass(CouponProfile);

