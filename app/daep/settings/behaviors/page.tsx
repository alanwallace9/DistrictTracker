'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getBehaviorCategories,
  deactivateBehaviorCategory,
  activateBehaviorCategory,
  moveBehaviorCategoryUp,
  moveBehaviorCategoryDown,
  seedDefaultCategories,
  type BehaviorCategory,
} from '@/app/actions/daep/behavior-categories';
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
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { AddCategoryDialog } from './AddCategoryDialog';
import { EditCategoryDialog } from './EditCategoryDialog';
import type { BehaviorCategoryType } from '@/lib/validation/schemas';

type SortKey = 'name' | 'category_type' | 'display_order' | 'is_active';

const CATEGORY_TYPE_LABELS: Record<BehaviorCategoryType, { label: string; color: string }> = {
  positive: { label: 'Positive', color: 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))]' },
  negative: { label: 'Negative', color: 'bg-destructive/10 text-destructive' },
  neutral: { label: 'Neutral', color: 'bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))]' },
};

export default function BehaviorCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<BehaviorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'display_order',
    direction: 'asc',
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BehaviorCategory | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    filterAndSortCategories();
  }, [categories, searchQuery, sortConfig]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getBehaviorCategories();
      setCategories(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch behavior categories';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCategories = () => {
    let filtered = categories;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query) ||
          cat.category_type.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      if (key === 'display_order') {
        return (a.display_order - b.display_order) * multiplier;
      }

      if (typeof a[key] === 'boolean' && typeof b[key] === 'boolean') {
        return (a[key] === b[key] ? 0 : a[key] ? -1 : 1) * multiplier;
      }

      const valueA = String(a[key] ?? '').toLowerCase();
      const valueB = String(b[key] ?? '').toLowerCase();
      return valueA.localeCompare(valueB) * multiplier;
    });

    setFilteredCategories(sorted);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleEdit = (category: BehaviorCategory) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleToggleActive = async (category: BehaviorCategory) => {
    try {
      if (category.is_active) {
        await deactivateBehaviorCategory(category.id);
        toast({ title: 'Success', description: `Category "${category.name}" deactivated` });
      } else {
        await activateBehaviorCategory(category.id);
        toast({ title: 'Success', description: `Category "${category.name}" activated` });
      }
      fetchCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update category status';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleMoveUp = async (category: BehaviorCategory) => {
    try {
      await moveBehaviorCategoryUp(category.id);
      fetchCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to move category';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleMoveDown = async (category: BehaviorCategory) => {
    try {
      await moveBehaviorCategoryDown(category.id);
      fetchCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to move category';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await seedDefaultCategories();
      if (result.seeded > 0) {
        toast({
          title: 'Success',
          description: `${result.seeded} default categories created`,
        });
        fetchCategories();
      } else {
        toast({
          title: 'Info',
          description: 'Categories already exist, no seeding needed',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to seed categories';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchCategories();
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
          <h2 className="text-xl font-semibold text-foreground">Behavior Category Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure behavior categories for point tracking (positive, negative, neutral)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategories}
            className="bg-white border border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, description, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-slate-300"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading behavior categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted">
          <p className="text-muted-foreground">
            {categories.length === 0 ? 'No behavior categories configured yet' : 'No categories match your search'}
          </p>
          {categories.length === 0 && (
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
                  <th className="text-left p-4">{renderSortableHeader('Order', 'display_order')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Name', 'name')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Type', 'category_type')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Status', 'is_active')}</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.map((category, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/50';
                  const typeInfo = CATEGORY_TYPE_LABELS[category.category_type];
                  const isFirst = index === 0;
                  const isLast = index === filteredCategories.length - 1;

                  return (
                    <tr
                      key={category.id}
                      className={`${rowBg} hover:bg-muted transition-colors`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-mono text-sm w-6">
                            {category.display_order + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(category)}
                              disabled={isFirst}
                              className="p-0.5 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(category)}
                              disabled={isLast}
                              className="p-0.5 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="font-medium">{category.name}</span>
                          {category.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            category.is_active
                              ? 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))]'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={category.is_active ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(category)}
                          >
                            {category.is_active ? (
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
        Showing {filteredCategories.length} of {categories.length} behavior categories
      </div>

      {/* Dialogs */}
      <AddCategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        category={selectedCategory}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
