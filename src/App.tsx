import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TooltipProvider, Toaster } from '@/components/ui'
import { HomePage, ProjectsPage, EditorPage, ProfilePage, LoginPage } from '@/pages'
import { isAuthed } from '@/services/authService'

const BASENAME = (import.meta.env.VITE_BASE_PATH ?? '/').replace(/\/+$/, '') || '/'

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation()
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter basename={BASENAME}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects"
            element={
              <RequireAuth>
                <ProjectsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/editor/:projectId"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
