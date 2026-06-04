"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  InputAdornment,
  CircularProgress,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
} from "@mui/icons-material"
import apiService from "../api/apiService"
export default function Configuration() {
  const [activeTab, setActiveTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState("add")
  const [dialogType, setDialogType] = useState("")
  const [selectedItem, setSelectedItem] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")

  const [searchCategory, setSearchCategory] = useState("")
  const [searchDepartment, setSearchDepartment] = useState("")
  const [searchCostCenter, setSearchCostCenter] = useState("")
  const [searchArticle, setSearchArticle] = useState("")
  const [searchProvider, setSearchProvider] = useState("")
  const [searchWarehouse, setSearchWarehouse] = useState("")
  const [searchUser, setSearchUser] = useState("")

  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [articles, setArticles] = useState([])
  const [providers, setProviders] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({})

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        setLoading(true)
        const [categoriesData, departmentsData, centersData, articlesData, providersData, warehousesData, usersData] = await Promise.all([
          apiService.getCategories(),
          apiService.getDepartments(),
          apiService.getCenters(),
          apiService.getArticles(),
          apiService.getProviders(),
          apiService.getWarehouses(),
          apiService.getUsers(),
        ])

        setCategories(categoriesData.data || [])
        setDepartments(departmentsData.data || [])
        setCostCenters(centersData.data || [])
        setArticles(articlesData.data || [])
        setProviders(providersData.data || [])
        setWarehouses(warehousesData.data || [])
        setUsers(usersData.data || [])
        setError(null)
      } catch (err) {
        console.error("[v0] Error fetching configuration data:", err)
        setError("Error al cargar los datos de configuración")
      } finally {
        setLoading(false)
      }
    }

    fetchConfigData()
  }, [])

  const getFilteredCategories = () => {
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchCategory.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchCategory.toLowerCase()),
    )
  }

  const getFilteredDepartments = () => {
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(searchDepartment.toLowerCase()) ||
        dept.manager.toLowerCase().includes(searchDepartment.toLowerCase()),
    )
  }

  const getFilteredCostCenters = () => {
    return costCenters.filter(
      (cc) =>
        (cc.code || "").toLowerCase().includes(searchCostCenter.toLowerCase()) ||
        (cc.name || "").toLowerCase().includes(searchCostCenter.toLowerCase()),
    )
  }

  const getFilteredArticles = () => {
    return articles.filter(
      (article) =>
        (article.code || "").toLowerCase().includes(searchArticle.toLowerCase()) ||
        (article.name || "").toLowerCase().includes(searchArticle.toLowerCase()) ||
        (article.category || "").toLowerCase().includes(searchArticle.toLowerCase()),
    )
  }

  const getFilteredProviders = () => {
    return providers.filter(
      (provider) =>
        (provider.name || "").toLowerCase().includes(searchProvider.toLowerCase()) ||
        (provider.razon_social || "").toLowerCase().includes(searchProvider.toLowerCase()) ||
        (provider.rfc || "").toLowerCase().includes(searchProvider.toLowerCase()),
    )
  }

  const getFilteredWarehouses = () => {
    return warehouses.filter(
      (warehouse) =>
        (warehouse.code || "").toLowerCase().includes(searchWarehouse.toLowerCase()) ||
        (warehouse.name || "").toLowerCase().includes(searchWarehouse.toLowerCase()),
    )
  }

  const getFilteredUsers = () => {
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
        user.email.toLowerCase().includes(searchUser.toLowerCase()) ||
        user.role.toLowerCase().includes(searchUser.toLowerCase()) ||
        user.department.toLowerCase().includes(searchUser.toLowerCase()),
    )
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const handleOpenDialog = (type, mode, item = null) => {
    setDialogType(type)
    setDialogMode(mode)
    setSelectedItem(item)

    if (mode === "edit" && item) {
      setFormData(item)
    } else {
      setFormData({})
    }

    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData({})
    setSelectedItem(null)
  }

   const handleSave = async () => {
    try {
      setSubmitting(true)

      if (dialogMode === "add") {
        switch (dialogType) {
          case "category":
            await apiService.createCategory(formData)
            const categoriesData = await apiService.getCategories()
            setCategories(categoriesData.data || [])
            break
          case "department":
            await apiService.createDepartment(formData)
            const departmentsData = await apiService.getDepartments()
            setDepartments(departmentsData.data || [])
            break
          case "costCenter":
            const costCenterData = {
              codigo: formData.code,
              nombre: formData.name,
              descripcion: formData.description,
              activo: formData.active !== undefined ? formData.active : 1,
            }
            await apiService.createCenter(costCenterData)
            const centersData = await apiService.getCenters()
            setCostCenters(centersData.data || [])
            break
          case "article":
            await apiService.createArticle(formData)
            const articlesDataAdd = await apiService.getArticles()
            setArticles(articlesDataAdd.data || [])
            break
          case "provider":
            await apiService.createProvider(formData)
            const providersDataAdd = await apiService.getProviders()
            setProviders(providersDataAdd.data || [])
            break
          case "warehouse":
            await apiService.createWarehouse(formData)
            const warehousesDataAdd = await apiService.getWarehouses()
            setWarehouses(warehousesDataAdd.data || [])
            break
          case "user":
            await apiService.createUser(formData)
            const usersData = await apiService.getUsers()
            setUsers(usersData.data || [])
            break
          default:
            console.warn("[v0] Unknown dialog type:", dialogType)
            break
        }
        setSuccessMessage("Registro agregado exitosamente")
      } else {
        switch (dialogType) {
          case "category":
            await apiService.updateCategory(selectedItem.id, formData)
            const categoriesData = await apiService.getCategories()
            setCategories(categoriesData.data || [])
            break
          case "department":
            await apiService.updateDepartment(selectedItem.id, formData)
            const departmentsData = await apiService.getDepartments()
            setDepartments(departmentsData.data || [])
            break
          case "costCenter":
            const costCenterUpdateData = {
              codigo: formData.code,
              nombre: formData.name,
              descripcion: formData.description,
              activo: formData.active,
            }
            await apiService.updateCenter(selectedItem.id, costCenterUpdateData)
            const centersData = await apiService.getCenters()
            setCostCenters(centersData.data || [])
            break
          case "article":
            await apiService.updateArticle(selectedItem.id, formData)
            const articlesDataUpdate = await apiService.getArticles()
            setArticles(articlesDataUpdate.data || [])
            break
          case "provider":
            await apiService.updateProvider(selectedItem.id, formData)
            const providersDataUpdate = await apiService.getProviders()
            setProviders(providersDataUpdate.data || [])
            break
          case "warehouse":
            await apiService.updateWarehouse(selectedItem.id, formData)
            const warehousesDataUpdate = await apiService.getWarehouses()
            setWarehouses(warehousesDataUpdate.data || [])
            break
          case "user":
            await apiService.updateUser(selectedItem.id, formData)
            const usersData = await apiService.getUsers()
            setUsers(usersData.data || [])
            break
          default:
            console.warn("[v0] Unknown dialog type:", dialogType)
            break
        }
        setSuccessMessage("Registro actualizado exitosamente")
      }

      handleCloseDialog()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("[v0] Error saving data:", err)
      alert("Error al guardar. Por favor intente nuevamente.")
    } finally {
      setSubmitting(false)
    }
  }

 const handleDelete = async (type, id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este registro?")) {
      try {
        setSubmitting(true)
        console.log("[v0] Attempting to delete:", { type, id })

        switch (type) {
          case "category":
            await apiService.deleteCategory(id)
            setCategories(categories.filter((item) => item.id !== id))
            break
          case "department":
            await apiService.deleteDepartment(id)
            setDepartments(departments.filter((item) => item.id !== id))
            break
          case "costCenter":
            console.log("[v0] Deleting cost center with ID:", id)
            await apiService.deleteCenter(id)
            setCostCenters(costCenters.filter((item) => item.id !== id))
            break
          case "article":
            await apiService.deleteArticle(id)
            setArticles(articles.filter((item) => item.id !== id))
            break
          case "provider":
            await apiService.deleteProvider(id)
            setProviders(providers.filter((item) => item.id !== id))
            break
          case "warehouse":
            await apiService.deleteWarehouse(id)
            setWarehouses(warehouses.filter((item) => item.id !== id))
            break
          case "user":
            await apiService.deleteUser(id)
            setUsers(users.filter((item) => item.id !== id))
            break
          default:
            console.warn("[v0] Unknown type:", type)
            break
        }

        console.log("[v0] Delete successful")
        setSuccessMessage("Registro eliminado exitosamente")
        setTimeout(() => setSuccessMessage(""), 3000)
      } catch (err) {
        console.error("[v0] Error deleting data:", err)
        console.error("[v0] Error details:", err.response?.data)
        alert("Error al eliminar. Por favor intente nuevamente.")
      } finally {
        setSubmitting(false)
      }
    }
  }


  const getCurrentData = () => {
    switch (dialogType) {
      case "category":
        return categories
      case "department":
        return departments
      case "costCenter":
        return costCenters
      case "article":
        return articles
      case "provider":
        return providers
      case "warehouse":
        return warehouses
      case "user":
        return users
      default:
        return []
    }
  }

  const renderDialogContent = () => {
    switch (dialogType) {
      case "category":
        return (
          <>
            <TextField
              fullWidth
              label="Nombre de la categoría"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Descripción"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </>
        )

      case "department":
        return (
          <>
            <TextField
              fullWidth
              label="Nombre del departamento"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Responsable"
              value={formData.manager || ""}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              margin="normal"
              required
            />
          </>
        )

      case "costCenter":
        return (
          <>
            <TextField
              fullWidth
              label="Código"
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Nombre"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Descripción"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </>
        )

      case "article":
        return (
          <>
            <TextField fullWidth label="Código/SKU" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} margin="normal" required />
            <TextField fullWidth label="Nombre" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
            <TextField fullWidth label="Descripción" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" multiline rows={2} />
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoría</InputLabel>
              <Select value={formData.categoria_id || ""} onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })} label="Categoría">
                <MenuItem value="">Sin categoría</MenuItem>
                {categories.map((cat) => (<MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Unidad de Medida</InputLabel>
              <Select value={formData.unit || "PZA"} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} label="Unidad de Medida">
                <MenuItem value="PZA">Pieza</MenuItem>
                <MenuItem value="KG">Kilogramo</MenuItem>
                <MenuItem value="LT">Litro</MenuItem>
                <MenuItem value="M">Metro</MenuItem>
                <MenuItem value="SERV">Servicio</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Precio Unitario" type="number" value={formData.price || ""} onChange={(e) => setFormData({ ...formData, price: e.target.value })} margin="normal" inputProps={{ step: "0.01" }} />
          </>
        )

      case "provider":
        return (
          <>
            <TextField fullWidth label="Nombre Comercial" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
            <TextField fullWidth label="Razón Social" value={formData.razon_social || ""} onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })} margin="normal" required />
            <TextField fullWidth label="RFC" value={formData.rfc || ""} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} margin="normal" />
            <TextField fullWidth label="Dirección" value={formData.direccion || ""} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} margin="normal" />
            <TextField fullWidth label="Teléfono" value={formData.telefono || ""} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} margin="normal" />
            <TextField fullWidth label="Email" type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} margin="normal" />
            <TextField fullWidth label="Contacto Principal" value={formData.contacto_principal || ""} onChange={(e) => setFormData({ ...formData, contacto_principal: e.target.value })} margin="normal" />
          </>
        )

      case "warehouse":
        return (
          <>
            <TextField fullWidth label="Código" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} margin="normal" required />
            <TextField fullWidth label="Nombre" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
            <TextField fullWidth label="Descripción" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" multiline rows={2} />
            <TextField fullWidth label="Dirección" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} margin="normal" />
            <TextField fullWidth label="Responsable" value={formData.manager || ""} onChange={(e) => setFormData({ ...formData, manager: e.target.value })} margin="normal" />
            <TextField fullWidth label="Teléfono" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} margin="normal" />
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo</InputLabel>
              <Select value={formData.type || ""} onChange={(e) => setFormData({ ...formData, type: e.target.value })} label="Tipo">
                <MenuItem value="">Sin especificar</MenuItem>
                <MenuItem value="Principal">Principal</MenuItem>
                <MenuItem value="Secundario">Secundario</MenuItem>
                <MenuItem value="Tránsito">Tránsito</MenuItem>
              </Select>
            </FormControl>
          </>
        )

      case "user":
        return (
          <>
            <TextField
              fullWidth
              label="Nombre completo"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
            />
              <TextField
              fullWidth
              label={dialogMode === "add" ? "Contraseña" : "Contraseña (dejar vacío para no cambiar)"}
              type="password"
              value={formData.password || ""}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required={dialogMode === "add"}
              helperText={
                dialogMode === "add" ? "Mínimo 6 caracteres" : "Solo completar si desea cambiar la contraseña"
              }
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Rol</InputLabel>
              <Select
                value={formData.role || ""}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Rol"
              >
                <MenuItem value="Solicitante">Solicitante</MenuItem>
                <MenuItem value="Aprobador">Aprobador</MenuItem>
                <MenuItem value="Admin">Administrador</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Departamento</InputLabel>
              <Select
                value={formData.department || ""}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                label="Departamento"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )

      default:
        return null
    }
  }

  const getDialogTitle = () => {
    const typeNames = {
      category: "Categoría",
      department: "Departamento",
      costCenter: "Centro de Costos",
      article: "Artículo",
      provider: "Proveedor",
      warehouse: "Almacén",
      user: "Usuario",
    }

    return `${dialogMode === "add" ? "Agregar" : "Editar"} ${typeNames[dialogType]}`
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 1600, width: "80%", margin: "0 auto", padding: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 40, color: "primary.main" }} />
        <Typography variant="h4" component="h1" fontWeight="bold">
          Configuración del Sistema
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tab label="Categorías" />
            <Tab label="Departamentos" />
            <Tab label="Centros de Costos" />
            <Tab label="Artículos" />
            <Tab label="Proveedores" />
            <Tab label="Almacenes" />
            <Tab label="Usuarios" />
          </Tabs>

          {/* Tab 1: Categorías */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Categorías de Gastos</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar categorías..."
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog("category", "add")}
                  >
                    Agregar
                  </Button>
                </Box>
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 500,
                  overflow: "auto",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#888",
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: "#555",
                    },
                  },
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Descripción</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredCategories().map((category) => (
                      <TableRow key={category.id} hover>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={category.active ? "Activo" : "Inactivo"}
                            color={category.active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog("category", "edit", category)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("category", category.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredCategories().length} de {categories.length} categorías
              </Typography>
            </Box>
          )}

          {/* Tab 2: Departamentos */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Departamentos</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar departamentos..."
                    value={searchDepartment}
                    onChange={(e) => setSearchDepartment(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog("department", "add")}
                  >
                    Agregar
                  </Button>
                </Box>
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 500,
                  overflow: "auto",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#888",
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: "#555",
                    },
                  },
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Responsable</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredDepartments().map((dept) => (
                      <TableRow key={dept.id} hover>
                        <TableCell>{dept.name}</TableCell>
                        <TableCell>{dept.manager}</TableCell>
                        <TableCell>
                          <Chip
                            label={dept.active ? "Activo" : "Inactivo"}
                            color={dept.active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog("department", "edit", dept)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("department", dept.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredDepartments().length} de {departments.length} departamentos
              </Typography>
            </Box>
          )}

          {/* Tab 3: Centros de Costos */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Centros de Costos</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar centros de costos..."
                    value={searchCostCenter}
                    onChange={(e) => setSearchCostCenter(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog("costCenter", "add")}
                  >
                    Agregar
                  </Button>
                </Box>
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 500,
                  overflow: "auto",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#888",
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: "#555",
                    },
                  },
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Código</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Descripción</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredCostCenters().map((cc) => (
                      <TableRow key={cc.id} hover>
                        <TableCell>{cc.code}</TableCell>
                        <TableCell>{cc.name}</TableCell>
                        <TableCell>{cc.description || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            label={cc.active ? "Activo" : "Inactivo"}
                            color={cc.active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog("costCenter", "edit", cc)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("costCenter", cc.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredCostCenters().length} de {costCenters.length} centros de costos
              </Typography>
            </Box>
          )}

          {/* Tab 3: Artículos */}
          {activeTab === 3 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Artículos/Productos</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar artículos..."
                    value={searchArticle}
                    onChange={(e) => setSearchArticle(e.target.value)}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("article", "add")}>Agregar</Button>
                </Box>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Código/SKU</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Categoría</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Unidad</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Precio</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredArticles().map((article) => (
                      <TableRow key={article.id} hover>
                        <TableCell>{article.code}</TableCell>
                        <TableCell>{article.name}</TableCell>
                        <TableCell>{article.category || '-'}</TableCell>
                        <TableCell>{article.unit}</TableCell>
                        <TableCell align="right">${Number(article.price || 0).toFixed(2)}</TableCell>
                        <TableCell><Chip label={article.active ? "Activo" : "Inactivo"} color={article.active ? "success" : "default"} size="small" /></TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog("article", "edit", article)}><EditIcon /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("article", article.id)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredArticles().length} de {articles.length} artículos
              </Typography>
            </Box>
          )}

          {/* Tab 4: Proveedores */}
          {activeTab === 4 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Proveedores</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar proveedores..."
                    value={searchProvider}
                    onChange={(e) => setSearchProvider(e.target.value)}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("provider", "add")}>Agregar</Button>
                </Box>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre Comercial</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Razón Social</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>RFC</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Teléfono</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Email</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredProviders().map((provider) => (
                      <TableRow key={provider.id} hover>
                        <TableCell>{provider.name}</TableCell>
                        <TableCell>{provider.razon_social}</TableCell>
                        <TableCell>{provider.rfc || '-'}</TableCell>
                        <TableCell>{provider.telefono || '-'}</TableCell>
                        <TableCell>{provider.email || '-'}</TableCell>
                        <TableCell><Chip label={provider.active ? "Activo" : "Inactivo"} color={provider.active ? "success" : "default"} size="small" /></TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog("provider", "edit", provider)}><EditIcon /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("provider", provider.id)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredProviders().length} de {providers.length} proveedores
              </Typography>
            </Box>
          )}

          {/* Tab 5: Almacenes */}
          {activeTab === 5 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Almacenes</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar almacenes..."
                    value={searchWarehouse}
                    onChange={(e) => setSearchWarehouse(e.target.value)}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("warehouse", "add")}>Agregar</Button>
                </Box>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Código</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Responsable</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Teléfono</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Tipo</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredWarehouses().map((warehouse) => (
                      <TableRow key={warehouse.id} hover>
                        <TableCell>{warehouse.code}</TableCell>
                        <TableCell>{warehouse.name}</TableCell>
                        <TableCell>{warehouse.manager || '-'}</TableCell>
                        <TableCell>{warehouse.phone || '-'}</TableCell>
                        <TableCell>{warehouse.type || '-'}</TableCell>
                        <TableCell><Chip label={warehouse.active ? "Activo" : "Inactivo"} color={warehouse.active ? "success" : "default"} size="small" /></TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog("warehouse", "edit", warehouse)}><EditIcon /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("warehouse", warehouse.id)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredWarehouses().length} de {warehouses.length} almacenes
              </Typography>
            </Box>
          )}

          {/* Tab 6: Usuarios */}
          {activeTab === 6 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6">Usuarios del Sistema</Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Buscar usuarios..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 250 }}
                  />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("user", "add")}>
                    Agregar
                  </Button>
                </Box>
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 500,
                  overflow: "auto",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#888",
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: "#555",
                    },
                  },
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Nombre</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Email</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Rol</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Departamento</TableCell>
                      <TableCell sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>Estado</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: "grey.100", fontWeight: "bold" }}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredUsers().map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            color={
                              user.role === "Administrador"
                                ? "error"
                                : user.role === "Aprobador"
                                  ? "warning"
                                  : "primary"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.active ? "Activo" : "Inactivo"}
                            color={user.active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog("user", "edit", user)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("user", user.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Mostrando {getFilteredUsers().length} de {users.length} usuarios
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Agregar/Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>{renderDialogContent()}</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
