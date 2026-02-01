'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onboardingService, DocumentType, Document } from '@/app/services/onboarding';
import { useAuth } from '@/context/AuthContext';

interface UploadedFile {
  type: DocumentType;
  name: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const REQUIRED_DOCUMENTS = [
  {
    type: DocumentType.CONTRACT,
    label: 'Signed Contract',
    description: 'Your signed employment contract',
    required: true,
  },
  {
    type: DocumentType.ID,
    label: 'Government ID',
    description: 'Valid government-issued ID (passport, national ID)',
    required: true,
  },
  {
    type: DocumentType.CERTIFICATE,
    label: 'Certificates',
    description: 'Educational or professional certifications',
    required: false,
  },
  {
    type: DocumentType.CV,
    label: 'Updated CV/Resume',
    description: 'Your latest CV or resume',
    required: false,
  },
];

export default function CandidateDocumentUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [allRequiredUploaded, setAllRequiredUploaded] = useState(false);

  useEffect(() => {
    const loadExistingDocuments = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const documents = await onboardingService.getDocumentsByOwner(user.id);

        const existingFiles: UploadedFile[] = documents.map((doc: Document) => ({
          type: doc.type,
          name: doc.filePath.split('/').pop() || 'Document',
          status: 'success' as const,
        }));

        setUploadedFiles(existingFiles);

        const requiredTypes = REQUIRED_DOCUMENTS.filter(d => d.required).map(d => d.type);
        const uploadedTypes = existingFiles.filter(f => f.status === 'success').map(f => f.type);
        const allRequired = requiredTypes.every(t => uploadedTypes.includes(t));
        setAllRequiredUploaded(allRequired);
      } catch (err: any) {
        if (!err.message?.includes('404')) {
          console.error('Failed to load existing documents:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadExistingDocuments();
  }, [user?.id]);

  const handleFileSelect = (docType: DocumentType) => {
    setSelectedDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocType) return;

    const ownerId = user?.id;
    if (!ownerId) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    const newFile: UploadedFile = {
      type: selectedDocType,
      name: file.name,
      status: 'uploading',
    };

    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.type !== selectedDocType);
      return [...filtered, newFile];
    });

    try {
      setUploading(true);
      setError(null);

      const filePath = `/uploads/${ownerId}/${selectedDocType}/${file.name}`;

      await onboardingService.uploadDocument({
        ownerId,
        type: selectedDocType,
        filePath,
      });

      setUploadedFiles(prev =>
        prev.map(f =>
          f.type === selectedDocType ? { ...f, status: 'success' as const } : f
        )
      );

      setSuccess(`${REQUIRED_DOCUMENTS.find(d => d.type === selectedDocType)?.label} uploaded successfully`);
      setTimeout(() => setSuccess(null), 4000);

      const requiredTypes = REQUIRED_DOCUMENTS.filter(d => d.required).map(d => d.type);
      const uploadedTypes = [...uploadedFiles.filter(f => f.status === 'success').map(f => f.type), selectedDocType];
      const allRequired = requiredTypes.every(t => uploadedTypes.includes(t));
      setAllRequiredUploaded(allRequired);

    } catch (err: any) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.type === selectedDocType ? { ...f, status: 'error' as const, error: err.message } : f
        )
      );
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setSelectedDocType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getDocumentStatus = (docType: DocumentType) => {
    const file = uploadedFiles.find(f => f.type === docType);
    return file?.status || 'pending';
  };

  const renderDocIcon = (docType: DocumentType) => {
    const className = "w-6 h-6";
    switch (docType) {
      case DocumentType.CONTRACT:
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case DocumentType.ID:
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>;
      case DocumentType.CERTIFICATE:
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
      case DocumentType.CV:
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
      default:
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 lg:p-10">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted/50 rounded-2xl w-2/3"></div>
            <div className="h-6 bg-muted/30 rounded-xl w-1/2"></div>
            <div className="h-24 bg-card border border-border rounded-3xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-card border border-border rounded-3xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const uploadedCount = uploadedFiles.filter(f => f.status === 'success').length;
  const requiredCount = REQUIRED_DOCUMENTS.filter(d => d.required).length;
  const progressPercentage = Math.round((uploadedCount / requiredCount) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto p-6 lg:p-10">
          <Link
            href="/portal/my-onboarding"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Onboarding
          </Link>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Document Upload</h1>
          <p className="text-muted-foreground mt-2 text-lg">Upload your signed contract and required documents</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-destructive/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-foreground/5 border border-foreground/10 text-foreground px-5 py-4 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Progress Card */}
        <div className="bg-card border border-border rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Upload Progress</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{uploadedCount} of {requiredCount} required documents</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-foreground">{progressPercentage}%</p>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-700"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Info Notice */}
        <div className="bg-muted/30 border border-border rounded-2xl p-5 flex gap-4">
          <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center flex-shrink-0 border border-border">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Important</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Documents must be verified by HR before your first working day. Ensure all files are clear and legible.
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const status = getDocumentStatus(doc.type);
            const uploadedFile = uploadedFiles.find(f => f.type === doc.type);
            const isUploading = status === 'uploading';
            const isSuccess = status === 'success';
            const isError = status === 'error';

            return (
              <div
                key={doc.type}
                onClick={() => !isUploading && handleFileSelect(doc.type)}
                className={`bg-card rounded-3xl border-2 transition-all cursor-pointer group ${isSuccess
                    ? 'border-foreground/20 bg-foreground/[0.02]'
                    : isError
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border hover:border-foreground/20 hover:bg-muted/20'
                  }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${isSuccess ? 'bg-foreground text-background' : isError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                      }`}>
                      {isUploading ? (
                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : isSuccess ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        renderDocIcon(doc.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{doc.label}</h3>
                        {doc.required && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-foreground text-background rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>

                      {isSuccess && uploadedFile && (
                        <div className="flex items-center gap-2 mt-3 text-sm font-medium text-foreground/80">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="truncate">{uploadedFile.name}</span>
                        </div>
                      )}

                      {isError && uploadedFile && (
                        <p className="text-sm text-destructive mt-2">{uploadedFile.error || 'Upload failed'}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                    {isSuccess ? (
                      <span className="text-sm font-medium text-muted-foreground">Click to replace</span>
                    ) : isUploading ? (
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    ) : (
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Click to upload</span>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSuccess ? 'bg-foreground text-background' : 'bg-muted group-hover:bg-foreground group-hover:text-background'
                      }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Accepted Formats */}
        <div className="bg-muted/30 rounded-2xl p-4 flex items-center gap-3 border border-border/50">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Accepted formats:</span> PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
          </p>
        </div>

        {/* Success Celebration */}
        {allRequiredUploaded && (
          <div className="bg-foreground text-background rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)]"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-background/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-black">All Required Documents Uploaded!</h3>
              <p className="opacity-80 mt-3 max-w-md mx-auto">
                You can now proceed to view your onboarding tracker and complete remaining tasks.
              </p>
              <button
                onClick={() => router.push('/portal/my-onboarding')}
                className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-background text-foreground font-bold rounded-full hover:bg-background/90 transition-all shadow-lg"
              >
                View Onboarding Tracker
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* What Happens Next */}
        <div className="bg-card border border-border rounded-3xl p-8">
          <h2 className="font-bold text-foreground mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </span>
            What Happens Next?
          </h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Document Verification', description: 'HR will verify your uploaded documents', active: true },
              { step: 2, title: 'Profile Creation', description: 'Your employee profile will be created from contract details', active: false },
              { step: 3, title: 'System Access', description: 'IT will provision your email and system access', active: false },
              { step: 4, title: 'Equipment Setup', description: 'Your workspace and equipment will be prepared', active: false },
              { step: 5, title: 'Orientation', description: 'Complete department-specific onboarding tasks', active: false },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${item.active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                  }`}>
                  {item.step}
                </div>
                <div className="pt-1">
                  <p className={`font-semibold ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}>{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-muted/20 border border-border rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-background border border-border rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Need Help?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                If you have questions about the required documents or encounter any issues during upload, please contact HR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
