/**
 * Gajra Gears SFA (Laravel) sync endpoints.
 * SFA_SYNC_KEY must match GAJRA_GRO_SYNC_KEY on the SFA server; it is sent in the X-Sync-Key header.
 */
const DEFAULT_SFA_API_URL = 'https://gajragears.fieldkonnect.io/api';

export const sfaUrl = (path: string): string =>
  `${(process.env.SFA_API_URL || DEFAULT_SFA_API_URL).replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export const sfaRequestConfig = (params?: Record<string, any>) => ({
  params,
  timeout: 60000,
  headers: process.env.SFA_SYNC_KEY ? { 'X-Sync-Key': process.env.SFA_SYNC_KEY } : {},
});

// Customers use the plain 10 digit mobile on both systems
export const normalizeMobile = (mobile: any): string => {
  const digits = String(mobile ?? '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};
