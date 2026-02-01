'use client';

import { useState, useEffect } from 'react';
import { employeeProfileService } from '@/app/services/employee-profile';
import { timeManagementService, AttendanceCorrectionRequest, AttendanceRecord } from '@/app/services/time-management';
import { GlassCard } from '@/components/ui/glass-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';

export default function CorrectionRequestsPage() {
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [viewRequest, setViewRequest] = useState<AttendanceCorrectionRequest | null>(null);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [selectedRecordId, setSelectedRecordId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [correctedDate, setCorrectedDate] = useState('');
    const [correctedTime, setCorrectedTime] = useState('');

    const [activeTab, setActiveTab] = useState("profile");
    const [profileRequests, setProfileRequests] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const profileRes = await employeeProfileService.getMyProfile();
                const empId = (profileRes.data as any)._id;
                setEmployeeId(empId);

                // Fetch Attendance Corrections
                const attendanceRes = await timeManagementService.getEmployeeCorrections(empId);
                setRequests(attendanceRes.data || []);

                // Fetch Profile Corrections
                // Fetch Profile Corrections
                const profileReqRes = await employeeProfileService.getMyCorrectionRequests(empId);
                const profileData = profileReqRes.data;
                if (Array.isArray(profileData)) {
                    setProfileRequests(profileData);
                } else if (profileData && typeof profileData === 'object') {
                    // Handle paginated response { data: [...] } or { items: [...] }
                    if (Array.isArray((profileData as any).data)) {
                        setProfileRequests((profileData as any).data);
                    } else if (Array.isArray((profileData as any).items)) {
                        setProfileRequests((profileData as any).items);
                    } else {
                        setProfileRequests([]);
                    }
                } else {
                    setProfileRequests([]);
                }

                // Fetch Attendance Records for dropdown
                const now = new Date();
                const recordsRes = await timeManagementService.getMonthlyAttendance(empId, now.getMonth() + 1, now.getFullYear());
                setAttendanceRecords(recordsRes.data || []);

            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Failed to load requests");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId || !selectedRecordId || !reason || !correctedDate || !correctedTime) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            setSubmitting(true);
            // Format date to dd/MM/yyyy as required by backend
            const dateObj = new Date(correctedDate);
            const formattedDate = format(dateObj, 'dd/MM/yyyy');

            await timeManagementService.requestAttendanceCorrection({
                employeeId,
                attendanceRecordId: selectedRecordId,
                reason,
                correctedPunchDate: formattedDate,
                correctedPunchLocalTime: correctedTime
            });

            toast.success("Correction request submitted successfully");

            // Refresh requests
            const requestsRes = await timeManagementService.getEmployeeCorrections(employeeId);
            setRequests(requestsRes.data || []);

            setIsDialogOpen(false);
            // Reset form
            setSelectedRecordId('');
            setReason('');
            setCorrectedDate('');
            setCorrectedTime('');

        } catch (error: any) {
            console.error("Failed to submit request", error);
            toast.error(error.response?.data?.message || "Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-success/15 text-success hover:bg-success/25 border-success/20">Approved</Badge>;
            case 'REJECTED': return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20">Rejected</Badge>;
            case 'SUBMITTED': return <Badge className="bg-warning/15 text-warning hover:bg-warning/25 border-warning/20">Submitted</Badge>;
            case 'IN_REVIEW': return <Badge className="bg-primary/15 text-primary hover:bg-primary/25 border-primary/20">In Review</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center">Loading...</div>;
    }

    return (
        <div className="space-y-6 lg:space-y-8 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">Correction Requests</h1>
                    <p className="text-muted-foreground mt-1">Manage your profile and attendance correction requests.</p>
                </div>
                {activeTab === 'attendance' && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl shadow-lg shadow-primary/20">
                                + New Attendance Request
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Submit Correction Request</DialogTitle>
                                <DialogDescription>
                                    Request a correction for an incorrect or missing punch.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="record">Attendance Record</Label>
                                    <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a date" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {attendanceRecords.map((record) => {
                                                const dateStr = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Unknown Date';
                                                const punches = record.punches || [];
                                                const punchesStr = punches.map(p => `${p.type} ${new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`).join(', ');

                                                return (
                                                    <SelectItem key={record._id} value={record._id}>
                                                        {dateStr} - {punchesStr || 'No Punches'}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Corrected Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={correctedDate}
                                            onChange={(e) => setCorrectedDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time">Corrected Time</Label>
                                        <Input
                                            id="time"
                                            type="time"
                                            value={correctedTime}
                                            onChange={(e) => setCorrectedTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="Explain why this correction is needed..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                    />
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
                {activeTab === 'profile' && (
                    <Link href="/dashboard/department-employee/employee-profile/edit">
                        <Button className="rounded-xl shadow-lg shadow-primary/20">
                            + New Profile Correction
                        </Button>
                    </Link>
                )}
            </div>

            <Tabs defaultValue="profile" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="profile">Profile Data</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle>Profile Data Corrections</CardTitle>
                            <CardDescription>Requests to change your personal or employment details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profileRequests.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No profile correction requests found.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Date Requested</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {profileRequests.map((req) => (
                                                <TableRow key={req._id} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="font-medium">
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                    </TableCell>
                                                    <TableCell className="max-w-[300px] truncate text-muted-foreground" title={req.requestDescription}>
                                                        {req.requestDescription || "No description"}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                <TabsContent value="attendance" className="mt-6">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle>Attendance Correction History</CardTitle>
                            <CardDescription>View the status of your submitted attendance requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {requests.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No attendance correction requests found.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Date Created</TableHead>
                                                <TableHead>Attendance Date</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requests.map((req) => (
                                                <TableRow key={req._id} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="font-medium">
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {typeof req.attendanceRecord === 'string'
                                                            ? <span className="text-muted-foreground text-xs">{req.attendanceRecord.substring(0, 8)}...</span>
                                                            : (req.attendanceRecord as any)?.createdAt ? new Date((req.attendanceRecord as any).createdAt).toLocaleDateString() : 'N/A'
                                                        }
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={req.reason}>
                                                        {req.reason}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => setViewRequest(req)}>
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </GlassCard>
                </TabsContent>
            </Tabs>

            {/* View Request Details Dialog */}
            <Dialog open={!!viewRequest} onOpenChange={(open) => !open && setViewRequest(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                        <DialogDescription>
                            Review the details of your correction request.
                        </DialogDescription>
                    </DialogHeader>
                    {viewRequest && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500 uppercase">Status</Label>
                                    <div className="mt-1">{getStatusBadge(viewRequest.status)}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500 uppercase">Created At</Label>
                                    <div className="text-sm font-medium mt-1">
                                        {viewRequest.createdAt ? new Date(viewRequest.createdAt).toLocaleString() : '-'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500 uppercase">Attendance Record</Label>
                                <div className="text-sm font-medium mt-1 p-2 bg-slate-50 rounded border border-slate-100">
                                    {typeof viewRequest.attendanceRecord === 'string'
                                        ? viewRequest.attendanceRecord
                                        : (viewRequest.attendanceRecord as any)?.createdAt
                                            ? new Date((viewRequest.attendanceRecord as any).createdAt).toLocaleDateString()
                                            : 'ID: ' + (viewRequest.attendanceRecord as any)?._id
                                    }
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500 uppercase">Reason</Label>
                                <div className="text-sm mt-1 p-3 bg-slate-50 rounded border border-slate-100 whitespace-pre-wrap">
                                    {viewRequest.reason}
                                </div>
                            </div>

                            {(viewRequest as any).reviewerId && (
                                <div className="border-t pt-4 mt-4">
                                    <Label className="text-xs text-slate-500 uppercase">Reviewer Note</Label>
                                    <div className="text-sm mt-1">
                                        {(viewRequest as any).reviewNote || <span className="text-slate-400 italic">No notes provided.</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewRequest(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
