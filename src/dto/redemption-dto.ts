import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsNumber, IsMongoId, IsDefined, MaxLength, Min, IsArray, IsBoolean} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types, ObjectId } from "mongoose";
import { PaginationRequestDto } from './pagination-dto';

export class CreateCouponPointDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    coupon: string;
};

export class GetRedemptionDto {

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    startDate: string;
  
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    endDate: string;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;
};



export class CreateRedemptionDto {

    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    schemeid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    points: number;

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    salesid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    redeemedpoints: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    quantity: number;
    
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    giftid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsOptional()
    address: string;
};

export class UpdateRedemptionDto extends CreateRedemptionDto {

};

export class StatusRedemptionDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) => value === 'true')
    active: string;
};
  
export class StatussRedemptionDto {

    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    id: ObjectId;
  
    @ApiProperty()
    @IsOptional()
    @Transform(({ value} ) =>  value.toString())
    status: string;
};
  
export class CreateGiftRedemptionDto {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    giftid: ObjectId;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    quantity: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    points: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    address: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    redeemedpoints: number;
};
export class BankDetailRedemptionDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    method: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => String)
    accountNo: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    holderName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    bankName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    ifsc: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Type(() => Number)
    amount: number;  

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    upiNumber: string;
};

export class CreateNeftRedemptionDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @IsDefined()
    @IsOptional()
    @Type(() => BankDetailRedemptionDto)
    payment: BankDetailRedemptionDto;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    points: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    type: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    status: string;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    createdBy: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    transactionid: ObjectId;

    @ApiProperty()
    @IsBoolean()
    @IsOptional()
    isAdmin: boolean;
};
export class UpiPaymentRedemptionDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    method: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    upiNumber: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    amount: number;  

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    upiHolderName: string;
};
export class CreateUpiRedemptionDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @IsDefined()
    @IsOptional()
    @Type(() => UpiPaymentRedemptionDto)
    payment: UpiPaymentRedemptionDto;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    points: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    type: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    status: string;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    createdBy: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    transactionid: ObjectId;

    @ApiProperty()
    @IsBoolean()
    @IsOptional()
    isAdmin: boolean;
};

export class CreateWalletRedemptionDto {
    @ApiProperty()
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    redeemedpoints: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    mobile: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    type: string;
};

export class RedemptionIdDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;
};


export class ApprovedRedemptionDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    approvedBy: ObjectId;
};

export class RejectRedemptionDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    rejectedBy: ObjectId;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @Transform(({ value }) => value.toString())
    reason: string;
};

export class TransferRedemptionDto {
    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    redemptionid: ObjectId;

    @ApiProperty()
    @IsMongoId()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    paidBy: ObjectId;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @MaxLength(50)
    @Transform(({ value }) => value.toString())
    status: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @MaxLength(100)
    @Transform(({ value }) => value.toString())
    transactionID: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    details: string;
    
};

export class FilterPaginationRedemptionsDto extends PaginationRequestDto {

    @ApiProperty()
    @IsOptional()
    customerType: string[];
    
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    startDate: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    endDate: string;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    status: string[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    type: string[];
};
