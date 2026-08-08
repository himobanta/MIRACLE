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
  UpEl,
} from './dashboardUtils';

export function AdminWorkspace() {
  const userOverview = (
    <Card>
      <CardHead title="User Overview" right={<Pill text="This Month" />} />
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '20px', alignItems: 'center' }}>
        <DonutChart
          segs={[
            { pct: 79.7, color: PUR },
            { pct: 12, color: BLU },
            { pct: 5.3, color: ORA },
            { pct: 2.9, color: GRN },
          ]}
          center="12,845"
          sub="Total Users"
          size={168}
        />
        <Legend
          rows={[
            ['Users', '10,243 (79.7%)', PUR],
            ['Consultants', '1,542 (12.0%)', BLU],
            ['Dermatologists', '687 (5.3%)', ORA],
            ['Admins', '373 (2.9%)', GRN],
          ]}
        />
      </div>
      <div style={{ marginTop: '18px', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View All Users →
      </div>
    </Card>
  );

  const growth = (
    <Card>
      <CardHead title="User Growth" right={<Pill text="This Month" />} />
      <ChartFrame
        chart={{ el: <LineChart vals={[3.5, 4.6, 5.4, 6.2, 7, 8, 9.2, 10.2, 11, 11.8, 12.845]} min={0} max={14} /> }}
        yLabels={['14K', '10K', '6K', '2K', '0']}
        xLabels={['Apr 21', 'Apr 28', 'May 5', 'May 12', 'May 19']}
        h={172}
      />
      <div style={{ marginTop: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 600 }}>
        <UpEl text="18%" color="#16a34a" />
        <span style={{ color: '#8b8fa3', fontWeight: 500 }}>growth compared to last month</span>
      </div>
    </Card>
  );

  const assess = (
    <Card>
      <CardHead title="Assessments Overview" right={<Pill text="This Month" />} />
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '20px', alignItems: 'center' }}>
        <DonutChart
          segs={[
            { pct: 75.4, color: PUR },
            { pct: 16.2, color: BLU },
            { pct: 8.3, color: ORA },
          ]}
          center="8,932"
          sub="Total"
          size={168}
        />
        <Legend
          rows={[
            ['Completed', '6,742 (75.4%)', PUR],
            ['In Progress', '1,452 (16.2%)', BLU],
            ['Pending', '738 (8.3%)', ORA],
          ]}
        />
      </div>
      <div style={{ marginTop: '18px', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View All Assessments →
      </div>
    </Card>
  );

  const concerns = (
    <Card>
      <CardHead title="Top Skin Concerns" right={<Pill text="This Month" />} />
      <Bars
        rows={[
          ['Acne & Post Acne Marks', 90, '3,245 (36%)'],
          ['Hyperpigmentation', 62, '2,145 (24%)'],
          ['Dryness', 42, '1,456 (16%)'],
          ['Sensitive Skin', 32, '1,102 (12%)'],
          ['Uneven Skin Tone', 28, '984 (11%)'],
        ]}
      />
      <div style={{ marginTop: '18px', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View Full Report →
      </div>
    </Card>
  );

  const revenue = (
    <Card>
      <CardHead title="Revenue Overview" right={<Pill text="This Month" />} />
      <div style={{ fontSize: '0.78rem', color: '#8b8fa3', marginTop: '-6px' }}>Total Revenue</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#171433' }}>₹24,80,500</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
          <UpEl text="20% vs last month" color="#16a34a" />
        </span>
      </div>
      <div style={{ marginTop: '10px' }}>
        <ChartFrame
          chart={{ el: <LineChart vals={[7, 9, 11, 13, 12, 15, 18, 21, 19, 22, 24.8]} min={0} max={35} /> }}
          yLabels={['₹35L', '₹28L', '₹21L', '₹14L', '₹7L', '₹0']}
          xLabels={['Apr 21', 'Apr 28', 'May 5', 'May 12', 'May 19']}
          h={150}
        />
      </div>
      <div style={{ marginTop: '14px', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View Financial Report →
      </div>
    </Card>
  );

  const activities = [
    ['users', 'pur', 'New user registered', 'Ananya Verma (User)', '2 min ago'],
    ['clip', 'grn', 'Skin assessment completed', 'By Neha Gupta (Consultant)', '15 min ago'],
    ['box', 'blu', 'New product added', 'Vitamin C Brightening Serum', '1 hour ago'],
    ['cal', 'pur', 'Routine plan created', 'For Riya Singh (User)', '2 hours ago'],
    ['db', 'tea', 'System backup completed', 'Daily backup completed successfully', '3 hours ago'],
  ];

  const activity = (
    <Card>
      <CardHead title="Recent Activity" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activities.map((a, i) => {
          const tints: Record<string, [string, string]> = {
            pur: ['rgba(47,107,76,0.12)', PUR],
            grn: ['rgba(34,197,94,0.14)', '#16a34a'],
            blu: ['rgba(59,157,248,0.14)', '#2f8fe0'],
            tea: ['rgba(34,201,184,0.16)', '#12a99a'],
          };
          const [ib, icl] = tints[a[1]] || tints.pur;
          return (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', flexShrink: 0, borderRadius: '11px', background: ib, color: icl }}>
                <DashIcon d={PATHS[a[0]] || PATHS.grid} s={17} stroke={icl} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#171433' }}>{a[2]}</div>
                <div style={{ fontSize: '0.76rem', color: '#8b8fa3' }}>{a[3]}</div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#a3a7bd', whiteSpace: 'nowrap' }}>{a[4]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '18px', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f6f7fb', fontSize: '0.82rem', fontWeight: 600, color: PUR }}>
        View All Activity →
      </div>
    </Card>
  );

  const healthItems = [
    ['Database', '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'],
    ['API Services', '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 6l-4 12"/>'],
    ['Storage', '<path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>'],
    ['Email Service', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'],
  ];

  const health = (
    <Card style={{ height: '100%', minWidth: 0 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>System Health</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        {healthItems.map((h, i) => (
          <div key={i} style={{ borderRadius: '14px', border: '1px solid #edeef4', background: '#fafbfe', padding: '14px 10px', minWidth: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '11px', background: 'rgba(34,197,94,0.14)', color: '#16a34a', marginBottom: '10px' }}>
              <DashIcon d={h[1]} s={17} stroke="#16a34a" />
            </span>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#171433', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h[0]}</div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <DashIcon d="<path d='M20 6 9 17l-5-5'/>" s={12} stroke="#16a34a" sw={2.6} /> Healthy
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const actionItems = [
    ['users', 'Add New User'],
    ['box', 'Add Product'],
    ['cal', 'Create Routine'],
    ['doc', 'Generate Report'],
  ];

  const actions = (
    <Card style={{ height: '100%', minWidth: 0 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {actionItems.map((a, i) => (
          <div key={i} style={{ textAlign: 'center', borderRadius: '14px', border: '1px solid #edeef4', background: '#fafbfe', padding: '18px 8px', cursor: 'pointer' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '46px', height: '46px', margin: '0 auto 12px', borderRadius: '13px', background: 'rgba(47,107,76,0.12)', color: PUR }}>
              <DashIcon d={PATHS[a[0]] || PATHS.grid} s={20} stroke={PUR} />
            </span>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3f4a5a' }}>{a[1]}</div>
          </div>
        ))}
      </div>
    </Card>
  );

  const analyticsItems = [
    ['eye', 'Page Views', '125,430', '14%', 1, '#3b9df8', 'rgba(59,157,248,0.14)'],
    ['users', 'Active Sessions', '8,245', '17%', 1, '#16a34a', 'rgba(34,197,94,0.14)'],
    ['trend', 'Bounce Rate', '32.6%', '5%', 0, '#e08a1e', 'rgba(245,166,35,0.16)'],
    ['clock', 'Avg. Session', '04:32', '8%', 1, PUR, 'rgba(47,107,76,0.12)'],
  ];

  const analytics = (
    <Card style={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '1.02rem', fontWeight: 700, color: '#171433' }}>Platform Analytics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {analyticsItems.map((a, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '14px', border: '1px solid #edeef4', background: '#fafbfe', padding: '16px 14px', minWidth: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '11px', background: String(a[6]), color: String(a[5]), marginBottom: '12px' }}>
              <DashIcon d={PATHS[String(a[0])] || PATHS.grid} s={18} stroke={String(a[5])} />
            </span>
            <div style={{ fontSize: '0.8rem', color: '#8b8fa3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '5px' }}>{a[1]}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#171433', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{a[2]}</div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, marginTop: '5px' }}>
              <UpEl text={String(a[3])} color={a[4] ? '#16a34a' : '#ef4444'} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {userOverview}
        {growth}
        {assess}
      </div>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {concerns}
        {revenue}
        {activity}
      </div>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {health}
        {actions}
        {analytics}
      </div>
    </div>
  );
}
