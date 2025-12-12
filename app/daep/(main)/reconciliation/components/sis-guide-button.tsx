'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SISGuideModal } from './sis-guide-modal';

interface SISGuideButtonProps {
  sisName: string;
  title: string;
}

export function SISGuideButton({ sisName, title }: SISGuideButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <HelpCircle className="h-4 w-4 mr-2" />
        {title}
      </Button>
      <SISGuideModal sisName={sisName} open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
