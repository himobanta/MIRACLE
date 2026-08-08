import React, { useState, useEffect, useRef } from 'react';
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
  PRODIMG,
  UpEl,
} from './dashboardUtils';
import { api } from '../../services/api';

// ── Types ────────────────────────────────────────────────────────────────────
interface RoutineStep { id: string; time_of_day: string; step_number: number; step_category: string; product_name: string; active_ingredients: string[]; is_active: boolean; prescribed_by_doctor: boolean; doctor_notes?: string; }
interface AssessmentScore { overall_score: number; condition_subscore: number; lifestyle_subscore: number; sleep_subscore: number; consistency_subscore: number; hydration_subscore: number; detected_concerns: string[]; }
interface Appointment { id: string; target_role: string; preferred_date: string; preferred_time: string; status: string; user_notes?: string; consultant_summary?: string; doctor_notes?: string; created_at: string; }

const STATUS_COLOR: Record<string, string> = {
  Requested: '#e08a1e',
  Accepted: '#16a34a',
  Rejected: '#e11d48',
  Referred_To_Dermatologist: PUR,
  Completed: BLU,
};

const PROFESSIONALS = [
  { id: 'cons_1', name: 'Dr. Priya Sharma', title: 'Senior Clinical Skincare Specialist', specialty: 'Acne & Barrier Repair', target_role: 'Consultant', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&h=80&fit=crop&crop=faces&auto=format&q=80', availability: 'Mon, Wed, Fri' },
  { id: 'derma_1', name: 'Dr. Meera Iyer', title: 'MD Dermatology, Board Certified', specialty: 'Hyperpigmentation & Clinical Actives', target_role: 'Dermatologist', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&crop=faces&auto=format&q=80', availability: 'Tue, Thu, Sat' },
];

const STEP_EMOJI: Record<string, string> = {
  Cleansing: '🧴', Treatment: '💊', Moisturizing: '🫙', 'Sun Protection': '☀️',
  Exfoliation: '🧪', Serum: '💧', 'Eye Cream': '👁️', 'Lip Mask': '💄', Sleep: '😴',
};

const DEFAULT_AM = [['Cleanser','🧴'], ['Serum','💧'], ['Moisturizer','🫙'], ['Sunscreen','☀️']];
const DEFAULT_PM = [['Cleanser','🧴'], ['Treatment','💊'], ['Moisturizer','🫙'], ['Eye Cream','👁️']];

export function UserWorkspace() {
  // ── API State ───────────────────────────────────────────────────────────────
  const [score, setScore] = useState<AssessmentScore | null>(null);
  const [routine, setRoutineData] = useState<RoutineStep[]>([]);
  const [analytics, setAnalytics] = useState<{ score_history: {date:string;score:number}[] } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Skin Profile & Concerns Modal state
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [skinTypesDataset, setSkinTypesDataset] = useState<any[]>([]);
  const [skinConcernsDataset, setSkinConcernsDataset] = useState<any[]>([]);
  const [selectedSkinType, setSelectedSkinType] = useState<string>('Combination');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(['Acne & Breakouts', 'Dark Spots & Pigmentation']);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Photo Assessment Modal state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [acneSeverity, setAcneSeverity] = useState(2);
  const [pigmentationSeverity, setPigmentationSeverity] = useState(2);
  const [rednessSeverity, setRednessSeverity] = useState(1);
  const [wrinklesSeverity, setWrinklesSeverity] = useState(1);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [waterLiters, setWaterLiters] = useState(2.5);
  const [evaluating, setEvaluating] = useState(false);
  const [assessmentReport, setAssessmentReport] = useState<any | null>(null);

  // ── Modal State ──────────────────────────────────────────────────────────────
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [selectedPro, setSelectedPro] = useState<typeof PROFESSIONALS[0] | null>(null);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptNotes, setApptNotes] = useState('');
  const [apptSuccess, setApptSuccess] = useState(false);
  const [apptLoading, setApptLoading] = useState(false);

  const prodScrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch Data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    api.getLatestScore().then(setScore).catch(() => {});
    api.getRoutine().then(setRoutineData).catch(() => {});
    api.getAnalytics().then(setAnalytics).catch(() => {});
    api.getMyAppointments().then(setAppointments).catch(() => {});
    api.getSkinTypes().then(setSkinTypesDataset).catch(() => {});
    api.getSkinConcerns().then(setSkinConcernsDataset).catch(() => {});
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const uStat = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', padding: '20px', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.28)', minWidth: 0, display: 'flex', flexDirection: 'column', ...extra }}>
      {children}
    </div>
  );
  const uLabel = (t: string) => <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#7c8199', marginBottom: '12px' }}>{t}</div>;
  const uLink = (t: string) => (
    <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
      <span style={{ display: 'inline-block', borderRadius: '99px', background: '#f4f5fa', padding: '7px 14px', fontSize: '0.76rem', fontWeight: 600, color: PUR }}>{t}</span>
    </div>
  );

  const overallScore = score?.overall_score ?? 78;
  const scorePct = Math.round(overallScore);
  const scoreLabel = scorePct >= 85 ? 'Excellent' : scorePct >= 70 ? 'Good' : scorePct >= 50 ? 'Fair' : 'Needs Attention';
  const scoreColor = scorePct >= 85 ? '#16a34a' : scorePct >= 70 ? '#16a34a' : scorePct >= 50 ? '#e08a1e' : '#e11d48';

  const scoreRing = (
    <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '74px', height: '74px', flexShrink: 0, borderRadius: '50%', background: `conic-gradient(${PUR} ${scorePct}%, #f4efe4 0)` }}>
      <span style={{ position: 'absolute', inset: '9px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,166,35,0.16)', color: '#e08a1e' }}>
          <DashIcon d="<circle cx='12' cy='12' r='9'/><path d='M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0'/>" s={20} stroke="#e08a1e" />
        </span>
      </span>
    </span>
  );

  const cardScore = uStat([
    <div key="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        {uLabel('Skin Health Score')}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: PUR, lineHeight: 1 }}>{scorePct}</span>
          <span style={{ fontSize: '0.95rem', color: '#8b8fa3', fontWeight: 600 }}>/100</span>
        </div>
        <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: scoreColor }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scoreColor }} />
          {scoreLabel}
        </div>
      </div>
      {scoreRing}
    </div>,
    <div key="foot" style={{ marginTop: '14px', fontSize: '0.76rem', fontWeight: 600 }}>
      <UpEl text="8% improvement this week" color="#16a34a" />
    </div>,
  ]);

  const currentSkinType = selectedSkinType || 'Combination';
  const cardType = uStat([
    uLabel('Skin Type'),
    <div key="val" style={{ fontSize: '1.3rem', fontWeight: 800, color: PUR, letterSpacing: '-0.01em' }}>{currentSkinType} Skin</div>,
    <div key="body" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.5rem' }}>
        {currentSkinType === 'Oily' ? '✨' : currentSkinType === 'Dry' ? '🌵' : currentSkinType === 'Sensitive' ? '🌸' : currentSkinType === 'Normal' ? '🌿' : '☯️'}
      </span>
      <div style={{ fontSize: '0.8rem', color: '#3f4a5a', lineHeight: 1.5 }}>
        <div>Dataset Verified</div><div>Click to edit profile</div>
      </div>
    </div>,
    <div key="link" onClick={() => setShowProfileEditModal(true)} style={{ cursor: 'pointer' }}>{uLink('Edit Skin Profile')}</div>,
  ]);

  const topConcern = selectedConcerns[0] || score?.detected_concerns?.[0] || 'Acne & Breakouts';
  const cardConcern = uStat([
    uLabel('Top Concerns'),
    <div key="body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ fontSize: '1.12rem', fontWeight: 800, color: PUR, lineHeight: 1.25 }}>{topConcern}</div>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px', background: 'rgba(244,86,143,0.12)', fontSize: '1.4rem' }}>
        🎯
      </span>
    </div>,
    <div key="link" onClick={() => setShowProfileEditModal(true)} style={{ cursor: 'pointer' }}>{uLink('Edit Concerns (' + selectedConcerns.length + ')')}</div>,
  ]);

  const cardAge = uStat([
    uLabel('Skin Age'),
    <div key="body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#171433', lineHeight: 1 }}>24</div>
      <span style={{ display: 'grid', placeItems: 'center', width: '42px', height: '42px', flexShrink: 0, borderRadius: '12px', background: 'rgba(59,157,248,0.12)', color: BLU }}>
        <DashIcon d={PATHS.scan} s={20} stroke={BLU} />
      </span>
    </div>,
    <div key="note" style={{ marginTop: '10px', fontSize: '0.8rem', color: '#8b8fa3' }}>Your actual age <b style={{ color: '#171433' }}>21</b></div>,
    uLink('View Details'),
  ]);

  const hydrationPct = score ? Math.round((score.hydration_subscore / 100) * 100) : 72;
  const waterL = ((hydrationPct / 100) * 3.0).toFixed(1);
  const cardHydration = uStat([
    uLabel('Hydration Level'),
    <div key="body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{hydrationPct >= 70 ? 'Good' : hydrationPct >= 50 ? 'Fair' : 'Low'}</div>
      <span style={{ display: 'grid', placeItems: 'center', width: '42px', height: '42px', flexShrink: 0, borderRadius: '12px', background: 'rgba(34,201,184,0.14)', color: TEA }}>
        <DashIcon d="<path d='M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z'/>" s={20} stroke={TEA} />
      </span>
    </div>,
    <div key="note" style={{ marginTop: '10px', fontSize: '0.8rem', color: '#3f4a5a' }}>Water Intake: <b style={{ color: '#171433' }}>{waterL} L</b> / 3.0 L</div>,
    <div key="bar" style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ flex: 1, height: '7px', borderRadius: '999px', background: '#f4efe4', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${hydrationPct}%`, borderRadius: '999px', background: 'linear-gradient(90deg,#22c9b8,#16a34a)' }} />
      </span>
      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#171433' }}>{hydrationPct}%</span>
    </div>,
  ]);

  // ── Routine Steps ─────────────────────────────────────────────────────────────
  const routineStep = (label: string, emoji: string, done: number, fil?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '58px' }}>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '46px', height: '46px', borderRadius: '50%', background: done ? 'rgba(47,107,76,0.1)' : '#f4f5fa', fontSize: '1.3rem' }}>
        <span style={{ opacity: done ? 1 : 0.4, filter: fil || 'none' }}>{emoji}</span>
        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', display: 'grid', placeItems: 'center', width: '17px', height: '17px', borderRadius: '50%', background: done ? '#22c55e' : '#e2e5ee', color: '#fff', border: '2px solid #fff' }}>
          {done ? <DashIcon d="<path d='M20 6 9 17l-5-5'/>" s={9} stroke="#fff" sw={3} /> : null}
        </span>
      </span>
      <span style={{ fontSize: '0.74rem', color: '#3f4a5a', fontWeight: 500 }}>{label}</span>
    </div>
  );

  const arrow = (
    <span style={{ color: '#d2d6e2', alignSelf: 'flex-start', marginTop: '14px', flex: 1, display: 'flex', justifyContent: 'center' }}>
      <DashIcon d="<path d='M2 12h20M17 8l4 4-4 4'/>" s={24} stroke="#d2d6e2" sw={1.5} />
    </span>
  );

  const amSteps = routine.filter(r => r.time_of_day === 'AM').sort((a, b) => a.step_number - b.step_number);
  const pmSteps = routine.filter(r => r.time_of_day === 'PM').sort((a, b) => a.step_number - b.step_number);
  const nightSteps = routine.filter(r => r.time_of_day === 'Weekly').sort((a, b) => a.step_number - b.step_number);

  const renderRoutineRow = (steps: RoutineStep[], fallback: string[][]) => {
    const items = steps.length ? steps.map(s => [s.step_category, STEP_EMOJI[s.step_category] || '✨']) : fallback;
    return (
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2px' }}>
        {items.map((s, i) => (
          <React.Fragment key={i}>
            {routineStep(s[0], s[1], 1)}
            {i < items.length - 1 && arrow}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const routineCard = (
    <Card style={{ minHeight: '486px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 700, color: '#171433', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <DashIcon d={PATHS.spark} s={18} stroke={ORA} /> Today's Routine
      </h3>
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: ORA }}>
        <span style={{ fontSize: '1rem' }}>☀️</span> Morning Routine
      </div>
      {renderRoutineRow(amSteps, DEFAULT_AM)}
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: PUR, borderTop: '1px solid #edeef4', paddingTop: '8px' }}>
        <span style={{ fontSize: '1rem' }}>🏮</span> Evening Routine
      </div>
      {renderRoutineRow(pmSteps, DEFAULT_PM)}
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#3b9df8', borderTop: '1px solid #edeef4', paddingTop: '8px' }}>
        <span style={{ fontSize: '1rem' }}>🌙</span> Night Routine
      </div>
      {renderRoutineRow(nightSteps, [['Retinol','🧪'],['Night Cream','🫙'],['Lip Mask','💄'],['Sleep','😴']])}
      <div style={{ marginTop: 'auto', paddingTop: '14px', textAlign: 'center', padding: '10px 12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View Full Routine →
      </div>
    </Card>
  );

  // ── Progress Chart ────────────────────────────────────────────────────────────
  const chartVals = analytics?.score_history?.length
    ? analytics.score_history.map(h => h.score)
    : [50, 52, 55, 53, 58, 62, 60, 65, 63, 68, 70, 66, 72, 75, 78];

  const progressCard = (
    <Card style={{ minHeight: '486px', display: 'flex', flexDirection: 'column' }}>
      <CardHead title="Skin Health Progress" right={<span style={{ fontSize: '0.76rem', fontWeight: 600, color: PUR }}>This Month</span>} />
      <ChartFrame
        chart={{ el: <LineChart vals={chartVals} min={0} max={100} /> }}
        yLabels={['100', '75', '50', '25', '0']}
        xLabels={['May 1', 'May 7', 'May 14', 'May 21']}
        h={320}
      />
      <div style={{ marginTop: 'auto', paddingTop: '16px', fontSize: '0.8rem', color: '#8b8fa3' }}>
        Your skin health has improved by 12% this month.
      </div>
    </Card>
  );

  const insightsCard = (
    <Card style={{ minHeight: '486px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <DashIcon d={PATHS.spark} s={18} stroke={PUR} /> AI Skin Insights
      </h3>
      <div style={{ borderRadius: '14px', background: 'linear-gradient(120deg,#e8f0ea,#f1f6f2)', border: '1px solid #cfe0d4', padding: '14px', display: 'flex', gap: '11px' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', flexShrink: 0, borderRadius: '10px', background: '#fff', fontSize: '1.05rem' }}>💧</span>
        <div style={{ fontSize: '0.82rem', color: '#4b4b63', lineHeight: 1.5 }}>
          Your skin shows signs of dehydration. Increase water intake and use a hydrating serum with <b style={{ color: '#171433' }}>Hyaluronic Acid</b>.
        </div>
      </div>
      <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {[['☀️','Use sunscreen daily to prevent pigmentation.'],['✅','Consistency in routine is improving your skin!'],['🧪','Consider Niacinamide for better results on post acne marks.'],['💧','Stay hydrated — aim for 2.5 L of water each day.'],['🌙','Prioritise 7–8 hours of sleep for skin repair.']].map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: '0px', fontSize: '1rem', lineHeight: 1.3 }}>{r[0]}</span>
            <span style={{ fontSize: '0.82rem', color: '#4b4b63', lineHeight: 1.4 }}>{r[1]}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '14px', background: 'linear-gradient(120deg,#16a34a,#22c9b8)', padding: '14px 16px' }}>
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🌟</span>
        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
          Your skin is on track — keep your routine consistent for the next 2 weeks to reach a 85+ score.
        </span>
      </div>
      <div style={{ marginTop: '14px', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View All Insights →
      </div>
    </Card>
  );

  // ── Recommended Products ──────────────────────────────────────────────────────
  const [realRecommendations, setRealRecommendations] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    api.getRecommendations().then(d => {
      if (d && d.products && d.products.length > 0) {
        setRealRecommendations(d.products);
      }
    }).catch(() => {});
  }, []);

  const staticProducts: [string, string, string, number, string][] = [
    ['Minimalist 2% Salicylic Acid Face Wash', '₹349', '4.6', 1, PRODIMG[0]],
    ['The Ordinary Niacinamide 10% + Zinc 1%', '₹550', '4.7', 0, PRODIMG[1]],
    ['La Roche-Posay Effaclar Duo+ Moisturizer', '₹1,250', '4.5', 0, PRODIMG[2]],
    ['Fixderma Shadow SPF 50+ Gel Sunscreen', '₹599', '4.5', 0, PRODIMG[3]],
    ['Minimalist Hyaluronic Acid 2% Serum', '₹599', '4.6', 0, PRODIMG[4]],
  ];

  const displayProducts = realRecommendations.length > 0
    ? realRecommendations.slice(0, 8).map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand || 'SkinSAFE Verified',
        category: p.category || 'Skincare',
        usageType: p.usage_type || 'Face',
        price: p.price != null ? `₹${Math.round(p.price)}` : 'Price unavailable',
        rating: String(p.rating || 4.6),
        safetyScore: p.safety_score || 92.0,
        isBest: p.is_best_match ? 1 : 0,
        img: p.image_url || PRODIMG[0],
        productUrl: p.product_url || '',
        ingredients: p.active_ingredients?.length ? p.active_ingredients.join(', ') : 'Water, Glycerin, Niacinamide, Ceramides, Citric Acid',
        matchLabel: p.match_label || '85% Match'
      }))
    : staticProducts.map(p => ({
        id: p[0],
        name: p[0],
        brand: 'Miracle Science',
        category: 'Skincare Treatment',
        usageType: 'Facial Care',
        price: p[1],
        rating: p[2],
        safetyScore: 94.0,
        isBest: p[3],
        img: p[4],
        productUrl: 'https://www.skinsafeproducts.com',
        ingredients: 'Salicylic Acid, Niacinamide, Hyaluronic Acid, Ceramides',
        matchLabel: 'Best Match'
      }));

  const scrollProds = (dir: 'left' | 'right') => {
    if (prodScrollRef.current) prodScrollRef.current.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const productDetailModal = selectedProduct && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
      <div style={{ width: '560px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PUR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedProduct.brand} · {selectedProduct.category}</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#171433', lineHeight: 1.25 }}>{selectedProduct.name}</h3>
          </div>
          <button onClick={() => setSelectedProduct(null)} style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3', flexShrink: 0 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', padding: '16px', borderRadius: '16px', background: '#f6f7fb', marginBottom: '18px' }}>
          <img src={selectedProduct.img} alt={selectedProduct.name} onError={(e) => { (e.target as HTMLImageElement).src = PRODIMG[0]; }} style={{ width: '110px', height: '110px', objectFit: 'contain', borderRadius: '12px', background: '#fff', padding: '6px' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ padding: '3px 10px', borderRadius: '999px', background: 'rgba(34,197,94,0.14)', color: '#16a34a', fontSize: '0.76rem', fontWeight: 700 }}>Safety Score: {selectedProduct.safetyScore}/100</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e08a1e' }}>⭐ {selectedProduct.rating}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#3f4a5a' }}>Usage Type: <b>{selectedProduct.usageType}</b></div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#171433' }}>{selectedProduct.price}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#171433', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full INCI Ingredients List</div>
            <div style={{ fontSize: '0.82rem', color: '#4b4b63', lineHeight: 1.5, background: '#fafbfc', padding: '12px', borderRadius: '12px', border: '1px solid #edeef4', maxHeight: '140px', overflowY: 'auto' }}>
              {selectedProduct.ingredients}
            </div>
          </div>

          {selectedProduct.productUrl && selectedProduct.productUrl.startsWith('http') && (
            <a href={selectedProduct.productUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', background: PUR, color: '#fff', textDecoration: 'none', fontSize: '0.86rem', fontWeight: 700, textAlign: 'center' }}>
              View Verified Source Page ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );

  const productsCard = (
    <Card>
      <CardHead title="Recommended Products for You" right={<span style={{ fontSize: '0.82rem', fontWeight: 600, color: PUR, cursor: 'pointer' }}>View All</span>} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
        <button type="button" aria-label="Slide Left" onClick={() => scrollProds('left')} style={{ position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', color: '#3f4a5a', boxShadow: '0 4px 12px -6px rgba(23,20,51,0.3)', transition: 'all 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fc'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <div ref={prodScrollRef} style={{ display: 'grid', gap: '12px', gridTemplateColumns: `repeat(${displayProducts.length},minmax(0,1fr))`, flex: 1, padding: '0 8px', overflowX: 'auto', scrollbarWidth: 'none', scrollBehavior: 'smooth' }} className="no-scrollbar">
          {displayProducts.map((p, i) => (
            <div key={i} onClick={() => setSelectedProduct(p)} style={{ borderRadius: '16px', border: '1px solid #edeef4', overflow: 'hidden', background: '#fff', minWidth: '180px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#edeef4'; }}>
              <div style={{ position: 'relative', height: '150px', background: '#f6f7fb' }}>
                <img src={p.img} alt={p.name} onError={(e) => { (e.target as HTMLImageElement).src = PRODIMG[i % PRODIMG.length]; }} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: '8px', boxSizing: 'border-box' }} />
                {p.isBest ? <span style={{ position: 'absolute', top: '8px', left: '8px', borderRadius: '999px', background: '#22c55e', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '3px 9px' }}>{p.matchLabel}</span> : null}
              </div>
              <div style={{ padding: '11px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#171433', lineHeight: 1.3, minHeight: '48px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#171433' }}>{p.price}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 600, color: '#e08a1e' }}>
                    <DashIcon d={PATHS.star} s={11} stroke="#f5a623" fill="#f5a623" sw={1} />{p.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" aria-label="Slide Right" onClick={() => scrollProds('right')} style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #edeef4', background: '#fff', cursor: 'pointer', color: '#3f4a5a', boxShadow: '0 4px 12px -6px rgba(23,20,51,0.3)', transition: 'all 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fc'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    </Card>
  );

  // ── Skin Concerns Donut ───────────────────────────────────────────────────────
  const concernsCard = (
    <Card>
      <CardHead title="Skin Concerns Overview" right={<span style={{ fontSize: '0.82rem', fontWeight: 600, color: PUR }}>View Details</span>} />
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '28px', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '12px' }}>
        <DonutChart segs={[{ pct: 40, color: PUR }, { pct: 25, color: PNK }, { pct: 15, color: ORA }, { pct: 10, color: '#22c55e' }, { pct: 10, color: TEA }]} center="Primary" sub="Concerns" size={230} />
        <Legend rows={[['Acne', '40%', PUR], ['Post Acne Marks', '25%', PNK], ['Uneven Tone', '15%', ORA], ['Oiliness', '10%', '#22c55e'], ['Redness', '10%', TEA]]} />
      </div>
    </Card>
  );

  // ── Interactive Daily Checklist ───────────────────────────────────────────────
  const CHECKLIST_ITEMS = ['Morning Routine', 'Drink Water (8 glasses)', 'Sunscreen Applied', 'Night Routine', '8 hrs Sleep'];

  const toggleStep = async (item: string) => {
    const updated = completedSteps.includes(item) ? completedSteps.filter(s => s !== item) : [...completedSteps, item];
    setCompletedSteps(updated);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.logRoutineProgress({ log_date: today, completed_steps: updated, water_intake_ml: 2500, sleep_hours: 7.5 });
    } catch { /* silent */ }
  };

  const checklistCard = (
    <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.28)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(47,107,76,0.12)', color: PUR }}>
          <DashIcon d={PATHS.clip} s={18} stroke={PUR} />
        </span>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171433' }}>Daily Checklist</div>
          <div style={{ fontSize: '0.76rem', color: '#8b8fa3' }}>{completedSteps.length} / {CHECKLIST_ITEMS.length} tasks completed</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: '160px', height: '8px', borderRadius: '999px', background: '#f4efe4', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${(completedSteps.length / CHECKLIST_ITEMS.length) * 100}%`, borderRadius: '999px', background: 'linear-gradient(90deg,#3f8a63,#2f6b4c)', transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
        {CHECKLIST_ITEMS.map((c, i) => {
          const done = completedSteps.includes(c);
          return (
            <span key={i} onClick={() => toggleStep(c)} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', color: done ? '#171433' : '#a3a7bd', cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '18px', height: '18px', borderRadius: '50%', background: done ? '#22c55e' : 'transparent', border: done ? 'none' : '1.6px solid #d2d6e2', color: '#fff', transition: 'all 0.2s' }}>
                {done ? <DashIcon d="<path d='M20 6 9 17l-5-5'/>" s={10} stroke="#fff" sw={3} /> : null}
              </span>
              {c}
            </span>
          );
        })}
      </div>
    </div>
  );

  // ── Consultation Booking ──────────────────────────────────────────────────────
  const submitAppointment = async () => {
    if (!selectedPro || !apptDate || !apptTime) return;
    setApptLoading(true);
    try {
      await api.requestAppointment({ target_role: selectedPro.target_role, preferred_date: apptDate, preferred_time: apptTime, user_notes: apptNotes });
      setApptSuccess(true);
      const updated = await api.getMyAppointments();
      setAppointments(updated);
      setTimeout(() => { setApptSuccess(false); setShowConsultModal(false); setSelectedPro(null); setApptDate(''); setApptTime(''); setApptNotes(''); }, 2200);
    } catch { /* silent */ }
    finally { setApptLoading(false); }
  };

  const consultModal = showConsultModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) { setShowConsultModal(false); setSelectedPro(null); } }}>
      <div style={{ width: '540px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#171433' }}>Book a Consultation</div>
            <div style={{ fontSize: '0.82rem', color: '#8b8fa3', marginTop: '2px' }}>Select a professional and your preferred time</div>
          </div>
          <button onClick={() => { setShowConsultModal(false); setSelectedPro(null); }} style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '1rem', color: '#8b8fa3' }}>×</button>
        </div>

        {!selectedPro ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {PROFESSIONALS.map(pro => (
              <div key={pro.id} onClick={() => setSelectedPro(pro)} style={{ display: 'flex', gap: '14px', alignItems: 'center', borderRadius: '16px', border: '1px solid #edeef4', padding: '16px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PUR; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${PUR}22`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#edeef4'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                <img src={pro.avatar} alt={pro.name} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171433' }}>{pro.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#7c8199', marginTop: '2px' }}>{pro.title}</div>
                  <div style={{ fontSize: '0.76rem', color: PUR, marginTop: '4px', fontWeight: 600 }}>{pro.specialty}</div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.74rem', color: '#8b8fa3' }}>
                    <span>⭐ {pro.rating}</span>
                    <span>📅 {pro.availability}</span>
                  </div>
                </div>
                <DashIcon d="<path d='M9 6l6 6-6 6'/>" s={18} stroke="#d2d6e2" />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setSelectedPro(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: PUR, padding: '0 0 16px', fontFamily: 'inherit' }}>
              ← Back to professionals
            </button>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '14px', borderRadius: '14px', background: '#f6f7fb', marginBottom: '18px' }}>
              <img src={selectedPro.avatar} alt={selectedPro.name} style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#171433' }}>{selectedPro.name}</div>
                <div style={{ fontSize: '0.76rem', color: '#7c8199' }}>{selectedPro.specialty}</div>
              </div>
            </div>
            {apptSuccess ? (
              <div style={{ padding: '18px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                ✅ Appointment requested successfully!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>PREFERRED DATE</label>
                  <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', color: '#171433', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>PREFERRED TIME</label>
                  <input type="text" placeholder="e.g. 10:30 AM" value={apptTime} onChange={e => setApptTime(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', color: '#171433', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>NOTES (OPTIONAL)</label>
                  <textarea placeholder="Describe your skin concerns..." value={apptNotes} onChange={e => setApptNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', resize: 'vertical', color: '#171433', boxSizing: 'border-box' }} />
                </div>
                <button onClick={submitAppointment} disabled={apptLoading || !apptDate || !apptTime} style={{ padding: '13px 24px', borderRadius: '12px', background: apptLoading ? '#a3a7bd' : PUR, border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: apptLoading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                  {apptLoading ? 'Requesting…' : 'Request Appointment'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── My Appointments ───────────────────────────────────────────────────────────
  const myAppointmentsSection = appointments.length > 0 && (
    <div style={{ borderRadius: '18px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.28)', padding: '18px 22px' }}>
      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171433', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <DashIcon d={PATHS.cal} s={16} stroke={PUR} /> My Consultation Sessions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {appointments.slice(0, 3).map(appt => (
          <div key={appt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: '#f6f7fb', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>{appt.target_role} Consultation</div>
              <div style={{ fontSize: '0.74rem', color: '#8b8fa3', marginTop: '2px' }}>{appt.preferred_date} at {appt.preferred_time}</div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: `${STATUS_COLOR[appt.status]}18`, color: STATUS_COLOR[appt.status] || '#8b8fa3', whiteSpace: 'nowrap' }}>
              {appt.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Book Consultation Button ──────────────────────────────────────────────────
  const bookButton = (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button onClick={() => setShowConsultModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '12px', background: PUR, border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: `0 8px 24px -8px ${PUR}66`, transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
        <DashIcon d="<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M22 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/>" s={16} stroke="#fff" />
        Book a Consultation
      </button>
    </div>
  );

  // ── Profile Edit Modal (Image-based 1-SkinType & Multi-Concern Selection) ──
  const saveProfileHandler = async () => {
    setProfileSaving(true);
    try {
      await api.updateProfile({ skin_type: selectedSkinType, concerns: selectedConcerns });
      setProfileSaveSuccess(true);
      // Reload recommendations and routine live
      api.getRecommendations({ skin_type: selectedSkinType }).then(d => {
        if (d?.products) setRealRecommendations(d.products);
      }).catch(() => {});
      api.getRoutine().then(setRoutineData).catch(() => {});
      setTimeout(() => { setProfileSaveSuccess(false); setShowProfileEditModal(false); }, 1500);
    } catch {} finally { setProfileSaving(false); }
  };

  const toggleConcern = (title: string) => {
    setSelectedConcerns(prev =>
      prev.includes(title) ? (prev.length > 1 ? prev.filter(c => c !== title) : prev) : [...prev, title]
    );
  };

  const profileEditModal = showProfileEditModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowProfileEditModal(false); }}>
      <div style={{ width: '640px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#171433' }}>My Skin Profile & Concerns</div>
            <div style={{ fontSize: '0.8rem', color: '#8b8fa3', marginTop: '2px' }}>Dataset-backed visual skin profile customization</div>
          </div>
          <button onClick={() => setShowProfileEditModal(false)} style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3' }}>×</button>
        </div>

        {profileSaveSuccess ? (
          <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
            ✅ Skin Profile & Concerns updated successfully!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Section 1: Skin Type (Exactly ONE selection) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#171433', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Select Your Skin Type (Choose Exactly 1)</span>
                <span style={{ fontSize: '0.74rem', color: PUR, fontWeight: 600 }}>Active: {selectedSkinType}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' }}>
                {(skinTypesDataset.length ? skinTypesDataset : [
                  { title: 'Normal Skin', backend_enum: 'Normal', description: 'Well-balanced moisture & sebum', icon: '🌿' },
                  { title: 'Dry Skin', backend_enum: 'Dry', description: 'Feels tight or flaky', icon: '🌵' },
                  { title: 'Oily Skin', backend_enum: 'Oily', description: 'Excess shine & enlarged pores', icon: '✨' },
                  { title: 'Combination', backend_enum: 'Combination', description: 'Oily T-zone & normal cheeks', icon: '☯️' },
                  { title: 'Sensitive', backend_enum: 'Sensitive', description: 'Easily turns red or reacts', icon: '🌸' },
                ]).map((st: any) => {
                  const val = st.backend_enum || st.title.replace(' Skin', '');
                  const isSelected = selectedSkinType === val;
                  return (
                    <div
                      key={val}
                      onClick={() => setSelectedSkinType(val)}
                      style={{
                        borderRadius: '14px',
                        border: `2px solid ${isSelected ? PUR : '#edeef4'}`,
                        background: isSelected ? 'rgba(47,107,76,0.06)' : '#fafbfc',
                        padding: '12px 8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 0 0 3px ${PUR}22` : 'none'
                      }}
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>{st.icon || (val === 'Oily' ? '✨' : val === 'Dry' ? '🌵' : val === 'Sensitive' ? '🌸' : val === 'Normal' ? '🌿' : '☯️')}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? PUR : '#171433', marginBottom: '4px' }}>{st.title}</div>
                      <div style={{ fontSize: '0.68rem', color: '#8b8fa3', lineHeight: 1.25 }}>{st.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Skin Concerns (MULTIPLE selections) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#171433', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Select Skin Concerns (Multiple Allowed)</span>
                <span style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>Selected: {selectedConcerns.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                {(skinConcernsDataset.length ? skinConcernsDataset : [
                  { title: 'Acne & Breakouts', description: 'Whiteheads, blackheads or pimples', icon: '🎯' },
                  { title: 'Dark Spots & Pigmentation', description: 'Sun spots & post-acne marks', icon: '☀️' },
                  { title: 'Redness & Sensitivity', description: 'Flushed patches or blotchiness', icon: '🌸' },
                  { title: 'Fine Lines & Wrinkles', description: 'Smile lines or loss of elasticity', icon: '⏳' },
                  { title: 'Dryness & Dehydration', description: 'Flaky patches or tight skin', icon: '💧' },
                ]).map((sc: any) => {
                  const isSelected = selectedConcerns.includes(sc.title);
                  return (
                    <div
                      key={sc.title}
                      onClick={() => toggleConcern(sc.title)}
                      style={{
                        borderRadius: '14px',
                        border: `2px solid ${isSelected ? PUR : '#edeef4'}`,
                        background: isSelected ? 'rgba(47,107,76,0.06)' : '#fafbfc',
                        padding: '12px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 0 0 3px ${PUR}22` : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{sc.icon || '✨'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? PUR : '#171433' }}>{sc.title}</div>
                        <div style={{ fontSize: '0.68rem', color: '#8b8fa3', lineHeight: 1.2 }}>{sc.description}</div>
                      </div>
                      <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isSelected ? PUR : '#d2d6e2'}`, background: isSelected ? PUR : '#fff', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {isSelected ? '✓' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={saveProfileHandler} disabled={profileSaving} style={{ padding: '13px', borderRadius: '12px', background: PUR, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: profileSaving ? 'not-allowed' : 'pointer' }}>
              {profileSaving ? 'Saving Profile…' : 'Save Skin Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Photo Assessment & Report Modal ──
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setPhotoPreview(res);
        setUploadedPhotoUrl(res);
      };
      reader.onerror = () => {
        alert('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const submitPhotoAssessment = async () => {
    setEvaluating(true);
    try {
      if (uploadedPhotoUrl) {
        await api.uploadPhoto({ image_url: uploadedPhotoUrl, tag: 'Baseline Photo' });
      }
      const res = await api.evaluateAssessment({
        skin_type: selectedSkinType,
        acne_severity: acneSeverity,
        hyperpigmentation_severity: pigmentationSeverity,
        redness_severity: rednessSeverity,
        wrinkles_severity: wrinklesSeverity,
        lifestyle: { sleep_hours: sleepHours, water_intake_liters: waterLiters }
      });
      setAssessmentReport(res);
      setScore({
        overall_score: res.overall_score,
        condition_subscore: res.condition_subscore,
        lifestyle_subscore: res.lifestyle_subscore,
        sleep_subscore: res.sleep_subscore,
        consistency_subscore: res.consistency_subscore,
        hydration_subscore: res.hydration_subscore,
        detected_concerns: res.detected_concerns
      });
      // Live reload routine and recommendations
      api.getRoutine().then(setRoutineData).catch(() => {});
      api.getRecommendations({ skin_type: selectedSkinType }).then(d => {
        if (d?.products) setRealRecommendations(d.products);
      }).catch(() => {});
    } catch {} finally { setEvaluating(false); }
  };

  const photoAssessmentModal = showAssessmentModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowAssessmentModal(false); }}>
      <div style={{ width: '640px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#171433' }}>Skin Photo Assessment</div>
            <div style={{ fontSize: '0.8rem', color: '#8b8fa3', marginTop: '2px' }}>Upload a facial scan to evaluate skin health & subscores</div>
          </div>
          <button onClick={() => setShowAssessmentModal(false)} style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3' }}>×</button>
        </div>

        {assessmentReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(47,107,76,0.08)', border: `1px solid ${PUR}33`, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: PUR }}>{Math.round(assessmentReport.overall_score)}/100</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433', marginTop: '2px' }}>Overall Skin Health Score</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f6f7fb' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171433' }}>{Math.round(assessmentReport.condition_subscore)}</div>
                <div style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>Condition</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f6f7fb' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171433' }}>{Math.round(assessmentReport.lifestyle_subscore)}</div>
                <div style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>Lifestyle</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f6f7fb' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171433' }}>{Math.round(assessmentReport.sleep_subscore)}</div>
                <div style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>Sleep</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f6f7fb' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171433' }}>{Math.round(assessmentReport.consistency_subscore)}</div>
                <div style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>Consistency</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f6f7fb' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171433' }}>{Math.round(assessmentReport.hydration_subscore)}</div>
                <div style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>Hydration</div>
              </div>
            </div>

            <button onClick={() => { setAssessmentReport(null); setShowAssessmentModal(false); }} style={{ padding: '12px', borderRadius: '12px', background: PUR, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
              View Assessment Dashboard Results
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Upload Area */}
            <div style={{ border: '2px dashed #d2d6e2', borderRadius: '16px', padding: '20px', textAlign: 'center', background: '#fafbfc' }}>
              {photoPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <img src={photoPreview} alt="Skin preview" style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '16px', border: '1px solid #edeef4' }} />
                  <label style={{ fontSize: '0.78rem', color: PUR, fontWeight: 700, cursor: 'pointer' }}>
                    Change Photo
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '2.2rem' }}>📸</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#171433' }}>Click to upload facial skin photo</span>
                  <span style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>Supports JPG, PNG (Facial scan image)</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '4px' }}>SLEEP HOURS (DAILY)</label>
                <input type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '4px' }}>WATER INTAKE (LITERS)</label>
                <input type="number" step="0.5" value={waterLiters} onChange={e => setWaterLiters(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.86rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={submitPhotoAssessment} disabled={evaluating} style={{ padding: '13px', borderRadius: '12px', background: evaluating ? '#a3a7bd' : PUR, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: evaluating ? 'not-allowed' : 'pointer' }}>
              {evaluating ? 'Analyzing Skin Photo & Metrics…' : 'Run Skin Assessment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {consultModal}
      {productDetailModal}
      {profileEditModal}
      {photoAssessmentModal}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
          {cardScore}{cardType}{cardConcern}{cardAge}{cardHydration}
        </div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3,1fr)' }}>
          {routineCard}{progressCard}{insightsCard}
        </div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'minmax(0,1.4fr) minmax(300px,1fr)' }}>
          {productsCard}{concernsCard}
        </div>
        {checklistCard}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowAssessmentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '12px', background: '#fff', border: `1px solid ${PUR}`, color: PUR, fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
            📷 Take Photo Assessment
          </button>
          {bookButton}
        </div>
        {myAppointmentsSection}
      </div>
    </>
  );
}
