import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type RedemptionDocument = Redemption & Document;

@Schema()
export class Redemption {

    @Prop({ type: Number , index: true, unique: true, sparse: true})
    refno: number;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer', index: true , required: true})
    customerid: Types.ObjectId;

    @Prop({ type: Object })
    customerDetail: {
        fullName: { type: String, maxLength: 100},
        mobile: { type: String, maxLength: 15},
        address: { type: String, maxLength: 150 },
    };

    @Prop()
    items: [{
        giftid: { type: Types.ObjectId, ref: 'GiftCatalogue' , index: true},
        points: { type: Number , required: true},
        quantity: { type: Number , required: true},
    }];

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Transaction', index: true })
    transactionid: Types.ObjectId;

    @Prop({ type: Object })
    payment: {
        paidBy: { type: Types.ObjectId , index: true},
        method: { type: String , required: true , maxLength: 50},
        upiNumber: { type: String , maxLength: 50},
        accountNo: { type: String, maxLength: 50},
        holderName: { type: String , maxLength: 50},
        bankName: { type: String , maxLength: 100},
        ifsc: { type: String , maxLength: 50},
        amount: { type: Number, required: true},
        paymentDate: { type: Date },
        fundSource : {type:String},
        transactionID: { type: String , maxLength: 100},
        details: { type: String , maxLength: 500},
    };

    @Prop({ type: Object })
    dispatched: {
        dispatchBy: { type: Types.ObjectId , index: true},
        dispatchDate: { type: Date },
        courierName: { type: String, maxLength: 100},
        trackingNumber: { type: String, maxLength: 100},
        deliverdDate: { type: Date },
    };

    @Prop({ type: Number , required: true})
    points: number;

    @Prop({ type: Number , default:0})
    tds: number;

    @Prop({ type: Number , default:0})
    tdsPercent: number;

    @Prop({ type: Number , default:0})
    tdsPay: number;


    @Prop({ type: String , maxLength: 50})
    type: string;

    @Prop({ type: String , maxLength: 50})
    status: string;

    @Prop({ type: Object })
    approval: {
        approvedBy: { type: Types.ObjectId , index: true},
        approvedAt: { type: Date },
    };

    @Prop({ type: Object })
    rejected: {
        rejectedBy: { type: Types.ObjectId , index: true},
        rejectedAt: { type: Date },
        reason: { type: String , maxLength: 500},
    };

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: Date,default: new Date() })
    statusUpdatedAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean, default: true })
    active: Boolean;
}

export const RedemptionSchema = SchemaFactory.createForClass(Redemption);

