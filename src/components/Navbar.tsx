import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  CheckCheck,
  Home,
  LogOut,
  MessageSquarePlus,
  Plus,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { AppNotification, AuthenticatedUser, UserRole } from '../types';
import { formatDateShort } from '../api';

export type ActiveView =
  | 'landing'
  | 'browse'
  | 'requests'
  | 'how-it-works'
  | 'about'
  | 'activity'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'not-found';

interface NavbarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  user: AuthenticatedUser | null;
  notifications: AppNotification[];
  onMarkNotificationsRead: () => void;
  onSelectResourceById: (resourceId: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenListModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  user,
  notifications,
  onMarkNotificationsRead,
  onSelectResourceById,
  onOpenAuth,
  onOpenListModal,
  onLogout,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const navLinks: { id: ActiveView; label: string }[] = [
    { id: 'browse', label: 'Browse' },
    { id: 'requests', label: 'Requests' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'about', label: 'About' },
  ];

  const handleNavClick = (view: ActiveView) => {
    onNavigate(view);
    setNotifOpen(false);
  };

  return (
    <>
      {/* Top Navigation Bar — 3-Zone Contract (Brand, Nav Links, Primary Actions) */}
      <header className="md:sticky md:top-0 z-30 bg-[#FFFFFF] border-b border-[#E4E4E0]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className="text-base font-semibold tracking-tight text-[#171717] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1F5E46]"
          >
            Campus Resource Exchange
          </button>

          {/* Zone 2: 4–6 clean text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#666666]"
          >
            {navLinks.map((link) => {
              const isActive = activeView === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavClick(link.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-[#171717] font-semibold underline decoration-[#1F5E46] decoration-2 underline-offset-4'
                      : 'text-[#666666] hover:text-[#171717] hover:underline underline-offset-4'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
            {user && (
              <button
                type="button"
                onClick={() => handleNavClick('activity')}
                aria-current={activeView === 'activity' ? 'page' : undefined}
                className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                  activeView === 'activity'
                    ? 'text-[#171717] font-semibold underline decoration-[#1F5E46] decoration-2 underline-offset-4'
                    : 'text-[#666666] hover:text-[#171717] hover:underline underline-offset-4'
                }`}
              >
                My Activity
              </button>
            )}
            {user?.role === UserRole.ADMIN && (
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                aria-current={activeView === 'admin' ? 'page' : undefined}
                className={`inline-flex items-center gap-1 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                  activeView === 'admin'
                    ? 'text-[#1F5E46] font-semibold underline decoration-[#1F5E46] decoration-2 underline-offset-4'
                    : 'text-[#1F5E46] hover:underline underline-offset-4'
                }`}
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={onOpenListModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>List a resource</span>
                </button>

                {/* Desktop Notification Bell */}
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((prev) => !prev)}
                    className="relative p-2 text-[#666666] hover:text-[#171717] hover:bg-[#F7F7F5] border border-[#E4E4E0] rounded transition-colors cursor-pointer"
                    aria-label={`Notifications (${unreadCount} unread)`}
                    aria-expanded={notifOpen}
                  >
                    <Bell className="w-4 h-4" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#B42318] text-white font-mono text-[10px] font-semibold rounded flex items-center justify-center tabular-nums">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E4E4E0] rounded-md shadow-sm z-40">
                      <div className="px-4 py-2.5 border-b border-[#E4E4E0] flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#171717] tabular-nums">
                          Notifications ({unreadCount} unread)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={onMarkNotificationsRead}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#1F5E46] hover:underline cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E4E0]">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#666666]">
                            No notifications recorded for your account.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                if (n.resourceId) {
                                  onSelectResourceById(n.resourceId);
                                } else {
                                  onNavigate('activity');
                                }
                              }}
                              className={`w-full p-3.5 text-left hover:bg-[#F7F7F5] transition-colors cursor-pointer ${
                                !n.isRead ? 'bg-[#F4F8F6]' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-[#171717]">
                                  {n.title}
                                </p>
                                <span className="text-[11px] font-mono text-[#666666] shrink-0 tabular-nums">
                                  {formatDateShort(n.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-[#666666] mt-1 leading-relaxed">
                                {n.message}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Profile & Sign out */}
                <button
                  type="button"
                  onClick={() => handleNavClick('activity')}
                  className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#171717] bg-[#F7F7F5] hover:bg-[#F0EFEA] border border-[#E4E4E0] rounded transition-colors whitespace-nowrap cursor-pointer"
                  title="View Profile & Activity"
                >
                  <User className="w-3.5 h-3.5 text-[#1F5E46]" aria-hidden="true" />
                  <span className="max-w-[120px] truncate">{user.fullName}</span>
                  <span className="font-mono text-[11px] text-[#666666] tabular-nums">
                    [{user.studentId}]
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 text-[#666666] hover:text-[#B42318] hover:bg-[#F7F7F5] border border-[#E4E4E0] rounded transition-colors cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#171717] hover:bg-[#F7F7F5] border border-[#E4E4E0] rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Notification Tray (when toggled from bottom mobile nav) */}
        {notifOpen && (
          <div className="md:hidden border-t border-[#E4E4E0] bg-white px-4 py-3 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#171717] tabular-nums">
                Notifications ({unreadCount} unread)
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkNotificationsRead}
                  className="text-xs font-medium text-[#1F5E46] underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-[#666666] py-2">
                No notifications recorded for your account.
              </p>
            ) : (
              <div className="divide-y divide-[#E4E4E0]">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      if (n.resourceId) {
                        onSelectResourceById(n.resourceId);
                      } else {
                        onNavigate('activity');
                      }
                    }}
                    className="w-full text-left py-2.5 cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#171717]">{n.title}</p>
                    <p className="text-xs text-[#666666] mt-0.5">{n.message}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Section 68: Home, Browse, Requests, Notifications, Profile; <= 15% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-[#E4E4E0] grid grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => handleNavClick('landing')}
          aria-current={activeView === 'landing' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center h-full gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'landing' ? 'text-[#1F5E46] font-semibold' : 'text-[#666666]'
          }`}
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavClick('browse')}
          aria-current={activeView === 'browse' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center h-full gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'browse' ? 'text-[#1F5E46] font-semibold' : 'text-[#666666]'
          }`}
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          <span>Browse</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavClick('requests')}
          aria-current={activeView === 'requests' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center h-full gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'requests' ? 'text-[#1F5E46] font-semibold' : 'text-[#666666]'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
          <span>Requests</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              onOpenAuth('login');
            } else {
              setNotifOpen((prev) => !prev);
            }
          }}
          className={`relative flex flex-col items-center justify-center h-full gap-0.5 text-[11px] font-medium cursor-pointer ${
            notifOpen ? 'text-[#1F5E46] font-semibold' : 'text-[#666666]'
          }`}
        >
          <div className="relative">
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 bg-[#B42318] text-white font-mono text-[9px] rounded flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              onOpenAuth('login');
            } else {
              handleNavClick('activity');
            }
          }}
          aria-current={activeView === 'activity' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center h-full gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'activity' ? 'text-[#1F5E46] font-semibold' : 'text-[#666666]'
          }`}
        >
          <User className="w-4 h-4" aria-hidden="true" />
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
};
