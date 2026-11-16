import axios from 'axios';

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
