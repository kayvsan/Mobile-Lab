import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Smartphone, Settings, Users, Activity, X, Terminal, FileText, LayoutDashboard, Map, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const menuItems = [
    // { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Smartphone size={20} />, label: 'Devices', path: '/' },
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
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'}`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Smartphone size={20} />
            </div>
            <span className={`font-bold text-lg text-slate-800 whitespace-nowrap transition-opacity duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
              Mobile Lab
            </span>
          </div>
          {/* Mobile Close Button */}
          <button 
            className="md:hidden text-slate-500 hover:text-slate-700"
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
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
        <div className="p-4 border-t border-slate-100 mt-auto">
          <div className={`p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all duration-300 ${!isOpen ? 'md:p-2 lg:p-3' : ''}`}>
            <div className={`flex items-center gap-3 ${!isOpen ? 'md:justify-center lg:justify-start' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white">
                {initials}
              </div>
              <div className={`flex-1 overflow-hidden transition-all duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
                <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.username || 'User'}</p>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">{user?.role || 'Administrator'}</p>
              </div>
            </div>
            
            <div className={`mt-3 transition-all duration-300 ${!isOpen ? 'md:hidden lg:block' : 'block'}`}>
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-rose-600 border border-rose-100 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-xs font-bold transition-all shadow-sm group"
              >
                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Keluar Sesi
              </button>
            </div>
            
            {/* Minimal Logout for Collapsed Sidebar */}
            {!isOpen && (
              <div className="mt-2 hidden md:flex lg:hidden justify-center">
                 <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
              onClick={() => setShowLogoutModal(false)}
            />
            
            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Keluar</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Apakah Anda yakin ingin mengakhiri sesi ini? Anda harus login kembali untuk mengakses dashboard.
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={logout}
                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all text-sm"
                  >
                    Ya, Keluar
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-center">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Mobile Lab Automation</p>
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
