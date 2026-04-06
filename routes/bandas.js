const express = require("express");
const router = require.router();
const controller = require("../constrollers/bandasControllers");

router.get("/", controller.listar);
router.post("/", controller.crear);

module.exports = router;
