'use client';

import { useState, useEffect } from 'react';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import {
  LucideLaptop,
  LucideMonitor,
  LucideKeyboard,
  LucideMouse,
  LucideHeadphones,
  LucideSmartphone,
  LucideContact2,
  LucideHome,
  LucidePackage,
  LucideCheckCircle2,
  LucideAlertCircle,
  LucideLoader2,
  LucideChevronRight,
  LucideBox,
  LucideLayers,
  LucideHistory
} from 'lucide-react';

const EQUIPMENT_TYPES = [
  { id: 'laptop', name: 'Workstation', description: 'Performance Laptop', icon: LucideLaptop },
  { id: 'monitor', name: 'Display', description: 'External 4K Monitor', icon: LucideMonitor },
  { id: 'keyboard', name: 'Primary HIDs', description: 'Mechanical Keyboard', icon: LucideKeyboard },
  { id: 'mouse', name: 'Precision Mouse', description: 'Wireless Optical', icon: LucideMouse },
  { id: 'headset', name: 'Audio Gear', description: 'ANC Headset', icon: LucideHeadphones },
  { id: 'phone', name: 'Mobile/IP', description: 'Corporate Device', icon: LucideSmartphone },
  { id: 'access_card', name: 'Security Pass', description: 'Proximity Card', icon: LucideContact2 },
  { id: 'desk', name: 'Workspace', description: 'Assigned Station', icon: LucideHome },
];

export default function EquipmentReservationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, string[]>>({});
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
    } finally {
      setLoading(false);
    }
  };

  const getAdminTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.filter(t =>
      t.department === 'Admin' || t.department === 'Facilities' || t.name.toLowerCase().includes('equipment')
    ) || [];
  };

  const hasAdminPendingTasks = (onboarding: Onboarding) => {
    return getAdminTasks(onboarding).some(t => t.status !== OnboardingTaskStatus.COMPLETED);
  };

  const filteredOnboardings = onboardings.filter(o => {
    if (filterStatus === 'pending') return !o.completed && hasAdminPendingTasks(o);
    if (filterStatus === 'completed') return o.completed || !hasAdminPendingTasks(o);
    return true;
  });

  const handleEquipmentToggle = (onboardingId: string, equipmentId: string) => {
    setSelectedEquipment(prev => {
      const current = prev[onboardingId] || [];
      if (current.includes(equipmentId)) {
        return { ...prev, [onboardingId]: current.filter(e => e !== equipmentId) };
      }
      return { ...prev, [onboardingId]: [...current, equipmentId] };
    });
  };

  const handleReserveEquipment = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    const equipment = selectedEquipment[onboarding._id] || [];
    if (equipment.length === 0) {
      setError('Please select at least one asset item');
      return;
    }

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.reserveEquipment({
        employeeId,
        equipment,
      });

      const adminTasks = getAdminTasks(onboarding);
      for (const task of adminTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`Assets reserved and provisioned for ${employeeId}`);
      setSelectedEquipment(prev => ({ ...prev, [onboarding._id]: [] }));
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reserve assets');
    } finally {
      setProcessing(null);
    }
  };

  const stats = {
    total: onboardings.length,
    pending: onboardings.filter(o => !o.completed && hasAdminPendingTasks(o)).length,
    completed: onboardings.filter(o => o.completed || !hasAdminPendingTasks(o)).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 animate-pulse">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="h-12 bg-gray-100 rounded-2xl w-64"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-32 bg-gray-50 rounded-3xl"></div>
            <div className="h-32 bg-gray-50 rounded-3xl"></div>
            <div className="h-32 bg-gray-50 rounded-3xl"></div>
          </div>
          <div className="h-96 bg-gray-50 rounded-[40px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10 font-sans text-black">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-[0.2em]">
              <LucideBox className="w-3.5 h-3.5" />
              Asset Inventory
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-black">
              Equipment
            </h1>
            <p className="text-gray-400 text-xl font-medium max-w-2xl leading-relaxed">
              Logistical resource allocation. Assigning hardware, physical security credentials, and workspace environments.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total Requests" value={stats.total} icon={LucideLayers} color="black" />
            <StatCard label="Pending Prep" value={stats.pending} icon={LucidePackage} color="amber" />
            <StatCard label="Ready for Day 1" value={stats.completed} icon={LucideCheckCircle2} color="green" />
          </div>
        </div>

        {/* Global Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-900 px-8 py-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
            <LucideAlertCircle className="w-6 h-6 text-red-600" />
            <p className="font-black text-sm uppercase tracking-widest">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-black text-white px-8 py-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
            <LucideCheckCircle2 className="w-6 h-6 text-white" />
            <p className="font-black text-sm uppercase tracking-[0.1em]">{success}</p>
          </div>
        )}

        {/* Control Center */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main List Section */}
          <div className="flex-1 space-y-8">
            <div className="flex items-center justify-between px-3">
              <div className="flex items-center gap-6">
                {['pending', 'completed', 'all'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterStatus(tab as any)}
                    className={`text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 relative py-2 ${filterStatus === tab ? 'text-black' : 'text-gray-300 hover:text-gray-500'
                      }`}
                  >
                    {tab}
                    {filterStatus === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />}
                  </button>
                ))}
              </div>
              <button onClick={fetchData} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <LucideHistory className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredOnboardings.length === 0 ? (
                <div className="py-32 text-center bg-white border border-gray-100 rounded-[48px] shadow-sm">
                  <LucidePackage className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                  <p className="text-xl font-black text-black">No Assignments Found</p>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 px-8 max-w-md mx-auto">
                    The resource queue is currently empty for the selected filter criteria.
                  </p>
                </div>
              ) : (
                filteredOnboardings.map((onboarding) => (
                  <OnboardingAssetCard
                    key={onboarding._id}
                    onboarding={onboarding}
                    isSelected={selectedEquipment[onboarding._id] || []}
                    onToggle={(eqId) => handleEquipmentToggle(onboarding._id, eqId)}
                    onAction={() => handleReserveEquipment(onboarding)}
                    isProcessing={processing === onboarding._id}
                    hasPending={hasAdminPendingTasks(onboarding)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Quick Guide Sidebar */}
          <div className="lg:w-96 space-y-8">
            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-8">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Resource Matrix</h3>
              <div className="space-y-6">
                {EQUIPMENT_TYPES.map((eq) => (
                  <div key={eq.id} className="flex gap-4 group">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500 overflow-hidden">
                      <eq.icon className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-black">{eq.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">{eq.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111] rounded-[40px] p-10 text-white relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
              <LucideCheckCircle2 className="w-12 h-12 text-white/20 mb-6" />
              <h4 className="text-2xl font-black mb-4">Deployment Ready</h4>
              <p className="text-white/40 text-sm font-medium leading-[1.6]">
                Upon reservation confirmation, procurement tasks are automatically updated and notifications are dispatched to the facility team for setup.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'black' | 'amber' | 'green' }) {
  const colorMap = {
    black: 'bg-black text-white shadow-black/10',
    amber: 'bg-amber-500 text-white shadow-amber-500/10',
    green: 'bg-green-600 text-white shadow-green-600/10'
  };
  return (
    <div className={`p-6 rounded-[32px] ${colorMap[color]} shadow-xl flex items-center gap-5 transition-transform duration-300 hover:-translate-y-1`}>
      <div className="p-3 bg-white/10 rounded-2xl">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-3xl font-black">{value}</p>
      </div>
    </div>
  );
}

function OnboardingAssetCard({ onboarding, isSelected, onToggle, onAction, isProcessing, hasPending }: {
  onboarding: Onboarding,
  isSelected: string[],
  onToggle: (id: string) => void,
  onAction: () => void,
  isProcessing: boolean,
  hasPending: boolean
}) {
  const employeeData = typeof onboarding.employeeId === 'object' ? (onboarding.employeeId as any) : null;
  const name = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : 'System Entity';
  const dept = employeeData?.primaryDepartmentId?.name || 'Unassigned';
  const start = onboarding.createdAt ? new Date(onboarding.createdAt).toLocaleDateString() : 'TBD';

  return (
    <div className="bg-white border border-gray-100 rounded-[48px] p-8 md:p-10 hover:shadow-2xl hover:shadow-black/5 transition-all duration-700 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center group-hover:bg-black transition-all duration-500">
            <p className="text-2xl font-black text-black group-hover:text-white">{name.charAt(0)}</p>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-2xl font-black tracking-tight">{name}</h4>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${hasPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {hasPending ? 'PENDING' : 'PREPARED'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{dept}</p>
              <span className="w-1 h-1 rounded-full bg-gray-200"></span>
              <p className="text-xs font-bold text-gray-400">Onboarding initiated {start}</p>
            </div>
          </div>
        </div>

        {hasPending && (
          <button
            onClick={onAction}
            disabled={isProcessing || isSelected.length === 0}
            className="px-8 py-5 bg-black text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/10 hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-black transition-all active:scale-95 flex items-center gap-3"
          >
            {isProcessing ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucidePackage className="w-4 h-4" />}
            Confirm Reservation
          </button>
        )}
      </div>

      {hasPending && (
        <div className="mt-12 space-y-8">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">Select Hardware & Identity Assets</h5>
            <p className="text-[10px] font-black text-black uppercase tracking-widest">{isSelected.length} items configured</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
            {EQUIPMENT_TYPES.map((eq) => (
              <button
                key={eq.id}
                onClick={() => onToggle(eq.id)}
                className={`flex flex-col items-center gap-3 p-5 rounded-[28px] border-2 transition-all duration-500 ${isSelected.includes(eq.id)
                    ? 'border-black bg-black text-white scale-105 shadow-xl shadow-black/10'
                    : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <eq.icon className="w-6 h-6" />
                <p className="text-[8px] font-black uppercase tracking-widest text-center">{eq.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

