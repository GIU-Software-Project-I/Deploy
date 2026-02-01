'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import RoleGuard from '@/components/RoleGuard';
import { SystemRole } from '@/types';

/**
 * Organization Structure Management - System Admin
 * REQ-OSM-01: Define and create departments, and positions
 * REQ-OSM-02: Update existing departments, and positions
 * REQ-OSM-05: Deactivate or remove obsolete roles or positions
 */

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: { _id: string; name: string };
  headOfDepartmentId?: { _id: string; firstName: string; lastName: string };
  costCenter?: string;
  isActive: boolean;
  createdAt: string;
}

interface Position {
  _id: string;
  title: string;
  code: string;
  departmentId: { _id: string; name: string };
  reportsToPositionId?: { _id: string; title: string };
  payGrade?: string;
  jobDescription?: string;
  isActive: boolean;
  createdAt: string;
}

interface Stats {
  totalDepartments?: number;
  activeDepartments?: number;
  totalPositions?: number;
  activePositions?: number;
  vacantPositions?: number;
}

interface Assignment {
  _id: string;
  employeeProfileId: { _id: string; firstName: string; lastName: string; employeeNumber: string };
  positionId: { _id: string; title: string; code: string };
  departmentId: { _id: string; name: string };
  startDate: string;
  endDate?: string;
}

export default function OrganizationStructurePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'departments' | 'positions' | 'assignments'>('departments');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<Stats>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [deptRes, posRes, assignRes, deptStatsRes, posStatsRes] = await Promise.all([
        organizationStructureService.getDepartments(showInactive ? undefined : true),
        organizationStructureService.getPositions(undefined, showInactive ? undefined : true),
        organizationStructureService.searchAssignments(undefined, undefined, undefined, showInactive ? undefined : true),
        organizationStructureService.getDepartmentStats(),
        organizationStructureService.getPositionStats(),
      ]);

      if (deptRes.data) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      if (posRes.data) setPositions(Array.isArray(posRes.data) ? posRes.data : []);
      if (assignRes.data) {
        const data = (assignRes.data as any).data || assignRes.data;
        setAssignments(Array.isArray(data) ? data as Assignment[] : []);
      }

      // Map backend response to frontend interface
      const deptStats = (deptStatsRes.data || {}) as { total?: number; active?: number };
      const posStats = (posStatsRes.data || {}) as { total?: number; active?: number; vacant?: number };

      setStats({
        totalDepartments: deptStats.total ?? 0,
        activeDepartments: deptStats.active ?? 0,
        totalPositions: posStats.total ?? 0,
        activePositions: posStats.active ?? 0,
        vacantPositions: posStats.vacant ?? 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this department?')) return;

    try {
      await organizationStructureService.deactivateDepartment(id);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate department');
    }
  };

  const handleReactivateDepartment = async (id: string) => {
    try {
      await organizationStructureService.reactivateDepartment(id);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate department');
    }
  };

  const handleDeactivatePosition = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this position? Positions with historical assignments will be delimited.')) return;

    try {
      await organizationStructureService.deactivatePosition(id);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate position');
    }
  };

  const handleReactivatePosition = async (id: string) => {
    try {
      await organizationStructureService.reactivatePosition(id);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate position');
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPositions = positions.filter(pos =>
    pos.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pos.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssignments = assignments.filter(assign => {
    const searchLower = searchQuery.toLowerCase();
    const empName = assign.employeeProfileId ? `${assign.employeeProfileId.firstName} ${assign.employeeProfileId.lastName}` : '';
    return (
      empName.toLowerCase().includes(searchLower) ||
      (assign.positionId?.title || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
        <div className="p-6 lg:p-8 bg-background min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-muted rounded-xl"></div>
                ))}
              </div>
              <div className="h-96 bg-muted rounded-xl"></div>
            </div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Organization Structure</h1>
              <p className="text-muted-foreground mt-1">
                Manage departments and positions (REQ-OSM-01, REQ-OSM-02, REQ-OSM-05)
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/dashboard/system-admin/organization-structure/departments"
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Departments
              </Link>
              <Link
                href="/dashboard/system-admin/organization-structure/positions"
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Positions
              </Link>
              <Link
                href="/dashboard/system-admin/organization-structure/change-requests"
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Change Requests
              </Link>
              <Link
                href="/dashboard/system-admin/organization-structure/org-chart"
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                View Org Chart
              </Link>
              <Link
                href="/dashboard/system-admin/organization-structure/analytics"
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">Total Departments</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.totalDepartments || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.activeDepartments || 0} active</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">Total Positions</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.totalPositions || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.activePositions || 0} active</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">Vacant Positions</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.vacantPositions || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Available for recruitment</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">Filled Positions</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {(stats.activePositions || 0) - (stats.vacantPositions || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Currently assigned</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="border-b border-border">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('departments')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'departments'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Departments ({filteredDepartments.length})
                </button>
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'positions'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Positions ({filteredPositions.length})
                </button>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'assignments'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Assignments ({filteredAssignments.length})
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-border"
                  />
                  Show inactive
                </label>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dashboard/system-admin/organization-structure/departments/new"
                  className="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors"
                >
                  Create Department
                </Link>
                <Link
                  href="/dashboard/system-admin/organization-structure/positions/new"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Position
                </Link>
                <Link
                  href="/dashboard/system-admin/organization-structure/assignments/new"
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
                >
                  Assign Employee
                </Link>
              </div>
            </div>

            {/* Content */}
            {activeTab === 'departments' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Parent</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Head</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDepartments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No departments found
                        </td>
                      </tr>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <tr key={dept._id} className="hover:bg-muted/30">
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{dept.name}</div>
                            {dept.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">{dept.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-sm">{dept.code}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {dept.parentDepartmentId?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {dept.headOfDepartmentId
                              ? `${dept.headOfDepartmentId.firstName} ${dept.headOfDepartmentId.lastName}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${dept.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              {dept.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/system-admin/organization-structure/departments/${dept._id}`}
                                className="text-sm text-primary hover:text-primary/80"
                              >
                                Edit
                              </Link>
                              {dept.isActive ? (
                                <button
                                  onClick={() => handleDeactivateDepartment(dept._id)}
                                  className="text-sm text-destructive hover:text-destructive/80"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateDepartment(dept._id)}
                                  className="text-sm text-green-600 hover:text-green-500"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'positions' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Reports To</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Pay Grade</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPositions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          No positions found
                        </td>
                      </tr>
                    ) : (
                      filteredPositions.map((pos) => (
                        <tr key={pos._id} className="hover:bg-muted/30">
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{pos.title}</div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-sm">{pos.code}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {pos.departmentId?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {pos.reportsToPositionId?.title || '-'}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{pos.payGrade || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${pos.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              {pos.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/system-admin/organization-structure/positions/${pos._id}`}
                                className="text-sm text-primary hover:text-primary/80"
                              >
                                Edit
                              </Link>
                              {pos.isActive ? (
                                <button
                                  onClick={() => handleDeactivatePosition(pos._id)}
                                  className="text-sm text-destructive hover:text-destructive/80"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivatePosition(pos._id)}
                                  className="text-sm text-green-600 hover:text-green-500"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No assignments found
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((assign) => (
                        <tr key={assign._id} className="hover:bg-muted/30">
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">
                              {assign.employeeProfileId ? `${assign.employeeProfileId.firstName} ${assign.employeeProfileId.lastName}` : 'Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {assign.employeeProfileId?.employeeNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">
                              {assign.positionId?.title || '-'}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {assign.positionId?.code}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {assign.departmentId?.name || (assign.positionId as any)?.departmentId?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(assign.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {assign.endDate ? new Date(assign.endDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${!assign.endDate || new Date(assign.endDate) > new Date()
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                              {!assign.endDate || new Date(assign.endDate) > new Date() ? 'Active' : 'Ended'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

