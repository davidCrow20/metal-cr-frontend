const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos subidos estáticamente
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Servir imágenes estáticas manuales (logos, portadas, defaults, etc.)
app.use("/imagenes", express.static(path.join(__dirname, "imagenes")));

// Crear carpetas si no existen
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("imagenes")) fs.mkdirSync("imagenes");

// Configuración de Multer
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase());
        ok ? cb(null, true) : cb(new Error("Solo se permiten imágenes"));
    }
});

// Helper para capturar errores de multer correctamente (un archivo)
function runUpload(req, res) {
    return new Promise((resolve, reject) => {
        upload.single("imagen")(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Helper para subida múltiple (hasta 20 imágenes)
function runUploadMultiple(req, res) {
    return new Promise((resolve, reject) => {
        upload.array("imagenes", 20)(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// ------------------ CONFIGURACIÓN DE PUERTO ------------------
const PORT = process.env.PORT || 3000;

// ------------------ CONEXIÓN A POSTGRESQL ------------------
// En Render usaremos la variable DATABASE_URL. Localmente usa tus credenciales.
const db = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:holaadios123@localhost:5432/metal_db",
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ------------------ BANDS (BANDAS) ------------------
app.post("/bandas", async (req, res) => {
    const { nombre, genero, provincia, biografia, foto_principal, discografia, video_url, social_links } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO bandas 
            (nombre, genero, provincia, biografia, foto_principal, discografia, video_url, social_links)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [nombre, genero, provincia, biografia, foto_principal, discografia, video_url, JSON.stringify(social_links || [])]
        );
        res.json({ status: "ok", banda: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

app.get("/bandas", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM bandas ORDER BY nombre ASC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/bandas/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const banda = await db.query("SELECT * FROM bandas WHERE id = $1", [id]);
        if (banda.rows.length === 0) return res.status(404).json({ error: "Banda no encontrada" });
        const fotos = await db.query("SELECT * FROM fotos_bandas WHERE banda_id = $1", [id]);
        res.json({ ...banda.rows[0], fotos: fotos.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/bandas/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre, genero, provincia, biografia, foto_principal, discografia, video_url, social_links } = req.body;
    try {
        const result = await db.query(
            `UPDATE bandas SET nombre=$1, genero=$2, provincia=$3, biografia=$4, foto_principal=$5, discografia=$6, video_url=$7, social_links=$8 WHERE id=$9 RETURNING *`,
            [nombre, genero, provincia, biografia, foto_principal, discografia, video_url, JSON.stringify(social_links || []), id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/bandas/:id/fotos", async (req, res) => {
    const { id } = req.params;
    try {
        await runUploadMultiple(req, res);
        const { descripcion } = req.body;
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({ error: "Se requiere al menos una imagen" });
        }

        const inserted = [];
        for (const file of files) {
            const url = "/uploads/" + file.filename;
            const result = await db.query(
                "INSERT INTO fotos_bandas (banda_id, url, descripcion) VALUES ($1, $2, $3) RETURNING *",
                [id, url, descripcion || ""]
            );
            inserted.push(result.rows[0]);
        }
        res.json({ ok: true, fotos: inserted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/bandas/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM bandas WHERE id = $1", [id]);
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ------------------ STORIES (HISTORIAS) ------------------
app.post("/historias", async (req, res) => {
    const { titulo, contenido, foto } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO historias (titulo, contenido, foto) VALUES ($1, $2, $3) RETURNING *",
            [titulo, contenido, foto]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/historias", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM historias ORDER BY fecha DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/historias/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM historias WHERE id = $1", [id]);
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ------------------ PLACES (LUGARES) ------------------
app.post("/lugares", async (req, res) => {
    const { nombre, descripcion, foto_portada } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO lugares (nombre, descripcion, foto_portada) VALUES ($1, $2, $3) RETURNING *",
            [nombre, descripcion, foto_portada]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/lugares", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM lugares ORDER BY id DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/lugares/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const lugar = await db.query("SELECT * FROM lugares WHERE id = $1", [id]);
        if (lugar.rows.length === 0) return res.status(404).json({ error: "Lugar no encontrado" });
        const fotos = await db.query("SELECT * FROM fotos_lugares WHERE lugar_id = $1", [id]);
        res.json({ ...lugar.rows[0], fotos: fotos.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/lugares/:id/fotos", async (req, res) => {
    const { id } = req.params;
    try {
        await runUploadMultiple(req, res);
        const { descripcion } = req.body;
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({ error: "Se requiere al menos una imagen" });
        }

        const inserted = [];
        for (const file of files) {
            const url = "/uploads/" + file.filename;
            const result = await db.query(
                "INSERT INTO fotos_lugares (lugar_id, url, descripcion) VALUES ($1, $2, $3) RETURNING *",
                [id, url, descripcion || ""]
            );
            inserted.push(result.rows[0]);
        }
        res.json({ ok: true, fotos: inserted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/lugares/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM lugares WHERE id = $1", [id]);
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ------------------ DELETE PHOTOS INDIVIDUALLY ------------------
app.delete("/fotos_bandas/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM fotos_bandas WHERE id = $1", [id]);
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/fotos_lugares/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM fotos_lugares WHERE id = $1", [id]);
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ------------------ NEWS/ARTICLES (NOTICIAS/ARTICULOS) ------------------
app.get("/noticias", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM noticias ORDER BY fecha DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/noticias", async (req, res) => {
    const { titulo, descripcion, enlace, tipo } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO noticias (titulo, descripcion, enlace, tipo) VALUES ($1, $2, $3, $4) RETURNING *",
            [titulo, descripcion, enlace, tipo]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/noticias/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM noticias WHERE id = $1", [id]);
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ------------------ SEARCH (BUSCADOR) ------------------
app.get("/buscar", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ bandas: [], historias: [] });
    try {
        const bandas = await db.query("SELECT * FROM bandas WHERE nombre ILIKE $1 OR biografia ILIKE $1", [`%${q}%`]);
        const historias = await db.query("SELECT * FROM historias WHERE titulo ILIKE $1 OR contenido ILIKE $1", [`%${q}%`]);
        res.json({ bands: bandas.rows, stories: historias.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ------------------ SERVIDOR ------------------
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});
