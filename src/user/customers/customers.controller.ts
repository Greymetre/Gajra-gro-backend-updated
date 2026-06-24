import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe, Req, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { CustomersService } from '../../services/customers.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateCustomerDto, StatusCustomerDto, UpdateCustomerDto, UserAssignToCustomerDto, ParentAssignToCustomerDto } from './dto/request-customer.dto';
import { GetCustomerInfoDto } from './dto/response-customer.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { PaginationRequestDto } from 'src/dto/pagination-dto';
import { CustomerIdDTO } from 'src/dto/dashboard-dto';
import { UpiVerifiedDTO } from 'src/dto/bank-info-dto';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { CustomerIdArrayDTO, CustomerListWithStatusDTO, CustomersImportDto, FilterPaginationCustomerDto, KycRejectDTO, KycVerifiedDTO } from 'src/dto/customer-dto';
import { LoginResponseDto } from '../auth/dto/auth.response.dto';
import { CustomerKycInfoDTO } from 'src/dto/kyc-info-dto';
import { AddRemarkDTO } from 'src/loyalty/remark/dto/request-remark.dto';


const ObjectId = require('mongoose').Types.ObjectId;
@Controller('user/customers')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }
  @ApiOperation({ summary: 'Add Customer' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'shopimage', maxCount: 1 },

  ], {
    storage: diskStorage({

      destination: UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async createCustomer(@Req() req: Request, @Body() createCustomerDto: CreateCustomerDto, @UploadedFiles() files: { avatar?: Express.Multer.File[], shopimage?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.avatar && files.avatar.map(file => (file.path))
    // const shopimage = await files.shopimage && files.shopimage.map(file => (file.path))
    let image: any = await files.avatar && await imageName(req, files.avatar)
    let shopimage: any = await files.shopimage && await imageName(req, files.shopimage)

    // const image = await files.avatar && files.avatar.map(file => (file.path).replace("dist/", ""))
    // const shopimage = await files.shopimage && files.shopimage.map(file => (file.path).replace("dist/", ""))
    createCustomerDto.avatar = (Array.isArray(image) && image.length === 1) ? image[0] : ''
    createCustomerDto.shopimage = (Array.isArray(shopimage) && shopimage.length === 1) ? shopimage[0] : ''
    createCustomerDto.address = JSON.parse(JSON.stringify(createCustomerDto.address));
    return await this.customersService.createCustomer(createCustomerDto, req);
  }

  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @Get()
  // @UseGuards(PermissionGuard)
  protected async getCustomers(@Body() paginationDto: FilterPaginationCustomerDto): Promise<SuccessResponse<any>> {
    const data = await this.customersService.getAllCustomer(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @Post('all')
  // @UseGuards(PermissionGuard)
  protected async getAllCustomer(@Body() paginationDto: FilterPaginationCustomerDto): Promise<SuccessResponse<any>> {
    const data = await this.customersService.getAllCustomer(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular customer details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @Get('/:id')
  protected async getCustomerInfo(@Param('id') id: string): Promise<SuccessResponse<GetCustomerInfoDto>> {
    const data = await this.customersService.getCustomerInfo(id);
    return { data };
  }

  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Patch(':id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'shopimage', maxCount: 1 },
  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination: UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))

  protected async updateCustomerInfo(@Param('id') id: string, @Req() req: Request, @Body() updateCustomerDto: UpdateCustomerDto, @UploadedFiles() files: { avatar?: Express.Multer.File[], shopimage?: Express.Multer.File[] }): Promise<any> {
    // const image = await files.avatar && files.avatar.map(file => (file.path))
    // const shopimage = await files.shopimage && files.shopimage.map(file => (file.path))
    let image: any = await files.avatar && await imageName(req, files.avatar)
    let shopimage: any = await files.shopimage && await imageName(req, files.shopimage)

    // const image = await files.avatar && files.avatar.map(file => (file.path).replace("dist/", ""))
    // const shopimage = await files.shopimage && files.shopimage.map(file => (file.path).replace("dist/", ""))
    updateCustomerDto.avatar = await image && image[0];
    updateCustomerDto.shopimage = await shopimage && shopimage[0];
    return await this.customersService.updateCustomerInfo(id, updateCustomerDto);
  }

  @Delete(':id')
  protected async deleteCustomer(@Param('id') id: string) {
    return await this.customersService.deleteCustomer(id);
  }

  @Post('updateStatus')
  protected async updateStatus(@Body() statusCustomerDto: StatusCustomerDto) {
    return await this.customersService.updateStatus(statusCustomerDto);
  }
  @Post('userAssign')
  protected async userAssign(@Body() userAssignDto: UserAssignToCustomerDto) {
    return await this.customersService.userAssign(userAssignDto);
  }
  @Post('deleteAssignedUser')
  protected async deleteAssignedUser(@Body() userAssignDto: UserAssignToCustomerDto) {
    return await this.customersService.deleteAssignedUser(userAssignDto);
  }
  @Post('addParentCustomer')
  protected async addParentCustomer(@Body() parentAssignDto: ParentAssignToCustomerDto) {
    return await this.customersService.addParentCustomer(parentAssignDto);
  }
  @Post('deleteParentCustomer')
  protected async deleteParentCustomer(@Body() parentAssignDto: ParentAssignToCustomerDto) {
    return await this.customersService.deleteParentCustomer(parentAssignDto);
  }
  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bulkCustomerInsert')
  @HttpCode(200)
  protected async bulckCustomerInsert(): Promise<SuccessResponse<any>> {
    const data = await this.customersService.bulkCustomerInsert();
    return { data };
  }

  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('customerTransfer')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file'))
  protected async FromCRMCustomerInsert(@UploadedFile() file: Express.Multer.File): Promise<SuccessResponse<any>> {
    const data = await this.customersService.customerUploadFromFile(JSON.parse(file.buffer.toString()))
    return { data };
  }
  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bulkCustomerUpdate')
  @HttpCode(200)
  protected async bulckCustomerUpdate(): Promise<SuccessResponse<any>> {
    const data = await this.customersService.bulkCustomerUpdate();
    return { data };
  }

  @ApiOperation({ summary: 'Bank Account Verified' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bankAccountVerified')
  @HttpCode(200)
  protected async bankAccountVerified(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.bankAccountVerified(customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Customer DropDown List' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('dropdown')
  @HttpCode(200)
  protected async getCustomersDropDown(@Req() req: Request): Promise<SuccessResponse<any>> {
    const data = await this.customersService.getCustomersDropDown();
    return { data };
  }

  @ApiOperation({ summary: 'Upi Verified' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('upiVerified')
  @HttpCode(200)
  protected async customerUpiVerified(@Req() req: Request, @Body() upiInfoDTO: UpiVerifiedDTO): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    upiInfoDTO.verifiedBy = ObjectId(authInfo._id)
    const data = await this.customersService.customerUpiVerified(upiInfoDTO);
    return { data };
  }
  @ApiOperation({ summary: 'Bank Account Verified' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('getCustomerBankInfo')
  @HttpCode(200)
  protected async getCustomerBankInfo(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.getCustomerBankInfo(customerIdDTO.customerid)
    return { data };
  }

  @ApiOperation({ summary: 'Clear Upi' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('clearUpiInfo')
  @HttpCode(200)
  protected async clearUpiInfo(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const data = await this.customersService.clearUpiInfo(customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Clear Bank Info' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('clearBankInfo')
  @HttpCode(200)
  protected async clearBankInfo(@Req() req: Request, @Body() customerIdDTO: CustomerIdDTO): Promise<SuccessResponse<any>> {
    const authInfo = await getAuthUserInfo(req.headers)
    const data = await this.customersService.clearBankInfo(customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Clear Bank Info' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('getOtpLog')
  @HttpCode(200)
  protected async getCustomerOtpLog(@Req() req: Request, @Body() paginationDto: PaginationRequestDto): Promise<SuccessResponse<any>> {
    const data = await this.customersService.getCustomerOtpLog(paginationDto);
    return { data };
  }

  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bulkCustomerDelete')
  @HttpCode(200)
  protected async bulkCustomerDelete(@Req() req: Request, @Body() customerIdDTO: CustomerIdArrayDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.bulkCustomerDelete(customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Update LoyaltyScheme' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('bulkCustomerWelcomePoint')
  @HttpCode(200)
  protected async bulkCustomerWelcomePoint(@Body() customerIdDTO: CustomerIdArrayDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.remainingCustomerWelcomePoints(customerIdDTO);
    return { data };
  }

  @ApiOperation({ summary: 'verified Kyc' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @Post('kycVerified')
  @HttpCode(200)
  protected async kycVerified(@Body() kycVerifiedDTO: KycVerifiedDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.kycVerified(kycVerifiedDTO);
    return { data };
  }
  @ApiOperation({ summary: 'verified Kyc' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @Post('kycRejected')
  @HttpCode(200)
  protected async kycRejected(@Body() kycRejectDTO: KycRejectDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.kycRejected(kycRejectDTO);
    return { data };
  }

  @ApiOperation({ summary: 'Get customers list' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @Post('status')
  protected async getCustomerListStatus(@Body() statusListDto: CustomerListWithStatusDTO): Promise<SuccessResponse<any>> {
    const data = await this.customersService.getListWithStatus(statusListDto);
    return { data };
  }

  @ApiOperation({ summary: 'Customer Kyc Update' })
  @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid Kyc' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('kycUpdate')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'aadharimage', maxCount: 1 },
    { name: 'aadharBackImage', maxCount: 1 },
    { name: 'gstinimage', maxCount: 1 },
    { name: 'panimage', maxCount: 1 },
    { name: 'otherimage', maxCount: 1 },
    { name: 'passbookImage', maxCount: 1 },
    { name: 'upiImage', maxCount: 1 }
  ], {
    storage: diskStorage({
      // destination: UploadFilesHelper.destinationPath,
      // filename: UploadFilesHelper.customFileName,

      destination: UploadFilesHelper.s3DestinationPath,
      filename: UploadFilesHelper.customFileName,
    })
  },))
  protected async kycDocUpdate(@Req() req: Request, @Body() kycInfoDto: CustomerKycInfoDTO, @UploadedFiles() files: { aadharimage?: Express.Multer.File[], gstinimage?: Express.Multer.File[], panimage?: Express.Multer.File[], otherimage?: Express.Multer.File[], aadharBackImage?: Express.Multer.File[], passbookImage?: Express.Multer.File[], upiImage?: Express.Multer.File[] }): Promise<SuccessResponse<any>> {
    // var aadharimagepath = await files.aadharimage && files.aadharimage.map(file => (file.path))
    // var aadharbackimagepath = await files.aadharBackImage && files.aadharBackImage.map(file => (file.path))
    // var gstinimagepath = await files.gstinimage && files.gstinimage.map(file => (file.path))
    // var panimagepath = await files.panimage && files.panimage.map(file => (file.path))
    // var otherimagepath = await files.otherimage && files.otherimage.map(file => (file.path))
    // var passbookImagepath = await files.passbookImage && files.passbookImage.map(file => (file.path))

    try {

      let aadharimagepath: any = await files.aadharimage && await imageName(req, files.aadharimage)
      let aadharbackimagepath: any = await files.aadharBackImage && await imageName(req, files.aadharBackImage)
      let gstinimagepath: any = await files.gstinimage && await imageName(req, files.gstinimage)
      let panimagepath = await files.panimage && await imageName(req, files.panimage)
      let otherimagepath = await files.otherimage && await imageName(req, files.otherimage)
      let passbookImagepath = await files.passbookImage && await imageName(req, files.passbookImage)
      let upiImagepath = await files.upiImage && await imageName(req, files.upiImage)

      kycInfoDto.aadharFrontImage = await aadharimagepath && aadharimagepath[0];
      kycInfoDto.aadharBackImage = await aadharbackimagepath && aadharbackimagepath[0];
      kycInfoDto.panImage = await panimagepath && panimagepath[0];
      kycInfoDto.gstinImage = await gstinimagepath && gstinimagepath[0];
      kycInfoDto.otherFrontImage = await otherimagepath && otherimagepath[0];
      kycInfoDto.passbookImage = await passbookImagepath && passbookImagepath[0];
      kycInfoDto.upiImage = await upiImagepath && upiImagepath[0];
      const customerid = kycInfoDto.customerid
      delete kycInfoDto.customerid
      const { accountNo, holderName, bankName, ifsc, accountType, passbookImage, upiNumber, upiImage, upiHolderName } = kycInfoDto
      const newObjectUpiInfo = { image: upiImage, upiNumber, customerid, upiHolderName };
      const newObjectBankInfo = { accountNo, holderName, bankName, ifsc, accountType, image: passbookImage, branch: '' };
     
      await this.customersService.updateCustomerBankInfo(newObjectBankInfo, customerid, newObjectUpiInfo)
      const data = await this.customersService.updateKycInfo(kycInfoDto, customerid);
      return { data };
    } catch (error) {
      console.log(error);

    }
  }


  @ApiOperation({ summary: 'Get customers list' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid customer id' })
  @Post('pendingPayee')
  protected async getPendingPayee(): Promise<SuccessResponse<any>> {
    const data = await this.customersService.pendingPayee();
    return { data };
  }

  @ApiOperation({ summary: 'Add Multiple Product' })
  @ApiResponse({ status: 200, description: 'Success', type: GetCustomerInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('importCustomers')
  @HttpCode(200)
  protected async importCustomers(@Req() req: Request, @Body() createProductDto: CustomersImportDto[]): Promise<any> {
    const data = await this.customersService.importCustomers(req,createProductDto);
    return { data };
  };

  @Post('remark')
  protected async addRemark(@Body() addRemarkDto: AddRemarkDTO) {
    return await this.customersService.addRemark(addRemarkDto);
  }

}
