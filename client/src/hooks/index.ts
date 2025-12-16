// Hooks customizados do projeto
export { useAudioFeedback } from './useAudioFeedback'
export { useOnlineStatus } from './useOnlineStatus'
export { useFullscreen } from './useFullscreen'
export { useClock } from './useClock'
export { useCapsLock } from './useCapsLock'
export { useDashboardData } from './useDashboardData'
export { useChristmasSeason } from './useChristmasSeason'
export { useGeolocation, calculateDistance, isWithinAllowedArea, validateLocationAgainstAllowed, fetchAllowedLocations } from './useGeolocation'
export { usePushNotifications } from './usePushNotifications'
export { useServerTime } from './useServerTime'
export { useHapticFeedback } from './useHapticFeedback'
export type { 
  Stats, 
  RecentAttendance, 
  DepartmentStats, 
  Birthday, 
  Vacation, 
  MonthlyComparison,
  TopPerformer,
  LowAttendanceEmployee,
  WeeklyData
} from './useDashboardData'
export type { GeolocationData, UseGeolocationReturn, AllowedLocation } from './useGeolocation'

