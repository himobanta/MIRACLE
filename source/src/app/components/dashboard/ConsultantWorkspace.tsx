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
  FACE,
  UpEl,
} from './dashboardUtils';
import { api } from '../../services/api';

interface RosterPatient {
  patient_id: string;
  name: string;
  email: string;
  skin_type: string;
  primary_concern: string;
  health_score: number | null;
  compliance_rate: number;
  last_assessment_date: string | null;
}
interface PatientDetail { patient: any; assessments: any[]; active_routine: any[]; progress_photos: any[]; }

// ── Derived analytics helpers ─────────────────────────────────────────────
function computeSkinTypeDist(patients: RosterPatient[]) {
  const counts: Record<string, number> = {};
  patients.forEach(p => { const st = p.skin_type || 'Unassessed'; counts[st] = (counts[st] || 0) + 1; });
  const total = patients.length || 1;
  return Object.entries(counts).map(([type, n]) => ({ type, count: n, pct: Math.round((n / total) * 100) })).sort((a, b) => b.count - a.count);
}

function computeConcernDist(patients: RosterPatient[]) {
  const counts: Record<string, number> = {};
  patients.forEach(p => { if (p.primary_concern && p.primary_concern !== 'General Maintenance') counts[p.primary_concern] = (counts[p.primary_concern] || 0) + 1; });
  const total = patients.length || 1;
  return Object.entries(counts).map(([label, n]) => [label, Math.round((n / total) * 100)] as [string, number]).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
}

// ── Reusable empty state ──────────────────────────────────────────────────
const EmptyState = ({ icon, message }: { icon: string; message: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '10px' }}>
    <span style={{ fontSize: '2rem' }}>{icon}</span>
    <span style={{ fontSize: '0.82rem', color: '#a3a7bd', textAlign: 'center', lineHeight: 1.5 }}>{message}</span>
  </div>
);

interface ConsultantWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function ConsultantWorkspace({ activeSection = 'dashboard', onSectionChange }: ConsultantWorkspaceProps) {
  const [roster, setRoster] = useState<RosterPatient[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('All');

  // Patient detail modal
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);

  // Referral modal state
  const [showReferModal, setShowReferModal] = useState<string | null>(null);
  const [referSummary, setReferSummary] = useState('');
  const [referDate, setReferDate] = useState('');
  const [referTime, setReferTime] = useState('');
  const [referSuccess, setReferSuccess] = useState(false);
  const [referError, setReferError] = useState<string | null>(null);
  const [referLoading, setReferLoading] = useState(false);

  // Prescription modal state
  const [showPrescribeModal, setShowPrescribeModal] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescribeSteps, setPrescribeSteps] = useState<any[]>([
    { time_of_day: 'AM', step_number: 1, step_category: 'Cleansing', product_name: 'Gentle Cleanser', active_ingredients: ['Glycerin'] },
    { time_of_day: 'AM', step_number: 2, step_category: 'Sun Protection', product_name: 'SPF 50 Sunscreen', active_ingredients: ['Zinc Oxide'] },
    { time_of_day: 'PM', step_number: 1, step_category: 'Treatment', product_name: 'Barrier Repair Serum', active_ingredients: ['Niacinamide', 'Ceramides'] },
  ]);
  const [prescribeLoading, setPrescribeLoading] = useState(false);
  const [prescribeSuccess, setPrescribeSuccess] = useState(false);
  const [prescribeError, setPrescribeError] = useState<string | null>(null);

  // Appointments queue state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptLoading, setApptLoading] = useState(true);

  const fetchRoster = () => {
    setRosterLoading(true);
    api.getRoster()
      .then(d => { setRoster(d.patients || []); setRosterError(null); })
      .catch(() => setRosterError('Failed to load patient roster. Please refresh.'))
      .finally(() => setRosterLoading(false));
  };

  const fetchAppointments = () => {
    setApptLoading(true);
    api.getMyAppointments()
      .then(d => setAppointments(Array.isArray(d) ? d : []))
      .catch(() => setAppointments([]))
      .finally(() => setApptLoading(false));
  };

  useEffect(() => {
    fetchRoster();
    fetchAppointments();
  }, []);

  const openPatient = async (id: string) => {
    try { const d = await api.getPatientDetails(id); setSelectedPatient(d); } catch {}
  };

  const submitRefer = async (apptId: string) => {
    setReferError(null);
    setReferLoading(true);
    try {
      await api.referToDermatologist(apptId, { consultant_summary: referSummary, preferred_date: referDate, preferred_time: referTime });
      setReferSuccess(true);
      fetchAppointments();
      fetchRoster();
      setTimeout(() => { setShowReferModal(null); setReferSuccess(false); setReferSummary(''); setReferDate(''); setReferTime(''); }, 1800);
    } catch (e: any) {
      setReferError(e?.detail || 'Failed to submit referral. Please try again.');
    } finally {
      setReferLoading(false);
    }
  };

  const submitPrescription = async (patientId: string) => {
    setPrescribeError(null);
    setPrescribeLoading(true);
    try {
      await api.prescribeRoutine({
        patient_id: patientId,
        doctor_notes: doctorNotes || 'Prescribed by Skincare Consultant',
        routine_steps: prescribeSteps
      });
      setPrescribeSuccess(true);
      fetchRoster();
      if (selectedPatient && selectedPatient.patient.id === patientId) {
        openPatient(patientId);
      }
      setTimeout(() => { setShowPrescribeModal(null); setPrescribeSuccess(false); setDoctorNotes(''); }, 1800);
    } catch (e: any) {
      setPrescribeError(e?.detail || 'Failed to submit prescription. Please try again.');
    } finally {
      setPrescribeLoading(false);
    }
  };

  const updateApptStatusHandler = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, { status, notes: `Status updated to ${status} by consultant` });
      fetchAppointments();
    } catch {}
  };

  const skinTypeColors: Record<string, string> = { Combination: PUR, Oily: BLU, Dry: ORA, Sensitive: PNK, Normal: GRN, Unassessed: '#8b8fa3' };
  const cols = ['Client Name', 'Skin Type', 'Top Concern', 'Skin Health Score', 'Last Assessment', 'Compliance', 'Actions'];

  const scoreRing = (v: number | null) => {
    if (v === null) {
      return (
        <span style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%', background: '#f4f5fa', border: '1px solid #edeef4', fontSize: '0.74rem', fontWeight: 700, color: '#8b8fa3' }}>
          —
        </span>
      );
    }
    const scoreVal = Math.round(v);
    const color = scoreVal >= 75 ? GRN : ORA;
    return (
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%', background: `conic-gradient(${color} ${scoreVal}%, #f4efe4 0)` }}>
        <span style={{ position: 'absolute', inset: '4px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#171433' }}>
          {scoreVal}
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

  // ── Filter roster ────────────────────────────────────────────────────────
  const filteredRoster = roster.filter(p => {
    const matchesSearch = !searchTerm || (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.primary_concern.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesSkin = skinTypeFilter === 'All' || p.skin_type === skinTypeFilter;
    return matchesSearch && matchesSkin;
  });

  // ── Client table ─────────────────────────────────────────────────────────
  const tableBody = rosterLoading ? (
    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>Loading patients…</td></tr>
  ) : rosterError ? (
    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{rosterError}</td></tr>
  ) : filteredRoster.length === 0 ? (
    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>
      {searchTerm || skinTypeFilter !== 'All' ? 'No patients match your search/filter.' : 'No patients assigned yet.'}<br />
      <span style={{ fontSize: '0.76rem' }}>Patients will appear here once they register.</span>
    </td></tr>
  ) : (
    <>
      {filteredRoster.map((p, i) => (
        <tr key={p.patient_id} style={{ borderTop: '1px solid #f1f2f7' }}>
          <td style={{ padding: '14px 18px' }}>{avatarRow(FACE.ananya, p.name, p.email)}</td>
          <td style={{ padding: '14px 18px', fontSize: '0.82rem', fontWeight: 600, color: skinTypeColors[p.skin_type] || PUR }}>{p.skin_type}</td>
          <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a' }}>{p.primary_concern || '—'}</td>
          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              {scoreRing(p.health_score)}
              {p.health_score !== null && <span style={{ fontSize: '0.7rem', color: '#8b8fa3' }}>/100</span>}
            </span>
          </td>
          <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>{p.last_assessment_date || 'No assessment'}</td>
          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
            {p.compliance_rate > 0 ? statusChip(`${p.compliance_rate}%`, p.compliance_rate >= 70 ? 'active' : 'due') : statusChip('No logs', 'due')}
          </td>
          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              <button onClick={() => openPatient(p.patient_id)} style={{ padding: '5px 10px', borderRadius: '8px', border: `1px solid ${PUR}`, background: 'transparent', color: PUR, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
              <button onClick={() => setShowPrescribeModal(p.patient_id)} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #edeef4', background: 'rgba(47,107,76,0.08)', color: PUR, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Prescribe</button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );

  const table = (
    <Card>
      <CardHead
        title={`Client Roster (${filteredRoster.length})`}
        right={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none', width: '150px' }}
            />
            <select
              value={skinTypeFilter}
              onChange={e => setSkinTypeFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
            >
              <option value="All">All Skin Types</option>
              <option value="Combination">Combination</option>
              <option value="Oily">Oily</option>
              <option value="Dry">Dry</option>
              <option value="Sensitive">Sensitive</option>
              <option value="Normal">Normal</option>
              <option value="Unassessed">Unassessed</option>
            </select>
          </div>
        }
      />
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
          <tbody>{tableBody}</tbody>
        </table>
      </div>
    </Card>
  );

  // ── Live-derived analytics (only from real roster) ─────────────────────
  const skinTypePalette: Record<string, string> = { Combination: PUR, Oily: BLU, Dry: ORA, Sensitive: PNK, Normal: GRN, Unassessed: '#8b8fa3' };

  const skinTypeDist = roster.length ? computeSkinTypeDist(roster) : [];
  const skinTypeSegs = skinTypeDist.map(d => ({ pct: d.pct, color: skinTypePalette[d.type] || GRN }));
  const skinTypeLegend: [string, string, string][] = skinTypeDist.map(d => [d.type, `${d.count} (${d.pct}%)`, skinTypePalette[d.type] || GRN]);

  const dist = (
    <Card>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Clients by Skin Type</h3>
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading…" />
      ) : roster.length === 0 ? (
        <EmptyState icon="👥" message="No patient data available yet." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '18px', alignItems: 'center' }}>
          <DonutChart segs={skinTypeSegs} center={String(roster.length)} sub="Total Clients" size={140} />
          <Legend rows={skinTypeLegend} />
        </div>
      )}
    </Card>
  );

  const concernRows = roster.length ? computeConcernDist(roster) : [];

  const topConcerns = (
    <Card style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Top Skin Concerns</h3>
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading…" />
      ) : roster.length === 0 || concernRows.length === 0 ? (
        <EmptyState icon="🔍" message="No concern data available yet." />
      ) : (
        <Bars rows={concernRows as [string, number][]} />
      )}
    </Card>
  );

  // ── Progress stats: only from real roster ─────────────────────────────
  const liveScores = roster.map(p => p.health_score).filter((s): s is number => s !== null);
  const avgScore = liveScores.length ? Math.round(liveScores.reduce((a, b) => a + b, 0) / liveScores.length) : null;
  const improved = liveScores.filter(s => s >= 75).length;
  const needAttn = liveScores.filter(s => s < 60).length;
  const chartScores = liveScores.length ? liveScores : [0];

  const progress = (
    <Card style={{ height: '100%' }}>
      <CardHead title="Client Progress Overview" right={<span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7189' }}>Active Roster</span>} />
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading…" />
      ) : roster.length === 0 || liveScores.length === 0 ? (
        <EmptyState icon="📈" message="No patient assessment scores recorded yet." />
      ) : (
        <>
          <ChartFrame
            chart={{ el: <LineChart vals={chartScores} min={0} max={100} /> }}
            yLabels={['100%', '75%', '50%', '25%', '0%']}
            xLabels={roster.slice(0, 4).map(p => p.name.split(' ')[0])}
            h={150}
          />
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f2f7', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[
              [avgScore !== null ? String(avgScore) : '—', 'Avg. Health Score', '', 1],
              [String(improved), 'Clients ≥75 Score', '', 1],
              [String(needAttn), 'Need Attention', '', 0],
            ].map((s, i) => (
              <div key={i} style={{ padding: i === 0 ? '0 10px 0 0' : '0 10px', borderLeft: i === 0 ? 'none' : '1px solid #f1f2f7', minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: s[3] === 1 ? '#16a34a' : '#ef4444', lineHeight: 1.1 }}>{s[0]}</div>
                <div style={{ fontSize: '0.66rem', color: '#8b8fa3', margin: '4px 0 5px', lineHeight: 1.25 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );

  // ── Appointment Queue ──────────────────────────────────────────────────
  const apptQueue = (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHead title={`Consultation Queue (${appointments.length})`} right={<span style={{ fontSize: '0.72rem', fontWeight: 600, color: PUR }}>Live Requests</span>} />
      {apptLoading ? (
        <EmptyState icon="⏳" message="Loading appointments…" />
      ) : appointments.length === 0 ? (
        <EmptyState icon="📅" message="No pending consultation requests." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '280px' }}>
          {appointments.map(a => (
            <div key={a.id} style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#171433' }}>{a.patient_name || 'Patient'}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: a.status === 'Accepted' ? 'rgba(34,197,94,0.12)' : a.status === 'Referred_To_Dermatologist' ? 'rgba(47,107,76,0.12)' : 'rgba(224,138,30,0.12)', color: a.status === 'Accepted' ? '#16a34a' : a.status === 'Referred_To_Dermatologist' ? PUR : '#e08a1e' }}>
                  {a.status}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#7c8199' }}>📅 {a.preferred_date} at {a.preferred_time} ({a.target_role})</div>
              {a.user_notes && <div style={{ fontSize: '0.74rem', color: '#3f4a5a', fontStyle: 'italic' }}>"{a.user_notes}"</div>}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {a.status === 'Requested' && (
                  <>
                    <button onClick={() => updateApptStatusHandler(a.id, 'Accepted')} style={{ padding: '4px 10px', borderRadius: '6px', background: '#16a34a', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => updateApptStatusHandler(a.id, 'Rejected')} style={{ padding: '4px 10px', borderRadius: '6px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                  </>
                )}
                <button onClick={() => setShowReferModal(a.id)} style={{ padding: '4px 10px', borderRadius: '6px', background: PUR, color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Refer Derma</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const patientModal = selectedPatient && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelectedPatient(null); }}>
      <div style={{ width: '600px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#171433' }}>{selectedPatient.patient.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#8b8fa3' }}>{selectedPatient.patient.email} · Skin Type: <b>{selectedPatient.patient.profile?.skin_type || 'Unassessed'}</b></div>
          </div>
          <button onClick={() => setSelectedPatient(null)} style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '1rem', color: '#8b8fa3' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Clinical Profile Summary */}
          <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: PUR, marginBottom: '10px' }}>Patient Clinical Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '0.78rem' }}>
              <div><span style={{ color: '#8b8fa3', display: 'block', fontSize: '0.7rem' }}>AGE</span><b>{selectedPatient.patient.profile?.age ?? '—'}</b></div>
              <div><span style={{ color: '#8b8fa3', display: 'block', fontSize: '0.7rem' }}>GENDER</span><b>{selectedPatient.patient.profile?.gender ?? '—'}</b></div>
              <div><span style={{ color: '#8b8fa3', display: 'block', fontSize: '0.7rem' }}>WATER</span><b>{selectedPatient.patient.profile?.water_intake_l != null ? `${selectedPatient.patient.profile.water_intake_l} L` : '—'}</b></div>
              <div><span style={{ color: '#8b8fa3', display: 'block', fontSize: '0.7rem' }}>SLEEP</span><b>{selectedPatient.patient.profile?.sleep_hours != null ? `${selectedPatient.patient.profile.sleep_hours} hrs` : '—'}</b></div>
            </div>
            {selectedPatient.patient.profile?.allergies?.length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #edeef4', fontSize: '0.76rem', color: '#e11d48' }}>
                <b>Allergies:</b> {selectedPatient.patient.profile.allergies.join(', ')}
              </div>
            )}
          </div>

          {/* Assessment History */}
          {selectedPatient.assessments?.length > 0 && (
            <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433', marginBottom: '8px' }}>Skin Assessment History ({selectedPatient.assessments.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                {selectedPatient.assessments.map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', background: '#fff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #edeef4' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: PUR }}>{Math.round(a.overall_score)}/100</span>
                      <span style={{ color: '#8b8fa3', marginLeft: '8px' }}>{a.date}</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#3f4a5a' }}>{a.concerns?.join(', ') || 'No concerns'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '16px', borderRadius: '16px', background: '#f6f7fb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: PUR }}>Active Routine ({selectedPatient.active_routine.length} Steps)</span>
              <button onClick={() => setShowPrescribeModal(selectedPatient.patient.id)} style={{ padding: '5px 12px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>+ Prescribe New Routine</button>
            </div>
            {selectedPatient.active_routine.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#8b8fa3' }}>No active routine prescribed yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedPatient.active_routine.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#3f4a5a' }}>
                    <span><b>{r.time_of_day}</b> Step {r.step_number}: {r.step_category} ({r.product_name})</span>
                    {r.prescribed_by_doctor && <span style={{ color: PUR, fontWeight: 700 }}>Rx Clinical</span>}
                  </div>
                ))}
              </div>
            )}
          </div>


          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433', marginBottom: '8px' }}>Progress Photos ({selectedPatient.progress_photos.length})</div>
            {selectedPatient.progress_photos.length ? (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {selectedPatient.progress_photos.map((p: any) => (
                  <div key={p.id} style={{ minWidth: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #edeef4' }}>
                    <img src={p.url} alt={p.tag} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                    <div style={{ padding: '6px', fontSize: '0.72rem', textAlign: 'center', background: '#fff' }}>{p.tag} ({p.score || '—'} pts)</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: '0.8rem', color: '#8b8fa3' }}>No progress photos uploaded yet</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const referModal = showReferModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowReferModal(null); }}>
      <div style={{ width: '480px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#171433' }}>Refer to Dermatologist</div>
          <button onClick={() => setShowReferModal(null)} style={{ display: 'grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3' }}>×</button>
        </div>

        {referSuccess ? (
          <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
            ✅ Patient successfully referred to Dermatologist!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {referError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: '0.82rem' }}>{referError}</div>
            )}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>PREFERRED CONSULTATION DATE</label>
              <input type="date" value={referDate} onChange={e => setReferDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>PREFERRED TIME</label>
              <input type="text" placeholder="e.g. 11:00 AM" value={referTime} onChange={e => setReferTime(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>CLINICAL SUMMARY / REASON FOR REFERRAL</label>
              <textarea placeholder="Specify clinical reasons for dermatologist review..." value={referSummary} onChange={e => setReferSummary(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button onClick={() => submitRefer(showReferModal!)} disabled={referLoading || !referDate || !referTime} style={{ padding: '12px 20px', borderRadius: '12px', background: (referLoading || !referDate || !referTime) ? '#a3a7bd' : PUR, border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, cursor: (referLoading || !referDate || !referTime) ? 'not-allowed' : 'pointer' }}>
              {referLoading ? 'Submitting Referral…' : 'Send Referral to Dermatologist'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const prescribeModal = showPrescribeModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.28)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowPrescribeModal(null); }}>
      <div style={{ width: '560px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#171433' }}>Prescribe Custom Skincare Routine</div>
          <button onClick={() => setShowPrescribeModal(null)} style={{ display: 'grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3' }}>×</button>
        </div>

        {prescribeSuccess ? (
          <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
            ✅ Custom routine successfully prescribed and saved!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {prescribeError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: '0.82rem' }}>{prescribeError}</div>
            )}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c8199', display: 'block', marginBottom: '6px' }}>CLINICAL NOTES / ADVICE</label>
              <textarea placeholder="Add clinical guidance for patient..." value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#171433' }}>Routine Steps ({prescribeSteps.length})</span>
                <button
                  type="button"
                  onClick={() => setPrescribeSteps(prev => [...prev, { time_of_day: 'AM', step_number: prev.length + 1, step_category: 'Moisturizing', product_name: 'Custom Product', active_ingredients: [] }])}
                  style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(47,107,76,0.1)', color: PUR, border: 'none', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Add Step
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                {prescribeSteps.map((step, idx) => (
                  <div key={idx} style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '8px' }}>
                      <select
                        value={step.time_of_day}
                        onChange={e => { const val = e.target.value; setPrescribeSteps(prev => prev.map((s, i) => i === idx ? { ...s, time_of_day: val } : s)); }}
                        style={{ padding: '6px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem' }}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={step.product_name}
                        onChange={e => { const val = e.target.value; setPrescribeSteps(prev => prev.map((s, i) => i === idx ? { ...s, product_name: val } : s)); }}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={step.step_category}
                        onChange={e => { const val = e.target.value; setPrescribeSteps(prev => prev.map((s, i) => i === idx ? { ...s, step_category: val } : s)); }}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => submitPrescription(showPrescribeModal!)} disabled={prescribeLoading || prescribeSteps.length === 0} style={{ padding: '12px 20px', borderRadius: '12px', background: (prescribeLoading || prescribeSteps.length === 0) ? '#a3a7bd' : PUR, border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, cursor: (prescribeLoading || prescribeSteps.length === 0) ? 'not-allowed' : 'pointer' }}>
              {prescribeLoading ? 'Saving Prescription…' : 'Submit Prescription'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'clients':
        return table;
      case 'assessments':
      case 'progress-tracking':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {progress}
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {dist}
              {topConcerns}
            </div>
          </div>
        );
      case 'routine-plans':
      case 'prescriptions':
        return (
          <Card>
            <CardHead title="Patient Routine Plans & Clinical Prescriptions" right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Active Database</span>} />
            <div style={{ padding: '12px 0', fontSize: '0.84rem', color: '#3f4a5a' }}>
              Select a patient from the roster to inspect or overwrite their personalized routine with professional prescriptions.
            </div>
            {table}
          </Card>
        );
      case 'follow-ups-&-notes':
      case 'reminders':
        return apptQueue;
      case 'ingredient-database':
        return (
          <Card>
            <CardHead title="Clinical Ingredient Safety Database" right={<span style={{ fontSize: '0.76rem', color: PUR, fontWeight: 700 }}>Ingredient Engine</span>} />
            <div style={{ padding: '16px 0', fontSize: '0.84rem', color: '#3f4a5a' }}>
              Search formulations and check active ingredient cross-reactivity for client routines.
            </div>
          </Card>
        );
      case 'product-recommendations':
      case 'skin-concerns-guide':
      case 'treatment-protocols':
      case 'reports':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {progress}
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {dist}
              {topConcerns}
            </div>
          </div>
        );
      default:
        return (
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
                {apptQueue}
              </div>
              <Card style={{ paddingBottom: '10px', display: 'flex', flexDirection: 'column' }}>
                <CardHead title="Clinical Actions & Stats" right={<span style={{ fontSize: '0.72rem', fontWeight: 600, color: PUR }}>Overview</span>} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>Total Patients Assigned</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: PUR }}>{roster.length}</span>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>Consultation Requests</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: BLU }}>{appointments.length}</span>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#f6f7fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>Patients Requiring Attention</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: ORA }}>{needAttn}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {patientModal}
      {referModal}
      {prescribeModal}
      {renderSection()}
    </>
  );
}
