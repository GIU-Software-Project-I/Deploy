'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  timeManagementService,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  CorrectionRequestStatus,
  PunchType,
  CorrectAttendanceDto,
} from '@/app/services/time-management';
import { employeeProfileService } from '@/app/services/employee-profile';
import { useAuth } from '@/context/AuthContext';
import { Users, Clock, CheckCircle, AlertCircle, FileText, Calendar, ChevronLeft, Loader2, Plus, History, ClipboardCheck, X, Check } from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  employeeNumber?: string;
  jobTitle?: string;
  primaryDepartmentId?: {
    name: string;
  };
}

export default function AttendanceRecordsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Data state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [pastCorrections, setPastCorrections] = useState<AttendanceCorrectionRequest[]>([]);

  // Modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [correctionForm, setCorrectionForm] = useState<{
    action: 'addPunchIn' | 'addPunchOut' | 'replacePunches';
    punchInDate: string;
    punchInTime: string;
    punchOutDate: string;
    punchOutTime: string;
    reason: string;
  }>({
    action: 'addPunchOut',
    punchInDate: '',
    punchInTime: '',
    punchOutDate: '',
    punchOutTime: '',
    reason: '',
  });

  // Review correction modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'records' | 'corrections' | 'history' | 'create'>('records');

  // Create attendance record state
  const [createForm, setCreateForm] = useState<{
    employeeId: string;
    punchInDate: string;
    punchInTime: string;
    punchOutDate: string;
    punchOutTime: string;
    reason: string;
  }>({
    employeeId: '',
    punchInDate: '',
    punchInTime: '',
    punchOutDate: '',
    punchOutTime: '',
    reason: '',
  });

  // Fetch team members on mount
  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoadingTeam(true);
      const response = await employeeProfileService.getTeamProfiles();
      if (response.data && Array.isArray(response.data)) {
        setTeamMembers(response.data as TeamMember[]);
        // Auto-select first team member if available
        if (response.data.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId((response.data[0] as TeamMember)._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  const fetchAttendanceRecords = useCallback(async () => {
    if (!selectedEmployeeId) {
      setAttendanceRecords([]);
      return;
    }

    try {
      const response = await timeManagementService.getMonthlyAttendance(
        selectedEmployeeId,
        selectedMonth,
        selectedYear
      );

      if (response.data) {
        setAttendanceRecords(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: any) {
      console.error('Failed to fetch attendance records:', err);
    }
  }, [selectedEmployeeId, selectedMonth, selectedYear]);

  const fetchPendingCorrections = useCallback(async () => {
    try {
      const response = await timeManagementService.getAllCorrections();

      if (response.data) {
        const allCorrections = Array.isArray(response.data) ? response.data : [];
        // Filter pending (SUBMITTED, IN_REVIEW)
        const pending = allCorrections.filter(
          (c) => c.status === CorrectionRequestStatus.SUBMITTED || c.status === CorrectionRequestStatus.IN_REVIEW
        );
        // Filter past (APPROVED, REJECTED)
        const past = allCorrections.filter(
          (c) => c.status === CorrectionRequestStatus.APPROVED || c.status === CorrectionRequestStatus.REJECTED
        );
        setPendingCorrections(pending);
        setPastCorrections(past);
      }
    } catch (err: any) {
      console.error('Failed to fetch corrections:', err);
    }
  }, []);

  // Helper function to generate date options (last 30 days)
  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${day}/${month}/${year}`;
      options.push(dateStr);
    }
    return options;
  };

  // Helper function to generate time options (15-minute intervals)
  const getTimeOptions = () => {
    const options = [];
    for (let hours = 0; hours < 24; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 15) {
        const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAttendanceRecords(),
        fetchPendingCorrections(),
      ]);
      setLoading(false);
    };

    if (selectedEmployeeId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [fetchAttendanceRecords, fetchPendingCorrections, selectedEmployeeId]);

  const handleCorrectAttendance = async () => {
    if (!selectedRecord) return;

    if (!correctionForm.reason.trim()) {
      setError('Correction reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dto: CorrectAttendanceDto = {
        attendanceRecordId: selectedRecord._id,
        correctionReason: correctionForm.reason,
        correctedBy: user?.id,
      };

      // Helper function to convert date and time to ISO string
      const convertToISO = (dateStr: string, timeStr: string): string => {
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = timeStr.split(':');
        const dateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        return dateTime.toISOString();
      };

      if (correctionForm.action === 'addPunchIn' && correctionForm.punchInDate && correctionForm.punchInTime) {
        dto.addPunchIn = convertToISO(correctionForm.punchInDate, correctionForm.punchInTime);
      } else if (correctionForm.action === 'addPunchOut' && correctionForm.punchOutDate && correctionForm.punchOutTime) {
        dto.addPunchOut = convertToISO(correctionForm.punchOutDate, correctionForm.punchOutTime);
      } else if (correctionForm.action === 'replacePunches') {
        const punches: { type: PunchType; time: string }[] = [];
        if (correctionForm.punchInDate && correctionForm.punchInTime) {
          punches.push({ type: PunchType.IN, time: convertToISO(correctionForm.punchInDate, correctionForm.punchInTime) });
        }
        if (correctionForm.punchOutDate && correctionForm.punchOutTime) {
          punches.push({ type: PunchType.OUT, time: convertToISO(correctionForm.punchOutDate, correctionForm.punchOutTime) });
        }
        if (punches.length > 0) {
          dto.correctedPunches = punches;
        }
      }

      const response = await timeManagementService.correctAttendanceRecord(dto);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Attendance record corrected successfully');
      setShowCorrectionModal(false);
      setSelectedRecord(null);
      setCorrectionForm({
        action: 'addPunchOut',
        punchInDate: '',
        punchInTime: '',
        punchOutDate: '',
        punchOutTime: '',
        reason: '',
      });
      await fetchAttendanceRecords();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to correct attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewCorrection = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedCorrection || !user?.id) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.reviewCorrectionRequest({
        correctionRequestId: selectedCorrection._id,
        reviewerId: user.id,
        action,
        note: reviewNote,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Correction request ${action.toLowerCase()}d successfully`);
      setShowReviewModal(false);
      setSelectedCorrection(null);
      setReviewNote('');
      await fetchPendingCorrections();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} correction request`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAttendanceRecord = async () => {
    if (!createForm.employeeId) {
      setError('Please select an employee');
      return;
    }

    if (!createForm.punchInDate || !createForm.punchInTime || !createForm.punchOutDate || !createForm.punchOutTime) {
      setError('Both punch in and punch out date/time are required');
      return;
    }

    if (!createForm.reason.trim()) {
      setError('Reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Helper function to convert date and time to ISO string
      const convertToISO = (dateStr: string, timeStr: string): string => {
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = timeStr.split(':');
        const dateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        return dateTime.toISOString();
      };

      const dto = {
        employeeId: createForm.employeeId,
        punches: [
          { type: PunchType.IN, time: convertToISO(createForm.punchInDate, createForm.punchInTime) },
          { type: PunchType.OUT, time: convertToISO(createForm.punchOutDate, createForm.punchOutTime) }
        ],
        createdBy: user?.id,
        reason: createForm.reason,
      };

      const response = await timeManagementService.createAttendanceRecord(dto);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Attendance record created successfully');
      setCreateForm({
        employeeId: '',
        punchInDate: '',
        punchInTime: '',
        punchOutDate: '',
        punchOutTime: '',
        reason: '',
      });
      await fetchAttendanceRecords();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getStatusBadgeColor = (status: CorrectionRequestStatus) => {
    switch (status) {
      case CorrectionRequestStatus.SUBMITTED:
        return 'bg-info/10 text-info border-info/30';
      case CorrectionRequestStatus.IN_REVIEW:
        return 'bg-warning/10 text-warning border-warning/30';
      case CorrectionRequestStatus.APPROVED:
        return 'bg-success/10 text-success border-success/30';
      case CorrectionRequestStatus.REJECTED:
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRecordDate = (record: AttendanceRecord) => {
    if (record.punches && record.punches.length > 0) {
      return formatDate(record.punches[0].time);
    }
    // If no punches, try to use createdAt timestamp
    if ((record as any).createdAt) {
      return formatDate((record as any).createdAt);
    }
    return 'N/A';
  };

  const formatWorkTime = (minutes: number | undefined): string => {
    if (minutes === undefined || isNaN(minutes) || !Number.isFinite(minutes)) {
      return '0h 0m';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEmployeeName = (employeeId: string) => {
    const member = teamMembers.find(m => m._id === employeeId);
    if (member) {
      return member.fullName || `${member.firstName} ${member.lastName}`;
    }
    return employeeId;
  };

  const selectedEmployee = teamMembers.find(m => m._id === selectedEmployeeId);

  if (loadingTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/dashboard/department-head" className="hover:text-foreground transition-colors flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                Department Head
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Time Management</span>
            </div>
            <h1 className="text-3xl font-semibold text-foreground">Attendance Management</h1>
            <p className="text-muted-foreground mt-1">
              View, record, and correct attendance records for your team
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-success font-medium">{success}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-semibold text-foreground">{teamMembers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Records This Month</p>
                <p className="text-3xl font-semibold text-foreground">{attendanceRecords.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Corrections</p>
                <p className="text-3xl font-semibold text-foreground">{pendingCorrections.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-3xl font-semibold text-foreground">{pastCorrections.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'records'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            Attendance Records
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Record
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'corrections'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Corrections
            {pendingCorrections.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingCorrections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {/* Attendance Records Tab */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            {/* Employee Selection & Filters */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">Select Team Member</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a team member...</option>
                    {teamMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.fullName || `${member.firstName} ${member.lastName}`}
                        {member.employeeNumber && ` (${member.employeeNumber})`}
                        {member.jobTitle && ` - ${member.jobTitle}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2025, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Employee Info */}
              {selectedEmployee && (
                <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                      {selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedEmployee.fullName || `${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee.jobTitle || 'No title'} • {selectedEmployee.primaryDepartmentId?.name || 'No department'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Records List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-semibold text-foreground">
                  Attendance Records
                  {attendanceRecords.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({attendanceRecords.length} records)
                    </span>
                  )}
                </h2>
              </div>

              {!selectedEmployeeId ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Select a team member to view their attendance records.</p>
                </div>
              ) : loading ? (
                <div className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading records...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No attendance records found for the selected period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-4 px-6 font-medium text-foreground">Date</th>
                        <th className="text-left py-4 px-6 font-medium text-foreground">Punches</th>
                        <th className="text-left py-4 px-6 font-medium text-foreground">Work Time</th>
                        <th className="text-left py-4 px-6 font-medium text-foreground">Status</th>
                        <th className="text-right py-4 px-6 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendanceRecords.map((record) => (
                        <tr key={record._id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-medium text-foreground">{getRecordDate(record)}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-2">
                              {record.punches && record.punches.length > 0 ? (
                                record.punches.map((punch, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs px-2 py-1 rounded-full border ${
                                      punch.type === PunchType.IN
                                        ? 'bg-success/10 text-success border-success/30'
                                        : 'bg-destructive/10 text-destructive border-destructive/30'
                                    }`}
                                  >
                                    {punch.type}: {formatTime(punch.time)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">No punches</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-foreground font-medium">
                              {formatWorkTime(record.totalWorkMinutes)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-2">
                              {record.hasMissedPunch && (
                                <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning border border-warning/30">
                                  Missing Punch
                                </span>
                              )}
                              {record.finalisedForPayroll ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success border border-success/30">
                                  Finalized
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowCorrectionModal(true);
                              }}
                              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Correct
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Record Tab */}
        {activeTab === 'create' && (
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl">
            <h2 className="font-semibold text-foreground mb-6">Create New Attendance Record</h2>

            <div className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Employee *
                </label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a team member...</option>
                  {teamMembers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.fullName || `${member.firstName} ${member.lastName}`}
                      {member.employeeNumber && ` (${member.employeeNumber})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Punch In Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Punch In Date *
                  </label>
                  <select
                    value={createForm.punchInDate}
                    onChange={(e) => setCreateForm({ ...createForm, punchInDate: e.target.value })}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select date</option>
                    {getDateOptions().map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Punch In Time *
                  </label>
                  <select
                    value={createForm.punchInTime}
                    onChange={(e) => setCreateForm({ ...createForm, punchInTime: e.target.value })}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select time</option>
                    {getTimeOptions().map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Punch Out Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Punch Out Date *
                  </label>
                  <select
                    value={createForm.punchOutDate}
                    onChange={(e) => setCreateForm({ ...createForm, punchOutDate: e.target.value })}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select date</option>
                    {getDateOptions().map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Punch Out Time *
                  </label>
                  <select
                    value={createForm.punchOutTime}
                    onChange={(e) => setCreateForm({ ...createForm, punchOutTime: e.target.value })}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select time</option>
                    {getTimeOptions().map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason for Manual Entry *
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Enter the reason for manually creating this attendance record"
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateAttendanceRecord}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Attendance Record'}
                </button>
                <button
                  onClick={() => setCreateForm({
                    employeeId: '',
                    punchInDate: '',
                    punchInTime: '',
                    punchOutDate: '',
                    punchOutTime: '',
                    reason: '',
                  })}
                  className="px-4 py-3 border border-border text-foreground font-medium rounded-xl hover:bg-muted/50 transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-xl">
                <p className="text-sm text-info">
                  <strong>Note:</strong> You can manually create attendance records for team members when system records are missing or incorrect.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Correction Requests Tab */}
        {activeTab === 'corrections' && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold text-foreground">Pending Correction Requests</h2>
              <p className="text-sm text-muted-foreground mt-1">Review and approve or reject attendance correction requests</p>
            </div>

            {pendingCorrections.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No pending correction requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingCorrections.map((correction) => (
                  <div key={correction._id} className="p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-foreground">
                            {getEmployeeName(correction.employeeId)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadgeColor(correction.status)}`}>
                            {correction.status}
                          </span>
                        </div>
                        {correction.reason && (
                          <p className="text-sm text-muted-foreground mb-1">
                            <span className="font-medium">Reason:</span> {correction.reason}
                          </p>
                        )}
                        {correction.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            Submitted: {formatDateTime(correction.createdAt)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCorrection(correction);
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Correction History Tab */}
        {activeTab === 'history' && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold text-foreground">Correction History</h2>
              <p className="text-sm text-muted-foreground mt-1">Previously processed correction requests</p>
            </div>

            {pastCorrections.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No correction history found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pastCorrections.map((correction) => (
                  <div key={correction._id} className="p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-foreground">
                        {getEmployeeName(correction.employeeId)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadgeColor(correction.status)}`}>
                        {correction.status}
                      </span>
                    </div>
                    {correction.reason && (
                      <p className="text-sm text-muted-foreground mb-1">
                        <span className="font-medium">Reason:</span> {correction.reason}
                      </p>
                    )}
                    {correction.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        Submitted: {formatDateTime(correction.createdAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Correction Modal */}
        {showCorrectionModal && selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Correct Attendance Record</h2>
                <button
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setSelectedRecord(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current punches */}
              <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border">
                <p className="text-sm font-medium text-foreground mb-2">Current Punches:</p>
                {selectedRecord.punches && selectedRecord.punches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.punches.map((punch, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          punch.type === PunchType.IN
                            ? 'bg-success/10 text-success border-success/30'
                            : 'bg-destructive/10 text-destructive border-destructive/30'
                        }`}
                      >
                        {punch.type}: {formatDateTime(punch.time)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No punches recorded</p>
                )}
              </div>

              <div className="space-y-4">
                {/* Correction action */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Correction Type</label>
                  <select
                    value={correctionForm.action}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, action: e.target.value as any })}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="addPunchIn">Add Missing Punch In</option>
                    <option value="addPunchOut">Add Missing Punch Out</option>
                    <option value="replacePunches">Replace All Punches</option>
                  </select>
                </div>

                {/* Punch In Time - Date and Time Dropdowns */}
                {(correctionForm.action === 'addPunchIn' || correctionForm.action === 'replacePunches') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch In Date
                      </label>
                      <select
                        value={correctionForm.punchInDate}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchInDate: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select date</option>
                        {getDateOptions().map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch In Time
                      </label>
                      <select
                        value={correctionForm.punchInTime}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchInTime: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select time</option>
                        {getTimeOptions().map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Punch Out Time - Date and Time Dropdowns */}
                {(correctionForm.action === 'addPunchOut' || correctionForm.action === 'replacePunches') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch Out Date
                      </label>
                      <select
                        value={correctionForm.punchOutDate}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchOutDate: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select date</option>
                        {getDateOptions().map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch Out Time
                      </label>
                      <select
                        value={correctionForm.punchOutTime}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchOutTime: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select time</option>
                        {getTimeOptions().map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Correction Reason *
                  </label>
                  <textarea
                    value={correctionForm.reason}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                    placeholder="Enter the reason for this correction"
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCorrectAttendance}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Applying...' : 'Apply Correction'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCorrectionModal(false);
                      setSelectedRecord(null);
                    }}
                    className="px-4 py-3 border border-border text-foreground font-medium rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Correction Modal */}
        {showReviewModal && selectedCorrection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border p-6 max-w-lg w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Review Correction Request</h2>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedCorrection(null);
                    setReviewNote('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-semibold text-foreground">{getEmployeeName(selectedCorrection.employeeId)}</p>
                </div>

                {selectedCorrection.reason && (
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium text-foreground">{selectedCorrection.reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Review Note (Optional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add a note for this review"
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleReviewCorrection('APPROVE')}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-success text-white font-medium rounded-xl hover:bg-success/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {submitting ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReviewCorrection('REJECT')}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-destructive text-white font-medium rounded-xl hover:bg-destructive/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    {submitting ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedCorrection(null);
                      setReviewNote('');
                    }}
                    className="px-4 py-3 border border-border text-foreground font-medium rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

