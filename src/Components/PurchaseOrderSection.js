"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Divider,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import apiService from "../api/apiService";

export default function PurchaseOrderSection({ request, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [editingLineId, setEditingLineId] = useState(null);
  const [editingLineData, setEditingLineData] = useState({});

  const [purchaseOrderData, setPurchaseOrderData] = useState({
    fecha_entrega_requerida: request?.fecha_entrega_requerida || "",
    direccion_entrega: request?.direccion_entrega || "",
    responsable_recepcion: request?.responsable_recepcion || "",
    telefono_responsable: request?.telefono_responsable || "",
    instrucciones_especiales: request?.instrucciones_especiales || "",
    subtotal: request?.subtotal || 0,
    iva: request?.iva || 0,
    otros_impuestos: request?.otros_impuestos || 0,
    descuentos: request?.descuentos || 0,
    total_con_impuestos: request?.total_con_impuestos || 0,
    condiciones_pago: request?.condiciones_pago || "",
    metodo_pago: request?.metodo_pago || "",
    dias_credito: request?.dias_credito || 0,
    estatus_entrega: request?.estatus_entrega || "Pendiente",
    moneda: request?.moneda || "MXN",
    tipo_cambio: request?.tipo_cambio || 1.0,
  });

  useEffect(() => {
    // Actualizar datos cuando cambie el request
    if (request) {
      setPurchaseOrderData({
        fecha_entrega_requerida: request.fecha_entrega_requerida || "",
        direccion_entrega: request.direccion_entrega || "",
        responsable_recepcion: request.responsable_recepcion || "",
        telefono_responsable: request.telefono_responsable || "",
        instrucciones_especiales: request.instrucciones_especiales || "",
        subtotal: request.subtotal || 0,
        iva: request.iva || 0,
        otros_impuestos: request.otros_impuestos || 0,
        descuentos: request.descuentos || 0,
        total_con_impuestos: request.total_con_impuestos || 0,
        condiciones_pago: request.condiciones_pago || "",
        metodo_pago: request.metodo_pago || "",
        dias_credito: request.dias_credito || 0,
        estatus_entrega: request.estatus_entrega || "Pendiente",
        moneda: request.moneda || "MXN",
        tipo_cambio: request.tipo_cambio || 1.0,
      });
    }
  }, [request]);

  const handleSavePurchaseOrder = async () => {
    try {
      setSaving(true);
      setError(null);

      await apiService.updatePurchaseOrder(request.id, purchaseOrderData);

      setSuccess("Información de orden de compra guardada exitosamente");
      setEditing(false);

      if (onUpdate) {
        onUpdate();
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[v0] Error saving purchase order:", err);
      setError("Error al guardar información de orden de compra");
    } finally {
      setSaving(false);
    }
  };

  const handleEditLine = (line) => {
    setEditingLineId(line.id);
    setEditingLineData({
      sku: line.sku || "",
      codigo_proveedor: line.codigo_proveedor || "",
      cantidad: line.cantidad || 1,
      unidad_medida: line.unidad_medida || "PZA",
      precio_unitario: line.precio_unitario || line.amount || 0,
      proveedor: line.provider || "",
      notas_linea: line.notas_linea || "",
    });
  };

  const handleSaveLine = async (lineId) => {
    try {
      setSaving(true);
      setError(null);

      await apiService.updateRequestLine(lineId, editingLineData);

      setSuccess("Línea actualizada exitosamente");
      setEditingLineId(null);
      setEditingLineData({});

      if (onUpdate) {
        onUpdate();
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[v0] Error saving line:", err);
      setError("Error al actualizar línea");
    } finally {
      setSaving(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = parseFloat(purchaseOrderData.subtotal) || 0;
    const iva = parseFloat(purchaseOrderData.iva) || 0;
    const otrosImpuestos = parseFloat(purchaseOrderData.otros_impuestos) || 0;
    const descuentos = parseFloat(purchaseOrderData.descuentos) || 0;

    const total = subtotal + iva + otrosImpuestos - descuentos;

    setPurchaseOrderData((prev) => ({
      ...prev,
      total_con_impuestos: total.toFixed(2),
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [
    purchaseOrderData.subtotal,
    purchaseOrderData.iva,
    purchaseOrderData.otros_impuestos,
    purchaseOrderData.descuentos,
  ]);

  if (!request || request.estado !== "Aprobada") {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShoppingCartIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Información de Orden de Compra
            </Typography>
            {request.folio_orden_compra && (
              <Typography
                variant="caption"
                sx={{
                  ml: 2,
                  px: 1,
                  py: 0.5,
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                  borderRadius: 1,
                  fontFamily: "monospace",
                }}
              >
                {request.folio_orden_compra}
              </Typography>
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Información de Entrega */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <LocalShippingIcon color="action" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Información de Entrega
                </Typography>
                {!editing && (
                  <IconButton size="small" onClick={() => setEditing(true)} sx={{ ml: "auto" }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Fecha de Entrega Requerida"
                    type="date"
                    value={purchaseOrderData.fecha_entrega_requerida}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        fecha_entrega_requerida: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Estado de Entrega"
                    value={purchaseOrderData.estatus_entrega}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        estatus_entrega: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  >
                    <MenuItem value="Pendiente">Pendiente</MenuItem>
                    <MenuItem value="En Tránsito">En Tránsito</MenuItem>
                    <MenuItem value="Entregado">Entregado</MenuItem>
                    <MenuItem value="Cancelado">Cancelado</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Dirección de Entrega"
                    value={purchaseOrderData.direccion_entrega}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        direccion_entrega: e.target.value,
                      })
                    }
                    disabled={!editing}
                    multiline
                    rows={2}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Responsable de Recepción"
                    value={purchaseOrderData.responsable_recepcion}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        responsable_recepcion: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Teléfono Responsable"
                    value={purchaseOrderData.telefono_responsable}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        telefono_responsable: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Instrucciones Especiales"
                    value={purchaseOrderData.instrucciones_especiales}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        instrucciones_especiales: e.target.value,
                      })
                    }
                    disabled={!editing}
                    multiline
                    rows={2}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Información Financiera */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <AttachMoneyIcon color="action" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Información Financiera
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Subtotal"
                    type="number"
                    value={purchaseOrderData.subtotal}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        subtotal: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="IVA"
                    type="number"
                    value={purchaseOrderData.iva}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        iva: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Otros Impuestos"
                    type="number"
                    value={purchaseOrderData.otros_impuestos}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        otros_impuestos: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Descuentos"
                    type="number"
                    value={purchaseOrderData.descuentos}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        descuentos: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Total con Impuestos"
                    type="number"
                    value={purchaseOrderData.total_con_impuestos}
                    disabled
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        fontWeight: 700,
                        WebkitTextFillColor: "primary.main",
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Moneda"
                    value={purchaseOrderData.moneda}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        moneda: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  >
                    <MenuItem value="MXN">MXN - Peso Mexicano</MenuItem>
                    <MenuItem value="USD">USD - Dólar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Condiciones de Pago"
                    value={purchaseOrderData.condiciones_pago}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        condiciones_pago: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Método de Pago"
                    value={purchaseOrderData.metodo_pago}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        metodo_pago: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Días de Crédito"
                    type="number"
                    value={purchaseOrderData.dias_credito}
                    onChange={(e) =>
                      setPurchaseOrderData({
                        ...purchaseOrderData,
                        dias_credito: e.target.value,
                      })
                    }
                    disabled={!editing}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Detalle de Líneas Ampliado */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Detalle de Productos/Servicios
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell align="right"><strong>Cantidad</strong></TableCell>
                      <TableCell><strong>Unidad</strong></TableCell>
                      <TableCell align="right"><strong>Precio Unit.</strong></TableCell>
                      <TableCell align="right"><strong>Importe</strong></TableCell>
                      <TableCell><strong>Proveedor</strong></TableCell>
                      <TableCell align="center"><strong>Acciones</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {request.lines && request.lines.length > 0 ? (
                      request.lines.map((line) => {
                        const isEditing = editingLineId === line.id;
                        const cantidad = isEditing
                          ? parseFloat(editingLineData.cantidad) || 0
                          : parseFloat(line.cantidad) || 1;
                        const precioUnit = isEditing
                          ? parseFloat(editingLineData.precio_unitario) || 0
                          : parseFloat(line.precio_unitario) || parseFloat(line.amount) || 0;
                        const importe = (cantidad * precioUnit).toFixed(2);

                        return (
                          <TableRow key={line.id}>
                            <TableCell>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  value={editingLineData.sku}
                                  onChange={(e) =>
                                    setEditingLineData({
                                      ...editingLineData,
                                      sku: e.target.value,
                                    })
                                  }
                                  placeholder="SKU"
                                />
                              ) : (
                                line.sku || <em style={{ color: "#999" }}>-</em>
                              )}
                            </TableCell>
                            <TableCell>{line.description}</TableCell>
                            <TableCell align="right">
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={editingLineData.cantidad}
                                  onChange={(e) =>
                                    setEditingLineData({
                                      ...editingLineData,
                                      cantidad: e.target.value,
                                    })
                                  }
                                  inputProps={{ step: "0.01" }}
                                />
                              ) : (
                                cantidad
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  select
                                  value={editingLineData.unidad_medida}
                                  onChange={(e) =>
                                    setEditingLineData({
                                      ...editingLineData,
                                      unidad_medida: e.target.value,
                                    })
                                  }
                                  sx={{ minWidth: 100 }}
                                >
                                  <MenuItem value="PZA">Pieza</MenuItem>
                                  <MenuItem value="KG">Kilogramo</MenuItem>
                                  <MenuItem value="LT">Litro</MenuItem>
                                  <MenuItem value="M">Metro</MenuItem>
                                  <MenuItem value="SERV">Servicio</MenuItem>
                                  <MenuItem value="HR">Hora</MenuItem>
                                </TextField>
                              ) : (
                                line.unidad_medida || "PZA"
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={editingLineData.precio_unitario}
                                  onChange={(e) =>
                                    setEditingLineData({
                                      ...editingLineData,
                                      precio_unitario: e.target.value,
                                    })
                                  }
                                  inputProps={{ step: "0.01" }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                  }}
                                />
                              ) : (
                                `$${precioUnit.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <strong>${parseFloat(importe).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</strong>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  value={editingLineData.proveedor}
                                  onChange={(e) =>
                                    setEditingLineData({
                                      ...editingLineData,
                                      proveedor: e.target.value,
                                    })
                                  }
                                  placeholder="Proveedor"
                                />
                              ) : (
                                line.proveedor_nombre || line.provider || <em style={{ color: "#999" }}>Sin asignar</em>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {isEditing ? (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleSaveLine(line.id)}
                                  disabled={saving}
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
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay líneas de gastos
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Botones de Acción */}
            {editing && (
              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditing(false);
                      // Reset to original values
                      setPurchaseOrderData({
                        fecha_entrega_requerida: request.fecha_entrega_requerida || "",
                        direccion_entrega: request.direccion_entrega || "",
                        responsable_recepcion: request.responsable_recepcion || "",
                        telefono_responsable: request.telefono_responsable || "",
                        instrucciones_especiales: request.instrucciones_especiales || "",
                        subtotal: request.subtotal || 0,
                        iva: request.iva || 0,
                        otros_impuestos: request.otros_impuestos || 0,
                        descuentos: request.descuentos || 0,
                        total_con_impuestos: request.total_con_impuestos || 0,
                        condiciones_pago: request.condiciones_pago || "",
                        metodo_pago: request.metodo_pago || "",
                        dias_credito: request.dias_credito || 0,
                        estatus_entrega: request.estatus_entrega || "Pendiente",
                        moneda: request.moneda || "MXN",
                        tipo_cambio: request.tipo_cambio || 1.0,
                      });
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSavePurchaseOrder}
                    disabled={saving}
                  >
                    Guardar Orden de Compra
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
