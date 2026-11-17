import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CashfreeStatementDocument = CashfreeStatement & Document;

export enum CASHFREE_STATEMENT_TYPE {
    ACCOUNT = 'ACCOUNT',
    TRANSFER = 'TRANSFER',
}

@Schema({ timestamps: true })
export class CashfreeStatement {
    @Prop({ type: String, required: true, enum: Object.values(CASHFREE_STATEMENT_TYPE), index: true })
    statementType: string;

    // Event Id for account statements, Transfer Id for transfer statements
    @Prop({ type: String, required: true })
    uniqueId: string;

    // Row as uploaded, keyed by the Cashfree column headings
    @Prop({ type: Object, default: {} })
    row: Record<string, any>;

    // CRM user who last imported this row
    @Prop({ type: String, default: '' })
    importedBy: string;
}

export const CashfreeStatementSchema = SchemaFactory.createForClass(CashfreeStatement);
CashfreeStatementSchema.index({ statementType: 1, uniqueId: 1 }, { unique: true });
// Latest row / today's rows on the Cashfree page ("Added On" is "yyyy-mm-ddThh:mm:ss" IST text)
CashfreeStatementSchema.index({ statementType: 1, 'row.Added On': -1 });
