'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/context/AuthContext';
import type { LeaveType } from '@/types/leaves';

interface BackendLeaveRequest {
  _id: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  dates: {
    from: string | Date;
    to: string | Date;
  };
  durationDays: number;
  justification?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  postLeave?: boolean;
  attachmentId?: string;
}

export default function EditLeaveRequestPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string>('');
  const [canEdit, setCanEdit] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [formData, setFormData] = useState<{
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    postLeave: boolean;
  }>({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    postLeave: false,
  });

  useEffect(() => {
    if (!user || !params?.id) return;
    void fetchInitialData(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params?.id]);

  const fetchInitialData = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [reqRes, typesRes] = await Promise.all([
        leavesService.getRequest(id),
        leavesService.getLeaveTypes(),
      ]);

      if (reqRes.error || !reqRes.data) {
        setError(reqRes.error || 'Leave request not found.');
        return;
      }

      if (typesRes.data && Array.isArray(typesRes.data)) {
        setLeaveTypes(typesRes.data);
      }

      const req = reqRes.data as BackendLeaveRequest;
      const status = (req.status || '').toUpperCase();
      setRequestStatus(status);

      // Check if request can be edited (only PENDING or RETURNED_FOR_CORRECTION)
      const editableStatuses = ['PENDING', 'RETURNED_FOR_CORRECTION'];
      const canBeEdited = editableStatuses.includes(status);
      setCanEdit(canBeEdited);

      if (!canBeEdited) {
        setError(`This leave request cannot be edited because it is ${status}. Only pending or returned-for-correction requests can be modified.`);
      }

      // Resolve leaveTypeId safely
      let leaveTypeId = '';
      if (typeof req.leaveTypeId === 'string') {
        leaveTypeId = req.leaveTypeId;
      } else if (req.leaveTypeId && typeof req.leaveTypeId === 'object') {
        leaveTypeId = (req.leaveTypeId as any)._id || '';
      }

      const fromDate = toDateOnly(req.dates?.from);
      const toDate = toDateOnly(req.dates?.to);

      setFormData({
        leaveTypeId,
        startDate: fromDate,
        endDate: toDate,
        reason: req.justification || '',
        postLeave: !!req.postLeave,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave request';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toDateOnly = (value: string | Date | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : d.toISOString().split('T')[0];
    }
    return value.toISOString().split('T')[0];
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user || !params?.id) {
      setError('Missing user or request id.');
      return;
    }

    if (!canEdit) {
      setError('This leave request cannot be edited.');
      return;
    }

    // Validate form data
    if (!formData.startDate || !formData.endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (!formData.leaveTypeId) {
      setError('Please select a leave type.');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (start > end) {
      setError('Start date must be before or equal to end date.');
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      setError('Please select valid dates.');
      return;
    }

    if (!formData.reason || formData.reason.trim().length === 0) {
      setError('Please provide a reason for your leave request.');
      return;
    }

    try {
      setSaving(true);

      const updateData: any = {
        leaveTypeId: formData.leaveTypeId,
        from: formData.startDate,
        to: formData.endDate,
        durationDays: days,
        justification: formData.reason.trim(),
        postLeave: formData.postLeave,
      };

      const response = await leavesService.updateRequest(params.id, updateData);

      if (response.error) {
        setError(response.error || 'Failed to update leave request');
        return;
      }

      setSuccess('Leave request updated successfully!');

      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push('/portal/my-leaves');
      }, 1500);
    } catch (err) {
      console.error('Update error:', err);
      const message = err instanceof Error ? err.message : 'Failed to update leave request';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !params?.id) {
      setError('Missing user or request id.');
      return;
    }

    // Check if request can be cancelled (PENDING or APPROVED)
    const cancellableStatuses = ['PENDING', 'APPROVED'];
    if (!cancellableStatuses.includes(requestStatus)) {
      setError(`This leave request cannot be cancelled because it is ${requestStatus}. Only pending or approved requests can be cancelled.`);
      return;
    }

    if (!confirm('Are you sure you want to cancel this leave request? This action cannot be undone.')) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await leavesService.cancelRequest(params.id, user.id);

      if (response.error) {
        setError(response.error || 'Failed to cancel leave request');
        return;
      }

      setSuccess('Leave request cancelled successfully!');

      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push('/portal/my-leaves');
      }, 1500);
    } catch (err) {
      console.error('Cancel error:', err);
      const message = err instanceof Error ? err.message : 'Failed to cancel leave request';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const getLeaveTypeColor = (name: string, code: string) => {
    const n = name.toLowerCase();
    const c = code.toLowerCase();
    if (n.includes('annual') || c.includes('annual')) return 'blue';
    if (n.includes('sick') || c.includes('sick')) return 'red';
    if (n.includes('unpaid') || c.includes('unpaid')) return 'gray';
    return 'purple';
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-white rounded-xl shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/portal/my-leaves"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Leaves
            </Link>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Edit Leave Request</h1>
            <p className="text-gray-500 mt-1">Update your leave request details or cancel it.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Success</p>
                <p className="text-sm mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {requestStatus && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Status:</span> {requestStatus}
              {!canEdit && (
                <span className="ml-2 text-blue-600">
                  (This request cannot be edited in its current state)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Edit Form */}
        <form
          onSubmit={handleUpdate}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6"
        >
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {leaveTypes.map((type) => {
                const color = getLeaveTypeColor(type.name, type.code || '');
                const typeId = type.id || (type as any)._id;
                const isSelected = formData.leaveTypeId === typeId;

                return (
                  <button
                    key={typeId}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        leaveTypeId: typeId,
                      }))
                    }
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${isSelected
                        ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>
            {leaveTypes.length === 0 && (
              <p className="text-sm text-gray-500 italic">No leave types available</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                min={formData.startDate || undefined}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration Summary */}
          {formData.startDate && formData.endDate && (
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-gray-600">Total Duration</span>
              <span className="text-lg font-semibold text-gray-900">
                {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Post-leave flag */}
          <div className="flex items-center gap-2">
            <input
              id="post-leave-edit"
              type="checkbox"
              checked={formData.postLeave}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  postLeave: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="post-leave-edit" className="text-sm text-gray-700">
              This is a post-leave request (submitted after the leave was taken)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={saving || !['PENDING', 'APPROVED'].includes(requestStatus)}
              className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Cancelling...' : 'Cancel Request'}
            </button>
            <div className="flex items-center gap-3">
              <Link
                href="/portal/my-leaves"
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={saving || !canEdit}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
