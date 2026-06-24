import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema()
export class productDetail extends Document {

    @Prop({ type: Number })
    mrp: number;

    @Prop({ type: Number })
    price: number;

    @Prop({ type: String })
    partNo: string;

    @Prop({ type: String , index: true})
    specification: string;

    @Prop({ type: Boolean })
    isPrimary: boolean;
}
export const productDetailSchema = SchemaFactory.createForClass(productDetail);

@Schema()
export class Product {

    @Prop({ type: String , required : true , trim: true, index: true, unique: true, sparse: true})
    name: string;

    @Prop({ type: String , trim: true, index: true, unique: true, sparse: true})
    productNo: string;

    @Prop({ type: String , index: true})
    description: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Category' , index: true})
    categoryid: Types.ObjectId;
  
    @Prop({ type: SchemaTypes.ObjectId, ref: 'Subcategory' , index: true})
    subcategoryid: Types.ObjectId;

    @Prop({ type: String , index: true})
    brand: string;

    @Prop()
    images: [{
        image: { type: String},
    }];

    @Prop({ type: [productDetailSchema], default: [] })
    productDetail: Array<productDetail>;

    @Prop({ type: Object })
    measurement: {
        weight: { type: String},
        pcs: { type: String},
        size: { type: String},
    };
    
    @Prop({ type: String , index: true})
    model: string;

    @Prop({ type: Boolean , default: false})
    featured: boolean;

    @Prop({ type: Boolean, default: false })
    isNewLaunch: boolean;

    @Prop({ type: Number })
    ranking: number;

    @Prop({ type: Number })
    discount: number;

    @Prop({ type: Number , default: 0})
    points: number;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
