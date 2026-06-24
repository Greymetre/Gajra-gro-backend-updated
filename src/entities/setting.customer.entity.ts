import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
import { User } from './users.entity';
import { Surveyquestion } from './surveyquestion.entity';
export type SettingCustomerDocument = SettingCustomer & Document;

@Schema()
export class SettingCustomer {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer', index: true })
    customerid: Types.ObjectId;
    
    @Prop({ type: Object })
    bankInfo: {
        accountNo: { type: String },
        holderName: { type: String },
        accountType: { type: String },
        bankName: { type: String },
        branch: { type: String },
        ifsc: { type: String },
        image: { type: String },
        verified: { type: Boolean , default: false },
        verifiedBy: { type: Types.ObjectId, ref: 'User' , index: true},
    };

    @Prop({ type: Object })
    upiInfo: {
        paidBy: { type: Types.ObjectId , index: true},
        upiNumber: { type: String , maxLength: 50},
        upiHolderName: { type: String },
        image: { type: String },
        verified: { type: Boolean , default: false },
        verifiedBy: { type: Types.ObjectId, ref: 'User' , index: true},
    };

    @Prop({ type: Object })
    points: {
        has_seen_welcome: { type: Boolean, default: false },
    };
    @Prop({ type: Object })
    redemption: {
        threshold: { type: Boolean, default: false },
        approved: { type: Boolean, default: false },
    };
    @Prop({ type: Boolean, default: true })
    active: Boolean;
}

export const SettingCustomerSchema = SchemaFactory.createForClass(SettingCustomer);
