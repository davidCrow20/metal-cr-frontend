const {Pool} = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://david:holaadios123@localhost:5432/metal_db",
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

module.exports = pool;