'use client';

import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  FileText,
  Users,
  CheckCircle2,
  ArrowRightLeft,
  ClipboardList,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  staggerContainer,
  listItemEntrance,
} from './enhanced-animations';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Types
interface ActionItem {
  id: string;
  type: string;
  priority: 'urgent' | 'warning' | 'info';
  title: string;
  subtitle: string;
  count?: number;
  href: string;
  actionLabel: string;
  completedAt: string | null;
}

const iconMap: Record<string, typeof AlertTriangle> = {
  'no-show': AlertTriangle,
  'attendance-missing': Clock,
  'approval-pending': FileText,
  'reconciliation': FileText,
  'review-ready': Users,
  'transition-pending': ArrowRightLeft,
};

const priorityStyles = {
  urgent: {
    bg: 'bg-gradient-to-r from-red-50 to-rose-50',
    border: 'border-red-200/60',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
    border: 'border-amber-200/60',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-50 to-sky-50',
    border: 'border-blue-200/60',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
};

// Enhanced Action Item Card
interface ActionItemCardProps {
  item: ActionItem;
  onComplete: (id: string) => void;
  doneTrayRef: React.RefObject<HTMLDivElement | null>;
}

function EnhancedActionItemCard({ item, onComplete, doneTrayRef }: ActionItemCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const targetPositionRef = useRef({ x: 150, y: -100 });
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = iconMap[item.type] || FileText;
  const styles = priorityStyles[item.priority];

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position to animate toward Done tray
    if (cardRef.current && doneTrayRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const trayRect = doneTrayRef.current.getBoundingClientRect();

      targetPositionRef.current = {
        x: (trayRect.left + trayRect.width / 2) - (cardRect.left + cardRect.width / 2),
        y: (trayRect.top + trayRect.height / 2) - (cardRect.top + cardRect.height / 2),
      };
    }

    // Start animation and remove after it completes
    setIsCompleting(true);
    setTimeout(() => {
      onComplete(item.id);
    }, 450);
  };

  return (
    <motion.div
      ref={cardRef}
      variants={listItemEntrance}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className="relative"
    >
      <motion.div
        animate={
          isCompleting
            ? {
                opacity: 0,
                scale: 0.1,
                x: targetPositionRef.current.x,
                y: targetPositionRef.current.y,
              }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        transition={{
          duration: 0.4,
          ease: [0.4, 0, 1, 1], // Ease-in: accelerates toward target
          opacity: {
            duration: 0.25,
            delay: 0.15, // Keep visible during initial movement
            ease: 'easeIn',
          },
        }}
      >
        <Link href={item.href}>
          <div
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border',
              'hover:shadow-md transition-all duration-200 cursor-pointer',
              'shadow-sm',
              styles.bg,
              styles.border
            )}
          >
            {/* Icon */}
            <div className={cn('p-2.5 rounded-lg', styles.iconBg)}>
              <Icon className={cn('h-4 w-4', styles.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-slate-800 truncate">
                  {item.title}
                </p>
                {item.count && item.count > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-white/60 text-slate-700"
                  >
                    {item.count}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {item.subtitle}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-white/80 hover:bg-white border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                {item.actionLabel}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                onClick={handleComplete}
                title="Mark as done"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

// Done Tray Popover
interface DoneTrayProps {
  items: ActionItem[];
  onRestore: (id: string) => void;
  trayRef: React.RefObject<HTMLDivElement | null>;
  isReceiving: boolean;
}

function DoneTray({ items, onRestore, trayRef, isReceiving }: DoneTrayProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div
          ref={trayRef}
          animate={isReceiving ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-2 text-slate-500 hover:text-slate-700',
              items.length > 0 && 'text-emerald-600 hover:text-emerald-700'
            )}
          >
            <Inbox className="h-4 w-4" />
            <span className="text-xs">Done</span>
            {items.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-emerald-100 text-emerald-700"
              >
                {items.length}
              </Badge>
            )}
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-white border-border shadow-lg">
        <div className="px-3 py-2.5 border-b border-border rounded-t-md daep-bg-primary-tint">
          <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items completed yet</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-auto p-2 space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate text-foreground">{item.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => onRestore(item.id)}
                  title="Restore"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Main Enhanced Action Items Component
interface EnhancedActionItemsProps {
  initialItems: ActionItem[];
}

export function EnhancedActionItems({ initialItems }: EnhancedActionItemsProps) {
  const [activeItems, setActiveItems] = useState<ActionItem[]>(
    initialItems.filter((item) => !item.completedAt)
  );
  const [closedItems, setClosedItems] = useState<ActionItem[]>(
    initialItems.filter((item) => item.completedAt)
  );
  const [isReceiving, setIsReceiving] = useState(false);
  const doneTrayRef = useRef<HTMLDivElement>(null);

  const handleComplete = (itemId: string) => {
    const item = activeItems.find((i) => i.id === itemId);
    if (!item) return;

    // Trigger done tray pulse animation
    setIsReceiving(true);
    setTimeout(() => setIsReceiving(false), 300);

    // Move item to closed and show quick feedback
    setActiveItems((prev) => prev.filter((i) => i.id !== itemId));
    setClosedItems((prev) => [
      ...prev,
      { ...item, completedAt: new Date().toISOString() },
    ]);
    toast.success('Action item done', { duration: 1000 });
  };

  const handleRestore = (itemId: string) => {
    const item = closedItems.find((i) => i.id === itemId);
    if (!item) return;

    setClosedItems((prev) => prev.filter((i) => i.id !== itemId));
    setActiveItems((prev) => [...prev, { ...item, completedAt: null }]);
    toast.success('Item restored');
  };

  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <ClipboardList className="h-4 w-4" />
          Action Items
          {activeItems.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs bg-slate-100">
              {activeItems.length}
            </Badge>
          )}
        </CardTitle>
        <DoneTray
          items={closedItems}
          onRestore={handleRestore}
          trayRef={doneTrayRef}
          isReceiving={isReceiving}
        />
      </CardHeader>
      <CardContent>
        {activeItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 px-4"
          >
            <div className="bg-emerald-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">
              No action items requiring attention
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {activeItems.map((item) => (
                <EnhancedActionItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  doneTrayRef={doneTrayRef}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
