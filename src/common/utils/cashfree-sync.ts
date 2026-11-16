import { Model } from 'mongoose';
import { CASHFREE_STATEMENT_TYPE, CashfreeStatementDocument } from '../../entities/cashfree-statement.entity';
import { fetchCashfreeAccountStatement } from './cashfree-payout';

// Turns Cashfree API / webhook data into rows of the Cashfree Report, keyed by the same column
// names as the dashboard Excel exports, so API rows and imported rows are the same records.

const UNIQUE_COLUMN: Record<CASHFREE_STATEMENT_TYPE, string> = {
    [CASHFREE_STATEMENT_TYPE.ACCOUNT]: 'Event Id',
    [CASHFREE_STATEMENT_TYPE.TRANSFER]: 'Transfer Id',
};

const text = (value: any): string => (value === undefined || value === null ? '' : String(value).trim().slice(0, 500));

// Account statement API row -> "Account Statement" Excel columns
export const accountRowFromApi = (row: any): Record<string, string> => {
    // The Excel "Event Id" is the Cashfree transfer reference, which the remarks carry as "RefId-<id>/transfer".
    // Use whichever of the API ids matches it; otherwise eventId.
    const refId = text(row?.remarks).match(/RefId-(\d+)/)?.[1];
    const ids = [text(row?.eventId), text(row?.id)];
    const eventId = refId && ids.includes(refId) ? refId : ids[0] || ids[1];
    return {
        'Added On': text(row?.txTime),
        'Debit/Credit': text(row?.eventType).toUpperCase(),
        'Particulars': text(row?.event),
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
        'Added On': text(data?.added_on),
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
        'Last checked at': text(data?.updated_on),
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

// Pulls the account statement for the last `days` days from Cashfree into the report
export const syncAccountStatementFromCashfree = async (
    model: Model<CashfreeStatementDocument>,
    days: number,
    source: string,
) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const apiRows = await fetchCashfreeAccountStatement(start, end);
    const result = await upsertStatementRows(model, CASHFREE_STATEMENT_TYPE.ACCOUNT, apiRows.map(accountRowFromApi), source);
    return { fetched: apiRows.length, ...result };
};
