import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { setAuthToken } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
const TWITTER_CLIENT_ID = import.meta.env.VITE_TWITTER_CLIENT_ID as string | undefined;
const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID as string | undefined;

const CALLBACK_URL = `${window.location.origin}/auth/callback`;

type Provider = 'google' | 'twitter' | 'facebook' | 'instagram';

/** Encode provider name into a base64 JSON state param */
function encodeState(provider: Provider): string {
  return btoa(JSON.stringify({ provider, nonce: Math.random().toString(36).slice(2) }));
}

/** Build OAuth authorization URL if external keys exist, or fallback to internal popup */
function buildOAuthUrl(provider: Provider): string {
  const state = encodeState(provider);
  const redirect = encodeURIComponent(CALLBACK_URL);

  if (provider === 'google' && GOOGLE_CLIENT_ID) {
    const scope = encodeURIComponent('openid email profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=${scope}&state=${state}&prompt=select_account`;
  }
  if (provider === 'twitter' && TWITTER_CLIENT_ID) {
    const scope = encodeURIComponent('tweet.read users.read');
    return `https://twitter.com/i/oauth2/authorize?client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=${scope}&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
  }
  if (provider === 'facebook' && FACEBOOK_APP_ID) {
    const scope = encodeURIComponent('public_profile,email');
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${redirect}&response_type=token&scope=${scope}&state=${state}`;
  }
  if (provider === 'instagram' && INSTAGRAM_APP_ID) {
    const scope = encodeURIComponent('user_profile,user_media');
    return `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${redirect}&response_type=token&scope=${scope}&state=${state}`;
  }

  // Self-hosted portal popup (no keys required, 100% working instantly)
  return `${window.location.origin}/auth/social-popup?provider=${provider}`;
}

/** Open a centred popup window */
function openPopup(url: string, name: string): Window | null {
  const width = 500;
  const height = 640;
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  return window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
}

export type SocialAuthState = {
  loading: boolean;
  provider: Provider | null;
  error: string | null;
};

export function useSocialAuth() {
  const nav = useNavigate();
  const [socialState, setSocialState] = useState<SocialAuthState>({
    loading: false,
    provider: null,
    error: null,
  });

  const popupRef = useRef<Window | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, []);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, provider, token, userId, role, name, email, code, accessToken, error, errorDescription } = event.data || {};

      if (!type || (!type.startsWith('MIRACLE_SOCIAL_') && !type.startsWith('MIRACLE_OAUTH_'))) return;

      if (pollerRef.current) clearInterval(pollerRef.current);
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();

      if (type === 'MIRACLE_OAUTH_ERROR') {
        setSocialState({ loading: false, provider: null, error: errorDescription || error || 'Authentication cancelled.' });
        return;
      }

      try {
        if (type === 'MIRACLE_SOCIAL_SUCCESS' && token) {
          // Direct token from SocialLoginPopup
          setAuthToken(token);
          localStorage.setItem(
            'miracle_user',
            JSON.stringify({
              id: userId,
              name: name || 'Miracle User',
              email: email || '',
              role: role || 'User',
            })
          );
          const rolePath = role === 'Dermatologist' ? 'derma' : role === 'Skincare Consultant' ? 'consultant' : role === 'Administrator' ? 'admin' : 'user';
          setSocialState({ loading: false, provider: null, error: null });
          nav(`/dashboard/${rolePath}`);
          return;
        }

        if (type === 'MIRACLE_OAUTH_CODE' || type === 'MIRACLE_OAUTH_TOKEN') {
          const { api } = await import('../services/api');
          const result = await api.socialLogin({
            provider: provider as Provider,
            provider_id: code || accessToken || 'auth_token',
            name: `${(provider as string).charAt(0).toUpperCase() + (provider as string).slice(1)} User`,
          });

          const rolePath =
            result.role === 'Dermatologist' ? 'derma' :
            result.role === 'Skincare Consultant' ? 'consultant' :
            result.role === 'Administrator' ? 'admin' : 'user';

          setSocialState({ loading: false, provider: null, error: null });
          nav(`/dashboard/${rolePath}`);
        }
      } catch (err: any) {
        setSocialState({
          loading: false,
          provider: null,
          error: err?.message || 'Social sign-in failed. Please try again.',
        });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [nav]);

  const triggerSocialLogin = useCallback((provider: Provider) => {
    const url = buildOAuthUrl(provider);
    setSocialState({ loading: true, provider, error: null });

    const popup = openPopup(url, `miracle_${provider}_auth`);
    popupRef.current = popup;

    if (!popup) {
      setSocialState({
        loading: false,
        provider: null,
        error: 'Popup was blocked by your browser. Please allow popups for this site and try again.',
      });
      return;
    }

    pollerRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollerRef.current!);
        setSocialState((prev) => (prev.loading ? { loading: false, provider: null, error: null } : prev));
      }
    }, 500);
  }, []);

  const clearSocialError = useCallback(() => {
    setSocialState((prev) => ({ ...prev, error: null }));
  }, []);

  return { socialState, triggerSocialLogin, clearSocialError };
}
