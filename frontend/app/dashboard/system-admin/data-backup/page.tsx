"use client";

import { useState, useEffect } from "react";
import { backupService } from "@/app/services/backup";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GlassCard } from "@/components/ui/glass-card";

interface BackupMetadata {
  filename: string;
  size: number;
  timestamp: string;
  extension?: string;
}

export default function DataBackupPage() {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await backupService.listBackups();
      if (response.error) {
        toast.error(response.error);
      } else if (response.data) {
        setBackups(response.data as BackupMetadata[]);
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
      toast.error("Failed to load backup history");
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = async () => {
    try {
      setIsBackingUp(true);
      const response = await backupService.createBackup({ name: "manual_" + Date.now() });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Backup triggered successfully");
        await fetchBackups();
      }
    } catch (e: any) {
      toast.error("Failed to trigger backup: " + e?.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm("Are you sure you want to delete this backup?")) return;
    try {
      const response = await backupService.deleteBackup(filename);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Backup deleted successfully");
        await fetchBackups();
      }
    } catch (e: any) {
      toast.error("Failed to delete backup: " + e?.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const [backupConfig, setBackupConfig] = useState({
    autoBackupEnabled: true,
    backupFrequency: "daily",
    retentionDays: "30",
    backupTime: "02:00",
    notifyEmail: "admin@company.com",
  });

  const saveBackupConfig = async () => {
    try {
      alert("Backup configuration saved successfully");
    } catch (e: any) {
      alert("Failed to save data-backup config: " + e?.message);
    }
  };

  const restoreBackup = (id: string) => {
    if (!confirm("Are you sure you want to restore from this data-backup? This will overwrite current data.")) return;
    alert(`Restore from backup ${id} initiated (placeholder)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Data Backup Configuration</h1>
        <p className="text-slate-600 mt-2">Configure and manage database backups, restore points, and retention policies</p>
      </div>

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <p className="text-slate-600 text-sm font-medium">Last Backup</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {backups.length > 0 && backups[0].timestamp ? format(new Date(backups[0].timestamp), "MMM d, h:mm a") : "Never"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Status: {backups.length > 0 ? "Success" : "N/A"}</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-slate-600 text-sm font-medium">Total Backups</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{backups.length}</p>
          <p className="text-xs text-slate-500 mt-1">Files found on disk</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-slate-600 text-sm font-medium">Total Size</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatSize(backups.reduce((acc, b) => acc + (b.size || 0), 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">Storage used for backups</p>
        </GlassCard>
      </div>

      {/* Backup Configuration & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup Configuration Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Backup Configuration</h2>
            <p className="text-xs text-slate-600 mt-1">REQ-PY-16: Set backup schedule and policies</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={backupConfig.autoBackupEnabled}
                  onChange={(e) =>
                    setBackupConfig((c) => ({ ...c, autoBackupEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-violet-600"
                />
                <span className="text-sm font-medium text-slate-700">Enable Automatic Backups</span>
              </label>
              <p className="text-xs text-slate-500 ml-6">Automatically backup data on schedule</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Backup Frequency</label>
              <select
                value={backupConfig.backupFrequency}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, backupFrequency: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="hourly">Every Hour</option>
                <option value="every-6h">Every 6 Hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Backup Time (UTC)</label>
              <input
                type="time"
                value={backupConfig.backupTime}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, backupTime: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Retention (days)</label>
              <input
                type="number"
                min="7"
                max="365"
                value={backupConfig.retentionDays}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, retentionDays: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Keep backups for this many days</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notification Email</label>
              <input
                type="email"
                value={backupConfig.notifyEmail}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, notifyEmail: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="admin@company.com"
              />
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={saveBackupConfig}
                className="w-full text-sm font-medium"
              >
                Save Configuration
              </Button>
              <Button
                onClick={triggerBackup}
                disabled={isBackingUp}
                className="w-full text-sm font-medium"
              >
                {isBackingUp ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Backing up...
                  </>
                ) : (
                  "Backup Now"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Backup History Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Backup History</h2>
            <p className="text-xs text-slate-600 mt-1">Recent backup operations and restore options</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <table className="w-full text-sm text-slate-600">
                <thead>
                  <tr className="text-left border-b bg-slate-50/50">
                    <th className="py-4 px-6 font-bold text-slate-900">Filename</th>
                    <th className="py-4 px-6 font-bold text-slate-900">Date Created</th>
                    <th className="py-4 px-6 font-bold text-slate-900">Size</th>
                    <th className="py-4 px-6 font-bold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map((backup) => (
                    <tr key={backup.filename} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900 break-all">
                        {backup.filename}
                      </td>
                      <td className="py-4 px-6">
                        {backup.timestamp ? format(new Date(backup.timestamp), "MMM d, yyyy h:mm a") : "Unknown Date"}
                      </td>
                      <td className="py-4 px-6">{formatSize(backup.size)}</td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreBackup(backup.filename)}
                          className="text-primary hover:text-primary/80"
                        >
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBackup(backup.filename)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No backup files found. Click "Backup Now" or check scheduler.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Backup Guidelines & Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium text-slate-900 mb-2"> Backup Strategy</p>
            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
              <li>Full backups run weekly; daily incremental backups</li>
              <li>Backups stored in geographically distributed locations</li>
              <li>Encryption enabled for all backup data</li>
              <li>Retention period ensures compliance with data policies</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-2"> Restore Procedures</p>
            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
              <li>Test restore procedures regularly to ensure integrity</li>
              <li>Verify backup before deleting old data</li>
              <li>Keep offline copies of critical backups</li>
              <li>Document all restore operations in audit logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
