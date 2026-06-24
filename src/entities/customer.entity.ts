import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
import { User } from './users.entity';
import { Surveyquestion } from './surveyquestion.entity';
export type CustomerDocument = Customer & Document;

@Schema({_id: false})
export class UserAssign extends Document {
  @Prop({ type: SchemaTypes.ObjectId, ref: "User" , index: true})
  userid: User |Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" , index: true})
  reporting: User |Types.ObjectId;
}
export const UserAssignSchema = SchemaFactory.createForClass(UserAssign);

@Schema({_id: false})
export class SurveyData extends Document {
  @Prop({ type: SchemaTypes.ObjectId, ref: "Surveyquestion" , index: true})
  questions: Surveyquestion |Types.ObjectId;

  @Prop({ type: String, required: true })
  answers: string
}
export const SurveyDataSchema = SchemaFactory.createForClass(SurveyData);

@Schema()
export class Customer {

  @Prop({ type: Number , index: true, unique: true, sparse: true})
  refno: number;

  @Prop({ type: String, required: true , index: true})
  firmName: string;

  @Prop({ type: String, default:""})
  deviceToken: string;

  @Prop({ type: String, required: true , index: true})
  contactPerson: string;

  @Prop({ type: String,  default: '+91' })
  phoneCode: string;

  @Prop({ type: String, required: true , trim: true, index: true, unique: true, sparse: true})
  mobile: string;

  @Prop({ type: String , trim: true, index: true, unique: true, sparse: true})
  email: string;

  @Prop({ type: String })
  avatar: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: Boolean , default: false })
  firstTimeLogin: Boolean;

  @Prop({ type: Object })
  deviceInfo: {
    appVersion: { type: String },
    deviceToken: { type: String },
    deviceType: { type: String },
    deviceName: { type: String },
  };
  
  @Prop({ type: Object })
  notification: {
    email: { type: Boolean , default: false },
    mobile: { type: Boolean , default: false }
  };
  
  @Prop({ type: String , index: true})
  customerType: string;

  @Prop({ type: Object })
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  };

  @Prop({ type: Object })
  address: {
    postalCode: { type: String , index: true},
    address: { type: String , index: true},
    city: { type: String , index: true},
    state: { type: String , index: true},
    country: { type: String , index: true},
  };

  @Prop({ type: Object })
  kycInfo: {
    gstinNo: { type: String},
    gstinImage: { type: String},
    panNo: { type: String},
    panImage: { type: String},
    aadharNo: { type: String},
    aadharFrontImage: { type: String},
    aadharBackImage: { type: String},
    otherNo: { type: String},
    otherName: { type: String},
    otherFrontImage: { type: String},
    otherBackImage: { type: String},
    passbookImage: { type: String},
    upiImage : { type: String },
  };

  @Prop({ type: String , index: true})
  phone: string;

  @Prop({ type: String })
  shopimage: string;

  @Prop({ type: String })
  grade: string;

  @Prop({ type: String })
  status: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Beat' , index: true})
  beatid: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'remark' , index: true})
  remarkid: Types.ObjectId;


  @Prop({ type: Object })
  userAssign: {
    userid: { type: Types.ObjectId, index: true },
    reporting: { type: Types.ObjectId , index: true},
  };

  // @Prop({ type: [UserAssignSchema], default: [] })
  // userAssign: Array<UserAssign>;

  @Prop([{ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true}])
  parentid: Types.ObjectId;

  @Prop({ type: [SurveyDataSchema], default: [] })
  surveyData: Array<SurveyData>;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: Date,default: new Date() })
  createdAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" , index: true})
  createdBy: User |Types.ObjectId;

  @Prop({ type: Boolean , default: true })
  active: Boolean;

  @Prop({ type: Object })
  verified: {
    emailVerified: { type: Boolean, default: false },
    mobileVerified: { type: Boolean, default: false },
    gstinVerified: { type: Boolean, default: false },
    panVerified: { type: Boolean, default: false },
    aadharVerified: { type: Boolean, default: false },
    otherVerified: { type: Boolean, default: false },
    bankVerified: { type: Boolean, default: false },
    addressVerified: { type: Boolean, default: false },
    userVerified: { type: Boolean, default: false },
    setPassword: { type: Boolean, default: false },
    upiVerified : { type: Boolean, default: false }
  };

  @Prop({ type: Object })
  benifresiry : {
    bankAccountBeneficiaryId : { type: String },
    upiBeneficiaryId : { type: String },
  }

  @Prop({ type: Date })
  loginAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
