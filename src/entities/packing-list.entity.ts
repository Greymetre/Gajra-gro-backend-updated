import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PackingListDocument = PackingList & Document;

@Schema({ timestamps: true })
export class PackingList {
    @Prop({ type: String, required: true, index: true, unique: true })
    packingList: string;

    @Prop({ type: String })
    invoiceNo: string;

    @Prop({ type: String })
    invoiceDate: string;

    @Prop({ type: String })
    dealerCode: string;

    @Prop({ type: String })
    dealerName: string;

    @Prop({ type: String })
    state: string;

    @Prop({ type: String })
    city: string;
}

export const PackingListSchema = SchemaFactory.createForClass(PackingList);
