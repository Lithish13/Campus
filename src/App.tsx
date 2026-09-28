import React, { useCallback, useEffect, useState } from 'react';
import {
  AppNotification,
  AuthenticatedUser,
  Resource,
  ResourceNeedRequest,
  TaxonomyData,
  UserRole,
} from './types';
import { apiRequest, clearAuthTokens, setAuthTokens } from './api';
import { logoutFirebase } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveView, Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { CatalogFilters, CatalogView } from './components/CatalogView';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { ListResourceModal } from './components/ListResourceModal';
import { RequestsBoardView } from './components/RequestsBoardView';
import { ActivityProfileView } from './components/ActivityProfileView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { HowItWorksAboutView } from './components/HowItWorksAboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { NotFoundView } from './components/NotFoundView';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { usePageSeo } from './utils/seo';
import { trackAnalyticsEvent } from './utils/analytics';

const DEFAULT_TAXONOMY: TaxonomyData = {
  allowedDomains: ['campus.edu', 'mit.edu', 'iitb.ac.in', 'stanford.edu', 'berkeley.edu'],
  departments: [],
  semesters: [
    { id: 1, label: 'Semester 1' },
    { id: 2, label: 'Semester 2' },
    { id: 3, label: 'Semester 3' },
    { id: 4, label: 'Semester 4' },
    { id: 5, label: 'Semester 5' },
    { id: 6, label: 'Semester 6' },
    { id: 7, label: 'Semester 7' },
    { id: 8, label: 'Semester 8' },
  ],
  subjects: [],
  categories: [],
};

const INITIAL_FILTERS: CatalogFilters = {
  q: '',
  department: '',
  semester: '',
  subject: '',
  category: '',
  resourceType: '',
  lendingType: '',
  availableOnly: false,
};

function getInitialViewFromPath(): ActiveView {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/home' || path === '/index.html') return 'landing';
  if (path === '/privacy' || path === '/privacy-policy') return 'privacy';
  if (path === '/terms' || path === '/terms-and-conditions') return 'terms';
  if (path === '/browse' || path === '/catalog' || path === '/resources') return 'browse';
  if (path === '/requests') return 'requests';
  if (path === '/how-it-works') return 'how-it-works';
  if (path === '/about') return 'about';
  if (path === '/activity' || path === '/profile') return 'activity';
  if (path === '/admin') return 'admin';
  return 'not-found';
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>(getInitialViewFromPath);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyData>(DEFAULT_TAXONOMY);
  const [resources, setResources] = useState<Resource[]>([]);
  const [myResources, setMyResources] = useState<Resource[]>([]);
  const [needRequests, setNeedRequests] = useState<ResourceNeedRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'reset' | null>(
    null
  );
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Dynamic SEO metadata per page (Section 58)
  usePageSeo(activeView);

  // Privacy-conscious page view tracking (Section 57)
  useEffect(() => {
    trackAnalyticsEvent('page_view', { view: activeView });
  }, [activeView]);

  const navigateTo = useCallback((view: ActiveView) => {
    setActiveView(view);
    const nextPath =
      view === 'landing' ? '/' : view === 'not-found' ? '/404' : `/${view}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveView(getInitialViewFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const fetchTaxonomy = useCallback(async () => {
    try {
      const res = await apiRequest<TaxonomyData>('/api/taxonomy');
      setTaxonomy(res.data);
    } catch {
      // ignore initial taxonomy errors
    }
  }, []);

  const fetchResources = useCallback(async (activeFilters: CatalogFilters) => {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      const params = new URLSearchParams();
      if (activeFilters.q.trim()) params.set('q', activeFilters.q.trim());
      if (activeFilters.department) params.set('department', activeFilters.department);
      if (activeFilters.semester) params.set('semester', activeFilters.semester);
      if (activeFilters.subject) params.set('subject', activeFilters.subject);
      if (activeFilters.category) params.set('category', activeFilters.category);
      if (activeFilters.resourceType) params.set('resourceType', activeFilters.resourceType);
      if (activeFilters.lendingType) params.set('lendingType', activeFilters.lendingType);
      if (activeFilters.availableOnly) params.set('availableOnly', 'true');

      const queryString = params.toString();
      const url = queryString ? `/api/resources?${queryString}` : '/api/resources';
      const res = await apiRequest<{ resources: Resource[] }>(url);
      setResources(res.data.resources);
    } catch (err) {
      setCatalogError(
        err instanceof Error
          ? err.message
          : 'Unable to load catalog resources. Please verify your connection.'
      );
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const fetchNeedRequests = useCallback(async () => {
    try {
      const res = await apiRequest<{ requests: ResourceNeedRequest[] }>(
        '/api/resource-requests'
      );
      setNeedRequests(res.data.requests);
    } catch {
      // ignore
    }
  }, []);

  const fetchUserContext = useCallback(async () => {
    try {
      const res = await apiRequest<{ user: AuthenticatedUser | null }>('/api/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
        setAuthTokens(res.data.user.csrfToken);
        const [notifRes, myRes] = await Promise.all([
          apiRequest<{ notifications: AppNotification[] }>('/api/notifications'),
          apiRequest<{ resources: Resource[] }>('/api/my/resources'),
        ]);
        setNotifications(notifRes.data.notifications);
        setMyResources(myRes.data.resources);
      } else {
        setUser(null);
        setNotifications([]);
        setMyResources([]);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchTaxonomy();
    fetchResources(filters);
    fetchNeedRequests();
    fetchUserContext();
  }, [fetchTaxonomy, fetchResources, fetchNeedRequests, fetchUserContext, filters]);

  useEffect(() => {
    fetchTaxonomy();
    fetchNeedRequests();
    fetchUserContext();
  }, [fetchTaxonomy, fetchNeedRequests, fetchUserContext]);

  useEffect(() => {
    fetchResources(filters);
  }, [filters, fetchResources]);

  const handleMarkNotificationsRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    await logoutFirebase();
    clearAuthTokens();
    setUser(null);
    setNotifications([]);
    setMyResources([]);
    if (activeView === 'activity' || activeView === 'admin') {
      navigateTo('landing');
    }
  };

  const handleOpenListModal = () => {
    if (!user) {
      setAuthModalMode('login');
      return;
    }
    setListModalOpen(true);
  };

  const handleSelectCategoryFromLanding = (categoryName: string) => {
    setFilters({
      ...INITIAL_FILTERS,
      category: categoryName,
    });
    navigateTo('browse');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#171717] pb-14 md:pb-0">
        {/* Skip to Main Content for Keyboard Accessibility (Section 67) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1F5E46] focus:text-white focus:rounded focus:text-xs focus:font-semibold"
        >
          Skip to main content
        </a>

        <Navbar
          activeView={activeView}
          onNavigate={navigateTo}
          user={user}
          notifications={notifications}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onSelectResourceById={(resourceId) => setSelectedResourceId(resourceId)}
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          onOpenListModal={handleOpenListModal}
          onLogout={handleLogout}
        />

        <main id="main-content" className="flex-1">
          {activeView === 'landing' && (
            <LandingView
              categories={taxonomy.categories}
              recentResources={resources}
              onBrowseAll={() => {
                setFilters(INITIAL_FILTERS);
                navigateTo('browse');
              }}
              onSelectCategory={handleSelectCategoryFromLanding}
              onListResource={handleOpenListModal}
              onOpenRequests={() => navigateTo('requests')}
              onSelectResource={(resource) => setSelectedResourceId(resource.id)}
            />
          )}

          {activeView === 'browse' && (
            <CatalogView
              resources={resources}
              taxonomy={taxonomy}
              filters={filters}
              loading={loadingCatalog}
              error={catalogError}
              onRetry={() => fetchResources(filters)}
              onChangeFilters={setFilters}
              onClearFilters={() => setFilters(INITIAL_FILTERS)}
              onSelectResource={(resource) => setSelectedResourceId(resource.id)}
              onListResource={handleOpenListModal}
            />
          )}

          {activeView === 'requests' && (
            <RequestsBoardView
              requests={needRequests}
              myResources={myResources}
              taxonomy={taxonomy}
              user={user}
              onOpenAuth={() => setAuthModalMode('login')}
              onRefresh={refreshAll}
              onSelectResourceById={(resourceId) => setSelectedResourceId(resourceId)}
            />
          )}

          {(activeView === 'how-it-works' || activeView === 'about') && (
            <HowItWorksAboutView
              mode={activeView}
              onBrowseResources={() => navigateTo('browse')}
              onOpenRequests={() => navigateTo('requests')}
              onOpenPrivacy={() => navigateTo('privacy')}
            />
          )}

          {activeView === 'activity' &&
            (user ? (
              <ActivityProfileView
                user={user}
                onSelectResource={(resource) => setSelectedResourceId(resource.id)}
                onSelectResourceById={(resourceId) => setSelectedResourceId(resourceId)}
                onOpenListModal={handleOpenListModal}
                onGlobalRefresh={refreshAll}
              />
            ) : (
              <div className="max-w-md mx-auto my-16 p-6 bg-white border border-[#E4E4E0] rounded-md text-center space-y-4">
                <h2 className="text-base font-semibold text-[#171717]">
                  Authentication Required
                </h2>
                <p className="text-xs text-[#666666]">
                  Please sign in with your verified college account to view your active borrowings, requests, and listed resources.
                </p>
                <button
                  type="button"
                  onClick={() => setAuthModalMode('login')}
                  className="px-4 py-2 text-xs font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            ))}

          {activeView === 'admin' &&
            (user?.role === UserRole.ADMIN ? (
              <AdminDashboardView
                taxonomy={taxonomy}
                onSelectResource={(resource) => setSelectedResourceId(resource.id)}
                onGlobalRefresh={refreshAll}
              />
            ) : (
              <div className="max-w-md mx-auto my-16 p-6 bg-white border border-[#E4E4E0] rounded-md text-center space-y-4">
                <h2 className="text-base font-semibold text-[#B42318]">
                  Administrator Access Required
                </h2>
                <p className="text-xs text-[#666666]">
                  This moderation and governance console is restricted to verified campus administrators.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('landing')}
                  className="px-4 py-2 text-xs font-medium bg-[#171717] text-white rounded cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            ))}

          {activeView === 'privacy' && (
            <PrivacyView
              user={user}
              onAccountDeleted={() => {
                clearAuthTokens();
                setUser(null);
                navigateTo('landing');
                refreshAll();
              }}
              onOpenTerms={() => navigateTo('terms')}
            />
          )}

          {activeView === 'terms' && (
            <TermsView
              onOpenPrivacy={() => navigateTo('privacy')}
              onBrowseResources={() => navigateTo('browse')}
            />
          )}

          {activeView === 'not-found' && (
            <NotFoundView onBrowseResources={() => navigateTo('browse')} />
          )}
        </main>

        {/* Institutional Footer — Quiet copyright and verified navigation links */}
        <footer className="bg-white border-t border-[#E4E4E0] mt-auto">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[#1F5E46] text-white font-mono text-[10px] font-semibold flex items-center justify-center">
                    CRX
                  </span>
                  <span className="text-sm font-semibold text-[#171717]">
                    Campus Resource Exchange
                  </span>
                </div>
                <p className="text-xs text-[#666666]">
                  Find textbooks, notes and equipment shared by students in your campus.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs text-[#666666]">
                <button
                  type="button"
                  onClick={() => navigateTo('browse')}
                  className="hover:text-[#171717] cursor-pointer"
                >
                  Browse Catalog
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('requests')}
                  className="hover:text-[#171717] cursor-pointer"
                >
                  Requests Board
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('how-it-works')}
                  className="hover:text-[#171717] cursor-pointer"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#171717] cursor-pointer"
                >
                  About
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('privacy')}
                  className="hover:text-[#171717] cursor-pointer font-medium text-[#1F5E46]"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('terms')}
                  className="hover:text-[#171717] cursor-pointer font-medium text-[#1F5E46]"
                >
                  Terms &amp; Conditions
                </button>
              </div>
            </div>
          </div>
        </footer>

        {/* Cookie Consent Banner (Section 56) */}
        <CookieConsentBanner onOpenPrivacy={() => navigateTo('privacy')} />

        {/* Resource Detail Modal */}
        {selectedResourceId && (
          <ResourceDetailModal
            resourceId={selectedResourceId}
            user={user}
            onClose={() => setSelectedResourceId(null)}
            onOpenAuth={() => {
              setSelectedResourceId(null);
              setAuthModalMode('login');
            }}
            onResourceUpdated={refreshAll}
          />
        )}

        {/* List Resource Modal */}
        {listModalOpen && user && (
          <ListResourceModal
            user={user}
            taxonomy={taxonomy}
            onClose={() => setListModalOpen(false)}
            onCreated={(created) => {
              setListModalOpen(false);
              refreshAll();
              setSelectedResourceId(created.id);
            }}
          />
        )}

        {/* Auth Modal */}
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            taxonomy={taxonomy}
            onClose={() => setAuthModalMode(null)}
            onAuthenticated={(authedUser) => {
              setUser(authedUser);
              setAuthModalMode(null);
              refreshAll();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
