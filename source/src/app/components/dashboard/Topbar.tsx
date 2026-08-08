import React, { useState, useEffect } from 'react';
import { DashIcon, PATHS, PUR, FACE } from './dashboardUtils';
import type { RoleType } from './Sidebar';

interface TopbarProps {
  role: RoleType;
}

const TOPBAR_MAP: Record<RoleType, { welcome: string; subtitle: string; showSearch: boolean; searchPlaceholder?: string; notif: number; avatarPhoto: boolean; avatarBg?: string; avatarIcon: boolean; name: string; role: string }> = {
  admin:      { welcome: 'Welcome back, Admin 👋',               subtitle: "Here's what's happening on your platform today.",          showSearch: true,  searchPlaceholder: 'Search users, reports, assessments...', notif: 5, avatarIcon: true,  avatarPhoto: false, name: 'Admin User',       role: 'Super Administrator'   },
  derma:      { welcome: 'Welcome back, Dr. Meera Iyer 👋',      subtitle: "Here's an overview of your patients and clinical insights.", showSearch: true,  searchPlaceholder: 'Search patients, assessments...',         notif: 5, avatarPhoto: true, avatarBg: FACE.meeraDr, avatarIcon: false, name: 'Dr. Meera Iyer',   role: 'Dermatologist'          },
  consultant: { welcome: 'Welcome back, Dr. Priya Sharma 👋',    subtitle: "Here's what's happening with your clients today.",         showSearch: true,  searchPlaceholder: 'Search clients, assessments...',          notif: 3, avatarPhoto: true, avatarBg: FACE.priya,   avatarIcon: false, name: 'Dr. Priya Sharma', role: 'Skincare Consultant'    },
  user:       { welcome: 'Welcome back, Ananya 👋',              subtitle: "Here's your skin summary and personalized recommendations.", showSearch: false,                                                            notif: 3, avatarPhoto: true, avatarBg: FACE.ananyaUser, avatarIcon: false, name: 'Ananya Sharma',  role: 'Premium User'           },
};

export function Topbar({ role }: TopbarProps) {
  const topbar = TOPBAR_MAP[role];
  const [showProfile, setShowProfile] = useState(false);
  const [liveScore, setLiveScore] = useState<number | null>(null);

  // Load score for user profile modal
  useEffect(() => {
    if (role === 'user' && showProfile) {
      import('../../services/api').then(({ api }) => api.getLatestScore().then(d => setLiveScore(d.overall_score)).catch(() => {}));
    }
  }, [role, showProfile]);

  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Read user from localStorage
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; } })();
  const displayName = storedUser.name || topbar.name;
  const displayEmail = storedUser.email || '';

  const handleLogout = () => {
    localStorage.removeItem('miracle_token');
    localStorage.removeItem('miracle_user');
    window.location.href = '/login';
  };

  const profileModal = showProfile && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: '80px', paddingRight: '24px', background: 'rgba(23,20,51,0.18)', backdropFilter: 'blur(3px)' }} onClick={e => { if (e.target === e.currentTarget) setShowProfile(false); }}>
      <div style={{ width: '320px', borderRadius: '20px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 24px 60px -16px rgba(23,20,51,0.32)', padding: '24px', animation: 'fadeUp 0.2s ease both' }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {topbar.avatarPhoto && topbar.avatarBg ? (
              <img src={topbar.avatarBg} alt={displayName} style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <span style={{ display: 'grid', placeItems: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(47,107,76,0.12)', color: PUR, fontSize: '1.4rem', flexShrink: 0 }}>👤</span>
            )}
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#171433' }}>{displayName}</div>
              <div style={{ fontSize: '0.74rem', color: '#8b8fa3', marginTop: '2px' }}>{topbar.role}</div>
              {displayEmail && <div style={{ fontSize: '0.72rem', color: '#a3a7bd', marginTop: '2px' }}>{displayEmail}</div>}
            </div>
          </div>
          <button onClick={() => setShowProfile(false)} style={{ display: 'grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3', flexShrink: 0 }}>×</button>
        </div>

        {/* Stats for user */}
        {role === 'user' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: PUR }}>{liveScore !== null ? Math.round(liveScore) : '—'}</div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '2px' }}>Skin Score</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>88%</div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '2px' }}>Adherence</div>
            </div>
          </div>
        )}

        {/* Stats for consultants / derma */}
        {(role === 'consultant' || role === 'derma') && (
          <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#8b8fa3', marginBottom: '6px' }}>SPECIALIZATION</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#171433' }}>
              {role === 'consultant' ? 'Acne Barrier Repair & Botanical Science' : 'Severe Acne, Hyperpigmentation & Clinical Actives'}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#8b8fa3', marginTop: '6px' }}>
              {role === 'consultant' ? '8+ Years Experience' : '14+ Years Experience'}
            </div>
          </div>
        )}

        {/* Menu */}
        {[['👤', 'My Profile', ''], ['⚙️', 'Account Settings', ''], ['🔔', 'Notifications', '']].map(([icon, label], i) => (
          <button key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.86rem', color: '#3f4a5a', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f6f7fb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize: '1rem' }}>{icon}</span>{label}
          </button>
        ))}

        <div style={{ borderTop: '1px solid #edeef4', marginTop: '10px', paddingTop: '10px' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.86rem', color: '#e11d48', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(225,29,72,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <DashIcon d="<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/>" s={16} stroke="#e11d48" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {profileModal}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', padding: '30px 24px 6px', background: '#f4efe4' }}>
        <div style={{ minWidth: '220px' }}>
          <h1 style={{ margin: 0, fontSize: '1.72rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#171433' }}>{topbar.welcome}</h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#7c8199' }}>{topbar.subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {topbar.showSearch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '340px', maxWidth: '44vw', borderRadius: '14px', background: '#fff', border: '1px solid #edeef4', padding: '11px 16px', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}>
              <DashIcon d={PATHS.search} s={17} stroke="#9aa0b4" />
              <input placeholder={topbar.searchPlaceholder} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.86rem', color: '#1e1b39', minWidth: 0 }} />
              <span style={{ display: 'grid', placeItems: 'center', width: '26px', height: '26px', borderRadius: '8px', background: PUR, color: '#fff' }}>
                <DashIcon d={PATHS.search} s={13} stroke="#fff" />
              </span>
            </div>
          )}

          <button type="button" style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '46px', height: '46px', borderRadius: '14px', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', color: '#3f4a5a', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}>
            <DashIcon d={PATHS.bell} s={19} stroke="#3f4a5a" />
            <span style={{ position: 'absolute', top: '8px', right: '9px', minWidth: '16px', height: '16px', padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: '999px', background: '#f43f5e', color: '#fff', fontSize: '0.62rem', fontWeight: 700, boxShadow: '0 0 0 2px #fff' }}>
              {topbar.notif}
            </span>
          </button>

          <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '9px', borderRadius: '14px', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', padding: '11px 16px', fontFamily: 'inherit', color: '#2b2b40', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}>
            <DashIcon d={PATHS.cal} s={17} stroke={PUR} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{todayDate}</span>
            <DashIcon d="<path d='m6 9 6 6 6-6'/>" s={14} stroke="#9aa0b4" sw={2} />
          </button>

          {/* Clickable Profile Area */}
          <button
            type="button"
            onClick={() => setShowProfile(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '11px', borderRadius: '14px', border: '1px solid #edeef4', background: '#fff', padding: '8px 14px 8px 8px', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${PUR}22`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#edeef4'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px -6px rgba(23,20,51,0.2)'; }}
          >
            {topbar.avatarPhoto && topbar.avatarBg && (
              <span style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '11px', overflow: 'hidden', flexShrink: 0, background: '#e9eaf5' }}>
                <img src={topbar.avatarBg} alt={topbar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </span>
            )}
            {topbar.avatarIcon && (
              <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0, background: 'rgba(47,107,76,0.14)', color: PUR }}>
                <DashIcon d="<circle cx='12' cy='8' r='4'/><path d='M4 21a8 8 0 0 1 16 0'/>" s={19} stroke={PUR} />
              </span>
            )}
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#171433' }}>{displayName}</div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3' }}>{topbar.role}</div>
            </div>
            <DashIcon d="<path d='m6 9 6 6 6-6'/>" s={14} stroke="#9aa0b4" sw={2} />
          </button>
        </div>
      </header>
    </>
  );
}
