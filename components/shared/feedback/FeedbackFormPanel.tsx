'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { createFeedback, uploadFeedbackImage } from '@/app/actions/feedback';
import { ImageUploadModal } from './ImageUploadModal';
import { Paperclip } from 'lucide-react';
import type { FeedbackCategory } from '@/lib/supabase';

interface FeedbackFormPanelProps {
  categories: FeedbackCategory[];
}

const FEEDBACK_TYPES = [
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

export function FeedbackFormPanel({ categories }: FeedbackFormPanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    category_id: '',
    feedback_type: 'feature_request' as 'bug' | 'feature_request' | 'improvement' | 'question' | 'other',
    title: '',
    description: '',
    name: '',
    email: user?.email || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);

  const title = 'Share Your Feedback';
  const subtitle = "Tell us about bugs you've found, features you'd like to see, or general improvements to DistrictTracker.";

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }
    if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Please select a product';
    }

    // Only validate name, email, and terms for non-logged-in users
    if (!user) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      if (!formData.email) {
        newErrors.email = 'Email is required';
      }
      if (!agreedToTerms) {
        newErrors.terms = 'You must agree to the privacy policy';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Check if user is logged in
    if (!user) {
      // Store form data in sessionStorage (more secure, clears on tab close)
      // Add expiration timestamp for additional security
      const feedbackData = {
        data: formData,
        expires: Date.now() + (10 * 60 * 1000), // 10 minutes
      };
      sessionStorage.setItem('pending_feedback', JSON.stringify(feedbackData));
      router.push('/login?redirect=/feedback&action=submit');
      return;
    }

    // Logged-in users implicitly agree to terms (they agreed when signing up)

    startTransition(async () => {
      const result = await createFeedback({
        category_id: formData.category_id,
        feedback_type: formData.feedback_type,
        title: formData.title,
        description: formData.description || undefined,
      });

      if (result.success && result.data) {
        // Upload images if any
        if (images.length > 0) {
          const uploadPromises = images.map(async (image) => {
            const formData = new FormData();
            formData.append('file', image);
            return uploadFeedbackImage(result.data!.id, formData);
          });

          try {
            await Promise.all(uploadPromises);
          } catch (error) {
            console.error('Error uploading images:', error);
            // Don't fail the whole submission if images fail
          }
        }

        // TODO: Send confirmation email
        console.log('TODO: Send confirmation email to', formData.email);
        console.log('Demo link: https://demo.districttracker.com');

        // Clean up pending feedback from sessionStorage
        sessionStorage.removeItem('pending_feedback');

        // Reset form
        setFormData({
          category_id: '',
          feedback_type: 'feature_request',
          title: '',
          description: '',
          name: '',
          email: user?.email || '',
        });
        setAgreedToTerms(false);
        setImages([]);

        // Refresh the page to show new feedback
        router.refresh();
      } else {
        setErrors({ submit: result.error || 'Failed to submit feedback' });
      }
    });
  };

  const titleCharCount = formData.title.length;
  const titleColor = titleCharCount < 10 ? 'text-slate-400' : titleCharCount > 200 ? 'text-red-600' : 'text-green-600';

  return (
    <div className="bg-white border border-[#828282] rounded-lg p-6 sticky top-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-600 mb-6">{subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Feedback Type */}
        <div>
          <Label htmlFor="feedback_type" className="text-sm font-medium text-slate-900">
            Type <span className="text-red-600">*</span>
          </Label>
          <Select
            value={formData.feedback_type}
            onValueChange={(value: any) => setFormData({ ...formData, feedback_type: value })}
          >
            <SelectTrigger className="border-[#828282] bg-white">
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
          <Label htmlFor="title" className="text-sm font-medium text-slate-900">
            Title <span className="text-red-600">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Something short"
            className={errors.title ? 'border-red-500 bg-white' : 'border-[#828282] bg-white'}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
            <p className={`text-xs ml-auto ${titleColor}`}>
              {titleCharCount}/200
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium text-slate-900">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Please provide more details about your feedback. What do you need? Why is this important?"
            rows={4}
            className="border-[#828282] bg-white"
          />
        </div>

        {/* Product */}
        <div>
          <Label htmlFor="product" className="text-sm font-medium text-slate-900">
            Product <span className="text-red-600">*</span>
          </Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger className={errors.category_id ? 'border-red-500 bg-white' : 'border-[#828282] bg-white'}>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && <p className="text-xs text-red-600 mt-1">{errors.category_id}</p>}
        </div>

        {/* Image Upload Link */}
        <div>
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            <span>Attach images</span>
            {images.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {images.length}
              </span>
            )}
          </button>
        </div>

        {/* Contact Section - Only show for non-logged-in users */}
        {!user && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-900">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className={errors.name ? 'border-red-500 bg-white' : 'border-[#828282] bg-white'}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                Email <span className="text-red-600">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Your email address"
                className={errors.email ? 'border-red-500 bg-white' : 'border-[#828282] bg-white'}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded border-slate-300"
              />
              <label htmlFor="terms" className="text-xs text-slate-600">
                I agree with{' '}
                <a
                  href="https://districttracker.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Privacy Policy
                </a>
                {' '}and{' '}
                <a
                  href="https://districttracker.com/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Terms of Service
              </a>
              {' '}<span className="text-red-600">*</span>
            </label>
          </div>
          {errors.terms && <p className="text-xs text-red-600">{errors.terms}</p>}
        </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          {isPending ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </form>

      {/* Image Upload Modal */}
      <ImageUploadModal
        open={showImageModal}
        onOpenChange={setShowImageModal}
        images={images}
        onImagesChange={setImages}
        maxImages={5}
        maxSizeMB={5}
      />
    </div>
  );
}
