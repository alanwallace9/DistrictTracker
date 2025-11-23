'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, FileText, Activity, Database, Loader2, RotateCcw } from 'lucide-react';
import { getAdminStats, type AdminStats } from '@/app/actions/admin/overview';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { getUserProfile } from '@/app/actions/users';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminOverview() {
  const { selectedTenantId } = useAdminTenant();
  const { user } = useUser();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCampuses: 0,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [updatingSnapshot, setUpdatingSnapshot] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Fetch user role
  useEffect(() => {
    async function fetchUserRole() {
      if (!user?.id) return;

      try {
        const profile = await getUserProfile(user.id);
        setUserRole(profile?.role || null);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    fetchUserRole();
  }, [user?.id]);

  useEffect(() => {
    async function fetchStats() {
      if (!selectedTenantId) return;

      try {
        setLoading(true);
        const data = await getAdminStats(selectedTenantId);
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [selectedTenantId]);

  // Handler for updating demo snapshot
  const handleUpdateDemoSnapshot = async () => {
    try {
      setUpdatingSnapshot(true);
      const response = await fetch('/api/admin/update-demo-snapshot', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update demo snapshot');
      }

      toast.success('Demo snapshot updated successfully', {
        description: `Saved ${result.campusCount} campuses and ${result.recordCount} records as new default state.`,
      });
    } catch (error: any) {
      console.error('Error updating demo snapshot:', error);
      toast.error('Failed to update demo snapshot', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setUpdatingSnapshot(false);
    }
  };

  // Handler for resetting demo records now
  const handleResetDemoNow = async () => {
    try {
      setResettingDemo(true);
      setShowResetDialog(false);

      const response = await fetch('/api/admin/reset-demo-now', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset demo tenant');
      }

      toast.success('Demo tenant reset successfully', {
        description: `Reset to ${result.recordsInserted} records and ${result.campusesInserted} campuses.`,
      });

      // Refresh stats after reset
      if (selectedTenantId) {
        const data = await getAdminStats(selectedTenantId);
        setStats(data);
      }
    } catch (error: any) {
      console.error('Error resetting demo tenant:', error);
      toast.error('Failed to reset demo tenant', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setResettingDemo(false);
    }
  };

  // Show demo snapshot button only for master admin on demo tenant
  const showDemoSnapshotButton = userRole === 'master_admin' && selectedTenantId === 'demo';

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: `${stats.activeUsers} active`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Campuses',
      value: stats.totalCampuses,
      description: 'Active campuses',
      icon: Building2,
      color: 'text-green-600',
    },
    {
      title: 'Records',
      value: stats.totalRecords,
      description: 'Total trespass records',
      icon: FileText,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground mt-2">
          System-wide statistics and quick access to admin functions
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-100 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border border-slate-200 bg-white shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-700" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/users"
              className="p-4 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">Manage Users</h3>
              <p className="text-sm text-slate-500">
                View, edit, invite, or remove users
              </p>
            </a>
            <a
              href="/admin/campuses"
              className="p-4 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">Manage Campuses</h3>
              <p className="text-sm text-slate-500">
                Add, edit, or deactivate campus locations
              </p>
            </a>
            <a
              href="/admin/audit-logs"
              className="p-4 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">View Audit Logs</h3>
              <p className="text-sm text-slate-500">
                Review system activity and changes
              </p>
            </a>

            {showDemoSnapshotButton && (
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-2xl">
                <div className="flex items-start justify-between mb-2">
                  <Database className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                    Demo Only
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Demo Management</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Manage demo tenant data and snapshots
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateDemoSnapshot}
                    disabled={updatingSnapshot || resettingDemo}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center h-auto py-2"
                    size="sm"
                  >
                    {updatingSnapshot ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                        <span className="text-xs">Updating...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-xs flex flex-col demo-btn:flex-row demo-btn:gap-1 leading-tight">
                          <span>Update</span>
                          <span>Snapshot</span>
                        </span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowResetDialog(true)}
                    disabled={updatingSnapshot || resettingDemo}
                    variant="destructive"
                    className="flex-1 flex items-center justify-center h-auto py-2"
                    size="sm"
                  >
                    {resettingDemo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                        <span className="text-xs">Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-xs flex flex-col demo-btn:flex-row demo-btn:gap-1 leading-tight">
                          <span>Reset</span>
                          <span>Records</span>
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reset Demo Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Demo Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately delete all current demo records and campuses, and restore them
              to the saved snapshot. This action is useful if inappropriate content has been posted.
              <br />
              <br />
              The demo tenant will automatically reset every 6 hours via scheduled cron job as well.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetDemoNow}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
