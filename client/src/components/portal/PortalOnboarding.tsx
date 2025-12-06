import { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  Bell, 
  Wallet, 
  ChevronRight, 
  ChevronLeft,
  Fingerprint,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Clock className="w-16 h-16" />,
    title: 'Registrar Ponto',
    description: 'Registre sua entrada e saída de forma rápida e prática, com verificação facial para maior segurança.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <Calendar className="w-16 h-16" />,
    title: 'Histórico de Frequência',
    description: 'Acompanhe seu histórico de pontos, veja suas horas trabalhadas e mantenha o controle da sua jornada.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: <Wallet className="w-16 h-16" />,
    title: 'Banco de Horas',
    description: 'Visualize seu saldo de horas extras ou devidas, com histórico detalhado mês a mês.',
    color: 'from-purple-500 to-violet-500'
  },
  {
    icon: <Bell className="w-16 h-16" />,
    title: 'Notificações',
    description: 'Receba avisos importantes do RH, comunicados e lembretes diretamente no seu portal.',
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: <User className="w-16 h-16" />,
    title: 'Seus Dados',
    description: 'Acesse e atualize suas informações pessoais, foto de perfil e dados de contato.',
    color: 'from-pink-500 to-rose-500'
  }
];

interface PortalOnboardingProps {
  onComplete: () => void;
  employeeName: string;
}

export default function PortalOnboarding({ onComplete, employeeName }: PortalOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const firstName = employeeName.split(' ')[0];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl animate-pulse delay-500" />

      <div className="relative max-w-lg w-full mx-4">
        {/* Welcome Header (first step only) */}
        {currentStep === 0 && (
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full text-white/80 text-sm mb-4">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Bem-vindo ao Portal
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-white/70">
              Conheça as funcionalidades do seu portal
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Progress Indicator */}
          <div className="flex gap-1.5 p-4 justify-center">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 bg-white' 
                    : index < currentStep 
                      ? 'w-4 bg-white/60' 
                      : 'w-4 bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-8 pt-4">
            {/* Icon */}
            <div className={`mx-auto w-32 h-32 rounded-3xl bg-gradient-to-br ${steps[currentStep].color} flex items-center justify-center mb-6 shadow-2xl transform transition-all duration-500`}>
              <div className="text-white">
                {steps[currentStep].icon}
              </div>
            </div>

            {/* Text */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-3">
                {steps[currentStep].title}
              </h2>
              <p className="text-white/70 leading-relaxed">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Anterior
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2.5 text-white/50 hover:text-white/80 transition-colors text-sm"
                >
                  Pular
                </button>
              )}

              <button
                onClick={handleNext}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  currentStep === steps.length - 1
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Começar
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-xl rounded-full text-white/60 text-xs">
            <Fingerprint className="w-3 h-3 inline mr-1" />
            Reconhecimento Facial
          </span>
          <span className="px-3 py-1 bg-white/10 backdrop-blur-xl rounded-full text-white/60 text-xs">
            📱 Funciona Offline
          </span>
          <span className="px-3 py-1 bg-white/10 backdrop-blur-xl rounded-full text-white/60 text-xs">
            🔒 100% Seguro
          </span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
