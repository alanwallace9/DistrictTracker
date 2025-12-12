'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import type { FieldMappingInput } from '@/app/actions/daep/reconciliation';
import type { FieldMappingRecord, SISName } from '@/lib/validation/schemas';
import { SIS_NAMES, REQUIRED_DAEP_FIELDS } from '@/lib/validation/schemas';

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

interface FieldDefinition {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

const DAEP_FIELDS: FieldDefinition[] = [
  // Required fields
  { key: 'student_id', label: 'Student ID', description: 'Unique student identifier', required: true },
  { key: 'first_name', label: 'First Name', description: 'Student first name', required: true },
  { key: 'last_name', label: 'Last Name', description: 'Student last name', required: true },
  { key: 'incident_number', label: 'Incident Number', description: 'Unique incident ID from SIS', required: true },
  { key: 'start_date', label: 'Start Date', description: 'Placement start date', required: true },
  { key: 'days_assigned', label: 'Days Assigned', description: 'Number of DAEP days', required: true },
  { key: 'offense_code', label: 'Offense Code', description: 'PEIMS discipline code', required: true },
  { key: 'home_campus', label: 'Home Campus', description: 'Student home campus', required: true },
  // Optional fields
  { key: 'parent_email', label: 'Parent Email', description: 'Guardian email address', required: false },
  { key: 'guardian_phone', label: 'Guardian Phone', description: 'Guardian phone number', required: false },
  { key: 'grade_level', label: 'Grade Level', description: 'Student grade (1-12)', required: false },
  { key: 'assigning_campus', label: 'Assigning Campus', description: 'Campus that assigned placement', required: false },
  { key: 'placement_reason', label: 'Placement Reason', description: 'Reason for placement', required: false },
  { key: 'mandatory_placement', label: 'Mandatory Placement', description: 'Is placement mandatory?', required: false },
];

// ============================================================================
// AUTO-SUGGEST PATTERNS
// ============================================================================

const FIELD_PATTERNS: Record<string, string[]> = {
  student_id: ['studentid', 'student_id', 'studentnumber', 'student_number', 'id', 'pupilid', 'stuid', 'studentno'],
  first_name: ['firstname', 'first_name', 'fname', 'first', 'givenname', 'given'],
  last_name: ['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname', 'family'],
  incident_number: ['incidentid', 'incident_id', 'incidentnumber', 'incident_number', 'incident', 'incnum', 'incidentno'],
  start_date: ['startdate', 'start_date', 'placementstart', 'placement_start', 'begindate', 'startdt', 'begin'],
  days_assigned: ['daysassigned', 'days_assigned', 'days', 'numdays', 'assigneddays', 'dayscnt', 'daycount'],
  offense_code: ['offensecode', 'offense_code', 'offense', 'disciplinecode', 'peimscode', 'code', 'violationcode'],
  home_campus: ['homecampus', 'home_campus', 'campus', 'school', 'homeschool', 'campusname', 'schoolname'],
  parent_email: ['parentemail', 'parent_email', 'guardianemail', 'email', 'contactemail'],
  guardian_phone: ['guardianphone', 'phone', 'parentphone', 'homephone', 'contactphone', 'phonenumber'],
  grade_level: ['gradelevel', 'grade_level', 'grade', 'gradelvl', 'yearlevel'],
  assigning_campus: ['assigningcampus', 'assigning_campus', 'fromcampus', 'origincampus', 'referringcampus'],
  placement_reason: ['placementreason', 'reason', 'placementnotes', 'notes'],
  mandatory_placement: ['mandatory', 'mandatoryplacement', 'ismandatory', 'required'],
};

function autoSuggestMappings(csvHeaders: string[]): Record<string, string> {
  const suggestions: Record<string, string> = {};

  for (const [daepField, patterns] of Object.entries(FIELD_PATTERNS)) {
    const match = csvHeaders.find((header) => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some((p) => normalized.includes(p) || p.includes(normalized));
    });
    if (match) {
      suggestions[daepField] = match;
    }
  }

  return suggestions;
}

// ============================================================================
// PROPS
// ============================================================================

interface FieldMappingFormProps {
  existingMapping: FieldMappingRecord | null;
  csvHeaders: string[];
  sampleData: Record<string, string>[];
  detectedSIS: SISName | null;
  onSave: (data: FieldMappingInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FieldMappingForm({
  existingMapping,
  csvHeaders,
  sampleData,
  detectedSIS,
  onSave,
  onCancel,
  saving,
}: FieldMappingFormProps) {
  // Initialize with existing mapping OR auto-suggested values
  const autoSuggested = useMemo(() => autoSuggestMappings(csvHeaders), [csvHeaders]);

  const [sisName, setSisName] = useState<SISName>(
    existingMapping?.sis_name || detectedSIS || 'Skyward'
  );
  const [sisNameOther, setSisNameOther] = useState<string>(existingMapping?.sis_name_other || '');
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const existing = existingMapping?.field_mappings as Record<string, string> | undefined;
    if (existing && Object.keys(existing).length > 0) {
      return existing;
    }
    return autoSuggested;
  });

  // Track which fields were auto-suggested vs manually set
  const [suggestedFields, setSuggestedFields] = useState<Set<string>>(() => {
    if (existingMapping?.field_mappings) {
      return new Set(); // Existing mapping = no suggestions shown
    }
    return new Set(Object.keys(autoSuggested));
  });

  // Validation state
  const [errors, setErrors] = useState<string[]>([]);

  const handleMappingChange = (daepField: string, csvColumn: string) => {
    setMappings((prev) => ({
      ...prev,
      [daepField]: csvColumn,
    }));
    // Remove from suggested once user interacts
    setSuggestedFields((prev) => {
      const next = new Set(prev);
      next.delete(daepField);
      return next;
    });
    // Clear errors on change
    setErrors([]);
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missing = REQUIRED_DAEP_FIELDS.filter((f) => !mappings[f]);
    if (missing.length > 0) {
      setErrors(missing.map((f) => `${DAEP_FIELDS.find((d) => d.key === f)?.label || f} is required`));
      return;
    }

    // Validate SIS Other
    if (sisName === 'Other' && !sisNameOther.trim()) {
      setErrors(['Please enter your SIS name']);
      return;
    }

    await onSave({
      sisName,
      sisNameOther: sisName === 'Other' ? sisNameOther : null,
      mappings,
      sampleHeaders: csvHeaders,
    });
  };

  // Get sample values for a CSV column
  const getSampleValues = (csvColumn: string): string[] => {
    if (!csvColumn || csvColumn === '__none__') return [];
    return sampleData
      .map((row) => row[csvColumn])
      .filter((v) => v !== undefined && v !== '')
      .slice(0, 3);
  };

  const requiredFields = DAEP_FIELDS.filter((f) => f.required);
  const optionalFields = DAEP_FIELDS.filter((f) => !f.required);

  // Count mapped required fields
  const mappedRequiredCount = requiredFields.filter((f) => mappings[f.key]).length;
  const allRequiredMapped = mappedRequiredCount === requiredFields.length;

  return (
    <div className="space-y-6">
      {/* SIS Provider Selection */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <Label className="text-sm font-medium">Student Information System</Label>
        <div className="flex flex-wrap gap-3 mt-2">
          <Select value={sisName} onValueChange={(v) => setSisName(v as SISName)}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Select SIS" />
            </SelectTrigger>
            <SelectContent>
              {SIS_NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {sisName === 'Other' && (
            <Input
              placeholder="Enter SIS name..."
              value={sisNameOther}
              onChange={(e) => setSisNameOther(e.target.value)}
              className="w-[200px] bg-white"
            />
          )}

          {detectedSIS && detectedSIS === sisName && (
            <Badge variant="outline" className="bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Auto-detected
            </Badge>
          )}
        </div>
      </div>

      {/* Error display */}
      {errors.length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Please fix the following:</p>
              <ul className="list-disc list-inside mt-1 text-destructive/90">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Required Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Required Fields</h3>
            <Badge variant={allRequiredMapped ? 'default' : 'destructive'} className="text-xs">
              {mappedRequiredCount}/{requiredFields.length} mapped
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">Must map all fields</span>
        </div>

        <div className="grid gap-3">
          {requiredFields.map((field) => (
            <FieldMappingRow
              key={field.key}
              field={field}
              csvHeaders={csvHeaders}
              selectedValue={mappings[field.key] || ''}
              sampleValues={getSampleValues(mappings[field.key])}
              isSuggested={suggestedFields.has(field.key)}
              onChange={(value) => handleMappingChange(field.key, value)}
            />
          ))}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Optional Fields</h3>
          <span className="text-xs text-muted-foreground">Map if available in your CSV</span>
        </div>

        <div className="grid gap-3">
          {optionalFields.map((field) => (
            <FieldMappingRow
              key={field.key}
              field={field}
              csvHeaders={csvHeaders}
              selectedValue={mappings[field.key] || ''}
              sampleValues={getSampleValues(mappings[field.key])}
              isSuggested={suggestedFields.has(field.key)}
              onChange={(value) => handleMappingChange(field.key, value)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !allRequiredMapped}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Mapping
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// FIELD MAPPING ROW
// ============================================================================

interface FieldMappingRowProps {
  field: FieldDefinition;
  csvHeaders: string[];
  selectedValue: string;
  sampleValues: string[];
  isSuggested: boolean;
  onChange: (value: string) => void;
}

function FieldMappingRow({
  field,
  csvHeaders,
  selectedValue,
  sampleValues,
  isSuggested,
  onChange,
}: FieldMappingRowProps) {
  const isMapped = selectedValue && selectedValue !== '__none__';

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        isMapped
          ? 'bg-[rgb(var(--daep-success))]/5 border-[rgb(var(--daep-success))]/20'
          : field.required
            ? 'bg-muted/30 border-border'
            : 'bg-white border-border'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* DAEP Field Label */}
        <div className="w-40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* CSV Column Dropdown */}
        <div className="flex-1 max-w-xs">
          <Select value={selectedValue || '__none__'} onValueChange={onChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select column..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">-- Not mapped --</span>
              </SelectItem>
              {csvHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Suggested Badge */}
        {isSuggested && isMapped && (
          <Badge variant="outline" className="bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20 shrink-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Suggested
          </Badge>
        )}

        {/* Mapped indicator */}
        {isMapped && !isSuggested && (
          <CheckCircle2 className="w-5 h-5 text-[rgb(var(--daep-success))] shrink-0" />
        )}
      </div>

      {/* Sample Data Preview */}
      {sampleValues.length > 0 && (
        <div className="mt-2 ml-44 text-xs text-muted-foreground">
          Sample: {sampleValues.map((v, i) => (
            <span key={i}>
              <span className="font-mono bg-muted px-1 py-0.5 rounded">{v}</span>
              {i < sampleValues.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
