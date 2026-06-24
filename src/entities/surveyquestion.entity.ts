import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';

export type SurveyquestionDocument = Surveyquestion & Document;

@Schema()
export class Surveyquestion {
    @Prop({ type: String, required: true , trim: true, index: true, unique: true, sparse: true})
    fieldName: string;

    @Prop({ type: String, required: true , index: true})
    fieldType: string;

    @Prop({ type: String, required: true , index: true})
    labelName: string;

    @Prop({ type: Boolean, default: false })
    isRequired: boolean;

    @Prop({ type: Boolean, default: false })
    isMultiple: boolean;

    @Prop([{ type: String }])
    customerType: string;

    @Prop([{ type: String }])
    options: string;

    @Prop({ type: Number })
    ranking: number;

    @Prop({ type: Date,default: new Date() })
    createdAt: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
    createdBy: Types.ObjectId;

    @Prop({ type: Boolean , default: true })
    active: Boolean;
}

export const SurveyquestionSchema = SchemaFactory.createForClass(Surveyquestion);

