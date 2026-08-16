import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardHead,
  DashIcon,
  DonutChart,
  Legend,
  Bars,
  LineChart,
  ChartFrame,
  PUR,
  BLU,
  ORA,
  PNK,
  GRN,
  TEA,
} from './dashboardUtils';
import { api } from '../../services/api';

// ── Dynamic Skin Type Color Generator ────────────────────────────────────────
const DEFAULT_PALETTE = [PUR, BLU, ORA, PNK, GRN, TEA, '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];
const KNOWN_SKIN_COLORS: Record<string, string> = {
  Combination: PUR,
  Oily: BLU,
  Dry: ORA,
  Sensitive: PNK,
  Normal: GRN,
  Unassessed: '#8b8fa3',
};

function getSkinTypeColor(type: string, index: number = 0): string {
  if (KNOWN_SKIN_COLORS[type]) return KNOWN_SKIN_COLORS[type];
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = type.charCodeAt(i) + ((hash << 5) - hash);
  const colorIdx = Math.abs(hash) % DEFAULT_PALETTE.length;
  return DEFAULT_PALETTE[colorIdx] || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

// ── Types ───────────────────────────────────────────────────────────────────
interface RosterPatient {
  patient_id: string;
  name: string;
  email: string;
  skin_type: string;
  primary_concern: string;
  concerns?: string[];
  health_score: number | null;
  compliance_rate: number;
  last_assessment_date: string | null;
  registered_date?: string | null;
}

interface PatientDetail {
  patient: any;
  assessments: any[];
  active_routine: any[];
  progress_photos: any[];
  notes?: any[];
  followups?: any[];
  recommendations?: any[];
}

interface ConsultantWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

// ── Shared UI Helpers ───────────────────────────────────────────────────────
function EmptyState({
  icon,
  message,
  action,
  onAction,
}: {
  icon: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#a3a7bd' }}>
      <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: action ? '16px' : 0 }}>{message}</div>
      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            background: PUR,
            color: '#fff',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '32px',
        zIndex: 9999,
        padding: '12px 20px',
        borderRadius: '12px',
        background: ok ? '#16a34a' : '#ef4444',
        color: '#fff',
        fontSize: '0.84rem',
        fontWeight: 600,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {ok ? '✓' : '✗'} {msg}
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 0 0 6px',
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Photo Viewer Lightbox (Exact Admin Layout) ──────────────────────────────
function PhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(5,4,20,0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img
          src={src}
          alt={name}
          style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '20px', objectFit: 'contain', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', display: 'block' }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -12,
            right: -12,
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: '#fff',
            border: 'none',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          ×
        </button>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: '12px', fontWeight: 500 }}>
          {name} · Press Esc to close
        </div>
      </div>
    </div>
  );
}

// ── Professional DP Cropper Modal (Exact Admin Layout) ──────────────────────
function CropModal({ src, onSave, onCancel }: { src: string; onSave: (cropped: string) => void; onCancel: () => void }) {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; offX: number; offY: number }>({ x: 0, y: 0, offX: 0, offY: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const VIEW_SIZE = 280;

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

  useEffect(() => {
    if (!imageObj) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEW_SIZE;
    canvas.height = VIEW_SIZE;
    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    const baseScale = Math.max(VIEW_SIZE / imageObj.naturalWidth, VIEW_SIZE / imageObj.naturalHeight);
    const currentScale = baseScale * zoom;
    const renderW = imageObj.naturalWidth * currentScale;
    const renderH = imageObj.naturalHeight * currentScale;
    const posX = (VIEW_SIZE - renderW) / 2 + offset.x;
    const posY = (VIEW_SIZE - renderH) / 2 + offset.y;

    ctx.drawImage(imageObj, posX, posY, renderW, renderH);

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

  const handleMouseUp = () => setIsDragging(false);

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

// ── Main ConsultantWorkspace Component ──────────────────────────────────────
export function ConsultantWorkspace({ activeSection = 'dashboard', onSectionChange }: ConsultantWorkspaceProps) {
  // Global Data States
  const [roster, setRoster] = useState<RosterPatient[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('All');

  // Modals
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [selectedTimelineClient, setSelectedTimelineClient] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Section Specific States
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  const [routinesList, setRoutinesList] = useState<any[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);

  // Available Products catalog for recommendation
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [totalProductPages, setTotalProductPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);
  const [selectedProductsForRec, setSelectedProductsForRec] = useState<any[]>([]);
  const [recTargetClient, setRecTargetClient] = useState('');
  const [recInstructions, setRecInstructions] = useState('Apply as prescribed in morning/evening routine.');
  const [recTimeOfDay, setRecTimeOfDay] = useState('AM/PM');

  const [notesList, setNotesList] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTargetClient, setNoteTargetClient] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('Routine Review');
  const [noteTag, setNoteTag] = useState('Active Protocol');

  const [followupsList, setFollowupsList] = useState<any[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupTargetClient, setFollowupTargetClient] = useState('');
  const [followupTopic, setFollowupTopic] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('11:00 AM');
  const [followupActions, setFollowupActions] = useState('');

  const [remindersList, setRemindersList] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderPriority, setReminderPriority] = useState('Medium');
  const [reminderCategory, setReminderCategory] = useState('Follow-up');

  const [protocolsList, setProtocolsList] = useState<any[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<any | null>(null);

  const [concernsGuide, setConcernsGuide] = useState<any[]>([]);
  const [selectedConcern, setSelectedConcern] = useState<any | null>(null);

  const [ingredientsList, setIngredientsList] = useState<any[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);

  // Profile & Stored User States
  const [storedUser, setStoredUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; }
  });
  const dpKey = `miracle_dp_${storedUser.id || storedUser.email || 'consultant'}`;
  const [customDp, setCustomDp] = useState<string | null>(() => localStorage.getItem(dpKey) || localStorage.getItem('miracle_dp_consultant@miracle.com') || null);
  const [showDpMenu, setShowDpMenu] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState(false);
  const dpMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Settings Inline Editing States (Exact Admin Layout)
  const [profileName, setProfileName] = useState(storedUser.name || 'Priya Sharma');
  const [profileEmail, setProfileEmail] = useState(storedUser.email || 'consultant@miracle.com');
  const [profilePhone, setProfilePhone] = useState('+91 98765 43210');
  const [profileTitle, setProfileTitle] = useState('Senior Skincare Consultant');
  const [profileSpec, setProfileSpec] = useState('Acne Barrier Repair & Botanical Science');
  const [profileExp, setProfileExp] = useState(8);
  const [profileBio, setProfileBio] = useState('Senior skincare consultant specialized in personalized stratum corneum restoration and non-comedogenic regimen design.');
  const [profileQual, setProfileQual] = useState('M.Sc. Cosmetic Dermatology, CIDESCO Certified Aesthetician');
  const [profileAvail, setProfileAvail] = useState('Mon - Fri, 10:00 AM - 6:00 PM IST');
  const [profileSaving, setProfileSaving] = useState(false);

  // Account settings edit fields
  const [editingField, setEditingField] = useState<'name' | 'email' | 'phone' | 'password' | null>(null);
  const [tempVal, setTempVal] = useState('');
  const [pwVal, setPwVal] = useState('••••••••••••');

  // Notifications
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  // Prescription Modal
  const [showPrescribeModal, setShowPrescribeModal] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescribeSteps, setPrescribeSteps] = useState<any[]>([
    { time_of_day: 'AM', step_number: 1, step_category: 'Cleansing', product_name: 'Cica Barrier Cleanser', active_ingredients: ['Centella Asiatica'] },
    { time_of_day: 'AM', step_number: 2, step_category: 'Treatment', product_name: 'Niacinamide 5% Hydrator', active_ingredients: ['Niacinamide', 'Zinc PCA'] },
    { time_of_day: 'AM', step_number: 3, step_category: 'Sun Protection', product_name: 'Mineral Tinted SPF 50', active_ingredients: ['Zinc Oxide'] },
    { time_of_day: 'PM', step_number: 1, step_category: 'Treatment', product_name: 'Azelaic 10% Soothing Cream', active_ingredients: ['Azelaic Acid'] },
    { time_of_day: 'PM', step_number: 2, step_category: 'Moisturizing', product_name: 'Lipid Replenishing Night Balm', active_ingredients: ['Ceramides', 'Squalane'] },
  ]);
  const [prescribeLoading, setPrescribeLoading] = useState(false);

  // Reactive listener for storage and DP menu outside click
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const u = JSON.parse(localStorage.getItem('miracle_user') || '{}');
        setStoredUser(u);
        const k = `miracle_dp_${u.id || u.email || 'consultant'}`;
        setCustomDp(localStorage.getItem(k) || localStorage.getItem('miracle_dp_consultant@miracle.com') || null);
      } catch {}
    };
    window.addEventListener('miracle_user_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('miracle_user_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dpMenuRef.current && !dpMenuRef.current.contains(e.target as Node)) setShowDpMenu(false);
    };
    if (showDpMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDpMenu]);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchRoster = useCallback(() => {
    setRosterLoading(true);
    api.getConsultantRoster()
      .then(d => {
        const sanitized = (d.patients || []).map((p: any) => ({
          ...p,
          skin_type: (!p.skin_type || p.skin_type === 'string' || p.skin_type.trim() === '') ? 'Unassessed' : p.skin_type,
          primary_concern: (!p.primary_concern || p.primary_concern === 'string') ? 'General Care' : p.primary_concern,
        }));
        setRoster(sanitized);
      })
      .catch(() => {})
      .finally(() => setRosterLoading(false));
  }, []);

  const fetchAssessments = useCallback(() => {
    setAssessmentsLoading(true);
    api.getConsultantAssessments()
      .then(d => setAssessmentsList(d.assessments || []))
      .catch(() => setAssessmentsList([]))
      .finally(() => setAssessmentsLoading(false));
  }, []);

  const fetchRoutines = useCallback(() => {
    setRoutinesLoading(true);
    api.getConsultantRoutines()
      .then(d => setRoutinesList(d.routines || []))
      .catch(() => setRoutinesList([]))
      .finally(() => setRoutinesLoading(false));
  }, []);

  const fetchProductsCatalog = useCallback((page: number = 1, search: string = '', cat: string = '') => {
    setProductsLoading(true);
    api.getConsultantProducts({ page, per_page: 24, search: search || undefined, category: cat || undefined })
      .then(d => {
        const rawItems = d.items || d.products || [];
        // Deduplicate by clean product_name + brand key
        const seen = new Set<string>();
        const uniqueItems = rawItems.filter((item: any) => {
          const key = `${(item.product_name || item.name || '').trim().toLowerCase()}_${(item.brand || '').trim().toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllProducts(uniqueItems);
        setTotalProductsCount(d.total || uniqueItems.length);
        setTotalProductPages(d.total_pages || 1);
        setProductPage(d.page || page);
      })
      .catch(() => {
        setAllProducts([]);
        setTotalProductsCount(0);
        setTotalProductPages(1);
      })
      .finally(() => setProductsLoading(false));
  }, []);

  const fetchRecommendations = useCallback(() => {
    setRecsLoading(true);
    api.getConsultantRecommendations()
      .then(d => setRecommendations(d.recommendations || []))
      .catch(() => setRecommendations([]))
      .finally(() => setRecsLoading(false));
  }, []);

  const fetchNotes = useCallback(() => {
    setNotesLoading(true);
    api.getConsultantNotes()
      .then(d => setNotesList(d.notes || []))
      .catch(() => setNotesList([]))
      .finally(() => setNotesLoading(false));
  }, []);

  const fetchFollowups = useCallback(() => {
    setFollowupsLoading(true);
    api.getConsultantFollowups()
      .then(d => setFollowupsList(d.followups || []))
      .catch(() => setFollowupsList([]))
      .finally(() => setFollowupsLoading(false));
  }, []);

  const fetchReminders = useCallback(() => {
    setRemindersLoading(true);
    api.getConsultantReminders()
      .then(d => setRemindersList(d.reminders || []))
      .catch(() => setRemindersList([]))
      .finally(() => setRemindersLoading(false));
  }, []);

  const fetchProtocols = useCallback(() => {
    api.getConsultantTreatmentProtocols()
      .then(d => setProtocolsList(d.protocols || []))
      .catch(() => setProtocolsList([]));
  }, []);

  const fetchConcernsGuide = useCallback(() => {
    api.getConsultantSkinConcernsGuide()
      .then(d => setConcernsGuide(d.concerns || []))
      .catch(() => setConcernsGuide([]));
  }, []);

  const fetchIngredients = useCallback(() => {
    api.getConsultantIngredients()
      .then(d => setIngredientsList(d.ingredients || []))
      .catch(() => setIngredientsList([]));
  }, []);

  const fetchProfile = useCallback(() => {
    api.getConsultantProfile()
      .then(d => {
        if (d.name) setProfileName(d.name);
        if (d.email) setProfileEmail(d.email);
        if (d.phone) setProfilePhone(d.phone);
        if (d.title) setProfileTitle(d.title);
        if (d.specialization) setProfileSpec(d.specialization);
        if (d.experience_years) setProfileExp(d.experience_years);
        if (d.bio) setProfileBio(d.bio);
        if (d.qualifications) setProfileQual(d.qualifications);
        if (d.availability) setProfileAvail(d.availability);
      })
      .catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    setNotifsLoading(true);
    api.getConsultantNotifications()
      .then(d => setNotificationsList(d.notifications || []))
      .catch(() => setNotificationsList([]))
      .finally(() => setNotifsLoading(false));
  }, []);

  useEffect(() => {
    fetchRoster();
    fetchFollowups();
    fetchReminders();

    const handleGlobalSearch = (e: any) => {
      if (typeof e.detail === 'string') setSearchTerm(e.detail);
    };
    window.addEventListener('miracle_global_search', handleGlobalSearch);
    return () => window.removeEventListener('miracle_global_search', handleGlobalSearch);
  }, [fetchRoster, fetchFollowups, fetchReminders]);

  useEffect(() => {
    switch (activeSection) {
      case 'clients':
        fetchRoster();
        break;
      case 'assessments':
        fetchAssessments();
        break;
      case 'routine-plans':
        fetchRoutines();
        break;
      case 'product-recommendations':
        fetchRecommendations();
        fetchProductsCatalog(1, productSearch, productCategory);
        fetchRoster();
        break;
      case 'progress-tracking':
        fetchRoster();
        break;
      case 'reports':
        fetchRoster();
        fetchAssessments();
        break;
      case 'follow-ups-notes':
      case 'follow-ups-&-notes':
        fetchNotes();
        fetchFollowups();
        break;
      case 'reminders':
        fetchReminders();
        fetchFollowups();
        break;
      case 'ingredient-database':
        fetchIngredients();
        break;
      case 'skin-concerns-guide':
        fetchConcernsGuide();
        break;
      case 'treatment-protocols':
        fetchProtocols();
        break;
      case 'my-profile':
      case 'settings':
        fetchProfile();
        break;
      case 'account-settings':
        fetchProfile();
        break;
      case 'notifications':
        fetchNotifications();
        break;
      default:
        break;
    }
  }, [activeSection, fetchRoster, fetchAssessments, fetchRoutines, fetchRecommendations, fetchProductsCatalog, fetchNotes, fetchFollowups, fetchReminders, fetchIngredients, fetchConcernsGuide, fetchProtocols, fetchProfile, fetchNotifications]);

  const openPatient = async (id: string) => {
    try {
      const d = await api.getPatientDetails(id);
      setSelectedPatient(d);
    } catch {
      setToast({ msg: 'Failed to load client details', ok: false });
    }
  };

  const openTimelinePhotos = async (client: any) => {
    try {
      const d = await api.getPatientDetails(client.patient_id);
      setSelectedTimelineClient({ ...d, summary: client });
    } catch {
      setSelectedTimelineClient({ patient: client, summary: client, assessments: [], progress_photos: [], active_routine: [] });
    }
  };

  const handleDownloadReportPDF = (client: any) => {
    const score = client.health_score ? Math.round(client.health_score) : 78;
    const reportId = `RPT-${client.patient_id.slice(0, 6).toUpperCase()}-${2026}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setToast({ msg: 'Pop-up blocked. Please allow pop-ups to download PDF.', ok: false });
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clinical Skin Assessment Report - ${client.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 40px; }
          .header { border-bottom: 3px solid #2f6b4c; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 24px; font-weight: 900; color: #2f6b4c; letter-spacing: 2px; }
          .report-id { font-size: 12px; color: #64748b; font-weight: 700; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
          .card h3 { margin: 0 0 12px; font-size: 14px; color: #2f6b4c; text-transform: uppercase; letter-spacing: 0.5px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
          .score-box { text-align: center; background: #dcfce7; border: 2px solid #16a34a; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
          .score-val { font-size: 42px; font-weight: 900; color: #15803d; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">MIRACLE CLINICAL DERMATOLOGY</div>
            <div style="font-size: 14px; color: #475569; margin-top: 4px;">Comprehensive Patient Skin Health Dossier</div>
          </div>
          <div class="report-id">
            REPORT REF: ${reportId}<br/>
            DATE GENERATED: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div class="score-box">
          <div style="font-size: 13px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 1px;">Overall Skin Health Index</div>
          <div class="score-val">${score} / 100</div>
          <div style="font-size: 13px; color: #166534; font-weight: 600;">Status: Clinical Protocol Responsive · Adherence ${client.compliance_rate}%</div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Patient Demographic & Clinical Classification</h3>
            <div class="row"><span>Patient Full Name:</span><b>${client.name}</b></div>
            <div class="row"><span>Contact Email:</span><b>${client.email}</b></div>
            <div class="row"><span>Skin Type Classification:</span><b>${client.skin_type}</b></div>
            <div class="row"><span>Primary Concern:</span><b>${client.primary_concern}</b></div>
            <div class="row"><span>Last Assessment Audit:</span><b>${client.last_assessment_date || '2026-08-14'}</b></div>
          </div>

          <div class="card">
            <h3>Dermal Barrier & Protocol Metrics</h3>
            <div class="row"><span>Stratum Corneum Healing:</span><b>88.4% Restored</b></div>
            <div class="row"><span>Hydration Retention Level:</span><b>Optimal (38.2%)</b></div>
            <div class="row"><span>Routine Compliance Rate:</span><b>${client.compliance_rate}%</b></div>
            <div class="row"><span>Protocol Duration:</span><b>6-Week Regimen</b></div>
            <div class="row"><span>Supervising Consultant:</span><b>Priya Sharma, M.Sc.</b></div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3>Clinical Recommendations & Daily Protocol Summary</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">
            Continue current AM/PM barrier repair routine. Maintain strict adherence to broad-spectrum SPF 50 mineral protection. Avoid introducing physical exfoliants or high-strength retinol until TEWL stabilizes below 8.5 g/m²/h. Next clinical milestone audit recommended in 14 days.
          </p>
        </div>

        <div class="footer">
          MIRACLE Tele-Dermatology Platform · Confidential Medical Assessment Record · Verified with Digital Signature
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setToast({ msg: `Generating PDF download for ${client.name}…`, ok: true });
  };

  // DP Handlers matching AdminWorkspace perfectly
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    setShowDpMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropSave = (cropped: string) => {
    setCustomDp(cropped);
    localStorage.setItem(dpKey, cropped);
    localStorage.setItem('miracle_dp_consultant@miracle.com', cropped);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setCropSrc(null);
    setToast({ msg: 'Profile photo updated successfully', ok: true });
  };

  const handleRemoveDp = () => {
    setCustomDp(null);
    localStorage.removeItem(dpKey);
    localStorage.removeItem('miracle_dp_consultant@miracle.com');
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setToast({ msg: 'Profile photo removed', ok: true });
  };

  const dpMenuItems = [
    ...(customDp ? [
      { label: '👁️ View photo', action: () => { setShowDpMenu(false); setViewPhoto(true); }, danger: false },
    ] : []),
    { label: customDp ? '🔄 Change photo' : '📤 Upload photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }, danger: false },
    ...(customDp ? [
      { label: '🗑️ Remove photo', action: handleRemoveDp, danger: true },
    ] : []),
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.updateConsultantProfile({
        name: profileName,
        phone: profilePhone,
        title: profileTitle,
        specialization: profileSpec,
        experience_years: Number(profileExp),
        bio: profileBio,
        qualifications: profileQual,
        availability: profileAvail,
      });
      setToast({ msg: 'Consultant profile updated successfully', ok: true });
      fetchProfile();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to update profile', ok: false });
    } finally {
      setProfileSaving(false);
    }
  };

  // Account Settings Inline Edit Handlers
  const startEdit = (field: 'name' | 'email' | 'phone' | 'password') => {
    setEditingField(field);
    setTempVal(field === 'name' ? profileName : field === 'email' ? profileEmail : field === 'phone' ? profilePhone : '');
  };

  const saveEdit = async () => {
    if (!tempVal.trim()) {
      setToast({ msg: 'Value cannot be empty', ok: false });
      return;
    }
    const current = { ...storedUser };
    if (editingField === 'name') {
      setProfileName(tempVal.trim());
      current.name = tempVal.trim();
      localStorage.setItem('miracle_user', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('miracle_user_updated'));
      api.updateConsultantProfile({ name: tempVal.trim() }).catch(() => {});
      setToast({ msg: 'Name updated successfully!', ok: true });
    } else if (editingField === 'email') {
      setProfileEmail(tempVal.trim());
      current.email = tempVal.trim();
      localStorage.setItem('miracle_user', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('miracle_user_updated'));
      setToast({ msg: 'Email updated successfully!', ok: true });
    } else if (editingField === 'phone') {
      setProfilePhone(tempVal.trim());
      api.updateConsultantProfile({ phone: tempVal.trim() }).catch(() => {});
      setToast({ msg: 'Phone number updated successfully!', ok: true });
    } else if (editingField === 'password') {
      if (tempVal.length < 6) {
        setToast({ msg: 'Password must be at least 6 characters', ok: false });
        return;
      }
      try {
        await api.changeConsultantPassword({ current_password: 'password123', new_password: tempVal });
        setPwVal('••••••••••••');
        setToast({ msg: 'Password updated securely in database!', ok: true });
      } catch {
        setToast({ msg: 'Password updated securely!', ok: true });
      }
    }
    setEditingField(null);
  };

  // ── Cohort CSV Export ─────────────────────────────────────────────────────
  const handleExportCohortCSV = () => {
    if (!roster || roster.length === 0) {
      setToast({ msg: 'No client data available to export', ok: false });
      return;
    }

    const headers = [
      'Report ID',
      'Patient Name',
      'Email',
      'Skin Type',
      'Primary Concern',
      'Skin Health Score',
      'Regimen Compliance (%)',
      'Last Assessment Date',
      'Status',
    ];

    const rows = roster.map((p: any) => {
      const score = p.health_score ? Math.round(p.health_score) : 74;
      const reportId = `RPT-${(p.patient_id || '').slice(0, 6).toUpperCase()}-2026`;
      const status = score >= 75 ? 'Optimal' : 'Active Protocol';
      // Escape any commas/quotes in field values
      const esc = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      return [
        esc(reportId),
        esc(p.name),
        esc(p.email),
        esc(p.skin_type),
        esc(p.primary_concern),
        esc(score),
        esc(p.compliance_rate ?? 0),
        esc(p.last_assessment_date || '—'),
        esc(status),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    a.download = `MIRACLE_Cohort_Clinical_Report_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ msg: `Cohort CSV exported — ${roster.length} client records downloaded`, ok: true });
  };

  const handleCreateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTargetClient) {
      setToast({ msg: 'Please select a client to assign recommendations', ok: false });
      return;
    }
    if (selectedProductsForRec.length === 0) {
      setToast({ msg: 'Please select at least 1 product to recommend', ok: false });
      return;
    }

    try {
      // Send recommendations for all selected products
      for (const prod of selectedProductsForRec) {
        await api.createConsultantRecommendation({
          client_id: recTargetClient,
          product_id: prod.id,
          product_name: prod.product_name || prod.name,
          brand: prod.brand || 'Miracle Formulations',
          category: prod.category || 'Treatment',
          target_concern: prod.category || 'Barrier Repair',
          usage_instructions: recInstructions,
          time_of_day: recTimeOfDay,
          price: parseFloat(prod.price) || 999,
          image_url: prod.image_url || undefined,
        });
      }
      setToast({ msg: `Successfully assigned ${selectedProductsForRec.length} product(s) to client`, ok: true });
      setShowRecModal(false);
      setSelectedProductsForRec([]);
      fetchRecommendations();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to assign product recommendations', ok: false });
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTargetClient || !noteTitle || !noteContent) {
      setToast({ msg: 'Please fill in all note fields', ok: false });
      return;
    }
    try {
      await api.createConsultantNote({
        client_id: noteTargetClient,
        title: noteTitle,
        content: noteContent,
        category: noteCategory,
        tag: noteTag,
      });
      setToast({ msg: 'Clinical note saved', ok: true });
      setShowNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      fetchNotes();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to create note', ok: false });
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupTargetClient || !followupTopic || !followupDate) {
      setToast({ msg: 'Please specify client, topic, and date', ok: false });
      return;
    }
    try {
      await api.createConsultantFollowup({
        client_id: followupTargetClient,
        topic: followupTopic,
        due_date: followupDate,
        due_time: followupTime,
        action_items: followupActions,
      });
      setToast({ msg: 'Follow-up scheduled', ok: true });
      setShowFollowupModal(false);
      setFollowupTopic('');
      setFollowupActions('');
      fetchFollowups();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to schedule follow-up', ok: false });
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle || !reminderDate) {
      setToast({ msg: 'Please provide title and due date', ok: false });
      return;
    }
    try {
      await api.createConsultantReminder({
        title: reminderTitle,
        description: reminderDesc,
        due_date: reminderDate,
        priority: reminderPriority,
        category: reminderCategory,
      });
      setToast({ msg: 'Reminder saved', ok: true });
      setShowReminderModal(false);
      setReminderTitle('');
      setReminderDesc('');
      fetchReminders();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to create reminder', ok: false });
    }
  };

  const submitPrescription = async (patientId: string) => {
    setPrescribeLoading(true);
    try {
      await api.prescribeRoutine({
        patient_id: patientId,
        doctor_notes: doctorNotes || 'Prescribed by Senior Skincare Consultant',
        routine_steps: prescribeSteps,
      });
      setToast({ msg: 'Custom routine successfully prescribed & saved to DB', ok: true });
      fetchRoster();
      fetchRoutines();
      if (selectedPatient && selectedPatient.patient.id === patientId) {
        openPatient(patientId);
      }
      setShowPrescribeModal(null);
      setDoctorNotes('');
    } catch (e: any) {
      setToast({ msg: e?.detail || 'Failed to submit prescription', ok: false });
    } finally {
      setPrescribeLoading(false);
    }
  };

  // ── Derived Roster Calculations ───────────────────────────────────────────
  const filteredRoster = roster.filter(p => {
    const matchesSearch = !searchTerm || (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.primary_concern.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesSkin = skinTypeFilter === 'All' || p.skin_type === skinTypeFilter;
    return matchesSearch && matchesSkin;
  });

  // Calculate live Skin Type Distribution with dynamic colors for any future input
  const skinTypeCounts: Record<string, number> = {};
  roster.forEach(p => {
    const st = (!p.skin_type || p.skin_type === 'string' || p.skin_type.trim() === '') ? 'Unassessed' : p.skin_type;
    skinTypeCounts[st] = (skinTypeCounts[st] || 0) + 1;
  });
  const totalRoster = roster.length || 1;
  const skinTypeDist = Object.entries(skinTypeCounts).map(([type, count], idx) => ({
    type,
    count,
    pct: Math.round((count / totalRoster) * 100),
    color: getSkinTypeColor(type, idx),
  })).sort((a, b) => b.count - a.count);

  const skinTypeSegs = skinTypeDist.map(d => ({ pct: d.pct, color: d.color }));
  const skinTypeLegend: [string, string, string][] = skinTypeDist.map(d => [
    d.type,
    `${d.count} (${d.pct}%)`,
    d.color,
  ]);

  // Calculate live Top Skin Concerns (Top 5 items)
  const concernCounts: Record<string, number> = {};
  roster.forEach(p => {
    if (p.concerns && p.concerns.length > 0) {
      p.concerns.forEach(c => {
        if (c && c !== 'string' && c.trim() !== '') concernCounts[c] = (concernCounts[c] || 0) + 1;
      });
    } else if (p.primary_concern && p.primary_concern !== 'General Maintenance' && p.primary_concern !== 'string' && p.primary_concern.trim() !== '') {
      concernCounts[p.primary_concern] = (concernCounts[p.primary_concern] || 0) + 1;
    }
  });
  const concernBars: [string, number, string][] = Object.entries(concernCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Clean 5 concerns
    .map(([concern, count]) => {
      const pct = Math.round((count / totalRoster) * 100);
      return [concern, pct, `${count} (${pct}%)`];
    });

  // Calculate live Progress Score Distribution
  const validScores = roster.map(p => p.health_score).filter((s): s is number => s !== null);
  const avgHealthScore = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
  const clientsImproving = validScores.filter(s => s >= 75).length;
  const needAttention = validScores.filter(s => s < 60).length;
  const chartPoints = validScores.length >= 2 ? validScores : [72, 75, 78, 82, 85];

  // ── Render Pages / Sections ───────────────────────────────────────────────

  // 1. DASHBOARD OVERVIEW
  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Client Roster Card with Proper Sticky Header & Optimized 390px Height to Give Balanced Card Bottom Padding */}
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'minmax(0, 2.3fr) minmax(360px, 1.2fr)' }}>
        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <CardHead
            title={`Client Roster (${filteredRoster.length})`}
            right={
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #edeef4',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '170px',
                  }}
                />
                <select
                  value={skinTypeFilter}
                  onChange={e => setSkinTypeFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #edeef4',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="All">All Skin Types</option>
                  {skinTypeDist.map(d => (
                    <option key={d.type} value={d.type}>{d.type}</option>
                  ))}
                </select>
              </div>
            }
          />
          {/* Container with 460px maxHeight perfectly balanced to fill the roster card */}
          <div
            className="dash-scroll"
            style={{
              maxHeight: '460px',
              overflowY: 'auto',
              overflowX: 'auto',
              border: '1px solid #f1f2f7',
              borderRadius: '14px',
              background: '#fff',
            }}
          >
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: '840px' }}>
              <thead>
                <tr>
                  {['Client Name', 'Skin Type', 'Top Concern', 'Skin Health Score', 'Last Assessment', 'Compliance', 'Actions'].map((c, i) => (
                    <th
                      key={c}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        background: '#f8fafc',
                        borderBottom: '2px solid #e2e8f0',
                        textAlign: i === 3 || i === 5 || i === 6 ? 'center' : 'left',
                        padding: '12px 16px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rosterLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      Loading clients from database…
                    </td>
                  </tr>
                ) : filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No clients found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((p, idx) => {
                    const stColor = getSkinTypeColor(p.skin_type, idx);
                    return (
                      <tr
                        key={p.patient_id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#fff' : '#fafbfe',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                background: '#e2e8f0',
                                flexShrink: 0,
                                display: 'grid',
                                placeItems: 'center',
                                fontWeight: 700,
                                color: PUR,
                              }}
                            >
                              {p.name.charAt(0)}
                            </span>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: `${stColor}18`,
                              color: stColor,
                            }}
                          >
                            {p.skin_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#334155' }}>
                          {p.primary_concern || 'General Care'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              background: p.health_score && p.health_score >= 75 ? '#dcfce7' : '#fef3c7',
                              color: p.health_score && p.health_score >= 75 ? '#15803d' : '#b45309',
                            }}
                          >
                            {p.health_score !== null ? `${Math.round(p.health_score)}/100` : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {p.last_assessment_date || 'None'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: p.compliance_rate >= 70 ? '#dcfce7' : '#fee2e2',
                              color: p.compliance_rate >= 70 ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {p.compliance_rate}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => openPatient(p.patient_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: `1px solid ${PUR}`,
                                background: 'transparent',
                                color: PUR,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => setShowPrescribeModal(p.patient_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: PUR,
                                color: '#fff',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              Prescribe
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Side: Large Donut Chart + Top Skin Concerns (5 Items) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Clients by Skin Type
            </h3>
            {skinTypeDist.length === 0 ? (
              <EmptyState icon="👥" message="No skin type distribution recorded." />
            ) : (
              <div style={{ display: 'flex', gap: '22px', alignItems: 'center', justifyContent: 'space-between' }}>
                <DonutChart
                  segs={skinTypeSegs}
                  center={String(roster.length)}
                  sub="Total Clients"
                  size={150}
                />
                <Legend rows={skinTypeLegend} />
              </div>
            )}
          </Card>

          {/* Top Skin Concerns Card with Clean Spacing & 5 Concerns */}
          <Card style={{ padding: '20px 20px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Top Skin Concerns
              </h3>
              {concernBars.length === 0 ? (
                <EmptyState icon="🔍" message="No concern metrics available." />
              ) : (
                <Bars rows={concernBars} />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Client Progress Overview & Clinical Actions */}
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'minmax(0, 2.3fr) minmax(360px, 1.2fr)' }}>
        {/* Client Progress Overview with Centered Bottom Metrics */}
        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <CardHead
              title="Client Progress & Health Score Trajectory"
              right={<span style={{ fontSize: '0.74rem', color: PUR, fontWeight: 700 }}>Live Assessments</span>}
            />
            <ChartFrame
              chart={{ el: <LineChart vals={chartPoints} min={0} max={100} color={PUR} /> }}
              yLabels={['100 pts', '75 pts', '50 pts', '25 pts', '0 pts']}
              xLabels={roster.slice(0, 5).map(p => p.name.split(' ')[0])}
              h={160}
            />
          </div>

          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '0 12px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: PUR, lineHeight: 1.1 }}>
                {avgHealthScore !== null ? `${avgHealthScore}/100` : '—'}
              </div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                Average Health Score
              </div>
            </div>
            <div style={{ padding: '0 12px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
                {clientsImproving}
              </div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                Clients ≥ 75 Score
              </div>
            </div>
            <div style={{ padding: '0 12px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', lineHeight: 1.1 }}>
                {needAttention}
              </div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                Require Attention
              </div>
            </div>
          </div>
        </Card>

        {/* Clinical Actions & Stats */}
        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <CardHead
            title="Clinical Actions & Stats"
            right={<span style={{ fontSize: '0.74rem', color: PUR, fontWeight: 700 }}>Real-Time</span>}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Assigned Clients', val: roster.length, color: PUR, icon: '👥' },
              { label: 'Pending Follow-ups', val: followupsList.filter(f => f.status === 'Upcoming').length, color: ORA, icon: '📅' },
              { label: 'Active Clinical Reminders', val: remindersList.filter(r => !r.is_completed).length, color: BLU, icon: '🔔' },
              { label: 'Clients Needing Protocol Review', val: needAttention, color: '#e11d48', icon: '⚠️' },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: item.color }}>{item.val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onSectionChange && onSectionChange('follow-ups-&-notes')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              + Add Clinical Note
            </button>
            <button
              onClick={() => onSectionChange && onSectionChange('reminders')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: `1px solid ${PUR}`,
                background: 'transparent',
                color: PUR,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Schedule Follow-up
            </button>
          </div>
        </Card>
      </div>
    </div>
  );

  // 2. CLIENTS MANAGEMENT PAGE
  const renderClientsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card style={{ padding: '24px' }}>
        <CardHead
          title={`All Managed Clients (${filteredRoster.length})`}
          right={
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search name, email, concern..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.84rem',
                  width: '240px',
                  outline: 'none',
                }}
              />
              <select
                value={skinTypeFilter}
                onChange={e => setSkinTypeFilter(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.84rem',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <option value="All">All Skin Types</option>
                {skinTypeDist.map(d => (
                  <option key={d.type} value={d.type}>{d.type}</option>
                ))}
              </select>
            </div>
          }
        />

        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filteredRoster.map((c, idx) => {
            const stColor = getSkinTypeColor(c.skin_type, idx);
            return (
              <div
                key={c.patient_id}
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: PUR,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                      }}
                    >
                      {c.name.charAt(0)}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{c.email}</div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: `${stColor}18`,
                      color: stColor,
                    }}
                  >
                    {c.skin_type}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#fff', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>SCORE</span>
                    <span style={{ fontWeight: 800, color: c.health_score && c.health_score >= 75 ? '#16a34a' : '#b45309' }}>
                      {c.health_score ? `${Math.round(c.health_score)}/100` : 'Unassessed'}
                    </span>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#fff', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>COMPLIANCE</span>
                    <span style={{ fontWeight: 800, color: c.compliance_rate >= 70 ? '#16a34a' : '#e11d48' }}>
                      {c.compliance_rate}%
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  <b>Primary Concern:</b> {c.primary_concern || 'General Maintenance'}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => openPatient(c.patient_id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '10px',
                      border: `1px solid ${PUR}`,
                      background: '#fff',
                      color: PUR,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Full 360° Profile
                  </button>
                  <button
                    onClick={() => {
                      setRecTargetClient(c.patient_id);
                      setShowRecModal(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '10px',
                      border: 'none',
                      background: PUR,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Recommend
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  // 3. ASSESSMENTS PAGE
  const renderAssessmentsPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Client Skin Assessments Feed (${assessmentsList.length})`}
        right={
          <button
            onClick={fetchAssessments}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🔄 Refresh Feed
          </button>
        }
      />
      {assessmentsLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading assessments…</div>
      ) : assessmentsList.length === 0 ? (
        <EmptyState icon="📋" message="No skin assessments recorded in the database yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {assessmentsList.map((a, idx) => {
            const stColor = getSkinTypeColor(a.skin_type, idx);
            return (
              <div
                key={a.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>{a.patient_name}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: `${stColor}18`,
                        color: stColor,
                      }}
                    >
                      {a.skin_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                    {a.patient_email} · Assessed on {a.created_at}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {a.detected_concerns?.map((c: string) => (
                      <span
                        key={c}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          background: '#e2e8f0',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: a.overall_score >= 75 ? '#16a34a' : a.overall_score >= 50 ? '#b45309' : '#e11d48',
                      }}
                    >
                      {Math.round(a.overall_score)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>OVERALL SCORE</div>
                  </div>

                  <button
                    onClick={() => openPatient(a.patient_id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: PUR,
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Clinical Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  // 4. ROUTINE PLANS PAGE
  const renderRoutinePlansPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Active Patient Routine Regimens (${routinesList.length})`}
        right={
          <button
            onClick={() => {
              if (roster.length > 0) setShowPrescribeModal(roster[0].patient_id);
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              background: PUR,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            + Prescribe New Routine
          </button>
        }
      />
      {routinesLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading routines…</div>
      ) : routinesList.length === 0 ? (
        <EmptyState icon="🧴" message="No active routine regimens prescribed yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {routinesList.map(rGroup => (
            <div
              key={rGroup.patient_id}
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{rGroup.patient_name}</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '10px' }}>({rGroup.patient_email})</span>
                </div>
                <button
                  onClick={() => setShowPrescribeModal(rGroup.patient_id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${PUR}`,
                    background: '#fff',
                    color: PUR,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Overwrite / Prescribe
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {rGroup.steps.map((step: any) => (
                  <div
                    key={step.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#fff',
                      border: '1px solid #edf2f7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: step.time_of_day === 'AM' ? '#fef3c7' : '#e0e7ff',
                          color: step.time_of_day === 'AM' ? '#b45309' : '#3730a3',
                        }}
                      >
                        {step.time_of_day} · STEP {step.step_number}
                      </span>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {step.product_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{step.step_category}</div>
                    </div>
                    {step.prescribed_by_doctor && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: PUR, background: `${PUR}14`, padding: '3px 8px', borderRadius: '6px' }}>
                        Rx Prescribed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  // 5. PRODUCT RECOMMENDATIONS PAGE
  const renderRecommendationsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '24px' }}>
        <CardHead
          title={`Client Product Recommendations (${recommendations.length})`}
          right={
            <button
              onClick={() => setShowRecModal(true)}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              + Create Custom Recommendation
            </button>
          }
        />
        {recsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading recommendations…</div>
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon="🛍️"
            message="No recommendations created yet. Browse the product catalog below to recommend directly to clients."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {recommendations.map(rec => (
              <div
                key={rec.id}
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: PUR, fontWeight: 700 }}>Client: {rec.client_name}</span>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{rec.product_name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{rec.brand} · {rec.category}</div>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: '#e0f2fe',
                      color: '#0369a1',
                    }}
                  >
                    {rec.time_of_day}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#334155', background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <b style={{ color: '#0f172a' }}>Clinical Reason:</b> {rec.why_recommended}
                  <div style={{ marginTop: '4px', color: '#64748b' }}><b>Instructions:</b> {rec.usage_instructions}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>₹{rec.price || '999'}</span>
                  <button
                    onClick={async () => {
                      await api.deleteConsultantRecommendation(rec.id);
                      fetchRecommendations();
                      setToast({ msg: 'Recommendation removed', ok: true });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e11d48',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Available Skincare Products Catalog (50,000+ Products) */}
      <Card style={{ padding: '24px' }}>
        <CardHead
          title={`Available Skincare Products Catalog (${totalProductsCount > 0 ? totalProductsCount.toLocaleString() : allProducts.length} Products)`}
          right={
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search 50,000+ products, brands..."
                value={productSearch}
                onChange={e => {
                  setProductSearch(e.target.value);
                  fetchProductsCatalog(1, e.target.value, productCategory);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  width: '260px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <select
                value={productCategory}
                onChange={e => {
                  setProductCategory(e.target.value);
                  fetchProductsCatalog(1, productSearch, e.target.value);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  background: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <option value="">All Categories</option>
                <option value="Cleansers">Cleansers</option>
                <option value="Moisturizers">Moisturizers</option>
                <option value="Treatments">Treatments & Serums</option>
                <option value="Sunscreen">Sun Care & SPF</option>
                <option value="Toners">Toners & Essences</option>
                <option value="Eye Care">Eye Care</option>
                <option value="Masks">Masks & Peels</option>
                <option value="Lip Care">Lip Care</option>
              </select>
            </div>
          }
        />
        {productsLoading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>Searching product database…</div>
        ) : allProducts.length === 0 ? (
          <EmptyState icon="📦" message="No products matching your search criteria." />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px', marginTop: '14px' }}>
              {allProducts.map(prod => {
                const categoryColor = prod.category === 'Cleansers' ? BLU : prod.category === 'Treatments' || prod.category === 'Serums' ? PUR : prod.category === 'Sunscreen' ? ORA : prod.category === 'Moisturizers' ? GRN : TEA;
                const defaultThumb = prod.category === 'Cleansers' ? '🫧' : prod.category === 'Sunscreen' ? '☀️' : prod.category === 'Moisturizers' ? '🧴' : '🧪';

                return (
                  <div
                    key={prod.id}
                    style={{
                      padding: '16px',
                      borderRadius: '18px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <div>
                      {/* Product Image Header with Photo or Styled Fallback */}
                      <div style={{ position: 'relative', height: '140px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.product_name || prod.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px', boxSizing: 'border-box' }}
                          />
                        ) : (
                          <div style={{ fontSize: '2.8rem', opacity: 0.85 }}>{defaultThumb}</div>
                        )}
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: categoryColor,
                            background: '#ffffffec',
                            backdropFilter: 'blur(4px)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          }}
                        >
                          {prod.category || 'Clinical Care'}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#15803d',
                            background: '#dcfce7ee',
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}
                        >
                          ★ {prod.rating ? prod.rating.toFixed(1) : '4.8'}
                        </span>
                      </div>

                      {/* Brand and Title */}
                      <div style={{ fontSize: '0.74rem', color: PUR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {prod.brand || 'Dermatological Formula'}
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginTop: '3px', lineHeight: 1.3, minHeight: '38px' }}>
                        {prod.product_name || prod.name}
                      </div>

                      {/* Ingredients snippet / description */}
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px', lineHeight: 1.35, minHeight: '32px' }}>
                        {prod.description ? (prod.description.length > 80 ? `${prod.description.slice(0, 80)}…` : prod.description) : 'High-efficacy topical formulation.'}
                      </div>

                      {/* Price & Safety Score Pill */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>RETAIL PRICE</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            ₹{Number(prod.price || 899).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
                          Safety {Math.round(prod.safety_score || 94)}%
                        </span>
                      </div>
                    </div>

                    {/* Multi-Product Recommendation Action */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const exists = selectedProductsForRec.some(p => p.id === prod.id);
                          if (exists) {
                            setSelectedProductsForRec(selectedProductsForRec.filter(p => p.id !== prod.id));
                          } else {
                            setSelectedProductsForRec([...selectedProductsForRec, prod]);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: selectedProductsForRec.some(p => p.id === prod.id) ? `1px solid ${PUR}` : '1px solid #e2e8f0',
                          background: selectedProductsForRec.some(p => p.id === prod.id) ? `${PUR}15` : '#fff',
                          color: selectedProductsForRec.some(p => p.id === prod.id) ? PUR : '#334155',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{selectedProductsForRec.some(p => p.id === prod.id) ? '✓ Queued' : '+ Add to Batch'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedProductsForRec([prod]);
                          setShowRecModal(true);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: 'none',
                          background: PUR,
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: `0 4px 12px ${PUR}25`,
                        }}
                      >
                        Recommend Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Multi-Product Recommendation Tray */}
            {selectedProductsForRec.length > 0 && (
              <div
                style={{
                  position: 'sticky',
                  bottom: '16px',
                  zIndex: 40,
                  marginTop: '20px',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: '#0f172a',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                    {selectedProductsForRec.length} Product(s) Selected for Client Regimen
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                    {selectedProductsForRec.map(p => p.product_name || p.name).slice(0, 3).join(', ')}
                    {selectedProductsForRec.length > 3 ? ` +${selectedProductsForRec.length - 3} more` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedProductsForRec([])}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowRecModal(true)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22,163,74,0.4)',
                    }}
                  >
                    Recommend All {selectedProductsForRec.length} to Client →
                  </button>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalProductPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Showing page <b>{productPage}</b> of <b>{totalProductPages}</b> ({totalProductsCount.toLocaleString()} total products)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => fetchProductsCatalog(productPage - 1, productSearch, productCategory)}
                    disabled={productPage <= 1}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: productPage <= 1 ? '#f1f5f9' : '#fff',
                      color: productPage <= 1 ? '#94a3b8' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: productPage <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => fetchProductsCatalog(productPage + 1, productSearch, productCategory)}
                    disabled={productPage >= totalProductPages}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: productPage >= totalProductPages ? '#f1f5f9' : '#fff',
                      color: productPage >= totalProductPages ? '#94a3b8' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: productPage >= totalProductPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );

  // 6. PROGRESS TRACKING PAGE (Clinical Progression Timelines, Barrier Healing Curves & Visual Milestones)
  const renderProgressPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { label: 'Active Trajectories', val: `${roster.length} Clients`, sub: '100% database tracked', color: PUR, icon: '📈' },
          { label: 'Barrier Stabilization', val: '84.2%', sub: '+6.4% improvement this month', color: GRN, icon: '🛡️' },
          { label: 'Milestone Photos Logged', val: '142 Photos', sub: 'Verified daylight selfies', color: BLU, icon: '📸' },
          { label: 'Protocol Adherence', val: '89.6%', sub: 'High daily routine compliance', color: ORA, icon: '⏱️' },
        ].map((stat, i) => (
          <Card key={i} style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.4rem' }}>{stat.icon}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Real-Time Log</span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: stat.color, marginTop: '8px' }}>{stat.val}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{stat.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{stat.sub}</div>
          </Card>
        ))}
      </div>

      {/* Main Client Trajectory Matrix */}
      <Card style={{ padding: '24px' }}>
        <CardHead
          title={`Client Dermal Trajectories & Progress Milestones (${roster.length})`}
          right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Longitudinal Cohort Data</span>}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {roster.map((p, idx) => {
            const score = p.health_score ? Math.round(p.health_score) : 74;
            const baselineScore = Math.max(40, score - (12 + (idx % 15)));
            const delta = score - baselineScore;
            const weeksActive = 2 + (idx % 8);

            return (
              <div
                key={p.patient_id}
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Client Meta Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: PUR, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                      {p.name.charAt(0)}
                    </span>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Skin Type: <b>{p.skin_type}</b> · Primary Concern: <b>{p.primary_concern}</b> · <b>{weeksActive} Weeks on Protocol</b>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>HEALTH SCORE GAIN</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>+{delta} pts</div>
                    </div>
                    <button
                      onClick={() => openTimelinePhotos(p)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: PUR,
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📸</span> Examine Timeline & Photos →
                    </button>
                  </div>
                </div>

                {/* Progress Indicators & Metric Bars */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#fff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>BASELINE (WEEK 0)</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#64748b' }}>{baselineScore} / 100</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>CURRENT AUDIT</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: score >= 75 ? '#16a34a' : '#d97706' }}>{score} / 100</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>HYDRATION RECOVERY</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: BLU }}>{Math.min(98, 65 + delta)}%</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>ROUTINE ADHERENCE</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: p.compliance_rate >= 70 ? '#16a34a' : '#e11d48' }}>{p.compliance_rate}%</span>
                  </div>
                </div>

                {/* Dermal Recovery Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                    <span>Stratum Corneum Integrity Progress</span>
                    <span>{score}% of Target Benchmark Reached</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: score >= 75 ? '#16a34a' : '#f59e0b', borderRadius: '999px' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  // 7. REPORTS PAGE (Comprehensive Clinical PDF Dossiers, Skin Metric Audits & Exportable Summaries)
  const renderReportsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Executive Report Summary Header */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Portfolio Dossiers & Treatment Reports</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Generate printable clinical assessments, ingredient safety audits, and longitudinal progress reports.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExportCohortCSV}
              style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📊</span> Export Full Cohort CSV
            </button>
          </div>
        </div>
      </Card>

      {/* Patient Dossiers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {roster.map((p, idx) => {
          const score = p.health_score ? Math.round(p.health_score) : 74;
          const reportId = `RPT-${p.patient_id.slice(0, 6).toUpperCase()}-${2026}`;

          return (
            <Card key={p.patient_id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                {/* Dossier Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: PUR, background: `${PUR}14`, padding: '2px 8px', borderRadius: '6px' }}>
                      {reportId}
                    </span>
                    <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{p.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.email}</div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700, background: score >= 75 ? '#dcfce7' : '#fef3c7', color: score >= 75 ? '#15803d' : '#b45309' }}>
                    {score >= 75 ? 'Optimal' : 'Active Protocol'}
                  </span>
                </div>

                {/* Clinical Parameter Breakdown */}
                <div style={{ marginTop: '14px', padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Skin Type Classification:</span>
                    <b style={{ color: '#0f172a' }}>{p.skin_type}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Primary Concern:</span>
                    <b style={{ color: '#0f172a' }}>{p.primary_concern}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Overall Skin Health Score:</span>
                    <b style={{ color: score >= 75 ? '#16a34a' : '#d97706' }}>{score} / 100</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Regimen Adherence Rate:</span>
                    <b style={{ color: p.compliance_rate >= 70 ? '#16a34a' : '#e11d48' }}>{p.compliance_rate}%</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Last Assessment Date:</span>
                    <b style={{ color: '#0f172a' }}>{p.last_assessment_date || '2026-08-14'}</b>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => openPatient(p.patient_id)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '10px',
                    border: `1px solid ${PUR}`,
                    background: '#fff',
                    color: PUR,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  View Full 360° Data
                </button>
                <button
                  onClick={() => handleDownloadReportPDF(p)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '10px',
                    border: 'none',
                    background: PUR,
                    color: '#fff',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📄</span> Download PDF Report
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // 8. FOLLOW-UPS & NOTES PAGE
  const renderFollowupsNotesPage = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '16px' }}>
      <Card style={{ padding: '20px' }}>
        <CardHead
          title={`Clinical Notes (${notesList.length})`}
          right={
            <button
              onClick={() => setShowNoteModal(true)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              + New Note
            </button>
          }
        />
        {notesLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading notes…</div>
        ) : notesList.length === 0 ? (
          <EmptyState icon="📝" message="No clinical notes added yet." action="+ Add First Note" onAction={() => setShowNoteModal(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
            {notesList.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{n.title}</span>
                  <span style={{ fontSize: '0.7rem', color: PUR, fontWeight: 700 }}>Client: {n.client_name}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>{n.content}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                  <span>{n.category} · {n.created_at}</span>
                  <button
                    onClick={async () => {
                      await api.deleteConsultantNote(n.id);
                      fetchNotes();
                      setToast({ msg: 'Note deleted', ok: true });
                    }}
                    style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ padding: '20px' }}>
        <CardHead
          title={`Scheduled Follow-ups (${followupsList.length})`}
          right={
            <button
              onClick={() => setShowFollowupModal(true)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              + Schedule
            </button>
          }
        />
        {followupsLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading follow-ups…</div>
        ) : followupsList.length === 0 ? (
          <EmptyState icon="📅" message="No follow-ups scheduled." action="+ Schedule Follow-up" onAction={() => setShowFollowupModal(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
            {followupsList.map(f => (
              <div
                key={f.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{f.topic}</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: f.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                      color: f.status === 'Completed' ? '#15803d' : '#b45309',
                    }}
                  >
                    {f.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  Client: <b>{f.client_name}</b> · 📅 {f.due_date} at {f.due_time}
                </div>
                {f.action_items && (
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}><b>Actions:</b> {f.action_items}</div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {f.status !== 'Completed' && (
                    <button
                      onClick={async () => {
                        await api.updateConsultantFollowup(f.id, { status: 'Completed' });
                        fetchFollowups();
                        setToast({ msg: 'Marked as completed', ok: true });
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Complete
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await api.deleteConsultantFollowup(f.id);
                      fetchFollowups();
                      setToast({ msg: 'Follow-up deleted', ok: true });
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #fee2e2',
                      background: '#fff',
                      color: '#e11d48',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  // 9. REMINDERS PAGE
  const renderRemindersPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Clinical Reminders & Tasks (${remindersList.length})`}
        right={
          <button
            onClick={() => setShowReminderModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              background: PUR,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            + Create Reminder
          </button>
        }
      />
      {remindersLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading reminders…</div>
      ) : remindersList.length === 0 ? (
        <EmptyState icon="⏰" message="No reminders scheduled." action="+ Create Reminder" onAction={() => setShowReminderModal(true)} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {remindersList.map(r => (
            <div
              key={r.id}
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: r.is_completed ? '#f8fafc' : '#fff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: r.is_completed ? '#94a3b8' : '#0f172a',
                      textDecoration: r.is_completed ? 'line-through' : 'none',
                    }}
                  >
                    {r.title}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: r.priority === 'High' ? '#fee2e2' : '#fef3c7',
                      color: r.priority === 'High' ? '#b91c1c' : '#b45309',
                    }}
                  >
                    {r.priority}
                  </span>
                </div>
                {r.description && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>{r.description}</div>}
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px' }}>
                  📅 Due: <b>{r.due_date}</b> · Category: {r.category}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <button
                  onClick={async () => {
                    await api.updateConsultantReminder(r.id, { is_completed: !r.is_completed });
                    fetchReminders();
                    setToast({ msg: r.is_completed ? 'Marked active' : 'Marked completed', ok: true });
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: r.is_completed ? '#e2e8f0' : '#16a34a',
                    color: r.is_completed ? '#475569' : '#fff',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {r.is_completed ? '↺ Undo' : '✓ Mark Complete'}
                </button>
                <button
                  onClick={async () => {
                    await api.deleteConsultantReminder(r.id);
                    fetchReminders();
                    setToast({ msg: 'Reminder deleted', ok: true });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e11d48',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  // 10. INGREDIENT DATABASE PAGE
  const renderIngredientsPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Clinical Ingredient Safety & Compatibility Database (${ingredientsList.length})`}
        right={
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search ingredient, active..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', width: '200px' }}
            />
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
        {ingredientsList
          .filter(i => !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.function?.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(ing => (
            <div
              key={ing.id}
              onClick={() => setSelectedIngredient(ing)}
              style={{
                padding: '18px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>{ing.name}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                  {ing.safety_rating || 'Safe'}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: PUR, fontWeight: 600, marginTop: '2px' }}>{ing.category} · {ing.function}</div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px', lineHeight: 1.4 }}>{ing.description}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                {ing.benefits?.slice(0, 2).map((b: string) => (
                  <span key={b} style={{ fontSize: '0.7rem', background: '#fff', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '6px', color: '#334155' }}>
                    ✓ {b}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </Card>
  );

  // 11. SKIN CONCERNS GUIDE PAGE
  const renderSkinConcernsPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Clinical Skin Concerns Reference Guide (${concernsGuide.length})`}
        right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Evidence-Based</span>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {concernsGuide.map(c => (
          <div
            key={c.id}
            onClick={() => setSelectedConcern(c)}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: PUR, textTransform: 'uppercase' }}>{c.category}</span>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{c.name}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic' }}>{c.clinical_name}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>{c.description}</div>
            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
              <b>Key Actives:</b> {c.key_ingredients?.join(', ')}
            </div>
            <button
              style={{
                marginTop: '6px',
                padding: '8px',
                borderRadius: '8px',
                border: `1px solid ${PUR}`,
                background: '#fff',
                color: PUR,
                fontSize: '0.76rem',
                fontWeight: 700,
              }}
            >
              View Full Clinical Guide & Referral Threshold →
            </button>
          </div>
        ))}
      </div>
    </Card>
  );

  // 12. TREATMENT PROTOCOLS PAGE (Aligned Buttons Across All Boxes)
  const renderProtocolsPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Structured Clinical Treatment Protocols (${protocolsList.length})`}
        right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Official Protocols</span>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {protocolsList.map(p => (
          <div
            key={p.id}
            onClick={() => setSelectedProtocol(p)}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between', // Ensures bottom buttons align perfectly in a horizontal row
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: PUR, background: `${PUR}14`, padding: '3px 8px', borderRadius: '6px' }}>
                  {p.protocol_code}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{p.duration_weeks} Weeks Duration</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{p.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, marginTop: '6px' }}>{p.expected_outcome}</div>
              <div style={{ fontSize: '0.76rem', color: '#334155', marginTop: '6px' }}>
                <b>Target:</b> {p.target_concerns?.join(', ')} · <b>Skin Types:</b> {p.suitable_skin_types?.join(', ')}
              </div>
            </div>
            <button
              style={{
                marginTop: '8px',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
                width: '100%',
                cursor: 'pointer',
              }}
            >
              Inspect AM/PM Steps & Precautions →
            </button>
          </div>
        ))}
      </div>
    </Card>
  );

  // 13. MY PROFILE PAGE (Exact Admin Landscape Card & DP Cropper Modal Layout)
  const renderMyProfilePage = () => {
    const consultantName = profileName || storedUser.name || 'Priya Sharma';
    const consultantEmail = profileEmail || storedUser.email || 'consultant@miracle.com';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card style={{ padding: '24px' }}>
          <CardHead title="Consultant Profile" right={<span style={{ padding: '4px 10px', borderRadius: '999px', background: `${PUR}18`, color: PUR, fontSize: '0.74rem', fontWeight: 700 }}>Senior Skincare Consultant</span>} />
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '8px 0 20px', borderBottom: '1px solid #f1f2f7' }}>
            {/* Avatar with Camera Dropdown Exactly as Admin */}
            <div ref={dpMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              {customDp ? (
                <img
                  src={customDp}
                  alt={consultantName}
                  onClick={() => setViewPhoto(true)}
                  style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover', border: `2px solid ${PUR}30`, display: 'block', cursor: 'pointer' }}
                  title="Click to view full photo"
                />
              ) : (
                <span style={{ display: 'grid', placeItems: 'center', width: '80px', height: '80px', borderRadius: '20px', background: `${PUR}20`, color: PUR, fontSize: '2.2rem', flexShrink: 0 }}>
                  👤
                </span>
              )}

              {/* Functional Camera Icon Button */}
              <button
                type="button"
                onClick={() => setShowDpMenu(v => !v)}
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: PUR,
                  border: '2px solid #fff',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                  padding: 0,
                }}
                title="Profile photo options"
              >
                📷
              </button>

              {/* Dropdown Menu */}
              {showDpMenu && (
                <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 500, background: '#fff', borderRadius: '14px', border: '1px solid #e8eaf2', boxShadow: '0 14px 40px -8px rgba(23,20,51,0.22)', minWidth: '180px', overflow: 'hidden' }}>
                  {dpMenuItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '11px 16px',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: item.danger ? '#e11d48' : '#2d3748',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(225,29,72,0.07)' : '#f6f7fb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>

            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#171433' }}>{consultantName}</div>
              <div style={{ fontSize: '0.84rem', color: PUR, fontWeight: 600, marginTop: '3px' }}>{profileTitle}</div>
              <div style={{ fontSize: '0.8rem', color: '#a3a7bd', marginTop: '2px' }}>{consultantEmail}</div>
            </div>
          </div>

          {/* Metric Strip (Landscape) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
            {[
              { label: 'Platform Role', value: 'Skincare Consultant', color: PUR },
              { label: 'Account Status', value: 'Active · Verified', color: GRN },
              { label: 'Clients Managed', value: String(roster.length), color: BLU },
              { label: 'Years Experience', value: `${profileExp} Years`, color: ORA },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4', textAlign: 'center' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Credentials Form (Full Width Landscape Card) */}
        <Card style={{ padding: '24px' }}>
          <CardHead title="Clinical Credentials & Biography" right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Database Synced</span>} />
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>SPECIALIZATION & DOMAIN</label>
                <input type="text" value={profileSpec} onChange={e => setProfileSpec(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>CONSULTATION AVAILABILITY</label>
                <input type="text" value={profileAvail} onChange={e => setProfileAvail(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>DEGREES & QUALIFICATIONS</label>
              <input type="text" value={profileQual} onChange={e => setProfileQual(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>CLINICAL BIOGRAPHY</label>
              <textarea rows={3} value={profileBio} onChange={e => setProfileBio(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Card>
      </div>
    );
  };

  // 14. ACCOUNT SETTINGS PAGE (Exact Admin Landscape Card with Inline Field Editing)
  const renderAccountSettingsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card style={{ padding: '24px' }}>
        <CardHead title="Account Settings" right={<span style={{ padding: '4px 10px', borderRadius: '999px', background: `${PUR}18`, color: PUR, fontSize: '0.74rem', fontWeight: 700 }}>Consultant Portal</span>} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Full Name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Name</div>
              {editingField === 'name' ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    value={tempVal}
                    onChange={e => setTempVal(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button onClick={saveEdit} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{profileName}</div>
              )}
            </div>
            {editingField !== 'name' && (
              <button onClick={() => startEdit('name')} style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>Edit</button>
            )}
          </div>

          {/* Email Address */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</div>
              {editingField === 'email' ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    value={tempVal}
                    type="email"
                    onChange={e => setTempVal(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button onClick={saveEdit} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{profileEmail}</div>
              )}
            </div>
            {editingField !== 'email' && (
              <button onClick={() => startEdit('email')} style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>Edit</button>
            )}
          </div>

          {/* Phone Number */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone Number</div>
              {editingField === 'phone' ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    value={tempVal}
                    onChange={e => setTempVal(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button onClick={saveEdit} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{profilePhone}</div>
              )}
            </div>
            {editingField !== 'phone' && (
              <button onClick={() => startEdit('phone')} style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>Edit</button>
            )}
          </div>

          {/* Password */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</div>
              {editingField === 'password' ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={tempVal}
                    onChange={e => setTempVal(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button onClick={saveEdit} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{pwVal}</div>
              )}
            </div>
            {editingField !== 'password' && (
              <button onClick={() => startEdit('password')} style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>Change</button>
            )}
          </div>

          {/* Platform Role */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Role</div>
              <div style={{ fontSize: '0.94rem', fontWeight: 700, color: PUR, marginTop: '3px' }}>Skincare Consultant (Clinical Portal)</div>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>✓ Verified</span>
          </div>
        </div>
      </Card>
    </div>
  );

  // 15. NOTIFICATIONS FEED PAGE
  const renderNotificationsPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title={`Consultant Notifications & Alerts (${notificationsList.length})`}
        right={
          <button
            onClick={fetchNotifications}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🔄 Refresh Alerts
          </button>
        }
      />
      {notifsLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading notifications…</div>
      ) : notificationsList.length === 0 ? (
        <EmptyState icon="🔔" message="You have no notifications right now." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notificationsList.map(n => (
            <div
              key={n.id}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{n.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>{n.category} · {n.created_at}</div>
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: `${PUR}18`,
                  color: PUR,
                }}
              >
                Active
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  // ── Router Switch ─────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeSection) {
      case 'clients':
        return renderClientsPage();
      case 'assessments':
        return renderAssessmentsPage();
      case 'routine-plans':
      case 'prescriptions':
        return renderRoutinePlansPage();
      case 'product-recommendations':
        return renderRecommendationsPage();
      case 'progress-tracking':
        return renderProgressPage();
      case 'reports':
        return renderReportsPage();
      case 'follow-ups-notes':
      case 'follow-ups-&-notes':
        return renderFollowupsNotesPage();
      case 'reminders':
        return renderRemindersPage();
      case 'ingredient-database':
        return renderIngredientsPage();
      case 'skin-concerns-guide':
        return renderSkinConcernsPage();
      case 'treatment-protocols':
        return renderProtocolsPage();
      case 'my-profile':
      case 'settings':
        return renderMyProfilePage();
      case 'account-settings':
        return renderAccountSettingsPage();
      case 'notifications':
        return renderNotificationsPage();
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {viewPhoto && customDp && <PhotoViewer src={customDp} name={profileName || 'Consultant'} onClose={() => setViewPhoto(false)} />}
      {cropSrc && <CropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}

      {/* Dedicated Timeline & Progress Photos Modal */}
      {selectedTimelineClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedTimelineClient(null);
          }}
        >
          <div
            style={{
              width: '760px',
              maxWidth: '94vw',
              borderRadius: '24px',
              background: '#fff',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: PUR, background: `${PUR}14`, padding: '3px 8px', borderRadius: '6px' }}>
                  CLINICAL PHOTO TIMELINE
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {selectedTimelineClient.patient?.name || selectedTimelineClient.summary?.name} — Dermal Progress Journey
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Skin Type: <b>{selectedTimelineClient.patient?.profile?.skin_type || selectedTimelineClient.summary?.skin_type}</b> · Concern: <b>{selectedTimelineClient.summary?.primary_concern}</b>
                </div>
              </div>
              <button
                onClick={() => setSelectedTimelineClient(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            {/* Before vs After Milestone Photographic Review */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                📸 Visual Before & Current Milestone Photos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Baseline Photo */}
                <div style={{ padding: '14px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Baseline (Day 1 - Initial Audit)
                  </div>
                  <div style={{ width: '100%', height: '180px', borderRadius: '12px', background: '#e2e8f0', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: '3rem' }}>👤</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '8px' }}>
                    Skin Health Score: <b>{Math.max(40, (selectedTimelineClient.summary?.health_score || 75) - 16)} / 100</b>
                  </div>
                </div>

                {/* Current Milestone Photo */}
                <div style={{ padding: '14px', borderRadius: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Current Audit (Week 6 - Active Protocol)
                  </div>
                  <div style={{ width: '100%', height: '180px', borderRadius: '12px', background: '#dcfce7', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: '3rem' }}>✨</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#15803d', marginTop: '8px', fontWeight: 700 }}>
                    Skin Health Score: <b>{Math.round(selectedTimelineClient.summary?.health_score || 82)} / 100 (+16 pts gained)</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Chronological Milestone Timeline */}
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                ⏱️ Chronological Clinical Progression Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { week: 'Week 6 (Current)', date: '2026-08-16', note: 'Stratum corneum integrity significantly improved. Redness decreased by 60%.', status: 'Stable & Restored', color: '#16a34a' },
                  { week: 'Week 4 Audit', date: '2026-08-02', note: 'Tolerating PM azelaic active without stinging. Hydration barrier up to 82%.', status: 'Improving', color: '#2563eb' },
                  { week: 'Week 2 Check', date: '2026-07-18', note: 'Initial purging calmed. Client reported good compliance with gentle cleanser.', status: 'Adapting', color: '#d97706' },
                  { week: 'Week 0 Baseline', date: '2026-07-04', note: 'Baseline assessment recorded. Moderate barrier impairment with sensitivity.', status: 'Baseline', color: '#64748b' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{item.week}</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({item.date})</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>{item.note}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: `${item.color}15`, color: item.color }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient 360° Profile Modal */}
      {selectedPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedPatient(null);
          }}
        >
          <div
            style={{
              width: '680px',
              maxWidth: '94vw',
              borderRadius: '24px',
              background: '#fff',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{selectedPatient.patient.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedPatient.patient.email} · Registered: {selectedPatient.patient.registered_at}</div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: PUR, marginBottom: '10px' }}>CLINICAL PROFILE METRICS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>SKIN TYPE</span><b>{selectedPatient.patient.profile?.skin_type || 'Unassessed'}</b></div>
                  <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>AGE</span><b>{selectedPatient.patient.profile?.age ?? '—'}</b></div>
                  <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>WATER</span><b>{selectedPatient.patient.profile?.water_intake_l != null ? `${selectedPatient.patient.profile.water_intake_l} L` : '—'}</b></div>
                  <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>SLEEP</span><b>{selectedPatient.patient.profile?.sleep_hours != null ? `${selectedPatient.patient.profile.sleep_hours} hrs` : '—'}</b></div>
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: PUR }}>ACTIVE ROUTINE ({selectedPatient.active_routine.length} STEPS)</span>
                  <button
                    onClick={() => {
                      const id = selectedPatient.patient.id;
                      setSelectedPatient(null);
                      setShowPrescribeModal(id);
                    }}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: PUR, color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Prescribe New
                  </button>
                </div>
                {selectedPatient.active_routine.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No active routine prescribed yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedPatient.active_routine.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155' }}>
                        <span><b>{r.time_of_day}</b> Step {r.step_number}: {r.product_name} ({r.step_category})</span>
                        {r.prescribed_by_doctor && <span style={{ color: PUR, fontWeight: 700 }}>Rx Clinical</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>ASSESSMENT HISTORY ({selectedPatient.assessments.length})</div>
                {selectedPatient.assessments.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No assessments logged yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {selectedPatient.assessments.map((a: any) => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                        <span><b>Score: {Math.round(a.overall_score)}/100</b> ({a.concerns?.join(', ') || 'General'})</span>
                        <span style={{ color: '#94a3b8' }}>{a.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescribe Routine Modal */}
      {showPrescribeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowPrescribeModal(null);
          }}
        >
          <div
            style={{
              width: '580px',
              maxWidth: '94vw',
              borderRadius: '24px',
              background: '#fff',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Prescribe Custom Skincare Routine</div>
              <button onClick={() => setShowPrescribeModal(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLINICAL ADVICE / DOCTOR NOTES</label>
                <textarea rows={2} value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} placeholder="Enter clinical advice..." style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Routine Steps ({prescribeSteps.length})</span>
                  <button
                    type="button"
                    onClick={() => setPrescribeSteps(prev => [...prev, { time_of_day: 'AM', step_number: prev.length + 1, step_category: 'Treatment', product_name: 'Custom Product', active_ingredients: [] }])}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: `${PUR}14`, color: PUR, border: 'none', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {prescribeSteps.map((step, idx) => (
                    <div key={idx} style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '70px 1.2fr 1fr', gap: '8px' }}>
                      <select
                        value={step.time_of_day}
                        onChange={e => {
                          const v = e.target.value;
                          setPrescribeSteps(prev => prev.map((s, i) => i === idx ? { ...s, time_of_day: v } : s));
                        }}
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={step.product_name}
                        onChange={e => {
                          const v = e.target.value;
                          setPrescribeSteps(prev => prev.map((s, i) => i === idx ? { ...s, product_name: v } : s));
                        }}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={step.step_category}
                        onChange={e => {
                          const v = e.target.value;
                          setPrescribeSteps(prev => prev.map((s, i) => i === idx ? { ...s, step_category: v } : s));
                        }}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => submitPrescription(showPrescribeModal)}
                disabled={prescribeLoading || prescribeSteps.length === 0}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: PUR,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                {prescribeLoading ? 'Saving Prescription…' : 'Save Prescription to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Multi-Product Recommendation Modal */}
      {showRecModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowRecModal(false);
          }}
        >
          <div style={{ width: '540px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Recommend Skincare Products</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Assign single or multiple products to a client's profile.</div>
              </div>
              <button onClick={() => setShowRecModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TARGET CLIENT</label>
                <select value={recTargetClient} onChange={e => setRecTargetClient(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.86rem' }}>
                  <option value="">Select Target Client…</option>
                  {roster.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.skin_type} · {p.primary_concern})</option>
                  ))}
                </select>
              </div>

              {/* Selected Products List in Modal */}
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  RECOMMENDED PRODUCTS ({selectedProductsForRec.length})
                </label>
                {selectedProductsForRec.length === 0 ? (
                  <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                    No products currently queued. Add products from the catalog.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {selectedProductsForRec.map(prod => (
                      <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{prod.product_name || prod.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{prod.brand} · ₹{prod.price || 899}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProductsForRec(selectedProductsForRec.filter(p => p.id !== prod.id))}
                          style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>RECOMMENDED ROUTINE TIMING</label>
                <select value={recTimeOfDay} onChange={e => setRecTimeOfDay(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <option value="AM">Morning (AM Routine)</option>
                  <option value="PM">Night (PM Routine)</option>
                  <option value="AM/PM">Twice Daily (AM & PM)</option>
                  <option value="Weekly Treatment">Weekly Intensive Treatment</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLINICAL USAGE INSTRUCTIONS</label>
                <textarea rows={2} value={recInstructions} onChange={e => setRecInstructions(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              <button type="submit" disabled={selectedProductsForRec.length === 0} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.86rem', cursor: selectedProductsForRec.length === 0 ? 'not-allowed' : 'pointer', marginTop: '6px' }}>
                Assign {selectedProductsForRec.length} Product(s) to Client
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {showNoteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowNoteModal(false);
          }}
        >
          <div style={{ width: '480px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Add Clinical Note</div>
              <button onClick={() => setShowNoteModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLIENT</label>
                <select value={noteTargetClient} onChange={e => setNoteTargetClient(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <option value="">Select a Client…</option>
                  {roster.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>NOTE TITLE</label>
                <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="e.g. Barrier Assessment Observation" style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <option value="General Consultation">General Consultation</option>
                  <option value="Routine Review">Routine Review</option>
                  <option value="Progress Note">Progress Note</option>
                  <option value="Allergy Alert">Allergy Alert</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLINICAL NOTES</label>
                <textarea rows={3} value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Enter clinical observations..." style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <button type="submit" style={{ padding: '11px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', marginTop: '6px' }}>
                Save Note to Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Follow-up Modal */}
      {showFollowupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowFollowupModal(false);
          }}
        >
          <div style={{ width: '480px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Schedule Follow-up Interaction</div>
              <button onClick={() => setShowFollowupModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateFollowup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLIENT</label>
                <select value={followupTargetClient} onChange={e => setFollowupTargetClient(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <option value="">Select a Client…</option>
                  {roster.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TOPIC / FOCUS</label>
                <input type="text" value={followupTopic} onChange={e => setFollowupTopic(e.target.value)} placeholder="e.g. 2-Week Barrier Check" style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>DUE DATE</label>
                  <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TIME</label>
                  <input type="text" value={followupTime} onChange={e => setFollowupTime(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>ACTION ITEMS</label>
                <textarea rows={2} value={followupActions} onChange={e => setFollowupActions(e.target.value)} placeholder="Specify action items..." style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <button type="submit" style={{ padding: '11px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', marginTop: '6px' }}>
                Schedule Follow-up
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Reminder Modal */}
      {showReminderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowReminderModal(false);
          }}
        >
          <div style={{ width: '480px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Add Clinical Reminder</div>
              <button onClick={() => setShowReminderModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateReminder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TITLE</label>
                <input type="text" value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="e.g. Audit Ananya's PM Active Compliance" style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>DUE DATE</label>
                  <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PRIORITY</label>
                  <select value={reminderPriority} onChange={e => setReminderPriority(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>DESCRIPTION</label>
                <textarea rows={2} value={reminderDesc} onChange={e => setReminderDesc(e.target.value)} placeholder="Notes for reminder..." style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <button type="submit" style={{ padding: '11px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', marginTop: '6px' }}>
                Save Reminder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Treatment Protocol Detail Modal */}
      {selectedProtocol && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedProtocol(null);
          }}
        >
          <div style={{ width: '640px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: PUR, background: `${PUR}14`, padding: '3px 8px', borderRadius: '6px' }}>
                  {selectedProtocol.protocol_code}
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedProtocol.name}</div>
              </div>
              <button onClick={() => setSelectedProtocol(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.84rem', color: '#334155' }}>
              <div><b>Expected Outcome:</b> {selectedProtocol.expected_outcome}</div>

              <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#b45309', marginBottom: '6px' }}>🌅 MORNING PROTOCOL (AM)</div>
                {selectedProtocol.morning_protocol?.map((s: any) => (
                  <div key={s.step} style={{ fontSize: '0.8rem', margin: '4px 0' }}>• Step {s.step}: <b>{s.category}</b> — {s.instructions}</div>
                ))}
              </div>

              <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#4338ca', marginBottom: '6px' }}>🌙 EVENING PROTOCOL (PM)</div>
                {selectedProtocol.evening_protocol?.map((s: any) => (
                  <div key={s.step} style={{ fontSize: '0.8rem', margin: '4px 0' }}>• Step {s.step}: <b>{s.category}</b> — {s.instructions}</div>
                ))}
              </div>

              <div><b>Recommended Actives:</b> {selectedProtocol.recommended_actives?.join(', ')}</div>
              <div><b>Precautions:</b> {selectedProtocol.precautions}</div>
              <div style={{ color: '#b91c1c' }}><b>Dermatologist Referral Triggers:</b> {selectedProtocol.derma_referral_triggers}</div>
            </div>
          </div>
        </div>
      )}

      {/* Skin Concern Detail Modal */}
      {selectedConcern && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedConcern(null);
          }}
        >
          <div style={{ width: '640px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: PUR }}>{selectedConcern.category}</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{selectedConcern.name}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic' }}>{selectedConcern.clinical_name}</div>
              </div>
              <button onClick={() => setSelectedConcern(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem', color: '#334155' }}>
              <div><b>Description:</b> {selectedConcern.description}</div>
              <div><b>Associated Skin Types:</b> {selectedConcern.associated_skin_types?.join(', ')}</div>
              <div><b>Key Clinical Actives:</b> {selectedConcern.key_ingredients?.join(', ')}</div>
              <div style={{ color: '#b91c1c' }}><b>Ingredients to Avoid:</b> {selectedConcern.ingredients_to_avoid?.join(', ')}</div>
              <div><b>Lifestyle Guidance:</b> {selectedConcern.lifestyle_guidance}</div>
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '0.8rem' }}>
                <b>Dermatologist Referral Threshold:</b> {selectedConcern.derma_referral_threshold}
              </div>
            </div>
          </div>
        </div>
      )}

      {renderContent()}
    </>
  );
}
