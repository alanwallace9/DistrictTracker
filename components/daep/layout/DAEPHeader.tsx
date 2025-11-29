'use client';

import { useUser } from '@clerk/nextjs';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DAEPHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function DAEPHeader({ onMenuClick, showMenuButton = true }: DAEPHeaderProps) {
  const { user } = useUser();

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b bg-white shrink-0">
      {/* Left: Menu button (mobile) + Search */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile hamburger */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Search */}
        <div className="hidden sm:flex items-center flex-1 max-w-md relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students, placements..."
            className="pl-9 border focus-visible:ring-[rgb(var(--daep-primary))] focus-visible:border-[rgb(var(--daep-primary))]"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search icon for mobile */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 h-2 w-2 bg-[rgb(var(--daep-danger))] rounded-full" />
        </Button>

        {/* User avatar */}
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-[rgb(var(--daep-primary))] text-white text-sm">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
