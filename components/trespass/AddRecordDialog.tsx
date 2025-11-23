'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createTrespassRecord } from '@/app/actions/upload-records';
import { getCampuses, type Campus } from '@/app/actions/campuses';
import { getUserProfile } from '@/app/actions/users';
import { useUser } from '@clerk/nextjs';
import { Upload } from 'lucide-react';

type AddRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordAdded: () => void;
};

export function AddRecordDialog({ open, onOpenChange, onRecordAdded }: AddRecordDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userCampusId, setUserCampusId] = useState<string | null>(null);
  const [campusesLoading, setCampusesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();

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

  // Fetch campuses and user profile when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      const fetchData = async () => {
        setCampusesLoading(true);
        try {
          // Fetch user profile to get role and campus_id
          const profile = await getUserProfile(user.id);
          if (profile) {
            setUserRole(profile.role);
            setUserCampusId(profile.campus_id);

            // Default campus_id to user's campus if available
            if (profile.campus_id) {
              setFormData(prev => ({ ...prev, campus_id: profile.campus_id }));
            }
          }

          // Fetch all active campuses
          const campusData = await getCampuses();
          // Filter only active campuses
          const activeCampuses = campusData.filter(c => c.status === 'active');
          setCampuses(activeCampuses);
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to load campus data',
            variant: 'destructive',
          });
        } finally {
          setCampusesLoading(false);
        }
      };

      fetchData();
    }
  }, [open, user, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.expiration_date || !formData.trespassed_from) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use server action to create record (handles auth and tenant_id automatically)
      await createTrespassRecord({
        first_name: formData.first_name,
        last_name: formData.last_name,
        school_id: formData.school_id || '',
        expiration_date: formData.expiration_date,
        trespassed_from: formData.trespassed_from,
        aka: formData.aka,
        date_of_birth: formData.date_of_birth,
        affiliation: formData.affiliation,
        current_school: formData.current_school,
        guardian_first_name: formData.guardian_first_name,
        guardian_last_name: formData.guardian_last_name,
        guardian_phone: formData.guardian_phone,
        school_contact: formData.school_contact,
        is_current_student: formData.is_current_student,
        is_daep: formData.is_daep,
        daep_expiration_date: formData.daep_expiration_date || undefined,
        notes: formData.notes,
        photo: formData.photo,
        status: 'active',
        campus_id: formData.campus_id && formData.campus_id !== 'none' ? formData.campus_id : undefined,
      });

      toast({
        title: 'Success',
        description: 'Record added successfully',
      });

      setFormData({
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
        campus_id: userCampusId || '', // Reset to user's campus or empty
      });
      setImagePreview(null);

      onRecordAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add record',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Trespass Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="bg-input border-border" required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="bg-input border-border" required disabled={isLoading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aka">AKA (Also Known As)</Label>
              <Input id="aka" value={formData.aka} onChange={(e) => setFormData({ ...formData, aka: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliation">Affiliations</Label>
              <Input id="affiliation" value={formData.affiliation} onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="is_current_student" checked={formData.is_current_student} onCheckedChange={(checked) => setFormData({ ...formData, is_current_student: checked as boolean })} disabled={isLoading} />
              <Label htmlFor="is_current_student" className="cursor-pointer font-normal">Current Student</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="is_daep" checked={formData.is_daep} onCheckedChange={(checked) => setFormData({ ...formData, is_daep: checked as boolean })} disabled={isLoading} />
              <Label htmlFor="is_daep" className="cursor-pointer font-normal">DAEP</Label>
            </div>
          </div>

          {formData.is_daep && (
            <div className="space-y-2">
              <Label htmlFor="daep_expiration_date">DAEP Expiration Date</Label>
              <Input id="daep_expiration_date" type="date" value={formData.daep_expiration_date} onChange={(e) => setFormData({ ...formData, daep_expiration_date: e.target.value })} className="bg-input border-border" disabled={isLoading} />
              <p className="text-xs text-muted-foreground">Separate from regular trespass expiration</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="campus_id">Campus</Label>
            <Select
              value={formData.campus_id}
              onValueChange={(value) => setFormData({ ...formData, campus_id: value })}
              disabled={isLoading || campusesLoading || userRole === 'campus_admin'}
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
                    <SelectItem value="none">No Campus (Unassigned)</SelectItem>
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
                Records will be assigned to your campus
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="bg-input border-border" required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_id">School ID</Label>
              <Input id="school_id" value={formData.school_id} onChange={(e) => setFormData({ ...formData, school_id: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_school">Current School</Label>
              <Input id="current_school" value={formData.current_school} onChange={(e) => setFormData({ ...formData, current_school: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_contact">School Contact</Label>
              <Input id="school_contact" value={formData.school_contact} onChange={(e) => setFormData({ ...formData, school_contact: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Guardian Information</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guardian_first_name">Guardian First Name</Label>
              <Input id="guardian_first_name" value={formData.guardian_first_name} onChange={(e) => setFormData({ ...formData, guardian_first_name: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian_last_name">Guardian Last Name</Label>
              <Input id="guardian_last_name" value={formData.guardian_last_name} onChange={(e) => setFormData({ ...formData, guardian_last_name: e.target.value })} className="bg-input border-border" disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_phone">Guardian Phone</Label>
            <Input id="guardian_phone" type="tel" value={formData.guardian_phone} onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })} className="bg-input border-border" disabled={isLoading} />
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
                disabled={isLoading}
                list="trespassed-from-options"
              />
              <datalist id="trespassed-from-options">
                <option value="All District Properties" />
                <option value="Home campus after school activities" />
              </datalist>
              <p className="text-xs text-muted-foreground">Select from dropdown or type custom value</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration_date">Warning Expires *</Label>
              <Input id="expiration_date" type="date" value={formData.expiration_date} onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} className="bg-input border-border" required disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-input border-border" rows={3} disabled={isLoading} />
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="hover:bg-red-600 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-status-success text-white hover:bg-status-success/90">{isLoading ? 'Adding...' : 'Add Record'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
