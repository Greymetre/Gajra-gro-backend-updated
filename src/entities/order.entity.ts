import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type OrderDocument = Order & Document;

@Schema()
export class orderDetail extends Document {

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product' })
    productid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product.productDetail' })
    productDetailid: Types.ObjectId;

    @Prop({ type: Number })
    price: number;

    @Prop({ type: Number })
    quantity: number;

    @Prop({ type: Number })
    discount: number;

    @Prop({ type: Number })
    tax: number;

    @Prop({ type: String })
    status: string;

    @Prop({ type: Number })
    lineTotal: number;
}
export const orderDetailSchema = SchemaFactory.createForClass(orderDetail);

@Schema()
export class Order {

    @Prop({ type: String , index: true})
    orderNo: string;

    @Prop({ type: Date })
    orderDate: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
    customerid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
    parentid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    userid: Types.ObjectId;

    @Prop({ type: Number })
    subTotal: number;

    @Prop({ type: Number })
    totalAmount: number;

    @Prop({ type: Number })
    discountAmount: number;

    @Prop({ type: Number })
    taxAmount: number;

    @Prop({ type: String })
    status: string;
    
    @Prop()
    statusInfo: [{
        userid: { type: Types.ObjectId , index: true},
        title: { type: String },
        status: { type: String , require : true },
        changedAt: { type: Date },
    }];

    @Prop({ type: String })
    cancelReasons: string;

    @Prop({ type: Boolean , default: false })
    iscancelled: Boolean;

    @Prop({ type: Boolean , default: false })
    iscomplited: Boolean;

    @Prop({ type: String })
    paymentStatus: string;

    @Prop({ type: String })
    address: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Beatschedule' , index: true})
    beatscheduleid: Types.ObjectId;

    @Prop({ type: [orderDetailSchema], default: [] })
    detail: Array<orderDetail>;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

