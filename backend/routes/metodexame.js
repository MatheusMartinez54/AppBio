const express = require('express');
const router  = express.Router();
const pool    = require('../db'); // mysql2/promise

// GET /api/metodexame?idProced=1
router.get('/', async (req, res) => {
  const idProced = Number(req.query.idProced);
  if (!idProced) {
    return res.status(400).json({ error: 'idProced obrigatório.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         IDMETODEXAME   AS id,
         NOMEMETOD     AS nome,
         DESCRICAO     AS descricao
       FROM METODEXAME
       WHERE ID_PROCED = ?
       ORDER BY NOMEMETOD`,
      [idProced]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /metodexame', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
