import { Controller, Headers, HttpCode, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { CASHFREE_STATEMENT_TYPE, CashfreeStatement, CashfreeStatementDocument } from '../../entities/cashfree-statement.entity';
import { Redemption, RedemptionDocument } from '../../entities/redemption.entity';
import { verifyCashfreeWebhookSignature } from '../../common/utils/cashfree-payout';
import { transferRowFromApi, upsertStatementRows } from '../../common/utils/cashfree-sync';

// Cashfree Payouts webhook V2. Public (Cashfree calls it), so every request must carry a valid signature.
// It only records transfers in the Cashfree Report; redemption status is settled by the status cron,
// which asks Cashfree directly and so never trusts a webhook body for money decisions.
@ApiExcludeController()
@Controller('cashfree/payout-webhook')
export class CashfreeWebhookController {
    private readonly logger = new Logger(CashfreeWebhookController.name);

    constructor(
        @InjectModel(CashfreeStatement.name) private readonly cashfreeStatementModel: Model<CashfreeStatementDocument>,
        @InjectModel(Redemption.name) private readonly redemptionModel: Model<RedemptionDocument>,
    ) { }

    @Post()
    @HttpCode(200)
    async receive(
        @Req() req: Request,
        @Headers('x-webhook-signature') signature: string,
        @Headers('x-webhook-timestamp') timestamp: string,
    ) {
        const rawBody: Buffer | undefined = (req as any).rawBody;
        if (!verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) {
            throw new UnauthorizedException('Invalid signature');
        }

        // Answer 200 even if saving fails: Cashfree disables the webhook after repeated failures,
        // and the status cron / account statement sync fill any gap.
        try {
            const event = JSON.parse(rawBody.toString('utf8'));
            const type = String(event?.type || '');
            const data = event?.data;
            if (type.startsWith('TRANSFER_') && data?.transfer_id) {
                let name = '';
                if (Types.ObjectId.isValid(String(data.transfer_id))) {
                    const redemption: any = await this.redemptionModel.findById(data.transfer_id, { payment: 1 }).lean();
                    name = redemption?.payment?.holderName || redemption?.payment?.upiHolderName || '';
                }
                await upsertStatementRows(this.cashfreeStatementModel, CASHFREE_STATEMENT_TYPE.TRANSFER, [transferRowFromApi(data, name)], 'cashfree-webhook');
            }
        } catch (error) {
            this.logger.error(`Cashfree webhook processing failed: ${error?.message}`);
        }
        return { received: true };
    }
}
