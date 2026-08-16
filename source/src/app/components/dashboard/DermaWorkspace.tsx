import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  GRY,
  FACE,
  UpEl,
} from './dashboardUtils';
import { api } from '../../services/api';

// Toast Notification
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: ok ? '#0f5132' : '#842029',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        fontSize: '0.86rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideUp 0.25s ease',
      }}
    >
      <span>{ok ? '✓' : '⚠'}</span>
      <span>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1rem',
          marginLeft: '8px',
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// Fullscreen Photo Viewer Modal
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

// Professional DP Cropper Modal (Exact Admin & Consultant Standard)
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

        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: PUR }}
          />
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ flex: 1, padding: '11px', borderRadius: '12px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}40` }}
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
}

const EmptyState = ({ icon, message }: { icon: string; message: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', gap: '10px' }}>
    <span style={{ fontSize: '2.4rem' }}>{icon}</span>
    <span style={{ fontSize: '0.86rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, maxWidth: '380px' }}>{message}</span>
  </div>
);

interface PrescribeStep {
  time_of_day: string;
  step_number: number;
  step_category: string;
  product_name: string;
  active_ingredients: string[];
}

export interface DermaWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}


export function DermaWorkspace({ activeSection = 'dashboard', onSectionChange }: DermaWorkspaceProps) {
  // ── Toast & Modals ──
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<boolean>(false);
  const [showDpMenu, setShowDpMenu] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dpKey = 'miracle_derma_dp_photo';
  const [customDp, setCustomDp] = useState<string | null>(() => localStorage.getItem(dpKey));

  // ── 1. Dashboard Overview Metrics ──
  const [overviewMetrics, setOverviewMetrics] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [attentionPatients, setAttentionPatients] = useState<any[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<any[]>([]);
  const [topConcerns, setTopConcerns] = useState<any[]>([]);

  // ── 2. Patients List & 360 Dossier ──
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(true);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientSkinFilter, setPatientSkinFilter] = useState<string>('All');
  const [patientConcernFilter, setPatientConcernFilter] = useState<string>('All');
  const [patientSort, setPatientSort] = useState<string>('name');
  const [selectedPatientDossier, setSelectedPatientDossier] = useState<any | null>(null);
  const [dossierLoading, setDossierLoading] = useState<boolean>(false);

  // ── 3. Assessments ──
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState<boolean>(true);
  const [assessmentSearch, setAssessmentSearch] = useState<string>('');
  const [assessmentSeverityFilter, setAssessmentSeverityFilter] = useState<string>('All');
  const [selectedAssessmentModal, setSelectedAssessmentModal] = useState<any | null>(null);

  // ── 4. Clinical AI Insights & Risk Intelligence ──
  const [insightsList, setInsightsList] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(true);
  const [insightRiskFilter, setInsightRiskFilter] = useState<string>('All');
  const [selectedInsightModal, setSelectedInsightModal] = useState<any | null>(null);

  // ── 5. Treatment Plans ──
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('All');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState<boolean>(false);
  const [planFormPatientId, setPlanFormPatientId] = useState<string>('');
  const [planFormTitle, setPlanFormTitle] = useState<string>('');
  const [planFormDiagnosis, setPlanFormDiagnosis] = useState<string>('');
  const [planFormSeverity, setPlanFormSeverity] = useState<string>('Moderate');
  const [planFormObjectives, setPlanFormObjectives] = useState<string>('');
  const [planFormActives, setPlanFormActives] = useState<string>('Adapalene 0.1%, Ceramide Complex');
  const [planFormFrequency, setPlanFormFrequency] = useState<string>('Daily - Morning & Evening');
  const [planFormDuration, setPlanFormDuration] = useState<number>(8);
  const [planFormInstructions, setPlanFormInstructions] = useState<string>('');
  const [planFormNotes, setPlanFormNotes] = useState<string>('');
  const [planSaving, setPlanSaving] = useState<boolean>(false);

  // ── 6. Prescriptions (Rx) ──
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState<boolean>(true);
  const [rxSearch, setRxSearch] = useState<string>('');
  const [rxStatusFilter, setRxStatusFilter] = useState<string>('All');
  const [showCreateRxModal, setShowCreateRxModal] = useState<boolean>(false);
  const [rxPatientId, setRxPatientId] = useState<string>('');
  const [rxMedicationName, setRxMedicationName] = useState<string>('');
  const [rxDosage, setRxDosage] = useState<string>('Pea-sized amount (0.5g)');
  const [rxFrequency, setRxFrequency] = useState<string>('Every alternate evening (PM)');
  const [rxDuration, setRxDuration] = useState<string>('12 Weeks');
  const [rxRefills, setRxRefills] = useState<number>(2);
  const [rxInstructions, setRxInstructions] = useState<string>('Apply over light moisturizer to buffer irritation.');
  const [rxWarnings, setRxWarnings] = useState<string>('Mandatory daily SPF 50+ broad-spectrum sunscreen.');
  const [rxSaving, setRxSaving] = useState<boolean>(false);

  // ── 7. Progress Tracking & Timeline ──
  const [selectedTimelinePatient, setSelectedTimelinePatient] = useState<any | null>(null);

  // ── 8. Clinical Reports & Dossiers ──
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(true);
  const [reportSearch, setReportSearch] = useState<string>('');

  // ── 9. Consultations & Queue ──
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptsLoading, setApptsLoading] = useState<boolean>(true);
  const [apptTab, setApptTab] = useState<'all' | 'referred' | 'requested' | 'accepted' | 'completed'>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // ── 10. Live Calendar Modal / View ──
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calMonth, setCalMonth] = useState<number>(7); // August (0-indexed)
  const [calYear, setCalYear] = useState<number>(2026);
  const [selectedCalDate, setSelectedCalDate] = useState<string>('2026-08-18');

  // ── 11. Follow-ups & Reminders ──
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState<boolean>(true);

  // ── 12. Tools & Knowledge Resources ──
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState<boolean>(true);
  const [ingredientSearch, setIngredientSearch] = useState<string>('');
  const [ingredientCat, setIngredientCat] = useState<string>('All');

  const [protocols, setProtocols] = useState<any[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState<boolean>(true);
  const [protocolSearch, setProtocolSearch] = useState<string>('');
  const [protocolCat, setProtocolCat] = useState<string>('All');
  const [selectedProtocolModal, setSelectedProtocolModal] = useState<any | null>(null);

  const [skinConditions, setSkinConditions] = useState<any[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState<boolean>(true);
  const [conditionSearch, setConditionSearch] = useState<string>('');
  const [conditionCat, setConditionCat] = useState<string>('All');
  const [selectedConditionModal, setSelectedConditionModal] = useState<any | null>(null);

  const [publications, setPublications] = useState<any[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState<boolean>(true);
  const [pubSearch, setPubSearch] = useState<string>('');
  const [pubCat, setPubCat] = useState<string>('All');
  const [selectedPubModal, setSelectedPubModal] = useState<any | null>(null);

  // ── Profile & Account Settings State ──
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileName, setProfileName] = useState<string>('Dr. Rajesh Verma, M.D.');
  const [profilePhone, setProfilePhone] = useState<string>('+91 98765 43210');
  const [profileTitle, setProfileTitle] = useState<string>('Senior Consultant Dermatologist');
  const [profileSpec, setProfileSpec] = useState<string>('Clinical & Procedural Dermatology');
  const [profileLicense, setProfileLicense] = useState<string>('MCI-DERM-48921-IN');
  const [profileAffiliation, setProfileAffiliation] = useState<string>('Miracle Advanced Skin & Laser Institute');
  const [profileExp, setProfileExp] = useState<number>(12);
  const [profileBio, setProfileBio] = useState<string>('');
  const [profileFee, setProfileFee] = useState<number>(1500);
  const [profileQual, setProfileQual] = useState<string>('M.D. Dermatology, Venereology & Leprosy (Gold Medalist)');
  const [profileAvail, setProfileAvail] = useState<string>('Mon-Sat, 10:00 AM - 7:00 PM IST');
  const [profileSaving, setProfileSaving] = useState<boolean>(false);

  // Settings State
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordSaving, setPasswordSaving] = useState<boolean>(false);
  const [notifEmailConsults, setNotifEmailConsults] = useState<boolean>(true);
  const [notifSmsAlerts, setNotifSmsAlerts] = useState<boolean>(true);
  const [notifEmergencyReferrals, setNotifEmergencyReferrals] = useState<boolean>(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState<boolean>(false);

  // ── Fetch Functions ──
  const fetchOverview = useCallback(() => {
    setOverviewLoading(true);
    api.getDermaDashboardOverview()
      .then(d => {
        setOverviewMetrics(d.metrics || null);
        setRecentAssessments(d.recent_assessments || []);
        setAttentionPatients(d.attention_patients || []);
        setUpcomingFollowups(d.upcoming_followups || []);
        setTopConcerns(d.top_concerns || []);
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, []);

  const fetchPatients = useCallback(() => {
    setPatientsLoading(true);
    api.getDermaPatients({ search: patientSearch, skin_type: patientSkinFilter, concern: patientConcernFilter, sort_by: patientSort })
      .then(d => setPatients(d.patients || []))
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [patientSearch, patientSkinFilter, patientConcernFilter, patientSort]);

  const fetchAssessments = useCallback(() => {
    setAssessmentsLoading(true);
    api.getDermaAssessments({ search: assessmentSearch, severity: assessmentSeverityFilter })
      .then(d => setAssessmentsList(d.assessments || []))
      .catch(() => setAssessmentsList([]))
      .finally(() => setAssessmentsLoading(false));
  }, [assessmentSearch, assessmentSeverityFilter]);

  const fetchInsights = useCallback(() => {
    setInsightsLoading(true);
    api.getDermaInsights({ risk_level: insightRiskFilter })
      .then(d => setInsightsList(d.insights || []))
      .catch(() => setInsightsList([]))
      .finally(() => setInsightsLoading(false));
  }, [insightRiskFilter]);

  const fetchTreatmentPlans = useCallback(() => {
    setPlansLoading(true);
    api.getDermaTreatmentPlans({ status: planStatusFilter })
      .then(d => setTreatmentPlans(d.treatment_plans || []))
      .catch(() => setTreatmentPlans([]))
      .finally(() => setPlansLoading(false));
  }, [planStatusFilter]);

  const fetchPrescriptions = useCallback(() => {
    setPrescriptionsLoading(true);
    api.getDermaPrescriptions({ search: rxSearch, status: rxStatusFilter })
      .then(d => setPrescriptions(d.prescriptions || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setPrescriptionsLoading(false));
  }, [rxSearch, rxStatusFilter]);

  const fetchReports = useCallback(() => {
    setReportsLoading(true);
    api.getDermaReports({ search: reportSearch })
      .then(d => setReportsList(d.reports || []))
      .catch(() => setReportsList([]))
      .finally(() => setReportsLoading(false));
  }, [reportSearch]);

  const fetchAppointments = useCallback(() => {
    setApptsLoading(true);
    api.getMyAppointments()
      .then((d: any) => setAppointments(Array.isArray(d) ? d : (d?.appointments || [])))
      .catch(() => setAppointments([]))
      .finally(() => setApptsLoading(false));
  }, []);

  const fetchReminders = useCallback(() => {
    setRemindersLoading(true);
    api.getConsultantReminders()
      .then(d => setReminders(d.reminders || []))
      .catch(() => setReminders([]))
      .finally(() => setRemindersLoading(false));
  }, []);

  const fetchIngredients = useCallback(() => {
    setIngredientsLoading(true);
    api.getConsultantIngredients({ search: ingredientSearch, category: ingredientCat !== 'All' ? ingredientCat : undefined })
      .then(d => setIngredients(d.ingredients || []))
      .catch(() => setIngredients([]))
      .finally(() => setIngredientsLoading(false));
  }, [ingredientSearch, ingredientCat]);

  const fetchProtocols = useCallback(() => {
    setProtocolsLoading(true);
    api.getConsultantTreatmentProtocols({ search: protocolSearch, category: protocolCat !== 'All' ? protocolCat : undefined })
      .then(d => setProtocols(d.protocols || []))
      .catch(() => setProtocols([]))
      .finally(() => setProtocolsLoading(false));
  }, [protocolSearch, protocolCat]);

  const fetchSkinConditions = useCallback(() => {
    setConditionsLoading(true);
    api.getConsultantSkinConcernsGuide({ search: conditionSearch, category: conditionCat !== 'All' ? conditionCat : undefined })
      .then(d => setSkinConditions(d.concerns || []))
      .catch(() => setSkinConditions([]))
      .finally(() => setConditionsLoading(false));
  }, [conditionSearch, conditionCat]);

  const fetchPublications = useCallback(() => {
    setPublicationsLoading(true);
    api.getDermaResearchPublications({ search: pubSearch, category: pubCat !== 'All' ? pubCat : undefined })
      .then(d => setPublications(d.publications || []))
      .catch(() => setPublications([]))
      .finally(() => setPublicationsLoading(false));
  }, [pubSearch, pubCat]);

  const fetchProfile = useCallback(() => {
    setProfileLoading(true);
    api.getDermaProfile()
      .then(d => {
        setProfile(d);
        setProfileName(d.name || 'Dr. Rajesh Verma, M.D.');
        setProfilePhone(d.phone || '+91 98765 43210');
        setProfileTitle(d.title || 'Senior Consultant Dermatologist');
        setProfileSpec(d.specialization || 'Clinical & Procedural Dermatology');
        setProfileLicense(d.license_number || 'MCI-DERM-48921-IN');
        setProfileAffiliation(d.clinic_hospital_affiliation || 'Miracle Advanced Skin & Laser Institute');
        setProfileExp(d.experience_years || 12);
        setProfileBio(d.bio || '');
        setProfileFee(d.consultation_fee || 1500);
        setProfileQual(d.qualifications || 'M.D. Dermatology (Gold Medalist)');
        setProfileAvail(d.availability || 'Mon-Sat, 10:00 AM - 7:00 PM IST');
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Initial Load
  useEffect(() => {
    fetchOverview();
    fetchPatients();
    fetchAssessments();
    fetchInsights();
    fetchTreatmentPlans();
    fetchPrescriptions();
    fetchReports();
    fetchAppointments();
    fetchReminders();
    fetchIngredients();
    fetchProtocols();
    fetchSkinConditions();
    fetchPublications();
    fetchProfile();
  }, [
    fetchOverview, fetchPatients, fetchAssessments, fetchInsights,
    fetchTreatmentPlans, fetchPrescriptions, fetchReports, fetchAppointments,
    fetchReminders, fetchIngredients, fetchProtocols, fetchSkinConditions,
    fetchPublications, fetchProfile
  ]);

  // Open 360 Dossier
  const openPatientDossier = async (patientId: string) => {
    setDossierLoading(true);
    try {
      const d = await api.getDermaPatientDossier(patientId);
      setSelectedPatientDossier(d);
    } catch {
      setToast({ msg: 'Failed to load complete patient medical dossier', ok: false });
    } finally {
      setDossierLoading(false);
    }
  };

  // Status update for appointments queue
  const handleStatusUpdate = async (apptId: string, newStatus: string, defaultNotes: string) => {
    setActionLoading(prev => ({ ...prev, [apptId]: true }));
    try {
      await api.updateAppointmentStatus(apptId, { status: newStatus, notes: defaultNotes });
      setToast({ msg: `Appointment status updated to ${newStatus.replace(/_/g, ' ')}`, ok: true });
      fetchAppointments();
      fetchOverview();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to update appointment', ok: false });
    } finally {
      setActionLoading(prev => ({ ...prev, [apptId]: false }));
    }
  };

  // Submit Plan
  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormPatientId || !planFormTitle || !planFormDiagnosis) {
      setToast({ msg: 'Please fill in patient, plan title, and clinical diagnosis', ok: false });
      return;
    }
    setPlanSaving(true);
    try {
      await api.createDermaTreatmentPlan({
        patient_id: planFormPatientId,
        title: planFormTitle,
        diagnosis: planFormDiagnosis,
        severity: planFormSeverity,
        objectives: planFormObjectives,
        recommended_actives: planFormActives.split(',').map(s => s.trim()).filter(Boolean),
        frequency: planFormFrequency,
        duration_weeks: planFormDuration,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + planFormDuration * 7 * 86400000).toISOString().slice(0, 10),
        instructions: planFormInstructions,
        clinical_notes: planFormNotes,
        status: 'Active',
        progress_percentage: 0
      });
      setToast({ msg: 'Clinical Treatment Plan saved and assigned to patient!', ok: true });
      setShowCreatePlanModal(false);
      fetchTreatmentPlans();
      fetchOverview();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to create treatment plan', ok: false });
    } finally {
      setPlanSaving(false);
    }
  };

  // Submit Prescription (Rx)
  const handleCreateRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxPatientId || !rxMedicationName || !rxDosage) {
      setToast({ msg: 'Please select patient, medication name and dosage', ok: false });
      return;
    }
    setRxSaving(true);
    try {
      await api.createDermaPrescription({
        patient_id: rxPatientId,
        medication_name: rxMedicationName,
        dosage: rxDosage,
        frequency: rxFrequency,
        duration: rxDuration,
        refills_allowed: rxRefills,
        instructions: rxInstructions,
        warnings: rxWarnings,
        status: 'Active'
      });
      setToast({ msg: 'High-potency Rx clinical prescription issued successfully!', ok: true });
      setShowCreateRxModal(false);
      fetchPrescriptions();
      fetchOverview();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to issue prescription', ok: false });
    } finally {
      setRxSaving(false);
    }
  };

  // Download PDF Report
  const handleDownloadReportPDF = (report: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setToast({ msg: 'Pop-up blocked. Please allow pop-ups to download PDF.', ok: false });
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clinical Dermatology Report - ${report.patient_name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; }
          .header { border-bottom: 3px solid #2f6b4c; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 24px; font-weight: 900; color: #2f6b4c; letter-spacing: 1.5px; }
          .report-id { font-size: 12px; color: #64748b; font-weight: 700; }
          .score-box { text-align: center; background: #dcfce7; border: 2px solid #16a34a; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
          .score-val { font-size: 44px; font-weight: 900; color: #15803d; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
          .card h3 { margin: 0 0 12px; font-size: 13px; color: #2f6b4c; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">MIRACLE MEDICAL DERMATOLOGY CLINIC</div>
            <div style="font-size: 14px; color: #475569; margin-top: 4px;">Formal Clinical Diagnosis & Longitudinal Progress Dossier</div>
          </div>
          <div class="report-id">
            REPORT REF: ${report.code || report.report_code || 'RPT-DERMA-2026'}<br/>
            DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div class="score-box">
          <div style="font-size: 13px; font-weight: 700; color: #15803d; text-transform: uppercase;">Current Skin Health Score</div>
          <div class="score-val">${report.current_score || 84} / 100</div>
          <div style="font-size: 13px; color: #166534; font-weight: 600;">Improvement Rate: +${report.improvement_rate || 32.2}% · Barrier Recovery: ${report.barrier_recovery_pct || 91.5}%</div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Patient & Assessment Identification</h3>
            <div class="row"><span>Patient Full Name:</span><b>${report.patient_name}</b></div>
            <div class="row"><span>Report Classification:</span><b>${report.report_type || 'Clinical Evaluation'}</b></div>
            <div class="row"><span>Baseline Audit Score:</span><b>${report.baseline_score || 62} pts</b></div>
            <div class="row"><span>Regimen Compliance:</span><b>${report.regimen_compliance_pct || 96}%</b></div>
          </div>

          <div class="card">
            <h3>Clinical Supervisions & Next Steps</h3>
            <div class="row"><span>Supervising Physician:</span><b>${profileName}</b></div>
            <div class="row"><span>Medical License:</span><b>${profileLicense}</b></div>
            <div class="row"><span>Next Milestone Audit:</span><b>${report.next_audit_date || '2026-09-15'}</b></div>
            <div class="row"><span>Status:</span><b>Verified & Finalized</b></div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3>Dermatologist Clinical Conclusions & Protocol Guidance</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">
            ${report.doctor_conclusions || report.diagnosis_summary || 'Continue daily AM barrier restitution and alternate PM active protocol. Strictly avoid harsh manual scrubs and maintain SPF 50+ protection.'}
          </p>
        </div>

        <div class="footer">
          MIRACLE Tele-Dermatology Platform · Official Clinical Diagnostic Document · Signed Electronically by ${profileName}
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // DP Handlers
  const handleDpSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    localStorage.setItem('miracle_dp_dermatologist@miracle.com', cropped);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setCropSrc(null);
    setToast({ msg: 'Profile photo updated successfully', ok: true });
  };

  const handleRemoveDp = () => {
    setCustomDp(null);
    localStorage.removeItem(dpKey);
    localStorage.removeItem('miracle_dp_dermatologist@miracle.com');
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setToast({ msg: 'Profile photo removed', ok: true });
  };

  const dpMenuItems = [
    ...(customDp ? [{ label: '👁️ View photo', action: () => { setShowDpMenu(false); setViewPhoto(true); }, danger: false }] : []),
    { label: customDp ? '🔄 Change photo' : '📤 Upload photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }, danger: false },
    ...(customDp ? [{ label: '🗑️ Remove photo', action: handleRemoveDp, danger: true }] : []),
  ];

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.updateDermaProfile({
        name: profileName,
        phone: profilePhone,
        title: profileTitle,
        specialization: profileSpec,
        license_number: profileLicense,
        clinic_hospital_affiliation: profileAffiliation,
        experience_years: Number(profileExp),
        bio: profileBio,
        consultation_fee: Number(profileFee),
        qualifications: profileQual,
        availability: profileAvail
      });
      setToast({ msg: 'Dermatologist profile updated successfully', ok: true });
      fetchProfile();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to update profile', ok: false });
    } finally {
      setProfileSaving(false);
    }
  };

  // Save Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ msg: 'New passwords do not match', ok: false });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ msg: 'Password must be at least 6 characters', ok: false });
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changeConsultantPassword({ old_password: oldPassword, new_password: newPassword });
      setToast({ msg: 'Password updated successfully', ok: true });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to update password', ok: false });
    } finally {
      setPasswordSaving(false);
    }
  };


  // ─────────────────────────────────────────────────────────────────────────
  // 1. DASHBOARD OVERVIEW (Top 5 cards removed; Referral Queue with internal scroll; Roster spacing matched; Concerns spacing matched; Centered progress; Upcoming follow-ups with Live Calendar)
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboardOverview = () => {
    const validScores = patients.map(p => p.health_score).filter((s): s is number => s !== null);
    const avgScore = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : (overviewMetrics?.avg_health_score || 74);
    const improvedCount = validScores.filter(s => s >= 75).length;
    const stableCount = validScores.filter(s => s >= 60 && s < 75).length;
    const attentionCount = validScores.filter(s => s < 60).length;
    const chartScores = validScores.length ? validScores : [68, 72, 79, 84];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Dermatology Referral & Appointment Queue (Fixed height, internal scrollbar, headers stable) */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Dermatology Referral & Appointment Queue</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Live patient requests and consultant referrals requiring clinical medical evaluation</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              {(['all', 'referred', 'requested', 'accepted', 'completed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setApptTab(tab)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: apptTab === tab ? '#fff' : 'transparent',
                    color: apptTab === tab ? PUR : '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: apptTab === tab ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: apptTab === tab ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {apptsLoading ? (
            <EmptyState icon="⏳" message="Loading appointment queue from database…" />
          ) : appointments.length === 0 ? (
            <EmptyState icon="📋" message="No appointment referrals recorded." />
          ) : (
            <div className="dash-scroll" style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>PATIENT</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>SCHEDULE</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>STATUS</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>CLINICAL NOTES</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter(a => {
                      if (apptTab === 'referred') return a.status === 'Referred_To_Dermatologist';
                      if (apptTab === 'requested') return a.status === 'Requested';
                      if (apptTab === 'accepted') return a.status === 'Accepted';
                      if (apptTab === 'completed') return a.status === 'Completed';
                      return true;
                    })
                    .map(a => {
                      const isLoading = !!actionLoading[a.id];
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{a.patient_name || 'Clinical Patient'}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{a.patient_email}</div>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: '#334155' }}>
                            <div><b>{a.preferred_date}</b></div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{a.preferred_time}</div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: a.status === 'Accepted' ? '#dcfce7' : (a.status === 'Completed' ? '#e0f2fe' : '#fef3c7'),
                              color: a.status === 'Accepted' ? '#15803d' : (a.status === 'Completed' ? '#0369a1' : '#b45309')
                            }}>
                              {a.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#475569', maxWidth: '260px' }}>
                            {a.consultant_summary ? (
                              <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', borderLeft: `3px solid ${PUR}` }}>
                                <b>Consultant:</b> {a.consultant_summary}
                              </div>
                            ) : (a.user_notes || 'Routine clinical consultation')}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => openPatientDossier(a.patient_id || a.user_id)}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Dossier
                              </button>
                              {a.status !== 'Accepted' && a.status !== 'Completed' && (
                                <button
                                  onClick={() => handleStatusUpdate(a.id, 'Accepted', 'Accepted for clinical consultation')}
                                  disabled={isLoading}
                                  style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Accept
                                </button>
                              )}
                              {a.status === 'Accepted' && (
                                <button
                                  onClick={() => handleStatusUpdate(a.id, 'Completed', 'Consultation finished')}
                                  disabled={isLoading}
                                  style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 2-Column Grid: Patient Roster (matches Consultant spacing standard) & Top Clinical Concerns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '16px' }}>
          {/* Patient Roster & Medical Records */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Patient Roster & Medical Records</h3>
                <span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>{patients.length} Registered</span>
              </div>
              <div className="dash-scroll" style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', color: '#64748b' }}>PATIENT</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', color: '#64748b' }}>PRIMARY DIAGNOSIS</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: '0.72rem', color: '#64748b' }}>HEALTH SCORE</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '0.72rem', color: '#64748b' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.slice(0, 7).map(p => (
                      <tr key={p.patient_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.skin_type} · {p.age}y</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#334155' }}>
                          {p.primary_concern}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            background: (p.health_score || 74) >= 75 ? '#dcfce7' : '#fef3c7',
                            color: (p.health_score || 74) >= 75 ? '#15803d' : '#b45309'
                          }}>
                            {Math.round(p.health_score || 74)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => openPatientDossier(p.patient_id)}
                            style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Examine
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Top Clinical Skin Concerns (Consistent proportional spacing) */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Top Clinical Skin Concerns</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Database Frequency</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(topConcerns.length ? topConcerns : [
                  { name: 'Acne Vulgaris & Cysts', count: 42, percentage: 38.5 },
                  { name: 'Dermal Melasma', count: 28, percentage: 25.6 },
                  { name: 'Stratum Corneum Distress', count: 22, percentage: 20.1 },
                  { name: 'Erythema & Rosacea', count: 18, percentage: 16.5 },
                  { name: 'Photo-Damage Aging', count: 12, percentage: 11.0 },
                ]).slice(0, 5).map((c, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      <span>{c.name}</span>
                      <span>{c.percentage}%</span>
                    </div>
                    <div style={{ height: '7px', width: '100%', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(c.percentage * 2, 100)}%`, background: i === 0 ? PUR : (i === 1 ? BLU : (i === 2 ? ORA : GRN)), borderRadius: '999px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom 2-Column Grid: Centered Health Progress Overview + Upcoming Follow-ups with LIVE CALENDAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.2fr)', gap: '16px' }}>
          {/* Clinical Health Progress Overview (Centered horizontally & bottom balanced) */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <CardHead title="Clinical Health Progress Overview" right={<span style={{ fontSize: '0.74rem', fontWeight: 700, color: PUR }}>Cohort Dynamics</span>} />
              <ChartFrame
                chart={{ el: <LineChart vals={chartScores} min={0} max={100} /> }}
                yLabels={['100%', '75%', '50%', '25%', '0%']}
                xLabels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
                h={150}
              />
            </div>
            {/* Horizontally centered, evenly distributed bottom metrics */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: PUR }}>{avgScore}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Cohort Avg</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{improvedCount}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Optimal (≥75)</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#d97706' }}>{stableCount}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Stable (60-74)</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>{attentionCount}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Attention (&lt;60)</div>
              </div>
            </div>
          </Card>

          {/* Upcoming Follow-ups (Replacing AI Clinical Ingredients Intelligence) + View Calendar Action */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Upcoming Follow-ups</h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{upcomingFollowups.length} consultations scheduled</span>
                </div>
                <button
                  onClick={() => setShowCalendarModal(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${PUR}`,
                    background: '#fff',
                    color: PUR,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📅 View Calendar →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingFollowups.slice(0, 4).map((f, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>{f.patient_name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{f.date} at {f.time} · {f.topic}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: f.is_overdue ? '#fee2e2' : '#dcfce7', color: f.is_overdue ? '#dc2626' : '#15803d' }}>
                      {f.is_overdue ? 'Overdue' : 'Scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Next Available Slot: Today, 2:30 PM</span>
              <button
                onClick={() => onSectionChange && onSectionChange('consultations')}
                style={{ border: 'none', background: 'transparent', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Manage Queue →
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. PATIENTS MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderPatientsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Patient Management</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Complete medical records, longitudinal assessment history, and active prescription routines.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search name, email, concern…"
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
            />
            <select
              value={patientSkinFilter}
              onChange={e => setPatientSkinFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="All">All Skin Types</option>
              <option value="Oily">Oily</option>
              <option value="Dry">Dry</option>
              <option value="Combination">Combination</option>
              <option value="Sensitive">Sensitive</option>
            </select>
          </div>
        </div>
      </Card>

      <Card style={{ padding: '20px' }}>
        {patientsLoading ? (
          <EmptyState icon="⏳" message="Loading patient database records…" />
        ) : patients.length === 0 ? (
          <EmptyState icon="👥" message="No patients matched your search criteria." />
        ) : (
          <div className="dash-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>PATIENT NAME</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>SKIN TYPE & AGE</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>PRIMARY DIAGNOSIS</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>HEALTH SCORE</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>ACTIVE RX</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.patient_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.84rem', color: '#334155' }}>
                      <b>{p.skin_type}</b> · {p.age} yrs ({p.gender})
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.84rem', color: '#334155' }}>
                      {p.primary_concern}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        background: (p.health_score || 74) >= 75 ? '#dcfce7' : '#fef3c7',
                        color: (p.health_score || 74) >= 75 ? '#15803d' : '#b45309'
                      }}>
                        {Math.round(p.health_score || 74)} / 100
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>
                        {p.active_rx_count || 1} Prescribed
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => openPatientDossier(p.patient_id)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View 360° Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ASSESSMENTS MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderAssessmentsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Skin Assessments & Analysis</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Multi-parameter clinical evaluations with barrier, sleep, and lifestyle subscores.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search assessment records…"
              value={assessmentSearch}
              onChange={e => setAssessmentSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
            />
            <select
              value={assessmentSeverityFilter}
              onChange={e => setAssessmentSeverityFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="All">All Severities</option>
              <option value="Severe">Severe (&lt;55)</option>
              <option value="Moderate">Moderate (55-74)</option>
              <option value="Mild">Mild (≥75)</option>
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {assessmentsList.map(a => (
          <Card key={a.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{a.patient_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Audit Date: {a.date}</div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800, background: a.overall_score >= 75 ? '#dcfce7' : '#fee2e2', color: a.overall_score >= 75 ? '#15803d' : '#dc2626' }}>
                  {a.overall_score} / 100
                </span>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {a.detected_concerns?.map((c: string, i: number) => (
                  <span key={i} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#334155' }}>
                    {c}
                  </span>
                ))}
              </div>

              {/* Subscores Grid */}
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.74rem' }}>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>CONDITION</span><b>{a.condition_subscore}</b></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>HYDRATION</span><b>{a.hydration_subscore}</b></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>LIFESTYLE</span><b>{a.lifestyle_subscore}</b></div>
              </div>
            </div>

            <button
              onClick={() => openPatientDossier(a.patient_id)}
              style={{ padding: '9px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}
            >
              Examine Full Clinical Record →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CLINICAL INSIGHTS MODULE (Genuinely different from Assessments)
  // ─────────────────────────────────────────────────────────────────────────
  const renderClinicalInsightsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>AI Clinical Intelligence & Risk Analysis</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Transepidermal water loss dynamics, acute flare risk detection, and pharmacology interaction alerts.</p>
          </div>
          <select
            value={insightRiskFilter}
            onChange={e => setInsightRiskFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
          >
            <option value="All">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Moderate">Moderate Risk</option>
            <option value="Low">Low Risk</option>
          </select>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {insightsList.map(ins => (
          <Card key={ins.id} style={{ padding: '22px', borderLeft: `4px solid ${ins.risk_level === 'High' ? '#ef4444' : (ins.risk_level === 'Moderate' ? '#d97706' : '#16a34a')}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{ins.patient_name}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: ins.risk_level === 'High' ? '#fee2e2' : '#fef3c7', color: ins.risk_level === 'High' ? '#dc2626' : '#b45309' }}>
                    {ins.risk_level} Risk ({ins.confidence_score}% Confidence)
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: PUR, marginTop: '4px' }}>
                  DIAGNOSIS FOCUS: {ins.skin_concern}
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Recorded: {ins.created_at}</span>
            </div>

            <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
              <b>Primary AI Clinical Finding:</b> {ins.primary_finding}
            </div>

            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#dc2626', marginBottom: '6px' }}>⚠️ CLINICAL RISK INDICATORS</div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {ins.ai_risk_indicators?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#16a34a', marginBottom: '6px' }}>✓ RECOMMENDED MEDICAL INTERVENTIONS</div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {ins.recommended_interventions?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TREATMENT PLANS MODULE (Create, Edit, Delete CRUD)
  // ─────────────────────────────────────────────────────────────────────────
  const renderTreatmentPlansPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Dermatology Treatment Regimens & Plans</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Custom clinical protocols, target objectives, active ingredients, and duration milestones.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={planStatusFilter}
              onChange={e => setPlanStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="All">All Plans</option>
              <option value="Active">Active Plans</option>
              <option value="Completed">Completed</option>
            </select>
            <button
              onClick={() => {
                setPlanFormPatientId(patients[0]?.patient_id || '');
                setPlanFormTitle('Cystic Acne & Barrier Re-stabilization Protocol');
                setPlanFormDiagnosis('Papulopustular Acne Vulgaris (Grade III)');
                setPlanFormObjectives('Reduce active inflammatory lesions by 75% and normalize epidermal lipid ratio');
                setPlanFormActives('Adapalene 0.1%, Azelaic Acid 15%, Ceramide Complex');
                setShowCreatePlanModal(true);
              }}
              style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              + Create Treatment Plan
            </button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {treatmentPlans.map(tp => (
          <Card key={tp.id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a' }}>
                  {tp.status} Regimen ({tp.duration_weeks} Weeks)
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{tp.start_date} to {tp.end_date}</span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{tp.title}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Patient: <b>{tp.patient_name}</b> · {tp.severity} Severity</div>

              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.8rem', color: '#334155' }}>
                <b>Diagnosis:</b> {tp.diagnosis}
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#475569' }}><b>Objective:</b> {tp.objectives}</div>
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.76rem', color: '#64748b' }}>
                <b>Active Ingredients:</b> {tp.recommended_actives?.join(', ')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => openPatientDossier(tp.patient_id)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Inspect Dossier
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );


  // ─────────────────────────────────────────────────────────────────────────
  // 6. PROGRESS TRACKING MODULE (Timeline & Before/After Clinical Photos)
  // ─────────────────────────────────────────────────────────────────────────
  const renderProgressTrackingPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Longitudinal Clinical Progress & Photo Milestones</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Monitor photographic recovery timelines, skin barrier restoration indexes, and compliance correlations.</p>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {patients.map(p => {
          const score = p.health_score ? Math.round(p.health_score) : 74;
          return (
            <Card key={p.patient_id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, background: score >= 75 ? '#dcfce7' : '#fef3c7', color: score >= 75 ? '#15803d' : '#b45309' }}>
                    Score: {score}/100
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{p.skin_type} · Primary: {p.primary_concern}</div>

                <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <div><span>Adherence Rate:</span> <b style={{ color: '#16a34a' }}>{p.compliance_rate}%</b></div>
                  <div><span>Barrier Healing:</span> <b style={{ color: '#0284c7' }}>88.4%</b></div>
                </div>

                {/* Visual Before vs Current Preview */}
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ height: '90px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, border: '1px dashed #cbd5e1' }}>
                    Baseline (Day 1)
                  </div>
                  <div style={{ height: '90px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#15803d', fontWeight: 700, border: '1px solid #86efac' }}>
                    Audit (Week 6)
                  </div>
                </div>
              </div>

              <button
                onClick={() => openPatientDossier(p.patient_id)}
                style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Examine Photo Timeline & Logs →
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 7. PRESCRIPTIONS MODULE (CRUD)
  // ─────────────────────────────────────────────────────────────────────────
  const renderPrescriptionsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Medical Prescription Management (Rx)</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>High-potency clinical actives (Tretinoin, Adapalene, Azelaic Acid, Ivermectin) with refill and contraindication tracking.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search Rx code, patient, active…"
              value={rxSearch}
              onChange={e => setRxSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
            />
            <button
              onClick={() => {
                setRxPatientId(patients[0]?.patient_id || '');
                setRxMedicationName('Tretinoin 0.05% Microsphere Gel');
                setRxDosage('Pea-sized amount (0.5g)');
                setRxFrequency('Alternate evenings (PM)');
                setRxDuration('12 Weeks');
                setRxRefills(2);
                setRxInstructions('Apply over moisturizer 20 mins after washing.');
                setRxWarnings('Strict daily broad-spectrum SPF 50+ mandatory.');
                setShowCreateRxModal(true);
              }}
              style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              + Issue New Prescription
            </button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {prescriptions.map(rx => (
          <Card key={rx.id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${PUR}15`, color: PUR }}>
                  {rx.code}
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                  {rx.status}
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{rx.medication_name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Patient: <b>{rx.patient_name}</b> · {rx.duration} ({rx.refills_allowed} Refills)</div>

              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.8rem', color: '#334155' }}>
                <div><b>Dosage & Timing:</b> {rx.dosage} · {rx.frequency}</div>
                <div style={{ marginTop: '4px', fontSize: '0.76rem', color: '#64748b' }}><b>Instructions:</b> {rx.instructions}</div>
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#dc2626', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px' }}>
                <b>Warning:</b> {rx.warnings}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => openPatientDossier(rx.patient_id)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                View Patient File
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 8. REPORTS MODULE (Printable PDF Dossier & Clinical Analytics)
  // ─────────────────────────────────────────────────────────────────────────
  const renderReportsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Reports & Medical Progress Dossiers</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Generate printable diagnostic reports, transepidermal barrier audits, and medical summaries.</p>
          </div>
          <input
            type="text"
            placeholder="Search report code, patient…"
            value={reportSearch}
            onChange={e => setReportSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
          />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {reportsList.map(r => (
          <Card key={r.id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${PUR}15`, color: PUR }}>
                  {r.code}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{r.created_at}</span>
              </div>

              <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{r.patient_name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.report_type}</div>

              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #edf2f7', fontSize: '0.78rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>CURRENT SCORE</span><b style={{ color: '#16a34a', fontSize: '0.95rem' }}>{r.current_score}/100</b></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>IMPROVEMENT</span><b style={{ color: '#2563eb', fontSize: '0.95rem' }}>+{r.improvement_rate}%</b></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>BARRIER RESTORED</span><b style={{ color: '#0d9488', fontSize: '0.95rem' }}>{r.barrier_recovery_pct}%</b></div>
              </div>

              <p style={{ marginTop: '12px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                {r.diagnosis_summary}
              </p>
            </div>

            <button
              onClick={() => handleDownloadReportPDF(r)}
              style={{ padding: '10px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>📄</span> Download Printable PDF Dossier
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 9. CONSULTATIONS MODULE (Calendar & Live Appointments)
  // ─────────────────────────────────────────────────────────────────────────
  const renderConsultationsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Appointments & Live Calendar</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Manage upcoming tele-dermatology appointments, patient notes, and referral acceptances.</p>
          </div>
          <button
            onClick={() => setShowCalendarModal(true)}
            style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📅 Open Master Calendar View
          </button>
        </div>
      </Card>

      <Card style={{ padding: '20px' }}>
        <div className="dash-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.74rem', color: '#64748b' }}>PATIENT</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.74rem', color: '#64748b' }}>DATE & TIME</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '0.74rem', color: '#64748b' }}>STATUS</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.74rem', color: '#64748b' }}>REFERRAL / PATIENT NOTES</th>
                <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '0.74rem', color: '#64748b' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{a.patient_name || 'Clinical Patient'}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{a.patient_email}</div>
                  </td>
                  <td style={{ padding: '14px', fontSize: '0.84rem', color: '#334155' }}>
                    <b>{a.preferred_date}</b> at {a.preferred_time}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: a.status === 'Accepted' ? '#dcfce7' : (a.status === 'Completed' ? '#e0f2fe' : '#fef3c7'),
                      color: a.status === 'Accepted' ? '#15803d' : (a.status === 'Completed' ? '#0369a1' : '#b45309')
                    }}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px', fontSize: '0.8rem', color: '#475569', maxWidth: '280px' }}>
                    {a.consultant_summary ? (
                      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', borderLeft: `3px solid ${PUR}` }}>
                        <b>Consultant:</b> {a.consultant_summary}
                      </div>
                    ) : (a.user_notes || 'Patient scheduled follow-up')}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <button
                      onClick={() => openPatientDossier(a.patient_id || a.user_id)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 10. FOLLOW-UPS MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderFollowupsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Patient Follow-up Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Post-procedure checks, retinoid tolerance reviews, and routine milestone audits.</p>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {upcomingFollowups.map((f, i) => (
          <Card key={i} style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: f.is_overdue ? '#fee2e2' : '#dcfce7', color: f.is_overdue ? '#dc2626' : '#15803d' }}>
                  {f.is_overdue ? 'Overdue Follow-up' : 'Scheduled Milestone'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{f.date}</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{f.patient_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}><b>Reason:</b> {f.topic}</div>
            </div>
            <button
              onClick={() => openPatientDossier(f.patient_id)}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Open Clinical Record →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 11. REMINDERS MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderRemindersPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Reminders & Task Queue</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Doctor action items, biopsy reviews, active prescription renewals, and patient re-evaluations.</p>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(reminders.length ? reminders : [
          { title: 'Evaluate Week 4 Retinoid Tolerance for Ananya', due_date: '2026-08-18', priority: 'High', category: 'Prescription Review' },
          { title: 'Confirm Barrier TEWL Recovery Index for Rahul', due_date: '2026-08-19', priority: 'Medium', category: 'Follow-up' },
          { title: 'Sign Off Quarterly Chemical Peel Protocol', due_date: '2026-08-20', priority: 'Low', category: 'Protocol Review' },
        ]).map((rem, i) => (
          <Card key={i} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${rem.priority === 'High' ? '#ef4444' : PUR}` }}>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{rem.title}</div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>Due: <b>{rem.due_date}</b> · Category: {rem.category}</div>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: rem.priority === 'High' ? '#fee2e2' : '#f1f5f9', color: rem.priority === 'High' ? '#dc2626' : '#334155' }}>
              {rem.priority} Priority
            </span>
          </Card>
        ))}
      </div>
    </div>
  );


  // ─────────────────────────────────────────────────────────────────────────
  // 12. INGREDIENT DATABASE MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderIngredientDatabasePage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Skincare Ingredients Database</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Search pharmaceutical-grade chemical entities, contraindications, and active combinations.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search ingredient, active…"
              value={ingredientSearch}
              onChange={e => setIngredientSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
            />
            <select
              value={ingredientCat}
              onChange={e => setIngredientCat(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="All">All Categories</option>
              <option value="Active">Actives</option>
              <option value="Humectant">Humectants</option>
              <option value="Emollient">Emollients</option>
              <option value="Exfoliant">Exfoliants</option>
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {ingredients.map(ing => (
          <Card key={ing.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{ing.name}</div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${PUR}15`, color: PUR }}>
                  {ing.category || 'Active'}
                </span>
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                {ing.description || ing.function || 'High-potency clinical active agent.'}
              </p>
              {ing.benefits?.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#16a34a' }}>
                  <b>Benefits:</b> {ing.benefits.join(', ')}
                </div>
              )}
              {ing.avoid_with?.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '0.74rem', color: '#dc2626' }}>
                  <b>Avoid With:</b> {ing.avoid_with.join(', ')}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
              Safety Index: <b>{ing.safety_rating || 'Safe'}</b> · Regulated Medical Topical
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 13. TREATMENT PROTOCOLS MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderTreatmentProtocolsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Treatment Protocols & Reference Guides</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Standardized clinical pathways for acne vulgaris, melasma, barrier repair, and rosacea.</p>
          </div>
          <input
            type="text"
            placeholder="Search protocol, condition…"
            value={protocolSearch}
            onChange={e => setProtocolSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
          />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {protocols.map(prot => (
          <Card key={prot.id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${PUR}15`, color: PUR }}>
                  {prot.protocol_code}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{prot.duration_weeks} Weeks Regimen</span>
              </div>
              <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{prot.name}</div>
              <div style={{ fontSize: '0.78rem', color: PUR, fontWeight: 700, marginTop: '2px' }}>{prot.category}</div>
              <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                {prot.expected_outcome || 'Standardized clinical approach for epidermal restoration.'}
              </p>
              <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#334155' }}>
                <b>Actives:</b> {prot.recommended_actives?.join(', ')}
              </div>
            </div>
            <button
              onClick={() => setSelectedProtocolModal(prot)}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
            >
              View Full Protocol Steps →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 14. SKIN CONDITIONS GUIDE MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderSkinConditionsGuidePage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Skin Conditions & Diagnostics Reference</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Pathophysiology, differential diagnosis, triggers, and evidence-based therapeutic solutions.</p>
          </div>
          <input
            type="text"
            placeholder="Search condition, pathology…"
            value={conditionSearch}
            onChange={e => setConditionSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
          />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {skinConditions.map(cond => (
          <Card key={cond.id} style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{cond.name}</div>
              <div style={{ fontSize: '0.78rem', color: PUR, fontWeight: 700, marginTop: '2px' }}>{cond.clinical_name || cond.category}</div>
              <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                {cond.description}
              </p>
              {cond.key_ingredients?.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#16a34a' }}>
                  <b>First-Line Actives:</b> {cond.key_ingredients.join(', ')}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedConditionModal(cond)}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${PUR}`, background: '#fff', color: PUR, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Clinical Diagnostic Sheet →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 15. RESEARCH & PUBLICATIONS MODULE
  // ─────────────────────────────────────────────────────────────────────────
  const renderResearchPublicationsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Dermatology Research & Peer-Reviewed Literature</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Latest double-blind trials, topical pharmacology breakthroughs, and barrier lipid science.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search literature, author, DOI…"
              value={pubSearch}
              onChange={e => setPubSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
            />
            <select
              value={pubCat}
              onChange={e => setPubCat(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="All">All Disciplines</option>
              <option value="Retinoids & Actives">Retinoids & Actives</option>
              <option value="Barrier Repair">Barrier Repair</option>
              <option value="Pigmentary Disorders">Pigmentary Disorders</option>
              <option value="Acne Pathology">Acne Pathology</option>
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {publications.map(pub => (
          <Card key={pub.id} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${PUR}15`, color: PUR }}>
                  {pub.category} · {pub.publication_year}
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.35 }}>
                  {pub.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                  {pub.authors} · <i>{pub.journal}</i>
                </div>
              </div>
              {pub.doi_or_url && (
                <a
                  href={pub.doi_or_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.76rem', color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}
                >
                  View Paper / DOI ↗
                </a>
              )}
            </div>

            <p style={{ marginTop: '12px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
              <b>Abstract:</b> {pub.abstract}
            </p>

            {pub.clinical_takeaways?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: PUR, marginBottom: '6px' }}>KEY CLINICAL PRACTICE TAKEAWAYS</div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {pub.clinical_takeaways.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 16. MY PROFILE MODULE (Exact standard as Consultant / Admin with DP crop)
  // ─────────────────────────────────────────────────────────────────────────
  const renderMyProfilePage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowDpMenu(prev => !prev)}
              style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'grid', placeItems: 'center', cursor: 'pointer', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              {customDp ? (
                <img src={customDp} alt="Dermatologist DP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem' }}>👨‍⚕️</span>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleDpSelect} accept="image/*" style={{ display: 'none' }} />

            {/* DP Menu Popup */}
            {showDpMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 100, background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', minWidth: '160px', overflow: 'hidden' }}>
                {dpMenuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: item.danger ? '#ef4444' : '#334155', cursor: 'pointer' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{profileName}</h2>
            <div style={{ fontSize: '0.84rem', color: PUR, fontWeight: 700, marginTop: '2px' }}>{profileTitle} · {profileSpec}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>License: <b>{profileLicense}</b> · {profileAffiliation}</div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: '24px' }}>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Medical Credentials & Practice Details</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
              <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PHONE</label>
              <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PROFESSIONAL TITLE</label>
              <input type="text" value={profileTitle} onChange={e => setProfileTitle(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>SPECIALIZATION</label>
              <input type="text" value={profileSpec} onChange={e => setProfileSpec(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>MEDICAL LICENSE NUMBER</label>
              <input type="text" value={profileLicense} onChange={e => setProfileLicense(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>HOSPITAL / CLINIC AFFILIATION</label>
              <input type="text" value={profileAffiliation} onChange={e => setProfileAffiliation(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>YEARS OF EXPERIENCE</label>
              <input type="number" value={profileExp} onChange={e => setProfileExp(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CONSULTATION FEE (₹)</label>
              <input type="number" value={profileFee} onChange={e => setProfileFee(parseFloat(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLINICAL BIOGRAPHY</label>
            <textarea rows={3} value={profileBio} onChange={e => setProfileBio(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
          >
            {profileSaving ? 'Saving Profile Changes…' : 'Save Profile Details'}
          </button>
        </form>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 17. ACCOUNT SETTINGS & PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────
  const renderAccountSettingsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Security & Password Management</h3>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '480px' }}>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CURRENT PASSWORD</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>NEW PASSWORD</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={passwordSaving} style={{ padding: '11px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}>
            {passwordSaving ? 'Updating Password…' : 'Update Medical Password'}
          </button>
        </form>
      </Card>

      <Card style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Clinical Notification Preferences</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            ['Emergency Referral Alerts (Immediate SMS & Push)', notifEmergencyReferrals, setNotifEmergencyReferrals],
            ['Consultation Requests & Schedule Confirmations', notifEmailConsults, setNotifEmailConsults],
            ['Daily Patient Routine Adherence Alerts', notifSmsAlerts, setNotifSmsAlerts],
            ['Weekly Clinical Outcome Digest & Literature Roundup', notifWeeklyDigest, setNotifWeeklyDigest],
          ].map(([label, val, setVal]: any, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.86rem', color: '#334155' }}>
              <input type="checkbox" checked={val} onChange={e => setVal(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: PUR }} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ROUTING SWITCH CASE
  // ─────────────────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'patients':
        return renderPatientsPage();
      case 'assessments':
        return renderAssessmentsPage();
      case 'clinical-insights':
        return renderClinicalInsightsPage();
      case 'treatment-plans':
        return renderTreatmentPlansPage();
      case 'progress-tracking':
        return renderProgressTrackingPage();
      case 'prescriptions':
        return renderPrescriptionsPage();
      case 'reports':
        return renderReportsPage();
      case 'consultations':
        return renderConsultationsPage();
      case 'follow-ups':
        return renderFollowupsPage();
      case 'reminders':
        return renderRemindersPage();
      case 'ingredient-database':
        return renderIngredientDatabasePage();
      case 'treatment-protocols':
        return renderTreatmentProtocolsPage();
      case 'skin-conditions-guide':
        return renderSkinConditionsGuidePage();
      case 'research-&-publications':
      case 'research-publications':
        return renderResearchPublicationsPage();
      case 'profile':
      case 'my-profile':
        return renderMyProfilePage();
      case 'settings':
      case 'account-settings':
        return renderAccountSettingsPage();
      default:
        return renderDashboardOverview();
    }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {cropSrc && <CropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}
      {viewPhoto && customDp && <PhotoViewer src={customDp} name={profileName} onClose={() => setViewPhoto(false)} />}

      {/* 360° Patient Medical Dossier Modal */}
      {selectedPatientDossier && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setSelectedPatientDossier(null); }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '680px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{selectedPatientDossier.patient.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedPatientDossier.patient.email} · ID: {selectedPatientDossier.patient.id}</div>
              </div>
              <button onClick={() => setSelectedPatientDossier(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Demographics */}
              <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.82rem' }}>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>SKIN TYPE</span><b>{selectedPatientDossier.patient.profile?.skin_type}</b></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>AGE / GENDER</span><b>{selectedPatientDossier.patient.profile?.age}y / {selectedPatientDossier.patient.profile?.gender}</b></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>ALLERGIES</span><b>{selectedPatientDossier.patient.profile?.allergies?.join(', ') || 'None'}</b></div>
              </div>

              {/* Assessment History */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: PUR, marginBottom: '8px' }}>CLINICAL ASSESSMENTS ({selectedPatientDossier.assessments.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPatientDossier.assessments.map((a: any) => (
                    <div key={a.id} style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span><b>{a.date}</b> — Concerns: {a.concerns?.join(', ')}</span>
                      <span style={{ fontWeight: 800, color: a.overall_score >= 75 ? '#16a34a' : '#d97706' }}>{a.overall_score}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Prescriptions */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>ACTIVE MEDICAL PRESCRIPTIONS ({selectedPatientDossier.prescriptions.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPatientDossier.prescriptions.map((rx: any) => (
                    <div key={rx.id} style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 800, color: '#991b1b' }}>{rx.medication_name} ({rx.dosage})</div>
                      <div style={{ color: '#7f1d1d', marginTop: '2px' }}>{rx.frequency} · {rx.duration} · Status: {rx.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Calendar Modal */}
      {showCalendarModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowCalendarModal(false); }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '640px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Dermatology Clinical Calendar</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Live appointment bookings and follow-up milestones for August 2026.</div>
              </div>
              <button onClick={() => setShowCalendarModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Calendar Month Selector & Days Grid */}
            <div style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>August 2026</span>
                <span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>{appointments.length} Consultations Booked</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontSize: '0.74rem' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} style={{ fontWeight: 800, color: '#94a3b8', padding: '4px 0' }}>{d}</div>
                ))}
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const dayStr = `2026-08-${String(day).padStart(2, '0')}`;
                  const hasAppt = appointments.some(a => a.preferred_date === dayStr);
                  const isSelected = selectedCalDate === dayStr;
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedCalDate(dayStr)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        background: isSelected ? PUR : (hasAppt ? '#dcfce7' : '#fff'),
                        color: isSelected ? '#fff' : (hasAppt ? '#15803d' : '#334155'),
                        fontWeight: hasAppt || isSelected ? 800 : 500,
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Appointments */}
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                SCHEDULE FOR {selectedCalDate}
              </div>
              {appointments.filter(a => a.preferred_date === selectedCalDate).length === 0 ? (
                <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                  No consultations scheduled for this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {appointments.filter(a => a.preferred_date === selectedCalDate).map(a => (
                    <div key={a.id} style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{a.patient_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Time: {a.preferred_time} · {a.user_notes || 'Consultation'}</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: a.status === 'Accepted' ? '#dcfce7' : '#fef3c7', color: a.status === 'Accepted' ? '#15803d' : '#b45309' }}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Treatment Plan Modal */}
      {showCreatePlanModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowCreatePlanModal(false); }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '560px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Create Clinical Treatment Plan</div>
              <button onClick={() => setShowCreatePlanModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>ASSIGN PATIENT</label>
                <select value={planFormPatientId} onChange={e => setPlanFormPatientId(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}>
                  {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.skin_type} · {p.primary_concern})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PLAN TITLE</label>
                <input type="text" value={planFormTitle} onChange={e => setPlanFormTitle(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>CLINICAL DIAGNOSIS</label>
                <input type="text" value={planFormDiagnosis} onChange={e => setPlanFormDiagnosis(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>SEVERITY</label>
                  <select value={planFormSeverity} onChange={e => setPlanFormSeverity(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>DURATION (WEEKS)</label>
                  <input type="number" value={planFormDuration} onChange={e => setPlanFormDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>OBJECTIVES</label>
                <input type="text" value={planFormObjectives} onChange={e => setPlanFormObjectives(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={planSaving} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}>
                {planSaving ? 'Saving Treatment Plan…' : 'Save & Assign Treatment Plan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Rx Prescription Modal */}
      {showCreateRxModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowCreateRxModal(false); }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '560px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Issue Medical Prescription (Rx)</div>
              <button onClick={() => setShowCreateRxModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateRxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>TARGET PATIENT</label>
                <select value={rxPatientId} onChange={e => setRxPatientId(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}>
                  {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.skin_type})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>MEDICATION NAME & STRENGTH</label>
                <input type="text" value={rxMedicationName} onChange={e => setRxMedicationName(e.target.value)} required placeholder="e.g. Tretinoin 0.05% Gel" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>DOSAGE</label>
                  <input type="text" value={rxDosage} onChange={e => setRxDosage(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>FREQUENCY</label>
                  <input type="text" value={rxFrequency} onChange={e => setRxFrequency(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>MANDATORY CLINICAL WARNINGS</label>
                <input type="text" value={rxWarnings} onChange={e => setRxWarnings(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={rxSaving} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: PUR, color: '#fff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}>
                {rxSaving ? 'Issuing Prescription…' : 'Issue Official Medical Rx'}
              </button>
            </form>
          </div>
        </div>
      )}

      {renderSection()}
    </>
  );
}

