'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/context/AuthContext';
import { Plus, X, Edit2, Trash2, Eye, Save, MoreVertical } from 'lucide-react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/components/theme-customizer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaxRule {
  _id: string;
  name: string;
  description?: string;
  rate: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export default function TaxRulesPage() {
  const { user } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate: '',
  });

  useEffect(() => {
    fetchTaxRules();
  }, []);

  const fetchTaxRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await payrollConfigurationService.getTaxRules();

      if (response.error) {
        throw new Error(response.error);
      }

      const apiData = response.data as any;
      if (apiData?.data && Array.isArray(apiData.data)) {
        setTaxRules(apiData.data);
      } else if (Array.isArray(apiData)) {
        setTaxRules(apiData);
      } else {
        setTaxRules([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax rules');
      console.error('Error fetching tax rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Tax rule name is required');
        return;
      }

      const rate = parseFloat(formData.rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        setError('Rate must be between 0% and 100%');
        return;
      }

      setError(null);
      const createdByEmployeeId = user?.id || '';

      const apiData = {
        name: formData.name.trim(),
        description: formData.description || undefined,
        rate: rate,
        createdBy: createdByEmployeeId,
      };

      const response = await payrollConfigurationService.createTaxRule(apiData);

      if (response.error) {
        throw new Error(response.error);
      }

      setSuccess('Tax rule created successfully!');
      setFormData({ name: '', description: '', rate: '' });
      setShowCreateModal(false);
      await fetchTaxRules();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create tax rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this tax rule?')) return;

    try {
      const response = await payrollConfigurationService.deleteTaxRule(ruleId);

      if (response.error) {
        throw new Error(response.error);
      }

      setSuccess('Tax rule deleted successfully!');
      await fetchTaxRules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete tax rule');
    }
  };

  const filteredRules = taxRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (rule.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || rule.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      'draft': 'bg-warning/15 text-warning border border-warning/30',
      'approved': 'bg-success/15 text-success border border-success/30',
      'rejected': 'bg-destructive/15 text-destructive border border-destructive/30',
    };
    return classes[status] || 'bg-muted/50 text-muted-foreground border border-border';
  };

  const statusLabels: Record<string, string> = {
    'draft': 'Draft',
    'approved': 'Approved',
    'rejected': 'Rejected',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      {/* Theme Customizer */}
      <div className="fixed bottom-6 right-6 z-40">
        <ThemeCustomizerTrigger onClick={() => setShowThemeCustomizer(true)} />
      </div>

      {showThemeCustomizer && (
        <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Tax Rules Management</h1>
            <p className="text-muted-foreground">Configure and manage tax rules for payroll calculations</p>
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', description: '', rate: '' });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            New Tax Rule
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
            {success}
          </div>
        )}

        {/* Search and Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search tax rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Tax Rules Grid */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No tax rules found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRules.map((rule) => (
                <Card key={rule._id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{rule.name}</CardTitle>
                        <Badge className={`mt-2 ${getStatusBadgeClass(rule.status)} inline-flex`}>
                          {statusLabels[rule.status]}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-primary">{rule.rate}%</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rule.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{rule.description}</p>
                    )}

                    <div className="pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-3">
                        <p>Created: {new Date(rule.createdAt).toLocaleDateString()}</p>
                        {rule.approvedAt && (
                          <p>Approved: {new Date(rule.approvedAt).toLocaleDateString()}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowViewModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors text-xs font-medium"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule._id)}
                          className="px-3 py-2 border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors text-destructive text-xs font-medium"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Create Tax Rule</CardTitle>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Rule Name*</label>
                <input
                  type="text"
                  placeholder="e.g., Income Tax"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Tax Rate (%)*</label>
                <input
                  type="number"
                  placeholder="e.g., 15"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
                <textarea
                  placeholder="Enter tax rule details..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRule}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Save className="h-4 w-4" />
                  Create
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Tax Rule Details</CardTitle>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold text-foreground">{selectedRule.name}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tax Rate</p>
                <p className="text-2xl font-bold text-primary">{selectedRule.rate}%</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`mt-1 ${getStatusBadgeClass(selectedRule.status)} inline-flex`}>
                  {statusLabels[selectedRule.status]}
                </Badge>
              </div>

              {selectedRule.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-foreground mt-1">{selectedRule.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">{new Date(selectedRule.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedRule.approvedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                    <p className="text-sm font-medium text-foreground">{new Date(selectedRule.approvedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
