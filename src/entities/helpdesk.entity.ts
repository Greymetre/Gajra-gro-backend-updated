import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type HelpdeskDocument = Helpdesk & Document;

@Schema()
export class Helpdesk {

    @Prop({ type: String , required : true , trim: true, index: true, unique: true, sparse: true})
    ticketNo: string;

    @Prop({ type: String , index: true})
    subject: string;

    @Prop({ type: Date })
    Date: Date;

    @Prop({ type: String , index: true})
    details: string;

    @Prop({ type: String , index: true})
    mobile: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
    customerid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    userid: Types.ObjectId;

    @Prop({ type: String })
    status: string;

    @Prop([{ type: String }])
    files: string;

    @Prop({ type: Boolean , default: false })
    completed: Boolean;

    @Prop({ type: Date })
    assignedAt: Date;

    @Prop({ type: Date })
    completedAt: Date;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const HelpdeskSchema = SchemaFactory.createForClass(Helpdesk);