import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

// One document per news sent from CRM News Management; `users` holds every recipient customer
// so the mobile app can list it (loyalty/notification) even when the push could not be delivered.
@Schema()
export class Notification {
    @Prop({ type: [Object], default: [] })
    users: Array<{
        userid: Types.ObjectId;
        seen: boolean;
        seenAt?: Date;
        isDeleted: boolean;
    }>;

    @Prop({ type: String , index: true})
    title: string;

    @Prop({ type: String , index: true})
    message: string;

    // Storage key (uploaded/notifications/...), shown with the IMAGE_URL prefix
    @Prop({ type: String })
    image: string;

    // Filters chosen in CRM when the news was sent (names, as stored on customer.address)
    @Prop({ type: Object })
    filters: {
        state?: string;
        district?: string;
        city?: string;
        customerIds?: string[];
    };

    @Prop({ type: Number, default: 0 })
    recipientCount: number;

    @Prop({ type: Number, default: 0 })
    pushSentCount: number;

    @Prop({ type: Number, default: 0 })
    pushFailedCount: number;

    @Prop({ type: Number, default: 0 })
    withoutTokenCount: number;

    @Prop({ type: Date, default: Date.now })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;

    // Set when the news is deleted from CRM News History (soft delete)
    @Prop({ type: Date })
    deletedAt?: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
    deletedBy?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ 'users.userid': 1, createdAt: -1 });
