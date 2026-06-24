import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
    const user = context.switchToHttp().getRequest().user;

    if (!requiredPermission || !user) {
      return false;
    }
    return user.permissions.includes(requiredPermission);
  }
}