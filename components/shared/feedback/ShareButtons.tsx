'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Link2, Mail, Twitter, Linkedin, Check, Facebook } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareButtonsProps {
  feedbackId: string;
  title: string;
  slug?: string;
  type?: string;
}

export function ShareButtons({ feedbackId, title, slug, type }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Use current URL if available, otherwise construct from slug and type
  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Help me vote on this DistrictTracker feature`);
    const body = encodeURIComponent(
      `I just found this feature request on DistrictTracker's feedback board and would love your support:\n\n"${title}"\n\n${shareUrl}\n\nPlease click the link and upvote if you'd find this useful! The more votes it gets, the higher priority it receives on the development roadmap.\n\nThanks!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Help me vote on this feature for @DistrictTracker: "${title}"`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleLinkedInShare = () => {
    // LinkedIn official share URL - simplified version that works reliably
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleFacebookShare = () => {
    // Facebook Share - opens Facebook's share interface
    // Will display Open Graph preview automatically
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white">
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailShare}>
          <Mail className="w-4 h-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebookShare}>
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitterShare}>
          <Twitter className="w-4 h-4 mr-2" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLinkedInShare}>
          <Linkedin className="w-4 h-4 mr-2" />
          LinkedIn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
