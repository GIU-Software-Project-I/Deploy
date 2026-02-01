'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getJobs, publishJob, closeJob } from '@/app/services/recruitment';
import { JobRequisition } from '@/types/recruitment';

// =====================================================
// Types
// =====================================================

// Combined interface for displaying job requisitions with template data
interface JobWithDetails {
  id: string;
  requisitionId: string;
  templateId?: string;
  openings: number;
  location?: string;
  hiringManagerId: string;
  publishStatus: 'draft' | 'published' | 'closed';
  postingDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  // Denormalized from template
  templateTitle?: string;
  hiringManagerName?: string;
  applicationCount?: number;
  // Template fields for preview (may not be returned by API)
  title?: string;
  department?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  qualifications?: string[];
}

interface EmployerBranding {
  companyName: string;
  logo: string;
  tagline: string;
  description: string;
  benefits: string[];
  culture: string[];
}

// Default branding - could be fetched from API in future
const defaultEmployerBranding: EmployerBranding = {
  companyName: 'Our Company',
  logo: '/logo-placeholder.png',
  tagline: 'Building the Future Together',
  description: 'We are a leading technology company dedicated to creating innovative solutions that transform businesses and improve lives.',
  benefits: [
    'Competitive Salary & Bonuses',
    'Health Insurance',
    'Remote Work Options',
    'Learning & Development Budget',
    'Flexible Working Hours',
    'Annual Leave + Paid Time Off',
  ],
  culture: [
    'Innovation First',
    'Collaborative Environment',
    'Work-Life Balance',
    'Diversity & Inclusion',
    'Continuous Learning',
  ],
};

// =====================================================
// Status Badge Component
// =====================================================

function StatusBadge({ status }: { status: 'draft' | 'published' | 'closed' }) {
  const statusStyles = {
    draft: 'bg-muted text-muted-foreground border-border',
    published: 'bg-success/10 text-success border-success/30',
    closed: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  const statusLabels = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

// =====================================================
// Job Preview Modal
// =====================================================

function JobPreviewModal({
  job,
  branding,
  onClose,
  onPublish,
  isPublishing,
  showPublishButton = true,
}: {
  job: JobWithDetails;
  branding: EmployerBranding;
  onClose: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  showPublishButton?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Branding */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-background rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold text-xl">TC</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{branding.companyName}</h2>
              <p className="text-primary-foreground/70">{branding.tagline}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{job.title || job.templateTitle || 'Position'}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-primary-foreground/70">
            {job.department && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {job.openings} Opening{job.openings > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {job.description && (
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">About This Role</h3>
              <p className="text-muted-foreground">{job.description}</p>
            </section>
          )}

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">Responsibilities</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {job.responsibilities.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {job.requirements.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Qualifications */}
          {job.qualifications && job.qualifications.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">Qualifications</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {job.qualifications.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Benefits & Culture */}
          <section className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-3">Why Join Us?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Benefits</h4>
                <ul className="space-y-1">
                  {branding.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Our Culture</h4>
                <ul className="space-y-1">
                  {branding.culture.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {showPublishButton && job.publishStatus === 'draft' && (
            <Button
              variant="default"
              onClick={onPublish}
              disabled={isPublishing}
            >
              Publish Job
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Employer Branding Section
// =====================================================

function EmployerBrandingSection({ branding }: { branding: EmployerBranding }) {
  return (
    <Card className="mb-6">
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-bold text-2xl">TC</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{branding.companyName}</h2>
          <p className="text-primary font-medium">{branding.tagline}</p>
          <p className="text-muted-foreground mt-2 text-sm">{branding.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {branding.culture.slice(0, 4).map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function HREmployeeJobsPage() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load jobs from API
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jobs = await getJobs();
      // Map API response to expected format
      // Handle both 'id' and '_id' from MongoDB responses
      const mappedJobs: JobWithDetails[] = jobs.map((job: JobRequisition & { _id?: string }) => ({
        ...job,
        id: job.id || (job as { _id?: string })._id || job.requisitionId,
        title: job.templateTitle || 'Untitled Position',
        department: job.location || 'Not specified',
        description: '',
        requirements: [],
        qualifications: [],
        responsibilities: [],
      }));
      setJobs(mappedJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const jobTitle = job.title || job.templateTitle || '';
    const jobDepartment = job.department || '';
    const matchesSearch =
      jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobDepartment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requisitionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.publishStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: jobs.length,
    draft: jobs.filter((j) => j.publishStatus === 'draft').length,
    published: jobs.filter((j) => j.publishStatus === 'published').length,
    closed: jobs.filter((j) => j.publishStatus === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Handle Publish Job (REC-023: Test 3.6)
  const handlePublish = async (jobRequisitionId: string) => {
    console.log('[Publish] Job Requisition ID:', jobRequisitionId);
    if (!confirm('Publish this job to the public careers page?')) return;
    try {
      setIsPublishing(true);
      setError(null);
      // publishJob uses requisitionId which is the MongoDB _id
      await publishJob(jobRequisitionId, true);
      await loadJobs();
      setSelectedJob(null);
      // Show success message
      alert('Job published successfully! It will now appear on the careers page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish job');
      console.error('Publish error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Unpublish Job (REC-023: Test 3.10)
  const handleUnpublish = async (jobRequisitionId: string) => {
    console.log('[Unpublish] Job Requisition ID:', jobRequisitionId);
    if (!confirm('Unpublish this job? It will be removed from the public careers page.')) return;
    try {
      setError(null);
      // closeJob uses requisitionId which is the MongoDB _id
      await closeJob(jobRequisitionId);
      await loadJobs();
      // Show success message
      alert('Job unpublished successfully! It is no longer visible on the careers page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish job');
      console.error('Unpublish error:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Job Publishing</h1>
        <p className="text-muted-foreground mt-1">
          Manage and publish job postings to the company careers page
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-destructive" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-destructive font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive hover:text-destructive/80">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Employer Branding Section (BR-6, REC-023) */}
      <EmployerBrandingSection branding={defaultEmployerBranding} />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Jobs</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Draft</p>
          <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="text-2xl font-bold text-success">{stats.published}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Closed</p>
          <p className="text-2xl font-bold text-destructive">{stats.closed}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Search jobs by title, department, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'published', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Jobs Table */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Job Details
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Applications
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Posted Date
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No jobs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, index) => (
                  <tr key={job.id || job.requisitionId || `job-${index}`} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.requisitionId}</p>
                        <p className="text-sm text-muted-foreground">{job.location} • {job.openings} opening{job.openings > 1 ? 's' : ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">{job.department}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.publishStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">{job.applicationCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">
                        {job.postingDate || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {/* REC-023: Test 3.5 - Preview Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                        >
                          Preview
                        </Button>
                        {/* REC-023: Test 3.6 - Publish Button */}
                        {job.publishStatus === 'draft' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePublish(job.requisitionId)}
                            disabled={isPublishing}
                          >
                            Publish
                          </Button>
                        )}
                        {/* REC-023: Test 3.10 - Unpublish Button */}
                        {job.publishStatus === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnpublish(job.requisitionId)}
                          >
                            Unpublish
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Job Preview Modal (REC-023: Test 3.5) */}
      {selectedJob && (
        <JobPreviewModal
          job={selectedJob}
          branding={defaultEmployerBranding}
          onClose={() => setSelectedJob(null)}
          onPublish={() => handlePublish(selectedJob.requisitionId)}
          isPublishing={isPublishing}
          showPublishButton={selectedJob.publishStatus === 'draft'}
        />
      )}

      {/* Create Job Modal (REC-023: Test 3.2) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-3xl w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">Job Creation Notice</h2>
                <p className="text-muted-foreground mb-4">
                  Job creation is currently managed through the HR Manager dashboard where job templates are configured.
                </p>
                <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-info mb-2">
                    <strong>Current Process:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-info/80">
                    <li>HR Manager creates job requisitions using templates</li>
                    <li>Job requisitions appear in your dashboard as "Draft"</li>
                    <li>You can preview and publish approved jobs to the careers page</li>
                    <li>You can manage employer branding and job visibility</li>
                  </ol>
                </div>
                <p className="text-sm text-muted-foreground">
                  If you need to create a new job, please contact your HR Manager or use the HR Manager role dashboard.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
