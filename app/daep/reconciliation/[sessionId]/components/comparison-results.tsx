'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import type { ComparisonResult } from '@/lib/validation/schemas';

interface ComparisonResultsProps {
  result: ComparisonResult;
  onReview: () => void;
}

export function ComparisonResults({ result, onReview }: ComparisonResultsProps) {
  const { stats } = result;
  const totalDiscrepancies = stats.fieldConflicts + stats.newInSis + stats.missingFromSis;
  const allMatched = totalDiscrepancies === 0;

  return (
    <div className="space-y-6">
      {/* Success celebration if all matched */}
      {allMatched && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <PartyPopper className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">All Synced!</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            All {stats.matched} records match perfectly between SIS and DAEP. Nothing to review!
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Matched */}
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
            <p className="text-xs text-muted-foreground">No action needed</p>
          </CardContent>
        </Card>

        {/* Field Conflicts */}
        <Card className={stats.fieldConflicts > 0 ? 'border-yellow-200 dark:border-yellow-900' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${stats.fieldConflicts > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.fieldConflicts > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
              {stats.fieldConflicts}
            </div>
            <p className="text-xs text-muted-foreground">Fields differ</p>
          </CardContent>
        </Card>

        {/* New in SIS */}
        <Card className={stats.newInSis > 0 ? 'border-blue-200 dark:border-blue-900' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PlusCircle className={`h-4 w-4 ${stats.newInSis > 0 ? 'text-blue-600' : 'text-muted-foreground'}`} />
              New in SIS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.newInSis > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
              {stats.newInSis}
            </div>
            <p className="text-xs text-muted-foreground">Not in DAEP yet</p>
          </CardContent>
        </Card>

        {/* Missing from SIS */}
        <Card className={stats.missingFromSis > 0 ? 'border-red-200 dark:border-red-900' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MinusCircle className={`h-4 w-4 ${stats.missingFromSis > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              Missing from SIS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.missingFromSis > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {stats.missingFromSis}
            </div>
            <p className="text-xs text-muted-foreground">Not in upload</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            Compared <strong>{stats.totalSisRecords}</strong> SIS records against{' '}
            <strong>{stats.totalDaepRecords}</strong> DAEP placements.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {stats.matched > 0 && (
              <li>
                <span className="text-green-600 font-medium">{stats.matched} records</span> match perfectly - no action needed
              </li>
            )}
            {stats.fieldConflicts > 0 && (
              <li>
                <span className="text-yellow-600 font-medium">{stats.fieldConflicts} records</span> have field differences requiring review
              </li>
            )}
            {stats.newInSis > 0 && (
              <li>
                <span className="text-blue-600 font-medium">{stats.newInSis} records</span> are new in SIS (not yet in DAEP)
              </li>
            )}
            {stats.missingFromSis > 0 && (
              <li>
                <span className="text-red-600 font-medium">{stats.missingFromSis} placements</span> not found in SIS upload
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!allMatched && (
        <div className="flex justify-end gap-2">
          <Button onClick={onReview}>
            Review Discrepancies
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Errors if any */}
      {result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Comparison Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {result.errors.slice(0, 5).map((error, i) => (
                <li key={i} className="text-sm">{error}</li>
              ))}
              {result.errors.length > 5 && (
                <li className="text-sm">...and {result.errors.length - 5} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
