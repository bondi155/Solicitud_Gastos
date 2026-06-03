-- ============================================
-- MIGRACIÓN: Conversión a Sistema de Órdenes de Compra
-- Fecha: 2026-06-03
-- Descripción: Agrega campos necesarios para gestionar órdenes de compra completas
-- ============================================

-- ============================================
-- 1. CREAR TABLA DE PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre_comercial VARCHAR(200) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    rfc VARCHAR(13) NULL,
    direccion TEXT NULL,
    ciudad VARCHAR(100) NULL,
    estado VARCHAR(100) NULL,
    codigo_postal VARCHAR(10) NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    contacto_principal VARCHAR(200) NULL,
    telefono_contacto VARCHAR(20) NULL,
    email_contacto VARCHAR(100) NULL,
    condiciones_pago TEXT NULL COMMENT 'Condiciones de pago por defecto',
    dias_credito INT DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rfc (rfc),
    INDEX idx_nombre (nombre_comercial),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Catálogo de proveedores';

-- ============================================
-- 2. AGREGAR CAMPOS A SOLICITUDES (Orden de Compra)
-- ============================================

-- Información de Orden de Compra
ALTER TABLE solicitudes
ADD COLUMN folio_orden_compra VARCHAR(50) NULL UNIQUE COMMENT 'Folio único de orden de compra, generado al aprobar',
ADD COLUMN fecha_entrega_requerida DATE NULL COMMENT 'Fecha en que se requiere la entrega',
ADD COLUMN fecha_entrega_real DATE NULL COMMENT 'Fecha real de entrega',

-- Datos del comprador (empresa)
ADD COLUMN empresa_nombre VARCHAR(200) NULL DEFAULT 'Exportadora Café California',
ADD COLUMN empresa_direccion TEXT NULL,
ADD COLUMN empresa_rfc VARCHAR(13) NULL,
ADD COLUMN empresa_contacto VARCHAR(200) NULL,

-- Logística y entrega
ADD COLUMN direccion_entrega TEXT NULL COMMENT 'Dirección específica de entrega',
ADD COLUMN responsable_recepcion VARCHAR(200) NULL COMMENT 'Persona que recibirá',
ADD COLUMN telefono_responsable VARCHAR(20) NULL,
ADD COLUMN instrucciones_especiales TEXT NULL COMMENT 'Instrucciones de envío o recepción',

-- Cálculos financieros
ADD COLUMN subtotal DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Subtotal antes de impuestos',
ADD COLUMN iva DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'IVA aplicado',
ADD COLUMN otros_impuestos DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'ISR u otros impuestos',
ADD COLUMN descuentos DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Descuentos aplicados',
ADD COLUMN total_con_impuestos DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Total final a pagar',

-- Condiciones comerciales
ADD COLUMN moneda VARCHAR(3) NULL DEFAULT 'MXN' COMMENT 'MXN, USD, EUR',
ADD COLUMN tipo_cambio DECIMAL(10,4) NULL DEFAULT 1.0000 COMMENT 'Tipo de cambio si aplica',
ADD COLUMN condiciones_pago TEXT NULL COMMENT 'Condiciones de pago acordadas',
ADD COLUMN metodo_pago VARCHAR(100) NULL COMMENT 'Transferencia, cheque, etc.',
ADD COLUMN forma_pago VARCHAR(50) NULL DEFAULT 'PUE' COMMENT 'PUE (Pago en una exhibición) o PPD (Pago en parcialidades)',
ADD COLUMN dias_credito INT NULL DEFAULT 0,

-- Control de estatus ampliado
ADD COLUMN estatus_entrega ENUM('Pendiente', 'En Tránsito', 'Entregado', 'Cancelado') NULL DEFAULT 'Pendiente',
ADD COLUMN fecha_orden_generada TIMESTAMP NULL COMMENT 'Fecha en que se generó la orden de compra',

-- Índices para búsqueda y ordenamiento
ADD INDEX idx_folio_orden (folio_orden_compra),
ADD INDEX idx_fecha_entrega (fecha_entrega_requerida),
ADD INDEX idx_estatus_entrega (estatus_entrega),
ADD INDEX idx_moneda (moneda);

-- ============================================
-- 3. AGREGAR CAMPOS A SOLICITUD_LINEAS
-- ============================================

ALTER TABLE solicitud_lineas
-- Información del producto/servicio
ADD COLUMN sku VARCHAR(100) NULL COMMENT 'Código interno o SKU del producto',
ADD COLUMN codigo_proveedor VARCHAR(100) NULL COMMENT 'Código del proveedor',

-- Cantidades y medidas
ADD COLUMN cantidad DECIMAL(10,3) NULL DEFAULT 1.000 COMMENT 'Cantidad solicitada',
ADD COLUMN unidad_medida VARCHAR(50) NULL DEFAULT 'PZA' COMMENT 'Pieza, litros, kg, metros, etc.',

-- Precios desglosados
ADD COLUMN precio_unitario DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Precio por unidad',
ADD COLUMN importe DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'cantidad * precio_unitario',
ADD COLUMN descuento_linea DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Descuento en esta línea',
ADD COLUMN subtotal_linea DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Importe - descuento',

-- Relación con proveedor (mantener campo texto por compatibilidad)
ADD COLUMN proveedor_id INT NULL COMMENT 'FK a tabla proveedores',

-- Información adicional
ADD COLUMN notas_linea TEXT NULL COMMENT 'Notas específicas de esta línea',

-- Índices
ADD INDEX idx_sku (sku),
ADD INDEX idx_proveedor_id (proveedor_id),
ADD CONSTRAINT fk_solicitud_lineas_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- 4. FUNCIÓN PARA GENERAR FOLIO DE ORDEN DE COMPRA
-- ============================================

DELIMITER $$

CREATE TRIGGER generar_folio_orden_compra
BEFORE UPDATE ON solicitudes
FOR EACH ROW
BEGIN
    -- Solo generar folio cuando se aprueba por primera vez
    IF NEW.estado = 'Aprobada'
       AND OLD.estado != 'Aprobada'
       AND NEW.folio_orden_compra IS NULL THEN

        SET NEW.folio_orden_compra = CONCAT(
            'OC-',
            YEAR(CURRENT_DATE()),
            '-',
            LPAD(NEW.id, 6, '0')
        );

        SET NEW.fecha_orden_generada = CURRENT_TIMESTAMP();

        -- Si no hay fecha de entrega, poner 15 días después
        IF NEW.fecha_entrega_requerida IS NULL THEN
            SET NEW.fecha_entrega_requerida = DATE_ADD(CURRENT_DATE(), INTERVAL 15 DAY);
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- 5. VISTA PARA ÓRDENES DE COMPRA COMPLETAS
-- ============================================

CREATE OR REPLACE VIEW vw_ordenes_compra AS
SELECT
    s.id,
    s.folio_orden_compra,
    s.titulo,
    s.estado,
    s.estatus_entrega,
    s.fecha_solicitud,
    s.fecha_orden_generada,
    s.fecha_entrega_requerida,
    s.fecha_entrega_real,

    -- Usuario solicitante
    u.nombre as solicitante,
    u.email as solicitante_email,

    -- Departamento
    d.nombre as departamento,

    -- Centro de costos
    cc.codigo as centro_costo_codigo,
    cc.nombre as centro_costo_nombre,

    -- Datos financieros
    s.subtotal,
    s.iva,
    s.otros_impuestos,
    s.descuentos,
    s.total_con_impuestos,
    s.moneda,
    s.tipo_cambio,

    -- Entrega
    s.direccion_entrega,
    s.responsable_recepcion,
    s.telefono_responsable,

    -- Condiciones
    s.condiciones_pago,
    s.metodo_pago,
    s.dias_credito,

    -- Conteo de líneas
    (SELECT COUNT(*) FROM solicitud_lineas WHERE solicitud_id = s.id) as total_lineas,

    s.created_at,
    s.updated_at
FROM solicitudes s
JOIN usuarios u ON s.usuario_id = u.id
JOIN departamentos d ON s.departamento_id = d.id
LEFT JOIN centros_costos cc ON s.centro_costo_id = cc.id
WHERE s.estado = 'Aprobada'
ORDER BY s.fecha_orden_generada DESC;

-- ============================================
-- 6. DATOS INICIALES DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar un proveedor de ejemplo
INSERT INTO proveedores (
    nombre_comercial,
    razon_social,
    rfc,
    direccion,
    ciudad,
    estado,
    telefono,
    email,
    contacto_principal,
    condiciones_pago,
    dias_credito
) VALUES (
    'Proveedor Ejemplo S.A.',
    'Proveedor Ejemplo S.A. de C.V.',
    'PEJ010101ABC',
    'Calle Principal #123',
    'Ciudad de México',
    'CDMX',
    '5555555555',
    'contacto@ejemplo.com',
    'Juan Pérez',
    'Pago a 30 días',
    30
);

-- ============================================
-- 7. ACTUALIZAR CÁLCULOS EN SOLICITUDES EXISTENTES
-- ============================================

-- Actualizar subtotal de solicitudes existentes aprobadas
UPDATE solicitudes s
SET
    s.subtotal = s.monto_total,
    s.iva = ROUND(s.monto_total * 0.16, 2),
    s.total_con_impuestos = ROUND(s.monto_total * 1.16, 2)
WHERE s.estado = 'Aprobada'
  AND s.subtotal IS NULL;

-- ============================================
-- ROLLBACK (por si necesitas revertir)
-- ============================================

/*
-- Para revertir esta migración:

DROP TRIGGER IF EXISTS generar_folio_orden_compra;
DROP VIEW IF EXISTS vw_ordenes_compra;

ALTER TABLE solicitud_lineas
DROP FOREIGN KEY fk_solicitud_lineas_proveedor,
DROP COLUMN proveedor_id,
DROP COLUMN sku,
DROP COLUMN codigo_proveedor,
DROP COLUMN cantidad,
DROP COLUMN unidad_medida,
DROP COLUMN precio_unitario,
DROP COLUMN importe,
DROP COLUMN descuento_linea,
DROP COLUMN subtotal_linea,
DROP COLUMN notas_linea;

ALTER TABLE solicitudes
DROP COLUMN folio_orden_compra,
DROP COLUMN fecha_entrega_requerida,
DROP COLUMN fecha_entrega_real,
DROP COLUMN empresa_nombre,
DROP COLUMN empresa_direccion,
DROP COLUMN empresa_rfc,
DROP COLUMN empresa_contacto,
DROP COLUMN direccion_entrega,
DROP COLUMN responsable_recepcion,
DROP COLUMN telefono_responsable,
DROP COLUMN instrucciones_especiales,
DROP COLUMN subtotal,
DROP COLUMN iva,
DROP COLUMN otros_impuestos,
DROP COLUMN descuentos,
DROP COLUMN total_con_impuestos,
DROP COLUMN moneda,
DROP COLUMN tipo_cambio,
DROP COLUMN condiciones_pago,
DROP COLUMN metodo_pago,
DROP COLUMN forma_pago,
DROP COLUMN dias_credito,
DROP COLUMN estatus_entrega,
DROP COLUMN fecha_orden_generada;

DROP TABLE IF EXISTS proveedores;
*/
