import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ type: String, required: true , index: true})
  firstName: string;

  @Prop({ type: String, required: true , index: true})
  lastName: string;

  @Prop({ type: String, required: true, default : '+91' })
  phoneCode: string;

  @Prop({ type: Number, required: true, trim: true, index: true, unique: true, sparse: true })
  mobile: number;

  @Prop({ type: String , trim: true, index: true, unique: true, sparse: true})
  email: string;

  @Prop({ type: String })
  gender: string;

  @Prop({ type: String })
  avatar: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: Date, required: false })
  dateOfBirth: Date;

  @Prop({ type: Object })
  deviceInfo: {
    appVersion: { type: String},
    deviceToken: { type: String},
    deviceType: { type: String },
    deviceName: { type: String},
  };

  @Prop({ type: Object })
  notification: {
    email: { type: Boolean , default: false },
    mobile: { type: Boolean , default: false }
  };
  
  @Prop({ type: String , index: true})
  userType: string;

  @Prop({ type: Object })
  address: {
    postalCode: { type: String },
    address: { type: String },
    city: { type: String},
    state: { type: String},
    country: { type: String},
  };

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'User' , index: true}])
  reporting: Types.ObjectId;

  @Prop([{ type: String , index: true }])
  workingArea: string;

  @Prop({ type: Date, default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
  createdBy: Types.ObjectId;

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'Category' , index: true}])
  categories: Types.ObjectId;

  @Prop({ type: Boolean , default: false })
  active: Boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);