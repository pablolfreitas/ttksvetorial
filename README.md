# 🎫 Sistema de Tickets — Supabase + GitHub Pages

Projeto 100% frontend, sem servidor Node.js. Os dados ficam no **Supabase** (PostgreSQL gratuito) e a página roda no **GitHub Pages**.

---

## 🚀 Como colocar no ar

### 1. Criar conta no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto (anote a senha do banco)
3. Aguarde o projeto inicializar (~1 min)

### 2. Criar a tabela
1. No painel do Supabase, vá em **SQL Editor → New query**
2. Cole o conteúdo do arquivo `SETUP_SUPABASE.sql` e clique em **Run**

### 3. Pegar as credenciais
1. No Supabase, vá em **Project Settings → API**
2. Copie:
   - **Project URL** (ex: `https://xyzabc.supabase.co`)
   - **anon / public key** (a chave longa)

### 4. Configurar o projeto
Abra o arquivo `assets/js/supabase-config.js` e substitua:
```js
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_KEY = "SUA_ANON_PUBLIC_KEY";
```

### 5. Subir no GitHub Pages
1. Crie um repositório no GitHub (pode ser privado ou público)
2. Suba todos os arquivos desta pasta
3. Vá em **Settings → Pages → Branch: main → / (root) → Save**
4. Após ~1 min, seu site estará em: `https://seu-usuario.github.io/nome-do-repositorio`

---

## 📋 Funcionalidades

| Página | O que faz |
|--------|-----------|
| `index.html` | Formulário para abrir novos tickets |
| `painel.html` | Visualização em tabela, agrupada por região |

**No painel:**
- ✏️ Editar a **Região** de qualquer ticket (campo que muda com frequência)
- 🗑️ Apagar tickets
- 🔍 Filtrar por TAG ou busca livre
- 🔄 Auto-atualização a cada 30 segundos

---

## 🗂️ Campo `grupo_regiao`

No formulário de abertura, o ticket ainda não tem campo de grupo. Para agrupar nas regiões (NORTE, SUL, SERRA, etc.), você pode:

**Opção A:** Adicionar um `<select id="grupo_regiao">` no `index.html` com as regiões e incluí-lo no payload em `form.js`

**Opção B:** Deixar o padrão como "SUL" e alterar diretamente no Supabase (Table Editor) quando necessário

---

## 🔒 Segurança

O projeto usa a **chave `anon`** do Supabase, que é segura para uso em frontend. As políticas RLS configuradas permitem leitura e escrita sem login, ideal para uso interno de equipe.

Se quiser adicionar autenticação com login, o Supabase tem suporte nativo — mas não é necessário para começar.
