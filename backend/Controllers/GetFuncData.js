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
        s.descripcion as title,
        s.monto as amount,
        s.estado,
        s.fecha_solicitud as date,
        s.proveedor as provider,
        u.nombre as submittedBy,
        d.nombre as department,
        cc.codigo as costCenter,
        c.nombre as category
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN departamentos d ON s.departamento_id = d.id
      JOIN centros_costos cc ON s.centro_costo_id = cc.id
      JOIN categorias c ON s.categoria_id = c.id
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
      query += " AND c.nombre = ?";
      params.push(category);
    }

    if (search && search !== "undefined") {
      query +=
        ' AND (s.descripcion LIKE ? OR u.nombre LIKE ? OR CONCAT("REQ-", LPAD(s.id, 3, "0")) LIKE ?)';
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
// GET /api/requests/:id
async function getRequestDetail(req, res) {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `
      SELECT 
        s.*,
        CONCAT('REQ-', LPAD(s.id, 3, '0')) as requestId,
        u.nombre as submittedBy,
        d.nombre as department,
        cc.codigo as costCenter,
        cc.nombre as costCenterName,
        c.nombre as category,
        aprobador.nombre as approvedByName
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN departamentos d ON s.departamento_id = d.id
      JOIN centros_costos cc ON s.centro_costo_id = cc.id
      JOIN categorias c ON s.categoria_id = c.id
      LEFT JOIN usuarios aprobador ON s.aprobador_id = aprobador.id
      WHERE s.id = ?
    `,
      [id]
    );

    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Solicitud no encontrada" });
    }

    // Obtener archivos adjuntos
    const [attachments] = await pool.query(
      `
      SELECT nombre_archivo, ruta_archivo, tipo_archivo, tamano
      FROM archivos_adjuntos
      WHERE solicitud_id = ?
    `,
      [id]
    );

    const approvalHistory = [];
    const solicitud = result[0];

    if (solicitud.aprobador_id && solicitud.fecha_aprobacion) {
      approvalHistory.push({
        action: solicitud.estado === "Aprobada" ? "Aprobado" : "Rechazado",
        reason: solicitud.comentario_aprobacion || "",
        date: solicitud.fecha_aprobacion,
        approvedBy: solicitud.approvedByName || "Usuario desconocido",
      });
    }

    res.json({
      success: true,
      data: {
        ...result[0],
        attachments: attachments,
        approvalHistory: approvalHistory,
      },
    });
  } catch (error) {
    console.error("Error en getRequestDetail:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener detalle de solicitud",
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
    res
      .status(500)
      .json({ success: false, message: "Error al obtener categorías" });
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
    res
      .status(500)
      .json({ success: false, message: "Error al obtener centros de costos" });
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
    const { startDate, endDate, department, category, status } = req.query;
    let query = `
      SELECT 
        s.id,
        s.fecha_solicitud as date,
        u.nombre as requester,
        d.nombre as department,
        c.nombre as category,
        s.descripcion as description,
        s.monto as amount,
        s.estado as status
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN departamentos d ON s.departamento_id = d.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += " AND s.fecha_solicitud >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND s.fecha_solicitud <= ?";
      params.push(endDate);
    }

    if (department && department !== "all") {
      query += " AND d.nombre = ?";
      params.push(department);
    }

    if (category && category !== "all") {
      query += " AND c.nombre = ?";
      params.push(category);
    }

    if (status && status !== "all") {
      query += " AND s.estado = ?";
      params.push(status);
    }

    query += " ORDER BY s.fecha_solicitud DESC";

    const [result] = await pool.query(query, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en getReports:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener reportes" });
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
};
