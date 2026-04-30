import React from 'react';
import { cn } from '@/lib/utils';
import FlameIcon from '@/components/ui/FlameIcon';

export interface TabBarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface TabBarProps {
  items: TabBarItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onCenterAction?: () => void;
  className?: string;
}

const TabBar: React.FC<TabBarProps> = ({
  items,
  activeTab,
  onTabChange,
  onCenterAction,
  className,
}) => {
  const centerIndex = Math.floor(items.length / 2);

  return (
    <div
      className={cn(
        'bg-[#251208] border-t border-[#3E2214]',
        'flex items-center px-4 py-2 pb-3 gap-1',
        'rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]',
        className
      )}
    >
      {items.map((item, index) => {
        const isActive = activeTab === item.id;

        if (index === centerIndex && onCenterAction) {
          return (
            <React.Fragment key={`center-${index}`}>
              <button
                onClick={() => onTabChange(item.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors duration-[120ms]"
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <div className={cn(isActive ? 'text-[#D4601C]' : 'text-[#9A7B5C]')}>
                    {item.icon}
                  </div>
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-[#E8A040] text-[#1A0D06] rounded-full flex items-center justify-center text-[9px] font-extrabold px-0.5">
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </div>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider', isActive ? 'text-[#D4601C]' : 'text-[#9A7B5C]')}>
                  {item.label}
                </span>
              </button>

              <button
                onClick={onCenterAction}
                className={cn(
                  'w-14 h-14 bg-[#D4601C] rounded-full flex-shrink-0',
                  'flex items-center justify-center -mt-5',
                  'shadow-[0_4px_16px_rgba(212,96,28,0.50)]',
                  'transition-transform duration-200 ease-spring',
                  'hover:scale-110 active:scale-95'
                )}
              >
                <FlameIcon width={28} height={28} />
              </button>
            </React.Fragment>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors duration-[120ms]"
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className={cn(isActive ? 'text-[#D4601C]' : 'text-[#9A7B5C]')}>
                {item.icon}
              </div>
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-[#E8A040] text-[#1A0D06] rounded-full flex items-center justify-center text-[9px] font-extrabold px-0.5">
                  {item.badge > 9 ? '9+' : item.badge}
                </div>
              )}
            </div>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', isActive ? 'text-[#D4601C]' : 'text-[#9A7B5C]')}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
