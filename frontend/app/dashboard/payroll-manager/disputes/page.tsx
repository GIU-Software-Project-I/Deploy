'use client';

import { useState, useEffect } from 'react';
import { payrollManagerService, DisputeConfirmation } from '@/app/services/payroll-manager';
import { useAuth } from '@/context/AuthContext';
import { SystemRole } from '@/types';

export default function PayrollManagerDisputesPage() {
  const { user } = useAuth();
  const allowedRoles = [SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = !!user && allowedRoles.includes(user.role);
  const [allDisputes, setAllDisputes] = useState<DisputeConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeConfirmation | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'reject'>('approve');
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!hasAccess) return;
    loadDisputes();
  }, [user, hasAccess]);

  const loadDisputes = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Fetch all disputes: pending, approved, and rejected
      const response = await payrollManagerService.getAllDisputes().catch(() => ({ data: [], error: null }));
      
      const allDisputesData = (response.data && Array.isArray(response.data)) ? response.data : [];
      
      setAllDisputes(allDisputesData);
      
      if (response.error) {
        console.error('Error fetching disputes:', response.error);
      }
    } catch (err) {
      console.error('Error loading disputes:', err);
      setError('Failed to load disputes. Please try again.');
      setAllDisputes([]);
    } finally {
      setLoading(false);
    }
  };
      
  const openConfirmModal = (dispute: DisputeConfirmation, action: 'approve' | 'reject') => {
    setSelectedDispute(dispute);
    setConfirmationAction(action);
    setConfirmationNotes('');
    setShowConfirmModal(true);
  };

  const handleConfirmation = async () => {
    if (!selectedDispute || !user?.id) {
      setError('Missing dispute or user information');
      return;
    }
    try {
      const response = await payrollManagerService.confirmDispute({
        disputeId: selectedDispute.id,
        confirmed: confirmationAction === 'approve',
        notes: confirmationNotes,
      }, user.id);
      if (response.error) {
        setError(`Failed to ${confirmationAction} dispute: ${response.error}`);
        return;
      }
      if (response.data) {
        setSuccessMessage(`Dispute ${confirmationAction === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowConfirmModal(false);
        setSelectedDispute(null);
        setConfirmationNotes('');
        await loadDisputes();
      }
    } catch (error) {
      setError(`Failed to ${confirmationAction} dispute. Please try again.`);
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending payroll Manager approval': return 'bg-warning/15 text-warning border border-warning/30';
      case 'approved': return 'bg-success/15 text-success border border-success/30';
      case 'rejected': return 'bg-destructive/15 text-destructive border border-destructive/30';
      default: return 'bg-muted/50 text-muted-foreground border border-border';
    }
  };

  const filterDisputes = () => {
    if (statusFilter === 'all') {
      // Show only disputes that are pending manager approval (accepted by specialist)
      return allDisputes.filter(d => {
        const s = (d.status || '').toLowerCase();
        return s.includes('pending') && s.includes('manager') && s.includes('approval');
      });
    }
    if (statusFilter === 'approved') {
      return allDisputes.filter(d => d.status?.toLowerCase() === 'approved' || d.status?.toLowerCase() === 'confirmed');
    }
    if (statusFilter === 'rejected') {
      return allDisputes.filter(d => d.status?.toLowerCase() === 'rejected');
    }
    return [];
  };

  const disputes = filterDisputes();



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive/15 text-destructive border border-destructive/30';
      case 'high': return 'bg-warning/15 text-warning border border-warning/30';
      case 'medium': return 'bg-info/15 text-info border border-info/30';
      case 'low': return 'bg-success/15 text-success border border-success/30';
      default: return 'bg-muted/50 text-muted-foreground border border-border';
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Payroll Manager role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disputes Approval</h1>
          <p className="text-muted-foreground mt-1">Disputes approved by Payroll Specialists awaiting your confirmation</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-success/10 border border-success rounded-lg p-4">
          <p className="text-success text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
            statusFilter === 'all'
              ? 'bg-warning text-warning-foreground hover:bg-warning/90'
              : 'bg-card border-2 border-border text-foreground hover:bg-muted hover:border-warning'
          }`}
        >
          All Claims/Disputes
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
            statusFilter === 'approved'
              ? 'bg-success text-success-foreground hover:bg-success/90'
              : 'bg-card border-2 border-border text-foreground hover:bg-muted hover:border-success'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
            statusFilter === 'rejected'
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-card border-2 border-border text-foreground hover:bg-muted hover:border-destructive'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Disputes List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {statusFilter === 'all'
              ? `Pending Disputes (${disputes.length})`
              : statusFilter === 'approved'
              ? `Approved Disputes (${disputes.length})`
              : `Rejected Disputes (${disputes.length})`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter === 'all'
              ? 'Disputes accepted by specialist, awaiting your approval'
              : statusFilter === 'approved'
              ? 'Disputes that have been approved'
              : 'Disputes that have been rejected'}
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-2">Loading disputes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Specialist Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Manager Comments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {disputes.map((dispute, index) => (
                  <tr key={`dispute-${dispute.id || dispute.employeeNumber || index}-${index}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">{dispute.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{dispute.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-xs truncate">
                        {dispute.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {dispute.amount ? `$${dispute.amount.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-xs">
                        {dispute.specialistNotes ? (
                          <span className="text-foreground">{dispute.specialistNotes}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No comment</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-xs">
                        {dispute.managerNotes ? (
                          <span className="text-foreground">{dispute.managerNotes}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No comment</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {dispute.status?.toLowerCase().includes('pending') ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openConfirmModal(dispute, 'approve')}
                            className="text-success hover:text-success/80"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openConfirmModal(dispute, 'reject')}
                            className="text-destructive hover:text-destructive/80"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disputes.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                {statusFilter === 'all'
                  ? 'No disputes pending your approval'
                  : statusFilter === 'approved'
                  ? 'No approved disputes found'
                  : 'No rejected disputes found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {confirmationAction === 'approve' ? 'Approve' : 'Reject'} Dispute
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Dispute</label>
                <p className="text-slate-900">{selectedDispute.description}</p>
                <p className="text-sm text-slate-600">{selectedDispute.employeeName}</p>
                <p className="text-sm text-slate-600">Amount: {selectedDispute.amount ? `$${selectedDispute.amount.toLocaleString()}` : 'N/A'}</p>
              </div>
              {selectedDispute.specialistNotes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Specialist Comment</label>
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {selectedDispute.specialistNotes}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add your notes..."
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedDispute(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmation}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmationAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmationAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
