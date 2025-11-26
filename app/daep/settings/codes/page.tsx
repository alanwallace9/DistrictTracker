'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getDisciplineCodes,
  deactivateDisciplineCode,
  activateDisciplineCode,
  type DisciplineCode,
} from '@/app/actions/daep/discipline-codes';
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
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { AddCodeDialog } from './AddCodeDialog';
import { EditCodeDialog } from './EditCodeDialog';

type SortKey = 'code' | 'label' | 'mandatory_placement' | 'behavior_location' | 'active';

const BEHAVIOR_LOCATION_LABELS: Record<string, string> = {
  on_campus: 'On Campus',
  off_campus: 'Off Campus',
  school_sponsored: 'School Sponsored',
};

export default function DisciplineCodesPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DisciplineCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<DisciplineCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'code',
    direction: 'asc',
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<DisciplineCode | null>(null);

  useEffect(() => {
    fetchCodes();
  }, []);

  useEffect(() => {
    filterAndSortCodes();
  }, [codes, searchQuery, sortConfig]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const data = await getDisciplineCodes();
      setCodes(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch discipline codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCodes = () => {
    let filtered = codes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (code) =>
          code.code.toLowerCase().includes(query) ||
          code.label.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      if (typeof a[key] === 'boolean' && typeof b[key] === 'boolean') {
        return (a[key] === b[key] ? 0 : a[key] ? -1 : 1) * multiplier;
      }

      const valueA = String(a[key] ?? '').toLowerCase();
      const valueB = String(b[key] ?? '').toLowerCase();
      return valueA.localeCompare(valueB) * multiplier;
    });

    setFilteredCodes(sorted);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleEdit = (code: DisciplineCode) => {
    setSelectedCode(code);
    setEditDialogOpen(true);
  };

  const handleToggleActive = async (code: DisciplineCode) => {
    try {
      if (code.active) {
        await deactivateDisciplineCode(code.id);
        toast({ title: 'Success', description: `Code ${code.code} deactivated` });
      } else {
        await activateDisciplineCode(code.id);
        toast({ title: 'Success', description: `Code ${code.code} activated` });
      }
      fetchCodes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update code status',
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchCodes();
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
          <h2 className="text-xl font-semibold text-foreground">Discipline Code Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Texas PEIMS discipline codes for placement categorization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCodes}
            className="bg-white border border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Code
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by PEIMS code or label..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-slate-300"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading discipline codes...</p>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
          <p className="text-muted-foreground">
            {codes.length === 0 ? 'No discipline codes configured yet' : 'No codes match your search'}
          </p>
          {codes.length === 0 && (
            <Button
              className="mt-4"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Code
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-4">{renderSortableHeader('Code', 'code')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Label', 'label')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Mandatory', 'mandatory_placement')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Location', 'behavior_location')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Status', 'active')}</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCodes.map((code, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr
                      key={code.id}
                      className={`${rowBg} hover:bg-slate-100 transition-colors`}
                    >
                      <td className="p-4 font-mono font-medium">{code.code}</td>
                      <td className="p-4 text-slate-600">{code.label}</td>
                      <td className="p-4">
                        {code.mandatory_placement ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <CheckCircle className="w-4 h-4" />
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <XCircle className="w-4 h-4" />
                            Discretionary
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {code.behavior_location
                          ? BEHAVIOR_LOCATION_LABELS[code.behavior_location]
                          : '—'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            code.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {code.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(code)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={code.active ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(code)}
                          >
                            {code.active ? (
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
        Showing {filteredCodes.length} of {codes.length} discipline codes
      </div>

      {/* Dialogs */}
      <AddCodeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      <EditCodeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        code={selectedCode}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
