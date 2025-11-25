require('dotenv').config();
const helmet = require('helmet');
const multer = require('multer');
const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 5028;
const bodyParser = require('body-parser');
const cors = require('cors');
const GetDataController = require('./Controllers/GetFuncData');
const PostDataController = require('./Controllers/PostFuncData');
const progressManager = require('./Controllers/Progress');
//multer
const jwt = require('jsonwebtoken');
const secretkey = process.env.JWT_SECRET;
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const { upload } = require("./blobConfig")

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (req.path === '/loginUsers') {
    // Si es la ruta de generación del token, continuar sin verificar el token
    next();
  } else {
    // Verificar el token en todas las demás rutas
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, secretkey, (err, user) => {
      if (err) return res.status(403).send();
      req.user = user;
      next();
    });
  }
}

//limitador de tasa contra ddos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // limita cada ip a 500 request
});

//limitador de tasa a todas las rutas
app.use(limiter);



// Configuración CORS
const corsOptions = {
  origin: [
    'https://solicitudesexportadoracafecalifornia.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Manejar preflight requests explícitamente
app.options('*', cors(corsOptions));

app.use(express.json());

// Rate limiter específico para barra de progreso
const progressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // Permite 300 requests en 15 minutos 
});

app.get('/upload-progress',progressLimiter, (req, res) => {
  res.json(progressManager.getProgress());
});


// ==================== DASHBOARD ====================
app.get("/api/dashboard/stats", authenticateToken, GetDataController.getDashboardStats)
app.get("/api/dashboard/monthly-requests", authenticateToken, GetDataController.getMonthlyRequests)
app.get("/api/dashboard/category-stats", authenticateToken, GetDataController.getCategoryStats)
app.get("/api/dashboard/monthly-amounts", authenticateToken, GetDataController.getMonthlyAmounts)
app.get("/api/dashboard/recent-requests", authenticateToken, GetDataController.getRecentRequests)

// ==================== SOLICITUDES ====================
app.get("/api/requests", authenticateToken, GetDataController.getRequestsList)
app.get("/api/requests/:id", authenticateToken, GetDataController.getRequestDetail)
app.post("/api/requests/:id/approve", authenticateToken, PostDataController.approveRequest)
app.post("/api/requests/:id/reject", authenticateToken, PostDataController.rejectRequest)
app.post("/api/requests", authenticateToken, upload.array("attachments", 5), PostDataController.createRequest)
// ==================== CONFIGURACIÓN ====================
// Categorías
app.get("/api/categories", authenticateToken, GetDataController.getCategories)
app.post("/api/categories", authenticateToken, PostDataController.createCategory)
app.put("/api/categories/:id", authenticateToken, PostDataController.updateCategory)
app.delete("/api/categories/:id", authenticateToken, PostDataController.deleteCategory)

// Departamentos
app.get("/api/departments", authenticateToken, GetDataController.getDepartments)
app.post("/api/departments", authenticateToken, PostDataController.createDepartment)
app.put("/api/departments/:id", authenticateToken, PostDataController.updateDepartment)
app.delete("/api/departments/:id", authenticateToken, PostDataController.deleteDepartment)

// Centros de Costos
app.get("/api/cost-centers", authenticateToken, GetDataController.getCostCenters)
app.post("/api/cost-centers", authenticateToken, PostDataController.createCostCenter)
app.put("/api/cost-centers/:id", authenticateToken, PostDataController.updateCostCenter)
app.delete("/api/cost-centers/:id", authenticateToken, PostDataController.deleteCostCenter)

// Usuarios
app.get("/api/users", authenticateToken, GetDataController.getUsers)
app.post("/api/users", authenticateToken, PostDataController.createUser)
app.put("/api/users/:id", authenticateToken, PostDataController.updateUser)
app.delete("/api/users/:id", authenticateToken, PostDataController.deleteUser)

// Reports
app.get("/api/reports", authenticateToken, GetDataController.getReports)


app.post('/loginUsers', authenticateToken, PostDataController.loginUsers__); // Login para obtener el token
app.put('/resetPass', authenticateToken, PostDataController.resetPassword__); // Reseteo password

// Actualizar proveedor de línea de solicitud
app.post("/api/request-lines/:id/provider", authenticateToken, PostDataController.updateLineProvider)


// Verificar conexión a la base de datos al iniciar
const mysql = require('mysql2');
async function verifyDatabaseConnection() {
  try {
    const pool = mysql.createPool(process.env.DATABASE_URL).promise();
    await pool.query('SELECT 1');
    console.log('✓ Conexión a base de datos exitosa');
    return true;
  } catch (error) {
    console.error('✗ Error al conectar a la base de datos:', error.message);
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'configurada' : 'NO CONFIGURADA');
    return false;
  }
}

// Iniciar servidor con verificaciones
async function startServer() {
  const dbConnected = await verifyDatabaseConnection();

  if (!dbConnected) {
    console.error('⚠ Advertencia: El servidor iniciará pero la BD no está disponible');
  }

  app.listen(port, () => {
    console.log(`✓ Servidor funcionando en puerto ${port}`);
    console.log(`✓ CORS habilitado para frontend`);
    console.log(`✓ Modo: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
