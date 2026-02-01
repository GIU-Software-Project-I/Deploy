import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { ROLES_KEY } from "../decorators/roles-decorator";


@Injectable()
export class AuthorizationGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        console.log(`[AuthorizationGuard] Checking roles for ${req.method} ${req.url}`);

        if (!requiredRoles) {
            console.log('[AuthorizationGuard] No roles required, allowing access');
            return true;
        }

        const user = req.user as { roles?: SystemRole[] } | undefined;
        console.log('[AuthorizationGuard] User roles:', user?.roles);
        console.log('[AuthorizationGuard] Required roles:', requiredRoles);

        const hasAccess = !!user?.roles && user.roles.some(role => requiredRoles.includes(role));

        if (hasAccess) {
            console.log('[AuthorizationGuard] Access granted');
        } else {
            console.warn('[AuthorizationGuard] Access denied: User does not have any of the required roles');
        }

        return hasAccess;
    }
}
