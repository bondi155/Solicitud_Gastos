const { put } = require("@vercel/blob")
const multer = require("multer")

// Configurar multer para guardar archivos en memoria temporalmente
const storage = multer.memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Tipo de archivo no permitido"), false)
    }
  },
})

// Función para subir archivo a Vercel Blob
async function uploadToBlob(file, folder = "solicitudes") {
  try {
    const filename = `${folder}/${Date.now()}-${file.originalname}`

    // Subir a Vercel Blob
    const blob = await put(filename, file.buffer, {
      access: "public",
      contentType: file.mimetype,
    })

    return {
      url: blob.url,
      filename: file.originalname,
      size: file.size,
      type: file.mimetype,
    }
  } catch (error) {
    console.error("Error uploading to Blob:", error)
    throw error
  }
}

module.exports = { upload, uploadToBlob }
