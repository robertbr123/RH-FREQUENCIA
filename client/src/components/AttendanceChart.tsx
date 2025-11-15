import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'

interface AttendanceData {
  name: string
  presentes: number
  ausentes: number
}

interface AttendanceChartProps {
  data: AttendanceData[]
}

export const AttendanceBarChart = ({ data }: AttendanceChartProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Frequência Semanal
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          <Bar 
            dataKey="presentes" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name="Presentes"
          />
          <Bar 
            dataKey="ausentes" 
            fill="#ef4444" 
            radius={[8, 8, 0, 0]}
            name="Ausentes"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface StatusData {
  name: string
  value: number
}

interface StatusPieChartProps {
  data: StatusData[]
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1']

export const StatusPieChart = ({ data }: StatusPieChartProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Distribuição de Status
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Mock data para exemplo
export const getMockAttendanceData = (): AttendanceData[] => [
  { name: 'Seg', presentes: 45, ausentes: 5 },
  { name: 'Ter', presentes: 42, ausentes: 8 },
  { name: 'Qua', presentes: 48, ausentes: 2 },
  { name: 'Qui', presentes: 46, ausentes: 4 },
  { name: 'Sex', presentes: 43, ausentes: 7 },
]

export const getMockStatusData = (): StatusData[] => [
  { name: 'Presentes', value: 224 },
  { name: 'Ausentes', value: 26 },
  { name: 'Férias', value: 8 },
  { name: 'Afastados', value: 2 },
]
