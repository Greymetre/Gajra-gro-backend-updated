import { Body, Controller, ForbiddenException, Get, Header, Post, Query, Req, UseInterceptors } from '@nestjs/common';
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

    // Only CRM roles granted reports.cashfree may call these APIs. The role is matched exactly
    // (case-insensitive), not by regex, so a similarly named role cannot pick up the permission.
    private async assertCashfreeAccess(req: Request): Promise<string> {
        const authInfo = await getAuthUserInfo(req.headers);
        const userType = String(authInfo?.userType || '').trim().toLowerCase();
        if (!authInfo?._id || !userType) {
            throw new ForbiddenException({ isError: true, message: 'You do not have access to the Cashfree report' });
        }
        const roles = await this.settingService.getRolePermissions().catch(() => []);
        const role = Array.isArray(roles)
            ? roles.find((item) => String(item?.role || '').trim().toLowerCase() === userType)
            : null;
        if (!Array.isArray(role?.canAccess) || !role.canAccess.includes(PERMISSIONSETTING.REPORT_CASHFREE)) {
            throw new ForbiddenException({ isError: true, message: 'You do not have access to the Cashfree report' });
        }
        return String(authInfo._id);
    }

    @ApiOperation({ summary: 'Import Cashfree account / transfer statement rows' })
    @Post('import')
    @Header('Cache-Control', 'no-store')
    async importStatement(@Req() req: Request, @Body() body: { statementType?: string; data?: Record<string, any>[] }) {
        const userId = await this.assertCashfreeAccess(req);
        return this.cashfreeStatementService.importStatement(body, userId);
    }

    @ApiOperation({ summary: 'List Cashfree statement rows by type' })
    @Get()
    @Header('Cache-Control', 'no-store')
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

    @ApiOperation({ summary: 'Data for the Cashfree reconciliation workbook' })
    @Get('export-report')
    @Header('Cache-Control', 'no-store')
    async exportReport(@Req() req: Request) {
        const userId = await this.assertCashfreeAccess(req);
        return this.cashfreeStatementService.getExportReport(userId);
    }
}
