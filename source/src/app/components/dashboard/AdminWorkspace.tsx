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
  UpEl,
} from './dashboardUtils';
import { API_BASE_URL, api } from '../../services/api';

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ padding: '36px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{icon}</div>
      <div>{message}</div>
    </div>
  );
}


// ── Helpers ────────────────────────────────────────────────────────────────────

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
  users:      ['rgba(47,107,76,0.12)', PUR],
  clip:       ['rgba(34,197,94,0.14)', '#16a34a'],
  cal:        ['rgba(59,157,248,0.14)', '#2f8fe0'],
  db:         ['rgba(34,201,184,0.16)', '#12a99a'],
  box:        ['rgba(245,166,35,0.16)', '#e08a1e'],
};

// ── Component ──────────────────────────────────────────────────────────────────

interface AdminWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminWorkspace({ activeSection = 'dashboard', onSectionChange }: AdminWorkspaceProps) {
  // ── State
  const [sysHealth, setSysHealth] = useState<{ db: boolean; api: boolean } | null>(null);
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // ── Fetch
  const fetchAll = useCallback(() => {
    const baseUrl = API_BASE_URL.replace('/api/v1', '');

    // Platform health checks
    Promise.all([
      fetch(`${baseUrl}/health`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/ready`).then(r => r.json()).catch(() => null),
    ]).then(([health, ready]) => {
      setSysHealth({
        db: ready?.database === 'connected',
        api: health?.status === 'ok',
      });
    }).catch(() => setSysHealth({ db: false, api: false }));

    // Admin stats
    setStatsLoading(true);
    api.getAdminStats()
      .then(d => { setAdminStats(d); setStatsError(null); })
      .catch(e => setStatsError(e?.detail || 'Failed to load platform statistics.'))
      .finally(() => setStatsLoading(false));

    // Activity feed
    setActivityLoading(true);
    api.getAdminActivity(10)
      .then((d: any) => { setActivity(d.events || []); setActivityError(null); })
      .catch(e => setActivityError(e?.detail || 'Failed to load activity feed.'))
      .finally(() => setActivityLoading(false));

    // User roster
    setUsersLoading(true);
    api.getAdminUsers()
      .then((d: any) => { setUsers(d.users || []); setUsersError(null); })
      .catch(e => setUsersError(e?.detail || 'Failed to load user list.'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
    const handleGlobalSearch = (e: any) => {
      if (typeof e.detail === 'string') {
        setUserSearch(e.detail);
      }
    };
    window.addEventListener('miracle_global_search', handleGlobalSearch);
    return () => window.removeEventListener('miracle_global_search', handleGlobalSearch);
  }, []);

  // ── Derived stats
  const totalUsers      = adminStats?.total_users ?? 0;
  const uByRole         = adminStats?.users_by_role ?? { User: 0, 'Skincare Consultant': 0, Dermatologist: 0, Administrator: 0 };
  const totalAssessments = adminStats?.total_assessments ?? 0;
  const activeRoutines  = adminStats?.active_routines ?? 0;
  const rxRoutines      = adminStats?.doctor_prescribed_routines ?? 0;
  const totalPhotos     = adminStats?.total_progress_photos ?? 0;
  const totalAppts      = adminStats?.total_appointments ?? 0;
  const apptByStatus    = adminStats?.appointments_by_status ?? {};
  const concernDist     = adminStats?.concern_distribution ?? [];

  // Donut segments for user roles
  const userPct  = totalUsers > 0 ? Math.round((uByRole.User / totalUsers) * 100) : 0;
  const consPct  = totalUsers > 0 ? Math.round((uByRole['Skincare Consultant'] / totalUsers) * 100) : 0;
  const dermaPct = totalUsers > 0 ? Math.round((uByRole.Dermatologist / totalUsers) * 100) : 0;
  const adminPct = totalUsers > 0 ? Math.round((uByRole.Administrator / totalUsers) * 100) : 0;

  // Appointment donut
  const apptSegs = ['Requested', 'Accepted', 'Completed', 'Rejected', 'Referred_To_Dermatologist'].map(s => ({
    pct: totalAppts > 0 ? Math.round(((apptByStatus[s] ?? 0) / totalAppts) * 100) : 0,
    color: STATUS_COLORS[s],
  }));

  // Concern bars
  const concernRows: [string, number, string][] = concernDist.map((c: any) => [
    c.label, c.pct, `${c.count} assessments`
  ]);

  // Health score bars from user list
  const validScores = users.map((u: any) => u.health_score).filter((s: any): s is number => s !== null);
  const avgScore = validScores.length
    ? Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length)
    : null;

  // Filtered user list
  const filteredUsers = users.filter(u => {
    const matchRole = !userRoleFilter || u.role === userRoleFilter;
    const matchSearch = !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  // ── Section: Platform Stats Header ─────────────────────────────────────────
  const headerStats = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
      {[
        { label: 'Total Users', value: totalUsers, icon: 'users', color: PUR },
        { label: 'Assessments', value: totalAssessments, icon: 'clip', color: BLU },
        { label: 'Active Routines', value: activeRoutines, icon: 'cal', color: GRN },
        { label: 'Appointments', value: totalAppts, icon: 'clock', color: ORA },
        { label: 'Progress Photos', value: totalPhotos, icon: 'eye', color: TEA },
      ].map((s, i) => (
        <Card key={i} style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '11px', background: `${s.color}22`, color: s.color, flexShrink: 0 }}>
              <DashIcon d={PATHS[s.icon] || PATHS.grid} s={17} stroke={s.color} />
            </span>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#171433', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {statsLoading ? '—' : String(s.value)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '3px' }}>{s.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // ── Section: User Overview ─────────────────────────────────────────────────
  const userOverview = (
    <Card>
      <CardHead title="User Overview" right={<Pill text="Live Platform Data" />} />
      {statsLoading ? (
        <EmptyState icon="⏳" message="Loading system metrics…" />
      ) : statsError ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{statsError}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '20px', alignItems: 'center' }}>
          <DonutChart
            segs={[
              { pct: userPct || (totalUsers === 0 ? 100 : 0), color: PUR },
              { pct: consPct, color: BLU },
              { pct: dermaPct, color: ORA },
              { pct: adminPct, color: GRN },
            ]}
            center={String(totalUsers)}
            sub="Total Users"
            size={168}
          />
          <Legend
            rows={[
              ['Users', `${uByRole.User} (${userPct}%)`, PUR],
              ['Consultants', `${uByRole['Skincare Consultant']} (${consPct}%)`, BLU],
              ['Dermatologists', `${uByRole.Dermatologist} (${dermaPct}%)`, ORA],
              ['Admins', `${uByRole.Administrator} (${adminPct}%)`, GRN],
            ]}
          />
        </div>
      )}
    </Card>
  );

  // ── Section: Appointment Distribution ─────────────────────────────────────
  const apptOverview = (
    <Card>
      <CardHead title="Appointments by Status" right={<Pill text="Live" />} />
      {statsLoading ? (
        <EmptyState icon="⏳" message="Loading appointment data…" />
      ) : totalAppts === 0 ? (
        <EmptyState icon="📅" message="No appointments recorded yet." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '20px', alignItems: 'center' }}>
          <DonutChart segs={apptSegs} center={String(totalAppts)} sub="Total" size={168} />
          <Legend
            rows={[
              ['Requested', `${apptByStatus.Requested ?? 0}`, ORA],
              ['Accepted', `${apptByStatus.Accepted ?? 0}`, GRN],
              ['Completed', `${apptByStatus.Completed ?? 0}`, BLU],
              ['Rejected', `${apptByStatus.Rejected ?? 0}`, '#ef4444'],
              ['Referred', `${apptByStatus.Referred_To_Dermatologist ?? 0}`, TEA],
            ]}
          />
        </div>
      )}
    </Card>
  );

  // ── Section: Assessments & Routines ───────────────────────────────────────
  const assessRoutine = (
    <Card>
      <CardHead title="Assessments & Routines" right={<Pill text="Live" />} />
      {statsLoading ? (
        <EmptyState icon="⏳" message="Loading…" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginTop: '4px' }}>
          {[
            { label: 'Total Assessments', value: totalAssessments, color: PUR },
            { label: 'Active Routines', value: activeRoutines, color: GRN },
            { label: 'Doctor-Prescribed', value: rxRoutines, color: BLU },
            { label: 'Progress Photos', value: totalPhotos, color: ORA },
          ].map((s, i) => (
            <div key={i} style={{ padding: '14px 16px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  // ── Section: Top Skin Concerns ─────────────────────────────────────────────
  const concerns = (
    <Card>
      <CardHead title="Top Detected Skin Concerns" right={<Pill text="Live DB" />} />
      {statsLoading ? (
        <EmptyState icon="⏳" message="Loading concern data…" />
      ) : concernRows.length === 0 ? (
        <EmptyState icon="🔍" message="No skin concerns logged yet — concerns appear once users complete assessments." />
      ) : (
        <Bars rows={concernRows} />
      )}
    </Card>
  );

  // ── Section: Health Score Distribution ────────────────────────────────────
  const scoreSection = (
    <Card>
      <CardHead title="Platform Health Score Distribution" right={<Pill text="Live Users" />} />
      {usersLoading ? (
        <EmptyState icon="⏳" message="Loading health scores…" />
      ) : validScores.length === 0 ? (
        <EmptyState icon="📈" message="No health scores yet — appears once users complete assessments." />
      ) : (
        <>
          <ChartFrame
            chart={{ el: <LineChart vals={validScores} min={0} max={100} /> }}
            yLabels={['100', '75', '50', '25', '0']}
            xLabels={validScores.length <= 5 ? validScores.map((_: any, i: number) => `U${i + 1}`) : ['Start', '', '', '', 'Latest']}
            h={150}
          />
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f2f7', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
            {[
              { label: 'Avg Score', value: avgScore !== null ? String(avgScore) : '—', color: PUR },
              { label: 'Score ≥ 75', value: String(validScores.filter((s: number) => s >= 75).length), color: GRN },
              { label: 'Need Attention', value: String(validScores.filter((s: number) => s < 60).length), color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: '10px', background: '#f6f7fb' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#8b8fa3', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );

  // ── Section: Recent Activity (Live DB) ────────────────────────────────────
  const activitySection = (
    <Card>
      <CardHead title="Recent Platform Activity" right={<Pill text="Live DB" />} />
      {activityLoading ? (
        <EmptyState icon="⏳" message="Loading activity feed…" />
      ) : activityError ? (
        <div style={{ padding: '12px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem' }}>{activityError}</div>
      ) : activity.length === 0 ? (
        <EmptyState icon="📋" message="No platform activity yet." />
      ) : (
        <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activity.map((evt: any, i: number) => {
            const [ib, icl] = ACTIVITY_TINTS[evt.icon] || ACTIVITY_TINTS.users;
            return (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', flexShrink: 0, borderRadius: '11px', background: ib, color: icl }}>
                  <DashIcon d={PATHS[evt.icon] || PATHS.grid} s={17} stroke={icl} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#171433' }}>{evt.title}</div>
                  <div style={{ fontSize: '0.76rem', color: '#8b8fa3' }}>{evt.detail}</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a3a7bd', whiteSpace: 'nowrap', flexShrink: 0 }}>{evt.timestamp}</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  // ── Section: Notifications ─────────────────────────────────────────────────
  const notificationsSection = (
    <Card>
      <CardHead title="System Notifications" right={<Pill text="Live" />} />
      <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
        {activityLoading ? (
          <EmptyState icon="⏳" message="Loading notifications…" />
        ) : activity.length === 0 ? (
          <EmptyState icon="🔔" message="No system notifications yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {activity.map((evt: any, i: number) => {
              const [ib, icl] = ACTIVITY_TINTS[evt.icon] || ACTIVITY_TINTS.users;
              return (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px 12px', borderRadius: '12px', background: i % 2 === 0 ? '#fafbfe' : '#fff', border: '1px solid #edeef4', marginBottom: '8px' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', flexShrink: 0, borderRadius: '12px', background: ib, color: icl }}>
                    <DashIcon d={PATHS[evt.icon] || PATHS.grid} s={18} stroke={icl} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#171433' }}>{evt.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#8b8fa3', marginTop: '3px' }}>{evt.detail}</div>
                    <div style={{ fontSize: '0.7rem', color: '#c0c4d4', marginTop: '5px' }}>{evt.timestamp}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, background: `${icl}22`, color: icl, flexShrink: 0 }}>New</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );

  // ── Section: Profile & Account Settings ────────────────────────────────────
  const profileSection = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card>
        <CardHead title="My Profile" right={<Pill text="Administrator" />} />
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '8px 0 16px', borderBottom: '1px solid #f1f2f7' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: '68px', height: '68px', borderRadius: '18px', background: 'rgba(47,107,76,0.12)', color: PUR, fontSize: '2rem', flexShrink: 0 }}>👤</span>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#171433' }}>Himobanta Dutta</div>
            <div style={{ fontSize: '0.82rem', color: '#8b8fa3', marginTop: '3px' }}>Super Administrator</div>
            <div style={{ fontSize: '0.78rem', color: '#a3a7bd', marginTop: '2px' }}>admin@miracle.com</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
          {[
            { label: 'Platform Role', value: 'Super Administrator', color: PUR },
            { label: 'Status', value: 'Active', color: GRN },
            { label: 'Total Users Managed', value: String(adminStats?.total_users ?? '—'), color: BLU },
          ].map((s, i) => (
            <div key={i} style={{ padding: '14px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#8b8fa3', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const accountSettingsSection = (
    <Card>
      <CardHead title="Account Settings" right={<Pill text="Admin" />} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[['Full Name', 'Himobanta Dutta'], ['Email Address', 'admin@miracle.com'], ['Role', 'Super Administrator'], ['Password', '••••••••••']].map(([label, value], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', background: '#f6f7fb', border: '1px solid #edeef4' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#171433', marginTop: '3px' }}>{value}</div>
            </div>
            <button style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #edeef4', background: '#fff', fontSize: '0.76rem', fontWeight: 600, color: PUR, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
          </div>
        ))}
      </div>
    </Card>
  );

  // ── Section: System Health ─────────────────────────────────────────────────
  const healthItems = [
    ['Database', '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>', sysHealth?.db],
    ['API Services', '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 6l-4 12"/>', sysHealth?.api],
    ['Storage', '<path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>', sysHealth?.api],
    ['Email Service', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', sysHealth?.api],
  ];

  const healthSection = (
    <Card style={{ height: '100%', minWidth: 0 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>System Health</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        {healthItems.map((h, i) => {
          const status = sysHealth === null ? null : h[2];
          const isHealthy = status === true;
          const isPending = status === null;
          const iconBg = isPending ? 'rgba(163,167,189,0.15)' : isHealthy ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)';
          const iconColor = isPending ? '#a3a7bd' : isHealthy ? '#16a34a' : '#ef4444';
          const labelColor = isPending ? '#a3a7bd' : isHealthy ? '#16a34a' : '#ef4444';
          const labelText = isPending ? 'Checking…' : isHealthy ? 'Healthy' : 'Degraded';
          const checkPath = isHealthy ? "<path d='M20 6 9 17l-5-5'/>" : isPending ? "<circle cx='12' cy='12' r='3'/>" : "<path d='M18 6 6 18M6 6l12 12'/>";
          return (
            <div key={i} style={{ borderRadius: '14px', border: '1px solid #edeef4', background: '#fafbfe', padding: '14px 10px', minWidth: 0 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '11px', background: iconBg, color: iconColor, marginBottom: '10px' }}>
                <DashIcon d={String(h[1])} s={17} stroke={iconColor} />
              </span>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#171433', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(h[0])}</div>
              <div style={{ fontSize: '0.74rem', color: labelColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DashIcon d={checkPath} s={12} stroke={iconColor} sw={2.6} /> {labelText}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  // ── Section: User Management Table ────────────────────────────────────────
  const userTableRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="text"
        placeholder="Search name or email…"
        value={userSearch}
        onChange={e => setUserSearch(e.target.value)}
        style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', width: '200px' }}
      />
      <select
        value={userRoleFilter}
        onChange={e => setUserRoleFilter(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid #edeef4', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit', background: '#fff' }}
      >
        <option value="">All Roles</option>
        <option value="User">Users</option>
        <option value="Skincare Consultant">Consultants</option>
        <option value="Dermatologist">Dermatologists</option>
        <option value="Administrator">Admins</option>
      </select>
    </div>
  );

  const userCols = ['Name', 'Email', 'Role', 'Skin Type', 'Health Score', 'Last Assessment', 'Joined'];
  const userTableBody = usersLoading ? (
    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>Loading user list…</td></tr>
  ) : usersError ? (
    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '0.82rem' }}>{usersError}</td></tr>
  ) : filteredUsers.length === 0 ? (
    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#a3a7bd', fontSize: '0.82rem' }}>
      {userSearch || userRoleFilter ? 'No users match your search/filter criteria.' : 'No users registered yet.'}
    </td></tr>
  ) : (
    <>
      {filteredUsers.map((u: any) => {
        const roleColor = ROLE_COLORS[u.role] || GRY;
        return (
          <tr key={u.id} style={{ borderTop: '1px solid #f1f2f7' }}>
            <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#171433' }}>{u.name}</td>
            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#3f4a5a' }}>{u.email}</td>
            <td style={{ padding: '12px 16px' }}>
              <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: `${roleColor}22`, color: roleColor }}>
                {u.role}
              </span>
            </td>
            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#3f4a5a' }}>{u.skin_type || '—'}</td>
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
              {u.health_score !== null ? (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: u.health_score >= 75 ? GRN : u.health_score >= 60 ? ORA : '#ef4444' }}>
                  {Math.round(u.health_score)}
                </span>
              ) : <span style={{ color: '#a3a7bd' }}>—</span>}
            </td>
            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#3f4a5a', whiteSpace: 'nowrap' }}>
              {u.last_assessment_date || '—'}
            </td>
            <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#8b8fa3', whiteSpace: 'nowrap' }}>{u.created_at}</td>
          </tr>
        );
      })}
    </>
  );

  const userManagement = (
    <Card>
      <CardHead title={`User Management (${filteredUsers.length}${filteredUsers.length !== users.length ? ` of ${users.length}` : ''})`} right={userTableRight} />
      <div className="dash-scroll" style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '860px', width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <tr>
              {userCols.map((c, i) => (
                <th key={i} style={{ textAlign: i === 4 ? 'center' : 'left', padding: '0 16px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#a3a7bd', whiteSpace: 'nowrap' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{userTableBody}</tbody>
        </table>
      </div>
    </Card>
  );

  // ── Section: Quick Actions ─────────────────────────────────────────────────
  const actionItems: [string, string, string][] = [
    ['users', 'View Users', 'user-management'],
    ['clip', 'View Assessments', 'skin-assessments'],
    ['cal', 'View Reports', 'reports-&-analytics'],
    ['db', 'System Health', 'system-settings'],
  ];

  const actionsSection = (
    <Card style={{ height: '100%', minWidth: 0 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {actionItems.map((a, i) => (
          <div
            key={i}
            onClick={() => onSectionChange && onSectionChange(a[2])}
            style={{ textAlign: 'center', borderRadius: '14px', border: '1px solid #edeef4', background: '#fafbfe', padding: '18px 8px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          >
            <span style={{ display: 'grid', placeItems: 'center', width: '46px', height: '46px', margin: '0 auto 12px', borderRadius: '13px', background: 'rgba(47,107,76,0.12)', color: PUR }}>
              <DashIcon d={PATHS[a[0]] || PATHS.grid} s={20} stroke={PUR} />
            </span>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3f4a5a' }}>{a[1]}</div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'user-management':
      case 'role-&-permissions':
        return userManagement;
      case 'skin-assessments':
      case 'reports-&-analytics':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {concerns}
              {scoreSection}
            </div>
            {assessRoutine}
          </div>
        );
      case 'system-settings':
      case 'security-&-access':
      case 'audit-logs':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {healthSection}
            {activitySection}
          </div>
        );
      case 'notifications':
        return notificationsSection;
      case 'settings':
        return profileSection;
      case 'account-settings':
        return accountSettingsSection;
      case 'routine-management':
      case 'product-management':
      case 'ingredient-database':
      case 'content-management':
      case 'backup-&-restore':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {concerns}
              {scoreSection}
            </div>
            {assessRoutine}
            {userManagement}
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3,1fr)' }}>
              {userOverview}
              {apptOverview}
              {assessRoutine}
            </div>

            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3,1fr)' }}>
              {concerns}
              {scoreSection}
              {activitySection}
            </div>

            {userManagement}

            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2,1fr)' }}>
              {healthSection}
              {actionsSection}
            </div>
          </div>
        );
    }
  };

  return renderSection();
}
