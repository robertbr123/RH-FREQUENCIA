import { memo } from 'react'
import { Edit, Trash2, FileText, UserCircle } from 'lucide-react'

interface Employee {
  id: number
  name: string
  email: string
  cpf: string
  position: string
  department: string
  phone: string
  status: string
  hire_date: string
  photo_url?: string
}

interface EmployeeCardProps {
  employee: Employee
  onEdit: (employee: Employee) => void
  onDelete: (id: number) => void
  onViewCard: (id: number) => void
}

const EmployeeCard = memo(({ employee, onEdit, onDelete, onViewCard }: EmployeeCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-all duration-200 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-primary-200 dark:border-primary-700"
            />
          ) : (
            <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-full">
              <UserCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          <div className="ml-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{employee.position || 'Sem cargo'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          employee.status === 'active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {employee.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">Email:</strong> {employee.email}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">Departamento:</strong> {employee.department || 'N/A'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">Telefone:</strong> {employee.phone || 'N/A'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onViewCard(employee.id)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          title="Ver Ficha"
        >
          <FileText className="w-4 h-4 mr-1" />
          Ficha
        </button>
        <button
          onClick={() => onEdit(employee)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-800"
        >
          <Edit className="w-4 h-4 mr-1" />
          Editar
        </button>
        <button
          onClick={() => onDelete(employee.id)}
          className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
            employee.status === 'active'
              ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
              : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
          }`}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {employee.status === 'active' ? 'Desativar' : 'Ativar'}
        </button>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Só re-renderizar se houver mudanças relevantes
  return (
    prevProps.employee.id === nextProps.employee.id &&
    prevProps.employee.status === nextProps.employee.status &&
    prevProps.employee.name === nextProps.employee.name &&
    prevProps.employee.email === nextProps.employee.email &&
    prevProps.employee.photo_url === nextProps.employee.photo_url
  )
})

EmployeeCard.displayName = 'EmployeeCard'

export default EmployeeCard
