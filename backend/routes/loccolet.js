// backend/routes/loccolet.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');      // mysql2/promise

/* GET /api/loccolet – lista todos */
router.get('/', async (_req, res) => {
  try {
    // *** alias IDLOCCOLET → id  ***
    const [rows] = await pool.query(
      'SELECT IDLOCCOLET AS id, DESCRICAO FROM LOCCOLET ORDER BY DESCRICAO'
    );
    res.json(rows);                    // agora o app recebe [{id, DESCRICAO}]
  } catch (e) {
    console.error('GET /loccolet:', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* POST /api/loccolet/novo – cria se não existir */
router.post('/novo', async (req, res) => {
  const { descricao } = req.body || {};
  if (!descricao) return res.status(400).json({ error: 'Descrição obrigatória.' });

  try {
    const [[dup] = []] = await pool.query(
      'SELECT IDLOCCOLET AS id FROM LOCCOLET WHERE UPPER(DESCRICAO)=UPPER(?) LIMIT 1',
      [descricao]
    );
    if (dup) return res.status(200).json({ id: dup.id });

    const [ins] = await pool.query(
      'INSERT INTO LOCCOLET (DESCRICAO) VALUES (?)',
      [descricao]
    );
    res.status(201).json({ id: ins.insertId });
  } catch (e) {
    console.error('POST /loccolet/novo:', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
