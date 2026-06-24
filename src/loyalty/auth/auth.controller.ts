import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, HttpCode, UsePipes, Req, UploadedFile, UploadedFiles } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CustomersService } from '../../services/customers.service';
import { LoginRequestDto, MobileRequestDto, EmailRequestDto, changePasswordRequestDto, passwordRequestDto, LoginWithOtpRequestDto, LoginMobileRequestDto, CreatePasswordRequestDto } from '../../dto/auth-dto';
import { CustomerKycInfoDTO } from '../../dto/kyc-info-dto'
import { TransformInterceptor } from '../../common/dispatchers/transform.interceptor';
import { SuccessResponse } from '../../common/interfaces/response';
import { LoginResponseDto } from './dto/auth.response.dto';
import { ValidationPipe } from '../../validations/validation.pipe';
import { Request } from 'express';
import { CustomerAvatarDto, CustomerDto, CustomerPersonalDetailsDto } from '../../dto/customer-dto'
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { UploadFilesHelper, imageName } from 'src/common/utils/helper.service';
import { getCustomerAuthInfo } from 'src/common/utils/jwt.helper';
import { AddressDTO } from 'src/dto/address-dto';
import { CustomerSurveyDataDTO } from 'src/dto/survey-data-dto';
import { BankInfoDTO, UpiInfoDTO } from 'src/dto/bank-info-dto';

@Controller('loyalty/auth')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class AuthController {
    constructor(private readonly authService: CustomersService) { }
    @ApiOperation({ summary: 'Login into the system' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid id or password' })
    @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('login')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async loginUser(@Body() loginDto: LoginRequestDto): Promise<SuccessResponse<LoginResponseDto>> {
        const data = await this.authService.userLogin(loginDto);
        return { data };
    };

    @ApiOperation({ summary: 'Setting' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Loyalty Setting' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Get('setting')
    @HttpCode(200)
    protected async settingInfo(@Req() req: Request): Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.settingInfo(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Login into the system' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid id or password' })
    @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('loginWithOtp')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async loginUserWithOtp(@Body() loginWithOtpDto: LoginWithOtpRequestDto): Promise<SuccessResponse<LoginResponseDto>> {
        const data = await this.authService.loginUserWithOtp(loginWithOtpDto);
        return { data };
    };

    @ApiOperation({ summary: 'Login into the system' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid id or password' })
    @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('loginWithMobile')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async loginWithMobile(@Body() loginWithMobileDto: LoginMobileRequestDto): Promise<SuccessResponse<LoginResponseDto>> {
        const data = await this.authService.loginWithMobile(loginWithMobileDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Mobile No Exist' })
    @ApiResponse({ status: 200, description: 'Mobile number is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Mobile number is not available' })
    @Post('mobileExists')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async checkMobileExists(@Body() mobileDto: MobileRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.checkMobileExists(mobileDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('emailExists')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async checkEmailExists(@Body() emailDto: EmailRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.checkEmailExists(emailDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('forgotPassword')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async forgotPassword(@Body() emailDto: EmailRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.forgotPassword(emailDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('changePassword')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async changePassword(@Req() req: Request, @Body() changePasswordDto: changePasswordRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.changePassword(req, changePasswordDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('resetPassword')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async resetPassword(@Req() req: Request, @Body() passwordDto: passwordRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.resetPassword(req, passwordDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('createNewPassword')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async createNewPassword(@Body() createPasswordDto: CreatePasswordRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.createNewPassword(createPasswordDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('newOtpRequest')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async newOtpRequest(@Body() mobileDto: MobileRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.newOtpRequest(mobileDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('resendOtpRequest')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async resendOtpRequest(@Body() mobileDto: MobileRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.resendOtpRequest(mobileDto);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Signup' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid id or password' })
    @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('signup')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    // @UseInterceptors(FileFieldsInterceptor([
    //     { name: 'avatar', maxCount: 1 },
    //     { name: 'shopimage', maxCount: 1 },
    // ], {
    //     storage: diskStorage({
    //         destination: UploadFilesHelper.destinationPath,
    //         filename: UploadFilesHelper.customFileName,
    //     })
    // },))
    // protected async signup(@Req() req: Request, @Body() signupDto: CustomerDto, @UploadedFiles() files: { avatar?: Express.Multer.File[], shopimage?: Express.Multer.File[] }): Promise<SuccessResponse<LoginResponseDto>> {
    //     var avatarpath = await files.avatar && files.avatar.map(file => file.path)
    //     var shopimagepath = await files.shopimage && files.shopimage.map(file => file.path)
    //     signupDto.avatar = await avatarpath && avatarpath[0];
    //     signupDto.shopimage = await shopimagepath && shopimagepath[0];
    //     const data = await this.authService.customerSignup(signupDto);
    //     return { data };
    // }
    protected async signup(@Req() req: Request, @Body() signupDto: CustomerDto): Promise<SuccessResponse<LoginResponseDto>> {
        const data = await this.authService.customerSignup(signupDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('logout')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async logoutCustomer(@Req() req: Request): Promise<SuccessResponse<any>> {
        const data = await this.authService.logoutCustomer(req);
        return { data };
    };

    @ApiOperation({ summary: 'Get paticular customer details' })
    @ApiUnauthorizedResponse({ description: 'Login required' })
    @ApiBadRequestResponse({ description: 'Invalid customer id' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @Post('getAuthInfo')
    protected async getAuthInfo(@Req() req: Request): Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.getUserInfo(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Get customer address info' })
    @ApiUnauthorizedResponse({ description: 'Login required' })
    @ApiBadRequestResponse({ description: 'Invalid customer id' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @Post('getAddress')
    protected async getCustomerAddress(@Req() req: Request): Promise<SuccessResponse<LoginResponseDto>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.getCustomerAddress(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Address Update' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Survey' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('updateAddress')
    @HttpCode(200)
    protected async updateCustomerAddress(@Req() req: Request, @Body() addressDto: AddressDTO): Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.updateAddress(addressDto, authInfo._id);
        return { data };
    };
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
        ], {
        storage: diskStorage({
            // destination: UploadFilesHelper.destinationPath,
            // filename: UploadFilesHelper.customFileName,


            destination:UploadFilesHelper.s3DestinationPath,
            filename: UploadFilesHelper.customFileName,
        })
    },))
    protected async kycDocUpdate(@Req() req: Request, @Body() kycInfoDto: CustomerKycInfoDTO, @UploadedFiles() files: { aadharimage?: Express.Multer.File[], gstinimage?: Express.Multer.File[] , panimage?: Express.Multer.File[] , otherimage?: Express.Multer.File[], aadharBackImage?: Express.Multer.File[] , passbookImage?: Express.Multer.File[] } ): Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        // var aadharimagepath = await files.aadharimage && files.aadharimage.map(file => (file.path))
        // var aadharbackimagepath = await files.aadharBackImage && files.aadharBackImage.map(file => (file.path))
        // var gstinimagepath = await files.gstinimage && files.gstinimage.map(file => (file.path))
        // var panimagepath = await files.panimage && files.panimage.map(file => (file.path))
        // var otherimagepath = await files.otherimage && files.otherimage.map(file => (file.path))
        // var passbookImagepath = await files.passbookImage && files.passbookImage.map(file => (file.path))

        var aadharimagepath = await files.aadharimage && await imageName(req,files.aadharimage)
        var aadharbackimagepath = await files.aadharBackImage && await imageName(req,files.aadharBackImage)
        var gstinimagepath = await files.gstinimage && await imageName(req,files.gstinimage)
        var panimagepath = await files.panimage && await imageName(req,files.panimage)
        var otherimagepath = await files.otherimage && await imageName(req,files.otherimage)
        var passbookImagepath = await files.passbookImage && await imageName(req,files.passbookImage)


        // var imagepath =  await imageName(req,files.image);
        kycInfoDto.aadharFrontImage = await aadharimagepath && aadharimagepath[0];
        kycInfoDto.aadharBackImage = await aadharbackimagepath && aadharbackimagepath[0];
        kycInfoDto.panImage = await panimagepath && panimagepath[0];
        kycInfoDto.gstinImage = await gstinimagepath && gstinimagepath[0];
        kycInfoDto.otherFrontImage = await otherimagepath && otherimagepath[0];
        kycInfoDto.passbookImage = await passbookImagepath && passbookImagepath[0];
        const data = await this.authService.updateKycInfo(kycInfoDto, authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Get paticular customer details' })
    @ApiUnauthorizedResponse({ description: 'Login required' })
    @ApiBadRequestResponse({ description: 'Invalid customer id' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @Post('getKycInfo')
    protected async getCustomerKycInfo(@Req() req: Request) : Promise<SuccessResponse<LoginResponseDto>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.getCustomerKycInfo(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Survey Update' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Survey' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('surveyDataUpdate')
    @HttpCode(200)
    protected async SurveyDataUpdate(@Req() req: Request, @Body() surveyDataDto: CustomerSurveyDataDTO): Promise<SuccessResponse<any>> {
        const data = await this.authService.surveyUpdate(req, surveyDataDto);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Bank Info Update' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Survey' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('updatebankInfo')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'image', maxCount: 1 },
        ], {
        storage: diskStorage({
            // destination: UploadFilesHelper.destinationPath,
            // filename: UploadFilesHelper.customFileName,

            destination:UploadFilesHelper.s3DestinationPath,
            filename: UploadFilesHelper.customFileName,
        })
    },))
    protected async UpdatebankInfo(@Req() req: Request, @Body() bankInfoDto: BankInfoDTO , @UploadedFiles() files: { image?: Express.Multer.File[]}): Promise<SuccessResponse<any>> {
        // var imagepath = await files.image && files.image.map(file => file.path)
        // bankInfoDto.image =  await imagepath && imagepath[0];
        var imagepath =  await files.image && await imageName(req,files.image);
        bankInfoDto.image = imagepath[0]
        const data = await this.authService.updateBankInfo(req, bankInfoDto);
        return { data };
    };

    @ApiOperation({ summary: 'Get paticular customer details' })
    @ApiUnauthorizedResponse({ description: 'Login required' })
    @ApiBadRequestResponse({ description: 'Invalid customer id' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @Post('getBankInfo')
    protected async getBankInfo(@Req() req: Request) : Promise<SuccessResponse<LoginResponseDto>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.getCustomerBankInfo(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Personal Info Update' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Survey' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('updatePersonalInfo')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'shopimage', maxCount: 1 },
        { name: 'aadharimage', maxCount: 1 },
        { name: 'aadharBackImage', maxCount: 1 },
        { name: 'gstinimage', maxCount: 1 },
        { name: 'panimage', maxCount: 1 },
        { name: 'otherimage', maxCount: 1 },
        { name: 'passbookImage', maxCount: 1 },
         {name : 'upiImage', maxCount: 1}
    ], {
        storage: diskStorage({
            // destination: UploadFilesHelper.destinationPath,
            // filename: UploadFilesHelper.customFileName,
            destination:UploadFilesHelper.s3DestinationPath,
            filename: UploadFilesHelper.customFileName,
        })
    },))
    protected async updatePersonalInfo(@Req() req: Request, @Body() personalDetailsDto: CustomerPersonalDetailsDto, @UploadedFiles() files: { avatar?: Express.Multer.File[], shopimage?: Express.Multer.File[], aadharimage?: Express.Multer.File[], gstinimage?: Express.Multer.File[] , panimage?: Express.Multer.File[] , otherimage?: Express.Multer.File[], aadharBackImage?: Express.Multer.File[] , passbookImage?: Express.Multer.File[],upiImage?:Express.Multer.File  } ): Promise<SuccessResponse<any>> {
       
        // var avatarpath = await files.avatar && files.avatar.map(file => (file.path))
        // var shopimagepath = await files.shopimage && files.shopimage.map(file => (file.path))
        // var aadharimagepath = await files.aadharimage && files.aadharimage.map(file => (file.path))
        // var aadharbackimagepath = await files.aadharBackImage && files.aadharBackImage.map(file => (file.path))
        // var gstinimagepath = await files.gstinimage && files.gstinimage.map(file => (file.path))
        // var panimagepath = await files.panimage && files.panimage.map(file => (file.path))
        // var otherimagepath = await files.otherimage && files.otherimage.map(file => (file.path))
        // var passbookImagepath = await files.passbookImage && files.passbookImage.map(file => (file.path))

        var avatarpath = await files.avatar && await imageName(req,files.avatar)
        var shopimagepath = await files.shopimage && await imageName(req,files.shopimage)
        var aadharimagepath = await files.aadharimage && await imageName(req,files.aadharimage)
        var aadharbackimagepath = await files.aadharBackImage && await imageName(req,files.aadharBackImage)
        var gstinimagepath = await files.gstinimage && await imageName(req,files.gstinimage)
        var panimagepath = await files.panimage && await imageName(req,files.panimage)
        var otherimagepath = await files.otherimage && await imageName(req,files.otherimage)
        var passbookImagepath = await files.passbookImage && await imageName(req,files.passbookImage)
        var upiImagepath = await files.upiImage && await imageName(req,files.upiImage)

        personalDetailsDto.aadharFrontImage = await aadharimagepath && aadharimagepath[0];
        personalDetailsDto.aadharBackImage = await aadharbackimagepath && aadharbackimagepath[0];
        personalDetailsDto.panImage = await panimagepath && panimagepath[0];
        personalDetailsDto.gstinImage = await gstinimagepath && gstinimagepath[0];
        personalDetailsDto.otherFrontImage = await otherimagepath && otherimagepath[0];
        personalDetailsDto.passbookImage = await passbookImagepath && passbookImagepath[0];
        personalDetailsDto.avatar = await avatarpath && avatarpath[0];
        personalDetailsDto.shopimage = await shopimagepath && shopimagepath[0];
        personalDetailsDto.upiImage = await upiImagepath && upiImagepath[0];
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.updateCustomerPersonalInfo(personalDetailsDto, authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Get paticular customer details' })
    @ApiUnauthorizedResponse({ description: 'Login required' })
    @ApiBadRequestResponse({ description: 'Invalid customer id' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @Post('getCustomerInfo')
    protected async getCustomerInfo(@Req() req: Request) : Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.getCustomerInfo(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Image Upload' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Survey' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('profileImageUpload')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
    ], {
        storage: diskStorage({
            // destination: UploadFilesHelper.destinationPath,
            // filename: UploadFilesHelper.customFileName,

            destination:UploadFilesHelper.s3DestinationPath,
            filename: UploadFilesHelper.customFileName,
        })
    },))
    protected async profileImageUpload(@Req() req: Request, @Body() customerAvatarDto: CustomerAvatarDto, @UploadedFiles() files: { avatar?: Express.Multer.File[]}): Promise<SuccessResponse<LoginResponseDto>> {
        // var avatarpath = await files.avatar && files.avatar.map(file => (file.path).replace("dist/", ""))
        // var avatarpath = await files.avatar && files.avatar.map(file => (file.path))
        var avatarpath = await files.avatar && await imageName(req,files.avatar)
        customerAvatarDto.avatar = await avatarpath && avatarpath[0];
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.updateProfileImage(customerAvatarDto, authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Loyalty Dashboard' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Loyalty Dashboard' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('dashboard')
    @HttpCode(200)
    protected async loyaltyDashboardInfo(@Req() req: Request): Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        const data = await this.authService.loyaltyDashboard(authInfo._id);
        return { data };
    };

    @ApiOperation({ summary: 'Customer Upi Info Update' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid Survey' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('updateUpiInfo')
    @HttpCode(200)
    protected async updateUpiInfo(@Req() req: Request, @Body() upiInfoDto: UpiInfoDTO ): Promise<SuccessResponse<any>> {
        const authInfo = await getCustomerAuthInfo(req.headers)
        upiInfoDto.customerid = authInfo._id
        const data = await this.authService.updateUpiInfo(upiInfoDto);
        return { data };
    };
}
