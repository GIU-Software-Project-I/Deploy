import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PayrollExecutionModule } from './modules/payroll/payroll-execution/payroll-execution.module';
import { PayrollConfigurationModule } from './modules/payroll/payroll-configuration/payroll-configuration.module';
import { TimeManagementModule } from "./modules/time-management/time-management.module";
import { PayrollTrackingModule } from './modules/payroll/payroll-tracking/payroll-tracking.module';
import { OrganizationStructureModule } from "./modules/organization-structure/organization-structure.module";
import { EmployeeModule } from "./modules/employee/employee.module";
import { PerformanceModule } from "./modules/performance/performance.module";
import { LeavesModule } from "./modules/leaves/leaves.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AuthorizationGuard } from "./modules/common/guards/authorization-guard";
import { AuthenticationGuard } from "./modules/common/guards/authentication-guard";
import { BackupModule } from "./modules/data-backup/backup-module";
import { RecruitmentModule } from "./modules/recruitment/recruitment.module";
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('MONGODB_URI'),
            }),
            inject: [ConfigService],
        }),
        AuthModule,
        BackupModule,
        EmployeeModule,
        OrganizationStructureModule,
        PerformanceModule,
        TimeManagementModule,
        RecruitmentModule,
        LeavesModule,
        PayrollConfigurationModule,
        PayrollExecutionModule,
        PayrollTrackingModule,
        AnalyticsModule,
    ],
    providers: [
        // { provide: APP_GUARD, useClass: AuthenticationGuard },
        // { provide: APP_GUARD, useClass: AuthorizationGuard },
    ],
})
export class AppModule { }