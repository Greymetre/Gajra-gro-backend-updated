import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type CityDocument = City & Document;

@Schema()
export class City {
  @Prop({ type: String, required: true , index: true})
  cityName: string;

  @Prop([{ type: String , index: true}])
  pincode: string;

  @Prop({ type: String , index: true})
  state: string;

  @Prop({ type: String , index: true})
  country: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'District', index: true })
  districtid: Types.ObjectId;

  @Prop({ type: String, index: true })
  district: string;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true})
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;

  // GG SFA id (countries/states/cities.id); set by the SFA location sync
  @Prop({ type: Number, index: true, unique: true, sparse: true })
  sfaId: number;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CitySchema = SchemaFactory.createForClass(City);

