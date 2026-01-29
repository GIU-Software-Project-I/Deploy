// src/time-management/repeated-lateness/repeated-lateness.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { TimeException, TimeExceptionDocument } from '../models/time-exception.schema';
import { TimeExceptionType, TimeExceptionStatus } from '../models/enums';
import { NotificationLog } from '../models/notification-log.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../models/attendance-record.schema';
import { LatenessRule, LatenessRuleDocument } from '../models/lateness-rule.schema';

@Injectable()
export class RepeatedLatenessService {
    private readonly logger = new Logger(RepeatedLatenessService.name);

    constructor(
        @InjectConnection() private readonly connection: Connection, // Ensure connection is injected
        @InjectModel(TimeException.name) private readonly exceptionModel: Model<TimeExceptionDocument>,
        @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecordDocument>,
        @InjectModel(NotificationLog.name) private readonly notificationModel: Model<NotificationLog>,
        @InjectModel(LatenessRule.name) private readonly latenessRuleModel?: Model<LatenessRuleDocument>,
    ) {}

    /**
     * Check repeated lateness for an employee within a rolling window (days).
     * If threshold reached, mark found LATE exceptions as ESCALATED and create a NotificationLog,
     * and also create a summary TimeException of type MANUAL_ADJUSTMENT with reason REPEATED_LATENESS (if desired).
     */
    async evaluateAndEscalateIfNeeded(employeeId: Types.ObjectId | string, opts?: {
        windowDays?: number; threshold?: number;
        notifyHrId?: Types.ObjectId | string | null;
    }) {
        // Start with env/defaults
        let windowDays = opts?.windowDays ?? Number(process.env.LATENESS_THRESHOLD_WINDOW_DAYS ?? 90);
        let threshold = opts?.threshold ?? Number(process.env.LATENESS_THRESHOLD_OCCURRENCES ?? 3);

        // Allow override via a LatenessRule entry named 'REPEATED_LATENESS' (description contains JSON {windowDays, threshold})
        try {
            const ruleName = process.env.REPEATED_LATENESS_RULE_NAME ?? 'REPEATED_LATENESS';
            if (this.latenessRuleModel) {
                const rule = await this.latenessRuleModel.findOne({ name: ruleName }).lean();
                if (rule && rule.description) {
                    try {
                        const parsed = typeof rule.description === 'string' ? JSON.parse(rule.description) : rule.description;
                        if (parsed) {
                            if (parsed.windowDays && Number.isFinite(Number(parsed.windowDays))) {
                                // only override if opts didn't explicitly provide windowDays
                                if (opts?.windowDays === undefined) windowDays = Number(parsed.windowDays);
                            }
                            if (parsed.threshold && Number.isFinite(Number(parsed.threshold))) {
                                if (opts?.threshold === undefined) threshold = Number(parsed.threshold);
                            }
                        }
                    } catch (e) {
                        this.logger.debug('Failed to parse REPEATED_LATENESS rule description as JSON', e.message || e);
                    }
                }
            }
        } catch (e) {
            this.logger.debug('Failed to load REPEATED_LATENESS rule for overrides', e.message || e);
        }

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - windowDays);

        const matchEmployee = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        // Build ObjectId range fallback for systems that don't have createdAt timestamps on exceptions
        const startHex = Math.floor(start.getTime() / 1000).toString(16).padStart(8, '0');
        const endHex = Math.floor(end.getTime() / 1000).toString(16).padStart(8, '0');
        const startObjectId = new Types.ObjectId(startHex + '0000000000000000');
        const endObjectId = new Types.ObjectId(endHex + 'ffffffffffffffff');

        // Find LATE exceptions (status not RESOLVED) within window so we can later attach summary to their attendance records
        const lateExceptions = await this.exceptionModel.find({
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
            status: { $ne: TimeExceptionStatus.RESOLVED },
            $or: [
                { createdAt: { $gte: start, $lte: end } },
                { _id: { $gte: startObjectId, $lte: endObjectId } }
            ]
        }).lean();
        const lateCount = lateExceptions.length;

        this.logger.debug(`Employee ${matchEmployee} has ${lateCount} late exceptions in last ${windowDays} days`);

        if (lateCount < threshold) return { escalated: false, count: lateCount };

        // Avoid duplicate escalation: check if there's already a REPEATED_LATENESS escalation (we use a TimeException with reason marker)
        const existingEscalation = await this.exceptionModel.findOne({
            employeeId: matchEmployee,
            // use MANUAL_ADJUSTMENT as a generic type or create special reason
            type: TimeExceptionType.MANUAL_ADJUSTMENT,
            reason: { $regex: 'REPEATED_LATENESS_ESCALATION', $options: 'i' },
        }).lean();

        if (existingEscalation) {
            this.logger.debug(`Repeated lateness already escalated for ${matchEmployee}`);
            return { escalated: false, count: lateCount, alreadyEscalated: true };
        }

        // Mark existing LATE exceptions as ESCALATED (so they won't be re-processed)
        await this.exceptionModel.updateMany({
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
            status: { $ne: TimeExceptionStatus.RESOLVED },
            $or: [
                { createdAt: { $gte: start, $lte: end } },
                { _id: { $gte: startObjectId, $lte: endObjectId } }
            ]
        }, {
            $set: { status: TimeExceptionStatus.ESCALATED }
        });

        // Create a summary/manual exception to record the escalation (this uses your existing type set)
        try {
            const summary = await this.exceptionModel.create({
                employeeId: matchEmployee,
                attendanceRecordId: null, // no single attendance record: optional
                type: TimeExceptionType.MANUAL_ADJUSTMENT,
                assignedTo: opts?.notifyHrId ? (typeof opts.notifyHrId === 'string' ? new Types.ObjectId(opts.notifyHrId) : opts.notifyHrId) : undefined,
                status: TimeExceptionStatus.ESCALATED,
                reason: `REPEATED_LATENESS_ESCALATION: ${lateCount} lateness events in ${windowDays} days`,
            } as any);
            // Attach the summary exception id to any attendance records referenced by the escalated late exceptions
            try {
                const attendanceIds = Array.from(new Set(lateExceptions.map(e => (e.attendanceRecordId || null)).filter(Boolean).map(String)));
                for (const attId of attendanceIds) {
                    try {
                        const att = await this.attendanceModel.findById(attId as any);
                        if (att) {
                            att.exceptionIds = att.exceptionIds || [];
                            const exists = att.exceptionIds.some(id => id?.toString?.() === (summary as any)._id.toString());
                            if (!exists) att.exceptionIds.push((summary as any)._id as any);
                            att.finalisedForPayroll = false;
                            await att.save();
                        }
                    } catch (inner) {
                        this.logger.warn(`Failed to attach summary exception to attendance ${attId}`, inner);
                    }
                }
            } catch (attachErr) {
                this.logger.warn('Failed to attach summary exception to attendance records', attachErr);
            }
            // Notify HR / manager via NotificationLog (recipient passed in opts or env)
            let hrId = undefined as Types.ObjectId | undefined;
            if (opts?.notifyHrId) {
                hrId = typeof opts.notifyHrId === 'string' ? new Types.ObjectId(opts.notifyHrId) : opts.notifyHrId as Types.ObjectId;
            } else if (process.env.HR_USER_ID) {
                hrId = new Types.ObjectId(process.env.HR_USER_ID);
            }

            let notifiedHrId: string | undefined = undefined;
            if (hrId) {
                try {
                    await this.notificationModel.create({
                        to: hrId,
                        type: 'REPEATED_LATENESS',
                        message: `Employee ${matchEmployee} has ${lateCount} late events in ${windowDays} days. Escalation created (${(summary as any)._id}).`,
                    } as any);
                    notifiedHrId = String(hrId);
                } catch (e) {
                    this.logger.warn('Failed to create REPEATED_LATENESS notification', e);
                }
            }
            // Return escalated result with notified HR id when applicable
            return { escalated: true, count: lateCount, notifiedHrId };
        } catch (e) {
            this.logger.error('Failed to create summary escalation exception / notification', e);
        }

        return { escalated: true, count: lateCount };
    }

    /**
     * Helper to get count for an employee (for UI or reporting)
     * @param employeeId employee ObjectId or string
     * @param opts optional flags: { onlyUnresolved: boolean }
     */
    async getLateCount(employeeId: Types.ObjectId | string, opts?: { onlyUnresolved?: boolean }) {
        const matchEmployee = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        // If caller requests only unresolved, apply status filter; otherwise count all LATE exceptions
        const filter: any = {
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
        };
        if (opts?.onlyUnresolved) {
            filter.status = { $ne: TimeExceptionStatus.RESOLVED };
        }
        return await this.exceptionModel.countDocuments(filter);
    }

    /**
     * Check if employee just hit or exceeded the lateness threshold after a new late clock-in.
     * Called immediately after a LATE exception is created.
     * Notifies both the employee and HR admins if threshold is reached.
     *
     * @param employeeId - The employee who was just marked late
     * @param currentLateCount - The current count INCLUDING the new late record
     */
    async checkThresholdAndNotify(employeeId: Types.ObjectId | string, currentLateCount?: number): Promise<{
        thresholdExceeded: boolean;
        count: number;
        threshold: number;
        notifiedEmployee: boolean;
        notifiedHr: boolean;
        employeeName?: string;
    }> {
        const matchEmployee = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        // Get threshold from env or default
        const threshold = Number(process.env.LATENESS_THRESHOLD_OCCURRENCES ?? 3);
        const windowDays = Number(process.env.LATENESS_THRESHOLD_WINDOW_DAYS ?? 30);

        // Fetch employee name for HR notification
        let employeeName = `Employee ID: ${matchEmployee}`;
        try {
            if (this.connection && this.connection.db) {
                const profileCollections = ['employee_profiles', 'employeeprofiles', 'employee_profiles_v1'];
                for (const colName of profileCollections) {
                    try {
                        const profile = await this.connection.db.collection(colName).findOne({ _id: matchEmployee });
                        if (profile) {
                            const firstName = profile.firstName || profile.first_name || '';
                            const lastName = profile.lastName || profile.last_name || '';
                            const fullName = `${firstName} ${lastName}`.trim();
                            if (fullName) {
                                employeeName = fullName;
                            } else if (profile.name) {
                                employeeName = profile.name;
                            } else if (profile.workEmail) {
                                employeeName = profile.workEmail;
                            }
                            break;
                        }
                    } catch (e) {
                        // continue to next collection
                    }
                }
            }
        } catch (e) {
            this.logger.debug('Failed to fetch employee name for notification', e);
        }

        // Get the current late count if not provided
        let lateCount = currentLateCount;
        if (lateCount === undefined) {
            // Count LATE exceptions within the window period
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - windowDays);

            const startHex = Math.floor(windowStart.getTime() / 1000).toString(16).padStart(8, '0');
            const startObjectId = new Types.ObjectId(startHex + '0000000000000000');

            lateCount = await this.exceptionModel.countDocuments({
                employeeId: matchEmployee,
                type: TimeExceptionType.LATE,
                status: { $ne: TimeExceptionStatus.RESOLVED },
                $or: [
                    { createdAt: { $gte: windowStart } },
                    { _id: { $gte: startObjectId } }
                ]
            });
        }

        this.logger.debug(`[ThresholdCheck] Employee ${matchEmployee}: ${lateCount} late in ${windowDays} days (threshold: ${threshold})`);

        // Check if threshold is reached
        if (lateCount < threshold) {
            return {
                thresholdExceeded: false,
                count: lateCount,
                threshold,
                notifiedEmployee: false,
                notifiedHr: false
            };
        }

        // Check if we already notified for this exact count (to avoid duplicate notifications)
        const recentNotification = await this.notificationModel.findOne({
            to: matchEmployee,
            type: 'LATENESS_THRESHOLD_EXCEEDED',
            message: { $regex: `${lateCount} time` } // Check if we already notified for this exact count
        }).lean();

        if (recentNotification) {
            this.logger.debug(`[ThresholdCheck] Already notified employee ${matchEmployee} for count ${lateCount}`);
            return {
                thresholdExceeded: true,
                count: lateCount,
                threshold,
                notifiedEmployee: false,
                notifiedHr: false
            };
        }

        let notifiedEmployee = false;
        let notifiedHr = false;

        // Send notifications since threshold is reached/exceeded and not already notified for this count
        // Notify the employee
        try {
            await this.notificationModel.create({
                to: matchEmployee,
                type: 'LATENESS_THRESHOLD_EXCEEDED',
                message: `Warning: You have been late ${lateCount} time(s) in the last ${windowDays} days. The allowed threshold is ${threshold}. Please improve your punctuality to avoid disciplinary action.`,
            } as any);
            notifiedEmployee = true;
            this.logger.log(`[ThresholdCheck] Notified employee ${matchEmployee} - late count: ${lateCount}/${threshold}`);
        } catch (e) {
            this.logger.warn('Failed to notify employee about threshold breach', e);
        }

        // Notify HR Admins and HR Managers
        try {
            const hrAdmins = await this.findHRAdmins();
            const hrManagers = await this.findHRManagers();

            // Combine both lists, avoiding duplicates by employeeProfileId
            const allHRUsers = new Map<string, any>();
            hrAdmins.forEach(hr => allHRUsers.set(hr.employeeProfileId.toString(), hr));
            hrManagers.forEach(hr => allHRUsers.set(hr.employeeProfileId.toString(), hr));

            const hrUsers = Array.from(allHRUsers.values());
            this.logger.debug(`[ThresholdCheck] Found ${hrAdmins.length} HR Admins and ${hrManagers.length} HR Managers (${hrUsers.length} unique) to notify`);

            for (const hr of hrUsers) {
                await this.notificationModel.create({
                    to: hr.employeeProfileId,
                    type: 'EMPLOYEE_LATENESS_THRESHOLD',
                    message: `${employeeName} has exceeded the lateness threshold with ${lateCount} late arrival(s) in the last ${windowDays} days. The allowed threshold is ${threshold}. Please review and take appropriate action.`,
                    metadata: {
                        employeeId: matchEmployee.toString(),
                        employeeName,
                        lateCount,
                        threshold,
                        windowDays,
                    },
                } as any);
            }
            notifiedHr = hrUsers.length > 0;
            this.logger.log(`[ThresholdCheck] Notified ${hrUsers.length} HR users (Admins: ${hrAdmins.length}, Managers: ${hrManagers.length}) about employee ${employeeName}`);
        } catch (e) {
            this.logger.warn('Failed to notify HR admins/managers about employee threshold breach', e);
        }

        return {
            thresholdExceeded: true,
            count: lateCount,
            threshold,
            notifiedEmployee,
            notifiedHr,
            employeeName
        };
    }

    /**
     * Find HR Admins to notify.
     * Uses robust detection checking both embedded roles and role collections.
     */
    private async findHRAdmins(): Promise<any[]> {
        const HR_ADMIN_ROLES = [
            'HR Admin', 'HR_ADMIN', 'HRAdmin', 'hr admin',
            'HR Administrator', 'HR_ADMINISTRATOR',
            'System Admin', 'SYSTEM_ADMIN', 'SystemAdmin'
        ];

        return this.findUsersByRoles(HR_ADMIN_ROLES, 'findHRAdmins');
    }

    /**
     * Find HR Managers to notify.
     * Uses robust detection checking both embedded roles and role collections.
     */
    private async findHRManagers(): Promise<any[]> {
        const HR_MANAGER_ROLES = [
            'HR Manager', 'HR_MANAGER', 'HRManager', 'hr manager'
        ];

        return this.findUsersByRoles(HR_MANAGER_ROLES, 'findHRManagers');
    }

    /**
     * Helper to find users by role names.
     * Uses robust detection checking both embedded roles and role collections.
     */
    private async findUsersByRoles(roleCandidates: string[], logPrefix: string): Promise<any[]> {
        const allUsers = new Map<string, any>();

        if (!this.connection || !this.connection.db) {
            this.logger.warn('Database connection is not initialized or invalid. Cannot fetch users.');
            return [];
        }

        try {
            // Try embedded roles first (employee_profiles with roles field)
            const profileCollections = ['employee_profiles', 'employeeprofiles', 'employee_profiles_v1'];
            for (const colName of profileCollections) {
                try {
                    const probe = await this.connection.db.collection(colName).findOne({});
                    if (probe && Object.prototype.hasOwnProperty.call(probe, 'roles')) {
                        const directHr = await this.connection.db
                            .collection(colName)
                            .find({
                                roles: { $in: roleCandidates },
                                $or: [{ status: 'ACTIVE' }, { isActive: true }, { status: { $exists: false } }]
                            })
                            .project({ _id: 1, workEmail: 1, roles: 1, status: 1 })
                            .toArray();

                        if (directHr.length > 0) {
                            this.logger.debug(`[${logPrefix}] Found ${directHr.length} users from embedded roles in ${colName}`);
                            return directHr.map(e => ({
                                employeeProfileId: e._id,
                                roles: e.roles,
                                workEmail: e.workEmail,
                                isActive: e.status === 'ACTIVE' || true,
                            }));
                        }
                    }
                } catch (e) {
                    // ignore and try next collection
                }
            }

            // Fallback to role collections
            const roleCollections = ['employee_system_roles', 'employeesystemroles', 'employee_systemroles', 'employeeSystemRoles'];
            for (const rc of roleCollections) {
                try {
                    const hrRoles = await this.connection.db.collection(rc).find({
                        roles: { $in: roleCandidates },
                        $or: [{ isActive: true }, { status: 'ACTIVE' }, { status: { $exists: false } }],
                    }).toArray();

                    if (!hrRoles || hrRoles.length === 0) continue;

                    this.logger.debug(`[${logPrefix}] Found ${hrRoles.length} roles from ${rc}`);

                    // For role collections, the _id might be the employeeProfileId or there's an employeeProfileId field
                    hrRoles.forEach((role: any) => {
                        const empId = role.employeeProfileId || role._id;
                        allUsers.set(empId.toString(), {
                            employeeProfileId: empId,
                            roles: role.roles,
                            workEmail: role.workEmail,
                            isActive: true,
                        });
                    });

                    if (allUsers.size > 0) break;
                } catch (e) {
                    this.logger.debug(`[${logPrefix}] Failed to query ${rc}:`, e);
                    continue;
                }
            }
        } catch (error) {
            this.logger.error('Failed to fetch users from the database.', error);
        }

        this.logger.debug(`[${logPrefix}] Returning ${allUsers.size} users`);
        return Array.from(allUsers.values());
    }

    /**
     * Get lateness counts for all employees in a single aggregation query
     * Returns array of { employeeId, count } for employees with count > 0
     * Only counts records where the referenced AttendanceRecord still exists (filters orphaned exceptions)
     */
    async getAllLatenessCounts(opts?: { onlyUnresolved?: boolean }): Promise<{ employeeId: string; count: number }[]> {
        const matchStage: any = {
            type: TimeExceptionType.LATE,
        };
        if (opts?.onlyUnresolved) {
            matchStage.status = { $ne: TimeExceptionStatus.RESOLVED };
        }

        return await this.exceptionModel.aggregate([
            { $match: matchStage },
            // Lookup to verify attendanceRecordId exists
            {
                $lookup: {
                    from: 'attendancerecords',
                    localField: 'attendanceRecordId',
                    foreignField: '_id',
                    as: 'attendanceRecord'
                }
            },
            // Only keep records where the attendance record was found
            {
                $match: {
                    'attendanceRecord': { $ne: [] }
                }
            },
            {
                $group: {
                    _id: '$employeeId',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    employeeId: { $toString: '$_id' },
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);
    }

    /**
     * Get detailed lateness records for an employee
     * @param employeeId employee ObjectId or string
     * @param options optional flags: { onlyUnresolved?: boolean, windowDays?: number }
     */
    async getLatenessRecords(
        employeeId: Types.ObjectId | string,
        options?: { onlyUnresolved?: boolean; windowDays?: number }
    ): Promise<TimeExceptionDocument[]> {
        const matchEmployee = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        const filter: any = {
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
        };

        if (options?.onlyUnresolved) {
            filter.status = { $ne: TimeExceptionStatus.RESOLVED };
        }

        if (options?.windowDays) {
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - options.windowDays);
            filter.createdAt = { $gte: windowStart };
        }

        return this.exceptionModel.find(filter)
            .populate('attendanceRecordId')
            .sort({ createdAt: -1 })
            .exec();
    }

    /**
     * Clean up orphaned TimeException records where the referenced AttendanceRecord no longer exists
     * @returns count of deleted orphaned records
     */
    async cleanupOrphanedExceptions(): Promise<{ deletedCount: number; orphanedIds: string[] }> {
        // Find all TimeException records
        const allExceptions = await this.exceptionModel.find({}).lean();

        const orphanedIds: string[] = [];

        for (const exception of allExceptions) {
            if (exception.attendanceRecordId) {
                // Check if the referenced AttendanceRecord exists
                const attendanceExists = await this.attendanceModel.exists({
                    _id: exception.attendanceRecordId
                });

                if (!attendanceExists) {
                    orphanedIds.push((exception as any)._id.toString());
                }
            } else {
                // No attendanceRecordId at all - also orphaned
                orphanedIds.push((exception as any)._id.toString());
            }
        }

        if (orphanedIds.length > 0) {
            this.logger.log(`Found ${orphanedIds.length} orphaned TimeException records, deleting...`);
            await this.exceptionModel.deleteMany({
                _id: { $in: orphanedIds.map(id => new Types.ObjectId(id)) }
            });
        }

        return { deletedCount: orphanedIds.length, orphanedIds };
    }
}
