import { Link } from 'react-router';
import { DashIcon, PATHS, PUR } from './dashboardUtils';

export type RoleType = 'admin' | 'derma' | 'consultant' | 'user';

interface SidebarProps {
  role: RoleType;
}

const N = {
  admin: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', 'Overview & Analytics', 'grid', true],
        ['User Management', 'Manage users & roles', 'users', false],
        ['Role & Permissions', 'Manage roles & access', 'shield', false],
        ['Skin Assessments', 'View all assessments', 'clip', false],
        ['Routine Management', 'Manage routines & plans', 'cal', false],
        ['Product Management', 'Manage products', 'box', false],
        ['Ingredient Database', 'Manage ingredients', 'beaker', false],
        ['Content Management', 'Manage articles & resources', 'doc', false],
        ['Reports & Analytics', 'Platform reports', 'trend', false],
        ['Notifications', 'System notifications', 'bell', false],
        ['System Settings', 'Configure platform settings', 'gear', false],
      ],
    },
    {
      heading: 'SYSTEM & SECURITY',
      items: [
        ['Audit Logs', 'System activity logs', 'log', false],
        ['Security & Access', 'Manage security settings', 'lock', false],
        ['Backup & Restore', 'Data backup & restore', 'db', false],
      ],
    },
  ],
  derma: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', 'Overview & key insights', 'home', true],
        ['Patients', 'Manage patient profiles', 'users', false],
        ['Assessments', 'Skin assessments & analysis', 'clip', false],
        ['Clinical Insights', 'AI insights & risk analysis', 'spark', false],
        ['Treatment Plans', 'Create & manage plans', 'note', false],
        ['Progress Tracking', 'Monitor patient progress', 'trend', false],
        ['Prescriptions', 'Manage prescriptions', 'pill', false],
        ['Reports', 'Clinical reports & analytics', 'doc', false],
        ['Consultations', 'Appointments & notes', 'chat', false],
        ['Follow-ups', 'Follow-up tracking', 'refresh', false],
        ['Reminders', 'Treatment reminders', 'bell', false],
      ],
    },
    {
      heading: 'TOOLS & RESOURCES',
      items: [
        ['Ingredient Database', 'Search & analyze ingredients', 'beaker', false],
        ['Treatment Protocols', 'Clinical treatment guides', 'book', false],
        ['Skin Conditions Guide', 'Reference & solutions', 'book', false],
        ['Research & Publications', 'Latest dermatology research', 'beaker', false],
      ],
    },
  ],
  consultant: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', 'Overview & key metrics', 'home', true],
        ['Clients', 'Manage client profiles', 'users', false],
        ['Assessments', 'Skin assessments & analysis', 'clip', false],
        ['Routine Plans', 'Create & manage routines', 'cal', false],
        ['Product Recommendations', 'View & recommend products', 'thumb', false],
        ['Progress Tracking', 'Track client progress', 'trend', false],
        ['Reports', 'Client reports & analytics', 'doc', false],
        ['Follow-ups & Notes', 'Notes & follow-up history', 'note', false],
        ['Reminders', 'Appointments & reminders', 'bell', false],
      ],
    },
    {
      heading: 'TOOLS & RESOURCES',
      items: [
        ['Ingredient Database', 'Search & analyze ingredients', 'beaker', false],
        ['Skin Concerns Guide', 'Reference & solutions', 'book', false],
        ['Treatment Protocols', 'Clinical treatment guides', 'book', false],
      ],
    },
  ],
  user: [
    {
      heading: 'MAIN MENU',
      items: [
        ['Dashboard', '', 'home', true],
        ['My Skin Profile', 'View & update your profile', 'users', false],
        ['Skin Assessment', 'Analyze your skin condition', 'clip', false],
        ['My Routine', 'Your personalized routine', 'cal', false],
        ['Product Recommendations', 'Products for your skin', 'box', false],
        ['Ingredient Analyzer', 'Check ingredients & safety', 'search', false],
        ['Progress Tracking', 'Track your skin progress', 'trend', false],
        ['Lifestyle & Habits', 'Sleep, water & lifestyle', 'heart', false],
        ['Reports', 'View & download reports', 'doc', false],
        ['Reminders', 'Routine & habit reminders', 'bell', false],
        ['Settings', 'Account & preferences', 'gear', false],
      ],
    },
    {
      heading: 'QUICK ACTIONS',
      items: [
        ['Skin Scan', 'Start new skin assessment', 'scan', false],
        ['Ask AI', 'Get skincare guidance', 'spark', false],
        ['Upload Photo', 'Analyze your skin', 'upload', false],
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

export function Sidebar({ role }: SidebarProps) {
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
            {g.items.map(([label, sub, ic, active]) => {
              const isActive = Boolean(active);
              return (
                <button
                  key={String(label)}
                  type="button"
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
                      borderRadius: '9px',
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
          <div style={{ borderRadius: '16px', padding: '16px', background: 'linear-gradient(135deg,#e8f0ea,#f1f6f2)', border: '1px solid #cfe0d4' }}>
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

        {role === 'user' && (
          <div style={{ borderRadius: '16px', padding: '16px', background: 'linear-gradient(135deg,#3f8a63,#2f6b4c)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.22)', color: '#fff' }}>
                <DashIcon d="<path d='M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10z'/><path d='M5 20h14'/>" s={17} stroke="#fff" />
              </span>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Upgrade to Premium</div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>
              Unlock AI insights, advanced reports & more.
            </div>
            <button
              type="button"
              style={{ marginTop: '12px', width: '100%', border: 'none', cursor: 'pointer', borderRadius: '10px', background: '#fff', color: '#2f6b4c', padding: '10px', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
