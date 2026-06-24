import { Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcrypt';

export interface Sha512Interface {
  salt: string;
  passwordHash: string;
}

const saltRounds = 10;

/**
 * Password helper
 */
@Injectable()
export class PasswordHelper {
  /**
   * Compare password
   */
  public compare(plainPassword: string, passwordhash: string): Promise<boolean | object> {
    return new Promise((resolve, reject) => {
      compare(plainPassword, passwordhash, (err, res) => {
        if (res) {
          resolve(true);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Generate salt and hash from plain password
   */
  public async generateHash(userPassword: string): Promise<string> {
    const salt = (await this.generateSalt()) as string;
    /** Gives us salt of length 16 */
    return await this.generatehash(userPassword, salt);
  }

  /**
   * Generate salt
   * @param round
   */
  public generateSalt(round: number = saltRounds): Promise<string | null> {
    return new Promise((resolve) => {
      genSalt(round, (err, salt) => {
        if (!err) {
          resolve(salt);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Generate hash
   */
  public generatehash(plainPassword: string, salt: string): Promise<string | null> {
    return new Promise((resolve) => {
      hash(plainPassword, salt, (err, value) => {
        if (err) {
          resolve(null);
        }
        if (value) {
          resolve(value);
        }
        resolve(null);
      });
    });
  }
}
