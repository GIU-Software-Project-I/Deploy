import { Prop, Schema, SchemaFactory, } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

import { EmployeeProfile as Employee } from '../../../employee/models/employee/employee-profile.schema';
import { payrollRuns } from './payrollRuns.schema';
import { PaySlipPaymentStatus } from '../enums/payroll-execution-enum';

@Schema()
export class PayItem {
    @Prop({ required: true })
    name: string;
    @Prop({ required: true })
    amount: number;
}
const PayItemSchema = SchemaFactory.createForClass(PayItem);




export type PayslipDocument = HydratedDocument<paySlip>

@Schema()
class Earnings {
    @Prop()
    baseSalary: number;

    @Prop({ type: [PayItemSchema] })
    allowances: PayItem[]

    @Prop({ type: [PayItemSchema] })
    bonuses?: PayItem[]

    @Prop({ type: [PayItemSchema] })
    benefits?: PayItem[]

    @Prop({ type: [PayItemSchema] })
    refunds?: PayItem[]

}
const EarningsSchema = SchemaFactory.createForClass(Earnings)


@Schema()
class Deductions {
    @Prop({ type: [PayItemSchema] })
    taxes: PayItem[]

    @Prop({ type: [PayItemSchema] })
    insurances?: PayItem[]

    @Prop({ type: PayItemSchema })
    penalties?: PayItem

}
const DeductionsSchema = SchemaFactory.createForClass(Deductions)


@Schema({ timestamps: true })
export class paySlip {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
    employeeId: mongoose.Types.ObjectId;
    @Prop({ type: mongoose.Schema.ObjectId, ref: payrollRuns.name, required: true })
    payrollRunId: mongoose.Types.ObjectId;
    @Prop({ type: EarningsSchema })
    earningsDetails: Earnings;
    @Prop({ type: DeductionsSchema })
    deductionsDetails: Deductions;
    @Prop({ required: true })
    totalGrossSalary: number
    @Prop({ required: true })
    totaDeductions?: number
    @Prop({ required: true })
    netPay: number
    @Prop({ type: String, enum: PaySlipPaymentStatus, default: PaySlipPaymentStatus.PENDING })
    paymentStatus: PaySlipPaymentStatus// in case we have bank integration in future
}

export const paySlipSchema = SchemaFactory.createForClass(paySlip);