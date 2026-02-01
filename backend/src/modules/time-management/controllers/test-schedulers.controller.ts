import { Controller, Post } from '@nestjs/common';
import { ShiftExpiryScheduler } from '../services/ShiftExpiryScheduler';
import { TimeExceptionEscalationScheduler } from '../services/time-exception-escalation.scheduler';
import { AttendanceDailySummaryScheduler } from '../services/attendance-daily-summary.scheduler';

@Controller('test-schedulers')
export class TestSchedulersController {
    constructor(
        private shiftExpiryScheduler: ShiftExpiryScheduler,
        private timeExceptionScheduler: TimeExceptionEscalationScheduler,
        private attendanceSummaryScheduler: AttendanceDailySummaryScheduler,
    ) {}

    @Post('shift-expiry')
    async testShiftExpiry() {
        // Trigger immediately
        await this.shiftExpiryScheduler.runDaily();
        return {
            status: 'ShiftExpiryScheduler triggered',
            message: 'Check logs for detailed output',
        };
    }

    @Post('time-exception-escalation')
    async testTimeExceptionEscalation() {
        // Trigger immediately
        await this.timeExceptionScheduler.escalateUnreviewedTimeExceptions();
        return {
            status: 'TimeExceptionEscalationScheduler triggered',
            message: 'Check logs for detailed output',
        };
    }

    @Post('attendance-daily-summary')
    async testAttendanceDailySummary() {
        // Trigger immediately
        await this.attendanceSummaryScheduler.sendDailyAttendanceSummary();
        return {
            status: 'AttendanceDailySummaryScheduler triggered',
            message: 'Check logs for detailed output',
        };
    }
}

