import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Candidate, CandidateSchema } from './models/employee/Candidate.Schema';
import { EmployeeProfile, EmployeeProfileSchema } from './models/employee/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from './models/employee/employee-system-role.schema';
import {
  EmployeeQualification,
  EmployeeQualificationSchema,
} from './models/employee/qualification.schema';
import {
  EmployeeProfileChangeRequest,
  EmployeeProfileChangeRequestSchema
} from "./models/employee/ep-change-request.schema";
import {
  EmployeeProfileAuditLog,
  EmployeeProfileAuditLogSchema
} from "./models/audit/employee-profile-audit-log.schema";
import { OrganizationStructureModule } from '../organization-structure/organization-structure.module';
import { EmployeeProfileService } from "./services/employee-profile.service";
import { IntegrationModule } from '../integration/Integration.module';
import { AuthModule } from "../auth/auth.module";
import { EmployeeProfileController } from "./controllers/employee-profile.controller";



@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: EmployeeQualification.name, schema: EmployeeQualificationSchema },
      { name: EmployeeProfileChangeRequest.name, schema: EmployeeProfileChangeRequestSchema },
      { name: EmployeeProfileAuditLog.name, schema: EmployeeProfileAuditLogSchema },
    ]),
    OrganizationStructureModule,
    IntegrationModule,
  ],

  controllers: [EmployeeProfileController],
  providers: [EmployeeProfileService],
  exports: [EmployeeProfileService],
})
export class EmployeeModule { }
