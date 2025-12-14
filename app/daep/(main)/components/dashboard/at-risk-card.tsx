'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { AtRiskSummary } from '@/app/actions/daep/dashboard';

interface AtRiskCardProps {
  summary: AtRiskSummary;
}

export function AtRiskCard({ summary }: AtRiskCardProps) {
  const hasAtRisk = summary.belowAttendanceThreshold > 0 || summary.decliningPoints > 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Students At Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAtRisk ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No students at risk</p>
            <p className="text-xs mt-1">All students meeting attendance thresholds</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.belowAttendanceThreshold > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="p-2 rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-red-900">
                    {summary.belowAttendanceThreshold} below 85% attendance
                  </p>
                  <p className="text-xs text-red-700">
                    Intervention may be needed
                  </p>
                </div>
              </div>
            )}

            {summary.decliningPoints > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="p-2 rounded-full bg-orange-100">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-orange-900">
                    {summary.decliningPoints} with declining points
                  </p>
                  <p className="text-xs text-orange-700">
                    5-day average trending down
                  </p>
                </div>
              </div>
            )}

            <Link href="/daep/students?filter=at-risk" className="block">
              <Button variant="outline" size="sm" className="w-full gap-2">
                View Students
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
