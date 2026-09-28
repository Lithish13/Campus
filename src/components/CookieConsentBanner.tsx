import React, { useEffect, useState } from 'react';
import {
  CookieConsentChoice,
  getCookieConsent,
  setCookieConsent,
} from '../utils/analytics';

interface CookieConsentBannerProps {
  onOpenPrivacy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onOpenPrivacy,
}) => {
  const [choice, setChoice] = useState<CookieConsentChoice>(() => getCookieConsent());

  useEffect(() => {
    const onConsentUpdated = () => {
      setChoice(getCookieConsent());
    };
    window.addEventListener('crx-consent-updated', onConsentUpdated);
    return () => window.removeEventListener('crx-consent-updated', onConsentUpdated);
  }, []);

  if (choice !== null) {
    return null;
  }

  const handleAccept = () => {
    setCookieConsent('accepted');
    setChoice('accepted');
  };

  const handleReject = () => {
    setCookieConsent('rejected');
    setChoice('rejected');
  };

  return (
    <aside
      role="region"
      aria-label="Cookie and analytics consent"
      className="fixed bottom-14 md:bottom-0 inset-x-0 z-40 bg-white border-t border-[#E4E4E0] px-4 py-3 sm:px-6"
    >
      <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-[#666666] leading-relaxed max-w-3xl">
          <strong className="text-[#171717]">Cookies &amp; Usage Analytics:</strong> CRX uses strictly necessary HttpOnly session cookies for authentication and CSRF protection. With your permission, we also record anonymous, aggregate usage counts (page views, searches, downloads, and completed exchanges) containing zero personal information. Optional analytics are never loaded before consent.{' '}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-[#1F5E46] font-medium underline cursor-pointer"
          >
            Privacy Policy
          </button>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReject}
            className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-[#F7F7F5] text-[#171717] border border-[#E4E4E0] rounded cursor-pointer whitespace-nowrap"
          >
            Reject optional
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-3.5 py-1.5 text-xs font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded cursor-pointer whitespace-nowrap"
          >
            Accept cookies
          </button>
        </div>
      </div>
    </aside>
  );
};
