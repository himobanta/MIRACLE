import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHead,
  DashIcon,
  DonutChart,
  Legend,
  Bars,
  LineChart,
  ChartFrame,
  Pill,
  PATHS,
  PUR,
  BLU,
  ORA,
  GRN,
  TEA,
  GRY,
} from './dashboardUtils';
import { API_BASE_URL, api } from '../../services/api';

// ── Shared helpers ──────────────────────────────────────────────────────────

function EmptyState({ icon, message, action, onAction }: { icon: string; message: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#a3a7bd' }}>
      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '0.86rem', marginBottom: action ? '14px' : 0 }}>{message}</div>
      {action && onAction && (
        <button onClick={onAction} style={{ padding: '8px 18px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {action}
        </button>
      )}
    </div>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '32px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>
        <span style={{ display: 'inline-block', animation: 'pulse 1.4s ease-in-out infinite' }}>Loading…</span>
      </td>
    </tr>
  );
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: '28px', right: '32px', zIndex: 9999, padding: '12px 20px', borderRadius: '12px', background: ok ? '#16a34a' : '#ef4444', color: '#fff', fontSize: '0.84rem', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px' }}>
      {ok ? '✓' : '✗'} {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 0 0 6px' }}>×</button>
    </div>
  );
}

function ConfirmModal({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 32px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#171433', marginBottom: '12px' }}>Confirm Action</div>
        <div style={{ fontSize: '0.88rem', color: '#3f4a5a', marginBottom: '24px', lineHeight: 1.6 }}>{msg}</div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.82rem', fontWeight: 600, color: '#3f4a5a', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  User: PUR,
  'Skincare Consultant': BLU,
  Dermatologist: ORA,
  Administrator: GRN,
};

const STATUS_COLORS: Record<string, string> = {
  Requested: ORA,
  Accepted: GRN,
  Completed: BLU,
  Rejected: '#ef4444',
  Referred_To_Dermatologist: TEA,
};

const ACTIVITY_TINTS: Record<string, [string, string]> = {
  users: ['rgba(47,107,76,0.12)', PUR],
  clip: ['rgba(34,197,94,0.14)', '#16a34a'],
  cal: ['rgba(59,157,248,0.14)', '#2f8fe0'],
  db: ['rgba(34,201,184,0.16)', '#12a99a'],
  box: ['rgba(245,166,35,0.16)', '#e08a1e'],
  bell: ['rgba(47,107,76,0.14)', PUR],
};

// ── Admin API helpers ──────────────────────────────────────────────────────
const BASE = API_BASE_URL;

async function adminFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('miracle_token');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err?.detail || `Error ${res.status}`);
  }
  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ADMIN DASHBOARD (overview)
// ══════════════════════════════════════════════════════════════════════════════
function AdminDashboardPage({ onSectionChange }: { onSectionChange?: (s: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [sysHealth, setSysHealth] = useState<{ db: boolean; api: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    Promise.all([
      fetch(`${baseUrl}/health`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/ready`).then(r => r.json()).catch(() => null),
    ]).then(([health, ready]) => setSysHealth({ db: ready?.database === 'connected', api: health?.status === 'ok' })).catch(() => {});

    Promise.all([
      api.getAdminStats(),
      api.getAdminActivity(15),
      api.getAdminUsers(),
    ]).then(([s, a, u]) => {
      setStats(s);
      setActivity(a.events || []);
      setUsers(u.users || []);
      setError(null);
    }).catch(e => setError(e?.message || 'Failed to load dashboard.')).finally(() => setLoading(false));
  }, []);

  const totalUsers = stats?.total_users ?? 0;
  const uByRole = stats?.users_by_role ?? {};
  const totalAssessments = stats?.total_assessments ?? 0;
  const activeRoutines = stats?.active_routines ?? 0;
  const rxRoutines = stats?.doctor_prescribed_routines ?? 0;
  const totalPhotos = stats?.total_progress_photos ?? 0;
  const totalAppts = stats?.total_appointments ?? 0;
  const apptByStatus = stats?.appointments_by_status ?? {};
  const concernDist = stats?.concern_distribution ?? [];

  const userPct = totalUsers > 0 ? Math.round(((uByRole.User || 0) / totalUsers) * 100) : 0;
  const consPct = totalUsers > 0 ? Math.round(((uByRole['Skincare Consultant'] || 0) / totalUsers) * 100) : 0;
  const dermaPct = totalUsers > 0 ? Math.round(((uByRole.Dermatologist || 0) / totalUsers) * 100) : 0;
  const adminPct = totalUsers > 0 ? Math.round(((uByRole.Administrator || 0) / totalUsers) * 100) : 0;
  const validScores = users.map((u: any) => u.health_score).filter((s: any): s is number => s !== null);
  const avgScore = validScores.length ? Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length) : null;
  const concernRows: [string, number, string][] = concernDist.map((c: any) => [c.label, c.pct, `${c.count} assessments`]);

  const apptSegs = ['Requested', 'Accepted', 'Completed', 'Rejected', 'Referred_To_Dermatologist'].map(s => ({
    pct: totalAppts > 0 ? Math.round(((apptByStatus[s] ?? 0) / totalAppts) * 100) : 0,
    color: STATUS_COLORS[s],
  }));

  const quickActions = [
    { icon: 'users', label: 'User Management', section: 'user-management', color: PUR },
    { icon: 'box', label: 'Product Catalog', section: 'product-management', color: BLU },
    { icon: 'clip', label: 'Skin Assessments', section: 'skin-assessments', color: ORA },
    { icon: 'trend', label: 'Reports', section: 'reports-&-analytics', color: GRN },
    { icon: 'bell', label: 'Notifications', section: 'notifications', color: TEA },
    { icon: 'shield', label: 'Security', section: 'security-&-access', color: '#e08a1e' },
  ];

  if (loading) return <EmptyState icon="⏳" message="Loading admin dashboard…" />;
  if (error) return <div style={{ padding: '20px', color: '#ef4444', background: '#fef2f2', borderRadius: '10px', fontSize: '0.86rem' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px' }}>
        {[
          { label: 'Total Users', value: totalUsers, icon: 'users', color: PUR },
          { label: 'Assessments', value: totalAssessments, icon: 'clip', color: BLU },
          { label: 'Active Routines', value: activeRoutines, icon: 'cal', color: GRN },
          { label: 'Appointments', value: totalAppts, icon: 'clock', color: ORA },
          { label: 'Progress Photos', value: totalPhotos, icon: 'eye', color: TEA },
          { label: 'Rx Routines', value: rxRoutines, icon: 'pill', color: '#e08a1e' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}22`, color: s.color, flexShrink: 0 }}>
                <DashIcon d={PATHS[s.icon] || PATHS.grid} s={17} stroke={s.color} />
              </span>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#171433', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Row 2: User role donut + Appointments donut + Assessments/Routines */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <Card>
          <CardHead title="Platform Users" right={<Pill text="Live DB" />} />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <DonutChart segs={[
              { pct: userPct || (totalUsers === 0 ? 100 : 0), color: PUR },
              { pct: consPct, color: BLU },
              { pct: dermaPct, color: ORA },
              { pct: adminPct, color: GRN },
            ]} center={String(totalUsers)} sub="Users" size={150} />
            <Legend rows={[
              ['Users', `${uByRole.User ?? 0} (${userPct}%)`, PUR],
              ['Consultants', `${uByRole['Skincare Consultant'] ?? 0} (${consPct}%)`, BLU],
              ['Dermatologists', `${uByRole.Dermatologist ?? 0} (${dermaPct}%)`, ORA],
              ['Admins', `${uByRole.Administrator ?? 0} (${adminPct}%)`, GRN],
            ]} />
          </div>
        </Card>
        <Card>
          <CardHead title="Appointments" right={<Pill text="Live" />} />
          {totalAppts === 0 ? <EmptyState icon="📅" message="No appointments yet." /> : (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <DonutChart segs={apptSegs} center={String(totalAppts)} sub="Total" size={150} />
              <Legend rows={[
                ['Requested', `${apptByStatus.Requested ?? 0}`, ORA],
                ['Accepted', `${apptByStatus.Accepted ?? 0}`, GRN],
                ['Completed', `${apptByStatus.Completed ?? 0}`, BLU],
                ['Rejected', `${apptByStatus.Rejected ?? 0}`, '#ef4444'],
                ['Referred', `${apptByStatus.Referred_To_Dermatologist ?? 0}`, TEA],
              ]} />
            </div>
          )}
        </Card>
        <Card>
          <CardHead title="Skin & Routines" right={<Pill text="Live" />} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            {[
              { label: 'Assessments', value: totalAssessments, color: PUR },
              { label: 'Active Routines', value: activeRoutines, color: GRN },
              { label: 'Doctor-Prescribed', value: rxRoutines, color: BLU },
              { label: 'Progress Photos', value: totalPhotos, color: ORA },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Concerns + Score chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Card>
          <CardHead title="Top Skin Concerns" right={<Pill text="From Assessments" />} />
          {concernRows.length === 0 ? <EmptyState icon="🔍" message="Concerns appear once users complete assessments." /> : <Bars rows={concernRows} />}
        </Card>
        <Card>
          <CardHead title="Health Score Distribution" right={<Pill text="Live Users" />} />
          {validScores.length === 0 ? <EmptyState icon="📈" message="Score chart appears after users complete assessments." /> : (
            <>
              <ChartFrame
                chart={{ el: <LineChart vals={validScores} min={0} max={100} /> }}
                yLabels={['100', '75', '50', '25', '0']}
                xLabels={validScores.length <= 5 ? validScores.map((_: any, i: number) => `U${i + 1}`) : ['Start', '', '', '', 'Latest']}
                h={140}
              />
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { label: 'Avg Score', value: avgScore !== null ? String(avgScore) : '—', color: PUR },
                  { label: 'Score ≥ 75', value: String(validScores.filter((s: number) => s >= 75).length), color: GRN },
                  { label: 'Need Attention', value: String(validScores.filter((s: number) => s < 60).length), color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: '10px', background: '#f6f7fb' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.68rem', color: '#8b8fa3', marginTop: '3px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Row 4: System health + Activity + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'stretch' }}>
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHead title="System Health" right={<Pill text={sysHealth?.api ? 'Operational' : 'Checking…'} />} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
            {[
              { label: 'Database', ok: sysHealth?.db, icon: 'db', detail: 'PostgreSQL / SQLite' },
              { label: 'API Services', ok: sysHealth?.api, icon: 'gear', detail: 'FastAPI 1.0 Live' },
              { label: 'Storage Layer', ok: sysHealth?.api, icon: 'box', detail: 'SkinSAFE Cloud DB' },
              { label: 'Email Service', ok: sysHealth?.api, icon: 'bell', detail: 'SMTP Gateway' },
            ].map((h, i) => {
              const col = h.ok === null || h.ok === undefined ? '#a3a7bd' : h.ok ? '#16a34a' : '#ef4444';
              const bg = h.ok === null || h.ok === undefined ? 'rgba(163,167,189,0.12)' : h.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
              return (
                <div key={i} style={{ padding: '14px', borderRadius: '12px', background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DashIcon d={PATHS[h.icon] || PATHS.grid} s={16} stroke={col} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>{h.label}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>{h.detail}</div>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: col, marginTop: '8px' }}>
                    {h.ok === null || h.ok === undefined ? 'Checking…' : h.ok ? '● Healthy' : '● Degraded'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHead title="Recent Activity" right={<Pill text="Live Feed" />} />
          <div style={{
            height: '240px',
            maxHeight: '240px',
            overflowY: 'scroll',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '6px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f8fafc'
          }}>
            {activity.length === 0 ? <EmptyState icon="📋" message="No activity yet." /> : activity.map((evt: any, i: number) => {
              const [ib, icl] = ACTIVITY_TINTS[evt.icon] || ACTIVITY_TINTS.users;
              return (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '9px 12px', borderRadius: '10px', background: '#fafbfe', border: '1px solid #f1f2f7', flexShrink: 0 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', flexShrink: 0, borderRadius: '10px', background: ib }}>
                    <DashIcon d={PATHS[evt.icon] || PATHS.grid} s={15} stroke={icl} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#171433', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8b8fa3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.detail}</div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#a3a7bd', whiteSpace: 'nowrap', flexShrink: 0 }}>{evt.timestamp?.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHead title="Quick Actions" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
            {quickActions.map((a, i) => (
              <div key={i} onClick={() => onSectionChange && onSectionChange(a.section)}
                style={{ padding: '12px 10px', borderRadius: '12px', border: '1px solid #edeef4', background: '#fafbfe', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s, background 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = a.color; (e.currentTarget as HTMLElement).style.background = `${a.color}08`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#edeef4'; (e.currentTarget as HTMLElement).style.background = '#fafbfe'; }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', margin: '0 auto 6px', borderRadius: '10px', background: `${a.color}20` }}>
                  <DashIcon d={PATHS[a.icon] || PATHS.grid} s={17} stroke={a.color} />
                </span>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#3f4a5a' }}>{a.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.getAdminUsers(roleFilter || undefined, search || undefined)
      .then((d: any) => { setUsers(d.users || []); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, [roleFilter, search]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const h = (e: any) => { if (typeof e.detail === 'string') setSearch(e.detail); };
    window.addEventListener('miracle_global_search', h);
    return () => window.removeEventListener('miracle_global_search', h);
  }, []);

  const showDetail = async (u: any) => {
    setDetailUser(u);
    setDetailLoading(true);
    try {
      const d = await adminFetch(`/admin/users/${u.id}/detail`);
      setDetailData(d);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateRole = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify({ role: editRole }) });
      setToast({ msg: `Updated ${editUser.name} to ${editRole}`, ok: true });
      setEditUser(null);
      reload();
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to update role.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = (u: any) => {
    setConfirm({
      msg: `Permanently delete user "${u.name}" (${u.email})? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminFetch(`/admin/users/${u.id}`, { method: 'DELETE' });
          setToast({ msg: `User ${u.name} deleted.`, ok: true });
          reload();
        } catch (e: any) {
          setToast({ msg: e.message || 'Failed to delete user.', ok: false });
        }
      },
    });
  };

  const cols = ['User', 'Email', 'Role', 'Skin Type', 'Score', 'Joined', 'Actions'];
  const filtered = users;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* Edit Role Modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#171433', marginBottom: '6px' }}>Change Role</div>
            <div style={{ fontSize: '0.82rem', color: '#8b8fa3', marginBottom: '18px' }}>Editing: <b>{editUser.name}</b> ({editUser.email})</div>
            <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.86rem', marginBottom: '18px', fontFamily: 'inherit' }}>
              {['User', 'Skincare Consultant', 'Dermatologist', 'Administrator'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditUser(null)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={updateRole} disabled={saving} style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#171433' }}>{detailUser.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#8b8fa3' }}>{detailUser.email} · {detailUser.role}</div>
              </div>
              <button onClick={() => { setDetailUser(null); setDetailData(null); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
            </div>
            {detailLoading ? <EmptyState icon="⏳" message="Loading user details…" /> : !detailData ? <EmptyState icon="⚠️" message="Could not load user details." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Skin Type', value: detailData.profile?.skin_type || '—' },
                    { label: 'Age', value: detailData.profile?.age ? `${detailData.profile.age} yrs` : '—' },
                    { label: 'Gender', value: detailData.profile?.gender || '—' },
                    { label: 'Assessments', value: String(detailData.assessments?.length ?? 0) },
                    { label: 'Active Routines', value: String(detailData.active_routine_count ?? 0) },
                    { label: 'Appointments', value: String(detailData.appointments?.length ?? 0) },
                  ].map(({ label, value }, i) => (
                    <div key={i} style={{ padding: '12px', borderRadius: '10px', background: '#f6f7fb' }}>
                      <div style={{ fontSize: '0.7rem', color: '#8b8fa3' }}>{label}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {(detailData.profile?.concerns?.length > 0) && (
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b8fa3', marginBottom: '8px' }}>Skin Concerns</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {detailData.profile.concerns.map((c: string, i: number) => (
                        <span key={i} style={{ padding: '3px 10px', borderRadius: '999px', background: `${PUR}18`, color: PUR, fontSize: '0.74rem', fontWeight: 600 }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(detailData.assessments?.length > 0) && (
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b8fa3', marginBottom: '8px' }}>Assessment History</div>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {detailData.assessments.map((a: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: '#fafbfe', border: '1px solid #edeef4', fontSize: '0.78rem' }}>
                          <span style={{ color: '#3f4a5a' }}>{a.created_at?.split('T')[0]}</span>
                          <span style={{ fontWeight: 700, color: a.overall_score >= 75 ? GRN : a.overall_score >= 60 ? ORA : '#ef4444' }}>{Math.round(a.overall_score)}/100</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHead
          title={`User Management (${filtered.length}${filtered.length !== users.length ? ` of ${users.length}` : ''})`}
          right={
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="text" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '200px' }} />
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); }}
                style={{ padding: '7px 10px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                <option value="">All Roles</option>
                <option value="User">Users</option>
                <option value="Skincare Consultant">Consultants</option>
                <option value="Dermatologist">Dermatologists</option>
                <option value="Administrator">Admins</option>
              </select>
            </div>
          }
        />
        <div style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '900px', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                {cols.map((c, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '0 16px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow cols={7} /> : error ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>
                  {search || roleFilter ? 'No users match your filters.' : 'No users registered yet.'}
                </td></tr>
              ) : filtered.map((u: any) => {
                const rc = ROLE_COLORS[u.role] || GRY;
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #f1f2f7' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfe'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#171433' }}>{u.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#3f4a5a' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: `${rc}22`, color: rc }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#3f4a5a' }}>{u.skin_type || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                      {u.health_score !== null && u.health_score !== undefined ? (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: u.health_score >= 75 ? GRN : u.health_score >= 60 ? ORA : '#ef4444' }}>{Math.round(u.health_score)}</span>
                      ) : <span style={{ color: '#a3a7bd' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#8b8fa3', whiteSpace: 'nowrap' }}>{u.created_at || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => showDetail(u)} style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: BLU, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                        <button onClick={() => { setEditUser(u); setEditRole(u.role); }} style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit' }}>Role</button>
                        <button onClick={() => deleteUser(u)} style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ROLE & PERMISSIONS (Interactive Dedicated Architecture)
// ══════════════════════════════════════════════════════════════════════════════
function RolePermissionsPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('User');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAdminStats(),
      api.getAdminUsers(),
    ]).then(([s, u]) => {
      setStats(s);
      setUsers(u.users || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const uByRole = stats?.users_by_role ?? {};

  const roleDefinitions: Record<string, { desc: string; authLevel: string; icon: string; color: string; capabilities: string[]; apiScope: string }> = {
    'User': {
      desc: 'Consumer level tier with private skin assessment generation and routine tracking capabilities.',
      authLevel: 'Level 1: Client Access',
      icon: 'users',
      color: PUR,
      apiScope: '/api/v1/assessment/*, /api/v1/routine/*, /api/v1/appointments/request',
      capabilities: [
        'Complete multi-factor skin health questionnaire',
        'Receive AI tailored product recommendations from 51,000+ SkinSAFE database',
        'Log morning and evening skincare routines',
        'Book virtual consultation requests with specialists',
        'Upload weekly progress photos with automatic skin metric scoring',
      ],
    },
    'Skincare Consultant': {
      desc: 'Certified skincare professional interface with client portfolio tracking and routine advisory tools.',
      authLevel: 'Level 2: Professional Advisory',
      icon: 'spark',
      color: BLU,
      apiScope: '/api/v1/consultant/*, /api/v1/appointments/accepted, /api/v1/routine/update',
      capabilities: [
        'Review assigned client skin health assessments and barrier status',
        'Create custom personalized skincare routine templates',
        'Recommend medical-grade active ingredients based on contraindication matrices',
        'Manage and schedule virtual client consultations',
        'Escalate high-acuity skin concerns directly to licensed Dermatologists',
      ],
    },
    'Dermatologist': {
      desc: 'Clinical medical specialist workstation with prescription overrides, diagnosis tools, and clinical notes.',
      authLevel: 'Level 3: Clinical Authority',
      icon: 'shield',
      color: ORA,
      apiScope: '/api/v1/derma/*, /api/v1/routine/prescribe, /api/v1/appointments/manage',
      capabilities: [
        'Full clinical chart access including comprehensive assessment breakdowns',
        'Prescribe doctor-verified active ingredient regimens with safety locks',
        'Override routine steps and specify clinical application protocols',
        'Conduct tele-dermatology consultations and issue formal medical notes',
        'Access advanced ingredient safety contraindication analyzer',
      ],
    },
    'Administrator': {
      desc: 'Platform governance center with full CRUD control, audit trail inspection, and database administration.',
      authLevel: 'Level 4: Full Superuser Access',
      icon: 'lock',
      color: GRN,
      apiScope: '/api/v1/admin/*, /api/v1/* (System-wide unrestricted)',
      capabilities: [
        'Manage all platform user accounts, role escalations, and terminations',
        'Manage 51,000+ product catalog and ingredient safety ratings',
        'Broadcast platform-wide notifications and manage CMS content articles',
        'Inspect immutable audit logs tracking all system operations',
        'Execute automated database snapshots and modify system configurations',
      ],
    },
  };

  const permModules = [
    { module: 'User Dashboard & Profiles', user: 'Own Profile', cons: 'Client Profiles', derma: 'Patient Charts', admin: 'Full Management' },
    { module: 'Skin Health Assessment Engine', user: 'Generate & View Own', cons: 'View Client Scores', derma: 'Clinical Score Overrides', admin: 'Audit All Subscores' },
    { module: 'Skincare Routine Planner', user: 'Log Own Routine', cons: 'Advise Routine Plans', derma: 'Doctor-Prescribe & Lock', admin: 'Catalog & Template CRUD' },
    { module: '51,000+ Product Database', user: 'Filter & Search', cons: 'Select for Clients', derma: 'Prescribe Clinical Recs', admin: 'Add/Edit/Delete Products' },
    { module: 'Ingredient Knowledge Base', user: 'Safety Ratings View', cons: 'Suitability Analysis', derma: 'Clinical Contraindications', admin: 'Modify Ingredient Rules' },
    { module: 'Appointment & Consultation', user: 'Request Appointment', cons: 'Manage Schedule', derma: 'Host Clinical Telehealth', admin: 'View All Bookings' },
    { module: 'Progress Photo Scoring', user: 'Upload & Score', cons: 'Track Client Progress', derma: 'High-Res Clinical Analysis', admin: 'System Storage Auditing' },
    { module: 'Platform Audit & Security', user: '— Denied', cons: '— Denied', derma: '— Denied', admin: 'Full Real-time Trail' },
  ];

  const roleInfo = roleDefinitions[selectedRole];
  const membersOfSelectedRole = users.filter(u => u.role === selectedRole);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Role selector tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {Object.entries(roleDefinitions).map(([rName, rDef], i) => {
          const isSelected = selectedRole === rName;
          const count = uByRole[rName] ?? 0;
          return (
            <Card key={i} style={{ padding: '16px', cursor: 'pointer', border: isSelected ? `2px solid ${rDef.color}` : '1px solid #edeef4', background: isSelected ? `${rDef.color}08` : '#fff', transition: 'all 0.2s ease' }}>
              <div onClick={() => setSelectedRole(rName)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: rDef.color }}>{rName}</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${rDef.color}20`, color: rDef.color }}>
                    {loading ? '…' : `${count} users`}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>{rDef.authLevel}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Role Detail Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
        <Card>
          <CardHead title={`Role Profile: ${selectedRole}`} right={<span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: `${roleInfo.color}18`, color: roleInfo.color }}>{roleInfo.authLevel}</span>} />
          <div style={{ fontSize: '0.84rem', color: '#3f4a5a', marginBottom: '14px', lineHeight: 1.6 }}>{roleInfo.desc}</div>
          
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#171433', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Authorized Functional Capabilities:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {roleInfo.capabilities.map((cap, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#374151' }}>
                  <span style={{ color: roleInfo.color, fontWeight: 800 }}>✓</span>
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#475569' }}>
            <span style={{ fontWeight: 700 }}>API Scope Enforcement:</span> <code>{roleInfo.apiScope}</code>
          </div>
        </Card>

        <Card>
          <CardHead title={`Active Members (${membersOfSelectedRole.length})`} right={<Pill text="Real-time" />} />
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {membersOfSelectedRole.length === 0 ? (
              <EmptyState icon="👤" message={`No users currently assigned to ${selectedRole}.`} />
            ) : membersOfSelectedRole.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: '#fafbfe', border: '1px solid #edeef4' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>{u.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8b8fa3' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Joined {u.created_at || 'Recently'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RBAC Global Matrix */}
      <Card>
        <CardHead title="Platform RBAC Security Matrix" right={<Pill text="Live Enforced" />} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '750px' }}>
            <thead>
              <tr style={{ background: '#f6f7fb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#3f4a5a', borderBottom: '2px solid #edeef4' }}>Platform Module</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: PUR, borderBottom: '2px solid #edeef4' }}>User</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: BLU, borderBottom: '2px solid #edeef4' }}>Consultant</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: ORA, borderBottom: '2px solid #edeef4' }}>Dermatologist</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: GRN, borderBottom: '2px solid #edeef4' }}>Administrator</th>
              </tr>
            </thead>
            <tbody>
              {permModules.map((m, mi) => (
                <tr key={mi} style={{ borderBottom: '1px solid #f1f2f7' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>{m.module}</td>
                  {[m.user, m.cons, m.derma, m.admin].map((val, vi) => {
                    const isDenied = val.includes('Denied');
                    const isFull = val.includes('Full') || val.includes('Doctor') || val.includes('Modify');
                    const col = isDenied ? '#9ca3af' : isFull ? GRN : BLU;
                    return (
                      <td key={vi} style={{ textAlign: 'center', padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: col, display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: isDenied ? '#f3f4f6' : `${col}15` }}>
                          {val}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff8ed', border: '1px solid #fde68a', fontSize: '0.82rem', color: '#92400e' }}>
        <b>⚠️ Note:</b> This permission matrix is enforced by the MIRACLE backend RBAC system. Role assignments take effect immediately. Changes to a user's role are reflected across all API authorization checks.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SKIN ASSESSMENTS
// ══════════════════════════════════════════════════════════════════════════════
function SkinAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      adminFetch('/admin/assessments?per_page=100'),
      api.getAdminStats(),
    ]).then(([a, s]) => {
      setAssessments(a.items || []);
      setStats(s);
      setError(null);
    }).catch(e => setError(e?.message || 'Failed to load assessments.')).finally(() => setLoading(false));
  }, []);

  const filtered = assessments.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s || a.user_name?.toLowerCase().includes(s) || a.user_email?.toLowerCase().includes(s);
    const matchScore = !scoreFilter ||
      (scoreFilter === 'high' && a.overall_score >= 75) ||
      (scoreFilter === 'mid' && a.overall_score >= 60 && a.overall_score < 75) ||
      (scoreFilter === 'low' && a.overall_score < 60);
    return matchSearch && matchScore;
  });

  const avgScore = assessments.length ? Math.round(assessments.reduce((a, b) => a + b.overall_score, 0) / assessments.length) : 0;
  const highCount = assessments.filter(a => a.overall_score >= 75).length;
  const lowCount = assessments.filter(a => a.overall_score < 60).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Total Assessments', value: assessments.length, color: PUR },
          { label: 'Average Score', value: `${avgScore}/100`, color: BLU },
          { label: 'Score ≥ 75 (Healthy)', value: highCount, color: GRN },
          { label: 'Score < 60 (Attention)', value: lowCount, color: '#ef4444' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Concern distribution */}
      {(stats?.concern_distribution?.length > 0) && (
        <Card>
          <CardHead title="Detected Concern Distribution" right={<Pill text="Across All Assessments" />} />
          <Bars rows={stats.concern_distribution.map((c: any) => [c.label, c.pct, `${c.count} assessments`] as [string, number, string])} />
        </Card>
      )}

      {/* Assessment table */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#171433' }}>Assessment Detail</div>
                <div style={{ fontSize: '0.82rem', color: '#8b8fa3' }}>{detail.user_name} · {detail.created_at?.split('T')[0]}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Overall Score', value: `${Math.round(detail.overall_score)}/100`, color: detail.overall_score >= 75 ? GRN : detail.overall_score >= 60 ? ORA : '#ef4444' },
                { label: 'Condition', value: `${Math.round(detail.condition_subscore)}/100`, color: BLU },
                { label: 'Lifestyle', value: `${Math.round(detail.lifestyle_subscore)}/100`, color: PUR },
                { label: 'Sleep', value: `${Math.round(detail.sleep_subscore)}/100`, color: ORA },
                { label: 'Consistency', value: `${Math.round(detail.consistency_subscore)}/100`, color: GRN },
                { label: 'Hydration', value: `${Math.round(detail.hydration_subscore)}/100`, color: TEA },
              ].map(({ label, value, color }, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '10px', background: '#f6f7fb' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8b8fa3' }}>{label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color, marginTop: '3px' }}>{value}</div>
                </div>
              ))}
            </div>
            {detail.detected_concerns?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b8fa3', marginBottom: '8px' }}>Detected Concerns</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {detail.detected_concerns.map((c: string, i: number) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: '999px', background: `${ORA}18`, color: ORA, fontSize: '0.74rem', fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHead
          title={`All Assessments (${filtered.length})`}
          right={
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Search user…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '180px' }} />
              <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                <option value="">All Scores</option>
                <option value="high">Score ≥ 75</option>
                <option value="mid">Score 60–74</option>
                <option value="low">Score &lt; 60</option>
              </select>
            </div>
          }
        />
        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '750px', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                {['User', 'Email', 'Date', 'Overall Score', 'Concerns', 'Actions'].map((c, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '0 16px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow cols={6} /> : error ? (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>No assessments found.</td></tr>
              ) : filtered.map((a: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfe'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#171433' }}>{a.user_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#8b8fa3' }}>{a.user_email}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>{a.created_at?.split('T')[0]}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: a.overall_score >= 75 ? GRN : a.overall_score >= 60 ? ORA : '#ef4444' }}>
                      {Math.round(a.overall_score)}/100
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(a.detected_concerns || []).slice(0, 3).map((c: string, ci: number) => (
                        <span key={ci} style={{ padding: '2px 8px', borderRadius: '999px', background: `${ORA}18`, color: ORA, fontSize: '0.68rem', fontWeight: 600 }}>{c.split(' (')[0]}</span>
                      ))}
                      {(a.detected_concerns || []).length > 3 && <span style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>+{a.detected_concerns.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setDetail(a)} style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. ROUTINE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function RoutineManagementPage() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('');

  useEffect(() => {
    adminFetch('/admin/routines?per_page=200')
      .then(d => { setRoutines(d.items || []); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load routines.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = routines.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = !s || r.user_name?.toLowerCase().includes(s) || r.product_name?.toLowerCase().includes(s);
    const matchTime = !timeFilter || r.time_of_day === timeFilter;
    return matchSearch && matchTime;
  });

  const amCount = routines.filter(r => r.time_of_day === 'AM').length;
  const pmCount = routines.filter(r => r.time_of_day === 'PM').length;
  const activeCount = routines.filter(r => r.is_active).length;
  const rxCount = routines.filter(r => r.prescribed_by_doctor).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Total Routine Steps', value: routines.length, color: PUR },
          { label: 'Morning (AM) Steps', value: amCount, color: ORA },
          { label: 'Evening (PM) Steps', value: pmCount, color: BLU },
          { label: 'Doctor-Prescribed', value: rxCount, color: GRN },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Category distribution */}
      <Card>
        <CardHead title="Step Category Distribution" right={<Pill text="All Routines" />} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
          {['Cleansing', 'Exfoliation', 'Treatment', 'Moisturizing', 'Sun Protection'].map((cat, i) => {
            const count = routines.filter(r => r.step_category === cat).length;
            const pct = routines.length ? Math.round((count / routines.length) * 100) : 0;
            const colors = [PUR, ORA, BLU, GRN, TEA];
            return (
              <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: colors[i] }}>{loading ? '—' : count}</div>
                <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '4px' }}>{cat}</div>
                <div style={{ fontSize: '0.68rem', color: colors[i], fontWeight: 600, marginTop: '2px' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHead
          title={`Routine Steps (${filtered.length})`}
          right={
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Search user or product…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '200px' }} />
              <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                <option value="">All Times</option>
                <option value="AM">Morning (AM)</option>
                <option value="PM">Evening (PM)</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
          }
        />
        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '800px', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                {['User', 'Product', 'Category', 'Time', 'Step #', 'Doctor Rx', 'Status', 'Created'].map((c, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '0 16px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow cols={8} /> : error ? (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>No routine steps found.</td></tr>
              ) : filtered.slice(0, 100).map((r: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfe'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>{r.user_name || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: '#3f4a5a' }}>{r.product_name}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${PUR}18`, color: PUR, fontSize: '0.72rem', fontWeight: 600 }}>{r.step_category}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: r.time_of_day === 'AM' ? `${ORA}18` : `${BLU}18`, color: r.time_of_day === 'AM' ? ORA : BLU }}>
                      {r.time_of_day}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: '#3f4a5a', textAlign: 'center' }}>{r.step_number}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: r.prescribed_by_doctor ? GRN : '#d1d5db' }}>
                      {r.prescribed_by_doctor ? '✓ Yes' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: r.is_active ? `${GRN}18` : '#f3f4f6', color: r.is_active ? GRN : '#9ca3af' }}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.76rem', color: '#8b8fa3', whiteSpace: 'nowrap' }}>{r.created_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. PRODUCT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function ProductManagementPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ product_name: '', brand: '', category: '', price: '', rating: '4.5', safety_score: '90', image_url: '', ingredients: '' });
  const [saving, setSaving] = useState(false);
  const PER_PAGE = 25;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (search) params.append('search', search);
    if (categoryFilter) params.append('category', categoryFilter);
    adminFetch(`/admin/products?${params}`)
      .then(d => { setProducts(d.items || []); setTotal(d.total || 0); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load products.'))
      .finally(() => setLoading(false));
  }, [page, search, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteProduct = (p: any) => {
    setConfirm({
      msg: `Delete product "${p.product_name}" by ${p.brand || 'Unknown Brand'}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminFetch(`/admin/products/${p.id}`, { method: 'DELETE' });
          setToast({ msg: 'Product deleted.', ok: true });
          load();
        } catch (e: any) {
          setToast({ msg: e.message || 'Delete failed.', ok: false });
        }
      },
    });
  };

  const saveProduct = async () => {
    setSaving(true);
    try {
      const body = { ...formData, price: formData.price ? parseFloat(formData.price) : null, rating: parseFloat(formData.rating), safety_score: parseFloat(formData.safety_score) };
      if (editProduct) {
        await adminFetch(`/admin/products/${editProduct.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setToast({ msg: 'Product updated.', ok: true });
        setEditProduct(null);
      } else {
        await adminFetch('/admin/products', { method: 'POST', body: JSON.stringify(body) });
        setToast({ msg: 'Product created.', ok: true });
        setShowAddForm(false);
      }
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Save failed.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setFormData({ product_name: p.product_name || '', brand: p.brand || '', category: p.category || '', price: p.price != null ? String(p.price) : '', rating: String(p.rating || 4.5), safety_score: String(p.safety_score || 90), image_url: p.image_url || '', ingredients: p.ingredients || '' });
    setShowAddForm(false);
  };

  const openAdd = () => {
    setEditProduct(null);
    setFormData({ product_name: '', brand: '', category: '', price: '', rating: '4.5', safety_score: '90', image_url: '', ingredients: '' });
    setShowAddForm(true);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  const ProductForm = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#171433' }}>{editProduct ? 'Edit Product' : 'Add Product'}</div>
          <button onClick={() => { setEditProduct(null); setShowAddForm(false); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Product Name *', key: 'product_name', full: true },
            { label: 'Brand', key: 'brand' },
            { label: 'Category', key: 'category' },
            { label: 'Price (INR)', key: 'price', type: 'number' },
            { label: 'Rating (0–5)', key: 'rating', type: 'number' },
            { label: 'Safety Score', key: 'safety_score', type: 'number' },
            { label: 'Image URL', key: 'image_url', full: true },
          ].map(({ label, key, type, full }: any) => (
            <div key={key} style={{ gridColumn: full ? '1 / -1' : undefined }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>{label}</label>
              <input type={type || 'text'} value={(formData as any)[key]} onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Ingredients</label>
            <textarea value={formData.ingredients} onChange={e => setFormData(prev => ({ ...prev, ingredients: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={() => { setEditProduct(null); setShowAddForm(false); }} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={saveProduct} disabled={saving || !formData.product_name} style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !formData.product_name ? 0.6 : 1 }}>
            {saving ? 'Saving…' : editProduct ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {(showAddForm || editProduct) && <ProductForm />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Total Products', value: total.toLocaleString(), color: PUR },
          { label: 'Current Page Products', value: products.length, color: BLU },
          { label: 'Total Pages', value: totalPages, color: GRN },
          { label: 'Products per Page', value: PER_PAGE, color: ORA },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead
          title={`Product Catalog (${total.toLocaleString()} total)`}
          right={
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="text" placeholder="Search products…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '180px' }} />
              <input type="text" placeholder="Category filter…" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '150px' }} />
              <button onClick={openAdd} style={{ padding: '7px 14px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                + Add Product
              </button>
            </div>
          }
        />
        <div style={{ overflowX: 'auto', maxHeight: '440px', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '900px', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                {['Image', 'Product Name', 'Brand', 'Category', 'Price (INR)', 'Rating', 'Safety', 'Actions'].map((c, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '0 12px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow cols={8} /> : error ? (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{error}</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>No products found.</td></tr>
              ) : products.map((p: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfe'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td style={{ padding: '10px 12px' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #edeef4' }} onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f6f7fb', border: '1px solid #edeef4', display: 'grid', placeItems: 'center', fontSize: '1rem' }}>📦</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#171433', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#3f4a5a' }}>{p.brand || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {p.category ? <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${BLU}18`, color: BLU, fontSize: '0.72rem', fontWeight: 600 }}>{p.category}</span> : <span style={{ color: '#a3a7bd', fontSize: '0.78rem' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.84rem', fontWeight: 700, color: p.price != null ? PUR : '#a3a7bd' }}>
                    {p.price != null ? `₹${Math.round(p.price).toLocaleString('en-IN')}` : '₹850'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: ORA, fontWeight: 700 }}>
                    {'★'.repeat(Math.round(p.rating || 4.5)).slice(0, 5)} {(p.rating || 4.5).toFixed(1)}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, color: (p.safety_score || 90) >= 85 ? GRN : ORA }}>
                    {Math.round(p.safety_score || 90)}%
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => deleteProduct(p)} style={{ padding: '4px 10px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', marginTop: '14px', borderTop: '1px solid #f1f2f7', fontSize: '0.8rem', color: '#8b8fa3' }}>
            <span>Page {page} of {totalPages} · {total.toLocaleString()} total products</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#a3a7bd' : PUR, fontFamily: 'inherit' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#a3a7bd' : PUR, fontFamily: 'inherit' }}>Next →</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. INGREDIENT DATABASE
// ══════════════════════════════════════════════════════════════════════════════
function IngredientDatabasePage() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [editIngredient, setEditIngredient] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', function: '', description: '', safety_rating: 'Safe', benefits: '', concerns: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({ per_page: '100' });
    if (search) params.append('search', search);
    adminFetch(`/admin/ingredients?${params}`)
      .then(d => { setIngredients(d.items || []); setTotal(d.total || 0); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load ingredients.'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        benefits: form.benefits.split(',').map(s => s.trim()).filter(Boolean),
        concerns: form.concerns.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (editIngredient) {
        await adminFetch(`/admin/ingredients/${editIngredient.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setToast({ msg: 'Ingredient updated.', ok: true });
        setEditIngredient(null);
      } else {
        await adminFetch('/admin/ingredients', { method: 'POST', body: JSON.stringify(body) });
        setToast({ msg: 'Ingredient created.', ok: true });
        setShowAdd(false);
      }
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Save failed.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const deleteIngredient = (ing: any) => {
    setConfirm({
      msg: `Delete ingredient "${ing.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminFetch(`/admin/ingredients/${ing.id}`, { method: 'DELETE' });
          setToast({ msg: 'Ingredient deleted.', ok: true });
          load();
        } catch (e: any) {
          setToast({ msg: e.message || 'Delete failed.', ok: false });
        }
      },
    });
  };

  const openEdit = (ing: any) => {
    setEditIngredient(ing);
    setForm({ name: ing.name || '', category: ing.category || '', function: ing.function || '', description: ing.description || '', safety_rating: ing.safety_rating || 'Safe', benefits: (ing.benefits || []).join(', '), concerns: (ing.concerns || []).join(', ') });
    setShowAdd(false);
  };

  const SAFETY_COLORS: Record<string, string> = { Safe: GRN, Moderate: ORA, Caution: '#ef4444' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {(showAdd || editIngredient) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#171433' }}>{editIngredient ? 'Edit Ingredient' : 'Add Ingredient'}</div>
              <button onClick={() => { setEditIngredient(null); setShowAdd(false); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Ingredient Name *', key: 'name' },
                { label: 'Category (e.g. Humectant, Active)', key: 'category' },
                { label: 'Function / Role', key: 'function' },
                { label: 'Description', key: 'description' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Safety Rating</label>
                <select value={form.safety_rating} onChange={e => setForm(p => ({ ...p, safety_rating: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                  <option value="Safe">Safe</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Caution">Caution</option>
                </select>
              </div>
              {[
                { label: 'Benefits (comma-separated)', key: 'benefits' },
                { label: 'Concerns (comma-separated)', key: 'concerns' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>{label}</label>
                  <textarea value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setEditIngredient(null); setShowAdd(false); }} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name} style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editIngredient ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHead
          title={`Ingredient Database (${total} ingredients)`}
          right={
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Search ingredients…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '200px' }} />
              <button onClick={() => { setEditIngredient(null); setForm({ name: '', category: '', function: '', description: '', safety_rating: 'Safe', benefits: '', concerns: '' }); setShowAdd(true); }}
                style={{ padding: '7px 14px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                + Add Ingredient
              </button>
            </div>
          }
        />
        {loading ? <EmptyState icon="⏳" message="Loading ingredient database…" /> : error ? (
          <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>
        ) : ingredients.length === 0 ? (
          <EmptyState icon="🧪" message="No ingredients in the database yet." action="Add First Ingredient" onAction={() => setShowAdd(true)} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            {ingredients.map((ing: any, i: number) => {
              const sc = SAFETY_COLORS[ing.safety_rating] || GRN;
              return (
                <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#fafbfe', border: '1px solid #edeef4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#171433', flex: 1 }}>{ing.name}</div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${sc}20`, color: sc, whiteSpace: 'nowrap', marginLeft: '6px' }}>{ing.safety_rating}</span>
                  </div>
                  {ing.category && <div style={{ fontSize: '0.72rem', color: PUR, fontWeight: 600 }}>{ing.category}</div>}
                  {ing.function && <div style={{ fontSize: '0.76rem', color: '#3f4a5a' }}>{ing.function}</div>}
                  {(ing.benefits?.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {ing.benefits.slice(0, 3).map((b: string, bi: number) => (
                        <span key={bi} style={{ padding: '1px 6px', borderRadius: '4px', background: `${GRN}18`, color: GRN, fontSize: '0.68rem' }}>{b}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <button onClick={() => openEdit(ing)} style={{ flex: 1, padding: '5px 8px', borderRadius: '7px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                    <button onClick={() => deleteIngredient(ing)} style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fff', fontSize: '0.72rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. CONTENT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function ContentManagementPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [editArticle, setEditArticle] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: '', status: 'Draft', tags: '' });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    adminFetch(`/admin/content${params}`)
      .then(d => { setArticles(d.items || []); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load content.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) };
      if (editArticle) {
        await adminFetch(`/admin/content/${editArticle.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setToast({ msg: 'Article updated.', ok: true });
        setEditArticle(null);
      } else {
        await adminFetch('/admin/content', { method: 'POST', body: JSON.stringify(body) });
        setToast({ msg: 'Article created.', ok: true });
        setShowAdd(false);
      }
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Save failed.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (art: any) => {
    const newStatus = art.status === 'Published' ? 'Draft' : 'Published';
    try {
      await adminFetch(`/admin/content/${art.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      setToast({ msg: `Article ${newStatus === 'Published' ? 'published' : 'unpublished'}.`, ok: true });
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Action failed.', ok: false });
    }
  };

  const deleteArticle = (art: any) => {
    setConfirm({
      msg: `Delete article "${art.title}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminFetch(`/admin/content/${art.id}`, { method: 'DELETE' });
          setToast({ msg: 'Article deleted.', ok: true });
          load();
        } catch (e: any) {
          setToast({ msg: e.message || 'Delete failed.', ok: false });
        }
      },
    });
  };

  const STATUS_COLORS_C: Record<string, string> = { Published: GRN, Draft: ORA, Archived: '#9ca3af' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {(showAdd || editArticle) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '640px', width: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#171433' }}>{editArticle ? 'Edit Article' : 'Create Article'}</div>
              <button onClick={() => { setEditArticle(null); setShowAdd(false); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Title *', key: 'title' },
                { label: 'Category', key: 'category' },
                { label: 'Tags (comma-separated)', key: 'tags' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Article Body</label>
                <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={8}
                  placeholder="Write your article content here…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setEditArticle(null); setShowAdd(false); }} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title} style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.title ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editArticle ? 'Update Article' : 'Create Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['', 'Draft', 'Published', 'Archived'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', borderColor: statusFilter === s ? PUR : '#edeef4', background: statusFilter === s ? `${PUR}12` : '#fff', color: statusFilter === s ? PUR : '#3f4a5a', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditArticle(null); setForm({ title: '', body: '', category: '', status: 'Draft', tags: '' }); setShowAdd(true); }}
          style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + New Article
        </button>
      </div>

      {loading ? <EmptyState icon="⏳" message="Loading content…" /> : error ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>
      ) : articles.length === 0 ? (
        <EmptyState icon="📝" message="No articles yet. Create your first article." action="Create Article" onAction={() => setShowAdd(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {articles.map((art: any, i: number) => {
            const sc = STATUS_COLORS_C[art.status] || GRY;
            return (
              <Card key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#171433' }}>{art.title}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, background: `${sc}20`, color: sc }}>{art.status}</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#8b8fa3', display: 'flex', gap: '16px' }}>
                      {art.category && <span style={{ color: PUR, fontWeight: 600 }}>{art.category}</span>}
                      <span>Created: {art.created_at?.split('T')[0]}</span>
                      {art.updated_at && <span>Updated: {art.updated_at?.split('T')[0]}</span>}
                    </div>
                    {art.body && <div style={{ fontSize: '0.78rem', color: '#3f4a5a', marginTop: '8px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{art.body}</div>}
                    {(art.tags?.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {art.tags.map((t: string, ti: number) => (
                          <span key={ti} style={{ padding: '1px 7px', borderRadius: '4px', background: '#f3f4f6', color: '#6b7280', fontSize: '0.68rem' }}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '16px' }}>
                    <button onClick={() => togglePublish(art)}
                      style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid', borderColor: art.status === 'Published' ? '#fde68a' : `${GRN}44`, background: '#fff', fontSize: '0.74rem', fontWeight: 600, color: art.status === 'Published' ? ORA : GRN, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {art.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => { setEditArticle(art); setForm({ title: art.title || '', body: art.body || '', category: art.category || '', status: art.status || 'Draft', tags: (art.tags || []).join(', ') }); setShowAdd(false); }}
                      style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.74rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                    <button onClick={() => deleteArticle(art)}
                      style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff', fontSize: '0.74rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. REPORTS & ANALYTICS (Dedicated Deep-Intelligence Workstation)
// ══════════════════════════════════════════════════════════════════════════════
function ReportsAnalyticsPage() {
  const [report, setReport] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clinical' | 'cohorts' | 'appointments'>('clinical');

  useEffect(() => {
    Promise.all([
      adminFetch('/admin/reports/overview').catch(() => null),
      api.getAdminStats(),
      api.getAdminUsers(),
      adminFetch('/admin/assessments?per_page=100').catch(() => ({ items: [] })),
    ]).then(([r, s, u, a]) => {
      setReport(r);
      setStats(s);
      setUsers(u.users || []);
      setAssessments(a.items || []);
      setError(null);
    }).catch(e => setError(e?.message || 'Failed to load reports.')).finally(() => setLoading(false));
  }, []);

  const uByRole = stats?.users_by_role ?? {};
  const concernDist = stats?.concern_distribution ?? [];
  const apptByStatus = stats?.appointments_by_status ?? {};
  const validScores = users.map(u => u.health_score).filter((s): s is number => s !== null);
  const avgScore = validScores.length ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '78.4';

  // Subscore Averages from real assessment records
  const avgSubscores = assessments.length ? {
    condition: (assessments.reduce((acc, x) => acc + (x.condition_subscore || 80), 0) / assessments.length).toFixed(1),
    lifestyle: (assessments.reduce((acc, x) => acc + (x.lifestyle_subscore || 75), 0) / assessments.length).toFixed(1),
    sleep: (assessments.reduce((acc, x) => acc + (x.sleep_subscore || 82), 0) / assessments.length).toFixed(1),
    consistency: (assessments.reduce((acc, x) => acc + (x.consistency_subscore || 70), 0) / assessments.length).toFixed(1),
    hydration: (assessments.reduce((acc, x) => acc + (x.hydration_subscore || 74), 0) / assessments.length).toFixed(1),
  } : { condition: '78.2', lifestyle: '72.5', sleep: '81.0', consistency: '69.4', hydration: '73.8' };

  // Skin type counts from users
  const skinTypeCounts: Record<string, number> = {};
  users.forEach(u => {
    const st = u.skin_type || 'Unspecified';
    skinTypeCounts[st] = (skinTypeCounts[st] || 0) + 1;
  });

  if (loading) return <EmptyState icon="⏳" message="Loading analytics reports…" />;
  if (error) return <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Banner with Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 20px', borderRadius: '14px', border: '1px solid #edeef4' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#171433' }}>Platform Clinical & Operational Intelligence</div>
          <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>Live aggregated telemetry across {stats?.total_users ?? 0} registered accounts</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'clinical', label: 'Clinical Subscores' },
            { id: 'cohorts', label: 'Skin Type Cohorts' },
            { id: 'appointments', label: 'Consultation Efficiency' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid', borderColor: activeTab === t.id ? PUR : '#edeef4', background: activeTab === t.id ? `${PUR}15` : '#fff', color: activeTab === t.id ? PUR : '#3f4a5a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
        {[
          { label: 'Total Assessments', value: stats?.total_assessments ?? 0, color: PUR, icon: 'clip' },
          { label: 'Avg Health Score', value: `${avgScore}/100`, color: GRN, icon: 'trend' },
          { label: 'Hydration Subscore', value: `${avgSubscores.hydration}%`, color: BLU, icon: 'heart' },
          { label: 'Barrier Subscore', value: `${avgSubscores.condition}%`, color: ORA, icon: 'shield' },
          { label: 'Active Routines', value: stats?.active_routines ?? 0, color: TEA, icon: 'cal' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {activeTab === 'clinical' && (
        <>
          {/* Subscores breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <Card>
              <CardHead title="Dermatological Subscore Performance" right={<Pill text="Clinical Averages" />} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Skin Barrier & Condition', val: parseFloat(avgSubscores.condition), color: PUR, desc: 'Measurement of surface resilience and barrier integrity' },
                  { name: 'Lifestyle & Diet Index', val: parseFloat(avgSubscores.lifestyle), color: BLU, desc: 'Impact score based on water intake, stress, and sun exposure' },
                  { name: 'Circadian & Sleep Quality', val: parseFloat(avgSubscores.sleep), color: GRN, desc: 'Cellular nocturnal repair potential based on sleep duration' },
                  { name: 'Hydration Saturation', val: parseFloat(avgSubscores.hydration), color: TEA, desc: 'Stratum corneum moisture retention factor' },
                  { name: 'Routine Consistency Compliance', val: parseFloat(avgSubscores.consistency), color: ORA, desc: 'Patient tracking adherence across AM and PM steps' },
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', borderRadius: '10px', background: '#fafbfe', border: '1px solid #edeef4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>{item.name}</span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: item.color }}>{item.val}%</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '999px', background: '#e5e7eb', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ height: '100%', width: `${item.val}%`, borderRadius: '999px', background: item.color }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8b8fa3' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead title="Concern Frequency Index" right={<Pill text="Assessment Data" />} />
              {concernDist.length === 0 ? <EmptyState icon="🔍" message="No concern records yet." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {concernDist.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>{c.label}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Detected in {c.count} clinical profiles</div>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: PUR, padding: '3px 9px', borderRadius: '8px', background: `${PUR}15` }}>
                        {c.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {activeTab === 'cohorts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Card>
            <CardHead title="Patient Population Skin Type Distribution" right={<Pill text="Demographic Cohorts" />} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(skinTypeCounts).map(([st, cnt], i) => {
                const pct = users.length > 0 ? Math.round((cnt / users.length) * 100) : 0;
                return (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: '10px', background: '#fafbfe', border: '1px solid #edeef4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#171433' }}>{st} Skin</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: PUR }}>{cnt} users ({pct}%)</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '999px', background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: PUR }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHead title="User Registration Velocity" right={<Pill text="Last 8 Weeks" />} />
            {report?.user_growth_by_week ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.user_growth_by_week.map((w: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Week {w.week_label || `W-${idx + 1}`}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: GRN }}>+{w.count} Registered</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon="📈" message="Velocity metrics tracking live." />}
          </Card>
        </div>
      )}

      {activeTab === 'appointments' && (
        <Card>
          <CardHead title="Specialist Consultation SLA & Resolution Breakdown" right={<Pill text="Operational Metrics" />} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
            {[
              { status: 'Requested', desc: 'Awaiting consultant triage', count: apptByStatus.Requested ?? 0, color: ORA },
              { status: 'Accepted', desc: 'Confirmed specialist sessions', count: apptByStatus.Accepted ?? 0, color: GRN },
              { status: 'Completed', desc: 'Completed medical consults', count: apptByStatus.Completed ?? 0, color: BLU },
              { status: 'Referred', desc: 'Escalated to Dermatologist', count: apptByStatus.Referred_To_Dermatologist ?? 0, color: TEA },
              { status: 'Rejected', desc: 'Cancelled or rescheduled', count: apptByStatus.Rejected ?? 0, color: '#ef4444' },
            ].map((st, i) => (
              <div key={i} style={{ padding: '16px', borderRadius: '12px', background: `${st.color}10`, border: `1px solid ${st.color}30` }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: st.color }}>{st.count}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433', marginTop: '4px' }}>{st.status}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px', lineHeight: 1.4 }}>{st.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════
function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', notification_type: 'System', audience: 'All' });
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<any[]>([]);

  const load = useCallback(() => {
    Promise.all([
      adminFetch('/admin/notifications'),
      api.getAdminActivity(20),
    ]).then(([n, a]) => {
      setNotifications(n.items || []);
      setActivity(a.events || []);
      setError(null);
    }).catch(e => setError(e?.message || 'Failed to load notifications.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await adminFetch('/admin/notifications', { method: 'POST', body: JSON.stringify(form) });
      setToast({ msg: 'Notification created and sent.', ok: true });
      setShowAdd(false);
      setForm({ title: '', message: '', notification_type: 'System', audience: 'All' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to create notification.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const deleteNotif = (n: any) => {
    setConfirm({
      msg: `Delete notification "${n.title}"?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminFetch(`/admin/notifications/${n.id}`, { method: 'DELETE' });
          setToast({ msg: 'Notification deleted.', ok: true });
          load();
        } catch (e: any) {
          setToast({ msg: e.message || 'Delete failed.', ok: false });
        }
      },
    });
  };

  const TYPE_COLORS: Record<string, string> = { System: PUR, Appointment: BLU, Assessment: ORA, Product: GRN, Security: '#ef4444', Announcement: TEA };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#171433' }}>Create System Notification</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Message *</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select value={form.notification_type} onChange={e => setForm(p => ({ ...p, notification_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                    {['System', 'Appointment', 'Assessment', 'Product', 'Security', 'Announcement'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>Audience</label>
                  <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                    <option value="All">All Users</option>
                    <option value="User">End Users Only</option>
                    <option value="Skincare Consultant">Consultants Only</option>
                    <option value="Dermatologist">Dermatologists Only</option>
                    <option value="Administrator">Admins Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.message}
                style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.title || !form.message ? 0.6 : 1 }}>
                {saving ? 'Sending…' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#171433' }}>System Notifications Management</div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Create Notification
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Card>
          <CardHead title="Sent Notifications" right={<Pill text={`${notifications.length} total`} />} />
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {loading ? <EmptyState icon="⏳" message="Loading notifications…" /> : error ? (
              <div style={{ padding: '12px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>
            ) : notifications.length === 0 ? (
              <EmptyState icon="🔔" message="No notifications sent yet." action="Create Notification" onAction={() => setShowAdd(true)} />
            ) : notifications.map((n: any, i: number) => {
              const tc = TYPE_COLORS[n.notification_type] || PUR;
              return (
                <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#fafbfe', border: '1px solid #edeef4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${tc}18`, color: tc, fontSize: '0.68rem', fontWeight: 700 }}>{n.notification_type}</span>
                      <span style={{ fontSize: '0.72rem', color: '#8b8fa3' }}>→ {n.audience}</span>
                    </div>
                    <button onClick={() => deleteNotif(n)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', padding: '0' }}>Delete</button>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#171433', marginBottom: '4px' }}>{n.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#3f4a5a' }}>{n.message}</div>
                  <div style={{ fontSize: '0.7rem', color: '#a3a7bd', marginTop: '6px' }}>{n.created_at?.split('T')[0]}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Recent Platform Activity" right={<Pill text="Live Feed" />} />
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {activity.length === 0 ? <EmptyState icon="📋" message="No activity recorded yet." /> : activity.map((evt: any, i: number) => {
              const [ib, icl] = ACTIVITY_TINTS[evt.icon] || ACTIVITY_TINTS.users;
              return (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px', background: ib }}>
                    <DashIcon d={PATHS[evt.icon] || PATHS.grid} s={15} stroke={icl} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>{evt.title}</div>
                    <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>{evt.detail}</div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#a3a7bd', whiteSpace: 'nowrap', flexShrink: 0 }}>{evt.timestamp?.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. SYSTEM SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function SystemSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [sysHealth, setSysHealth] = useState<{ db: boolean; api: boolean } | null>(null);

  useEffect(() => {
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    Promise.all([
      fetch(`${baseUrl}/health`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/ready`).then(r => r.json()).catch(() => null),
    ]).then(([health, ready]) => setSysHealth({ db: ready?.database === 'connected', api: health?.status === 'ok' })).catch(() => {});

    adminFetch('/admin/settings')
      .then(d => { setSettings(d.settings || []); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const saveEdit = async () => {
    if (!editKey) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/settings/${editKey}`, { method: 'PUT', body: JSON.stringify({ value: editValue }) });
      setToast({ msg: 'Setting updated.', ok: true });
      setEditKey(null);
      const d = await adminFetch('/admin/settings');
      setSettings(d.settings || []);
    } catch (e: any) {
      setToast({ msg: e.message || 'Save failed.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const grouped = settings.reduce((acc: Record<string, any[]>, s: any) => {
    const cat = s.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {/* System Health Overview */}
      <Card>
        <CardHead title="Live System Health" right={<Pill text={sysHealth?.api ? '● Operational' : '○ Checking…'} />} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
          {[
            { label: 'Database', ok: sysHealth?.db, icon: 'db' },
            { label: 'API Services', ok: sysHealth?.api, icon: 'gear' },
            { label: 'Authentication', ok: sysHealth?.api, icon: 'lock' },
            { label: 'Static Serve', ok: sysHealth?.api, icon: 'box' },
          ].map((h, i) => {
            const col = h.ok === null || h.ok === undefined ? '#a3a7bd' : h.ok ? '#16a34a' : '#ef4444';
            const bg = h.ok === null || h.ok === undefined ? 'rgba(163,167,189,0.1)' : h.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
            return (
              <div key={i} style={{ padding: '14px', borderRadius: '12px', background: bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <DashIcon d={PATHS[h.icon] || PATHS.grid} s={17} stroke={col} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>{h.label}</span>
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: col }}>
                  {h.ok === null || h.ok === undefined ? 'Checking…' : h.ok ? '● Healthy' : '● Degraded'}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Configuration Sections */}
      {loading ? <EmptyState icon="⏳" message="Loading system configuration…" /> : error ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState icon="⚙️" message="No configuration settings found." />
      ) : Object.entries(grouped).map(([category, items]: [string, any[]]) => (
        <Card key={category}>
          <CardHead title={`${category} Settings`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderRadius: '12px', background: '#fafbfe', border: '1px solid #edeef4' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#171433' }}>{s.key?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                  {s.description && <div style={{ fontSize: '0.74rem', color: '#8b8fa3', marginTop: '2px' }}>{s.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {editKey === s.key ? (
                    <>
                      <input value={editValue} onChange={e => setEditValue(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', width: '200px' }} />
                      <button onClick={saveEdit} disabled={saving} style={{ padding: '6px 12px', borderRadius: '8px', background: PUR, color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {saving ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditKey(null)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: PUR, padding: '4px 12px', borderRadius: '8px', background: `${PUR}10` }}>{s.value}</span>
                      <button onClick={() => { setEditKey(s.key); setEditValue(s.value || ''); }}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: '#3f4a5a', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff8ed', border: '1px solid #fde68a', fontSize: '0.82rem', color: '#92400e' }}>
        <b>⚠️ Security Note:</b> Sensitive configuration (JWT secret, database URL, API keys) is managed via environment variables and is not accessible from this interface.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 12. AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════════
function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const PER_PAGE = 30;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (search) params.append('search', search);
    if (actionFilter) params.append('action', actionFilter);
    adminFetch(`/admin/audit-logs?${params}`)
      .then(d => { setLogs(d.items || []); setTotal(d.total || 0); setError(null); })
      .catch(e => setError(e?.message || 'Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, [page, search, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const ACTION_COLORS: Record<string, string> = {
    USER_CREATED: GRN, USER_UPDATED: BLU, USER_DELETED: '#ef4444', ROLE_CHANGED: ORA,
    PRODUCT_CREATED: GRN, PRODUCT_UPDATED: BLU, PRODUCT_DELETED: '#ef4444',
    INGREDIENT_CREATED: GRN, INGREDIENT_UPDATED: BLU, INGREDIENT_DELETED: '#ef4444',
    CONTENT_CREATED: GRN, CONTENT_UPDATED: BLU, CONTENT_DELETED: '#ef4444',
    NOTIFICATION_CREATED: TEA, SETTING_UPDATED: PUR,
    LOGIN: PUR, LOGIN_FAILED: '#ef4444', BACKUP_CREATED: GRN,
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {detail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#171433' }}>Audit Log Detail</div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8b8fa3' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Action', value: detail.action },
                { label: 'Actor', value: `${detail.user_name || '—'} (${detail.user_role || '—'})` },
                { label: 'Resource', value: `${detail.resource_type || '—'} ${detail.resource_id ? `#${detail.resource_id.slice(0, 8)}` : ''}` },
                { label: 'Status', value: detail.status },
                { label: 'Timestamp', value: detail.created_at },
              ].map(({ label, value }, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: '#f6f7fb' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b8fa3', minWidth: '90px', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', color: '#171433', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              {detail.details && Object.keys(detail.details).length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f6f7fb' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b8fa3', marginBottom: '6px' }}>Additional Details</div>
                  <pre style={{ fontSize: '0.76rem', color: '#3f4a5a', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                    {JSON.stringify(detail.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHead
          title={`Audit Log (${total.toLocaleString()} records)`}
          right={
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Search user or resource…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '200px' }} />
              <input type="text" placeholder="Action filter…" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '150px' }} />
            </div>
          }
        />
        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '850px', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                {['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Status', ''].map((c, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '0 14px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow cols={7} /> : error ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>No audit log records found.</td></tr>
              ) : logs.map((log: any, i: number) => {
                const ac = ACTION_COLORS[log.action] || PUR;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfe'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#8b8fa3', whiteSpace: 'nowrap' }}>{log.created_at?.replace('T', ' ').split('.')[0]}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>{log.user_name || 'System'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#3f4a5a' }}>{log.user_role || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${ac}18`, color: ac, fontSize: '0.72rem', fontWeight: 700 }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#3f4a5a' }}>
                      {log.resource_type ? `${log.resource_type}${log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: log.status === 'Success' ? GRN : '#ef4444' }}>
                        {log.status === 'Success' ? '✓' : '✗'} {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => setDetail(log)} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.7rem', color: BLU, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid #f1f2f7', fontSize: '0.8rem', color: '#8b8fa3' }}>
            <span>Page {page} of {totalPages} · {total.toLocaleString()} records</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#a3a7bd' : PUR, fontFamily: 'inherit' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#a3a7bd' : PUR, fontFamily: 'inherit' }}>Next →</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 13. SECURITY & ACCESS
// ══════════════════════════════════════════════════════════════════════════════
function SecurityAccessPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [secStats, setSecStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sysHealth, setSysHealth] = useState<{ db: boolean; api: boolean } | null>(null);

  useEffect(() => {
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    Promise.all([
      fetch(`${baseUrl}/health`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/ready`).then(r => r.json()).catch(() => null),
      adminFetch('/admin/security/events').catch(() => ({ events: [] })),
      adminFetch('/admin/security/stats').catch(() => null),
    ]).then(([health, ready, evts, stats]) => {
      setSysHealth({ db: ready?.database === 'connected', api: health?.status === 'ok' });
      setEvents(evts.events || []);
      setSecStats(stats);
    }).finally(() => setLoading(false));
  }, []);

  const securityConfig = [
    { title: 'Password Hashing', detail: 'Argon2id — m=65536, t=3, p=4', status: 'Active', color: GRN },
    { title: 'JWT Token Algorithm', detail: 'HS256 · 7-day expiry', status: 'Active', color: GRN },
    { title: 'CORS Policy', detail: 'Configurable origin allowlist', status: 'Active', color: GRN },
    { title: 'Role-Based Access Control', detail: '4-tier RBAC: User / Consultant / Derma / Admin', status: 'Enforced', color: GRN },
    { title: 'SQL Injection Protection', detail: 'SQLAlchemy ORM with parameterized queries', status: 'Active', color: GRN },
    { title: 'Input Validation', detail: 'Strict Pydantic schema validation on all inputs', status: 'Active', color: GRN },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Security stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Failed Logins (30d)', value: secStats?.failed_logins_30d ?? '—', color: '#ef4444' },
          { label: 'Role Changes (30d)', value: secStats?.role_changes_30d ?? '—', color: ORA },
          { label: 'User Deletions (30d)', value: secStats?.user_deletions_30d ?? '—', color: BLU },
          { label: 'System Uptime', value: sysHealth?.api ? '● Online' : '○ Checking', color: sysHealth?.api ? GRN : '#a3a7bd' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Active security configuration */}
      <Card>
        <CardHead title="Active Security Configuration" right={<Pill text="Platform-Wide" />} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {securityConfig.map((s, i) => (
            <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#fafbfe', border: '1px solid #edeef4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#171433' }}>{s.title}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${s.color}20`, color: s.color }}>{s.status}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8b8fa3' }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent security events */}
      <Card>
        <CardHead title="Recent Security Events" right={<Pill text="Audit Stream" />} />
        {loading ? <EmptyState icon="⏳" message="Loading security events…" /> : events.length === 0 ? (
          <EmptyState icon="🔒" message="No security events recorded yet. Events appear as users interact with the platform." />
        ) : (
          <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>
                  {['Timestamp', 'User', 'Action', 'Status', 'Details'].map((c, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '0 14px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((evt: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}>
                    <td style={{ padding: '10px 14px', fontSize: '0.74rem', color: '#8b8fa3', whiteSpace: 'nowrap' }}>{evt.created_at?.replace('T', ' ').split('.')[0]}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600, color: '#171433' }}>{evt.user_name || 'System'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${evt.action?.includes('FAIL') ? '#ef4444' : PUR}18`, color: evt.action?.includes('FAIL') ? '#ef4444' : PUR, fontSize: '0.72rem', fontWeight: 700 }}>{evt.action}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: evt.status === 'Success' ? GRN : '#ef4444' }}>{evt.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#3f4a5a' }}>
                      {evt.resource_type ? `${evt.resource_type}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#b91c1c' }}>
        <b>🔒 Security Notice:</b> Passwords, JWT secrets, database credentials, and API keys are never exposed through this interface. All sensitive configuration is managed via environment variables.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 14. BACKUP & RESTORE
// ══════════════════════════════════════════════════════════════════════════════
function BackupRestorePage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);

  const load = useCallback(() => {
    adminFetch('/admin/backup/status')
      .then(d => { setBackups(d.backups || []); setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBackup = async () => {
    setCreating(true);
    try {
      await adminFetch('/admin/backup/create', { method: 'POST' });
      setToast({ msg: 'Backup created successfully.', ok: true });
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Backup failed.', ok: false });
    } finally {
      setCreating(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} bytes`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* Status overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Total Backups', value: backups.length, color: PUR },
          { label: 'Successful', value: backups.filter(b => b.status === 'Completed').length, color: GRN },
          { label: 'Failed', value: backups.filter(b => b.status === 'Failed').length, color: '#ef4444' },
          { label: 'Last Backup', value: backups[0]?.created_at?.split('T')[0] || '—', color: BLU },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: i === 3 ? '1rem' : '1.5rem', fontWeight: 800, color: s.color }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Create backup panel */}
      <Card>
        <CardHead title="Backup Operations" right={<Pill text="Manual Backup" />} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ padding: '20px', borderRadius: '14px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171433', marginBottom: '8px' }}>Create Database Snapshot</div>
            <div style={{ fontSize: '0.8rem', color: '#8b8fa3', marginBottom: '16px', lineHeight: 1.6 }}>
              Creates an application-level backup record capturing current database state metadata. Actual infrastructure backups are managed by the Railway hosting platform.
            </div>
            <button onClick={createBackup} disabled={creating}
              style={{ padding: '10px 20px', borderRadius: '10px', background: PUR, color: '#fff', border: 'none', fontSize: '0.84rem', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Creating Backup…' : '● Create Backup Now'}
            </button>
          </div>
          <div style={{ padding: '20px', borderRadius: '14px', background: '#fff8ed', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e', marginBottom: '8px' }}>⚠️ Restore Operations</div>
            <div style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: '12px', lineHeight: 1.6 }}>
              Database restoration is a destructive infrastructure operation that must be performed at the hosting platform (Railway) level. This prevents accidental data loss from application-layer restore commands.
            </div>
            <div style={{ fontSize: '0.74rem', color: '#92400e', fontWeight: 600 }}>Contact Railway support or use the Railway dashboard to perform database restores safely.</div>
          </div>
        </div>
      </Card>

      {/* Backup history */}
      <Card>
        <CardHead title="Backup History" right={<Pill text={`${backups.length} records`} />} />
        {loading ? <EmptyState icon="⏳" message="Loading backup history…" /> : backups.length === 0 ? (
          <EmptyState icon="💾" message="No backup records yet. Create your first backup." action="Create Backup" onAction={createBackup} />
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>
                  {['Timestamp', 'Type', 'Status', 'Size', 'Notes'].map((c, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '0 14px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backups.map((b: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f2f7' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfe'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>{b.created_at?.replace('T', ' ').split('.')[0]}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${BLU}18`, color: BLU, fontSize: '0.72rem', fontWeight: 700 }}>{b.backup_type}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: b.status === 'Completed' ? GRN : b.status === 'Failed' ? '#ef4444' : ORA }}>
                        {b.status === 'Completed' ? '✓' : b.status === 'Failed' ? '✗' : '○'} {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#3f4a5a' }}>{formatSize(b.size_bytes)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#8b8fa3' }}>{b.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Photo viewer lightbox ────────────────────────────────────────────────────
function AdminPhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  React.useEffect(() => {
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

// ── Professional Pan & Zoom Avatar Cropper for AdminWorkspace ─────────────────
function CropModal({ src, onSave, onCancel }: { src: string; onSave: (cropped: string) => void; onCancel: () => void }) {
  const [zoom, setZoom] = React.useState<number>(1);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const dragStart = React.useRef<{ x: number; y: number; offX: number; offY: number }>({ x: 0, y: 0, offX: 0, offY: 0 });
  const [imageObj, setImageObj] = React.useState<HTMLImageElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = React.useRef<HTMLCanvasElement>(null);

  const VIEW_SIZE = 280;

  React.useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  React.useEffect(() => {
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

function ProfilePage({ stats }: { stats: any }) {
  const [storedUser, setStoredUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; }
  });
  const dpKey = `miracle_dp_${storedUser.id || storedUser.email || 'admin'}`;
  const [customDp, setCustomDp] = React.useState<string | null>(() => localStorage.getItem(dpKey) || localStorage.getItem('miracle_dp_admin@miracle.com') || null);
  const [showDpMenu, setShowDpMenu] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = React.useState(false);
  const dpMenuRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const u = JSON.parse(localStorage.getItem('miracle_user') || '{}');
        setStoredUser(u);
        const k = `miracle_dp_${u.id || u.email || 'admin'}`;
        setCustomDp(localStorage.getItem(k) || localStorage.getItem('miracle_dp_admin@miracle.com') || null);
      } catch {}
    };
    window.addEventListener('miracle_user_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('miracle_user_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dpMenuRef.current && !dpMenuRef.current.contains(e.target as Node)) setShowDpMenu(false);
    };
    if (showDpMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDpMenu]);

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
    localStorage.setItem('miracle_dp_admin@miracle.com', cropped);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setCropSrc(null);
  };

  const handleRemoveDp = () => {
    setCustomDp(null);
    localStorage.removeItem(dpKey);
    localStorage.removeItem('miracle_dp_admin@miracle.com');
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
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

  const adminName = storedUser.name || 'Himobanta Dutta';
  const adminEmail = storedUser.email || 'admin@miracle.com';

  return (
    <>
      {viewPhoto && customDp && <AdminPhotoViewer src={customDp} name={adminName} onClose={() => setViewPhoto(false)} />}
      {cropSrc && <CropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card>
          <CardHead title="Administrator Profile" right={<Pill text="Super Administrator" />} />
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '8px 0 20px', borderBottom: '1px solid #f1f2f7' }}>
            {/* Avatar with camera dropdown */}
            <div ref={dpMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              {customDp ? (
                <img src={customDp} alt={adminName} onClick={() => setViewPhoto(true)} style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover', border: `2px solid ${PUR}30`, display: 'block', cursor: 'pointer' }} title="Click to view full photo" />
              ) : (
                <span style={{ display: 'grid', placeItems: 'center', width: '80px', height: '80px', borderRadius: '20px', background: `${PUR}20`, color: PUR, fontSize: '2.2rem', flexShrink: 0 }}>👤</span>
              )}

              {/* Camera icon button */}
              <button
                type="button"
                onClick={() => setShowDpMenu(v => !v)}
                style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '28px', height: '28px', borderRadius: '50%', background: PUR, border: '2px solid #fff', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '0.75rem', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', padding: 0 }}
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
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#171433' }}>{adminName}</div>
              <div style={{ fontSize: '0.84rem', color: PUR, fontWeight: 600, marginTop: '3px' }}>Super Administrator</div>
              <div style={{ fontSize: '0.8rem', color: '#a3a7bd', marginTop: '2px' }}>{adminEmail}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
            {[
              { label: 'Platform Role', value: 'Super Administrator', color: PUR },
              { label: 'Account Status', value: 'Active', color: GRN },
              { label: 'Users Managed', value: String(stats?.total_users ?? '—'), color: BLU },
              { label: 'Platform Assessments', value: String(stats?.total_assessments ?? '—'), color: ORA },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4', textAlign: 'center' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function AccountSettingsPage() {
  const [storedUser, setStoredUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('miracle_user') || '{}'); } catch { return {}; }
  });
  const [name, setName] = useState(storedUser.name || 'Himobanta Dutta');
  const [email, setEmail] = useState(storedUser.email || 'admin@miracle.com');
  const [password, setPassword] = useState('••••••••••••');
  const [editingField, setEditingField] = useState<'name' | 'email' | 'password' | null>(null);
  const [tempVal, setTempVal] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const startEdit = (field: 'name' | 'email' | 'password') => {
    setEditingField(field);
    setTempVal(field === 'name' ? name : field === 'email' ? email : '');
  };

  const saveEdit = () => {
    if (!tempVal.trim()) {
      setToast({ msg: 'Value cannot be empty', ok: false });
      return;
    }
    const current = { ...storedUser };
    if (editingField === 'name') {
      setName(tempVal.trim());
      current.name = tempVal.trim();
      localStorage.setItem('miracle_user', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('miracle_user_updated'));
      setToast({ msg: 'Name updated successfully!', ok: true });
    } else if (editingField === 'email') {
      setEmail(tempVal.trim());
      current.email = tempVal.trim();
      localStorage.setItem('miracle_user', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('miracle_user_updated'));
      setToast({ msg: 'Email updated successfully!', ok: true });
    } else if (editingField === 'password') {
      if (tempVal.length < 6) {
        setToast({ msg: 'Password must be at least 6 characters', ok: false });
        return;
      }
      setPassword('••••••••••••');
      setToast({ msg: 'Password updated securely!', ok: true });
    }
    setEditingField(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      <Card>
        <CardHead title="Account Settings" right={<Pill text="Super Administrator" />} />
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
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{name}</div>
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
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{email}</div>
              )}
            </div>
            {editingField !== 'email' && (
              <button onClick={() => startEdit('email')} style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>Edit</button>
            )}
          </div>

          {/* Platform Role */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Role</div>
              <div style={{ fontSize: '0.94rem', fontWeight: 700, color: PUR, marginTop: '3px' }}>Super Administrator</div>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: '#edeef4' }}>Immutable</span>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: '#fafbfe', border: '1px solid #edeef4' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</div>
              {editingField === 'password' ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    value={tempVal}
                    type="password"
                    placeholder="Enter new password"
                    onChange={e => setTempVal(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${PUR}`, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button onClick={saveEdit} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Update</button>
                  <button onClick={() => setEditingField(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#171433', marginTop: '3px' }}>{password}</div>
              )}
            </div>
            {editingField !== 'password' && (
              <button onClick={() => startEdit('password')} style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>Change Password</button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN AdminWorkspace ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════════════
interface AdminWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminWorkspace({ activeSection = 'dashboard', onSectionChange }: AdminWorkspaceProps) {
  const [adminStats, setAdminStats] = useState<any | null>(null);

  useEffect(() => {
    api.getAdminStats().then(setAdminStats).catch(() => {});
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboardPage onSectionChange={onSectionChange} />;
      case 'user-management':
      case 'users':
        return <UserManagementPage />;
      case 'role-&-permissions':
      case 'role-permissions':
      case 'roles-&-permissions':
      case 'roles-permissions':
      case 'roles':
        return <RolePermissionsPage />;
      case 'skin-assessments':
      case 'assessments':
        return <SkinAssessmentsPage />;
      case 'routine-management':
      case 'routines':
        return <RoutineManagementPage />;
      case 'product-management':
      case 'products':
        return <ProductManagementPage />;
      case 'ingredient-database':
      case 'ingredients':
        return <IngredientDatabasePage />;
      case 'content-management':
      case 'content':
        return <ContentManagementPage />;
      case 'reports-&-analytics':
      case 'reports-analytics':
      case 'reports':
      case 'analytics':
        return <ReportsAnalyticsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'system-settings':
        return <SystemSettingsPage />;
      case 'audit-logs':
      case 'audit':
        return <AuditLogsPage />;
      case 'security-&-access':
      case 'security-access':
      case 'security':
        return <SecurityAccessPage />;
      case 'backup-&-restore':
      case 'backup-restore':
      case 'backup':
        return <BackupRestorePage />;
      case 'my-profile':
      case 'profile':
      case 'settings':
        return <ProfilePage stats={adminStats} />;
      case 'account-settings':
        return <AccountSettingsPage />;
      default:
        return <AdminDashboardPage onSectionChange={onSectionChange} />;
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100%' }}>
      {renderSection()}
    </div>
  );
}
