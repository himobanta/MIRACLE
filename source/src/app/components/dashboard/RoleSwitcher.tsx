import type { RoleType } from './Sidebar';

interface RoleSwitcherProps {
  currentRole: RoleType;
  onSelectRole: (role: RoleType) => void;
}

const ROLES: { key: RoleType; label: string }[] = [
  { key: 'user', label: 'User' },
  { key: 'consultant', label: 'Consultant' },
  { key: 'derma', label: 'Dermatologist' },
  { key: 'admin', label: 'Admin' },
];

export function RoleSwitcher({ currentRole, onSelectRole }: RoleSwitcherProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '18px',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        gap: '4px',
        padding: '5px',
        borderRadius: '999px',
        background: 'rgba(23,20,51,0.9)',
        boxShadow: '0 18px 44px -16px rgba(23,20,51,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {ROLES.map(({ key, label }) => {
        const active = currentRole === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectRole(key)}
            style={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: '999px',
              padding: '8px 16px',
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: active ? '#fff' : 'transparent',
              color: active ? '#171433' : 'rgba(255,255,255,0.7)',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
