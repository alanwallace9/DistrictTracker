'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { REQUIRED_CSV_FIELDS, OPTIONAL_CSV_FIELDS } from '@/lib/validation/schemas';

export function FieldRequirementsSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">CSV Field Requirements</h2>
          <span className="text-sm text-muted-foreground">
            ({REQUIRED_CSV_FIELDS.length} required, {OPTIONAL_CSV_FIELDS.length} optional)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border p-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Required Fields */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[rgb(var(--daep-success))]" />
                Required Fields
              </h3>
              <ul className="space-y-2">
                {REQUIRED_CSV_FIELDS.map((field) => (
                  <li key={field.key} className="flex items-center justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-2 text-sm cursor-help">
                            <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                              {field.key}
                            </code>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">{field.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.description}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="font-medium">Example:</span> {field.example}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Optional Fields */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="h-4 w-4 flex items-center justify-center rounded-full border border-muted-foreground text-[10px] text-muted-foreground">
                  ?
                </span>
                Optional Fields
              </h3>
              <ul className="space-y-2">
                {OPTIONAL_CSV_FIELDS.map((field) => (
                  <li key={field.key} className="flex items-center justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-2 text-sm cursor-help">
                            <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-muted-foreground">
                              {field.key}
                            </code>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">{field.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.description}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="font-medium">Example:</span> {field.example}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>
              <strong>Tip:</strong> Your CSV should have a header row with column names. Column names
              don't need to match exactly - you'll map them to the required fields during the next
              step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
