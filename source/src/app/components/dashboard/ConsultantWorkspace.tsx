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
  PATHS,
  PUR,
  BLU,
  ORA,
  PNK,
  GRN,
  TEA,
  FACE,
  UpEl,
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
  // Generate consistent color based on string hash or fallback palette
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

// ── Photo Viewer Lightbox ────────────────────────────────────────────────────
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

// ── DP Cropper Modal ────────────────────────────────────────────────────────
function DpCropModal({ src, onSave, onCancel }: { src: string; onSave: (cropped: string) => void; onCancel: () => void }) {
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
    setOffset({
      x: dragStart.current.offX + (e.clientX - dragStart.current.x),
      y: dragStart.current.offY + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSaveCropped = () => {
    if (!canvasRef.current) return;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = 256;
    cropCanvas.height = 256;
    const cCtx = cropCanvas.getContext('2d');
    if (!cCtx) return;

    cCtx.beginPath();
    cCtx.arc(128, 128, 128, 0, Math.PI * 2);
    cCtx.clip();
    cCtx.drawImage(canvasRef.current, 0, 0, 256, 256);
    onSave(cropCanvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '28px',
          width: '380px',
          maxWidth: '92vw',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Crop Profile Photo</h3>
          <button onClick={onCancel} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        {/* Viewport Canvas */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: `${VIEW_SIZE}px`,
            height: `${VIEW_SIZE}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            border: `3px solid ${PUR}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            position: 'relative',
            background: '#f1f5f9',
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>

        {/* Zoom Slider */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: PUR }}
          />
          <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '32px' }}>{Math.round(zoom * 100)}%</span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCropped}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: PUR,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Save Photo
          </button>
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
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('All');

  // Modals
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Section Specific States
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  const [routinesList, setRoutinesList] = useState<any[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);

  // Available Products catalog for recommendation
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductToRec, setSelectedProductToRec] = useState<any | null>(null);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);
  const [recTargetClient, setRecTargetClient] = useState('');
  const [recProdName, setRecProdName] = useState('');
  const [recProdBrand, setRecProdBrand] = useState('Miracle Formulations');
  const [recCategory, setRecCategory] = useState('Treatment');
  const [recConcern, setRecConcern] = useState('Barrier Repair');
  const [recInstructions, setRecInstructions] = useState('Apply 3-4 drops in evening routine after gentle wash.');
  const [recTimeOfDay, setRecTimeOfDay] = useState('PM');
  const [recPrice, setRecPrice] = useState('1499');

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
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<any | null>(null);

  const [concernsGuide, setConcernsGuide] = useState<any[]>([]);
  const [concernsLoading, setConcernsLoading] = useState(false);
  const [selectedConcern, setSelectedConcern] = useState<any | null>(null);

  const [ingredientsList, setIngredientsList] = useState<any[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);

  // Profile & Settings
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [profileSpec, setProfileSpec] = useState('');
  const [profileExp, setProfileExp] = useState(8);
  const [profileBio, setProfileBio] = useState('');
  const [profileQual, setProfileQual] = useState('');
  const [profileAvail, setProfileAvail] = useState('');

  // DP Management States
  const dpKey = 'miracle_dp_consultant';
  const [customDp, setCustomDp] = useState<string | null>(() => localStorage.getItem(dpKey) || null);
  const [viewPhoto, setViewPhoto] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showDpMenu, setShowDpMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

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

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchRoster = useCallback(() => {
    setRosterLoading(true);
    api.getConsultantRoster()
      .then(d => {
        // Sanitize skin types: replace raw "string" with "Unassessed" or real skin type
        const sanitized = (d.patients || []).map((p: any) => ({
          ...p,
          skin_type: (!p.skin_type || p.skin_type === 'string' || p.skin_type.trim() === '') ? 'Unassessed' : p.skin_type,
          primary_concern: (!p.primary_concern || p.primary_concern === 'string') ? 'General Care' : p.primary_concern,
        }));
        setRoster(sanitized);
        setRosterError(null);
      })
      .catch(() => setRosterError('Failed to load client roster. Please refresh.'))
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

  const fetchProductsCatalog = useCallback(() => {
    setProductsLoading(true);
    api.getAdminProducts({ per_page: 50 })
      .then(d => setAllProducts(d.products || d.items || []))
      .catch(() => setAllProducts([]))
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
    setProtocolsLoading(true);
    api.getConsultantTreatmentProtocols()
      .then(d => setProtocolsList(d.protocols || []))
      .catch(() => setProtocolsList([]))
      .finally(() => setProtocolsLoading(false));
  }, []);

  const fetchConcernsGuide = useCallback(() => {
    setConcernsLoading(true);
    api.getConsultantSkinConcernsGuide()
      .then(d => setConcernsGuide(d.concerns || []))
      .catch(() => setConcernsGuide([]))
      .finally(() => setConcernsLoading(false));
  }, []);

  const fetchIngredients = useCallback(() => {
    setIngredientsLoading(true);
    api.getConsultantIngredients()
      .then(d => setIngredientsList(d.ingredients || []))
      .catch(() => setIngredientsList([]))
      .finally(() => setIngredientsLoading(false));
  }, []);

  const fetchProfile = useCallback(() => {
    setProfileLoading(true);
    api.getConsultantProfile()
      .then(d => {
        setProfileData(d);
        setProfileName(d.name || '');
        setProfilePhone(d.phone || '');
        setProfileTitle(d.title || '');
        setProfileSpec(d.specialization || '');
        setProfileExp(d.experience_years || 8);
        setProfileBio(d.bio || '');
        setProfileQual(d.qualifications || '');
        setProfileAvail(d.availability || '');
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
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
        fetchProductsCatalog();
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
    setPatientLoading(true);
    try {
      const d = await api.getPatientDetails(id);
      setSelectedPatient(d);
    } catch {
      setToast({ msg: 'Failed to load client details', ok: false });
    } finally {
      setPatientLoading(false);
    }
  };

  // DP Handlers
  const handleDpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropSrc(reader.result as string);
        setShowDpMenu(false);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropSave = (croppedDataUrl: string) => {
    localStorage.setItem(dpKey, croppedDataUrl);
    setCustomDp(croppedDataUrl);
    setCropSrc(null);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setToast({ msg: 'Profile photo updated successfully', ok: true });
  };

  const handleRemoveDp = () => {
    localStorage.removeItem(dpKey);
    setCustomDp(null);
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setToast({ msg: 'Profile photo removed', ok: true });
  };

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setToast({ msg: 'New passwords do not match', ok: false });
      return;
    }
    setPwSaving(true);
    try {
      await api.changeConsultantPassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setToast({ msg: 'Password changed successfully', ok: true });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to update password', ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  const handleCreateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTargetClient || !recProdName) {
      setToast({ msg: 'Please select a client and enter product name', ok: false });
      return;
    }
    try {
      await api.createConsultantRecommendation({
        client_id: recTargetClient,
        product_name: recProdName,
        brand: recProdBrand,
        category: recCategory,
        target_concern: recConcern,
        usage_instructions: recInstructions,
        time_of_day: recTimeOfDay,
        price: parseFloat(recPrice) || 999,
      });
      setToast({ msg: 'Product recommendation sent to client', ok: true });
      setShowRecModal(false);
      fetchRecommendations();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to create recommendation', ok: false });
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

  // Calculate live Top 4 Skin Concerns with spacious margin
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
    .slice(0, 4) // Top 4 skin concerns strictly
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

  // Current consultant avatar
  const currentAvatar = customDp || FACE.priya;

  // ── Render Pages / Sections ───────────────────────────────────────────────

  // 1. DASHBOARD OVERVIEW
  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Client Roster Card with Proper Sticky Header & Extended MaxHeight */}
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
          {/* Extended Scrollable Container to eliminate excess whitespace */}
          <div
            className="dash-scroll"
            style={{
              maxHeight: '480px',
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

        {/* Right Side: Large Donut Chart + Top 4 Concerns with perfect bottom spacing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sizable Donut Chart Card with dynamic color palette */}
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

          {/* Top 4 Skin Concerns Card with Generous Bottom Padding */}
          <Card style={{ padding: '20px 20px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Top Skin Concerns (Top 4)
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

  // 5. PRODUCT RECOMMENDATIONS PAGE (Now displays all products catalog + assigned recommendations)
  const renderRecommendationsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Assigned Recommendations section */}
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

      {/* Available Products Catalog for Consultant Selection */}
      <Card style={{ padding: '24px' }}>
        <CardHead
          title={`Available Skincare Products Catalog (${allProducts.length})`}
          right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Select a Product to Recommend</span>}
        />
        {productsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading product catalog…</div>
        ) : allProducts.length === 0 ? (
          <EmptyState icon="📦" message="No products loaded in database catalog." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {allProducts.map(prod => (
              <div
                key={prod.id}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, background: `${PUR}14`, padding: '2px 8px', borderRadius: '6px' }}>
                      {prod.category || 'Skincare'}
                    </span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>₹{prod.price || '899'}</span>
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{prod.product_name || prod.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{prod.brand}</div>
                  {prod.description && (
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '6px', lineHeight: 1.35 }}>
                      {prod.description.length > 100 ? `${prod.description.slice(0, 100)}…` : prod.description}
                    </div>
                  )}
                  {prod.skin_types && (
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                      Skin: {Array.isArray(prod.skin_types) ? prod.skin_types.join(', ') : prod.skin_types}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setRecProdName(prod.product_name || prod.name);
                    setRecProdBrand(prod.brand || 'Miracle Formulations');
                    setRecCategory(prod.category || 'Treatment');
                    setRecPrice(String(prod.price || 999));
                    setShowRecModal(true);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: PUR,
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Recommend to Client
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  // 6. PROGRESS TRACKING PAGE
  const renderProgressPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card style={{ padding: '24px' }}>
        <CardHead
          title="Client Skin Health & Progression Tracking"
          right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Database Analytics</span>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {roster.map(p => (
            <div
              key={p.patient_id}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: p.health_score && p.health_score >= 75 ? '#16a34a' : '#b45309' }}>
                  {p.health_score ? `${Math.round(p.health_score)}/100` : '—'}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Skin Type: <b>{p.skin_type}</b> · Concern: <b>{p.primary_concern}</b>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${p.health_score || 0}%`,
                    background: p.health_score && p.health_score >= 75 ? '#16a34a' : '#f59e0b',
                    borderRadius: '999px',
                  }}
                />
              </div>
              <button
                onClick={() => openPatient(p.patient_id)}
                style={{
                  marginTop: '6px',
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  background: PUR,
                  color: '#fff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Inspect Progress Photos & Score Logs
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // 7. REPORTS PAGE
  const renderReportsPage = () => (
    <Card style={{ padding: '24px' }}>
      <CardHead
        title="Clinical Assessment & Regimen Reports"
        right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Export Ready</span>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {roster.map(p => (
          <div
            key={p.patient_id}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Client ID: {p.patient_id.slice(0, 8)}…</div>
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#334155' }}>
                <div>• Overall Score: <b>{p.health_score ? `${Math.round(p.health_score)}/100` : 'Unassessed'}</b></div>
                <div>• Skin Type: <b>{p.skin_type}</b></div>
                <div>• Adherence Rate: <b>{p.compliance_rate}%</b></div>
                <div>• Last Assessment: <b>{p.last_assessment_date || 'None'}</b></div>
              </div>
            </div>
            <button
              onClick={() => openPatient(p.patient_id)}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Generate Full Summary Report
            </button>
          </div>
        ))}
      </div>
    </Card>
  );

  // 8. FOLLOW-UPS & NOTES PAGE
  const renderFollowupsNotesPage = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '16px' }}>
      {/* Notes Column */}
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

      {/* Follow-ups Column */}
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

  // 12. TREATMENT PROTOCOLS PAGE
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
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: PUR, background: `${PUR}14`, padding: '3px 8px', borderRadius: '6px' }}>
                {p.protocol_code}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{p.duration_weeks} Weeks Duration</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>{p.expected_outcome}</div>
            <div style={{ fontSize: '0.76rem', color: '#334155' }}>
              <b>Target:</b> {p.target_concerns?.join(', ')} · <b>Skin Types:</b> {p.suitable_skin_types?.join(', ')}
            </div>
            <button
              style={{
                marginTop: '6px',
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontSize: '0.76rem',
                fontWeight: 700,
              }}
            >
              Inspect AM/PM Steps & Precautions →
            </button>
          </div>
        ))}
      </div>
    </Card>
  );

  // 13. MY PROFILE PAGE (Dedicated page with DP View/Change/Crop/Remove + Comprehensive Professional Fields)
  const renderMyProfilePage = () => (
    <Card style={{ padding: '28px', maxWidth: '880px', margin: '0 auto', width: '100%' }}>
      <CardHead
        title="Consultant Professional Profile & Credentials"
        right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Database Synced</span>}
      />
      {profileLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading profile…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar / DP Management Hero Header */}
          <div
            style={{
              padding: '24px',
              borderRadius: '20px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={currentAvatar}
                  alt={profileName || 'Consultant'}
                  onClick={() => setViewPhoto(true)}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    border: `3px solid ${PUR}`,
                    boxShadow: '0 8px 24px rgba(47,107,76,0.2)',
                    cursor: 'pointer',
                  }}
                  title="Click to view full photo"
                />
                <button
                  type="button"
                  onClick={() => setShowDpMenu(v => !v)}
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: PUR,
                    border: '2px solid #fff',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                  title="Photo options"
                >
                  📷
                </button>
              </div>

              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{profileName || 'Priya Sharma'}</div>
                <div style={{ fontSize: '0.84rem', color: PUR, fontWeight: 700, marginTop: '2px' }}>{profileTitle || 'Senior Skincare Consultant'}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  {profileSpec || 'Acne Barrier Repair & Botanical Science'} · {profileExp} Years Experience
                </div>
              </div>
            </div>

            {/* DP Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setViewPhoto(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                👁️ View Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: PUR,
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📸 Change / Crop DP
              </button>
              {customDp && (
                <button
                  type="button"
                  onClick={handleRemoveDp}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #fee2e2',
                    background: '#fff',
                    color: '#e11d48',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Remove
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleDpUpload} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>FULL LEGAL NAME</label>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>PHONE NUMBER</label>
                <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>PROFESSIONAL TITLE</label>
                <input type="text" value={profileTitle} onChange={e => setProfileTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>EXPERIENCE (YEARS)</label>
                <input type="number" value={profileExp} onChange={e => setProfileExp(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>PRIMARY SPECIALIZATION & DOMAIN</label>
              <input type="text" value={profileSpec} onChange={e => setProfileSpec(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>QUALIFICATIONS, DEGREES & CERTIFICATIONS</label>
              <input type="text" value={profileQual} onChange={e => setProfileQual(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>CONSULTATION AVAILABILITY SCHEDULE</label>
              <input type="text" value={profileAvail} onChange={e => setProfileAvail(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>PROFESSIONAL CLINICAL BIOGRAPHY</label>
              <textarea rows={4} value={profileBio} onChange={e => setProfileBio(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.86rem', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: PUR,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              {profileSaving ? 'Saving Profile Changes…' : 'Save Profile Credentials'}
            </button>
          </form>
        </div>
      )}
    </Card>
  );

  // 14. ACCOUNT SETTINGS PAGE (Dedicated page for Security, Password, Session, and Account Management)
  const renderAccountSettingsPage = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '16px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Password and Credential Management */}
      <Card style={{ padding: '24px' }}>
        <CardHead title="Change Password & Security Credentials" right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Argon2 Encrypted</span>} />
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CURRENT PASSWORD</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>NEW PASSWORD</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
          </div>

          <button
            type="submit"
            disabled={pwSaving || !currentPw || !newPw}
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: (pwSaving || !currentPw || !newPw) ? '#94a3b8' : '#0f172a',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: (pwSaving || !currentPw || !newPw) ? 'not-allowed' : 'pointer',
              marginTop: '6px',
            }}
          >
            {pwSaving ? 'Updating Password…' : 'Update Security Password'}
          </button>
        </form>
      </Card>

      {/* Account Info and Preferences */}
      <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <CardHead title="Consultant Account Overview" right={<span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700 }}>Active · Verified</span>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: '#334155' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>AUTHENTICATED EMAIL</span>
              <b>{profileData?.email || 'consultant@miracle.com'}</b>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>ACCOUNT ROLE</span>
              <b>Skincare Consultant (Clinical Portal)</b>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>ACCOUNT STATUS</span>
              <b>{profileData?.account_status || 'Active · Verified Professional'}</b>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            🔒 All database interactions are protected by JWT session authentication and role-based access control.
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
      {viewPhoto && <PhotoViewer src={currentAvatar} name={profileName || 'Consultant'} onClose={() => setViewPhoto(false)} />}
      {cropSrc && <DpCropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}

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

      {/* Create Product Recommendation Modal */}
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
          <div style={{ width: '480px', maxWidth: '94vw', borderRadius: '24px', background: '#fff', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Recommend Skincare Product</div>
              <button onClick={() => setShowRecModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TARGET CLIENT</label>
                <select value={recTargetClient} onChange={e => setRecTargetClient(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <option value="">Select a Client…</option>
                  {roster.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.skin_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PRODUCT NAME</label>
                <input type="text" value={recProdName} onChange={e => setRecProdName(e.target.value)} placeholder="e.g. Cica Barrier Repair Cream" style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TIMING</label>
                  <select value={recTimeOfDay} onChange={e => setRecTimeOfDay(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                    <option value="Both">Both (AM/PM)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PRICE (₹)</label>
                  <input type="number" value={recPrice} onChange={e => setRecPrice(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>USAGE INSTRUCTIONS</label>
                <input type="text" value={recInstructions} onChange={e => setRecInstructions(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" style={{ padding: '11px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', marginTop: '6px' }}>
                Save & Assign to Client
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
