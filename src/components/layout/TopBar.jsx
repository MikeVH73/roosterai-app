import React from 'react';
import { useCompany } from '../providers/CompanyProvider';
import { Bell, Search, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TopBar({ title, subtitle, actions }) {
  const { user } = useCompany();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="bg-white/80 backdrop-blur-md px-6 h-16 border-b border-slate-200/50 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle &&
        <p className="text-sm text-slate-500">{subtitle}</p>
        }
      </div>

      <div className="flex items-center gap-3">
        {actions}
        
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Zoeken..."
            className="pl-9 w-64 bg-slate-50 border-slate-200 focus:bg-white" />

        </div>

        <Button variant="ghost" size="icon" className="text-slate-500">
          <HelpCircle className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-slate-500">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-4 text-center text-slate-500 text-sm">
              Geen nieuwe meldingen
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar className="w-9 h-9 cursor-pointer">
          <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">
            {getInitials(user?.full_name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>);

}