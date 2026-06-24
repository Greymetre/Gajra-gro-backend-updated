import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PackingList, PackingListDocument } from '../entities/packing-list.entity';
import { ImportPackingListMultipleDto } from '../dto/packing-list.dto';

@Injectable()
export class PackingListService {
    constructor(
        @InjectModel(PackingList.name) private readonly packingListModel: Model<PackingListDocument>,
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
