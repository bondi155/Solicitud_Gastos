"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Paper,
  InputAdornment,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import {
  Upload as UploadIcon,
  Close as CloseIcon,
  AttachMoney as AttachMoneyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import apiService from "../api/apiService"

export default function RequestForm({ onSubmit, onCancel }) {
  const [lines, setLines] = useState([])
  const [currentLine, setCurrentLine] = useState({
    category: "",
    amount: "",
    description: "",
  })

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    department: "",
    costCenter: "",
  })
  const [attachments, setAttachments] = useState([])

  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [users, setUsers] = useState([])
  const [loggedUser, setLoggedUser] = useState(null)
  const [loggedUserId, setLoggedUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setLoading(true)

        const userId = localStorage.getItem("userId")

        if (!userId) {
          setError("No se encontró un usuario logueado. Por favor inicie sesión.")
          setLoading(false)
          return
        }

        setLoggedUserId(Number.parseInt(userId))

        const [categoriesData, departmentsData, centersData, usersData] = await Promise.all([
          apiService.getCategories(),
          apiService.getDepartments(),
          apiService.getCenters(),
          apiService.getUsers(),
        ])

        const categoriesArray = Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || []
        const departmentsArray = Array.isArray(departmentsData) ? departmentsData : departmentsData?.data || []
        const centersArray = Array.isArray(centersData) ? centersData : centersData?.data || []
        const usersArray = Array.isArray(usersData) ? usersData : usersData?.data || []

        setCategories(categoriesArray)
        setDepartments(departmentsArray)
        setCostCenters(centersArray)
        setUsers(usersArray)

        const currentUser = usersArray.find((u) => u.id === Number.parseInt(userId))

        if (currentUser) {
          setLoggedUser(currentUser)
        } else {
          setError(`No se encontró el usuario con ID ${userId} en la base de datos.`)
        }

        if (categoriesArray.length === 0 || departmentsArray.length === 0) {
          setError("Advertencia: Algunas opciones no se cargaron. Verifique que existan datos en la base de datos.")
        } else {
          setError(null)
        }
      } catch (err) {
        console.error("[v0] Error fetching form data:", err)
        setCategories([])
        setDepartments([])
        setCostCenters([])
        setUsers([])
        setLoggedUser(null)
        setError(
          "Error al cargar datos desde la base de datos. Por favor recargue la página o contacte al administrador.",
        )
      } finally {
        setLoading(false)
      }
    }

    fetchFormData()
  }, [])

  const handleAddLine = () => {
    if (!currentLine.category || !currentLine.amount || !currentLine.description) {
      setError("Por favor complete todos los campos de la línea antes de agregar")
      return
    }

    const categoryName = categories.find((c) => c.id === currentLine.category)?.name || ""

    setLines([
      ...lines,
      {
        ...currentLine,
        categoryName,
        id: Date.now(), // ID temporal para identificar la línea
      },
    ])

    // Limpiar el formulario de línea actual
    setCurrentLine({
      category: "",
      amount: "",
      description: "",
    })
    setError(null)
  }

  const handleRemoveLine = (lineId) => {
    setLines(lines.filter((line) => line.id !== lineId))
  }

  const getTotalAmount = () => {
    return lines.reduce((sum, line) => sum + Number.parseFloat(line.amount || 0), 0).toFixed(2)
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setAttachments([...attachments, ...files])
  }

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      setError(null)

      if (lines.length === 0) {
        setError("Debe agregar al menos una línea de gasto antes de enviar la solicitud")
        setSubmitting(false)
        return
      }

      if (!loggedUserId) {
        setError("No se encontró un usuario logueado. Por favor inicie sesión.")
        setSubmitting(false)
        return
      }

      const formDataToSend = new FormData()

      formDataToSend.append("title", formData.title)
      formDataToSend.append("date", formData.date)
      formDataToSend.append("requester", loggedUser?.name || "")
      formDataToSend.append("department", formData.department)
      formDataToSend.append("costCenter", formData.costCenter || "")
      formDataToSend.append("userId", loggedUserId)
      formDataToSend.append("totalAmount", getTotalAmount())

      formDataToSend.append("lines", JSON.stringify(lines))

      attachments.forEach((file) => {
        formDataToSend.append("attachments", file)
      })

      const result = await apiService.createRequest(formDataToSend)

      alert("Solicitud creada exitosamente")

      if (onSubmit) {
        onSubmit(result)
      }

      // Limpiar formulario
      setFormData({
        title: "",
        date: "",
        department: "",
        costCenter: "",
      })
      setLines([])
      setCurrentLine({
        category: "",
        amount: "",
        description: "",
      })
      setAttachments([])
    } catch (err) {
      console.error("[v0] Error creating request:", err)
      setError(err.response?.data?.message || "Error al crear la solicitud. Por favor intente nuevamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Card sx={{ maxWidth: 1600, width: "80%", mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
          Nueva Solicitud de Gasto
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Complete los detalles de su solicitud de reembolso
        </Typography>

        {error && (
          <Alert severity={error.includes("Advertencia") ? "warning" : "error"} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Título de la Solicitud"
            placeholder="Ej: Viaje de negocios a cliente"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Solicitante"
              value={loggedUser?.name || "Cargando..."}
              disabled
              fullWidth
              helperText="Usuario logueado actualmente"
            />

            <TextField
              select
              label="Departamento"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
              fullWidth
            >
              <MenuItem value="">Seleccione un departamento</MenuItem>
              {departments
                .filter((dept) => dept.active)
                .map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              select
              label="Centro de Costos"
              value={formData.costCenter}
              onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
              fullWidth
            >
              <MenuItem value="">Seleccione un centro de costos</MenuItem>
              {costCenters
                .filter((cc) => cc.active)
                .map((cc) => (
                  <MenuItem key={cc.id} value={cc.code}>
                    {cc.code} - {cc.name}
                  </MenuItem>
                ))}
            </TextField>
          </Box>

          <TextField
            label="Fecha del Gasto"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Líneas de Gastos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Agregue cada gasto individualmente
            </Typography>

            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, p: 3, bgcolor: "action.hover", borderRadius: 2 }}
            >
              <TextField
                select
                label="Categoría"
                value={currentLine.category}
                onChange={(e) => setCurrentLine({ ...currentLine, category: e.target.value })}
                fullWidth
              >
                <MenuItem value="">Seleccione una categoría</MenuItem>
                {categories
                  .filter((cat) => cat.active)
                  .map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                label="Monto"
                type="number"
                placeholder="0.00"
                value={currentLine.amount}
                onChange={(e) => setCurrentLine({ ...currentLine, amount: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  inputProps: { step: "0.01" },
                }}
                fullWidth
              />

              <TextField
                label="Descripción"
                placeholder="Describa el gasto..."
                value={currentLine.description}
                onChange={(e) => setCurrentLine({ ...currentLine, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />

              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddLine} fullWidth>
                Agregar Línea
              </Button>
            </Box>

            {lines.length > 0 && (
              <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.categoryName}</TableCell>
                        <TableCell align="right">${Number.parseFloat(line.monto_total).toFixed(2)}</TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleRemoveLine(line.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Total
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          ${getTotalAmount()}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
              Adjuntar Comprobantes
            </Typography>
            <Paper
              sx={{
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <input
                type="file"
                id="file-upload"
                style={{ display: "none" }}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" style={{ cursor: "pointer", display: "block" }}>
                <UploadIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Haga clic para subir o arrastre archivos aquí
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF, Imágenes, Word, Excel hasta 10MB
                </Typography>
              </label>
            </Paper>

            {attachments.length > 0 && (
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                {attachments.map((file, index) => (
                  <Paper
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {file.name}
                    </Typography>
                    <IconButton size="small" onClick={() => removeAttachment(index)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 2, pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting || lines.length === 0}
            >
              {submitting ? <CircularProgress size={24} /> : `Enviar Solicitud (${lines.length} líneas)`}
            </Button>
            <Button type="button" variant="outlined" onClick={onCancel} size="large" disabled={submitting}>
              Cancelar
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
