'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleAlert as AlertCircle, CheckCircle } from 'lucide-react';

type FieldMappingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvHeaders: string[];
  onMappingConfirmed: (mapping: Record<string, string>) => void;
};

// All database fields that can be mapped
const DATABASE_FIELDS = [
  // Required fields
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: true },
  { value: 'school_id', label: 'School ID', required: true },
  { value: 'expiration_date', label: 'Expiration Date', required: true },
  { value: 'trespassed_from', label: 'Trespassed From', required: true },
  // Optional fields
  { value: 'aka', label: 'Also Known As (AKA)', required: false },
  { value: 'date_of_birth', label: 'Date of Birth', required: false },
  { value: 'incident_date', label: 'Incident Date', required: false },
  { value: 'incident_location', label: 'Incident Location', required: false },
  { value: 'description', label: 'Description', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: 'is_current_student', label: 'Former Student', required: false },
  { value: 'affiliation', label: 'Known Associates / Affiliation', required: false },
  { value: 'current_school', label: 'Current School', required: false },
  { value: 'guardian_first_name', label: 'Guardian First Name', required: false },
  { value: 'guardian_last_name', label: 'Guardian Last Name', required: false },
  { value: 'guardian_phone', label: 'Guardian Phone', required: false },
  { value: 'school_contact', label: 'School Contact', required: false },
  { value: 'notes', label: 'Notes', required: false },
  { value: 'photo', label: 'Photo', required: false },
];

// Simple fuzzy matching using Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 1;

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

// Auto-map CSV headers to database fields using fuzzy matching
function autoMapHeaders(csvHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedDbFields = new Set<string>();

  for (const csvHeader of csvHeaders) {
    let bestMatch: { field: string; score: number } | null = null;

    for (const dbField of DATABASE_FIELDS) {
      // Skip if this database field is already mapped
      if (usedDbFields.has(dbField.value)) continue;

      // Calculate similarity between CSV header and database field
      const labelScore = calculateSimilarity(csvHeader, dbField.label);
      const valueScore = calculateSimilarity(csvHeader, dbField.value);
      const score = Math.max(labelScore, valueScore);

      // Keep track of best match
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { field: dbField.value, score };
      }
    }

    // Auto-map if similarity is above 70%
    if (bestMatch && bestMatch.score >= 0.7) {
      mapping[csvHeader] = bestMatch.field;
      usedDbFields.add(bestMatch.field);
    } else {
      // Default to skip for non-matched fields
      mapping[csvHeader] = 'skip';
    }
  }

  return mapping;
}

export function FieldMappingDialog({
  open,
  onOpenChange,
  csvHeaders,
  onMappingConfirmed,
}: FieldMappingDialogProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);

  useEffect(() => {
    if (open && csvHeaders.length > 0) {
      // Auto-map headers when dialog opens
      const autoMapping = autoMapHeaders(csvHeaders);
      setMapping(autoMapping);
    }
  }, [open, csvHeaders]);

  useEffect(() => {
    // Check for missing required fields
    const mappedDbFields = new Set(Object.values(mapping).filter(v => v !== 'skip'));
    const requiredFields = DATABASE_FIELDS.filter(f => f.required);
    const missing = requiredFields
      .filter(f => !mappedDbFields.has(f.value))
      .map(f => f.label);

    setMissingRequired(missing);
  }, [mapping]);

  const handleMappingChange = (csvHeader: string, dbField: string) => {
    setMapping(prev => ({
      ...prev,
      [csvHeader]: dbField,
    }));
  };

  const handleConfirm = () => {
    if (missingRequired.length === 0) {
      onMappingConfirmed(mapping);
      onOpenChange(false);
    }
  };

  const getAvailableFields = (currentCsvHeader: string) => {
    // Get fields that are already mapped (excluding current header and 'skip')
    const mappedFields = new Set(
      Object.entries(mapping)
        .filter(([header, field]) => header !== currentCsvHeader && field !== 'skip')
        .map(([, field]) => field)
    );

    // Return fields that aren't mapped yet
    return DATABASE_FIELDS.filter(field => !mappedFields.has(field.value));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Map CSV Columns to Database Fields</DialogTitle>
          <DialogDescription className="text-base pt-1">
            Match your CSV column headers to the corresponding database fields. Required fields must be mapped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Mapping Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-6 px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="font-semibold text-sm text-slate-700">CSV Column</div>
              <div className="w-8"></div>
              <div className="font-semibold text-sm text-slate-700">Database Field</div>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {csvHeaders.map((csvHeader, index) => {
                const availableFields = getAvailableFields(csvHeader);
                const currentMapping = mapping[csvHeader];
                const mappedField = DATABASE_FIELDS.find(f => f.value === currentMapping);
                const isRequired = mappedField?.required;

                return (
                  <div key={index} className="grid grid-cols-[1fr,auto,1fr] gap-6 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                    <div className="font-medium text-sm text-slate-900">{csvHeader}</div>
                    <div className="text-blue-400 font-medium">→</div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={mapping[csvHeader] || 'skip'}
                        onValueChange={(value) => handleMappingChange(csvHeader, value)}
                      >
                        <SelectTrigger className="bg-white border-slate-200 hover:border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip" className="text-slate-500 italic">-- Skip this column --</SelectItem>
                          {availableFields.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                            </SelectItem>
                          ))}
                          {/* Show currently mapped field even if it's used */}
                          {currentMapping && currentMapping !== 'skip' && !availableFields.find(f => f.value === currentMapping) && mappedField && (
                            <SelectItem value={currentMapping}>
                              {mappedField.label} {mappedField.required && <span className="text-red-500 ml-1">*</span>}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {isRequired && (
                        <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-md">Required</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Required Fields Alert */}
          {missingRequired.length > 0 ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Missing Required Fields:</strong> {missingRequired.join(', ')}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 font-medium">
                All required fields are mapped!
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={missingRequired.length > 0} className="shadow-sm">
              Confirm Mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
