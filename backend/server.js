// File: backend/server.js
require('dotenv').config(); // carrega JWT_SECRET e outras variáveis

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const pacientesRoutes = require('./routes/pacientes');
const examesRoutes = require('./routes/exames');
const pessofisRoutes = require('./routes/pessofis');
const relatoriosRoutes = require('./routes/relatorios');
const loccoletRoutes = require('./routes/loccolet');
const resulsexameRoutes = require('./routes/resulsexame');
const metodexameRoutes = require('./routes/metodexame');

const app = express();

app.use(cors());
app.use(express.json());

// Logger global para todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] → ${req.method} ${req.originalUrl}`);
  next();
});

// Rotas
app.use('/api/auth-pro', authRoutes); // login biomedicina

app.use('/api/pacientes', pacientesRoutes);
app.use('/api/exames', examesRoutes);
app.use('/api/pessofis', pessofisRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/loccolet', loccoletRoutes);
app.use('/api/resulsexame', resulsexameRoutes);
app.use('/api/metodexame', metodexameRoutes);

// Fallback 404 para rotas não encontradas
app.use((req, res) => {
  console.log(`[404] Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicia o servidor
const PORT = process.env.PORT || 5040;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ API rodando na porta ${PORT}`));
