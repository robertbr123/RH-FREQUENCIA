import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import axios from 'axios';
import { 
  ArrowLeft, User, Camera, Phone, MapPin, AlertTriangle,
  Save, Loader2, X, Check, Mail, Building, Briefcase,
  Calendar, Shield, Edit3, Trash2
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

interface EmployeeData {
  id: number;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  photo_url: string | null;
  birth_date: string;
  hire_date: string;
  address: string;
  city: string;
  state: string;
  emergency_contact: string;
  emergency_phone: string;
  department_name: string;
  position_name: string;
  sector_name: string;
  unit_name: string;
}

export default function PortalProfile() {
  const { employee: authEmployee } = usePortalAuth();
  const navigate = useNavigate();
  
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Campos editáveis
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/portal/me');
      setEmployee(response.data);
      
      // Preencher campos editáveis
      setPhone(response.data.phone || '');
      setEmergencyContact(response.data.emergency_contact || '');
      setEmergencyPhone(response.data.emergency_phone || '');
      setAddress(response.data.address || '');
      setCity(response.data.city || '');
      setState(response.data.state || '');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put('/api/portal/me', {
        phone,
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
        address,
        city,
        state
      });
      
      setMessage({ type: 'success', text: 'Dados salvos com sucesso!' });
      setEditMode(false);
      loadEmployeeData();
      
      // Vibrar sucesso
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Selecione uma imagem válida' });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Imagem muito grande. Máximo 5MB.' });
      return;
    }

    try {
      setPhotoUploading(true);
      
      // Comprimir e converter para base64
      const compressedBase64 = await compressImage(file);
      
      // Upload
      const response = await axios.post('/api/portal/me/photo', {
        photo: compressedBase64
      });
      
      setEmployee(prev => prev ? { ...prev, photo_url: response.data.photo_url } : null);
      setMessage({ type: 'success', text: 'Foto atualizada!' });
      
      // Vibrar sucesso
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao enviar foto' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Redimensionar para max 800px mantendo proporção
          const maxSize = 800;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converter para JPEG com 80% de qualidade
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Remover sua foto?')) return;
    
    try {
      setPhotoUploading(true);
      await axios.delete('/api/portal/me/photo');
      setEmployee(prev => prev ? { ...prev, photo_url: null } : null);
      setMessage({ type: 'success', text: 'Foto removida' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover foto' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-safe">
      <Snowfall count={15} />
      
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 safe-top">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/portal')} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold">Meus Dados</h1>
          {!editMode ? (
            <button 
              onClick={() => setEditMode(true)}
              className="text-blue-400 flex items-center gap-1"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => setEditMode(false)}
              className="text-white/70"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Foto e Nome */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-4">
          <div className="flex flex-col items-center">
            {/* Avatar com opção de edição */}
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-white/10 border-4 border-white/20">
                {employee?.photo_url ? (
                  <img 
                    src={employee.photo_url} 
                    alt={employee.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-14 h-14 text-white/50" />
                  </div>
                )}
                
                {photoUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Botões de foto */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={photoUploading}
                  className="p-2 bg-blue-500 rounded-full text-white shadow-lg hover:bg-blue-600 transition-all active:scale-95"
                  title="Tirar foto"
                >
                  <Camera className="w-4 h-4" />
                </button>
                {employee?.photo_url && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={photoUploading}
                    className="p-2 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-all active:scale-95"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Input escondido para câmera */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              
              {/* Input escondido para galeria */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Opção de galeria */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              className="text-blue-400 text-sm mb-4 hover:text-blue-300"
            >
              Escolher da galeria
            </button>

            <h2 className="text-xl font-bold text-white text-center">{employee?.name}</h2>
            <p className="text-white/50 text-sm">{employee?.position_name}</p>
            <p className="text-white/30 text-xs">{employee?.department_name}</p>
          </div>
        </div>

        {/* Informações Pessoais (não editáveis) */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 mb-4">
          <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Informações Pessoais
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <User className="w-5 h-5 text-white/50" />
              </div>
              <div>
                <p className="text-white/50 text-xs">CPF</p>
                <p className="text-white font-mono">{formatCpf(employee?.cpf || '')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white/50" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Email</p>
                <p className="text-white text-sm">{employee?.email || '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white/50" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Data de Nascimento</p>
                <p className="text-white">{formatDate(employee?.birth_date || null)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white/50" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Data de Admissão</p>
                <p className="text-white">{formatDate(employee?.hire_date || null)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Editáveis */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 mb-4">
          <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contato
          </h3>
          
          <div className="space-y-4">
            {/* Telefone */}
            <div>
              <label className="text-white/50 text-xs block mb-1">Telefone</label>
              {editMode ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-400/50 outline-none"
                  placeholder="(00) 00000-0000"
                />
              ) : (
                <p className="text-white py-2">{phone || '-'}</p>
              )}
            </div>
            
            {/* Contato de Emergência */}
            <div>
              <label className="text-white/50 text-xs block mb-1">Contato de Emergência</label>
              {editMode ? (
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-400/50 outline-none"
                  placeholder="Nome do contato"
                />
              ) : (
                <p className="text-white py-2">{emergencyContact || '-'}</p>
              )}
            </div>
            
            {/* Telefone de Emergência */}
            <div>
              <label className="text-white/50 text-xs block mb-1">Telefone de Emergência</label>
              {editMode ? (
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-400/50 outline-none"
                  placeholder="(00) 00000-0000"
                />
              ) : (
                <p className="text-white py-2">{emergencyPhone || '-'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 mb-4">
          <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Endereço
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-xs block mb-1">Endereço</label>
              {editMode ? (
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-400/50 outline-none"
                  placeholder="Rua, número, complemento"
                />
              ) : (
                <p className="text-white py-2">{address || '-'}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs block mb-1">Cidade</label>
                {editMode ? (
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-400/50 outline-none"
                    placeholder="Cidade"
                  />
                ) : (
                  <p className="text-white py-2">{city || '-'}</p>
                )}
              </div>
              
              <div>
                <label className="text-white/50 text-xs block mb-1">Estado</label>
                {editMode ? (
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-400/50 outline-none"
                    placeholder="UF"
                  />
                ) : (
                  <p className="text-white py-2">{state || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Local de Trabalho */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 mb-6">
          <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Local de Trabalho
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Departamento</span>
              <span className="text-white">{employee?.department_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Setor</span>
              <span className="text-white">{employee?.sector_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Unidade</span>
              <span className="text-white">{employee?.unit_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Cargo</span>
              <span className="text-white">{employee?.position_name || '-'}</span>
            </div>
          </div>
        </div>

        {/* Botão Salvar (quando em modo edição) */}
        {editMode && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        )}

        {/* Alterar Senha */}
        <button
          onClick={() => navigate('/portal/trocar-senha')}
          className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Shield className="w-5 h-5" />
          Alterar Senha
        </button>
      </main>

      {/* CSS para safe areas (notch, barra de navegação) */}
      <style>{`
        .safe-top {
          padding-top: env(safe-area-inset-top);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
