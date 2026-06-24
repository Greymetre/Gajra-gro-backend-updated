import { ObjectId } from 'mongoose';
import { USER_ROLES, USER_STATUS } from '../constants';

export interface JwtTokenInterface {
  readonly _id?: any;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phoneCode?: string;
  readonly mobile?: number;
  readonly email?: string;
  readonly userType?: string;
  readonly categories?: any
}

export interface CustomerJwtTokenInterface {
  readonly _id?: any;
  readonly firmName?: string;
  readonly contactPerson?: string;
  readonly mobile?: number;
  readonly email?: string;
  readonly customerType? : string ;
}


