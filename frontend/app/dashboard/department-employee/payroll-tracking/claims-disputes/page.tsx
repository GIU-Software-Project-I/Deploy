'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService, CreateDisputeDto, CreateClaimDto } from '@/app/services/payroll-tracking';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  ArrowLeft,
  History,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Receipt,
  Search,
  Filter,
  CreditCard,
  Briefcase
} from 'lucide-react';

/**
 * Claims & Disputes Page - Department Employee
 * REQ-PY-16: Dispute payroll errors (over-deductions, missing bonuses)
 * REQ-PY-17: Submit expense reimbursement claims
 * REQ-PY-18: Track approval and payment status of claims and disputes
 */

// Response types
interface TrackingData {
  claims: Claim[];
  disputes: Dispute[];
}

interface Dispute {
  id: string;
  _id?: string;
  payslipId: string;
  description: string;
  amount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  reviewNotes?: string;
  resolution?: string;
}

interface Claim {
  id: string;
  _id?: string;
  claimType: string;
  description: string;
  amount: number;
  approvedAmount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  reviewNotes?: string;
}

interface BackendPayslip {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Payslip {
  id: string;
  periodStart: string;
  periodEnd: string;
}

// Map backend payslip to frontend format
function mapPayslipForSelect(backend: BackendPayslip): Payslip {
  const createdDate = backend.createdAt ? new Date(backend.createdAt) : new Date();
  const periodStart = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1);
  const periodEnd = new Date(createdDate.getFullYear(), createdDate.getMonth() + 1, 0);

  return {
    id: backend._id,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export default function ClaimsDisputesPage() {
  const { user } = useAuth();
  // Use user.id directly from AuthContext - this is already the employee profile ID
  const employeeId = user?.id || null;
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'disputes' | 'claims'>('overview');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  // Form states
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dispute form
  const [disputeForm, setDisputeForm] = useState<CreateDisputeDto>({
    payslipId: '',
    description: '',
    amount: undefined,
  });

  // Claim form
  const [claimForm, setClaimForm] = useState<CreateClaimDto>({
    claimType: '',
    description: '',
    amount: 0,
  });

  const claimTypes = [
    'Travel Expense',
    'Equipment Purchase',
    'Training/Education',
    'Medical Expense',
    'Relocation',
    'Work from Home Equipment',
    'Client Entertainment',
    'Other',
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!employeeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch tracking data
        const trackingResponse = await payrollTrackingService.trackClaimsAndDisputes(employeeId);
        const trackingData = (trackingResponse?.data || {}) as TrackingData;

        setDisputes(trackingData.disputes || []);
        setClaims(trackingData.claims || []);

        // Fetch payslips for dispute form
        const payslipsResponse = await payrollTrackingService.getEmployeePayslips(employeeId);
        const backendPayslips = (payslipsResponse?.data || []) as BackendPayslip[];
        setPayslips(backendPayslips.map(mapPayslipForSelect));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId]);

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !disputeForm.payslipId || !disputeForm.description) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await payrollTrackingService.createDispute(employeeId, disputeForm);

      // Check for API errors
      if (result.error) {
        alert('Failed to submit dispute: ' + result.error);
        return;
      }

      // Refresh data
      const response = await payrollTrackingService.trackClaimsAndDisputes(employeeId);
      const trackingData = (response?.data || {}) as TrackingData;
      setDisputes(trackingData.disputes || []);

      // Reset form
      setDisputeForm({ payslipId: '', description: '', amount: undefined });
      setShowDisputeForm(false);
      alert('Dispute submitted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to submit dispute: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClaim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!employeeId) {
      alert('Error: Unable to identify your employee account. Please try refreshing the page.');
      return;
    }

    if (!claimForm.claimType) {
      alert('Please select a claim type.');
      return;
    }

    if (!claimForm.description) {
      alert('Please enter a description.');
      return;
    }

    if (!claimForm.amount || claimForm.amount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setSubmitting(true);

      // Debug log
      console.log('Submitting claim with data:', {
        employeeId,
        claimForm,
      });

      const result = await payrollTrackingService.createClaim(employeeId, claimForm);

      console.log('Submit claim - result:', result);

      // Check for API errors
      if (result.error) {
        console.error('Claim API error:', result.error, 'Status:', result.status);
        alert('Failed to submit claim: ' + result.error);
        return;
      }

      // Refresh data
      const response = await payrollTrackingService.trackClaimsAndDisputes(employeeId);
      const trackingData = (response?.data || {}) as TrackingData;
      setClaims(trackingData.claims || []);

      // Reset form
      setClaimForm({ claimType: '', description: '', amount: 0 });
      setShowClaimForm(false);
      alert('Claim submitted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Submit claim error:', err);
      alert('Failed to submit claim: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPayslipPeriod = (payslip: Payslip) => {
    const start = new Date(payslip.periodStart);
    return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
      case 'in_review':
      case 'in-review':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1">
            <Search className="w-3 h-3" /> In Review
          </Badge>
        );
      case 'approved':
      case 'paid':
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const getPendingCount = () => {
    const pendingDisputes = disputes.filter(d => ['pending', 'in_review', 'in-review'].includes(d.status?.toLowerCase())).length;
    const pendingClaims = claims.filter(c => ['pending', 'in_review', 'in-review'].includes(c.status?.toLowerCase())).length;
    return pendingDisputes + pendingClaims;
  };

  const filterByStatus = <T extends { status: string }>(items: T[]): T[] => {
    if (statusFilter === 'all') {
      return items;
    }
    return items.filter(item => {
      const status = item.status?.toLowerCase() || '';
      if (statusFilter === 'approved') {
        return status === 'approved';
      }
      if (statusFilter === 'rejected') {
        return status === 'rejected';
      }
      return true;
    });
  };

  const filteredDisputes = filterByStatus(disputes);
  const filteredClaims = filterByStatus(claims);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading claims and disputes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading data</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Claims & Disputes
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Track and manage your payroll-related submissions
          </p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <Button variant="outline" className="group flex items-center gap-2 hover:bg-muted transition-all">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Payroll Tracking
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 border-l-4 border-l-primary flex items-start justify-between group hover:shadow-lg transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Disputes</p>
            <h3 className="text-3xl font-bold mt-2 tracking-tight group-hover:text-primary transition-colors">{disputes.length}</h3>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Historical submissions
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-l-blue-500 flex items-start justify-between group hover:shadow-lg transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
            <h3 className="text-3xl font-bold mt-2 tracking-tight group-hover:text-blue-500 transition-colors">{claims.length}</h3>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Expense reimbursements
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
            <Receipt className="w-6 h-6 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-l-amber-500 flex items-start justify-between group hover:shadow-lg transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
            <h3 className="text-3xl font-bold mt-2 tracking-tight group-hover:text-amber-500 transition-colors">{getPendingCount()}</h3>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Waiting for approval
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500/20 transition-colors">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-l-emerald-500 flex items-start justify-between group hover:shadow-lg transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Claimed</p>
            <h3 className="text-2xl font-bold mt-2 tracking-tight group-hover:text-emerald-500 transition-colors whitespace-nowrap">
              {formatCurrency(claims.reduce((s, c) => s + c.amount, 0))}
            </h3>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Total reimbursement value
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
            <CreditCard className="w-6 h-6 text-emerald-500" />
          </div>
        </GlassCard>
      </div>

      {/* Action Buttons & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex p-1 bg-muted rounded-xl w-fit">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg transition-all ${activeTab === 'overview' ? 'shadow-md scale-105' : ''}`}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'disputes' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('disputes')}
            className={`rounded-lg transition-all flex items-center gap-2 ${activeTab === 'disputes' ? 'shadow-md scale-105' : ''}`}
          >
            <AlertCircle className="w-4 h-4" /> My Disputes
            {disputes.length > 0 && (
              <Badge variant="secondary" className="px-1.5 h-4 text-[10px] ml-1">
                {disputes.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'claims' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('claims')}
            className={`rounded-lg transition-all flex items-center gap-2 ${activeTab === 'claims' ? 'shadow-md scale-105' : ''}`}
          >
            <Receipt className="w-4 h-4" /> My Claims
            {claims.length > 0 && (
              <Badge variant="secondary" className="px-1.5 h-4 text-[10px] ml-1">
                {claims.length}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowDisputeForm(true)}
            className="rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> File a Dispute
          </Button>
          <Button
            onClick={() => setShowClaimForm(true)}
            variant="outline"
            className="rounded-xl flex items-center gap-2 hover:bg-muted"
          >
            <Receipt className="w-4 h-4" /> Submit a Claim
          </Button>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Recent Disputes */}
          <GlassCard className="overflow-hidden border-none shadow-xl">
            <div className="p-6 border-b border-muted flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" /> Recent Disputes
              </h3>
              <Button
                variant="link"
                onClick={() => setActiveTab('disputes')}
                className="text-primary hover:text-primary/80 h-auto p-0"
              >
                View All <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
              </Button>
            </div>

            <div className="p-0">
              {disputes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic bg-muted/30">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No disputes filed yet</p>
                </div>
              ) : (
                <div className="divide-y divide-muted">
                  {disputes.slice(0, 5).map((dispute) => (
                    <div key={dispute.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm line-clamp-1">{dispute.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(dispute.createdAt)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(dispute.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Recent Claims */}
          <GlassCard className="overflow-hidden border-none shadow-xl">
            <div className="p-6 border-b border-muted flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" /> Recent Claims
              </h3>
              <Button
                variant="link"
                onClick={() => setActiveTab('claims')}
                className="text-blue-500 hover:text-blue-500/80 h-auto p-0"
              >
                View All <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
              </Button>
            </div>

            <div className="p-0">
              {claims.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic bg-muted/30">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No claims submitted yet</p>
                </div>
              ) : (
                <div className="divide-y divide-muted">
                  {claims.slice(0, 5).map((claim) => (
                    <div key={claim.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                          <Receipt className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{claim.claimType}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-blue-500 font-medium">{formatCurrency(claim.amount)}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDate(claim.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(claim.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Disputes Tab Content */}
      {activeTab === 'disputes' && (
        <GlassCard className="overflow-hidden border-none shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-muted flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Historical Disputes</h3>
              <p className="text-sm text-muted-foreground mt-1">Detailed list of all filed payroll disputes</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
                className="text-emerald-500"
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('rejected')}
                className="text-destructive"
              >
                Rejected
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Filed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No disputes found matching the criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {dispute.description}
                          </span>
                          {dispute.reviewNotes && (
                            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1 italic">
                              <Search className="w-3 h-3" /> HR Note: {dispute.reviewNotes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {dispute.amount ? formatCurrency(dispute.amount) : <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(dispute.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(dispute.status)}
                      </TableCell>
                      <TableCell className="text-sm font-medium italic">
                        {dispute.resolution || <span className="text-muted-foreground font-normal opacity-50">Pending resolution</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      )}

      {/* Claims Tab Content */}
      {activeTab === 'claims' && (
        <GlassCard className="overflow-hidden border-none shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-muted flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Expense Claims</h3>
              <p className="text-sm text-muted-foreground mt-1">Track status of your reimbursement requests</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
                className="text-emerald-500"
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('rejected')}
                className="text-destructive"
              >
                Rejected
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[30%]">Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Date Filed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No claims found matching the criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClaims.map((claim) => (
                    <TableRow key={claim.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Receipt className="w-3 h-3 text-blue-500" />
                          </div>
                          <span className="font-semibold">{claim.claimType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm group-hover:text-foreground">
                            {claim.description}
                          </span>
                          {claim.reviewNotes && (
                            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1 italic">
                              <Search className="w-3 h-3" /> Note: {claim.reviewNotes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-blue-500">
                        {formatCurrency(claim.amount)}
                      </TableCell>
                      <TableCell>
                        {claim.approvedAmount !== undefined ? (
                          <span className="text-emerald-500 font-bold">{formatCurrency(claim.approvedAmount)}</span>
                        ) : (
                          <span className="text-muted-foreground font-normal">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(claim.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(claim.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      )}

      {/* Dispute Form Dialog */}
      <Dialog open={showDisputeForm} onOpenChange={setShowDisputeForm}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl glass-effect">
          <DialogHeader className="p-6 bg-primary/10 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-primary" /> File a Payroll Dispute
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              If you notice errors in your payslip (over-deductions, missing bonuses, etc.), please file them here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitDispute} className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="payslip" className="text-sm font-semibold flex items-center gap-1">
                Select Payslip <span className="text-destructive">*</span>
              </Label>
              <select
                id="payslip"
                value={disputeForm.payslipId}
                onChange={(e) => setDisputeForm({ ...disputeForm, payslipId: e.target.value })}
                required
                className="w-full h-10 px-4 py-2 bg-muted/50 border border-muted focus:border-primary focus:ring-1 focus:ring-primary rounded-xl transition-all outline-none text-sm appearance-none"
              >
                <option value="">Select a payslip</option>
                {payslips.map((payslip) => (
                  <option key={payslip.id} value={payslip.id}>
                    {formatPayslipPeriod(payslip)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dAmount" className="text-sm font-semibold">
                Disputed Amount (Optional)
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  id="dAmount"
                  type="number"
                  step="0.01"
                  className="pl-10 h-10 rounded-xl"
                  value={disputeForm.amount || ''}
                  onChange={(e) => setDisputeForm({ ...disputeForm, amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dDescription" className="text-sm font-semibold">
                Detailed Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dDescription"
                value={disputeForm.description}
                onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                required
                rows={4}
                className="rounded-xl resize-none"
                placeholder="Describe the payroll error in detail (e.g. 'Missing overtime pay', 'Incorrect tax deduction')..."
              />
            </div>

            <DialogFooter className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDisputeForm(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 transition-all font-bold group"
              >
                {submitting ? (
                  <Clock className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Claim Form Dialog */}
      <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl glass-effect">
          <DialogHeader className="p-6 bg-blue-500/10 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-500" /> Submit Expense Claim
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              Submit work-related expenses for reimbursement. Remember to keep your receipts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitClaim} className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cType" className="text-sm font-semibold flex items-center gap-1">
                Claim Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="cType"
                value={claimForm.claimType}
                onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}
                required
                className="w-full h-10 px-4 py-2 bg-muted/50 border border-muted focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl transition-all outline-none text-sm appearance-none"
              >
                <option value="">Select claim type</option>
                {claimTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cAmount" className="text-sm font-semibold">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm font-medium">$</span>
                <Input
                  id="cAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-8 h-10 rounded-xl"
                  value={claimForm.amount || ''}
                  onChange={(e) => setClaimForm({ ...claimForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cDescription" className="text-sm font-semibold">
                Expense Details <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cDescription"
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                required
                rows={4}
                className="rounded-xl resize-none"
                placeholder="Provide context for this expense (e.g. 'Conference travel in March', 'AWS server costs')..."
              />
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                <strong>Verification Required:</strong> You will be prompted to attach digital receipts or supporting documentation after this submission is processed.
              </p>
            </div>

            <DialogFooter className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowClaimForm(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold group"
              >
                {submitting ? (
                  <Clock className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <GlassCard className="p-6 border-l-4 border-l-blue-500 bg-blue-500/5 group hover:bg-blue-500/10 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="font-bold text-foreground">Guidelines & Support</h4>
            <div className="grid md:grid-cols-2 gap-8 mt-4">
              <div>
                <h5 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-primary" /> Filing Disputes
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Submit a dispute if you notice discrepancies in your calculated gross pay, overtime, or statutory deductions. HR typically reviews these within 2-3 business days.
                </p>
              </div>
              <div>
                <h5 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-blue-500" /> Claim Eligibility
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Eligible claims include travel, training, medical expenses, and work equipment. Please ensure all claims align with the company&apos;s expense policy before submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
