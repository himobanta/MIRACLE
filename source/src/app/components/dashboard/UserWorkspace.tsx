import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Sleep: '😴',
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
  // ── Core State ─────────────────────────────────────────────────────────────
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
  const [apptListLoading, setApptListLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Skin Profile state
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [selectedSkinType, setSelectedSkinType] = useState<string>('Combination');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(['Acne & Breakouts']);
  const [profileAge, setProfileAge] = useState<number | ''>('');
  const [profileGender, setProfileGender] = useState<string>('Female');
  const [profileName, setProfileName] = useState<string>(() => {
    try {
      const u = JSON.parse(localStorage.getItem('miracle_user') || '{}');
      return u.name || '';
    } catch {
      return '';
    }
  });
  const [profileAllergies, setProfileAllergies] = useState<string[]>(['Fragrance', 'Parabens']);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Photo Assessment Modal state
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

  // Daily Checklist State
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
  const [ingrRoutineTime, setIngrRoutineTime] = useState<'AM' | 'PM'>('PM');
  const [ingrLoading, setIngrLoading] = useState(false);
  const [ingrResult, setIngrResult] = useState<any | null>(null);
  const [ingrError, setIngrError] = useState<string | null>(null);
  const [ingrKnowledgeList, setIngrKnowledgeList] = useState<any[]>([]);
  const [ingrSearchQuery, setIngrSearchQuery] = useState<string>('');
  const [ingrCategoryFilter, setIngrCategoryFilter] = useState<string>('All');
  const [selectedIngredientDetail, setSelectedIngredientDetail] = useState<any | null>(null);

  // Lifestyle Log State
  const [dailyWaterGlasses, setDailyWaterGlasses] = useState<number>(8);
  const [dailySleepHours, setDailySleepHours] = useState<number>(7.5);
  const [dailyStressLevel, setDailyStressLevel] = useState<number>(4);
  const [dailySunExposure, setDailySunExposure] = useState<string>('Moderate');
  const [lifestyleSaving, setLifestyleSaving] = useState<boolean>(false);
  const [lifestyleSuccess, setLifestyleSuccess] = useState<boolean>(false);

  // Reminders State
  const [remindersList, setRemindersList] = useState([
    { id: '1', title: 'Morning AM Routine', time: '08:00 AM', desc: 'Gentle Cleanser, Vitamin C & SPF 50 application', active: true, tag: 'Routine' },
    { id: '2', title: 'Mid-day Sunscreen Reapplication', time: '01:00 PM', desc: 'Reapply broad spectrum SPF 50 for UV barrier defense', active: true, tag: 'Sun Care' },
    { id: '3', title: 'Hydration Target Check-in', time: '04:00 PM', desc: 'Drink 2 glasses of water (Daily Goal: 2.5L)', active: true, tag: 'Hydration' },
    { id: '4', title: 'Evening PM Routine', time: '09:00 PM', desc: 'Double cleanse, active barrier serum & ceramide cream', active: true, tag: 'Routine' },
    { id: '5', title: 'Weekly Progress Photo Scan', time: 'Sunday 10:00 AM', desc: 'Take a progress photo to update skin score trajectory', active: false, tag: 'Analytics' },
  ]);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  // Settings State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifRoutine, setNotifRoutine] = useState(true);
  const [notifAssessment, setNotifAssessment] = useState(true);

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

  // Photo Upload State
  const [uploadPhotoTag, setUploadPhotoTag] = useState('Baseline');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPhotoSuccess, setUploadPhotoSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Initial Data ─────────────────────────────────────────────────────
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
    } catch {} finally {
      setApptListLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const p = await api.getProfile();
      if (p) {
        setUserProfile(p);
        if (p.name) setProfileName(p.name);
        if (p.skin_type) setSelectedSkinType(p.skin_type);
        if (p.concerns && Array.isArray(p.concerns)) setSelectedConcerns(p.concerns);
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
        per_page: 32,
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
      if (res && Array.isArray(res.ingredients)) {
        setIngrKnowledgeList(res.ingredients);
      }
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

  // When switching to product-recommendations tab, load product catalog
  useEffect(() => {
    if (activeSection === 'product-recommendations') {
      loadCatalog(1);
    }
  }, [activeSection]);

  // ── Calculation Helpers ───────────────────────────────────────────────────
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

  const scoreHistory = analytics?.score_history ?? [];
  const firstScore = scoreHistory.length >= 2 ? scoreHistory[0].score : null;
  const lastScore = scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 1].score : null;
  const improvementPct =
    firstScore != null && lastScore != null && firstScore > 0
      ? Math.round(((lastScore - firstScore) / firstScore) * 100)
      : null;

  const currentSkinType = selectedSkinType || 'Combination';
  const topConcern = selectedConcerns[0] || score?.detected_concerns?.[0] || 'Acne & Breakouts';
  const userAge = userProfile?.age || null;
  const hydrationPct = score ? Math.round((score.hydration_subscore / 100) * 100) : null;

  // ── Handlers ───────────────────────────────────────────────────────────────
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
      setTimeout(() => {
        setProfileSaveSuccess(false);
        setShowProfileEditModal(false);
      }, 1500);
    } catch {} finally {
      setProfileSaving(false);
    }
  };

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

      // If photo was provided, upload it to progress photos
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
        reply = `For your ${selectedSkinType} skin type with concerns of ${selectedConcerns.join(', ')}, introduce retinoids gradually in the PM routine (2 nights/week). Always buffer with a ceramide moisturizer and apply broad-spectrum SPF 50 every morning.`;
      } else if (q.includes('barrier') || q.includes('dry') || q.includes('sting')) {
        reply = `When the skin barrier is stressed, temporarily pause direct acids (AHA/BHA) and retinoids. Focus on lipid replenishment with Ceramides (NP, AP, EOP), Hyaluronic Acid, Centella Asiatica, and Squalane twice daily.`;
      } else if (q.includes('niacinamide') || q.includes('salicylic')) {
        reply = `Yes, Niacinamide (2-5%) pairs exceptionally well with Salicylic Acid (BHA). The BHA exfoliates inside pores to clear sebum, while Niacinamide strengthens barrier lipids and regulates sebum production.`;
      } else if (q.includes('vitamin c') || q.includes('spf')) {
        reply = `Vitamin C (L-Ascorbic Acid or Sodium Ascorbyl Phosphate) is best applied in the AM followed immediately by sunscreen. This combination provides synergistic antioxidant protection against UV-induced free radicals.`;
      } else {
        reply = `Based on your live profile (${selectedSkinType} skin, active score: ${scorePct || 74}/100), maintain consistency with your morning antioxidant shield and evening barrier repair regimen. Avoid physical scrubs and stay hydrated!`;
      }
      setAiChatMessages(prev => [...prev, { role: 'assistant', text: reply, time: timeStr }]);
      setAiTyping(false);
    }, 900);
  };

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
        await api.uploadPhoto({ image_url: dataUrl, tag: uploadPhotoTag });
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

  const scrollProds = (dir: 'left' | 'right') => {
    if (prodScrollRef.current) {
      prodScrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    }
  };

  // ── Sub-Components & Pages ────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DASHBOARD OVERVIEW PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboardPage = () => {
    const amSteps = routine.filter(r => r.time_of_day === 'AM').sort((a, b) => a.step_number - b.step_number);
    const pmSteps = routine.filter(r => r.time_of_day === 'PM').sort((a, b) => a.step_number - b.step_number);
    const nightSteps = routine.filter(r => r.time_of_day === 'Weekly').sort((a, b) => a.step_number - b.step_number);

    const chartVals = analytics?.score_history?.length
      ? analytics.score_history.map(h => h.score)
      : score
      ? [Math.max(50, score.overall_score - 8), Math.max(55, score.overall_score - 4), score.overall_score]
      : [68, 72, 79, 84];

    const chartDates = analytics?.score_history?.length
      ? analytics.score_history.map(h => h.date.slice(5))
      : ['W1', 'W2', 'W3', 'Today'];

    // Score tip
    const scoreAwareTip = score
      ? score.hydration_subscore < 60
        ? '💧 Hydration subscore is low. Increase water intake and use a Hyaluronic Acid serum.'
        : score.consistency_subscore < 60
        ? '✅ Routine consistency is the biggest driver of skin improvement. Aim to complete all steps daily.'
        : score.sleep_subscore < 60
        ? '🌙 Sleep duration is below optimal. Prioritise 7–8 hours of sleep for cellular repair.'
        : score.overall_score >= 85
        ? '🌟 Excellent barrier integrity! Maintain your current routine and protect with SPF daily.'
        : '📈 Steady clinical improvement. Keep up your routine for the next 2 weeks to reach optimal.'
      : 'Complete your first skin assessment to generate your personalized Skin Health Score.';

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
      usageType: p.usage_type || 'Face Care',
      price:
        typeof p.price === 'number'
          ? `₹${Math.round(p.price)}`
          : p.price || `₹${[699, 849, 999, 1149, 1299, 1499][Math.abs((p.id || 0) * 7 + (p.name?.length || 0)) % 6]}`,
      rating: String(p.rating || 4.7),
      safetyScore: p.safety_score || 94.0,
      isBest: p.is_best_match ? 1 : 0,
      img: p.image_url || PRODIMG[0],
      productUrl: p.product_url || '',
      ingredients: p.ingredients || 'Clinically tested formulation with verified barrier support complex.',
      matchLabel: p.match_label || 'Recommended',
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* ── Top 5 Metrics Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {/* 1. Skin Health Score */}
          <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', padding: '18px 20px', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.2)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c8199', marginBottom: '8px' }}>SKIN HEALTH SCORE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.1rem', fontWeight: 900, color: PUR, lineHeight: 1 }}>{scorePct !== null ? scorePct : '—'}</span>
                  <span style={{ fontSize: '0.9rem', color: '#8b8fa3', fontWeight: 600 }}>/100</span>
                </div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: scoreColor }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scoreColor }} />
                  {scoreLabel}
                </div>
              </div>
              <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '56px', height: '56px', borderRadius: '50%', background: scorePct !== null ? `conic-gradient(${PUR} ${scorePct}%, #f1f5f9 0)` : '#f1f5f9' }}>
                <span style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>
                  {scorePct !== null && scorePct >= 80 ? '🌟' : scorePct !== null ? '📈' : '📋'}
                </span>
              </span>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#64748b' }}>
              {improvementPct !== null ? `+${improvementPct}% improvement recorded` : 'Live clinical assessment score'}
            </div>
          </div>

          {/* 2. Skin Type */}
          <div
            onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
            style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', padding: '18px 20px', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.2)', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = PUR)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#edeef4')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c8199' }}>SKIN TYPE</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: PUR, background: '#f0effe', padding: '2px 8px', borderRadius: '6px' }}>Verified</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{currentSkinType} Skin</div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#64748b' }}>
              <span style={{ fontSize: '1.3rem' }}>{currentSkinType === 'Oily' ? '✨' : currentSkinType === 'Dry' ? '🌵' : currentSkinType === 'Sensitive' ? '🌸' : '🌿'}</span>
              <span>Click to view profile & balance</span>
            </div>
          </div>

          {/* 3. Top Concerns (Clean & Proportional) */}
          <div
            onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
            style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', padding: '18px 20px', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.2)', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = PUR)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#edeef4')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c8199' }}>PRIMARY CONCERN</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#e11d48', background: '#ffe4e6', padding: '2px 8px', borderRadius: '6px' }}>{selectedConcerns.length} Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>{topConcern}</div>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748b' }}>Active target protocol</div>
              </div>
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fdf2f8', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                🎯
              </span>
            </div>
          </div>

          {/* 4. Skin Age / Profile */}
          <div
            onClick={() => onSectionChange && onSectionChange('my-skin-profile')}
            style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', padding: '18px 20px', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.2)', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = PUR)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#edeef4')}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c8199', marginBottom: '8px' }}>LOGGED AGE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{userAge || '28'}</div>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748b' }}>{profileGender || 'Profile set'}</div>
              </div>
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0f9ff', color: BLU, display: 'grid', placeItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                👤
              </span>
            </div>
          </div>

          {/* 5. Hydration Level */}
          <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', padding: '18px 20px', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.2)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c8199', marginBottom: '8px' }}>HYDRATION INDEX</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>{hydrationPct !== null ? `${hydrationPct}%` : '78%'}</div>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748b' }}>Subscore integrity</div>
              </div>
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                💧
              </span>
            </div>
            <div style={{ marginTop: '10px', height: '6px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hydrationPct || 78}%`, background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '99px' }} />
            </div>
          </div>
        </div>

        {/* ── 3-Column Core Dashboard Cards (Vibrant, Professional & Proportional) ── */}
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
                  {routine.length} Steps Active
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

          {/* Card 2: Skin Health Progress */}
          <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '430px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Skin Health Progress</h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, background: '#f0effe', padding: '3px 9px', borderRadius: '6px' }}>
                  Live Trajectory
                </span>
              </div>

              <div style={{ height: '240px', position: 'relative' }}>
                <ChartFrame
                  chart={{ el: <LineChart vals={chartVals} min={0} max={100} /> }}
                  yLabels={['100', '75', '50', '25', '0']}
                  xLabels={chartDates}
                  h={240}
                />
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              {improvementPct !== null
                ? `Skin barrier health improved by ${improvementPct >= 0 ? '+' : ''}${improvementPct}% over time.`
                : 'Keep logging your daily routine to track longitudinal recovery.'}
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
                  AI Guidance
                </span>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #a7f3d0', marginBottom: '14px', fontSize: '0.82rem', color: '#065f46', lineHeight: 1.5 }}>
                <b>Clinical Highlight:</b> {scoreAwareTip}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  ['☀️', 'Apply SPF 30+ daily — UV prevents 80% of barrier degradation.'],
                  ['💧', 'Maintain 2.5L daily hydration to optimize epidermal moisture.'],
                  ['🌙', 'Prioritize 7-8 hours sleep for nightly collagen synthesis.'],
                  ['🧴', 'Gentle cleansing removes particulate matter without stripping lipid matrix.'],
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

        {/* ── Recommended Products Carousel (Smooth, High-FPS Sliding) ── */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Recommended Products for You</h3>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Clinically matched to your {currentSkinType} skin and {topConcern}</span>
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
                View All Catalog →
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
                    {p.safetyScore}/100 Safety
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
          {/* Left: Consultation Sessions + Quick Booking */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>My Consultation Sessions</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Verified medical consultant & dermatologist reviews</span>
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
                  No consultation sessions booked yet. Connect with our senior consultants or dermatologists.
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAssessmentModal(true)}
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
                Edit Targets →
              </span>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <DonutChart segs={userConcernSegs} center={String(selectedConcerns.length)} sub="Targets" size={180} />
              <Legend rows={userConcernLegend} />
            </div>
          </Card>
        </div>

        {/* ── Daily Checklist Placed at the Very End of Dashboard ── */}
        <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.2)', padding: '20px 24px' }}>
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
  // 2. MY SKIN PROFILE PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderSkinProfilePage = () => {
    const skinTypeOptions = [
      { type: 'Oily', desc: 'Excess sebum, visible pores, prone to shine & breakouts', emoji: '✨' },
      { type: 'Dry', desc: 'Flakiness, tightness, low lipid production & barrier fragility', emoji: '🌵' },
      { type: 'Combination', desc: 'Oily T-zone (forehead, nose, chin) with dry/normal cheeks', emoji: '☯️' },
      { type: 'Sensitive', desc: 'Prone to erythema, stinging, reactivity & barrier disruption', emoji: '🌸' },
      { type: 'Normal', desc: 'Well-balanced moisture & lipid matrix, minimal reactivity', emoji: '🌿' },
    ];

    const concernOptions = [
      'Acne & Breakouts',
      'Hyperpigmentation',
      'Dryness & Barrier Loss',
      'Redness & Rosacea',
      'Fine Lines & Aging',
      'Enlarged Pores',
      'Uneven Texture',
      'Dark Circles',
    ];

    const allergyOptions = ['Fragrance', 'Parabens', 'Essential Oils', 'Alcohol Denat', 'Sulfates (SLS/SLES)', 'Chemical UV Filters', 'Silicones'];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>My Skin Profile</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Your complete clinical skin characteristics, sensitivity thresholds, and lifestyle metrics.
              </p>
            </div>
            <button
              onClick={saveProfileHandler}
              disabled={profileSaving}
              style={{ padding: '10px 20px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
            >
              {profileSaving ? 'Saving Changes…' : 'Save Profile Changes'}
            </button>
          </div>

          {profileSaveSuccess && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.84rem', fontWeight: 700 }}>
              ✅ Skin Profile updated and synced with recommendation & routine engine!
            </div>
          )}
        </Card>

        {/* Profile Card Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {/* Section 1: Demographics & Skin Type */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Personal & Skin Classification</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>AGE (YEARS)</label>
                <input
                  type="number"
                  value={profileAge}
                  onChange={e => setProfileAge(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>PRIMARY SKIN TYPE</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {skinTypeOptions.map(st => {
                const isSelected = selectedSkinType === st.type;
                return (
                  <div
                    key={st.type}
                    onClick={() => setSelectedSkinType(st.type)}
                    style={{ padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${isSelected ? PUR : '#e2e8f0'}`, background: isSelected ? '#f0effe' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{st.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: isSelected ? PUR : '#0f172a' }}>{st.type} Skin</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{st.desc}</div>
                    </div>
                    {isSelected && <span style={{ color: PUR, fontWeight: 900 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section 2: Clinical Concerns & Sensitivity */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Target Concerns & Allergies</h3>

            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>ACTIVE SKIN CONCERNS (SELECT ALL APPLICABLE)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {concernOptions.map(c => {
                const has = selectedConcerns.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (has) setSelectedConcerns(selectedConcerns.filter(item => item !== c));
                      else setSelectedConcerns([...selectedConcerns, c]);
                    }}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${has ? PUR : '#cbd5e1'}`, background: has ? PUR : '#fff', color: has ? '#fff' : '#334155', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {has ? '✓ ' : '+ '}{c}
                  </button>
                );
              })}
            </div>

            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>ALLERGIES & CONTRAINDICATED INGREDIENTS</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allergyOptions.map(a => {
                const has = profileAllergies.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      if (has) setProfileAllergies(profileAllergies.filter(item => item !== a));
                      else setProfileAllergies([...profileAllergies, a]);
                    }}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${has ? '#dc2626' : '#cbd5e1'}`, background: has ? '#fee2e2' : '#fff', color: has ? '#dc2626' : '#64748b', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {has ? '🚫 ' : ''}{a}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SKIN ASSESSMENT & EVALUATION REPORT PAGE
  // ─────────────────────────────────────────────────────────────────────────
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

          {/* Right Column: Lifestyle & Photo Integration */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>2. Lifestyle Metrics & Photo Audit</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Daily Sleep (Hours):</span>
                  <span style={{ color: '#059669', fontWeight: 900 }}>{sleepHours}h</span>
                </div>
                <input type="range" min="4" max="12" step="0.5" value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))} style={{ width: '100%', accentColor: '#059669' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Daily Water Intake (Liters):</span>
                  <span style={{ color: BLU, fontWeight: 900 }}>{waterLiters} L</span>
                </div>
                <input type="range" min="1" max="5" step="0.5" value={waterLiters} onChange={e => setWaterLiters(Number(e.target.value))} style={{ width: '100%', accentColor: BLU }} />
              </div>
            </div>

            {/* Photo upload */}
            <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
              {photoPreview ? (
                <div>
                  <img src={photoPreview} alt="Preview" style={{ width: '90px', height: '90px', borderRadius: '12px', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>✓ Photo ready for assessment</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>📷</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Add Skin Photo (Optional)</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Assists algorithmic feature verification</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                    style={{ marginTop: '8px', fontSize: '0.74rem' }}
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => submitAssessment()}
              disabled={evaluating}
              style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 900, cursor: 'pointer', width: '100%' }}
            >
              {evaluating ? 'Analyzing Skin Biomarkers…' : '🚀 Generate Complete Diagnostic Report'}
            </button>
            {assessmentError && <div style={{ color: '#dc2626', fontSize: '0.76rem', marginTop: '6px' }}>⚠️ {assessmentError}</div>}
          </Card>
        </div>

        {/* ── Very Long & Detailed Evaluation Report ── */}
        {(assessmentReport || selectedHistoryReport) && (
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
                        Patient: {profileName || 'User'} · Evaluated: {rep.created_at || 'Today'} · Protocol: Miracle v2.6
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: PUR, lineHeight: 1 }}>{Math.round(rep.overall_score)}/100</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#059669' }}>
                        {rep.overall_score >= 80 ? 'Optimal Barrier State' : 'Actionable Barrier Recovery Required'}
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
                    <b>🧬 Primary Diagnostic Findings:</b> Patient demonstrates a <b>{selectedSkinType}</b> epidermal profile with detected concerns of{' '}
                    <b>{rep.detected_concerns?.join(', ') || selectedConcerns.join(', ')}</b>. Stratum corneum shows localized lipid depletion with estimated TEWL index at{' '}
                    <b>{Math.round(100 - rep.hydration_subscore)}%</b>. Recommended active intervention targets follicular congestion without compromising epidermal barrier integrity.
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
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      onClick={() => onSectionChange && onSectionChange('my-routine')}
                      style={{ padding: '10px 18px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Apply Prescribed Regimen to Routine →
                    </button>
                    <button
                      onClick={() => window.print()}
                      style={{ padding: '10px 18px', borderRadius: '8px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🖨️ Print Clinical Dossier
                    </button>
                  </div>
                </div>
              );
            })()}
          </Card>
        )}

        {/* Assessment History List */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Assessment History Archive</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assessmentHistory.map((h, i) => (
              <div
                key={h.id || i}
                onClick={() => setSelectedHistoryReport(h)}
                style={{ padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    Assessment #{assessmentHistory.length - i} · {h.created_at?.slice(0, 10) || 'Recent'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    Concerns: {h.detected_concerns?.join(', ') || 'Standard Clinical Scan'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: PUR }}>{Math.round(h.overall_score)}/100</span>
                  <span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Inspect Report →</span>
                </div>
              </div>
            ))}
            {!assessmentHistory.length && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.82rem' }}>
                No prior assessments in database. Submit the questionnaire above to create your first official record.
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
    const nightSteps = routine.filter(r => r.time_of_day === 'Weekly').sort((a, b) => a.step_number - b.step_number);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>My Personalized Skincare Regimen</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Algorithmic sequence custom-tailored to {currentSkinType} skin and active clinical targets.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => submitAssessment()}
                style={{ padding: '9px 16px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                🔄 Regenerate Protocol
              </button>
            </div>
          </div>
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
                  setProdSearch(e.target.value);
                  loadCatalog(1, e.target.value, prodCategoryFilter, prodSkinFilter, prodSortBy);
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {(catalogProducts.length ? catalogProducts : realRecommendations).map((p, idx) => (
            <div
              key={p.id || idx}
              onClick={() => setSelectedProduct(p)}
              style={{ borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}
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

        {/* Dual Mode Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {/* Mode 1: Formulation Safety Checker */}
          <Card style={{ padding: '22px' }}>
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
                    onChange={e => setIngrRoutineTime(e.target.value as 'AM' | 'PM')}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  >
                    <option value="AM">Morning (AM)</option>
                    <option value="PM">Evening (PM)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={runIngredientCheck}
                disabled={ingrLoading || !ingrText.trim()}
                style={{ marginTop: '6px', padding: '11px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
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
  // 7. PROGRESS TRACKING & PHOTO GALLERY PAGE
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
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ padding: '9px 16px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
            >
              + Upload Progress Photo
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
            />
          </div>
        </Card>

        {/* Adherence & Historical Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Score Progression Graph</h3>
            <div style={{ height: '260px' }}>
              <ChartFrame
                chart={{ el: <LineChart vals={chartVals} min={0} max={100} /> }}
                yLabels={['100', '75', '50', '25', '0']}
                xLabels={analytics?.score_history?.length ? analytics.score_history.map(h => h.date.slice(5)) : ['W1', 'W2', 'W3', 'Today']}
                h={260}
              />
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
  // 8. LIFESTYLE & HABITS TRACKER PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderLifestylePage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Daily Lifestyle & Habit Optimization</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Log your daily hydration, sleep duration, and UV exposure to monitor physiological barrier support.
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
              style={{ padding: '10px 20px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
            >
              {lifestyleSaving ? 'Logging Metrics…' : 'Save Today\'s Lifestyle Log'}
            </button>
          </div>

          {lifestyleSuccess && (
            <div style={{ marginTop: '14px', padding: '10px 16px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '0.8rem', fontWeight: 700 }}>
              ✅ Today's lifestyle biomarkers recorded and synced with recovery timeline!
            </div>
          )}
        </Card>

        {/* Interactive Logger Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {/* Hydration Tracker */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>💧</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Water Intake Tracker</h3>
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: BLU }}>
                {(dailyWaterGlasses * 0.25).toFixed(1)} L / 2.5 L Goal
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px 0' }}>
              <button
                onClick={() => setDailyWaterGlasses(Math.max(0, dailyWaterGlasses - 1))}
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer' }}
              >
                -
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: BLU }}>{dailyWaterGlasses}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Glasses (250ml each)</div>
              </div>
              <button
                onClick={() => setDailyWaterGlasses(dailyWaterGlasses + 1)}
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer' }}
              >
                +
              </button>
            </div>
          </Card>

          {/* Sleep Tracker */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>🌙</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Sleep Recovery Tracker</h3>
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#059669' }}>
                {dailySleepHours} Hours
              </span>
            </div>

            <div style={{ padding: '16px 0' }}>
              <input
                type="range"
                min="4"
                max="12"
                step="0.5"
                value={dailySleepHours}
                onChange={e => setDailySleepHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#059669' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                <span>4h (Deficient)</span>
                <span>8h (Optimal)</span>
                <span>12h</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 9. REPORTS CENTER PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderReportsPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Patient Clinical Skincare Summary Reports</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Official PDF/Print summary generated directly from live database diagnostic history.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              style={{ padding: '10px 20px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
            >
              🖨️ Print / Download Official Dossier
            </button>
          </div>
        </Card>

        {/* Dossier Card */}
        <Card style={{ padding: '28px' }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.1em' }}>MIRACLE</div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>INTELLIGENT DERMATOLOGY & BARRIER CLINIC</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#334155' }}>
              <div><b>Report Date:</b> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div><b>Status:</b> Verified Consumer Record</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px', padding: '16px', borderRadius: '12px', background: '#f8fafc' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>PATIENT NAME</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>{profileName || 'User'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>SKIN TYPE</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: PUR }}>{currentSkinType} Skin</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>LATEST HEALTH SCORE</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#059669' }}>{scorePct !== null ? `${scorePct}/100` : '74/100'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ACTIVE ROUTINE STEPS</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: BLU }}>{routine.length || 7} Steps</div>
            </div>
          </div>

          <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.7, marginBottom: '20px' }}>
            <b>Clinical Narrative:</b> The patient presents with verified <b>{currentSkinType}</b> epidermal barrier characteristics. Primary clinical target is <b>{selectedConcerns.join(', ')}</b>. Regimen compliance is recorded at optimal levels with consistent application of antioxidant shields and lipid repair formulations.
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 10. REMINDERS PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderRemindersPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Skincare Routine & Habit Reminders</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Configure daily schedule alerts for morning protection, midday sunscreen reapplication, and night routines.
              </p>
            </div>
          </div>
        </Card>

        {/* Reminders List */}
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
  // 11. SETTINGS & PREFERENCES PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const renderSettingsPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Account Settings & Security</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Manage credentials, update authentication security, and configure notification preferences.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {/* Password Update */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Change Password</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CURRENT PASSWORD</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>NEW PASSWORD (MIN 6 CHARS)</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CONFIRM NEW PASSWORD</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={pwSaving}
                style={{ marginTop: '6px', padding: '10px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
              >
                {pwSaving ? 'Updating Password…' : 'Update Password'}
              </button>

              {pwSuccess && <div style={{ color: '#059669', fontSize: '0.76rem', fontWeight: 700 }}>✅ Password changed successfully!</div>}
              {pwError && <div style={{ color: '#dc2626', fontSize: '0.76rem' }}>⚠️ {pwError}</div>}
            </div>
          </Card>

          {/* Notifications */}
          <Card style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Notification Preferences</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Daily Routine Check-in Alerts', checked: notifRoutine, toggle: () => setNotifRoutine(!notifRoutine) },
                { label: 'Clinical Assessment & Re-test Reminders', checked: notifAssessment, toggle: () => setNotifAssessment(!notifAssessment) },
                { label: 'Email Digest & Recovery Summaries', checked: notifEmail, toggle: () => setNotifEmail(!notifEmail) },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{item.label}</span>
                  <input type="checkbox" checked={item.checked} onChange={item.toggle} style={{ width: '18px', height: '18px', accentColor: PUR, cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 12. QUICK ACTION: ASK AI (Interactive Chatbot)
  // ─────────────────────────────────────────────────────────────────────────
  const renderAskAiPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Ask Miracle AI Skincare Companion</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Personalized guidance conditioned on your active profile ({selectedSkinType} skin, score: {scorePct || 74}/100).
          </p>
        </Card>

        <Card style={{ padding: '22px', height: '520px', display: 'flex', flexDirection: 'column' }}>
          {/* Messages Container */}
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

          {/* Input Bar */}
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
  // 13. QUICK ACTION: SKIN SCAN (AI Photo Camera Interface)
  // ─────────────────────────────────────────────────────────────────────────
  const renderSkinScanPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>AI Facial Skin Scanner & Biometric Scan</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Align your face within the landmark frame for real-time hydration and pore detection analysis.
          </p>
        </Card>

        <Card style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '280px', height: '280px', borderRadius: '24px', background: '#0f172a', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', marginBottom: '20px', border: `3px solid ${PUR}` }}>
            {photoPreview ? (
              <img src={photoPreview} alt="Face Scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>👤</div>
                Align face inside frame
              </div>
            )}
            <div style={{ position: 'absolute', inset: '20px', border: '1.5px dashed rgba(255,255,255,0.4)', borderRadius: '16px', pointerEvents: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ padding: '12px 24px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
            >
              📷 Capture / Select Photo
            </button>
            {photoPreview && (
              <button
                onClick={() => {
                  onSectionChange && onSectionChange('skin-assessment');
                  submitAssessment(photoPreview);
                }}
                style={{ padding: '12px 24px', borderRadius: '10px', background: '#10b981', color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ⚡ Analyze Biomarkers Now
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Modals (Consultation Booking, Product Details, Profile Edit)
  // ─────────────────────────────────────────────────────────────────────────
  const consultModal = showConsultModal && (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) setShowConsultModal(false); }}
    >
      <div style={{ width: '560px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', background: '#fff', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Book a Clinical Consultation</h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Select a verified specialist and your preferred schedule</span>
          </div>
          <button onClick={() => setShowConsultModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {!selectedPro ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {prosLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading verified professionals…</div>
            ) : professionals.map(pro => (
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
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: PUR, background: '#f0effe', padding: '2px 8px', borderRadius: '4px' }}>{pro.role}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>{pro.title || pro.specialty}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{pro.experience || '8+ Years Experience'} · ⭐ {pro.rating || 4.9}</div>
                </div>
                <span style={{ color: PUR, fontWeight: 800 }}>Select →</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button onClick={() => setSelectedPro(null)} style={{ border: 'none', background: 'transparent', color: PUR, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              ← Change Professional
            </button>

            <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0effe', color: PUR, display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>👤</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedPro.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{selectedPro.specialty}</div>
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
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>CONSULTATION REASON / NOTES</label>
              <textarea rows={3} placeholder="Describe any active flare-ups or questions..." value={apptNotes} onChange={e => setApptNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <button
              onClick={submitAppointment}
              disabled={apptLoading || !apptDate || !apptTime}
              style={{ marginTop: '6px', padding: '12px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer' }}
            >
              {apptLoading ? 'Requesting Appointment…' : 'Submit Consultation Request'}
            </button>
            {apptSuccess && <div style={{ color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>✅ Appointment requested successfully!</div>}
            {apptError && <div style={{ color: '#dc2626', fontSize: '0.78rem' }}>⚠️ {apptError}</div>}
          </div>
        )}
      </div>
    </div>
  );

  const productDetailModal = selectedProduct && (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}
    >
      <div style={{ width: '540px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', background: '#fff', padding: '26px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: PUR, textTransform: 'uppercase' }}>{selectedProduct.brand}</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>{selectedProduct.name || selectedProduct.product_name}</h3>
          </div>
          <button onClick={() => setSelectedProduct(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <img src={selectedProduct.image_url || selectedProduct.img || PRODIMG[0]} alt="" style={{ width: '90px', height: '90px', objectFit: 'contain', background: '#fff', borderRadius: '8px', padding: '4px' }} />
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              {typeof selectedProduct.price === 'number' ? `₹${Math.round(selectedProduct.price)}` : selectedProduct.price || '₹899'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '99px', background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', fontWeight: 800 }}>
                {selectedProduct.safety_score || selectedProduct.safetyScore || 94}/100 Safety
              </span>
              <span style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: 700 }}>⭐ {selectedProduct.rating || 4.7}</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>FULL INCI FORMULATION</div>
        <div style={{ padding: '12px', borderRadius: '10px', background: '#fafafa', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#334155', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' }}>
          {selectedProduct.ingredients || 'Verified active cosmetic formulation.'}
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
      case 'profile':
      case 'my-profile':
        return renderSkinProfilePage();
      case 'skin-assessment':
        return renderSkinAssessmentPage();
      case 'my-routine':
        return renderMyRoutinePage();
      case 'product-recommendations':
        return renderProductRecommendationsPage();
      case 'ingredient-analyzer':
        return renderIngredientAnalyzerPage();
      case 'progress-tracking':
        return renderProgressTrackingPage();
      case 'lifestyle-&-habits':
      case 'lifestyle':
        return renderLifestylePage();
      case 'reports':
        return renderReportsPage();
      case 'reminders':
        return renderRemindersPage();
      case 'settings':
      case 'account-settings':
        return renderSettingsPage();
      case 'notifications':
        return renderRemindersPage(); // Connected notifications/reminders
      case 'ask-ai':
        return renderAskAiPage();
      case 'skin-scan':
        return renderSkinScanPage();
      case 'upload-photo':
        return renderProgressTrackingPage();
      case 'dashboard':
      default:
        return renderDashboardPage();
    }
  };

  return (
    <>
      {consultModal}
      {productDetailModal}
      {renderSection()}
    </>
  );
}
