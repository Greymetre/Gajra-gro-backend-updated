import { Model } from 'mongoose';
import { CASHFREE_STATEMENT_TYPE, CashfreeStatementDocument } from '../../entities/cashfree-statement.entity';
import { fetchCashfreeAccountStatement, getCashfreeTransferStatus } from './cashfree-payout';

// Turns Cashfree API / webhook data into rows of the Cashfree Report, keyed by the same column
// names as the dashboard Excel exports, so API rows and imported rows are the same records.

const UNIQUE_COLUMN: Record<CASHFREE_STATEMENT_TYPE, string> = {
    [CASHFREE_STATEMENT_TYPE.ACCOUNT]: 'Event Id',
    [CASHFREE_STATEMENT_TYPE.TRANSFER]: 'Transfer Id',
};

const text = (value: any): string => (value === undefined || value === null ? '' : String(value).trim().slice(0, 500));
// Cashfree API times are IST but come as "2026-11-16 18:23:40" or "2026-11-16T18:23:40Z" (a "Z" that is not UTC).
// Stored as "2026-11-16T18:23:40", the dashboard export's format.
export const isoTime = (value: any): string => text(value)
    .replace(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?Z?$/, '$1T$2');

// Cashfree dashboard export names -> the API's event names
const PARTICULARS: Record<string, string> = {
    'CASHFREE TRANSFER': 'PAYOUT_TRANSFER',
    'PAYOUT TRANSFER': 'PAYOUT_TRANSFER',
    'ACCOUNT CREDIT': 'BANK_TRANSFER',
    'BANK TRANSFER': 'BANK_TRANSFER',
};
const normaliseParticulars = (value: string): string => {
    const key = value.toUpperCase().replace(/_/g, ' ').trim();
    return PARTICULARS[key] || key.replace(/\s+/g, '_');
};

// "Debit/Credit" is DEBIT or CREDIT, "Particulars" PAYOUT_TRANSFER / BANK_TRANSFER, as in the dashboard export.
// The API puts DEBIT/CREDIT in `event` and the category ("CASHFREE TRANSFER", "ACCOUNT CREDIT") in `eventType`;
// whichever field holds DEBIT/CREDIT is used, so a swap on Cashfree's side cannot mix them up again.
export const splitDebitCredit = (first: any, second: any): { debitCredit: string; particulars: string } => {
    const a = text(first).toUpperCase();
    const b = text(second).toUpperCase();
    const isDc = (v: string) => v === 'DEBIT' || v === 'CREDIT';
    if (isDc(a)) return { debitCredit: a, particulars: normaliseParticulars(b) };
    if (isDc(b)) return { debitCredit: b, particulars: normaliseParticulars(a) };
    const particulars = normaliseParticulars(a || b);
    return { debitCredit: particulars === 'BANK_TRANSFER' ? 'CREDIT' : particulars === 'PAYOUT_TRANSFER' ? 'DEBIT' : a, particulars };
};

// Account statement API row -> "Account Statement" Excel columns
export const accountRowFromApi = (row: any): Record<string, string> => {
    // The Excel "Event Id" is the Cashfree transfer reference, which the remarks carry as "RefId-<id>/transfer".
    // Use whichever of the API ids matches it; otherwise eventId.
    const refId = text(row?.remarks).match(/RefId-(\d+)/)?.[1];
    const ids = [text(row?.eventId), text(row?.id)];
    const eventId = refId && ids.includes(refId) ? refId : ids[0] || ids[1];
    const { debitCredit, particulars } = splitDebitCredit(row?.event, row?.eventType);
    return {
        'Added On': isoTime(row?.txTime),
        'Debit/Credit': debitCredit,
        'Particulars': particulars,
        'Charged Amount (INR)': text(row?.amount),
        'Amount (INR)': text(row?.transactionAmount),
        'Service Charge (INR)': text(row?.serviceCharge),
        'Service Tax (INR)': text(row?.serviceTax),
        'Closing Balance (INR)': text(row?.closingBalance),
        'Event Id': eventId,
        'Remarks': text(row?.remarks),
    };
};

// Transfer status API / payout webhook V2 transfer -> "Transfer" Excel columns
// (Acknowledged, Added by, Remarks and Extended UTR are not in the API and stay as imported)
export const transferRowFromApi = (data: any, beneficiaryName?: string): Record<string, string> => {
    const instrument = data?.beneficiary_details?.beneficiary_instrument_details || {};
    return {
        'Added On': isoTime(data?.added_on),
        'Amount': text(data?.transfer_amount),
        'Transfer Id': text(data?.transfer_id),
        'Reference Id': text(data?.cf_transfer_id),
        'Status': text(data?.status).toUpperCase(),
        'Beneficiary Name': text(beneficiaryName),
        'Beneficiary Id': text(data?.beneficiary_details?.beneficiary_id),
        'Bank Account': text(instrument.bank_account_number),
        'IFSC': text(instrument.bank_ifsc),
        'VPA': text(instrument.vpa),
        'Bank Reference No': text(data?.transfer_utr),
        'Service Charge': text(data?.transfer_service_charge),
        'Service Tax': text(data?.transfer_service_tax),
        'Mode': text(data?.transfer_mode).toUpperCase(),
        'Status Code': text(data?.status_code),
        'Payment Instrument ID': text(data?.fundsource_id),
        'Last checked at': isoTime(data?.updated_on),
        'Status Description': text(data?.status_description),
    };
};

// Upserts rows, setting only the columns that have a value, so data from an Excel import is not blanked
export const upsertStatementRows = async (
    model: Model<CashfreeStatementDocument>,
    statementType: CASHFREE_STATEMENT_TYPE,
    rows: Record<string, string>[],
    source: string,
): Promise<{ inserted: number; updated: number; skipped: number }> => {
    const uniqueColumn = UNIQUE_COLUMN[statementType];
    const operations = [];
    let skipped = 0;
    for (const row of rows) {
        const uniqueId = row[uniqueColumn];
        if (!uniqueId) {
            skipped++;
            continue;
        }
        const set: Record<string, any> = { statementType, uniqueId, importedBy: source };
        Object.entries(row).forEach(([column, value]) => {
            if (value !== '') set[`row.${column}`] = value;
        });
        operations.push({ updateOne: { filter: { statementType, uniqueId }, update: { $set: set }, upsert: true } });
    }
    if (!operations.length) return { inserted: 0, updated: 0, skipped };
    const result = await model.bulkWrite(operations, { ordered: false });
    return { inserted: result.upsertedCount, updated: result.matchedCount, skipped };
};

export interface AccountSyncState {
    status: 'idle' | 'running' | 'success' | 'failed';
    source: string;
    days: number;
    daysDone: number;
    fetched: number;
    inserted: number;
    updated: number;
    error: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    // second phase of a manual sync: transfer details of CRM payouts (gives mechanic name / mobile to the report)
    phase: 'account' | 'transfers' | '';
    transfersTotal: number;
    transfersChecked: number;
    transfersSaved: number;
}

// One account statement sync at a time in this process (manual button and the 30-minute cron share it)
const emptySyncState = (): AccountSyncState => ({
    status: 'idle', source: '', days: 0, daysDone: 0, fetched: 0, inserted: 0, updated: 0, error: '', startedAt: null, finishedAt: null,
    phase: '', transfersTotal: 0, transfersChecked: 0, transfersSaved: 0,
});
let accountSync: AccountSyncState = emptySyncState();

export const getAccountSyncState = (): AccountSyncState => ({ ...accountSync });

// Pulls the account statement for the last `days` days from Cashfree into the report, one day at a time,
// saving every page as it arrives. Returns false (and does nothing) when a sync is already running.
// With redemptionModel it then also fetches the Cashfree transfer of every CRM payout in the range that the
// report does not have yet (the account statement alone has no beneficiary, so names come from transfers).
export const syncAccountStatementFromCashfree = async (
    model: Model<CashfreeStatementDocument>,
    days: number,
    source: string,
    redemptionModel?: Model<any>,
): Promise<boolean> => {
    if (accountSync.status === 'running') return false;
    accountSync = { ...emptySyncState(), status: 'running', source, days, startedAt: new Date(), phase: 'account' };
    const dayMs = 24 * 60 * 60 * 1000;
    const end = Date.now();
    try {
        // oldest day first, so an interrupted run has filled a continuous range
        for (let day = days; day > 0; day--) {
            const from = new Date(end - day * dayMs);
            const to = new Date(Math.min(end, from.getTime() + dayMs));
            await fetchCashfreeAccountStatement(from, to, async (apiRows) => {
                const result = await upsertStatementRows(model, CASHFREE_STATEMENT_TYPE.ACCOUNT, apiRows.map(accountRowFromApi), source);
                accountSync.fetched += apiRows.length;
                accountSync.inserted += result.inserted;
                accountSync.updated += result.updated;
            });
            accountSync.daysDone++;
        }
        if (redemptionModel) {
            accountSync.phase = 'transfers';
            await backfillTransfers(model, redemptionModel, new Date(end - (days + 1) * dayMs), source);
        }
        accountSync.status = 'success';
    } catch (error) {
        accountSync.status = 'failed';
        accountSync.error = String(error?.message || 'Unknown error').slice(0, 300);
    } finally {
        accountSync.finishedAt = new Date();
    }
    return true;
};

// Cashfree transfer details for CRM payouts since `since` that the report has no transfer row for
const backfillTransfers = async (
    model: Model<CashfreeStatementDocument>,
    redemptionModel: Model<any>,
    since: Date,
    source: string,
) => {
    const known = new Set(
        (await model.find(
            { statementType: CASHFREE_STATEMENT_TYPE.TRANSFER, 'row.Reference Id': { $exists: true, $ne: '' } },
            { uniqueId: 1 },
        ).lean()).map((doc: any) => String(doc.uniqueId)),
    );
    const candidates = (await redemptionModel.find(
        {
            type: { $in: ['UPI', 'IMPS', 'Neft', 'NEFT'] },
            status: { $in: ['Success', 'UNDER PROCESS', 'Rejected'] },
            $or: [{ createdAt: { $gte: since } }, { statusUpdatedAt: { $gte: since } }],
        },
        { payment: 1 },
    ).lean()).filter((redemption: any) => !known.has(String(redemption._id)));

    accountSync.transfersTotal = candidates.length;
    let errorsInARow = 0;
    for (const redemption of candidates as any[]) {
        try {
            const transfer = await getCashfreeTransferStatus(String(redemption._id));
            // not found: paid outside Cashfree or rejected before it reached Cashfree
            if (transfer.found) {
                const name = redemption?.payment?.holderName || redemption?.payment?.upiHolderName || '';
                await upsertStatementRows(model, CASHFREE_STATEMENT_TYPE.TRANSFER, [transferRowFromApi(transfer.raw, name)], source);
                accountSync.transfersSaved++;
            }
            errorsInARow = 0;
        } catch (error) {
            if (++errorsInARow >= 10) throw new Error(`Transfer details stopped after repeated Cashfree errors: ${error?.message}`);
        }
        accountSync.transfersChecked++;
    }
};

// When rows last came from the Cashfree API (cron or manual), from the stored rows themselves
export const getLastApiSyncAt = async (model: Model<CashfreeStatementDocument>): Promise<Date | null> => {
    const latest: any = await model
        .findOne({ statementType: CASHFREE_STATEMENT_TYPE.ACCOUNT, importedBy: /^cashfree-api/ }, { updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .lean();
    return latest?.updatedAt || null;
};
