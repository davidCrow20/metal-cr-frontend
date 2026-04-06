const { Pool } = require('pg');

const config = {
    user: "postgres", // fallback to postgres if david doesn't work
    host: "localhost",
    database: "metal_db",
    password: "holaadios123",
    port: 5432,
};

const pool = new Pool(config);

const schema = `
CREATE TABLE IF NOT EXISTS bandas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    genero TEXT,
    provincia TEXT,
    biografia TEXT,
    foto_principal TEXT,
    discografia TEXT,
    video_url TEXT,
    social_links JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS fotos_bandas (
    id SERIAL PRIMARY KEY,
    banda_id INTEGER REFERENCES bandas(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS historias (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    contenido TEXT,
    foto TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lugares (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    foto_portada TEXT
);

CREATE TABLE IF NOT EXISTS fotos_lugares (
    id SERIAL PRIMARY KEY,
    lugar_id INTEGER REFERENCES lugares(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS noticias (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    enlace TEXT,
    tipo TEXT CHECK (tipo IN ('noticia', 'articulo')),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function setup() {
    try {
        console.log("Conectando a la base de datos...");
        await pool.query(schema);
        console.log("Esquema creado o actualizado satisfactoriamente.");
        process.exit(0);
    } catch (err) {
        console.error("Error al configurar la base de datos:", err);
        process.exit(1);
    }
}

setup();
