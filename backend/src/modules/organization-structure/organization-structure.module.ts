import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Department, DepartmentSchema } from './models/department.schema';
import {Position,PositionSchema} from './models/position.schema'
import { PositionAssignmentSchema,PositionAssignment } from './models/position-assignment.schema';
import { StructureApproval,StructureApprovalSchema } from './models/structure-approval.schema';
import { StructureChangeLog,StructureChangeLogSchema } from './models/structure-change-log.schema';
import { StructureChangeRequest,StructureChangeRequestSchema } from './models/structure-change-request.schema';
import {OrganizationStructureController} from "./controller/organization-structure.controller";
import {OrganizationStructureService} from "./service/organization-structure.service";
import { IntegrationModule } from '../integration/Integration.module';
import {AuthModule} from "../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: PositionAssignment.name, schema: PositionAssignmentSchema },
      { name: StructureApproval.name, schema: StructureApprovalSchema },
      { name: StructureChangeLog.name, schema: StructureChangeLogSchema },
      {name: StructureChangeRequest.name,schema: StructureChangeRequestSchema,},
    ]),
      AuthModule,
    IntegrationModule,
  ],
    controllers: [OrganizationStructureController],
  providers: [OrganizationStructureService],
  exports: [OrganizationStructureService],
})
export class OrganizationStructureModule {}
