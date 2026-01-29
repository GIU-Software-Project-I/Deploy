import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';

@Injectable()
export class ShiftExpiryScheduler implements OnModuleInit {
    private readonly logger = new Logger(ShiftExpiryScheduler.name);

    /** Prevent concurrent scheduler executions */
    private isRunning = false;

    /** Prevent same assignment being processed twice in same run/process */
    private readonly assignmentLocks = new Set<string>();

    /** Cache for employee existence checks to avoid repeated DB queries */
    private employeeExistsCache = new Map<string, boolean>();

    constructor(
        @InjectModel(ShiftAssignment.name)
        private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,

        @InjectModel(NotificationLog.name)
        private readonly notificationModel: Model<NotificationLogDocument>,

        @InjectConnection()
        private readonly connection: Connection,
    ) {}

    /**
     * Check if an employee exists in employee_profiles collection
     */
    private async employeeExists(employeeId: string | Types.ObjectId): Promise<boolean> {
        const idStr = employeeId.toString();

        // Check cache first
        if (this.employeeExistsCache.has(idStr)) {
            return this.employeeExistsCache.get(idStr)!;
        }

        if (!this.connection.db) {
            this.logger.warn(`[employeeExists] Database connection not available`);
            return false;
        }

        try {
            const employee = await this.connection.db
                .collection('employee_profiles')
                .findOne(
                    { _id: new Types.ObjectId(idStr) },
                    { projection: { _id: 1 } }
                );

            const exists = !!employee;
            this.employeeExistsCache.set(idStr, exists);

            if (!exists) {
                this.logger.warn(`[employeeExists] Employee ${idStr} does NOT exist in employee_profiles`);
            }

            return exists;
        } catch (err) {
            this.logger.error(`[employeeExists] Error checking employee ${idStr}`, err);
            return false;
        }
    }

    async onModuleInit() {
        this.logger.log('[ShiftExpiryScheduler] Module initialized – running STARTUP check');
        await this.executeShiftExpiryCheck('STARTUP');
    }

    @Cron('0 10 * * *')
    async runDaily() {
        await this.executeShiftExpiryCheck('CRON');
    }

    private async executeShiftExpiryCheck(trigger: 'STARTUP' | 'CRON') {
        if (this.isRunning) {
            this.logger.warn(
                `[ShiftExpiryScheduler][${trigger}] ⛔ Scheduler already running – execution skipped`
            );
            return;
        }

        this.isRunning = true;

        // Clear employee existence cache for fresh checks each run
        this.employeeExistsCache.clear();

        let createdCount = 0;
        let skippedCount = 0;

        try {
            const days = Number(process.env.SHIFT_EXPIRY_NOTIFICATION_DAYS ?? 7);
            const now = new Date();
            const threshold = new Date();
            threshold.setDate(now.getDate() + days);
            threshold.setHours(23, 59, 59, 999);

            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] Checking assignments expiring in ${days} days`
            );

            const assignments = await this.shiftAssignmentModel
                .find({
                    endDate: { $exists: true, $gte: now, $lte: threshold },
                    status: { $in: ['PENDING', 'APPROVED'] },
                })
                .sort({ endDate: 1, _id: 1 })
                .lean();

            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] Found ${assignments.length} assignments`
            );

            if (!assignments.length) return;

            const hrUsers = await this.findHRAdmins();
            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] Found ${hrUsers.length} HR Admins`
            );

            // Log detailed info about HR admins found
            if (hrUsers.length > 0) {
                this.logger.log(
                    `[ShiftExpiryScheduler][${trigger}] HR Admin IDs: ${hrUsers.map(hr => hr.employeeProfileId.toString()).join(', ')}`
                );
            } else {
                this.logger.warn(
                    `[ShiftExpiryScheduler][${trigger}] ⚠️ No HR Admins found in database! Shift expiry notifications will only be sent to employees.`
                );
            }

            for (const a of assignments) {
                const assignmentId = a._id.toString();

                /** Assignment-level lock */
                if (this.assignmentLocks.has(assignmentId)) {
                    this.logger.warn(
                        `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=ASSIGNMENT_LOCKED | Assignment=${assignmentId}`
                    );
                    skippedCount++;
                    continue;
                }

                this.assignmentLocks.add(assignmentId);

                try {
                    if (!a.endDate || !a.employeeId) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=MISSING_FIELDS | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    if (new Date(a.endDate) < new Date()) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=ALREADY_EXPIRED | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    // Check if employee still exists in employee_profiles before sending ANY notifications
                    const employeeExists = await this.employeeExists(a.employeeId);
                    if (!employeeExists) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=EMPLOYEE_NOT_EXISTS | Employee=${a.employeeId} | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    /** ================= HR NOTIFICATIONS ================= */

                    const hrMessage =
                        `Shift assignment ${assignmentId} for employee ${a.employeeId} ` +
                        `expires on ${a.endDate.toISOString().slice(0, 10)}.`;

                    for (const hr of hrUsers) {
                        if (hr.employeeProfileId.toString() === a.employeeId.toString()) {
                            continue;
                        }

                        // Check if HR admin still exists in employee_profiles
                        const hrExists = await this.employeeExists(hr.employeeProfileId);
                        if (!hrExists) {
                            this.logger.warn(
                                `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=HR_NOT_EXISTS | HR=${hr.employeeProfileId} | Assignment=${assignmentId}`
                            );
                            skippedCount++;
                            continue;
                        }

                        // Convert dates to ISO strings for reliable comparison
                        const startDateStr = a.startDate ? new Date(a.startDate).toISOString() : null;
                        const endDateStr = a.endDate ? new Date(a.endDate).toISOString() : null;

                        // Get today's date range for duplicate check (only skip if sent today)
                        const todayStart = new Date();
                        todayStart.setHours(0, 0, 0, 0);
                        const todayEnd = new Date();
                        todayEnd.setHours(23, 59, 59, 999);

                        // Check for duplicate: same HR, same assignment, same dates, sent TODAY
                        const hrAlreadyNotified = await this.notificationModel.exists({
                            to: hr.employeeProfileId,
                            type: 'SHIFT_EXPIRY',
                            'metadata.assignmentId': assignmentId,
                            'metadata.shiftStartDate': startDateStr,
                            'metadata.shiftEndDate': endDateStr,
                            createdAt: { $gte: todayStart, $lte: todayEnd },
                        });

                        if (hrAlreadyNotified) {
                            this.logger.warn(
                                `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=HR_ALREADY_NOTIFIED | HR=${hr.employeeProfileId} | Assignment=${assignmentId}`
                            );
                            skippedCount++;
                            continue;
                        }

                        await this.notificationModel.create({
                            to: hr.employeeProfileId,
                            type: 'SHIFT_EXPIRY',
                            message: hrMessage,
                            metadata: {
                                assignmentId,
                                employeeId: a.employeeId.toString(),
                                shiftStartDate: startDateStr,
                                shiftEndDate: endDateStr,
                            },
                        } as any);

                        createdCount++;
                        this.logger.log(
                            `[ShiftExpiryScheduler][${trigger}] ✅ HR notification sent | HR=${hr.employeeProfileId} | Assignment=${assignmentId}`
                        );
                    }

                    /** ================= EMPLOYEE NOTIFICATION ================= */

                    // Convert dates to ISO strings for reliable comparison
                    const empStartDateStr = a.startDate ? new Date(a.startDate).toISOString() : null;
                    const empEndDateStr = a.endDate ? new Date(a.endDate).toISOString() : null;

                    // Get today's date range for duplicate check (only skip if sent today)
                    const empTodayStart = new Date();
                    empTodayStart.setHours(0, 0, 0, 0);
                    const empTodayEnd = new Date();
                    empTodayEnd.setHours(23, 59, 59, 999);

                    // Check for duplicate: same employee, same assignment, same dates, sent TODAY
                    const employeeAlreadyNotified = await this.notificationModel.exists({
                        to: a.employeeId,
                        type: 'SHIFT_EXPIRY_EMPLOYEE',
                        'metadata.assignmentId': assignmentId,
                        'metadata.shiftStartDate': empStartDateStr,
                        'metadata.shiftEndDate': empEndDateStr,
                        createdAt: { $gte: empTodayStart, $lte: empTodayEnd },
                    });

                    if (employeeAlreadyNotified) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=EMPLOYEE_ALREADY_NOTIFIED | Employee=${a.employeeId} | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    await this.notificationModel.create({
                        to: a.employeeId,
                        type: 'SHIFT_EXPIRY_EMPLOYEE',
                        message:
                            `Your shift assignment expires on ` +
                            `${a.endDate.toISOString().slice(0, 10)}. Please contact HR.`,
                        metadata: {
                            assignmentId,
                            employeeId: a.employeeId.toString(),
                            shiftStartDate: empStartDateStr,
                            shiftEndDate: empEndDateStr,
                        },
                    } as any);

                    createdCount++;
                    this.logger.log(
                        `[ShiftExpiryScheduler][${trigger}] ✅ Employee notification sent | Employee=${a.employeeId} | Assignment=${assignmentId} | ShiftEndDate=${a.endDate.toISOString().slice(0, 10)}`
                    );
                } catch (err) {
                    this.logger.error(
                        `[ShiftExpiryScheduler][${trigger}] ❌ Failed processing assignment ${assignmentId}`,
                        err,
                    );
                } finally {
                    this.assignmentLocks.delete(assignmentId);
                }
            }

            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] DONE | Created=${createdCount} | Skipped=${skippedCount}`
            );
        } catch (err) {
            this.logger.error(
                `[ShiftExpiryScheduler][${trigger}] Scheduler failed`,
                err,
            );
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * HR Admin discovery logic – for shift expiry notifications
     */
    private async findHRAdmins(): Promise<any[]> {
        if (!this.connection.db) {
            this.logger.warn('[findHRAdmins] Database connection not available');
            return [];
        }

        const HR_ADMIN_ROLES = [
            'HR Admin', 'HR_ADMIN', 'HRAdmin', 'hr admin',
            'HR Administrator', 'HR_ADMINISTRATOR',
            'System Admin', 'SYSTEM_ADMIN'
        ];

        this.logger.log(`[findHRAdmins] Searching for roles: ${HR_ADMIN_ROLES.join(', ')}`);

        try {
            // First, let's see what collections exist
            const collections = await this.connection.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            this.logger.log(`[findHRAdmins] Available collections: ${collectionNames.join(', ')}`);

            // Check if employee_system_roles collection exists
            const hasSystemRoles = collectionNames.includes('employee_system_roles');
            this.logger.log(`[findHRAdmins] employee_system_roles collection exists: ${hasSystemRoles}`);

            if (hasSystemRoles) {
                // Count total documents in the collection
                const totalCount = await this.connection.db.collection('employee_system_roles').countDocuments();
                this.logger.log(`[findHRAdmins] Total documents in employee_system_roles: ${totalCount}`);

                // Sample a few documents to see the structure
                const sampleDocs = await this.connection.db.collection('employee_system_roles').find({}).limit(3).toArray();
                this.logger.log(`[findHRAdmins] Sample documents structure: ${JSON.stringify(sampleDocs.map(d => ({ _id: d._id, roles: d.roles, isActive: d.isActive, status: d.status })), null, 2)}`);
            }

            // Also check employee_profiles for embedded roles
            const hasProfiles = collectionNames.includes('employee_profiles');
            if (hasProfiles) {
                const profileSample = await this.connection.db.collection('employee_profiles').findOne({});
                const hasEmbeddedRoles = profileSample && Object.prototype.hasOwnProperty.call(profileSample, 'roles');
                this.logger.log(`[findHRAdmins] employee_profiles has embedded roles field: ${hasEmbeddedRoles}`);

                if (hasEmbeddedRoles) {
                    // Try finding HR admins from embedded roles
                    const embeddedHRAdmins = await this.connection.db
                        .collection('employee_profiles')
                        .find({ roles: { $in: HR_ADMIN_ROLES } })
                        .project({ _id: 1, workEmail: 1, roles: 1, status: 1 })
                        .toArray();
                    this.logger.log(`[findHRAdmins] Found ${embeddedHRAdmins.length} HR Admins from embedded roles in employee_profiles`);
                    if (embeddedHRAdmins.length > 0) {
                        this.logger.log(`[findHRAdmins] Embedded HR Admin IDs: ${embeddedHRAdmins.map(p => p._id.toString()).join(', ')}`);
                        return embeddedHRAdmins.map((p: any) => ({
                            employeeProfileId: p._id,
                            workEmail: p.workEmail,
                            roles: p.roles,
                            isActive: p.status === 'ACTIVE',
                        }));
                    }
                }
            }

            // Query employee_system_roles
            const profiles = await this.connection.db
                .collection('employee_system_roles')
                .find({
                    roles: { $in: HR_ADMIN_ROLES },
                    $or: [{ isActive: true }, { status: 'ACTIVE' }, { status: { $exists: false } }],
                })
                .toArray();

            this.logger.log(`[findHRAdmins] Query result count from employee_system_roles: ${profiles.length}`);

            if (profiles.length > 0) {
                this.logger.log(`[findHRAdmins] Found HR Admin IDs: ${profiles.map(p => (p.employeeProfileId || p._id).toString()).join(', ')}`);
                this.logger.log(`[findHRAdmins] HR Admin details: ${JSON.stringify(profiles.map(p => ({ 
                    id: p._id.toString(), 
                    roles: p.roles, 
                    workEmail: p.workEmail,
                    employeeProfileId: p.employeeProfileId?.toString()
                })), null, 2)}`);
            } else {
                this.logger.warn('[findHRAdmins] No HR Admins found! Check if roles are stored correctly in the database.');

                // Let's see what roles DO exist
                const allRoles = await this.connection.db
                    .collection('employee_system_roles')
                    .distinct('roles');
                this.logger.log(`[findHRAdmins] All distinct roles in employee_system_roles: ${JSON.stringify(allRoles)}`);
            }

            // Use employeeProfileId if available, otherwise fall back to _id
            return profiles
                .filter((p: any) => p.employeeProfileId || p._id) // Ensure we have a valid ID
                .map((p: any) => ({
                    employeeProfileId: p.employeeProfileId || p._id, // Use employeeProfileId from system_roles table
                    workEmail: p.workEmail,
                    isActive: true,
                }));
        } catch (err) {
            this.logger.error('[findHRAdmins] Error during HR Admin discovery', err);
            return [];
        }
    }

    /**
     * HR Manager discovery logic – for other HR-related notifications
     */
    private async findHRManagers(): Promise<any[]> {
        if (!this.connection.db) return [];

        const HR_MANAGER_ROLES = [
            'HR Manager', 'HR_MANAGER', 'HRManager', 'hr manager'
        ];

        try {
            const profiles = await this.connection.db
                .collection('employee_system_roles')
                .find({
                    roles: { $in: HR_MANAGER_ROLES },
                    $or: [{ isActive: true }, { status: 'ACTIVE' }, { status: { $exists: false } }],
                })
                .toArray();

            // Use employeeProfileId if available, otherwise fall back to _id
            return profiles
                .filter((p: any) => p.employeeProfileId || p._id)
                .map((p: any) => ({
                    employeeProfileId: p.employeeProfileId || p._id,
                    workEmail: p.workEmail,
                    isActive: true,
                }));
        } catch {
            return [];
        }
    }
}
