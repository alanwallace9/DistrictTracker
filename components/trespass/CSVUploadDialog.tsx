'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, CircleAlert as AlertCircle, Download, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldMappingDialog } from '@/components/FieldMappingDialog';
import { uploadTrespassRecords, UploadResult, UploadError } from '@/app/actions/upload-records-enhanced';
import { getUserProfile } from '@/app/actions/users';
import { getTenants } from '@/app/actions/admin/tenants';
import { switchActiveTenant } from '@/app/actions/admin/switch-tenant';

type CSVUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordsUploaded: () => void;
};

type CSVRecord = {
  // Required fields
  first_name: string;
  last_name: string;
  school_id: string;
  expiration_date: string;
  trespassed_from: string;
  // Optional fields
  aka?: string;
  date_of_birth?: string;
  incident_date?: string;
  incident_location?: string;          // Renamed from 'location'
  description?: string;
  status?: string;
  is_current_student?: boolean;
  affiliation?: string;                // Renamed from 'known_associates'
  current_school?: string;
  guardian_first_name?: string;
  guardian_last_name?: string;
  guardian_phone?: string;
  school_contact?: string;             // Renamed from 'contact_info'
  notes?: string;
  photo?: string;                      // Renamed from 'photo_url'
};

type UserCSVRecord = {
  email: string;
  password: string;
  role: string;
  display_name?: string;
};

export function CSVUploadDialog({ open, onOpenChange, onRecordsUploaded }: CSVUploadDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CSVRecord[]>([]);
  const [userPreviewData, setUserPreviewData] = useState<UserCSVRecord[]>([]);
  const [error, setError] = useState<string>('');
  const [uploadType, setUploadType] = useState<'records' | 'users'>('records');
  const [userRole, setUserRole] = useState<string>('user');
  const [rawCSVText, setRawCSVText] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Tenant selection state for master_admin
  const [tenants, setTenants] = useState<Array<{id: string; display_name: string; subdomain: string; status: string}>>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [loadingTenants, setLoadingTenants] = useState(false);
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
          description: 'All uploaded records will be assigned to this tenant',
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

  const parseUserCSV = (text: string): UserCSVRecord[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one user');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const records: UserCSVRecord[] = [];

    const requiredFields = ['email', 'password'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      throw new Error(`Missing required columns: ${missingFields.join(', ')}`);
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};

      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });

      if (record.email && record.password) {
        records.push({
          email: record.email,
          password: record.password,
          role: record.role || 'user',
          display_name: record.display_name || undefined,
        });
      }
    }

    return records;
  };

  const parseCSVWithMapping = (text: string, fieldMapping: Record<string, string>): CSVRecord[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one record');
    }

    const originalHeaders = lines[0].split(',').map(h => h.trim());
    const records: CSVRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};

      // Apply field mapping
      originalHeaders.forEach((originalHeader, index) => {
        const mappedField = fieldMapping[originalHeader];
        if (mappedField && mappedField !== 'skip') {
          record[mappedField] = values[index] || '';
        }
      });

      // Check if all required fields are present
      if (record.first_name && record.last_name && record.school_id && record.expiration_date && record.trespassed_from) {
        records.push({
          first_name: record.first_name,
          last_name: record.last_name,
          school_id: record.school_id,
          expiration_date: record.expiration_date,
          trespassed_from: record.trespassed_from,
          aka: record.aka || undefined,
          date_of_birth: record.date_of_birth || undefined,
          incident_date: record.incident_date || undefined,
          incident_location: record.incident_location || undefined,
          description: record.description || undefined,
          status: record.status || 'active',
          is_current_student: record.is_current_student === 'true' || record.is_current_student === '1',
          affiliation: record.affiliation || undefined,
          current_school: record.current_school || undefined,
          guardian_first_name: record.guardian_first_name || undefined,
          guardian_last_name: record.guardian_last_name || undefined,
          guardian_phone: record.guardian_phone || undefined,
          school_contact: record.school_contact || undefined,
          notes: record.notes || undefined,
          photo: record.photo || undefined,
        });
      }
    }

    return records;
  };

  const handleMappingConfirmed = (fieldMapping: Record<string, string>) => {
    try {
      const records = parseCSVWithMapping(rawCSVText, fieldMapping);
      setPreviewData(records);
      setMappingDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
      setPreviewData([]);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template with headers and sample data
    const headers = [
      'first_name',
      'last_name',
      'school_id',
      'expiration_date',
      'trespassed_from',
      'aka',
      'date_of_birth',
      'incident_date',
      'incident_location',
      'description',
      'status',
      'is_current_student',
      'affiliation',
      'current_school',
      'guardian_first_name',
      'guardian_last_name',
      'guardian_phone',
      'school_contact',
      'notes',
      'photo',
    ];

    const sampleRow = [
      'John',
      'Doe',
      '12345',
      '2026-10-15',
      'All district properties',
      'Big John',
      '1995-05-20',
      '2025-10-10',
      'North High School',
      'Unauthorized entry after school hours',
      'active',
      'false',
      'Little Timmy',
      'North High School',
      'Jane',
      'Doe',
      '555-1234',
      'Dr Brown',
      'First offense, cooperative',
      'https://example.com/photo.jpg',
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      sampleRow.map(cell => `"${cell}"`).join(','),
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'trespass_records_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = (file: File) => {
    setError('');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (uploadType === 'users') {
          const users = parseUserCSV(text);
          setUserPreviewData(users);
          setPreviewData([]);
        } else {
          // For records, extract headers and show mapping dialog
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error('CSV file must contain headers and at least one record');
          }

          const headers = lines[0].split(',').map(h => h.trim());
          setRawCSVText(text);
          setCsvHeaders(headers);
          setMappingDialogOpen(true);
          setUserPreviewData([]);
        }
      } catch (err: any) {
        setError(err.message);
        setPreviewData([]);
        setUserPreviewData([]);
      }
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    processFile(file);
  };

  const handleUpload = async () => {
    if (!user || (previewData.length === 0 && userPreviewData.length === 0)) return;

    // Validate tenant selection for master_admin
    if (isMasterAdmin && !selectedTenant) {
      toast({
        title: 'Tenant Required',
        description: 'Please select a tenant before uploading records',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (uploadType === 'users') {
        // TODO: Update to use Clerk invitation API
        toast({
          title: 'Not Implemented',
          description: 'User CSV upload is not yet implemented. Please use the "Invite User" dialog instead.',
          variant: 'destructive',
        });
      } else {
        // Use server action for trespass records upload
        const result = await uploadTrespassRecords(previewData);

        // Show detailed success/error information
        if (result.success) {
          const messages: string[] = [];

          if (result.inserted > 0) {
            messages.push(`${result.inserted} new record${result.inserted === 1 ? '' : 's'} added`);
          }
          if (result.updated > 0) {
            messages.push(`${result.updated} existing record${result.updated === 1 ? '' : 's'} updated`);
          }
          if (result.skipped > 0) {
            messages.push(`${result.skipped} record${result.skipped === 1 ? '' : 's'} skipped`);
          }

          toast({
            title: 'Upload Complete',
            description: messages.join(', '),
          });

          // Show error details if any errors occurred
          if (result.errors && result.errors.length > 0) {
            const errorMessages = result.errors.map(
              (err) => `${err.record} (ID: ${err.school_id}): ${err.reason} - ${err.error}`
            ).join('\n');

            toast({
              title: `${result.totalErrors} Error${result.totalErrors === 1 ? '' : 's'} Occurred`,
              description: `First ${Math.min(result.totalErrors, 10)} errors:\n${errorMessages}`,
              variant: 'destructive',
            });
          }

          setPreviewData([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onRecordsUploaded();
          onOpenChange(false);
        } else {
          // All records failed
          const errorMessages = result.errors
            ? result.errors.slice(0, 5).map(
                (err) => `${err.record} (ID: ${err.school_id}): ${err.error}`
              ).join('\n')
            : 'All records failed to upload';

          toast({
            title: 'Upload Failed',
            description: `Failed to upload records.\n${errorMessages}${result.totalErrors > 5 ? `\n...and ${result.totalErrors - 5} more errors` : ''}`,
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to upload records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upload CSV File</DialogTitle>
          <DialogDescription className="text-base pt-1">
            {uploadType === 'records'
              ? 'Upload a CSV file with trespass records. Required columns: First Name, Last Name, School ID, Expiration Date, Trespassed From'
              : 'Upload a CSV file with user accounts. Required columns: Email, Password. Optional: Role, Display Name'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Tenant Selector for Master Admin */}
          {isMasterAdmin && (
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <Label htmlFor="tenant-select" className="text-sm font-semibold text-blue-900">
                  Select Target Tenant
                </Label>
              </div>
              <p className="text-xs text-blue-700 mb-2">
                All uploaded records will be assigned to the selected tenant
              </p>
              <Select
                value={selectedTenant}
                onValueChange={handleTenantChange}
                disabled={loadingTenants}
              >
                <SelectTrigger id="tenant-select" className="bg-white">
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

          {(userRole === 'district_admin' || userRole === 'master_admin') && (
            <div className="flex gap-3 p-1 bg-slate-100 rounded-lg">
              <Button
                type="button"
                variant={uploadType === 'records' ? 'default' : 'ghost'}
                onClick={() => {
                  setUploadType('records');
                  setPreviewData([]);
                  setUserPreviewData([]);
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className={uploadType === 'records' ? 'shadow-sm' : ''}
              >
                Trespass Records
              </Button>
              <Button
                type="button"
                variant={uploadType === 'users' ? 'default' : 'ghost'}
                onClick={() => {
                  setUploadType('users');
                  setPreviewData([]);
                  setUserPreviewData([]);
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className={uploadType === 'users' ? 'shadow-sm' : ''}
              >
                User Accounts
              </Button>
            </div>
          )}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg'
                : 'border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="flex flex-col items-center space-y-3">
                <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-white shadow-sm border border-slate-200'} transition-all`}>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {isDragging ? 'Drop CSV file here' : 'Click to upload or drag and drop'}
                </div>
                <div className="text-xs text-slate-500">CSV format with required columns</div>
              </div>
            </label>
          </div>

          {uploadType === 'records' && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {uploadType === 'users' && userPreviewData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{userPreviewData.length} users ready to create</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-white shadow-sm">
                <div className="space-y-2 text-sm">
                  {userPreviewData.slice(0, 3).map((userRecord, index) => (
                    <div key={index} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="font-semibold text-slate-900">{userRecord.email}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Role: {userRecord.role}</div>
                    </div>
                  ))}
                  {userPreviewData.length > 3 && (
                    <div className="text-xs text-slate-500 text-center pt-1 font-medium">
                      And {userPreviewData.length - 3} more users...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {uploadType === 'records' && previewData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{previewData.length} records ready to upload</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-white shadow-sm">
                <div className="space-y-2 text-sm">
                  {previewData.slice(0, 3).map((record, index) => (
                    <div key={index} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="font-semibold text-slate-900">
                        {record.first_name} {record.last_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ID: {record.school_id} | Trespassed from: {record.trespassed_from} | Expires: {record.expiration_date}
                      </div>
                    </div>
                  ))}
                  {previewData.length > 3 && (
                    <div className="text-xs text-slate-500 text-center pt-1 font-medium">
                      And {previewData.length - 3} more records...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isLoading || (previewData.length === 0 && userPreviewData.length === 0)} className="shadow-sm">
              {isLoading
                ? uploadType === 'users'
                  ? 'Creating...'
                  : 'Uploading...'
                : uploadType === 'users'
                ? `Create ${userPreviewData.length} Users`
                : `Upload ${previewData.length} Records`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <FieldMappingDialog
      open={mappingDialogOpen}
      onOpenChange={setMappingDialogOpen}
      csvHeaders={csvHeaders}
      onMappingConfirmed={handleMappingConfirmed}
    />
  </>
  );
}
