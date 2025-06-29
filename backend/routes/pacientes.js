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

    let idPessoaFis, idPessoa;
    if (existPF) {
      idPessoaFis = existPF.IDPESSOAFIS;
      idPessoa = existPF.ID_PESSOA;
    } else {
      // cria PESSOA (necessário para a FK de PESSOAFIS)
      const [insPessoa] = await conn.query('INSERT INTO PESSOA (TIPOPESSOA) VALUES (?)', ['F']);
      idPessoa = insPessoa.insertId;

      // cria PESSOAFIS (aqui grava o CPF)
      const [insPF] = await conn.query(
        `INSERT INTO PESSOAFIS
           (ID_PESSOA, NOMEPESSOA, CPFPESSOA, DATANASCPES, SEXOPESSOA)
         VALUES (?,?,?,?,?)`,
        [idPessoa, nome, cpf, dataNascimento, sexo],
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
      // cria PACIENTE sem CPF (já está em PESSOAFIS)
      const [insPac] = await conn.query(
        `INSERT INTO PACIENTE
           (ID_PESSOAFIS, NOME, DATANASC, SEXO, RG, RG_UF, TELEFONE)
         VALUES (?,?,?,?,?,?,?)`,
        [idPessoaFis, nome, dataNascimento, sexo, rg, rgUf, telefone],
      );
      idPaciente = insPac.insertId;
    }

    // 3) Atualiza telefone em CONTATO (tipo 2 = telefone)
    if (telefone) {
      await conn.query(
        `DELETE FROM CONTATO
           WHERE ID_PESSOA = ?
             AND ID_TIPOCONTATO = 2`,
        [idPessoa],
      );
      await conn.query(
        `INSERT INTO CONTATO
           (ID_TIPOCONTATO, NUMERO, ID_PESSOA)
         VALUES (2,?,?)`,
        [telefone, idPessoa],
      );
    }

    await conn.commit();
    return res.status(existPac ? 200 : 201).json({ idPaciente, idPessoaFis });
  } catch (e) {
    await conn.rollback();
    console.error('ERRO /pacientes/novo:', e);
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
         P.IDPACIENTE                       AS id,
         PF.NOMEPESSOA                      AS nome,
         PF.CPFPESSOA                       AS cpf,
         DATE_FORMAT(PF.DATANASCPES, '%d/%m/%Y') AS dataNascimento,
         CO.NUMERO                          AS telefone
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
