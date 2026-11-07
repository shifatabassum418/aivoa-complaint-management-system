import { useSelector } from 'react-redux'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { getAppTheme } from './theme/theme'

import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ComplaintFormPage from './pages/ComplaintFormPage'
import ComplaintListPage from './pages/ComplaintListPage'
import TimelinePage from './pages/TimelinePage'
import AuditLogPage from './pages/AuditLogPage'
import SettingsPage from './pages/SettingsPage'

function RequireAuth({ children }) {
  const token = useSelector((state) => state.auth.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const darkMode = useSelector((state) => state.ui.darkMode)
  const theme = getAppTheme(darkMode)

  document.body.classList.toggle('dark-mode', darkMode)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="complaints" element={<ComplaintListPage />} />
          <Route path="complaints/new" element={<ComplaintFormPage />} />
          <Route path="complaints/:id" element={<ComplaintFormPage />} />
          <Route path="complaints/:id/timeline" element={<TimelinePage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}
