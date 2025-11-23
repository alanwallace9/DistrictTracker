'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrespassRecord, supabase, RecordPhoto, RecordDocument } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateRecord, deleteRecord, getRelatedIncidents, getRecord } from '@/app/actions/records';
import { getCampuses, type Campus } from '@/app/actions/campuses';
import { getUserProfile } from '@/app/actions/users';
import { createTrespassRecord } from '@/app/actions/upload-records';
import { copyPhotosToNewIncident } from '@/app/actions/copy-photos';
import { format, parseISO } from 'date-fns';
import { X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { PhotoGallery } from '@/components/PhotoGallery';
import { DocumentUpload } from '@/components/DocumentUpload';
import { getRecordPhotos, getRecordDocuments } from '@/lib/file-upload';
import { useDemoRole } from '@/contexts/DemoRoleContext';

type RecordDetailDialogProps = {
  record: TrespassRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordUpdated?: () => void;
};

/**
 * Format a date string from the database for display
 * Handles date-only strings (YYYY-MM-DD) without timezone conversion
 */
function formatDateForDisplay(dateString: string | null | undefined, formatString: string = 'MM/dd/yyyy'): string {
  if (!dateString) return 'N/A';

  // Parse the date as-is without timezone conversion
  // For YYYY-MM-DD strings, treat them as local dates
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return format(date, formatString);
}

/**
 * Convert a date string from HTML input (YYYY-MM-DD) to ISO datetime format
 * Required by Zod .datetime() validation in the schema
 * Uses noon UTC to avoid timezone issues when displaying dates
 */
function convertDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;

  // If already in ISO format, return as-is
  if (dateString.includes('T')) return dateString;

  // Convert YYYY-MM-DD to ISO datetime at noon UTC
  // This prevents the date from shifting when displayed in different timezones
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return date.toISOString();
}

export function RecordDetailDialog({ record, open, onOpenChange, onRecordUpdated }: RecordDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNewIncident, setIsAddingNewIncident] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentRecord, setCurrentRecord] = useState<TrespassRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [photos, setPhotos] = useState<RecordPhoto[]>([]);
  const [documents, setDocuments] = useState<RecordDocument[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [userCampusId, setUserCampusId] = useState<string | null>(null);
  const [campusesLoading, setCampusesLoading] = useState(false);
  const [relatedIncidents, setRelatedIncidents] = useState<TrespassRecord[]>([]);
  const [currentIncidentIndex, setCurrentIncidentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDemoMode, demoRole } = useDemoRole();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    aka: '',
    date_of_birth: '',
    school_id: '',
    affiliation: '',
    current_school: '',
    guardian_first_name: '',
    guardian_last_name: '',
    guardian_phone: '',
    school_contact: '',
    expiration_date: '',
    trespassed_from: '',
    is_current_student: true,
    is_daep: false,
    daep_expiration_date: '',
    notes: '',
    photo: '',
    campus_id: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      setIsEditing(false);
      setIsAddingNewIncident(false);
      // Fetch campuses and user profile when dialog opens
      fetchCampusesData();
    }
  }, [open, user]);

  const fetchCampusesData = async () => {
    if (!user) return;

    setCampusesLoading(true);
    try {
      // Fetch user profile to get role and campus_id
      const profile = await getUserProfile(user.id);
      if (profile) {
        setUserCampusId(profile.campus_id);
      }

      // Fetch all active campuses
      const campusData = await getCampuses();
      const activeCampuses = campusData.filter(c => c.status === 'active');
      setCampuses(activeCampuses);
    } catch (error) {
      console.error('Failed to load campuses:', error);
    } finally {
      setCampusesLoading(false);
    }
  };

  useEffect(() => {
    if (record) {
      setCurrentRecord(record);
      setFormData({
        first_name: record.first_name,
        last_name: record.last_name,
        aka: record.aka || '',
        date_of_birth: record.date_of_birth ? formatDateForDisplay(record.date_of_birth, 'yyyy-MM-dd') : '',
        school_id: record.school_id || '',
        affiliation: record.affiliation || '',
        current_school: record.current_school || '',
        guardian_first_name: record.guardian_first_name || '',
        guardian_last_name: record.guardian_last_name || '',
        guardian_phone: record.guardian_phone || '',
        school_contact: record.school_contact || '',
        expiration_date: record.expiration_date ? formatDateForDisplay(record.expiration_date, 'yyyy-MM-dd') : '',
        trespassed_from: record.trespassed_from || '',
        is_current_student: record.is_current_student || false,
        is_daep: record.is_daep || false,
        daep_expiration_date: record.daep_expiration_date ? formatDateForDisplay(record.daep_expiration_date, 'yyyy-MM-dd') : '',
        notes: record.notes || '',
        photo: record.photo || '',
        campus_id: record.campus_id || '',
      });
      setImagePreview(record.photo || null);

      // Fetch photos and documents
      loadMediaFiles(record.id);

      // Fetch related incidents if school_id exists
      if (record.school_id && record.tenant_id) {
        loadRelatedIncidents(record.school_id, record.tenant_id, record.id);
      } else {
        setRelatedIncidents([record]);
        setCurrentIncidentIndex(0);
      }
    }
  }, [record]);

  const loadMediaFiles = async (recordId: string) => {
    setIsLoadingMedia(true);
    try {
      const [photosData, documentsData] = await Promise.all([
        getRecordPhotos(recordId),
        getRecordDocuments(recordId),
      ]);
      setPhotos(photosData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Failed to load media files:', error);
      toast({
        title: 'Warning',
        description: 'Could not load photos and documents',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const loadRelatedIncidents = async (schoolId: string, tenantId: string, currentRecordId: string) => {
    try {
      const incidents = await getRelatedIncidents(schoolId, tenantId);

      if (incidents.length > 0) {
        setRelatedIncidents(incidents);
        // Default to most recent incident (last in the list)
        const currentIndex = incidents.findIndex(inc => inc.id === currentRecordId);
        // If current record found, use it; otherwise default to last (most recent)
        setCurrentIncidentIndex(currentIndex >= 0 ? currentIndex : incidents.length - 1);
      } else {
        // If no incidents found, just show the current record
        // Use record prop instead of currentRecord state which may be null
        if (record) {
          setRelatedIncidents([record]);
          setCurrentIncidentIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to load related incidents:', error);
      // On error, just show the current record
      // Use record prop instead of currentRecord state which may be null
      if (record) {
        setRelatedIncidents([record]);
        setCurrentIncidentIndex(0);
      }
    }
  };

  const handleIncidentChange = (index: number) => {
    const selectedIncident = relatedIncidents[index];
    if (selectedIncident) {
      setCurrentIncidentIndex(index);
      setCurrentRecord(selectedIncident);
      setFormData({
        first_name: selectedIncident.first_name,
        last_name: selectedIncident.last_name,
        aka: selectedIncident.aka || '',
        date_of_birth: selectedIncident.date_of_birth ? formatDateForDisplay(selectedIncident.date_of_birth, 'yyyy-MM-dd') : '',
        school_id: selectedIncident.school_id || '',
        affiliation: selectedIncident.affiliation || '',
        current_school: selectedIncident.current_school || '',
        guardian_first_name: selectedIncident.guardian_first_name || '',
        guardian_last_name: selectedIncident.guardian_last_name || '',
        guardian_phone: selectedIncident.guardian_phone || '',
        school_contact: selectedIncident.school_contact || '',
        expiration_date: selectedIncident.expiration_date ? formatDateForDisplay(selectedIncident.expiration_date, 'yyyy-MM-dd') : '',
        trespassed_from: selectedIncident.trespassed_from || '',
        is_current_student: selectedIncident.is_current_student || false,
        is_daep: selectedIncident.is_daep || false,
        daep_expiration_date: selectedIncident.daep_expiration_date ? formatDateForDisplay(selectedIncident.daep_expiration_date, 'yyyy-MM-dd') : '',
        notes: selectedIncident.notes || '',
        photo: selectedIncident.photo || '',
        campus_id: selectedIncident.campus_id || '',
      });
      setImagePreview(selectedIncident.photo || null);
      loadMediaFiles(selectedIncident.id);
    }
  };

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (data?.role) {
      setUserRole(data.role);
    } else {
      setUserRole('master_admin');
    }
  };

  // Determine effective role (use demo role if in demo mode, otherwise use actual user role)
  const effectiveRole = isDemoMode ? demoRole : userRole;

  // Permission check: viewer cannot edit, campus_admin and district_admin can edit
  const canEdit = effectiveRole !== 'viewer';

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleSave = async () => {
    if (!currentRecord || !user) return;

    // Validation: expiration_date is only required if NOT a DAEP placement
    const isExpirationRequired = !formData.is_daep;
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.trespassed_from || (isExpirationRequired && !formData.expiration_date)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.' + (formData.is_daep ? '' : ' Warning Expires is required for non-DAEP incidents.'),
        variant: 'destructive',
        duration: 5000 // Errors stay longer (5 seconds)
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for update
      const updateData: Partial<TrespassRecord> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        aka: formData.aka || null,
        date_of_birth: convertDateToISO(formData.date_of_birth),
        school_id: formData.school_id, // Required field
        affiliation: formData.affiliation || null,
        current_school: formData.current_school || null,
        guardian_first_name: formData.guardian_first_name || null,
        guardian_last_name: formData.guardian_last_name || null,
        guardian_phone: formData.guardian_phone || null,
        school_contact: formData.school_contact || null,
        expiration_date: convertDateToISO(formData.expiration_date) || undefined, // Convert to ISO or undefined
        trespassed_from: formData.trespassed_from,
        is_current_student: formData.is_current_student,
        is_daep: formData.is_daep,
        daep_expiration_date: convertDateToISO(formData.daep_expiration_date) || undefined,
        notes: formData.notes || null,
        photo: formData.photo || null,
        campus_id: (formData.campus_id && formData.campus_id !== '__unassigned__') ? formData.campus_id : null,
      };

      // Save the CURRENT record (the one being edited) to database
      await updateRecord(currentRecord?.id || '', updateData);

      // Reload related incidents to update the list with fresh data
      if (currentRecord.school_id && currentRecord.tenant_id) {
        await loadRelatedIncidents(currentRecord.school_id, currentRecord.tenant_id, currentRecord.id);
      }

      toast({
        title: 'Success',
        description: 'Record updated successfully',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
      setIsEditing(false);

      // CRITICAL: Refresh parent dashboard to show updated data
      if (onRecordUpdated) onRecordUpdated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 5000 // Errors stay longer (5 seconds)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record || !confirm('Are you sure you want to delete this record?')) return;

    try {
      await deleteRecord(record.id);

      toast({
        title: 'Success',
        description: 'Record deleted successfully',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
      onOpenChange(false);
      if (onRecordUpdated) onRecordUpdated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 5000 // Errors stay longer (5 seconds)
      });
    }
  };

  const handleAddNewIncident = () => {
    if (!currentRecord) return;

    // Pre-fill ALL fields from current record including photo
    // User can edit everything except identifying fields
    setFormData({
      first_name: currentRecord.first_name,
      last_name: currentRecord.last_name,
      date_of_birth: currentRecord.date_of_birth ? formatDateForDisplay(currentRecord.date_of_birth, 'yyyy-MM-dd') : '',
      school_id: currentRecord.school_id || '',
      aka: currentRecord.aka || '',
      affiliation: currentRecord.affiliation || '',
      current_school: currentRecord.current_school || '',
      guardian_first_name: currentRecord.guardian_first_name || '',
      guardian_last_name: currentRecord.guardian_last_name || '',
      guardian_phone: currentRecord.guardian_phone || '',
      school_contact: currentRecord.school_contact || '',
      expiration_date: '', // Clear - new incident needs new date
      trespassed_from: currentRecord.trespassed_from || '',
      is_current_student: currentRecord.is_current_student || false,
      is_daep: false, // Default to false for new incident
      daep_expiration_date: '', // Clear - new incident
      notes: '', // Clear - new incident notes
      photo: currentRecord.photo || '', // Pre-fill photo from current record
      campus_id: currentRecord.campus_id || userCampusId || '',
    });
    setImagePreview(currentRecord.photo || null); // Set image preview
    setIsAddingNewIncident(true);
    setIsEditing(true); // Reuse edit mode UI
  };

  const handleSaveNewIncident = async () => {
    if (!record || !user) return;

    // Validation: expiration_date is only required if NOT a DAEP placement
    const isExpirationRequired = !formData.is_daep;
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.trespassed_from || (isExpirationRequired && !formData.expiration_date)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.' + (formData.is_daep ? '' : ' Warning Expires is required for non-DAEP incidents.'),
        variant: 'destructive',
        duration: 5000
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create new record with same identifying info but new incident details
      const expirationDateISO = convertDateToISO(formData.expiration_date);
      const result = await createTrespassRecord({
        first_name: formData.first_name,
        last_name: formData.last_name,
        school_id: formData.school_id || '',
        expiration_date: expirationDateISO || '', // Required field, use empty string if null
        trespassed_from: formData.trespassed_from,
        aka: formData.aka,
        date_of_birth: convertDateToISO(formData.date_of_birth) ?? undefined,
        affiliation: formData.affiliation,
        current_school: formData.current_school,
        guardian_first_name: formData.guardian_first_name,
        guardian_last_name: formData.guardian_last_name,
        guardian_phone: formData.guardian_phone,
        school_contact: formData.school_contact,
        is_current_student: formData.is_current_student,
        is_daep: formData.is_daep,
        daep_expiration_date: convertDateToISO(formData.daep_expiration_date) ?? undefined,
        notes: formData.notes,
        photo: formData.photo,
        status: 'active',
        campus_id: (formData.campus_id && formData.campus_id !== '__unassigned__' && formData.campus_id !== 'none') ? formData.campus_id : undefined,
      });

      // Copy photos from current incident to new incident
      if (result.data && currentRecord?.id) {
        try {
          const photoCopyResult = await copyPhotosToNewIncident(currentRecord.id, result.data.id);
          console.log(`[handleSaveNewIncident] Copied ${photoCopyResult.count} photos to new incident`);
        } catch (photoCopyError: any) {
          console.error('[handleSaveNewIncident] Failed to copy photos:', photoCopyError);
          // Don't fail the whole operation if photo copy fails
          toast({
            title: 'Warning',
            description: 'Incident created but photos could not be copied. You can upload them manually.',
            variant: 'destructive',
            duration: 5000
          });
        }
      }

      toast({
        title: 'Success',
        description: 'New incident created successfully',
        duration: 3000
      });

      setIsEditing(false);
      setIsAddingNewIncident(false);
      if (onRecordUpdated) onRecordUpdated();

      // Reload the related incidents to show the new one
      if (record.school_id && record.tenant_id) {
        await loadRelatedIncidents(record.school_id, record.tenant_id, record.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create new incident',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!record || !currentRecord) return null;

  const age = currentRecord.date_of_birth
    ? Math.floor((new Date().getTime() - new Date(currentRecord.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-foreground">
            {isEditing ? (
              <span>{isAddingNewIncident ? 'Add New Incident' : 'Edit Trespass Record'}</span>
            ) : (
              <span className="sr-only">Student Details</span>
            )}
            {!isEditing && (
              <button onClick={() => onOpenChange(false)} className="hover:opacity-70 absolute right-4 top-4">
                <X className="w-5 h-5" />
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Incident Switcher - Only show if multiple incidents exist */}
        {relatedIncidents.length > 1 && !isEditing && (
          <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="incident-selector" className="text-sm font-medium">
                  Viewing Incident {currentIncidentIndex + 1} of {relatedIncidents.length}
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncidentChange(currentIncidentIndex - 1)}
                    disabled={currentIncidentIndex === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncidentChange(currentIncidentIndex + 1)}
                    disabled={currentIncidentIndex === relatedIncidents.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Select
                value={currentIncidentIndex.toString()}
                onValueChange={(value) => handleIncidentChange(parseInt(value))}
              >
                <SelectTrigger id="incident-selector" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relatedIncidents.map((incident, index) => (
                    <SelectItem key={incident.id} value={index.toString()}>
                      Incident #{index + 1} - {incident.created_at ? format(new Date(incident.created_at), 'MMM d, yyyy') : 'N/A'}
                      {' • '}
                      {incident.is_daep ? 'DAEP Placement' : 'Trespass Warning'}
                      {' • '}
                      {incident.status === 'active' ? 'Active' : 'Inactive'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Close button for edit mode */}
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 hover:opacity-70"
              aria-label="Close edit mode"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Photo</Label>
              <div
                className={`border-2 border-dashed rounded-full w-40 h-40 mx-auto flex items-center justify-center transition-colors cursor-pointer ${
                  isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !imagePreview && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
                {imagePreview ? (
                  <div className="relative w-full h-full rounded-full overflow-hidden group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setFormData({ ...formData, photo: '' }); }} className="text-white text-sm hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-xs text-muted-foreground mb-1">Drag & drop or click</div>
                    <div className="text-xs text-muted-foreground">JPG, PNG up to 2MB</div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="bg-input border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="bg-input border-border"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aka">AKA (Also Known As)</Label>
                <Input id="aka" value={formData.aka} onChange={(e) => setFormData({ ...formData, aka: e.target.value })} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="affiliation">Affiliations</Label>
                <Input id="affiliation" value={formData.affiliation} onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })} className="bg-input border-border" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="is_current_student" checked={formData.is_current_student} onCheckedChange={(checked) => setFormData({ ...formData, is_current_student: checked as boolean })} />
                <Label htmlFor="is_current_student" className="cursor-pointer font-normal">Current Student</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_daep"
                  checked={formData.is_daep}
                  onCheckedChange={(checked) => {
                    // When DAEP is checked, auto-fill trespassed_from and clear expiration_date
                    if (checked) {
                      setFormData({
                        ...formData,
                        is_daep: true,
                        trespassed_from: 'All District Properties',
                        expiration_date: ''
                      });
                    } else {
                      setFormData({ ...formData, is_daep: false });
                    }
                  }}
                />
                <Label htmlFor="is_daep" className="cursor-pointer font-normal">DAEP</Label>
              </div>
            </div>

            {formData.is_daep && (
              <div className="space-y-2">
                <Label htmlFor="daep_expiration_date">DAEP Expiration Date</Label>
                <Input id="daep_expiration_date" type="date" value={formData.daep_expiration_date} onChange={(e) => setFormData({ ...formData, daep_expiration_date: e.target.value })} className="bg-input border-border" />
                <p className="text-xs text-muted-foreground">Separate from regular trespass expiration</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="bg-input border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_id">School ID</Label>
                <Input
                  id="school_id"
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campus_id">Campus</Label>
                <Select
                  value={formData.campus_id || '__unassigned__'}
                  onValueChange={(value) => setFormData({ ...formData, campus_id: value === '__unassigned__' ? '' : value })}
                  disabled={campusesLoading || userRole === 'campus_admin'}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder={campusesLoading ? "Loading campuses..." : "Select campus (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {userRole === 'campus_admin' && userCampusId ? (
                      // Campus admin: Show only their campus
                      campuses
                        .filter(c => c.id === userCampusId)
                        .map(campus => (
                          <SelectItem key={campus.id} value={campus.id}>
                            {campus.name}
                          </SelectItem>
                        ))
                    ) : (
                      // District/Master admin: Show all active campuses
                      <>
                        <SelectItem value="__unassigned__">No Campus (Unassigned)</SelectItem>
                        {campuses.map(campus => (
                          <SelectItem key={campus.id} value={campus.id}>
                            {campus.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {userRole === 'campus_admin' && (
                  <p className="text-xs text-muted-foreground">
                    Restricted to your campus
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_contact">School Contact</Label>
                <Input id="school_contact" value={formData.school_contact} onChange={(e) => setFormData({ ...formData, school_contact: e.target.value })} className="bg-input border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Guardian Information</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardian_first_name">Guardian First Name</Label>
                <Input id="guardian_first_name" value={formData.guardian_first_name} onChange={(e) => setFormData({ ...formData, guardian_first_name: e.target.value })} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_last_name">Guardian Last Name</Label>
                <Input id="guardian_last_name" value={formData.guardian_last_name} onChange={(e) => setFormData({ ...formData, guardian_last_name: e.target.value })} className="bg-input border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian_phone">Guardian Phone</Label>
              <Input id="guardian_phone" type="tel" value={formData.guardian_phone} onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })} className="bg-input border-border" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trespassed_from">Trespassed From *</Label>
                <Input
                  id="trespassed_from"
                  value={formData.trespassed_from}
                  onChange={(e) => setFormData({ ...formData, trespassed_from: e.target.value })}
                  className="bg-input border-border"
                  required
                  list="trespassed-from-options"
                />
                <datalist id="trespassed-from-options">
                  <option value="All District Properties" />
                  <option value="Home campus after school activities" />
                </datalist>
                <p className="text-xs text-muted-foreground">Select from dropdown or type custom value</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration_date">Warning Expires {!formData.is_daep && '*'}</Label>
                <Input id="expiration_date" type="date" value={formData.expiration_date} onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} className="bg-input border-border" required={!formData.is_daep} />
                {formData.is_daep && <p className="text-xs text-muted-foreground">Optional when DAEP is checked</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-input border-border" rows={3} />
            </div>

            {/* Photos Section - Edit Mode */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Photos</Label>
              {user && (
                <PhotoGallery
                  recordId={currentRecord.id}
                  photos={photos}
                  userId={user.id}
                  isEditing={true}
                  onPhotosChange={setPhotos}
                />
              )}
            </div>

            {/* Documents Section - Edit Mode (Admin Only) */}
            {(userRole === 'district_admin' || userRole === 'master_admin') && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Documents (Admin Only)</Label>
                {user && (
                  <DocumentUpload
                    recordId={currentRecord.id}
                    documents={documents}
                    userId={user.id}
                    userRole={userRole}
                    onDocumentsChange={setDocuments}
                  />
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setIsAddingNewIncident(false);
                }}
                disabled={isSaving}
                className="hover:bg-red-600 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={isAddingNewIncident ? handleSaveNewIncident : handleSave}
                disabled={isSaving}
                className="text-white bg-primary hover:bg-primary/90"
              >
                {isSaving ? 'Saving...' : (isAddingNewIncident ? 'Add Incident' : 'Save Changes')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Data Section */}
            <div>
              <h2 className="text-xl font-bold text-center mb-4">{currentRecord.first_name} {currentRecord.last_name}</h2>
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  {imagePreview || currentRecord.photo ? (
                    <img src={imagePreview || currentRecord.photo || ''} alt={`${currentRecord.first_name} ${currentRecord.last_name}`} className="w-32 h-32 rounded-full object-cover" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-card flex items-center justify-center border-2 border-border">
                      <div className="text-4xl font-bold text-muted-foreground">{currentRecord.first_name.charAt(0)}{currentRecord.last_name.charAt(0)}</div>
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Date of Birth</div>
                    <div className="text-base">{formatDateForDisplay(currentRecord.date_of_birth)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Age</div>
                    <div className="text-base">{age || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Current Student</div>
                    <div className="text-base">{currentRecord.is_current_student ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">DAEP</div>
                    <div className="text-base">{currentRecord.is_daep ? 'Yes' : 'No'}</div>
                  </div>
                  {currentRecord.is_daep && currentRecord.daep_expiration_date && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">DAEP Expires</div>
                      <div className="text-base">{formatDateForDisplay(currentRecord.daep_expiration_date)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Campus</div>
                    <div className="text-base">
                      {currentRecord.campus_id
                        ? campuses.find(c => c.id === currentRecord.campus_id)?.name || currentRecord.campus_id
                        : 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">School Contact</div>
                    <div className="text-base">{currentRecord.school_contact || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Affiliations</div>
                    <div className="text-base">{currentRecord.affiliation || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">School ID</div>
                    <div className="text-base">{currentRecord.school_id || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trespass Section */}
            <div>
              <div className="grid grid-cols-2 gap-x-8 mb-3 pb-2 border-b border-border">
                <h3 className="text-lg font-semibold">Trespass Information</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={`text-white ${currentRecord?.status === 'active' ? 'bg-status-active' : 'bg-status-inactive'}`}>
                    {currentRecord?.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {currentRecord.is_daep ? 'DAEP Expires' : 'Warning Expires'}
                  </div>
                  <div className="text-base">
                    {currentRecord.is_daep
                      ? (currentRecord.daep_expiration_date ? formatDateForDisplay(currentRecord.daep_expiration_date) : 'N/A')
                      : (currentRecord.expiration_date ? formatDateForDisplay(currentRecord.expiration_date) : 'N/A')
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Trespassed From</div>
                  <div className="text-base">{currentRecord.trespassed_from || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Guardian Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-border">Guardian Information</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Guardian Name</div>
                  <div className="text-base capitalize">
                    {[currentRecord.guardian_first_name?.toLowerCase(), currentRecord.guardian_last_name?.toLowerCase()].filter(Boolean).join(' ') || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Guardian Phone</div>
                  <div className="text-base">{currentRecord.guardian_phone || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {currentRecord.notes && (
              <div>
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-border">Notes</h3>
                <div className="text-sm whitespace-pre-wrap bg-secondary/30 p-3 rounded">{currentRecord.notes}</div>
              </div>
            )}

            {/* Photos Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-border">Photos</h3>
              {user && (
                <PhotoGallery
                  recordId={currentRecord.id}
                  photos={photos}
                  userId={user.id}
                  isEditing={false}
                  onPhotosChange={setPhotos}
                />
              )}
            </div>

            {/* Documents Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-border">Documents</h3>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{document.file_name}</p>
                        <p className="text-xs text-muted-foreground">{document.document_type.replace(/_/g, ' ')}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = window.document.createElement('a');
                          link.href = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/record-documents/${document.storage_path}`;
                          link.download = document.file_name;
                          link.click();
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No documents uploaded yet.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              {canEdit ? (
                <div className="space-x-2">
                  <Button onClick={handleAddNewIncident} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Add New Incident
                  </Button>
                  <Button onClick={() => setIsEditing(true)} className="bg-orange-600 hover:bg-orange-700">Edit</Button>
                  <Button onClick={handleDelete} variant="destructive">Delete</Button>
                </div>
              ) : (
                <div></div>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
