const express =  require("express");
const cors = require("cors");
const bandasRoutes = require("./routes/bandas");

const app = express();
app.use(cors());
app.use(express.json())

app.use("/api/bandas", bandasRoutes)

app.listen(3000, () => console.log("Servidor corriendo en el puerto 3000"));