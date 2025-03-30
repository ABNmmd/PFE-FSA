import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { DocumentProvider } from './context/DocumentContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DocumentProvider>
        <App />
      </DocumentProvider>
    </AuthProvider>
  </StrictMode>,
)
