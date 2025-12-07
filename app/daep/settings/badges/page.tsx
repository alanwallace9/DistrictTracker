'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getMilestoneRules,
  activateMilestoneRule,
  deactivateMilestoneRule,
  seedDefaultMilestones,
  type MilestoneRule,
} from '@/app/actions/daep/milestones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Power,
  PowerOff,
  ArrowUpDown,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { AddBadgeDialog } from './AddBadgeDialog';
import { EditBadgeDialog } from './EditBadgeDialog';

type SortKey = 'badge_name' | 'trigger_value' | 'bonus_points' | 'active';

export default function BadgesSettingsPage() {
  const { toast } = useToast();
  const [badges, setBadges] = useState<MilestoneRule[]>([]);
  const [filteredBadges, setFilteredBadges] = useState<MilestoneRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'trigger_value',
    direction: 'asc',
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<MilestoneRule | null>(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  useEffect(() => {
    filterAndSortBadges();
  }, [badges, searchQuery, sortConfig]);

  const fetchBadges = async () => {
    setLoading(true);
    try {
      const data = await getMilestoneRules();
      setBadges(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch milestone badges';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBadges = () => {
    let filtered = badges;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (badge) =>
          badge.badgeName.toLowerCase().includes(query) ||
          badge.ruleName.toLowerCase().includes(query) ||
          badge.triggerValue.toString().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      if (key === 'trigger_value') {
        return (a.triggerValue - b.triggerValue) * multiplier;
      }

      if (key === 'bonus_points') {
        return (a.bonusPoints - b.bonusPoints) * multiplier;
      }

      if (key === 'active') {
        return (a.active === b.active ? 0 : a.active ? -1 : 1) * multiplier;
      }

      // badge_name
      const valueA = a.badgeName.toLowerCase();
      const valueB = b.badgeName.toLowerCase();
      return valueA.localeCompare(valueB) * multiplier;
    });

    setFilteredBadges(sorted);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleEdit = (badge: MilestoneRule) => {
    setSelectedBadge(badge);
    setEditDialogOpen(true);
  };

  const handleToggleActive = async (badge: MilestoneRule) => {
    try {
      if (badge.active) {
        await deactivateMilestoneRule(badge.id);
        toast({ title: 'Success', description: `Badge "${badge.badgeName}" deactivated` });
      } else {
        await activateMilestoneRule(badge.id);
        toast({ title: 'Success', description: `Badge "${badge.badgeName}" activated` });
      }
      fetchBadges();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update badge status';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await seedDefaultMilestones();
      if (result.seeded > 0) {
        toast({
          title: 'Success',
          description: `${result.seeded} default milestone badges created`,
        });
        fetchBadges();
      } else {
        toast({
          title: 'Info',
          description: 'Milestone badges already exist, no seeding needed',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to seed badges';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchBadges();
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 text-left text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Milestone Badge Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure milestone badges awarded when students reach point thresholds
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBadges}
            className="bg-white border border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Badge
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by badge name or threshold..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-slate-300"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading milestone badges...</p>
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {badges.length === 0 ? 'No milestone badges configured yet' : 'No badges match your search'}
          </p>
          {badges.length === 0 && (
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={handleSeedDefaults}>
                <Sparkles className="w-4 h-4 mr-2" />
                Load Defaults
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4">{renderSortableHeader('Badge Name', 'badge_name')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Threshold', 'trigger_value')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Bonus Points', 'bonus_points')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Status', 'active')}</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBadges.map((badge, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/50';

                  return (
                    <tr
                      key={badge.id}
                      className={`${rowBg} hover:bg-muted transition-colors`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-amber-500" />
                          <span className="font-medium">{badge.badgeName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {badge.triggerValue.toLocaleString()} pts
                        </span>
                      </td>
                      <td className="p-4">
                        {badge.bonusPoints > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))]">
                            +{badge.bonusPoints} bonus
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">No bonus</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            badge.active
                              ? 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))]'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {badge.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(badge)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={badge.active ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(badge)}
                          >
                            {badge.active ? (
                              <>
                                <PowerOff className="w-3 h-3 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="w-3 h-3 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredBadges.length} of {badges.length} milestone badges
      </div>

      {/* Dialogs */}
      <AddBadgeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      <EditBadgeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        badge={selectedBadge}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
