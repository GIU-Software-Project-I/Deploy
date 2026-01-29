'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import {
  FileText, History, Calculator, ShieldCheck,
  AlertTriangle, CalendarOff, Gift, Download,
  Receipt, PlayCircle, Plus, AlertCircle, ArrowLeft
} from 'lucide-react';

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
        const payslips: any[] = (payslipsResponse?.data as any[]) || [];

        // Fetch claims/disputes tracking
        const trackingResponse = await payrollTrackingService.trackClaimsAndDisputes(user.id);
        const tracking: any = trackingResponse?.data || { claims: [], disputes: [] };

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
      icon: <FileText className="w-8 h-8 text-primary" />,
      color: 'blue',
      features: ['View monthly payslips', 'Download PDF', 'See payment status'],
    },
    {
      title: 'Salary History',
      description: 'Track your salary changes over time including base salary, bonuses, and adjustments.',
      href: '/dashboard/department-employee/payroll-tracking/salary-history',
      icon: <History className="w-8 h-8 text-primary" />,
      color: 'green',
      features: ['Base salary info', 'Historical records', 'Contract details'],
    },
    {
      title: 'Tax Deductions',
      description: 'View detailed tax deductions with law references and tax brackets (BR 5, BR 6).',
      href: '/dashboard/department-employee/payroll-tracking/tax-deductions',
      icon: <Calculator className="w-8 h-8 text-primary" />,
      color: 'blue',
      features: ['Income tax breakdown', 'Law references', 'Tax brackets'],
    },
    {
      title: 'Insurance Deductions',
      description: 'View itemized insurance deductions (health, pension, unemployment, etc.).',
      href: '/dashboard/department-employee/payroll-tracking/insurance-deductions',
      icon: <ShieldCheck className="w-8 h-8 text-primary" />,
      color: 'green',
      features: ['Health insurance', 'Pension contributions', 'Unemployment'],
    },
    {
      title: 'Misconduct & Absenteeism',
      description: 'View salary deductions due to misconduct or unapproved absenteeism.',
      href: '/dashboard/department-employee/payroll-tracking/misconduct-deductions',
      icon: <AlertTriangle className="w-8 h-8 text-primary" />,
      color: 'red',
      features: ['Absenteeism records', 'Policy violations', 'Time management integration'],
    },
    {
      title: 'Unpaid Leave Deductions',
      description: 'View deductions for unpaid leave days with daily/hourly calculations (BR 11).',
      href: '/dashboard/department-employee/payroll-tracking/unpaid-leave-deductions',
      icon: <CalendarOff className="w-8 h-8 text-primary" />,
      color: 'orange',
      features: ['Daily rate calculations', 'Leave integration', 'Period filtering'],
    },
    {
      title: 'Compensation & Benefits',
      description: 'View leave compensation, transportation allowance, and employer contributions.',
      href: '/dashboard/department-employee/payroll-tracking/contributions',
      icon: <Gift className="w-8 h-8 text-primary" />,
      color: 'purple',
      features: ['Leave encashment', 'Transportation', 'Employer contributions'],
    },
    {
      title: 'Tax Documents',
      description: 'Download annual tax statements and other tax-related documents for official purposes.',
      href: '/dashboard/department-employee/payroll-tracking/tax-documents',
      icon: <Download className="w-8 h-8 text-primary" />,
      color: 'amber',
      features: ['Annual statements', 'Tax certificates', 'Download documents'],
    },
    {
      title: 'Claims & Disputes',
      description: 'Submit expense claims, dispute payroll errors, and track request status.',
      href: '/dashboard/department-employee/payroll-tracking/claims-disputes',
      icon: <Receipt className="w-8 h-8 text-primary" />,
      color: 'orange',
      features: ['Submit claims', 'File disputes', 'Track status'],
    },
  ];


  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-foreground">Payroll Tracking</h1>
        <p className="text-muted-foreground mt-1">View your payslips, salary history, deductions, and manage claims</p>
      </div>

      {/* Overview Stats */}
      <GlassCard className="bg-gradient-to-br from-primary to-primary/80 border-primary/20 p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Payroll Tracking Overview</h2>
              <p className="text-white/70 mt-1">Your payroll information at a glance</p>
            </div>
            <PlayCircle className="w-12 h-12 text-white/20" />
          </div>

          {loading ? (
            <div className="flex items-center text-white/80">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
              <span>Loading stats...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Payslips', value: stats.totalPayslips, icon: <FileText className="w-4 h-4" /> },
                { label: 'Last Payslip', value: stats.lastPayslipDate, icon: <History className="w-4 h-4" /> },
                { label: 'Pending Claims', value: stats.pendingClaims, icon: <AlertCircle className="w-4 h-4" /> },
                { label: 'Pending Disputes', value: stats.pendingDisputes, icon: <AlertTriangle className="w-4 h-4" /> }
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                    {stat.icon}
                    {stat.label}
                  </div>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Payroll Features Grid */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-6">Payroll Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payrollFeatures.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <GlassCard
                className="group h-full p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20"
                variant="hover"
              >
                <div className="mb-6 p-4 rounded-2xl bg-primary/5 w-fit group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-6 line-clamp-2">
                  {feature.description}
                </p>
                <div className="space-y-2 mb-6">
                  {feature.features.map((f, idx) => (
                    <div key={idx} className="flex items-center text-xs font-medium text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2"></div>
                      {f}
                    </div>
                  ))}
                </div>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform">
                  Access Service <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-8">
        <h2 className="text-xl font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/department-employee/payroll-tracking/payslips">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 rounded-xl hover:bg-muted/50 hover:border-primary/30 group">
              <Download className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">Latest Payslip</span>
            </Button>
          </Link>
          <Link href="/dashboard/department-employee/payroll-tracking/claims-disputes">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 rounded-xl hover:bg-muted/50 hover:border-primary/30 group">
              <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">New Claim</span>
            </Button>
          </Link>
          <Link href="/dashboard/department-employee/payroll-tracking/tax-documents">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 rounded-xl hover:bg-muted/50 hover:border-primary/30 group">
              <FileText className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">Tax Documents</span>
            </Button>
          </Link>
          <Link href="/dashboard/department-employee/payroll-tracking/claims-disputes">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 rounded-xl hover:bg-muted/50 hover:border-primary/30 group">
              <AlertTriangle className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">Report Issue</span>
            </Button>
          </Link>
        </div>
      </GlassCard>

      {/* Back to Dashboard */}
      <div>
        <Link href="/dashboard/department-employee">
          <Button variant="ghost" className="hover:bg-transparent hover:text-primary pl-0 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
