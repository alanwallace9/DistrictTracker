'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import {
  DistrictDAEPSettingsSchema,
  CampusDAEPSettingsSchema,
  TIMEZONES,
  type DistrictDAEPSettings,
  type CampusDAEPSettings,
} from '@/lib/validation/schemas';
import {
  getDistrictDAEPSettings,
  updateDistrictDAEPSettings,
  getDAEPCampuses,
  getCampusDAEPSettings,
  updateCampusDAEPSettings,
  type CampusInfo,
} from '@/app/actions/daep/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Building2, MapPin } from 'lucide-react';

// Timezone display mapping
const TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern (EST/EDT)',
  'America/Chicago': 'Central (CST/CDT)',
  'America/Denver': 'Mountain (MST/MDT)',
  'America/Phoenix': 'Arizona (MST)',
  'America/Los_Angeles': 'Pacific (PST/PDT)',
  'America/Anchorage': 'Alaska (AKST/AKDT)',
  'Pacific/Honolulu': 'Hawaii (HST)',
};

function formatTimezoneDisplay(tz: string): string {
  return TIMEZONE_LABELS[tz] || tz;
}

export default function DAEPSettingsGeneralPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [districtSaving, setDistrictSaving] = useState(false);
  const [campusSaving, setCampusSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [daepCampuses, setDaepCampuses] = useState<CampusInfo[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);

  // District settings form
  const districtForm = useForm<DistrictDAEPSettings>({
    resolver: zodResolver(DistrictDAEPSettingsSchema),
    defaultValues: {
      timezone: 'America/Chicago',
      default_points_per_period: 10,
      attendance_threshold: 85,
      point_threshold_warning: 7,
      school_year: null,
    },
  });

  // Campus settings form
  const campusForm = useForm<CampusDAEPSettings>({
    resolver: zodResolver(CampusDAEPSettingsSchema),
    defaultValues: {
      daep_campus_name: null,
      daep_campus_address: null,
      daep_campus_phone: null,
      max_room_capacity: 15,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedCampusId) {
      loadCampusSettings(selectedCampusId);
    }
  }, [selectedCampusId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load district settings and DAEP campuses in parallel
      const [districtResult, campuses] = await Promise.all([
        getDistrictDAEPSettings(),
        getDAEPCampuses(),
      ]);

      setTenantName(districtResult.tenant_name);
      districtForm.reset(districtResult.settings);
      setDaepCampuses(campuses);

      // Auto-select first DAEP campus if available
      if (campuses.length > 0) {
        setSelectedCampusId(campuses[0].id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCampusSettings = async (campusId: string) => {
    try {
      const result = await getCampusDAEPSettings(campusId);
      campusForm.reset(result.settings);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load campus settings',
        variant: 'destructive',
      });
    }
  };

  const onDistrictSubmit = async (data: DistrictDAEPSettings) => {
    setDistrictSaving(true);
    try {
      await updateDistrictDAEPSettings(data);
      toast({
        title: 'Success',
        description: 'District settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save district settings',
        variant: 'destructive',
      });
    } finally {
      setDistrictSaving(false);
    }
  };

  const onCampusSubmit = async (data: CampusDAEPSettings) => {
    if (!selectedCampusId) return;

    setCampusSaving(true);
    try {
      await updateCampusDAEPSettings(selectedCampusId, data);
      toast({
        title: 'Success',
        description: 'Campus settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save campus settings',
        variant: 'destructive',
      });
    } finally {
      setCampusSaving(false);
    }
  };

  const formatPhoneForDisplay = (phone: string | null | undefined): string => {
    if (!phone) return '';
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    return digits;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">General Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure district and campus-level DAEP settings
        </p>
      </div>

      {/* District Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>District Settings</CardTitle>
              <CardDescription>{tenantName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={districtForm.handleSubmit(onDistrictSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={districtForm.watch('timezone')}
                  onValueChange={(value) =>
                    districtForm.setValue('timezone', value as DistrictDAEPSettings['timezone'])
                  }
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {formatTimezoneDisplay(tz)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {districtForm.formState.errors.timezone && (
                  <p className="text-sm text-destructive">
                    {districtForm.formState.errors.timezone.message}
                  </p>
                )}
              </div>

              {/* School Year */}
              <div className="space-y-2">
                <Label htmlFor="school_year">Current School Year</Label>
                <Input
                  id="school_year"
                  placeholder="2024-2025"
                  {...districtForm.register('school_year')}
                />
                <p className="text-xs text-muted-foreground">Format: YYYY-YYYY (e.g., 2024-2025)</p>
                {districtForm.formState.errors.school_year && (
                  <p className="text-sm text-destructive">
                    {districtForm.formState.errors.school_year.message}
                  </p>
                )}
              </div>

              {/* Default Points Per Period */}
              <div className="space-y-2">
                <Label htmlFor="default_points_per_period">Default Points Per Period</Label>
                <Input
                  id="default_points_per_period"
                  type="number"
                  min={1}
                  max={100}
                  {...districtForm.register('default_points_per_period', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Points awarded per attendance period (1-100)
                </p>
                {districtForm.formState.errors.default_points_per_period && (
                  <p className="text-sm text-destructive">
                    {districtForm.formState.errors.default_points_per_period.message}
                  </p>
                )}
              </div>

              {/* Attendance Threshold */}
              <div className="space-y-2">
                <Label htmlFor="attendance_threshold">Attendance Threshold (%)</Label>
                <Input
                  id="attendance_threshold"
                  type="number"
                  min={0}
                  max={100}
                  {...districtForm.register('attendance_threshold', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum attendance percentage for DAEP completion
                </p>
                {districtForm.formState.errors.attendance_threshold && (
                  <p className="text-sm text-destructive">
                    {districtForm.formState.errors.attendance_threshold.message}
                  </p>
                )}
              </div>

              {/* Point Threshold Warning */}
              <div className="space-y-2">
                <Label htmlFor="point_threshold_warning">Point Threshold Warning</Label>
                <Input
                  id="point_threshold_warning"
                  type="number"
                  min={1}
                  max={100}
                  {...districtForm.register('point_threshold_warning', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Warning triggers when points drop below this threshold
                </p>
                {districtForm.formState.errors.point_threshold_warning && (
                  <p className="text-sm text-destructive">
                    {districtForm.formState.errors.point_threshold_warning.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={districtSaving}>
                {districtSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save District Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Campus Settings */}
      {daepCampuses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>DAEP Campus Settings</CardTitle>
                <CardDescription>Configure DAEP campus contact information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Campus selector if multiple DAEP campuses */}
            {daepCampuses.length > 1 && (
              <div className="mb-4 space-y-2">
                <Label>Select Campus</Label>
                <Select
                  value={selectedCampusId || ''}
                  onValueChange={(value) => setSelectedCampusId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a DAEP campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {daepCampuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name} ({campus.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <form onSubmit={campusForm.handleSubmit(onCampusSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DAEP Campus Name */}
                <div className="space-y-2">
                  <Label htmlFor="daep_campus_name">DAEP Campus Name</Label>
                  <Input
                    id="daep_campus_name"
                    placeholder="Alternative Learning Center"
                    {...campusForm.register('daep_campus_name')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name for the DAEP facility
                  </p>
                  {campusForm.formState.errors.daep_campus_name && (
                    <p className="text-sm text-destructive">
                      {campusForm.formState.errors.daep_campus_name.message}
                    </p>
                  )}
                </div>

                {/* Max Room Capacity */}
                <div className="space-y-2">
                  <Label htmlFor="max_room_capacity">Default Room Capacity</Label>
                  <Input
                    id="max_room_capacity"
                    type="number"
                    min={1}
                    max={100}
                    {...campusForm.register('max_room_capacity', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default maximum students per room
                  </p>
                  {campusForm.formState.errors.max_room_capacity && (
                    <p className="text-sm text-destructive">
                      {campusForm.formState.errors.max_room_capacity.message}
                    </p>
                  )}
                </div>

                {/* DAEP Campus Address */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="daep_campus_address">Address</Label>
                  <Input
                    id="daep_campus_address"
                    placeholder="123 Education Blvd, City, TX 75001"
                    {...campusForm.register('daep_campus_address')}
                  />
                  {campusForm.formState.errors.daep_campus_address && (
                    <p className="text-sm text-destructive">
                      {campusForm.formState.errors.daep_campus_address.message}
                    </p>
                  )}
                </div>

                {/* DAEP Campus Phone */}
                <div className="space-y-2">
                  <Label htmlFor="daep_campus_phone">Phone Number</Label>
                  <Input
                    id="daep_campus_phone"
                    placeholder="5551234567"
                    maxLength={10}
                    {...campusForm.register('daep_campus_phone')}
                  />
                  <p className="text-xs text-muted-foreground">10 digits, no dashes or spaces</p>
                  {campusForm.formState.errors.daep_campus_phone && (
                    <p className="text-sm text-destructive">
                      {campusForm.formState.errors.daep_campus_phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={campusSaving || !selectedCampusId}>
                  {campusSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Campus Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* No DAEP campuses message */}
      {daepCampuses.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              No DAEP campuses configured. Go to <strong>Admin → Campuses</strong> and edit a campus to mark it as a DAEP facility.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
