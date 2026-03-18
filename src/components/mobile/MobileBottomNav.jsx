import React from 'react';
import { Home, Calendar, MessageCircle, Bell, User } from 'lucide-react';

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'rooster', label: 'Rooster', icon: Calendar },
  { id: 'chat', label: 'Berichten', icon: MessageCircle },
  { id: 'meldingen', label: 'Meldingen', icon: Bell },
  { id: 'profiel', label: 'Profiel', icon: User },
];

export default function MobileBottomNav({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"
      style={{ 
        backgroundColor: 'var(--color-surface)', 
        borderColor: 'var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full relative transition-colors"
              style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {tab.id === 'meldingen' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ backgroundColor: '#ef4444' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}