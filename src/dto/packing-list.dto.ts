import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportPackingListDto {
    @IsNotEmpty()
    @IsString()
    packingList: string;

    @IsNotEmpty()
    @IsString()
    invoiceNo: string;

    @IsNotEmpty()
    @IsString()
    invoiceDate: string;

    @IsNotEmpty()
    @IsString()
    dealerCode: string;

    @IsNotEmpty()
    @IsString()
    dealerName: string;

    @IsOptional()
    @IsString()
    state: string;

    @IsOptional()
    @IsString()
    city: string;
}

export class ImportPackingListMultipleDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportPackingListDto)
    data: ImportPackingListDto[];
}
