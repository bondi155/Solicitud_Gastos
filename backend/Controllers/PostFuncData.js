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
  try {
    const {
      title,
      amount,
      category,
      description,
      date,
      department,
      costCenter,
      vendor,
      userId, // ID del usuario logueado
    } = req.body;

    // Validaciones
    if (!title || !amount || !category || !description || !date) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos requeridos",
      });
    }

    const [categoryData] = await pool.query(
      "SELECT id FROM categorias WHERE nombre = ?",
      [category]
    );
    const [departmentData] = await pool.query(
      "SELECT id FROM departamentos WHERE nombre = ?",
      [department]
    );

    let costCenterId = null;
    if (costCenter) {
      const [costCenterData] = await pool.query(
        "SELECT id FROM centros_costos WHERE codigo = ?",
        [costCenter]
      );
      if (costCenterData.length > 0) {
        costCenterId = costCenterData[0].id;
      }
    }

    if (!categoryData.length || !departmentData.length) {
      return res.status(400).json({
        success: false,
        message: "Categoría o departamento inválido",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO solicitudes 
      (usuario_id, departamento_id, centro_costo_id, categoria_id, monto, descripcion, proveedor, estado, fecha_solicitud)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `,
      [
        userId,
        departmentData[0].id,
        costCenterId,
        categoryData[0].id,
        amount,
        description,
        vendor,
        date,
      ]
    );

    const requestId = result.insertId;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Subir archivo a Vercel Blob
          const blobData = await uploadToBlob(file, "solicitudes");
          console.log("[v0 Backend] File uploaded to Blob:", blobData.url);

          // Guardar información en la base de datos
          await pool.query(
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
          // Continuar con los demás archivos si uno falla
        }
      }
    }

    res.json({
      success: true,
      message: "Solicitud creada exitosamente",
      data: { id: requestId },
    });
  } catch (error) {
    console.error("Error en createRequest:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al crear solicitud" });
  }
}

// POST /api/requests/:id/approve
async function approveRequest(req, res) {
  try {
    const { id } = req.params
    const { comments, approverId } = req.body // ID del aprobador

    console.log("[v0 Backend] ===== APPROVE REQUEST =====")
    console.log("[v0 Backend] Request ID:", id)
    console.log("[v0 Backend] Full req.body:", req.body)
    console.log("[v0 Backend] comments:", comments)
    console.log("[v0 Backend] approverId:", approverId)
    console.log("[v0 Backend] approverId type:", typeof approverId)

    await pool.query(
      `
      UPDATE solicitudes 
      SET estado = 'Aprobada', 
          aprobador_id = ?,
          comentario_aprobacion = ?,
          fecha_aprobacion = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [approverId, comments || null, id],
    )

    console.log("[v0 Backend] Update query executed successfully")

    res.json({
      success: true,
      message: "Solicitud aprobada exitosamente",
    })
  } catch (error) {
    console.error("Error en approveRequest:", error)
    res.status(500).json({ success: false, message: "Error al aprobar solicitud" })
  }
}

// POST /api/requests/:id/reject
async function rejectRequest(req, res) {
  try {
    const { id } = req.params
    const { comments, approverId } = req.body // ID del aprobador

    console.log("[v0 Backend] ===== REJECT REQUEST =====")
    console.log("[v0 Backend] Request ID:", id)
    console.log("[v0 Backend] Full req.body:", req.body)
    console.log("[v0 Backend] comments:", comments)
    console.log("[v0 Backend] approverId:", approverId)
    console.log("[v0 Backend] approverId type:", typeof approverId)

    if (!comments) {
      return res.status(400).json({
        success: false,
        message: "Los comentarios son obligatorios para rechazar",
      })
    }

    await pool.query(
      `
      UPDATE solicitudes 
      SET estado = 'Rechazada',
          aprobador_id = ?,
          comentario_aprobacion = ?,
          fecha_aprobacion = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [approverId, comments, id],
    )

    console.log("[v0 Backend] Update query executed successfully")

    res.json({
      success: true,
      message: "Solicitud rechazada exitosamente",
    })
  } catch (error) {
    console.error("Error en rejectRequest:", error)
    res.status(500).json({ success: false, message: "Error al rechazar solicitud" })
  }
}
// GET /api/requests/:id
async function getRequestDetail(req, res) {
  try {
    const { id } = req.params

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
      [id],
    )

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Solicitud no encontrada" })
    }

    // Obtener archivos adjuntos
    const [attachments] = await pool.query(
      `
      SELECT nombre_archivo, ruta_archivo, tipo_archivo, tamano
      FROM archivos_adjuntos
      WHERE solicitud_id = ?
    `,
      [id],
    )

    const approvalHistory = []
    const solicitud = result[0]

    if (solicitud.aprobador_id && solicitud.fecha_aprobacion) {
      approvalHistory.push({
        action: solicitud.estado === "Aprobada" ? "Aprobado" : "Rechazado",
        reason: solicitud.comentario_aprobacion || "",
        date: solicitud.fecha_aprobacion,
        approvedBy: solicitud.approvedByName || "Usuario desconocido",
      })
    }

    res.json({
      success: true,
      data: {
        ...result[0],
        attachments: attachments,
        approvalHistory: approvalHistory,
      },
    })
  } catch (error) {
    console.error("Error en getRequestDetail:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener detalle de solicitud",
    })
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
    res
      .status(500)
      .json({
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

// ==================== CONFIGURACIÓN - USUARIOS ====================

// POST /api/users
async function createUser(req, res) {
  try {
    const { name, email, role, department, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email, rol y contraseña son requeridos",
      });
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Obtener ID del departamento
    const [deptData] = await pool.query(
      "SELECT id FROM departamentos WHERE nombre = ?",
      [department]
    );

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, rol, departamento_id, password_hash, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [name, email, role, deptData.length > 0 ? deptData[0].id : null, passwordHash]
    );

    res.json({
      success: true,
      message: "Usuario creado exitosamente",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error en createUser:", error);
    
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Este email ya está registrado",
      });
    }
    
    res.status(500).json({ success: false, message: "Error al crear usuario" });
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
