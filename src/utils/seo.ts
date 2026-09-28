import { useEffect } from 'react';

export interface PageSeoMeta {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

const SEO_BY_VIEW: Record<string, PageSeoMeta> = {
  landing: {
    title: 'Campus Resource Exchange | Find and Share Campus Resources',
    description:
      'Find textbooks, notes, calculators, and lab equipment shared by students in your campus. Pass on academic resources you no longer use.',
    path: '/',
  },
  browse: {
    title: 'Browse Academic Resources | Campus Resource Exchange',
    description:
      'Search and filter physical textbooks, calculators, lab instruments, and digital course notes by department, semester, and subject.',
    path: '/browse',
  },
  requests: {
    title: 'Student Resource Requests Board | Campus Resource Exchange',
    description:
      'View open academic material requests from verified college students or post what you need for your current semester courses.',
    path: '/requests',
  },
  'how-it-works': {
    title: 'How It Works — Borrowing & Sharing | Campus Resource Exchange',
    description:
      'Learn how to find, request, borrow, and return physical and digital academic resources within your campus community.',
    path: '/how-it-works',
  },
  about: {
    title: 'About & Campus Usage Guidelines | Campus Resource Exchange',
    description:
      'Institutional governance, copyright compliance, and physical equipment lending standards for Campus Resource Exchange.',
    path: '/about',
  },
  privacy: {
    title: 'Privacy Policy & Data Governance | Campus Resource Exchange',
    description:
      'Review how Campus Resource Exchange collects, protects, retains, and deletes student authentication, profile, and transaction data.',
    path: '/privacy',
  },
  terms: {
    title: 'Terms and Conditions | Campus Resource Exchange',
    description:
      'Acceptable use, copyright responsibilities, physical lending rules, digital resource guidelines, and liability terms for Campus Resource Exchange.',
    path: '/terms',
  },
  activity: {
    title: 'My Activity & Profile | Campus Resource Exchange',
    description: 'Manage your active borrowings, lending requests, and uploaded campus resources.',
    path: '/activity',
    noindex: true,
  },
  admin: {
    title: 'Admin Governance Console | Campus Resource Exchange',
    description: 'Restricted moderation, audit log, and taxonomy administration console.',
    path: '/admin',
    noindex: true,
  },
  'not-found': {
    title: 'Page Not Found (404) | Campus Resource Exchange',
    description: 'The requested page or campus resource could not be found.',
    path: '/404',
    noindex: true,
  },
};

function setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageSeo(activeView: string): void {
  useEffect(() => {
    const meta = SEO_BY_VIEW[activeView] || SEO_BY_VIEW.landing;
    document.title = meta.title;

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://your-domain.com';
    const canonicalUrl = `${origin}${meta.path}`;

    setMetaTag('name', 'description', meta.description);
    setMetaTag('property', 'og:title', meta.title);
    setMetaTag('property', 'og:description', meta.description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('name', 'twitter:title', meta.title);
    setMetaTag('name', 'twitter:description', meta.description);
    setMetaTag('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [activeView]);
}
