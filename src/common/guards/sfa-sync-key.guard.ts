import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Guards the APIs the SFA backend calls. SFA sends the shared secret in the X-Sync-Key header
 * (SFA_SYNC_KEY here = GAJRA_GRO_SYNC_KEY on SFA). While SFA_SYNC_KEY is not set the APIs stay open,
 * the same as the SFA side, so both servers can be deployed before the key is switched on.
 */
@Injectable()
export class SfaSyncKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const key = process.env.SFA_SYNC_KEY || '';
    if (!key) {
      return true;
    }
    const sent = String(context.switchToHttp().getRequest().headers['x-sync-key'] || '');
    const a = Buffer.from(sent);
    const b = Buffer.from(key);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }
}
