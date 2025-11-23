'use client';

import { useEffect, useState } from 'react';
import { getTenants, createTenant, updateTenant, deactivateTenant, reactivateTenant, type Tenant } from '@/app/actions/admin/tenants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Search, Plus, Pencil, CheckCircle, XCircle, Building, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

type SortKey = 'id' | 'subdomain' | 'display_name' | 'status' | 'created_at';

export function TenantsManagementClient() {
  const filterFieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-500';
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'display_name',
    direction: 'asc',
  });
  const { toast } = useToast();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    subdomain: '',
    display_name: '',
    short_display_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, searchQuery, sortConfig]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tenants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTenants = () => {
    let filtered = tenants;

    if (searchQuery) {
      filtered = filtered.filter(
        (tenant) =>
          tenant.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.subdomain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      const valueA = a[key];
      const valueB = b[key];

      if (key === 'created_at') {
        const dateA = valueA ? new Date(valueA).getTime() : 0;
        const dateB = valueB ? new Date(valueB as string).getTime() : 0;
        return (dateA - dateB) * multiplier;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB) * multiplier;
      }

      return 0;
    });

    setFilteredTenants(sorted);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCreateTenant = async () => {
    if (!formData.id || !formData.subdomain || !formData.display_name) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTenant(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Tenant created successfully',
        });
        setCreateDialogOpen(false);
        setFormData({ id: '', subdomain: '', display_name: '', short_display_name: '' });
        fetchTenants();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create tenant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;

    if (!formData.subdomain || !formData.display_name) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateTenant(selectedTenant.id, {
        subdomain: formData.subdomain,
        display_name: formData.display_name,
        short_display_name: formData.short_display_name,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Tenant updated successfully',
        });
        setEditDialogOpen(false);
        setSelectedTenant(null);
        setFormData({ id: '', subdomain: '', display_name: '', short_display_name: '' });
        fetchTenants();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update tenant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    const action = tenant.status === 'active' ? deactivateTenant : reactivateTenant;
    const actionName = tenant.status === 'active' ? 'deactivate' : 'reactivate';

    try {
      const result = await action(tenant.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Tenant ${actionName}d successfully`,
        });
        fetchTenants();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${actionName} tenant`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = () => {
    setFormData({ id: '', subdomain: '', display_name: '', short_display_name: '' });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      id: tenant.id,
      subdomain: tenant.subdomain,
      display_name: tenant.display_name,
      short_display_name: tenant.short_display_name || '',
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tenants Management</h1>
          <p className="text-slate-600 mt-1">Manage organizations and districts</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Tenant
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, subdomain, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${filterFieldClasses} pl-10`}
            />
          </div>
          <Button
            variant="outline"
            onClick={fetchTenants}
            disabled={loading}
            className="border-slate-300 hover:bg-slate-100 hover:text-slate-900"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No tenants found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery ? 'Try adjusting your search query' : 'Get started by creating a new tenant'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('display_name')}
                    className="group flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
                  >
                    Display Name
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('subdomain')}
                    className="group flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
                  >
                    Subdomain
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('id')}
                    className="group flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
                  >
                    Tenant ID
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="group flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
                  >
                    Status
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="group flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
                  >
                    Created
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-slate-400 mr-2" />
                      <div className="text-sm font-medium text-slate-900">{tenant.display_name}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-slate-600">{tenant.subdomain}.districttracker.com</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-slate-500 font-mono">{tenant.id}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-500">
                    {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tenant)}
                        className="hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(tenant)}
                        className={`${
                          tenant.status === 'active'
                            ? 'hover:bg-red-50 text-red-600'
                            : 'hover:bg-green-50 text-green-600'
                        }`}
                      >
                        {tenant.status === 'active' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Tenant Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Create a new organization or district. The subdomain will be used for the tenant&apos;s unique URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-id">Tenant ID</Label>
              <Input
                id="tenant-id"
                placeholder="e.g., greenville-isd"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className={filterFieldClasses}
              />
              <p className="text-xs text-slate-500">Lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="e.g., Greenville ISD"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className={filterFieldClasses}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short-display-name">Short Display Name</Label>
              <Input
                id="short-display-name"
                placeholder="e.g., GISD"
                value={formData.short_display_name}
                onChange={(e) => setFormData({ ...formData, short_display_name: e.target.value.toUpperCase() })}
                className={filterFieldClasses}
              />
              <p className="text-xs text-slate-500">Short name shown on dashboard (e.g., BISD, DEMO)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  placeholder="e.g., greenville"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className={filterFieldClasses}
                />
                <span className="text-sm text-slate-500 whitespace-nowrap">.districttracker.com</span>
              </div>
              <p className="text-xs text-slate-500">Lowercase letters, numbers, and hyphens only</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTenant}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? 'Creating...' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the tenant&apos;s display name or subdomain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tenant-id">Tenant ID</Label>
              <Input
                id="edit-tenant-id"
                value={formData.id}
                disabled
                className="bg-slate-100 border-slate-300"
              />
              <p className="text-xs text-slate-500">Tenant ID cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                placeholder="e.g., Greenville ISD"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className={filterFieldClasses}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-short-display-name">Short Display Name</Label>
              <Input
                id="edit-short-display-name"
                placeholder="e.g., GISD"
                value={formData.short_display_name}
                onChange={(e) => setFormData({ ...formData, short_display_name: e.target.value.toUpperCase() })}
                className={filterFieldClasses}
              />
              <p className="text-xs text-slate-500">Short name shown on dashboard (e.g., BISD, DEMO)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-subdomain"
                  placeholder="e.g., greenville"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className={filterFieldClasses}
                />
                <span className="text-sm text-slate-500 whitespace-nowrap">.districttracker.com</span>
              </div>
              <p className="text-xs text-slate-500">Lowercase letters, numbers, and hyphens only</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTenant}
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {submitting ? 'Updating...' : 'Update Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
