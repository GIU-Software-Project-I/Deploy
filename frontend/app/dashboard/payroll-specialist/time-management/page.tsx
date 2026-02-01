'use client';

import { useState, useEffect, useCallback } from 'react';
import { timeManagementService, TimeException } from '@/app/services/time-management';

const TIME_EXCEPTION_TYPES = [
  { value: 'MISSED_PUNCH', label: 'Missed Punch' },
  { value: 'LATE', label: 'Late Arrival' },
  { value: 'EARLY_LEAVE', label: 'Early Leave' },
  { value: 'SHORT_TIME', label: 'Short Work Time' },
  { value: 'OVERTIME_REQUEST', label: 'Overtime Request' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manual Adjustment' },
];

const TIME_EXCEPTION_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function PayrollTimeManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<TimeException[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch time exceptions
  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await timeManagementService.getAllTimeExceptions();
      console.log('[PayrollTimeManagement] Response:', response);

      if (response.data && Array.isArray(response.data)) {
        setExceptions(response.data);
      } else if (Array.isArray(response)) {
        setExceptions(response);
      }
    } catch (err) {
      console.error('[PayrollTimeManagement] Error fetching:', err);
      setError('Failed to load time exceptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      setError(null);

      const result = await timeManagementService.exportTimeExceptionsCSV();

      if (result.success) {
        setSuccess('Time exceptions exported to CSV successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to export CSV');
      }
    } catch (err) {
      console.error('[PayrollTimeManagement] Export CSV failed:', err);
      setError('Failed to export time exceptions to CSV');
    } finally {
      setExporting(false);
    }
  };

  // Export to JSON
  const handleExportJSON = async () => {
    try {
      setExporting(true);
      setError(null);

      const result = await timeManagementService.exportTimeExceptionsJSON();

      if (result.success) {
        setSuccess('Time exceptions exported to JSON successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to export JSON');
      }
    } catch (err) {
      console.error('[PayrollTimeManagement] Export JSON failed:', err);
      setError('Failed to export time exceptions to JSON');
    } finally {
      setExporting(false);
    }
  };

  // Get filtered exceptions
  const filteredExceptions = exceptions.filter((ex) => {
    const matchesStatus = !filterStatus || ex.status === filterStatus;
    const matchesType = !filterType || ex.type === filterType;
    const matchesSearch = !searchTerm ||
      ex._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.reason && ex.reason.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesType && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredExceptions.length / itemsPerPage);
  const paginatedExceptions = filteredExceptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType, searchTerm]);

  // Get stats for summary cards
  const stats = {
    total: exceptions.length,
    open: exceptions.filter(e => e.status === 'OPEN').length,
    pending: exceptions.filter(e => e.status === 'PENDING').length,
    approved: exceptions.filter(e => e.status === 'APPROVED').length,
    rejected: exceptions.filter(e => e.status === 'REJECTED').length,
    resolved: exceptions.filter(e => e.status === 'RESOLVED').length,
    overtime: exceptions.filter(e => e.type === 'OVERTIME_REQUEST').length,
    shortTime: exceptions.filter(e => e.type === 'SHORT_TIME').length,
  };

  const getExceptionTypeLabel = (type: string) => {
    return TIME_EXCEPTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success/15 text-success border border-success/30';
      case 'REJECTED':
        return 'bg-destructive/15 text-destructive border border-destructive/30';
      case 'PENDING':
        return 'bg-warning/15 text-warning border border-warning/30';
      case 'OPEN':
        return 'bg-primary/15 text-primary border border-primary/30';
      case 'ESCALATED':
        return 'bg-info/15 text-info border border-info/30';
      case 'RESOLVED':
        return 'bg-accent/15 text-accent border border-accent/30';
      default:
        return 'bg-muted/50 text-muted-foreground border border-border';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'OVERTIME_REQUEST':
        return 'bg-primary/15 text-primary border border-primary/30';
      case 'SHORT_TIME':
        return 'bg-warning/15 text-warning border border-warning/30';
      case 'LATE':
        return 'bg-destructive/15 text-destructive border border-destructive/30';
      case 'EARLY_LEAVE':
        return 'bg-info/15 text-info border border-info/30';
      case 'MISSED_PUNCH':
        return 'bg-destructive/15 text-destructive border border-destructive/30';
      case 'MANUAL_ADJUSTMENT':
        return 'bg-success/15 text-success border border-success/30';
      default:
        return 'bg-muted/50 text-muted-foreground border border-border';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border"></div>
              ))}
            </div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Time Exceptions & Attendance Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              View and export overtime and exception attendance reports for payroll and compliance
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchExceptions}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/30">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-success/10 p-4 text-success border border-success/30">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Open</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.open}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-warning mt-1">{stats.pending}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-success mt-1">{stats.approved}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rejected</p>
            <p className="text-2xl font-bold text-destructive mt-1">{stats.rejected}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Resolved</p>
            <p className="text-2xl font-bold text-accent mt-1">{stats.resolved}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Overtime</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.overtime}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Short Time</p>
            <p className="text-2xl font-bold text-warning mt-1">{stats.shortTime}</p>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Export Reports</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Export all time exception records for payroll processing and compliance audits.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportCSV}
              disabled={exporting || exceptions.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-success text-success-foreground font-medium rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Export to CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={exporting || exceptions.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Export to JSON
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Filter Exceptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ID, employee, or reason..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                {TIME_EXCEPTION_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Types</option>
                {TIME_EXCEPTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredExceptions.length} of {exceptions.length} exceptions
          </div>
        </div>

        {/* Exceptions Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No time exceptions found</p>
                        {(filterStatus || filterType || searchTerm) && (
                          <button
                            onClick={() => {
                              setFilterStatus('');
                              setFilterType('');
                              setSearchTerm('');
                            }}
                            className="text-primary hover:underline text-sm"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedExceptions.map((exception) => (
                    <tr key={exception._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-foreground">
                        {exception._id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {exception.employeeId.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(exception.type)}`}>
                          {getExceptionTypeLabel(exception.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exception.status)}`}>
                          {exception.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                        {exception.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(exception.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-border text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-border text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

