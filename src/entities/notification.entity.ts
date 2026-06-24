import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
    @Prop()
    users: [{
        userid: { type: Types.ObjectId , index: true},
        seen: { type: Boolean , default: false },
        seenAt: { type: Date },
        isDeleted: { type: Boolean , default: false },
    }];

    @Prop({ type: String , index: true})
    title: string;

    @Prop({ type: String , index: true})
    message: string;

    @Prop({ type: String })
    image: string;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

