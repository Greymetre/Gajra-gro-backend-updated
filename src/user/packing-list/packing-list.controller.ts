import { Body, Controller, Post, Get, Query, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { PackingListService } from '../../services/packing-list.service';
import { ImportPackingListMultipleDto } from '../../dto/packing-list.dto';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('User Packing List')
@Controller('user/packing-list')
@UseInterceptors(TransformInterceptor)
export class PackingListController {
    constructor(private readonly packingListService: PackingListService) { }

    @ApiOperation({ summary: 'Import Packing List Data' })
    @Post('import')
    async importPackingList(@Body() importDto: ImportPackingListMultipleDto) {
        return this.packingListService.importPackingList(importDto);
    }

    @ApiOperation({ summary: 'Get all packing lists' })
    @Get()
    async getAllPackingLists(
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 100
    ) {
        return this.packingListService.getAllPackingLists(search, page, limit);
    }

    @ApiOperation({ summary: 'Export all packing lists' })
    @Get('export-all')
    async exportAll() {
        return this.packingListService.exportAll();
    }
}
