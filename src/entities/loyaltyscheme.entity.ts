import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type LoyaltyschemeDocument = Loyaltyscheme & Document;

@Schema()
export class schemeDetail extends Document {

    @Prop({ type: String })
    detailName: string;

    @Prop([{ type: SchemaTypes.ObjectId, ref: 'Product' , index: true}])
    products: Types.ObjectId[];

    @Prop([{ type: SchemaTypes.ObjectId, ref: 'Category' , index: true }])
    categories: Types.ObjectId;
  
    @Prop([{ type: SchemaTypes.ObjectId, ref: 'Subcategory' , index: true}])
    subcategories: Types.ObjectId[];

    @Prop({ type: Number })
    minimum: number;

    @Prop({ type: Number })
    maximum: number;

    // @Prop({ type: Number })
    // points: number;

    @Prop({ type: String })
    points: String;
}
export const schemeDetailSchema = SchemaFactory.createForClass(schemeDetail);

@Schema()
export class Loyaltyscheme {

    @Prop({ type: String , required : true , trim: true, index: true, unique: true, sparse: true})
    schemeName: string;

    @Prop({ type: String })
    schemeDescription: string;

    @Prop({ type: Date })
    startedAt: Date;

    @Prop({ type: Date })
    endedAt: Date;

    @Prop({ type: String })
    schemeImage: string;

    @Prop({ type: String })
    schemeType: string;

    @Prop([{ type: String , index: true }])
    customerType: string;

    @Prop([{ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true }])
    customers: Types.ObjectId;

    @Prop([{ type: String , index: true }])
    states: string;

    @Prop([{ type: String , index: true }])
    cities: string;

    @Prop({ type: [schemeDetailSchema], default: [] })
    schemeDetail: Array<schemeDetail>;

    @Prop({ type: String , required : true})
    basedOn: string;

    @Prop({ type: String , required : true})
    frequency: string;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const LoyaltyschemeSchema = SchemaFactory.createForClass(Loyaltyscheme);

