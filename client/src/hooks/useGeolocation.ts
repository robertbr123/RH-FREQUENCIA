import { useState, useCallback, useEffect } from 'react'

export interface GeolocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface UseGeolocationReturn {
  location: GeolocationData | null
  error: string | null
  isLoading: boolean
  isSupported: boolean
  getLocation: () => Promise<GeolocationData | null>
  watchLocation: () => void
  stopWatching: () => void
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000, // Aumentado para 15 segundos
  maximumAge: 60000 // Cache por 1 minuto
}

export function useGeolocation(options: GeolocationOptions = {}): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    })
    setError(null)
    setIsLoading(false)
  }, [])

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Erro ao obter localização'
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Permissão de localização negada. Habilite nas configurações do navegador.'
        break
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.'
        break
      case err.TIMEOUT:
        errorMessage = 'Tempo esgotado ao buscar localização.'
        break
    }
    
    setError(errorMessage)
    setIsLoading(false)
    console.warn('Geolocation error:', err.message)
  }, [])

  const getLocation = useCallback(async (): Promise<GeolocationData | null> => {
    if (!isSupported) {
      setError('Geolocalização não suportada neste navegador')
      return null
    }

    setIsLoading(true)
    setError(null)

    const mergedOptions = { ...defaultOptions, ...options }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }
          setLocation(data)
          setError(null)
          setIsLoading(false)
          resolve(data)
        },
        (err) => {
          handleError(err)
          resolve(null)
        },
        mergedOptions
      )
    })
  }, [isSupported, options, handleError])

  const watchLocation = useCallback(() => {
    if (!isSupported) {
      setError('Geolocalização não suportada neste navegador')
      return
    }

    if (watchId !== null) return // Já está observando

    const mergedOptions = { ...defaultOptions, ...options }

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      mergedOptions
    )
    setWatchId(id)
  }, [isSupported, options, handleSuccess, handleError, watchId])

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
  }, [watchId])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  return {
    location,
    error,
    isLoading,
    isSupported,
    getLocation,
    watchLocation,
    stopWatching
  }
}

// Função utilitária para calcular distância entre dois pontos (Haversine)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distância em metros
}

// Verificar se está dentro de uma área permitida
export function isWithinAllowedArea(
  currentLat: number,
  currentLon: number,
  allowedLat: number,
  allowedLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, allowedLat, allowedLon)
  return distance <= radiusMeters
}

// Interface para localizações do banco de dados
export interface AllowedLocation {
  id: number
  name: string
  latitude: number
  longitude: number
  radius_meters: number
}

// Verificar se a localização atual está dentro de qualquer área permitida
export function validateLocationAgainstAllowed(
  currentLat: number,
  currentLon: number,
  allowedLocations: AllowedLocation[]
): { isValid: boolean; nearestLocation: AllowedLocation | null; distance: number | null } {
  if (!allowedLocations || allowedLocations.length === 0) {
    // Se não há localizações cadastradas, considera válido (validação desativada)
    return { isValid: true, nearestLocation: null, distance: null }
  }

  let nearestLocation: AllowedLocation | null = null
  let shortestDistance = Infinity

  for (const loc of allowedLocations) {
    const distance = calculateDistance(
      currentLat,
      currentLon,
      parseFloat(String(loc.latitude)),
      parseFloat(String(loc.longitude))
    )

    if (distance < shortestDistance) {
      shortestDistance = distance
      nearestLocation = loc
    }

    // Se está dentro do raio desta localização, é válido
    if (distance <= parseFloat(String(loc.radius_meters))) {
      return {
        isValid: true,
        nearestLocation: loc,
        distance: Math.round(distance)
      }
    }
  }

  // Não está dentro de nenhuma área permitida
  return {
    isValid: false,
    nearestLocation,
    distance: nearestLocation ? Math.round(shortestDistance) : null
  }
}

// Função para buscar localizações permitidas da API
export async function fetchAllowedLocations(): Promise<AllowedLocation[]> {
  try {
    const response = await fetch('/api/locations/active')
    if (!response.ok) {
      throw new Error('Erro ao buscar localizações')
    }
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar localizações permitidas:', error)
    return []
  }
}
