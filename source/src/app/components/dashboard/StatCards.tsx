import React from 'react';
import { DashIcon, PATHS, PUR, UpEl } from './dashboardUtils';
import type { RoleType } from './Sidebar';

interface StatCardsProps {
  role: RoleType;
}

interface StatItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  deltaColor: string;
  deltaEl: React.ReactNode;
}

function makeStat(label: string, value: string, iconKey: string, tint: string, delta: React.ReactNode, deltaColor?: string): StatItem {
  const tints: Record<string, [string, string]> = {
    pur: ['rgba(47,107,76,0.12)', PUR],
    grn: ['rgba(34,197,94,0.14)', '#16a34a'],
    blu: ['rgba(59,157,248,0.14)', '#2f8fe0'],
    ora: ['rgba(245,166,35,0.16)', '#e08a1e'],
    red: ['rgba(244,63,94,0.13)', '#e23b57'],
    tea: ['rgba(34,201,184,0.16)', '#12a99a'],
  };
  const [ib, icl] = tints[tint] || tints.pur;
  return {
    label,
    value,
    icon: <DashIcon d={PATHS[iconKey] || PATHS.grid} s={22} stroke={icl} />,
    iconBg: ib,
    iconColor: icl,
    deltaColor: deltaColor || '#16a34a',
    deltaEl: delta,
  };
}

export function StatCards({ role }: StatCardsProps) {
  if (role === 'user') return null;

  let stats: StatItem[] = [];

  const [consultantStats, setConsultantStats] = React.useState<{
    total_clients: number;
    assessments_done: number;
    active_routines: number;
    avg_improvement_pct: number;
    upcoming_followups: number;
  } | null>(null);

  const [dermaStats, setDermaStats] = React.useState<any>(null);

  React.useEffect(() => {
    if (role === 'consultant') {
      import('../../services/api').then(({ api }) => {
        api.getConsultantDashboard().then(d => {
          setConsultantStats(d);
        }).catch(() => {});
      });
    } else if (role === 'derma') {
      import('../../services/api').then(({ api }) => {
        api.getDermaDashboardOverview().then(d => {
          setDermaStats(d);
        }).catch(() => {});
      });
    }
  }, [role]);

  if (role === 'admin') {
    stats = [
      makeStat('Total Users', '12,845', 'users', 'pur', <UpEl text="18% this month" color="#16a34a" />),
      makeStat('Assessments Completed', '8,932', 'clip', 'grn', <UpEl text="22% this month" color="#16a34a" />),
      makeStat('Active Routines', '6,742', 'cal', 'blu', <UpEl text="16% this month" color="#16a34a" />),
      makeStat('Total Products', '1,248', 'box', 'ora', <UpEl text="12% this month" color="#16a34a" />),
      makeStat('Platform Revenue', '₹24.8L', 'trend', 'red', <UpEl text="20% this month" color="#16a34a" />),
      makeStat('System Uptime', '99.9%', 'db', 'tea', <span style={{ color: '#8b8fa3' }}>All systems healthy</span>),
    ];
  } else if (role === 'derma') {
    const m = dermaStats?.metrics;
    stats = [
      makeStat('Total Patients', m ? String(m.total_patients || 0) : '—', 'users', 'pur', <UpEl text="Live Patient Roster" color="#16a34a" />),
      makeStat('Total Assessments', m ? String(m.total_assessments || 0) : '—', 'clip', 'grn', <UpEl text="Clinical Evaluations" color="#16a34a" />),
      makeStat('Active Prescriptions (Rx)', m ? String(m.active_prescriptions || 0) : '—', 'trend', 'blu', <UpEl text="Regulated Medical Rx" color="#16a34a" />),
      makeStat('Avg. Health Score', m ? `${m.avg_health_score || '—'}` : '—', 'star', 'ora', <UpEl text="Cohort Average Score" color="#16a34a" />),
      makeStat('Referrals & Consults', m ? String(m.pending_referrals || 0) : '—', 'cal', 'red', <span style={{ color: PUR, fontWeight: 600 }}>Action Required →</span>),
    ];
  } else if (role === 'consultant') {
    const c = consultantStats;
    stats = [
      makeStat('Total Clients', c ? String(c.total_clients) : '—', 'users', 'pur', <UpEl text="Active DB Roster" color="#16a34a" />),
      makeStat('Assessments Done', c ? String(c.assessments_done) : '—', 'clip', 'grn', <UpEl text="Real Evaluation Data" color="#16a34a" />),
      makeStat('Active Routines', c ? String(c.active_routines) : '—', 'trend', 'blu', <UpEl text="Patient Regimens" color="#16a34a" />),
      makeStat('Avg. Improvement', c ? (c.avg_improvement_pct > 0 ? `+${c.avg_improvement_pct}%` : `${c.avg_improvement_pct}%`) : '—', 'star', 'ora', <UpEl text="Dermal Score Delta" color="#16a34a" />),
      makeStat('Upcoming Follow-ups', c ? String(c.upcoming_followups) : '—', 'cal', 'red', <span style={{ color: PUR, fontWeight: 600 }}>Action Required →</span>),
    ];
  }

  const statCols = role === 'admin' ? 'repeat(6,1fr)' : 'repeat(5,1fr)';

  return (
    <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: statCols }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            borderRadius: '18px',
            background: '#fff',
            border: '1px solid #edeef4',
            padding: '18px',
            boxShadow: '0 4px 16px -10px rgba(23,20,51,0.28)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '46px', height: '46px', flexShrink: 0, borderRadius: '13px', background: s.iconBg, color: s.iconColor }}>
              {s.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#7c8199', lineHeight: 1.25, whiteSpace: 'nowrap', marginBottom: '5px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#171433', lineHeight: 1.15 }}>
                {s.value}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '11px', fontSize: '0.76rem', fontWeight: 600, color: s.deltaColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
            {s.deltaEl}
          </div>
        </div>
      ))}
    </div>
  );
}
