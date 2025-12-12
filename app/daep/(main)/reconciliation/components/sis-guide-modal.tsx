'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ExternalLink, ChevronRight, ImageIcon } from 'lucide-react';
import { getSISGuide, generateGuidePDF } from '@/app/actions/daep/reconciliation';
import type { SISGuide, SISGuideStep } from '@/lib/validation/schemas';
import { cn } from '@/lib/utils';

interface SISGuideModalProps {
  sisName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SISGuideModal({ sisName, open, onOpenChange }: SISGuideModalProps) {
  const [guide, setGuide] = useState<SISGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (open && sisName) {
      loadGuide();
    }
  }, [open, sisName]);

  const loadGuide = async () => {
    setLoading(true);
    try {
      const data = await getSISGuide(sisName);
      setGuide(data);
      setActiveStep(0);
    } catch (error) {
      console.error('[SISGuideModal] Error loading guide:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const result = await generateGuidePDF(sisName);
      if (result.success && result.pdfUrl) {
        // Open the HTML content in a new tab for printing
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          // Decode base64 HTML
          const htmlContent = atob(result.pdfUrl.split(',')[1]);
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        }
      }
    } catch (error) {
      console.error('[SISGuideModal] Error generating PDF:', error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const sortedSteps = guide?.steps?.slice().sort((a, b) => a.order - b.order) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{guide?.title || `${sisName} Export Guide`}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || loading || !guide}
            >
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Print / Save PDF
            </Button>
          </DialogTitle>
          <DialogDescription>
            {guide?.overview || 'Follow these steps to export placement data from your SIS.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !guide ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>Guide not available for {sisName}</p>
            <p className="text-sm mt-1">Please contact support for assistance.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 min-h-0">
            {/* Step Navigation */}
            <div className="md:w-48 shrink-0 space-y-1 overflow-y-auto md:border-r md:border-border md:pr-4">
              {sortedSteps.map((step, index) => (
                <button
                  key={step.order}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2',
                    activeStep === index
                      ? 'bg-[rgb(var(--daep-primary))] text-white'
                      : 'hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                      activeStep === index
                        ? 'bg-white/20 text-white'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    )}
                  >
                    {step.order}
                  </span>
                  <span className="truncate">{step.title}</span>
                </button>
              ))}
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto">
              {sortedSteps[activeStep] && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--daep-primary))] text-white flex items-center justify-center font-semibold">
                      {sortedSteps[activeStep].order}
                    </span>
                    <h3 className="text-lg font-semibold">{sortedSteps[activeStep].title}</h3>
                  </div>

                  <div className="prose prose-sm max-w-none text-foreground">
                    {sortedSteps[activeStep].content.split('\n').map((line, i) => (
                      <p key={i} className="mb-2">
                        {line}
                      </p>
                    ))}
                  </div>

                  {/* Screenshot Placeholder */}
                  {sortedSteps[activeStep].screenshot_placeholder && (
                    <div className="bg-muted rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[200px] border-2 border-dashed border-border">
                      <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground italic">
                        {sortedSteps[activeStep].screenshot_placeholder}
                      </p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep((prev) => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={activeStep === sortedSteps.length - 1}
                      onClick={() => setActiveStep((prev) => prev + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
