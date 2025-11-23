'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createFeedback } from '@/app/actions/feedback';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedbackCategory } from '@/lib/supabase';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: FeedbackCategory[];
}

const FEEDBACK_TYPES = [
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

export function FeedbackDialog({ open, onOpenChange, categories }: FeedbackDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    category_id: '',
    feedback_type: 'feature_request' as 'bug' | 'feature_request' | 'improvement' | 'question' | 'other',
    title: '',
    description: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleTitleChange = (value: string) => {
    setFormData({ ...formData, title: value });

    // Real-time validation
    if (value.length > 0 && value.length < 10) {
      setTitleError('Title must be at least 10 characters');
    } else if (value.length > 200) {
      setTitleError('Title must be less than 200 characters');
    } else {
      setTitleError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if user is logged in
    if (!user) {
      router.push('/login?redirect=/feedback');
      return;
    }

    // Validate
    if (!formData.category_id) {
      setError('Please select a category');
      return;
    }

    if (formData.title.length < 10 || formData.title.length > 200) {
      setError('Title must be between 10 and 200 characters');
      return;
    }

    startTransition(async () => {
      const result = await createFeedback(formData);

      if (result.error) {
        setError(result.error);
      } else {
        // Success! Close dialog and reset form
        onOpenChange(false);
        setFormData({
          category_id: '',
          feedback_type: 'feature_request',
          title: '',
          description: '',
        });

        // Redirect to feedback board (will show new submission)
        router.push('/feedback');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Your Idea</DialogTitle>
          <DialogDescription>
            Help shape the future of our software. Your feedback will be visible to other users and our team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Category */}
          <div>
            <Label htmlFor="category">Software Product *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              required
            >
              <SelectTrigger id="category" className="mt-1.5">
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feedback Type */}
          <div>
            <Label htmlFor="type">Feedback Type *</Label>
            <Select
              value={formData.feedback_type}
              onValueChange={(value: any) => setFormData({ ...formData, feedback_type: value })}
              required
            >
              <SelectTrigger id="type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">
              Title *
              <span className="text-xs text-slate-500 font-normal ml-2">
                ({formData.title.length}/200 characters)
              </span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Brief, descriptive summary"
              className="mt-1.5"
              required
              minLength={10}
              maxLength={200}
            />
            {titleError && (
              <p className="text-xs text-red-600 mt-1">{titleError}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Provide a clear, concise summary of your feedback
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">
              Description <span className="text-slate-500 font-normal">(optional, but encouraged)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What do you need this for? Why is it important?"
              className="mt-1.5 min-h-[120px]"
              rows={5}
            />
            <p className="text-xs text-slate-500 mt-1">
              The more details you provide, the better we can understand your needs
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-600">
              Your feedback will be visible to other users in your organization and will include your name and role.
              {' '}
              <a
                href="https://districttracker.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View Privacy Policy
              </a>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !!titleError || !formData.category_id}
            >
              {isPending ? 'Submitting...' : 'Submit Idea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
