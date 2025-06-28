// File: backend/routes/relatorios.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db'); // mysql2/promise

/**
 * GET /api/relatorios?procedimentos=1,2&locais=3,4
 */
router.get('/', async (req, res) => {
  try {
    let { procedimentos, locais } = req.query;

    // 1) monta array de IDs
    const procList = procedimentos
      ? procedimentos.split(',').map(n => Number(n)).filter(n => n > 0)
      : [];
    const locList = locais
      ? locais.split(',').map(n => Number(n)).filter(n => n > 0)
      : [];

    // 2) default se nenhum filtro for selecionado
    if (procList.length === 0) procList.push(3027, 4350);

    // 3) WHERE dinâmico
    const wh = [`R.ID_PROCED IN (${procList.map(() => '?').join(',')})`];
    const params = [...procList];

    if (locList.length) {
      wh.push(`R.ID_LOCCOLET IN (${locList.map(() => '?').join(',')})`);
      params.push(...locList);
    }

    // 4) query com JOIN para trazer o nome do procedimento
    const sql = `
      SELECT
        R.IDRESULEXAME      AS id,
        R.ID_PROCED         AS idProced,
        PR.DESCRPROC        AS procedimentoNome,  -- aqui
        R.ID_LOCCOLET       AS idLocal,
        LC.DESCRICAO        AS local,
        R.RESULTADO         AS resultado,
        R.STATUSEXA         AS status
      FROM RESULEXAME R
      LEFT JOIN LOCCOLET LC ON LC.IDLOCCOLET = R.ID_LOCCOLET
      LEFT JOIN PROCEDIMENTO PR ON PR.CODPROCED = R.ID_PROCED
      ${wh.length ? 'WHERE ' + wh.join(' AND ') : ''}
      ORDER BY R.DATACOLE DESC
    `;

    console.log('GET /api/relatorios →', sql, params);
    const [rows] = await pool.query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error('GET /api/relatorios error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
