import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { PayrollAnalyticsService } from '../services/payroll-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

@Controller('payroll-analytics')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PayrollAnalyticsController {
    constructor(private readonly analyticsService: PayrollAnalyticsService) { }

    @Get('story')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async getPayrollStory(@Query('entityId') entityId?: string) {
        return await this.analyticsService.getPayrollStory(entityId);
    }

    @Get('anomalies/ghosts/:runId')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async detectGhostEmployees(@Param('runId') runId: string) {
        return await this.analyticsService.detectGhostEmployees(runId);
    }

    @Get('forecast')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF)
    async getForecast() {
        return await this.analyticsService.getForecast();
    }
}
