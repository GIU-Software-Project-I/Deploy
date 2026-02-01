// src/modules/time-management/services/attendance-daily-summary.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';

@Injectable()
export class AttendanceDailySummaryScheduler {
    private readonly logger = new Logger(AttendanceDailySummaryScheduler.name);
    private isRunning = false;

    constructor(
        @InjectModel(NotificationLog.name)
        private readonly notificationModel: Model<NotificationLogDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    /**
     * Runs daily at 2:00 AM
     * Sends notification to HR admins with summary of attendance records created the previous day
     * PUBLIC - can be called manually for testing
     */
    @Cron('0 2 * * *')
    public async sendDailyAttendanceSummary(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('[AttendanceSummary] Scheduler is already running, skipping');
            return;
        }

        this.isRunning = true;
        try {
            this.logger.log('[AttendanceSummary] Starting daily attendance summary job...');

            // Calculate yesterday's date range (00:00:00 to 23:59:59)
            const now = new Date();
            const yesterdayStart = new Date(now);
            yesterdayStart.setDate(now.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);

            const yesterdayEnd = new Date(now);
            yesterdayEnd.setDate(now.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);

            this.logger.log(
                `[AttendanceSummary] Fetching attendance records from ${yesterdayStart.toISOString()} to ${yesterdayEnd.toISOString()}`
            );

            // Fetch attendance records created yesterday
            const attendanceRecords = await this.getAttendanceRecordsForDate(yesterdayStart, yesterdayEnd);

            if (!attendanceRecords || attendanceRecords.length === 0) {
                this.logger.log('[AttendanceSummary] No attendance records found for yesterday, skipping notification');
                return;
            }

            this.logger.log(`[AttendanceSummary] Found ${attendanceRecords.length} attendance records for yesterday`);

            // Get HR admin users
            const hrAdmins = await this.findHRAdminUsers();
            if (!hrAdmins || hrAdmins.length === 0) {
                this.logger.warn('[AttendanceSummary] No HR Admin users found for notification');
                return;
            }

            this.logger.log(`[AttendanceSummary] Found ${hrAdmins.length} HR Admin(s) to notify`);
            hrAdmins.forEach((admin, idx) => {
                this.logger.log(`[AttendanceSummary]   HR Admin ${idx + 1}: ${admin.employeeProfileId}`);
            });

            // Build summary statistics
            const summary = this.buildAttendanceSummary(attendanceRecords, yesterdayStart);

            // Check for duplicate notification (same date summary already sent)
            const summaryDateStr = yesterdayStart.toISOString().split('T')[0];

            // Send notification to each HR admin
            let sentCount = 0;
            for (const admin of hrAdmins) {
                // Check if notification already sent for this date to this admin
                const existingNotification = await this.notificationModel.findOne({
                    to: admin.employeeProfileId,
                    type: 'DAILY_ATTENDANCE_SUMMARY',
                    'metadata.summaryDate': summaryDateStr,
                });

                if (existingNotification) {
                    this.logger.log(`[AttendanceSummary] Notification already sent to ${admin.employeeProfileId} for ${summaryDateStr}, skipping`);
                    continue;
                }

                await this.createNotification(admin, summary, attendanceRecords.length, summaryDateStr);
                sentCount++;
                this.logger.log(`[AttendanceSummary] ✓ Sent notification to HR Admin: ${admin.employeeProfileId}`);
            }

            this.logger.log(
                `[AttendanceSummary] ✓ Completed - Sent daily summary to ${sentCount}/${hrAdmins.length} HR admins (${attendanceRecords.length} records)`
            );
        } catch (error) {
            this.logger.error('[AttendanceSummary] Scheduler execution failed', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Fetch attendance records created within the specified date range
     */
    private async getAttendanceRecordsForDate(startDate: Date, endDate: Date): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('[AttendanceSummary] Database not available');
                return [];
            }

            const records = await this.connection.db
                .collection('attendancerecords')
                .find({
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                })
                .toArray();

            return records || [];
        } catch (error) {
            this.logger.error('[AttendanceSummary] Failed to fetch attendance records', error);
            return [];
        }
    }

    /**
     * Build summary statistics from attendance records
     */
    private buildAttendanceSummary(records: any[], date: Date): string {
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        // Count by status
        const statusCounts: Record<string, number> = {};
        for (const record of records) {
            const status = record.status || 'UNKNOWN';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        }

        // Build status breakdown string
        const statusBreakdown = Object.entries(statusCounts)
            .map(([status, count]) => `${status}: ${count}`)
            .join(', ');

        // Count employees with punches
        const employeesWithPunches = new Set(records.map(r => r.employeeId?.toString()).filter(Boolean)).size;

        // Count late arrivals if available
        const lateArrivals = records.filter(r => r.isLate === true || r.status === 'LATE').length;

        // Count early departures if available
        const earlyDepartures = records.filter(r => r.isEarlyDeparture === true || r.status === 'EARLY_DEPARTURE').length;

        return `📊 Daily Attendance Summary for ${dateStr}\n\n` +
            `📋 Total Records: ${records.length}\n` +
            `👥 Unique Employees: ${employeesWithPunches}\n` +
            `⏰ Late Arrivals: ${lateArrivals}\n` +
            `🚪 Early Departures: ${earlyDepartures}\n\n` +
            `📈 Status Breakdown:\n${statusBreakdown || 'N/A'}`;
    }

    /**
     * Create notification in the database
     */
    private async createNotification(admin: any, summary: string, recordCount: number, summaryDate: string): Promise<void> {
        try {
            await this.notificationModel.create({
                to: admin.employeeProfileId,
                type: 'DAILY_ATTENDANCE_SUMMARY',
                message: summary,
                metadata: {
                    recordCount,
                    summaryDate,
                    generatedAt: new Date().toISOString(),
                },
            } as any);
        } catch (error) {
            this.logger.error(`[AttendanceSummary] Failed to create notification for admin ${admin.employeeProfileId}`, error);
        }
    }

    /**
     * Find all active HR Admin users
     * Searches employeesystemroles collection for HR Admin roles
     */
    private async findHRAdminUsers(): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('[AttendanceSummary] Database not available');
                return [];
            }

            // Find all HR Admin roles
            const hrRoles = await this.connection.db
                .collection('employee_system_roles')
                .find({
                    roles: { $in: ['HR Manager', 'System Admin', 'HR Admin'] },
                    isActive: true,
                })
                .toArray();

            if (!hrRoles?.length) {
                this.logger.warn('[AttendanceSummary] No HR Admin roles found in employee_system_roles collection');
                return [];
            }

            this.logger.log(`[AttendanceSummary] Found ${hrRoles.length} HR role(s) in employee_system_roles`);

            // Get employee profile details for each HR role using employeeProfileId
            const employeeIds = hrRoles.map((r: any) => r.employeeProfileId);
            const employees = await this.connection.db
                .collection('employee_profiles')
                .find({
                    _id: { $in: employeeIds },
                    isActive: true,
                })
                .toArray();

            this.logger.log(`[AttendanceSummary] Found ${employees.length} active employee profile(s) matching HR roles`);

            // Merge role and employee data
            const hrUsers = hrRoles
                .map((role: any) => {
                    const emp = employees.find((e: any) => e._id.equals(role.employeeProfileId));
                    if (!emp) {
                        this.logger.warn(`[AttendanceSummary] No active employee profile found for employeeProfileId: ${role.employeeProfileId}`);
                        return null;
                    }
                    return { employeeProfileId: role.employeeProfileId, ...emp };
                })
                .filter(Boolean);

            this.logger.log(`[AttendanceSummary] Resolved ${hrUsers.length} HR Admin user(s) for notifications`);
            return hrUsers;
        } catch (error) {
            this.logger.error('[AttendanceSummary] Failed to find HR Admin users', error);
            return [];
        }
    }
}

