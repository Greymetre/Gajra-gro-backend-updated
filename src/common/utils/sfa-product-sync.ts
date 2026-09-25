import axios from 'axios';
import { Model } from 'mongoose';
import { ProductDocument } from '../../entities/product.entity';
import { sfaRequestConfig, sfaUrl } from './sfa-client';

const BATCH_SIZE = 200;

export interface SfaProductPrice {
  productNo: string;
  mrp?: number;
  price?: number;
}

const toPrice = (value: any): number | undefined => {
  const n = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(n) ? undefined : n;
};

// Price row sent to SFA from a product: its primary productDetail, else the first one
export const productPriceRow = (product: any): SfaProductPrice | null => {
  const productNo = (product?.productNo || '').toString().trim();
  const details = Array.isArray(product?.productDetail) ? product.productDetail : [];
  const detail = details.find((d: any) => d?.isPrimary === true) || details[0];
  if (!productNo || !detail) {
    return null;
  }
  const row: SfaProductPrice = { productNo, mrp: toPrice(detail.mrp), price: toPrice(detail.price) };
  return row.mrp === undefined && row.price === undefined ? null : row;
};

/**
 * Sends product prices to SFA, which updates the product with the same GG No (productNo).
 * A failure is only logged: the price is already saved in Gajra Gro and the daily full sync sends it again.
 */
export async function pushProductPricesToSfa(rows: Array<SfaProductPrice | null>) {
  const products = rows.filter(Boolean);
  let updated = 0;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    try {
      const response = await axios.post(
        sfaUrl('productPricesFromGajraGro'),
        { products: products.slice(i, i + BATCH_SIZE) },
        sfaRequestConfig(),
      );
      updated += Number(response?.data?.updated || 0) + Number(response?.data?.created || 0);
    } catch (error) {
      console.error('SFA product price sync failed', error?.response?.data || error?.message);
    }
  }
  return { sent: products.length, updated };
}

let running = false;

// Sends every product's price to SFA. Run daily, so prices missed by a failed push are corrected.
export async function syncAllProductPricesToSfa(productModel: Model<ProductDocument>) {
  if (running) {
    return { skipped: true };
  }
  running = true;
  try {
    const products = await productModel
      .find({ productNo: { $nin: [null, ''] } })
      .select('productNo productDetail')
      .lean()
      .exec();
    return await pushProductPricesToSfa(products.map(productPriceRow));
  } finally {
    running = false;
  }
}
