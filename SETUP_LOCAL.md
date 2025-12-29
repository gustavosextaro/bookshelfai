# BookshelfAI - Setup Local 🚀

## ⚠️ PRÉ-REQUISITOS

1. **Supabase Project**: Projeto Supabase já configurado
2. **OpenAI API Key**: Chave da API OpenAI
   (https://platform.openai.com/api-keys)
3. **Node.js**: v18+ instalado

## 📋 PASSO A PASSO

### 1. Aplicar Migrations no Supabase

Vá até o Supabase Dashboard → SQL Editor e execute os arquivos na ordem:

```
supabase/migrations/20250101000001_create_profiles.sql
supabase/migrations/20250101000002_update_books.sql
supabase/migrations/20250101000003_create_book_notes.sql
supabase/migrations/20250101000004_create_ai_outputs.sql
supabase/migrations/20250101000005_create_book_memory.sql
supabase/migrations/20250101000006_create_user_brain.sql
```

### 2. Configurar Variáveis de Ambiente

Adicione ao `.env`:

```
VITE_SUPABASE_URL=https://hfswimjhtaiuzrnbobua.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
OPENAI_API_KEY=sk-...  # SUA CHAVE OPENAI
SUPA_SERVICE_ROLE_KEY=eyJhbG...  # Obter no Supabase Dashboard → Settings → API
```

### 3. Atualizar Main.jsx

Substituir import no `src/main.jsx`:

```diff
-import App from './App'
+import App from './AppNew'
```

### 4. Instalar Dependências

```bash
npm install
```

### 5. Iniciar Dev Server

```bash
npm run dev
```

### 6. Testar Fluxo Completo

1. **Cadastrar** com email + username
2. **Adicionar livro** → Aguardar construção de memória
3. **Ir para Agentes IA** → Testar geração de roteiro
4. **Verificar limites** (10 gerações no plano free)
5. **Ir para Perfil** → Gerar linha editorial

## 🧠 TESTES IMPORTANTES

- [ ] Cadastro com username funciona
- [ ] Livro cria book_memory automaticamente
- [ ] IA responde com personalidade conversacional
- [ ] Sistema anti-repetição funciona
- [ ] Limites mensais são respeitados
- [ ] Notas do usuário são incorporadas na memória
- [ ] Linha editorial é coerente

## 🐛 TROUB

LESHOOTING

**Erro "Unauthorized"**: Verificar se token está sendo passado corretamente
**Erro 429**: Limite atingido, resetado todo dia 1º do mês **book_memory não
criada**: Verificar logs edge function no Netlify **OpenAI timeout**: Verificar
quota da API OpenAI

## 📚 SEED DE USUÁRIO TESTE

Email: `gustavo@test.com` Username: `Gustavo` Senha: `teste123`

## 🎯 PRÓXIMOS PASSOS

Após testar local e aprovar:

1. Deploy para Netlify
2. Configurar env vars no Netlify
3. Testar em produção
