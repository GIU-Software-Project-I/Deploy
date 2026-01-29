import { Controller, Get, Post, Body, HttpCode, HttpStatus, Req, Res, UseGuards, InternalServerErrorException, BadRequestException, Patch, Param, HttpException, } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public-decorator';
import { Roles } from '../../common/decorators/roles-decorator';
import { AuthService } from '../services/authentication-service';

import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { RegisterEmployeeDto } from "../dto/register-employee-dto";
import { RegisterCandidateDto } from "../dto/register-candidate-dto";
import { LoginDto } from "../dto/login";
import { ApiTags, ApiBody, ApiOperation, ApiConsumes } from '@nestjs/swagger';


@Controller('auth')
@ApiTags('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    // @UseGuards(AuthenticationGuard, AuthorizationGuard)
    //@Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @Post('register-employee')
    @ApiConsumes('application/json')
    @ApiBody({ type: RegisterEmployeeDto })
    @ApiOperation({ summary: 'Register a new employee (admin only)' })
    async registerEmployee(@Body() dto: RegisterEmployeeDto) {
        try {
            return await this.auth.registerEmployee(dto);
        } catch (e) {
            console.error('Employee registration error:', e);
            // Re-throw HTTP exceptions (BadRequest, Unauthorized, Forbidden, etc.)
            if (e instanceof HttpException) {
                throw e;
            }
            throw new InternalServerErrorException(e.message || 'Something went wrong during employee registration.');
        }
    }

    @Public()
    @Post('register-candidate')
    @ApiConsumes('application/json')
    @ApiBody({ type: RegisterCandidateDto })
    @ApiOperation({ summary: 'Register a new candidate (public)' })
    async registerCandidate(@Body() dto: RegisterCandidateDto) {
        try {
            return await this.auth.registerCandidate(dto);
        } catch (e) {
            console.error('Candidate registration error:', e);
            if (e instanceof BadRequestException) {
                throw e;
            }
            throw new InternalServerErrorException(e.message || 'Something went wrong during candidate registration.');
        }
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    @ApiConsumes('application/json')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Login (returns cookie-set JWT)' })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        console.log('[AuthController] Login attempt for:', dto.email);
        try {
            const result = await this.auth.login(dto.email, dto.password);
            console.log('[AuthController] Login successful for:', dto.email, 'UserType:', result.userType);

            // Use res.cookie for better cross-origin support (3000 -> 9000)
            res.cookie('access_token', result.access_token, {
                httpOnly: true,
                secure: true, // Required for SameSite=None, usually works on localhost over HTTP in modern browsers
                sameSite: 'none', // Required for cross-origin fetch if localhost:3000 is seen as cross-site to :9000
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            console.log('[AuthController] Cookie set via res.cookie (SameSite=None, Secure=true)');

            const responseBody: any = {
                message: 'Login successful',
                user: result.user,
                userType: result.userType,
                expiresIn: '7d'
            };

            if (process.env.EXPOSE_JWT_ON_LOGIN === 'true' || process.env.NODE_ENV !== 'production') {
                responseBody.access_token = result.access_token;
            }
            return responseBody;
        } catch (e: any) {
            console.error('[AuthController] Login error:', e.message);
            throw e;
        }
    }

    @UseGuards(AuthenticationGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies?.access_token;
        console.log('[AuthController] Logout request, token present:', !!token);
        if (token) {
            await this.auth.logout(token);
        }
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        });
        return { message: 'Logout successful' };
    }

    @UseGuards(AuthenticationGuard)
    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    async getMe(@Req() req: any) {
        console.log('[AuthController] getMe called for user:', req.user?.sub);
        return this.auth.getMe(req.user);
    }
}

