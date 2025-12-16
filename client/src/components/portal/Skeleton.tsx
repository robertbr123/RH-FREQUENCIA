/**
 * Componentes de Skeleton Loading para o Portal
 * Placeholders animados enquanto o conteúdo carrega
 */

interface SkeletonProps {
  className?: string;
}

// Skeleton básico (retângulo)
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-white/10 rounded ${className}`}
    />
  );
}

// Skeleton circular (para avatares)
export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-white/10 rounded-full ${className}`}
    />
  );
}

// Skeleton de texto (linha)
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className="animate-pulse bg-white/10 rounded h-4"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

// Skeleton de card de ponto
export function SkeletonPunchCard() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-24" />
          <div className="h-3 bg-white/10 rounded w-16" />
        </div>
        <div className="w-16 h-8 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}

// Skeleton de item de lista de frequência
export function SkeletonAttendanceRow() {
  return (
    <div className="grid grid-cols-6 gap-2 p-3 animate-pulse">
      <div className="h-4 bg-white/10 rounded" />
      <div className="h-4 bg-white/10 rounded mx-auto w-12" />
      <div className="h-4 bg-white/10 rounded mx-auto w-12" />
      <div className="h-4 bg-white/10 rounded mx-auto w-12" />
      <div className="h-4 bg-white/10 rounded mx-auto w-12" />
      <div className="h-4 bg-white/10 rounded ml-auto w-10" />
    </div>
  );
}

// Skeleton de lista de frequência completa
export function SkeletonAttendanceList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-white/5">
      {/* Cabeçalho */}
      <div className="grid grid-cols-6 gap-2 p-3 bg-white/5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 bg-white/10 rounded animate-pulse" />
        ))}
      </div>
      {/* Linhas */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonAttendanceRow key={i} />
      ))}
    </div>
  );
}

// Skeleton de notificação
export function SkeletonNotification() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// Skeleton de lista de notificações
export function SkeletonNotificationList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonNotification key={i} />
      ))}
    </div>
  );
}

// Skeleton de card do dashboard
export function SkeletonDashboardCard() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-white/10 rounded w-24" />
          <div className="h-3 bg-white/10 rounded w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-white/10 rounded" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    </div>
  );
}

// Skeleton do banco de horas
export function SkeletonHourBank() {
  return (
    <div className="space-y-6">
      {/* Card principal */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/10 mb-4" />
          <div className="h-4 bg-white/10 rounded w-24 mb-2" />
          <div className="h-8 bg-white/10 rounded w-32" />
        </div>
      </div>
      {/* Cards secundários */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-20 mb-2" />
            <div className="h-6 bg-white/10 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton de perfil
export function SkeletonProfile() {
  return (
    <div className="space-y-4">
      {/* Avatar e nome */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="w-28 h-28 rounded-full bg-white/10 mb-4" />
          <div className="h-5 bg-white/10 rounded w-40 mb-2" />
          <div className="h-4 bg-white/10 rounded w-24" />
        </div>
      </div>
      {/* Campos */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 animate-pulse">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-white/10 rounded w-16" />
                <div className="h-4 bg-white/10 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
