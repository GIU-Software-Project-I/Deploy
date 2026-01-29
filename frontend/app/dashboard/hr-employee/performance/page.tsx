'use client';

import { useState, useEffect } from 'react';
import { performanceService } from '@/app/services/performance';
import { employeeProfileService } from '@/app/services/employee-profile';
import { organizationStructureService } from '@/app/services/organization-structure';

/**
 * Performance Management - HR Employee
 * REQ-PP-05: Assign appraisal forms and templates to employees and managers in bulk
 * REQ-AE-06: Monitor appraisal progress and send reminders for pending forms
 * BR 22, BR 37(a), BR 23, BR 36(b)
 */

interface Assignment {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
  };
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    primaryDepartmentId?: {
      name: string;
    };
  };
  managerProfileId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'PUBLISHED';
  dueDate?: string;
  createdAt: string;
}

interface Cycle {
  _id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  workEmail: string;
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
  supervisorId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export default function HREmployeePerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk assignment state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    cycleId: '',
    templateId: '',
    departmentId: '',
    employeeProfileIds: [] as string[],
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchAssignments();
    }
  }, [selectedCycleId, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch cycles
      const cyclesRes = await performanceService.getCycles();
      const cyclesData = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
      setCycles(cyclesData);

      // Auto-select active cycle
      const activeCycle = cyclesData.find((c: Cycle) => c.status === 'ACTIVE');
      if (activeCycle) {
        setSelectedCycleId(activeCycle._id);
        setBulkFormData(prev => ({ ...prev, cycleId: activeCycle._id }));
      }

      // Fetch employees (with pagination - backend max limit is 100)
      try {
        const employeesRes = await employeeProfileService.getAllEmployees(1, 100); // Max limit is 100 per backend
        let employeesData: Employee[] = [];
        
        console.log('Employees API response:', employeesRes); // Debug log
        
        if (employeesRes.error) {
          console.error('Error fetching employees:', employeesRes.error);
          setError(`Failed to load employees: ${employeesRes.error}`);
        } else if (employeesRes && employeesRes.data) {
          // Backend returns PaginatedResult: { data: [...], pagination: {...} }
          if (Array.isArray(employeesRes.data)) {
            employeesData = employeesRes.data;
          } else if (typeof employeesRes.data === 'object' && 'data' in employeesRes.data) {
            // Handle nested structure if API wraps it
            const nestedData = (employeesRes.data as any).data;
            if (Array.isArray(nestedData)) {
              employeesData = nestedData;
            }
          }
        }
        
        console.log('Parsed employees:', employeesData.length, employeesData.slice(0, 2)); // Debug log
        setEmployees(employeesData);
      } catch (err: any) {
        console.error('Exception fetching employees:', err);
        setError(`Failed to load employees: ${err.message || 'Unknown error'}`);
        setEmployees([]);
      }
      
      // Fetch templates
      const templatesRes = await performanceService.getTemplates();
      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(templatesData.filter((t: any) => t.isActive));
      
      // Fetch departments from organization structure service
      const departmentsRes = await organizationStructureService.getDepartments(true); // Only active departments
      const departmentsData = Array.isArray(departmentsRes.data) ? departmentsRes.data : [];
      setDepartments(departmentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await performanceService.searchAssignments();
      const data = response.data as Assignment[] | { data: Assignment[] };

      if (Array.isArray(data)) {
        setAssignments(data);
      } else if (data && 'data' in data) {
        setAssignments(data.data);
      } else {
        setAssignments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkFormData.cycleId || !bulkFormData.templateId || !bulkFormData.departmentId || bulkFormData.employeeProfileIds.length === 0) {
      setError('Please select a cycle, template, department, and at least one employee');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await performanceService.bulkCreateAssignments({
        cycleId: bulkFormData.cycleId,
        templateId: bulkFormData.templateId,
        departmentId: bulkFormData.departmentId,
        employeeProfileIds: bulkFormData.employeeProfileIds,
        dueDate: bulkFormData.dueDate || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Successfully assigned ${bulkFormData.employeeProfileIds.length} employees`);
      setShowBulkAssign(false);
      setBulkFormData({ cycleId: selectedCycleId, templateId: '', departmentId: '', employeeProfileIds: [], dueDate: '' });
      fetchAssignments();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAllEmployees = () => {
    // Select all employees (no department filtering)
    const allEmployeeIds = employees
      .map(e => e._id?.toString() || e._id)
      .filter(id => id); // Remove any undefined/null values
    
    const currentIds = bulkFormData.employeeProfileIds.map(id => id.toString());
    const allSelected = allEmployeeIds.length > 0 && 
                        allEmployeeIds.every(id => currentIds.includes(id.toString()));
    
    if (allSelected) {
      setBulkFormData(prev => ({ ...prev, employeeProfileIds: [] }));
    } else {
      setBulkFormData(prev => ({ ...prev, employeeProfileIds: allEmployeeIds.map(id => id.toString()) }));
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    if (!employeeId) {
      console.warn('Empty employee ID provided');
      return;
    }
    setBulkFormData(prev => {
      const currentIds = prev.employeeProfileIds.map(id => String(id));
      const newId = String(employeeId);
      const isSelected = currentIds.includes(newId);
      
      console.log('Toggling employee:', newId, 'Currently selected:', currentIds, 'Will be:', !isSelected);
      
      const updatedIds = isSelected
        ? currentIds.filter(id => id !== newId)
        : [...currentIds, newId];
      
      console.log('Updated IDs:', updatedIds);
      
      return {
        ...prev,
        employeeProfileIds: updatedIds
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'SUBMITTED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PUBLISHED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const emp = a.employeeProfileId;
    const search = searchQuery.toLowerCase();
    return (
      emp?.firstName?.toLowerCase().includes(search) ||
      emp?.lastName?.toLowerCase().includes(search) ||
      emp?.employeeNumber?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'PENDING').length,
    inProgress: assignments.filter(a => a.status === 'IN_PROGRESS').length,
    submitted: assignments.filter(a => a.status === 'SUBMITTED').length,
    published: assignments.filter(a => a.status === 'PUBLISHED').length,
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Performance Management</h1>
            <p className="text-muted-foreground mt-1">
              Assign appraisals and monitor completion progress (REQ-PP-05, REQ-AE-06)
            </p>
          </div>
          <button
            onClick={() => setShowBulkAssign(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Bulk Assign
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300' },
            { label: 'Pending', value: stats.pending, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
            { label: 'Submitted', value: stats.submitted, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
            { label: 'Published', value: stats.published, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
              <p className="text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by employee name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="">Select Cycle</option>
              {cycles.map(cycle => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.name} ({cycle.status})
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Appraisal Assignments</h3>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="font-medium text-foreground mb-1">No Assignments Found</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedCycleId ? 'No assignments match your filters.' : 'Select a cycle to view assignments.'}
              </p>
              {selectedCycleId && (
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Create Assignments
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Manager</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Due Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.employeeProfileId?.employeeNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {assignment.employeeProfileId?.primaryDepartmentId?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {assignment.managerProfileId
                          ? `${assignment.managerProfileId.firstName} ${assignment.managerProfileId.lastName}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedAssignment(assignment)}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bulk Assign Modal */}
        {showBulkAssign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Bulk Assign Appraisals</h3>
                <button
                  onClick={() => setShowBulkAssign(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Appraisal Cycle *</label>
                  <select
                    value={bulkFormData.cycleId}
                    onChange={async (e) => {
                      const cycleId = e.target.value;
                      setBulkFormData(prev => ({ ...prev, cycleId, templateId: '', departmentId: '' }));
                      if (cycleId) {
                        try {
                          const cycleRes = await performanceService.getCycleById(cycleId);
                          setSelectedCycle(cycleRes.data as Cycle);
                        } catch (err) {
                          console.error('Failed to fetch cycle details:', err);
                        }
                      } else {
                        setSelectedCycle(null);
                      }
                    }}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="">Select Cycle</option>
                    {cycles.filter(c => c.status === 'ACTIVE' || c.status === 'PLANNED').map(cycle => (
                      <option key={cycle._id} value={cycle._id}>
                        {cycle.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Appraisal Template *</label>
                  <select
                    value={bulkFormData.templateId}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, templateId: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    disabled={!bulkFormData.cycleId}
                  >
                    <option value="">Select Template</option>
                    {templates.map(template => (
                      <option key={template._id} value={template._id}>
                        {template.name} ({template.templateType})
                      </option>
                    ))}
                  </select>
                  {!bulkFormData.cycleId && (
                    <p className="text-xs text-muted-foreground mt-1">Please select a cycle first</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Department *</label>
                  <select
                    value={bulkFormData.departmentId}
                    onChange={(e) => {
                      // Department is used for assignment context, not for filtering employees
                      setBulkFormData(prev => ({ ...prev, departmentId: e.target.value }));
                    }}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={bulkFormData.dueDate}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Select Employees ({bulkFormData.employeeProfileIds.length} selected)
                    </label>
                    <button
                      onClick={handleSelectAllEmployees}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      {bulkFormData.employeeProfileIds.length === employees.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                    {employees.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No employees available. Please ensure employees are loaded.
                      </div>
                    ) : (
                      employees.map((employee) => {
                        const employeeId = employee._id?.toString() || employee._id || '';
                        if (!employeeId) {
                          console.warn('Employee missing ID:', employee);
                          return null;
                        }
                        return (
                          <label
                            key={employeeId}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={bulkFormData.employeeProfileIds.map(id => String(id)).includes(String(employeeId))}
                              onChange={() => {
                                console.log('Checkbox clicked for employee:', employeeId, employee.firstName, employee.lastName);
                                handleToggleEmployee(employeeId);
                              }}
                              className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {employee.employeeNumber} • {employee.primaryDepartmentId?.name || 'No Department'}
                              </p>
                            </div>
                          </label>
                        );
                      }).filter(Boolean)
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowBulkAssign(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={isSubmitting || !bulkFormData.cycleId || !bulkFormData.templateId || !bulkFormData.departmentId || bulkFormData.employeeProfileIds.length === 0}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : `Assign ${bulkFormData.employeeProfileIds.length} Employees`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Assignment Details</h3>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cycle</p>
                    <p className="font-medium text-foreground">{selectedAssignment.cycleId.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium text-foreground">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedAssignment.status)}`}>
                        {selectedAssignment.status.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="font-medium text-foreground">
                      {selectedAssignment.employeeProfileId.firstName} {selectedAssignment.employeeProfileId.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedAssignment.employeeProfileId.employeeNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium text-foreground">{selectedAssignment.employeeProfileId.primaryDepartmentId?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Manager</p>
                    <p className="font-medium text-foreground">
                      {selectedAssignment.managerProfileId ? `${selectedAssignment.managerProfileId.firstName} ${selectedAssignment.managerProfileId.lastName}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium text-foreground">
                      {selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedAssignment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
