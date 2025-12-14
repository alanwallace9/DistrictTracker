'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionItemCard } from './action-item-card';
import { ClosedItemsPopover } from './closed-items-popover';
import { completeActionItem, restoreActionItem } from '@/app/actions/daep/dashboard';
import type { ActionItem } from '@/app/actions/daep/dashboard';
import { toast } from 'sonner';
import { listVariants } from '@/lib/constants/animations';
import { ClipboardList } from 'lucide-react';

interface ActionItemsProps {
  initialItems: ActionItem[];
}

export function ActionItems({ initialItems }: ActionItemsProps) {
  const [activeItems, setActiveItems] = useState<ActionItem[]>(
    initialItems.filter((item) => !item.completedAt)
  );
  const [closedItems, setClosedItems] = useState<ActionItem[]>(
    initialItems.filter((item) => item.completedAt)
  );

  const handleComplete = async (itemId: string) => {
    const item = activeItems.find((i) => i.id === itemId);
    if (!item) return;

    await completeActionItem(itemId);

    setActiveItems((prev) => prev.filter((i) => i.id !== itemId));
    setClosedItems((prev) => [
      ...prev,
      { ...item, completedAt: new Date().toISOString() },
    ]);

    toast.success('Marked as complete');
  };

  const handleRestore = async (itemId: string) => {
    const item = closedItems.find((i) => i.id === itemId);
    if (!item) return;

    await restoreActionItem(itemId);

    setClosedItems((prev) => prev.filter((i) => i.id !== itemId));
    setActiveItems((prev) => [...prev, { ...item, completedAt: null }]);

    toast.success('Item restored');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Action Items
          {activeItems.length > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({activeItems.length})
            </span>
          )}
        </CardTitle>
        <ClosedItemsPopover items={closedItems} onRestore={handleRestore} />
      </CardHeader>
      <CardContent>
        {activeItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">All caught up!</p>
            <p className="text-xs mt-1">No action items requiring attention</p>
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {activeItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
