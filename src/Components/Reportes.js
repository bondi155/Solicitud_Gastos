"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material"
import {
  FileDownload as FileDownloadIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
} from "@mui/icons-material"
import Chart from "react-apexcharts"
import apiService from "../api/apiService"
export default function Reports() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    department: "",
    category: "",
    status: "",
  })

  const [reportData, setReportData] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])

  const statuses = ["Pendiente", "Aprobada", "Rechazada"]

  useEffect(() => {
    loadDropdownData()
  }, [])

  const loadDropdownData = async () => {
    try {
      const [deptResponse, catResponse] = await Promise.all([apiService.getDepartments(), apiService.getCategories()])

      if (deptResponse.success) {
        setDepartments(deptResponse.data.map((d) => d.name))
      }
      if (catResponse.success) {
        setCategories(catResponse.data.map((c) => c.name))
      }
    } catch (error) {
      console.error("Error loading dropdown data:", error)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const generateReport = async () => {
    setLoading(true)
    try {
      const response = await apiService.getReports(filters)

      if (response.success) {
        setReportData(response.data)
        setShowResults(true)
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Error al generar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const csvContent = [
      ["Fecha", "Solicitante", "Departamento", "Categoría", "Monto", "Estado", "Descripción"],
      ...reportData.map((row) => [
        row.date,
        row.requester,
        row.department,
        row.category,
        row.amount,
        row.status,
        row.description,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte_gastos_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      department: "",
      category: "",
      status: "",
    })
    setShowResults(false)
    setReportData([])
  }

  const totalAmount = reportData.reduce((sum, item) => sum + Number(item.amount), 0)
  const totalRequests = reportData.length
  const averageAmount = totalRequests > 0 ? totalAmount / totalRequests : 0

  const categoryData = reportData.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount)
    return acc
  }, {})

  const chartOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: Object.keys(categoryData),
    },
    yaxis: {
      title: {
        text: "Monto ($)",
      },
    },
    colors: ["#1976d2"],
    fill: {
      opacity: 1,
    },
  }

  const chartSeries = [
    {
      name: "Gastos",
      data: Object.values(categoryData),
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case "Aprobada":
        return "success"
      case "Pendiente":
        return "warning"
      case "Rechazada":
        return "error"
      default:
        return "default"
    }
  }

  return (
    <Box sx={{ maxWidth: 1600, margin: "0 auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        <AssessmentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Reportes de Gastos
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros de Búsqueda
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha Inicio"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha Fin"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Departamento</InputLabel>
                <Select
                  value={filters.department}
                  label="Departamento"
                  onChange={(e) => handleFilterChange("department", e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={filters.category}
                  label="Categoría"
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.status}
                  label="Estado"
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={9} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Button variant="contained" onClick={generateReport} startIcon={<AssessmentIcon />}>
                Generar Reporte
              </Button>
              <Button variant="outlined" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
              {loading && (
                <Typography variant="body2" color="text.secondary">
                  Cargando...
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {showResults && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Total Gastado
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                        ${totalAmount.toLocaleString()}
                      </Typography>
                    </Box>
                    <AttachMoneyIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Total Solicitudes
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                        {totalRequests}
                      </Typography>
                    </Box>
                    <ReceiptIcon sx={{ fontSize: 48, color: "success.main", opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Promedio por Solicitud
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                        ${averageAmount.toFixed(0).toLocaleString()}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 48, color: "warning.main", opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {Object.keys(categoryData).length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gastos por Categoría
                </Typography>
                <Chart options={chartOptions} series={chartSeries} type="bar" height={300} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Detalle de Solicitudes</Typography>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportToExcel}
                  disabled={reportData.length === 0}
                >
                  Exportar a Excel
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "grey.100" }}>
                      <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Solicitante</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Departamento</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        Monto
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">
                        Estado
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No se encontraron resultados con los filtros seleccionados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.requester}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ${row.amount.toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={row.status} color={getStatusColor(row.status)} size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}
