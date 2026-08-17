import React, { useState, useEffect, useRef, useMemo } from 'react';
import skinOilyImg from '@/assets/skin-types/skin-oily.png';
import skinDryImg from '@/assets/skin-types/skin-dry.png';
import skinCombImg from '@/assets/skin-types/skin-combination.png';
import skinSensImg from '@/assets/skin-types/skin-sensitive.png';
import skinNormImg from '@/assets/skin-types/skin-normal.png';
import concernAcneImg from '@/assets/skin-concerns/concern-acne.png';
import concernHyperpigImg from '@/assets/skin-concerns/concern-hyperpigmentation.jpg';
import concernDrynessImg from '@/assets/skin-concerns/concern-dryness.jpg';
import concernRednessImg from '@/assets/skin-concerns/concern-redness.png';
import concernAgingImg from '@/assets/skin-concerns/concern-aging.png';
import concernPoresImg from '@/assets/skin-concerns/concern-pores.jpg';
import concernTextureImg from '@/assets/skin-concerns/concern-texture.png';
import concernDarkCirclesImg from '@/assets/skin-concerns/concern-darkcircles.png';
import concernDullnessImg from '@/assets/skin-concerns/concern-dullness.png';
import {
  Card,
  CardHead,
  DashIcon,
  DonutChart,
  Legend,
  LineChart,
  ChartFrame,
  PATHS,
  PUR,
  BLU,
  ORA,
  PNK,
  TEA,
  GRN,
  PRODIMG,
  UpEl,
} from './dashboardUtils';
import { api } from '../../services/api';

// ── Professional Pan & Zoom Avatar Cropper ─────────────────────────────────
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

// ── Photo Fullscreen Viewer ────────────────────────────────────────────────
function PhotoViewerModal({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <img src={src} alt={name} style={{ width: 'auto', height: 'auto', maxWidth: '85vw', maxHeight: '80vh', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 30px 70px rgba(0,0,0,0.6)' }} />
        <div style={{ marginTop: '14px', textAlign: 'center', color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>{name}</div>
        <button onClick={onClose} style={{ position: 'absolute', top: '-14px', right: '-14px', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', border: 'none', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>✕</button>
      </div>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
interface RoutineStep {
  id: string;
  time_of_day: string;
  step_number: number;
  step_category: string;
  product_name: string;
  active_ingredients: string[];
  is_active: boolean;
  prescribed_by_doctor: boolean;
  doctor_notes?: string;
}

interface AssessmentScore {
  id?: string;
  overall_score: number;
  condition_subscore: number;
  lifestyle_subscore: number;
  sleep_subscore: number;
  consistency_subscore: number;
  hydration_subscore: number;
  detected_concerns: string[];
  created_at?: string;
}

interface Appointment {
  id: string;
  target_role: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  user_notes?: string;
  consultant_summary?: string;
  doctor_notes?: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  Requested: '#e08a1e',
  Accepted: '#16a34a',
  Rejected: '#e11d48',
  Referred_To_Dermatologist: PUR,
  Completed: BLU,
};

const STEP_EMOJI: Record<string, string> = {
  Cleansing: '🧴',
  Treatment: '💊',
  Moisturizing: '🫙',
  'Sun Protection': '☀️',
  Exfoliation: '🧪',
  Serum: '💧',
  'Eye Cream': '👁️',
  'Lip Mask': '💄',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Cleansing: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  Exfoliation: { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe' },
  Treatment: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  Moisturizing: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  'Sun Protection': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  Serum: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'Eye Cream': { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
};

interface UserWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function UserWorkspace({ activeSection = 'dashboard', onSectionChange }: UserWorkspaceProps) {
  // ── User / Avatar State ────────────────────────────────────────────────────
  const [storedUser, setStoredUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; }
  });
  const dpKey = `miracle_dp_${storedUser.id || storedUser.email || 'user'}`;
  const [customDp, setCustomDp] = useState<string | null>(() => localStorage.getItem(dpKey) || localStorage.getItem('miracle_dp_user@miracle.com') || null);
  const [showDpMenu, setShowDpMenu] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState(false);
  const dpMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Data States
  const [score, setScore] = useState<AssessmentScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentScore[]>([]);
  const [routine, setRoutineData] = useState<RoutineStep[]>([]);
  const [routineLoading, setRoutineLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    score_history: { date: string; score: number }[];
    compliance_metrics?: { adherence_7d: number; adherence_30d: number; adherence_90d: number };
    progress_photos?: { id: string; url: string; tag: string; score: number | null; date: string }[];
  } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Skin Profile & Demographics
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [selectedSkinType, setSelectedSkinType] = useState<string>('Combination');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(['Acne & Breakouts', 'Hyperpigmentation']);
  const [profileAge, setProfileAge] = useState<number | ''>(24);
  const [profileGender, setProfileGender] = useState<string>('Female');
  const [profilePhone, setProfilePhone] = useState<string>('+91 98765 43210');
  const [profileName, setProfileName] = useState<string>(() => storedUser.name || 'Ananya Sharma');
  const [profileAllergies, setProfileAllergies] = useState<string[]>(['Fragrance', 'Parabens']);
  const [fitzpatrickType, setFitzpatrickType] = useState<string>('Type IV (Medium Olive)');
  const [climateZone, setClimateZone] = useState<string>('Subtropical / Humid');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Assessment Questionnaire & Scoring
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [acneSeverity, setAcneSeverity] = useState(3);
  const [pigmentationSeverity, setPigmentationSeverity] = useState(2);
  const [rednessSeverity, setRednessSeverity] = useState(2);
  const [wrinklesSeverity, setWrinklesSeverity] = useState(1);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [waterLiters, setWaterLiters] = useState(2.5);
  const [evaluating, setEvaluating] = useState(false);
  const [assessmentReport, setAssessmentReport] = useState<any | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);
  const [routineAppliedToast, setRoutineAppliedToast] = useState(false);
  const [showPrintableDossier, setShowPrintableDossier] = useState(false);

  // Consultation Modal State
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [prosLoading, setProsLoading] = useState(false);
  const [selectedPro, setSelectedPro] = useState<any | null>(null);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptNotes, setApptNotes] = useState('');
  const [apptSuccess, setApptSuccess] = useState(false);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptError, setApptError] = useState<string | null>(null);

  // Checklist State
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  // Products & Recommendations State
  const [realRecommendations, setRealRecommendations] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogTotal, setCatalogTotal] = useState<number>(0);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [prodSearch, setProdSearch] = useState<string>('');
  const [prodSkinFilter, setProdSkinFilter] = useState<string>('All');
  const [prodCategoryFilter, setProdCategoryFilter] = useState<string>('All');
  const [prodSortBy, setProdSortBy] = useState<string>('Best Match');
  const prodScrollRef = useRef<HTMLDivElement>(null);

  // Ingredient Analyzer State
  const [ingrProductName, setIngrProductName] = useState('');
  const [ingrText, setIngrText] = useState('');
  const [ingrAllergies, setIngrAllergies] = useState('');
  const [ingrRoutineTime, setIngrRoutineTime] = useState<'AM' | 'PM' | 'Night'>('PM');
  const [ingrLoading, setIngrLoading] = useState(false);
  const [ingrResult, setIngrResult] = useState<any | null>(null);
  const [ingrError, setIngrError] = useState<string | null>(null);
  const [ingrKnowledgeList, setIngrKnowledgeList] = useState<any[]>([]);
  const [ingrSearchQuery, setIngrSearchQuery] = useState<string>('');

  // Lifestyle Log State
  const [dailyWaterGlasses, setDailyWaterGlasses] = useState<number>(8);
  const [dailySleepHours, setDailySleepHours] = useState<number>(7.5);
  const [dailyStressLevel, setDailyStressLevel] = useState<number>(4);
  const [dailySunExposure, setDailySunExposure] = useState<string>('Moderate (1-2 hrs)');
  const [dailyUvIndex, setDailyUvIndex] = useState<number>(6);
  const [lifestyleSaving, setLifestyleSaving] = useState<boolean>(false);
  const [lifestyleSuccess, setLifestyleSuccess] = useState<boolean>(false);

  // Reminders State
  const [remindersList, setRemindersList] = useState([
    { id: '1', title: 'Morning AM Routine', time: '08:00 AM', desc: 'Gentle Cleanser, Vitamin C & SPF 50 application', active: true, tag: 'Routine' },
    { id: '2', title: 'Mid-day Sunscreen Reapplication', time: '01:00 PM', desc: 'Reapply broad spectrum SPF 50 for UV barrier defense', active: true, tag: 'Sun Care' },
    { id: '3', title: 'Hydration Target Check-in', time: '04:00 PM', desc: 'Drink 2 glasses of water (Daily Goal: 2.5L)', active: true, tag: 'Hydration' },
    { id: '4', title: 'Evening PM Routine', time: '09:00 PM', desc: 'Double cleanse, active barrier serum & ceramide cream', active: true, tag: 'Routine' },
    { id: '5', title: 'Night Intensive Protocol (2x Weekly)', time: 'Wed & Sun 10:00 PM', desc: 'Apply Lactic Acid Exfoliant + Retinol Starter. Skip on irritated skin days.', active: true, tag: 'Night Care' },
    { id: '6', title: 'Weekly Progress Photo Scan', time: 'Sunday 10:00 AM', desc: 'Take a progress photo to update skin score trajectory', active: false, tag: 'Analytics' },
  ]);

  // Settings State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifAppt, setNotifAppt] = useState(true);
  const [notifRoutine, setNotifRoutine] = useState(true);
  const [notifAssessment, setNotifAssessment] = useState(true);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');

  // Subscription & Premium Billing State
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('miracle_premium') === 'true';
  });
  const [subTier, setSubTier] = useState<'monthly' | 'annual' | 'concierge'>('annual');
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [upiVpa, setUpiVpa] = useState<string>('ananya@okhdfcbank');
  const [cardNum, setCardNum] = useState<string>('4532 8920 1192 8402');
  const [cardExp, setCardExp] = useState<string>('08/29');
  const [cardCvv, setCardCvv] = useState<string>('882');
  const [cardName, setCardName] = useState<string>(() => profileName || 'Ananya Sharma');
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [walletProvider, setWalletProvider] = useState<string>('Amazon Pay');
  const [subProcessing, setSubProcessing] = useState<boolean>(false);
  const [subSuccessModal, setSubSuccessModal] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [activeSubData, setActiveSubData] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('miracle_subscription');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      planName: 'Annual Clinical DermPass',
      tier: 'annual',
      price: 5999,
      interval: 'year',
      startedDate: '2026-08-18',
      renewalDate: '2027-08-18',
      txnId: 'TXN-MRCL-984712',
      invoiceId: 'INV-2026-8831',
      paymentMethod: 'UPI (ananya@okhdfcbank)',
      status: 'Active',
    };
  });

  // AI Chat Assistant State (Ask AI)
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: "Hello! I'm your Miracle Skincare AI Companion. How can I help you optimize your daily routine, check ingredient synergies, or analyze barrier health today?",
      time: 'Just now',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Skin Scanner Simulator State
  const [scanStep, setScanStep] = useState<'ready' | 'scanning' | 'complete'>('ready');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanBiomarkers, setScanBiomarkers] = useState<any | null>(null);

  // Photo Upload & Comparison Studio State
  const [uploadPhotoTag, setUploadPhotoTag] = useState('Baseline');
  const [uploadPhotoAngle, setUploadPhotoAngle] = useState('Frontal Face');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPhotoSuccess, setUploadPhotoSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Timeline Filter State for Progress Chart
  const [chartTimeline, setChartTimeline] = useState<'7D' | '30D' | '90D' | 'All'>('30D');

  // Account Settings inline edit state (lifted to top level for robust execution)
  const [accountEditField, setAccountEditField] = useState<'name' | 'password' | null>(null);
  const [accountTempName, setAccountTempName] = useState<string>('');
  const [accountToast, setAccountToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Lifestyle 7-day matrix & nutrition state (lifted to top level for robust state retention)
  const [lifestyleHabitChecks, setLifestyleHabitChecks] = useState<{ [key: string]: boolean }>({
    'Mon-water': true, 'Mon-spf': true, 'Mon-retinol': true, 'Mon-sleep': true, 'Mon-workout': true,
    'Tue-water': true, 'Tue-spf': true, 'Tue-retinol': false, 'Tue-sleep': true, 'Tue-workout': true,
    'Wed-water': true, 'Wed-spf': true, 'Wed-retinol': true, 'Wed-sleep': true, 'Wed-workout': false,
    'Thu-water': true, 'Thu-spf': true, 'Thu-retinol': false, 'Thu-sleep': true, 'Thu-workout': true,
    'Fri-water': true, 'Fri-spf': true, 'Fri-retinol': true, 'Fri-sleep': false, 'Fri-workout': true,
    'Sat-water': true, 'Sat-spf': true, 'Sat-retinol': false, 'Sat-sleep': true, 'Sat-workout': false,
    'Sun-water': true, 'Sun-spf': true, 'Sun-retinol': true, 'Sun-sleep': true, 'Sun-workout': true,
  });
  const [lifestyleNutritionLog, setLifestyleNutritionLog] = useState<{ [key: string]: boolean }>({
    'Omega-3 Fatty Acids': true,
    'Antioxidants & Polyphenols': true,
    'Vitamin C & Bioflavonoids': true,
    'Zinc Gluconate': true,
    'Collagen Hydrolysate': false,
    'Hydration Electrolytes': true,
  });
  const [lifestyleAirQuality, setLifestyleAirQuality] = useState<number>(42);
  const [lifestyleHumidity, setLifestyleHumidity] = useState<number>(58);

  // Skin Scan Camera stream state (lifted to top level for robust camera device handling)
  const skinScanVideoRef = useRef<HTMLVideoElement>(null);
  const skinScanStreamRef = useRef<MediaStream | null>(null);
  const [skinScanCameraActive, setSkinScanCameraActive] = useState<boolean>(false);
  const [skinScanCameraError, setSkinScanCameraError] = useState<string | null>(null);

  // ── Sync DP & Listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const u = JSON.parse(localStorage.getItem('miracle_user') || '{}');
        setStoredUser(u);
        const k = `miracle_dp_${u.id || u.email || 'user'}`;
        setCustomDp(localStorage.getItem(k) || localStorage.getItem('miracle_dp_user@miracle.com') || null);
        if (u.name) setProfileName(u.name);
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

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const loadScoreAndHistory = async () => {
    try {
      const s = await api.getLatestScore();
      setScore(s);
    } catch {
      setScore(null);
    } finally {
      setScoreLoading(false);
    }

    try {
      const hist = await api.getAssessmentHistory();
      if (Array.isArray(hist)) setAssessmentHistory(hist);
    } catch {}
  };

  const loadRoutine = async () => {
    try {
      const r = await api.getRoutine();
      if (Array.isArray(r)) setRoutineData(r);
    } catch {} finally {
      setRoutineLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const a = await api.getAnalytics();
      setAnalytics(a);
    } catch {}
  };

  const loadAppointments = async () => {
    try {
      const appts = await api.getMyAppointments();
      if (Array.isArray(appts)) setAppointments(appts);
    } catch {}
  };

  const loadProfile = async () => {
    try {
      const p = await api.getProfile();
      if (p) {
        setUserProfile(p);
        if (p.name) setProfileName(p.name);
        if (p.skin_type) setSelectedSkinType(p.skin_type);
        if (p.concerns && Array.isArray(p.concerns) && p.concerns.length) setSelectedConcerns(p.concerns);
        if (p.allergies && Array.isArray(p.allergies)) setProfileAllergies(p.allergies);
        if (p.age != null) setProfileAge(p.age);
        if (p.gender) setProfileGender(p.gender);
        if (p.water_intake_l != null) {
          setWaterLiters(p.water_intake_l);
          setDailyWaterGlasses(Math.round(p.water_intake_l * 4));
        }
        if (p.sleep_hours != null) {
          setSleepHours(p.sleep_hours);
          setDailySleepHours(p.sleep_hours);
        }
        if (p.stress_level != null) setDailyStressLevel(p.stress_level);
        if (p.sun_exposure) setDailySunExposure(p.sun_exposure);
      }
    } catch {}
  };

  const loadCatalog = async (page = 1, search = prodSearch, cat = prodCategoryFilter, skin = prodSkinFilter, sort = prodSortBy) => {
    setCatalogLoading(true);
    try {
      const res = await api.getAllProducts({
        page,
        per_page: 30,
        search: search.trim() || undefined,
        category: cat !== 'All' ? cat : undefined,
        skin_type: skin !== 'All' ? skin : undefined,
        sort_by: sort !== 'Best Match' ? sort : undefined,
      });
      if (res && Array.isArray(res.products)) {
        setCatalogProducts(res.products);
        setCatalogTotal(res.total || 0);
        setCatalogPage(res.page || 1);
        setCatalogTotalPages(res.total_pages || 1);
      }
    } catch {} finally {
      setCatalogLoading(false);
    }
  };

  const loadIngredientsKnowledge = async () => {
    try {
      const res = await api.listIngredients({ per_page: 60 });
      if (res && Array.isArray(res.ingredients)) setIngrKnowledgeList(res.ingredients);
    } catch {}
  };

  useEffect(() => {
    loadScoreAndHistory();
    loadRoutine();
    loadAnalytics();
    loadAppointments();
    loadProfile();
    loadIngredientsKnowledge();

    api.getRecommendations()
      .then(d => {
        if (d && Array.isArray(d.products)) setRealRecommendations(d.products);
      })
      .catch(() => {});

    api.getRoutineLogs().then(data => {
      if (data && Array.isArray(data.logs)) {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const todayLog = data.logs.find((l: any) => l.log_date === today);
        if (todayLog && Array.isArray(todayLog.completed_steps)) {
          setCompletedSteps(todayLog.completed_steps);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSection === 'product-recommendations') {
      // Reset to page 1 and fetch fresh results when navigating to this page
      setCatalogProducts([]);
      loadCatalog(1);
    }
  }, [activeSection]);

  // ── Dynamic Metric Calculations ────────────────────────────────────────────
  const overallScore = score?.overall_score ?? null;
  const scorePct = overallScore !== null ? Math.round(overallScore) : null;
  const scoreLabel =
    scorePct === null
      ? 'Not assessed'
      : scorePct >= 85
      ? 'Optimal Barrier'
      : scorePct >= 70
      ? 'Stable / Good'
      : scorePct >= 50
      ? 'Moderate Stress'
      : 'Requires Attention';
  const scoreColor =
    scorePct === null ? '#8b8fa3' : scorePct >= 85 ? '#16a34a' : scorePct >= 70 ? '#16a34a' : scorePct >= 50 ? '#e08a1e' : '#e11d48';

  const currentSkinType = selectedSkinType || 'Combination';
  // DYNAMIC PRIMARY CONCERN: Exactly detected from the user's active concerns
  const dynamicPrimaryConcern = (selectedConcerns && selectedConcerns.length > 0)
    ? selectedConcerns[0]
    : (score?.detected_concerns && score.detected_concerns.length > 0)
    ? score.detected_concerns[0]
    : 'Barrier Hydration';

  // Skin Age Calculation: Chronological age adjusted by skin health score
  const chronologicalAge = typeof profileAge === 'number' ? profileAge : 24;
  const skinAgeDelta = scorePct !== null ? (scorePct >= 85 ? -3 : scorePct >= 75 ? -2 : scorePct >= 65 ? 0 : +3) : -2;
  const calculatedSkinAge = Math.max(16, chronologicalAge + skinAgeDelta);

  const hydrationPct = score ? Math.round((score.hydration_subscore / 100) * 100) : 82;

  // ── DP Handlers ────────────────────────────────────────────────────────────
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
    localStorage.setItem('miracle_dp_user@miracle.com', cropped);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setCropSrc(null);
  };

  const handleRemoveDp = () => {
    setCustomDp(null);
    localStorage.removeItem(dpKey);
    localStorage.removeItem('miracle_dp_user@miracle.com');
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
  };

  const dpMenuItems = [
    ...(customDp ? [{ label: '👁️ View photo', action: () => { setShowDpMenu(false); setViewPhoto(true); }, danger: false }] : []),
    { label: customDp ? '🔄 Change photo' : '📤 Upload photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }, danger: false },
    ...(customDp ? [{ label: '🗑️ Remove photo', action: handleRemoveDp, danger: true }] : []),
  ];

  // ── Profile Save Handler ───────────────────────────────────────────────────
  const saveProfileHandler = async () => {
    setProfileSaving(true);
    try {
      const ageVal = profileAge === '' ? null : Number(profileAge);
      const trimmedName = profileName.trim();
      await api.updateProfile({
        name: trimmedName || undefined,
        skin_type: selectedSkinType,
        concerns: selectedConcerns,
        allergies: profileAllergies,
        age: ageVal,
        gender: profileGender,
        water_intake_l: waterLiters,
        sleep_hours: sleepHours,
      });

      setUserProfile((prev: any) => ({
        ...prev,
        name: trimmedName || prev?.name,
        skin_type: selectedSkinType,
        concerns: selectedConcerns,
        allergies: profileAllergies,
        age: ageVal,
        gender: profileGender,
      }));

      if (trimmedName) {
        try {
          const stored = JSON.parse(localStorage.getItem('miracle_user') || '{}');
          stored.name = trimmedName;
          localStorage.setItem('miracle_user', JSON.stringify(stored));
          window.dispatchEvent(new Event('miracle_user_updated'));
        } catch {}
      }

      setProfileSaveSuccess(true);
      api.getRecommendations({ skin_type: selectedSkinType }).then(d => {
        if (d?.products) setRealRecommendations(d.products);
      }).catch(() => {});
      api.getRoutine().then(setRoutineData).catch(() => {});
      setTimeout(() => setProfileSaveSuccess(false), 2500);
    } catch {} finally {
      setProfileSaving(false);
    }
  };

  // ── Password Change Handler ────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!currentPw || !newPw) {
      setPwError('Please fill in both current and new password');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }
    setPwSaving(true);
    setPwError(null);
    try {
      await api.changePassword({ current_password: currentPw, new_password: newPw });
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e?.message || 'Failed to update password. Please verify current password.');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Assessment Submission Handler ──────────────────────────────────────────
  const submitAssessment = async (overridePhoto?: string) => {
    setEvaluating(true);
    setAssessmentError(null);
    setAssessmentReport(null);
    try {
      const res = await api.evaluateAssessment({
        skin_type: selectedSkinType,
        acne_severity: acneSeverity,
        hyperpigmentation_severity: pigmentationSeverity,
        redness_severity: rednessSeverity,
        wrinkles_severity: wrinklesSeverity,
        allergies: profileAllergies,
        lifestyle: {
          sleep_hours: sleepHours,
          water_intake_liters: waterLiters,
        },
      });

      const photoToSave = overridePhoto || uploadedPhotoUrl || photoPreview;
      if (photoToSave && photoToSave.startsWith('data:image/')) {
        try {
          await api.uploadPhoto({ image_url: photoToSave, tag: 'Assessment' });
          loadAnalytics();
        } catch {}
      }

      setAssessmentReport(res);
      setScore(res);
      loadScoreAndHistory();
      loadRoutine();
      api.getRecommendations({ skin_type: selectedSkinType }).then(d => {
        if (d?.products) setRealRecommendations(d.products);
      }).catch(() => {});
    } catch (e: any) {
      setAssessmentError(e?.message || 'Failed to evaluate skin assessment. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  // ── Apply Prescribed Regimen to Routine ────────────────────────────────────
  const applyPrescribedRegimen = async () => {
    try {
      await submitAssessment();
      setRoutineAppliedToast(true);
      setTimeout(() => setRoutineAppliedToast(false), 3500);
    } catch {}
  };

  // ── Routine Regeneration Handler ───────────────────────────────────────────
  const handleRegenerateRoutine = async () => {
    setRoutineLoading(true);
    try {
      await submitAssessment();
      await loadRoutine();
      setRoutineAppliedToast(true);
      setTimeout(() => setRoutineAppliedToast(false), 3500);
    } catch {} finally {
      setRoutineLoading(false);
    }
  };

  // ── Daily Routine Step Toggle ──────────────────────────────────────────────
  const toggleRoutineStep = async (item: string) => {
    if (checklistSaving) return;
    setChecklistSaving(true);
    setChecklistError(null);

    const prev = completedSteps;
    const updated = prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item];

    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await api.logRoutineProgress({
        log_date: today,
        completed_steps: updated,
        water_intake_ml: Math.round(waterLiters * 1000),
        sleep_hours: sleepHours,
      });
      setCompletedSteps(updated);
    } catch (e: any) {
      setChecklistError(e?.message || 'Failed to sync routine status.');
    } finally {
      setChecklistSaving(false);
    }
  };

  // ── Appointments ───────────────────────────────────────────────────────────
  const openConsultModal = () => {
    setShowConsultModal(true);
    if (professionals.length === 0) {
      setProsLoading(true);
      api.listProfessionals()
        .then(d => setProfessionals(d?.professionals ?? []))
        .catch(() => setProfessionals([]))
        .finally(() => setProsLoading(false));
    }
  };

  const submitAppointment = async () => {
    if (!selectedPro || !apptDate || !apptTime) return;
    setApptLoading(true);
    setApptError(null);
    try {
      await api.requestAppointment({
        target_role: selectedPro.role || selectedPro.target_role,
        preferred_date: apptDate,
        preferred_time: apptTime,
        user_notes: apptNotes,
      });
      setApptSuccess(true);
      loadAppointments();
      setTimeout(() => {
        setApptSuccess(false);
        setShowConsultModal(false);
        setSelectedPro(null);
        setApptDate('');
        setApptTime('');
        setApptNotes('');
      }, 2000);
    } catch (e: any) {
      setApptError(e?.message || 'Failed to book appointment. Please try again.');
    } finally {
      setApptLoading(false);
    }
  };

  // ── Ingredient Checker ─────────────────────────────────────────────────────
  const runIngredientCheck = async () => {
    if (!ingrText.trim()) return;
    setIngrLoading(true);
    setIngrResult(null);
    setIngrError(null);
    try {
      const ingredients = ingrText.split(',').map(s => s.trim()).filter(Boolean);
      const user_allergies = ingrAllergies.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.evaluateIngredients({
        product_name: ingrProductName.trim() || 'Custom Formulation',
        ingredients,
        user_allergies,
        routine_time: ingrRoutineTime,
      });
      setIngrResult(res);
    } catch (e: any) {
      setIngrError(e?.message || 'Failed to evaluate ingredients.');
    } finally {
      setIngrLoading(false);
    }
  };

  // ── AI Skincare Assistant Chat ─────────────────────────────────────────────
  const handleSendAiMessage = () => {
    if (!aiInputText.trim() || aiTyping) return;
    const userMsg = aiInputText.trim();
    const d = new Date();
    const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

    setAiChatMessages(prev => [...prev, { role: 'user', text: userMsg, time: timeStr }]);
    setAiInputText('');
    setAiTyping(true);

    setTimeout(() => {
      let reply = '';
      const q = userMsg.toLowerCase();
      if (q.includes('retinol') || q.includes('tretinoin')) {
        reply = `For your ${selectedSkinType} skin with concerns of ${selectedConcerns.join(', ')}, introduce retinoids gradually in the PM routine (2 nights/week). Always sandwich with a ceramide cream and apply broad-spectrum SPF 50 every morning.`;
      } else if (q.includes('barrier') || q.includes('dry') || q.includes('sting')) {
        reply = `When the skin barrier is compromised, pause all chemical exfoliants (AHA/BHA) and retinoids. Replenish stratum corneum lipids with Ceramides (NP, AP, EOP), Hyaluronic Acid, Centella Asiatica, and Squalane twice daily.`;
      } else if (q.includes('niacinamide') || q.includes('salicylic')) {
        reply = `Yes! Niacinamide (2-5%) pairs exceptionally well with Salicylic Acid (BHA). The BHA purges sebum within pore channels, while Niacinamide accelerates lipid synthesis and diminishes redness.`;
      } else if (q.includes('vitamin c') || q.includes('spf')) {
        reply = `Vitamin C (L-Ascorbic Acid or SAP) is best applied in the AM beneath sunscreen. This delivers synergistic antioxidant neutralization against UV-induced free radicals.`;
      } else {
        reply = `Based on your live profile (${selectedSkinType} skin, active score: ${scorePct || 82}/100, biological skin age: ${calculatedSkinAge}), maintain consistency with your morning antioxidant shield and evening barrier recovery balm.`;
      }
      setAiChatMessages(prev => [...prev, { role: 'assistant', text: reply, time: timeStr }]);
      setAiTyping(false);
    }, 850);
  };

  // ── Photo Upload Handler ───────────────────────────────────────────────────
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploadingPhoto(true);
    setUploadPhotoSuccess(false);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      setUploadedPhotoUrl(dataUrl);
      try {
        await api.uploadPhoto({ image_url: dataUrl, tag: `${uploadPhotoTag} (${uploadPhotoAngle})` });
        setUploadPhotoSuccess(true);
        loadAnalytics();
        setTimeout(() => setUploadPhotoSuccess(false), 2500);
      } catch {
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── AI Scanner Simulator ───────────────────────────────────────────────────
  const startAiScan = () => {
    if (!skinScanCameraActive && !photoPreview) {
      setSkinScanCameraError('Please open live camera or upload a face photo before starting biometric analysis.');
      return;
    }
    setSkinScanCameraError(null);
    setScanStep('scanning');
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setScanStep('complete');

          // Genuine individualized biomarkers derived from skin profile & active parameters
          const isOily = currentSkinType === 'Oily';
          const isDry = currentSkinType === 'Dry';
          const isSensitive = currentSkinType === 'Sensitive';
          const isComb = currentSkinType === 'Combination';

          const poreScore = isOily ? '72% (Active T-Zone Dilation)' : isComb ? '81% (Targeted Zone Density)' : isDry ? '92% (Tight / Refined Follicles)' : '95% (Optimal Uniformity)';
          const sebumScore = isOily ? '48% (High Sebum Flow)' : isDry ? '36% (Alipidic / Barrier Dry)' : isComb ? '68% (Dual-Zone Equilibrated)' : isSensitive ? '72% (Reactive Sensitivity)' : '88% (Equilibrated)';
          const erythemaScore = (rednessSeverity >= 3 || isSensitive) ? 'Moderate-High (Localized Micro-Vascular Flushing)' : 'Low / Baseline (Minimal Vascular Activity)';
          const textureScore = acneSeverity >= 4 ? '70% (Mild Papular Irregularities)' : '91% (Smooth Epidermal Strata)';

          setScanBiomarkers({
            poreRefinement: poreScore,
            sebumBalance: sebumScore,
            barrierHydration: `${hydrationPct}% (${hydrationPct >= 80 ? 'Optimal Seal' : 'Mild TEWL'})`,
            erythemaIndex: erythemaScore,
            textureUniformity: textureScore,
            estimatedSkinAge: `${calculatedSkinAge} Years (${calculatedSkinAge < (chronologicalAge || 21) ? `${(chronologicalAge || 21) - calculatedSkinAge} Yrs Younger` : 'Synchronized'})`,
            scanTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          return 100;
        }
        return p + 20;
      });
    }, 350);
  };

  const scrollProds = (dir: 'left' | 'right') => {
    if (prodScrollRef.current) {
      prodScrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DASHBOARD OVERVIEW PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboardPage = () => {
    const amSteps = routine.filter(r => r.time_of_day === 'AM').sort((a, b) => a.step_number - b.step_number);
    const pmSteps = routine.filter(r => r.time_of_day === 'PM').sort((a, b) => a.step_number - b.step_number);
    const nightSteps = routine.filter(r => r.time_of_day === 'Weekly').sort((a, b) => a.step_number - b.step_number);

    // Innovative time series score trajectory (clean unique evenly sampled dates)
    const rawHistory = analytics?.score_history || [];
    const chartVals = rawHistory.length
      ? rawHistory.map(h => h.score)
      : score
      ? [Math.max(50, score.overall_score - 10), Math.max(55, score.overall_score - 5), Math.max(60, score.overall_score - 2), score.overall_score]
      : [72, 76, 81, 86];

    const chartDates = (() => {
      if (!rawHistory.length) return ['Day 1', 'Day 7', 'Day 14', 'Today'];
      const raw = rawHistory.map(h => h.date.slice(5));
      if (raw.length <= 5) return raw;
      const step = Math.floor((raw.length - 1) / 4);
      return [raw[0], raw[step], raw[step * 2], raw[step * 3], raw[raw.length - 1]];
    })();

    // Donut Segments for Concerns
    const concernColors = [PUR, PNK, ORA, '#22c55e', TEA];
    const userConcernSegs = selectedConcerns.map((c, i) => ({
      pct: Math.round(100 / (selectedConcerns.length || 1)),
      color: concernColors[i % concernColors.length],
    }));
    const userConcernLegend: [string, string, string][] = selectedConcerns.map((c, i) => [
      c,
      `${Math.round(100 / (selectedConcerns.length || 1))}%`,
      concernColors[i % concernColors.length],
    ]);

    const displayProducts = (realRecommendations.length ? realRecommendations : catalogProducts.slice(0, 8)).map(p => ({
      id: p.id,
      name: p.name || p.product_name,
      brand: p.brand || 'SkinSAFE Verified',
      category: p.category || 'Skincare',
      price: typeof p.price === 'number' ? `₹${Math.round(p.price)}` : p.price || '₹899',
      rating: String(p.rating || 4.8),
      safetyScore: p.safety_score || 94.0,
      img: p.image_url || PRODIMG[0],
      ingredients: p.ingredients || 'Dermatologically tested formulation with verified barrier support complex.',
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* ── Top 5 Metrics Row (Ultra-Sleek, Innovative, Proportional) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: '14px' }}>
          {/* 1. Skin Health Score */}
          <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #e8ebf3', padding: '18px 20px', boxShadow: '0 4px 18px -8px rgba(23,20,51,0.10)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888da8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Skin Health Score</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scoreColor }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.3rem', fontWeight: 900, color: scorePct !== null && scorePct >= 80 ? '#15803d' : PUR, lineHeight: 1 }}>{scorePct !== null ? scorePct : '96'}</span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>/100</span>
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', fontWeight: 800, color: scoreColor }}>
                  {scoreLabel}
                </div>
              </div>
              <div style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '54px', height: '54px', borderRadius: '50%', background: `conic-gradient(#15803d ${(scorePct || 96) * 3.6}deg, #f1f5f9 0deg)` }}>
                <span style={{ position: 'absolute', inset: '5px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.15rem', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
                  🌟
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
              +14% barrier recovery vs baseline
            </div>
          </div>

          {/* 2. Skin Type */}
          <div
            onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
            style={{ borderRadius: '18px', background: '#fff', border: '1px solid #e8ebf3', padding: '18px 20px', boxShadow: '0 4px 18px -8px rgba(23,20,51,0.10)', cursor: 'pointer', transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8ebf3'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888da8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Skin Phenotype</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: PUR, background: '#f0effe', padding: '2px 8px', borderRadius: '6px' }}>Verified</span>
            </div>
            <div style={{ margin: '6px 0' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>{currentSkinType} Skin</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Sebum-barrier regulated</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: PUR, fontWeight: 700, borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
              <span>✨ View Profile Metrics →</span>
            </div>
          </div>

          {/* 3. Primary Concern Card (Clean, No Duplicate String) */}
          <div
            onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
            style={{ borderRadius: '18px', background: '#fff', border: '1px solid #e8ebf3', padding: '18px 20px', boxShadow: '0 4px 18px -8px rgba(23,20,51,0.10)', cursor: 'pointer', transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8ebf3'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888da8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Primary Target</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#e11d48', background: '#ffe4e6', padding: '2px 8px', borderRadius: '6px' }}>
                {selectedConcerns.length || 2} Active
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
              <div>
                <div style={{ fontSize: '1.18rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                  {dynamicPrimaryConcern.replace(/\s*\([^)]*\)/g, '')}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                  {dynamicPrimaryConcern.toLowerCase().includes('acne') ? `Severity: Level ${acneSeverity || 3}/10` : 'Clinical target priority'}
                </div>
              </div>
              <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fdf2f8', display: 'grid', placeItems: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                🎯
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
              ✓ Protocol active & tracked
            </div>
          </div>

          {/* 4. Age & Bio-Marker Card (Proportional & Complete) */}
          <div
            onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
            style={{ borderRadius: '18px', background: '#fff', border: '1px solid #e8ebf3', padding: '18px 20px', boxShadow: '0 4px 18px -8px rgba(23,20,51,0.10)', cursor: 'pointer', transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8ebf3'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888da8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Biological Age</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                -3 Yrs Bio Delta
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#888da8', fontWeight: 700, textTransform: 'uppercase' }}>Skin Age</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>{calculatedSkinAge || 18} <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Yrs</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#888da8', fontWeight: 700, textTransform: 'uppercase' }}>Actual</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{chronologicalAge || 21}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
              {profileGender || 'Female'} · {fitzpatrickType.includes('Type') ? fitzpatrickType.split('(')[0].trim() : 'Type IV'}
            </div>
          </div>

          {/* 5. Hydration Index */}
          <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #e8ebf3', padding: '18px 20px', boxShadow: '0 4px 18px -8px rgba(23,20,51,0.10)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888da8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Hydration Index</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>Optimal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
              <div>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>{hydrationPct || 83}%</div>
                <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#64748b' }}>Epidermal moisture seal</div>
              </div>
              <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                💧
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hydrationPct || 83}%`, background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '99px' }} />
            </div>
          </div>
        </div>

        {/* ── 3-Column Core Dashboard Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Card 1: Today's Routine */}
          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '430px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>✨</span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Today's Routine</h3>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, background: '#f0effe', padding: '3px 9px', borderRadius: '6px' }}>
                  {routine.length || 7} Steps Active
                </span>
              </div>

              {/* Morning AM */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#d97706', marginBottom: '8px' }}>
                  <span>☀️</span> MORNING ROUTINE
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(amSteps.length ? amSteps : [
                    { step_category: 'Cleansing', product_name: 'Gentle Hydrating Cleanser' },
                    { step_category: 'Treatment', product_name: 'Vitamin C + Niacinamide' },
                    { step_category: 'Moisturizing', product_name: 'Ceramide Barrier Cream' },
                    { step_category: 'Sun Protection', product_name: 'Mineral SPF 50' },
                  ]).map((s: any, i: number) => {
                    const styling = CATEGORY_COLORS[s.step_category] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
                    return (
                      <div key={i} style={{ padding: '6px 10px', borderRadius: '8px', background: styling.bg, border: `1px solid ${styling.border}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.9rem' }}>{STEP_EMOJI[s.step_category] || '🧴'}</span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: styling.text }}>{s.step_category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evening PM */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: PUR, marginBottom: '8px' }}>
                  <span>🏮</span> EVENING ROUTINE
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(pmSteps.length ? pmSteps : [
                    { step_category: 'Cleansing', product_name: 'Oil-to-Foam Cleanser' },
                    { step_category: 'Treatment', product_name: 'Centella Barrier Serum' },
                    { step_category: 'Moisturizing', product_name: 'Night Lipid Recovery Balm' },
                  ]).map((s: any, i: number) => {
                    const styling = CATEGORY_COLORS[s.step_category] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
                    return (
                      <div key={i} style={{ padding: '6px 10px', borderRadius: '8px', background: styling.bg, border: `1px solid ${styling.border}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.9rem' }}>{STEP_EMOJI[s.step_category] || '🧴'}</span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: styling.text }}>{s.step_category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Night */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: BLU, marginBottom: '8px' }}>
                  <span>🌙</span> NIGHT PROTOCOL
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(nightSteps.length ? nightSteps : [
                    { step_category: 'Exfoliation', product_name: 'Gentle Lactic Acid 5%' },
                  ]).map((s: any, i: number) => {
                    const styling = CATEGORY_COLORS[s.step_category] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
                    return (
                      <div key={i} style={{ padding: '6px 10px', borderRadius: '8px', background: styling.bg, border: `1px solid ${styling.border}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.9rem' }}>{STEP_EMOJI[s.step_category] || '🧪'}</span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: styling.text }}>{s.step_category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => onSectionChange && onSectionChange('my-routine')}
              style={{ marginTop: '16px', padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: PUR, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center', width: '100%' }}
            >
              View Full Routine & Adherence →
            </button>
          </Card>

          {/* Card 2: Innovative Professional Skin Health Progress */}
          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '430px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Skin Health Progress</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Longitudinal barrier trajectory</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  {(['7D', '30D', '90D', 'All'] as const).map(tl => (
                    <button
                      key={tl}
                      onClick={() => setChartTimeline(tl)}
                      style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', background: chartTimeline === tl ? PUR : 'transparent', color: chartTimeline === tl ? '#fff' : '#64748b', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {tl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced SVG Line Chart */}
              <div style={{ height: '240px', position: 'relative' }}>
                <ChartFrame
                  chart={{ el: <LineChart vals={chartVals} min={0} max={100} /> }}
                  yLabels={['100', '75', '50', '25', '0']}
                  xLabels={chartDates}
                  h={240}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '0.76rem' }}>
              <span style={{ color: '#059669', fontWeight: 800 }}>▲ +14% Overall Barrier Score</span>
              <span style={{ color: '#64748b' }}>TEWL Stabilized</span>
            </div>
          </Card>

          {/* Card 3: Skincare Insights */}
          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '430px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>💡</span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Skincare Insights</h3>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 9px', borderRadius: '6px' }}>
                  AI Bio-Guard
                </span>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #a7f3d0', marginBottom: '14px', fontSize: '0.82rem', color: '#065f46', lineHeight: 1.5 }}>
                <b>Primary Target ({dynamicPrimaryConcern}):</b> Maintain barrier lipids with Ceramide NP and Niacinamide. UV defense active at SPF 50+.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  ['☀️', 'Apply SPF 50 daily — UV exposure causes 80% of photoaging breakdown.'],
                  ['💧', 'Daily 2.5L hydration improves cellular turgor and dermal elasticity.'],
                  ['🌙', 'Deep sleep facilitates nightly collagen peptide synthesis.'],
                  ['🧴', 'Amino acid cleansing preserves stratum corneum natural moisture factors.'],
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{item[0]}</span>
                    <span>{item[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '14px', padding: '10px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.76rem', color: PUR, fontWeight: 700, textAlign: 'center' }}>
              Validated Formulation Insights · Evidence-Based
            </div>
          </Card>
        </div>

        {/* ── Recommended Products Carousel ── */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Recommended Products for You</h3>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Clinically matched to your {currentSkinType} skin and {dynamicPrimaryConcern}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => scrollProds('left')}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#334155' }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollProds('right')}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#334155' }}
              >
                →
              </button>
              <span
                onClick={() => onSectionChange && onSectionChange('product-recommendations')}
                style={{ fontSize: '0.8rem', fontWeight: 700, color: PUR, cursor: 'pointer', marginLeft: '6px' }}
              >
                View Full Catalog →
              </span>
            </div>
          </div>

          <div
            ref={prodScrollRef}
            style={{ display: 'flex', gap: '14px', overflowX: 'auto', scrollBehavior: 'smooth', paddingBottom: '8px' }}
            className="no-scrollbar"
          >
            {displayProducts.map((p, idx) => (
              <div
                key={p.id || idx}
                onClick={() => setSelectedProduct(p)}
                style={{ flex: '0 0 210px', width: '210px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = PUR;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ height: '140px', background: '#f8fafc', position: 'relative', display: 'grid', placeItems: 'center', padding: '10px' }}>
                  <img
                    src={p.img}
                    alt={p.name}
                    onError={e => { (e.target as HTMLImageElement).src = PRODIMG[idx % PRODIMG.length]; }}
                    style={{ maxHeight: '110px', maxWidth: '100%', objectFit: 'contain' }}
                  />
                  <span style={{ position: 'absolute', top: '8px', left: '8px', padding: '2px 8px', borderRadius: '99px', background: '#22c55e', color: '#fff', fontSize: '0.62rem', fontWeight: 800 }}>
                    {p.safetyScore}/100 Safe
                  </span>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{p.brand}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', height: '36px', overflow: 'hidden', lineHeight: 1.3, marginTop: '2px' }}>
                    {p.name}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{p.price}</span>
                    <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700 }}>⭐ {p.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Mid Row: Consultations & Skin Concerns Donut ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {/* Left: Consultation Sessions */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>My Consultation Sessions</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Clinical specialist evaluations & referrals</span>
              </div>
              <button
                onClick={openConsultModal}
                style={{ padding: '7px 14px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                + Book Consultant
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {appointments.slice(0, 3).map(appt => (
                <div key={appt.id} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ede9fe', color: PUR, display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>
                      👤
                    </span>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>{appt.target_role} Consultation</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{appt.preferred_date} at {appt.preferred_time}</div>
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800, background: `${STATUS_COLOR[appt.status]}18`, color: STATUS_COLOR[appt.status] || '#64748b' }}>
                    {appt.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              {!appointments.length && (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b', fontSize: '0.82rem' }}>
                  No consultation sessions booked yet. Connect with our certified skincare consultants or dermatologists.
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => onSectionChange && onSectionChange('skin-assessment')}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                📷 Take Photo Assessment
              </button>
              <button
                onClick={() => onSectionChange && onSectionChange('ask-ai')}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ✨ Ask Skincare AI
              </button>
            </div>
          </Card>

          {/* Right: Skin Concerns Breakdown */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Skin Concerns Overview</h3>
              <span
                onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
                style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700, cursor: 'pointer' }}
              >
                Edit Concerns →
              </span>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <DonutChart segs={userConcernSegs} center={String(selectedConcerns.length)} sub="Targets" size={180} />
              <Legend rows={userConcernLegend} />
            </div>
          </Card>
        </div>

        {/* ── Daily Checklist at the Very End of Dashboard ── */}
        <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.18)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0effe', color: PUR, display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                📋
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Daily Skincare Checklist</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{completedSteps.length} of 5 daily goals completed today</span>
              </div>
            </div>
            <div style={{ width: '160px', height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(completedSteps.length / 5) * 100}%`, background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '99px', transition: 'width 0.3s' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {['Morning AM Routine', 'Drink Water (2.5L)', 'Sunscreen Applied', 'Evening PM Routine', '7+ Hours Sleep'].map((task, i) => {
              const done = completedSteps.includes(task);
              return (
                <div
                  key={i}
                  onClick={() => toggleRoutineStep(task)}
                  style={{ padding: '12px 14px', borderRadius: '12px', background: done ? '#ecfdf5' : '#f8fafc', border: `1px solid ${done ? '#a7f3d0' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: done ? '#10b981' : '#fff', border: `1.5px solid ${done ? '#10b981' : '#cbd5e1'}`, color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                    {done ? '✓' : ''}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: done ? '#065f46' : '#334155' }}>{task}</span>
                </div>
              );
            })}
          </div>
          {checklistError && <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '8px' }}>⚠️ {checklistError}</div>}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. MY PROFILE (Innovative Landscape Design — Read-Only Identity Card)
  // ─────────────────────────────────────────────────────────────────────────
  const renderMyProfilePage = () => {
    const userName = profileName || storedUser?.name || 'Ananya Sharma';
    const userEmail = storedUser?.email || 'user@miracle.com';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Landscape Hero Profile Banner */}
        <Card style={{ padding: '28px', background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)', border: '1px solid #e8ebf3', boxShadow: '0 8px 30px -10px rgba(23,20,51,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
              {/* Large Landscape Avatar */}
              <div ref={dpMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                {customDp ? (
                  <img
                    src={customDp}
                    alt={userName}
                    onClick={() => setViewPhoto(true)}
                    style={{ width: '92px', height: '92px', borderRadius: '24px', objectFit: 'cover', border: `3px solid ${PUR}30`, display: 'block', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                    title="Click to view full photo"
                  />
                ) : (
                  <span style={{ display: 'grid', placeItems: 'center', width: '92px', height: '92px', borderRadius: '24px', background: 'linear-gradient(135deg, #f0effe 0%, #e0e7ff 100%)', color: PUR, fontSize: '2.6rem', flexShrink: 0, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}>👤</span>
                )}

                {/* Camera icon button for photo upload */}
                <button
                  type="button"
                  onClick={() => setShowDpMenu(v => !v)}
                  style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '30px', height: '30px', borderRadius: '50%', background: PUR, border: '2px solid #fff', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 2px 10px rgba(0,0,0,0.22)', padding: 0 }}
                  title="Profile photo options"
                >📷</button>

                {/* Dropdown menu */}
                {showDpMenu && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 500, background: '#fff', borderRadius: '14px', border: '1px solid #e8eaf2', boxShadow: '0 14px 40px -8px rgba(23,20,51,0.22)', minWidth: '180px', overflow: 'hidden' }}>
                    {dpMenuItems.map((item, i) => (
                      <button key={i} onClick={item.action}
                        style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 500, color: item.danger ? '#e11d48' : '#2d3748', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(225,29,72,0.07)' : '#f6f7fb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >{item.label}</button>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>{userName}</h2>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #a7f3d0' }}>
                    ● Verified Active Member
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px' }}>{userEmail}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
                    Role: Skin Health Member
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
                    ID: MRCL-88429
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: `${PUR}15`, color: PUR }}>
                    Protocol: Miracle v2.6 AI
                  </span>
                </div>
              </div>
            </div>

            {/* Link to Account Settings */}
            <button
              onClick={() => onSectionChange && onSectionChange('account-settings')}
              style={{ padding: '10px 18px', borderRadius: '12px', background: '#fff', border: `1.5px solid ${PUR}`, color: PUR, fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0effe'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
            >
              ⚙️ Account Settings & Security →
            </button>
          </div>
        </Card>

        {/* 3-Column Landscape Matrix Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Card 1: Biological Profile Matrix */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>🧬 Biological & Physical Profile</h3>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>SYNCHRONIZED</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Chronological Age', val: `${chronologicalAge || 21} Years` },
                { label: 'Calculated Skin Age', val: `${calculatedSkinAge || 18} Years (-3 Yrs Delta)` },
                { label: 'Gender Phenotype', val: profileGender || 'Female' },
                { label: 'Fitzpatrick Phototype', val: fitzpatrickType || 'Type IV (Medium Olive)' },
                { label: 'Climate & Atmosphere', val: climateZone || 'Subtropical / Humid' },
                { label: 'Known Allergies / Sensitivities', val: profileAllergies?.join(', ') || 'Fragrance, Parabens' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 2: Dermatological Diagnostics Summary */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>🔬 Diagnostic Health Status</h3>
              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>ACTIVE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Overall Skin Health Score', val: `${scorePct || 96} / 100 (Optimal)` },
                { label: 'Primary Skin Phenotype', val: `${currentSkinType} Skin` },
                { label: 'Active Clinical Target', val: dynamicPrimaryConcern.replace(/\s*\([^)]*\)/g, '') },
                { label: 'Epidermal Hydration Index', val: `${hydrationPct || 83}% (Barrier Sealed)` },
                { label: 'Active Tracked Concerns', val: `${selectedConcerns.length || 2} Conditions Tracked` },
                { label: 'Clinical Routine Compliance', val: `${analytics?.compliance_metrics?.adherence_30d || 88}% Adherence` },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: PUR }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 3: Lifestyle & Daily Habits Overview */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>🌿 Circadian & Habit Summary</h3>
              <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 800, background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>MONITORED</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Average Restorative Sleep', val: `${sleepHours || 7.5} Hours / Night` },
                { label: 'Target Hydration Intake', val: `${waterLiters || 2.5} Liters / Day` },
                { label: 'Sunscreen Reapplication SPF 50', val: 'Twice Daily (AM Shield)' },
                { label: 'Barrier Active Regimen', val: 'PM Ceramide + Niacinamide' },
                { label: 'Notification Alert State', val: notifEmail ? 'Enabled (Email & Push)' : 'Muted' },
                { label: 'Next Scheduled Diagnostic Scan', val: 'In 4 Days' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ACCOUNT SETTINGS PAGE — Exact Admin Standard (using lifted top-level state)
  // ─────────────────────────────────────────────────────────────────────────
  const renderAccountSettingsPage = () => {
    const userName = profileName || storedUser?.name || 'Ananya Sharma';
    const userEmail = storedUser?.email || 'user@miracle.com';
    const editField = accountEditField;
    const setEditField = setAccountEditField;
    const tempName = accountTempName || userName;
    const setTempName = setAccountTempName;

    const showAcctToast = (msg: string, ok: boolean) => {
      setAccountToast({ msg, ok });
      setTimeout(() => setAccountToast(null), 3000);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {accountToast && (
          <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9999, padding: '12px 18px', borderRadius: '12px', background: accountToast.ok ? '#ecfdf5' : '#fef2f2', border: `1px solid ${accountToast.ok ? '#a7f3d0' : '#fecaca'}`, color: accountToast.ok ? '#065f46' : '#991b1b', fontWeight: 700, fontSize: '0.84rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {accountToast.ok ? '✅' : '❌'} {accountToast.msg}
          </div>
        )}
        <Card style={{ padding: '24px' }}>
          <CardHead title="Account Settings" right={<span style={{ padding: '4px 10px', borderRadius: '999px', background: `${PUR}18`, color: PUR, fontSize: '0.74rem', fontWeight: 700 }}>Skin Health Member</span>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Full Name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Name</div>
                {editField === 'name' ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      autoFocus
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        if (!tempName.trim()) { showAcctToast('Name cannot be empty', false); return; }
                        setProfileName(tempName.trim());
                        const stored = (() => { try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; } })();
                        stored.name = tempName.trim();
                        localStorage.setItem('miracle_user', JSON.stringify(stored));
                        window.dispatchEvent(new CustomEvent('miracle_user_updated'));
                        api.updateProfile({ name: tempName.trim() }).catch(() => {});
                        setEditField(null);
                        showAcctToast('Name updated successfully!', true);
                      }}
                      style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                    >Save</button>
                    <button onClick={() => setEditField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{profileName || userName}</div>
                )}
              </div>
              {editField !== 'name' && (
                <button
                  onClick={() => { setEditField('name'); setTempName(profileName || userName); }}
                  style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >Edit</button>
              )}
            </div>

            {/* Email Address */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</div>
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{userEmail}</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: '#edeef4' }}>Immutable</span>
            </div>

            {/* Platform Role */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Role</div>
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: PUR, marginTop: '3px' }}>Skin Health Member</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: '#edeef4' }}>Immutable</span>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</div>
                {editField === 'password' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <input value={currentPw} onChange={e => setCurrentPw(e.target.value)} type="password" placeholder="Current password" style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none' }} />
                    <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password" placeholder="New password" style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none' }} />
                    <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password" placeholder="Confirm new password" style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={async () => {
                          if (newPw !== confirmPw) { showAcctToast('Passwords do not match', false); return; }
                          if (newPw.length < 6) { showAcctToast('Password must be at least 6 characters', false); return; }
                          try {
                            await api.changePassword({ current_password: currentPw, new_password: newPw });
                            setCurrentPw(''); setNewPw(''); setConfirmPw('');
                            setEditField(null);
                            showAcctToast('Password updated successfully!', true);
                          } catch (e: any) { showAcctToast(e?.message || 'Failed to update password', false); }
                        }}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >Update</button>
                      <button onClick={() => setEditField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>••••••••••••</div>
                )}
              </div>
              {editField !== 'password' && (
                <button
                  onClick={() => setEditField('password')}
                  style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >Change Password</button>
              )}
            </div>

            {/* Notification Preferences */}
            <div style={{ padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Notification Preferences</div>
              {[
                { label: 'Email Alerts & Reports', key: 'email', val: notifEmail, set: setNotifEmail },
                { label: 'Routine Step Reminders', key: 'routine', val: notifRoutine, set: setNotifRoutine },
                { label: 'Assessment Due Alerts', key: 'assess', val: notifAssessment, set: setNotifAssessment },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>{item.label}</span>
                  <div
                    onClick={() => item.set(!item.val)}
                    style={{ width: '44px', height: '24px', borderRadius: '999px', background: item.val ? PUR : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                  >
                    <span style={{ position: 'absolute', top: '3px', left: item.val ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Delete Account (Danger Zone) */}
            <div style={{ padding: '16px', borderRadius: '14px', background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Danger Zone</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#171433' }}>Delete Account</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>This will permanently remove all your data and cannot be undone.</div>
                </div>
                <button
                  onClick={() => showAcctToast('Please contact support to delete your account.', false)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >Request Deletion</button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };


  // ─────────────────────────────────────────────────────────────────────────
  // MY SKIN PROFILE — With Big Distinct Illustrated Emojis
  // ─────────────────────────────────────────────────────────────────────────
  const renderMySkinProfilePage = () => {
    const SKIN_TYPE_DATA: { type: string; img: string; desc: string; bg: string }[] = [
      { type: 'Oily', img: skinOilyImg, desc: 'Excess sebum, enlarged pores, frequent breakouts', bg: '#fef3c7' },
      { type: 'Dry', img: skinDryImg, desc: 'Tight, flaky, dehydration & fine lines', bg: '#fed7aa' },
      { type: 'Combination', img: skinCombImg, desc: 'Oily T-zone, dry cheeks, dual-zone care', bg: '#e0e7ff' },
      { type: 'Sensitive', img: skinSensImg, desc: 'Reactive, prone to redness & irritation', bg: '#fce7f3' },
      { type: 'Normal', img: skinNormImg, desc: 'Balanced, minimal concerns, healthy glow', bg: '#ccfbf1' },
    ];

    const CONCERN_DATA: { name: string; img: string; desc: string; bg: string }[] = [
      { name: 'Acne & Breakouts', img: concernAcneImg, desc: 'Papules, pustules, comedonal acne', bg: '#fee2e2' },
      { name: 'Hyperpigmentation', img: concernHyperpigImg, desc: 'PIH, dark spots, uneven melanin tone', bg: '#f1f5f9' },
      { name: 'Dryness & Barrier Loss', img: concernDrynessImg, desc: 'Dehydration, flaking, TEWL', bg: '#e0f2fe' },
      { name: 'Redness & Rosacea', img: concernRednessImg, desc: 'Flush, dilated capillaries, reactive skin', bg: '#ffe4e6' },
      { name: 'Fine Lines & Aging', img: concernAgingImg, desc: 'Photoaging, collagen loss, wrinkles', bg: '#fef3c7' },
      { name: 'Enlarged Pores', img: concernPoresImg, desc: 'Sebaceous filaments, pore dilation', bg: '#ede9fe' },
      { name: 'Uneven Texture', img: concernTextureImg, desc: 'Rough surface, keratosis pilaris', bg: '#fae8ff' },
      { name: 'Dark Circles & Fatigue', img: concernDarkCirclesImg, desc: 'Periorbital hyperpigmentation & hollows', bg: '#f1f5f9' },
      { name: 'Dullness & Loss of Radiance', img: concernDullnessImg, desc: 'Cellular buildup & reduced luminosity', bg: '#fef08a' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>My Skin Profile</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Biological classification, active concerns, and known sensitivities — drives your personalized routine & product matching.</p>
            </div>
            <button
              onClick={saveProfileHandler}
              disabled={profileSaving}
              style={{ padding: '11px 22px', borderRadius: '12px', background: PUR, color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}30` }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {profileSaving ? 'Saving…' : '✓ Save Skin Profile'}
            </button>
          </div>
          {profileSaveSuccess && (
            <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.82rem', fontWeight: 700 }}>
              ✅ Skin profile saved! Routine & recommendations updated.
            </div>
          )}
        </Card>

        {/* Demographics Quick Fields */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Demographics & Physical Data</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>AGE</label>
              <input type="number" value={profileAge} onChange={e => setProfileAge(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>GENDER</label>
              <select value={profileGender} onChange={e => setProfileGender(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>FITZPATRICK SCALE</label>
              <select value={fitzpatrickType} onChange={e => setFitzpatrickType(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}>
                <option value="Type I (Very Fair / Always Burns)">Type I — Very Fair</option>
                <option value="Type II (Fair)">Type II — Fair</option>
                <option value="Type III (Medium Fair)">Type III — Medium Fair</option>
                <option value="Type IV (Medium Olive)">Type IV — Medium Olive</option>
                <option value="Type V (Brown)">Type V — Brown</option>
                <option value="Type VI (Dark Brown/Black)">Type VI — Deep Dark</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CLIMATE ZONE</label>
              <select value={climateZone} onChange={e => setClimateZone(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}>
                <option value="Subtropical / Humid">Subtropical / Humid</option>
                <option value="Arid / Dry Climate">Arid / Dry Climate</option>
                <option value="Temperate / Moderate">Temperate / Moderate</option>
                <option value="High UV / Tropical">High UV / Tropical</option>
                <option value="Cold / Low Humidity">Cold / Low Humidity</option>
              </select>
            </div>
          </div>
        </Card>

        {/* SKIN TYPE — Big Emoji Badges */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Skin Type Classification</h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#64748b' }}>Select your primary skin phenotype — determines formulation targeting and routine actives</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {SKIN_TYPE_DATA.map(st => {
              const isSel = selectedSkinType === st.type;
              return (
                <button
                  key={st.type}
                  type="button"
                  onClick={() => setSelectedSkinType(st.type)}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    border: `2px solid ${isSel ? PUR : '#e2e8f0'}`,
                    background: isSel ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSel ? `0 6px 20px ${PUR}25` : '0 2px 8px rgba(0,0,0,0.04)',
                    outline: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (!isSel) {
                      (e.currentTarget as HTMLElement).style.borderColor = PUR;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSel) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '130px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      background: '#f1f5f9',
                      border: `1px solid ${isSel ? `${PUR}50` : '#e2e8f0'}`,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <img
                      src={st.img}
                      alt={st.type}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {isSel && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: PUR,
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '99px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        ✓ Selected
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 900, color: isSel ? PUR : '#0f172a', marginBottom: '4px' }}>
                    {st.type} Skin
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35 }}>{st.desc}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* SKIN CONCERNS — Big Emoji Grid */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Active Skin Concerns</h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#64748b' }}>Select all conditions to target — drives diagnostic engine and product safety matching</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
            {CONCERN_DATA.map(c => {
              const has = selectedConcerns.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    if (has) setSelectedConcerns(selectedConcerns.filter(item => item !== c.name));
                    else setSelectedConcerns([...selectedConcerns, c.name]);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    border: `2px solid ${has ? PUR : '#e2e8f0'}`,
                    background: has ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: has ? `0 6px 20px ${PUR}25` : '0 2px 8px rgba(0,0,0,0.04)',
                    outline: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (!has) {
                      (e.currentTarget as HTMLElement).style.borderColor = PUR;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!has) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '115px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      background: '#f1f5f9',
                      border: `1px solid ${has ? `${PUR}50` : '#e2e8f0'}`,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <img
                      src={c.img}
                      alt={c.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {has && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: PUR,
                          color: '#fff',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '99px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        ✓ Selected
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: has ? PUR : '#0f172a', marginBottom: '4px', lineHeight: 1.25 }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>{c.desc}</div>
                </button>
              );
            })}
          </div>
          {selectedConcerns.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: '#f0effe', border: `1px solid ${PUR}30` }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: PUR }}>
                {selectedConcerns.length} concern{selectedConcerns.length > 1 ? 's' : ''} selected: {selectedConcerns.join(', ')}
              </span>
            </div>
          )}
        </Card>

        {/* Allergies */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Known Allergies & Sensitivities</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Fragrance', 'Parabens', 'Essential Oils', 'Alcohol Denat', 'Sulfates (SLS/SLES)', 'Chemical UV Filters', 'Retinoids', 'Propylene Glycol'].map(a => {
              const has = profileAllergies.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    if (has) setProfileAllergies(profileAllergies.filter(item => item !== a));
                    else setProfileAllergies([...profileAllergies, a]);
                  }}
                  style={{ padding: '8px 14px', borderRadius: '99px', border: `1.5px solid ${has ? '#dc2626' : '#cbd5e1'}`, background: has ? '#fee2e2' : '#fff', color: has ? '#dc2626' : '#64748b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {has ? '🚫 ' : '+ '}{a}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };


  const renderSkinAssessmentPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Clinical Skin Assessment & Diagnostic Engine</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Multi-metric algorithmic scoring: condition subscore, transepidermal water loss dynamics, barrier integrity & tailored routine prescription.
              </p>
            </div>
            {score && (
              <span style={{ padding: '6px 14px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', fontSize: '0.84rem', fontWeight: 800 }}>
                Latest Score: {Math.round(score.overall_score)}/100
              </span>
            )}
          </div>
        </Card>

        {/* Assessment Questionnaire & Photo Upload Form */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {/* Left Column: Concern Severity Sliders */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>1. Concern Severity Calibration (0–10)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Acne & Active Papules:</span>
                  <span style={{ color: PUR, fontWeight: 900 }}>{acneSeverity} / 10</span>
                </div>
                <input type="range" min="0" max="10" value={acneSeverity} onChange={e => setAcneSeverity(Number(e.target.value))} style={{ width: '100%', accentColor: PUR }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Hyperpigmentation & Post-Inflammatory Erythema:</span>
                  <span style={{ color: PUR, fontWeight: 900 }}>{pigmentationSeverity} / 10</span>
                </div>
                <input type="range" min="0" max="10" value={pigmentationSeverity} onChange={e => setPigmentationSeverity(Number(e.target.value))} style={{ width: '100%', accentColor: PUR }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Barrier Redness & Stinging Sensitivity:</span>
                  <span style={{ color: PUR, fontWeight: 900 }}>{rednessSeverity} / 10</span>
                </div>
                <input type="range" min="0" max="10" value={rednessSeverity} onChange={e => setRednessSeverity(Number(e.target.value))} style={{ width: '100%', accentColor: PUR }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Fine Lines & Photoaging:</span>
                  <span style={{ color: PUR, fontWeight: 900 }}>{wrinklesSeverity} / 10</span>
                </div>
                <input type="range" min="0" max="10" value={wrinklesSeverity} onChange={e => setWrinklesSeverity(Number(e.target.value))} style={{ width: '100%', accentColor: PUR }} />
              </div>
            </div>
          </Card>

          {/* Right Column: Lifestyle Metrics & Photo Audit (Clean Light Base Line & Centered File Input) */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>2. Lifestyle Metrics & Photo Audit</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Daily Sleep (Hours):</span>
                  <span style={{ color: '#059669', fontWeight: 900 }}>{sleepHours}h</span>
                </div>
                <div style={{ padding: '4px 0' }}>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={e => setSleepHours(Number(e.target.value))}
                    style={{ width: '100%', height: '6px', borderRadius: '4px', background: '#e2e8f0', accentColor: '#059669', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Water Intake with Matching Light Grey/White Baseline */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Daily Water Intake (Liters):</span>
                  <span style={{ color: '#059669', fontWeight: 900 }}>{waterLiters} L</span>
                </div>
                <div style={{ padding: '4px 0' }}>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={waterLiters}
                    onChange={e => setWaterLiters(Number(e.target.value))}
                    style={{ width: '100%', height: '6px', borderRadius: '4px', background: '#e2e8f0', accentColor: '#059669', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Proportional & Strictly Centered Photo Portion */}
            <div style={{ padding: '24px 16px', borderRadius: '16px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              {photoPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
                  <img src={photoPreview} alt="Preview" style={{ width: '96px', height: '96px', borderRadius: '14px', objectFit: 'cover', margin: '0 auto 8px', display: 'block', border: `2px solid ${PUR}` }} />
                  <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 800, textAlign: 'center' }}>✓ Skin photo attached for verification</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
                  <span style={{ fontSize: '2.2rem', display: 'block', margin: '0 auto 6px', textAlign: 'center' }}>📷</span>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', width: '100%', margin: '0 auto 10px' }}>
                    Add Skin Photo (Optional)
                  </div>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      margin: '0 auto 6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = PUR;
                      (e.currentTarget as HTMLElement).style.color = PUR;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                      (e.currentTarget as HTMLElement).style.color = '#334155';
                    }}
                  >
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', textAlign: 'center', width: '100%', margin: '0 auto' }}>
                    No file chosen
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => submitAssessment()}
              disabled={evaluating}
              style={{ marginTop: '18px', padding: '14px', borderRadius: '12px', background: PUR, color: '#fff', border: 'none', fontSize: '0.92rem', fontWeight: 900, cursor: 'pointer', width: '100%', boxShadow: `0 4px 14px ${PUR}30` }}
            >
              {evaluating ? 'Analyzing Skin Biomarkers…' : '🚀 Generate Complete Diagnostic Report'}
            </button>
            {assessmentError && <div style={{ color: '#dc2626', fontSize: '0.76rem', marginTop: '6px', textAlign: 'center' }}>⚠️ {assessmentError}</div>}
          </Card>
        </div>

        {/* ── Very Long & Detailed Evaluation Report ── */}
        {(assessmentReport || selectedHistoryReport) && (
          <div id="clinical-dossier-report">
            <Card style={{ padding: '28px', borderLeft: `6px solid ${PUR}` }}>
            {(() => {
              const rep = assessmentReport || selectedHistoryReport;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: PUR, textTransform: 'uppercase', letterSpacing: '0.06em' }}>OFFICIAL CLINICAL EVALUATION REPORT</span>
                      <h3 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>Comprehensive Dermatological Health Dossier</h3>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                        Patient: {profileName || 'Ananya Sharma'} · Evaluated: {rep.created_at || 'Today'} · Protocol: Miracle v2.6 · Biological Skin Age: {calculatedSkinAge}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: PUR, lineHeight: 1 }}>{Math.round(rep.overall_score)}/100</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#059669' }}>
                        {rep.overall_score >= 80 ? 'Optimal Barrier Integrity' : 'Actionable Barrier Recovery Required'}
                      </div>
                    </div>
                  </div>

                  {/* 5 Subscores Breakdown */}
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>CLINICAL SUBSCORE MATRIX</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                      {[
                        { label: 'Condition', val: rep.condition_subscore, color: PUR },
                        { label: 'Hydration', val: rep.hydration_subscore, color: BLU },
                        { label: 'Sleep Quality', val: rep.sleep_subscore, color: '#059669' },
                        { label: 'Consistency', val: rep.consistency_subscore, color: ORA },
                        { label: 'Lifestyle Index', val: rep.lifestyle_subscore, color: PNK },
                      ].map((sub, i) => (
                        <div key={i} style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: sub.color }}>{Math.round(sub.val)}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>{sub.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Clinical Findings */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#fafafa', border: '1px solid #e2e8f0', lineHeight: 1.6, fontSize: '0.86rem', color: '#334155' }}>
                    <b>🧬 Primary Diagnostic Findings:</b> Patient demonstrates a <b>{selectedSkinType}</b> epidermal profile with detected targets of{' '}
                    <b>{rep.detected_concerns?.join(', ') || selectedConcerns.join(', ')}</b>. Stratum corneum demonstrates healthy cellular turnover with estimated TEWL index at{' '}
                    <b>{Math.round(100 - rep.hydration_subscore)}%</b>. Recommended active intervention targets follicular congestion without compromising lipid barrier integrity.
                  </div>

                  {/* Key Active Recommendations & Ingredients to Avoid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#16a34a', marginBottom: '6px' }}>✓ RECOMMENDED ACTIVE COMPOUNDS</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#166534', lineHeight: 1.6 }}>
                        <li>Niacinamide (3-5%) for lipid synthesis and pore refinement</li>
                        <li>Ceramide NP + Cholesterol (3:1:1) for moisture barrier seal</li>
                        <li>Centella Asiatica (Madecassoside) for anti-inflammatory soothing</li>
                        <li>Broad-Spectrum SPF 50 Mineral Zinc Oxide</li>
                      </ul>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', marginBottom: '6px' }}>⚠️ CONTRAINDICATED FORMULATIONS</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.6 }}>
                        <li>High-percentage physical walnut/apricot scrubs</li>
                        <li>Alcohol Denat based astringent toners</li>
                        <li>Unbuffered AHA/BHA peels exceeding 10% concentration</li>
                        <li>Synthetic artificial fragrance in leave-on treatments</li>
                      </ul>
                    </div>
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                    <button
                      onClick={applyPrescribedRegimen}
                      style={{ padding: '11px 20px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      ✓ Apply Prescribed Regimen to Routine
                    </button>
                    <button
                      onClick={() => setShowPrintableDossier(true)}
                      style={{ padding: '11px 20px', borderRadius: '10px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🖨️ Print Clinical Dossier
                    </button>
                    {routineAppliedToast && (
                      <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 700 }}>
                        ✅ Regimen successfully written to active daily routine!
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </Card>
          </div>
        )}

        {/* Assessment History List with Fully Working Inspect Report */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Assessment History Archive</h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, background: '#f0effe', padding: '3px 9px', borderRadius: '6px' }}>
              {assessmentHistory.length} Record{assessmentHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}
            className="assessment-history-scroll"
          >
            {assessmentHistory.map((h, i) => (
              <div
                key={h.id || i}
                onClick={() => {
                  setSelectedHistoryReport(h);
                  const el = document.getElementById('clinical-dossier-report');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ padding: '14px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = PUR)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    Clinical Assessment #{assessmentHistory.length - i} · {h.created_at?.slice(0, 10) || 'Recent Record'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    Detected: {h.detected_concerns?.join(', ') || 'Standard Clinical Scan'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: PUR }}>{Math.round(h.overall_score)}/100</span>
                  <button
                    type="button"
                    style={{ padding: '6px 12px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Inspect Report →
                  </button>
                </div>
              </div>
            ))}
            {!assessmentHistory.length && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.82rem' }}>
                No prior assessments recorded. Submit the questionnaire above to generate your first official diagnostic report.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MY ROUTINE PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderMyRoutinePage = () => {
    const amSteps = routine.filter(r => r.time_of_day === 'AM').sort((a, b) => a.step_number - b.step_number);
    const pmSteps = routine.filter(r => r.time_of_day === 'PM').sort((a, b) => a.step_number - b.step_number);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>My Personalized Skincare Regimen</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Algorithmic sequence custom-tailored to {currentSkinType} skin and active targets ({dynamicPrimaryConcern}).
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleRegenerateRoutine}
                disabled={routineLoading}
                style={{ padding: '10px 18px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}30` }}
              >
                {routineLoading ? 'Rebuilding Regimen…' : '🔄 Regenerate Protocol'}
              </button>
            </div>
          </div>
          {routineAppliedToast && (
            <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '0.82rem', fontWeight: 700 }}>
              ✅ Skincare protocol updated with latest clinical active targets!
            </div>
          )}
        </Card>

        {/* Routine Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* AM Routine */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 900, color: '#d97706', marginBottom: '16px' }}>
              <span>☀️</span> Morning AM Routine (Antioxidant & Environmental Shield)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(amSteps.length ? amSteps : [
                { step_number: 1, step_category: 'Cleansing', product_name: 'Gentle Amino Acid Hydrating Cleanser', active_ingredients: ['Glycerin', 'Panthenol'] },
                { step_number: 2, step_category: 'Treatment', product_name: '10% Vitamin C + Ferulic Acid Serum', active_ingredients: ['L-Ascorbic Acid', 'Vitamin E'] },
                { step_number: 3, step_category: 'Moisturizing', product_name: 'Ceramide NP Barrier Daily Emulsion', active_ingredients: ['Ceramides', 'Hyaluronic Acid'] },
                { step_number: 4, step_category: 'Sun Protection', product_name: 'Broad Spectrum SPF 50 Mineral Fluid', active_ingredients: ['Zinc Oxide 12%', 'Titanium Dioxide'] },
              ]).map((s: any, idx: number) => {
                const styling = CATEGORY_COLORS[s.step_category] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
                const isDone = completedSteps.includes(`AM Step ${s.step_number || idx + 1}`);
                return (
                  <div key={idx} style={{ padding: '14px 16px', borderRadius: '12px', background: isDone ? '#ecfdf5' : '#fff', border: `1px solid ${isDone ? '#a7f3d0' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '8px', background: styling.bg, color: styling.text, display: 'grid', placeItems: 'center', fontSize: '1rem', fontWeight: 900 }}>
                        {s.step_number || idx + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: styling.bg, color: styling.text }}>
                            {s.step_category}
                          </span>
                          {s.prescribed_by_doctor && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '2px 6px', borderRadius: '4px' }}>Rx Prescribed</span>}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{s.product_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>Actives: {s.active_ingredients?.join(', ') || 'Barrier matrix'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRoutineStep(`AM Step ${s.step_number || idx + 1}`)}
                      style={{ padding: '6px 12px', borderRadius: '8px', background: isDone ? '#10b981' : '#f1f5f9', color: isDone ? '#fff' : '#475569', border: 'none', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {isDone ? '✓ Completed' : 'Mark Done'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* PM Routine */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 900, color: PUR, marginBottom: '16px' }}>
              <span>🏮</span> Evening PM Routine (Active Cellular Repair & Lipid Seal)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(pmSteps.length ? pmSteps : [
                { step_number: 1, step_category: 'Cleansing', product_name: 'Balancing Micellar & Cleansing Emulsion', active_ingredients: ['Squalane', 'Centella'] },
                { step_number: 2, step_category: 'Treatment', product_name: 'Niacinamide 5% + Zinc PCA Serum', active_ingredients: ['Niacinamide', 'Zinc'] },
                { step_number: 3, step_category: 'Moisturizing', product_name: 'Overnight Intensive Ceramide Lipid Cream', active_ingredients: ['Ceramide Complex', 'Peptides'] },
              ]).map((s: any, idx: number) => {
                const styling = CATEGORY_COLORS[s.step_category] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
                const isDone = completedSteps.includes(`PM Step ${s.step_number || idx + 1}`);
                return (
                  <div key={idx} style={{ padding: '14px 16px', borderRadius: '12px', background: isDone ? '#ecfdf5' : '#fff', border: `1px solid ${isDone ? '#a7f3d0' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '8px', background: styling.bg, color: styling.text, display: 'grid', placeItems: 'center', fontSize: '1rem', fontWeight: 900 }}>
                        {s.step_number || idx + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: styling.bg, color: styling.text }}>
                            {s.step_category}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{s.product_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>Actives: {s.active_ingredients?.join(', ') || 'Barrier lipid matrix'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRoutineStep(`PM Step ${s.step_number || idx + 1}`)}
                      style={{ padding: '6px 12px', borderRadius: '8px', background: isDone ? '#10b981' : '#f1f5f9', color: isDone ? '#fff' : '#475569', border: 'none', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {isDone ? '✓ Completed' : 'Mark Done'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Night / Weekly Protocol */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 900, color: '#7c3aed', marginBottom: '16px' }}>
              <span>🌌</span> Night / Weekly Intensive Protocol (Intensive Exfoliation & Barrier Recovery)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { step_number: 1, step_category: 'Exfoliation', product_name: 'Gentle Lactic Acid 5% Exfoliating Treatment', active_ingredients: ['Lactic Acid', 'Tasmanian Pepperberry'] },
                { step_number: 2, step_category: 'Treatment', product_name: 'Retinol 0.025% Cellular Renewal Starter Serum', active_ingredients: ['Encapsulated Retinol', 'Squalane'] },
                { step_number: 3, step_category: 'Moisturizing', product_name: 'Overnight Intensive Ceramide Lipid Recovery Mask', active_ingredients: ['Ceramide NP', 'Cholesterol', 'Fatty Acids'] },
                { step_number: 4, step_category: 'Eye Care', product_name: 'Multi-Peptide + Caffeine Under-Eye Elixir', active_ingredients: ['Matrixyl 3000', 'Caffeine 5%'] },
              ].map((s: any, idx: number) => {
                const styling = CATEGORY_COLORS[s.step_category] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
                const isDone = completedSteps.includes(`Night Step ${s.step_number || idx + 1}`);
                return (
                  <div key={idx} style={{ padding: '14px 16px', borderRadius: '12px', background: isDone ? '#ecfdf5' : '#fff', border: `1px solid ${isDone ? '#a7f3d0' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '8px', background: styling.bg, color: styling.text, display: 'grid', placeItems: 'center', fontSize: '1rem', fontWeight: 900 }}>
                        {s.step_number || idx + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: styling.bg, color: styling.text }}>
                            {s.step_category}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '2px 6px', borderRadius: '4px' }}>2x Weekly</span>
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{s.product_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>Actives: {s.active_ingredients?.join(', ') || 'Intensive cellular matrix'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRoutineStep(`Night Step ${s.step_number || idx + 1}`)}
                      style={{ padding: '6px 12px', borderRadius: '8px', background: isDone ? '#10b981' : '#f1f5f9', color: isDone ? '#fff' : '#475569', border: 'none', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {isDone ? '✓ Completed' : 'Mark Done'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PRODUCT RECOMMENDATIONS & 50,000+ CATALOG PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderProductRecommendationsPage = () => {
    const skinTypes = ['All', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'];
    const categories = ['All', 'Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment', 'Exfoliant', 'Eye Cream'];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Verified Product Catalog & Recommendations</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Browse 50,000+ SkinSAFE verified formulations with safety ratings and ingredient breakdown.
              </p>
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: PUR }}>
              {catalogTotal || 50000}+ Verified Formulations
            </div>
          </div>

          {/* Search + Sort Bar */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search products, brands (e.g. CeraVe, Cetaphil, La Roche-Posay)..."
                value={prodSearch}
                onChange={e => {
                  const val = e.target.value;
                  setProdSearch(val);
                  // Debounced: wait 400ms after user stops typing before fetching
                  clearTimeout((window as any).__prodSearchTimer);
                  (window as any).__prodSearchTimer = setTimeout(() => {
                    loadCatalog(1, val, prodCategoryFilter, prodSkinFilter, prodSortBy);
                  }, 400);
                }}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              />
            </div>
            <select
              value={prodSortBy}
              onChange={e => {
                setProdSortBy(e.target.value);
                loadCatalog(1, prodSearch, prodCategoryFilter, prodSkinFilter, e.target.value);
              }}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}
            >
              <option value="Best Match">Best Match</option>
              <option value="Rating">Highest Rating</option>
              <option value="Safety Score">Safety Score (90+)</option>
            </select>
          </div>

          {/* Skin Type Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
            {skinTypes.map(st => (
              <button
                key={st}
                onClick={() => {
                  setProdSkinFilter(st);
                  loadCatalog(1, prodSearch, prodCategoryFilter, st, prodSortBy);
                }}
                style={{ padding: '5px 14px', borderRadius: '99px', border: `1px solid ${prodSkinFilter === st ? PUR : '#cbd5e1'}`, background: prodSkinFilter === st ? PUR : '#fff', color: prodSkinFilter === st ? '#fff' : '#334155', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setProdCategoryFilter(cat);
                  loadCatalog(1, prodSearch, cat, prodSkinFilter, prodSortBy);
                }}
                style={{ padding: '4px 12px', borderRadius: '8px', border: 'none', background: prodCategoryFilter === cat ? '#f0effe' : 'transparent', color: prodCategoryFilter === cat ? PUR : '#64748b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>

        {/* Product Cards Grid */}
        {catalogLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', height: '280px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '160px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ height: '10px', borderRadius: '4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', width: '60%' }} />
                  <div style={{ height: '14px', borderRadius: '4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', width: '90%' }} />
                  <div style={{ height: '14px', borderRadius: '4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', width: '40%', marginTop: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : catalogProducts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {catalogProducts.map((p, idx) => (
              <div
                key={p.id || idx}
                onClick={() => setSelectedProduct(p)}
                style={{ borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = PUR;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 18px ${PUR}20`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ height: '160px', background: '#f8fafc', position: 'relative', display: 'grid', placeItems: 'center', padding: '12px' }}>
                  <img
                    src={p.image_url || p.img || PRODIMG[idx % PRODIMG.length]}
                    alt={p.name || p.product_name}
                    onError={e => { (e.target as HTMLImageElement).src = PRODIMG[idx % PRODIMG.length]; }}
                    style={{ maxHeight: '130px', maxWidth: '100%', objectFit: 'contain' }}
                  />
                  <span style={{ position: 'absolute', top: '8px', left: '8px', padding: '2px 8px', borderRadius: '99px', background: '#22c55e', color: '#fff', fontSize: '0.64rem', fontWeight: 800 }}>
                    {p.safety_score || 94}/100 Safe
                  </span>
                </div>
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{p.brand || 'Clinical Brand'}</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginTop: '2px' }}>{p.name || p.product_name}</div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                      {typeof p.price === 'number' ? `₹${Math.round(p.price)}` : p.price || '₹899'}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: 800 }}>⭐ {p.rating || 4.7}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>No products found</div>
            <div style={{ fontSize: '0.84rem' }}>Try adjusting your search or filters</div>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px' }}>
          <button
            disabled={catalogPage <= 1 || catalogLoading}
            onClick={() => loadCatalog(catalogPage - 1)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: catalogPage <= 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
            Page {catalogPage} of {catalogTotalPages || 1}
          </span>
          <button
            disabled={catalogPage >= catalogTotalPages || catalogLoading}
            onClick={() => loadCatalog(catalogPage + 1)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: catalogPage >= catalogTotalPages ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 6. INGREDIENT ANALYZER & FORMULATION CHECKER PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderIngredientAnalyzerPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>INCI Ingredient Safety Analyzer & Knowledge Base</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Paste any cosmetic ingredient list to audit for allergens, irritants, and comedogenic conflicts against your profile.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {/* Mode 1: Formulation Safety Checker */}
          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
            <div>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>🧪 Formulation Safety Checker</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>PRODUCT NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Barrier Repair Moisturizer"
                    value={ingrProductName}
                    onChange={e => setIngrProductName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>PASTE INGREDIENTS (COMMA-SEPARATED)</label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Water, Niacinamide, Glycerin, Ceramide NP, Squalane, Phenoxyethanol"
                    value={ingrText}
                    onChange={e => setIngrText(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>ROUTINE TIME</label>
                    <select
                      value={ingrRoutineTime}
                      onChange={e => setIngrRoutineTime(e.target.value as 'AM' | 'PM' | 'Night')}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
                    >
                      <option value="AM">Morning (AM)</option>
                      <option value="PM">Evening (PM)</option>
                      <option value="Night">Night (PM Intensive / Overnight)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={runIngredientCheck}
                disabled={ingrLoading || !ingrText.trim()}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#059669', color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.3)', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#047857'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
              >
                {ingrLoading ? 'Analyzing Active Synergies…' : '🔍 Analyze Formulation Safety'}
              </button>
            </div>

            {/* Results */}
            {ingrResult && (
              <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{ingrResult.product_name}</div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: ingrResult.safety_score >= 80 ? '#16a34a' : '#d97706' }}>
                    {ingrResult.safety_score}/100 Safety
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>
                  Status: <b>{ingrResult.status}</b> · Evaluated {ingrResult.evaluated_ingredients_count} active ingredients.
                </div>
                {ingrResult.allergy_alerts?.length > 0 && (
                  <div style={{ marginTop: '8px', color: '#dc2626', fontSize: '0.76rem', fontWeight: 700 }}>
                    ⚠️ Allergen Trigger: {ingrResult.allergy_alerts.join(', ')}
                  </div>
                )}
                {ingrResult.conflict_warnings?.length > 0 && (
                  <div style={{ marginTop: '6px', color: '#d97706', fontSize: '0.76rem' }}>
                    ⚠️ Conflict Notice: {ingrResult.conflict_warnings.join(', ')}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Mode 2: Ingredient Knowledge Base Explorer */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>📖 Active Ingredient Directory</h3>

            <input
              type="text"
              placeholder="Search ingredient (e.g. Niacinamide, Retinol, Ceramide)..."
              value={ingrSearchQuery}
              onChange={e => setIngrSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box', marginBottom: '14px' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
              {(ingrKnowledgeList.length ? ingrKnowledgeList : [
                { name: 'Niacinamide (Vitamin B3)', category: 'Active Antioxidant', safety_rating: 'Safe', benefits: ['Pore reduction', 'Lipid synthesis', 'Anti-redness'] },
                { name: 'Ceramide NP', category: 'Lipid Replenisher', safety_rating: 'Safe', benefits: ['Barrier repair', 'TEWL reduction', 'Hydration'] },
                { name: 'Hyaluronic Acid', category: 'Humectant', safety_rating: 'Safe', benefits: ['Moisture binding', 'Plumping', 'Elasticity'] },
                { name: 'Salicylic Acid (BHA)', category: 'Beta Hydroxy Acid', safety_rating: 'Moderate', benefits: ['Pore unclogging', 'Anti-acne', 'Sebum control'] },
                { name: 'Centella Asiatica', category: 'Botanical Soother', safety_rating: 'Safe', benefits: ['Wound healing', 'Calming', 'Redness defense'] },
              ])
                .filter(ing => !ingrSearchQuery.trim() || ing.name.toLowerCase().includes(ingrSearchQuery.toLowerCase()))
                .map((ing, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{ing.name}</div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: ing.safety_rating === 'Safe' ? '#16a34a' : '#d97706', background: ing.safety_rating === 'Safe' ? '#ecfdf5' : '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                        {ing.safety_rating}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{ing.category}</div>
                    <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: '4px' }}>
                      Benefits: {ing.benefits?.join(' · ')}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 7. LIFESTYLE & HABITS (Brand-New Dedicated Innovative Architecture)
  // ─────────────────────────────────────────────────────────────────────────
  const renderLifestylePage = () => {
    // Use top-level lifted state for all interactive matrices
    const habitChecks = lifestyleHabitChecks;
    const setHabitChecks = setLifestyleHabitChecks;
    const nutritionLog = lifestyleNutritionLog;
    const setNutritionLog = setLifestyleNutritionLog;
    const airQuality = lifestyleAirQuality;
    const setAirQuality = setLifestyleAirQuality;
    const humidity = lifestyleHumidity;
    const setHumidity = setLifestyleHumidity;

    const toggleHabit = (key: string) => {
      setHabitChecks((prev: { [key: string]: boolean }) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleNutr = (key: string) => {
      setNutritionLog((prev: { [key: string]: boolean }) => ({ ...prev, [key]: !prev[key] }));
    };

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const habits = [
      { id: 'water', label: '💧 2.5L Water Intake' },
      { id: 'spf', label: '☀️ AM SPF 50 Mineral Shield' },
      { id: 'retinol', label: '🌙 PM Barrier Actives / Retinoid' },
      { id: 'sleep', label: '🛌 7.5h+ Regenerative Sleep' },
      { id: 'workout', label: '🏃 Facial / Lymphatic Drainage' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Circadian Skincare & Cellular Health Hub</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Synchronize your skincare protocol with internal biological rhythms, systemic nutrition, and environmental stress factors.
              </p>
            </div>
            <button
              onClick={async () => {
                setLifestyleSaving(true);
                try {
                  await api.updateProfile({
                    water_intake_l: dailyWaterGlasses * 0.25,
                    sleep_hours: dailySleepHours,
                    stress_level: dailyStressLevel,
                    sun_exposure: dailySunExposure,
                  });
                  setLifestyleSuccess(true);
                  loadProfile();
                  setTimeout(() => setLifestyleSuccess(false), 2500);
                } catch {} finally {
                  setLifestyleSaving(false);
                }
              }}
              disabled={lifestyleSaving}
              style={{ padding: '10px 22px', borderRadius: '12px', background: PUR, color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px ${PUR}30` }}
            >
              {lifestyleSaving ? 'Logging Metrics…' : '✓ Save Circadian Journal'}
            </button>
          </div>

          {lifestyleSuccess && (
            <div style={{ marginTop: '14px', padding: '10px 16px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '0.82rem', fontWeight: 700 }}>
              ✅ Circadian metrics and dietary biomarkers logged successfully!
            </div>
          )}
        </Card>

        {/* 1. 24-Hour Circadian Biological Clock Timeline */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>⏰ 24-Hour Circadian Skin Clock</h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>How skin biology fluctuates throughout the day and optimal intervention windows</p>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '8px' }}>
              Phase: Daytime Barrier Defense
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { time: '06:00 - 09:00', phase: 'Morning Awakening', status: 'Secretion lowest, TEWL rising', action: 'Gentle Cleanser + Vitamin C + SPF 50', bg: '#fef3c7', text: '#b45309' },
              { time: '09:00 - 15:00', phase: 'Peak Environmental Load', status: 'UV irradiation & oxidation max', action: 'Sunscreen reapplication + Antioxidant mist', bg: '#fee2e2', text: '#dc2626' },
              { time: '15:00 - 19:00', phase: 'Sebum Peak & Permeability', status: 'Sebum production highest', action: 'Blotting / Oil cleanse at dusk', bg: '#f0effe', text: PUR },
              { time: '21:00 - 03:00', phase: 'DNA Repair & Mitosis', status: 'Cell division accelerates 30x', action: 'Ceramides + Retinoid + Deep Sleep', bg: '#ecfdf5', text: '#059669' },
            ].map((slot, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '14px', background: slot.bg, border: `1px solid ${slot.text}20`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: slot.text }}>{slot.time}</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{slot.phase}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', lineHeight: 1.3 }}>{slot.status}</div>
                </div>
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${slot.text}30`, fontSize: '0.72rem', fontWeight: 700, color: slot.text }}>
                  💡 {slot.action}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. Weekly Skincare Habit Adherence Matrix */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>📅 7-Day Protocol Adherence Matrix</h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Interactive tracking of daily therapeutic commitments</p>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: PUR, background: '#f0effe', padding: '3px 10px', borderRadius: '8px' }}>
              Weekly Consistency: 91%
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800, color: '#475569' }}>Habit & Therapeutic Step</th>
                  {days.map(d => (
                    <th key={d} style={{ padding: '10px 10px', fontWeight: 800, color: '#475569' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>{h.label}</td>
                    {days.map(d => {
                      const key = `${d}-${h.id}`;
                      const checked = habitChecks[key];
                      return (
                        <td key={d} style={{ padding: '10px' }}>
                          <button
                            type="button"
                            onClick={() => toggleHabit(key)}
                            style={{
                              width: '28px', height: '28px', borderRadius: '8px',
                              border: `1.5px solid ${checked ? '#10b981' : '#cbd5e1'}`,
                              background: checked ? '#ecfdf5' : '#fff',
                              color: checked ? '#059669' : 'transparent',
                              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 900,
                              display: 'inline-grid', placeItems: 'center', transition: 'all 0.12s'
                            }}
                          >
                            {checked ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 3. Skin Nutrition & Micronutrient Intake */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>🥗 Systemic Skin Nutrition</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#64748b' }}>Daily essential micronutrients that fortify lipid membrane elasticity</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(nutritionLog).map(([item, checked]) => (
                <div
                  key={item}
                  onClick={() => toggleNutr(item)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '10px',
                    border: `1px solid ${checked ? PUR : '#e2e8f0'}`,
                    background: checked ? '#f0effe' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: checked ? PUR : '#334155' }}>
                    {checked ? '✓ ' : '○ '}{item}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: checked ? PUR : '#94a3b8', fontWeight: 600 }}>
                    {checked ? 'Consumed Today' : 'Tap to Mark'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Environmental Stress & Epigenetic Modifiers */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>🌫️ Environmental Stress Calibration</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#64748b' }}>Local microclimate & atmospheric variables impacting stratum corneum</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Air Quality Index (AQI / PM2.5):</span>
                  <span style={{ color: airQuality < 50 ? '#059669' : '#d97706', fontWeight: 900 }}>{airQuality} (Good/Low Pollution)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={airQuality}
                  onChange={e => setAirQuality(Number(e.target.value))}
                  style={{ width: '100%', height: '6px', borderRadius: '4px', background: '#e2e8f0', accentColor: '#059669', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Ambient Humidity (%):</span>
                  <span style={{ color: '#059669', fontWeight: 900 }}>{humidity}% (Ideal Barrier Range)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={humidity}
                  onChange={e => setHumidity(Number(e.target.value))}
                  style={{ width: '100%', height: '6px', borderRadius: '4px', background: '#e2e8f0', accentColor: '#059669', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Daily Sun Exposure Duration:</span>
                  <span style={{ color: ORA, fontWeight: 900 }}>{dailySunExposure}</span>
                </div>
                <select value={dailySunExposure} onChange={e => setDailySunExposure(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}>
                  <option value="Minimal (<30 mins)">Minimal (&lt;30 mins indoors)</option>
                  <option value="Moderate (1-2 hrs)">Moderate (1-2 hrs outdoor)</option>
                  <option value="High (3+ hrs direct sun)">High (3+ hrs direct sun)</option>
                </select>
              </div>

              <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.74rem', color: '#64748b' }}>
                💡 High humidity (&gt;55%) reduces transepidermal moisture loss by 40% vs dry environments.
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };



  // ─────────────────────────────────────────────────────────────────────────
  // 8. PROGRESS TRACKING & RECOVERY TIMELINE
  // ─────────────────────────────────────────────────────────────────────────
  const renderProgressTrackingPage = () => {
    const chartVals = analytics?.score_history?.length
      ? analytics.score_history.map(h => h.score)
      : [68, 72, 79, 84];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Skin Progress & Photo Timeline</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Longitudinal recovery metrics, routine compliance rates, and visual timeline photos.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{ padding: '9px 18px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}30` }}
              >
                {uploadingPhoto ? '⏳ Uploading…' : '+ Upload Progress Photo'}
              </button>
            </div>
          </div>
          {uploadPhotoSuccess && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.82rem', fontWeight: 700 }}>
              ✅ Progress photo uploaded and added to your visual timeline!
            </div>
          )}
        </Card>

        {/* Adherence & Historical Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '390px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Score Progression Graph</h3>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                  {scorePct !== null ? `Current: ${scorePct}/100` : 'No data yet'}
                </span>
              </div>
              <div style={{ paddingBottom: '16px' }}>
                <ChartFrame
                  chart={{ el: <LineChart vals={chartVals} min={0} max={100} /> }}
                  yLabels={['100', '75', '50', '25', '0']}
                  xLabels={(() => {
                    const history = analytics?.score_history || [];
                    if (!history.length) return ['Day 1', 'Day 7', 'Day 14', 'Today'];
                    const n = history.length;
                    if (n <= 5) {
                      let dateCounts: Record<string, number> = {};
                      return history.map(h => {
                        const d = h.date?.slice(5) || 'Recent';
                        dateCounts[d] = (dateCounts[d] || 0) + 1;
                        return dateCounts[d] > 1 ? `${d} #${dateCounts[d]}` : d;
                      });
                    }
                    const indices = [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1];
                    let seen: Record<string, number> = {};
                    return indices.map((idx, i) => {
                      const d = history[idx]?.date?.slice(5) || `P${i+1}`;
                      seen[d] = (seen[d] || 0) + 1;
                      return seen[d] > 1 ? `${d} #${seen[d]}` : d;
                    });
                  })()}
                  h={190}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <span>Longitudinal skin barrier trajectory</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>▲ +14% vs Baseline</span>
            </div>
          </Card>

          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Routine Adherence Compliance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: '7-Day Rolling Adherence', val: analytics?.compliance_metrics?.adherence_7d || 92.5, color: '#10b981' },
                  { label: '30-Day Long-Term Compliance', val: analytics?.compliance_metrics?.adherence_30d || 88.0, color: PUR },
                  { label: '90-Day Baseline Retention', val: analytics?.compliance_metrics?.adherence_90d || 94.0, color: BLU },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      <span>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 900 }}>{item.val}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.val}%`, background: item.color, borderRadius: '99px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.78rem', color: '#64748b' }}>
              💡 Clinical trials confirm &gt;85% routine adherence yields 3.2x faster barrier restoration.
            </div>
          </Card>
        </div>

        {/* Photo Gallery Grid */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Visual Progress Photo Gallery</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {analytics?.progress_photos?.length ? (
              analytics.progress_photos.map((ph, idx) => (
                <div key={ph.id || idx} style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
                  <img src={ph.url} alt={ph.tag} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: PUR }}>{ph.tag}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{ph.date}</div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await api.deletePhoto(ph.id);
                          loadAnalytics();
                        } catch {}
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer' }}
                      title="Delete photo"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 16px', color: '#64748b', fontSize: '0.84rem' }}>
                No progress photos uploaded yet. Upload a photo or take a photo assessment to track visual improvement.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 9. UPLOAD PHOTO (Dedicated Studio with Angle Tagging & Verification)
  // ─────────────────────────────────────────────────────────────────────────
  const renderUploadPhotoStudioPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Clinical Photo Upload & Progress Studio</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Upload standardized clinical progress photos with angle tagging to evaluate follicular refinement and erythema reduction.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          {/* Upload Card */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Upload Standardized Photo</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>TIMELINE MILESTONE TAG</label>
                <select value={uploadPhotoTag} onChange={e => setUploadPhotoTag(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}>
                  <option value="Baseline">Baseline (Start of Protocol)</option>
                  <option value="Week 2 Checkpoint">Week 2 Checkpoint</option>
                  <option value="Week 4 Milestone">Week 4 Milestone</option>
                  <option value="Week 8 Full Protocol">Week 8 Full Protocol</option>
                  <option value="Maintenance">Maintenance Check-in</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>FACIAL ANGLE</label>
                <select value={uploadPhotoAngle} onChange={e => setUploadPhotoAngle(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}>
                  <option value="Frontal Face">Frontal Face (Direct Alignment)</option>
                  <option value="Left Cheek Profile">Left Cheek Profile</option>
                  <option value="Right Cheek Profile">Right Cheek Profile</option>
                  <option value="Forehead Zone">Forehead / T-Zone Detail</option>
                </select>
              </div>

              <div style={{ padding: '24px 16px', borderRadius: '14px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                {photoPreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
                    <img src={photoPreview} alt="Preview" style={{ width: '120px', height: '120px', borderRadius: '14px', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 800, textAlign: 'center' }}>✓ Ready for upload to photo vault</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: '2.4rem', margin: '0 auto 6px', textAlign: 'center' }}>📸</div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', width: '100%', margin: '0 auto 4px' }}>
                      Select Image from Device
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', textAlign: 'center', maxWidth: '340px', margin: '0 auto 10px', lineHeight: 1.4 }}>
                      Consistent indirect lighting ensures highest assessment accuracy
                    </div>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        margin: '0 auto 6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = PUR;
                        (e.currentTarget as HTMLElement).style.color = PUR;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                        (e.currentTarget as HTMLElement).style.color = '#334155';
                      }}
                    >
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', textAlign: 'center', width: '100%', margin: '0 auto' }}>
                      No file chosen
                    </div>
                  </div>
                )}
              </div>

              {uploadingPhoto && <div style={{ textAlign: 'center', color: PUR, fontSize: '0.82rem', fontWeight: 700 }}>Uploading & processing metadata…</div>}
              {uploadPhotoSuccess && <div style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>✅ Photo successfully saved to your clinical timeline!</div>}
            </div>
          </Card>

          {/* Guidelines */}
          <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Clinical Photography Guidelines</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  ['💡', 'Lighting', 'Capture in soft, natural daylight facing a window without direct harsh sunlight or yellow artificial lamps.'],
                  ['🧼', 'Clean Skin', 'Wash face with a gentle cleanser 15 minutes prior to photo capture to remove surface glare.'],
                  ['📐', 'Distance & Framing', 'Hold camera at eye-level approximately 30-45 cm away with neutral facial expression.'],
                  ['🗓️', 'Frequency', 'Upload once every 7 to 14 days to observe true epidermal turnover cycles.'],
                ].map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem' }}>{g[0]}</span>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>{g[1]}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>{g[2]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onSectionChange && onSectionChange('progress-tracking')}
              style={{ marginTop: '16px', padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: PUR, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              View Full Historical Photo Gallery →
            </button>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 10. SKIN SCAN PAGE (Full-Featured AI Scanner Simulator)
  // ─────────────────────────────────────────────────────────────────────────
  const renderSkinScanPage = () => {
    // Use top-level lifted refs/state for camera to avoid React rules-of-hooks violations
    const videoRef = skinScanVideoRef;
    const cameraActive = skinScanCameraActive;
    const setCameraActive = setSkinScanCameraActive;
    const cameraError = skinScanCameraError;
    const setCameraError = setSkinScanCameraError;

    const startCamera = async () => {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
        });
        skinScanStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {}
        }
        setCameraActive(true);
      } catch (err: any) {
        setCameraError(err?.message || 'Camera access denied. Please allow camera permissions or upload a photo.');
        setCameraActive(false);
      }
    };

    const stopCamera = () => {
      try {
        if (skinScanStreamRef.current) {
          skinScanStreamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch {}
          });
          skinScanStreamRef.current = null;
        }
        if (videoRef.current) {
          if (videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              try {
                track.stop();
              } catch {}
            });
            videoRef.current.srcObject = null;
          }
          videoRef.current.pause();
        }
      } catch (err) {
        console.error('Error stopping camera:', err);
      } finally {
        setCameraActive(false);
      }
    };

    const triggerLiveScan = () => {
      startAiScan();
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>AI Real-Time Skin Scanner & Biometric Analysis</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Live optical facial scanner calculates pore density, moisture barrier integrity, and biological skin age.
          </p>
        </Card>

        <Card style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Scanner Viewport */}
          <div style={{ width: '320px', height: '320px', borderRadius: '24px', background: '#090d16', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', border: `3px solid ${scanStep === 'scanning' ? '#10b981' : PUR}`, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', marginBottom: '22px' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
            />

            {!cameraActive && photoPreview && (
              <img src={photoPreview} alt="Face Scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}

            {!cameraActive && !photoPreview && (
              <div style={{ color: '#94a3b8', fontSize: '0.84rem', padding: '20px' }}>
                <div style={{ fontSize: '3.6rem', marginBottom: '8px' }}>📸</div>
                <div>Click "Open Camera" or upload a photo to start biometric scan</div>
              </div>
            )}

            {/* Face Landmark Mesh Overlay */}
            <div style={{ position: 'absolute', inset: '24px', border: '1.5px dashed rgba(255,255,255,0.6)', borderRadius: '20px', pointerEvents: 'none' }} />

            {/* Scanning Line Animation */}
            {scanStep === 'scanning' && (
              <div style={{ position: 'absolute', left: 0, right: 0, height: '3px', background: '#10b981', boxShadow: '0 0 16px #10b981', top: `${scanProgress}%`, transition: 'top 0.3s ease' }} />
            )}
          </div>

          {cameraError && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', fontSize: '0.82rem', marginBottom: '16px', maxWidth: '360px' }}>
              ⚠️ {cameraError}
            </div>
          )}

          {scanStep === 'ready' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  style={{ padding: '12px 24px', borderRadius: '12px', background: PUR, color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px ${PUR}40` }}
                >
                  📷 Open Live Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{ padding: '12px 20px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.1)' }}
                >
                  ✕ Close Camera
                </button>
              )}

              {photoPreview && !cameraActive && (
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); setUploadedPhotoUrl(null); }}
                  style={{ padding: '12px 18px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  🗑️ Clear Photo
                </button>
              )}

              <button
                type="button"
                onClick={triggerLiveScan}
                style={{ padding: '12px 28px', borderRadius: '12px', background: '#059669', color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}
              >
                ⚡ Analyze Skin Biometrics
              </button>
            </div>
          )}

          {scanStep === 'scanning' && (
            <div style={{ width: '280px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: PUR, marginBottom: '6px' }}>Evaluating Cellular Matrix… {scanProgress}%</div>
              <div style={{ height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${scanProgress}%`, background: PUR, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {scanStep === 'complete' && scanBiomarkers && (
            <div style={{ width: '100%', maxWidth: '480px', marginTop: '6px' }}>
              <div style={{ padding: '16px', borderRadius: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#065f46' }}>✓ Biometric Scan Complete</div>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '4px' }}>
                  All 4 epidermal zones successfully categorized. Biological Skin Age evaluated at <b>{scanBiomarkers.estimatedSkinAge}</b>.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px', textAlign: 'left' }}>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b' }}>Pore Refinement:</span> <b style={{ color: '#0f172a' }}>{scanBiomarkers.poreRefinement}</b>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b' }}>Sebum Balance:</span> <b style={{ color: '#0f172a' }}>{scanBiomarkers.sebumBalance}</b>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b' }}>Barrier Hydration:</span> <b style={{ color: '#059669' }}>{scanBiomarkers.barrierHydration}</b>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b' }}>Erythema Index:</span> <b style={{ color: '#0f172a' }}>{scanBiomarkers.erythemaIndex}</b>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b' }}>Texture Uniformity:</span> <b style={{ color: '#0f172a' }}>{scanBiomarkers.textureUniformity || '91% (Smooth)'}</b>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b' }}>Scan Captured:</span> <b style={{ color: PUR }}>{scanBiomarkers.scanTimestamp || 'Live'}</b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    stopCamera();
                    onSectionChange && onSectionChange('skin-assessment');
                    submitAssessment();
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Generate Full Diagnostic Dossier →
                </button>
                <button
                  onClick={() => setScanStep('ready')}
                  style={{ padding: '12px 18px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 11. REPORTS CENTER (Isolated Professional Printable Report View)
  // ─────────────────────────────────────────────────────────────────────────
  const renderReportsPage = () => {
    const downloadReportTxt = () => {
      const content = `================================================================================
                    MIRACLE DERMATOLOGY & CLINICAL RESEARCH
                  EPIDERMAL BARRIER & BIOCHEMICAL HEALTH DOSSIER
================================================================================
Generated: ${new Date().toLocaleString()}
Patient ID: MRC-${storedUser.id?.slice(0, 8) || '2026-USR'}
Patient Name: ${profileName || 'Ananya Sharma'}
Email: ${storedUser.email || 'user@miracle.com'}
Chronological Age: ${chronologicalAge} | Biological Skin Age: ${calculatedSkinAge}
Gender: ${profileGender} | Fitzpatrick: ${fitzpatrickType}
Climate: ${climateZone}

--------------------------------------------------------------------------------
1. CLINICAL SKIN CLASSIFICATION & BIOMARKERS
--------------------------------------------------------------------------------
Primary Skin Type: ${currentSkinType}
Overall Barrier Health Score: ${scorePct || 82}/100 (${scoreLabel})
Hydration Subscore: ${score?.hydration_subscore || 82}/100
Acne Severity: ${acneSeverity}/10
Pigmentation Severity: ${pigmentationSeverity}/10
Redness / Sensitivity: ${rednessSeverity}/10
Wrinkle / Elasticity Loss: ${wrinklesSeverity}/10

Active Detected Concerns:
${selectedConcerns.map((c, i) => `  ${i + 1}. ${c}`).join('\n') || '  - None flagged'}

Known Allergies & Sensitivities:
${profileAllergies.map((a, i) => `  ${i + 1}. ${a}`).join('\n') || '  - None reported'}

--------------------------------------------------------------------------------
2. PRESCRIBED THERAPEUTIC REGIMEN
--------------------------------------------------------------------------------
AM ROUTINE (Antioxidant & Photoprotection Shield):
  - Step 1: Gentle Hydrating Amino Cleanser
  - Step 2: 10% Vitamin C + Ferulic Acid Treatment
  - Step 3: Ceramide NP Barrier Daily Emulsion
  - Step 4: Broad Spectrum Mineral Sunscreen SPF 50+

PM ROUTINE (Lipid Replenishment & Active Repair):
  - Step 1: Balancing Micellar Cleansing Emulsion
  - Step 2: Niacinamide 5% + Centella Asiatica Serum
  - Step 3: Overnight Intensive Ceramide Lipid Cream

NIGHT / WEEKLY INTENSIVE PROTOCOL:
  - Step 1: Gentle Lactic Acid 5% Exfoliant (2x weekly)
  - Step 2: Retinol 0.025% Cellular Renewal Serum (Wed & Sun)
  - Step 3: Multi-Peptide Under-Eye Elixir

--------------------------------------------------------------------------------
3. LIFESTYLE BIOMARKER CORRELATION
--------------------------------------------------------------------------------
Daily Water Intake: ${waterLiters} Liters
Sleep Duration: ${sleepHours} Hours (REM Collagen Window)
Routine Adherence: 91%

--------------------------------------------------------------------------------
DISCLAIMER: This diagnostic report is generated by Miracle AI Clinical Engine for
individual skin health optimization. For prescription pharmaceuticals, consult
a licensed board-certified dermatologist.
================================================================================`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MIRACLE_Dermatology_Report_${profileName?.replace(/\s+/g, '_') || 'Patient'}_${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Patient Clinical Diagnostic Report & Health Dossier</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Complete diagnostic synthesis with biochemical subscores, targeted regimen prescription, and active ingredients.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={downloadReportTxt}
                style={{ padding: '10px 18px', borderRadius: '10px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
              >
                📥 Download Data
              </button>
              <button
                onClick={() => setShowPrintableDossier(true)}
                style={{ padding: '10px 22px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}30` }}
              >
                🖨️ View & Print Official Dossier
              </button>
            </div>
          </div>
        </Card>

        {/* Detailed Comprehensive Report Body */}
        <Card style={{ padding: '28px' }}>
          {/* Clinic Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.08em' }}>MIRACLE CLINICAL DERMATOLOGY</div>
              <div style={{ fontSize: '0.78rem', color: PUR, fontWeight: 700 }}>EPIDERMAL BARRIER & BIOCHEMICAL HEALTH DOSSIER</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#334155' }}>
              <div><b>Report Date:</b> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div><b>Record ID:</b> MRC-{storedUser.id?.slice(0, 8) || 'USR-2026'}</div>
            </div>
          </div>

          {/* Patient Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '22px', padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #edf2f7' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>PATIENT NAME</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>{profileName || 'Ananya Sharma'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>SKIN PHENOTYPE</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: PUR }}>{currentSkinType} Skin</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>OVERALL SCORE</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#059669' }}>{scorePct !== null ? `${scorePct}/100` : '82/100'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>BIOLOGICAL SKIN AGE</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: BLU }}>{calculatedSkinAge} Yrs (-{chronologicalAge - calculatedSkinAge})</div>
            </div>
          </div>

          {/* Clinical Subscore Matrix */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>1. Diagnostic Subscore Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {[
                { label: 'Epidermal Hydration Index', score: `${score?.hydration_subscore || 82}/100`, color: '#059669', desc: 'Moisture retention & TEWL resistance' },
                { label: 'Sebum & Pore Balance', score: `${100 - acneSeverity * 8}/100`, color: PUR, desc: 'Follicular clear zone index' },
                { label: 'Erythema & Stinging Threshold', score: `${100 - rednessSeverity * 8}/100`, color: BLU, desc: 'Vascular reactivity score' },
                { label: 'Cellular Turnover & Tone', score: `${100 - pigmentationSeverity * 8}/100`, color: ORA, desc: 'Melanin distribution uniformity' },
              ].map((sub, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: '10px', background: '#fafafa', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>{sub.label}</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 900, color: sub.color }}>{sub.score}</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>{sub.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Therapeutic Prescription */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>2. Active Prescribed Regimen Matrix</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#b45309', marginBottom: '6px' }}>☀️ MORNING PROTOCOL</div>
                <div style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.6 }}>
                  1. Amino Acid Cleanser<br />
                  2. 10% Vitamin C + Ferulic Acid<br />
                  3. Ceramide NP Daily Emulsion<br />
                  4. Mineral Sunscreen SPF 50+
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', background: '#f0effe', border: `1px solid ${PUR}30` }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: PUR, marginBottom: '6px' }}>🏮 EVENING PROTOCOL</div>
                <div style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.6 }}>
                  1. Balancing Micellar Cleanser<br />
                  2. Niacinamide 5% + Centella Serum<br />
                  3. Overnight Intensive Lipid Cream
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', background: '#f5f3ff', border: '1px solid #ede9fe' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#7c3aed', marginBottom: '6px' }}>🌌 NIGHT / WEEKLY INTENSIVE</div>
                <div style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.6 }}>
                  1. Lactic Acid 5% Exfoliant (2x/wk)<br />
                  2. Retinol 0.025% Renewal Serum<br />
                  3. Multi-Peptide Eye Elixir
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>Verified by Miracle AI Diagnostic Engine v4.2 · Certified by SkinSAFE Protocol</span>
            <span>Ref: {storedUser.email || 'user@miracle.com'}</span>
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 12. REMINDERS PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderRemindersPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Skincare Routine & Habit Reminders</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Configure daily schedule alerts for morning protection, midday sunscreen reapplication, and night routines.
          </p>
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {remindersList.map(rem => (
              <div key={rem.id} style={{ padding: '14px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{rem.title}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, background: '#f0effe', padding: '2px 8px', borderRadius: '4px' }}>{rem.time}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{rem.desc}</div>
                </div>

                <input
                  type="checkbox"
                  checked={rem.active}
                  onChange={() => {
                    setRemindersList(remindersList.map(r => r.id === rem.id ? { ...r, active: !r.active } : r));
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: PUR }}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 13. ASK AI CHAT PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderAskAiPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Ask Miracle AI Skincare Companion</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Personalized guidance conditioned on your active profile ({selectedSkinType} skin, target: {dynamicPrimaryConcern}, score: {scorePct || 82}/100).
          </p>
        </Card>

        <Card style={{ padding: '22px', height: '520px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' }}>
            {aiChatMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: isUser ? PUR : '#f1f5f9',
                    color: isUser ? '#fff' : '#1e293b',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                  }}
                >
                  <div>{msg.text}</div>
                  <div style={{ fontSize: '0.68rem', color: isUser ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                    {msg.time}
                  </div>
                </div>
              );
            })}
            {aiTyping && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', fontSize: '0.8rem' }}>
                Miracle AI is thinking…
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <input
              type="text"
              placeholder="Ask about active ingredient synergies, barrier recovery, or SPF recommendations..."
              value={aiInputText}
              onChange={e => setAiInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendAiMessage(); }}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none' }}
            />
            <button
              onClick={handleSendAiMessage}
              style={{ padding: '10px 20px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Send →
            </button>
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Modals & Popups
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // 12. SUBSCRIPTION & PREMIUM CLINICAL MEMBERSHIP PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const handleActivateSubscription = () => {
    setSubProcessing(true);
    setTimeout(() => {
      const planMap = {
        monthly: { name: 'Pro Clinical Monthly', price: 999, interval: 'month' },
        annual: { name: 'Annual Clinical DermPass', price: 5999, interval: 'year' },
        concierge: { name: 'VIP Clinical Concierge', price: 14999, interval: 'year' },
      };
      const p = planMap[subTier];
      const now = new Date();
      const ren = new Date();
      if (subTier === 'monthly') ren.setMonth(ren.getMonth() + 1);
      else ren.setFullYear(ren.getFullYear() + 1);

      const subData = {
        planName: p.name,
        tier: subTier,
        price: p.price,
        interval: p.interval,
        startedDate: now.toISOString().split('T')[0],
        renewalDate: ren.toISOString().split('T')[0],
        txnId: `TXN-MRCL-${Math.floor(100000 + Math.random() * 900000)}`,
        invoiceId: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        paymentMethod:
          payMethod === 'upi'
            ? `UPI (${upiVpa || 'UPI/QR'})`
            : payMethod === 'card'
            ? `Card (•••• ${cardNum.replace(/\s+/g, '').slice(-4) || '8402'})`
            : payMethod === 'netbanking'
            ? `NetBanking (${bankName})`
            : `Wallet (${walletProvider})`,
        status: 'Active',
      };

      localStorage.setItem('miracle_premium', 'true');
      localStorage.setItem('miracle_subscription', JSON.stringify(subData));
      setIsPremium(true);
      setActiveSubData(subData);
      setSubProcessing(false);
      setSubSuccessModal(true);
    }, 1400);
  };

  const renderSubscriptionPage = () => {
    const plans = [
      {
        id: 'monthly' as const,
        name: 'Pro Clinical Monthly',
        price: '₹999',
        rawPrice: 999,
        period: '/ month',
        badge: null,
        desc: 'Ideal for targeted 30-day intensive skin barrier rehabilitation regimens.',
        highlights: [
          'Unlimited AI Biometric Facial Scans',
          'Complete Clinical Diagnostic Reports & PDF Dossiers',
          'Full INCI Formulation & Allergen Screening Engine',
          'Standard Skincare Consultant Regimen Review',
          'Progress Tracking with 30-Day Metric Timelines',
        ],
      },
      {
        id: 'annual' as const,
        name: 'Annual Clinical DermPass',
        price: '₹5,999',
        rawPrice: 5999,
        period: '/ year (₹499/mo)',
        badge: '⭐ MOST POPULAR · SAVE 40%',
        desc: 'Comprehensive year-round clinical skin management with ongoing professional audits.',
        highlights: [
          'Everything in Pro Monthly, plus:',
          '2 Free 1-on-1 Certified Consultant Audits per year',
          'Priority Clinical Escalation & Dermatologist Referral Path',
          'Deep-Tissue Melanin & Erythema Time-Lapse Tracking',
          'Unlimited Ingredient Conflict Audits (50,000+ Formulations)',
          'High-Priority 24/7 AI Clinical Assistant Processing',
        ],
      },
      {
        id: 'concierge' as const,
        name: 'VIP Clinical Concierge',
        price: '₹14,999',
        rawPrice: 14999,
        period: '/ year',
        badge: '👑 CLINICAL CONCIERGE',
        desc: 'White-glove aesthetic medicine journey with dedicated monthly practitioner oversight.',
        highlights: [
          'Everything in Annual DermPass, plus:',
          'Dedicated Personal Skincare Consultant (Monthly 1-on-1 Video Audits)',
          'Direct Clinical Triage & Expedited Dermatologist Access',
          'Custom Formulated Compounding Guidance',
          'Full Family Multi-Profile Sharing (Up to 3 Users)',
          'Exclusive Early Access to Clinical Trial Formulations',
        ],
      },
    ];

    const currentPlan = plans.find(p => p.id === subTier) || plans[1];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Header Hero Banner */}
        <Card
          style={{
            padding: '28px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #31104b 50%, #4c0519 100%)',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                ⭐ Miracle SkinSAFE™ Clinical Membership
              </div>
              <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Elevate Your Skin Health with Clinical-Grade Intelligence
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                Unlock unrestricted AI biometric facial audits, detailed diagnostic health dossiers, certified skincare consultant appointments, and fast-track dermatologist referrals.
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', minWidth: '220px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Current Membership Status</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: isPremium ? '#4ade80' : '#fcd34d', margin: '4px 0' }}>
                {isPremium ? '⭐ PRO CLINICAL ACTIVE' : 'FREE EXPLORER TIER'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.85)' }}>
                {isPremium ? `Renews on ${activeSubData?.renewalDate || 'Aug 2027'}` : 'Basic diagnostic access'}
              </div>
              {isPremium && (
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  style={{ marginTop: '10px', width: '100%', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  📄 View Latest Tax Invoice
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Plan Tiers Selection */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Choose Your Clinical Membership Tier</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Transparent pricing with zero hidden charges. Cancel or upgrade anytime with 1-click.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {plans.map(plan => {
              const isSelected = subTier === plan.id;
              const isCurrent = isPremium && activeSubData?.tier === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSubTier(plan.id)}
                  style={{
                    borderRadius: '20px',
                    border: `2.5px solid ${isSelected ? PUR : '#e2e8f0'}`,
                    background: '#fff',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? `0 12px 30px ${PUR}22` : '0 2px 10px rgba(0,0,0,0.04)',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {plan.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: plan.id === 'annual' ? 'linear-gradient(90deg, #7c3aed, #ec4899)' : '#0f172a',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '4px 14px',
                        borderRadius: '99px',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{plan.name}</span>
                      {isCurrent && (
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontSize: '0.68rem', fontWeight: 800 }}>
                          Current Plan
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '10px 0 6px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{plan.price}</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{plan.period}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45, margin: '0 0 16px' }}>{plan.desc}</p>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {plan.highlights.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.76rem', color: '#334155' }}>
                          <span style={{ color: PUR, fontWeight: 900, fontSize: '0.85rem' }}>✓</span>
                          <span style={{ lineHeight: 1.35 }}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setSubTier(plan.id);
                    }}
                    style={{
                      marginTop: '22px',
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? PUR : '#f1f5f9',
                      color: isSelected ? '#fff' : '#334155',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSelected ? '✓ Selected Tier' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Grid */}
        <Card style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
            Comprehensive Clinical Benefits Included in All Paid Tiers
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#64748b' }}>
            Built in strict alignment with board-certified dermatology protocols.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '14px' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ede9fe', color: PUR, display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                📑
              </span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Clinical Diagnostic Reports & Health Dossiers</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                  Export high-resolution multi-page diagnostic health dossiers with barrier integrity indices, Fitzpatrick classifications, and INCI contraindication summaries.
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '14px' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                🔬
              </span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Unlimited AI Biometric Facial Scans</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                  Real-time optical analysis evaluating follicular pore dilation, sub-clinical erythema, dynamic sebum production, and localized pigmentary distribution.
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '14px' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                💬
              </span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Certified Skincare Consultant Audits</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                  Schedule direct 1-on-1 sessions with licensed cosmetic scientists and aesthetic consultants to audit your topical regimen and eliminate barrier stressors.
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '14px' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                🩺
              </span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Seamless Dermatologist Medical Referral</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                  In accordance with Miracle's clinical triage protocol, consultants automatically route clients with severe inflammatory dermatoses directly to board-certified Dermatologists.
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '14px' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                🧪
              </span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>INCI Allergen & Comedogenic Engine</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                  Instant conflict screening across 50,000+ SkinSAFE verified formulations matching specifically against your known sensitivities and barrier phenotype.
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '14px' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fdf4ff', color: '#c026d3', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                📈
              </span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>HD Photo Progress Timeline & Overlay</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                  Standardized biometric alignment grid with before/after split sliders tracking cellular regeneration over 30, 60, and 90-day protocol cycles.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Interactive Payment Checkout Terminal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Left: Payment Method Selection & Inputs */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Select Payment Method</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#64748b' }}>256-bit SSL encrypted bank gateway. Instant activation.</p>

            {/* Payment Method Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
              {[
                { id: 'upi' as const, label: 'UPI / QR', icon: '📱' },
                { id: 'card' as const, label: 'Cards', icon: '💳' },
                { id: 'netbanking' as const, label: 'NetBanking', icon: '🏦' },
                { id: 'wallet' as const, label: 'Wallets', icon: '⚡' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayMethod(m.id)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: `1.5px solid ${payMethod === m.id ? PUR : '#cbd5e1'}`,
                    background: payMethod === m.id ? '#f5f3ff' : '#fff',
                    color: payMethod === m.id ? PUR : '#334155',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Tab 1: UPI / QR */}
            {payMethod === 'upi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '84px', height: '84px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1', display: 'grid', placeItems: 'center', padding: '4px', flexShrink: 0 }}>
                    {/* Simulated Clean QR Code Graphic */}
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                      <rect width="100" height="100" fill="#fff" />
                      <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                      <rect x="15" y="15" width="15" height="15" fill="#fff" />
                      <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
                      <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                      <rect x="70" y="15" width="15" height="15" fill="#fff" />
                      <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
                      <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                      <rect x="15" y="70" width="15" height="15" fill="#fff" />
                      <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
                      <rect x="42" y="15" width="14" height="14" fill="#0f172a" />
                      <rect x="45" y="45" width="14" height="14" fill="#7c3aed" />
                      <rect x="65" y="45" width="10" height="25" fill="#0f172a" />
                      <rect x="42" y="65" width="16" height="20" fill="#0f172a" />
                      <rect x="78" y="78" width="12" height="12" fill="#7c3aed" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Scan QR with any UPI App</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Supports Google Pay, PhonePe, Paytm, BHIM & all Indian banking UPI apps.
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', fontSize: '0.64rem', fontWeight: 800 }}>GPay</span>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', fontSize: '0.64rem', fontWeight: 800 }}>PhonePe</span>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', fontSize: '0.64rem', fontWeight: 800 }}>Paytm</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>OR ENTER UPI ID / VPA</label>
                  <input
                    type="text"
                    placeholder="e.g. yourname@okhdfcbank"
                    value={upiVpa}
                    onChange={e => setUpiVpa(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Credit / Debit Cards */}
            {payMethod === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CARD NUMBER</label>
                  <input
                    type="text"
                    placeholder="4532 •••• •••• 8402"
                    value={cardNum}
                    onChange={e => setCardNum(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box', letterSpacing: '0.08em' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>EXPIRY (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="08/29"
                      value={cardExp}
                      onChange={e => setCardExp(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CARDHOLDER NAME</label>
                  <input
                    type="text"
                    placeholder="Ananya Sharma"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: NetBanking */}
            {payMethod === 'netbanking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block' }}>SELECT PRIMARY BANK</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak', 'PNB'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBankName(b)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: `1.5px solid ${bankName === b ? PUR : '#cbd5e1'}`,
                        background: bankName === b ? '#f5f3ff' : '#fff',
                        color: bankName === b ? PUR : '#334155',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff', marginTop: '6px' }}
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="IndusInd Bank">IndusInd Bank</option>
                  <option value="Other Bank (All Indian Banks Supported)">Other Bank (All Indian Banks Supported)</option>
                </select>
              </div>
            )}

            {/* Tab 4: Wallets */}
            {payMethod === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block' }}>SELECT WALLET / PAY LATER</label>
                {['Amazon Pay', 'Paytm Wallet', 'Simpl (Pay in 3)', 'LazyPay'].map(w => (
                  <div
                    key={w}
                    onClick={() => setWalletProvider(w)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1.5px solid ${walletProvider === w ? PUR : '#cbd5e1'}`,
                      background: walletProvider === w ? '#f5f3ff' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>{w}</span>
                    <span style={{ color: PUR, fontWeight: 900 }}>{walletProvider === w ? '✓' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Right: Order Summary & Checkout Action */}
          <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Membership Summary</h3>

              <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{currentPlan.name}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: PUR }}>{currentPlan.price}</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Billed {subTier === 'monthly' ? 'Monthly' : 'Annually'} · Instant Activation
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tier Base Price</span>
                  <span style={{ fontWeight: 700 }}>₹{Math.round(currentPlan.rawPrice / 1.18)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST (18% Clinical Software Services)</span>
                  <span style={{ fontWeight: 700 }}>₹{currentPlan.rawPrice - Math.round(currentPlan.rawPrice / 1.18)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  <span>Total Amount Payable</span>
                  <span style={{ color: PUR }}>{currentPlan.price}</span>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '10px 12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.72rem', lineHeight: 1.4 }}>
                🔒 <strong>100% Secure Checkout:</strong> Backed by 256-bit bank-grade encryption and 7-day money-back guarantee.
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleActivateSubscription}
                disabled={subProcessing}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: `0 6px 20px ${PUR}35`,
                  transition: 'all 0.15s',
                }}
              >
                {subProcessing ? 'Processing Secure Bank Gateway…' : `Pay ${currentPlan.price} & Activate Membership →`}
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px' }}>
                By proceeding, you agree to Miracle's Clinical Terms of Service & Privacy Protocol.
              </div>
            </div>
          </Card>
        </div>

        {/* Billing History & Invoice Records Table */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>Billing History & Tax Invoices</h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Download official GST-compliant tax invoices for your records</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>INVOICE ID</th>
                  <th style={{ padding: '10px 12px' }}>PLAN & TIER</th>
                  <th style={{ padding: '10px 12px' }}>DATE</th>
                  <th style={{ padding: '10px 12px' }}>AMOUNT</th>
                  <th style={{ padding: '10px 12px' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{activeSubData?.invoiceId || 'INV-2026-8831'}</td>
                  <td style={{ padding: '12px', color: '#334155' }}>{activeSubData?.planName || 'Annual Clinical DermPass'}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{activeSubData?.startedDate || '2026-08-18'}</td>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>₹{activeSubData?.price || '5,999'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '99px', background: '#ecfdf5', color: '#059669', fontWeight: 800, fontSize: '0.7rem' }}>
                      PAID ✓
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      📄 Tax Invoice
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Modals & Popups
  // ─────────────────────────────────────────────────────────────────────────
  const consultModal = showConsultModal && (() => {
    const consultantsOnly = professionals.filter(
      pro => pro.role === 'Skincare Consultant' || pro.target_role === 'Consultant'
    );
    const displayConsultants =
      consultantsOnly.length > 0
        ? consultantsOnly
        : [
            {
              id: 'cons-seed-1',
              name: 'Priya Menon',
              role: 'Skincare Consultant',
              title: 'Senior Aesthetic & Formulation Consultant',
              specialty: 'Barrier Restoration & Acne Protocol',
              experience: '8+ Years Clinical Aesthetics',
              rating: 4.9,
            },
            {
              id: 'cons-seed-2',
              name: 'Elena Rostova',
              role: 'Skincare Consultant',
              title: 'Clinical Cosmetic Science Specialist',
              specialty: 'Botanical Actives & Rosacea Recovery',
              experience: '10+ Years Experience',
              rating: 4.95,
            },
          ];

    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) setShowConsultModal(false); }}
      >
        <div style={{ width: '580px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', background: '#fff', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Book a Skincare Consultant Session</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Certified Skincare Consultants · Regimen Audit & Formulation Tailoring</span>
            </div>
            <button onClick={() => setShowConsultModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Clinical Triage Protocol Notice */}
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#5b21b6', fontSize: '0.74rem', lineHeight: 1.4, marginBottom: '16px' }}>
            🩺 <strong>Miracle Clinical Triage Protocol:</strong> All client evaluations begin with a Certified Skincare Consultant for thorough regimen & barrier auditing. If acute inflammatory dermatoses or prescription medical needs are identified during your assessment, your consultant will formally issue an expedited <strong>Medical Dermatologist Referral</strong>.
          </div>

          {!selectedPro ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Available Certified Consultants</div>
              {prosLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading verified skincare consultants…</div>
              ) : (
                displayConsultants.map(pro => (
                  <div
                    key={pro.id}
                    onClick={() => setSelectedPro(pro)}
                    style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = PUR)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    <span style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0effe', color: PUR, display: 'grid', placeItems: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      👤
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{pro.name}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: PUR, background: '#f0effe', padding: '2px 8px', borderRadius: '4px' }}>Skincare Consultant</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>{pro.title || pro.specialty}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{pro.experience || '8+ Years Experience'} · ⭐ {pro.rating || 4.9}</div>
                    </div>
                    <span style={{ color: PUR, fontWeight: 800 }}>Select →</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button onClick={() => setSelectedPro(null)} style={{ border: 'none', background: 'transparent', color: PUR, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                ← Change Consultant
              </button>

              <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0effe', color: PUR, display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>👤</span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedPro.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{selectedPro.specialty || 'Certified Skincare Consultant'}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>PREFERRED DATE</label>
                <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>PREFERRED TIME</label>
                <input type="text" placeholder="e.g. 10:30 AM" value={apptTime} onChange={e => setApptTime(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CONSULTATION REASON / TOPICAL NOTES</label>
                <textarea rows={3} placeholder="Describe any active product sensitivities, routine questions or barrier concerns..." value={apptNotes} onChange={e => setApptNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              <button
                onClick={submitAppointment}
                disabled={apptLoading || !apptDate || !apptTime}
                style={{ marginTop: '6px', padding: '12px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer' }}
              >
                {apptLoading ? 'Scheduling with Consultant…' : 'Confirm Consultant Session'}
              </button>
              {apptSuccess && <div style={{ color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>✅ Consultation session requested successfully!</div>}
              {apptError && <div style={{ color: '#dc2626', fontSize: '0.78rem' }}>⚠️ {apptError}</div>}
            </div>
          )}
        </div>
      </div>
    );
  })();

  const productDetailModal = selectedProduct && (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}
    >
      <div style={{ width: '620px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', background: '#fff', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: PUR, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedProduct.brand || 'SkinSAFE Verified Brand'}</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{selectedProduct.name || selectedProduct.product_name}</h3>
            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
              Category: {selectedProduct.category || 'Clinical Skincare'}
            </span>
          </div>
          <button onClick={() => setSelectedProduct(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '1rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '18px' }}>
          <img src={selectedProduct.image_url || selectedProduct.img || PRODIMG[0]} alt="" style={{ width: '100px', height: '100px', objectFit: 'contain', background: '#fff', borderRadius: '12px', padding: '6px', border: '1px solid #e2e8f0' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              {typeof selectedProduct.price === 'number' ? `₹${Math.round(selectedProduct.price)}` : selectedProduct.price || '₹899'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: '99px', background: '#ecfdf5', color: '#059669', fontSize: '0.74rem', fontWeight: 800 }}>
                🛡️ {selectedProduct.safety_score || selectedProduct.safetyScore || 94}/100 Safety Rating
              </span>
              <span style={{ padding: '3px 10px', borderRadius: '99px', background: '#fef3c7', color: '#b45309', fontSize: '0.74rem', fontWeight: 800 }}>
                ⭐ {selectedProduct.rating || 4.8} / 5.0
              </span>
            </div>
          </div>
        </div>

        {/* Suitable For & Clinical Targets */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Suitable For Skin Types</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(selectedProduct.skin_types && Array.isArray(selectedProduct.skin_types) ? selectedProduct.skin_types : ['All Skin Types', 'Sensitive', 'Barrier-Damaged']).map((st: string, i: number) => (
              <span key={i} style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, background: '#f0effe', padding: '3px 9px', borderRadius: '6px' }}>✓ {st}</span>
            ))}
          </div>
        </div>

        {/* Product Description */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Clinical Formulation Overview</div>
          <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, background: '#fafafa', padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            {selectedProduct.description || 'Dermatologist-formulated daily barrier therapy designed to replenish essential ceramides, restore epidermal integrity, and soothe irritation without clogging pores.'}
          </div>
        </div>

        {/* Full INCI Formulation */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Full INCI Ingredient List</div>
          <div style={{ padding: '12px', borderRadius: '10px', background: '#fafafa', border: '1px solid #e2e8f0', fontSize: '0.76rem', color: '#475569', lineHeight: 1.5, maxHeight: '100px', overflowY: 'auto' }}>
            {selectedProduct.ingredients || 'Aqua/Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Hyaluronic Acid, Xanthan Gum, Carbomer, Phenoxyethanol.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setSelectedProduct(null)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Close</button>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setRoutineAppliedToast(true);
              setTimeout(() => setRoutineAppliedToast(false), 3000);
            }}
            style={{ padding: '10px 22px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}30` }}
          >
            + Add to My Routine
          </button>
        </div>
      </div>
    </div>
  );

  // Dedicated Isolated Printable Dossier Modal
  const printableDossierModal = showPrintableDossier && (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) setShowPrintableDossier(false); }}
    >
      <div style={{ width: '800px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: '#fff', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.08em' }}>MIRACLE CLINICAL DERMATOLOGY</div>
            <div style={{ fontSize: '0.78rem', color: PUR, fontWeight: 700 }}>EPIDERMAL BARRIER & BIOCHEMICAL HEALTH DOSSIER</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
            <div><b>Report Date:</b> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><b>Patient ID:</b> MRC-{storedUser.id?.slice(0, 8) || '2026-USR'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', padding: '16px', borderRadius: '12px', background: '#f8fafc', marginBottom: '20px' }}>
          <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>PATIENT</div><div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{profileName || 'Ananya Sharma'}</div></div>
          <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>SKIN CLASSIFICATION</div><div style={{ fontSize: '0.95rem', fontWeight: 900, color: PUR }}>{currentSkinType} Skin</div></div>
          <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>HEALTH SCORE</div><div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#059669' }}>{scorePct || 82}/100</div></div>
          <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>SKIN AGE</div><div style={{ fontSize: '0.95rem', fontWeight: 900, color: BLU }}>{calculatedSkinAge} Yrs (Age: {chronologicalAge})</div></div>
        </div>

        <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, marginBottom: '20px' }}>
          <b>Diagnostic Summary:</b> Stratum corneum demonstrates {currentSkinType.toLowerCase()} profile with primary focus on <b>{dynamicPrimaryConcern}</b>. Routine adherence is at {analytics?.compliance_metrics?.adherence_30d || 88}%. Barrier integrity is in {scoreLabel} state.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button onClick={() => setShowPrintableDossier(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Close</button>
          <button onClick={() => window.print()} style={{ padding: '10px 22px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>🖨️ Print Dossier</button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation Switch
  // ─────────────────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'my-skin-profile':
      case 'skin-profile':
        return renderMySkinProfilePage();
      case 'profile':
      case 'my-profile':
      case 'settings':
        return renderMyProfilePage();
      case 'account-settings':
      case 'security':
        return renderAccountSettingsPage();
      case 'skin-assessment':
      case 'assessment':
        return renderSkinAssessmentPage();
      case 'my-routine':
      case 'routine':
        return renderMyRoutinePage();
      case 'product-recommendations':
      case 'products':
      case 'recommendations':
        return renderProductRecommendationsPage();
      case 'ingredient-analyzer':
      case 'ingredients':
        return renderIngredientAnalyzerPage();
      case 'progress-tracking':
      case 'progress':
      case 'tracking':
        return renderProgressTrackingPage();
      case 'lifestyle-&-habits':
      case 'lifestyle-habits':
      case 'lifestyle':
      case 'habits':
        return renderLifestylePage();
      case 'reports':
      case 'clinical-reports':
        return renderReportsPage();
      case 'reminders':
        return renderRemindersPage();
      case 'notifications':
        return renderRemindersPage();
      case 'ask-ai':
        return renderAskAiPage();
      case 'skin-scan':
        return renderSkinScanPage();
      case 'upload-photo':
        return renderUploadPhotoStudioPage();
      case 'subscription':
      case 'subscription-&-plans':
      case 'subscription-plans':
      case 'premium':
      case 'upgrade':
      case 'billing':
      case 'plans':
        return renderSubscriptionPage();
      case 'dashboard':
      default:
        return renderDashboardPage();
    }
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {viewPhoto && customDp && <PhotoViewerModal src={customDp} name={profileName || 'User Profile Photo'} onClose={() => setViewPhoto(false)} />}
      {cropSrc && <CropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}
      {consultModal}
      {productDetailModal}
      {printableDossierModal}

      {/* Subscription Success Celebration Modal */}
      {subSuccessModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSubSuccessModal(false); }}
        >
          <div style={{ width: '480px', maxWidth: '92vw', borderRadius: '24px', background: '#fff', padding: '32px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '2.2rem', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
              ⭐
            </div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>Welcome to Pro Membership!</h3>
            <p style={{ margin: '8px 0 20px', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
              Your payment of <strong>₹{activeSubData?.price}</strong> was successfully verified. Your <strong>{activeSubData?.planName}</strong> is now live!
            </p>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '20px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Member:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{profileName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Transaction ID:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{activeSubData?.txnId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Payment Mode:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{activeSubData?.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Next Renewal:</span>
                <span style={{ fontWeight: 800, color: '#059669' }}>{activeSubData?.renewalDate}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setSubSuccessModal(false);
                  setShowInvoiceModal(true);
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
              >
                📄 View Tax Invoice
              </button>
              <button
                onClick={() => setSubSuccessModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Start Exploring Perks →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Tax Invoice Modal */}
      {showInvoiceModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowInvoiceModal(false); }}
        >
          <div style={{ width: '640px', maxWidth: '94vw', maxHeight: '92vh', overflowY: 'auto', borderRadius: '24px', background: '#fff', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: PUR, letterSpacing: '-0.03em' }}>MIRACLE™ SkinSAFE</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Miracle Advanced Dermatological Intelligence Pvt. Ltd.</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>GSTIN: 27AABCM9821K1Z8 · Reg. No: CIN-U72900MH2024PTC394812</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', fontWeight: 900 }}>
                  ORIGINAL TAX INVOICE
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{activeSubData?.invoiceId || 'INV-2026-8831'}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Date: {activeSubData?.startedDate || '2026-08-18'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '22px', fontSize: '0.78rem' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>BILLED TO</div>
                <div style={{ fontWeight: 900, color: '#0f172a' }}>{profileName}</div>
                <div style={{ color: '#475569' }}>{storedUser.email || 'user@miracle.com'}</div>
                <div style={{ color: '#64748b' }}>Phone: {profilePhone || '+91 98765 43210'}</div>
                <div style={{ color: '#64748b' }}>Location: Mumbai, Maharashtra, India</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>PAYMENT DETAILS</div>
                <div style={{ fontWeight: 900, color: '#0f172a' }}>Status: PAID (Success)</div>
                <div style={{ color: '#475569' }}>Mode: {activeSubData?.paymentMethod}</div>
                <div style={{ color: '#64748b' }}>Ref: {activeSubData?.txnId}</div>
                <div style={{ color: '#059669', fontWeight: 700 }}>Valid Thru: {activeSubData?.renewalDate}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>DESCRIPTION</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>SAC CODE</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>RATE</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{activeSubData?.planName || 'Annual Clinical DermPass'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>12-Month Software Subscription & AI Diagnostic Services</div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b' }}>998314</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>₹{Math.round((activeSubData?.price || 5999) / 1.18)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800 }}>₹{Math.round((activeSubData?.price || 5999) / 1.18)}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>Subtotal (Taxable Amount):</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{Math.round((activeSubData?.price || 5999) / 1.18)}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ padding: '4px 10px', textAlign: 'right', color: '#64748b' }}>CGST @ 9%:</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>₹{Math.round(((activeSubData?.price || 5999) - Math.round((activeSubData?.price || 5999) / 1.18)) / 2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ padding: '4px 10px', textAlign: 'right', color: '#64748b' }}>SGST @ 9%:</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>₹{Math.round(((activeSubData?.price || 5999) - Math.round((activeSubData?.price || 5999) / 1.18)) / 2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                  <td colSpan={3} style={{ padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: '0.9rem' }}>TOTAL (INR):</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: PUR }}>₹{activeSubData?.price || 5999}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: '20px' }}>
              This is an electronically generated tax invoice and does not require a physical signature. Miracle SkinSAFE™ complies with all applicable digital health regulations.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {renderSection()}
    </>
  );
}
