import { useState, useEffect } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle, Info, RefreshCw, HardDrive, Table, Clock, Shield, FileText } from 'lucide-react';
import { toast } from '../utils/toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface TableInfo {
  name: string;
  rows: number;
  exists?: boolean;
  error?: string;
}

interface DatabaseInfo {
  tables: TableInfo[];
  totalTables: number;
  existingTables?: number;
  totalRows: number;
}

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      const response = await fetch('/api/backup/info', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDatabaseInfo(data);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do banco:', error);
    }
  };

  const handleExportBackup = async () => {
    let loadingToast: HTMLDivElement | null = null;
    try {
      setLoading(true);
      loadingToast = toast.loading('Gerando backup...');

      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar backup');
      }

      const data = await response.json();

      // Criar arquivo para download
      const blob = new Blob([data.backup], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_rhf_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (loadingToast) toast.dismiss(loadingToast);
      toast.success(`Backup gerado com sucesso! ${data.tables} tabelas exportadas.`);
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar backup');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        toast.error('Por favor, selecione um arquivo .sql');
        return;
      }
      setRestoreFile(file);
      toast.success('Arquivo selecionado: ' + file.name);
    }
  };

  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      toast.error('Selecione um arquivo de backup primeiro');
      return;
    }

    setConfirmRestore(true);
  };

  const executeRestore = async () => {
    setConfirmRestore(false);
    let loadingToast: HTMLDivElement | null = null;

    try {
      setLoading(true);
      loadingToast = toast.loading('Restaurando backup...');

      // Ler arquivo
      const sqlBackup = await restoreFile!.text();

      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sqlBackup })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao restaurar backup');
      }

      if (loadingToast) toast.dismiss(loadingToast);
      toast.success('Backup restaurado com sucesso! Recarregando página...');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Erro ao restaurar backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header com Gradiente */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Backup do Sistema
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Exporte e restaure seus dados com segurança
            </p>
          </div>
        </div>
        <button
          onClick={loadDatabaseInfo}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Cards de Estatísticas */}
      {databaseInfo && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total de Tabelas</p>
                <p className="text-2xl font-bold">{databaseInfo.totalTables}</p>
              </div>
              <Table className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Tabelas Ativas</p>
                <p className="text-2xl font-bold">{databaseInfo.existingTables || databaseInfo.tables.filter(t => t.exists !== false).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total de Registros</p>
                <p className="text-2xl font-bold">{databaseInfo.totalRows.toLocaleString()}</p>
              </div>
              <HardDrive className="w-8 h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Última Verificação</p>
                <p className="text-lg font-bold">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Status</p>
                <p className="text-lg font-bold">Operacional</p>
              </div>
              <Shield className="w-8 h-8 text-amber-200" />
            </div>
          </div>
        </div>
      )}

      {/* Detalhes das Tabelas */}
      {databaseInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalhes das Tabelas
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {databaseInfo.tables.map((table) => (
                <div
                  key={table.name}
                  className={`group flex items-center justify-between rounded-lg p-3 hover:shadow-md hover:scale-105 transition-all duration-200 ${
                    table.exists === false
                      ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 opacity-60'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600'
                  }`}
                  title={table.exists === false ? 'Tabela não criada no banco' : `${table.rows} registros`}
                >
                  <span className={`text-sm font-medium truncate ${
                    table.exists === false 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {table.name}
                  </span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    table.exists === false
                      ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      : table.error 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : table.rows === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {table.exists === false ? '—' : table.error ? '!' : table.rows.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Legenda */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span>Com dados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span>Vazia</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                <span>Não criada</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exportar Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-green-200 dark:border-green-800 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Exportar Backup
                </h2>
                <p className="text-green-100 text-sm">
                  Baixe uma cópia completa do sistema
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-2">O backup irá incluir:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Funcionários e usuários
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Registros de ponto
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Ausências e férias
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Estrutura organizacional
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Credenciais do portal
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Notificações e solicitações
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Configurações do sistema
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Permissões e feriados
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleExportBackup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Gerando Backup...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Baixar Backup Completo
                </>
              )}
            </button>
          </div>
        </div>

        {/* Restaurar Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-orange-200 dark:border-orange-800 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Restaurar Backup
                </h2>
                <p className="text-orange-100 text-sm">
                  Restaure um backup anterior
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <p className="font-semibold mb-2">⚠️ Atenção:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Esta ação irá substituir TODOS os dados atuais
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Faça um backup antes de restaurar
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      A operação não pode ser desfeita
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Selecionar Arquivo de Backup (.sql)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".sql"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 dark:text-white
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gradient-to-r file:from-blue-500 file:to-indigo-600 file:text-white
                    hover:file:from-blue-600 hover:file:to-indigo-700
                    file:cursor-pointer file:shadow-md file:transition-all
                    cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-2"
                />
              </div>
            </div>

            {restoreFile && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Arquivo selecionado:
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    {restoreFile.name}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleRestoreBackup}
              disabled={loading || !restoreFile}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Restaurar Backup
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ConfirmDialog para restaurar backup */}
      <ConfirmDialog
        isOpen={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={executeRestore}
        title="Restaurar Backup"
        message="⚠️ ATENÇÃO: Esta ação irá SUBSTITUIR TODOS os dados atuais do banco! Tem certeza que deseja continuar?"
        type="danger"
        isLoading={loading}
      />
    </div>
  );
}
