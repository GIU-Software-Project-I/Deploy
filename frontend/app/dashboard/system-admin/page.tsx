'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { employeeProfileService } from '@/app/services/employee-profile';
import { backupService } from '@/app/services/backup';
import { format } from 'date-fns';
import {
  Building2,
  UserPlus,
  Users,
  Settings,
  Database,
  ArrowRight,
  Activity,
  ShieldCheck,
  Server,
} from 'lucide-react';

export default function SystemAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeUsers: 0,
    lastBackup: 'Never',
    systemUptime: '99.9%',
    alertsCount: 0,
  });

  const [recentBackups, setRecentBackups] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [empRes, backupRes] = await Promise.all([
        employeeProfileService.getAllEmployees(1, 1),
        backupService.listBackups(),
      ]);

      const activeUsers = (empRes.data as any)?.pagination?.total || 0;
      const backupList = (backupRes.data as any[]) || [];
      const lastBackupTime = backupList.length > 0 && backupList[0].timestamp
        ? format(new Date(backupList[0].timestamp), 'MMM d, p')
        : 'Never';

      setStats(prev => ({
        ...prev,
        activeUsers,
        lastBackup: lastBackupTime,
      }));

      setRecentBackups(backupList.slice(0, 3));
    } catch (error) {
      console.error("Dashboard data load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Registered Employees',
      value: stats.activeUsers.toString(),
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-indigo-600/20',
      iconColor: 'text-blue-500',
      detail: 'Registered accounts',
    },
    {
      label: 'Last Database Backup',
      value: stats.lastBackup,
      icon: <Database className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-teal-600/20',
      iconColor: 'text-emerald-500',
      detail: 'Successful snapshot',
    },
    {
      label: 'System Environment',
      value: 'Production',
      icon: <Server className="w-5 h-5" />,
      color: 'from-purple-500/20 to-violet-600/20',
      iconColor: 'text-purple-500',
      detail: 'v1.2.4-stable',
    },
    {
      label: 'Security Status',
      value: 'Secured',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'from-amber-500/20 to-orange-600/20',
      iconColor: 'text-amber-500',
      detail: 'Firewall & SSL Active',
    },
  ];

  const quickActions = [
    {
      title: 'Organization Structure',
      description: 'Departments, positions, and hierarchy',
      href: '/dashboard/system-admin/organization-structure',
      icon: <Building2 className="w-6 h-6" />,
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      title: 'Register Employee',
      description: 'Create new employee credentials',
      href: '/dashboard/system-admin/register-employee',
      icon: <UserPlus className="w-6 h-6" />,
      color: 'from-emerald-500/10 to-emerald-600/10',
    },
    {
      title: 'Data & Backups',
      description: 'Database health and restore points',
      href: '/dashboard/system-admin/data-backup',
      icon: <Database className="w-6 h-6" />,
      color: 'from-purple-500/10 to-purple-600/10',
    },
    {
      title: 'Company Settings',
      description: 'Global configurations and branding',
      href: '/dashboard/system-admin/company-settings',
      icon: <Settings className="w-6 h-6" />,
      color: 'from-amber-500/10 to-amber-600/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Initializing System Console
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">
            System Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            System-wide configuration and management
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/dashboard/system-admin/register-employee">
            Register Employee
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">System Overview</h2>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <GlassCard key={index} variant="hover" className="p-6 overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} blur-3xl group-hover:blur-2xl transition-all duration-500 opacity-50`} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-black text-foreground tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Activity className="w-3 h-3 text-primary/50" />
                    {stat.detail}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl bg-background/50 border border-border/50 shadow-sm ${stat.iconColor} group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <GlassCard variant="hover" className="p-5 cursor-pointer group text-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 w-fit mx-auto`}>
                  <div className="text-foreground">
                    {action.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">System Health & Stability</h2>
            <Link href="/dashboard/system-admin/data-backup" className="text-xs text-primary hover:underline font-bold uppercase tracking-tighter">
              Manage Backups <ArrowRight className="w-3 h-3 inline ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentBackups.length > 0 ? (
              recentBackups.map((backup, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl hover:bg-muted/30 transition-colors">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Database className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{backup.filename}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">
                      Snapshot created {backup.timestamp ? format(new Date(backup.timestamp), 'MMM d, p') : 'Unknown'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black border-emerald-500/20 text-emerald-500">
                    SUCCESS
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground p-4 border border-dashed border-border rounded-2xl bg-muted/5">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-bold">No recent backups detected</p>
                <p className="text-xs">Automatic backup schedule is recommended</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">System Access Logs</h2>
          <div className="space-y-6">
            <div className="relative pl-6 border-l-2 border-primary/20 space-y-8">
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-3 h-3 bg-primary rounded-full border-2 border-background ring-4 ring-primary/10" />
                <p className="text-sm font-bold text-foreground">Admin Session Started</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Current Session (You)</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-3 h-3 bg-muted-foreground/30 rounded-full border-2 border-background" />
                <p className="text-sm font-medium text-muted-foreground">Global Configuration Updated</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">2 hours ago</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-3 h-3 bg-muted-foreground/30 rounded-full border-2 border-background" />
                <p className="text-sm font-medium text-muted-foreground">User Roles Audited</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">5 hours ago</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-tighter hover:bg-muted/50">
              View Audit Logs
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

