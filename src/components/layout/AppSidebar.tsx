import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, Settings, Zap } from 'lucide-react';

const AppSidebar = () => {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleLabel = roles.includes('admin') ? 'Admin' : roles.includes('manager') ? 'Manager' : 'Sales';

  return (
    <aside className="w-60 bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">LeadFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <SidebarItem icon={LayoutDashboard} label="Pipeline" active={location.pathname === '/'} onClick={() => navigate('/')} />
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium text-sidebar-accent-foreground">
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-sidebar-muted">{roleLabel}</p>
          </div>
          <button onClick={signOut} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: {
  icon: any; label: string; active: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export default AppSidebar;
