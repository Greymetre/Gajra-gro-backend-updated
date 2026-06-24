import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type CountryDocument = Country & Document;

@Schema()
export class Country {
  @Prop({ type: String, required: true , trim: true, index: true, unique: true, sparse: true })
  countryName: string;

  @Prop({ type: String})
  iso: string;

  @Prop({ type: String , index: true})
  phoneCode: string;

  @Prop({ type: String , index: true})
  currency: string;

  @Prop({ type: String })
  timezones: string;

  @Prop({ type: String })
  flag: string;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;
}

export const CountrySchema = SchemaFactory.createForClass(Country);


