'use client';

import { useState, useEffect, useCallback } from 'react';
import { timeManagementService } from '@/app/services/time-management';
import { employeeProfileService } from '@/app/services/employee-profile';

interface LatenessRecord {
    _id: string;
    employeeId: string;
    type: string;
    status: string;
    reason?: string;
    createdAt?: string;
    attendanceRecordId?: {
        _id: string;
        employeeId: string;
        date?: string;
        punches?: Array<{ type: string; time: string }>;
        totalWorkMinutes?: number;
        finalisedForPayroll?: boolean;
    };
}

interface EmployeeWithLateness {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
    latenessCount: number;
    exceedsThreshold?: boolean;
}

// Lateness threshold configuration
const LATENESS_THRESHOLD = 3; // Maximum allowed lateness per month

export default function RepeatedLatenessPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // View state: 'list' or 'detail'
    const [view, setView] = useState<'list' | 'detail'>('list');

    // Employee list
    const [employees, setEmployees] = useState<EmployeeWithLateness[]>([]);

    // Selected employee and their records
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithLateness | null>(null);
    const [latenessRecords, setLatenessRecords] = useState<LatenessRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(false);


    /**
     * Fetch all employees and their lateness counts
     */
    const fetchEmployeesWithLateness = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch lateness counts for all employees in a single batch request
            console.log('[Lateness] Fetching all lateness counts...');
            const latenessCounts = await timeManagementService.getAllLatenessCounts();
            console.log('[Lateness] Lateness counts response:', latenessCounts);

            if (!latenessCounts || latenessCounts.length === 0) {
                console.log('[Lateness] No employees with lateness found');
                setEmployees([]);
                setLoading(false);
                return;
            }

            // Create a map of employeeId -> count for quick lookup
            const countsMap = new Map<string, number>();
            for (const item of latenessCounts) {
                countsMap.set(item.employeeId, item.count);
            }

            // Fetch employee details only for employees with lateness
            const employeeIds = latenessCounts.map(item => item.employeeId);
            console.log('[Lateness] Fetching details for', employeeIds.length, 'employees with lateness');

            // Fetch all employees using pagination (max 100 per page)
            let allEmployees: any[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const employeesResponse = await employeeProfileService.getAllEmployees(page, 100) as any;

                let pageEmployees: any[] = [];

                // Extract employees from response
                if (employeesResponse?.data?.data && Array.isArray(employeesResponse.data.data)) {
                    pageEmployees = employeesResponse.data.data;
                } else if (employeesResponse?.data && Array.isArray(employeesResponse.data)) {
                    pageEmployees = employeesResponse.data;
                }

                if (pageEmployees.length > 0) {
                    allEmployees = [...allEmployees, ...pageEmployees];

                    // Check if there are more pages
                    const pagination = employeesResponse?.data?.pagination;
                    if (pagination?.hasNextPage) {
                        page++;
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }

                // Safety limit to prevent infinite loops
                if (page > 20) {
                    hasMore = false;
                }
            }

            console.log('[Lateness] Total employees fetched:', allEmployees.length);

            // Filter and map employees with lateness counts
            const employeesWithLateness: EmployeeWithLateness[] = [];

            for (const emp of allEmployees) {
                const latenessCount = countsMap.get(emp._id);
                if (latenessCount && latenessCount > 0) {
                    employeesWithLateness.push({
                        _id: emp._id,
                        firstName: emp.firstName || '',
                        lastName: emp.lastName || '',
                        email: emp.workEmail || emp.email || '',
                        department: emp.primaryDepartmentId?.name || emp.department?.name || 'N/A',
                        position: emp.primaryPositionId?.title || emp.position?.name || 'N/A',
                        latenessCount: latenessCount,
                        exceedsThreshold: latenessCount >= LATENESS_THRESHOLD,
                    });
                }
            }

            // Sort by lateness count descending
            employeesWithLateness.sort((a, b) => b.latenessCount - a.latenessCount);
            setEmployees(employeesWithLateness);
        } catch (err: any) {
            console.error('Failed to fetch employees:', err);
            setError(err?.message || 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Handle clicking on an employee - fetch their lateness records and show detail view
     */
    const handleEmployeeClick = async (employee: EmployeeWithLateness) => {
        setSelectedEmployee(employee);
        setView('detail');
        setLoadingRecords(true);
        setLatenessRecords([]);

        try {
            const recordsResponse = await timeManagementService.getRepeatedLatenessRecords(employee._id) as any;

            let records: LatenessRecord[] = [];
            if (Array.isArray(recordsResponse?.data)) {
                records = recordsResponse.data;
            } else if (Array.isArray(recordsResponse)) {
                records = recordsResponse;
            }

            // Debug: log all records to see their structure
            console.log('[Lateness] Raw records:', records);
            records.forEach((r, i) => {
                console.log(`[Lateness] Record ${i}:`, {
                    _id: r._id,
                    type: r.type,
                    status: r.status,
                    reason: r.reason,
                    createdAt: r.createdAt,
                    hasAttendanceRecord: !!r.attendanceRecordId,
                    attendanceDate: r.attendanceRecordId?.date,
                    punchCount: r.attendanceRecordId?.punches?.length
                });
            });

            // Filter out records where attendanceRecordId failed to populate (orphaned exceptions)
            const validRecords = records.filter(r => {
                // Only keep record if attendanceRecordId was properly populated (is an object with _id, not just a string ObjectId)
                // When Mongoose populate fails, attendanceRecordId remains as string/ObjectId or null
                const isPopulated = r.attendanceRecordId &&
                    typeof r.attendanceRecordId === 'object' &&
                    r.attendanceRecordId._id;

                if (!isPopulated) {
                    console.warn('[Lateness] Orphaned TimeException found:', r._id, '- attendanceRecordId not populated');
                }
                return isPopulated;
            });

            console.log('[Lateness] Valid records:', validRecords.length, 'of', records.length, '(filtered', records.length - validRecords.length, 'orphaned)');

            setLatenessRecords(validRecords);
        } catch (err) {
            console.error('Failed to fetch lateness records:', err);
            setError('Failed to fetch lateness records');
        } finally {
            setLoadingRecords(false);
        }
    };

    /**
     * Go back to list view
     */
    const handleBackToList = () => {
        setView('list');
        setSelectedEmployee(null);
        setLatenessRecords([]);
    };

    /**
     * Format date time
     */
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString();
    };

    /**
     * Format date only
     */
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString();
    };

    /**
     * Get the best available date for a lateness record
     * Falls back through: createdAt -> attendanceRecordId.date -> first punch time
     */
    const getRecordDate = (record: LatenessRecord): string => {
        // Try createdAt first (if schema adds timestamps in the future)
        if (record.createdAt) {
            return formatDate(record.createdAt);
        }
        // Try attendance record date
        if (record.attendanceRecordId?.date) {
            return formatDate(record.attendanceRecordId.date);
        }
        // Try first punch time
        if (record.attendanceRecordId?.punches && record.attendanceRecordId.punches.length > 0) {
            return formatDate(record.attendanceRecordId.punches[0].time);
        }
        return 'N/A';
    };


    // Initial load
    useEffect(() => {
        fetchEmployeesWithLateness();
    }, [fetchEmployeesWithLateness]);

    // LIST VIEW
    if (view === 'list') {
        const employeesExceedingThreshold = employees.filter(e => e.exceedsThreshold);
        const employeesBelowThreshold = employees.filter(e => !e.exceedsThreshold);

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Repeated Lateness</h1>
                        <p className="text-muted-foreground">
                            Employees with lateness records • Threshold: <span className="font-semibold text-amber-600 dark:text-amber-400">{LATENESS_THRESHOLD} times/month</span>
                        </p>
                    </div>
                    <button
                        onClick={fetchEmployeesWithLateness}
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{employees.length}</p>
                                <p className="text-sm text-muted-foreground">Total with Lateness</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-red-200 dark:border-red-900/50 p-4 bg-red-50/50 dark:bg-red-900/10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{employeesExceedingThreshold.length}</p>
                                <p className="text-sm text-red-600/80 dark:text-red-400/80">Exceeded Threshold (≥{LATENESS_THRESHOLD})</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{employeesBelowThreshold.length}</p>
                                <p className="text-sm text-muted-foreground">Below Threshold</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Employee List */}
                <div className="bg-card rounded-xl border border-border">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading employees...</div>
                    ) : employees.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No employees with lateness records found.
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {/* Employees Exceeding Threshold */}
                            {employeesExceedingThreshold.length > 0 && (
                                <>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/50">
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Exceeded Threshold ({employeesExceedingThreshold.length})
                                        </p>
                                    </div>
                                    {employeesExceedingThreshold.map((employee) => (
                                        <button
                                            key={employee._id}
                                            onClick={() => handleEmployeeClick(employee)}
                                            className="w-full p-4 text-left hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-between border-l-4 border-red-500"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold">
                                                    {employee.firstName[0]}{employee.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-foreground">
                                                            {employee.firstName} {employee.lastName}
                                                        </p>
                                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                                                            ⚠ Threshold Exceeded
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-4 py-2 rounded-full text-lg font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    {employee.latenessCount} late
                                                </span>
                                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {/* Employees Below Threshold */}
                            {employeesBelowThreshold.length > 0 && (
                                <>
                                    <div className="p-3 bg-muted/50">
                                        <p className="text-sm font-semibold text-muted-foreground">
                                            Below Threshold ({employeesBelowThreshold.length})
                                        </p>
                                    </div>
                                    {employeesBelowThreshold.map((employee) => (
                                        <button
                                            key={employee._id}
                                            onClick={() => handleEmployeeClick(employee)}
                                            className="w-full p-4 text-left hover:bg-accent/50 transition-colors flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {employee.firstName[0]}{employee.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground">
                                                        {employee.firstName} {employee.lastName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-4 py-2 rounded-full text-lg font-bold ${
                                                    employee.latenessCount >= 2
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                    {employee.latenessCount} late
                                                </span>
                                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // DETAIL VIEW - Show lateness attendance records for selected employee
    return (
        <div className="space-y-6">
            {/* Back Button & Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleBackToList}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                    <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                    </h1>
                    <p className="text-muted-foreground">
                        {selectedEmployee?.latenessCount} lateness records
                    </p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Lateness Records */}
            <div className="bg-card rounded-xl border border-border">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-foreground">Attendance Records with Lateness</h2>
                </div>

                {loadingRecords ? (
                    <div className="p-8 text-center text-muted-foreground">Loading records...</div>
                ) : latenessRecords.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No lateness records found.</div>
                ) : (
                    <div className="divide-y divide-border">
                        {latenessRecords.map((record, index) => (
                            <div key={record._id} className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <span className="text-red-600 dark:text-red-400 font-bold">#{index + 1}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{getRecordDate(record)}</p>
                                            <p className="text-sm text-muted-foreground">Type: {record.type}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        record.status === 'ESCALATED'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            : record.status === 'RESOLVED'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                        {record.status}
                                    </span>
                                </div>

                                {record.reason && (
                                    <p className="text-sm text-muted-foreground mb-3 ml-13">
                                        <span className="font-medium">Reason:</span> {record.reason}
                                    </p>
                                )}

                                {/* Attendance Punch Details */}
                                {record.attendanceRecordId && (
                                    <div className="ml-13 mt-3 p-4 bg-muted/30 rounded-lg">
                                        <p className="text-sm font-medium text-foreground mb-2">Punch Records</p>
                                        {record.attendanceRecordId.punches && record.attendanceRecordId.punches.length > 0 ? (
                                            <div className="space-y-2">
                                                {record.attendanceRecordId.punches.map((punch, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                                                            punch.type === 'IN'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                            {punch.type}
                                                        </span>
                                                        <span className="text-sm text-foreground">{formatDateTime(punch.time)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No punch details available</p>
                                        )}

                                        {record.attendanceRecordId.totalWorkMinutes !== undefined && (
                                            <div className="mt-3 pt-3 border-t border-border">
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-medium">Total Work Time:</span>{' '}
                                                    {Math.floor(record.attendanceRecordId.totalWorkMinutes / 60)}h {record.attendanceRecordId.totalWorkMinutes % 60}m
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

