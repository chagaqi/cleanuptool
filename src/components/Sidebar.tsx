import { Filter, FileSpreadsheet, Clock, Settings, ChevronRight } from 'lucide-react';

export type NavTab = 'cleaner' | 'history' | 'settings';

type NavItem = {
  id: NavTab;
  label: string;
  icon: typeof Filter;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'cleaner', label: 'CSV Cleaner', icon: FileSpreadsheet },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

type Props = {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  userInitial: string;
  userEmail: string;
};

export function Sidebar({ activeTab, onTabChange, userInitial, userEmail }: Props) {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
            <Filter className="w-4 h-4 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate leading-none">
              Lead Processor
            </p>
            <p className="text-xs text-slate-400 mt-0.5">CSV tools</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100 text-left
                ${active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              <span className="flex-1 truncate">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-100">
        <button
          onClick={() => onTabChange('settings')}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white uppercase">{userInitial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-700 truncate">{userEmail}</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}
