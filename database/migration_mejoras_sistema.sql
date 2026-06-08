-- ============================================
-- MIGRACIÓN: Mejoras al Sistema de Solicitudes
-- Fecha: 2026-06-08
-- Descripción:
--   1. Centro de costos a nivel línea
--   2. Tipo de artículo en categorías (inventariable/no inventariable/servicio)
--   3. Tipo de documento en archivos adjuntos (factura/cotización)
--   4. Tabla separada para órdenes de compra
--   5. Tabla para órdenes de pago
-- ============================================

-- ============================================
-- 1. CENTRO DE COSTOS A NIVEL LÍNEA
-- ============================================

ALTER TABLE solicitud_lineas
ADD COLUMN centro_costo_id INT NULL COMMENT 'Centro de costos específico de esta línea',
ADD INDEX idx_centro_costo (centro_costo_id),
ADD CONSTRAINT fk_solicitud_lineas_centro_costo
    FOREIGN KEY (centro_costo_id) REFERENCES centros_costos(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- 2. TIPO DE ARTÍCULO EN CATEGORÍAS
-- ============================================

ALTER TABLE categorias
ADD COLUMN tipo_articulo ENUM('inventariable', 'no_inventariable', 'servicio') NULL DEFAULT 'no_inventariable' COMMENT 'Tipo de artículo de esta categoría',
ADD COLUMN codigo_articulo VARCHAR(100) NULL COMMENT 'Código de artículo relacionado',
ADD COLUMN unidad_medida_default VARCHAR(50) NULL DEFAULT 'PZA' COMMENT 'Unidad de medida por defecto',
ADD INDEX idx_tipo_articulo (tipo_articulo);

-- ============================================
-- 3. TIPO DE DOCUMENTO EN ARCHIVOS ADJUNTOS
-- ============================================

ALTER TABLE archivos_adjuntos
ADD COLUMN tipo_documento ENUM('factura', 'cotizacion', 'otro') NULL DEFAULT 'otro' COMMENT 'Tipo de documento adjunto',
ADD INDEX idx_tipo_documento (tipo_documento);

-- ============================================
-- 4. TABLA DE ÓRDENES DE COMPRA (separada de solicitudes)
-- ============================================

CREATE TABLE IF NOT EXISTS ordenes_compra (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL COMMENT 'Solicitud que generó esta OC',
    folio VARCHAR(50) NOT NULL UNIQUE COMMENT 'Folio de la orden de compra',
    proveedor_id INT NULL COMMENT 'Proveedor de esta orden',

    -- Fechas
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega_requerida DATE NULL,
    fecha_entrega_real DATE NULL,

    -- Montos (calculados de las líneas)
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    iva DECIMAL(12,2) DEFAULT 0.00,
    otros_impuestos DECIMAL(12,2) DEFAULT 0.00,
    descuentos DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,

    -- Condiciones comerciales
    moneda VARCHAR(3) DEFAULT 'MXN',
    tipo_cambio DECIMAL(10,4) DEFAULT 1.0000,
    condiciones_pago TEXT NULL,
    metodo_pago VARCHAR(100) NULL,
    dias_credito INT DEFAULT 0,

    -- Logística
    direccion_entrega TEXT NULL,
    responsable_recepcion VARCHAR(200) NULL,
    telefono_responsable VARCHAR(20) NULL,
    instrucciones_especiales TEXT NULL,

    -- Control
    estatus ENUM('Generada', 'Enviada', 'Confirmada', 'En Tránsito', 'Entregada', 'Cancelada') DEFAULT 'Generada',
    notas TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_solicitud (solicitud_id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_folio (folio),
    INDEX idx_fecha_entrega (fecha_entrega_requerida),
    INDEX idx_estatus (estatus),

    CONSTRAINT fk_oc_solicitud
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_oc_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Órdenes de compra generadas a partir de solicitudes aprobadas';

-- ============================================
-- 5. LÍNEAS DE ÓRDENES DE COMPRA
-- ============================================

CREATE TABLE IF NOT EXISTS orden_compra_lineas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_compra_id INT NOT NULL,
    solicitud_linea_id INT NULL COMMENT 'Línea de solicitud original',

    -- Información del producto
    sku VARCHAR(100) NULL,
    descripcion TEXT NULL,
    categoria_id INT NULL,

    -- Cantidades
    cantidad DECIMAL(10,3) DEFAULT 1.000,
    unidad_medida VARCHAR(50) DEFAULT 'PZA',

    -- Precios
    precio_unitario DECIMAL(12,2) DEFAULT 0.00,
    importe DECIMAL(12,2) DEFAULT 0.00,
    descuento DECIMAL(12,2) DEFAULT 0.00,
    subtotal DECIMAL(12,2) DEFAULT 0.00,

    -- Centro de costos
    centro_costo_id INT NULL,

    notas TEXT NULL,
    orden INT DEFAULT 0,

    INDEX idx_orden_compra (orden_compra_id),
    INDEX idx_solicitud_linea (solicitud_linea_id),
    INDEX idx_categoria (categoria_id),
    INDEX idx_centro_costo (centro_costo_id),

    CONSTRAINT fk_ocl_orden_compra
        FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ocl_solicitud_linea
        FOREIGN KEY (solicitud_linea_id) REFERENCES solicitud_lineas(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ocl_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ocl_centro_costo
        FOREIGN KEY (centro_costo_id) REFERENCES centros_costos(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Líneas de detalle de órdenes de compra';

-- ============================================
-- 6. TABLA DE ÓRDENES DE PAGO
-- ============================================

CREATE TABLE IF NOT EXISTS ordenes_pago (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL COMMENT 'Solicitud que generó esta OP',
    folio VARCHAR(50) NOT NULL UNIQUE COMMENT 'Folio de la orden de pago',
    proveedor_id INT NULL COMMENT 'Beneficiario del pago',

    -- Fechas
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_pago_programada DATE NULL,
    fecha_pago_real DATE NULL,

    -- Montos
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    iva DECIMAL(12,2) DEFAULT 0.00,
    otros_impuestos DECIMAL(12,2) DEFAULT 0.00,
    retenciones DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Retenciones de ISR o IVA',
    total_pagar DECIMAL(12,2) DEFAULT 0.00,

    -- Información de pago
    moneda VARCHAR(3) DEFAULT 'MXN',
    tipo_cambio DECIMAL(10,4) DEFAULT 1.0000,
    metodo_pago VARCHAR(100) NULL COMMENT 'Transferencia, cheque, etc.',
    referencia_bancaria VARCHAR(100) NULL,
    cuenta_destino VARCHAR(50) NULL,
    banco_destino VARCHAR(100) NULL,

    -- Facturas relacionadas
    facturas_relacionadas TEXT NULL COMMENT 'UUIDs o folios de facturas',

    -- Control
    estatus ENUM('Pendiente', 'Autorizada', 'Pagada', 'Cancelada') DEFAULT 'Pendiente',
    autorizado_por INT NULL COMMENT 'Usuario que autorizó',
    fecha_autorizacion TIMESTAMP NULL,

    notas TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_solicitud (solicitud_id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_folio (folio),
    INDEX idx_fecha_pago (fecha_pago_programada),
    INDEX idx_estatus (estatus),

    CONSTRAINT fk_op_solicitud
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_op_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_op_autorizado_por
        FOREIGN KEY (autorizado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Órdenes de pago generadas a partir de solicitudes con facturas';

-- ============================================
-- 7. VISTAS ÚTILES
-- ============================================

-- Vista de órdenes de compra con detalles
CREATE OR REPLACE VIEW vw_ordenes_compra_detalle AS
SELECT
    oc.id,
    oc.folio,
    oc.fecha_generacion,
    oc.fecha_entrega_requerida,
    oc.estatus,

    -- Solicitud original
    s.id as solicitud_id,
    CONCAT('REQ-', LPAD(s.id, 3, '0')) as solicitud_folio,
    s.titulo as solicitud_titulo,

    -- Proveedor
    p.nombre_comercial as proveedor,
    p.rfc as proveedor_rfc,

    -- Montos
    oc.subtotal,
    oc.iva,
    oc.total,
    oc.moneda,

    -- Líneas
    (SELECT COUNT(*) FROM orden_compra_lineas WHERE orden_compra_id = oc.id) as total_lineas,

    oc.created_at
FROM ordenes_compra oc
JOIN solicitudes s ON oc.solicitud_id = s.id
LEFT JOIN proveedores p ON oc.proveedor_id = p.id
ORDER BY oc.fecha_generacion DESC;

-- Vista de órdenes de pago con detalles
CREATE OR REPLACE VIEW vw_ordenes_pago_detalle AS
SELECT
    op.id,
    op.folio,
    op.fecha_generacion,
    op.fecha_pago_programada,
    op.estatus,

    -- Solicitud original
    s.id as solicitud_id,
    CONCAT('REQ-', LPAD(s.id, 3, '0')) as solicitud_folio,
    s.titulo as solicitud_titulo,

    -- Beneficiario
    p.nombre_comercial as beneficiario,
    p.rfc as beneficiario_rfc,

    -- Montos
    op.subtotal,
    op.iva,
    op.retenciones,
    op.total_pagar,
    op.moneda,

    -- Autorización
    u.nombre as autorizado_por,
    op.fecha_autorizacion,

    op.created_at
FROM ordenes_pago op
JOIN solicitudes s ON op.solicitud_id = s.id
LEFT JOIN proveedores p ON op.proveedor_id = p.id
LEFT JOIN usuarios u ON op.autorizado_por = u.id
ORDER BY op.fecha_generacion DESC;

-- ============================================
-- 8. FUNCIÓN PARA GENERAR FOLIO DE OC
-- ============================================

DELIMITER $$

CREATE TRIGGER generar_folio_oc
BEFORE INSERT ON ordenes_compra
FOR EACH ROW
BEGIN
    IF NEW.folio IS NULL OR NEW.folio = '' THEN
        SET NEW.folio = CONCAT(
            'OC-',
            YEAR(CURRENT_DATE()),
            '-',
            LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM ordenes_compra), 6, '0')
        );
    END IF;
END$$

DELIMITER ;

-- ============================================
-- 9. FUNCIÓN PARA GENERAR FOLIO DE OP
-- ============================================

DELIMITER $$

CREATE TRIGGER generar_folio_op
BEFORE INSERT ON ordenes_pago
FOR EACH ROW
BEGIN
    IF NEW.folio IS NULL OR NEW.folio = '' THEN
        SET NEW.folio = CONCAT(
            'OP-',
            YEAR(CURRENT_DATE()),
            '-',
            LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM ordenes_pago), 6, '0')
        );
    END IF;
END$$

DELIMITER ;

-- ============================================
-- ROLLBACK (por si necesitas revertir)
-- ============================================

/*
-- Para revertir esta migración:

DROP TRIGGER IF EXISTS generar_folio_oc;
DROP TRIGGER IF EXISTS generar_folio_op;
DROP VIEW IF EXISTS vw_ordenes_compra_detalle;
DROP VIEW IF EXISTS vw_ordenes_pago_detalle;

DROP TABLE IF EXISTS orden_compra_lineas;
DROP TABLE IF EXISTS ordenes_compra;
DROP TABLE IF EXISTS ordenes_pago;

ALTER TABLE archivos_adjuntos
DROP COLUMN tipo_documento;

ALTER TABLE categorias
DROP COLUMN tipo_articulo,
DROP COLUMN codigo_articulo,
DROP COLUMN unidad_medida_default;

ALTER TABLE solicitud_lineas
DROP FOREIGN KEY fk_solicitud_lineas_centro_costo,
DROP COLUMN centro_costo_id;
*/
