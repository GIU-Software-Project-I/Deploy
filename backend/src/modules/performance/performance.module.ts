import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {AppraisalTemplate, AppraisalTemplateSchema} from "./models/appraisal-template.schema";
import {AppraisalCycle, AppraisalCycleSchema} from "./models/appraisal-cycle.schema";
import {AppraisalAssignment, AppraisalAssignmentSchema} from "./models/appraisal-assignment.schema";
import {AppraisalRecord, AppraisalRecordSchema} from "./models/appraisal-record.schema";
import {AppraisalDispute, AppraisalDisputeSchema} from "./models/appraisal-dispute.schema";
import {PerformanceController} from "./controller/performance.controller";
import {PerformanceService} from "./service/performance.service";
import { IntegrationModule } from '../integration/Integration.module';
import {AuthModule} from "../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppraisalTemplate.name, schema: AppraisalTemplateSchema },
      { name: AppraisalCycle.name, schema: AppraisalCycleSchema },
      { name: AppraisalAssignment.name, schema: AppraisalAssignmentSchema },
      { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
      { name: AppraisalDispute.name, schema: AppraisalDisputeSchema },
    ]),
      AuthModule,
    IntegrationModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
