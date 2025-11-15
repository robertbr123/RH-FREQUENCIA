// Mensagens de erro amigáveis e específicas

interface ErrorResponse {
  response?: {
    data?: {
      error?: string
      message?: string
    }
    status?: number
  }
  message?: string
  code?: string
}

export function getErrorMessage(error: any): string {
  // Erro de rede
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  // Timeout
  if (error.code === 'ECONNABORTED') {
    return 'A requisição demorou muito. Tente novamente.'
  }

  // Erro HTTP com mensagem do servidor
  if (error.response?.data?.error) {
    return error.response.data.error
  }

  if (error.response?.data?.message) {
    return error.response.data.message
  }

  // Erros por status HTTP
  const status = error.response?.status
  switch (status) {
    case 400:
      return 'Dados inválidos. Verifique as informações e tente novamente.'
    case 401:
      return 'Sessão expirada. Faça login novamente.'
    case 403:
      return 'Você não tem permissão para realizar esta ação.'
    case 404:
      return 'Recurso não encontrado. Pode ter sido removido.'
    case 409:
      return 'Conflito de dados. Este registro já existe.'
    case 422:
      return 'Dados inválidos. Verifique os campos obrigatórios.'
    case 429:
      return 'Muitas tentativas. Aguarde alguns minutos.'
    case 500:
      return 'Erro no servidor. Tente novamente em alguns instantes.'
    case 503:
      return 'Serviço temporariamente indisponível. Tente mais tarde.'
  }

  // Mensagem genérica do erro
  if (error.message) {
    return error.message
  }

  return 'Ocorreu um erro inesperado. Tente novamente.'
}

// Mensagens específicas por contexto
export const ErrorMessages = {
  auth: {
    invalidCredentials: 'Usuário ou senha incorretos.',
    sessionExpired: 'Sua sessão expirou. Faça login novamente.',
    unauthorized: 'Você não tem permissão para acessar esta área.'
  },
  
  employee: {
    notFound: 'Funcionário não encontrado.',
    duplicateCPF: 'Já existe um funcionário com este CPF.',
    invalidCPF: 'CPF inválido. Verifique os números digitados.',
    saveError: 'Erro ao salvar funcionário. Verifique os dados.',
    deleteError: 'Erro ao remover funcionário. Ele pode ter registros vinculados.'
  },

  attendance: {
    notFound: 'Registro de ponto não encontrado.',
    alreadyRegistered: 'Ponto já registrado para este horário.',
    invalidTime: 'Horário inválido. Verifique a tolerância permitida.',
    saveError: 'Erro ao registrar ponto. Tente novamente.'
  },

  user: {
    duplicateUsername: 'Este nome de usuário já está em uso.',
    weakPassword: 'Senha muito fraca. Use ao menos 8 caracteres com letras e números.',
    invalidEmail: 'Email inválido.',
    saveError: 'Erro ao salvar usuário.'
  },

  organization: {
    duplicateName: 'Já existe um registro com este nome.',
    inUse: 'Não é possível remover. Existem registros vinculados.',
    saveError: 'Erro ao salvar. Verifique os dados.'
  },

  report: {
    noData: 'Nenhum dado encontrado para o período selecionado.',
    generationError: 'Erro ao gerar relatório. Tente novamente.',
    invalidPeriod: 'Período inválido. A data final deve ser maior que a inicial.'
  },

  vacation: {
    overlap: 'Este funcionário já tem férias cadastradas neste período.',
    invalidDates: 'A data final deve ser maior que a data inicial.',
    saveError: 'Erro ao salvar férias.'
  }
}
