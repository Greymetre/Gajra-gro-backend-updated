import { Body, Controller, ForbiddenException, Get, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TransformInterceptor } from 'src/common/dispatchers/transform.interceptor';
import { PERMISSIONSETTING } from 'src/common/constants';
import { getAuthUserInfo } from 'src/common/utils/jwt.helper';
import { CashfreeStatementService } from '../../services/cashfree-statement.service';
import { SettingService } from '../../services/setting.service';

@ApiTags('User Cashfree Statement')
@Controller('user/cashfree-statement')
@UseInterceptors(TransformInterceptor)
export class CashfreeStatementController {
    constructor(
        private readonly cashfreeStatementService: CashfreeStatementService,
        private readonly settingService: SettingService,
    ) { }

    // Same role lookup the CRM sidebar uses, so only roles granted reports.cashfree can call these APIs
    private async assertCashfreeAccess(req: Request) {
        const authInfo = await getAuthUserInfo(req.headers);
        const permissions = authInfo?.userType ? await this.settingService.getPermissions(authInfo.userType) : null;
        if (!Array.isArray(permissions?.canAccess) || !permissions.canAccess.includes(PERMISSIONSETTING.REPORT_CASHFREE)) {
            throw new ForbiddenException({ isError: true, message: 'You do not have access to the Cashfree report' });
        }
    }

    @ApiOperation({ summary: 'Import Cashfree account / transfer statement rows' })
    @Post('import')
    async importStatement(@Req() req: Request, @Body() body: { statementType?: string; data?: Record<string, any>[] }) {
        await this.assertCashfreeAccess(req);
        return this.cashfreeStatementService.importStatement(body);
    }

    @ApiOperation({ summary: 'List Cashfree statement rows by type' })
    @Get()
    async getStatements(
        @Req() req: Request,
        @Query('statementType') statementType: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('search') search?: string,
    ) {
        await this.assertCashfreeAccess(req);
        return this.cashfreeStatementService.getStatements(statementType, page, limit, search);
    }

    @ApiOperation({ summary: 'Export all Cashfree statement rows by type' })
    @Get('export-all')
    async exportAll(@Req() req: Request, @Query('statementType') statementType: string) {
        await this.assertCashfreeAccess(req);
        return this.cashfreeStatementService.exportAll(statementType);
    }
}
