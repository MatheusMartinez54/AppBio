#  AppBio – Sistema de Biomedicina

O **AppBio** foi desenvolvido com o objetivo de **cadastrar amostras de exames** dos pacientes da FasiClin. O sistema visa facilitar o acesso aos resultados de exames, tanto para os pacientes quanto para os profissionais de saúde, permitindo a continuidade do tratamento quando necessário.

### 👥 Autores:

- Julia Alves 
- Matheus Martinez
- Gabriel Thalles

---

## ⚙️ Funcionalidades do Sistema

 🧪 Cadastro de amostras de exames biomédicos  
 📅 Gerenciamento da agenda de atendimentos  
 ✅ Aprovação de amostras como requisito para geração de laudos em **PDF**  

---

## 🧰 Tecnologias Utilizadas

### 🖥️ Frontend:

- React Native
- TypeScript
- Expo

### 🌐 Backend:

- Node.js
- Express.js
- MongoDB

### 📂 Outros:

- API REST
- EAS (Expo Application Services)
- Axios

### 📁 Estrutura do Projeto

```bash
AppBio/
├── App.js
├── index.ts
├── assets/               # Ícones e imagens
├── backend/              # Backend com Node.js e Express
│   ├── db.js             # Conexão com MongoDB
│   ├── server.js         # Servidor principal
│   └── routes/           # Rotas de API (auth, exames, coleta, etc.)
├── package.json
├── tsconfig.json
└── app.json / eas.json   # Configuração do app com Expo
