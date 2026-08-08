import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router';
import { Sidebar, RoleType } from '../components/dashboard/Sidebar';
import { Topbar } from '../components/dashboard/Topbar';
import { StatCards } from '../components/dashboard/StatCards';
import { UserWorkspace } from '../components/dashboard/UserWorkspace';
import { ConsultantWorkspace } from '../components/dashboard/ConsultantWorkspace';
import { DermaWorkspace } from '../components/dashboard/DermaWorkspace';
import { AdminWorkspace } from '../components/dashboard/AdminWorkspace';
import { RoleSwitcher } from '../components/dashboard/RoleSwitcher';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { roleParam } = useParams<{ roleParam?: string }>();
  const navigate = useNavigate();

  const getValidRole = (r?: string | null): RoleType => {
    if (r === 'admin' || r === 'derma' || r === 'consultant' || r === 'user') {
      return r as RoleType;
    }
    return 'user';
  };

  const initialRole = getValidRole(roleParam || searchParams.get('role'));
  const [role, setRole] = useState<RoleType>(initialRole);

  useEffect(() => {
    let r = getValidRole(roleParam || searchParams.get('role'));
    try {
      const userStr = localStorage.getItem('miracle_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const userRole = u.role;
        // Role permission map
        if (userRole === 'User' && r !== 'user') {
          r = 'user';
          navigate('/dashboard/user', { replace: true });
        } else if (userRole === 'Skincare Consultant' && r !== 'consultant' && r !== 'user') {
          r = 'consultant';
          navigate('/dashboard/consultant', { replace: true });
        } else if (userRole === 'Dermatologist' && r !== 'derma' && r !== 'user') {
          r = 'derma';
          navigate('/dashboard/derma', { replace: true });
        }
      }
    } catch { /* fallback */ }
    setRole(r);
  }, [roleParam, searchParams, navigate]);

  useEffect(() => {
    const fit = () => {
      const wrap = document.getElementById('dashFit');
      const canvas = document.getElementById('dashCanvas');
      if (!wrap || !canvas) return;
      canvas.style.zoom = '1';
      const k = Math.min(1, wrap.clientWidth / 1600);
      canvas.style.zoom = String(k);
    };

    fit();
    requestAnimationFrame(fit);
    const timer1 = setTimeout(fit, 200);
    const timer2 = setTimeout(fit, 600);

    window.addEventListener('resize', fit);
    const wrapEl = document.getElementById('dashFit');
    const ro = new ResizeObserver(fit);
    if (wrapEl) ro.observe(wrapEl);

    return () => {
      window.removeEventListener('resize', fit);
      clearTimeout(timer1);
      clearTimeout(timer2);
      ro.disconnect();
    };
  }, [role]);

  const handleSelectRole = (newRole: RoleType) => {
    setRole(newRole);
    setSearchParams({ role: newRole });
    navigate(`/dashboard/${newRole}`, { replace: true });
  };

  const contentMt = role === 'user' ? '0px' : '16px';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#f4efe4' }}>
      <div id="dashFit" style={{ width: '100%', overflow: 'hidden', background: '#f4efe4' }}>
        <div
          id="dashCanvas"
          style={{
            display: 'flex',
            width: '1600px',
            minHeight: '100vh',
            background: '#f4efe4',
            color: '#1e1b39',
            fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
            WebkitFontSmoothing: 'antialiased',
            fontSize: '14px',
          }}
        >
          {/* Sidebar */}
          <Sidebar role={role} />

          {/* Main Workspace */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Topbar */}
            <Topbar role={role} />

            {/* Main Content Area */}
            <div style={{ position: 'relative', zIndex: 1, padding: '10px 24px 16px' }}>
              {/* Stat Cards (Admin, Derma, Consultant only) */}
              {role !== 'user' && (
                <div>
                  <StatCards role={role} />
                </div>
              )}

              {/* Workspace by Role */}
              <div style={{ marginTop: contentMt }}>
                {role === 'admin' && <AdminWorkspace />}
                {role === 'derma' && <DermaWorkspace />}
                {role === 'consultant' && <ConsultantWorkspace />}
                {role === 'user' && <UserWorkspace />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Role Switcher Capsule */}
      <RoleSwitcher currentRole={role} onSelectRole={handleSelectRole} />
    </div>
  );
}
