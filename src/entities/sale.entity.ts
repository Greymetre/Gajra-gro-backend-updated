import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type SaleDocument = Sale & Document;

@Schema()
export class saleDetail extends Document {

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product' , index: true})
    productid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product.productDetail' , index: true})
    productDetailid: Types.ObjectId;

    @Prop({ type: Number })
    price: number;

    @Prop({ type: Number })
    quantity: number;

    @Prop({ type: Number })
    tax: number;

    @Prop({ type: Number })
    discount: number;

    @Prop({ type: String })
    status: string;

    @Prop({ type: Number })
    lineTotal: number;
}
export const saleDetailSchema = SchemaFactory.createForClass(saleDetail);

@Schema()
export class Sale {

    @Prop({ type: String , index: true})
    invoiceNo: string;

    @Prop({ type: Date })
    invoiceDate: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
    customerid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
    parentid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    userid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Order' , index: true})
    orderid: Types.ObjectId;

    @Prop({ type: Number })
    subTotal: number;

    @Prop({ type: Number })
    totalAmount: number;

    @Prop({ type: Number })
    taxAmount: number;

    @Prop({ type: Number })
    discountAmount: number;

    @Prop({ type: String })
    status: string;

    @Prop({ type: String })
    paymentStatus: string;

    @Prop({ type: String })
    address: string;

    @Prop({ type: String })
    salesType: string;

    @Prop({ type: [saleDetailSchema], default: [] })
    detail: Array<saleDetail>;

    @Prop([{ type: String }])
    images: string[];

    @Prop({ type: String })
    terms: string;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

