/**
 * User status options
 */
export enum USER_STATUS {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

/**
 * User roles
 */
export enum USER_ROLES {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Gender 
 */
export enum GENDER {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHERS = 'OTHERS'
}

export enum VerifiedTo {
  gstinVerified = 'verified.gstinVerified',
  panVerified = 'verified.panVerified',
  aadharVerified = 'verified.aadharVerified',
  otherVerified = 'verified.otherVerified',
  addressVerified = 'verified.addressVerified',
  userVerified = 'verified.userVerified',
  bankVerified = 'verified.bankVerified',
  upiVerified ='verified.upiVerified'
}

export enum KycDocuments {
  gstin = 'gstin',
  pan = 'pan',
  aadhar = 'aadhar',
  other = 'other',
  bank = 'bank',
  upi = 'upi'
}

export enum STATUS {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLIED_WITH_DELAY = 'COMPLIED_WITH_DELAY',
  OVERDUE = 'OVERDUE'
}

export enum JWTCLIENTSECRET {
  JWT_DOMAIN = 'dev-jc6z8bvz.us.auth0.com',
  JWT_CLIENT_ID = 'lfhXgbNDNfFiwv4sz6a9rlbJqQyLQmOO',
  JWT_SECRET = 'p0tqtyABB81gnQbJgISa3Vj_T7_8t7-qwijLkf1t-tz1Maeyjn3KDh_w3yLsg6ZP',
  JWT_TOKEN_EXPIRESIN = '2 days',
}

export enum QRSCANSETTING {
  CHECKLOYALTYSCHEME = "Yes",
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLIED_WITH_DELAY = 'COMPLIED_WITH_DELAY',
  OVERDUE = 'OVERDUE'
}

export enum PERMISSIONSETTING {
  DASHBOARD_READ = 'dashboard.read',
  //User Module Permission
  USERS_CREATE = 'users.create',
  USERS_READ = 'users.read',
  USERS_UPDATE = "users.update",
  USERS_DELETE = "users.delete",
  USERS_EXPORT = "users.export",
  USERS_IMPORT = "users.import",
  //Customer Module Permission
  CUSTOMERS_CREATE = 'customers.create',
  CUSTOMERS_READ = 'customers.read',
  CUSTOMERS_UPDATE = "customers.update",
  CUSTOMERS_DELETE = "customers.delete",
  CUSTOMERS_EXPORT = "customers.export",
  CUSTOMERS_IMPORT = "customers.import",
  CUSTOMERS_KYC_APPROVER = "customers.kycapprover",
  CUSTOMERS_PAYEE_APPROVER = "customers.payeeapprover",
  //Transaction Module Permission
  TRANSACTIONS_CREATE = 'transactions.create',
  TRANSACTIONS_READ = 'transactions.read',
  TRANSACTIONS_UPDATE = "transactions.update",
  TRANSACTIONS_DELETE = "transactions.delete",
  TRANSACTIONS_EXPORT = "transactions.export",
  TRANSACTIONS_IMPORT = "transactions.import",
  //Redemption Module Permission
  REDEMPTIONS_CREATE = 'redemptions.create',
  REDEMPTIONS_READ = 'redemptions.read',
  REDEMPTIONS_UPDATE = "redemptions.update",
  REDEMPTIONS_DELETE = "redemptions.delete",
  REDEMPTIONS_APPROVER = "redemptions.approver",
  REDEMPTIONS_TRANSFER = "redemptions.transfer",
  REDEMPTIONS_EXPORT = "redemptions.export",
  REDEMPTIONS_IMPORT = "redemptions.import",
  //LoyaltyScheme Module Permission
  LOYALTYSCHEME_CREATE = 'loyaltyscheme.create',
  LOYALTYSCHEME_READ = 'loyaltyscheme.read',
  LOYALTYSCHEME_UPDATE = "loyaltyscheme.update",
  LOYALTYSCHEME_DELETE = "loyaltyscheme.delete",
  LOYALTYSCHEME_EXPORT = "loyaltyscheme.export",
  LOYALTYSCHEME_IMPORT = "loyaltyscheme.import",
  //Gift Module Permission
  GIFT_CREATE = 'gift.create',
  GIFT_READ = 'gift.read',
  GIFT_UPDATE = "gift.update",
  GIFT_DELETE = "gift.delete",
  GIFT_EXPORT = "gift.export",
  GIFT_IMPORT = "gift.import",
  //Coupons Module Permission
  COUPONS_CREATE = 'coupons.create',
  COUPONS_READ = 'coupons.read',
  COUPONS_UPDATE = "coupons.update",
  COUPONS_DELETE = "coupons.delete",
  COUPONS_DELHI = "coupons.delhi",
  COUPONS_DEWAS = "coupons.dewas",
  COUPONS_KSHIPRA = "coupons.kshipra",
  COUPONS_EXPORT = "coupons.export",
  COUPONS_IMPORT = "coupons.import",
  COUPONS_SEARCH = "coupons.search",
  COUPONS_DAMAGE_SCAN = "coupons.damageentryscan",
  //Products Module Permission
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_READ = 'products.read',
  PRODUCTS_UPDATE = "products.update",
  PRODUCTS_DELETE = "products.delete",
  PRODUCTS_EXPORT = "products.export",
  PRODUCTS_IMPORT = "products.import",
  //Category Module Permission
  CATEGORY_CREATE = 'category.create',
  CATEGORY_READ = 'category.read',
  CATEGORY_UPDATE = "category.update",
  CATEGORY_DELETE = "category.delete",
  CATEGORY_EXPORT = "category.export",
  CATEGORY_IMPORT = "category.import",
  //Subcategory Module Permission
  SUBCATEGORY_CREATE = 'subcategory.create',
  SUBCATEGORY_READ = 'subcategory.read',
  SUBCATEGORY_UPDATE = "subcategory.update",
  SUBCATEGORY_DELETE = "subcategory.delete",
  SUBCATEGORY_EXPORT = "subcategory.export",
  SUBCATEGORY_IMPORT = "subcategory.import",
  //Reports Module Permission
  REPORT_READ = 'reports.read',
  REPORT_OTPREQUEST = 'reports.otprequest',
  //Setting Module Permission
  SETTING_READ = 'setting.read',
  SETTING_UPDATE = 'setting.update',
  PERMISSION_READ = 'permission.read',
  PERMISSION_UPDATE = 'permission.update',
  //Address Module Permission
  ADDRESS_CREATE = 'address.create',
  ADDRESS_READ = 'address.read',
  ADDRESS_UPDATE = "address.update",
  ADDRESS_DELETE = "address.delete",
  ADDRESS_EXPORT = "address.export",
  ADDRESS_IMPORT = "address.import",
  //Call Summary Module Permission
  CALLSUMMARY_CREATE = 'callsummary.create',
  CALLSUMMARY_READ = 'callsummary.read',
  CALLSUMMARY_UPDATE = "callsummary.update",
  CALLSUMMARY_DELETE = "callsummary.delete",
  CALLSUMMARY_EXPORT = "callsummary.export",
  CALLSUMMARY_IMPORT = "callsummary.import",
}


