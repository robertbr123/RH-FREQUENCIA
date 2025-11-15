import { useState } from 'react'
import toast from 'react-hot-toast'

interface AddressData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export const useCEPLookup = () => {
  const [loading, setLoading] = useState(false)

  const fetchAddress = async (cep: string): Promise<AddressData | null> => {
    const cleanCEP = cep.replace(/\D/g, '')
    
    if (cleanCEP.length !== 8) {
      toast.error('CEP deve ter 8 dígitos')
      return null
    }

    setLoading(true)
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
      const data = await response.json()
      
      if (data.erro) {
        toast.error('CEP não encontrado')
        return null
      }
      
      toast.success('Endereço encontrado!')
      return data
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      toast.error('Erro ao buscar CEP. Tente novamente.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { fetchAddress, loading }
}

// Hook para auto-completar formulário
export const useAddressAutocomplete = (
  setFormData: (data: any) => void,
  formData: any
) => {
  const { fetchAddress, loading } = useCEPLookup()

  const handleCEPBlur = async (cep: string) => {
    const address = await fetchAddress(cep)
    
    if (address) {
      setFormData({
        ...formData,
        address: address.logradouro,
        city: address.localidade,
        state: address.uf,
        zip_code: cep,
      })
    }
  }

  return { handleCEPBlur, loading }
}
