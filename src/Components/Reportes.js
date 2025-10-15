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
  Collapse,
  IconButton,
} from "@mui/material"
import {
  FileDownload as FileDownloadIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
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
  const [expandedRows, setExpandedRows] = useState({})

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
        const groupedData = response.data.reduce((acc, row) => {
          const existingRequest = acc.find((r) => r.id === row.id)

          if (existingRequest) {
            // Add line to existing request
            existingRequest.lines.push({
              id: row.lineId,
              category: row.category,
              description: row.description,
              amount: row.amount,
            })
          } else {
            // Create new request with first line
            acc.push({
              id: row.id,
              date: row.date,
              requester: row.requester,
              department: row.department,
              status: row.status,
              totalAmount: row.totalAmount || 0,
              lines: [
                {
                  id: row.lineId,
                  category: row.category,
                  description: row.description,
                  amount: row.amount,
                },
              ],
            })
          }

          return acc
        }, [])

        // Calculate total amount for each request
        groupedData.forEach((request) => {
          request.totalAmount = request.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
        })

        setReportData(groupedData)
        setShowResults(true)
        setExpandedRows({})
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Error al generar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (requestId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [requestId]: !prev[requestId],
    }))
  }

  const exportToExcel = () => {
    const csvRows = [
      ["Fecha", "Solicitante", "Departamento", "Monto Total", "Estado", "Categoría", "Descripción", "Monto Línea"],
    ]

    reportData.forEach((request) => {
      request.lines.forEach((line) => {
        csvRows.push([
          request.date,
          request.requester,
          request.department,
          request.totalAmount,
          request.status,
          line.category,
          line.description,
          line.amount,
        ])
      })
    })

    const csvContent = csvRows.map((row) => row.join(",")).join("\n")

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
    setExpandedRows({})
  }

  const totalAmount = reportData.reduce((sum, item) => sum + Number(item.totalAmount), 0)
  const totalRequests = reportData.length
  const averageAmount = totalRequests > 0 ? totalAmount / totalRequests : 0

  const categoryData = reportData.reduce((acc, request) => {
    if (request.lines && Array.isArray(request.lines)) {
      request.lines.forEach((line) => {
        acc[line.category] = (acc[line.category] || 0) + Number(line.amount || 0)
      })
    }
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
                      <TableCell sx={{ fontWeight: 600, width: 50 }} />
                      <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Solicitante</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Departamento</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        Monto Total
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">
                        Estado
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No se encontraron resultados con los filtros seleccionados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((request) => (
                        <>
                          <TableRow key={request.id} hover sx={{ cursor: "pointer" }}>
                            <TableCell>
                              <IconButton size="small" onClick={() => toggleRow(request.id)}>
                                {expandedRows[request.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </TableCell>
                            <TableCell onClick={() => toggleRow(request.id)}>
                              {new Date(request.date).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </TableCell>
                            <TableCell onClick={() => toggleRow(request.id)}>{request.requester}</TableCell>
                            <TableCell onClick={() => toggleRow(request.id)}>{request.department}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }} onClick={() => toggleRow(request.id)}>
                              ${Number(request.totalAmount).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell align="center" onClick={() => toggleRow(request.id)}>
                              <Chip label={request.status} color={getStatusColor(request.status)} size="small" />
                            </TableCell>
                          </TableRow>
                          <TableRow key={`collapse-${request.id}`}>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                              <Collapse in={expandedRows[request.id]} timeout="auto" unmountOnExit>
                                <Box sx={{ margin: 2 }}>
                                  <Typography variant="h6" gutterBottom component="div" sx={{ mb: 2 }}>
                                    Líneas de Gasto
                                  </Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ backgroundColor: "grey.50" }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">
                                          Monto
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {request.lines.map((line) => (
                                        <TableRow key={line.id}>
                                          <TableCell>{line.category}</TableCell>
                                          <TableCell>{line.description}</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 500 }}>
                                            ${Number(line.amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
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
