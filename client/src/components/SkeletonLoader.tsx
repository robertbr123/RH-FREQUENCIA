// Skeleton Loader genérico
export const SkeletonBox = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}></div>
)

// Skeleton para card de funcionário
export const EmployeeSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center">
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="ml-3 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
    <div className="flex gap-2">
      <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  </div>
)

// Skeleton para lista de funcionários
export const EmployeeListSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <EmployeeSkeleton key={i} />
    ))}
  </div>
)

// Skeleton para tabela
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <td key={colIndex} className="px-4 py-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// Skeleton para cards de estatísticas
export const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  </div>
)

// Skeleton para dashboard
export const DashboardSkeleton = () => (
  <div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-8 animate-pulse"></div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Recent Activity */}
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse"></div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  </div>
)
