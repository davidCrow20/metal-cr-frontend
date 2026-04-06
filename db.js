const {Pool} = require("pg");

const pool = new Pool ({
    user: "david",
    host: "localhost",
    database: "metal_db",
    password: "holaadios123",
    port: 5432,


});

module.exports = pool;