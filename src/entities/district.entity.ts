import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type DistrictDocument = District & Document;

// Districts come from GG SFA (see sfa-location-sync.ts); sfaId is the SFA districts.id
@Schema()
export class District {
  @Prop({ type: String, required: true, trim: true, index: true })
  districtName: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'State', index: true })
  stateid: Types.ObjectId;

  @Prop({ type: String, index: true })
  state: string;

  @Prop({ type: String, index: true })
  country: string;

  @Prop({ type: Number, index: true, unique: true, sparse: true })
  sfaId: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  active: Boolean;
}

export const DistrictSchema = SchemaFactory.createForClass(District);
