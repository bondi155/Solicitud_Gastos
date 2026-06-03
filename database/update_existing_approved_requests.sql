-- ============================================
-- ACTUALIZAR SOLICITUDES YA APROBADAS
-- Generar folios para solicitudes que ya estaban aprobadas antes de la migración
-- ============================================

-- Generar folio para solicitudes aprobadas que no tienen folio
UPDATE solicitudes
SET
    folio_orden_compra = CONCAT('OC-', YEAR(CURRENT_DATE()), '-', LPAD(id, 6, '0')),
    fecha_orden_generada = created_at,
    fecha_entrega_requerida = COALESCE(fecha_entrega_requerida, DATE_ADD(fecha_solicitud, INTERVAL 15 DAY)),
    subtotal = COALESCE(subtotal, monto_total),
    iva = COALESCE(iva, ROUND(monto_total * 0.16, 2)),
    total_con_impuestos = COALESCE(total_con_impuestos, ROUND(monto_total * 1.16, 2)),
    moneda = COALESCE(moneda, 'MXN'),
    tipo_cambio = COALESCE(tipo_cambio, 1.0),
    estatus_entrega = COALESCE(estatus_entrega, 'Pendiente')
WHERE estado = 'Aprobada'
  AND folio_orden_compra IS NULL;

-- Verificar resultados
SELECT
    id,
    folio_orden_compra,
    titulo,
    estado,
    fecha_orden_generada,
    subtotal,
    iva,
    total_con_impuestos
FROM solicitudes
WHERE estado = 'Aprobada'
ORDER BY id DESC
LIMIT 10;
