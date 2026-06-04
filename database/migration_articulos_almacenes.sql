-- ============================================
-- MIGRACIÓN: Agregar Artículos y Almacenes
-- Fecha: 2026-06-04
-- Descripción: Tablas para gestión de artículos/productos y almacenes
-- ============================================

-- ============================================
-- 1. TABLA DE ARTÍCULOS/PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS articulos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE COMMENT 'SKU o código interno',
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT NULL,
    categoria_id INT NULL COMMENT 'FK a categorias',
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'PZA' COMMENT 'PZA, KG, LT, M, etc.',
    precio_unitario DECIMAL(12,2) NULL DEFAULT 0.00,
    precio_compra DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Último precio de compra',
    moneda VARCHAR(3) NULL DEFAULT 'MXN',
    stock_minimo DECIMAL(10,2) NULL DEFAULT 0.00,
    stock_maximo DECIMAL(10,2) NULL DEFAULT 0.00,
    ubicacion VARCHAR(100) NULL COMMENT 'Ubicación física (pasillo, estante, etc.)',
    notas TEXT NULL,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_codigo (codigo),
    INDEX idx_nombre (nombre),
    INDEX idx_categoria (categoria_id),
    INDEX idx_activo (activo),

    CONSTRAINT fk_articulos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Catálogo de artículos/productos';

-- ============================================
-- 2. TABLA DE ALMACENES
-- ============================================
CREATE TABLE IF NOT EXISTS almacenes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT NULL,
    direccion TEXT NULL,
    ciudad VARCHAR(100) NULL,
    estado VARCHAR(100) NULL,
    codigo_postal VARCHAR(10) NULL,
    responsable VARCHAR(200) NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    capacidad_m3 DECIMAL(10,2) NULL COMMENT 'Capacidad en metros cúbicos',
    tipo VARCHAR(50) NULL COMMENT 'Principal, Secundario, Tránsito, etc.',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_codigo (codigo),
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Catálogo de almacenes/bodegas';

-- ============================================
-- 3. TABLA DE INVENTARIO (Artículos por Almacén)
-- ============================================
CREATE TABLE IF NOT EXISTS inventario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    articulo_id INT NOT NULL,
    almacen_id INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notas TEXT NULL,

    UNIQUE KEY uk_articulo_almacen (articulo_id, almacen_id),
    INDEX idx_articulo (articulo_id),
    INDEX idx_almacen (almacen_id),

    CONSTRAINT fk_inventario_articulo
        FOREIGN KEY (articulo_id) REFERENCES articulos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_inventario_almacen
        FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Inventario de artículos por almacén';

-- ============================================
-- 4. TABLA DE MOVIMIENTOS DE INVENTARIO
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    articulo_id INT NOT NULL,
    almacen_id INT NOT NULL,
    tipo_movimiento ENUM('Entrada', 'Salida', 'Ajuste', 'Transferencia') NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    cantidad_anterior DECIMAL(10,2) NULL,
    cantidad_nueva DECIMAL(10,2) NULL,
    referencia VARCHAR(100) NULL COMMENT 'Número de OC, solicitud, etc.',
    usuario_id INT NULL,
    motivo TEXT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_articulo (articulo_id),
    INDEX idx_almacen (almacen_id),
    INDEX idx_fecha (fecha_movimiento),
    INDEX idx_tipo (tipo_movimiento),

    CONSTRAINT fk_movimientos_articulo
        FOREIGN KEY (articulo_id) REFERENCES articulos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_movimientos_almacen
        FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_movimientos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial de movimientos de inventario';

-- ============================================
-- 5. TABLA RELACIÓN ARTÍCULOS-PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS articulos_proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    articulo_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    codigo_proveedor VARCHAR(100) NULL COMMENT 'SKU del proveedor',
    precio_compra DECIMAL(12,2) NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    tiempo_entrega_dias INT NULL,
    cantidad_minima DECIMAL(10,2) NULL,
    es_principal TINYINT(1) DEFAULT 0 COMMENT 'Proveedor principal del artículo',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_articulo_proveedor (articulo_id, proveedor_id),
    INDEX idx_articulo (articulo_id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_principal (es_principal),

    CONSTRAINT fk_art_prov_articulo
        FOREIGN KEY (articulo_id) REFERENCES articulos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_art_prov_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Relación artículos con sus proveedores';

-- ============================================
-- 6. VISTA PARA INVENTARIO CONSOLIDADO
-- ============================================
CREATE OR REPLACE VIEW vw_inventario_consolidado AS
SELECT
    a.id as articulo_id,
    a.codigo,
    a.nombre as articulo,
    a.unidad_medida,
    c.nombre as categoria,
    SUM(i.cantidad) as stock_total,
    a.stock_minimo,
    a.stock_maximo,
    a.precio_unitario,
    CASE
        WHEN SUM(i.cantidad) <= a.stock_minimo THEN 'Bajo'
        WHEN SUM(i.cantidad) >= a.stock_maximo THEN 'Alto'
        ELSE 'Normal'
    END as estado_stock,
    COUNT(DISTINCT i.almacen_id) as almacenes_con_stock
FROM articulos a
LEFT JOIN inventario i ON a.id = i.articulo_id
LEFT JOIN categorias c ON a.categoria_id = c.id
WHERE a.activo = 1
GROUP BY a.id, a.codigo, a.nombre, a.unidad_medida, c.nombre, a.stock_minimo, a.stock_maximo, a.precio_unitario
ORDER BY a.nombre;

-- ============================================
-- 7. VISTA DETALLADA POR ALMACÉN
-- ============================================
CREATE OR REPLACE VIEW vw_inventario_por_almacen AS
SELECT
    alm.id as almacen_id,
    alm.codigo as almacen_codigo,
    alm.nombre as almacen,
    a.id as articulo_id,
    a.codigo as articulo_codigo,
    a.nombre as articulo,
    a.unidad_medida,
    c.nombre as categoria,
    i.cantidad,
    a.precio_unitario,
    (i.cantidad * a.precio_unitario) as valor_total,
    i.ultima_actualizacion
FROM inventario i
JOIN articulos a ON i.articulo_id = a.id
JOIN almacenes alm ON i.almacen_id = alm.id
LEFT JOIN categorias c ON a.categoria_id = c.id
WHERE a.activo = 1 AND alm.activo = 1
ORDER BY alm.nombre, a.nombre;

-- ============================================
-- 8. DATOS INICIALES DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar almacén principal
INSERT INTO almacenes (codigo, nombre, descripcion, responsable, activo) VALUES
('ALM-001', 'Almacén Principal', 'Almacén central de la empresa', 'Gerente de Almacén', 1);

-- Insertar algunos artículos de ejemplo
INSERT INTO articulos (codigo, nombre, descripcion, unidad_medida, precio_unitario, stock_minimo, activo) VALUES
('ART-001', 'Artículo de Prueba 1', 'Descripción del artículo de prueba', 'PZA', 100.00, 10, 1),
('ART-002', 'Artículo de Prueba 2', 'Descripción del artículo de prueba', 'KG', 50.00, 5, 1);

-- ============================================
-- ROLLBACK (por si necesitas revertir)
-- ============================================

/*
-- Para revertir esta migración:

DROP VIEW IF EXISTS vw_inventario_por_almacen;
DROP VIEW IF EXISTS vw_inventario_consolidado;
DROP TABLE IF EXISTS movimientos_inventario;
DROP TABLE IF EXISTS articulos_proveedores;
DROP TABLE IF EXISTS inventario;
DROP TABLE IF EXISTS almacenes;
DROP TABLE IF EXISTS articulos;
*/
