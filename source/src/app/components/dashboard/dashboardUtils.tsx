import React from 'react';

export const PUR = '#2f6b4c';
export const BLU = '#3b9df8';
export const ORA = '#f5a623';
export const GRN = '#22c55e';
export const PNK = '#f4568f';
export const TEA = '#22c9b8';
export const GRY = '#c4c9da';

const photo = (id: string, w = 140, h = 140) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=faces&auto=format&q=80`;

export const FACE = {
  ananya: photo('1544005313-94ddf0286df2'),
  neha: photo('1494790108377-be9c29b29330'),
  riya: photo('1524504388940-b1c1722653e1'),
  meera: photo('1607746882042-944635dfe10e'),
  kavya: photo('1573496359142-b8d87734a5a2'),
  rohit: photo('1633332755192-727a05c4013d'),
  priya: photo('1573497019940-1c28c88b4f3e'),
  meeraDr: photo('1594824476967-48c8b964273f'),
  ananyaUser: photo('1580489944761-15a19d654956'),
};

const prod = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=200&h=240&fit=crop&auto=format&q=80`;

export const PRODIMG = [
  prod('1620916566398-39f1143ab7be'),
  prod('1608248543803-ba4f8c70ae0b'),
  prod('1611930022073-b7a4ba5fcccd'),
  prod('1556228578-8c89e6adf883'),
  prod('1631730359585-38a4935cbec4'),
];

export function DashIcon({ d, fill = 'none', stroke = 'currentColor', sw = 1.7, s = 18, className = '' }: { d: string; fill?: string; stroke?: string; sw?: number; s?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ width: `${s}px`, height: `${s}px`, display: 'block' }}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

export const PATHS: Record<string, string> = {
  grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5a3.2 3.2 0 0 1 0 6.2"/><path d="M21.5 20a5.5 5.5 0 0 0-4-5.3"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><circle cx="12" cy="10" r="2"/><path d="M9 16a3 3 0 0 1 6 0"/>',
  clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9.5 12 2 2 3.5-3.5"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v3M16 3v3"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  beaker: '<path d="M9 3v6l-5 8a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-8V3"/><path d="M8 3h8"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4.2l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
  log: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  trend: '<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>',
  star: '<path d="M12 3l2.6 5.6L21 9.3l-4.5 4.3 1.1 6.2L12 17l-5.6 2.8 1.1-6.2L3 9.3l6.4-.7z"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(45 12 12)"/><path d="M8.5 8.5 15.5 15.5"/>',
  chat: '<path d="M4 5h16v11H9l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 14-5l2 2"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M4 20v-5h5"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z"/><path d="M5 4v16"/>',
  note: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3"/>',
  spark: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18.5 15l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
  upload: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  heart: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c-1.5 4.5-7 9-7 9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  thumb: '<path d="M7 22V11l5-8 1.5 1a2 2 0 0 1 .8 2.2L13 9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H7z"/><path d="M7 11H4v11h3"/>',
  face: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export function UpEl({ text, color }: { text: string; color: string }) {
  const isDown = color === '#ef4444';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color }}>
      <DashIcon
        d={isDown ? '<path d="M12 5v14M6 13l6 6 6-6"/>' : '<path d="M12 19V5M6 11l6-6 6 6"/>'}
        s={12}
        sw={2.4}
        stroke={color}
      />
      {text}
    </span>
  );
}

export function DonutChart({
  segs,
  center,
  sub,
  size = 150,
}: {
  segs: { pct: number; color: string }[];
  center: string;
  sub: string;
  size?: number;
}) {
  const strokeWidth = size * 0.16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Filter segments with > 0 pct
  const validSegs = segs.filter(s => s.pct > 0);
  const totalPct = validSegs.reduce((acc, s) => acc + s.pct, 0) || 100;

  let accumulatedPct = 0;

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f3f9"
          strokeWidth={strokeWidth}
        />

        {/* Vector SVG segments */}
        {validSegs.map((seg, i) => {
          const normPct = (seg.pct / totalPct) * 100;
          const strokeDash = (normPct / 100) * circumference;
          const strokeOffset = -((accumulatedPct / 100) * circumference);
          accumulatedPct += normPct;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="butt"
              style={{
                transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease',
              }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {center}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px', textTransform: 'capitalize' }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

export function lineChartData(vals: number[], o: { min?: number; max?: number; color?: string; area?: boolean; sw?: number } = {}) {
  const min = o.min !== undefined ? o.min : Math.min(...vals);
  const max = o.max !== undefined ? o.max : Math.max(...vals);
  const n = vals.length;
  const color = o.color || PUR;
  const gid = 'lg_' + Math.random().toString(36).slice(2, 7);

  const pts = vals.map((v, i) => [
    n === 1 ? 0 : (i / (n - 1)) * 100,
    94 - ((v - min) / (max - min || 1)) * 86,
  ]);
  const line = pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

  const el = (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gid} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {o.area !== false && <polygon points={`${line} 100,100 0,100`} fill={`url(#${gid})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth={o.sw || 2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );

  const dots = pts.map((p, i) => ({
    style: {
      position: 'absolute' as const,
      left: `${p[0]}%`,
      top: `${p[1]}%`,
      width: '7px',
      height: '7px',
      marginLeft: '-3.5px',
      marginTop: '-3.5px',
      borderRadius: '50%',
      background: '#fff',
      border: `2px solid ${color}`,
      boxSizing: 'border-box' as const,
    },
    last: i === n - 1,
  }));

  return { el, dots };
}

export function LineChart({ vals, color = PUR, min, max, sw = 2, area = true }: { vals: number[]; color?: string; min?: number; max?: number; sw?: number; area?: boolean }) {
  const chartData = lineChartData(vals, { min, max, color, sw, area });
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {chartData.el}
      {chartData.dots.map((d, i) => (
        <span
          key={i}
          style={
            d.last
              ? { ...d.style, width: '9px', height: '9px', marginLeft: '-4.5px', marginTop: '-4.5px', boxShadow: '0 0 0 4px rgba(47,107,76,0.16)' }
              : d.style
          }
        />
      ))}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius: '16px', background: '#fff', border: '1px solid #edeef4', boxShadow: '0 4px 16px -10px rgba(23,20,51,0.28)', padding: '18px', ...style }}>
      {children}
    </div>
  );
}

export function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '20px' }}>
      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#171433', whiteSpace: 'nowrap' }}>{title}</h3>
      {right || null}
    </div>
  );
}

export function Pill({ text }: { text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, borderRadius: '9px', border: '1px solid #edeef4', background: '#fafbfe', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#6b7189', whiteSpace: 'nowrap' }}>
      {text}
      <DashIcon d="<path d='m6 9 6 6 6-6'/>" s={12} sw={2} stroke="#9aa0b4" />
    </span>
  );
}

export function Legend({ rows }: { rows: [string, string, string][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1, minWidth: 0 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '0.82rem', color: '#3f4a5a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ width: '10px', height: '10px', flexShrink: 0, borderRadius: '50%', background: r[2] }} />
            {r[0]}
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#171433', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {r[1]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Bars({ rows }: { rows: [string, number, string?][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '7px' }}>
            <span style={{ color: '#3f4a5a' }}>{r[0]}</span>
            <span style={{ fontWeight: 700, color: '#171433' }}>{r[2] || `${r[1]}%`}</span>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: '#f4efe4', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r[1]}%`, borderRadius: '999px', background: 'linear-gradient(90deg,#3f8a63,#2f6b4c)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartFrame({ chart, yLabels, xLabels, h = 200 }: { chart: { el: React.ReactNode }; yLabels: string[]; xLabels: string[]; h?: number }) {
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.68rem', color: '#a3a7bd', height: `${h}px`, paddingBottom: '18px' }}>
        {yLabels.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ position: 'relative', height: `${h}px` }}>
          {chart.el}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.68rem', color: '#a3a7bd' }}>
          {xLabels.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
