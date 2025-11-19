import { useState, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Download, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Employee {
  id: number
  name: string
  department_id?: number
  department_name?: string
}

interface Department {
  id: number
  name: string
}

interface Holiday {
  id: number
  name: string
  date: string
  type: string
  description?: string
  recurring: boolean
}

interface Vacation {
  id: number
  employee_id: number
  year: number
  month: number
  start_date: string
  end_date: string
  days: number
  observation?: string
}

interface AttendanceRecord {
  date: string
  check_in: string | null
  check_out: string | null
  entry_time: string | null
  break_start_time: string | null
  break_end_time: string | null
  exit_time: string | null
  total_hours: number | null
  status: string
  observation?: string
}

export default function Reports() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [reportType, setReportType] = useState<'individual' | 'general'>('individual')
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null)

  useEffect(() => {
    loadEmployees()
    loadDepartments()
  }, [])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEmployees(response.data.filter((e: any) => e.status === 'active'))
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/organization/departments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDepartments(response.data)
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error)
    }
  }

  const loadAttendanceData = async () => {
    if (!selectedEmployee) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      // Corrigir o problema de timezone ao criar a data
      // month está no formato "2025-11", então vamos criar a data corretamente
      const [year, monthNum] = month.split('-').map(Number)
      const monthDate = new Date(year, monthNum - 1, 1) // mês é 0-indexed
      
      const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      console.log('🔍 Buscando attendance para:', {
        employee_id: selectedEmployee,
        start_date: startDate,
        end_date: endDate,
        month_selected: month,
        month_date: monthDate,
      })

      // Buscar dados de frequência, feriados, férias e dados do funcionário em paralelo
      const [attendanceResponse, holidaysResponse, vacationsResponse, employeeResponse, absencesResponse] = await Promise.all([
        axios.get('/api/attendance', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            employee_id: selectedEmployee,
            start_date: startDate,
            end_date: endDate,
          },
        }),
        axios.get('/api/organization/holidays', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/organization/vacations/month/${year}/${monthNum}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/employees/${selectedEmployee}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/absences/employee/${selectedEmployee}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        }),
      ])

      // Obter horário de trabalho do funcionário
      const employeeData = employeeResponse.data
      
      // Buscar schedule_id do funcionário e depois os workdays
      let workdays: any[] = []
      if (employeeData.schedule_id) {
        try {
          const scheduleResponse = await axios.get(`/api/organization/schedules/${employeeData.schedule_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          workdays = scheduleResponse.data.workdays || []
          console.log('📅 Dias de trabalho da escala:', scheduleResponse.data.name, '→', workdays)
        } catch (error) {
          console.warn('⚠️ Não foi possível buscar escala do funcionário:', error)
          workdays = []
        }
      } else {
        console.warn('⚠️ Funcionário sem schedule_id atribuído')
      }

      // Armazenar feriados, férias e ausências
      setHolidays(holidaysResponse.data)
      const allVacations = vacationsResponse.data || []
      console.log('🏖️ Todas as férias do mês:', allVacations)
      console.log('👤 Funcionário selecionado:', selectedEmployee)
      
      const employeeVacations = allVacations.filter((v: Vacation) => v.employee_id === selectedEmployee)
      console.log('🏖️ Férias do funcionário selecionado:', employeeVacations)
      setVacations(employeeVacations)

      const employeeAbsences = absencesResponse.data || []
      console.log('🚫 Ausências do funcionário:', employeeAbsences)
      setAbsences(employeeAbsences)

      // Criar mapa de feriados por data
      const holidayMap = new Map()
      holidaysResponse.data.forEach((holiday: Holiday) => {
        // Extrair apenas YYYY-MM-DD da data do feriado
        const holidayDateStr = typeof holiday.date === 'string' 
          ? holiday.date.split('T')[0] 
          : holiday.date
        holidayMap.set(holidayDateStr, holiday)
      })

      // Função para verificar se uma data está em período de férias
      const isOnVacation = (dateStr: string) => {
        const result = employeeVacations.some((vacation: Vacation) => {
          // Normalizar datas - remover parte de hora se houver
          const startDateStr = typeof vacation.start_date === 'string' 
            ? vacation.start_date.split('T')[0] 
            : vacation.start_date
          const endDateStr = typeof vacation.end_date === 'string' 
            ? vacation.end_date.split('T')[0] 
            : vacation.end_date
            
          const vacationStart = new Date(startDateStr + 'T00:00:00')
          const vacationEnd = new Date(endDateStr + 'T00:00:00')
          const checkDate = new Date(dateStr + 'T00:00:00')
          const isInRange = checkDate >= vacationStart && checkDate <= vacationEnd
          
          if (isInRange) {
            console.log(`   🎯 Data ${dateStr} está em férias:`, {
              start: startDateStr,
              end: endDateStr,
              checkDate: dateStr,
              vacationStart: vacationStart.toISOString(),
              vacationEnd: vacationEnd.toISOString(),
              checkDateObj: checkDate.toISOString()
            })
          }
          
          return isInRange
        })
        return result
      }

      // Função para verificar se uma data está em período de ausência
      const getAbsenceInfo = (dateStr: string) => {
        return employeeAbsences.find((absence: any) => {
          const startDateStr = typeof absence.start_date === 'string' 
            ? absence.start_date.split('T')[0] 
            : absence.start_date
          const endDateStr = typeof absence.end_date === 'string' 
            ? absence.end_date.split('T')[0] 
            : absence.end_date
            
          const absenceStart = new Date(startDateStr + 'T00:00:00')
          const absenceEnd = new Date(endDateStr + 'T00:00:00')
          const checkDate = new Date(dateStr + 'T00:00:00')
          
          return checkDate >= absenceStart && checkDate <= absenceEnd
        })
      }

      // Criar array com todos os dias do mês
      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      })

      console.log('📊 Dados recebidos do backend:', attendanceResponse.data)
      console.log('📊 Total de registros recebidos:', attendanceResponse.data.length)
      console.log('� Dias do mês:', daysInMonth.length)
      console.log('📅 Período:', startDate, 'até', endDate)

      // Criar mapa de attendance por data (usando parseISO para evitar problemas de timezone)
      const attendanceMap = new Map()
      attendanceResponse.data.forEach((record: any, index: number) => {
        console.log(`\n📌 Registro ${index + 1}:`, record)
        // Agora usar o campo 'date' ao invés de extrair de check_in
        if (record.date) {
          const dateStr = typeof record.date === 'string' 
            ? record.date.split('T')[0] 
            : record.date
          console.log(`   ✅ Data: ${dateStr}`)
          console.log(`   ⏰ Entry: ${record.entry_time || record.check_in || 'Não registrado'}`)
          console.log(`   ⏰ Exit: ${record.exit_time || record.check_out || 'Não registrado'}`)
          console.log(`   📊 Total Hours: ${record.total_hours || 'N/A'}`)
          attendanceMap.set(dateStr, record)
        } else {
          console.log(`   ❌ Registro sem campo 'date'!`, record)
        }
      })

      console.log('🗺️  Mapa de attendance criado:', Array.from(attendanceMap.keys()))
      console.log('🗺️  Total de datas no mapa:', attendanceMap.size)

      // Mapear dias da semana para índices
      // workdays vem como ["0","1","2","3","4","5","6"] ou ["1","2","3","4","5"]
      // Onde: 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado
      
      // Converter array de strings para números para o set
      const workdayNumbers = workdays
        .map((day: any) => {
          // Se for string, converter para número
          if (typeof day === 'string') {
            return parseInt(day)
          }
          return day
        })
        .filter((d: number) => !isNaN(d))
      
      // Criar set com os dias de trabalho do funcionário
      const workdaySet = new Set(workdayNumbers)
      console.log('📅 Dias de trabalho (0-6, onde 0=dom, 6=sab):', Array.from(workdaySet))

      const fullMonthData = daysInMonth.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = day.getDay() // 0 = domingo, 6 = sábado
        
        // Verificar se é dia de trabalho para este funcionário
        // Se workdaySet está vazio, considera todos os dias como dia de trabalho
        const isWorkday = workdaySet.size === 0 || workdaySet.has(dayOfWeek)
        
        const record = attendanceMap.get(dateStr)
        const holiday = holidayMap.get(dateStr)
        const onVacation = isOnVacation(dateStr)

        if (record) {
          console.log(`\n🔍 Dia ${dateStr} (dia da semana: ${dayOfWeek}):`)
          console.log('   📝 Registro encontrado:', record)
          console.log('   📅 É dia de trabalho?', isWorkday)
        }

        // Determinar status correto
        let status = 'absent'
        let observation = ''
        
        if (record?.entry_time || record?.check_in) {
          if (record?.exit_time || record?.check_out) {
            status = 'present'
          } else {
            status = 'present' // Tem entrada, considerado presente
          }
          console.log(`   ✅ Status: ${status}`)
        }

        // Verificar se está em férias
        if (onVacation) {
          observation = 'EM FÉRIAS'
          status = 'vacation'
          console.log(`   🏖️ Funcionário em férias`)
        }
        // Verificar se está em ausência justificada (folga, atestado, etc)
        else {
          const absenceInfo = getAbsenceInfo(dateStr)
          if (absenceInfo) {
            const absenceTypeLabels: Record<string, string> = {
              'folga': 'FOLGA',
              'atestado': 'ATESTADO MÉDICO',
              'licenca': 'LICENÇA',
              'falta_justificada': 'FALTA JUSTIFICADA',
              'outros': 'AUSÊNCIA JUSTIFICADA'
            }
            const typeLabel = absenceTypeLabels[absenceInfo.absence_type] || absenceInfo.absence_type.toUpperCase()
            observation = absenceInfo.observation 
              ? `${typeLabel}: ${absenceInfo.observation}` 
              : typeLabel
            status = 'justified_absence'
            console.log(`   🚫 Ausência: ${observation}`)
          }
          // Verificar se é feriado (apenas se não estiver em férias ou ausência)
          else if (holiday) {
            const typeLabel = 
              holiday.type === 'federal' ? 'Feriado Federal' :
              holiday.type === 'estadual' ? 'Feriado Estadual' :
              holiday.type === 'municipal' ? 'Feriado Municipal' :
              'Ponto Facultativo'
            
            observation = `${typeLabel}: ${holiday.name}`
            status = 'holiday'
            console.log(`   🎉 Feriado: ${observation}`)
          }
          // Verificar se não é dia de trabalho (fim de semana ou dia não trabalhado)
          else if (!isWorkday) {
            // Dia da semana que o funcionário não trabalha normalmente
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
            observation = `NÃO TRABALHA ${dayNames[dayOfWeek].toUpperCase()}`
            status = 'non_workday'
            console.log(`   📅 Não é dia de trabalho para este funcionário (${dayNames[dayOfWeek]})`)
          }
        }

        return {
          date: dateStr,
          check_in: record?.check_in || record?.entry_time || null,
          check_out: record?.check_out || record?.exit_time || null,
          entry_time: record?.entry_time || null,
          break_start_time: record?.break_start_time || null,
          break_end_time: record?.break_end_time || null,
          exit_time: record?.exit_time || null,
          total_hours: record?.total_hours || null,
          status: status,
          observation: observation,
        }
      })

      console.log('📋 Dados finais do relatório:', fullMonthData.filter(d => d.check_in || d.entry_time))
      console.log('📋 Primeiro registro completo:', fullMonthData[0])
      setAttendanceData(fullMonthData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados de frequência')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    loadAttendanceData()
  }

  const generatePDF = async () => {
    if (!selectedEmployee || attendanceData.length === 0) return

    const employee = employees.find((e) => e.id === selectedEmployee)
    if (!employee) return

    // Buscar dados completos do funcionário
    let employeeDetails: any = employee
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/employees/${selectedEmployee}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      employeeDetails = response.data
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error)
    }

    const doc = new jsPDF()
    
    // Cores profissionais
    const primaryColor: [number, number, number] = [37, 99, 235] // Azul mais suave
    const darkGray: [number, number, number] = [55, 65, 81]
    const borderColor: [number, number, number] = [209, 213, 219]
    const grayBg: [number, number, number] = [249, 250, 251]
    const lightBlue: [number, number, number] = [239, 246, 255]

    // ===== CABEÇALHO PROFISSIONAL =====
    // Linha superior fina azul
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, 210, 3, 'F')
    
    // Título principal
    doc.setTextColor(...darkGray)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('FOLHA DE PONTO', 105, 15, { align: 'center' })
    
    // Linha decorativa sob o título
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(70, 18, 140, 18)
    
    // Período
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    const [year, monthNum] = month.split('-').map(Number)
    const monthDate = new Date(year, monthNum - 1, 1)
    const monthYear = format(monthDate, 'MMMM / yyyy', { locale: ptBR })
    doc.text(monthYear.toUpperCase(), 105, 24, { align: 'center' })

    // ===== DADOS DO FUNCIONÁRIO =====
    let yPos = 32
    
    // Box com fundo suave
    doc.setFillColor(...grayBg)
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.3)
    doc.roundedRect(15, yPos, 180, 38, 2, 2, 'FD')
    
    yPos += 6
    doc.setTextColor(...darkGray)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DO FUNCIONÁRIO', 20, yPos)
    
    // Linha divisória sob título
    yPos += 2
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 75, yPos)
    
    yPos += 6
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    
    // Linha 1
    doc.setFont('helvetica', 'bold')
    doc.text('Nome:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(employeeDetails.name || employee.name, 35, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Matrícula:', 120, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(`#${employee.id.toString().padStart(6, '0')}`, 142, yPos)
    
    yPos += 7
    
    // Linha 2
    doc.setFont('helvetica', 'bold')
    doc.text('Cargo:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(employeeDetails.position_name || '-', 35, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Departamento:', 120, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(employeeDetails.department_name || '-', 150, yPos)
    
    yPos += 7
    
    // Linha 3
    doc.setFont('helvetica', 'bold')
    doc.text('Setor:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(employeeDetails.sector_name || '-', 35, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('CPF:', 120, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(employeeDetails.cpf || '-', 132, yPos)

    // ===== TABELA DE REGISTROS =====
    yPos += 12

    const tableData = attendanceData.map((record) => {
      // Validar se record.date existe
      if (!record.date) {
        console.warn('⚠️ Registro sem data no PDF:', record)
        return null
      }
      
      const date = new Date(record.date + 'T00:00:00')
      
      // Validar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Data inválida no PDF:', record.date)
        return null
      }
      
      const dayOfWeek = format(date, 'EEEE', { locale: ptBR })
      const dayNum = format(date, 'dd')
      const dateStr = format(date, 'yyyy-MM-dd')

      // Verificar se é feriado
      const isHoliday = holidays.some(h => {
        if (!h.date) return false
        try {
          const holidayDate = format(new Date(h.date + 'T00:00:00'), 'yyyy-MM-dd')
          return holidayDate === dateStr
        } catch {
          return false
        }
      })
      const holiday = holidays.find(h => {
        if (!h.date) return false
        try {
          const holidayDate = format(new Date(h.date + 'T00:00:00'), 'yyyy-MM-dd')
          return holidayDate === dateStr
        } catch {
          return false
        }
      })

      let checkIn = ''
      let checkOut = ''
      let totalHours = ''
      let obs = ''
      let status = 'normal' // normal, holiday, vacation, absent

      // Usar o total_hours da view se disponível
      if (record.total_hours !== null && record.total_hours !== undefined) {
        const hours = parseFloat(record.total_hours.toString())
        if (!isNaN(hours)) {
          totalHours = hours.toFixed(2) + 'h'
        }
      }

      if (record.entry_time || record.check_in) {
        // Os horários agora vem como string HH:MM:SS do backend
        const entryStr = record.entry_time || record.check_in
        if (entryStr && entryStr !== null) {
          checkIn = typeof entryStr === 'string' && entryStr.includes(':') 
            ? entryStr.substring(0, 5) 
            : format(new Date(entryStr!), 'HH:mm')
        }
        
        if (record.exit_time || record.check_out) {
          const exitStr = record.exit_time || record.check_out
          if (exitStr && exitStr !== null) {
            checkOut = typeof exitStr === 'string' && exitStr.includes(':')
              ? exitStr.substring(0, 5)
              : format(new Date(exitStr!), 'HH:mm')
          }
          
          // Mostrar pontos de intervalo na observação se houver
          if (record.break_start_time && record.break_end_time) {
            const breakStartStr = record.break_start_time
            const breakEndStr = record.break_end_time
            if (breakStartStr && breakEndStr) {
              const breakStart = typeof breakStartStr === 'string' && breakStartStr.includes(':')
                ? breakStartStr.substring(0, 5)
                : format(new Date(breakStartStr), 'HH:mm')
              const breakEnd = typeof breakEndStr === 'string' && breakEndStr.includes(':')
                ? breakEndStr.substring(0, 5)
                : format(new Date(breakEndStr), 'HH:mm')
              obs = `Intervalo: ${breakStart} - ${breakEnd}`
            }
          }
          
          // Se não temos total_hours calculado, calcular manualmente (fallback)
          if (!totalHours && record.check_in && record.check_out) {
            // Só calcula se forem timestamps, não strings
            if (typeof record.check_in !== 'string' || !record.check_in.includes(':')) {
              const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime()
              const hours = Math.floor(diff / (1000 * 60 * 60))
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
              totalHours = `${hours}:${minutes.toString().padStart(2, '0')}`
            }
          }
        } else {
          obs = 'Sem saída'
        }
      } else {
        // Se não tem registro de ponto
        if (isHoliday && holiday) {
          obs = `FERIADO - ${holiday.name}`
          status = 'holiday'
        } else if (record.observation === 'EM FÉRIAS') {
          obs = 'EM FÉRIAS'
          status = 'vacation'
        } else if (record.observation === 'NÃO É DIA DE TRABALHO') {
          obs = 'NÃO É DIA DE TRABALHO'
          status = 'holiday'
        } else if (record.observation && record.observation.startsWith('FOLGA')) {
          obs = record.observation
          status = 'vacation'
        } else if (record.observation && record.observation.startsWith('ATESTADO')) {
          obs = record.observation
          status = 'vacation'
        } else if (record.observation && record.observation.startsWith('LICENÇA')) {
          obs = record.observation
          status = 'vacation'
        } else if (record.observation && record.observation.startsWith('FALTA JUSTIFICADA')) {
          obs = record.observation
          status = 'vacation'
        } else if (record.observation && record.observation.startsWith('AUSÊNCIA JUSTIFICADA')) {
          obs = record.observation
          status = 'vacation'
        } else if (record.observation) {
          obs = record.observation
        } else {
          obs = 'FALTA'
          status = 'absent'
        }
      }

      return {
        data: [
          dayNum,
          dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
          checkIn,
          checkOut,
          totalHours,
          obs
        ],
        status
      }
    })

    // Filtrar registros nulos antes de criar a tabela
    const validTableData = tableData.filter(row => row !== null)

    // ===== LEGENDA DE CORES =====
    yPos += 8
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text('LEGENDA DE OBSERVAÇÕES:', 15, yPos)
    
    yPos += 7
    doc.setFontSize(7)
    
    const legend = [
      { color: [34, 197, 94], label: 'Presente - Dia trabalhado normalmente' },
      { color: [220, 38, 38], label: 'Falta - Deveria trabalhar, não compareceu' },
      { color: [59, 130, 246], label: 'Em Férias - Período de férias' },
      { color: [147, 51, 234], label: 'Feriado - Feriado nacional/estadual/municipal' },
      { color: [107, 114, 128], label: 'Não Trabalha - Dia de folga per escala' },
      { color: [180, 83, 9], label: 'Ausência Justificada - Atestado/Licença/Folga' },
    ]
    
    const colWidth = 95
    legend.forEach((item, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 15 + (col * colWidth)
      const legendY = yPos + (row * 6)
      
      // Quadrado colorido
      doc.setFillColor(...item.color)
      doc.rect(x, legendY - 2, 3, 3, 'F')
      
      // Texto
      doc.setTextColor(0, 0, 0)
      doc.text(item.label, x + 5, legendY)
    })
    
    yPos += 20

    autoTable(doc, {
      startY: yPos,
      head: [['Dia', 'Dia da Semana', 'Entrada', 'Saída', 'Total', 'Observações']],
      body: validTableData.map(row => row.data),
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        lineColor: borderColor,
        lineWidth: 0.3,
      },
      headStyles: { 
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'left' },
        2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 55, halign: 'left', fontSize: 7 },
      },
      didParseCell: (data: any) => {
        const rowIndex = data.row.index
        const rowStatus = tableData[rowIndex]?.status
        
        // Destacar finais de semana
        if (data.section === 'body' && data.column.index === 1) {
          const dayName = data.cell.text[0].toLowerCase()
          if (dayName.includes('sábado') || dayName.includes('domingo')) {
            data.cell.styles.fillColor = grayBg
          }
        }
        
        // Colorir observações baseado no status
        if (data.section === 'body' && data.column.index === 5) {
          const cellText = data.cell.text[0]
          
          if (rowStatus === 'present' || cellText?.includes('Entrada') || cellText?.includes(':')) {
            data.cell.styles.textColor = [34, 197, 94] // verde
            data.cell.styles.fontStyle = 'bold'
          } else if (rowStatus === 'holiday' || cellText?.startsWith('FERIADO')) {
            data.cell.styles.textColor = [147, 51, 234] // roxo
            data.cell.styles.fontStyle = 'bold'
          } else if (rowStatus === 'vacation' || cellText === 'EM FÉRIAS') {
            data.cell.styles.textColor = [59, 130, 246] // azul
            data.cell.styles.fontStyle = 'bold'
          } else if (rowStatus === 'non_workday' || cellText?.startsWith('NÃO TRABALHA')) {
            data.cell.styles.textColor = [107, 114, 128] // cinza
            data.cell.styles.fontStyle = 'bold'
          } else if (rowStatus === 'justified_absence') {
            data.cell.styles.textColor = [180, 83, 9] // laranja
            data.cell.styles.fontStyle = 'bold'
          } else if (rowStatus === 'absent' || cellText === 'FALTA') {
            data.cell.styles.textColor = [220, 38, 38] // vermelho
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      margin: { left: 15, right: 15 },
    })

    // ===== RESUMO FINAL =====
    const finalY = (doc as any).lastAutoTable.finalY || yPos
    yPos = finalY + 8

    const totalPresent = attendanceData.filter((r) => r.status === 'present').length
    const totalVacation = attendanceData.filter((r) => r.status === 'vacation').length
    const totalAbsent = attendanceData.filter((r) => r.status === 'absent').length
    const totalNonWorkday = attendanceData.filter((r) => r.status === 'non_workday').length
    const totalHoliday = attendanceData.filter((r) => r.status === 'holiday').length
    const totalJustified = attendanceData.filter((r) => r.status === 'justified_absence').length
    const totalDays = attendanceData.length
    const attendanceRate = ((totalPresent / totalDays) * 100).toFixed(1)
    
    // Usar total_hours da view se disponível, senão calcular manualmente
    const totalHours = attendanceData.reduce((acc, record) => {
      if (record.total_hours !== null && record.total_hours !== undefined) {
        return acc + record.total_hours
      } else if (record.check_in && record.check_out) {
        const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime()
        return acc + diff / (1000 * 60 * 60)
      }
      return acc
    }, 0)
    
    const avgHoursPerDay = totalPresent > 0 ? totalHours / totalPresent : 0

    // Box de resumo
    doc.setFillColor(...grayBg)
    doc.rect(15, yPos, 180, 42, 'FD')
    
    yPos += 6
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMO DO PERÍODO', 105, yPos, { align: 'center' })
    
    yPos += 8
    doc.setFontSize(9)
    
    // Estatísticas em grid
    const stats = [
      { label: 'Dias no Período:', value: totalDays.toString() },
      { label: 'Dias Presentes:', value: totalPresent.toString(), color: [34, 197, 94] },
      { label: 'Dias em Férias:', value: totalVacation.toString(), color: [59, 130, 246] },
      { label: 'Faltas:', value: totalAbsent.toString(), color: [220, 38, 38] },
      { label: 'Não Trabalha:', value: totalNonWorkday.toString(), color: [107, 114, 128] },
      { label: 'Feriados:', value: totalHoliday.toString(), color: [147, 51, 234] },
      { label: 'Ausências Just.:', value: totalJustified.toString(), color: [180, 83, 9] },
      { label: 'Taxa de Presença:', value: `${attendanceRate}%`, color: [59, 130, 246] },
      { label: 'Horas Trabalhadas:', value: `${Math.floor(totalHours)}h ${Math.floor((totalHours % 1) * 60)}m` },
      { label: 'Média por Dia:', value: `${Math.floor(avgHoursPerDay)}h ${Math.floor((avgHoursPerDay % 1) * 60)}m` },
    ]

    stats.forEach((stat, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      const x = 20 + (col * 60)
      const y = yPos + (row * 12)
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(stat.label, x, y)
      
      doc.setFont('helvetica', 'bold')
      if (stat.color) {
        doc.setTextColor(...stat.color)
      }
      doc.text(stat.value, x + 40, y)
      doc.setTextColor(0, 0, 0)
    })

    // ===== ASSINATURAS =====
    yPos = finalY + 57
    
    // Se não houver espaço suficiente, adicionar nova página
    if (yPos > 230) {
      doc.addPage()
      yPos = 30
    }

    // Título da seção
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text('VALIDAÇÃO DO DOCUMENTO', 105, yPos, { align: 'center' })
    
    yPos += 15

    // Assinatura do Funcionário
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 95, yPos)
    
    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('Assinatura do Funcionário', 60, yPos, { align: 'center' })
    
    yPos += 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`${employeeDetails.name || employee.name}`, 60, yPos, { align: 'center' })
    
    // Resetar posição Y para assinatura do responsável (mesma linha)
    yPos -= 9
    
    // Assinatura do Responsável
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.5)
    doc.line(115, yPos, 185, yPos)
    
    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('Assinatura do Responsável', 150, yPos, { align: 'center' })
    
    yPos += 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('Recursos Humanos', 150, yPos, { align: 'center' })

    // ===== RODAPÉ =====
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      
      const pageHeight = doc.internal.pageSize.height
      doc.text(
        `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        105,
        pageHeight - 10,
        { align: 'center' }
      )
      doc.text(
        `Página ${i} de ${pageCount}`,
        195,
        pageHeight - 10,
        { align: 'right' }
      )
    }

    // Salvar PDF
    const fileName = `folha-ponto-${employee.name.replace(/\s+/g, '-').toLowerCase()}-${month}.pdf`
    doc.save(fileName)
  }

  const generateGeneralPDF = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      const [year, monthNum] = month.split('-').map(Number)
      const monthDate = new Date(year, monthNum - 1, 1)
      
      const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      console.log('📊 Gerando relatório geral para:', { month, startDate, endDate })

      // Buscar dados de todos os funcionários ativos
      const response = await axios.get('/api/attendance', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      })

      const allAttendance = response.data

      // Agrupar por funcionário
      const employeeMap = new Map()
      
      allAttendance.forEach((record: any) => {
        if (!employeeMap.has(record.employee_id)) {
          employeeMap.set(record.employee_id, {
            name: record.employee_name,
            records: []
          })
        }
        employeeMap.get(record.employee_id).records.push(record)
      })

      // Adicionar funcionários que não tiveram registro
      employees.forEach(emp => {
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            name: emp.name,
            department_id: emp.department_id,
            department_name: emp.department_name,
            records: []
          })
        } else {
          // Adicionar department info aos que já existem
          const existing = employeeMap.get(emp.id)
          existing.department_id = emp.department_id
          existing.department_name = emp.department_name
        }
      })

      // Filtrar por departamento se selecionado
      let filteredEmployees = Array.from(employeeMap.entries())
      if (selectedDepartment) {
        filteredEmployees = filteredEmployees.filter(([_, data]) => data.department_id === selectedDepartment)
      }

      // Ordenar alfabeticamente
      const sortedEmployees = filteredEmployees
        .sort((a, b) => a[1].name.localeCompare(b[1].name))

      // Criar PDF em modo paisagem
      const doc = new jsPDF('landscape', 'mm', 'a4')
      
      // Cores
      const primaryColor: [number, number, number] = [59, 130, 246]
      const borderColor: [number, number, number] = [229, 231, 235]
      
      // Cabeçalho
      doc.setFillColor(...primaryColor)
      doc.rect(0, 0, 297, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RELATÓRIO GERAL DE FREQUÊNCIA', 148.5, 15, { align: 'center' })
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const monthName = format(monthDate, 'MMMM/yyyy', { locale: ptBR })
      doc.text(monthName.toUpperCase(), 148.5, 23, { align: 'center' })
      
      // Linha de dados da empresa
      let yPos = 45
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, yPos)
      
      // Adicionar filtro de departamento se aplicado
      if (selectedDepartment) {
        const deptName = departments.find(d => d.id === selectedDepartment)?.name || 'N/A'
        doc.text(`Departamento: ${deptName}`, 14, yPos + 5)
        yPos += 5
      }
      
      doc.text(`Total de funcionários: ${sortedEmployees.length}`, 200, yPos)
      
      yPos += 10

      // Tabela de dados
      const tableData = sortedEmployees.map(([employeeId, data]) => {
        const records = data.records
        
        // Calcular estatísticas
        const daysPresent = records.filter((r: any) => r.entry_time || r.check_in).length
        
        // Garantir que totalHours seja sempre um número
        const totalHours = records.reduce((acc: number, r: any) => {
          const hours = parseFloat(r.total_hours) || 0
          return acc + hours
        }, 0)
        
        const avgHours = daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : '0.0'
        
        // Calcular atrasos (entrada após 08:30)
        const lateCount = records.filter((r: any) => {
          const entryTime = r.entry_time || r.check_in
          if (!entryTime || typeof entryTime !== 'string' || !entryTime.includes(':')) return false
          
          const [hourStr, minuteStr] = entryTime.split(':')
          const hour = parseInt(hourStr, 10)
          const minute = parseInt(minuteStr, 10)
          return hour > 8 || (hour === 8 && minute > 30)
        }).length

        return [
          data.name,
          daysPresent.toString(),
          totalHours.toFixed(1) + 'h',
          avgHours + 'h',
          lateCount.toString()
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Funcionário', 'Dias Presente', 'Total Horas', 'Média/Dia', 'Atrasos']],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          lineColor: borderColor,
          lineWidth: 0.3,
        },
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        }
      })

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100)
        
        const pageHeight = doc.internal.pageSize.height
        doc.text(
          `Relatório Geral - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
          148.5,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.text(
          `Página ${i} de ${pageCount}`,
          283,
          pageHeight - 10,
          { align: 'right' }
        )
      }

      // Salvar PDF
      const fileName = `relatorio-geral-${month}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Erro ao gerar relatório geral:', error)
      alert('Erro ao gerar relatório geral')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header com Gradiente */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 mb-2">
            Relatórios de Ponto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gere relatórios mensais de entrada e saída dos funcionários
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
          <FileText className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Card de Formulário */}
      <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl shadow-xl border-2 border-blue-200 dark:border-blue-800 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
              Tipo de Relatório
            </label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-3 cursor-pointer px-6 py-4 rounded-xl border-2 transition-all duration-300 ${
                reportType === 'individual'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}>
                <input
                  type="radio"
                  name="reportType"
                  value="individual"
                  checked={reportType === 'individual'}
                  onChange={(e) => setReportType(e.target.value as 'individual' | 'general')}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Individual (por funcionário)</span>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer px-6 py-4 rounded-xl border-2 transition-all duration-300 ${
                reportType === 'general'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}>
                <input
                  type="radio"
                  name="reportType"
                  value="general"
                  checked={reportType === 'general'}
                  onChange={(e) => setReportType(e.target.value as 'individual' | 'general')}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Geral (todos os funcionários)</span>
              </label>
            </div>
          </div>

          <div className={`grid gap-6 ${reportType === 'individual' ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {reportType === 'individual' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Funcionário
                </label>
                <select
                  value={selectedEmployee || ''}
                  onChange={(e) => setSelectedEmployee(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                  required={reportType === 'individual'}
                >
                  <option value="">Selecione um funcionário</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'general' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Departamento (Opcional)
                </label>
                <select
                  value={selectedDepartment || ''}
                  onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                >
                  <option value="">Todos os departamentos</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mês/Ano
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex gap-4">
            {reportType === 'individual' ? (
              <>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Calendar className="w-5 h-5" />
                  {loading ? 'Carregando...' : 'Gerar Visualização'}
                </button>

                {attendanceData.length > 0 && (
                  <button
                    type="button"
                    onClick={generatePDF}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Download className="w-5 h-5" />
                    Baixar PDF Individual
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={generateGeneralPDF}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download className="w-5 h-5" />
                {loading ? 'Gerando PDF...' : 'Baixar PDF Geral'}
              </button>
            )}
          </div>
        </form>

        {/* Visualização dos dados - apenas para relatório individual */}
        {reportType === 'individual' && attendanceData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Prévia do Relatório
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Dia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Entrada
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Saída
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Observações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {attendanceData.map((record, index) => {
                    // Verificar se record.date existe
                    if (!record.date) {
                      console.warn('Registro sem data:', record)
                      return null
                    }
                    
                    const date = new Date(record.date + 'T00:00:00')
                    
                    // Verificar se a data é válida
                    if (isNaN(date.getTime())) {
                      console.warn('Data inválida:', record.date)
                      return null
                    }
                    
                    // check_in e check_out agora são strings HH:MM:SS
                    const checkInDisplay = record.check_in || record.entry_time
                    const checkOutDisplay = record.check_out || record.exit_time
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 dark:bg-gray-900">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {format(date, 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {format(date, 'EEEE', { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {checkInDisplay && typeof checkInDisplay === 'string' && checkInDisplay.includes(':')
                            ? checkInDisplay.substring(0, 5)
                            : checkInDisplay 
                            ? format(new Date(checkInDisplay), 'HH:mm')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {checkOutDisplay && typeof checkOutDisplay === 'string' && checkOutDisplay.includes(':')
                            ? checkOutDisplay.substring(0, 5)
                            : checkOutDisplay
                            ? format(new Date(checkOutDisplay), 'HH:mm')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'vacation'
                                ? 'bg-blue-100 text-blue-800'
                                : record.status === 'holiday'
                                ? 'bg-purple-100 text-purple-800'
                                : record.status === 'non_workday'
                                ? 'bg-gray-100 text-gray-700'
                                : record.status === 'justified_absence'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {record.status === 'present'
                              ? 'Presente'
                              : record.status === 'vacation'
                              ? 'Em Férias'
                              : record.status === 'holiday'
                              ? 'Feriado'
                              : record.status === 'non_workday'
                              ? 'Não Trabalha'
                              : record.status === 'justified_absence'
                              ? 'Ausência Justificada'
                              : 'Ausente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {record.observation || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Resumo</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total de Dias Presentes:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {attendanceData.filter((r) => r.status === 'present').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Dias em Férias:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {attendanceData.filter((r) => r.status === 'vacation').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total de Faltas:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    {attendanceData.filter((r) => r.status === 'absent').length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Não Trabalha:</span>
                  <span className="ml-2 font-semibold text-gray-600">
                    {attendanceData.filter((r) => r.status === 'non_workday').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Feriados:</span>
                  <span className="ml-2 font-semibold text-purple-600">
                    {attendanceData.filter((r) => r.status === 'holiday').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Ausências Justificadas:</span>
                  <span className="ml-2 font-semibold text-yellow-600">
                    {attendanceData.filter((r) => r.status === 'justified_absence').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
