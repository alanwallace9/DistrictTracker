'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { bulkInviteUsers, type BulkUserRow, type BulkInviteResult } from '@/app/actions/admin/bulk-invite-users';
import { getUserProfile } from '@/app/actions/users';
import { getTenants } from '@/app/actions/admin/tenants';
import { switchActiveTenant } from '@/app/actions/admin/switch-tenant';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Download, Users, Building2 } from 'lucide-react';
import Papa from 'papaparse';

type BulkUserUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsersInvited?: () => void;
};

type ParsedRow = BulkUserRow & {
  rowNumber: number;
  validationError?: string;
};

export function BulkUserUploadDialog({ open, onOpenChange, onUsersInvited }: BulkUserUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploadResults, setUploadResults] = useState<BulkInviteResult[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Tenant selection state for master_admin
  const [tenants, setTenants] = useState<Array<{id: string; display_name: string; subdomain: string; status: string}>>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const isMasterAdmin = userRole === 'master_admin';

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Fetch tenants when dialog opens and user is master_admin
  useEffect(() => {
    if (open && isMasterAdmin) {
      fetchTenants();
    }
  }, [open, isMasterAdmin]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const profile = await getUserProfile(user.id);
      if (profile) {
        setUserRole(profile.role || 'user');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const tenantList = await getTenants();
      setTenants(tenantList);

      // Get the user's current profile to check active_tenant_id
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile?.active_tenant_id) {
          setSelectedTenant(profile.active_tenant_id);
        }
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tenant list',
        variant: 'destructive',
      });
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleTenantChange = async (tenantId: string) => {
    setSelectedTenant(tenantId);

    // Update the active tenant in the user's profile
    try {
      const result = await switchActiveTenant(tenantId);
      if (result.success) {
        toast({
          title: 'Tenant Selected',
          description: 'All invited users will be assigned to this tenant',
        });
      } else {
        throw new Error(result.error || 'Failed to switch tenant');
      }
    } catch (error: any) {
      console.error('Error switching active tenant:', error);
      toast({
        title: 'Warning',
        description: error.message || 'Failed to set active tenant. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setUploadResults(null);

    Papa.parse<BulkUserRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const parsed: ParsedRow[] = results.data.map((row, index) => ({
          ...row,
          rowNumber: index + 2, // +2 because of header row and 0-index
          email: row.email?.trim() || '',
          role: row.role?.trim().toLowerCase() as any,
          campus_id: row.campus_id?.trim() || undefined,
        }));

        // Client-side basic validation
        parsed.forEach((row) => {
          if (!row.email) {
            row.validationError = 'Email is required';
          } else if (!row.role) {
            row.validationError = 'Role is required';
          } else if (row.role === 'campus_admin' && !row.campus_id) {
            row.validationError = 'Campus ID required for campus_admin';
          }
        });

        setParsedData(parsed);

        const validCount = parsed.filter(r => !r.validationError).length;
        toast({
          title: 'CSV Parsed',
          description: `Found ${parsed.length} rows (${validCount} valid)`,
        });
      },
      error: (error) => {
        toast({
          title: 'Parse Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }, [toast]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Reset file input
    event.target.value = '';
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    }
  };

  const handleBulkInvite = async () => {
    const validRows = parsedData.filter(row => !row.validationError);

    if (validRows.length === 0) {
      toast({
        title: 'No Valid Rows',
        description: 'Please fix validation errors before uploading',
        variant: 'destructive',
      });
      return;
    }

    // Validate tenant selection for master_admin
    if (isMasterAdmin && !selectedTenant) {
      toast({
        title: 'Tenant Required',
        description: 'Please select a tenant before inviting users',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await bulkInviteUsers(validRows);

      setUploadResults(result.results);

      toast({
        title: 'Bulk Invitation Complete',
        description: `${result.summary.succeeded} succeeded, ${result.summary.failed} failed`,
        variant: result.summary.failed > 0 ? 'default' : 'default',
      });

      if (result.summary.succeeded > 0) {
        onUsersInvited?.();
      }
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'email,role,campus_id,tenant_id\nadmin@example.com,campus_admin,010,\nviewer@example.com,viewer,,\ndistrict@example.com,district_admin,,birdville';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_invite_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFailedRows = () => {
    if (!uploadResults) return;

    const failedRows = uploadResults.filter(r => !r.success);
    const csv = Papa.unparse(failedRows.map(r => ({ email: r.email, error: r.error })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed_invitations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setParsedData([]);
    setFileName('');
    setUploadResults(null);
  };

  const validCount = parsedData.filter(r => !r.validationError).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#F9FAFB]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Bulk User Invitation
          </DialogTitle>
          <DialogDescription className="text-base pt-1">
            Upload a CSV file to invite multiple users at once. They'll each receive an email to set their password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Tenant Selector for Master Admin */}
          {isMasterAdmin && (
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <Label htmlFor="bulk-tenant-select" className="text-sm font-semibold text-blue-900">
                  Select Target Tenant
                </Label>
              </div>
              <p className="text-xs text-blue-700 mb-2">
                All invited users will be assigned to the selected tenant (unless CSV specifies tenant_id)
              </p>
              <Select
                value={selectedTenant}
                onValueChange={handleTenantChange}
                disabled={loadingTenants}
              >
                <SelectTrigger id="bulk-tenant-select" className="bg-white">
                  <SelectValue placeholder={loadingTenants ? "Loading tenants..." : "Select a tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.display_name}
                      {tenant.status !== 'active' && (
                        <span className="ml-2 text-xs text-gray-500">({tenant.status})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Upload Section */}
          {parsedData.length === 0 && !uploadResults && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm font-medium mb-2">
                  {isDragging ? 'Drop CSV file here' : 'Drag & drop CSV file or click to browse'}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  File must contain: email, role, campus_id (optional)
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button asChild variant="outline">
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" />
                      Choose CSV File
                    </span>
                  </Button>
                </label>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                <div className="text-sm">
                  <p className="font-medium">Need a template?</p>
                  <p className="text-xs text-slate-500">Download a sample CSV with example data</p>
                </div>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">CSV Format Requirements:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• <strong>email</strong>: User's email address (required)</li>
                  <li>• <strong>role</strong>: viewer, campus_admin, or district_admin (required)</li>
                  <li>• <strong>campus_id</strong>: Campus number like 010, 042 (required for campus_admin only)</li>
                  <li>• <strong>tenant_id</strong>: Tenant ID like birdville, demo (optional, master_admin only)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && !uploadResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Preview: {fileName}</p>
                  <p className="text-sm text-slate-500">
                    {validCount} valid, {invalidCount} invalid
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Choose Different File
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">#</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">Role</th>
                        <th className="text-left p-2 font-medium">Campus ID</th>
                        <th className="text-left p-2 font-medium">Tenant ID</th>
                        <th className="text-left p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((row, index) => (
                        <tr
                          key={index}
                          className={`border-t ${row.validationError ? 'bg-red-50' : 'bg-white'}`}
                        >
                          <td className="p-2 text-slate-500">{row.rowNumber}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2">{row.role}</td>
                          <td className="p-2">{row.campus_id || '—'}</td>
                          <td className="p-2">{row.tenant_id || '—'}</td>
                          <td className="p-2">
                            {row.validationError ? (
                              <span className="flex items-center text-red-600 text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {row.validationError}
                              </span>
                            ) : (
                              <span className="flex items-center text-green-600 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkInvite}
                  disabled={isUploading || validCount === 0}
                  className="shadow-sm"
                >
                  {isUploading ? `Inviting ${validCount} Users...` : `Invite ${validCount} Users`}
                </Button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {uploadResults && (
            <div className="space-y-4">
              <div className="text-center py-6 bg-slate-50 rounded-lg">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Bulk Invitation Complete</h3>
                <p className="text-slate-600">
                  {uploadResults.filter(r => r.success).length} succeeded,{' '}
                  {uploadResults.filter(r => !r.success).length} failed
                </p>
              </div>

              {uploadResults.filter(r => !r.success).length > 0 && (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-red-50 border-b border-red-200 p-3">
                      <p className="font-medium text-red-900 text-sm">Failed Invitations</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2 font-medium">Email</th>
                            <th className="text-left p-2 font-medium">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResults
                            .filter(r => !r.success)
                            .map((result, index) => (
                              <tr key={index} className="border-t">
                                <td className="p-2">{result.email}</td>
                                <td className="p-2 text-red-600 text-xs">
                                  <XCircle className="w-3 h-3 inline mr-1" />
                                  {result.error}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={downloadFailedRows} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Failed Rows (CSV)
                  </Button>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button onClick={handleReset} variant="outline">
                  Upload Another File
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
