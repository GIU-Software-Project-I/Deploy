'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { FileText, Download, Calendar, Info, Clock, ChevronLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Tax Documents Page - Department Employee
 * REQ-PY-15: Download tax documents (e.g., annual tax statement) for official purposes
 */

// Backend response type
interface TaxDocumentsResponse {
  employeeId: string;
  taxYear: number;
  documents: Array<{
    type: string;
    fileName: string;
    downloadUrl: string;
    generatedDate: string;
  }>;
}

interface TaxDocument {
  id: string;
  year: number;
  type: string;
  status: string;
  generatedDate: string;
  description?: string;
  fileName?: string;
  downloadUrl?: string;
}

export default function TaxDocumentsPage() {
  const { user } = useAuth();
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Generate available years (last 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchTaxDocuments = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await payrollTrackingService.getTaxDocuments(
          user.id,
          selectedYear || undefined
        );
        const data = response?.data as TaxDocumentsResponse | undefined;
        const documents = data?.documents || [];
        const mappedDocuments: TaxDocument[] = documents.map((doc, index) => ({
          id: `${data?.taxYear || currentYear}-${index}`,
          year: data?.taxYear || currentYear,
          type: doc.type,
          status: 'available',
          generatedDate: doc.generatedDate,
          fileName: doc.fileName,
          downloadUrl: doc.downloadUrl,
        }));
        setTaxDocuments(mappedDocuments);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tax documents';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxDocuments();
  }, [user?.id, selectedYear, currentYear]);

  const handleDownload = async (year: number) => {
    if (!user?.id) return;
    
    try {
      setDownloading(year.toString());
      const response = await payrollTrackingService.downloadAnnualTaxStatement(user.id, year);
      
      if (response?.error) {
        alert('Failed to download tax document: ' + response.error);
        return;
      }
      
      if (response?.blob) {
        const url = window.URL.createObjectURL(response.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || `tax-statement-${year}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to download tax document: ' + errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">Available</span>;
      case 'generating':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-info/10 text-info border border-info/30">Generating</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30">Pending</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">{status || 'N/A'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tax documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-destructive font-medium">Error loading tax documents</p>
        </div>
        <p className="text-destructive/80 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="dept-head-theme min-h-screen bg-background text-foreground space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Tax Documents</h1>
          <p className="text-muted-foreground mt-2">Download your annual tax statements and other tax-related documents</p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted/50 hover:text-foreground transition-colors flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Payroll
          </button>
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-primary rounded-xl p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tax Documents Center</h2>
            <p className="text-primary-foreground/70 mt-1">Download official tax documents for filing and records</p>
          </div>
          <div className="p-3 bg-primary-foreground/10 rounded-xl">
            <FileText className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Year Filter */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-foreground font-medium">Filter by Year:</span>
          <button
            onClick={() => setSelectedYear(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedYear === null
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
            }`}
          >
            All Years
          </button>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedYear === year
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Download Section */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Quick Download - Annual Tax Statements</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Download your annual tax statement for any available year. These documents are needed for tax filing purposes.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => handleDownload(year)}
              disabled={downloading === year.toString()}
              className="p-4 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors text-center group disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10">
                <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="font-semibold text-foreground group-hover:text-primary">{year}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {downloading === year.toString() ? 'Downloading...' : 'Annual Statement'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">All Tax Documents</h3>
        </div>
        
        {taxDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Tax Documents Available</h3>
            <p className="text-muted-foreground">
              {selectedYear
                ? `No tax documents found for ${selectedYear}.`
                : 'Your tax documents will appear here once they are generated.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Document</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Year</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Generated Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {taxDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{doc.type}</p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">{doc.year}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(doc.generatedDate)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload(doc.year)}
                        disabled={downloading === doc.year.toString() || doc.status?.toLowerCase() !== 'available'}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 ml-auto"
                      >
                        <Download className="h-4 w-4" />
                        {downloading === doc.year.toString() ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-info/10 border border-info/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Info className="h-5 w-5 text-info" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">About Tax Statements</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Annual tax statements summarize your earnings, deductions, and taxes withheld during the tax year.
                You&apos;ll need these documents when filing your income tax return.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Document Availability</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Annual tax statements are typically available by late January for the previous tax year.
                Contact HR if you need a document that isn&apos;t showing up.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Types Explanation */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Understanding Your Tax Documents</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground">Annual Tax Statement</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive summary of your yearly earnings and tax withholdings.
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground">Tax Certificate</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Official certificate of tax payments made on your behalf.
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground">Income Summary</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed breakdown of all income sources and amounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}