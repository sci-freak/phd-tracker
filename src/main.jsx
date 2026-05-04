import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './styles/index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConfirmProvider } from './hooks/useConfirm'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
          <Toaster
            position="bottom-right"
            theme="dark"
            closeButton
            duration={4000}
            toastOptions={{
              classNames: {
                toast: 'app-toast',
                success: 'app-toast--success',
                error: 'app-toast--error',
                info: 'app-toast--info',
                warning: 'app-toast--warning',
                title: 'app-toast__title',
                description: 'app-toast__description'
              }
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
