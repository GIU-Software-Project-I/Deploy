'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { ArrowLeft, Download, AlertTriangle, Eye, Calendar, DollarSign, Wallet } from 'lucide-react';

/**
 * Payslips Page - Department Employee
 * REQ-PY-1: View and download payslip online
 * REQ-PY-2: See status and details of payslip (paid, disputed)
 * BR 17: Auto-generated Payslip with clear breakdown of components
 */

// Frontend Payslip interface for display (canonical shape used by pages)
interface Payslip {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: string;
  baseSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  earnings?: {
    type: string;
    amount: number;
    description?: string;
  }[];
  deductions?: {
    type: string;
    amount: number;
    description?: string;
  }[];
}

// NOTE: Mapping logic has been centralized in `payrollTrackingService` as
// `getEmployeePayslipsMapped` and `getPayslipDetailsMapped` so pages use a
// single authority for shaping data coming from the backend.

export default function PayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayslips = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await payrollTrackingService.getEmployeePayslipsMapped(user.id);
        const mappedPayslips = (response?.data || []) as any[];
        // Normalize mapped payslips to ensure required fields exist and types are correct
        const normalizePayslip = (p: any): Payslip => {
          const periodStart = p.periodStart || p.from || p.start || new Date().toISOString();
          const periodEnd = p.periodEnd || p.to || p.end || periodStart;
          const payDate = p.payDate || p.paidAt || periodEnd || periodStart;
          const baseSalary = Number(p.baseSalary ?? p.earnings?.baseSalary ?? 0) || 0;
          const grossPay = Number(p.grossPay ?? p.grossSalary ?? 0) || 0;
          const totalDeductions = Number(p.totalDeductions ?? p.deductionsTotal ?? 0) || 0;
          const netPay = Number(p.netPay ?? p.netSalary ?? (grossPay - totalDeductions)) || 0;
          return {
            id: p.id || p.payslipId || p._id || '',
            periodStart,
            periodEnd,
            payDate,
            status: p.status || 'unknown',
            baseSalary,
            grossPay,
            totalDeductions,
            netPay,
            currency: p.currency || 'EGP',
            earnings: Array.isArray(p.earnings) ? p.earnings : [],
            deductions: Array.isArray(p.deductions) ? p.deductions : [],
          };
        };

        setPayslips(mappedPayslips.map(normalizePayslip));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load payslips';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [user?.id]);

  const handleViewDetails = async (payslip: Payslip) => {
    if (!user?.id) return;

    try {
      const response = await payrollTrackingService.getPayslipDetailsMapped(payslip.id, user.id);
      // Response shape: may contain backend-shaped payslip or already-mapped Payslip
      const responseData = response?.data as unknown as { payslip?: any; disputes?: unknown[] } | undefined;
      if (responseData?.payslip) {
        const p = responseData.payslip;
        // Ensure required frontend fields exist
        const normalized: Payslip = {
          id: p.id || p.payslipId || p._id || payslip.id,
          periodStart: p.periodStart || p.from || p.start || payslip.periodStart,
          periodEnd: p.periodEnd || p.to || p.end || payslip.periodEnd,
          payDate: p.payDate || p.paidAt || payslip.payDate,
          status: p.status || p.paymentStatus || payslip.status || 'unknown',
          baseSalary: Number(p.baseSalary ?? p.earningsDetails?.baseSalary ?? payslip.baseSalary) || 0,
          grossPay: Number(p.grossPay ?? p.grossSalary ?? payslip.grossPay) || 0,
          totalDeductions: Number(p.totalDeductions ?? p.deductionsTotal ?? payslip.totalDeductions) || 0,
          netPay: Number(p.netPay ?? p.netSalary ?? payslip.netPay) || 0,
          currency: p.currency || payslip.currency || 'EGP',
          earnings: Array.isArray(p.earnings) ? p.earnings : p.earningsDetails?.allowances || payslip.earnings || [],
          deductions: Array.isArray(p.deductions) ? p.deductions : p.deductionsDetails?.taxes || payslip.deductions || [],
        };
        setSelectedPayslip(normalized);
      } else {
        // Fallback to the already mapped payslip from the list
        setSelectedPayslip(payslip);
      }
    } catch {
      // On error, just show the basic payslip data we already have
      setSelectedPayslip(payslip);
    }
  };

  const handleDownload = async (payslipId: string) => {
    if (!user?.id) return;

    try {
      setDownloading(payslipId);
      const response = await payrollTrackingService.downloadPayslip(payslipId, user.id);

      // Handle file download - response now contains blob and filename
      if (response?.blob) {
        const url = window.URL.createObjectURL(response.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || `payslip-${payslipId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (response?.error) {
        alert('Failed to download payslip: ' + response.error);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to download payslip: ' + errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-success/15 text-success hover:bg-success/25 border-success/20">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/25 border-warning/20">Pending</Badge>;
      case 'disputed':
        return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20">Disputed</Badge>;
      case 'processing':
        return <Badge className="bg-primary/15 text-primary hover:bg-primary/25 border-primary/20">Processing</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'USD') => {
    const safeAmount = Number(amount ?? 0);
    const value = isNaN(safeAmount) ? 0 : safeAmount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Loading your payslips...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <GlassCard className="border-destructive/20 bg-destructive/5 p-6 space-y-4">
          <h3 className="font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Error loading payslips
          </h3>
          <p className="text-destructive/80 text-sm">{error}</p>
          <Link href="/dashboard/department-employee/payroll-tracking">
            <Button variant="destructive" size="sm">
              Back to Payroll Tracking
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">My Payslips</h1>
          <p className="text-muted-foreground mt-1">View and download your monthly payslips</p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <Button variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back to Payroll Tracking
          </Button>
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-xl shadow-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Payslip Overview</h2>
            <p className="text-white/80 mt-1">{payslips.length} payslips available</p>
          </div>
          <Wallet className="w-16 h-16 text-white/20" />
        </div>
      </div>

      {/* Payslips List */}
      <GlassCard className="overflow-hidden">
        {payslips.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Payslips Available</h3>
            <p className="text-muted-foreground">Your payslips will appear here once they are generated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip) => (
                  <TableRow key={payslip.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {formatPeriod(payslip.periodStart, payslip.periodEnd)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(payslip.periodStart)} - {formatDate(payslip.periodEnd)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payslip.payDate)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatCurrency(payslip.grossPay, payslip.currency)}
                    </TableCell>
                    <TableCell className="text-destructive font-medium">
                      -{formatCurrency(payslip.totalDeductions, payslip.currency)}
                    </TableCell>
                    <TableCell className="text-success font-bold">
                      {formatCurrency(payslip.netPay, payslip.currency)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payslip.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(payslip)}
                          className="h-8"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(payslip.id)}
                          disabled={downloading === payslip.id}
                          className="h-8"
                        >
                          {downloading === payslip.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Download className="w-3.5 h-3.5 mr-1" />
                          )}
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Payslip Detail Modal */}
      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>
              Period: {selectedPayslip && formatPeriod(selectedPayslip.periodStart, selectedPayslip.periodEnd)}
            </DialogDescription>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-6 pt-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Base Salary</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(selectedPayslip.baseSalary, selectedPayslip.currency)}
                  </p>
                </div>
                <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                  <p className="text-sm text-success">Gross Pay</p>
                  <p className="text-lg font-bold text-success">
                    {formatCurrency(selectedPayslip.grossPay, selectedPayslip.currency)}
                  </p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                  <p className="text-sm text-destructive">Deductions</p>
                  <p className="text-lg font-bold text-destructive">
                    -{formatCurrency(selectedPayslip.totalDeductions, selectedPayslip.currency)}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <p className="text-sm text-primary">Net Pay</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(selectedPayslip.netPay, selectedPayslip.currency)}
                  </p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="border border-border/60 rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" /> Earnings
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Base Salary</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(selectedPayslip.baseSalary, selectedPayslip.currency)}
                    </span>
                  </div>
                  {selectedPayslip.earnings?.map((earning, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">{earning.type}</span>
                      <span className="font-medium text-success">
                        +{formatCurrency(earning.amount, selectedPayslip.currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold pt-4">
                    <span className="text-foreground">Total Earnings</span>
                    <span className="text-success">
                      {formatCurrency(selectedPayslip.grossPay, selectedPayslip.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="border border-border/60 rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Deductions
                </h4>
                <div className="space-y-2">
                  {selectedPayslip.deductions?.map((deduction, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">{deduction.type}</span>
                      <span className="font-medium text-destructive">
                        -{formatCurrency(deduction.amount, selectedPayslip.currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold pt-4">
                    <span className="text-foreground">Total Deductions</span>
                    <span className="text-destructive">
                      -{formatCurrency(selectedPayslip.totalDeductions, selectedPayslip.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex justify-between items-center">
                <span className="text-lg font-bold text-foreground">Net Pay</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(selectedPayslip.netPay, selectedPayslip.currency)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-border pt-4 mt-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                {selectedPayslip && getStatusBadge(selectedPayslip.status)}
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/department-employee/payroll-tracking/claims-disputes">
                  <Button variant="outline" className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning hover:border-warning">
                    Dispute
                  </Button>
                </Link>
                {selectedPayslip && (
                  <Button
                    onClick={() => handleDownload(selectedPayslip.id)}
                    disabled={downloading === selectedPayslip.id}
                  >
                    {downloading === selectedPayslip.id ? 'Downloading...' : 'Download PDF'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
