import React, { useState, useEffect } from 'react';
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

interface RosterPatient { patient_id: string; name: string; email: string; skin_type: string; primary_concern: string; health_score: number; compliance_rate: number; last_assessment_date: string; }
interface PatientDetail { patient: any; assessments: any[]; active_routine: any[]; progress_photos: any[]; }

export function DermaWorkspace() {
  const [roster, setRoster] = useState<RosterPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [prescribePatientId, setPrescribePatientId] = useState<string | null>(null);
  const [docNotes, setDocNotes] = useState('');
  const [prescribeSuccess, setPrescribeSuccess] = useState(false);
  const [rxLoading, setRxLoading] = useState(false);

  useEffect(() => {
    api.getRoster().then(d => setRoster(d.patients || [])).catch(() => {});
  }, []);

  const openPatient = async (id: string) => {
    try { const d = await api.getPatientDetails(id); setSelectedPatient(d); } catch {}
  };

  const submitPrescription = async () => {
    if (!prescribePatientId || !docNotes) return;
    setRxLoading(true);
    try {
      await api.prescribeRoutine({
        patient_id: prescribePatientId,
        doctor_notes: docNotes,
        routine_steps: [
          { time_of_day: 'AM', step_number: 1, step_category: 'Cleansing', product_name: 'Gentle Hydrating Cleanser', active_ingredients: ['Ceramides', 'Glycerin'], prescribed_by_doctor: true, doctor_notes: docNotes },
          { time_of_day: 'AM', step_number: 2, step_category: 'Treatment', product_name: 'Azelaic Acid 10% Gel', active_ingredients: ['Azelaic Acid'], prescribed_by_doctor: true, doctor_notes: docNotes },
          { time_of_day: 'AM', step_number: 3, step_category: 'Sun Protection', product_name: 'Mineral SPF 50+', active_ingredients: ['Zinc Oxide'], prescribed_by_doctor: true, doctor_notes: docNotes },
          { time_of_day: 'PM', step_number: 1, step_category: 'Cleansing', product_name: 'Gentle Hydrating Cleanser', active_ingredients: ['Ceramides'], prescribed_by_doctor: true, doctor_notes: docNotes },
          { time_of_day: 'PM', step_number: 2, step_category: 'Treatment', product_name: 'Adaplene 0.1% Gel (Prescription)', active_ingredients: ['Adapalene'], prescribed_by_doctor: true, doctor_notes: docNotes },
        ]
      });
      setPrescribeSuccess(true);
      setTimeout(() => { setPrescribePatientId(null); setPrescribeSuccess(false); setDocNotes(''); }, 2000);
    } catch {} finally { setRxLoading(false); }
  };

  const tableTitle = 'Patients Overview';
  const tableRight = (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
      View All Patients <DashIcon d="<path d='M5 12h14M13 6l6 6-6 6'/>" s={13} sw={2} stroke={PUR} />
    </span>
  );

  const STATIC_ROWS = [
    [FACE.ananya, 'Ananya Verma', '24, Female', 'Acne & Post Acne Marks', 78, 'May 18, 2025', 'active', 'May 28, 2025', ''],
    [FACE.neha, 'Neha Gupta', '28, Female', 'Acne', 65, 'May 15, 2025', 'active', 'May 25, 2025', ''],
    [FACE.rohit, 'Rohit Sharma', '32, Male', 'Hair Fall & Dandruff', 82, 'May 16, 2025', 'active', 'May 30, 2025', ''],
    [FACE.meera, 'Meera Nair', '26, Female', 'Sensitive Skin & Redness', 70, 'May 10, 2025', 'due', 'May 22, 2025', ''],
    [FACE.kavya, 'Kavya Nair', '32, Female', 'Hyperpigmentation', 76, 'May 12, 2025', 'active', 'May 24, 2025', ''],
  ];

  const rows = roster.length
    ? roster.map(p => [FACE.ananya, p.name, p.email, p.primary_concern, Math.round(p.health_score), p.last_assessment_date, p.compliance_rate >= 70 ? 'active' : 'due', '—', p.patient_id])
    : STATIC_ROWS;

  const cols = ['Patient', 'Age / Gender', 'Primary Concern', 'Skin Health Score', 'Last Assessment', 'Status', 'Next Follow-up', ''];

  const scoreRing = (v: number) => {
    const color = v >= 75 ? GRN : ORA;
    return (
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%', background: `conic-gradient(${color} ${v}%, #f4efe4 0)` }}>
        <span style={{ position: 'absolute', inset: '4px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#171433' }}>
          {v}
        </span>
      </span>
    );
  };

  const avatarRow = (src: string, name: string, subtitle: string) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
      <span style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0, borderRadius: '11px', overflow: 'hidden', background: '#e9eaf5' }}>
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
      <span style={{ lineHeight: '1.3' }}>
        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#171433', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ display: 'block', fontSize: '0.74rem', color: '#8b8fa3', whiteSpace: 'nowrap' }}>{subtitle}</span>
      </span>
    </span>
  );

  const statusChip = (text: string, kind: string) => {
    const isDue = kind === 'due';
    const bg = isDue ? '#fdf3e0' : '#e7f7ee';
    const color = isDue ? '#d99a0b' : '#16a34a';
    return (
      <span style={{ display: 'inline-block', borderRadius: '999px', background: bg, color, padding: '4px 12px', fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {text}
      </span>
    );
  };

  const scoreChip = (score: string, label: string, kind: string) => {
    const isFair = kind === 'fair';
    const bg = isFair ? '#fdf3e0' : '#e7f7ee';
    const color = isFair ? '#d99a0b' : '#16a34a';
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: '58px', borderRadius: '10px', background: bg, color, padding: '6px 10px', lineHeight: 1.2 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{score}</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{label}</span>
      </span>
    );
  };

  const table = (
    <Card>
      <CardHead title={tableTitle} right={tableRight} />
      <div className="dash-scroll" style={{ overflowX: 'auto', overflowY: 'hidden', paddingTop: '4px', paddingBottom: '6px', marginBottom: '-4px' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '860px', width: '100%' }}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} style={{ textAlign: i === 3 || i === 5 ? 'center' : 'left', padding: '0 18px 16px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}>
                <td style={{ padding: '14px 18px' }}>{avatarRow(String(r[0]), String(r[1]), String(r[2]))}</td>
                <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a' }}>{String(r[2])}</td>
                <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a' }}>{String(r[3])}</td>
                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {scoreRing(Number(r[4]))}
                    <span style={{ fontSize: '0.7rem', color: '#8b8fa3' }}>/100</span>
                  </span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>{String(r[5])}</td>
                <td style={{ padding: '14px 18px', textAlign: 'center' }}>{statusChip(r[6] === 'due' ? 'Follow-up Due' : 'Active', String(r[6]))}</td>
                <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>{String(r[7])}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', display: 'flex', gap: '6px' }}>
                  {r[8] ? (
                    <>
                      <button onClick={() => openPatient(String(r[8]))} style={{ padding: '5px 10px', borderRadius: '8px', border: `1px solid ${PUR}`, background: 'transparent', color: PUR, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                      <button onClick={() => setPrescribePatientId(String(r[8]))} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #edeef4', background: '#f6f7fb', color: '#3f4a5a', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Prescribe</button>
                    </>
                  ) : (
                    <DashIcon d="<circle cx='12' cy='5' r='1.6'/><circle cx='12' cy='12' r='1.6'/><circle cx='12' cy='19' r='1.6'/>" s={16} stroke="#b8bccc" fill="#b8bccc" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const dist = (
    <Card>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Skin Concerns Distribution</h3>
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '18px', alignItems: 'center' }}>
        <DonutChart
          segs={[
            { pct: 24, color: PUR },
            { pct: 18, color: BLU },
            { pct: 14, color: ORA },
            { pct: 13, color: PNK },
            { pct: 12, color: TEA },
            { pct: 19, color: GRY },
          ]}
          center="156"
          sub="Total Patients"
          size={140}
        />
        <Legend
          rows={[
            ['Acne & Post Acne Marks', '38 (24%)', PUR],
            ['Hyperpigmentation', '28 (18%)', BLU],
            ['Dryness', '22 (14%)', ORA],
            ['Sensitive Skin', '20 (13%)', PNK],
            ['Oily Skin', '18 (12%)', TEA],
            ['Others', '30 (19%)', GRY],
          ]}
        />
      </div>
    </Card>
  );

  const topConcerns = (
    <Card style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Top Skin Concerns</h3>
      <Bars
        rows={[
          ['Acne & Post Acne Marks', 42],
          ['Hyperpigmentation', 24],
          ['Dryness', 18],
          ['Sensitive Skin & Redness', 12],
          ['Uneven Skin Tone', 9],
        ]}
      />
    </Card>
  );

  const progress = (
    <Card style={{ height: '100%' }}>
      <CardHead title="Patient Progress Overview" right={<span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7189' }}>This Month</span>} />
      <ChartFrame
        chart={{ el: <LineChart vals={[30, 38, 34, 45, 52, 48, 60, 68, 58, 66, 62, 70, 64, 68]} min={0} max={100} /> }}
        yLabels={['100%', '75%', '50%', '25%', '0%']}
        xLabels={['May 1', 'May 7', 'May 14', 'May 21', 'May 28']}
        h={150}
      />
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f2f7', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          ['68%', 'Avg. Improvement', '8%', 1],
          ['106', 'Patients Improved', '12%', 1],
          ['28', 'Stable', '', 2],
          ['22', 'Need Attention', '6%', 0],
        ].map((s, i) => (
          <div key={i} style={{ padding: i === 0 ? '0 10px 0 0' : '0 10px', borderLeft: i === 0 ? 'none' : '1px solid #f1f2f7', minWidth: 0 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: s[3] === 1 ? '#16a34a' : s[3] === 0 ? '#ef4444' : '#171433', lineHeight: 1.1 }}>{s[0]}</div>
            <div style={{ fontSize: '0.66rem', color: '#8b8fa3', margin: '4px 0 5px', lineHeight: 1.25 }}>{s[1]}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600 }}>{s[2] ? <UpEl text={String(s[2])} color={s[3] ? '#16a34a' : '#ef4444'} /> : '—'}</div>
          </div>
        ))}
      </div>
    </Card>
  );

  const recent = (
    <Card style={{ paddingBottom: '10px', display: 'flex', flexDirection: 'column' }}>
      <CardHead title="Recent Assessments" right={<span style={{ fontSize: '0.82rem', fontWeight: 600, color: PUR }}>View All</span>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '4px', paddingBottom: '2px' }}>
        {[
          [FACE.ananya, 'Ananya Verma', 'May 21, 2025 · 10:30 AM', '78/100', 'Good', 'good'],
          [FACE.neha, 'Neha Gupta', 'May 21, 2025 · 09:15 AM', '65/100', 'Fair', 'fair'],
          [FACE.riya, 'Riya Singh', 'May 20, 2025 · 04:45 PM', '82/100', 'Good', 'good'],
          [FACE.meera, 'Meera Nair', 'May 20, 2025 · 03:20 PM', '70/100', 'Fair', 'fair'],
          [FACE.rohit, 'Rohit Sharma', 'May 20, 2025 · 11:30 AM', '76/100', 'Good', 'good'],
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            {avatarRow(String(a[0]), String(a[1]), String(a[2]))}
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {scoreChip(String(a[3]), String(a[4]), String(a[5]))}
              <DashIcon d="<path d='m9 6 6 6-6 6'/>" s={15} stroke="#c4c9da" sw={2} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );

  const followups = (
    <Card style={{ paddingBottom: '10px', display: 'flex', flexDirection: 'column' }}>
      <CardHead title="Upcoming Follow-ups" right={<span style={{ fontSize: '0.82rem', fontWeight: 600, color: PUR }}>View Calendar</span>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '4px', paddingBottom: '2px' }}>
        {[
          ['Ananya Verma', 'May 28, 2025 · 10:00 AM', '7 days left'],
          ['Neha Gupta', 'May 25, 2025 · 11:00 AM', '4 days left'],
          ['Meera Nair', 'May 22, 2025 · 03:30 PM', 'Tomorrow'],
          ['Kavya Nair', 'May 24, 2025 · 09:30 AM', '3 days left'],
          ['Riya Singh', 'May 30, 2025 · 12:00 PM', '9 days left'],
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(47,107,76,0.1)', color: PUR, flexShrink: 0 }}>
                <DashIcon d={PATHS.cal} s={17} stroke={PUR} />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#171433' }}>{a[0]}</span>
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#8b8fa3' }}>{a[1]}</span>
              </span>
            </span>
            <span style={{ borderRadius: '999px', background: 'rgba(47,107,76,0.1)', color: PUR, padding: '4px 11px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {a[2]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );

  const banner = (
    <div style={{ borderRadius: '18px', border: '1px solid #cfe0d4', background: 'linear-gradient(120deg,#e8f0ea,#f1f6f2)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', flexShrink: 0, borderRadius: '13px', background: '#fff', color: PUR }}>
        <DashIcon d={PATHS.spark} s={20} stroke={PUR} />
      </span>
      <div style={{ flex: 1, minWidth: '240px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: PUR, marginBottom: '4px' }}>AI Clinical Insights</div>
        <div style={{ fontSize: '0.84rem', color: '#4b4b63', lineHeight: 1.5 }}>
          3 patients are at high risk of acne flare-up due to inconsistent routine. 2 patients showing excellent improvement. Consider maintenance routine.
        </div>
      </div>
      <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', border: 'none', cursor: 'pointer', borderRadius: '11px', background: '#fff', color: PUR, padding: '11px 18px', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700, boxShadow: '0 6px 18px -8px rgba(47,107,76,0.5)' }}>
        View AI Insights <DashIcon d={PATHS.spark} s={14} stroke={PUR} />
      </button>
    </div>
  );

  const patientModal = selectedPatient && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelectedPatient(null); }}>
      <div style={{ width: '600px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#171433' }}>{selectedPatient.patient.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#8b8fa3' }}>{selectedPatient.patient.email} · Skin Type: <b>{selectedPatient.patient.profile?.skin_type || 'Oily'}</b></div>
          </div>
          <button onClick={() => setSelectedPatient(null)} style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '1rem', color: '#8b8fa3' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ padding: '16px', borderRadius: '16px', background: '#f6f7fb' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: PUR, marginBottom: '8px' }}>Active Skincare Routine ({selectedPatient.active_routine.length} Steps)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedPatient.active_routine.map((r: any) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#3f4a5a' }}>
                  <span><b>{r.time_of_day}</b> Step {r.step_number}: {r.step_category} ({r.product_name})</span>
                  {r.prescribed_by_doctor && <span style={{ color: PUR, fontWeight: 700 }}>Rx Doctor</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433', marginBottom: '8px' }}>Progress Photos ({selectedPatient.progress_photos.length})</div>
            {selectedPatient.progress_photos.length ? (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {selectedPatient.progress_photos.map((p: any) => (
                  <div key={p.id} style={{ minWidth: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #edeef4' }}>
                    <img src={p.url} alt={p.tag} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                    <div style={{ padding: '6px', fontSize: '0.72rem', textAlign: 'center', background: '#fff' }}>{p.tag} ({p.score} pts)</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: '0.8rem', color: '#8b8fa3' }}>No progress photos uploaded yet</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const rxModal = prescribePatientId && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setPrescribePatientId(null); }}>
      <div style={{ width: '500px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#171433' }}>Doctor Prescription Overwrite</div>
          <button onClick={() => setPrescribePatientId(null)} style={{ display: 'grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3' }}>×</button>
        </div>

        {prescribeSuccess ? (
          <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
            ✅ Clinical prescription saved and applied live to patient checklist!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>DOCTOR CLINICAL INSTRUCTIONS & NOTES</label>
              <textarea placeholder="Write prescription instructions (e.g., Apply Adaplene 0.1% alternate nights, cease harsh exfoliants)..." value={docNotes} onChange={e => setDocNotes(e.target.value)} rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#8b8fa3', background: '#f6f7fb', padding: '10px 12px', borderRadius: '10px' }}>
              💡 Prescribing will update the patient's active routine with medical safety overrides.
            </div>
            <button onClick={submitPrescription} disabled={rxLoading || !docNotes} style={{ padding: '13px 20px', borderRadius: '12px', background: rxLoading ? '#a3a7bd' : PUR, border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, cursor: rxLoading ? 'not-allowed' : 'pointer' }}>
              {rxLoading ? 'Applying Prescription…' : 'Apply Live Prescription'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {patientModal}
      {rxModal}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'minmax(0,2.1fr) minmax(260px,1fr)' }}>
          {table}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dist}
            <div style={{ flex: 1, display: 'flex' }}>{topConcerns}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'minmax(0,2.1fr) minmax(260px,1fr)' }}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
            {progress}
            {recent}
          </div>
          {followups}
        </div>

        {banner}
      </div>
    </>
  );
}
