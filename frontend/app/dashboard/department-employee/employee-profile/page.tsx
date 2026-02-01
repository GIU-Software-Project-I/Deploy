'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Calendar, User, Building, MapPin, GraduationCap, Briefcase, History } from 'lucide-react';
import { JourneyTimeline, TimelineEvent } from '@/components/ui/journey-timeline';

export default function EmployeeProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await employeeProfileService.getMyProfile();
                setProfile(response.data);
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground font-medium animate-pulse">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <GlassCard className="border-destructive/20 bg-destructive/5 p-6">
                    <p className="text-destructive font-medium flex items-center gap-2">
                        <span className="text-xl">⚠️</span> {error}
                    </p>
                </GlassCard>
            </div>
        );
    }

    if (!profile) return null;

    // Generate Journey Events
    const journeyEvents: TimelineEvent[] = [
        {
            id: 'hiring',
            date: new Date(profile.dateOfHire),
            title: 'Joined the Company',
            description: `Started as ${profile.primaryPositionId?.title || 'a new member'}`,
            type: 'hiring'
        },
        // If they have been here for a while, add current status
        {
            id: 'current',
            date: new Date(),
            title: 'Today',
            description: `Current: ${profile.primaryPositionId?.title || 'Employee'} in ${profile.primaryDepartmentId?.name || 'Department'}`,
            type: 'current'
        }
    ];

    return (
        <div className="space-y-6 lg:space-y-8">
            {/* Header with Edit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">My Profile</h1>
                    <p className="text-muted-foreground mt-1">View and manage your personal information</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/dashboard/department-employee/employee-profile/correction-requests">
                        <Button variant="outline" className="rounded-xl">
                            Correction Requests
                        </Button>
                    </Link>
                    <Link href="/dashboard/department-employee/employee-profile/edit">
                        <Button className="rounded-xl">
                            Update Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Profile Card */}
            <GlassCard className="overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-background shadow-xl overflow-hidden bg-muted flex items-center justify-center">
                                {profile.profilePictureUrl ? (
                                    <img
                                        src={profile.profilePictureUrl}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-12 h-12 text-muted-foreground" />
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10"></div>
                        </div>
                    </div>

                    <div className="flex-1 w-full text-center md:text-left">
                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">
                                    {profile.firstName} {profile.lastName}
                                </h2>
                                <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm mt-2">
                                    <span className="inline-flex items-center gap-1.5 text-primary font-medium bg-primary/10 px-2.5 py-1 rounded-full">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        {profile.primaryPositionId?.title || 'No Position'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border">
                                        <Building className="w-3.5 h-3.5" />
                                        {profile.primaryDepartmentId?.name || 'No Department'}
                                    </span>
                                </div>
                            </div>
                            <Badge variant={profile.status === 'ACTIVE' ? 'default' : 'secondary'} className="px-3 py-1">
                                {profile.status}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
                            <div className="flex items-center justify-center md:justify-start gap-3 text-sm group">
                                <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</span>
                                    <span className="text-foreground truncate max-w-[150px]" title={profile.workEmail}>{profile.workEmail}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-3 text-sm group">
                                <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Employee ID</span>
                                    <span className="text-foreground font-mono">{profile.employeeNumber}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-3 text-sm group">
                                <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Joined</span>
                                    <span className="text-foreground">{new Date(profile.dateOfHire).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {profile.mobilePhone && (
                                <div className="flex items-center justify-center md:justify-start gap-3 text-sm group">
                                    <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mobile</span>
                                        <span className="text-foreground">{profile.mobilePhone}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Journey Timeline Section */}
            <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-background to-muted/20 border-primary/10 shadow-inner">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                            <History className="w-5 h-5 animate-in spin-in-90 duration-700" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-foreground tracking-tight">Your Journey</h3>
                            <p className="text-xs text-muted-foreground font-medium">Visualizing your career milestones and growth</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                        {Math.floor((new Date().getTime() - new Date(profile.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 365))} Years with us
                    </Badge>
                </div>

                <JourneyTimeline events={journeyEvents} />
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">

                    {/* Biography */}
                    <GlassCard className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Biography</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {profile.biography || 'No biography details provided.'}
                        </p>
                    </GlassCard>

                    {/* Employment Details */}
                    <GlassCard className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Employment Details</h3>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            {[
                                { label: 'Contract Type', value: profile.contractType },
                                { label: 'Work Type', value: profile.workType },
                                { label: 'Contract Start', value: profile.contractStartDate ? new Date(profile.contractStartDate).toLocaleDateString() : '-' },
                                { label: 'Contract End', value: profile.contractEndDate ? new Date(profile.contractEndDate).toLocaleDateString() : '-' },
                            ].map((item, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</dt>
                                    <dd className="text-sm font-medium text-foreground">{item.value || '-'}</dd>
                                </div>
                            ))}
                        </dl>
                    </GlassCard>

                    {/* Education */}
                    <GlassCard className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Education</h3>
                        </div>
                        {profile.education && profile.education.length > 0 ? (
                            <div className="space-y-4">
                                {profile.education.map((edu: any, i: number) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                                        <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-foreground">{edu.establishmentName}</div>
                                            <div className="text-sm text-muted-foreground">{edu.graduationType}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic pl-1">No education details added.</p>
                        )}
                    </GlassCard>
                </div>

                {/* Right Column */}
                <div className="space-y-6 lg:space-y-8">
                    {/* Personal Info */}
                    <GlassCard className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Personal Info</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Personal Email', value: profile.personalEmail, icon: <Mail className="w-4 h-4" /> },
                                { label: 'Home Phone', value: profile.homePhone, icon: <Phone className="w-4 h-4" /> },
                                { label: 'Date of Birth', value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '-', icon: <Calendar className="w-4 h-4" /> },
                                {
                                    label: 'Address',
                                    value: profile.address ? (
                                        <>
                                            {profile.address.streetAddress}<br />
                                            {profile.address.city}, {profile.address.country}
                                        </>
                                    ) : '-',
                                    icon: <MapPin className="w-4 h-4" />
                                },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 text-sm">
                                    <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <dt className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">{item.label}</dt>
                                        <dd className="font-medium text-foreground break-words">{item.value}</dd>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Emergency Contacts */}
                    <GlassCard className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                                <Phone className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Emergency Contacts</h3>
                        </div>
                        {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                            <div className="space-y-3">
                                {profile.emergencyContacts.map((contact: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-xl border ${contact.isPrimary
                                        ? 'border-primary/20 bg-primary/5'
                                        : 'border-border bg-card'
                                        }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="font-semibold text-sm text-foreground">{contact.name}</div>
                                            {contact.isPrimary && <Badge variant="secondary" className="text-[10px] h-5">Primary</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">{contact.relationship}</div>
                                        <div className="text-sm text-foreground mt-2 flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                            {contact.phone}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic pl-1">No contacts added.</p>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
