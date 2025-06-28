// File: backend/routes/auth.js
const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 's3gr3d0_bem_forte';

router.post('/', async (req, res) => {
  console.log('[AUTH] Rota hit →', req.method, req.originalUrl, 'Body:', req.body);
  const { cpf = '', senha = '' } = req.body || {};

  const sql = `
    SELECT
      p.IDPROFISSIO,
      p.STATUSPROFI,
      p.ID_CONSEPROFI,
      c.DESCRICAO        AS conselho,
      pf.CPFPESSOA,
      pf.NOMEPESSOA,
      u.SENHAUSUA
    FROM PROFISSIONAL p
    JOIN PESSOAFIS pf       ON pf.IDPESSOAFIS = p.ID_PESSOAFIS
    LEFT JOIN USUARIO u     ON u.ID_PROFISSIO = p.IDPROFISSIO
    LEFT JOIN CONSEPROFI c  ON c.IDCONSEPROFI = p.ID_CONSEPROFI
    WHERE pf.CPFPESSOA = ?;
  `;

  try {
    const [rows] = await pool.query(sql, [cpf]);

    if (rows.length === 0) {
      console.warn('[AUTH-PRO] CPF não encontrado.');
      return res.status(404).json({ message: 'Profissional não encontrado.' });
    }

    const prof = rows[0];
    console.log('[AUTH-PRO] Registro retornado →', prof);

    if (!prof.SENHAUSUA) {
      console.warn('[AUTH-PRO] Sem senha cadastrada.');
      return res.status(401).json({ message: 'Senha não cadastrada. Contate o suporte.' });
    }

    // NOVO: valida pelo conselho
    if (prof.conselho?.toLowerCase() !== 'biomedicina') {
      console.warn('[AUTH-PRO] Conselho diferente de Biomedicina →', prof.conselho);
      return res.status(403).json({ message: 'Este profissional não é de Biomedicina.' });
    }

    // 4) Comparar senha
    const senhaOk = await bcrypt.compare(senha, prof.SENHAUSUA);
    console.log('[AUTH-PRO] Senha bateu?', senhaOk);
    if (!senhaOk) {
      console.warn('[AUTH-PRO] Senha incorreta.');
      return res.status(401).json({ message: 'CPF ou senha inválidos.' });
    }

    // 5) Gerar token
    const token = jwt.sign(
      { idProf: prof.IDPROFISSIO, cpf: prof.CPFPESSOA },
      secret,
      { expiresIn: '8h' }
    );

    // 6) Responder
    res.json({
      token,
      profissional: {
        id:     prof.IDPROFISSIO,
        nome:   prof.NOMEPESSOA,
        cpf:    prof.CPFPESSOA,
        status: prof.STATUSPROFI
      }
    });
    console.log('[AUTH-PRO] Login bem-sucedido →', prof.IDPROFISSIO);

  } catch (err) {
    console.error('[AUTH-PRO] Erro inesperado →', err);
    res.status(500).json({ message: 'Erro no login.' });
  }
});

module.exports = router;
