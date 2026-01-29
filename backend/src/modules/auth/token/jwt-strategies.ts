import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from "../../common/payload/jwt-payload";
import { Request } from 'express';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(cfg: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    const cookie = request?.cookies?.access_token;
                    console.log('[JwtStrategy] Extracting token from cookie, found:', !!cookie);
                    return cookie;
                },
                (request: Request) => {
                    const header = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
                    console.log('[JwtStrategy] Extracting token from Auth Header, found:', !!header);
                    return header;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: cfg.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload) {
        console.log('[JwtStrategy] Validating payload:', payload);
        // keep minimal user info in req.user
        return {
            sub: payload.sub,
            email: payload.email,
            roles: payload.roles,
            userType: payload.userType
        };
    }
}
