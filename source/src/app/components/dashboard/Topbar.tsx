import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DashIcon, PATHS, PUR, FACE } from './dashboardUtils';
import type { RoleType } from './Sidebar';

// ── Professional Calendar Picker ─────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState<Date>(today);
  const [yearMode,  setYearMode]  = useState(false);
  const [yearPage,  setYearPage]  = useState(Math.floor(today.getFullYear() / 12) * 12);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onMouse = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onMouse); };
  }, [onClose]);

  // Build calendar grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { day: number; type: 'prev'|'cur'|'next' }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'cur' });
  const trailing = 42 - cells.length;
  for (let d = 1; d <= trailing; d++) cells.push({ day: d, type: 'next' });

  const isToday  = (d: number) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (d: number) => d === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const CAL_W = '#2f6b4c'; // brand green for calendar accents
  const cellStyle = (type: string, d: number): React.CSSProperties => {
    const cur  = type === 'cur';
    const sel  = cur && isSelected(d);
    const tod  = cur && isToday(d);
    return {
      width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', fontSize: '0.82rem', fontWeight: sel ? 800 : tod ? 700 : 500,
      cursor: cur ? 'pointer' : 'default',
      background: sel ? CAL_W : 'transparent',
      color: sel ? '#fff' : tod ? CAL_W : cur ? '#0f172a' : '#b0b8cc',
      border: tod && !sel ? `1.5px solid ${CAL_W}` : 'none',
      transition: 'background 0.15s, color 0.15s',
      userSelect: 'none',
    };
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 3500,
        background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px -10px rgba(15,23,42,0.25)',
        border: '1px solid #e8eaf2', width: '310px', overflow: 'hidden',
        animation: 'calDrop 0.2s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <style>{`
        @keyframes calDrop { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .cal-cell:hover { background: #f0f9f4 !important; }
        .cal-cell-sel:hover { background: ${CAL_W} !important; }
        .cal-nav:hover { background: #f1f5f9 !important; }
        .cal-year-cell:hover { background: #f0f9f4 !important; color: ${CAL_W} !important; }
      `}</style>

      {/* Header bar */}
      <div style={{ background: CAL_W, padding: '16px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#fff' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Today</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>
            {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
      </div>

      {yearMode ? (
        /* ── Year picker grid ── */
        <div style={{ padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button className="cal-nav" onClick={() => setYearPage(p => p - 12)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1rem', color: '#64748b' }}>‹</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{yearPage} – {yearPage + 11}</span>
            <button className="cal-nav" onClick={() => setYearPage(p => p + 12)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1rem', color: '#64748b' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {Array.from({ length: 12 }, (_, i) => yearPage + i).map(yr => (
              <button
                key={yr}
                className={yr === viewYear ? 'cal-year-cell' : 'cal-year-cell'}
                onClick={() => { setViewYear(yr); setYearMode(false); }}
                style={{
                  padding: '8px 4px', borderRadius: '10px', border: yr === viewYear ? `2px solid ${CAL_W}` : '2px solid transparent',
                  background: yr === viewYear ? `${CAL_W}14` : 'transparent', color: yr === viewYear ? CAL_W : '#334155',
                  fontSize: '0.82rem', fontWeight: yr === viewYear ? 800 : 500, cursor: 'pointer', transition: 'all 0.12s',
                }}
              >{yr}</button>
            ))}
          </div>
          <button onClick={() => setYearMode(false)} style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '10px', border: `1px solid ${CAL_W}30`, background: `${CAL_W}0a`, color: CAL_W, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Back to Calendar</button>
        </div>
      ) : (
        /* ── Calendar grid ── */
        <div style={{ padding: '14px 16px 16px' }}>
          {/* Month/Year nav row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button className="cal-nav" onClick={prevMonth} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}>‹</button>
            <button
              onClick={() => setYearMode(true)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}
            >{MONTH_NAMES[viewMonth]} {viewYear} ▾</button>
            <button className="cal-nav" onClick={nextMonth} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}>›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '4px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', padding: '4px 0', letterSpacing: '0.04em' }}>{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '2px' }}>
            {cells.map((c, i) => (
              <div
                key={i}
                className={c.type === 'cur' ? (isSelected(c.day) ? 'cal-cell-sel' : 'cal-cell') : ''}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={() => { if (c.type === 'cur') setSelected(new Date(viewYear, viewMonth, c.day)); }}
              >
                <div style={cellStyle(c.type, c.day)}>{c.day}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(today); }} style={{ border: `1px solid ${CAL_W}30`, background: `${CAL_W}0a`, color: CAL_W, padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Today</button>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
              {selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface TopbarProps {
  role: RoleType;
  onSectionChange?: (section: string) => void;
}

const TOPBAR_MAP: Record<RoleType, { subtitle: string; showSearch: boolean; searchPlaceholder?: string; notif: number; avatarPhoto: boolean; avatarBg?: string; avatarIcon: boolean; fallbackName: string; role: string }> = {
  admin:      { subtitle: "Here's what's happening on your platform today.",          showSearch: true,  searchPlaceholder: 'Search users, reports, assessments...', notif: 5, avatarIcon: true,  avatarPhoto: false, fallbackName: 'Himobanta Dutta',  role: 'Super Administrator'   },
  derma:      { subtitle: "Here's an overview of your patients and clinical insights.", showSearch: true,  searchPlaceholder: 'Search patients, assessments...',         notif: 5, avatarIcon: true,  avatarPhoto: false, fallbackName: 'Dermatologist',    role: 'Dermatologist'          },
  consultant: { subtitle: "Here's what's happening with your clients today.",         showSearch: true,  searchPlaceholder: 'Search clients, assessments...',          notif: 3, avatarIcon: true,  avatarPhoto: false, fallbackName: 'Consultant',       role: 'Skincare Consultant'    },
  user:       { subtitle: "Here's your skin summary and personalized recommendations.", showSearch: false,                                                            notif: 3, avatarIcon: true,  avatarPhoto: false, fallbackName: 'there',           role: 'Premium User'           },
};

// ── Photo viewer lightbox ────────────────────────────────────────────────────
function PhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(5,4,20,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img src={src} alt={name} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '20px', objectFit: 'contain', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', display: 'block' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: -12, right: -12, width: '34px', height: '34px', borderRadius: '50%', background: '#fff', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>×</button>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: '12px', fontWeight: 500 }}>{name} · Press Esc to close</div>
      </div>
    </div>
  );
}

// ── Professional Pan & Zoom Avatar Cropper ─────────────────────────────────
function TopbarCropModal({ src, onSave, onCancel }: { src: string; onSave: (cropped: string) => void; onCancel: () => void }) {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; offX: number; offY: number }>({ x: 0, y: 0, offX: 0, offY: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const VIEW_SIZE = 280; // Size of the square view box

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  // Draw main viewport and circular preview
  useEffect(() => {
    if (!imageObj) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEW_SIZE;
    canvas.height = VIEW_SIZE;

    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Calculate base cover scaling
    const baseScale = Math.max(VIEW_SIZE / imageObj.naturalWidth, VIEW_SIZE / imageObj.naturalHeight);
    const currentScale = baseScale * zoom;

    const renderW = imageObj.naturalWidth * currentScale;
    const renderH = imageObj.naturalHeight * currentScale;

    // Centered base position + offset
    const posX = (VIEW_SIZE - renderW) / 2 + offset.x;
    const posY = (VIEW_SIZE - renderH) / 2 + offset.y;

    ctx.drawImage(imageObj, posX, posY, renderW, renderH);

    // Draw to circular mini preview
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      if (pCtx) {
        previewCanvas.width = 64;
        previewCanvas.height = 64;
        pCtx.clearRect(0, 0, 64, 64);
        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(32, 32, 32, 0, Math.PI * 2);
        pCtx.clip();
        pCtx.drawImage(canvas, 0, 0, 64, 64);
        pCtx.restore();
      }
    }
  }, [imageObj, zoom, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.offX + dx, y: dragStart.current.offY + dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom(z => Math.min(Math.max(1, z + delta), 3.5));
  };

  const handleSave = () => {
    if (!imageObj) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 400;
    outCanvas.height = 400;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    const baseScale = Math.max(VIEW_SIZE / imageObj.naturalWidth, VIEW_SIZE / imageObj.naturalHeight);
    const currentScale = baseScale * zoom;
    const renderW = imageObj.naturalWidth * currentScale;
    const renderH = imageObj.naturalHeight * currentScale;
    const posX = (VIEW_SIZE - renderW) / 2 + offset.x;
    const posY = (VIEW_SIZE - renderH) / 2 + offset.y;

    // Scale from VIEW_SIZE (280) to 400px high-def output
    const outScale = 400 / VIEW_SIZE;
    ctx.drawImage(imageObj, posX * outScale, posY * outScale, renderW * outScale, renderH * outScale);
    onSave(outCanvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', width: '380px', maxWidth: '92vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Crop Profile Photo</div>
          <button onClick={onCancel} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', color: '#64748b', display: 'grid', placeItems: 'center' }}>×</button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748b' }}>Drag to position & use slider to zoom</p>

        {/* Viewport Box */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: VIEW_SIZE,
            height: VIEW_SIZE,
            margin: '0 auto',
            borderRadius: '20px',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: '#090d16',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
            userSelect: 'none',
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

          {/* Circular mask guide overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: '50%',
            border: '2px dashed rgba(255,255,255,0.85)',
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.5)',
          }} />
        </div>

        {/* Zoom Slider */}
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: PUR, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700, width: '38px', textAlign: 'right' }}>{Math.round(zoom * 100)}%</span>
        </div>

        {/* Preview & Action Buttons */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid #edf2f7' }}>
          <canvas ref={previewCanvasRef} style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${PUR}`, background: '#fff', flexShrink: 0 }} />
          <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Live Avatar Preview</span><br />
            Adjust position until centered
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontFamily: 'inherit', fontSize: '0.86rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '11px', borderRadius: '12px', border: 'none', background: PUR, color: '#fff', fontFamily: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}40` }}>Apply & Save</button>
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
  const [showCalendar, setShowCalendar] = useState(false);
  const calBtnRef = useRef<HTMLDivElement>(null);
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

  const [viewPhoto, setViewPhoto] = useState(false);

  const dpMenuItems = [
    ...(customDp ? [
      { label: '👁️ View photo', action: () => { setShowDpMenu(false); setViewPhoto(true); }, danger: false },
    ] : []),
    { label: customDp ? '🔄 Change photo' : '📤 Upload photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }, danger: false },
    ...(customDp ? [
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
                <img src={currentAvatar} alt={displayName} onClick={() => setViewPhoto(true)} style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: `2px solid ${PUR}30`, display: 'block', cursor: 'pointer' }} title="Click to view full photo" />
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
        {([['👤', 'My Profile', 'my-profile'], ['⚙️', 'Account Settings', 'account-settings'], ['🔔', 'Notifications', 'notifications']] as [string, string, string][]).map(([icon, label, section], i) => (
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
      {viewPhoto && currentAvatar && <PhotoViewer src={currentAvatar} name={displayName} onClose={() => setViewPhoto(false)} />}
      {cropSrc && <TopbarCropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}
      {profileModal}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700;800&display=swap');
        .miracle-topbar-heading {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 2.3rem;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: #1a1a2e;
          margin: 0;
          line-height: 1.15;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .miracle-topbar-heading .wb-name {
          color: ${PUR};
          font-weight: 800;
        }
        .miracle-topbar-heading .wb-emoji {
          display: inline-block;
          font-size: 1.9rem;
          margin-left: 2px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          transform-origin: 70% 70%;
          animation: wave 2.2s infinite ease-in-out;
        }
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', padding: '30px 24px 6px', background: '#f4efe4' }}>
        <div style={{ minWidth: '220px' }}>
          <h1 className="miracle-topbar-heading">
            Welcome back, <span className="wb-name">{firstName}</span> <span className="wb-emoji">👋</span>
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
            onClick={() => onSectionChange && onSectionChange((role === 'admin' || role === 'consultant') ? 'notifications' : 'reminders')}
            style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '46px', height: '46px', borderRadius: '14px', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', color: '#3f4a5a', boxShadow: '0 2px 10px -6px rgba(23,20,51,0.2)' }}
          >
            <DashIcon d={PATHS.bell} s={19} stroke="#3f4a5a" />
            {unreadNotifs > 0 && (
              <span style={{ position: 'absolute', top: '8px', right: '9px', minWidth: '16px', height: '16px', padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: '999px', background: '#f43f5e', color: '#fff', fontSize: '0.62rem', fontWeight: 700, boxShadow: '0 0 0 2px #fff' }}>
                {unreadNotifs}
              </span>
            )}
          </button>

          <div ref={calBtnRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowCalendar(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', borderRadius: '14px', border: `1px solid ${showCalendar ? PUR : '#edeef4'}`, background: '#fff', cursor: 'pointer', padding: '11px 16px', fontFamily: 'inherit', color: '#2b2b40', boxShadow: showCalendar ? `0 0 0 3px ${PUR}18, 0 2px 10px -6px rgba(23,20,51,0.2)` : '0 2px 10px -6px rgba(23,20,51,0.2)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            >
              <DashIcon d={PATHS.cal} s={17} stroke={PUR} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{todayDate}</span>
              <DashIcon d={showCalendar ? "<path d='m6 15 6-6 6 6'/>" : "<path d='m6 9 6 6 6-6'/>"} s={14} stroke="#9aa0b4" sw={2} />
            </button>
            {showCalendar && <CalendarPicker onClose={() => setShowCalendar(false)} />}
          </div>

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
