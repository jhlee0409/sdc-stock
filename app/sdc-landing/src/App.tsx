import { QueryClientProvider } from 'lib-react-query';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from '@emotion/react';
import Home from './page/@';
import SupabaseProvider from './library/supabase/SupabaseProvider';
import OnboardingLoginPage from './page/@onboarding/OnboardingLoginPage';
import ProfileEditPage from './page/@onboarding/ProfileEditPage';
import OnboardingPage from './page/@onboarding/OnboardingPage';
import ProfileViewPage from './page/@onboarding/ProfileViewPage';
import ProfileListPage from './page/@onboarding/ProfileListPage';
import { theme } from './styles/theme';

const router = createBrowserRouter([
  {
    element: <Home />,
    path: '/',
  },
  {
    element: <OnboardingPage />,
    path: '/onboarding',
  },
  {
    element: <OnboardingLoginPage />,
    path: '/onboarding/login',
  },
  {
    element: <ProfileListPage />,
    path: '/onboarding/profile',
  },
  {
    element: <ProfileEditPage />,
    path: '/onboarding/profile/edit',
  },
  {
    element: <ProfileViewPage />,
    path: '/onboarding/profile/view',
  },
  {
    element: <ProfileViewPage />,
    path: '/onboarding/profile/view/:username',
  },
]);

function App() {
  return (
    <JotaiProvider>
      <ThemeProvider theme={theme}>
        <QueryClientProvider devtoolEnabled>
          <SupabaseProvider>
            <RouterProvider router={router} />
          </SupabaseProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </JotaiProvider>
  );
}

export default App;
