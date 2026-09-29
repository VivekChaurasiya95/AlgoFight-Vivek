import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import { NotificationInboxProvider } from './contexts/NotificationInboxContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { ActiveEventProvider } from './contexts/ActiveEventContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <NotificationInboxProvider>
            <SocketProvider>
              <ActiveEventProvider>
                <App />
              </ActiveEventProvider>
            </SocketProvider>
          </NotificationInboxProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  </StrictMode>,
)
