import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { ChatPage } from './features/chat/ChatPage';
import { SpeechToTextPage } from './features/speech-to-text/SpeechToTextPage';
import { TranslationPage } from './features/translation/TranslationPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4338ca',
    },
    secondary: {
      main: '#7c3aed',
    },
    error: {
      main: '#dc2626',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'translate', element: <TranslationPage /> },
      { path: 'speech', element: <SpeechToTextPage /> },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
