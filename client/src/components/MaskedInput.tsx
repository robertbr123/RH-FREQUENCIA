import InputMask from 'react-input-mask'

interface MaskedInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

// Input para CPF
export const CPFInput = ({ value, onChange, className = '', placeholder = '000.000.000-00', ...props }: MaskedInputProps) => (
  <InputMask
    mask="999.999.999-99"
    value={value}
    onChange={onChange}
    className={className || "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"}
    placeholder={placeholder}
    {...props}
  />
)

// Input para Telefone
export const PhoneInput = ({ value, onChange, className = '', placeholder = '(00) 00000-0000', ...props }: MaskedInputProps) => (
  <InputMask
    mask="(99) 99999-9999"
    value={value}
    onChange={onChange}
    className={className || "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"}
    placeholder={placeholder}
    {...props}
  />
)

// Input para CEP
export const CEPInput = ({ value, onChange, className = '', placeholder = '00000-000', ...props }: MaskedInputProps) => (
  <InputMask
    mask="99999-999"
    value={value}
    onChange={onChange}
    className={className || "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"}
    placeholder={placeholder}
    {...props}
  />
)

// Input para RG
export const RGInput = ({ value, onChange, className = '', placeholder = '00.000.000-0', ...props }: MaskedInputProps) => (
  <InputMask
    mask="99.999.999-9"
    value={value}
    onChange={onChange}
    className={className || "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"}
    placeholder={placeholder}
    {...props}
  />
)

// Input para Data
export const DateInput = ({ value, onChange, className = '', placeholder = '00/00/0000', ...props }: MaskedInputProps) => (
  <InputMask
    mask="99/99/9999"
    value={value}
    onChange={onChange}
    className={className || "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"}
    placeholder={placeholder}
    {...props}
  />
)

// Validação de CPF
export const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/\D/g, '')
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0
  let remainder

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.substring(10, 11))) return false

  return true
}

// Validação de telefone
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 11
}

// Validação de CEP
export const validateCEP = (cep: string): boolean => {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.length === 8
}
