'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BulkFeedbackUpload } from '@/components/admin/BulkFeedbackUpload';
import { Search, Filter, Eye, EyeOff, Pencil, Trash2, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminUpdateFeedback, adminDeleteFeedback, adminCreateFeedback, updateCategory, getNextVersion } from '@/app/actions/feedback';
import { formatDistanceToNow } from 'date-fns';
import type { FeedbackCategory } from '@/lib/supabase';

interface AdminFeedbackPanelProps {
  initialFeedback: any[];
  categories: FeedbackCategory[];
}

const STATUS_OPTIONS = [
  { value: 'under_review', label: 'Under Review', color: 'bg-purple-100 text-purple-600', dotColor: 'text-purple-500' },
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-600', dotColor: 'text-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-600', dotColor: 'text-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-600', dotColor: 'text-green-500' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-600', dotColor: 'text-red-500' },
];

const TYPE_LABELS = {
  bug: 'Bug',
  feature_request: 'Feature',
  improvement: 'Improvement',
  question: 'Question',
  other: 'Other',
};

export function AdminFeedbackPanel({ initialFeedback, categories }: AdminFeedbackPanelProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Edit form state
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    feedback_type: 'bug' | 'feature_request' | 'improvement' | 'question' | 'other' | '';
    category_id: string;
    status: 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined' | '';
    admin_response: string;
    roadmap_notes: string;
    planned_release: string;
    is_public: boolean;
    version_type: 'major' | 'minor' | 'patch' | '';
    version_number: string;
    release_quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | '';
    release_month_year: string;
  }>({
    title: '',
    description: '',
    feedback_type: '',
    category_id: '',
    status: '',
    admin_response: '',
    roadmap_notes: '',
    planned_release: '',
    is_public: true,
    version_type: '',
    version_number: '',
    release_quarter: '',
    release_month_year: '',
  });

  // Filter feedback
  const filteredFeedback = useMemo(() => {
    return feedback.filter((item) => {
      const matchesSearch = searchTerm
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesCategory = filterCategory === 'all' || item.category?.slug === filterCategory;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [feedback, searchTerm, filterCategory, filterStatus]);

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      feedback_type: item.feedback_type || '',
      category_id: item.category_id || (categories.length > 0 ? categories[0].id : ''),
      status: item.status,
      admin_response: item.admin_response || '',
      roadmap_notes: item.roadmap_notes || '',
      planned_release: item.planned_release || '',
      is_public: item.is_public,
      version_type: item.version_type || '',
      version_number: item.version_number || '',
      release_quarter: item.release_quarter || '',
      release_month_year: item.release_month_year || '',
    });
  };

  // Auto-calculate next version number when version type changes
  const handleVersionTypeChange = async (versionType: 'major' | 'minor' | 'patch' | '') => {
    setEditForm(prev => ({ ...prev, version_type: versionType }));

    if (versionType === 'major' || versionType === 'minor' || versionType === 'patch') {
      // Fetch next version number
      const result = await getNextVersion(versionType);
      if (!result.error && result.version) {
        setEditForm(prev => ({ ...prev, version_number: result.version }));
      }
    } else {
      setEditForm(prev => ({ ...prev, version_number: '' }));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const isNewFeature = editingItem.id === 'new';

    console.log('[Admin] Saving feedback:', { editingItem: editingItem.id, editForm, isNewFeature });

    // Validate required fields for new features
    if (isNewFeature) {
      if (!editForm.title || editForm.title.length < 10) {
        alert('Title must be at least 10 characters');
        return;
      }
      if (!editForm.feedback_type) {
        alert('Please select a feedback type');
        return;
      }
      if (!editForm.category_id) {
        alert('Please select a category');
        return;
      }
    }

    let result;

    if (isNewFeature) {
      // Create new feedback
      const createData: any = {
        title: editForm.title,
        description: editForm.description || undefined,
        feedback_type: editForm.feedback_type as any,
        category_id: editForm.category_id,
        status: editForm.status || 'under_review',
        admin_response: editForm.admin_response || undefined,
        roadmap_notes: editForm.roadmap_notes || undefined,
        planned_release: editForm.planned_release || undefined,
        is_public: editForm.is_public,
      };

      // For completed items: use version fields and release_month_year
      if (editForm.status === 'completed') {
        createData.version_type = editForm.version_type || undefined;
        createData.version_number = editForm.version_number || undefined;
        createData.release_month_year = editForm.release_month_year || undefined;
      }
      // For planned items: use release_quarter
      else if (editForm.status === 'planned') {
        createData.release_quarter = editForm.release_quarter || undefined;
      }

      result = await adminCreateFeedback(createData);
    } else {
      // Update existing feedback
      // Build updateData with only necessary fields, converting empty strings to undefined
      const updateData: any = {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        feedback_type: editForm.feedback_type || undefined,
        category_id: editForm.category_id || undefined,
        status: editForm.status || undefined,
        admin_response: editForm.admin_response || undefined,
        roadmap_notes: editForm.roadmap_notes || undefined,
        planned_release: editForm.planned_release || undefined,
        is_public: editForm.is_public,
      };

      // Handle version tracking fields based on status
      if (editForm.status === 'completed') {
        // For completed items: include version fields, clear release_quarter
        updateData.version_type = editForm.version_type || undefined;
        updateData.version_number = editForm.version_number || undefined;
        updateData.release_month_year = editForm.release_month_year || undefined;
        updateData.release_quarter = null;
      } else if (editForm.status === 'planned' || editForm.status === 'in_progress') {
        // For planned items: include release_quarter, clear version fields
        updateData.release_quarter = editForm.release_quarter || undefined;
        updateData.version_type = null;
        updateData.version_number = null;
        updateData.release_month_year = null;
      } else {
        // For under_review and declined: clear all version tracking fields
        updateData.release_quarter = null;
        updateData.version_type = null;
        updateData.version_number = null;
        updateData.release_month_year = null;
      }

      console.log('[Admin] Update data being sent:', updateData);
      result = await adminUpdateFeedback(editingItem.id, updateData);
    }

    console.log('[Admin] Save result:', result);

    if (result.success) {
      setEditingItem(null);
      router.refresh();
      console.log('[Admin] Save successful, dialog closed');
    } else {
      console.error('[Admin] Save failed:', result.error);
      alert(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await adminDeleteFeedback(id);

    if (result.success) {
      setFeedback(prev => prev.filter(item => item.id !== id));
      setShowDeleteConfirm(null);
      router.refresh();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={config?.color || ''}>
        {config?.label || status}
      </Badge>
    );
  };

  const downloadTemplate = () => {
    const headers = [
      'title',
      'description',
      'type',
      'status',
      'product',
      'roadmap_notes',
      'planned_release',
    ];

    const exampleRows = [
      [
        'Add dark mode to dashboard',
        'Users want a dark theme option for better visibility at night',
        'feature_request',
        'planned',
        'Trespass',
        'Will be part of Q1 2025 release',
        'Q1 2025',
      ],
      [
        'Fix date picker not showing on mobile',
        'The date picker component does not display properly on iOS devices',
        'bug',
        'in_progress',
        'DAEP Dashboard',
        'Working on mobile responsive fix',
        '',
      ],
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Manage Feedback</h1>
          <p className="text-slate-600">Review and manage user feedback and feature requests</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingItem({ id: 'new', title: '', description: '', status: 'under_review', is_public: true });
              setEditForm({
                title: '',
                description: '',
                feedback_type: 'feature_request',
                category_id: categories.length > 0 ? categories[0].id : '',
                status: 'under_review',
                admin_response: '',
                roadmap_notes: '',
                planned_release: '',
                is_public: true,
                version_type: '',
                version_number: '',
                release_quarter: '',
                release_month_year: '',
              });
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Feature
          </Button>
          <BulkFeedbackUpload
            categories={categories}
            onSuccess={() => router.refresh()}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300"
            />
          </div>
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px] bg-white border-slate-300">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px] bg-white border-slate-300">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => setManagingCategories(true)} className="bg-white border-slate-300 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300">
          <Filter className="w-4 h-4 mr-2" />
          Manage Categories
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {STATUS_OPTIONS.map(status => {
          const count = feedback.filter(item => item.status === status.value).length;
          return (
            <div key={status.value} className="p-4 bg-white rounded-lg border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-sm text-slate-600">{status.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Title</TableHead>
              <TableHead className="w-[10%]">Type</TableHead>
              <TableHead className="w-[12%]">Category</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[8%] text-center">Votes</TableHead>
              <TableHead className="w-[10%]">Submitted</TableHead>
              <TableHead className="w-[5%] text-center">Vis</TableHead>
              <TableHead className="w-[8%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeedback.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No feedback found
                </TableCell>
              </TableRow>
            ) : (
              filteredFeedback.map((item) => {
                const isExpanded = expandedRows.has(item.id);
                return (
                  <>
                    <TableRow
                      key={item.id}
                      className="group cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <TableCell className="font-medium text-sm">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          {TYPE_LABELS[item.feedback_type as keyof typeof TYPE_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.category?.name || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="font-semibold text-sm text-center">{item.upvote_count}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.is_public ? (
                          <Eye className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-slate-50 p-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                              <p className="text-sm text-slate-700">{item.description || 'No description provided'}</p>
                            </div>
                            {item.admin_response && (
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-2">Admin Response</h4>
                                <p className="text-sm text-slate-700">{item.admin_response}</p>
                              </div>
                            )}
                            {item.roadmap_notes && (
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-2">Roadmap Notes</h4>
                                <p className="text-sm text-slate-700">{item.roadmap_notes}</p>
                              </div>
                            )}
                            <div className="text-sm text-slate-600">
                              Submitted by: {item.user?.display_name || 'Anonymous'} ({item.user?.role || 'User'})
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-[#F9FAFB] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
            <DialogDescription>
              Update status, add admin notes, and manage visibility
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              {/* Editable Title and Description */}
              <div className="space-y-3 border-b border-slate-200 pb-4">
                <div>
                  <label className="text-sm font-medium text-slate-900">Feature Title</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Feature title"
                    className="bg-white border-slate-300 shadow-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Feature description"
                    rows={3}
                    className="bg-white border-slate-300 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Type and Category - Only for New Features */}
                {editingItem.id === 'new' && (
                  <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <label className="text-sm font-medium text-slate-900">Type *</label>
                      <Select value={editForm.feedback_type} onValueChange={(value: any) => setEditForm({ ...editForm, feedback_type: value })}>
                        <SelectTrigger className="bg-white border-slate-300 shadow-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feature_request">Feature Request</SelectItem>
                          <SelectItem value="bug">Bug Report</SelectItem>
                          <SelectItem value="improvement">Improvement</SelectItem>
                          <SelectItem value="question">Question</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-900">Category *</label>
                      <Select value={editForm.category_id} onValueChange={(value) => setEditForm({ ...editForm, category_id: value })}>
                        <SelectTrigger className="bg-white border-slate-300 shadow-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-900">Status</label>
                  <Select value={editForm.status} onValueChange={(value: any) => setEditForm({ ...editForm, status: value })}>
                    <SelectTrigger className="bg-white border-slate-300 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">Admin Response</label>
                  <Textarea
                    value={editForm.admin_response}
                    onChange={(e) => setEditForm({ ...editForm, admin_response: e.target.value })}
                    placeholder="Add a public response to this feedback"
                    rows={3}
                    className="bg-white border-slate-300 shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">Roadmap Notes</label>
                  <Textarea
                    value={editForm.roadmap_notes}
                    onChange={(e) => setEditForm({ ...editForm, roadmap_notes: e.target.value })}
                    placeholder="Internal notes for roadmap planning"
                    rows={3}
                    className="bg-white border-slate-300 shadow-sm"
                  />
                </div>

                {/* Version Tracking Section */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Version Tracking</h3>

                  {/* Version Cheat Sheet */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                    <p className="font-semibold text-blue-900 mb-2">Version Type Guide:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li><strong>Major (X.0.0):</strong> Breaking changes, major new features, significant redesigns</li>
                      <li><strong>Minor (0.X.0):</strong> New features, enhancements, non-breaking improvements</li>
                      <li><strong>Patch (0.0.X):</strong> Bug fixes, small tweaks, security patches</li>
                    </ul>
                  </div>

                  {/* Version and Release Tracking Fields - Always visible */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-900">Version Type</label>
                        <Select value={editForm.version_type} onValueChange={(value: any) => handleVersionTypeChange(value)}>
                          <SelectTrigger className="bg-white border-slate-300 shadow-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="major">Major (Breaking)</SelectItem>
                            <SelectItem value="minor">Minor (Features)</SelectItem>
                            <SelectItem value="patch">Patch (Fixes)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-900">Version Number</label>
                        <Input
                          value={editForm.version_number}
                          onChange={(e) => setEditForm({ ...editForm, version_number: e.target.value })}
                          placeholder="e.g., 1.2.3"
                          className="bg-white border-slate-300 shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-900">Release Month & Year</label>
                      <Input
                        value={editForm.release_month_year}
                        onChange={(e) => setEditForm({ ...editForm, release_month_year: e.target.value })}
                        placeholder="e.g., November 2025"
                        className="bg-white border-slate-300 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-900">Planned Release Quarter</label>
                      <Select value={editForm.release_quarter} onValueChange={(value: any) => setEditForm({ ...editForm, release_quarter: value })}>
                        <SelectTrigger className="bg-white border-slate-300 shadow-sm">
                          <SelectValue placeholder="Select quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                          <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                          <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                          <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={editForm.is_public}
                    onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="is_public" className="text-sm font-medium text-slate-900">
                    Publicly visible
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="bg-white border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="bg-[#F9FAFB]">
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="bg-white border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
