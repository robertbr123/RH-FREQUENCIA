import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
import { PermissionsProvider } from './context/PermissionsContext'
import { PortalAuthProvider, usePortalAuth } from './context/PortalAuthContext'
import Layout from './components/Layout'
import Loading from './components/Loading'
import ErrorBoundary from './components/ErrorBoundary'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Organization = lazy(() => import('./pages/Organization'))
const Users = lazy(() => import('./pages/Users'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Reports = lazy(() => import('./pages/Reports'))
const Scanner = lazy(() => import('./pages/Scanner'))
const EmployeeCheck = lazy(() => import('./pages/EmployeeCheck'))
const AttendanceAdmin = lazy(() => import('./pages/AttendanceAdmin'))
const Backup = lazy(() => import('./pages/Backup'))
const HourBank = lazy(() => import('./pages/HourBank'))
const GeolocSettings = lazy(() => import('./pages/GeolocSettings'))
const AdminNotifications = lazy(() => import('./pages/AdminNotifications'))

// Portal do Funcionário
const PortalLogin = lazy(() => import('./pages/portal/PortalLogin'))
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard'))
const PortalPunch = lazy(() => import('./pages/portal/PortalPunch'))
const PortalChangePassword = lazy(() => import('./pages/portal/PortalChangePassword'))
const PortalAttendance = lazy(() => import('./pages/portal/PortalAttendance'))
const PortalProfile = lazy(() => import('./pages/portal/PortalProfile'))
const PortalHourBank = lazy(() => import('./pages/portal/PortalHourBank'))
const PortalVacations = lazy(() => import('./pages/portal/PortalVacations'))
const PortalRequests = lazy(() => import('./pages/portal/PortalRequests'))
const PortalNotifications = lazy(() => import('./pages/portal/PortalNotifications'))
const PortalInbox = lazy(() => import('./pages/portal/PortalInbox'))
import PortalLayout from './components/portal/PortalLayout'

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/admin/scanner" />
  }
  
  return <>{children}</>
}

// Rota privada do Portal do Funcionário
function PortalPrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, mustChangePassword } = usePortalAuth()
  
  if (isLoading) {
    return <Loading fullScreen text="Carregando..." />
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/portal/login" />
  }
  
  // Se precisa trocar a senha, redireciona
  if (mustChangePassword && window.location.pathname !== '/portal/trocar-senha') {
    return <Navigate to="/portal/trocar-senha" />
  }
  
  return <>{children}</>
}

// Componente wrapper para o Portal
function PortalRoutes() {
  return (
    <PortalAuthProvider>
      <Routes>
        <Route path="login" element={<PortalLogin />} />
        <Route path="trocar-senha" element={
          <PortalPrivateRoute>
            <PortalChangePassword />
          </PortalPrivateRoute>
        } />
        {/* Rotas com Layout Mobile */}
        <Route element={
          <PortalPrivateRoute>
            <PortalLayout />
          </PortalPrivateRoute>
        }>
          <Route path="" element={<PortalDashboard />} />
          <Route path="ponto" element={<PortalPunch />} />
          <Route path="frequencia" element={<PortalAttendance />} />
          <Route path="perfil" element={<PortalProfile />} />
          <Route path="banco-horas" element={<PortalHourBank />} />
          <Route path="ferias" element={<PortalVacations />} />
          <Route path="solicitacoes" element={<PortalRequests />} />
          <Route path="notificacoes" element={<PortalNotifications />} />
          <Route path="inbox" element={<PortalInbox />} />
        </Route>
        {/* Redirecionar rotas não encontradas do portal */}
        <Route path="*" element={<Navigate to="/portal" />} />
      </Routes>
    </PortalAuthProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <PermissionsProvider>
            <Router>
              <ErrorBoundary>
                <Suspense fallback={<Loading fullScreen text="Carregando..." />}> 
                <Routes>
                  {/* Rota raiz - redireciona para Portal do Funcionário */}
                  <Route path="/" element={<Navigate to="/portal/login" />} />
                  
                  {/* Portal do Funcionário (PWA principal) */}
                  <Route path="/portal/*" element={<PortalRoutes />} />
                  
                  {/* Consulta pública de funcionário */}
                  <Route path="/employee-check" element={<EmployeeCheck />} />

                  {/* ============================================ */}
                  {/* ÁREA ADMINISTRATIVA - /admin/*               */}
                  {/* ============================================ */}
                  
                  {/* Login do Admin */}
                  <Route path="/admin/login" element={<Login />} />
                  
                  {/* Rotas administrativas privadas */}
                  <Route
                    path="/admin"
                    element={
                      <PrivateRoute>
                        <Layout />
                      </PrivateRoute>
                    }
                  >
                    <Route index element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <Dashboard />
                      </PrivateRoute>
                    } />
                    <Route path="employees" element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <Employees />
                      </PrivateRoute>
                    } />
                    <Route path="attendance" element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <Attendance />
                      </PrivateRoute>
                    } />
                    <Route path="organization" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Organization />
                      </PrivateRoute>
                    } />
                    <Route path="users" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Users />
                      </PrivateRoute>
                    } />
                    <Route path="profile" element={
                      <Profile />
                    } />
                    <Route path="settings" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Settings />
                      </PrivateRoute>
                    } />
                    <Route path="reports" element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <Reports />
                      </PrivateRoute>
                    } />
                    <Route path="attendance-admin" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <AttendanceAdmin />
                      </PrivateRoute>
                    } />
                    <Route path="backup" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Backup />
                      </PrivateRoute>
                    } />
                    <Route path="hour-bank" element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <HourBank />
                      </PrivateRoute>
                    } />
                    <Route path="geolocation" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <GeolocSettings />
                      </PrivateRoute>
                    } />
                    <Route path="notifications" element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <AdminNotifications />
                      </PrivateRoute>
                    } />
                    <Route path="scanner" element={
                      <Scanner />
                    } />
                  </Route>
                  
                  {/* Rotas antigas - redirecionar para /admin/* */}
                  <Route path="/login" element={<Navigate to="/admin/login" />} />
                  <Route path="/dashboard" element={<Navigate to="/admin" />} />
                  <Route path="/employees" element={<Navigate to="/admin/employees" />} />
                  <Route path="/attendance" element={<Navigate to="/admin/attendance" />} />
                  <Route path="/organization" element={<Navigate to="/admin/organization" />} />
                  <Route path="/users" element={<Navigate to="/admin/users" />} />
                  <Route path="/profile" element={<Navigate to="/admin/profile" />} />
                  <Route path="/settings" element={<Navigate to="/admin/settings" />} />
                  <Route path="/reports" element={<Navigate to="/admin/reports" />} />
                  <Route path="/scanner" element={<Navigate to="/admin/scanner" />} />
                  <Route path="/attendance-admin" element={<Navigate to="/admin/attendance-admin" />} />
                  <Route path="/backup" element={<Navigate to="/admin/backup" />} />
                  <Route path="/hour-bank" element={<Navigate to="/admin/hour-bank" />} />
                  <Route path="/geolocation" element={<Navigate to="/admin/geolocation" />} />
                  
                  {/* Qualquer outra rota vai para o portal */}
                  <Route path="*" element={<Navigate to="/portal/login" />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
          </PermissionsProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
