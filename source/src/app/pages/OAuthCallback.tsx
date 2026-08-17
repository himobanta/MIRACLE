import React, { useEffect } from 'react';

/**
 * OAuthCallback page — rendered inside the OAuth popup window after the provider redirects back.
 *
 * The provider redirects to:  /auth/callback?code=...&state=...
 *
 * This page:
 *  1. Parses the URL parameters.
 *  2. Posts a message to the opener window (the Miracle app).
 *  3. Closes itself.
 *
 * The opener's useSocialAuth hook receives the message and calls the backend /auth/social
 * to exchange the code for a Miracle JWT.
 */
export function OAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Parse state to recover which provider this is
    let provider = 'google';
    try {
      const decoded = JSON.parse(atob(state || ''));
      provider = decoded.provider || 'google';
    } catch {
      // state not base64-JSON — may be a plain string from some providers
      provider = state || 'google';
    }

    if (window.opener && !window.opener.closed) {
      if (error) {
        window.opener.postMessage(
          { type: 'MIRACLE_OAUTH_ERROR', provider, error, errorDescription },
          window.location.origin
        );
      } else if (code) {
        window.opener.postMessage(
          { type: 'MIRACLE_OAUTH_CODE', provider, code, state },
          window.location.origin
        );
      } else {
        // Some providers (Facebook, Instagram) send token in hash fragment
        const hash = new URLSearchParams(window.location.hash.replace('#', ''));
        const accessToken = hash.get('access_token');
        if (accessToken) {
          window.opener.postMessage(
            { type: 'MIRACLE_OAUTH_TOKEN', provider, accessToken },
            window.location.origin
          );
        } else {
          window.opener.postMessage(
            { type: 'MIRACLE_OAUTH_ERROR', provider, error: 'no_code', errorDescription: 'No authorization code returned.' },
            window.location.origin
          );
        }
      }
    }

    // Close the popup
    window.close();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        background: '#f6f1e6',
        color: '#16301f',
        gap: '16px',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#2f6b4c"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: '48px', height: '48px', animation: 'spin 1s linear infinite' }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(22,48,31,0.7)' }}>
        Completing sign-in…
      </p>
    </div>
  );
}
