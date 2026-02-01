'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SystemRole } from '@/types';
import { payrollSpecialistService } from '@/app/services/payroll-specialist';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { FileText, Download, Trash2, ChevronLeft, ChevronRight, Users, DollarSign, Receipt, Loader2, X, Play } from 'lucide-react';

interface GeneratedReport {
  id: string;
  reportType: 'standard-summary' | 'tax-report' | 'payslip-history';
  period: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalTaxes: number;
  totalInsurance: number;
  totalPenalties: number;
  generatedAt: string;
  summaryData?: {
    totalPayslips: number;
    totalInsurance: number;
    totalPenalties: number;
    taxYear: number;
    totalTaxCollected: number;
    taxEmployeeCount: number;
    employeeTaxBreakdown: number;
    byDepartment?: any;
  };
}

export default function PayrollSummariesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  /* Removed unused showGenerateModal state */
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form state
  const [reportType, setReportType] = useState<'standard-summary' | 'tax-report' | 'payslip-history'>('standard-summary');
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Slide navigation for summary cards
  const [summarySlides, setSummarySlides] = useState<Record<string, number>>({});

  const allowedRoles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  // Load reports from localStorage on mount
  useEffect(() => {
    const savedReports = localStorage.getItem('financeStaffReports');
    const deletedReports = JSON.parse(localStorage.getItem('deletedFinanceStaffReports') || '[]') as string[];
    if (savedReports) {
      try {
        const parsed = JSON.parse(savedReports);
        const filtered = Array.isArray(parsed) ? parsed.filter((r: any) => !deletedReports.includes(r.id)) : [];
        setReports(filtered);
      } catch (error) {
        console.error('Failed to load saved reports:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save reports to localStorage when they change, ONLY after initial load
  useEffect(() => {
    if (!isLoaded) return;

    // Check if we effectively deleted everything or have valid reports
    const deletedReports = JSON.parse(localStorage.getItem('deletedFinanceStaffReports') || '[]') as string[];

    // We should save the current state.
    // NOTE: This assumes 'reports' state is the source of truth for the list.
    // If reports were filtered on load, saving them back is fine.

    localStorage.setItem('financeStaffReports', JSON.stringify(reports));
  }, [reports, isLoaded]);

  const handleGenerateReport = async () => {
    setLoading(true);

    try {
      let startDate: string;
      let endDate: string;

      if (periodType === 'yearly') {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      } else {
        if (!selectedMonth) {
          alert('Please select a month');
          setLoading(false);
          return;
        }
        const monthDate = new Date(selectedMonth + '-01');
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        startDate = `${selectedMonth}-01`;
        endDate = lastDay.toISOString().split('T')[0];
      }

      let newReport: GeneratedReport;

      if (reportType === 'standard-summary') {
        // Fetch both payroll summary and tax data
        try {
          const [payrollResponse, taxResponse] = await Promise.all([
            payrollSpecialistService.generateStandardPayrollSummary({
              startDate,
              endDate,
              periodType
            }),
            payrollSpecialistService.generateTaxReport({ startDate, endDate })
          ]);

          const payrollData: any = payrollResponse.data || payrollResponse;
          const taxData: any = taxResponse.data || taxResponse;
          const summary = payrollData.summary || {};
          const taxSummary = {
            totalTaxCollected: taxData.totalTaxCollected || 0,
            totalTaxEmployees: taxData.totalEmployees || Object.keys(taxData.employeeTaxDetails || {}).length || 0,
            taxYear: taxData.year || selectedYear,
            employeeTaxDetails: taxData.employeeTaxDetails || {}
          };

          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'standard-summary',
            period: periodType === 'yearly' ? `Year ${selectedYear}` : selectedMonth,
            totalEmployees: summary.totalEmployees || payrollData.totalEmployees || 0,
            totalGrossPay: summary.totalGross || payrollData.totalGrossPay || 0,
            totalNetPay: summary.totalNet || payrollData.totalNetPay || 0,
            totalDeductions: (summary.totalTax || taxSummary.totalTaxCollected || 0) + (summary.totalInsurance || 0) + (summary.totalPenalties || 0),
            totalTaxes: summary.totalTax || taxSummary.totalTaxCollected || 0,
            totalInsurance: summary.totalInsurance || 0,
            totalPenalties: summary.totalPenalties || 0,
            generatedAt: new Date().toISOString(),
            summaryData: {
              totalPayslips: summary.totalPayslips || 0,
              totalInsurance: summary.totalInsurance || 0,
              totalPenalties: summary.totalPenalties || 0,
              taxYear: taxSummary.taxYear,
              totalTaxCollected: taxSummary.totalTaxCollected,
              taxEmployeeCount: taxSummary.totalTaxEmployees,
              employeeTaxBreakdown: Object.keys(taxSummary.employeeTaxDetails).length,
              byDepartment: payrollData.byDepartment || {}
            }
          };
        } catch (error) {
          console.error('Standard summary API error:', error);
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'standard-summary',
            period: periodType === 'yearly' ? `Year ${selectedYear}` : selectedMonth,
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            totalTaxes: 0,
            totalInsurance: 0,
            totalPenalties: 0,
            generatedAt: new Date().toISOString(),
            summaryData: undefined
          };
        }
      } else if (reportType === 'tax-report') {
        // Tax report only
        try {
          const response = await payrollSpecialistService.generateTaxReport({ startDate, endDate });
          const responseData: any = response.data || response;

          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'tax-report',
            period: periodType === 'yearly' ? `Year ${selectedYear}` : selectedMonth,
            totalEmployees: responseData.totalEmployees || Object.keys(responseData.employeeTaxDetails || {}).length || 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: responseData.totalTaxCollected || 0,
            totalTaxes: responseData.totalTaxCollected || 0,
            totalInsurance: 0,
            totalPenalties: 0,
            generatedAt: responseData.generatedDate || new Date().toISOString()
          };
        } catch (error) {
          console.error('Tax report API error:', error);
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'tax-report',
            period: periodType === 'yearly' ? `Year ${selectedYear}` : selectedMonth,
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            totalTaxes: 0,
            totalInsurance: 0,
            totalPenalties: 0,
            generatedAt: new Date().toISOString()
          };
        }
      } else if (reportType === 'payslip-history') {
        // Payslip history
        try {
          const response = await payrollSpecialistService.generatePaySlipHistoryReport({ startDate, endDate });
          const responseData: any = response.data || response;
          const reportsArray = responseData.reports || [];
          const firstReport = reportsArray[0] || responseData.data || {};

          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'payslip-history',
            period: periodType === 'yearly' ? `Year ${selectedYear}` : selectedMonth,
            totalEmployees: firstReport.totalEmployees || reportsArray.reduce((sum: number, r: any) => sum + (r.totalEmployees || 0), 0) || 0,
            totalGrossPay: firstReport.totalGrossPay || reportsArray.reduce((sum: number, r: any) => sum + (r.totalGrossPay || 0), 0) || 0,
            totalNetPay: firstReport.totalNetPay || reportsArray.reduce((sum: number, r: any) => sum + (r.totalNetPay || 0), 0) || 0,
            totalDeductions: firstReport.totalDeductions || 0,
            totalTaxes: firstReport.totalTaxes || 0,
            totalInsurance: 0,
            totalPenalties: 0,
            generatedAt: responseData.generatedDate || new Date().toISOString()
          };
        } catch (error) {
          console.error('Payslip history API error:', error);
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'payslip-history',
            period: periodType === 'yearly' ? `Year ${selectedYear}` : selectedMonth,
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            totalTaxes: 0,
            totalInsurance: 0,
            totalPenalties: 0,
            generatedAt: new Date().toISOString()
          };
        }
      }

      // Always add the report to state
      setReports(prev => {
        const updated = [newReport, ...prev];
        const deletedReports = JSON.parse(localStorage.getItem('deletedFinanceStaffReports') || '[]') as string[];
        const filtered = updated.filter(r => !deletedReports.includes(r.id));
        localStorage.setItem('financeStaffReports', JSON.stringify(filtered));
        return updated;
      });

      alert('Report generated successfully!');
      // Reset form logic optional, or keep current selection for easy re-generation
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReportType('standard-summary');
    setPeriodType('monthly');
    setSelectedMonth('');
    setSelectedYear(new Date().getFullYear());
  };

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      const deletedReports = JSON.parse(localStorage.getItem('deletedFinanceStaffReports') || '[]') as string[];
      if (!deletedReports.includes(reportId)) {
        deletedReports.push(reportId);
        localStorage.setItem('deletedFinanceStaffReports', JSON.stringify(deletedReports));
      }
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
  };

  function getTypeBadge(type: string) {
    switch (type) {
      case 'tax-report':
        return { label: 'Tax', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' };
      case 'payslip-history':
        return { label: 'Payslip', className: 'bg-info/10 text-info border-info/30' };
      case 'standard-summary':
      default:
        return { label: 'Summary', className: 'bg-primary/10 text-primary border-primary/30' };
    }
  }

  const handleDownloadCSV = (report: GeneratedReport) => {
    let csvContent = '';

    if (report.reportType === 'standard-summary' && report.summaryData) {
      csvContent = [
        ['=== PAYROLL SUMMARY REPORT (Finance Staff) ==='],
        ['Report Period', report.period],
        ['Generated At', report.generatedAt],
        [''],
        ['=== PAYSLIP DATA ==='],
        ['Total Employees', report.totalEmployees],
        ['Total Gross Pay', `$${report.totalGrossPay.toFixed(2)}`],
        ['Total Net Pay', `$${report.totalNetPay.toFixed(2)}`],
        ['Total Payslips', report.summaryData.totalPayslips || 0],
        ['Total Insurance', `$${(report.summaryData.totalInsurance || 0).toFixed(2)}`],
        ['Total Penalties', `$${(report.summaryData.totalPenalties || 0).toFixed(2)}`],
        [''],
        ['=== TAX DATA ==='],
        ['Tax Year', report.summaryData.taxYear || 'N/A'],
        ['Total Tax Collected', `$${(report.summaryData.totalTaxCollected || report.totalTaxes || 0).toFixed(2)}`],
        ['Employees Taxed', report.summaryData.taxEmployeeCount || 0],
        [''],
        ['=== COMBINED TOTALS ==='],
        ['Total Deductions', `$${report.totalDeductions.toFixed(2)}`],
        ['Effective Tax Rate', report.totalGrossPay > 0 ? `${((report.totalTaxes / report.totalGrossPay) * 100).toFixed(2)}%` : 'N/A'],
      ].map(row => row.join(',')).join('\n');
    } else {
      csvContent = [
        ['Report Type', 'Period', 'Employees', 'Gross Pay', 'Net Pay', 'Deductions', 'Taxes'],
        [report.reportType, report.period, report.totalEmployees, report.totalGrossPay, report.totalNetPay, report.totalDeductions, report.totalTaxes]
      ].map(row => row.join(',')).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.reportType}-${report.period}-${Date.now()}.csv`;
    link.click();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Month-End & Year-End Payroll Summaries</h1>
          <p className="text-muted-foreground mt-1">
            Generate payroll summaries for audits and reporting
          </p>
        </div>
      </div>

      {/* Generation Toolbar */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-foreground mb-2">Period</label>
            <select
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-foreground mb-2">
              {periodType === 'monthly' ? 'Select Month' : 'Select Year'}
            </label>
            {periodType === 'monthly' ? (
              <input
                type="month"
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            ) : (
              <input
                type="number"
                min="2020"
                max="2030"
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              />
            )}
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={loading || (periodType === 'monthly' && !selectedMonth)}
            className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Reports */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Generated Reports</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground ml-3">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No reports found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Use the toolbar above to generate a month-end or year-end summary.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => {
              const typeBadge = getTypeBadge(report.reportType);
              const isSummaryReport = report.reportType === 'standard-summary' && report.summaryData;
              const currentSlide = summarySlides[report.id] || 0;

              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer relative ${isSummaryReport ? 'min-h-[300px]' : ''}`}
                >
                  {/* Delete Button */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report.id);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Period/Title */}
                  <div className="mb-4 pr-12">
                    <h3 className="text-lg font-semibold text-foreground">
                      {report.period && report.period.includes('-') && !report.period.startsWith('Year')
                        ? new Date(report.period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : report.period}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Generated: {new Date(report.generatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Summary Report with Slides */}
                  {isSummaryReport ? (
                    <div className="relative">
                      {/* Slide Navigation */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSummarySlides(prev => ({ ...prev, [report.id]: currentSlide === 0 ? 1 : 0 }));
                        }}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-card border border-border rounded-full p-1 shadow-sm hover:bg-muted"
                      >
                        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSummarySlides(prev => ({ ...prev, [report.id]: currentSlide === 0 ? 1 : 0 }));
                        }}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-card border border-border rounded-full p-1 shadow-sm hover:bg-muted"
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>

                      {/* Slide Content */}
                      <div className="overflow-hidden px-4">
                        {currentSlide === 0 ? (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                              Payslip Data
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Gross Pay:</span>
                              <span className="text-sm font-medium text-foreground">${report.totalGrossPay.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Net Pay:</span>
                              <span className="text-sm font-medium text-foreground">${report.totalNetPay.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Employees:</span>
                              <span className="text-sm font-medium text-foreground">{report.totalEmployees}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Insurance:</span>
                              <span className="text-sm font-medium text-foreground">${(report.summaryData?.totalInsurance || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                              Tax Data
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Tax:</span>
                              <span className="text-sm font-medium text-foreground">${(report.summaryData?.totalTaxCollected || report.totalTaxes).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Tax Year:</span>
                              <span className="text-sm font-medium text-foreground">{report.summaryData?.taxYear || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Employees Taxed:</span>
                              <span className="text-sm font-medium text-foreground">{report.summaryData?.taxEmployeeCount || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Deductions:</span>
                              <span className="text-sm font-medium text-destructive">${report.totalDeductions.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Slide Indicators */}
                      <div className="flex justify-center gap-2 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSummarySlides(prev => ({ ...prev, [report.id]: 0 }));
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${currentSlide === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSummarySlides(prev => ({ ...prev, [report.id]: 1 }));
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${currentSlide === 1 ? 'bg-purple-600' : 'bg-muted-foreground/30'}`}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Regular Report Details */
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Employees:</span>
                        <span className="text-sm font-medium text-foreground">{report.totalEmployees}</span>
                      </div>
                      {report.reportType === 'tax-report' ? (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Tax:</span>
                          <span className="text-sm font-medium text-foreground">${report.totalTaxes.toLocaleString()}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Gross Pay:</span>
                            <span className="text-sm font-medium text-foreground">${report.totalGrossPay.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Net Pay:</span>
                            <span className="text-sm font-medium text-foreground">${report.totalNetPay.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${typeBadge.className}`}>
                      {typeBadge.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadCSV(report);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Download CSV"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {selectedReport.period && selectedReport.period.includes('-') && !selectedReport.period.startsWith('Year')
                    ? new Date(selectedReport.period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : selectedReport.period} Detail
                </h3>
                <p className="text-sm text-muted-foreground">Report ID: {selectedReport.id}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <p className="text-sm text-primary font-medium">Total Employees</p>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{selectedReport.totalEmployees}</p>
                </div>
                <div className="bg-info/10 p-4 rounded-xl border border-info/20">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-info" />
                    <p className="text-sm text-info font-medium">Total Gross Pay</p>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">${selectedReport.totalGrossPay.toLocaleString()}</p>
                </div>
                <div className="bg-success/10 p-4 rounded-xl border border-success/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Receipt className="w-5 h-5 text-success" />
                    <p className="text-sm text-success font-medium">Total Net Pay</p>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">${selectedReport.totalNetPay.toLocaleString()}</p>
                </div>
              </div>

              {selectedReport.reportType === 'standard-summary' && selectedReport.summaryData && (
                <div className="space-y-8">
                  {/* Tax Breakdown */}
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">
                      Tax Compliance Summary
                    </h4>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-foreground">Metric</th>
                            <th className="px-4 py-3 text-right font-medium text-foreground">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">Tax Year</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{selectedReport.summaryData.taxYear}</td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">Total Tax Collected</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground font-mono">${selectedReport.summaryData.totalTaxCollected.toLocaleString()}</td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">Employees Taxed</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{selectedReport.summaryData.taxEmployeeCount}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Department Breakdown */}
                  {selectedReport.summaryData.byDepartment && Object.keys(selectedReport.summaryData.byDepartment).length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-foreground mb-4">
                        Departmental Breakdown
                      </h4>
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-foreground">Department</th>
                              <th className="px-4 py-3 text-right font-medium text-foreground">Gross</th>
                              <th className="px-4 py-3 text-right font-medium text-foreground">Net</th>
                              <th className="px-4 py-3 text-right font-medium text-foreground">Employees</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {Object.entries(selectedReport.summaryData.byDepartment).map(([name, data]: [string, any]) => (
                              <tr key={name} className="hover:bg-muted/30">
                                <td className="px-4 py-3 text-foreground font-medium">{name}</td>
                                <td className="px-4 py-3 text-right text-muted-foreground font-mono">${(data.gross || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-muted-foreground font-mono">${(data.net || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-foreground">{data.count || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* General Info */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Generated on {new Date(selectedReport.generatedAt).toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleDownloadCSV(selectedReport)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
