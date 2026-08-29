import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import EventFeedPage from './pages/EventFeedPage'
import EventDetailsPage from './pages/EventDetailsPage'
import MyEventsPage from './pages/MyEventsPage'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import EventFormPage from './pages/EventFormPage'
import EventRegistrantsPage from './pages/EventRegistrantsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function RequireClubLeader({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'clubLeader') return <Navigate to="/" replace />;
  return children;
}

function RequireStudent({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
          <Route path="/" element={<EventFeedPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/my-events" element={<RequireClubLeader><MyEventsPage /></RequireClubLeader>} />
          <Route path="/my-registrations" element={<RequireStudent><MyRegistrationsPage /></RequireStudent>} />
          <Route path="/events/new" element={<RequireClubLeader><EventFormPage /></RequireClubLeader>} />
          <Route path="/events/:id/edit" element={<RequireClubLeader><EventFormPage /></RequireClubLeader>} />
          <Route path="/events/:id/registrants" element={<ProtectedRoute><EventRegistrantsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
