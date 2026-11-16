import axios from 'axios';
import * as crypto from 'crypto';

// Single place for every Cashfree Payout call used by redemptions.
// Nothing here logs request/response bodies or axios errors: those carry bank details
// and, for axios errors, the request headers with the Cashfree client secret.

const CASHFREE_PAYOUT_URL = 'https://api.cashfree.com/payout';
const CASHFREE_PAYOUT_V1_URL = 'https://payout-api.cashfree.com/payout/v1';
const REQUEST_TIMEOUT_MS = 30000;

const v2Headers = () => ({
    'x-client-id': process.env.CASHFREE_CLIENT_ID,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
    'X-Api-Version': '2024-01-01',
    'Content-Type': 'application/json',
});

// Short, log-safe description of a failed Cashfree call
export const cashfreeErrorMessage = (error: any): string => {
    const data = error?.response?.data;
    const message = data?.message || data?.status_description || error?.message || 'Unknown error';
    return error?.response?.status ? `${error.response.status} ${message}` : String(message);
};

export type CashfreeTransferMode = 'banktransfer' | 'upi';

export interface InitiateTransferResult {
    // true: Cashfree has the transfer (new, or already created earlier with this id)
    accepted: boolean;
    // true: Cashfree definitely refused it, so the redemption can be rejected and points returned.
    // false with accepted=false means the outcome is unknown (timeout / network) and the status cron decides.
    rejected: boolean;
    message: string;
}

export const initiateCashfreeTransfer = async (
    transferId: string,
    beneficiaryId: string,
    amount: number,
    mode: CashfreeTransferMode,
): Promise<InitiateTransferResult> => {
    try {
        await axios.post(
            `${CASHFREE_PAYOUT_URL}/transfers`,
            {
                transfer_id: transferId,
                transfer_amount: amount,
                transfer_mode: mode,
                beneficiary_details: { beneficiary_id: beneficiaryId },
            },
            { headers: v2Headers(), timeout: REQUEST_TIMEOUT_MS },
        );
        return { accepted: true, rejected: false, message: '' };
    } catch (error) {
        const status = error?.response?.status;
        // Same transfer_id sent twice: Cashfree already has it, the status cron will track it
        if (status === 409) return { accepted: true, rejected: false, message: '' };
        if (status && status >= 400 && status < 500) {
            return { accepted: false, rejected: true, message: cashfreeErrorMessage(error) };
        }
        return { accepted: false, rejected: false, message: cashfreeErrorMessage(error) };
    }
};

export interface TransferStatusResult {
    found: boolean;
    status: string;
    utr: string;
    addedOn: string;
    fundSource: string;
    description: string;
    // full Cashfree transfer object, used to keep the Cashfree transfer report in sync
    raw?: any;
}

// Returns found=false only when Cashfree says the transfer does not exist; throws on other errors
export const getCashfreeTransferStatus = async (transferId: string): Promise<TransferStatusResult> => {
    try {
        const { data } = await axios.get(`${CASHFREE_PAYOUT_URL}/transfers`, {
            params: { transfer_id: transferId },
            headers: v2Headers(),
            timeout: REQUEST_TIMEOUT_MS,
        });
        return {
            found: true,
            status: String(data?.status || '').toUpperCase(),
            utr: data?.transfer_utr || '',
            addedOn: data?.added_on || '',
            fundSource: data?.fundsource_id || '',
            description: data?.status_description || data?.message || '',
            raw: data,
        };
    } catch (error) {
        if (error?.response?.status === 404) {
            return { found: false, status: '', utr: '', addedOn: '', fundSource: '', description: '' };
        }
        throw new Error(`Cashfree status check failed: ${cashfreeErrorMessage(error)}`);
    }
};

const getV1Token = async (): Promise<string | null> => {
    try {
        const { data } = await axios.post(`${CASHFREE_PAYOUT_V1_URL}/authorize`, {}, {
            headers: {
                'x-client-id': process.env.CASHFREE_CLIENT_ID,
                'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                'X-Api-Version': '2023-08-01',
                'Content-Type': 'application/json',
            },
            timeout: REQUEST_TIMEOUT_MS,
        });
        return data?.status === 'SUCCESS' ? data?.data?.token : null;
    } catch (error) {
        console.error('Cashfree authorize failed:', cashfreeErrorMessage(error));
        return null;
    }
};

export interface BeneficiaryInput {
    beneId: string;
    name: string;
    phone: string;
    bankAccount?: string;
    ifsc?: string;
    vpa?: string;
}

export const addCashfreeBeneficiary = async (beneficiary: BeneficiaryInput): Promise<{ ok: boolean; message: string }> => {
    const token = await getV1Token();
    if (!token) return { ok: false, message: 'Unable to connect to Cashfree. Please try again later.' };
    try {
        const { data } = await axios.post(
            `${CASHFREE_PAYOUT_V1_URL}/addBeneficiary`,
            { ...beneficiary, email: 'user@example.com', address1: 'Default Address' },
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                timeout: REQUEST_TIMEOUT_MS,
            },
        );
        return data?.status === 'SUCCESS'
            ? { ok: true, message: '' }
            : { ok: false, message: data?.message || 'Unable to add beneficiary' };
    } catch (error) {
        return { ok: false, message: error?.response?.data?.message || 'Unable to add beneficiary' };
    }
};

export const deleteCashfreeBeneficiary = async (beneficiaryId: string): Promise<void> => {
    try {
        await axios.delete(`${CASHFREE_PAYOUT_URL}/beneficiary`, {
            params: { beneficiary_id: beneficiaryId },
            headers: v2Headers(),
            timeout: REQUEST_TIMEOUT_MS,
        });
    } catch (error) {
        console.error('Cashfree delete beneficiary failed:', cashfreeErrorMessage(error));
    }
};

// Cashfree takes "yyyy-mm-dd hh:mm:ss" in IST for the account statement range
const istDateTime = (date: Date): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as Record<string, string>);
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`;
};

// All account statement rows (credits and debits of the Payouts account) between start and end, every page
export const fetchCashfreeAccountStatement = async (start: Date, end: Date): Promise<any[]> => {
    const token = await getV1Token();
    if (!token) throw new Error('Unable to authorize with Cashfree');
    const rows: any[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 1000; page++) {
        let data: any;
        try {
            ({ data } = await axios.get(`${CASHFREE_PAYOUT_V1_URL}/accountStatement`, {
                params: { startTime: istDateTime(start), endTime: istDateTime(end), limit: 100, ...(cursor ? { cursor } : {}) },
                headers: { Authorization: `Bearer ${token}` },
                timeout: REQUEST_TIMEOUT_MS,
            }));
        } catch (error) {
            throw new Error(`Cashfree account statement failed: ${cashfreeErrorMessage(error)}`);
        }
        if (data?.status !== 'SUCCESS') {
            throw new Error(`Cashfree account statement failed: ${data?.subCode || ''} ${data?.message || ''}`.trim());
        }
        rows.push(...(Array.isArray(data?.data?.batches) ? data.data.batches : []));
        const next = data?.data?.nextCursor;
        if (!data?.data?.hasNext || !next || next === cursor) break;
        cursor = next;
    }
    return rows;
};

// Payout webhook V2: base64(HMAC-SHA256(timestamp + raw body, client secret)) must equal x-webhook-signature.
// Cashfree signs with the oldest active client secret; if that differs from CASHFREE_CLIENT_SECRET,
// put it in CASHFREE_WEBHOOK_SECRET.
export const verifyCashfreeWebhookSignature = (rawBody: Buffer | undefined, signature: any, timestamp: any): boolean => {
    const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_CLIENT_SECRET;
    if (!rawBody || !signature || !timestamp || !secret) return false;
    const expected = Buffer.from(
        crypto.createHmac('sha256', secret).update(String(timestamp) + rawBody.toString('utf8')).digest('base64'),
    );
    const received = Buffer.from(String(signature));
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};
