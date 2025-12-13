'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import type { ParseResult } from '@/lib/validation/schemas';

interface ParseResultsProps {
  result: ParseResult;
  onContinue?: () => void;
}

export function ParseResults({ result, onContinue }: ParseResultsProps) {
  const [errorsExpanded, setErrorsExpanded] = useState(true);
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  const canContinue = result.success && result.stats.parsedRows > 0;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{result.stats.totalRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Parsed Successfully</p>
                <p className="text-2xl font-bold text-green-600">{result.stats.parsedRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{result.stats.errorRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{result.warnings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success/Failure Banner */}
      {result.success ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Parsing Complete</AlertTitle>
          <AlertDescription className="text-green-700">
            Successfully parsed {result.stats.parsedRows} records from your CSV file.
            {result.errors.length > 0 &&
              ` ${result.errors.length} row(s) had errors and were skipped.`}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Parsing Failed</AlertTitle>
          <AlertDescription>
            No records could be parsed from your CSV file. Please check the errors below and fix
            your source data.
          </AlertDescription>
        </Alert>
      )}

      {/* Errors List */}
      {result.errors.length > 0 && (
        <Collapsible open={errorsExpanded} onOpenChange={setErrorsExpanded}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    Parsing Errors ({result.errors.length})
                  </CardTitle>
                  {errorsExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.errors.slice(0, 50).map((error, i) => (
                    <div
                      key={i}
                      className="p-3 bg-red-50 border border-red-200 rounded-md text-sm"
                    >
                      <div className="font-medium text-red-800">
                        Row {error.row}
                        {error.studentName && ` - ${error.studentName}`}
                        {error.studentId && (
                          <span className="text-red-600 font-normal"> (ID: {error.studentId})</span>
                        )}
                      </div>
                      <div className="text-red-700 mt-1">
                        <span className="font-medium">{error.field}:</span> {error.message}
                        {error.value && (
                          <span className="text-red-500 text-xs ml-2">
                            (value: &quot;{error.value}&quot;)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {result.errors.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ...and {result.errors.length - 50} more errors
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Warnings List */}
      {result.warnings.length > 0 && (
        <Collapsible open={warningsExpanded} onOpenChange={setWarningsExpanded}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    Warnings ({result.warnings.length})
                  </CardTitle>
                  {warningsExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.warnings.slice(0, 20).map((warning, i) => (
                    <div
                      key={i}
                      className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                    >
                      <span className="font-medium text-yellow-800">Row {warning.row}</span>
                      {warning.studentName && (
                        <span className="text-yellow-700"> ({warning.studentName})</span>
                      )}
                      <span className="text-yellow-700">: {warning.message}</span>
                    </div>
                  ))}
                  {result.warnings.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ...and {result.warnings.length - 20} more warnings
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Action Buttons */}
      {onContinue && (
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" asChild>
            <a href="/daep/reconciliation">Back to Sessions</a>
          </Button>
          <Button onClick={onContinue} disabled={!canContinue}>
            Continue to Comparison
          </Button>
        </div>
      )}
    </div>
  );
}
