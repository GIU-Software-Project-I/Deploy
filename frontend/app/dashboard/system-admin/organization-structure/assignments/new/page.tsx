'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { organizationStructureService } from '@/app/services/organization-structure';
import { employeeProfileService } from '@/app/services/employee-profile';
import RoleGuard from '@/components/RoleGuard';
import { SystemRole } from '@/context/AuthContext';

interface Position {
    _id: string;
    title: string;
    code: string;
    departmentId: { _id: string; name: string };
    isActive: boolean;
}

interface Employee {
    _id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    primaryDepartmentId?: { _id: string; name: string };
    primaryPositionId?: { _id: string; title: string };
    profilePicture?: string;
}

export default function CreateAssignmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [positions, setPositions] = useState<Position[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const [formData, setFormData] = useState({
        positionId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
    });

    useEffect(() => {
        fetchDependencies();
    }, []);

    const fetchDependencies = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('[CreateAssignment] Starting to fetch data...');

            const [posRes, empRes] = await Promise.all([
                organizationStructureService.getPositions(undefined, true),
                employeeProfileService.getAllEmployees(1, 100),
            ]);

            console.log('[CreateAssignment] Position response:', posRes);
            console.log('[CreateAssignment] Employee response:', empRes);

            // Handle Position Response
            const posData = (posRes as any).data || posRes;
            setPositions(Array.isArray(posData) ? posData as Position[] : []);

            // Handle Employee Response - try multiple formats
            const empResponse = empRes as any;
            let employeeList: Employee[] = [];

            // Check for error in response
            if (empResponse.error) {
                console.error('[CreateAssignment] Employee API error:', empResponse.error);
                setError(`Failed to load employees: ${empResponse.error}`);
            } else if (empResponse.data) {
                if (Array.isArray(empResponse.data)) {
                    employeeList = empResponse.data;
                } else if (Array.isArray(empResponse.data.data)) {
                    employeeList = empResponse.data.data;
                } else if (empResponse.data.employees && Array.isArray(empResponse.data.employees)) {
                    employeeList = empResponse.data.employees;
                }
            }

            console.log('[CreateAssignment] Parsed employees:', employeeList.length, employeeList.slice(0, 2));
            setEmployees(employeeList);

        } catch (err: any) {
            console.error('[CreateAssignment] Fetch error:', err);
            setError(`Failed to load data: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    // Filter employees based on search
    const filteredEmployees = useMemo(() => {
        if (!employeeSearch.trim()) return employees;
        const searchLower = employeeSearch.toLowerCase();
        return employees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower) ||
            emp.employeeNumber?.toLowerCase().includes(searchLower) ||
            emp.primaryDepartmentId?.name?.toLowerCase().includes(searchLower)
        );
    }, [employees, employeeSearch]);

    const handleSelectEmployee = (emp: Employee) => {
        setSelectedEmployee(emp);
        setEmployeeSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployee || !formData.positionId || !formData.startDate) {
            toast.error('Please select an employee, position, and start date');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const selectedPos = positions.find(p => p._id === formData.positionId);
            if (!selectedPos || !selectedPos.departmentId) {
                throw new Error('Selected position does not belong to a valid department.');
            }

            const payload = {
                employeeProfileId: selectedEmployee._id,
                positionId: formData.positionId,
                departmentId: selectedPos.departmentId._id,
                startDate: formData.startDate,
                endDate: formData.endDate || undefined,
                notes: formData.notes || undefined,
            };

            await organizationStructureService.assignEmployeeToPosition(payload);

            toast.success('Employee assigned successfully');
            router.push('/dashboard/system-admin/organization-structure');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create assignment');
            toast.error('Failed to create assignment');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
                <div className="p-6 lg:p-8 bg-background min-h-screen">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
                        <div className="h-96 bg-muted rounded-xl animate-pulse"></div>
                    </div>
                </div>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
            <div className="p-6 lg:p-8 bg-background min-h-screen">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/system-admin/organization-structure"
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Assign Employee</h1>
                            <p className="text-muted-foreground">Select an employee and assign them to a position</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Employee Selection Panel */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-border bg-muted/30">
                                <h2 className="font-semibold text-foreground">Select Employee</h2>
                                <p className="text-xs text-muted-foreground mt-1">Search and click to select</p>
                            </div>

                            {/* Selected Employee Display */}
                            {selectedEmployee && (
                                <div className="p-4 border-b border-border bg-primary/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {selectedEmployee.employeeNumber} • {selectedEmployee.primaryDepartmentId?.name || 'No Dept'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEmployee(null)}
                                            className="text-xs text-destructive hover:text-destructive/80"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Search Input */}
                            {!selectedEmployee && (
                                <div className="p-3 border-b border-border">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            placeholder="Search by name, ID, or department..."
                                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Employee List */}
                            {!selectedEmployee && (
                                <div className="max-h-[400px] overflow-y-auto">
                                    {filteredEmployees.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <p className="font-medium">No employees found</p>
                                            <p className="text-xs mt-1">Try a different search term</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {filteredEmployees.slice(0, 50).map((emp) => (
                                                <button
                                                    key={emp._id}
                                                    type="button"
                                                    onClick={() => handleSelectEmployee(emp)}
                                                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-foreground text-sm truncate">
                                                            {emp.firstName} {emp.lastName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {emp.employeeNumber} • {emp.primaryPositionId?.title || 'No Position'}
                                                        </p>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground text-right">
                                                        {emp.primaryDepartmentId?.name || 'Unassigned'}
                                                    </div>
                                                </button>
                                            ))}
                                            {filteredEmployees.length > 50 && (
                                                <p className="p-3 text-center text-xs text-muted-foreground">
                                                    Showing 50 of {filteredEmployees.length} results. Refine your search.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Assignment Form */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-border bg-muted/30">
                                <h2 className="font-semibold text-foreground">Assignment Details</h2>
                                <p className="text-xs text-muted-foreground mt-1">Configure the position assignment</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* Position Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Position <span className="text-destructive">*</span>
                                    </label>
                                    <select
                                        value={formData.positionId}
                                        onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    >
                                        <option value="">Select Position</option>
                                        {positions.map((pos) => (
                                            <option key={pos._id} value={pos._id}>
                                                {pos.title} ({pos.code}) - {pos.departmentId?.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Start Date */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Start Date <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                        />
                                    </div>

                                    {/* End Date */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                                        placeholder="Optional notes regarding this assignment..."
                                    />
                                </div>

                                {/* Summary */}
                                {selectedEmployee && formData.positionId && (
                                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Assignment Summary</h4>
                                        <p className="text-sm text-foreground">
                                            <span className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                                            {' → '}
                                            <span className="font-medium">{positions.find(p => p._id === formData.positionId)?.title}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Starting {new Date(formData.startDate).toLocaleDateString()}
                                            {formData.endDate && ` until ${new Date(formData.endDate).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                )}

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                                    <Link
                                        href="/dashboard/system-admin/organization-structure"
                                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={saving || !selectedEmployee}
                                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                Assigning...
                                            </>
                                        ) : (
                                            'Assign Employee'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
