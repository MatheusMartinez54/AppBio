// File: backend/routes/pacientes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise

/* =============================================================================
 * CRIA / ATUALIZA PACIENTE
 * POST /api/pacientes/novo
 * Body: { cpf, nome, dataNascimento, sexo, rg?, rgUf?, telefone? }
 * ============================================================================= */
router.post('/novo', async (req, res) => {
  const { cpf, nome, dataNascimento, sexo, rg = null, rgUf = null, telefone = null } = req.body || {};

  // validações básicas
  if (!cpf || String(cpf).length !== 11) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }
  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Verifica se já existe PESSOAFIS para este CPF
    const [[existPF] = []] = await conn.query('SELECT IDPESSOAFIS, ID_PESSOA FROM PESSOAFIS WHERE CPFPESSOA = ? LIMIT 1', [cpf]);

    let idPessoaFis;
    let idPessoa;
    if (existPF) {
      // já existe, usa os IDs existentes
      idPessoaFis = existPF.IDPESSOAFIS;
      idPessoa = existPF.ID_PESSOA;
    } else {
      // cria PESSOA (necessário para PESSOAFIS)
      const [insPessoa] = await conn.query('INSERT INTO PESSOA (TIPOPESSOA) VALUES (?)', ['F']);
      idPessoa = insPessoa.insertId;

      // cria PESSOAFIS
      const [insPF] = await conn.query(
        `INSERT INTO PESSOAFIS
           (ID_PESSOA, CPFPESSOA, NOMEPESSOA, DATANASCPES, SEXOPESSOA)
         VALUES (?,?,?,?,?)`,
        [idPessoa, cpf, nome, dataNascimento, sexo],
      );
      idPessoaFis = insPF.insertId;
    }

    // 2) Verifica se já existe PACIENTE para este PESSOAFIS
    const [[existPac] = []] = await conn.query('SELECT IDPACIENTE FROM PACIENTE WHERE ID_PESSOAFIS = ? LIMIT 1', [idPessoaFis]);

    let idPaciente;
    if (existPac) {
      // paciente já existia
      idPaciente = existPac.IDPACIENTE;
    } else {
      // cria PACIENTE
      const [insPac] = await conn.query(
        `INSERT INTO PACIENTE
           (ID_PESSOAFIS, RGPACIENTE, ESTDORGPAC)
         VALUES (?,?,?)`,
        [idPessoaFis, rg, rgUf],
      );
      idPaciente = insPac.insertId;

      // insere telefone em CONTATO apenas para novos pacientes
      if (telefone) {
        await conn.query(
          `INSERT INTO CONTATO
             (ID_PESSOA, ID_TIPOCONTATO, NUMERO)
           VALUES (?,?,?)`,
          [idPessoa, 2, telefone],
        );
      }
    }

    await conn.commit();
    return res.status(existPac ? 200 : 201).json({ idPaciente, idPessoaFis });
  } catch (error) {
    await conn.rollback();
    console.error('ERRO /pacientes/novo:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  } finally {
    conn.release();
  }
});

/* =============================================================================
 * DETALHES DE UM PACIENTE
 * GET /api/pacientes/:id
 * → { id, nome, cpf, dataNascimento, telefone }
 * ============================================================================= */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    const [[row] = []] = await pool.query(
      `SELECT
         P.IDPACIENTE                         AS id,
         PF.NOMEPESSOA                        AS nome,
         PF.CPFPESSOA                         AS cpf,
         DATE_FORMAT(PF.DATANASCPES, '%d/%m/%Y') AS dataNascimento,
         PF.DATANASCPES                              AS dataNascISO,     -- ← novo
         
         PF.SEXOPESSOA                         AS sexo,
         CO.NUMERO                            AS telefone
       FROM PACIENTE P
       JOIN PESSOAFIS PF
         ON PF.IDPESSOAFIS = P.ID_PESSOAFIS
       LEFT JOIN CONTATO CO
         ON CO.ID_PESSOA = PF.ID_PESSOA
        AND CO.ID_TIPOCONTATO = 2
       WHERE P.IDPACIENTE = ?
       LIMIT 1`,
      [id],
    );

    if (!row) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }
    return res.json(row);
  } catch (err) {
    console.error('Erro GET /pacientes/:id', err);
    return res.status(500).json({ error: 'Erro interno ao buscar paciente.' });
  }
});

module.exports = router;
