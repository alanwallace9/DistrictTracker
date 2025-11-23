'use client';

import { useEffect, useState } from 'react';
import { getUsersForAdmin, updateUserRole, deleteUser, type AdminUserListItem } from '@/app/actions/admin/users';
import { getCampuses } from '@/app/actions/admin/campuses';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Campus } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, Edit2, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { BulkUserUploadDialog } from '@/components/admin/BulkUserUploadDialog';
import { format } from 'date-fns';

export default function UsersManagementPage() {
  const { selectedTenantId } = useAdminTenant();
  const { user } = useAuth();
  const filterFieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-500';
  const selectFieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 focus:ring-2 focus:ring-slate-200';
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUserListItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editCampusId, setEditCampusId] = useState<string>('');
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editNotificationDays, setEditNotificationDays] = useState<string>('7');
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const isMasterAdmin = user?.user_metadata?.role === 'master_admin';

  useEffect(() => {
    if (selectedTenantId) {
      fetchData();
    }
  }, [selectedTenantId]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const fetchData = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    try {
      const [usersData, campusesData] = await Promise.all([
        getUsersForAdmin(selectedTenantId),
        getCampuses(selectedTenantId),
      ]);
      setUsers(usersData);
      setCampuses(campusesData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter((user) => !user.deleted_at && user.status === 'active');
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((user) => user.status === 'inactive' || user.deleted_at);
    } else if (statusFilter === 'invited') {
      filtered = filtered.filter((user) => user.status === 'invited');
    }

    setFilteredUsers(filtered);
  };

  const handleEditClick = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditCampusId(user.campus_id || '');
    setEditDisplayName(user.display_name || '');
    setEditNotificationDays(user.notification_days?.toString() || '7');
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      await updateUserRole(
        selectedUser.id,
        editRole as any,
        editRole === 'campus_admin' ? editCampusId : null,
        editDisplayName || undefined,
        parseInt(editNotificationDays) || undefined
      );

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      await deleteUser(selectedUser.id);

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkUploadDialogOpen(true)}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 ${filterFieldClasses}`}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className={`w-[180px] ${selectFieldClasses}`}>
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="campus_admin">Campus Admin</SelectItem>
            <SelectItem value="district_admin">District Admin</SelectItem>
            {isMasterAdmin && (
              <SelectItem value="master_admin">Master Admin</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={`w-[180px] ${selectFieldClasses}`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[640px]">
            <table className="w-full">
              <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-4 font-medium">User</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Campus</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Last Login</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr key={user.id} className={`${rowBg} hover:bg-slate-100 transition-colors`}>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{user.display_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 leading-tight">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600">{user.campus_name || '—'}</td>
                      <td className="p-4">
                        {user.deleted_at ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800">
                            Deleted
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'invited'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4 text-right">
                        {!user.deleted_at && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user profile settings, role, and campus assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email</Label>
              <Input value={selectedUser?.email || ''} disabled className={filterFieldClasses} />
            </div>
            <div>
              <Label>District</Label>
              <Input value={selectedUser?.tenant_name || 'N/A'} disabled className={filterFieldClasses} />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter display name"
                className={filterFieldClasses}
              />
              <p className="text-xs text-slate-500 mt-1">Optional friendly name shown in the app</p>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className={selectFieldClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="campus_admin">Campus Admin</SelectItem>
                  <SelectItem value="district_admin">District Admin</SelectItem>
                  {isMasterAdmin && (
                    <SelectItem value="master_admin">Master Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {editRole === 'campus_admin' && (
              <div>
                <Label>Campus</Label>
                <Select value={editCampusId} onValueChange={setEditCampusId}>
                  <SelectTrigger className={selectFieldClasses}>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses
                      .filter(c => c.status === 'active')
                      .map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name} ({campus.abbreviation})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notification Days</Label>
              <Select value={editNotificationDays} onValueChange={setEditNotificationDays}>
                <SelectTrigger className={selectFieldClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before expiration</SelectItem>
                  <SelectItem value="3">3 days before expiration</SelectItem>
                  <SelectItem value="5">5 days before expiration</SelectItem>
                  <SelectItem value="7">7 days before expiration</SelectItem>
                  <SelectItem value="14">14 days before expiration</SelectItem>
                  <SelectItem value="30">30 days before expiration</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">How far in advance to show expiration warnings</p>
            </div>
          </div>
          <DialogFooter className="flex w-full items-center justify-between">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => selectedUser && handleDeleteClick(selectedUser)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete User
            </Button>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm">
                <strong>Email:</strong> {selectedUser?.email}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will permanently delete the user from Clerk and mark them as deleted in the database.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-red-600">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className={filterFieldClasses}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isUpdating || deleteConfirmText !== 'DELETE'}
            >
              {isUpdating ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onUserInvited={fetchData}
      />

      {/* Bulk Upload Dialog */}
      <BulkUserUploadDialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
        onUsersInvited={fetchData}
      />
    </div>
  );
}
