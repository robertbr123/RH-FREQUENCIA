import Select from 'react-select'

interface Option {
  value: string | number
  label: string
}

interface MultiSelectProps {
  options: Option[]
  value: Option[]
  onChange: (selected: Option[]) => void
  placeholder?: string
  className?: string
  isLoading?: boolean
  isClearable?: boolean
  isDisabled?: boolean
}

export const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  isLoading = false,
  isClearable = true,
  isDisabled = false,
}: MultiSelectProps) => {
  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? '#0284c7' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(2, 132, 199, 0.2)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#0284c7' : '#9ca3af',
      },
      borderRadius: '0.5rem',
      minHeight: '42px',
      backgroundColor: 'var(--select-bg, white)',
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.5rem',
      marginTop: '4px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      backgroundColor: 'var(--select-bg, white)',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#0284c7'
        : state.isFocused
        ? '#e0f2fe'
        : 'transparent',
      color: state.isSelected ? 'white' : 'var(--text-color, #111827)',
      '&:active': {
        backgroundColor: '#0369a1',
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: '#e0f2fe',
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: '#0369a1',
      fontWeight: '500',
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: '#0369a1',
      '&:hover': {
        backgroundColor: '#0284c7',
        color: 'white',
      },
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'var(--placeholder-color, #9ca3af)',
    }),
  }

  return (
    <Select
      isMulti
      options={options}
      value={value}
      onChange={(selected) => onChange(selected as Option[])}
      placeholder={placeholder}
      className={className}
      classNamePrefix="react-select"
      styles={customStyles}
      isLoading={isLoading}
      isClearable={isClearable}
      isDisabled={isDisabled}
      noOptionsMessage={() => 'Nenhuma opção encontrada'}
      loadingMessage={() => 'Carregando...'}
    />
  )
}

interface SingleSelectProps {
  options: Option[]
  value: Option | null
  onChange: (selected: Option | null) => void
  placeholder?: string
  className?: string
  isLoading?: boolean
  isClearable?: boolean
  isDisabled?: boolean
}

export const SingleSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  isLoading = false,
  isClearable = true,
  isDisabled = false,
}: SingleSelectProps) => {
  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? '#0284c7' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(2, 132, 199, 0.2)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#0284c7' : '#9ca3af',
      },
      borderRadius: '0.5rem',
      minHeight: '42px',
      backgroundColor: 'var(--select-bg, white)',
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.5rem',
      marginTop: '4px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      backgroundColor: 'var(--select-bg, white)',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#0284c7'
        : state.isFocused
        ? '#e0f2fe'
        : 'transparent',
      color: state.isSelected ? 'white' : 'var(--text-color, #111827)',
      '&:active': {
        backgroundColor: '#0369a1',
      },
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'var(--text-color, #111827)',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'var(--placeholder-color, #9ca3af)',
    }),
  }

  return (
    <Select
      options={options}
      value={value}
      onChange={(selected) => onChange(selected as Option | null)}
      placeholder={placeholder}
      className={className}
      classNamePrefix="react-select"
      styles={customStyles}
      isLoading={isLoading}
      isClearable={isClearable}
      isDisabled={isDisabled}
      noOptionsMessage={() => 'Nenhuma opção encontrada'}
      loadingMessage={() => 'Carregando...'}
    />
  )
}
