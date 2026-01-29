import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public-decorator';
import { AuthService } from '../../auth/services/authentication-service';


@Injectable()
export class AuthenticationGuard extends NestAuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector,
        private readonly auth: AuthService,
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        console.log(`[AuthenticationGuard] Checking path: ${req.method} ${req.url}`);

        // Allow @Public routes
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass(),]);

        if (isPublic) {
            console.log('[AuthenticationGuard] Route is public, allowing access');
            return true;
        }

        try {
            // allow passport to extract token from cookie or Authorization header
            await super.canActivate(context);
            console.log('[AuthenticationGuard] Passport validation successful');
        } catch (err) {
            console.error('[AuthenticationGuard] Passport validation failed:', err.message);
            throw err;
        }

        const user = (req as any).user;

        if (!user) {
            console.error('[AuthenticationGuard] No user found on request after passport validation');
            throw new UnauthorizedException('Unauthorized');
        }
        console.log('[AuthenticationGuard] User found on request:', { sub: user.sub, roles: user.roles, userType: user.userType });

        // Extract and validate token from cookie or Authorization header
        const tokenFromCookie = this.extractTokenFromCookie(req);
        const tokenFromHeader = this.extractTokenFromHeader(req);
        const token = tokenFromCookie ?? tokenFromHeader;

        console.log('[AuthenticationGuard] Token sources:', {
            hasCookie: !!tokenFromCookie,
            hasHeader: !!tokenFromHeader
        });

        if (!token) {
            console.error('[AuthenticationGuard] Missing authentication token');
            throw new UnauthorizedException('Missing authentication token');
        }

        // Check if token has been blacklisted (logout)
        const isBlacklisted = await this.auth.isAccessTokenBlacklisted(token);
        if (isBlacklisted) {
            console.error('[AuthenticationGuard] Token is blacklisted');
            throw new UnauthorizedException('Session expired. Please sign in again.');
        }

        console.log('[AuthenticationGuard] Access granted');
        return true;
    }

    private extractTokenFromCookie(request: Request): string | undefined {
        console.log('[AuthenticationGuard] All cookies:', request.cookies);
        return (request as any).cookies?.access_token;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const auth = (request as any).headers?.authorization as string | undefined;
        if (!auth) return undefined;
        const parts = auth.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1];
        return undefined;
    }
}
