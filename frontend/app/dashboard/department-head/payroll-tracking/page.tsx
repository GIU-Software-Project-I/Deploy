'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { FileText, History, Receipt, Shield, AlertTriangle, Clock, Gift, FileCheck, MessageSquare, Download, Plus, HelpCircle, ChevronLeft } from 'lucide-react';

/**
 * Payroll Tracking Main Page - Department Employee
 * REQ-PY-1: View and download payslips
 * REQ-PY-2: See status and details of payslips
 * REQ-PY-3: View base salary according to employment contract
 * REQ-PY-13: Access salary history
 * REQ-PY-14: View employer contributions
 * REQ-PY-15: Download tax documents
 * REQ-PY-16: Dispute payroll errors
 * REQ-PY-17: Submit expense reimbursement claims
 * REQ-PY-18: Track claims and disputes
 */

interface Payslip {
  periodEnd: string;
  netPay: number;
}

interface Claim {
  status: string;
}

interface Dispute {
  status: string;
}

interface TrackingResponse {
  claims: Claim[];
  disputes: Dispute[];
}
export default function PayrollTrackingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPayslips: 0,
    pendingClaims: 0,
    pendingDisputes: 0,
    lastPayslipDate: 'N/A',
    lastPayslipAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch payslips to get stats
        const payslipsResponse = await payrollTrackingService.getEmployeePayslips(user.id);
        const payslips = (payslipsResponse?.data as Payslip[]) || [];
        
        // Fetch claims/disputes tracking
        const trackingResponse = await payrollTrackingService.trackClaimsAndDisputes(user.id);
        const tracking = (trackingResponse?.data as TrackingResponse) || { claims: [], disputes: [] };
        
        const pendingClaims = tracking.claims?.filter((c: any) => c.status === 'PENDING' || c.status === 'IN_REVIEW')?.length || 0;
        const pendingDisputes = tracking.disputes?.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_REVIEW')?.length || 0;
        
        const lastPayslip = payslips[0];
        
        setStats({
          totalPayslips: payslips.length,
          pendingClaims,
          pendingDisputes,
          lastPayslipDate: lastPayslip?.periodEnd ? new Date(lastPayslip.periodEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A',
          lastPayslipAmount: lastPayslip?.netPay || 0,
        });
      } catch (error) {
        console.error('Error fetching payroll stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  const payrollFeatures = [
    {
      title: 'My Payslips',
      description: 'View and download your monthly payslips with detailed breakdown of earnings and deductions.',
      href: '/dashboard/department-employee/payroll-tracking/payslips',
      Icon: FileText,
      features: ['View monthly payslips', 'Download PDF', 'See payment status'],
      requirement: 'REQ-PY-1, REQ-PY-2'
    },
    {
      title: 'Salary History',
      description: 'Track your salary changes over time including base salary, bonuses, and adjustments.',
      href: '/dashboard/department-employee/payroll-tracking/salary-history',
      Icon: History,
      features: ['Base salary info', 'Historical records', 'Contract details'],
      requirement: 'REQ-PY-3, REQ-PY-13'
    },
    {
      title: 'Tax Deductions',
      description: 'View detailed tax deductions with law references and tax brackets (BR 5, BR 6).',
      href: '/dashboard/department-employee/payroll-tracking/tax-deductions',
      Icon: Receipt,
      features: ['Income tax breakdown', 'Law references', 'Tax brackets'],
      requirement: 'REQ-PY-8'
    },
    {
      title: 'Insurance Deductions',
      description: 'View itemized insurance deductions (health, pension, unemployment, etc.).',
      href: '/dashboard/department-employee/payroll-tracking/insurance-deductions',
      Icon: Shield,
      features: ['Health insurance', 'Pension contributions', 'Unemployment'],
      requirement: 'REQ-PY-9'
    },
    {
      title: 'Misconduct & Absenteeism',
      description: 'View salary deductions due to misconduct or unapproved absenteeism.',
      href: '/dashboard/department-employee/payroll-tracking/misconduct-deductions',
      Icon: AlertTriangle,
      features: ['Absenteeism records', 'Policy violations', 'Time management integration'],
      requirement: 'REQ-PY-10'
    },
    {
      title: 'Unpaid Leave Deductions',
      description: 'View deductions for unpaid leave days with daily/hourly calculations (BR 11).',
      href: '/dashboard/department-employee/payroll-tracking/unpaid-leave-deductions',
      Icon: Clock,
      features: ['Daily rate calculations', 'Leave integration', 'Period filtering'],
      requirement: 'REQ-PY-11'
    },
    {
      title: 'Compensation & Benefits',
      description: 'View leave compensation, transportation allowance, and employer contributions.',
      href: '/dashboard/department-employee/payroll-tracking/contributions',
      Icon: Gift,
      features: ['Leave encashment', 'Transportation', 'Employer contributions'],
      requirement: 'REQ-PY-5, REQ-PY-7, REQ-PY-14'
    },
    {
      title: 'Tax Documents',
      description: 'Download annual tax statements and other tax-related documents for official purposes.',
      href: '/dashboard/department-employee/payroll-tracking/tax-documents',
      Icon: FileCheck,
      features: ['Annual statements', 'Tax certificates', 'Download documents'],
      requirement: 'REQ-PY-15'
    },
    {
      title: 'Claims & Disputes',
      description: 'Submit expense claims, dispute payroll errors, and track request status.',
      href: '/dashboard/department-employee/payroll-tracking/claims-disputes',
      Icon: MessageSquare,
      features: ['Submit claims', 'File disputes', 'Track status'],
      requirement: 'REQ-PY-16, REQ-PY-17, REQ-PY-18'
    },
  ];

  return (
    <div className="dept-head-theme min-h-screen bg-background text-foreground space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payroll Tracking</h1>
        <p className="text-muted-foreground mt-2">View your payslips, salary history, deductions, and manage claims</p>
      </div>

      {/* Overview Stats */}
      <div className="bg-primary rounded-xl border border-border p-8 text-primary-foreground shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Payroll Tracking Overview</h2>
            <p className="text-primary-foreground/70 mt-2">Your payroll information at a glance</p>
          </div>
        </div>
        
        {loading ? (
          <div className="mt-6 flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-foreground border-t-transparent mr-3"></div>
            <span>Loading stats...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-primary-foreground/70 text-sm">Total Payslips</p>
              <p className="text-3xl font-semibold mt-1">{stats.totalPayslips}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-primary-foreground/70 text-sm">Last Payslip</p>
              <p className="text-2xl font-semibold mt-1">{stats.lastPayslipDate}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-primary-foreground/70 text-sm">Pending Claims</p>
              <p className="text-3xl font-semibold mt-1">{stats.pendingClaims}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-primary-foreground/70 text-sm">Pending Disputes</p>
              <p className="text-3xl font-semibold mt-1">{stats.pendingDisputes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Payroll Features Grid */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-6">Payroll Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payrollFeatures.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <div className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-lg hover:border-primary/50 transition-all p-6 cursor-pointer h-full">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <feature.Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                <div className="space-y-2 mb-4">
                  {feature.features.map((f, idx) => (
                    <div key={idx} className="flex items-center text-sm text-muted-foreground">
                      <span className="mr-2 text-success">✓</span> {f}
                    </div>
                  ))}
                </div>
                <div className="text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform">
                  Access {feature.title} →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/department-employee/payroll-tracking/payslips">
            <button className="w-full p-4 bg-background border border-border rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 transition-colors text-center group">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10">
                <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm">Download Latest Payslip</p>
            </button>
          </Link>
          <Link href="/dashboard/department-employee/payroll-tracking/claims-disputes">
            <button className="w-full p-4 bg-background border border-border rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 transition-colors text-center group">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10">
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm">Submit New Claim</p>
            </button>
          </Link>
          <Link href="/dashboard/department-employee/payroll-tracking/tax-documents">
            <button className="w-full p-4 bg-background border border-border rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 transition-colors text-center group">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10">
                <FileCheck className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm">Tax Documents</p>
            </button>
          </Link>
          <Link href="/dashboard/department-employee/payroll-tracking/claims-disputes">
            <button className="w-full p-4 bg-background border border-border rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 transition-colors text-center group">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10">
                <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm">Report Issue</p>
            </button>
          </Link>
        </div>
      </div>

      {/* Back to Dashboard */}
      <div className="pt-4">
        <Link href="/dashboard/department-employee">
          <button className="px-6 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted/50 hover:text-foreground transition-colors font-medium flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
