"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  Chip,
  Paper,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material";
import apiService from "../api/apiService";
export default function RequestsList({ requests }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [comments, setComments] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [actionType, setActionType] = useState(null);

  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);

  const [editingLineId, setEditingLineId] = useState(null);
  const [editingProvider, setEditingProvider] = useState("");

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();

      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data && Array.isArray(data.data)) {
        setCategories(data.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      setCategories([]);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;

      const data = await apiService.getRequestsList(params);

      if (Array.isArray(data)) {
        setRequestsList(data);
      } else if (data && Array.isArray(data.data)) {
        setRequestsList(data.data);
      } else if (data && Array.isArray(data.requests)) {
        setRequestsList(data.requests);
      } else {
        console.error("[v0] API response is not an array:", data);
        setRequestsList([]);
      }

      setError(null);
    } catch (err) {
      console.error("[v0] Error fetching requests:", err);
      setError("Error al cargar las solicitudes");
      setRequestsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, categoryFilter]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: "warning", label: "Pendiente" },
      Pendiente: { color: "warning", label: "Pendiente" },
      approved: { color: "success", label: "Aprobado" },
      Aprobado: { color: "success", label: "Aprobado" },
      Aprobada: { color: "success", label: "Aprobada" },
      rejected: { color: "error", label: "Rechazado" },
      Rechazado: { color: "error", label: "Rechazado" },
      Rechazada: { color: "error", label: "Rechazada" },
    };

    const result = configs[status] || configs.pending;
    return result;
  };

  const filteredRequests = requestsList.filter((req) => {
    const matchesSearch =
      (req.titulo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(req.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.submittedBy || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleViewDetails = async (request) => {
    try {
      const fullRequest = await apiService.getRequestDetail(request.id);

      setSelectedRequest(fullRequest.data);
      setOpenDialog(true);
      setComments("");
      setShowConfirmation(false);
      setActionType(null);
      setEditingLineId(null);
      setEditingProvider("");
    } catch (err) {
      console.error("[v0] Error fetching request details:", err);
      alert("Error al cargar los detalles de la solicitud");
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequest(null);
    setComments("");
    setShowConfirmation(false);
    setActionType(null);
    setEditingLineId(null);
    setEditingProvider("");
  };

  const handleActionClick = (type) => {
    if (type === "reject" && !comments.trim()) {
      alert("Debes agregar un comentario para rechazar la solicitud");
      return;
    }
    setActionType(type);
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    try {
      setSubmitting(true);

      const userId = localStorage.getItem("userId") || 1;

      if (actionType === "approve") {
        await apiService.approveRequest(selectedRequest.id, comments, userId);
        alert("Solicitud aprobada exitosamente");
      } else {
        await apiService.rejectRequest(selectedRequest.id, comments, userId);
        alert("Solicitud rechazada exitosamente");
      }

      await fetchRequests();

      handleCloseDialog();
    } catch (err) {
      console.error("[v0] Error processing request:", err);
      alert("Error al procesar la solicitud. Por favor intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAction = () => {
    setShowConfirmation(false);
    setActionType(null);
  };

  const handleEditLine = (line) => {
    setEditingLineId(line.id);
    setEditingProvider(line.proveedor || "");
  };

  const handleSaveLineProvider = async (lineId) => {
    try {
      await apiService.updateLineProvider(lineId, editingProvider);

      // Refresh request details
      const fullRequest = await apiService.getRequestDetail(selectedRequest.id);
      setSelectedRequest(fullRequest.data);

      setEditingLineId(null);
      setEditingProvider("");
      alert("Proveedor actualizado exitosamente");
    } catch (err) {
      console.error("[v0] Error updating provider:", err);
      alert("Error al actualizar el proveedor");
    }
  };

  const handleGeneratePurchaseOrder = () => {
    // Check if all lines have providers
    const allLinesHaveProvider = selectedRequest.lines?.every(
      (line) => line.proveedor
    );

    if (!allLinesHaveProvider) {
      alert("Todas las líneas deben tener un proveedor asignado");
      return;
    }

    // TODO: Call API to generate purchase order
    alert("Orden de compra generada exitosamente");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: "1600px",
        width: "80%",
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            <TextField
              placeholder="Buscar por título, ID o solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">Todos los estados</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="approved">Aprobado</MenuItem>
              <MenuItem value="rejected">Rechazado</MenuItem>
            </TextField>
            <TextField
              select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">Todas las categorías</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={600}>
                Solicitudes de Gastos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredRequests.length} solicitud
                {filteredRequests.length !== 1 ? "es" : ""} encontrada
                {filteredRequests.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                size="small"
              >
                Exportar
              </Button>
              <Button
                variant="outlined"
                onClick={fetchRequests}
                size="small"
                disabled={loading}
              >
                Refrescar
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              maxHeight: "600px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pr: 1,
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: "10px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: "10px",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
              },
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0,0,0,0.2) rgba(0,0,0,0.05)",
            }}
          >
            {filteredRequests.map((request) => {
              const statusConfig = getStatusConfig(request.estado);
              return (
                <Paper
                  key={request.id}
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid",
                    borderColor: "divider",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "action.hover",
                      transform: "translateX(4px)",
                      boxShadow: 2,
                    },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {request.requestId ||
                          `REQ-${String(request.id).padStart(3, "0")}`}
                      </Typography>
                      <Chip
                        label={statusConfig.label}
                        color={statusConfig.color}
                        size="small"
                      />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{ mb: 0.5 }}
                    >
                      {request.titulo || "Sin título"}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <PersonIcon
                          sx={{ fontSize: 14, color: "text.secondary" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {request.submittedBy}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <CalendarIcon
                          sx={{ fontSize: 14, color: "text.secondary" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(request.date).toLocaleDateString("es-ES")}
                        </Typography>
                      </Box>
                      {request.attachments &&
                        request.attachments.length > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <AttachFileIcon
                              sx={{ fontSize: 14, color: "text.secondary" }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {request.attachments.length} archivo(s)
                            </Typography>
                          </Box>
                        )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <AttachMoneyIcon sx={{ fontSize: 18 }} />
                        <Typography variant="h6" fontWeight={700}>
                          {Number.parseFloat(
                            request.amount || 0
                          ).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewDetails(request)}
                    >
                      Ver
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>

          {filteredRequests.length === 0 && (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary">
                No se encontraron solicitudes
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        {selectedRequest && (
          <>
            <DialogTitle>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedRequest.titulo || "Sin título"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: "monospace" }}
                  >
                    {selectedRequest.requestId ||
                      `REQ-${String(selectedRequest.id).padStart(3, "0")}`}
                  </Typography>
                </Box>
                <Chip
                  label={getStatusConfig(selectedRequest.estado).label}
                  color={getStatusConfig(selectedRequest.estado).color}
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {showConfirmation && (
                <Alert
                  severity={actionType === "approve" ? "success" : "error"}
                  sx={{ mb: 3 }}
                  action={
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleConfirmAction}
                        disabled={submitting}
                      >
                        Confirmar
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleCancelAction}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  }
                >
                  ¿Estás seguro de{" "}
                  {actionType === "approve" ? "aprobar" : "rechazar"} esta
                  solicitud?
                </Alert>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Líneas de Gastos
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mt: 1 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <strong>Categoría</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>Monto</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Descripción</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Proveedor</strong>
                          </TableCell>
                          {selectedRequest.estado === "Aprobada" && (
                            <TableCell align="center">
                              <strong>Acciones</strong>
                            </TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedRequest.lines &&
                        selectedRequest.lines.length > 0 ? (
                          selectedRequest.lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.category}</TableCell>
                              <TableCell align="right">
                                $
                                {Number.parseFloat(line.amount).toLocaleString(
                                  "es-ES",
                                  { minimumFractionDigits: 2 }
                                )}
                              </TableCell>
                              <TableCell>{line.description}</TableCell>
                              <TableCell>
                                {editingLineId === line.id ? (
                                  <TextField
                                    size="small"
                                    value={editingProvider}
                                    onChange={(e) =>
                                      setEditingProvider(e.target.value)
                                    }
                                    placeholder="Nombre del proveedor"
                                    fullWidth
                                  />
                                ) : (
                                  line.provider || (
                                    <em style={{ color: "#999" }}>
                                      Sin asignar
                                    </em>
                                  )
                                )}
                              </TableCell>
                              {selectedRequest.estado === "Aprobada" && (
                                <TableCell align="center">
                                  {editingLineId === line.id ? (
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        handleSaveLineProvider(line.id)
                                      }
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                  ) : (
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleEditLine(line)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={
                                selectedRequest.estado === "Aprobada" ? 5 : 4
                              }
                              align="center"
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                No hay líneas de gastos
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {selectedRequest.lines &&
                          selectedRequest.lines.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={2} align="right">
                                <strong>Total:</strong>
                              </TableCell>
                              <TableCell
                                colSpan={
                                  selectedRequest.estado === "Aprobada" ? 3 : 2
                                }
                              >
                                <strong>
                                  $
                                  {Number.parseFloat(
                                    selectedRequest.monto_total || 0
                                  ).toLocaleString("es-ES", {
                                    minimumFractionDigits: 2,
                                  })}
                                </strong>
                              </TableCell>
                            </TableRow>
                          )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={6}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <PersonIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Solicitante
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {selectedRequest.submittedBy}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <BusinessIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Departamento
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {selectedRequest.department}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Centro de Costos
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
                    {selectedRequest.costCenter}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <CalendarIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Fecha de Solicitud
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {new Date(selectedRequest.fecha_solicitud).toLocaleDateString(
                      "es-ES",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <AttachFileIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Archivos Adjuntos (
                      {selectedRequest.attachments?.length || 0})
                    </Typography>
                  </Box>
                  {selectedRequest.attachments &&
                  selectedRequest.attachments.length > 0 ? (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {selectedRequest.attachments.map((file, index) => (
                        <Paper
                          key={index}
                          sx={{
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flex: 1,
                            }}
                          >
                            <DescriptionIcon color="action" />
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {file.nombre_archivo}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            href={file.url_archivo}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver/Descargar
                          </Button>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay archivos adjuntos
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Historial de Aprobación
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      mt: 2,
                    }}
                  >
                    {selectedRequest.approvalHistory &&
                    selectedRequest.approvalHistory.length > 0 ? (
                      selectedRequest.approvalHistory.map((history, index) => (
                        <Paper
                          key={index}
                          sx={{
                            p: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            borderLeft: "4px solid",
                            borderLeftColor:
                              history.action === "Aprobado"
                                ? "success.main"
                                : history.action === "Rechazado"
                                  ? "error.main"
                                  : "warning.main",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {history.action}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {history.approvedBy}
                              </Typography>
                              {history.reason && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {history.reason}
                                </Typography>
                              )}
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(history.date).toLocaleDateString(
                                "es-ES"
                              )}
                            </Typography>
                          </Box>
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No hay historial de aprobación
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {(selectedRequest.estado === "Pendiente" ||
                  selectedRequest.estado === "pending") && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Comentarios{" "}
                        {actionType === "reject" &&
                          "(Obligatorio para rechazar)"}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Agrega comentarios sobre tu decisión..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        disabled={showConfirmation}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              {selectedRequest.estado === "Aprobada" && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ShoppingCartIcon />}
                  onClick={handleGeneratePurchaseOrder}
                >
                  Generar Orden de Compra
                </Button>
              )}

              {(selectedRequest?.estado === "Pendiente" ||
                selectedRequest?.estado === "pending") &&
                !showConfirmation && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleActionClick("approve")}
                      disabled={submitting}
                    >
                      Aprobar
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<ClearIcon />}
                      onClick={() => handleActionClick("reject")}
                      disabled={submitting}
                    >
                      Rechazar
                    </Button>
                    <Box sx={{ flex: 1 }} />
                  </>
                )}
              <Button
                onClick={handleCloseDialog}
                startIcon={<CloseIcon />}
                disabled={showConfirmation || submitting}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
