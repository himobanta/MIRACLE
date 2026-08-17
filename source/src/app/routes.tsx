import { createBrowserRouter, Outlet } from 'react-router';
import { AppProvider } from './store/AppState';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { OAuthCallback } from './pages/OAuthCallback';
import { SocialLoginPopup } from './pages/SocialLoginPopup';

function Root() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}


export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      {
        index: true,
        Component: Landing,
      },
      {
        path: 'login',
        Component: Login,
      },
      {
        path: 'signup',
        Component: SignUp,
      },
      {
        path: 'dashboard',
        Component: Dashboard,
      },
      {
        path: 'dashboard/:roleParam',
        Component: Dashboard,
      },
      {
        // OAuth popup callback — rendered inside the popup window
        path: 'auth/callback',
        Component: OAuthCallback,
      },
      {
        // Social login provider portal popup
        path: 'auth/social-popup',
        Component: SocialLoginPopup,
      },
      {
        path: '*',
        Component: Landing,
      },
    ],
  },
]);