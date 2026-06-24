import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString,IsArray, IsNotEmpty, IsNumber, IsEmail, IsDefined, IsObject, ValidateNested, IsBoolean, IsMongoId, IsEnum, IsDate} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AddressDTO } from './address-dto'
import { PaginationRequestDto } from './pagination-dto';
import { Types, ObjectId } from "mongoose";
import { KycDocuments, VerifiedTo } from 'src/common/constants';
import { CustomerKycInfoDTO } from './kyc-info-dto';
export class CustomerVerifiedDto {
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    emailVerified: boolean;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    mobileVerified: boolean;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    gstinVerified: boolean;
  
    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    panVerified: boolean;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    aadharVerified: boolean;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    otherVerified: boolean;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    addressVerified: boolean;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    userVerified: boolean;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    setPassword: boolean;
};
export class CustomerDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    firmName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    contactPerson: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    phoneCode: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    mobile: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value?.trim())
    email: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    password: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    customerType: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    phone: string;

    @ApiProperty()
    @IsOptional()
    avatar: any;

    @ApiProperty()
    @IsOptional()
    shopimage: any;

    @IsDefined()
    @IsOptional()
    @Type(() => AddressDTO)
    address: AddressDTO;

    @ApiProperty()
    @IsString()
    @IsOptional()
    grade: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    status: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    appVersion : string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    deviceToken : string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    deviceType : string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    deviceName : string;

    @ApiProperty()
    @IsOptional()
    @IsObject()
    @Type(() => CustomerVerifiedDto)
    verified : CustomerVerifiedDto;

    @ApiProperty()
    @IsString()
    @IsOptional()
    createdBy: string;

    @ApiProperty()
    @IsDate()
    @IsOptional()
    loginAt : Date;

    @IsDefined()
    @IsOptional()
    @Type(() => AddressDTO)
    deviceInfo: any;

    @ApiProperty()
    @IsString()
    @IsOptional()
    remarkid: string;
};

export class CustomerPersonalDetailsDto extends CustomerKycInfoDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    firmName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    contactPerson: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    mobile: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value?.trim())
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    customerType: string;

    @IsDefined()
    @IsOptional()
    @Type(() => AddressDTO)
    address: AddressDTO;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    avatar: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    shopimage: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    upiImage: string;
};
export class CustomerAvatarDto {
    @ApiProperty()
    @IsOptional()
    avatar: any;
};

export class FilterPaginationCustomerDto extends PaginationRequestDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    search: string;

    @IsOptional()
    searchByPincode?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    startDate: string;


    @ApiProperty()
    @IsOptional()
    customerType: string[];

    @ApiProperty({ type: [String] })
    @IsArray()
    @IsOptional()
    postalCode: string[];

    @ApiProperty({ type: [String] })
    @IsArray()
    @IsOptional()
    state: string[];

    @ApiProperty({ type: [String] })
    @IsArray()
    @IsOptional()
    city: string[];

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    endDate: string;

    @ApiProperty()
    @IsBoolean()
    @IsOptional()
    existing: boolean;

    @ApiProperty()
    @IsBoolean()
    @IsOptional()
    self: boolean;

    @ApiProperty()
    @IsOptional()
    userid: string[];

    @ApiProperty()
    @IsOptional()
    status: string[];

    @ApiProperty()
    @IsArray()
    @IsOptional()
    condition: string[];
};

export class CustomerIdArrayDTO {
    @ApiProperty()
    @IsNotEmpty()
    customerids: string[];
};

export class KycVerifiedDTO {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsEnum(VerifiedTo)
    @Transform(({ value }) => value?.trim())
    verifiedTo: string;
};

export class KycRejectDTO {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    @Transform(({ value }) => value.toString())
    customerid: ObjectId;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsEnum(KycDocuments)
    @Transform(({ value }) => value?.trim())
    kycdocs:string;
};

export class CustomerListWithStatusDTO {
    @ApiProperty()
    @IsNotEmpty()
    status: string[];

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.toString())
    search: string;
};

export class CustomersImportDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    firmName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    contactPerson: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    mobile: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value?.trim())
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    customerType: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    postalCode: string;
  
    @ApiProperty()
    @IsString()
    @IsOptional()
    address: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    city: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    state: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    country: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    status: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    remarkid: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    AdharNumber: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    PanNo: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    AccountHolderName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    IFSCCode: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    accountNo: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    remark: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    BankName: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    bankVee: boolean;

    @ApiProperty()
    @IsString()
    @IsOptional()
    active: boolean;

    @ApiProperty()
    @IsDate()
    @IsOptional()
    loginAt : Date;

    @ApiProperty()
    @IsString()
    @IsOptional()
    location: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    grade: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    _id: string;
    
};




