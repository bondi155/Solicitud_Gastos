import { 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Chip,
  Container 
} from "@mui/material"
import Grid from '@mui/material/Grid2' // Grid2 en MUI v6
import {
  TrendingUp as TrendingUpIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as DollarSignIcon,
  Add as PlusIcon,
  Description as FileTextIcon,
} from "@mui/icons-material"
import Chart from "react-apexcharts"

export function DashboardHome() {
  // Datos de ejemplo - estos vendrán de tu API MySQL
  const stats = {
    totalRequests: 156,
    pending: 23,
    approved: 118,
    rejected: 15,
    totalAmount: 45280.5,
    monthlyTrend: 12.5, // porcentaje
  }

  // Datos para gráfico de solicitudes por mes (últimos 6 meses)
  const monthlyRequestsData = {
    series: [
      {
        name: "Solicitudes",
        data: [18, 25, 31, 28, 35, 42],
      },
    ],
    options: {
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ["#6366f1"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
        },
      },
      xaxis: {
        categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      },
      yaxis: {
        title: { text: "Cantidad" },
      },
      tooltip: {
        y: {
          formatter: (val) => `${val} solicitudes`,
        },
      },
    },
  }

  // Datos para gráfico de gastos por categoría
  const categoryData = {
    series: [35, 25, 20, 12, 8],
    options: {
      chart: {
        type: "donut",
      },
      labels: ["Viáticos", "Transporte", "Alimentación", "Hospedaje", "Otros"],
      colors: ["#4f46e5", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"],
      legend: {
        position: "bottom",
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val.toFixed(0)}%`,
      },
      tooltip: {
        y: {
          formatter: (val) => `${val}%`,
        },
      },
    },
  }

  // Datos para gráfico de montos mensuales
  const monthlyAmountsData = {
    series: [
      {
        name: "Monto Total",
        data: [5200, 6800, 7500, 6200, 8100, 9400],
      },
    ],
    options: {
      chart: {
        type: "bar",
        toolbar: { show: false },
      },
      colors: ["#22c55e"],
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "60%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      },
      yaxis: {
        title: { text: "Monto ($)" },
        labels: {
          formatter: (val) => `$${val.toLocaleString()}`,
        },
      },
      tooltip: {
        y: {
          formatter: (val) => `$${val.toLocaleString()}`,
        },
      },
    },
  }

  // Últimas solicitudes - estos datos vendrán de tu API
  const recentRequests = [
    { id: 1, employee: "Juan Pérez", category: "Viáticos", amount: 450.0, status: "pending", date: "2024-01-15" },
    { id: 2, employee: "María García", category: "Transporte", amount: 120.5, status: "approved", date: "2024-01-14" },
    { id: 3, employee: "Carlos López", category: "Alimentación", amount: 85.0, status: "approved", date: "2024-01-14" },
    { id: 4, employee: "Ana Martínez", category: "Hospedaje", amount: 890.0, status: "pending", date: "2024-01-13" },
    { id: 5, employee: "Pedro Sánchez", category: "Otros", amount: 250.0, status: "rejected", date: "2024-01-12" },
  ]

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bgcolor: "#fef3c7", color: "#92400e" },
      approved: { bgcolor: "#d1fae5", color: "#065f46" },
      rejected: { bgcolor: "#fee2e2", color: "#991b1b" },
    }
    const labels = {
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
    }
    return (
      <Chip
        label={labels[status]}
        size="small"
        sx={{
          ...styles[status],
          fontWeight: 500,
          fontSize: "0.75rem",
        }}
      />
    )
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 3 }}>
      <Container maxWidth="xl"> {/* Esto controla el ancho - lg = 1280px */}
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resumen de solicitudes de gastos
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<PlusIcon />}>
            Nueva Solicitud
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Total Solicitudes
                  </Typography>
                  <FileTextIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  {stats.totalRequests}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: "#22c55e", mr: 0.5 }} />
                  <Typography variant="caption" color="#22c55e">
                    +{stats.monthlyTrend}% este mes
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Pendientes
                  </Typography>
                  <ClockIcon sx={{ fontSize: 20, color: "#eab308" }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  {stats.pending}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Requieren aprobación
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Aprobadas
                  </Typography>
                  <CheckCircleIcon sx={{ fontSize: 20, color: "#22c55e" }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  {stats.approved}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {((stats.approved / stats.totalRequests) * 100).toFixed(1)}% del total
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Monto Total
                  </Typography>
                  <DollarSignIcon sx={{ fontSize: 20, color: "#22c55e" }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  ${stats.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Este mes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Solicitudes por mes */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" fontWeight={600}>
                    Solicitudes por Mes
                  </Typography>
                }
              />
              <CardContent>
                <Chart
                  options={{
                    ...monthlyRequestsData.options,
                    stroke: { curve: "smooth", width: 3 },
                    colors: ["#4f46e5"],
                  }}
                  series={monthlyRequestsData.series}
                  type="area"
                  height={253}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Gastos por categoría */}
          <Grid size={{ xs: 12, lg: 6}}>
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" fontWeight={600}>
                    Gastos por Categoría
                  </Typography>
                }
              />
              <CardContent>
                <Chart options={categoryData.options} series={categoryData.series} type="donut" height={300} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Montos mensuales */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={600}>
                Montos Mensuales
              </Typography>
            }
          />
          <CardContent>
            <Chart options={monthlyAmountsData.options} series={monthlyAmountsData.series} type="bar" height={300} />
          </CardContent>
        </Card>

        {/* Últimas solicitudes */}
        <Card>
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={600}>
                Últimas Solicitudes
              </Typography>
            }
          />
          <CardContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recentRequests.map((request) => (
                <Paper
                  key={request.id}
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      {request.employee}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {request.category}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body1" fontWeight={600}>
                        ${request.amount.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {request.date}
                      </Typography>
                    </Box>
                    {getStatusBadge(request.status)}
                  </Box>
                </Paper>
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" fullWidth>
                Ver Todas las Solicitudes
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default DashboardHome