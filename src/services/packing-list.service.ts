import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PackingList, PackingListDocument } from '../entities/packing-list.entity';
import { CouponProfile, CouponProfileDocument } from '../entities/couponprofile.entity';
import { ImportPackingListMultipleDto } from '../dto/packing-list.dto';

@Injectable()
export class PackingListService {
    private readonly qrUpdateTemplateHeadings = [
        'Packing Slip No',
        'Invoice No',
        'Invoice Date (DD/MM/YYYY)',
        'Dealer Code',
        'Dealer Name',
        'State',
        'City',
    ];

    constructor(
        @InjectModel(PackingList.name) private readonly packingListModel: Model<PackingListDocument>,
        @InjectModel(CouponProfile.name) private readonly couponProfileModel: Model<CouponProfileDocument>,
    ) { }

    async importPackingList(importDto: ImportPackingListMultipleDto) {
        try {
            const operations = importDto.data.map(item => ({
                updateOne: {
                    filter: { packingList: item.packingList },
                    update: { $set: item },
                    upsert: true,
                }
            }));

            await this.packingListModel.bulkWrite(operations);
            return { message: 'Data imported successfully', count: importDto.data.length };
        } catch (error) {
            throw new InternalServerErrorException('Error importing packing list data: ' + error.message);
        }
    }

    async importQrUpdateTemplate(body: { data?: Record<string, any>[] } | Record<string, any>[]) {
        try {
            const rows = Array.isArray(body) ? body : body?.data;
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new BadRequestException('Template data is required');
            }

            const normalizedRows = rows.map((row, index) => {
                const packingList = this.cleanCell(row['Packing Slip No'] ?? row.packingList);
                if (!packingList) {
                    throw new BadRequestException(`Packing Slip No is required at row ${index + 2}`);
                }

                return {
                    packingList,
                    invoiceNo: this.cleanCell(row['Invoice No'] ?? row.invoiceNo),
                    invoiceDate: this.formatInvoiceDate(
                        row['Invoice Date (DD/MM/YYYY)'] ?? row.invoiceDate,
                    ),
                    dealerCode: this.cleanCell(row['Dealer Code'] ?? row.dealerCode),
                    dealerName: this.cleanCell(row['Dealer Name'] ?? row.dealerName),
                    state: this.cleanCell(row.State ?? row.state),
                    city: this.cleanCell(row.City ?? row.city),
                };
            });

            const normalizePackingList = (packingList: string) =>
                packingList.trim().toUpperCase();
            const packingLists = normalizedRows.map(row =>
                normalizePackingList(row.packingList),
            );

            // Generated coupon data stores the Packing Slip number in
            // couponprofiles.couponInfo.packingList. This is the source used to
            // validate imports; packinglists is the destination and may not have
            // a record yet.
            const couponProfilePackingLists = await this.couponProfileModel.aggregate([
                { $unwind: '$couponInfo' },
                {
                    $project: {
                        packingList: {
                            $toUpper: {
                                $trim: {
                                    input: { $ifNull: ['$couponInfo.packingList', ''] },
                                },
                            },
                        },
                    },
                },
                { $match: { packingList: { $in: packingLists } } },
                { $group: { _id: '$packingList' } },
            ]).exec();
            const validPackingLists = new Set(
                couponProfilePackingLists.map(row => row._id),
            );
            const missingPackingLists = Array.from(new Set(
                normalizedRows
                    .filter(row => !validPackingLists.has(normalizePackingList(row.packingList)))
                    .map(row => row.packingList),
            ));

            const rowsToUpdate = normalizedRows.filter(row =>
                validPackingLists.has(normalizePackingList(row.packingList)),
            );

            if (rowsToUpdate.length === 0) {
                throw new BadRequestException({
                    message: `No Packing Slip No values exist: ${missingPackingLists.join(', ')}`,
                    missingPackingLists,
                });
            }

            const result = await this.packingListModel.bulkWrite(
                rowsToUpdate.map(({ packingList, ...details }) => ({
                    updateOne: {
                        filter: { packingList },
                        update: { $set: details },
                        upsert: true,
                    },
                })),
            );

            return {
                message: missingPackingLists.length > 0
                    ? 'Available Packing Slip records were updated; missing records were skipped'
                    : 'Packing list invoice and distributor data updated successfully',
                data: {
                    submittedCount: normalizedRows.length,
                    updatedCount: rowsToUpdate.length,
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                    insertedCount: result.upsertedCount,
                    skippedCount: missingPackingLists.length,
                    missingPackingLists,
                },
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Error updating packing list data: ' + error.message,
            );
        }
    }

    getQrUpdateTemplate() {
        return {
            headings: this.qrUpdateTemplateHeadings,
            data: [
                this.qrUpdateTemplateHeadings.reduce((row, heading) => {
                    row[heading] = '';
                    return row;
                }, {} as Record<string, string>),
            ],
        };
    }

    private cleanCell(value: any): string {
        if (value === undefined || value === null) {
            return '';
        }
        return String(value).trim();
    }

    private formatInvoiceDate(value: any): string {
        if (value === undefined || value === null || value === '') {
            return '';
        }

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return this.toDdMmYyyy(value);
        }

        if (typeof value === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
            return this.toDdMmYyyy(excelEpoch);
        }

        const dateValue = String(value).trim();
        const ddMmYyyy = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (ddMmYyyy) {
            return `${ddMmYyyy[1].padStart(2, '0')}/${ddMmYyyy[2].padStart(2, '0')}/${ddMmYyyy[3]}`;
        }

        const parsedDate = new Date(dateValue);
        return Number.isNaN(parsedDate.getTime()) ? dateValue : this.toDdMmYyyy(parsedDate);
    }

    private toDdMmYyyy(date: Date): string {
        return [
            String(date.getUTCDate()).padStart(2, '0'),
            String(date.getUTCMonth() + 1).padStart(2, '0'),
            date.getUTCFullYear(),
        ].join('/');
    }

    async getPackingListDetails(packingList: string): Promise<PackingList | null> {
        return this.packingListModel.findOne({ packingList }).lean();
    }

    async getMultiplePackingListDetails(packingLists: string[]): Promise<PackingList[]> {
        return this.packingListModel.find({ packingList: { $in: packingLists } }).lean();
    }

    async getAllPackingLists(search?: string, page: number = 1, limit: number = 100) {
        let query = {};
        if (search) {
            query = {
                $or: [
                    { packingList: { $regex: search, $options: 'i' } },
                    { invoiceNo: { $regex: search, $options: 'i' } },
                    { dealerCode: { $regex: search, $options: 'i' } },
                    { dealerName: { $regex: search, $options: 'i' } },
                ]
            };
        }

        const total = await this.packingListModel.countDocuments(query);
        const data = await this.packingListModel.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async exportAll() {
        return this.packingListModel.find().sort({ createdAt: -1 }).lean();
    }
}
