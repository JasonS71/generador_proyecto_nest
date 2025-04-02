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
      <title>Proyecto Generado</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="card modern-card">
          <div class="card-body">
            <h3 class="card-title text-center mb-4">🖥️ Estado del Servidor: ${projectName}</h3>
            
            <div class="d-flex align-items-center justify-content-center mb-4">
              <div class="status-indicator ${status === 'En ejecución' ? 'running' : 'stopped'}"></div>
              <h4 class="mb-0">Estado actual: ${status}</h4>
            </div>

            <div class="text-center mb-4">
              <form action="/start-server/${projectName}" method="post" class="d-inline-block mx-2">
                <button type="submit" class="modern-btn text-white" ${status === 'En ejecución' ? 'disabled' : ''}>
                  ⚡ Iniciar Servidor
                </button>
              </form>
              <form action="/stop-server/${projectName}" method="post" class="d-inline-block mx-2">
                <button type="submit" class="btn btn-danger" ${status === 'Detenido' ? 'disabled' : ''}>
                  🛑 Detener Servidor
                </button>
              </form>
            </div>
            
            <!-- Nueva Card de Auditoría -->
            <div class="card modern-card mt-4">
              <div class="card-body">
                <h4 class="card-title mb-4">📝 Auditoría</h4>
                <form method="POST" action="/refresh-audit/${projectName}">
                  <button type="submit" class="modern-btn text-white">🔄 Actualizar Datos</button>
                </form>
                
                ${auditData || error ? `
                  <div class="mt-4">
                    ${error ? `<div class="alert alert-danger">${error}</div>` : ''}
                    <div class="table-responsive">
                      <table class="table table-striped">
                        <thead>
                          <tr>
                            <th>Acción</th>
                            <th>Fecha/Hora</th>
                            <th>Tabla</th>
                            <th>Datos</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${auditData.length > 0 ? 
                            auditData.map(entry => `
                              <tr>
                                <td>${entry.action}</td>
                                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                                <td>${entry.table}</td>
                                <td>
                                  ${Object.entries(entry.data || {})
                                    .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
                                    .join('')
                                  }
                                </td>
                              </tr>
                            `).join('') 
                            : `<tr><td colspan="4">No hay registros de auditoría</td></tr>`}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ` : '<p class="mt-3 text-muted">No hay datos de auditoría disponibles. Presiona "Actualizar" para cargar información.</p>'}
              </div>
            </div>

            <!-- Botón de Volver (existente) -->
            <div class="text-center mt-4">
              <a href="/" class="modern-btn text-white">🏠 Volver al Inicio</a>
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
      <title>Selección de Base de Datos</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
            <div class="card modern-card">
              <div class="card-header text-center">
                <h2 class="mb-0">Seleccione una Base de Datos</h2>
              </div>
              <div class="card-body">
                <form method="POST" action="/select-db">
                  <div class="mb-4">
                    `;
                    databases.forEach(db => {
                      html += `
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="database" value="${db}" id="${db}">
                      <label class="form-check-label" for="${db}">${db}</label>
                    </div>
                      `;
                    });
                    html += `
                  </div>
                  <div class="d-grid">
                    <button type="submit" class="modern-btn text-white">Seleccionar Base de Datos</button>
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
      <title>Confirmación de Conexión</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="card modern-card">
          <div class="card-header text-center">
            <h2 class="mb-0">Conexión Exitosa a la Base de Datos "${selectedDb}"</h2>
          </div>
          <div class="card-body">
            <form method="POST" action="/generate">
              <div class="mb-3">
                <label for="project_name" class="form-label">Nombre del Proyecto Nest</label>
                <input type="text" class="form-control" id="project_name" name="project_name" placeholder="Ingrese el nombre del proyecto" required>
              </div>
              <div class="mb-4">
                <p>Seleccione las tablas para las cuales se generarán los módulos:</p>
                `;
                tables.forEach(table => {
                  html += `
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" name="tables" value="${table}" id="${table}">
                  <label class="form-check-label" for="${table}">${table}</label>
                </div>
                  `;
                });
                html += `
              </div>
              <div class="d-grid">
                <button type="submit" class="modern-btn text-white">Generar Proyecto Nest</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
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
      <title>Proyecto Generado</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
      </style>
    </head>
    <body>
      <nav class="navbar navbar-expand-lg">
        <div class="container">
          <a class="navbar-brand text-white" href="/">Generador de Proyecto Nest</a>
        </div>
      </nav>
      <div class="container py-5">
        <div class="card modern-card">
          <div class="card-body text-center py-4">
            <h3 class="card-title mb-4">✅ Proyecto Generado Exitosamente</h3>
            <div class="alert alert-success mb-4">
              <h5 class="mb-0">"${projectName}"</h5>
              <p class="mb-0 mt-2">Tablas incluidas: ${tables.join(', ')}</p>
            </div>
            <div class="d-flex justify-content-center">
              <a href="/project-status/${projectName}" class="modern-btn text-white">
                🚀 Administrar Servidor
              </a>
              <a href="/" class="modern-btn text-white">
                ↩️ Volver al Inicio
              </a>
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
    // Ruta del archivo audit_log.txt
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
