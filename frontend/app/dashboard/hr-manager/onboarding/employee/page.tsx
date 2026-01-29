'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onboardingService } from '@/app/services/onboarding';

interface SignedContract {
  _id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobPostingId: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  positionId?: string;
  positionTitle?: string;
  contractSignedDate: string;
  startDate: string;
  salary?: number;
  signingBonus?: number;
  contractType?: string;
  hasOnboarding: boolean;
}

export default function CreateEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<SignedContract | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSignedContracts();
  }, []);

  const fetchSignedContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getSignedContractsForOnboarding();
      setContracts(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (err.message?.includes('404')) {
        setContracts([]);
      } else {
        setError(err.message || 'Failed to fetch signed contracts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!selectedContract) return;

    try {
      setCreating(true);
      setError(null);

      await onboardingService.createEmployeeFromContract(selectedContract._id);

      setSuccess(`Employee profile created successfully for ${selectedContract.candidateName}`);
      setSelectedContract(null);
      await fetchSignedContracts();

      setTimeout(() => {
        router.push('/dashboard/hr-manager/onboarding');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create employee profile');
    } finally {
      setCreating(false);
    }
  };

  const availableContracts = contracts.filter((c) => !c.hasOnboarding);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr-manager/onboarding"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Create Employee Profile</h1>
            <p className="text-muted-foreground mt-1">
              Create employee profiles from signed contracts (ONB-002)
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-foreground">
              <p className="font-medium text-primary">Employee Profile Creation Process</p>
              <p className="mt-1 opacity-90">
                Select a signed contract below to create an employee profile. This will:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 opacity-90">
                <li>Create a new employee profile with contract details</li>
                <li>Generate an onboarding checklist with default tasks</li>
                <li>Initiate payroll setup based on contract signing date</li>
                <li>Process any signing bonuses if applicable</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contracts List */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-foreground">Signed Contracts Pending Employee Creation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {availableContracts.length} contract(s) awaiting employee profile creation
            </p>
          </div>

          {availableContracts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground">No signed contracts pending employee creation</p>
              <p className="text-sm text-muted-foreground mt-1">
                All candidates with signed contracts have been processed
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {availableContracts.map((contract) => (
                <div
                  key={contract._id}
                  onClick={() => setSelectedContract(contract)}
                  className={`p-4 cursor-pointer transition-colors ${selectedContract?._id === contract._id
                    ? 'bg-primary/5 border-l-4 border-l-primary'
                    : 'hover:bg-accent/50'
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{contract.candidateName}</h3>
                        {selectedContract?._id === contract._id && (
                          <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{contract.candidateEmail}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Position:</span>{' '}
                          <span className="text-foreground">{contract.jobTitle}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Department:</span>{' '}
                          <span className="text-foreground">{contract.departmentName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>{' '}
                          <span className="text-foreground">
                            {new Date(contract.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Contract Signed</p>
                      <p className="text-foreground font-medium">
                        {new Date(contract.contractSignedDate).toLocaleDateString()}
                      </p>
                      {contract.signingBonus && (
                        <p className="text-green-600 dark:text-green-400 mt-1 font-medium">
                          Bonus: ${contract.signingBonus.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button & Preview */}
        {selectedContract && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/20">
              <h2 className="text-lg font-semibold text-foreground">Review & Create Employee Profile</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Please review the details below before creating the employee profile.
                System access tasks will be automatically generated.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-primary uppercase tracking-wider">Candidate Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{selectedContract.candidateName}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Personal Email</span>
                    <span className="font-medium text-foreground">{selectedContract.candidateEmail}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Job Title</span>
                    <span className="font-medium text-foreground">{selectedContract.jobTitle}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Department</span>
                    <span className="font-medium text-foreground">{selectedContract.departmentName}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Start Date</span>
                    <span className="font-medium text-foreground">{new Date(selectedContract.startDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Signed On</span>
                    <span className="font-medium text-foreground">{new Date(selectedContract.contractSignedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-primary uppercase tracking-wider">System Provisioning (Auto)</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Projected Work Email</span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedContract.candidateName.split(' ')[0].toLowerCase()}.
                      {selectedContract.candidateName.split(' ').slice(1).join('').toLowerCase()}@company.com
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Employee ID</span>
                    <span className="font-mono text-foreground font-medium">Auto-generated</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Temporary Password</span>
                    <span className="font-mono text-foreground font-medium">Auto-generated sent to personal email</span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-blue-800 dark:text-blue-300 text-xs">
                    <strong>Note:</strong> Creating the profile will automatically trigger the Onboarding Checklist, allowing the System Admin to finalize access rights.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/10 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 text-foreground font-medium hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEmployee}
                disabled={creating}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {creating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating Profile...
                  </>
                ) : (
                  'Confirm & Create Profile'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

