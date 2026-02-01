'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { organizationStructureService } from '@/app/services/organization-structure';
import { toast } from 'sonner';
import { Loader2, Trash2, RotateCcw, AlertCircle } from 'lucide-react';

interface Position {
  _id: string;
  code: string;
  title: string;
  departmentId: { _id: string; name: string };
  reportsToPositionId?: { _id: string; title: string };
  isActive: boolean;
  createdAt: string;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'reactivate'>('deactivate');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load positions
  useEffect(() => {
    loadPositions();
  }, []);

  // Filter positions
  useEffect(() => {
    let filtered = positions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((p) => p.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((p) => !p.isActive);
    }

    setFilteredPositions(filtered);
  }, [positions, searchQuery, statusFilter]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const result = await organizationStructureService.getPositions();
      setPositions((result.data as Position[]) || []);
    } catch (error) {
      console.error('Failed to load positions:', error);
      toast.error('Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateClick = (position: Position) => {
    setSelectedPosition(position);
    setActionType('deactivate');
    setReason('');
    setIsDialogOpen(true);
  };

  const handleReactivateClick = (position: Position) => {
    setSelectedPosition(position);
    setActionType('reactivate');
    setReason('');
    setIsDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedPosition) return;

    try {
      setIsSubmitting(true);

      if (actionType === 'deactivate') {
        await organizationStructureService.deactivatePosition(selectedPosition._id, reason);
        toast.success(`Position "${selectedPosition.title}" deactivated successfully`);
      } else {
        await organizationStructureService.reactivatePosition(selectedPosition._id);
        toast.success(`Position "${selectedPosition.title}" reactivated successfully`);
      }

      setIsDialogOpen(false);
      setSelectedPosition(null);
      setReason('');
      await loadPositions();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Operation failed';
      toast.error(errorMsg);
      console.error('Action failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Position Management</h1>
        <p className="text-gray-500 mt-1">REQ-OSM-05: Manage organization positions and deactivate obsolete roles</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search positions by title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Positions</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>
            Total: {filteredPositions.length} | Active: {filteredPositions.filter((p) => p.isActive).length} | Inactive:{' '}
            {filteredPositions.filter((p) => !p.isActive).length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Reports To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No positions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPositions.map((position) => (
                    <TableRow key={position._id}>
                      <TableCell className="font-medium">{position.code}</TableCell>
                      <TableCell>{position.title}</TableCell>
                      <TableCell>{position.departmentId?.name}</TableCell>
                      <TableCell>{position.reportsToPositionId?.title || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={position.isActive ? 'default' : 'secondary'}>
                          {position.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(position.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {position.isActive ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivateClick(position)}
                              title="Deactivate this position"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivateClick(position)}
                              title="Reactivate this position"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'deactivate' ? 'Deactivate Position' : 'Reactivate Position'}
            </DialogTitle>
            <DialogDescription>
              {selectedPosition ? selectedPosition.title : 'Selected Position'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'deactivate' && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Before deactivating, ensure:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>All assignments for this position are ended</li>
                      <li>No other positions report to this position</li>
                      <li>This position is not a department head</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Reason for Deactivation</label>
                  <Textarea
                    placeholder="e.g., Role obsolete, Position merged with another, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {actionType === 'reactivate' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Note:</p>
                  <p>
                    The position will be reactivated. You can then create new assignments for this position.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isSubmitting || (actionType === 'deactivate' && !reason.trim())}
              variant={actionType === 'deactivate' ? 'destructive' : 'default'}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'deactivate' ? 'Deactivate Position' : 'Reactivate Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
