import { Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { CASHFREE_STATEMENT_TYPE, CashfreeStatement, CashfreeStatementDocument } from '../../entities/cashfree-statement.entity';
import { Redemption, RedemptionDocument } from '../../entities/redemption.entity';
import { verifyCashfreeWebhookSignature } from '../../common/utils/cashfree-payout';
import { transferRowFromApi, upsertStatementRows } from '../../common/utils/cashfree-sync';

// Cashfree Payouts webhook V2. Public (Cashfree calls it), so only requests with a valid signature are used.
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
            // Nothing from an unverified request is used. It still gets 200: Cashfree's "Test & Add" check
            // and repeated failures (which disable the webhook) both need a 2xx. The log line says why.
            this.logger.warn(
                `Cashfree webhook ignored, signature not verified: signature header ${signature ? 'present' : 'missing'}, ` +
                `timestamp header ${timestamp ? 'present' : 'missing'}, content-type ${req.headers['content-type'] || '-'}, ` +
                `raw body ${rawBody ? `${rawBody.length} bytes` : 'missing'}, event ${this.eventType(rawBody)}, ` +
                // header names only (never values), in case Cashfree names the signature headers differently
                `x-headers [${Object.keys(req.headers || {}).filter((name) => name.startsWith('x-')).join(', ')}]`,
            );
            return { received: false };
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
        this.logger.log(`Cashfree webhook verified: ${this.eventType(rawBody)}`);
        return { received: true };
    }

    // event type only, for logs (no customer data)
    private eventType(rawBody?: Buffer): string {
        try {
            return String(JSON.parse(rawBody?.toString('utf8') || '{}')?.type || '-').slice(0, 50);
        } catch {
            return 'unparsable';
        }
    }
}
