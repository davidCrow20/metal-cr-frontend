const db = require("../db");

exports.listar = async (req, res) => {
    const resultado = await db.query("SELECT * FROM bandas ORDER BY id DESC");
    res.jason(resultado.rows);
};

exports.crear = async (req, res) => {
    const { nombre, genero, provincia } = req.body;

    await db.query(
        "INSERT INTO bandas (nombre, genero, provincia) VALUES ($1, $2, $3)",
        [nombre, genero, provincia]
    );

    res.jason({mesnaje: "Banda agregada"});
};