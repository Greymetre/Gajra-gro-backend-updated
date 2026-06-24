import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, HttpCode, UsePipes, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequestDto, MobileRequestDto, EmailRequestDto, changePasswordRequestDto, passwordRequestDto, CheckUserEmailExistDto, CheckUserMobileExistDto } from './dto/auth.request.dto';
import { TransformInterceptor } from '../../common/dispatchers/transform.interceptor';
import { SuccessResponse } from '../../common/interfaces/response';
import { LoginResponseDto } from './dto/auth.response.dto';
import { ValidationPipe } from '../../validations/validation.pipe';
import { Request } from 'express';
@Controller('user/auth')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @ApiOperation({ summary: 'Login into the system' })
    @ApiResponse({ status: 200, description: 'Success', type: LoginResponseDto })
    @ApiBadRequestResponse({ status: 200, description: 'Invalid id or password' })
    @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @Post('login')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async loginUser(@Body() loginDto: LoginRequestDto): Promise<SuccessResponse<LoginResponseDto>> {
        const data = await this.authService.userLogin(loginDto);
        return { data };
    };
    @ApiOperation({ summary: 'Check Mobile No Exist' })
    @ApiResponse({ status: 200, description: 'Mobile number is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Mobile number is not available' })
    @Post('mobileExists')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async checkMobileExists(@Body() mobileDto: CheckUserMobileExistDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.checkMobileExists(mobileDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('emailExists')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async checkEmailExists(@Body() emailDto: CheckUserEmailExistDto): Promise<SuccessResponse<any>> {
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
    @Post('newOtpRequest')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async newOtpRequest(@Body() emailDto: EmailRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.newOtpRequest(emailDto);
        return { data };
    };

    @ApiOperation({ summary: 'Check Email No Exist' })
    @ApiResponse({ status: 200, description: 'Email is available', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Email is not available' })
    @Post('resendOtpRequest')
    @HttpCode(200)
    @UsePipes(ValidationPipe)
    protected async resendOtpRequest(@Body() emailDto: EmailRequestDto): Promise<SuccessResponse<any>> {
        const data = await this.authService.resendOtpRequest(emailDto);
        return { data };
    };
}
