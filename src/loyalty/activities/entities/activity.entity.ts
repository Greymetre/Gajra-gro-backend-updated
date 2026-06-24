import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema()
export class Activity {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    userid: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer' , index: true})
    customerid: Types.ObjectId;

    @Prop()
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
        address: { type: String },
    };

    @Prop({ type: String })
    description: string;
  
    @Prop({ type: String })
    type: string;

    @Prop({ type: String })
    refid: string;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

