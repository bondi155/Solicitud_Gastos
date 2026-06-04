require("dotenv").config();
const mysql = require("mysql2");
const pool = mysql.createPool(process.env.DATABASE_URL).promise();

// ==================== DASHBOARD ====================

// GET /api/dashboard/stats
async function getDashboardStats(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT 
        COUNT(*) as totalRequests,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN estado = 'Aprobada' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN estado = 'Rechazada' THEN 1 ELSE 0 END) as rejected,
        SUM(monto) as totalAmount
      FROM solicitudes
      WHERE MONTH(fecha_solicitud) = MONTH(CURRENT_DATE())
        AND YEAR(fecha_solicitud) = YEAR(CURRENT_DATE())
    `);

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener estadísticas" });
  }
}

// GET /api/dashboard/monthly-requests
async function getMonthlyRequests(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT 
        DATE_FORMAT(fecha_solicitud, '%b') as month,
        COUNT(*) as count
      FROM solicitudes
      WHERE fecha_solicitud >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY MONTH(fecha_solicitud), DATE_FORMAT(fecha_solicitud, '%b')
      ORDER BY MONTH(fecha_solicitud)
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getMonthlyRequests:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener solicitudes mensuales",
    });
  }
}

// GET /api/dashboard/category-stats
async function getCategoryStats(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT 
        c.nombre as category,
        COUNT(s.id) as count,
        SUM(s.monto) as total
      FROM solicitudes s
      JOIN categorias c ON s.categoria_id = c.id
      WHERE MONTH(s.fecha_solicitud) = MONTH(CURRENT_DATE())
        AND YEAR(s.fecha_solicitud) = YEAR(CURRENT_DATE())
      GROUP BY c.id, c.nombre
      ORDER BY total DESC
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getCategoryStats:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas por categoría",
    });
  }
}

// GET /api/dashboard/monthly-amounts
async function getMonthlyAmounts(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT 
        DATE_FORMAT(fecha_solicitud, '%b') as month,
        SUM(monto) as total
      FROM solicitudes
      WHERE fecha_solicitud >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY MONTH(fecha_solicitud), DATE_FORMAT(fecha_solicitud, '%b')
      ORDER BY MONTH(fecha_solicitud)
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getMonthlyAmounts:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener montos mensuales" });
  }
}

// GET /api/dashboard/recent-requests
async function getRecentRequests(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT 
        s.id,
        s.monto as amount,
        s.estado as status,
        s.fecha_solicitud as date,
        u.nombre as employee,
        c.nombre as category
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN categorias c ON s.categoria_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getRecentRequests:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener solicitudes recientes",
    });
  }
}

// ==================== SOLICITUDES ====================

// GET /api/requests?status=&category=&search=
async function getRequestsList(req, res) {
  try {
    const { status, category, search } = req.query;

    let query = `
      SELECT 
        s.id,
        CONCAT('REQ-', LPAD(s.id, 3, '0')) as requestId,
        s.titulo as title,
        s.monto_total as amount,
        s.estado,
        s.fecha_solicitud as date,
        u.nombre as submittedBy,
        d.nombre as department,
        cc.codigo as costCenter,
        (SELECT COUNT(*) FROM solicitud_lineas WHERE solicitud_id = s.id) as lineCount
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN departamentos d ON s.departamento_id = d.id
      LEFT JOIN centros_costos cc ON s.centro_costo_id = cc.id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== "all" && status !== "undefined") {
      const statusMap = {
        pending: "Pendiente",
        approved: "Aprobada",
        rejected: "Rechazada",
      };
      const mappedStatus = statusMap[status] || status;
      query += " AND s.estado = ?";
      params.push(mappedStatus);
    }

    if (category && category !== "all" && category !== "undefined") {
      query +=
        " AND EXISTS (SELECT 1 FROM solicitud_lineas sl JOIN categorias c ON sl.categoria_id = c.id WHERE sl.solicitud_id = s.id AND c.nombre = ?)";
      params.push(category);
    }

    if (search && search !== "undefined") {
      query +=
        ' AND (s.titulo LIKE ? OR u.nombre LIKE ? OR CONCAT("REQ-", LPAD(s.id, 3, "0")) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY s.created_at DESC";

    const [result] = await pool.query(query, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[v0] ===== ERROR in getRequestsList =====", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener lista de solicitudes",
    });
  }
}

// GET /api/requests/:id
async function getRequestDetail(req, res) {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `
      SELECT 
        s.*,
        CONCAT('REQ-', LPAD(s.id, 3, '0')) as requestId,
        s.titulo as title,
        u.nombre as submittedBy,
        d.nombre as department,
        cc.codigo as costCenter,
        cc.nombre as costCenterName
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN departamentos d ON s.departamento_id = d.id
      LEFT JOIN centros_costos cc ON s.centro_costo_id = cc.id
      WHERE s.id = ?
    `,
      [id]
    );

    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Solicitud no encontrada" });
    }

    const [lines] = await pool.query(
      `
      SELECT
        sl.id,
        sl.categoria_id,
        c.nombre as category,
        sl.monto as amount,
        sl.descripcion as description,
        sl.proveedor as provider,
        sl.proveedor_id,
        sl.sku,
        sl.codigo_proveedor,
        sl.cantidad,
        sl.unidad_medida,
        sl.precio_unitario,
        sl.importe,
        sl.descuento_linea,
        sl.subtotal_linea,
        sl.notas_linea,
        sl.orden,
        p.nombre_comercial as proveedor_nombre,
        p.rfc as proveedor_rfc
      FROM solicitud_lineas sl
      JOIN categorias c ON sl.categoria_id = c.id
      LEFT JOIN proveedores p ON sl.proveedor_id = p.id
      WHERE sl.solicitud_id = ?
      ORDER BY sl.orden
    `,
      [id]
    );

    const [attachments] = await pool.query(
      `
      SELECT nombre_archivo, ruta_archivo
      FROM archivos_adjuntos
      WHERE solicitud_id = ?
    `,
      [id]
    );

    const [approvalHistoryResult] = await pool.query(
      `
      SELECT 
        a.accion as action,
        a.comentario as reason,
        a.fecha_aprobacion as date,
        u.nombre as approvedBy
      FROM aprobaciones a
      JOIN usuarios u ON a.aprobador_id = u.id
      WHERE a.solicitud_id = ?
      ORDER BY a.fecha_aprobacion DESC
    `,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result[0],
        lines: lines,
        attachments: attachments,
        approvalHistory: approvalHistoryResult,
      },
    });
  } catch (error) {
    console.error("[v0 Backend] Error en getRequestDetail:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener detalle de solicitud",
      error: error.message,
    });
  }
}

// ==================== CONFIGURACIÓN ====================

// GET /api/categories
async function getCategories(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT id, nombre as name, descripcion as description, activo as active
      FROM categorias
      ORDER BY nombre
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getCategories:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener categorías",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
}

// GET /api/departments
async function getDepartments(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT id, nombre as name, activo as active
      FROM departamentos
      ORDER BY nombre
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getDepartments:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener departamentos" });
  }
}

// GET /api/cost-centers
async function getCostCenters(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT id, codigo as code, nombre as name, activo as active
      FROM centros_costos
      ORDER BY codigo
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getCostCenters:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener centros de costos",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
}

// GET /api/users
async function getUsers(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT 
        u.id,
        u.nombre as name,
        u.email,
        u.rol as role,
        d.nombre as department,
        u.activo as active
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      ORDER BY u.nombre
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getUsers:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener usuarios" });
  }
}

// ==================== REPORTES ====================

// GET /api/reports?startDate=&endDate=&department=&category=&status=
async function getReports(req, res) {
  try {
    const { startDate, endDate, department, category, status } = req.query
    let query = `
      SELECT 
        s.id,
        s.fecha_solicitud as date,
        u.nombre as requester,
        d.nombre as department,
        c.nombre as category,
        sl.descripcion as description,
        sl.monto as amount,
        s.estado as status
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN departamentos d ON s.departamento_id = d.id
      JOIN solicitud_lineas sl ON sl.solicitud_id = s.id
      JOIN categorias c ON sl.categoria_id = c.id
      WHERE 1=1
    `

    const params = []

    if (startDate) {
      query += " AND s.fecha_solicitud >= ?"
      params.push(startDate)
    }

    if (endDate) {
      query += " AND s.fecha_solicitud <= ?"
      params.push(endDate)
    }

    if (department && department !== "all") {
      query += " AND d.nombre = ?"
      params.push(department)
    }

    if (category && category !== "all") {
      query += " AND c.nombre = ?"
      params.push(category)
    }

    if (status && status !== "all") {
      query += " AND s.estado = ?"
      params.push(status)
    }

    query += " ORDER BY s.fecha_solicitud DESC"

    const [result] = await pool.query(query, params)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error en getReports:", error)
    res.status(500).json({ success: false, message: "Error al obtener reportes" })
  }
}

// GET /api/providers
async function getProviders(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT
        id,
        nombre_comercial as name,
        razon_social,
        rfc,
        direccion,
        ciudad,
        estado,
        codigo_postal,
        telefono,
        email,
        contacto_principal,
        telefono_contacto,
        email_contacto,
        condiciones_pago,
        dias_credito,
        activo as active
      FROM proveedores
      WHERE activo = 1
      ORDER BY nombre_comercial
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getProviders:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener proveedores",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// GET /api/articles
async function getArticles(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT
        a.id,
        a.codigo as code,
        a.nombre as name,
        a.descripcion as description,
        a.categoria_id,
        c.nombre as category,
        a.unidad_medida as unit,
        a.precio_unitario as price,
        a.precio_compra as purchasePrice,
        a.moneda as currency,
        a.stock_minimo as minStock,
        a.stock_maximo as maxStock,
        a.ubicacion as location,
        a.activo as active
      FROM articulos a
      LEFT JOIN categorias c ON a.categoria_id = c.id
      ORDER BY a.nombre
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getArticles:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener artículos",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// GET /api/warehouses
async function getWarehouses(req, res) {
  try {
    const [result] = await pool.query(`
      SELECT
        id,
        codigo as code,
        nombre as name,
        descripcion as description,
        direccion as address,
        ciudad as city,
        estado as state,
        codigo_postal as zipCode,
        responsable as manager,
        telefono as phone,
        email,
        capacidad_m3 as capacity,
        tipo as type,
        activo as active
      FROM almacenes
      ORDER BY nombre
    `);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getWarehouses:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener almacenes",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  getDashboardStats,
  getMonthlyRequests,
  getCategoryStats,
  getMonthlyAmounts,
  getRecentRequests,
  getRequestsList,
  getRequestDetail,
  getCategories,
  getReports,
  getDepartments,
  getCostCenters,
  getUsers,
  getProviders,
  getArticles,
  getWarehouses,
};
