import { Link } from 'react-router';
import { DashIcon, PATHS, PUR } from './dashboardUtils';

export type RoleType = 'admin' | 'derma' | 'consultant' | 'user';

interface SidebarProps {
  role: RoleType;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const N = {
  admin: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', 'Overview & Analytics', 'grid'],
        ['User Management', 'Manage users & roles', 'users'],
        ['Role & Permissions', 'Manage roles & access', 'shield'],
        ['Skin Assessments', 'View all assessments', 'clip'],
        ['Routine Management', 'Manage routines & plans', 'cal'],
        ['Product Management', 'Manage products', 'box'],
        ['Ingredient Database', 'Manage ingredients', 'beaker'],
        ['Content Management', 'Manage articles & resources', 'doc'],
        ['Reports & Analytics', 'Platform reports', 'trend'],
        ['Notifications', 'System notifications', 'bell'],
        ['System Settings', 'Configure platform settings', 'gear'],
      ],
    },
    {
      heading: 'SYSTEM & SECURITY',
      items: [
        ['Audit Logs', 'System activity logs', 'log'],
        ['Security & Access', 'Manage security settings', 'lock'],
        ['Backup & Restore', 'Data backup & restore', 'db'],
      ],
    },
  ],
  derma: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', 'Overview & key insights', 'home'],
        ['Patients', 'Manage patient profiles', 'users'],
        ['Assessments', 'Skin assessments & analysis', 'clip'],
        ['Clinical Insights', 'AI insights & risk analysis', 'spark'],
        ['Treatment Plans', 'Create & manage plans', 'note'],
        ['Progress Tracking', 'Monitor patient progress', 'trend'],
        ['Prescriptions', 'Manage prescriptions', 'pill'],
        ['Reports', 'Clinical reports & analytics', 'doc'],
        ['Consultations', 'Appointments & notes', 'chat'],
        ['Follow-ups', 'Follow-up tracking', 'refresh'],
        ['Reminders', 'Treatment reminders', 'bell'],
      ],
    },
    {
      heading: 'TOOLS & RESOURCES',
      items: [
        ['Ingredient Database', 'Search & analyze ingredients', 'beaker'],
        ['Treatment Protocols', 'Clinical treatment guides', 'book'],
        ['Skin Conditions Guide', 'Reference & solutions', 'book'],
        ['Research & Publications', 'Latest dermatology research', 'beaker'],
      ],
    },
  ],
  consultant: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', 'Overview & key metrics', 'home'],
        ['Clients', 'Manage client profiles', 'users'],
        ['Assessments', 'Skin assessments & analysis', 'clip'],
        ['Routine Plans', 'Create & manage routines', 'cal'],
        ['Product Recommendations', 'View & recommend products', 'thumb'],
        ['Progress Tracking', 'Track client progress', 'trend'],
        ['Reports', 'Client reports & analytics', 'doc'],
        ['Follow-ups & Notes', 'Notes & follow-up history', 'note'],
        ['Reminders', 'Appointments & reminders', 'bell'],
      ],
    },
    {
      heading: 'TOOLS & RESOURCES',
      items: [
        ['Ingredient Database', 'Search & analyze ingredients', 'beaker'],
        ['Skin Concerns Guide', 'Reference & solutions', 'book'],
        ['Treatment Protocols', 'Clinical treatment guides', 'book'],
      ],
    },
  ],
  user: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', '', 'home'],
        ['My Skin Profile', 'View & update your profile', 'users'],
        ['Skin Assessment', 'Analyze your skin condition', 'clip'],
        ['My Routine', 'Your personalized routine', 'cal'],
        ['Product Recommendations', 'Products for your skin', 'box'],
        ['Ingredient Analyzer', 'Check ingredients & safety', 'search'],
        ['Progress Tracking', 'Track your skin progress', 'trend'],
        ['Lifestyle & Habits', 'Sleep, water & lifestyle', 'heart'],
        ['Reports', 'View & download reports', 'doc'],
        ['Reminders', 'Routine & habit reminders', 'bell'],
        ['Settings', 'Account & preferences', 'gear'],
      ],
    },
    {
      heading: 'QUICK ACTIONS',
      items: [
        ['Skin Scan', 'Start new skin assessment', 'scan'],
        ['Ask AI', 'Get skincare guidance', 'spark'],
        ['Upload Photo', 'Analyze your skin', 'upload'],
        ['Subscription & Plans', 'Premium clinical tiers', 'shield'],
      ],
    },
  ],
};

const PANEL_NAME: Record<RoleType, string> = {
  admin: 'Admin Panel',
  derma: 'Dermatologist Panel',
  consultant: 'Consultant Panel',
  user: 'AI Skincare Companion',
};

export function Sidebar({ role, activeSection = 'dashboard', onSectionChange }: SidebarProps) {
  const groups = N[role] || N.user;
  const panelName = PANEL_NAME[role];

  return (
    <aside className="dash-sidebar dash-scroll flex w-[248px] shrink-0 flex-col border-r border-[#edeef4] bg-white self-stretch">
      <Link to="/" className="flex items-center gap-[11px] px-6 pb-5 pt-8 no-underline cursor-pointer">
        <span className="grid h-11 w-11 shrink-0 place-items-center">
          <svg viewBox="0 0 48 48" fill="none" className="h-[34px] w-[34px]" stroke={PUR}>
            <circle cx="24" cy="24" r="22" strokeWidth="1" opacity="0.35" />
            <path d="M24 8 C33 14 34 30 24 40 C14 30 15 14 24 8 Z" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M24 12 L24 38" strokeWidth="1.2" />
            <path d="M24 20 L18.5 16 M24 20 L29.5 16 M24 27 L18 22.5 M24 27 L30 22.5" strokeWidth="1" opacity="0.7" />
            <circle cx="24" cy="8" r="1.9" fill={PUR} />
            <circle cx="18.5" cy="16" r="1.4" fill={PUR} />
            <circle cx="29.5" cy="16" r="1.4" fill={PUR} />
          </svg>
        </span>
        <div style={{ lineHeight: 1.1 }}>
          <div className="font-display text-[1.2rem] font-semibold tracking-[0.26em] text-[#171433]">MIRACLE</div>
          <div className="mt-[3px] text-[0.74rem] font-semibold tracking-[0.02em] text-[#2f6b4c]">{panelName}</div>
        </div>
      </Link>

      <nav className="flex-1 px-4 pb-4 pt-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.heading} className="mt-3.5">
            <div className="px-3 pb-2 text-[0.66rem] font-bold tracking-[0.12em] text-[#a3a7bd]">{g.heading}</div>
            {g.items.map(([label, sub, ic]) => {
              const itemKey = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const isActive = activeSection === itemKey || (activeSection === 'dashboard' && itemKey === 'dashboard');
              return (
                <button
                  key={String(label)}
                  type="button"
                  onClick={() => onSectionChange && onSectionChange(itemKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    padding: '9px 12px',
                    marginBottom: '2px',
                    fontFamily: 'inherit',
                    background: isActive ? 'linear-gradient(135deg,#3f8a63,#2f6b4c)' : 'transparent',
                    boxShadow: isActive ? '0 12px 24px -12px rgba(47,107,76,0.8)' : 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '34px',
                      height: '34px',
                      flexShrink: 0,
                      borderRadius: '99px',
                      background: isActive ? 'rgba(255,255,255,0.18)' : '#f4f5fa',
                      color: isActive ? '#fff' : '#8b8fa3',
                    }}
                  >
                    <DashIcon d={PATHS[String(ic)] || PATHS.grid} s={17} stroke={isActive ? '#fff' : '#8b8fa3'} />
                  </span>
                  <span style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <span style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: isActive ? '#fff' : '#2b2b40' }}>{label}</span>
                    {sub ? <span style={{ display: 'block', fontSize: '0.72rem', color: isActive ? 'rgba(255,255,255,0.8)' : '#a3a7bd' }}>{sub}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        {role === 'consultant' && (
          <button
            type="button"
            onClick={() => onSectionChange && onSectionChange('clients')}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border-none bg-[#2f6b4c] p-3 text-[0.86rem] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(47,107,76,0.7)] cursor-pointer"
          >
            <DashIcon d="<path d='M12 5v14M5 12h14'/>" s={16} sw={2} stroke="#fff" /> Add New Client
          </button>
        )}

        {role === 'admin' && (
          <div style={{ borderRadius: '16px', padding: '16px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#171433' }}>Platform Status</div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#3f4a5a' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.18)' }} />
              All systems operational
            </div>
            <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#8b8fa3' }}>Uptime: 99.9%</div>
          </div>
        )}

        {(role === 'derma' || role === 'consultant') && (
          <div
            onClick={() => onSectionChange && onSectionChange('assessments')}
            style={{ borderRadius: '16px', padding: '16px', background: 'linear-gradient(135deg,#e8f0ea,#f1f6f2)', border: '1px solid #cfe0d4', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', flexShrink: 0, borderRadius: '11px', background: 'rgba(47,107,76,0.14)', color: '#2f6b4c' }}>
                <DashIcon d={PATHS.spark} s={18} stroke={PUR} />
              </span>
              <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#171433' }}>Ask AI Assistant</div>
                <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>{role === 'derma' ? 'Get AI-powered clinical support' : 'Get AI-powered suggestions'}</div>
              </div>
            </div>
          </div>
        )}

        {role === 'user' && (() => {
          const isPrem = typeof window !== 'undefined' && localStorage.getItem('miracle_premium') === 'true';
          return (
            <div
              onClick={() => onSectionChange && onSectionChange('subscription')}
              style={{
                borderRadius: '16px',
                padding: '16px',
                background: isPrem ? 'linear-gradient(135deg,#6d28d9,#4338ca)' : 'linear-gradient(135deg,#3f8a63,#2f6b4c)',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.22)', color: '#fff' }}>
                  <DashIcon d="<path d='M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10z'/><path d='M5 20h14'/>" s={17} stroke="#fff" />
                </span>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
                  {isPrem ? '⭐ Pro Member (Active)' : 'Upgrade to Premium'}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                {isPrem ? 'Active Clinical Membership. Full access unlocked.' : 'Unlock detailed reports, AI scans, consultant audits & more.'}
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onSectionChange && onSectionChange('subscription');
                }}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  background: '#fff',
                  color: isPrem ? '#6d28d9' : '#2f6b4c',
                  padding: '10px',
                  fontFamily: 'inherit',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                {isPrem ? 'Manage Plan & Perks' : 'Upgrade Now →'}
              </button>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
