import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UsePipes, ValidationPipe , Req, UseInterceptors} from '@nestjs/common';
import { AttendancesService } from '../../services/attendances.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateAttendanceDto, StatusAttendanceDto, UpdateAttendanceDto } from './dto/request-attendance.dto';
import { GetAttendanceInfoDto } from './dto/response-attendance.dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';

@Controller('user/attendances')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseInterceptors(TransformInterceptor)
export class AttendancesController {
  constructor(private readonly attendanceService: AttendancesService) {}
  @ApiOperation({ summary: 'Add Attendance' })
  @ApiResponse({ status: 200, description: 'Success', type: GetAttendanceInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid id or password' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'pinchin', maxCount: 1 },
    { name: 'punchout', maxCount: 1 },
  ],{
    storage: diskStorage({
      destination: './uploaded/pinchin'
    }),
  }))
  protected async createAttendance(@Req() req: Request, @Body() createAttendanceDto: CreateAttendanceDto): Promise<any> {
    return this.attendanceService.createAttendance(createAttendanceDto, req);
  };

  @ApiOperation({ summary: 'Get all attendances' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: GetAttendanceInfoDto })
  @ApiBadRequestResponse({ description: 'Invalid attendance id' })
  @Get()
  protected async getAllAttendance(): Promise<SuccessResponse<any>> {
    const data = await this.attendanceService.getAllAttendance();
    return { data };
  };

  @ApiOperation({ summary: 'Get paticular attendance details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid attendance id' })
  @ApiResponse({ status: 200, description: 'Success', type: GetAttendanceInfoDto })
  @Get('/:id')
  protected async getAttendanceInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.attendanceService.getAttendanceInfo(id);
    return { data };
  };

  @Patch(':id')
  protected async updateAttendanceInfo(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return await this.attendanceService.updateAttendanceInfo(id, updateAttendanceDto);
  };

  @Delete(':id')
  protected async deleteAttendance(@Param('id') id: string) {
    return await this.attendanceService.deleteAttendance(id);
  };

  @Post('updateStatus')
  protected async updateStatus(@Body() statusAttendanceDto: StatusAttendanceDto) {
    return await this.attendanceService.updateStatus(statusAttendanceDto);
  };
}
