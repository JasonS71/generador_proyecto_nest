/**
 * Generador de Proyectos NestJS
 * Aplicación para crear proyectos NestJS a partir de una base de datos PostgreSQL existente.
 * Incluye funcionalidades de auditoría y control de servidores.
 */

// Importación de dependencias
const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const treeKill = require('tree-kill');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');

// Configuración de encriptación (AES-256-CBC)
const ENCRYPTION_KEY = Buffer.from('my32bytesecretkey12345678901234!', 'utf8');
const IV = Buffer.from('my16byteiv123456', 'utf8');

console.log('[DEBUG] Key length:', ENCRYPTION_KEY.length);
console.log('[DEBUG] IV length:', IV.length);
console.log('[DEBUG] Key Hex:', ENCRYPTION_KEY.toString('hex'));
console.log('[DEBUG] IV Hex:', IV.toString('hex'));

/**
 * Funciones de encriptación y desencriptación para seguridad de datos
 */

/**
 * Encripta texto usando AES-256-CBC
 * @param {string} text - Texto a encriptar
 * @returns {string} - Texto encriptado en formato URL-safe base64
 */
function encryptText(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  const encrypted = cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
  return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Genera la interfaz HTML para la página de estado del proyecto
 * @param {string} projectName - Nombre del proyecto
 * @param {string} status - Estado actual del servidor ('En ejecución' o 'Detenido')
 * @param {Array|null} auditData - Datos de auditoría (opcional)
 * @param {string|null} error - Mensaje de error (opcional)
 * @returns {string} - HTML de la página de estado
 */
function renderProjectStatus(projectName, status, auditData = null, error = null) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Administrar Servidor - ${projectName}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        .modern-card {
          border: none;
          border-radius: 15px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          background: rgba(255, 255, 255, 0.9);
        }
        .navbar {
          background-color: #1a73e8 !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .modern-btn {
          background-color: #1a73e8;
          border: none;
          border-radius: 50px;
          padding: 12px 24px;
          font-weight: 500;
          transition: all 0.3s ease;
          margin: 8px;
        }
        .modern-btn:hover {
          background-color: #1558b0;
          transform: translateY(-1px);
        }
        .btn-danger {
          border-radius: 50px;
          padding: 12px 24px;
        }
        .status-badge {
          display: inline-block;
          border-radius: 50px;
          padding: 8px 16px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .status-badge.running {
          background-color: #4CAF50;
          color: white;
        }
        .status-badge.stopped {
          background-color: #F44336;
          color: white;
        }
        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-indicator.running {
          background-color: #4CAF50;
          box-shadow: 0 0 0 rgba(76, 175, 80, 0.4);
          animation: pulse-green 2s infinite;
        }
        .status-indicator.stopped {
          background-color: #F44336;
        }
        @keyframes pulse-green {
          0% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
          }
        }
        .section-title {
          position: relative;
          margin-bottom: 20px;
          padding-bottom: 10px;
        }
        .section-title:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 3px;
          background-color: #1a73e8;
        }
        .help-card {
          background-color: #f8f9fa;
          border-left: 4px solid #1a73e8;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .tab-content {
          padding: 20px 0;
        }
        .nav-tabs .nav-link {
          border-radius: 8px 8px 0 0;
          padding: 10px 20px;
          font-weight: 500;
        }
        .nav-tabs .nav-link.active {
          background-color: #fff;
          border-color: #dee2e6 #dee2e6 #fff;
          color: #1a73e8;
          font-weight: 600;
        }
        .audit-empty {
          text-align: center;
          padding: 50px 20px;
          color: #6c757d;
        }
        .audit-empty i {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="row">
          <div class="col-lg-4">
            <div class="card modern-card mb-4">
              <div class="card-body">
                <h4 class="card-title section-title">Información</h4>
                
                <div class="mb-3">
                  <label class="text-muted">Nombre del Proyecto:</label>
                  <div class="fs-5 fw-bold">${projectName}</div>
                </div>
                
                <div class="text-center my-4">
                  <div class="status-badge ${status === 'En ejecución' ? 'running' : 'stopped'}">
                    <span class="status-indicator ${status === 'En ejecución' ? 'running' : 'stopped'}"></span>
                    ${status}
                  </div>
                </div>
                
                <div class="help-card">
                  <h6><i class="bi bi-info-circle-fill me-2"></i>¿Qué significa esto?</h6>
                  <p class="mb-0">El servidor es necesario para que su aplicación funcione. Cuando está <strong>En ejecución</strong>, su aplicación es accesible.</p>
                </div>
                
                <div class="d-grid gap-2">
                  <form action="/start-server/${projectName}" method="post">
                    <button type="submit" class="btn btn-success w-100" ${status === 'En ejecución' ? 'disabled' : ''}>
                      <i class="bi bi-play-fill me-2"></i>Iniciar Servidor
                    </button>
                  </form>
                  <form action="/stop-server/${projectName}" method="post">
                    <button type="submit" class="btn btn-danger w-100" ${status === 'Detenido' ? 'disabled' : ''}>
                      <i class="bi bi-stop-fill me-2"></i>Detener Servidor
                    </button>
                  </form>
                </div>
                
                <div class="mt-4">
                  <a href="/" class="btn btn-outline-secondary w-100">
                    <i class="bi bi-house-fill me-2"></i>Volver al Inicio
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-lg-8">
            <div class="card modern-card">
              <div class="card-body">
                <ul class="nav nav-tabs" id="myTab" role="tablist">
                  <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="audit-tab" data-bs-toggle="tab" data-bs-target="#audit-tab-pane" type="button" role="tab" aria-controls="audit-tab-pane" aria-selected="true">
                      <i class="bi bi-list-check me-2"></i>Registro de Actividad
                    </button>
                  </li>
                  <li class="nav-item" role="presentation">
                    <button class="nav-link" id="help-tab" data-bs-toggle="tab" data-bs-target="#help-tab-pane" type="button" role="tab" aria-controls="help-tab-pane" aria-selected="false">
                      <i class="bi bi-question-circle me-2"></i>Ayuda
                    </button>
                  </li>
                </ul>
                <div class="tab-content" id="myTabContent">
                  <div class="tab-pane fade show active" id="audit-tab-pane" role="tabpanel" aria-labelledby="audit-tab" tabindex="0">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                      <h5 class="card-title section-title">Registro de Actividad</h5>
                      <form method="POST" action="/refresh-audit/${projectName}">
                        <button type="submit" class="btn btn-sm btn-primary">
                          <i class="bi bi-arrow-clockwise me-2"></i>Actualizar
                        </button>
                      </form>
                    </div>
                    
                    <p class="text-muted small mb-3">Este registro muestra todos los cambios realizados en la base de datos de su aplicación.</p>
                    
                    ${error ? `<div class="alert alert-danger">${error}</div>` : ''}
                    
                    ${auditData && auditData.length > 0 ? `
                      <div class="table-responsive">
                        <table class="table table-striped table-hover">
                          <thead>
                            <tr>
                              <th style="width: 100px">Acción</th>
                              <th style="width: 180px">Fecha/Hora</th>
                              <th style="width: 120px">Tabla</th>
                              <th>Datos</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${auditData.map(entry => `
                              <tr>
                                <td>
                                  ${entry.action === 'POST' ? '<span class="badge bg-success">Agregar</span>' : 
                                    entry.action === 'UPDATE' ? '<span class="badge bg-warning text-dark">Editar</span>' : 
                                    '<span class="badge bg-danger">Eliminar</span>'}
                                </td>
                                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                                <td>${entry.table}</td>
                                <td>
                                  <div class="small">
                                    ${Object.entries(entry.data || {})
                                      .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
                                      .join('')
                                    }
                                  </div>
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    ` : `
                      <div class="audit-empty">
                        <i class="bi bi-clock-history"></i>
                        <p>No hay registros de actividad disponibles</p>
                        <p class="small">Los registros aparecerán cuando haya cambios en la base de datos</p>
                      </div>
                    `}
                  </div>
                  
                  <div class="tab-pane fade" id="help-tab-pane" role="tabpanel" aria-labelledby="help-tab" tabindex="0">
                    <h5 class="card-title section-title">Ayuda</h5>
                    
                    <div class="accordion" id="helpAccordion">
                      <div class="accordion-item">
                        <h2 class="accordion-header">
                          <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                            ¿Cómo acceder a mi aplicación?
                          </button>
                        </h2>
                        <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#helpAccordion">
                          <div class="accordion-body">
                            <ol>
                              <li>Haga clic en <strong>Iniciar Servidor</strong></li>
                              <li>Espere unos segundos a que el servidor arranque</li>
                              <li>Acceda a su aplicación en: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
                            </ol>
                            <p class="text-muted small">Asegúrese de que el estado del servidor sea <strong>En ejecución</strong> para que la aplicación funcione.</p>
                          </div>
                        </div>
                      </div>
                      <div class="accordion-item">
                        <h2 class="accordion-header">
                          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                            ¿Qué es el Registro de Actividad?
                          </button>
                        </h2>
                        <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                          <div class="accordion-body">
                            <p>El Registro de Actividad muestra todos los cambios realizados en su base de datos, incluyendo:</p>
                            <ul>
                              <li><span class="badge bg-success">Agregar</span> - Cuando se crea un nuevo registro</li>
                              <li><span class="badge bg-warning text-dark">Editar</span> - Cuando se modifica un registro existente</li>
                              <li><span class="badge bg-danger">Eliminar</span> - Cuando se elimina un registro</li>
                            </ul>
                            <p class="text-muted small">Este registro es útil para rastrear cambios y actividad en su aplicación.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `;
}

// Almacenamiento de procesos de servidor activos
const serverProcesses = {};

// Inicialización de la aplicación Express
const app = express();

// Middleware para procesar formularios
app.use(express.urlencoded({ extended: true }));

// Configuración de conexión a PostgreSQL por defecto
const defaultPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '12345',
  port: 5432,
});

// Variables globales para almacenar la conexión y el nombre de la BD seleccionada
let currentPool = null;
let selectedDb = '';

/**
 * Rutas e interfaces de la aplicación
 */

/**
 * INTERFAZ 1: Selección de Base de Datos
 * Muestra las bases de datos disponibles para iniciar el proceso de generación
 */
app.get('/', async (req, res) => {
  try {
    const result = await defaultPool.query(
      `SELECT datname FROM pg_database WHERE datistemplate = false AND datallowconn = true`
    );
    const databases = result.rows.map(row => row.datname);

    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generador de Proyecto - Paso 1</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        .modern-card {
          border: none;
          border-radius: 15px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .modern-btn {
          background-color: #1a73e8;
          border: none;
          border-radius: 50px;
          padding: 10px 20px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }
        .modern-btn:hover {
          background-color: #1558b0;
        }
        .navbar {
          background-color: #1a73e8 !important;
        }
        .step-indicator {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }
        .step {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #ddd;
          color: #555;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 15px;
          position: relative;
          font-weight: bold;
        }
        .step.active {
          background-color: #1a73e8;
          color: white;
        }
        .step:not(:last-child):after {
          content: '';
          position: absolute;
          width: 40px;
          height: 2px;
          background-color: #ddd;
          top: 50%;
          left: 100%;
        }
        .help-text {
          background-color: #f8f9fa;
          border-left: 4px solid #1a73e8;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .tooltip-icon {
          cursor: help;
          color: #1a73e8;
          margin-left: 5px;
        }
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <!-- Indicador de pasos -->
            <div class="step-indicator">
              <div class="step active">1</div>
              <div class="step">2</div>
              <div class="step">3</div>
            </div>
            
            <div class="card modern-card">
              <div class="card-header text-center">
                <h2 class="mb-0">Paso 1: Seleccionar Base de Datos</h2>
              </div>
              <div class="card-body">
                <!-- Texto de ayuda -->
                <div class="help-text">
                  <h5><i class="bi bi-info-circle-fill me-2"></i>¿Qué es esto?</h5>
                  <p>
                    Este es el primer paso para crear su aplicación web. Debe seleccionar una base de datos 
                    existente que contiene la información que desea gestionar.
                  </p>
                  <p class="mb-0">
                    <strong>¿Qué necesita saber?</strong> Solo seleccione la base de datos que contiene sus tablas de información.
                  </p>
                </div>
                
                <form method="POST" action="/select-db">
                  <div class="mb-4">
                    <label class="form-label fw-bold">Seleccione una base de datos de la lista:</label>
                    `;
                    databases.forEach(db => {
                      html += `
                    <div class="form-check mt-2">
                      <input class="form-check-input" type="radio" name="database" value="${db}" id="${db}">
                      <label class="form-check-label" for="${db}">${db}</label>
                    </div>
                      `;
                    });
                    html += `
                  </div>
                  <div class="d-grid">
                    <button type="submit" class="modern-btn text-white">
                      <i class="bi bi-arrow-right-circle me-2"></i>Continuar al Paso 2
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send('Error al obtener bases de datos: ' + err.message);
  }
});

/**
 * INTERFAZ 2: Confirmación de Conexión y Formulario para Generar Proyecto Nest
 * Conecta a la base de datos seleccionada y muestra formulario para configurar el proyecto
 */
app.post('/select-db', async (req, res) => {
  selectedDb = req.body.database;
  if (!selectedDb) {
    return res.send('No se seleccionó ninguna base de datos.');
  }

  // Crear un nuevo pool usando la BD seleccionada
  currentPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: selectedDb,
    password: '12345',
    port: 5432,
  });

  try {
    // Se consulta para obtener las tablas y confirmar la conexión
    const result = await currentPool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tables = result.rows.map(row => row.table_name);

    // Mostrar interfaz de confirmación de conexión y formulario para ingresar el nombre del proyecto y seleccionar tablas
    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generador de Proyecto - Paso 2</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        .modern-card {
          border: none;
          border-radius: 15px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .modern-btn {
          background-color: #1a73e8;
          border: none;
          border-radius: 50px;
          padding: 10px 20px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }
        .modern-btn:hover {
          background-color: #1558b0;
        }
        .navbar {
          background-color: #1a73e8 !important;
        }
        .step-indicator {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }
        .step {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #ddd;
          color: #555;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 15px;
          position: relative;
          font-weight: bold;
        }
        .step.active {
          background-color: #1a73e8;
          color: white;
        }
        .step:not(:last-child):after {
          content: '';
          position: absolute;
          width: 40px;
          height: 2px;
          background-color: #ddd;
          top: 50%;
          left: 100%;
        }
        .step.completed {
          background-color: #4CAF50;
          color: white;
        }
        .step.completed:not(:last-child):after {
          background-color: #4CAF50;
        }
        .help-text {
          background-color: #f8f9fa;
          border-left: 4px solid #1a73e8;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .badge-connected {
          background-color: #4CAF50;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-left: 10px;
        }
        .table-selector {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .select-all-btn {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <!-- Indicador de pasos -->
            <div class="step-indicator">
              <div class="step completed">1</div>
              <div class="step active">2</div>
              <div class="step">3</div>
            </div>
            
            <div class="card modern-card">
              <div class="card-header text-center">
                <h2 class="mb-0">Paso 2: Configurar su Proyecto</h2>
                <div><span class="badge-connected"><i class="bi bi-check-circle-fill me-1"></i>Conectado a: ${selectedDb}</span></div>
              </div>
              <div class="card-body">
                <!-- Texto de ayuda -->
                <div class="help-text">
                  <h5><i class="bi bi-info-circle-fill me-2"></i>Instrucciones</h5>
                  <p>Ahora definirá cómo será su proyecto NestJS:</p>
                  <ol class="mb-0">
                    <li>Elija un <strong>nombre para su proyecto</strong> (solo letras, números y guiones)</li>
                    <li>Seleccione las <strong>tablas</strong> que desea incluir en su proyecto</li>
                  </ol>
                </div>
                <form method="POST" action="/generate">
                  <div class="mb-4">
                    <label for="project_name" class="form-label fw-bold">
                      <i class="bi bi-1-circle-fill me-2"></i>Nombre del Proyecto
                    </label>
                    <div class="input-group mb-3">
                      <span class="input-group-text"><i class="bi bi-folder-fill"></i></span>
                      <input type="text" class="form-control" id="project_name" name="project_name" 
                        placeholder="ejemplo_de_nombre_de_proyecto" required>
                    </div>
                    <small class="text-muted">Este será el nombre de su proyecto. Use solo letras, números y guiones.</small>
                  </div>
                  
                  <div class="mb-4">
                    <label class="form-label fw-bold">
                      <i class="bi bi-2-circle-fill me-2"></i>Tablas a Incluir
                    </label>
                    <p class="text-muted mb-2">Seleccione las tablas que desea gestionar en su aplicación</p>
                    
                    <button type="button" id="selectAllBtn" class="btn btn-sm btn-outline-primary select-all-btn">
                      Seleccionar todas
                    </button>
                    
                    <div class="table-selector">
                      ${tables.length > 0 ? 
                        tables.map(table => `
                          <div class="form-check mb-2">
                            <input class="form-check-input table-checkbox" type="checkbox" name="tables" value="${table}" id="${table}">
                            <label class="form-check-label" for="${table}">
                              <strong>${table}</strong>
                            </label>
                          </div>
                        `).join('') 
                        : '<p class="text-muted">No se encontraron tablas en esta base de datos.</p>'
                      }
                    </div>
                    <div id="selectedCount" class="text-muted mb-3">0 tablas seleccionadas</div>
                  </div>
                  
                  <div class="d-flex justify-content-between">
                    <a href="/" class="btn btn-outline-secondary">
                      <i class="bi bi-arrow-left me-2"></i>Volver
                    </a>
                    <button type="submit" class="modern-btn text-white">
                      <i class="bi bi-arrow-right-circle me-2"></i>Continuar al Paso 3
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const selectAllBtn = document.getElementById('selectAllBtn');
          const checkboxes = document.querySelectorAll('.table-checkbox');
          const selectedCount = document.getElementById('selectedCount');
          
          function updateCount() {
            const count = document.querySelectorAll('.table-checkbox:checked').length;
            selectedCount.textContent = count + ' tablas seleccionadas';
          }
          
          checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateCount);
          });
          
          selectAllBtn.addEventListener('click', function() {
            const isAllSelected = document.querySelectorAll('.table-checkbox:checked').length === checkboxes.length;
            
            checkboxes.forEach(checkbox => {
              checkbox.checked = !isAllSelected;
            });
            
            updateCount();
            selectAllBtn.textContent = isAllSelected ? 'Seleccionar todas' : 'Deseleccionar todas';
          });
          
          updateCount();
        });
      </script>
    </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send('Error al obtener tablas: ' + err.message);
  }
});

/**
 * INTERFAZ 3: Creación de Proyecto Nest y Archivos según Tablas Seleccionadas
 * Crea una nueva base de datos y genera el proyecto NestJS con módulos para cada tabla
 */
app.post('/generate', async (req, res) => {
  let tables = req.body.tables;
  const projectName = req.body.project_name;
  if (!projectName) {
    return res.send('El nombre del proyecto es requerido.');
  }

  if (!tables) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
        <div class="container py-5">
          <div class="alert alert-warning" role="alert">
            No se seleccionó ninguna tabla.
          </div>
        </div>
      </body>
      </html>
    `);
  }
  if (!Array.isArray(tables)) {
    tables = [tables];
  }

  if (!currentPool) {
    return res.send('No hay base de datos seleccionada.');
  }
  const newDbName = `${projectName}_db`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  try {
    // 1. Crear nueva base de datos
    const createDbQuery = `CREATE DATABASE "${newDbName}"`;
    console.log('Creando BD:', createDbQuery);
    await defaultPool.query(createDbQuery);

    // 2. Conectar a la nueva BD
    const newPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: newDbName,
      password: '12345',
      port: 5432,
    });

    await newPool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // 3. Copiar estructura de tablas
    for (const table of tables) {
      try {
        const { rows: sequences } = await currentPool.query(`
          SELECT sequence_name 
          FROM information_schema.sequences 
          WHERE sequence_name LIKE '%${table}%'
        `);

        for (const seq of sequences) {
          const createSeqQuery = `CREATE SEQUENCE IF NOT EXISTS ${seq.sequence_name}`;
          console.log('Creando secuencia:', createSeqQuery);
          await newPool.query(createSeqQuery);
        }

        const { rows: columns } = await currentPool.query(`
          SELECT 
            column_name, 
            udt_name, 
            is_nullable, 
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [table]);

        // 3. Construir query CREATE TABLE
        let createQuery = `CREATE TABLE "${table}" (\n`;

        // Columnas
        createQuery += columns.map(col => {
          let colDef = `  "${col.column_name}" ${col.udt_name}`;

          // Manejar NOT NULL
          if (col.is_nullable === 'NO') colDef += " NOT NULL";

          // Manejar DEFAULT (sin modificar el valor original)
          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }
          return colDef;
        }).join(",\n");

        // 4. Agregar PK
        const { rows: primaryKeys } = await currentPool.query(`
          SELECT ccu.column_name 
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = $1 
            AND tc.constraint_type = 'PRIMARY KEY'
        `, [table]);

        if (primaryKeys.length > 0) {
          createQuery += `,\n  CONSTRAINT pk_${table} PRIMARY KEY (${primaryKeys.map(pk => `"${pk.column_name}"`).join(', ')})`;
        }

        // Cerrar paréntesis de CREATE TABLE
        createQuery += "\n);"; // ← Corrección clave aquí
        console.log('\nQuery final:', createQuery);
        await newPool.query(createQuery);

        // 5. Agregar FOREIGN KEYS
        const { rows: fks } = await currentPool.query(`
          SELECT 
            tc.constraint_name,
            ccu.column_name, 
            ccu2.table_name AS foreign_table,
            ccu2.column_name AS foreign_column
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage ccu2
            ON rc.unique_constraint_name = ccu2.constraint_name
          WHERE tc.table_name = $1 
            AND tc.constraint_type = 'FOREIGN KEY'
        `, [table]);

        for (const fk of fks) {
          const fkQuery = `
            ALTER TABLE "${table}"
            ADD CONSTRAINT "${fk.constraint_name}"
            FOREIGN KEY ("${fk.column_name}") 
            REFERENCES "${fk.foreign_table}" ("${fk.foreign_column}")
          `;
          console.log('Creando FK:', fkQuery);
          await newPool.query(fkQuery);
        }

        // 6. Crear tabla espejo con triggers
        const mirrorTableName = encryptText(`${table}_mirror`);

        // Crear estructura de tabla espejo
        let mirrorCreateQuery = `CREATE TABLE "${mirrorTableName}" (\n`;
        columns.forEach(col => {
          const encryptedColName = encryptText(col.column_name);
          mirrorCreateQuery += `  "${encryptedColName}" TEXT,\n`;
        });

        // Encriptar nombres de columnas adicionales
        const encryptedAccionColumn = encryptText('accion');
        const encryptedFechaColumn = encryptText('fecha');

        // Añadir columnas encriptadas
        mirrorCreateQuery += `  "${encryptedAccionColumn}" TEXT NOT NULL,\n  "${encryptedFechaColumn}" TEXT NOT NULL\n);`;

        console.log('\nCreando tabla espejo:', mirrorCreateQuery);
        await newPool.query(mirrorCreateQuery);

        // Generar claves en formato hexadecimal
        const encryptionKeyHex = ENCRYPTION_KEY.toString('hex');
        const ivHex = IV.toString('hex');

        // Construir función de trigger corregida
        const triggerFunctionQuery = `
          CREATE OR REPLACE FUNCTION ${table}_audit_trigger_func()
          RETURNS TRIGGER AS $$
          BEGIN
            IF TG_OP = 'INSERT' THEN
              INSERT INTO "${mirrorTableName}"
              VALUES (
                ${columns.map(c => 
                  `ENCODE(
                    ENCRYPT(
                      convert_to(NEW.${c.column_name}::text, 'UTF8')::bytea,
                      decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                      'aes-cbc/pad:pkcs'
                    ),
                    'hex'
                  )`
                ).join(', ')},
                ENCODE(
                  ENCRYPT(
                    convert_to('AGREGAR'::text, 'UTF8')::bytea,
                    decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                    'aes-cbc/pad:pkcs'
                  ),
                  'hex'
                ),
                ENCODE(
                  ENCRYPT(
                    convert_to(NOW()::text, 'UTF8')::bytea,
                    decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                    'aes-cbc/pad:pkcs'
                  ),
                  'hex'
                )
              );
            ELSIF TG_OP = 'UPDATE' THEN
              INSERT INTO "${mirrorTableName}"
              VALUES (
                ${columns.map(c => 
                  `ENCODE(
                    ENCRYPT(
                      convert_to(NEW.${c.column_name}::text, 'UTF8')::bytea,
                      decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                      'aes-cbc/pad:pkcs'
                    ),
                    'hex'
                  )`
                ).join(', ')},
                ENCODE(
                  ENCRYPT(
                    convert_to('EDITAR'::text, 'UTF8')::bytea,
                    decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                    'aes-cbc/pad:pkcs'
                  ),
                  'hex'
                ),
                ENCODE(
                  ENCRYPT(
                    convert_to(NOW()::text, 'UTF8')::bytea,
                    decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                    'aes-cbc/pad:pkcs'
                  ),
                  'hex'
                )
              );
            ELSIF TG_OP = 'DELETE' THEN
              INSERT INTO "${mirrorTableName}"
              VALUES (
                ${columns.map(c => 
                  `ENCODE(
                    ENCRYPT(
                      convert_to(OLD.${c.column_name}::text, 'UTF8')::bytea,
                      decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                      'aes-cbc/pad:pkcs'
                    ),
                    'hex'
                  )`
                ).join(', ')},
                ENCODE(
                  ENCRYPT(
                    convert_to('ELIMINAR'::text, 'UTF8')::bytea,
                    decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                    'aes-cbc/pad:pkcs'
                  ),
                  'hex'
                ),
                ENCODE(
                  ENCRYPT(
                    convert_to(NOW()::text, 'UTF8')::bytea,
                    decode('${ENCRYPTION_KEY.toString('hex')}', 'hex'),
                    'aes-cbc/pad:pkcs'
                  ),
                  'hex'
                )
              );
            END IF;
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql;
        `;

        await newPool.query(triggerFunctionQuery);

        // Crear trigger
        const triggerQuery = `
          CREATE TRIGGER ${table}_audit_trigger
          AFTER INSERT OR UPDATE OR DELETE ON "${table}"
          FOR EACH ROW
          EXECUTE FUNCTION ${table}_audit_trigger_func();
        `;

        await newPool.query(triggerQuery);

      } catch (err) {
        console.error(`Error en tabla ${table}:`, {
          message: err.message,
          query: err.query
        });
      }
    }

    currentPool = newPool;
    selectedDb = newDbName;

  } catch (err) {
    console.error('Error general:', {
      message: err.message,
      code: err.code
    });

    if (err.code === '42P04') {
      await defaultPool.query(`DROP DATABASE IF EXISTS "${newDbName}"`);
      await defaultPool.query(`CREATE DATABASE "${newDbName}"`);
    }
    return res.status(500).send('Error al crear la estructura de la BD');
  }

  // Definir el directorio del proyecto Nest (se creará en la misma carpeta que este archivo)
  const projectDir = path.join(__dirname, projectName);
  try {
    // Crear el proyecto Nest mediante el CLI (se utiliza --skip-install para omitir la instalación inicial)
    execSync(`nest new ${projectName} --skip-install --package-manager npm`, { stdio: 'inherit' });
    // Instalar las dependencias para que se reconozcan los paquetes como '@nestjs/common'
    execSync(`npm install`, { cwd: projectDir, stdio: 'inherit' });
    // En la instalación del proyecto
    execSync(`npm install @nestjs/config pg typeorm @nestjs/typeorm`, {
      cwd: projectDir,
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('Error al crear el proyecto Nest:', err);
    return res.send('Error al crear el proyecto Nest.');
  }

  // Por cada tabla seleccionada se generan (con CLI) y luego se sobrescriben los archivos con contenido personalizado
  for (const table of tables) {
    const ClassName = capitalize(table);
    try {
      // Generar módulo, controller y service mediante el CLI de Nest
      execSync(`nest generate module ${table}`, { cwd: projectDir, stdio: 'inherit' });
      execSync(`nest generate controller ${table}`, { cwd: projectDir, stdio: 'inherit' });
      execSync(`nest generate service ${table}`, { cwd: projectDir, stdio: 'inherit' });
    } catch (err) {
      console.error(`Error al generar archivos para la tabla ${table}:`, err);
      continue;
    }

    // Consultar las columnas de la tabla en la base de datos seleccionada
    let columns = [];
    try {
      const result = await currentPool.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      columns = result.rows;
    } catch (err) {
      console.error(`Error al obtener columnas para la tabla ${table}:`, err);
      continue;
    }

    let primaryKeyColumn = 'id';
    try {
      const pkResult = await currentPool.query(`
        SELECT ccu.column_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = $1 
          AND tc.constraint_type = 'PRIMARY KEY'
      `, [table]);
      if (pkResult.rows.length > 0) {
        primaryKeyColumn = pkResult.rows[0].column_name;
      }
    } catch (err) {
      console.error(`Error obteniendo PK para ${table}:`, err);
    }


    // Generar las propiedades (atributos) del entity a partir de las columnas
    let propertiesStr = '';
    columns.forEach(column => {
      const columnName = column.column_name;
      const dataType = column.data_type;
      const isNullable = column.is_nullable === 'YES';
      const tsType = mapDataTypeToTsType(dataType);
      propertiesStr += `  ${columnName}: ${tsType}${isNullable ? ' | null' : ''};\n`;
    });

    // Contenido de los archivos a generar (entity, controller, service y module)
    const entityContent =
      `export class ${ClassName} {
      ${propertiesStr}}`;

    const controllerContent =
      `import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
      import { ${ClassName}Service } from './${table}.service';
      import { ${ClassName} } from './${table}.entity';
    
      @Controller('${table}')
      export class ${ClassName}Controller {
      constructor(private readonly ${table}Service: ${ClassName}Service) {}
    
      @Get()
      async findAll() {
        return this.${table}Service.findAll();
      }
    
      @Get(':id')
      async findOne(@Param('id') id: string) {
        return this.${table}Service.findOne(+id);
      }
    
      @Post()
      async create(@Body() ${table}Data: Partial<${ClassName}>) {
        return this.${table}Service.create(${table}Data);
      }
    
      @Put(':id')
      async update(
        @Param('id') id: string,
        @Body() ${table}Data: Partial<${ClassName}>
      ) {
        return this.${table}Service.update(+id, ${table}Data);
      }
    
      @Delete(':id')
      async delete(@Param('id') id: string) {
        return this.${table}Service.delete(+id);
      }
      }`;

      const serviceContent = `
        import { Injectable } from '@nestjs/common';
        import { Pool } from 'pg';
        import { ${ClassName} } from './${table}.entity';
        import * as fs from 'fs';
        import * as path from 'path';
    
        @Injectable()
        export class ${ClassName}Service {
        private pool: Pool;
        
        constructor() {
            this.pool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: '${selectedDb}',
            password: '12345',
            port: 5432,
            });
        }
    
        async findAll(): Promise<${ClassName}[]> {
            const result = await this.pool.query('SELECT * FROM ${table}');
            return result.rows;
        }
    
        async findOne(id: number): Promise<${ClassName}> {
            const result = await this.pool.query(
            'SELECT * FROM ${table} WHERE ${primaryKeyColumn} = $1', 
            [id]
            );
            return result.rows[0];
        }
    
        async create(${table}Data: Partial<${ClassName}>): Promise<${ClassName}> {
            const columns = Object.keys(${table}Data).map(col => \`"\${col}"\`).join(', ');
            const values = Object.values(${table}Data);
            const placeholders = values.map((_, i) => \`\$\${i + 1}\`).join(', ');
            const query = \`INSERT INTO ${table} (\${columns}) VALUES (\${placeholders}) RETURNING *\`;
            const result = await this.pool.query(query, values);
            const createdEntity = result.rows[0];
            const logEntry = {
                action: 'POST',
                timestamp: new Date().toISOString(),
                table: '${table}',
                data: createdEntity
            };
            fs.appendFileSync(path.join(process.cwd(), 'audit_log.txt'), JSON.stringify(logEntry) + '\\n');
            return createdEntity;
        }
    
        async update(id: number, ${table}Data: Partial<${ClassName}>): Promise<${ClassName}> {
            const setClause = Object.keys(${table}Data)
            .map((key, i) => \`"\${key}" = \$\${i + 1}\`)
            .join(', ');
            const values = Object.values(${table}Data);
            values.push(id);
            const query = \`UPDATE ${table} SET \${setClause} WHERE ${primaryKeyColumn} = \$\${values.length} RETURNING *\`;
            const result = await this.pool.query(query, values);
            const updatedEntity = result.rows[0];
            const logEntry = {
                action: 'UPDATE',
                timestamp: new Date().toISOString(),
                table: '${table}',
                id: id,
                data: updatedEntity
            };
            fs.appendFileSync(path.join(process.cwd(), 'audit_log.txt'), JSON.stringify(logEntry) + '\\n');
            return updatedEntity;
        }
    
        async delete(id: number): Promise<void> {
            const existingRecord = await this.findOne(id);
            await this.pool.query(
                'DELETE FROM ${table} WHERE ${primaryKeyColumn} = $1', 
                [id]
            );
            const logEntry = {
                action: 'DELETE',
                timestamp: new Date().toISOString(),
                table: '${table}',
                id: id,
                data: existingRecord
            };
            fs.appendFileSync(path.join(process.cwd(), 'audit_log.txt'), JSON.stringify(logEntry) + '\\n');
        }
      }`;

    const moduleContent =
      `import { Module } from '@nestjs/common';
      import { ${ClassName}Controller } from './${table}.controller';
      import { ${ClassName}Service } from './${table}.service';

      @Module({
        controllers: [${ClassName}Controller],
        providers: [${ClassName}Service],
      })
      export class ${ClassName}Module {}`;

    const tableDir = path.join(projectDir, 'src', table);
    if (!fs.existsSync(tableDir)) {
      fs.mkdirSync(tableDir, { recursive: true });
    }

    fs.writeFileSync(path.join(tableDir, `${table}.entity.ts`), entityContent.replace(/\r/g, ''));
    fs.writeFileSync(path.join(tableDir, `${table}.controller.ts`), controllerContent.replace(/\r/g, ''));
    fs.writeFileSync(path.join(tableDir, `${table}.service.ts`), serviceContent.replace(/\r/g, ''));
    fs.writeFileSync(path.join(tableDir, `${table}.module.ts`), moduleContent.replace(/\r/g, ''));
  }

  // Actualizar el archivo app.module.ts para importar los módulos generados
  const appModulePath = path.join(projectDir, 'src', 'app.module.ts');
  try {
    let appModuleContent = fs.readFileSync(appModulePath, 'utf8');

    // Eliminar cualquier importación previa de los módulos que vamos a insertar
    tables.forEach(table => {
      const ClassName = capitalize(table);
      const regex = new RegExp(`import \\{\\s*${ClassName}Module\\s*\\} from ['"]\\./${table}/${table}\\.module['"];?\\n?`, 'g');
      appModuleContent = appModuleContent.replace(regex, '');
    });

    // Generar los nuevos import y la lista de módulos a importar en el decorador @Module
    let importStatements = '';
    let moduleImports = '';
    tables.forEach(table => {
      const ClassName = capitalize(table);
      importStatements += `import { ${ClassName}Module } from './${table}/${table}.module';\n`;
      moduleImports += `    ${ClassName}Module,\n`;
    });

    // Prependemos los nuevos imports al contenido del archivo
    appModuleContent = importStatements + appModuleContent;

    // Reemplazamos la sección de "imports" en el decorador @Module
    appModuleContent = appModuleContent.replace(/imports:\s*\[/, `imports: [\n${moduleImports}`);

    fs.writeFileSync(appModulePath, appModuleContent.replace(/\r/g, ''));
  } catch (err) {
    console.error('Error al actualizar app.module.ts:', err);
  }


  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generador de Proyecto - Finalizado</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        .modern-card {
          border: none;
          border-radius: 15px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          background: rgba(255, 255, 255, 0.9);
        }
        .navbar {
          background-color: #1a73e8 !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .modern-btn {
          background-color: #1a73e8;
          border: none;
          border-radius: 50px;
          padding: 12px 24px;
          font-weight: 500;
          transition: all 0.3s ease;
          margin: 8px;
        }
        .modern-btn:hover {
          background-color: #1558b0;
          transform: translateY(-1px);
        }
        .btn-danger {
          border-radius: 50px;
          padding: 12px 24px;
        }
        .step-indicator {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }
        .step {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #ddd;
          color: #555;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 15px;
          position: relative;
          font-weight: bold;
        }
        .step.active {
          background-color: #1a73e8;
          color: white;
        }
        .step.completed {
          background-color: #4CAF50;
          color: white;
        }
        .step:not(:last-child):after {
          content: '';
          position: absolute;
          width: 40px;
          height: 2px;
          background-color: #ddd;
          top: 50%;
          left: 100%;
        }
        .step.completed:not(:last-child):after {
          background-color: #4CAF50;
        }
        .success-icon {
          font-size: 48px;
          color: #4CAF50;
          margin-bottom: 15px;
        }
        .table-list {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 10px 15px;
          margin-top: 10px;
          max-height: 150px;
          overflow-y: auto;
        }
        .table-badge {
          display: inline-block;
          background-color: #e9ecef;
          color: #495057;
          border-radius: 50px;
          padding: 5px 10px;
          margin: 3px;
          font-size: 14px;
        }
        .next-steps {
          background-color: #f8f9fa;
          border-left: 4px solid #1a73e8;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <!-- Indicador de pasos -->
            <div class="step-indicator">
              <div class="step completed">1</div>
              <div class="step completed">2</div>
              <div class="step completed active">3</div>
            </div>
            
            <div class="card modern-card">
              <div class="card-body text-center py-4">
                <i class="bi bi-check-circle-fill success-icon"></i>
                <h3 class="card-title mb-3">¡Proyecto Generado Exitosamente!</h3>
                
                <div class="alert alert-success mb-4">
                  <h5 class="mb-2">Nombre del Proyecto: "${projectName}"</h5>
                  <p class="mb-2">Base de datos: ${newDbName}</p>
                  <div>
                    <p class="mb-1">Tablas incluidas (${tables.length}):</p>
                    <div class="table-list">
                      ${tables.map(table => `<span class="table-badge">${table}</span>`).join(' ')}
                    </div>
                  </div>
                </div>
                
                <div class="next-steps text-start">
                  <h5><i class="bi bi-arrow-right-circle-fill me-2"></i>Próximos Pasos</h5>
                  <p>Su aplicación está lista para usar. Ahora puede:</p>
                  <ol>
                    <li><strong>Iniciar el servidor</strong> para comenzar a utilizar la aplicación</li>
                    <li>Ver y gestionar los registros de cambios realizados en la aplicación</li>
                    <li>Acceder a la API generada para trabajar con sus datos</li>
                  </ol>
                </div>
                
                <div class="d-flex justify-content-center">
                  <a href="/project-status/${projectName}" class="modern-btn text-white">
                    <i class="bi bi-rocket-takeoff-fill me-2"></i>Administrar Servidor
                  </a>
                  <a href="/" class="btn btn-outline-secondary mx-2">
                    <i class="bi bi-house-fill me-2"></i>Volver al Inicio
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});


/**
 * INTERFAZ 4: Control del Servidor Nest
 * Rutas para administrar el servidor NestJS generado (iniciar, detener, ver estado)
 */

/**
 * Muestra el estado actual del servidor del proyecto
 */
app.get('/project-status/:projectName', (req, res) => {
  const projectName = req.params.projectName;
  const status = serverProcesses[projectName] ? 'En ejecución' : 'Detenido';
  res.send(renderProjectStatus(projectName, status));
});

/**
 * Obtiene y muestra los datos de auditoría del proyecto
 */
app.post('/refresh-audit/:projectName', async (req, res) => {
  const projectName = req.params.projectName;
  const status = serverProcesses[projectName] ? 'En ejecución' : 'Detenido';
  let auditData = [];
  let error = null;

  try {
    const logFilePath = path.join(__dirname, projectName, 'audit_log.txt');

    // Verificar si el archivo existe
    if (fs.existsSync(logFilePath)) {
      // Leer el archivo línea por línea
      const fileContent = fs.readFileSync(logFilePath, 'utf8');
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');

      // Procesar cada línea del archivo
      auditData = lines.map(line => {
        try {
          const logEntry = JSON.parse(line);
          return {
            action: logEntry.action,
            timestamp: logEntry.timestamp,
            table: logEntry.table,
            id: logEntry.id || null,
            data: logEntry.data
          };
        } catch (parseError) {
          console.error('Error parsing log entry:', parseError);
          return null;
        }
      }).filter(entry => entry !== null); // Filtrar entradas inválidas
    } else {
      error = 'No se encontró el archivo de auditoría';
    }
  } catch (err) {
    console.error('Error al leer el archivo de auditoría:', err);
    error = 'Error al obtener datos de auditoría';
  }

  res.send(renderProjectStatus(projectName, status, auditData, error));
});

/**
 * Inicia el servidor NestJS del proyecto especificado
 */
app.post('/start-server/:projectName', (req, res) => {
  const projectName = req.params.projectName;
  const projectDir = path.join(__dirname, projectName);

  if (!serverProcesses[projectName]) {
    const nestProcess = spawn('npm', ['run', 'start:dev'], {
      cwd: projectDir,
      shell: true
    });

    let logs = '';

    nestProcess.stdout.on('data', (data) => {
      logs += data.toString();
      if (logs.length > 1000) logs = logs.slice(-1000);
    });

    nestProcess.stderr.on('data', (data) => {
      logs += `ERROR: ${data.toString()}`;
    });

    serverProcesses[projectName] = {
      process: nestProcess,
      logs: logs
    };

    // Actualizar logs cada segundo
    const logUpdater = setInterval(() => {
      if (serverProcesses[projectName]) {
        serverProcesses[projectName].logs = logs;
      }
    }, 1000);

    nestProcess.on('close', () => {
      clearInterval(logUpdater);
      delete serverProcesses[projectName];
    });
  }

  res.redirect(`/project-status/${projectName}`);
});

/**
 * Detiene el servidor NestJS del proyecto especificado
 */
app.post('/stop-server/:projectName', (req, res) => {
  const projectName = req.params.projectName;

  if (serverProcesses[projectName]) {
    const processInfo = serverProcesses[projectName];

    // Detener todos los procesos en el árbol
    treeKill(processInfo.process.pid, 'SIGTERM', (err) => {
      if (err) {
        console.error(`Error deteniendo ${projectName}:`, err);
      } else {
        console.log(`Servidor ${projectName} detenido correctamente`);
      }
      delete serverProcesses[projectName];
    });
  }

  res.redirect(`/project-status/${projectName}`);
});


/**
 * Funciones auxiliares
 */

/**
 * Convierte la primera letra de un string a mayúscula
 * @param {string} str - String a capitalizar
 * @returns {string} - String capitalizado
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Mapea tipos de datos PostgreSQL a tipos TypeScript
 * @param {string} dataType - Tipo de dato en PostgreSQL
 * @returns {string} - Tipo de dato equivalente en TypeScript
 */
function mapDataTypeToTsType(dataType) {
  if (dataType.includes('character') || dataType === 'text') {
    return 'string';
  }
  if (
    dataType === 'integer' ||
    dataType === 'bigint' ||
    dataType === 'smallint' ||
    dataType === 'numeric' ||
    dataType === 'real' ||
    dataType === 'double precision'
  ) {
    return 'number';
  }
  if (dataType === 'boolean') {
    return 'boolean';
  }
  if (dataType.includes('date') || dataType.includes('time')) {
    return 'Date';
  }
  return 'any';
}

// Manejo de cierre de la aplicación
process.on('SIGINT', () => {
  Object.keys(serverProcesses).forEach(projectName => {
    serverProcesses[projectName].process.kill();
  });
  process.exit();
});

// Iniciar el servidor en el puerto 3001
app.listen(3001, () => {
  console.log('Servidor corriendo en http://localhost:3001');
});
