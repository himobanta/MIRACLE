import React, { useState, useEffect, useRef } from 'react';
import { DashIcon, PATHS, PUR, FACE } from './dashboardUtils';
import type { RoleType } from './Sidebar';

interface TopbarProps {
  role: RoleType;
  onSectionChange?: (section: string) => void;
}

const TOPBAR_MAP: Record<RoleType, { subtitle: string; showSearch: boolean; searchPlaceholder?: string; notif: number; avatarPhoto: boolean; avatarBg?: string; avatarIcon: boolean; fallbackName: string; role: string }> = {
  admin:      { subtitle: "Here's what's happening on your platform today.",          showSearch: true,  searchPlaceholder: 'Search users, reports, assessments...', notif: 5, avatarIcon: true,  avatarPhoto: false, fallbackName: 'Himobanta Dutta',  role: 'Super Administrator'   },
  derma:      { subtitle: "Here's an overview of your patients and clinical insights.", showSearch: true,  searchPlaceholder: 'Search patients, assessments...',         notif: 5, avatarPhoto: true, avatarBg: FACE.meeraDr, avatarIcon: false, fallbackName: 'Dermatologist',    role: 'Dermatologist'          },
  consultant: { subtitle: "Here's what's happening with your clients today.",         showSearch: true,  searchPlaceholder: 'Search clients, assessments...',          notif: 3, avatarPhoto: true, avatarBg: FACE.priya,   avatarIcon: false, fallbackName: 'Consultant',       role: 'Skincare Consultant'    },
  user:       { subtitle: "Here's your skin summary and personalized recommendations.", showSearch: false,                                                            notif: 3, avatarPhoto: true, avatarBg: FACE.ananyaUser, avatarIcon: false, fallbackName: 'there',           role: 'Premium User'           },
};

// ── Inline crop modal ────────────────────────────────────────────────────────
function TopbarCropModal({ src, onSave, onCancel }: { src: string; onSave: (cropped: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, cx: 0, cy: 0 });
  const previewSize = 280;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      setCrop({ x: (img.naturalWidth - s) / 2, y: (img.naturalHeight - s) / 2, size: s });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !crop.size) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = previewSize; canvas.height = previewSize;
    ctx.clearRect(0, 0, previewSize, previewSize);
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const cropDisplaySize = crop.size / scaleX;
    const cropDisplayX = crop.x / scaleX;
    const cropDisplayY = crop.y / scaleY;
    ctx.drawImage(img, cropDisplayX, cropDisplayY, cropDisplaySize, cropDisplaySize, 0, 0, previewSize, previewSize);
  }, [crop, src]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { setDragging(true); setDragStart({ mx: e.clientX, cx: crop.x, cy: crop.y }); };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const img = imgRef.current; if (!img) return;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const newX = Math.max(0, Math.min(dragStart.cx + (e.clientX - dragStart.mx) * scaleX, img.naturalWidth - crop.size));
    const newY = Math.max(0, Math.min(dragStart.cy + (e.clientX - dragStart.mx) * scaleY, img.naturalHeight - crop.size));
    setCrop(c => ({ ...c, x: newX, y: newY }));
  };

  const handleSave = () => {
    const img = imgRef.current; if (!img || !crop.size) return;
    const out = document.createElement('canvas'); out.width = 300; out.height = 300;
    const ctx = out.getContext('2d'); if (!ctx) return;
    const sX = img.naturalWidth / img.width; const sY = img.naturalHeight / img.height;
    ctx.drawImage(img, crop.x / sX, crop.y / sY, crop.size / sX, crop.size / sY, 0, 0, 300, 300);
    onSave(out.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(10,8,30,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '380px', maxWidth: '96vw', boxShadow: '0 32px 80px -20px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#171433', marginBottom: '4px' }}>Crop your photo</div>
        <div style={{ fontSize: '0.78rem', color: '#8b8fa3', marginBottom: '16px' }}>Drag to reposition · Square crop applied</div>
        <div style={{ position: 'relative', background: '#0a0820', borderRadius: '14px', overflow: 'hidden', cursor: 'move', userSelect: 'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
          <img ref={imgRef} src={src} alt="crop" style={{ width: '100%', display: 'block', opacity: 0.42, pointerEvents: 'none' }} draggable={false} />
          {crop.size > 0 && imgRef.current && (() => {
            const img = imgRef.current!;
            const sX = img.naturalWidth / img.width;
            const sY = img.naturalHeight / img.height;
            const dx = crop.x / sX, dy = crop.y / sY, ds = crop.size / sX;
            return (
              <div style={{ position: 'absolute', left: dx, top: dy, width: ds, height: ds, outline: `2px solid ${PUR}`, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  <img src={src} alt="" style={{ position: 'absolute', left: -dx, top: -dy, width: img.width, opacity: 1, pointerEvents: 'none' }} draggable={false} />
                </div>
              </div>
            );
          })()}
        </div>
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <canvas ref={canvasRef} width={previewSize} height={previewSize} style={{ width: '60px', height: '60px', borderRadius: '14px', border: `2px solid ${PUR}40` }} />
          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>This is how your<br />profile photo will look</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid #edeef4', background: '#f6f7fb', fontFamily: 'inherit', fontSize: '0.86rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '11px', borderRadius: '12px', border: 'none', background: PUR, color: '#fff', fontFamily: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}>Save Photo</button>
        </div>
      </div>
    </div>
  );
}

export function Topbar({ role, onSectionChange }: TopbarProps) {
  const topbar = TOPBAR_MAP[role];
  const [showProfile, setShowProfile] = useState(false);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [adherencePct, setAdherencePct] = useState<number | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [showDpMenu, setShowDpMenu] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const dpMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read user from localStorage with reactive updates — applies to ALL roles
  const [storedUser, setStoredUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setStoredUser(JSON.parse(localStorage.getItem('miracle_user') || '{}'));
      } catch {
        setStoredUser({});
      }
    };
    window.addEventListener('miracle_user_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('miracle_user_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close DP menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dpMenuRef.current && !dpMenuRef.current.contains(e.target as Node)) {
        setShowDpMenu(false);
      }
    };
    if (showDpMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDpMenu]);

  // Load score + live adherence for user profile modal
  useEffect(() => {
    if (role === 'user' && showProfile) {
      import('../../services/api').then(({ api }) => {
        api.getLatestScore().then(d => setLiveScore(d.overall_score)).catch(() => {});
        // Compute real adherence from routine logs
        api.getRoutineLogs().then((data: any) => {
          if (data && Array.isArray(data.logs) && data.logs.length > 0) {
            const last7 = data.logs.slice(-7);
            const avgCompletion = last7.reduce((sum: number, log: any) => {
              const steps = Array.isArray(log.completed_steps) ? log.completed_steps.length : 0;
              return sum + Math.min(steps / 5, 1); // 5 = total checklist items
            }, 0) / last7.length;
            setAdherencePct(Math.round(avgCompletion * 100));
          }
        }).catch(() => {});
      });
    }
  }, [role, showProfile]);

  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Custom DP
  const dpKey = `miracle_dp_${storedUser.id || storedUser.email || role}`;
  const [customDp, setCustomDp] = useState<string | null>(() => localStorage.getItem(dpKey) || null);

  const handleDpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCropSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
    setShowDpMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropSave = (cropped: string) => {
    setCustomDp(cropped);
    localStorage.setItem(dpKey, cropped);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setCropSrc(null);
  };

  const handleRemoveDp = () => {
    setCustomDp(null);
    localStorage.removeItem(dpKey);
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
  };

  // Always use actual stored user name — for ALL roles, not just user
  // Admin role always shows Himobanta Dutta
  const displayName = role === 'admin' ? (storedUser.name || 'Himobanta Dutta') : (storedUser.name || topbar.fallbackName);
  const displayEmail = role === 'admin' ? (storedUser.email || 'admin@miracle.com') : (storedUser.email || '');
  const firstName = role === 'admin' ? 'Himobanta' : (displayName ? displayName.split(' ')[0] : 'there');
  const currentAvatar = customDp || (topbar.avatarPhoto ? topbar.avatarBg : null);

  const dpMenuItems = [
    { label: '📤 Upload photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); } },
    ...(customDp ? [
      { label: '🔄 Change photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }, danger: false },
      { label: '🗑️ Remove photo', action: handleRemoveDp, danger: true },
    ] : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('miracle_token');
    localStorage.removeItem('miracle_user');
    window.location.href = '/login';
  };

  const profileModal = showProfile && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: '80px', paddingRight: '24px', background: 'rgba(23,20,51,0.18)', backdropFilter: 'blur(3px)' }} onClick={e => { if (e.target === e.currentTarget) setShowProfile(false); }}>
      <div style={{ width: '330px', borderRadius: '20px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 24px 60px -16px rgba(23,20,51,0.32)', padding: '24px', animation: 'fadeUp 0.2s ease both' }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Avatar with camera dropdown */}
            <div ref={dpMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              {currentAvatar ? (
                <img src={currentAvatar} alt={displayName} style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: `2px solid ${PUR}30`, display: 'block' }} />
              ) : (
                <span style={{ display: 'grid', placeItems: 'center', width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(47,107,76,0.12)', color: PUR, fontSize: '1.6rem' }}>👤</span>
              )}
              <button
                type="button"
                onClick={() => setShowDpMenu(v => !v)}
                style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '24px', height: '24px', borderRadius: '50%', background: PUR, border: '2px solid #fff', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '0.68rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', padding: 0 }}
                title="Profile photo options"
              >📷</button>
              {showDpMenu && (
                <div style={{ position: 'absolute', top: '105%', left: 0, zIndex: 2000, background: '#fff', borderRadius: '12px', border: '1px solid #e8eaf2', boxShadow: '0 12px 36px -8px rgba(23,20,51,0.22)', minWidth: '172px', overflow: 'hidden', animation: 'fadeUp 0.15s ease both' }}>
                  {dpMenuItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.84rem', color: item.danger ? '#e11d48' : '#2d3748', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(225,29,72,0.07)' : '#f6f7fb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{item.label}</button>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleDpUpload} style={{ display: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#171433' }}>{displayName}</div>
              <div style={{ fontSize: '0.72rem', color: PUR, fontWeight: 700, marginTop: '2px' }}>{topbar.role}</div>
              {displayEmail && <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '2px' }}>{displayEmail}</div>}
            </div>
          </div>
          <button onClick={() => setShowProfile(false)} style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3', flexShrink: 0 }}>×</button>
        </div>

        {/* Stats for user */}
        {role === 'user' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: PUR }}>{liveScore !== null ? Math.round(liveScore) : '—'}</div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '2px' }}>Skin Score</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{adherencePct !== null ? `${adherencePct}%` : '—'}</div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '2px' }}>Adherence (7d)</div>
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
        {([['👤', 'My Profile', 'settings'], ['⚙️', 'Account Settings', 'account-settings'], ['🔔', 'Notifications', 'notifications']] as [string, string, string][]).map(([icon, label, section], i) => (
          <button key={i} onClick={() => { if (section && onSectionChange) { onSectionChange(section); setShowProfile(false); } }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.86rem', color: '#3f4a5a', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f6f7fb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
      {cropSrc && <TopbarCropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}
      {profileModal}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,600;1,700&display=swap');
        .miracle-topbar-heading {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 2.1rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #1a1a2e;
          margin: 0;
          line-height: 1.18;
        }
        .miracle-topbar-heading .wb-name {
          color: ${PUR};
          font-style: italic;
          font-weight: 700;
        }
      `}</style>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', padding: '30px 24px 6px', background: '#f4efe4' }}>
        <div style={{ minWidth: '220px' }}>
          <h1 className="miracle-topbar-heading">
            Welcome back, <span className="wb-name">{firstName}</span> 👋
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>{topbar.subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {topbar.showSearch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '340px', maxWidth: '44vw', borderRadius: '14px', background: '#fff', border: '1px solid #edeef4', padding: '11px 16px', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}>
              <DashIcon d={PATHS.search} s={17} stroke="#9aa0b4" />
              <input
                placeholder={topbar.searchPlaceholder}
                onChange={e => {
                  window.dispatchEvent(new CustomEvent('miracle_global_search', { detail: e.target.value }));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && onSectionChange) {
                    const targetSection = role === 'admin' ? 'user-management' : role === 'derma' ? 'patients' : 'clients';
                    onSectionChange(targetSection);
                  }
                }}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.86rem', color: '#1e1b39', minWidth: 0 }}
              />
              <span
                onClick={() => {
                  if (onSectionChange) {
                    const targetSection = role === 'admin' ? 'user-management' : role === 'derma' ? 'patients' : 'clients';
                    onSectionChange(targetSection);
                  }
                }}
                style={{ display: 'grid', placeItems: 'center', width: '26px', height: '26px', borderRadius: '8px', background: PUR, color: '#fff', cursor: 'pointer' }}
              >
                <DashIcon d={PATHS.search} s={13} stroke="#fff" />
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onSectionChange && onSectionChange(role === 'admin' ? 'notifications' : 'reminders')}
            style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '46px', height: '46px', borderRadius: '14px', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', color: '#3f4a5a', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}
          >
            <DashIcon d={PATHS.bell} s={19} stroke="#3f4a5a" />
            {unreadNotifs > 0 && (
              <span style={{ position: 'absolute', top: '8px', right: '9px', minWidth: '16px', height: '16px', padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: '999px', background: '#f43f5e', color: '#fff', fontSize: '0.62rem', fontWeight: 700, boxShadow: '0 0 0 2px #fff' }}>
                {unreadNotifs}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSectionChange && onSectionChange('reminders')}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', borderRadius: '14px', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', padding: '11px 16px', fontFamily: 'inherit', color: '#2b2b40', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}
          >
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
            {currentAvatar ? (
              <span style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '11px', overflow: 'hidden', flexShrink: 0, background: '#e9eaf5', border: `1px solid ${PUR}30` }}>
                <img src={currentAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </span>
            ) : (
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
