import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
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

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/scanner" />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <ErrorBoundary>
              <Suspense fallback={<Loading fullScreen text="Carregando..." />}> 
                <Routes>
                  {/* Rotas públicas */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/employee-check" element={<EmployeeCheck />} />

                  {/* Rotas privadas */}
                  <Route
                    path="/"
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
                    <Route path="/organization" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Organization />
                      </PrivateRoute>
                    } />
                    <Route path="/users" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Users />
                      </PrivateRoute>
                    } />
                    <Route path="/profile" element={
                      <Profile />
                    } />
                    <Route path="/settings" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Settings />
                      </PrivateRoute>
                    } />
                    <Route path="/reports" element={
                      <PrivateRoute allowedRoles={['admin', 'gestor']}>
                        <Reports />
                      </PrivateRoute>
                    } />
                    <Route path="/attendance-admin" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <AttendanceAdmin />
                      </PrivateRoute>
                    } />
                    <Route path="/scanner" element={
                      <Scanner />
                    } />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
