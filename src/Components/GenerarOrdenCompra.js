"use client"

import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
} from "@mui/material"
import {
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material"
import apiService from "../api/apiService"

export default function GenerarOrdenCompra({ open, onClose, request, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ordenesGeneradas, setOrdenesGeneradas] = useState(null)

  // Validar que request existe antes de renderizar
  if (!request) {
    return null
  }

  // Detectar tipo de documento
  const tipoDocumento = request?.attachments?.[0]?.tipo_documento || request?.tipo_documento || 'cotizacion'
  const esFactura = tipoDocumento === 'factura'

  // Agrupar líneas por proveedor
  const getLinesByProvider = () => {
    if (!request?.lines) return {}

    const grouped = {}
    request.lines.forEach(line => {
      const providerName = line.proveedor_nombre || line.provider || 'Sin proveedor'
      if (!grouped[providerName]) {
        grouped[providerName] = []
      }
      grouped[providerName].push(line)
    })
    return grouped
  }

  const linesByProvider = getLinesByProvider()
  const providerCount = Object.keys(linesByProvider).length

  const handleGenerar = async () => {
    try {
      setLoading(true)
      setError(null)

      let result

      if (esFactura) {
        // Generar Orden de Pago
        result = await apiService.generatePaymentOrder(request.id)
        setOrdenesGeneradas({
          tipo: 'pago',
          ordenes: [result.data]
        })
      } else {
        // Generar Órdenes de Compra
        result = await apiService.generatePurchaseOrders(request.id)
        setOrdenesGeneradas({
          tipo: 'compra',
          ordenes: result.data
        })
      }

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      console.error("Error generando orden:", err)
      setError(err.response?.data?.message || "Error al generar la orden")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOrdenesGeneradas(null)
    setError(null)
    onClose()
  }

  const calcularTotalProveedor = (lines) => {
    return lines.reduce((sum, line) => sum + parseFloat(line.amount || line.monto || line.subtotal_linea || 0), 0)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {esFactura ? <ReceiptIcon /> : <ShoppingCartIcon />}
          <Typography variant="h6">
            {esFactura ? 'Generar Orden de Pago' : 'Generar Órdenes de Compra'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {ordenesGeneradas ? (
          // Pantalla de éxito
          <Box>
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
              {ordenesGeneradas.tipo === 'pago'
                ? 'Orden de pago generada exitosamente'
                : `Se generaron ${ordenesGeneradas.ordenes.length} orden(es) de compra exitosamente`
              }
            </Alert>

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              {ordenesGeneradas.tipo === 'pago' ? 'Orden de Pago Generada:' : 'Órdenes de Compra Generadas:'}
            </Typography>

            {ordenesGeneradas.ordenes.map((orden, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" color="primary">
                      {orden.folio}
                    </Typography>
                    {orden.proveedor_id && (
                      <Typography variant="body2" color="text.secondary">
                        Proveedor ID: {orden.proveedor_id}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="h5" fontWeight="bold">
                    ${(orden.total || orden.total_pagar || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          // Pantalla de confirmación
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              {esFactura ? (
                <>
                  Esta solicitud contiene <strong>facturas</strong>. Se generará una <strong>Orden de Pago</strong>.
                </>
              ) : (
                <>
                  Se detectaron <strong>{providerCount} proveedor(es)</strong> diferentes.
                  Se generará{providerCount > 1 ? 'n' : ''} <strong>{providerCount} orden(es) de compra</strong>.
                </>
              )}
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Resumen de Solicitud
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Folio: <strong>{request.requestId}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Título: <strong>{request.title}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monto Total: <strong>${parseFloat(request.amount || request.total_con_impuestos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {!esFactura && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Detalle por Proveedor
                </Typography>

                {Object.entries(linesByProvider).map(([providerName, lines], index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {providerName}
                      </Typography>
                      <Chip
                        label={`${lines.length} línea${lines.length > 1 ? 's' : ''}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Descripción</TableCell>
                            <TableCell align="right">Cantidad</TableCell>
                            <TableCell align="right">Monto</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {lines.map((line, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{line.description || line.descripcion}</TableCell>
                              <TableCell align="right">{line.cantidad || 1}</TableCell>
                              <TableCell align="right">
                                ${parseFloat(line.amount || line.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={2} align="right">
                              <strong>Subtotal:</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>${calcularTotalProveedor(lines).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ))}
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {ordenesGeneradas ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!ordenesGeneradas && (
          <Button
            onClick={handleGenerar}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : (esFactura ? <ReceiptIcon /> : <ShoppingCartIcon />)}
          >
            {loading ? 'Generando...' : (esFactura ? 'Generar Orden de Pago' : 'Generar Órdenes de Compra')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
