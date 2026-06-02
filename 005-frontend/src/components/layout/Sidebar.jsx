import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Smartphone, Settings, Users, Activity, X, Terminal, FileText, LayoutDashboard, Map, AlertCircle, BarChart3, TrendingUp, Shield, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const menuItems = [
    // { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <BarChart3 size={20} />, label: 'Dashboard', path: '/' },
    { icon: <TrendingUp size={20} />, label: 'Performance', path: '/performance' },
    { icon: <Shield size={20} />, label: 'KPI Trends', path: '/availability' },
    { icon: <Radio size={20} />, label: 'NVT', path: '/nvt' },
    { icon: <Smartphone size={20} />, label: 'Devices', path: '/Devices' },
    { icon: <Map size={20} />, label: 'Journeys', path: '/Journeys' },
    { icon: <Terminal size={20} />, label: 'Execution', path: '/Execution' },
    // { icon: <Users size={20} />, label: 'Agents', path: '/Agents' },
    { icon: <FileText size={20} />, label: 'Reports', path: '/Reports' },
    // { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : '??';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-canvas border-r border-hairline transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'}`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-hairline">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <Smartphone size={18} />
            </div>
            <span className={`font-normal tracking-tight text-xl text-ink whitespace-nowrap transition-opacity duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
              Mobile Lab
            </span>
          </div>
          {/* Mobile Close Button */}
          <button 
            className="md:hidden text-muted hover:text-ink"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-full transition-colors group ${
                  isActive 
                    ? 'text-primary font-medium' 
                    : 'text-body hover:bg-surface-soft hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`${isActive ? 'text-primary' : 'text-muted group-hover:text-ink'}`}>
                    {item.icon}
                  </div>
                  <span className={`whitespace-nowrap transition-opacity duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="p-4 border-t border-hairline mt-auto">
          <div className={`p-3 rounded-3xl bg-surface-soft border border-hairline transition-all duration-300 ${!isOpen ? 'md:p-2 lg:p-3' : ''}`}>
            <div className={`flex items-center gap-3 ${!isOpen ? 'md:justify-center lg:justify-start' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-surface-strong text-ink flex-shrink-0 flex items-center justify-center font-bold text-sm border border-hairline">
                {initials}
              </div>
              <div className={`flex-1 overflow-hidden transition-all duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
                <p className="text-sm font-bold text-ink truncate leading-tight">{user?.username || 'User'}</p>
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">{user?.role || 'Administrator'}</p>
              </div>
            </div>
            
            <div className={`mt-3 transition-all duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-canvas text-ink border border-hairline hover:bg-surface-strong rounded-full text-xs font-bold transition-all shadow-sm group"
              >
                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Sign Out
              </button>
            </div>
            
            {/* Minimal Logout for Collapsed Sidebar */}
            {!isOpen && (
              <div className="mt-2 hidden md:flex lg:hidden justify-center">
                 <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2 text-ink hover:bg-surface-strong rounded-full transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutModal && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-surface-dark/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
              onClick={() => setShowLogoutModal(false)}
            />
            
            {/* Modal Content */}
            <div className="relative bg-canvas w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-hairline">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-surface-soft text-ink rounded-full flex items-center justify-center mb-6">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-2xl font-normal tracking-tight text-ink mb-2">Sign Out</h3>
                <p className="text-body text-sm mb-8">
                  Are you sure you want to end this session? You will need to sign in again to access the dashboard.
                </p>
                
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-5 py-3 bg-surface-strong text-ink font-semibold rounded-full hover:bg-hairline-soft transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={logout}
                    className="flex-1 px-5 py-3 bg-primary text-on-primary font-semibold rounded-full hover:bg-primary-active transition-all text-sm"
                  >
                    Yes, Sign out
                  </button>
                </div>
              </div>
              
              <div className="bg-surface-soft px-6 py-4 border-t border-hairline flex justify-center">
                <p className="text-xs text-muted font-medium uppercase tracking-widest">Mobile Lab Automation</p>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
};

export default Sidebar;
