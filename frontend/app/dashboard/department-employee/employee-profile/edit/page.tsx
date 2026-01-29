'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/glass-card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Phone, Mail, MapPin, Camera, Trash, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// Custom Input component with label support
interface InputWithLabelProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

function InputWithLabel({ label, className, ...props }: InputWithLabelProps) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      <Input className={className} {...props} />
    </div>
  );
}

// Custom Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

function LoadingButton({ isLoading, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Employee Profile Edit Page - Department Employee
 * US-E2-05: Update contact information (immediate)
 * US-E2-12: Update bio and photo (immediate)
 * US-E6-02: Submit correction request for critical data
 */
export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'bio' | 'emergency' | 'correction'>('contact');

  // Contact Info State
  const [contactInfo, setContactInfo] = useState({
    mobilePhone: '',
    homePhone: '',
    personalEmail: '',
    address: {
      city: '',
      streetAddress: '',
      country: '',
    },
  });

  // Bio State
  const [bioInfo, setBioInfo] = useState({
    biography: '',
    profilePictureUrl: '',
  });

  // Correction Request State
  const [correctionRequest, setCorrectionRequest] = useState({
    requestDescription: '',
    reason: '',
  });

  // Emergency Contact State
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    isPrimary: false,
  });
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await employeeProfileService.getMyProfile();
        const data = response.data as any;
        setProfile(data);

        // Initialize contact info
        setContactInfo({
          mobilePhone: data?.mobilePhone || '',
          homePhone: data?.homePhone || '',
          personalEmail: data?.personalEmail || '',
          address: {
            city: data?.address?.city || '',
            streetAddress: data?.address?.streetAddress || '',
            country: data?.address?.country || '',
          },
        });

        // Initialize bio
        setBioInfo({
          biography: data?.biography || '',
          profilePictureUrl: data?.profilePictureUrl || '',
        });

        // Initialize emergency contacts
        setEmergencyContacts(data?.emergencyContacts || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await employeeProfileService.updateContactInfo(profile._id, contactInfo);
      setSuccessMessage('Contact information updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update contact information');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await employeeProfileService.updateBio(profile._id, bioInfo);
      setSuccessMessage('Biography updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update biography');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      let updatedContacts;
      if (editingContactIndex !== null) {
        // Update existing
        const response = await employeeProfileService.updateEmergencyContact(profile._id, editingContactIndex, contactForm);
        updatedContacts = response.data;
        setSuccessMessage('Emergency contact updated successfully!');
      } else {
        // Add new
        const response = await employeeProfileService.addEmergencyContact(profile._id, contactForm);
        updatedContacts = response.data;
        setSuccessMessage('Emergency contact added successfully!');
      }

      setEmergencyContacts(updatedContacts as any[]);
      setShowContactForm(false);
      setEditingContactIndex(null);
      setContactForm({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        isPrimary: false,
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save emergency contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmergencyContact = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this emergency contact?')) return;

    try {
      setLoading(true);
      const response = await employeeProfileService.deleteEmergencyContact(profile._id, index);
      setEmergencyContacts(response.data as any[]);
      setSuccessMessage('Emergency contact deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete emergency contact');
    } finally {
      setLoading(false);
    }
  };

  const startEditContact = (index: number) => {
    const contact = emergencyContacts[index];
    setContactForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || '',
      isPrimary: contact.isPrimary || false,
    });
    setEditingContactIndex(index);
    setShowContactForm(true);
  };

  const handleSubmitCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionRequest.requestDescription.trim()) {
      setError('Please describe the correction you need');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await employeeProfileService.submitCorrectionRequest(profile._id, correctionRequest);
      setSuccessMessage('Correction request submitted successfully! HR will review it.');
      setCorrectionRequest({ requestDescription: '', reason: '' });
      setTimeout(() => {
        setSuccessMessage(null);
        router.push('/dashboard/department-employee/employee-profile');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <GlassCard className="border-warning/20 bg-warning/5 p-6">
        <p className="text-warning font-medium">No profile data found</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Edit Profile</h1>
          <p className="text-muted-foreground mt-1">Update your personal information</p>
        </div>
        <Link href="/dashboard/department-employee/employee-profile">
          <Button variant="outline" className="rounded-xl gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Button>
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <GlassCard className="border-success/20 bg-success/5 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <p className="text-success font-medium">{successMessage}</p>
        </GlassCard>
      )}

      {/* Error Message */}
      {error && (
        <GlassCard className="border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <p className="text-destructive font-medium">{error}</p>
        </GlassCard>
      )}

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-xl shadow-primary/20">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
            <User className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">
              {profile.firstName} {profile.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-white/90">
              <span className="font-medium">{profile.positionName || 'N/A'}</span>
              <span>•</span>
              <span className="opacity-90">{profile.departmentName || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-px">
        {[
          { id: 'contact', label: 'Contact Information', icon: '📞' },
          { id: 'bio', label: 'Biography & Photo', icon: '✍️' },
          { id: 'emergency', label: 'Emergency Contacts', icon: '🚨' },
          { id: 'correction', label: 'Request Correction', icon: '📝' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium transition-all relative whitespace-nowrap ${activeTab === tab.id
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Contact Information Tab */}
      {activeTab === 'contact' && (
        <form onSubmit={handleUpdateContactInfo}>
          <GlassCard className="p-6 md:p-8 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Update Contact Information</h3>
              <p className="text-sm text-muted-foreground">
                These changes will be applied immediately without requiring approval.
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWithLabel
                  label="Mobile Phone"
                  type="tel"
                  value={contactInfo.mobilePhone}
                  onChange={(e) => setContactInfo({ ...contactInfo, mobilePhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
                <InputWithLabel
                  label="Home Phone"
                  type="tel"
                  value={contactInfo.homePhone}
                  onChange={(e) => setContactInfo({ ...contactInfo, homePhone: e.target.value })}
                  placeholder="+1 (555) 987-6543"
                />
              </div>

              <InputWithLabel
                label="Personal Email"
                type="email"
                value={contactInfo.personalEmail}
                onChange={(e) => setContactInfo({ ...contactInfo, personalEmail: e.target.value })}
                placeholder="your.email@example.com"
              />

              <div className="space-y-6">
                <h4 className="font-semibold text-slate-900">Address</h4>
                <InputWithLabel
                  label="Street Address"
                  value={contactInfo.address.streetAddress}
                  onChange={(e) => setContactInfo({
                    ...contactInfo,
                    address: { ...contactInfo.address, streetAddress: e.target.value }
                  })}
                  placeholder="123 Main Street, Apt 4B"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWithLabel
                    label="City"
                    value={contactInfo.address.city}
                    onChange={(e) => setContactInfo({
                      ...contactInfo,
                      address: { ...contactInfo.address, city: e.target.value }
                    })}
                    placeholder="New York"
                  />
                  <InputWithLabel
                    label="Country"
                    value={contactInfo.address.country}
                    onChange={(e) => setContactInfo({
                      ...contactInfo,
                      address: { ...contactInfo.address, country: e.target.value }
                    })}
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <LoadingButton type="submit" isLoading={saving} className="rounded-xl">
                💾 Save Contact Information
              </LoadingButton>
              <Link href="/dashboard/department-employee/employee-profile">
                <Button type="button" variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              </Link>
            </div>
          </GlassCard>
        </form>
      )}

      {/* Biography & Photo Tab */}
      {activeTab === 'bio' && (
        <form onSubmit={handleUpdateBio}>
          <GlassCard className="p-6 md:p-8 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Update Biography & Photo</h3>
              <p className="text-sm text-muted-foreground">
                These changes will be applied immediately without requiring approval.
              </p>
            </div>

            <div className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Profile Picture
                </label>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Current/Preview Image */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                      {bioInfo.profilePictureUrl ? (
                        <img
                          src={bioInfo.profilePictureUrl}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-6xl">👤</div>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
                    <div className="space-y-3">
                      <input
                        type="file"
                        id="profile-picture-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (max 2MB)
                            if (file.size > 2 * 1024 * 1024) {
                              alert('Image size should be less than 2MB');
                              return;
                            }

                            // Convert to base64
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setBioInfo({ ...bioInfo, profilePictureUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />

                      <label
                        htmlFor="profile-picture-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
                      >
                        📸 Choose Photo
                      </label>

                      {bioInfo.profilePictureUrl && (
                        <button
                          type="button"
                          onClick={() => setBioInfo({ ...bioInfo, profilePictureUrl: '' })}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium ml-2"
                        >
                          🗑️ Remove Photo
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Upload a profile picture (JPG, PNG, or GIF). Max size: 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Biography
                </Label>
                <Textarea
                  value={bioInfo.biography}
                  onChange={(e) => setBioInfo({ ...bioInfo, biography: e.target.value })}
                  placeholder="Tell us about yourself, your role, interests, and professional background..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bioInfo.biography.length} characters
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <LoadingButton type="submit" isLoading={saving} className="rounded-xl">
                💾 Save Biography
              </LoadingButton>
              <Link href="/dashboard/department-employee/employee-profile">
                <Button type="button" variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              </Link>
            </div>
          </GlassCard>
        </form>
      )}

      {/* Emergency Contacts Tab */}
      {activeTab === 'emergency' && (
        <div className="space-y-6">
          {!showContactForm ? (
            <GlassCard className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground">Your Emergency Contacts</h3>
                <Button onClick={() => {
                  setContactForm({
                    name: '',
                    relationship: '',
                    phone: '',
                    email: '',
                    isPrimary: false,
                  });
                  setEditingContactIndex(null);
                  setShowContactForm(true);
                }} className="rounded-xl shadow-lg shadow-primary/20">
                  + Add New Contact
                </Button>
              </div>

              {emergencyContacts.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                  <div className="text-4xl mb-4">🚨</div>
                  <h4 className="text-lg font-medium text-foreground">No Emergency Contacts</h4>
                  <p className="text-muted-foreground mt-2 mb-6">You haven't added any emergency contacts yet.</p>
                  <Button onClick={() => setShowContactForm(true)} variant="outline">Add Your First Contact</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {emergencyContacts.map((contact, index) => (
                    <div key={index} className={`relative p-6 rounded-xl border transition-all hover:shadow-md ${contact.isPrimary ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                      {contact.isPrimary && (
                        <span className="absolute top-4 right-4 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium border border-primary/20">
                          Primary
                        </span>
                      )}
                      <div className="mb-4">
                        <h4 className="font-bold text-lg text-foreground">{contact.name}</h4>
                        <p className="text-muted-foreground font-medium text-sm uppercase tracking-wide">{contact.relationship}</p>
                      </div>
                      <div className="space-y-3 text-sm mb-6">
                        <div className="flex items-center gap-2 text-foreground">
                          <Phone className="w-4 h-4 text-muted-foreground" /> {contact.phone}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2 text-foreground">
                            <Mail className="w-4 h-4 text-muted-foreground" /> {contact.email}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-border/50">
                        <Button variant="outline" size="sm" onClick={() => startEditContact(index)} className="rounded-lg">
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteEmergencyContact(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg">
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ) : (
            <form onSubmit={handleSaveEmergencyContact}>
              <GlassCard className="p-6 md:p-8 space-y-6">
                <h3 className="text-xl font-bold text-foreground">
                  {editingContactIndex !== null ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                </h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputWithLabel
                      label="Full Name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                      placeholder="e.g. John Doe"
                    />
                    <InputWithLabel
                      label="Relationship"
                      value={contactForm.relationship}
                      onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                      required
                      placeholder="e.g. Spouse, Parent, Sibling"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputWithLabel
                      label="Phone Number"
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      required
                      placeholder="+1 (555) 000-0000"
                    />
                    <InputWithLabel
                      label="Email (Optional)"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={contactForm.isPrimary}
                      onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                      className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
                    />
                    <label htmlFor="isPrimary" className="text-sm font-medium text-foreground cursor-pointer">
                      Set as Primary Contact
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-border">
                  <LoadingButton type="submit" isLoading={saving} className="rounded-xl">
                    {editingContactIndex !== null ? 'Update Contact' : 'Add Contact'}
                  </LoadingButton>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowContactForm(false)}>
                    Cancel
                  </Button>
                </div>
              </GlassCard>
            </form>
          )}
        </div>
      )}

      {/* Correction Request Tab */}
      {activeTab === 'correction' && (
        <div className="space-y-6">
          <GlassCard className="border-info/20 bg-info/5 p-4 md:p-6">
            <h4 className="flex items-center gap-2 font-semibold text-info mb-2">
              <Info className="w-5 h-5" />
              About Correction Requests
            </h4>
            <p className="text-info/80 text-sm">
              Use this form to request changes to critical profile data such as name, date of birth,
              national ID, or employment details. These requests require HR approval before being applied.
            </p>
          </GlassCard>

          <form onSubmit={handleSubmitCorrectionRequest}>
            <GlassCard className="p-6 md:p-8 space-y-8">
              <h3 className="text-xl font-bold text-foreground">Request Profile Correction</h3>

              <div className="space-y-6">
                <div className="w-full space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Correction Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={correctionRequest.requestDescription}
                    onChange={(e) => setCorrectionRequest({ ...correctionRequest, requestDescription: e.target.value })}
                    placeholder="Describe what needs to be corrected and what the correct information should be..."
                    rows={5}
                    required
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about what needs to be changed
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Reason (Optional)
                  </Label>
                  <Textarea
                    value={correctionRequest.reason}
                    onChange={(e) => setCorrectionRequest({ ...correctionRequest, reason: e.target.value })}
                    placeholder="Provide additional context or reason for this correction..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <LoadingButton type="submit" isLoading={saving} className="rounded-xl">
                  📨 Submit Request
                </LoadingButton>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCorrectionRequest({ requestDescription: '', reason: '' })}
                  className="rounded-xl"
                >
                  Clear Form
                </Button>
              </div>
            </GlassCard>
          </form>

          {/* View My Requests Link */}
          <GlassCard className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Track Your Requests</h4>
              <p className="text-muted-foreground text-sm">
                Want to see the status of your previous correction requests?
              </p>
            </div>
            <Link href="/dashboard/department-employee/employee-profile/correction-requests">
              <Button variant="outline" size="sm" className="rounded-xl">
                View My Correction Requests →
              </Button>
            </Link>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
