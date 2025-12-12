import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import { useGeolocation, validateLocationAgainstAllowed, fetchAllowedLocations, useServerTime } from '../../hooks';
import axios from 'axios';
import { 
  Camera, ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  Loader2, User, MapPin, MapPinOff, Shield, CloudOff, Building2, Clock
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

// Lazy load do componente de reconhecimento facial
const FaceRecognition = lazy(() => import('../../components/FaceRecognition'));

interface AllowedLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface EmployeeDepartment {
  id: number;
  department_id: number;
  schedule_id: number | null;
  is_primary: boolean;
  department_name: string;
  schedule_name: string | null;
  start_time?: string;
  end_time?: string;
}

interface PunchResult {
  success: boolean;
  message: string;
  type?: string;
  punch_type?: string;
  punch_time?: string;
  next_punch?: string;
  employee?: {
    name: string;
    photo_url?: string;
  };
  today_summary?: {
    entry?: string;
    break_start?: string;
    break_end?: string;
    exit?: string;
  };
  face_match?: {
    verified: boolean;
    confidence: string;
  };
}

const PUNCH_LABELS: Record<string, string> = {
  entry: 'Entrada',
  break_start: 'Início do Intervalo',
  break_end: 'Fim do Intervalo',
  exit: 'Saída'
};

const PUNCH_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  entry: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  break_start: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  break_end: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  exit: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' }
};

export default function PortalPunch() {
  const { employee } = usePortalAuth();
  const navigate = useNavigate();
  const { formattedTime, formattedDate } = useServerTime(); // Horário sincronizado com servidor
  
  const [hasFace, setHasFace] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<PunchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextPunch, setNextPunch] = useState<string>('entry');
  
  // Estados de geolocalização
  const [requireGeolocation, setRequireGeolocation] = useState(false);
  const [allowedLocations, setAllowedLocations] = useState<AllowedLocation[]>([]);
  const [geoStatus, setGeoStatus] = useState<'loading' | 'valid' | 'invalid' | 'disabled'>('loading');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  
  // Estado para erro de face não reconhecida
  const [faceMismatch, setFaceMismatch] = useState(false);
  
  // Estados para múltiplos departamentos
  const [departments, setDepartments] = useState<EmployeeDepartment[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  
  const { location, getLocation } = useGeolocation();
  
  const isProcessingRef = useRef(false);
  const lastDetectionRef = useRef(0);

  // Verificar se tem face cadastrada e qual próximo ponto
  useEffect(() => {
    const checkFaceAndPunch = async () => {
      try {
        const [faceRes, todayRes] = await Promise.all([
          axios.get('/api/portal/face-status'),
          axios.get('/api/portal/attendance/today')
        ]);
        
        setHasFace(faceRes.data.has_face);
        setNextPunch(todayRes.data.nextPunch);
      } catch (err) {
        console.error('Erro ao verificar status:', err);
        setHasFace(false);
      }
    };
    
    checkFaceAndPunch();
  }, []);

  // Carregar departamentos do funcionário
  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const response = await axios.get('/api/portal/my-departments');
        const depts = response.data;
        setDepartments(depts);
        
        // Se tem mais de um departamento, não selecionar automaticamente
        // Se tem apenas um, selecionar automaticamente
        if (depts.length === 1) {
          setSelectedDepartment(depts[0].department_id);
        } else if (depts.length > 1) {
          // Selecionar o departamento principal por padrão
          const primary = depts.find((d: EmployeeDepartment) => d.is_primary);
          if (primary) {
            setSelectedDepartment(primary.department_id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar departamentos:', err);
      } finally {
        setLoadingDepartments(false);
      }
    };
    
    loadDepartments();
  }, []);

  // Carregar configurações de geolocalização
  useEffect(() => {
    const loadGeoSettings = async () => {
      setLoadingGeo(true);
      setGeoStatus('loading');
      
      try {
        // Buscar configurações do sistema (usando rota pública ou sem autenticação)
        const settingsResponse = await axios.get('/api/settings/public');
        
        const requireGeo = settingsResponse.data?.require_geolocation === true;
        setRequireGeolocation(requireGeo);
        
        // Se geolocalização NÃO é exigida, desabilitar validação
        if (!requireGeo) {
          setGeoStatus('disabled');
          setGeoError(null);
          setLoadingGeo(false);
          return;
        }
        
        // Carregar localizações permitidas
        const locations = await fetchAllowedLocations();
        setAllowedLocations(locations);
        
        // Se não há localizações cadastradas, considerar como desabilitado
        if (locations.length === 0) {
          setGeoStatus('disabled');
          setGeoError(null);
          setLoadingGeo(false);
          return;
        }
        
        // Obter localização atual automaticamente
        const currentLocation = await getLocation();
        
        if (!currentLocation) {
          setGeoStatus('invalid');
          setGeoError('Não foi possível obter sua localização. Verifique as permissões do navegador.');
          setLoadingGeo(false);
          return;
        }
        
        // Validar contra localizações permitidas
        const validation = validateLocationAgainstAllowed(
          currentLocation.latitude,
          currentLocation.longitude,
          locations
        );
        
        if (validation.isValid && validation.nearestLocation) {
          setGeoStatus('valid');
          setCurrentLocationName(validation.nearestLocation.name);
          setGeoError(null);
        } else {
          setGeoStatus('invalid');
          const nearestName = validation.nearestLocation?.name || 'local permitido';
          const distance = validation.distance ? `${validation.distance}m` : 'desconhecida';
          setGeoError(`Você está fora da área permitida. Distância até "${nearestName}": ${distance}`);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de geolocalização:', err);
        // Se erro ao buscar settings, assumir que não é obrigatório
        setGeoStatus('disabled');
        setGeoError(null);
      } finally {
        setLoadingGeo(false);
      }
    };
    
    loadGeoSettings();
  }, []); // Removido getLocation para evitar loop infinito

  // Callback quando face é detectada
  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    // Debounce
    const now = Date.now();
    if (now - lastDetectionRef.current < 3000) return;
    if (isProcessingRef.current) return;
    
    lastDetectionRef.current = now;
    isProcessingRef.current = true;
    setVerifying(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/portal/punch/facial', {
        face_descriptor: Array.from(descriptor),
        latitude: location?.latitude,
        longitude: location?.longitude,
        department_id: selectedDepartment // Enviar departamento selecionado
      });
      
      // Verificar se foi salvo offline (status 202)
      if (response.status === 202 || response.data?.offline) {
        setResult({
          success: true,
          message: response.data.message || 'Ponto salvo offline. Será sincronizado quando a conexão voltar.',
          punch_type: nextPunch,
          punch_time: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Rio_Branco'
          }),
          type: 'offline'
        });
        setScanning(false);
        
        // Vibrar em sucesso (mobile) - padrão diferente para offline
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 100, 100, 100, 100]);
        }
        return;
      }
      
      setResult(response.data);
      setScanning(false);
      
      // Vibrar em sucesso (mobile)
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao registrar ponto';
      const errorType = err.response?.data?.type;
      const isOffline = err.response?.data?.offline || !navigator.onLine;
      
      // Se for erro de face não reconhecida (outra pessoa)
      if (errorType === 'face_mismatch' || err.response?.status === 401) {
        setFaceMismatch(true);
        setScanning(false);
        setError(errorMsg);
      } else if (isOffline) {
        // Modo offline - mostrar como sucesso pendente
        setResult({
          success: true,
          message: 'Ponto salvo offline. Será sincronizado automaticamente quando a conexão voltar.',
          punch_type: nextPunch,
          punch_time: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Rio_Branco'
          }),
          type: 'offline'
        });
        setScanning(false);
        
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 100, 100, 100, 100]);
        }
      } else {
        setError(errorMsg);
        setScanning(false);
      }
      
      // Vibrar erro (mobile)
      if (!isOffline && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } finally {
      setVerifying(false);
      isProcessingRef.current = false;
    }
  }, [location, selectedDepartment]);

  const startScanning = () => {
    setScanning(true);
    setResult(null);
    setError(null);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  // Face não cadastrada
  if (hasFace === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Snowfall count={20} />
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Rosto Não Cadastrado</h2>
          <p className="text-white/60 mb-6">
            Para registrar ponto pelo portal, você precisa ter seu rosto cadastrado no sistema.
            Entre em contato com o RH para realizar o cadastro.
          </p>
          <button
            onClick={() => navigate('/portal')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Portal
          </button>
        </div>
      </div>
    );
  }

  // Todos os pontos já foram registrados
  if (nextPunch === 'completed' && !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Snowfall count={20} />
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ponto Completo!</h2>
          <p className="text-white/60 mb-6">
            Todos os registros de ponto de hoje já foram realizados.
          </p>
          <button
            onClick={() => navigate('/portal')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Portal
          </button>
        </div>
      </div>
    );
  }

  // Fora da área permitida (geolocalização obrigatória)
  if (geoStatus === 'invalid' && !loadingGeo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Snowfall count={20} />
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <MapPinOff className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Fora da Área Permitida</h2>
          <p className="text-white/60 mb-4">
            {geoError || 'Você precisa estar em um local autorizado para registrar o ponto.'}
          </p>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-400 text-sm flex items-start gap-2">
              <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                A verificação de localização está ativada pelo RH. 
                Vá até um local autorizado para registrar seu ponto.
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate('/portal')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Portal
          </button>
        </div>
      </div>
    );
  }

  // Rosto não reconhecido (outra pessoa ou dados desatualizados)
  if (faceMismatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Snowfall count={20} />
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Rosto Não Reconhecido</h2>
          <p className="text-white/60 mb-4">
            O rosto detectado não corresponde ao seu cadastro no sistema.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-orange-400 text-sm flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Apenas você pode registrar seu próprio ponto. 
                Se seus dados faciais estiverem desatualizados (mudança de aparência, óculos, barba, etc.), 
                solicite ao RH para atualizar seu cadastro facial.
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            <button
              onClick={() => {
                setFaceMismatch(false);
                setError(null);
                startScanning();
              }}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Snowfall count={15} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/portal')} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <h1 className="text-white font-semibold">Registrar Ponto</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        {/* Relógio */}
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-white font-mono tracking-wider">
            {formattedTime}
          </p>
          <p className="text-white/50 mt-1 capitalize">
            {formattedDate}
          </p>
        </div>

        {/* Próximo Ponto */}
        {!result && nextPunch !== 'completed' && (
          <div className={`text-center mb-6 p-4 rounded-xl border ${PUNCH_COLORS[nextPunch]?.bg} ${PUNCH_COLORS[nextPunch]?.border}`}>
            <p className="text-white/70 text-sm">Próximo registro</p>
            <p className={`text-xl font-bold ${PUNCH_COLORS[nextPunch]?.text}`}>
              {PUNCH_LABELS[nextPunch]}
            </p>
          </div>
        )}

        {/* Área de Câmera / Resultado */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {result ? (
            // Resultado do ponto
            <div className="p-6 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                result.type === 'offline' ? 'bg-orange-500/20' :
                result.success ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {result.type === 'offline' ? (
                  <CloudOff className="w-10 h-10 text-orange-400" />
                ) : result.success ? (
                  <CheckCircle className="w-10 h-10 text-green-400" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-400" />
                )}
              </div>
              
              <h2 className={`text-xl font-bold mb-2 ${
                result.type === 'offline' ? 'text-orange-400' :
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.type === 'offline' ? 'Ponto Salvo Offline' : result.success ? 'Ponto Registrado!' : 'Erro'}
              </h2>
              
              <p className="text-white/70 mb-4">{result.message}</p>
              
              {result.success && result.punch_time && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-white/50 text-sm">Horário registrado</p>
                  <p className="text-2xl font-bold text-white">{result.punch_time}</p>
                  {result.type === 'offline' ? (
                    <p className="text-orange-400 text-sm mt-1 flex items-center justify-center gap-1">
                      ⏳ Aguardando sincronização
                    </p>
                  ) : result.face_match && (
                    <p className="text-green-400 text-sm mt-1">
                      ✓ Verificado ({result.face_match.confidence})
                    </p>
                  )}
                </div>
              )}
              
              {/* Aviso de modo offline */}
              {result.type === 'offline' && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4 text-left">
                  <p className="text-orange-400 text-sm flex items-start gap-2">
                    <span className="text-lg">📶</span>
                    <span>
                      Seu ponto foi salvo localmente e será enviado automaticamente 
                      quando sua conexão com a internet for restabelecida.
                    </span>
                  </p>
                </div>
              )}
              
              {result.today_summary && (
                <div className="bg-white/5 rounded-xl p-4 mb-4 text-left">
                  <p className="text-white/50 text-sm mb-2">Resumo de hoje</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-white/70">Entrada:</div>
                    <div className="text-white font-mono">{result.today_summary.entry || '--:--'}</div>
                    <div className="text-white/70">Início Intervalo:</div>
                    <div className="text-white font-mono">{result.today_summary.break_start || '--:--'}</div>
                    <div className="text-white/70">Fim Intervalo:</div>
                    <div className="text-white font-mono">{result.today_summary.break_end || '--:--'}</div>
                    <div className="text-white/70">Saída:</div>
                    <div className="text-white font-mono">{result.today_summary.exit || '--:--'}</div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/portal')}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  Voltar
                </button>
                {result.next_punch && !result.type && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setNextPunch(result.next_punch!);
                      startScanning();
                    }}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all"
                  >
                    Próximo Ponto
                  </button>
                )}
              </div>
            </div>
          ) : scanning ? (
            // Câmera ativa
            <div className="relative">
              <Suspense fallback={
                <div className="aspect-[4/3] bg-slate-800 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              }>
                <FaceRecognition
                  onFaceDetected={handleFaceDetected}
                  onError={(err: string) => setError(err)}
                  mode="verify"
                  employeeName={employee?.name}
                />
              </Suspense>
              
              {/* Overlay de verificação */}
              {verifying && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-3" />
                    <p className="text-white font-medium">Verificando...</p>
                  </div>
                </div>
              )}
              
              {/* Erro */}
              {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 backdrop-blur-xl rounded-xl p-3 text-white text-center">
                  {error}
                </div>
              )}
              
              {/* Botão cancelar */}
              <button
                onClick={stopScanning}
                className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white/30 transition-all"
              >
                <XCircle className="w-6 h-6 text-white" />
              </button>
            </div>
          ) : (
            // Tela inicial
            <div className="p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                {employee?.photo_url ? (
                  <img 
                    src={employee.photo_url} 
                    alt="" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-blue-400" />
                )}
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                Olá, {employee?.name?.split(' ')[0]}!
              </h2>
              <p className="text-white/60 mb-6">
                Posicione seu rosto na câmera para registrar o ponto
              </p>
              
              {/* Status de Geolocalização */}
              {loadingGeo ? (
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando localização...</span>
                </div>
              ) : geoStatus === 'valid' && currentLocationName ? (
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{currentLocationName}</span>
                </div>
              ) : geoStatus === 'disabled' ? (
                location && (
                  <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>Localização detectada</span>
                  </div>
                )
              ) : null}
              
              {/* Seletor de Departamento - só exibe se tiver mais de um */}
              {loadingDepartments ? (
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Carregando departamentos...</span>
                </div>
              ) : departments.length > 1 ? (
                <div className="mb-6">
                  <label className="block text-white/70 text-sm mb-2 text-left">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Selecione o departamento para registrar:
                  </label>
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDepartment(dept.department_id)}
                        className={`w-full p-3 rounded-xl border transition-all text-left ${
                          selectedDepartment === dept.department_id
                            ? 'bg-blue-500/30 border-blue-400 text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{dept.department_name}</span>
                            {dept.is_primary && (
                              <span className="ml-2 text-xs bg-blue-500/40 px-2 py-0.5 rounded-full">
                                Principal
                              </span>
                            )}
                          </div>
                          {selectedDepartment === dept.department_id && (
                            <CheckCircle className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        {dept.schedule_name && (
                          <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{dept.schedule_name}</span>
                            {dept.start_time && dept.end_time && (
                              <span>({dept.start_time} - {dept.end_time})</span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : departments.length === 1 ? (
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                  <Building2 className="w-4 h-4" />
                  <span>{departments[0].department_name}</span>
                </div>
              ) : null}
              
              <button
                onClick={startScanning}
                disabled={hasFace === null || loadingGeo || loadingDepartments || (departments.length > 1 && !selectedDepartment)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {hasFace === null || loadingGeo || loadingDepartments ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {loadingGeo ? 'Verificando localização...' : loadingDepartments ? 'Carregando departamentos...' : 'Carregando...'}
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    Iniciar Reconhecimento
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <h3 className="text-white/80 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Dicas para o reconhecimento
          </h3>
          <ul className="text-white/50 text-sm space-y-1">
            <li>• Fique em um ambiente bem iluminado</li>
            <li>• Centralize seu rosto no guia da câmera</li>
            <li>• Remova óculos escuros ou bonés</li>
            <li>• Mantenha uma expressão neutra</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
