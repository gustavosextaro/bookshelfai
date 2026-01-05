# 🚀 Desenvolvimento Local - BookshelfAI

## Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Edite o arquivo .env e adicione sua OpenAI API key:
OPENAI_API_KEY=sk-sua-chave-aqui

# 3. Rodar servidores de desenvolvimento
npm run dev
```

Acesse: **http://localhost:9000**

---

## ✅ Funcionalidades Locais

- ✅ Interface React (Vite hot reload)
- ✅ Autenticação Supabase
- ✅ Biblioteca de livros
- ✅ **AI Features** (geração de roteiros, ideias, etc)

---

## 🔧 Arquitetura Local

```
Browser :9000  →  Vite Proxy  →  Express :8888  →  OpenAI API
                                      ↓
                                  Supabase DB
```

**Dois servidores rodando simultaneamente:**

1. **Vite (porta 9000)**: Frontend React
2. **Express (porta 8888)**: Simula Netlify Functions

---

## 📝 Variáveis de Ambiente Necessárias

### Arquivo: `.env`

```bash
# Supabase (já configurado)
VITE_SUPABASE_URL=https://hfswimjhtaiuzrnbobua.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# OpenAI (você precisa adicionar)
OPENAI_API_KEY=sk-your-key-here
```

**Como obter a OpenAI API key:**

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave
3. Cole no arquivo `.env`

---

## 🎯 Scripts Disponíveis

```bash
# Desenvolvimento completo (Vite + API)
npm run dev

# Apenas frontend (sem AI)
npm run dev:vite

# Apenas API server
npm run dev:api

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

## 🧪 Testando AI Features

1. Acesse http://localhost:9000
2. Faça login
3. Vá em "🧠 Agentes de IA"
4. Clique em qualquer botão:
   - 📹 Roteiro TikTok
   - 💡 Gerar Ideias
   - 💬 Gerar Frases
   - ❓ Gerar Perguntas

Se a OpenAI API key estiver configurada, deve funcionar! ✅

---

## 🐛 Troubleshooting

### Erro: "OpenAI API key not configured"

→ Adicione `OPENAI_API_KEY` ao arquivo `.env`

### Erro: "Failed to fetch" ou "404"

→ Certifique-se que ambos servidores estão rodando:

- Vite na porta 9000
- Express na porta 8888

### Como verificar:

```bash
# No terminal onde rodou npm run dev, você deve ver:
[0] VITE v5.x.x  ready in Xms
[0] ➜  Local:   http://localhost:9000/
[1] 🚀 BookshelfAI Dev Server running on http://localhost:8888
```

---

## 📦 Deploy para Netlify

Quando estiver pronto para deploy:

```bash
# 1. Inicializar git (se ainda não fez)
git init
git add .
git commit -m "Initial commit"

# 2. Conectar ao GitHub
git remote add origin https://github.com/seu-usuario/bookshelfai.git
git push -u origin main

# 3. No Netlify:
# - Importar repositório
# - Build command: npm run build
# - Publish directory: dist
# - Environment variables:
#   - VITE_SUPABASE_URL
#   - VITE_SUPABASE_ANON_KEY
#   - OPENAI_API_KEY
```

---

## 📚 Documentação Completa

Para detalhes técnicos da solução implementada, veja:

- [local_dev_solution.md](file:///C:/Users/gusta/.gemini/antigravity/brain/b405dbfe-85e4-4c3d-b7d4-a4e822d83496/local_dev_solution.md)

---

**Status**: ✅ Pronto para uso após configurar OPENAI_API_KEY
