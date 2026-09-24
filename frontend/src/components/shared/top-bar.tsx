'use client';
import React from 'react';
import { Menu, Search, Bell, Sun, Moon } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export function TopBar({ title }: { title: string }) {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur-sm">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:flex shrink-0">
        <Menu className="w-5 h-5 text-zinc-400" />
      </Button>
      
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden lg:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            type="search"
            placeholder="Search problems..."
            className="pl-9 bg-zinc-900 border-zinc-800"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative text-zinc-400">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-indigo-500"></span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-zinc-400"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>{user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user?.full_name && <p className="font-medium">{user.full_name}</p>}
                {user?.email && <p className="w-[200px] truncate text-sm text-zinc-400">{user.email}</p>}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile">Profile</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-400 focus:text-red-400" onSelect={logout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
