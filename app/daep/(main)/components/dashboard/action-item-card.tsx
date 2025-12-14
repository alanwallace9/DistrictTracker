'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  FileText,
  Users,
  CheckCircle,
  ArrowRightLeft,
} from 'lucide-react';
import type { ActionItem } from '@/app/actions/daep/dashboard';
import { itemVariants } from '@/lib/constants/animations';

const iconMap: Record<string, typeof AlertTriangle> = {
  'no-show': AlertTriangle,
  'attendance-missing': Clock,
  'approval-pending': FileText,
  'reconciliation': FileText,
  'review-ready': Users,
  'transition-pending': ArrowRightLeft,
};

const priorityColors = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-orange-100 text-orange-800 border-orange-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

interface ActionItemCardProps {
  item: ActionItem;
  onComplete: (id: string) => void;
}

export function ActionItemCard({ item, onComplete }: ActionItemCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = iconMap[item.type] || FileText;

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => onComplete(item.id), 400);
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate={isExiting ? 'exit' : 'animate'}
      exit="exit"
      layout
    >
      <Link href={item.href}>
        <div
          className={cn(
            'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer',
            priorityColors[item.priority]
          )}
        >
          <div
            className={cn(
              'p-2 rounded-full',
              item.priority === 'urgent' && 'bg-red-200',
              item.priority === 'warning' && 'bg-orange-200',
              item.priority === 'info' && 'bg-blue-200'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{item.title}</p>
              {item.count && item.count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {item.count}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {item.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {item.actionLabel}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleComplete}
              title="Mark as done"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
