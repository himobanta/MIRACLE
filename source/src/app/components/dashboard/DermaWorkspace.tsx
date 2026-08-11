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

interface PatientDetail {
  patient: any;
  assessments: any[];
  active_routine: any[];
  progress_photos: any[];
}

interface PrescribeStep {
  time_of_day: string;
  step_number: number;
  step_category: string;
  product_name: string;
  active_ingredients: string[];
}

// ── Derived analytics helpers ──────────────────────────────────────────────
function computeDermaConcernDist(patients: RosterPatient[]) {
  const counts: Record<string, number> = {};
  patients.forEach(p => {
    if (p.primary_concern && p.primary_concern !== 'General Maintenance') {
      counts[p.primary_concern] = (counts[p.primary_concern] || 0) + 1;
    }
  });
  const total = patients.length || 1;
  return Object.entries(counts)
    .map(([label, n]) => [label, Math.round((n / total) * 100)] as [string, number])
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);
}

// ── Reusable empty state ──────────────────────────────────────────────────
const EmptyState = ({ icon, message }: { icon: string; message: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '10px' }}>
    <span style={{ fontSize: '2rem' }}>{icon}</span>
    <span style={{ fontSize: '0.82rem', color: '#a3a7bd', textAlign: 'center', lineHeight: 1.5 }}>{message}</span>
  </div>
);

export function DermaWorkspace() {
  const [roster, setRoster] = useState<RosterPatient[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('All');

  // Appointments queue state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptError, setApptError] = useState<string | null>(null);
  const [apptTab, setApptTab] = useState<'all' | 'referred' | 'requested' | 'accepted' | 'completed'>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Patient detail modal
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Clinical Prescription modal state
  const [showPrescribeModal, setShowPrescribeModal] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescribeSteps, setPrescribeSteps] = useState<PrescribeStep[]>([
    { time_of_day: 'AM', step_number: 1, step_category: 'Cleansing', product_name: 'Gentle Hydrating Cleanser', active_ingredients: ['Ceramides', 'Glycerin'] },
    { time_of_day: 'AM', step_number: 2, step_category: 'Treatment', product_name: 'Azelaic Acid 10% Gel', active_ingredients: ['Azelaic Acid'] },
    { time_of_day: 'AM', step_number: 3, step_category: 'Sun Protection', product_name: 'Mineral SPF 50+', active_ingredients: ['Zinc Oxide'] },
    { time_of_day: 'PM', step_number: 1, step_category: 'Cleansing', product_name: 'Gentle Hydrating Cleanser', active_ingredients: ['Ceramides'] },
    { time_of_day: 'PM', step_number: 2, step_category: 'Treatment', product_name: 'Adaplene 0.1% Gel (Prescription)', active_ingredients: ['Adapalene'] },
  ]);
  const [prescribeLoading, setPrescribeLoading] = useState(false);
  const [prescribeSuccess, setPrescribeSuccess] = useState(false);
  const [prescribeError, setPrescribeError] = useState<string | null>(null);

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
      .then(d => { setAppointments(Array.isArray(d) ? d : []); setApptError(null); })
      .catch(() => setApptError('Failed to load appointments queue.'))
      .finally(() => setApptLoading(false));
  };

  useEffect(() => {
    fetchRoster();
    fetchAppointments();
  }, []);

  const openPatient = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await api.getPatientDetails(id);
      setSelectedPatient(d);
    } catch {
      alert('Failed to load patient details. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async (apptId: string, newStatus: string, defaultNotes: string) => {
    setActionLoading(prev => ({ ...prev, [apptId]: true }));
    try {
      await api.updateAppointmentStatus(apptId, { status: newStatus, notes: defaultNotes });
      await fetchAppointments();
    } catch (err: any) {
      alert(err?.detail || `Failed to update status to ${newStatus}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [apptId]: false }));
    }
  };

  const submitPrescription = async () => {
    if (!showPrescribeModal || !doctorNotes) return;
    setPrescribeLoading(true);
    setPrescribeError(null);
    try {
      await api.prescribeRoutine({
        patient_id: showPrescribeModal,
        doctor_notes: doctorNotes,
        routine_steps: prescribeSteps.map(s => ({
          ...s,
          prescribed_by_doctor: true,
          doctor_notes: doctorNotes,
        }))
      });
      setPrescribeSuccess(true);
      setTimeout(() => {
        setShowPrescribeModal(null);
        setPrescribeSuccess(false);
        setDoctorNotes('');
        fetchRoster();
        if (selectedPatient && selectedPatient.patient.id === showPrescribeModal) {
          openPatient(showPrescribeModal);
        }
      }, 1500);
    } catch (e: any) {
      setPrescribeError(e?.detail || 'Failed to submit clinical prescription. Please try again.');
    } finally {
      setPrescribeLoading(false);
    }
  };

  const handleAddStep = () => {
    const nextStepNum = prescribeSteps.length + 1;
    setPrescribeSteps([
      ...prescribeSteps,
      { time_of_day: 'PM', step_number: nextStepNum, step_category: 'Treatment', product_name: 'New Prescription Active', active_ingredients: ['Active Ingredient'] }
    ]);
  };

  const handleStepChange = (index: number, field: keyof PrescribeStep, value: any) => {
    const updated = [...prescribeSteps];
    if (field === 'active_ingredients') {
      updated[index][field] = typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value;
    } else {
      (updated[index] as any)[field] = value;
    }
    setPrescribeSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    setPrescribeSteps(prescribeSteps.filter((_, i) => i !== index));
  };

  // Filtered Roster
  const filteredRoster = roster.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.primary_concern.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkin = skinTypeFilter === 'All' || p.skin_type.toLowerCase() === skinTypeFilter.toLowerCase();
    return matchesSearch && matchesSkin;
  });

  // Filtered Appointments
  const filteredAppts = appointments.filter(a => {
    if (apptTab === 'referred') return a.status === 'Referred_To_Dermatologist';
    if (apptTab === 'requested') return a.status === 'Requested';
    if (apptTab === 'accepted') return a.status === 'Accepted';
    if (apptTab === 'completed') return a.status === 'Completed';
    return true;
  });

  // Helper score ring
  const scoreRing = (v: number | null) => {
    if (v === null) {
      return (
        <span style={{ fontSize: '0.78rem', color: '#a3a7bd', fontWeight: 600 }}>Unassessed</span>
      );
    }
    const color = v >= 75 ? GRN : ORA;
    return (
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: `conic-gradient(${color} ${v}%, #f4efe4 0)` }}>
        <span style={{ position: 'absolute', inset: '4px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#171433' }}>
          {v}
        </span>
      </span>
    );
  };

  const statusChip = (status: string) => {
    let bg = '#e7f7ee';
    let color = '#16a34a';
    if (status === 'Referred_To_Dermatologist' || status === 'Requested') {
      bg = '#fdf3e0';
      color = '#d99a0b';
    } else if (status === 'Rejected') {
      bg = '#fef2f2';
      color = '#ef4444';
    } else if (status === 'Completed') {
      bg = '#edf2fe';
      color = '#2563eb';
    }
    return (
      <span style={{ display: 'inline-block', borderRadius: '999px', background: bg, color, padding: '4px 12px', fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  // ── 1. Header Stat Cards ──
  const referredApptsCount = appointments.filter(a => a.status === 'Referred_To_Dermatologist').length;
  const acceptedApptsCount = appointments.filter(a => a.status === 'Accepted').length;

  const headerStats = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: '#8b8fa3', fontWeight: 600 }}>Active Roster</span>
          <span style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(47,107,76,0.1)', color: PUR }}>
            <DashIcon d="<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/>" s={16} stroke={PUR} />
          </span>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#171433', marginTop: '6px' }}>
          {rosterLoading ? '…' : roster.length}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#6b7189', marginTop: '2px' }}>Registered patients</div>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: '#8b8fa3', fontWeight: 600 }}>Pending Referrals</span>
          <span style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217,154,11,0.1)', color: ORA }}>
            <DashIcon d="<path d='M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='8.5' cy='7' r='4'/><polyline points='17 11 19 13 23 9'/>" s={16} stroke={ORA} />
          </span>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: ORA, marginTop: '6px' }}>
          {apptLoading ? '…' : referredApptsCount}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#6b7189', marginTop: '2px' }}>Referred by consultants</div>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: '#8b8fa3', fontWeight: 600 }}>Accepted Consults</span>
          <span style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: GRN }}>
            <DashIcon d="<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>" s={16} stroke={GRN} />
          </span>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: GRN, marginTop: '6px' }}>
          {apptLoading ? '…' : acceptedApptsCount}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#6b7189', marginTop: '2px' }}>Active consultations</div>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: '#8b8fa3', fontWeight: 600 }}>Total Queue</span>
          <span style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: BLU }}>
            <DashIcon d="<rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>" s={16} stroke={BLU} />
          </span>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: BLU, marginTop: '6px' }}>
          {apptLoading ? '…' : appointments.length}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#6b7189', marginTop: '2px' }}>Total appointments</div>
      </Card>
    </div>
  );

  // ── 2. Clinical Appointments Queue Card ──
  const apptQueueCard = (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#171433' }}>Dermatology Referral & Appointment Queue</h3>
          <span style={{ fontSize: '0.76rem', color: '#8b8fa3' }}>Inspect patient requests and consultant referrals requiring clinical evaluation</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: '#f6f7fb', padding: '4px', borderRadius: '10px', border: '1px solid #edeef4' }}>
          {(['all', 'referred', 'requested', 'accepted', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setApptTab(tab)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                background: apptTab === tab ? '#fff' : 'transparent',
                color: apptTab === tab ? PUR : '#6b7189',
                fontSize: '0.75rem',
                fontWeight: apptTab === tab ? 700 : 600,
                cursor: 'pointer',
                boxShadow: apptTab === tab ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {apptLoading ? (
        <EmptyState icon="⏳" message="Loading clinical appointment queue…" />
      ) : apptError ? (
        <div style={{ padding: '16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem', textAlign: 'center' }}>
          {apptError}
        </div>
      ) : filteredAppts.length === 0 ? (
        <EmptyState icon="📋" message={apptTab === 'all' ? 'No appointments or referrals found.' : `No appointments in '${apptTab}' state.`} />
      ) : (
        <div className="dash-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #edeef4' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd' }}>Patient</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd' }}>Preferred Schedule</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd' }}>Consultant / Patient Notes</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppts.map(a => {
                const isLoading = !!actionLoading[a.id];
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f6f7fb' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#171433' }}>{a.patient_name || 'Patient'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>{a.patient_email}</div>
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#3f4a5a' }}>
                      <div><b>Date:</b> {a.preferred_date}</div>
                      <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}><b>Time:</b> {a.preferred_time}</div>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {statusChip(a.status)}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#3f4a5a', maxWidth: '240px' }}>
                      {a.consultant_summary ? (
                        <div style={{ background: '#f6f7fb', padding: '6px 10px', borderRadius: '8px', borderLeft: `3px solid ${PUR}` }}>
                          <span style={{ fontWeight: 700, color: PUR, fontSize: '0.7rem', display: 'block' }}>CONSULTANT REFERRAL NOTE:</span>
                          {a.consultant_summary}
                        </div>
                      ) : a.user_notes ? (
                        <span>{a.user_notes}</span>
                      ) : (
                        <span style={{ color: '#a3a7bd' }}>No notes attached</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openPatient(a.patient_id)}
                          disabled={detailLoading}
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
                          View Medical
                        </button>

                        <button
                          onClick={() => setShowPrescribeModal(a.patient_id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #edeef4',
                            background: '#f6f7fb',
                            color: '#3f4a5a',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Prescribe
                        </button>

                        {a.status !== 'Accepted' && a.status !== 'Completed' && (
                          <button
                            onClick={() => handleStatusUpdate(a.id, 'Accepted', 'Consultation accepted by Dermatologist')}
                            disabled={isLoading}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              background: isLoading ? '#a3a7bd' : GRN,
                              color: '#fff',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {isLoading ? '...' : 'Accept'}
                          </button>
                        )}

                        {a.status === 'Accepted' && (
                          <button
                            onClick={() => handleStatusUpdate(a.id, 'Completed', 'Clinical consultation complete')}
                            disabled={isLoading}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              background: isLoading ? '#a3a7bd' : BLU,
                              color: '#fff',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {isLoading ? '...' : 'Complete'}
                          </button>
                        )}

                        {a.status !== 'Rejected' && a.status !== 'Completed' && (
                          <button
                            onClick={() => handleStatusUpdate(a.id, 'Rejected', 'Consultation declined')}
                            disabled={isLoading}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Reject
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
  );

  // ── 3. Patient Roster Table with Search & Filter ──
  const tableTitle = 'Patient Roster & Medical Records';
  const tableRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="text"
        placeholder="Search patient, email, concern…"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{
          padding: '6px 12px',
          borderRadius: '10px',
          border: '1px solid #edeef4',
          fontSize: '0.78rem',
          outline: 'none',
          fontFamily: 'inherit',
          width: '210px',
        }}
      />
      <select
        value={skinTypeFilter}
        onChange={e => setSkinTypeFilter(e.target.value)}
        style={{
          padding: '6px 10px',
          borderRadius: '10px',
          border: '1px solid #edeef4',
          fontSize: '0.78rem',
          outline: 'none',
          fontFamily: 'inherit',
          background: '#fff',
        }}
      >
        <option value="All">All Skin Types</option>
        <option value="Oily">Oily</option>
        <option value="Dry">Dry</option>
        <option value="Combination">Combination</option>
        <option value="Sensitive">Sensitive</option>
        <option value="Normal">Normal</option>
      </select>
    </div>
  );

  const cols = ['Patient', 'Email', 'Primary Concern', 'Health Score', 'Last Assessment', 'Compliance', 'Actions'];

  const tableBody = rosterLoading ? (
    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>Loading patient roster…</td></tr>
  ) : rosterError ? (
    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{rosterError}</td></tr>
  ) : filteredRoster.length === 0 ? (
    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>
      {searchTerm || skinTypeFilter !== 'All' ? 'No patients match your search/filter criteria.' : 'No patients registered yet.'}
    </td></tr>
  ) : (
    <>
      {filteredRoster.map((p) => (
        <tr key={p.patient_id} style={{ borderTop: '1px solid #f1f2f7' }}>
          <td style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#171433' }}>{p.name}</div>
            <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>Skin Type: <b>{p.skin_type}</b></div>
          </td>
          <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a' }}>{p.email}</td>
          <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a' }}>{p.primary_concern || '—'}</td>
          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              {scoreRing(p.health_score !== null ? Math.round(p.health_score) : null)}
            </span>
          </td>
          <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>
            {p.last_assessment_date || 'Unassessed'}
          </td>
          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              borderRadius: '999px',
              background: p.compliance_rate >= 70 ? '#e7f7ee' : '#fdf3e0',
              color: p.compliance_rate >= 70 ? '#16a34a' : '#d99a0b',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700
            }}>
              {p.compliance_rate}%
            </span>
          </td>
          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              <button
                onClick={() => openPatient(p.patient_id)}
                style={{ padding: '5px 10px', borderRadius: '8px', border: `1px solid ${PUR}`, background: 'transparent', color: PUR, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                View
              </button>
              <button
                onClick={() => setShowPrescribeModal(p.patient_id)}
                style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #edeef4', background: '#f6f7fb', color: '#3f4a5a', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Prescribe
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );

  const rosterTable = (
    <Card>
      <CardHead title={tableTitle} right={tableRight} />
      <div className="dash-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '860px', width: '100%' }}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} style={{ textAlign: i === 3 || i === 5 || i === 6 ? 'center' : 'left', padding: '0 18px 16px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>
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

  // ── 4. Live-Derived Analytics ──
  const concernPalette = [PUR, BLU, ORA, PNK, TEA, GRY];
  const liveConcernDist = roster.length ? computeDermaConcernDist(roster) : [];
  const concernSegs = liveConcernDist.map((d, i) => ({ pct: d[1] as number, color: concernPalette[i] || GRY }));
  const concernLegend: [string, string, string][] = liveConcernDist.map((d, i) => [String(d[0]), `(${d[1]}%)`, concernPalette[i] || GRY]);

  const dist = (
    <Card>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Skin Concerns Distribution</h3>
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading analytics…" />
      ) : roster.length === 0 ? (
        <EmptyState icon="📊" message="No skin concerns data logged yet." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '18px', alignItems: 'center' }}>
          <DonutChart segs={concernSegs} center={String(roster.length)} sub="Total Patients" size={140} />
          <Legend rows={concernLegend} />
        </div>
      )}
    </Card>
  );

  const dermaConcernRows = roster.length ? (liveConcernDist as [string, number][]) : [];

  const topConcerns = (
    <Card style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Top Clinical Skin Concerns</h3>
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading concerns…" />
      ) : roster.length === 0 ? (
        <EmptyState icon="🔍" message="No skin concerns logged yet." />
      ) : (
        <Bars rows={dermaConcernRows} />
      )}
    </Card>
  );

  // Progress stats derived from real roster health scores
  const validScores = roster.map(p => p.health_score).filter((s): s is number => s !== null);
  const dermaAvgScore = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
  const dermaImproved = validScores.filter(s => s >= 75).length;
  const dermaStable = validScores.filter(s => s >= 60 && s < 75).length;
  const dermaNeedAttn = validScores.filter(s => s < 60).length;
  const dermaChartScores = validScores.length ? validScores : [0];

  const progress = (
    <Card style={{ height: '100%' }}>
      <CardHead title="Clinical Health Progress Overview" right={<span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7189' }}>Database Metrics</span>} />
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading chart data…" />
      ) : validScores.length === 0 ? (
        <EmptyState icon="📈" message="No skin health assessments completed yet." />
      ) : (
        <>
          <ChartFrame
            chart={{ el: <LineChart vals={dermaChartScores} min={0} max={100} /> }}
            yLabels={['100%', '75%', '50%', '25%', '0%']}
            xLabels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
            h={150}
          />
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f2f7', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              [dermaAvgScore !== null ? String(dermaAvgScore) : '—', 'Avg. Health Score', 1],
              [String(dermaImproved), 'Score ≥75', 1],
              [String(dermaStable), 'Stable 60–75', 2],
              [String(dermaNeedAttn), 'Need Attention', 0],
            ].map((s, i) => (
              <div key={i} style={{ padding: i === 0 ? '0 10px 0 0' : '0 10px', borderLeft: i === 0 ? 'none' : '1px solid #f1f2f7', minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: s[2] === 1 ? '#16a34a' : s[2] === 0 ? '#ef4444' : '#171433', lineHeight: 1.1 }}>{s[0]}</div>
                <div style={{ fontSize: '0.66rem', color: '#8b8fa3', margin: '4px 0 0', lineHeight: 1.25 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );

  // Recent assessments from real roster
  const recentAssessed = [...roster]
    .filter(p => p.last_assessment_date !== null && p.health_score !== null)
    .sort((a, b) => (b.last_assessment_date || '').localeCompare(a.last_assessment_date || ''))
    .slice(0, 5);

  const recent = (
    <Card style={{ paddingBottom: '10px', display: 'flex', flexDirection: 'column' }}>
      <CardHead title="Recent Skin Assessments" />
      {rosterLoading ? (
        <EmptyState icon="⏳" message="Loading assessments…" />
      ) : recentAssessed.length === 0 ? (
        <EmptyState icon="📋" message="No recent skin assessments recorded." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
          {recentAssessed.map((p, i) => {
            const scoreVal = Math.round(p.health_score!);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: '#f6f7fb' }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#171433' }}>{p.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>Date: {p.last_assessment_date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: scoreVal >= 75 ? GRN : ORA }}>
                    {scoreVal}/100
                  </span>
                  <button
                    onClick={() => openPatient(p.patient_id)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${PUR}`, background: 'transparent', color: PUR, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const banner = (
    <div style={{ borderRadius: '18px', border: '1px solid #cfe0d4', background: 'linear-gradient(120deg,#e8f0ea,#f1f6f2)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', flexShrink: 0, borderRadius: '13px', background: '#fff', color: PUR }}>
        <DashIcon d={PATHS.spark} s={20} stroke={PUR} />
      </span>
      <div style={{ flex: 1, minWidth: '240px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: PUR, marginBottom: '4px' }}>AI Clinical Ingredients Intelligence</div>
        <div style={{ fontSize: '0.84rem', color: '#4b4b63', lineHeight: 1.5 }}>
          Evaluate chemical safety, allergen cross-reactivity, and active prescription routines live against PostgreSQL & MongoDB records.
        </div>
      </div>
    </div>
  );

  // ── 5. Patient Detail Inspection Modal ──
  const patientModal = selectedPatient && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.35)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelectedPatient(null); }}>
      <div style={{ width: '640px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #edeef4' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#171433' }}>{selectedPatient.patient.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#8b8fa3' }}>{selectedPatient.patient.email} · ID: {selectedPatient.patient.id}</div>
          </div>
          <button onClick={() => setSelectedPatient(null)} style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '1rem', color: '#8b8fa3' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Demographics & Profile */}
          <div style={{ padding: '16px', borderRadius: '16px', background: '#f6f7fb' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: PUR, marginBottom: '10px' }}>Patient Clinical Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8rem', color: '#3f4a5a' }}>
              <div><b>Skin Type:</b> {selectedPatient.patient.profile?.skin_type || 'Unassessed'}</div>
              <div><b>Age / Gender:</b> {selectedPatient.patient.profile?.age || '—'} / {selectedPatient.patient.profile?.gender || '—'}</div>
              <div><b>Water Intake:</b> {selectedPatient.patient.profile?.water_intake_l || '—'} L/day</div>
              <div><b>Sleep:</b> {selectedPatient.patient.profile?.sleep_hours || '—'} hours/night</div>
              <div style={{ gridColumn: 'span 2' }}>
                <b>Known Allergies / Sensitivities:</b>{' '}
                {selectedPatient.patient.profile?.allergies?.length ? selectedPatient.patient.profile.allergies.join(', ') : 'None reported'}
              </div>
            </div>
          </div>

          {/* Assessment History */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#171433', marginBottom: '10px' }}>Skin Assessment History ({selectedPatient.assessments.length})</div>
            {selectedPatient.assessments.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#8b8fa3', background: '#f6f7fb', padding: '12px', borderRadius: '10px' }}>Not available — no assessment recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedPatient.assessments.map((a: any) => (
                  <div key={a.id} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #edeef4', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>Date: {a.date}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: a.overall_score >= 75 ? GRN : ORA }}>
                        Overall Score: {a.overall_score}/100
                      </span>
                    </div>
                    {a.concerns?.length > 0 && (
                      <div style={{ fontSize: '0.76rem', color: '#8b8fa3', marginBottom: '6px' }}>
                        <b>Detected Concerns:</b> {a.concerns.join(', ')}
                      </div>
                    )}
                    {a.subscores && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.7rem', color: '#6b7189', background: '#f6f7fb', padding: '6px', borderRadius: '8px' }}>
                        <div>Cond: <b>{Math.round(a.subscores.condition)}</b></div>
                        <div>Life: <b>{Math.round(a.subscores.lifestyle)}</b></div>
                        <div>Sleep: <b>{Math.round(a.subscores.sleep)}</b></div>
                        <div>Cons: <b>{Math.round(a.subscores.consistency)}</b></div>
                        <div>Hydr: <b>{Math.round(a.subscores.hydration)}</b></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Skincare Routine */}
          <div style={{ padding: '16px', borderRadius: '16px', background: '#f6f7fb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: PUR }}>Active Skincare Routine ({selectedPatient.active_routine.length} Steps)</div>
              <button
                onClick={() => { setSelectedPatient(null); setShowPrescribeModal(selectedPatient.patient.id); }}
                style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Overwrite Routine
              </button>
            </div>
            {selectedPatient.active_routine.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#8b8fa3' }}>No active routine prescribed yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedPatient.active_routine.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#3f4a5a', background: '#fff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #edeef4' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: PUR, marginRight: '6px' }}>[{r.time_of_day}] Step {r.step_number}:</span>
                      <b>{r.step_category}</b> — {r.product_name}
                      {r.active_ingredients?.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#8b8fa3' }}>Actives: {r.active_ingredients.join(', ')}</div>
                      )}
                    </div>
                    {r.prescribed_by_doctor && (
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(47,107,76,0.1)', color: PUR, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Rx Doctor
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress Photos */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#171433', marginBottom: '10px' }}>Progress Photos ({selectedPatient.progress_photos.length})</div>
            {selectedPatient.progress_photos.length ? (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {selectedPatient.progress_photos.map((p: any) => (
                  <div key={p.id} style={{ minWidth: '130px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #edeef4' }}>
                    <img src={p.url} alt={p.tag} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                    <div style={{ padding: '6px', fontSize: '0.72rem', textAlign: 'center', background: '#fff' }}>{p.tag} ({p.score} pts)</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#8b8fa3', background: '#f6f7fb', padding: '12px', borderRadius: '10px' }}>Not available — no progress photos uploaded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── 6. Clinical Routine Prescription Modal ──
  const rxModal = showPrescribeModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,20,51,0.35)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowPrescribeModal(null); }}>
      <div style={{ width: '620px', maxWidth: '96vw', borderRadius: '24px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 32px 80px -20px rgba(23,20,51,0.35)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #edeef4' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#171433' }}>Clinical Routine Prescription Overwrite</div>
            <div style={{ fontSize: '0.76rem', color: '#8b8fa3' }}>Compose active clinical routine steps with medical safety overrides</div>
          </div>
          <button onClick={() => setShowPrescribeModal(null)} style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #edeef4', background: '#f6f7fb', cursor: 'pointer', fontSize: '0.95rem', color: '#8b8fa3' }}>×</button>
        </div>

        {prescribeSuccess ? (
          <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
            ✅ Clinical routine prescription saved & persisted! Patient checklist updated.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {prescribeError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem' }}>
                {prescribeError}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#7c8199', display: 'block', marginBottom: '6px' }}>CLINICAL INSTRUCTIONS & DOCTOR NOTES</label>
              <textarea
                placeholder="Write medical notes (e.g. Apply Adapalene 0.1% alternate evenings, discontinue harsh physical scrubs)..."
                value={doctorNotes}
                onChange={e => setDoctorNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #edeef4', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#7c8199' }}>PRESCRIBED ROUTINE STEPS ({prescribeSteps.length})</label>
                <button
                  type="button"
                  onClick={handleAddStep}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${PUR}`, background: 'transparent', color: PUR, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Add Step
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {prescribeSteps.map((step, idx) => (
                  <div key={idx} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #edeef4', background: '#f6f7fb', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={step.time_of_day}
                        onChange={e => handleStepChange(idx, 'time_of_day', e.target.value)}
                        style={{ padding: '6px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem', background: '#fff' }}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Category (e.g. Cleansing, Treatment)"
                        value={step.step_category}
                        onChange={e => handleStepChange(idx, 'step_category', e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem' }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={step.product_name}
                        onChange={e => handleStepChange(idx, 'product_name', e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem' }}
                      />

                      <input
                        type="text"
                        placeholder="Actives (comma separated)"
                        value={step.active_ingredients.join(', ')}
                        onChange={e => handleStepChange(idx, 'active_ingredients', e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={submitPrescription}
              disabled={prescribeLoading || !doctorNotes || prescribeSteps.length === 0}
              style={{
                padding: '13px 20px',
                borderRadius: '12px',
                background: (prescribeLoading || !doctorNotes || prescribeSteps.length === 0) ? '#a3a7bd' : PUR,
                border: 'none',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: (prescribeLoading || !doctorNotes || prescribeSteps.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {prescribeLoading ? 'Applying Prescription…' : 'Save & Overwrite Routine'}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {headerStats}
        {apptQueueCard}

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'minmax(0,2.1fr) minmax(260px,1fr)' }}>
          {rosterTable}
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
          {banner}
        </div>
      </div>
    </>
  );
}
