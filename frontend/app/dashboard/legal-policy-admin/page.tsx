'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Scale,
  ShieldCheck,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface StatCard {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color: string;
}

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  badge?: string;
}

export default function LegalPolicyAdminPage() {
  const stats: StatCard[] = [
    {
      label: 'Active Policies',
      value: 28,
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Pending Review',
      value: 5,
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-warning/10 text-warning',
    },
    {
      label: 'Compliance Score',
      value: '98%',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Policy Violations',
      value: 0,
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-destructive/10 text-destructive',
    },
  ];

  const actions: ActionItem[] = [
    {
      icon: <FileText className="w-6 h-6" />,
      label: 'Tax Rules',
      description: 'Configure and manage tax rules and regulations',
      href: '/dashboard/legal-policy-admin/tax-rule',
    },
    {
      icon: <Scale className="w-6 h-6" />,
      label: 'Legal Policies',
      description: 'Define and maintain legal compliance policies',
      href: '/dashboard/legal-policy-admin/legal-policies',
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      label: 'Compliance Management',
      description: 'Monitor and manage compliance requirements',
      href: '/dashboard/legal-policy-admin/compliance',
    },
    {
      icon: <Search className="w-6 h-6" />,
      label: 'Audit Trail',
      description: 'Review audit logs and compliance history',
      href: '/dashboard/legal-policy-admin/audit-trail',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Legal & Policy Administration</h1>
        <p className="text-muted-foreground">
          Manage tax rules, legal policies, and compliance requirements for your organization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Actions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Core Functions</h2>
          <p className="text-sm text-muted-foreground">Access key administrative tools and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">{action.icon}</div>
                    {action.badge && (
                      <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground flex-grow mb-4">{action.description}</p>
                  <div className="flex items-center text-primary font-medium text-sm">
                    View <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Compliance Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-success" />
            Compliance Overview
          </CardTitle>
          <CardDescription>Current system compliance status and recent activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Compliance Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Tax Configuration</p>
                    <p className="text-xs text-muted-foreground">All tax rules up to date</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded">Compliant</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Policy Documentation</p>
                    <p className="text-xs text-muted-foreground">28 active policies documented</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded">Compliant</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Pending Reviews</p>
                    <p className="text-xs text-muted-foreground">5 items awaiting approval</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-1 rounded">Pending</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/dashboard/legal-policy-admin/tax-rule">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-2">
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">Go to Tax Rules Configuration</span>
              </Button>
            </Link>
            <Link href="/dashboard/legal-policy-admin/audit-trail">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-2">
                <Search className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">View Audit Trail</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

