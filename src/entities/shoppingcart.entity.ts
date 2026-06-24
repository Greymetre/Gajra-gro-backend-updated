import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type ShoppingcartDocument = Shoppingcart & Document;

@Schema()
export class Shoppingcart {

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
  customerid: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product' , index: true })
  productid: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product.productDetail' , index: true})
  productDetailid: Types.ObjectId;

  @Prop({ type: Number })
  quantity: number;

  @Prop({ type: Number })
  price: number;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;
}

export const ShoppingcartSchema = SchemaFactory.createForClass(Shoppingcart);
