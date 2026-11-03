import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CASHFREE_STATEMENT_TYPE, CashfreeStatement, CashfreeStatementDocument } from '../entities/cashfree-statement.entity';
import { Redemption, RedemptionDocument } from '../entities/redemption.entity';

const MAX_ROWS_PER_REQUEST = 5000;
const MAX_CELL_LENGTH = 500;
const MAX_SEARCH_LENGTH = 100;

// Only these columns are stored; anything else in the uploaded file is dropped
const STATEMENT_COLUMNS: Record<CASHFREE_STATEMENT_TYPE, string[]> = {
    [CASHFREE_STATEMENT_TYPE.ACCOUNT]: [
        'Added On', 'Debit/Credit', 'Particulars', 'Charged Amount (INR)', 'Amount (INR)', 'Service Charge (INR)',
        'Service Tax (INR)', 'Closing Balance (INR)', 'Event Id', 'Remarks',
    ],
    [CASHFREE_STATEMENT_TYPE.TRANSFER]: [
        'Added On', 'Amount', 'Transfer Id', 'Reference Id', 'Status', 'Beneficiary Name', 'Beneficiary Id',
        'Bank Account', 'IFSC', 'VPA', 'Remarks', 'Bank Reference No', 'Service Charge', 'Service Tax', 'Acknowledged',
        'Mode', 'Status Code', 'Payment Instrument ID', 'Last checked at', 'Added by', 'Status Description', 'Extended UTR',
    ],
};

// Bank account / UPI ids never leave the server in full
const MASKED_TRANSFER_COLUMNS = ['Bank Account', 'VPA'];

const mask = (value: any): string => {
    const text = String(value ?? '').trim();
    if (!text) return '';
    return text.length <= 4 ? 'XXXX' : 'X'.repeat(Math.min(text.length - 4, 8)) + text.slice(-4);
};

@Injectable()
export class CashfreeStatementService {
    private readonly logger = new Logger(CashfreeStatementService.name);

    private readonly uniqueColumn = {
        [CASHFREE_STATEMENT_TYPE.ACCOUNT]: 'Event Id',
        [CASHFREE_STATEMENT_TYPE.TRANSFER]: 'Transfer Id',
    };

    constructor(
        @InjectModel(CashfreeStatement.name) private readonly cashfreeStatementModel: Model<CashfreeStatementDocument>,
        @InjectModel(Redemption.name) private readonly redemptionModel: Model<RedemptionDocument>,
    ) { }

    private parseType(statementType: any): CASHFREE_STATEMENT_TYPE {
        const type = String(statementType || '').toUpperCase() as CASHFREE_STATEMENT_TYPE;
        if (!Object.values(CASHFREE_STATEMENT_TYPE).includes(type)) {
            throw new BadRequestException('statementType must be ACCOUNT or TRANSFER');
        }
        return type;
    }

    // Keep only known columns as plain strings, so no Mongo operators, nested objects or extra fields get stored
    private cleanRow(row: any, statementType: CASHFREE_STATEMENT_TYPE): Record<string, string> {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return {};
        return STATEMENT_COLUMNS[statementType].reduce((clean, column) => {
            const value = Object.prototype.hasOwnProperty.call(row, column) ? row[column] : '';
            clean[column] = typeof value === 'object' || value === undefined || value === null
                ? ''
                : String(value).trim().slice(0, MAX_CELL_LENGTH);
            return clean;
        }, {} as Record<string, string>);
    }

    private maskRow(row: Record<string, any>, statementType: string): Record<string, any> {
        if (statementType !== CASHFREE_STATEMENT_TYPE.TRANSFER || !row) return row;
        const masked = { ...row };
        MASKED_TRANSFER_COLUMNS.forEach((column) => { masked[column] = mask(masked[column]); });
        return masked;
    }

    async importStatement(body: { statementType?: string; data?: Record<string, any>[] }, userId?: string) {
        const statementType = this.parseType(body?.statementType);
        const rows = body?.data;
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new BadRequestException('File data is required');
        }
        if (rows.length > MAX_ROWS_PER_REQUEST) {
            throw new BadRequestException(`Maximum ${MAX_ROWS_PER_REQUEST} rows allowed per request`);
        }

        const uniqueColumn = this.uniqueColumn[statementType];
        const missingRows: number[] = [];
        const operations = [];
        rows.forEach((rawRow, index) => {
            const row = this.cleanRow(rawRow, statementType);
            const uniqueId = row[uniqueColumn];
            if (!uniqueId) {
                missingRows.push(index + 2);
                return;
            }
            operations.push({
                updateOne: {
                    filter: { statementType, uniqueId },
                    update: { $set: { statementType, uniqueId, row, importedBy: userId || '' } },
                    upsert: true,
                },
            });
        });

        if (operations.length === 0) {
            throw new BadRequestException(`${uniqueColumn} is missing in all rows. Please check the file type.`);
        }

        try {
            const result = await this.cashfreeStatementModel.bulkWrite(operations, { ordered: false });
            this.logger.log(`Cashfree ${statementType} import by user ${userId}: ${operations.length} rows`);
            return {
                message: 'Data imported successfully',
                data: {
                    submittedCount: rows.length,
                    insertedCount: result.upsertedCount,
                    updatedCount: result.matchedCount,
                    skippedCount: missingRows.length,
                    skippedRows: missingRows,
                },
            };
        } catch (error) {
            this.logger.error(`Cashfree ${statementType} import failed: ${error?.message}`);
            throw new InternalServerErrorException('Error importing cashfree statement');
        }
    }

    async getStatements(statementType: string, page: number = 1, limit: number = 50, search?: string) {
        const type = this.parseType(statementType);
        page = Math.max(Math.floor(Number(page)) || 1, 1);
        limit = Math.min(Math.max(Math.floor(Number(limit)) || 50, 1), 500);

        const query: Record<string, any> = { statementType: type };
        if (typeof search === 'string' && search.trim()) {
            const term = search.trim().slice(0, MAX_SEARCH_LENGTH).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.uniqueId = { $regex: term, $options: 'i' };
        }

        try {
            const [totalDocs, docs] = await Promise.all([
                this.cashfreeStatementModel.countDocuments(query),
                this.cashfreeStatementModel.find(query, { row: 1 })
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            return {
                data: {
                    docs: docs.map((doc) => this.maskRow(doc.row, type)),
                    totalDocs,
                    page,
                    limit,
                    totalPages: Math.ceil(totalDocs / limit),
                },
            };
        } catch (error) {
            this.logger.error(`Cashfree ${type} list failed: ${error?.message}`);
            throw new InternalServerErrorException('Error loading cashfree statement');
        }
    }

    // Data for the Cashfree reconciliation workbook: both statements plus CRM redemptions,
    // matched on UTR. KYC fields (Aadhaar, PAN) are never sent; bank account and UPI are masked.
    async getExportReport(userId?: string) {
        try {
            const [account, transfer, redemptions] = await Promise.all([
                this.cashfreeStatementModel.find({ statementType: CASHFREE_STATEMENT_TYPE.ACCOUNT }, { row: 1 }).lean(),
                this.cashfreeStatementModel.find({ statementType: CASHFREE_STATEMENT_TYPE.TRANSFER }, { row: 1 }).lean(),
                this.redemptionModel.aggregate([
                    {
                        $lookup: {
                            from: 'customers',
                            localField: 'customerid',
                            foreignField: '_id',
                            pipeline: [
                                { $project: { _id: 1, firmName: 1, contactPerson: 1, mobile: 1, address: 1, customerType: 1 } },
                            ],
                            as: 'customerInfo',
                        },
                    },
                    { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            customerid: { $ifNull: ['$customerid', ''] },
                            firmName: { $ifNull: ['$customerInfo.firmName', ''] },
                            contactPerson: { $ifNull: ['$customerInfo.contactPerson', ''] },
                            customerType: { $ifNull: ['$customerInfo.customerType', ''] },
                            mobile: { $ifNull: ['$customerInfo.mobile', ''] },
                            state: { $ifNull: ['$customerInfo.address.state', ''] },
                            city: { $ifNull: ['$customerInfo.address.city', ''] },
                            refno: { $ifNull: ['$refno', ''] },
                            type: { $ifNull: ['$type', ''] },
                            points: { $ifNull: ['$points', 0] },
                            status: { $ifNull: ['$status', ''] },
                            paymentDate: { $ifNull: ['$payment.paymentDate', ''] },
                            UTR_No: { $ifNull: ['$payment.transactionID', ''] },
                            holderName: { $ifNull: ['$payment.holderName', ''] },
                            fundSource: { $ifNull: ['$payment.fundSource', ''] },
                            accountNo: { $ifNull: ['$payment.accountNo', ''] },
                            bankName: { $ifNull: ['$payment.bankName', ''] },
                            ifsc: { $ifNull: ['$payment.ifsc', ''] },
                            upiNumber: { $ifNull: ['$payment.upiNumber', ''] },
                            createdAt: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                            dateFilter: { $ifNull: ['$createdAt', ''] },
                        },
                    },
                    { $sort: { dateFilter: -1 } },
                ]).allowDiskUse(true).exec(),
            ]);
            this.logger.log(`Cashfree report exported by user ${userId}`);
            return {
                data: {
                    account: account.map((doc) => doc.row),
                    transfer: transfer.map((doc) => this.maskRow(doc.row, CASHFREE_STATEMENT_TYPE.TRANSFER)),
                    redemptions: redemptions.map((row) => ({
                        ...row,
                        accountNo: mask(row.accountNo),
                        upiNumber: mask(row.upiNumber),
                    })),
                },
            };
        } catch (error) {
            this.logger.error(`Cashfree report export failed: ${error?.message}`);
            throw new InternalServerErrorException('Error building cashfree report');
        }
    }
}
