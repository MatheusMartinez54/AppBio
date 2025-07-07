// File: backend/routes/resulsexame.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise

/*────────────────────────────────────────────*/
/* LISTAGEM SIMPLIFICADA                     */
/*────────────────────────────────────────────*/
router.get('/', async (req, res) => {
  const idProced = Number(req.query.idProced);

  // <<< validação obrigatória de idProced
  if (!Number.isInteger(idProced) || idProced <= 0) {
    return res.status(400).json({ error: 'idProced obrigatório e deve ser inteiro positivo.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         R.IDRESULEXAME   AS id,
         R.ID_PACIENTE    AS idPaciente,
         PF.NOMEPESSOA    AS nomePaciente,
         DATE_FORMAT(R.DATACOLE,'%Y-%m-%dT%H:%i:%sZ') AS dataColeta,
         R.RESULTADO      AS resultado,
         R.STATUSEXA      AS status
       FROM RESULEXAME R
       LEFT JOIN PACIENTE  PA ON PA.IDPACIENTE  = R.ID_PACIENTE
       LEFT JOIN PESSOAFIS PF ON PF.IDPESSOAFIS = PA.ID_PESSOAFIS
       WHERE R.ID_PROCED = ?
       ORDER BY R.DATACOLE DESC`,
      [idProced],
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /resulsexame', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/*────────────────────────────────────────────*/
/* ... restante das rotas (detalhes, PUT, etc) ... */

/*────────────────────────────────────────────*/
/* DETALHES + REFERÊNCIAS + METODOLOGIA       */
/*────────────────────────────────────────────*/
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido.' });

  try {
    // 1) Exame + método
    const [[row] = []] = await pool.query(
      `SELECT R.IDRESULEXAME    AS id,
              R.ID_PACIENTE     AS idPaciente,
              PF.NOMEPESSOA     AS nomePaciente,
              DATE_FORMAT(R.DATACOLE,'%Y-%m-%dT%H:%i:%sZ') AS dataColeta,
              LC.DESCRICAO      AS local,
              R.RESULTADO       AS resultado,
              R.GESTANTE        AS gestante,   -- ❶ novo
              R.JEJUM           AS jejum,      -- ❷ novo
              R.OBSERVACAO      AS observacao,
              R.MOTCANC         AS motivo,
              R.STATUSEXA       AS status,
              R.ID_PROCED       AS idProced,
              R.ID_METODEXAME   AS idMetodo,
              M.NOMEMETOD       AS metodoNome  -- <- aqui está o nome certo
         FROM RESULEXAME R
         LEFT JOIN PACIENTE   PA ON PA.IDPACIENTE   = R.ID_PACIENTE
         LEFT JOIN PESSOAFIS  PF ON PF.IDPESSOAFIS  = PA.ID_PESSOAFIS
         LEFT JOIN LOCCOLET   LC ON LC.IDLOCCOLET   = R.ID_LOCCOLET
         LEFT JOIN METODEXAME M  ON M.IDMETODEXAME  = R.ID_METODEXAME
        WHERE R.IDRESULEXAME = ?`,
      [id],
    );
    if (!row) return res.status(404).json({ error: 'Exame não encontrado.' });

    // 2) Referências + dica (se concluído)
    let referencias = [],
      dica = null;
    if (row.status === 'CONC') {
      /* ------------------------------------------------------------------
       * Filtra REFPROCED por:
       *  • mesmo procedimento
       *  • mesma condição de jejum (0/1)
       *  • mesma condição de gestação (0/1)               ────────────── */

      const gest = row.gestante === null ? 0 : row.gestante; // null → 0
      const jej = row.jejum === null ? 0 : row.jejum; // segurança

      const [refs] = await pool.query(
        `SELECT DESCRICAO, VALMIN, VALMAX, OBSERV
           FROM REFPROCED
          WHERE ID_PROCED = ?
            AND GESTANTE  = ?
            AND JEJUM     = ?
          ORDER BY VALMIN`,
        [row.idProced, gest, jej],
      );
      referencias = refs;

      const valor = parseFloat(row.resultado);
      if (!isNaN(valor) && refs.length) {
        const faixa = refs.find((f) => valor >= f.VALMIN && valor <= f.VALMAX);
        if (faixa) dica = faixa.OBSERV?.trim() || `Dentro da faixa "${faixa.DESCRICAO}".`;
        else if (valor < refs[0].VALMIN) dica = 'Abaixo da referência mínima.';
        else dica = 'Acima da referência máxima.';
      }
    }

    res.json({ ...row, referencias, dica });
  } catch (e) {
    console.error('GET /resulsexame/:id', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/*────────────────────────────────────────────*/
/* CRIAR – status = PEND                      */
/*────────────────────────────────────────────*/
router.post('/novo', async (req, res) => {
  const {
    idAgenda = null,
    idProced,
    idPaciente,
    idLocColet,
    observacao = null,
    gestante = null, // ← novo
    jejum = null, // ← novo
  } = req.body || {};

  if (!idProced || !idPaciente || !idLocColet) return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });

  try {
    const [ins] = await pool.query(
      `INSERT INTO RESULEXAME
         (ID_AGENDA,ID_PROCED,ID_PACIENTE,DATACOLE,ID_LOCCOLET,GESTANTE,JEJUM,OBSERVACAO,STATUSEXA)
       VALUES (?,?,?,?,?,?,?,?, 'PEND')`,
      [
        idAgenda,
        idProced,
        idPaciente,
        new Date(),
        idLocColet,
        gestante !== null ? Number(gestante) : null,
        jejum !== null ? Number(jejum) : null,
        observacao,
      ],
    );
    res.status(201).json({ idResul: ins.insertId });
  } catch (e) {
    console.error('POST /resulsexame/novo', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/*────────────────────────────────────────────*/
/* CANCELAR – status = CANC                   */
/*────────────────────────────────────────────*/
router.put('/:id/cancelar', async (req, res) => {
  const id = Number(req.params.id);
  const { motivo = '' } = req.body || {};
  if (!motivo.trim()) return res.status(400).json({ error: 'Motivo obrigatório.' });

  try {
    await pool.query(
      `UPDATE RESULEXAME
          SET MOTCANC   = ?,
              STATUSEXA = 'CANC'
        WHERE IDRESULEXAME = ?`,
      [motivo.trim(), id],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /resulsexame/:id/cancelar', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/*────────────────────────────────────────────*/
/* CONCLUIR – status = CONC                   */
/*────────────────────────────────────────────*/
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { resultado, idMetod } = req.body || {};
  if (!resultado || !idMetod) return res.status(400).json({ error: 'Resultado e metodologia obrigatórios.' });

  try {
    await pool.query(
      `UPDATE RESULEXAME
          SET RESULTADO     = ?,
              ID_METODEXAME = ?,
              STATUSEXA     = 'CONC'
        WHERE IDRESULEXAME = ?`,
      [resultado, idMetod, id],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /resulsexame/:id', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
