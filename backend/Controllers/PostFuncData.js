require("dotenv").config();
const mysql = require("mysql2");
const pool = mysql.createPool(process.env.DATABASE_URL).promise();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secretkey = process.env.JWT_SECRET;
const saltRounds = 10;
const { uploadToBlob } = require("../blobConfig");

// ==================== CONFIGURACIÓN - USUARIOS ====================")

// Login de usuarios
async function loginUsers__(req, res) {
  const { username, password } = req.body;

  try {
    const [results] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [username]
    );

    if (results.length === 0) {
      return res.send({ code: "USR_NOT_EXIST" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      const token = jwt.sign({ id: user.id }, secretkey, { expiresIn: "1h" });
      res.send({
        token,
        id: user.id,
        usuario: user.email,
        rol: user.rol,
        nombre: user.nombre,
      });
    } else {
      res.send({ code: "USR_INCOR" });
    }
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Error al realizar login" });
  }
}

// Resetear password
async function resetPassword__(req, res) {
  const { password, username } = req.body;

  try {
    const hash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE username = ?",
      [hash, username]
    );

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ message: "No rows updated. Check the ID." });
    }

    res.status(200).json({ message: "Password actualizada" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Error al actualizar password", error });
  }
}
// ==================== SOLICITUDES ====================

// POST /api/requests
async function createRequest(req, res) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let lines = req.body.lines;
    if (typeof lines === "string") {
      lines = JSON.parse(lines);
    }

    const { userId, department, costCenter, date, title } = req.body;

    if (
      !userId ||
      !department ||
      !date ||
      !title ||
      !lines ||
      !Array.isArray(lines) ||
      lines.length === 0
    ) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Faltan campos requeridos o no hay líneas de gastos",
      });
    }

    for (const line of lines) {
      if (!line.category || !line.amount || !line.description) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: "Cada línea debe tener categoría, monto y descripción",
        });
      }
    }

    // Obtener IDs de departamento y centro de costo
    const [departmentData] = await connection.query(
      "SELECT id FROM departamentos WHERE nombre = ?",
      [department]
    );

    let costCenterId = null;
    if (costCenter) {
      const [costCenterData] = await connection.query(
        "SELECT id FROM centros_costos WHERE codigo = ?",
        [costCenter]
      );
      if (costCenterData.length > 0) {
        costCenterId = costCenterData[0].id;
      }
    }

    if (!departmentData.length) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Departamento inválido",
      });
    }

    const montoTotal = lines.reduce(
      (sum, line) => sum + Number.parseFloat(line.amount),
      0
    );

    const [result] = await connection.query(
      `
      INSERT INTO solicitudes 
      (titulo, usuario_id, departamento_id, centro_costo_id, monto_total, estado, fecha_solicitud)
      VALUES (?, ?, ?, ?, ?, 'Pendiente', ?)
    `,
      [title, userId, departmentData[0].id, costCenterId, montoTotal, date]
    );

    const requestId = result.insertId;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Insertar línea usando el ID de categoría directamente
      await connection.query(
        `
        INSERT INTO solicitud_lineas 
        (solicitud_id, categoria_id, monto, descripcion, orden)
        VALUES (?, ?, ?, ?, ?)
      `,
        [requestId, line.category, line.amount, line.description, i + 1]
      );
    }

    // Procesar archivos adjuntos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const blobData = await uploadToBlob(file, "solicitudes");

          await connection.query(
            `
            INSERT INTO archivos_adjuntos 
            (solicitud_id, nombre_archivo, ruta_archivo, tipo_archivo, tamano)
            VALUES (?, ?, ?, ?, ?)
          `,
            [
              requestId,
              blobData.filename,
              blobData.url,
              blobData.type,
              blobData.size,
            ]
          );
        } catch (uploadError) {
          console.error("Error uploading file to Blob:", uploadError);
        }
      }
    }

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: "Solicitud creada exitosamente",
      data: { id: requestId },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Error en createRequest:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al crear solicitud" });
  }
}
// POST /api/requests/:id/approve
async function approveRequest(req, res) {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { comments, approverId } = req.body;

    console.log(`[v0] Aprobando solicitud ${id} - approverId: ${approverId}`);

    if (!approverId) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "El ID del aprobador es requerido",
      });
    }

    // Actualizar estado de la solicitud
    const [updateResult] = await connection.query(
      `UPDATE solicitudes
       SET estado = 'Aprobada',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Solicitud no encontrada",
      });
    }

    // Insertar en tabla aprobaciones
    await connection.query(
      `INSERT INTO aprobaciones
       (solicitud_id, aprobador_id, accion, comentario, fecha_aprobacion)
       VALUES (?, ?, 'Aprobada', ?, CURRENT_TIMESTAMP)`,
      [id, approverId, comments || null]
    );

    await connection.commit();
    connection.release();

    console.log(`[v0] Solicitud ${id} aprobada exitosamente`);
    res.json({
      success: true,
      message: "Solicitud aprobada exitosamente",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("[v0] Error en approveRequest:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al aprobar solicitud",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
}

// POST /api/requests/:id/reject
async function rejectRequest(req, res) {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { comments, approverId } = req.body;

    console.log(`[v0] Rechazando solicitud ${id} - approverId: ${approverId}`);

    if (!comments) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Los comentarios son obligatorios para rechazar",
      });
    }

    if (!approverId) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "El ID del aprobador es requerido",
      });
    }

    // Actualizar estado de la solicitud
    const [updateResult] = await connection.query(
      `UPDATE solicitudes
       SET estado = 'Rechazada',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Solicitud no encontrada",
      });
    }

    // Insertar en tabla aprobaciones
    await connection.query(
      `INSERT INTO aprobaciones
       (solicitud_id, aprobador_id, accion, comentario, fecha_aprobacion)
       VALUES (?, ?, 'Rechazada', ?, CURRENT_TIMESTAMP)`,
      [id, approverId, comments]
    );

    await connection.commit();
    connection.release();

    console.log(`[v0] Solicitud ${id} rechazada exitosamente`);
    res.json({
      success: true,
      message: "Solicitud rechazada exitosamente",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("[v0] Error en rejectRequest:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al rechazar solicitud",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
// ==================== CONFIGURACIÓN - CATEGORÍAS ====================

// POST /api/categories
async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "El nombre es requerido" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO categorias (nombre, descripcion, activo)
      VALUES (?, ?, 1)
    `,
      [name, description || null]
    );

    res.json({
      success: true,
      message: "Categoría creada exitosamente",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error en createCategory:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al crear categoría" });
  }
}

// POST /api/categories/:id
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;

    await pool.query(
      `
      UPDATE categorias 
      SET nombre = ?, descripcion = ?, activo = ?
      WHERE id = ?
    `,
      [name, description, active ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: "Categoría actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error en updateCategory:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al actualizar categoría" });
  }
}

// POST /api/categories/:id/delete
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM categorias WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error en deleteCategory:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al eliminar categoría" });
  }
}

// ==================== CONFIGURACIÓN - DEPARTAMENTOS ====================

// POST /api/departments
async function createDepartment(req, res) {
  try {
    const { name, manager } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "El nombre es requerido" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO departamentos (nombre, activo)
      VALUES (?, 1)
    `,
      [name]
    );

    res.json({
      success: true,
      message: "Departamento creado exitosamente",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error en createDepartment:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al crear departamento" });
  }
}

// POST /api/departments/:id
async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    await pool.query(
      `
      UPDATE departamentos 
      SET nombre = ?, activo = ?
      WHERE id = ?
    `,
      [name, active ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: "Departamento actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error en updateDepartment:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al actualizar departamento" });
  }
}

// POST /api/departments/:id/delete
async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM departamentos WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Departamento eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error en deleteDepartment:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al eliminar departamento" });
  }
}

// ==================== CONFIGURACIÓN - CENTROS DE COSTOS ====================

// POST /api/cost-centers
async function createCostCenter(req, res) {
  try {
    const { codigo, nombre, descripcion } = req.body;

    if (!codigo || !nombre) {
      return res
        .status(400)
        .json({ success: false, message: "Código y nombre son requeridos" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO centros_costos (codigo, nombre, descripcion, activo)
      VALUES (?, ?, ?, 1)
    `,
      [codigo, nombre, descripcion || ""]
    );

    res.json({
      success: true,
      message: "Centro de costos creado exitosamente",
      data: {
        id: result.insertId,
        codigo,
        nombre,
        descripcion: descripcion || "",
        activo: 1,
      },
    });
  } catch (error) {
    console.error("Error en createCostCenter:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al crear centro de costos" });
  }
}

// POST /api/cost-centers/:id
async function updateCostCenter(req, res) {
  try {
    const { id } = req.params;
    const { code, name, active } = req.body;

    await pool.query(
      `
      UPDATE centros_costos 
      SET codigo = ?, nombre = ?, activo = ?
      WHERE id = ?
    `,
      [code, name, active ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: "Centro de costos actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error en updateCostCenter:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar centro de costos",
    });
  }
}

// POST /api/cost-centers/:id/delete
async function deleteCostCenter(req, res) {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM centros_costos WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Centro de costos eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error en deleteCostCenter:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al eliminar centro de costos" });
  }
}
// ==================== CONFIGURACIÓN - LÍNEAS DE SOLICITUD ====================

// POST /api/request-lines/:id/provider
async function updateLineProvider(req, res) {
  try {
    const { id } = req.params;
    const { provider } = req.body;

    await pool.query(
      `UPDATE solicitud_lineas 
       SET proveedor = ?
       WHERE id = ?`,
      [provider, id]
    );

    res.json({
      success: true,
      message: "Proveedor actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error en updateLineProvider:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al actualizar proveedor" });
  }
}
// ==================== CONFIGURACIÓN - USUARIOS ====================

// POST /api/users
async function createUser(req, res) {
  try {
    const { name, email, role, department, password } = req.body;

    if (!name || !email || !role) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Nombre, email y rol son requeridos",
        });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
        });
    }

    // Obtener ID del departamento
    const [deptData] = await pool.query(
      "SELECT id FROM departamentos WHERE nombre = ?",
      [department]
    );

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO usuarios (nombre, email, password_hash, rol, departamento_id, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `,
      [
        name,
        email,
        hashedPassword,
        role,
        deptData.length > 0 ? deptData[0].id : null,
      ]
    );

    res.json({
      success: true,
      message: "Usuario creado exitosamente",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error en createUser:", error);
    console.error("Error details:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al crear usuario: " + error.message,
      });
  }
}

// POST /api/users/:id
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, department, active } = req.body;

    // Obtener ID del departamento
    const [deptData] = await pool.query(
      "SELECT id FROM departamentos WHERE nombre = ?",
      [department]
    );

    await pool.query(
      `
      UPDATE usuarios 
      SET nombre = ?, email = ?, rol = ?, departamento_id = ?, activo = ?
      WHERE id = ?
    `,
      [
        name,
        email,
        role,
        deptData.length > 0 ? deptData[0].id : null,
        active ? 1 : 0,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error en updateUser:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al actualizar usuario" });
  }
}

// POST /api/users/:id/delete
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error en deleteUser:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al eliminar usuario" });
  }
}

module.exports = {
  createRequest,
  approveRequest,
  getRequestDetail,
  rejectRequest,
  createCategory,
  updateCategory,
  deleteCategory,
  updateLineProvider,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  createUser,
  updateUser,
  deleteUser,
  loginUsers__,
  resetPassword__,
};
