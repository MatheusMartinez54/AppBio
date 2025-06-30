// File: backend/routes/pessofis.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise

// GET /api/pessofis?cpf=12345678901
router.get('/', async (req, res) => {
  const { cpf } = req.query;

  if (!cpf || !/^\d{11}$/.test(cpf)) return res.status(400).json({ error: 'CPF inválido (11 dígitos).' });

  try {
    /* ─── trazemos dados + RG/UF + TODOS os telefones ─── */
    const [rows] = await pool.query(
      `SELECT
         pf.IDPESSOAFIS,
         pf.NOMEPESSOA,
         DATE_FORMAT(pf.DATANASCPES,'%Y-%m-%d') AS DATANASCPES,
         CASE
           WHEN TRIM(UPPER(pf.SEXOPESSOA)) IN ('F','FEMININO','2') THEN 'F'
           ELSE 'M'
         END AS SEXO,

         pa.RGPACIENTE AS RG,
         pa.ESTDORGPAC AS RG_UF,

         -- junta todos os números numa string "11987654321,21912345678"
         IFNULL(
   GROUP_CONCAT(c.NUMERO ORDER BY c.IDCONTATO SEPARATOR ','),
   ''
 ) AS NUMEROS

       FROM PESSOAFIS  pf
       LEFT JOIN PACIENTE pa   ON pa.ID_PESSOAFIS = pf.IDPESSOAFIS
       LEFT JOIN CONTATO  c    ON c.ID_PESSOA     = pa.ID_PACIENTE

       WHERE pf.CPFPESSOA = ?
       GROUP BY pf.IDPESSOAFIS
       LIMIT 1`,
      [cpf],
    );

    if (!rows.length) return res.status(404).json({ error: 'CPF não encontrado.' });

    /* Exemplo de resposta
       {
         IDPESSOAFIS : 4,
         NOMEPESSOA  : 'Maria Oliveira',
         DATANASCPES : '1985-10-12',
         SEXO        : 'F',
         RG          : '666666',
         RG_UF       : 'MT',
         TELEFONES   : '41987654321,659999999'
       }
    */
   console.log('DEBUG /pessofis →', rows[0]);

    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/pessofis:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
