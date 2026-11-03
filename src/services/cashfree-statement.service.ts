import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CASHFREE_STATEMENT_TYPE, CashfreeStatement, CashfreeStatementDocument } from '../entities/cashfree-statement.entity';

const MAX_ROWS_PER_REQUEST = 5000;

@Injectable()
export class CashfreeStatementService {
    private readonly uniqueColumn = {
        [CASHFREE_STATEMENT_TYPE.ACCOUNT]: 'Event Id',
        [CASHFREE_STATEMENT_TYPE.TRANSFER]: 'Transfer Id',
    };

    constructor(
        @InjectModel(CashfreeStatement.name) private readonly cashfreeStatementModel: Model<CashfreeStatementDocument>,
    ) { }

    private parseType(statementType: string): CASHFREE_STATEMENT_TYPE {
        const type = String(statementType || '').toUpperCase() as CASHFREE_STATEMENT_TYPE;
        if (!Object.values(CASHFREE_STATEMENT_TYPE).includes(type)) {
            throw new BadRequestException('statementType must be ACCOUNT or TRANSFER');
        }
        return type;
    }

    async importStatement(body: { statementType?: string; data?: Record<string, any>[] }) {
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
        rows.forEach((row, index) => {
            const uniqueId = String(row?.[uniqueColumn] ?? '').trim();
            if (!uniqueId) {
                missingRows.push(index + 2);
                return;
            }
            operations.push({
                updateOne: {
                    filter: { statementType, uniqueId },
                    update: { $set: { statementType, uniqueId, row } },
                    upsert: true,
                },
            });
        });

        if (operations.length === 0) {
            throw new BadRequestException(`${uniqueColumn} is missing in all rows. Please check the file type.`);
        }

        try {
            const result = await this.cashfreeStatementModel.bulkWrite(operations, { ordered: false });
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
            throw new InternalServerErrorException('Error importing cashfree statement: ' + error.message);
        }
    }

    async getStatements(statementType: string, page: number = 1, limit: number = 50, search?: string) {
        const type = this.parseType(statementType);
        page = Math.max(Number(page) || 1, 1);
        limit = Math.min(Math.max(Number(limit) || 50, 1), 500);

        const query: Record<string, any> = { statementType: type };
        if (search) {
            query.uniqueId = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        }

        const [totalDocs, docs] = await Promise.all([
            this.cashfreeStatementModel.countDocuments(query),
            this.cashfreeStatementModel.find(query)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        return {
            data: {
                docs: docs.map((doc) => doc.row),
                totalDocs,
                page,
                limit,
                totalPages: Math.ceil(totalDocs / limit),
            },
        };
    }

    async exportAll(statementType: string) {
        const type = this.parseType(statementType);
        const docs = await this.cashfreeStatementModel.find({ statementType: type })
            .sort({ createdAt: -1, _id: -1 })
            .lean();
        return { data: docs.map((doc) => doc.row) };
    }
}
