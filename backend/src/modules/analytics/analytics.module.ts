import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee/models/employee/employee-profile.schema';
import { EmployeeProfileAuditLog, EmployeeProfileAuditLogSchema } from '../employee/models/audit/employee-profile-audit-log.schema';
import { AppraisalRecord, AppraisalRecordSchema } from '../performance/models/appraisal-record.schema';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { Position, PositionSchema } from '../organization-structure/models/position.schema';
import { PositionAssignment, PositionAssignmentSchema } from '../organization-structure/models/position-assignment.schema';
import { payrollRuns, payrollRunsSchema } from '../payroll/payroll-execution/models/payrollRuns.schema';
import { paySlip, paySlipSchema } from '../payroll/payroll-execution/models/payslip.schema';
import { AttendanceRecord, AttendanceRecordSchema } from '../time-management/models/attendance-record.schema';
import { AnalyticsController } from "./controllers/analytics.controller";
import { AnalyticsService } from "./services/analytics.service";
import { ProfileAnalyticsService } from "./services/profile-analytics.service";
import { PayrollAnalyticsService } from "./services/payroll-analytics.service";
import { WorkforceAnalyticsService } from "./services/workforce-analytics.service";
import { OrgStructureAnalyticsService } from "./services/org-structure-analytics.service";
import { EmployeeAnalyticsController } from "./controllers/employee-analytics.controller";
import { PayrollAnalyticsController } from "./controllers/payroll-analytics.controller";
import { WorkforceAnalyticsController } from "./controllers/workforce-analytics.controller";
import { OrgStructureAnalyticsController } from "./controllers/org-structure-analytics.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
            { name: EmployeeProfileAuditLog.name, schema: EmployeeProfileAuditLogSchema },
            { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Position.name, schema: PositionSchema },
            { name: PositionAssignment.name, schema: PositionAssignmentSchema },
            { name: payrollRuns.name, schema: payrollRunsSchema },
            { name: paySlip.name, schema: paySlipSchema },
            { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
        ]),
        AuthModule,
    ],
    controllers: [
        AnalyticsController, 
        EmployeeAnalyticsController, 
        PayrollAnalyticsController, 
        WorkforceAnalyticsController,
        OrgStructureAnalyticsController,
    ],
    providers: [
        AnalyticsService, 
        ProfileAnalyticsService, 
        PayrollAnalyticsService, 
        WorkforceAnalyticsService,
        OrgStructureAnalyticsService,
    ],
    exports: [
        AnalyticsService, 
        ProfileAnalyticsService, 
        PayrollAnalyticsService, 
        WorkforceAnalyticsService,
        OrgStructureAnalyticsService,
    ],
})
export class AnalyticsModule { }
