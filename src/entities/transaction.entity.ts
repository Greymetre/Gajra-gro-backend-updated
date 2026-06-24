import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema()
export class transactionDetail extends Document {

    @Prop({ type: Number })
    points: number;

    @Prop({ type: Number })
    amount: number;

    @Prop({ type: Number })
    quantity: number;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', index: true })
    productid: Types.ObjectId;    
}

export const transactionDetailSchema = SchemaFactory.createForClass(transactionDetail);

@Schema()
export class Transaction {

    @Prop({ type: Number, index: true, unique: true, sparse: true })
    refno: number;

    @Prop({ type: String, index: true })
    coupon: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', index: true })
    productid: Types.ObjectId;

    @Prop({ type: String })
    invoiceNo: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer', index: true })
    customerid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Loyaltyscheme' })
    schemeid: Types.ObjectId;

    @Prop({ type: Number })
    points: number;

    @Prop({ type: Number, default: 0 })
    redemStatus: number;

    @Prop({ type: Number, default: 0 })
    redemBalance: number;

    @Prop({ type: String })
    pointType: string;

    @Prop({ type: String, index: true })
    customerType: string;

    @Prop({ type: String, index: true })
    transactionType: string;

    @Prop({ type: [transactionDetailSchema], default: [] })
    transactionDetail: Array<transactionDetail>;

    @Prop({ type: Date, default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean, default: true })
    active: Boolean;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Sales' })
    salesid: Types.ObjectId;

}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Add indexes to optimize queries
TransactionSchema.index({ customerType: 1, transactionType: 1, createdAt: -1 }, { background: true });
TransactionSchema.index({ customerid: 1, createdAt: -1 }, { background: true });
TransactionSchema.index({ createdBy: 1, createdAt: -1 }, { background: true });
TransactionSchema.index({ productid: 1, createdAt: -1 }, { background: true });
TransactionSchema.index({ pointType: 1, createdAt: -1 }, { background: true });
TransactionSchema.index({ coupon: 1, createdAt: -1 }, { background: true });
