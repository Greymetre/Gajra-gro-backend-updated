import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type ExpenseDocument = Expense & Document;

@Schema()
export class Expense {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    userid: Types.ObjectId;

    @Prop({ type: Date })
    date: Date;

    @Prop({ type: Number })
    amount: number;

    @Prop({ type: String })
    title: string;

    @Prop({ type: String })
    description: string;

    @Prop([{ type: String }])
    images: string;

    @Prop({ type: Boolean, default : false})
    approved: boolean;

    @Prop({ type: Boolean, default : false})
    rejected: boolean;

    @Prop({ type: Number })
    approvedAmount: number;

    @Prop({ type: Number })
    paidAmount: number; 

    @Prop({ type: Object })
    transaction: {
        amount: { type: Number},
        transactionId: { type: String },
        date: { type: Date },
        description: { type: String },
    };

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

