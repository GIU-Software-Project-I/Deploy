'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { organizationStructureService } from '@/app/services/organization-structure';
import RoleGuard from '@/components/RoleGuard';
import { SystemRole } from '@/context/AuthContext';

interface Position {
    _id: string;
    title: string;
    code: string;
    departmentId: { _id: string; name: string };
    isActive: boolean;
}

export default function CreateAssignmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [positions, setPositions] = useState<Position[]>([]);

    const [formData, setFormData] = useState({
        employeeProfileId: '',
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
            const posRes = await organizationStructureService.getPositions(undefined, true);

            // Handle Position Response
            const posData = (posRes as any).data || posRes;
            setPositions(Array.isArray(posData) ? posData as Position[] : []);

        } catch (err: any) {
            console.error('Failed to load dependencies:', err);
            setError('Failed to load positions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.employeeProfileId || !formData.positionId || !formData.startDate) {
            toast.error('Please fill in all required fields');
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
                ...formData,
                departmentId: selectedPos.departmentId._id,
            };

            // Remove empty fields
            if (!payload.endDate) delete (payload as any).endDate;
            if (!payload.notes) delete (payload as any).notes;

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
                    <div className="max-w-2xl mx-auto space-y-6">
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
                <div className="max-w-2xl mx-auto space-y-6">
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
                            <p className="text-muted-foreground">Assign an employee to a position</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">

                            {/* Employee ID Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Employee ID <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.employeeProfileId}
                                    onChange={(e) => setFormData({ ...formData, employeeProfileId: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                                    placeholder="Enter Employee System ID (e.g., 60d5ec...)"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Enter the unique system ID of the employee.</p>
                            </div>

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
                                <p className="text-xs text-muted-foreground">Select the position to assign the employee to.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        End Date (Optional)
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
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                                    placeholder="Optional notes regarding this assignment..."
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <Link
                                    href="/dashboard/system-admin/organization-structure"
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={saving}
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
        </RoleGuard>
    );
}
