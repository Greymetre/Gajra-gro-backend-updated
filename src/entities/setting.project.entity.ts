import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types, Document } from 'mongoose';
export type SettingProjectDocument = SettingProject & Document;
@Schema()
export class SettingProject {
    @Prop([{ type: String }])
    customerType: string;

    // @Prop([{ type: String }])
    // roles: string;

    @Prop([{ type: String }])
    banner: string;

    @Prop({ type: Object })
    login: {
        background: { type: Boolean, default: false },
        image: { type: String},
        login_with_password: { type: Boolean, default: true },
        login_with_otp: { type: Boolean, default: false },
        verified_check: { type: Boolean, default: false },
    };

    @Prop({ type: Object })
    loyaltyscheme: {
        scheme_start_alert: { type: Boolean, default: false },
        startedAt: { type: Date },
        endedAt: { type: Date },
        coupon_based: { type: Boolean, default: false },
        sales_based: { type: Boolean, default: false },
        customerType_based: { type: Boolean, default: false },
        scheme_types: [{ type: String }],
        scheme_based: [{ type: String }],
        states_based: { type: Boolean, default: false },
        city_based: { type: Boolean, default: false },
        customer_based: { type: Boolean, default: false },
        category_based: { type: Boolean, default: false },
        subcategory_based: { type: Boolean, default: false },
        product_based: { type: Boolean, default: false },
    };

    @Prop({ type: Object })
    points: {
        point_value: { type: Number, default: 1 },
        welcome: { type: Number, default: 0 },
        point_types: [{ type: String }],
    };

    @Prop({ type: Object })
    redemption: {
        startedAt: { type: Date },
        endedAt: { type: Date },
        every_threshold: { type: Boolean, default: false },
        first_threshold: { type: Boolean, default: false },
        threshold: { type: Number, default: 1 },
        milestone_points: { type: Boolean, default: false },
        automated: { type: Boolean, default: false },
        approval: { type: Boolean, default: false },
        redeem_types: [{ type: String }],
        reject_reason: [{ type: String }],
    };

    @Prop({ type: Object })
    gift: {
        gift_types: [{ type: String }],
    };

    @Prop({ type: Object })
    helpdesk: {
        phone: { type: String },
        whatsapp: { type: String },
        email: { type: String },
        address: { type: String },
    };

    @Prop({
        type: [String],
        default: [],
        validate: {
            validator: function (value: string[]) {
                return value.length <= 5;
            },
            message: 'Maximum 5 YouTube Shorts links are allowed',
        },
    })
    youtubeShorts: string[];

    @Prop({ type: Object })
    socialmedia: {
        facebook: { type: String },
        youtube: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
        twitter: { type: String },
        google: { type: String },
    };

    @Prop({ type: Object })
    catalogue: {
        privacy: { type: String },
        terms: { type: String },
        loyalty: { type: String },
        product: { type: String },
    };

    @Prop({ type: Object })
    mobileapp: {
        loyalty_version: { type: String },
        sales_version: { type: String },
        distributor_version: { type: String },
    };

    @Prop([{ type: Object }])
    permissions: [{
        role: { type: String },
        canAccess: [{ type: String }],
    }];

    @Prop({ type: Object })
    callcenter: {
        calltypes: [{ type: String }],
        callstatus: [{ type: String }],
    };

    @Prop({ type: Boolean, default: true })
    active: Boolean;

}

export const SettingProjectSchema = SchemaFactory.createForClass(SettingProject);