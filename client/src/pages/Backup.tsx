import { useState, useEffect } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { toast } from '../utils/toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface TableInfo {
  name: string;
  rows: number;
  error?: string;
}

interface DatabaseInfo {
  tables: TableInfo[];
  totalTables: number;
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
    try {
      setLoading(true);
      toast.loading('Gerando backup...', { id: 'backup' });

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

      toast.success(`Backup gerado com sucesso! ${data.tables} tabelas exportadas.`, { id: 'backup' });
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar backup', { id: 'backup' });
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

    try {
      setLoading(true);
      toast.loading('Restaurando backup...', { id: 'restore' });

      // Ler arquivo
      const sqlBackup = await restoreFile.text();

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

      toast.success('Backup restaurado com sucesso! Recarregando página...', { id: 'restore' });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao restaurar backup', { id: 'restore' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Backup do Banco de Dados
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Exporte e restaure seus dados com segurança
            </p>
          </div>
        </div>
      </div>

      {/* Informações do Banco */}
      {databaseInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Informações do Banco de Dados
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Total de Tabelas
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {databaseInfo.totalTables}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                Total de Registros
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {databaseInfo.totalRows.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Última Atualização
              </div>
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mt-2">
                {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Detalhes das Tabelas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {databaseInfo.tables.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {table.name}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {table.error ? '-' : table.rows.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exportar Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Download className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Exportar Backup
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">O backup irá incluir:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Todos os funcionários e usuários</li>
                    <li>Registros de ponto e ausências</li>
                    <li>Configurações do sistema</li>
                    <li>Estrutura organizacional completa</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleExportBackup}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">
                {loading ? 'Gerando Backup...' : 'Baixar Backup Completo'}
              </span>
            </button>
          </div>
        </div>

        {/* Restaurar Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Upload className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Restaurar Backup
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium mb-1">⚠️ Atenção:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Esta ação irá substituir TODOS os dados atuais</li>
                    <li>Faça um backup antes de restaurar</li>
                    <li>A operação não pode ser desfeita</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selecionar Arquivo de Backup (.sql)
              </label>
              <input
                type="file"
                accept=".sql"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-900 dark:text-white
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900/20 dark:file:text-blue-400
                  cursor-pointer"
              />
            </div>

            {restoreFile && (
              <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <CheckCircle className="w-4 h-4" />
                <span>Arquivo selecionado: {restoreFile.name}</span>
              </div>
            )}

            <button
              onClick={handleRestoreBackup}
              disabled={loading || !restoreFile}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">
                {loading ? 'Restaurando...' : 'Restaurar Backup'}
              </span>
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
