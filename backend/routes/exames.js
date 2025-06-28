// File: backend/routes/exames.js
const express = require('express');
const router = express.Router();
const pool   = require('../db');

// GET /api/exames?procedimento=Glicose
router.get('/', async (req, res) => {
  const { procedimento } = req.query;

  // Apenas puxamos os campos não sensíveis de RESULEXAME
  // e incluímos o nome do paciente via JOIN em PESSOAFIS
  let sql = `
    SELECT 
      r.IDRESULEXAME AS id,
      p.CPFPESSOA      AS cpf,
      p.NOMEPESSOA     AS nome,
      DATE_FORMAT(r.DATACOLE, '%d/%m/%Y') AS dataColeta,
      r.RESULTADO      AS resultado,
      r.OBSERVACAO     AS observacao,
      r.STATUSEXA      AS status,
      CASE r.ID_PROCED
        WHEN 1 THEN 'Glicose'
        WHEN 2 THEN 'Tipagem'
        ELSE 'Outro'
      END AS procedimento
    FROM RESULEXAME r
    INNER JOIN PESSOAFIS p ON r.ID_PACIENTE = (
      SELECT pac.ID_PESSOAFIS 
      FROM PACIENTE pac 
      WHERE pac.IDPACIENTE = r.ID_PACIENTE
    )
  `;

  const args = [];
  if (procedimento) {
    sql += ` WHERE r.ID_PROCED = ?`;
    // supondo: ID_PROCED = 1 para “Glicose”, 2 para “Tipagem”
    args.push(procedimento === 'Glicose' ? 3027 : 4350);
  }

  try {
    const [rows] = await pool.query(sql, args);
    // “rows” já traz: id, cpf, nome, dataColeta, resultado, observacao, status, procedimento
    res.json(rows);
  } catch (err) {
    console.error('Erro GET /api/exames:', err);
    res.status(500).json({ error: 'Erro ao buscar exames.' });
  }
});

module.exports = router;
