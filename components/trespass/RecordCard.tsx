'use client';

import { useState, useEffect, useRef } from 'react';
import { TrespassRecord } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface RecordCardProps {
  record: TrespassRecord & { incident_count?: number };
  onViewRecord: (record: TrespassRecord) => void;
}

export function RecordCard({ record, onViewRecord }: RecordCardProps) {
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Parse date without timezone conversion to avoid off-by-one day errors
  const parseLocalDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;

    // Extract YYYY-MM-DD from ISO string (handles both "2025-12-02" and "2025-12-02T12:00:00.000Z")
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);

    // Create date in local timezone (no UTC conversion)
    return new Date(year, month - 1, day);
  };

  // Determine which expiration date to display - show the furthest date in the future
  const getDisplayDate = () => {
    const now = new Date();
    const trespassDate = parseLocalDate(record.expiration_date);
    const daepDate = parseLocalDate(record.daep_expiration_date);

    // If both dates exist, show whichever is furthest in the future
    if (trespassDate && daepDate) {
      return trespassDate > daepDate ? trespassDate : daepDate;
    }

    // Otherwise return whichever date exists
    return trespassDate || daepDate;
  };

  const displayDate = getDisplayDate();
  const expirationDate = displayDate ? format(displayDate, 'MMM d, yyyy') : null;
  const isExpired = displayDate ? displayDate < new Date() : false;

  // Handle clicks outside the card/modal to shrink image back
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isImageEnlarged &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsImageEnlarged(false);
      }
    }

    if (isImageEnlarged) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isImageEnlarged]);

  const handleCardClick = (e: React.MouseEvent) => {
    // If image is already enlarged, go to details
    if (isImageEnlarged) {
      onViewRecord(record);
    } else {
      // First click: enlarge the image
      setIsImageEnlarged(true);
      e.stopPropagation();
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImageEnlarged) {
      onViewRecord(record);
    }
  };

  return (
    <>
      {/* Image Preview Modal */}
      {isImageEnlarged && record.photo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-300">
          <div ref={modalRef} className="relative max-w-2xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={record.photo}
              alt={`${record.first_name} ${record.last_name}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg cursor-pointer transition-transform hover:scale-105"
              onClick={handleImageClick}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
              Click image to view details
            </div>
          </div>
        </div>
      )}

      <Card
        ref={cardRef}
        className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-card border-border relative"
        style={{
          boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.19), 0px 12px 12px rgba(0, 0, 0, 0.08)'
        }}
        onClick={handleCardClick}
      >
        <div className="relative aspect-square bg-secondary border-b-2 border-border-muted overflow-hidden">
          {record.photo ? (
            <img
              src={record.photo}
              alt={`${record.first_name} ${record.last_name}`}
              className="w-full h-full object-cover object-[50%_30%] transition-all duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-card">
              <div className="text-center">
                <div className="text-6xl font-bold text-muted-foreground">
                  {record.first_name.charAt(0)}
                  {record.last_name.charAt(0)}
                </div>
              </div>
            </div>
          )}
          <Badge
            className={`absolute top-2 right-2 text-white ${
              record.status === 'active' && !isExpired ? 'bg-status-active' : 'bg-status-inactive'
            }`}
          >
            {isExpired ? 'Inactive' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
          </Badge>
          {record.incident_count && record.incident_count > 1 && (
            <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-xs">
              {record.incident_count} incidents
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-1 bg-card">
          <h3 className="font-semibold text-base text-foreground">
            {record.first_name.charAt(0).toUpperCase() + record.first_name.slice(1).toLowerCase()} {record.last_name.charAt(0).toUpperCase() + record.last_name.slice(1).toLowerCase()}
          </h3>
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            {expirationDate && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Calendar className="w-3 h-3 flex-shrink-0 hidden sm:inline-block" />
                <span className="whitespace-nowrap">{expirationDate}</span>
              </div>
            )}
            {!record.is_current_student && (
              <Badge className="bg-status-former text-white text-xs font-medium flex-shrink-0">
                <span className="hidden sm:inline">Former Student</span>
                <span className="sm:hidden">Former</span>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
