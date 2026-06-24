import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type GiftCatalogueDocument = GiftCatalogue & Document;

@Schema()
export class GiftCatalogue {

    @Prop({ type: String , required : true , trim: true, index: true})
    giftName: string;

    @Prop({ type: String , index: true})
    giftDescription: string;

    @Prop({ type: String , index: true})
    brand: string;

    @Prop({ type: String , index: true})
    model: string;

    @Prop([{ type: String , index: true }])
    images: string;

    @Prop({ type: Number })
    mrp: number;

    @Prop({ type: Number })
    price: number;

    @Prop({ type: Number })
    points: number;

    @Prop({ type: String , index: true})
    giftType: string;

    @Prop({ type: Date })
    expirydate: Date;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const GiftCatalogueSchema = SchemaFactory.createForClass(GiftCatalogue);
