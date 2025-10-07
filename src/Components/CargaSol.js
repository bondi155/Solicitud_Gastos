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
} from "@mui/material"
import { Upload as UploadIcon, Close as CloseIcon, AttachMoney as AttachMoneyIcon } from "@mui/icons-material"
import apiService from "../api/apiService"
export default function RequestForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "",
    description: "",
    date: "",
    department: "",
    costCenter: "",
    vendor: "",
  })
  const [attachments, setAttachments] = useState([])

  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [users, setUsers] = useState([]) // Added users state
  const [loggedUser, setLoggedUser] = useState(null) // Added state for logged user
  const [loggedUserId, setLoggedUserId] = useState(null) // Added state for logged user ID
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
        setUsers(usersArray) // Set users state

        const currentUser = usersArray.find((u) => u.id === Number.parseInt(userId))

        if (currentUser) {
          setLoggedUser(currentUser)
          console.log("[v0] Logged user found:", currentUser.name)
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
        setUsers([]) // Reset users on error
        setLoggedUser(null) // Reset logged user on error
        setError(
          "Error al cargar datos desde la base de datos. Por favor recargue la página o contacte al administrador.",
        )
      } finally {
        setLoading(false)
      }
    }

    fetchFormData()
  }, [])

  const handleFileChange = (e) => {
    console.log("[v0] File input changed, files:", e.target.files)
    const files = Array.from(e.target.files)
    console.log("[v0] Files array:", files)
    console.log("[v0] Files count:", files.length)
    setAttachments([...attachments, ...files])
    console.log("[v0] Attachments after update:", [...attachments, ...files])
  }

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      setError(null)

      if (!loggedUserId) {
        setError("No se encontró un usuario logueado. Por favor inicie sesión.")
        setSubmitting(false)
        return
      }

      console.log("[v0] Using logged userId:", loggedUserId)
      console.log("[v0] Current attachments state:", attachments)
      console.log("[v0] Attachments length:", attachments.length)

      const formDataToSend = new FormData()

      formDataToSend.append("title", formData.title)
      formDataToSend.append("amount", Number.parseFloat(formData.amount))
      formDataToSend.append("category", formData.category)
      formDataToSend.append("description", formData.description)
      formDataToSend.append("date", formData.date)
      formDataToSend.append("requester", loggedUser?.name || "")
      formDataToSend.append("department", formData.department)
      formDataToSend.append("costCenter", formData.costCenter || "")
      formDataToSend.append("vendor", formData.vendor || "")
      formDataToSend.append("userId", loggedUserId)

      attachments.forEach((file, index) => {
        console.log(`[v0] Appending file ${index}:`, file.name, file.size, file.type)
        formDataToSend.append("attachments", file)
      })

      console.log("[v0] Sending request with files:", attachments.length)
      console.log("[v0] FormData entries:")
      for (const pair of formDataToSend.entries()) {
        console.log(pair[0], pair[1])
      }

      const result = await apiService.createRequest(formDataToSend)

      console.log("[v0] Request created successfully:", result)

      alert("Solicitud creada exitosamente")

      if (onSubmit) {
        onSubmit(result)
      }

      setFormData({
        title: "",
        amount: "",
        category: "",
        description: "",
        date: "",
        department: "",
        costCenter: "",
        vendor: "",
      })
      setAttachments([])
    } catch (err) {
      console.error("[v0] Error creating request:", err)
      console.error("[v0] Error response:", err.response?.data)
      console.error("[v0] Error status:", err.response?.status)
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

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
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
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Monto"
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoneyIcon fontSize="small" />
                  </InputAdornment>
                ),
                inputProps: { step: "0.01" },
              }}
            />

            <TextField
              label="Fecha del Gasto"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              InputLabelProps={{ shrink: true }}
            />

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
            select
            label="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            fullWidth
          >
            <MenuItem value="">Seleccione una categoría</MenuItem>
            {categories
              .filter((cat) => cat.active)
              .map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
          </TextField>

          <TextField
            label="Proveedor / Comercio"
            placeholder="Nombre del proveedor o comercio"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            fullWidth
          />

          <TextField
            label="Descripción"
            placeholder="Describa el motivo del gasto..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            multiline
            rows={4}
            fullWidth
          />

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
            <Button type="submit" variant="contained" fullWidth size="large" disabled={submitting}>
              {submitting ? <CircularProgress size={24} /> : "Enviar Solicitud"}
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
