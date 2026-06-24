import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type AttendanceDocument = Attendance & Document;

@Schema()
export class Attendance {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    userid: Types.ObjectId;

    @Prop({ type: Date,default: new Date() })
    punchinAt: Date;

    @Prop({ type: Date })
    punchoutAt: Date;

    @Prop({ type: String })
    workedTime: string;

    @Prop({ type: String })
    punchinImage: string;

    @Prop({ type: String })
    punchoutImage: string;

    @Prop({ type: Object })
    punchinLocation: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
        address: { type: String},
    };

    @Prop({ type: Object })
    punoutLocation: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
        address: { type: String},
    };

    @Prop([{ type: String }])
    type: string;

    @Prop({ type: String })
    punchinSummary: string;

    @Prop({ type: String})
    punchoutSummary: string;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Beatschedule' , index: true})
    beatscheduleid: Types.ObjectId;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' , index: true})
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
