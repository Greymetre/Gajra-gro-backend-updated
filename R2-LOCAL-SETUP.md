# Local R2 setup

Backend `.env` is configured for `mongodb://127.0.0.1:27017/gajragear`, port 4000 and disabled scheduled jobs. Existing application/JWT settings are preserved. Frontend `../gajra_next_live/.env.local` points to this local API and the working R2 development URL. Both env files are git-ignored.

## Fill these three backend values

- `R2_ENDPOINT`: exact HTTPS S3 API endpoint from the Cloudflare R2 dashboard, normally `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
- `R2_ACCESS_KEY_ID`: R2 S3 API Access Key ID.
- `R2_SECRET_ACCESS_KEY`: corresponding Secret Access Key.

Use Object Read & Write credentials scoped to `gajragro2-fieldkonnect-io`. Do not use an AWS access key, a Cloudflare REST bearer token, or the public image domain as the endpoint. `R2_BUCKET_NAME` and `R2_REGION=auto` are already set. Missing settings produce an explicit error at upload time; the API can start without credentials for read-only local testing. There is no AWS credential/bucket fallback.

Restart the backend after editing `.env` (Nest watch does not reliably restart for env-only changes). Restart Next after editing `.env.local`.

```sh
# In gajra_nest_live
npm run start:dev
# In gajra_next_live; port 3000 is occupied by Docker on this machine
npm run dev -- --port 3001
```

Open `http://localhost:3001/login/`. Use a user/password from the local DB. Frontend requests now use the signed-in token, including normal JSON requests; the old hardcoded token was removed.

## Storage behavior

Existing `uploaded/...` keys are preserved. The shared S3-named client now talks only to R2. Images go through Multer local staging, then R2, then the relative key is saved in MongoDB. Upload responses no longer depend on the provider's Location URL. JPEG/PNG validation is unchanged. Failed batches clean their temporary files and attempt to delete newly uploaded keys from that failed batch; storage errors are preserved.

Product, customer, KYC/bank, user, category, subcategory, gift, scheme, sales, helpdesk, damage QR and banner uploads use the shared R2 client. Attendance and customer-visit files now populate their existing image fields using R2. Legacy coupon/beat-schedule/shopping-cart interceptors previously accepted files without consuming/persisting them; these now parse multipart text and reject unused file fields instead of silently writing orphan files. CRM JSON import remains an in-memory import, not a persisted attachment.

Banner array handling and product save awaiting/response envelope were fixed. Missing bank image no longer causes an undefined array lookup. The unused version-deletion maintenance helper is disabled because it is not an R2 object-deletion workflow. The diagnostic `/api/s3/list-buckets` endpoint is authenticated and checks only the configured bucket.

## Validation completed

- Backend build and frontend TypeScript/build/static export passed.
- Seven focused tests cover R2 config, stable keys, invalid types, partial-upload rollback, temporary cleanup and controller construction.
- Local MongoDB read-only checks succeeded (1,362 products and 101 users at verification time).
- Local product-list API returned `isError: false`; frontend `/products/` returned HTTP 200.
- One image key read from the local DB returned HTTP 200/image-jpeg through the configured R2 development URL.

## After credentials are filled

1. Restart backend; log in locally.
2. Create a test product with a unique name/product number and JPEG/PNG; verify the response, local MongoDB path and the same key in R2.
3. View it in the product list/detail page, then replace its image.
4. Check banner upload and representative customer/KYC fields with non-sensitive test images. The KYC/bank flow can call the existing payment-beneficiary integration, so do not use a customer with a live beneficiary for upload smoke tests.
5. Check a rejected file and confirm a useful error and no leftover staging file.

Real R2 upload has NOT been performed: credentials are intentionally blank. No existing DB records or S3/R2 objects were modified during verification. Local DB changes are local, but R2 uploads target the migrated shared bucket.

## Limits of this change

This is an upload/read migration, not a new private-document authorization system or full object lifecycle redesign. Existing public bucket access remains as configured by the owner. Existing record deletion/replacement generally retains old cloud objects (legacy local-file deletion is not converted into destructive deletion of migrated/shared objects). Database-save failures after a successful upload, and failures across separately uploaded KYC field groups, can still leave orphan objects; failed-batch rollback only covers the current helper invocation. Multer/DTO rejection before the helper runs may still need separate staging cleanup. Server-local legacy files are not copied by this code change.

Keep the R2 development URL enabled for local viewing until custom-domain HTTPS works. Then change frontend `IMAGE_URL` to `https://gajragro.fieldkonnect.io/` and restart/rebuild. Viewer/canvas fetches may require R2 CORS for the frontend origin. Do not deploy the local API URLs or disabled cron setting to production unintentionally.
