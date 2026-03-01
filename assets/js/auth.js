// ===== auth.js — Supabase Auth real (v2) =====

// ─── CLIENTE ──────────────────────────────────────────────────────────────────
let _sb = null;
function getClient() {
  if (!_sb && typeof supabase !== 'undefined')
    _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ─── SESSÃO ───────────────────────────────────────────────────────────────────
async function getSession() {
  const c = getClient(); if (!c) return null;
  const { data } = await c.auth.getSession();
  return data?.session ?? null;
}

async function getPerfil(uid) {
  const c = getClient(); if (!c) return null;
  const { data } = await c.from('perfis')
    .select('nome,role,ativo')
    .eq('id', uid)
    .maybeSingle();
  return data;
}

// ─── PROTEÇÃO DE PÁGINA ───────────────────────────────────────────────────────
// Coloque no topo de cada página protegida:
//   guardPage(['admin_master','admin','editor'])
async function guardPage(rolesPermitidas) {
  const session = await getSession();
  if (!session) { window.location.replace('index.html'); return null; }
  const perfil = await getPerfil(session.user.id);
  if (!perfil || !perfil.ativo || !rolesPermitidas.includes(perfil.role)) {
    window.location.replace('index.html'); return null;
  }
  return { session, perfil };
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function logout() {
  const c = getClient();
  if (c) await c.auth.signOut();
  sessionStorage.clear();
  window.location.replace('index.html');
}

// ─── UTILITÁRIOS DE MENSAGEM ──────────────────────────────────────────────────
function _msg(id, txt) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = txt;
  el.classList.remove('hidden');
}
function _msgErro(txt) { _msg('login-erro', txt); setTimeout(() => document.getElementById('login-erro')?.classList.add('hidden'), 5000); }
function _msgOk(txt)   { _msg('login-ok', txt); }

// ─── PÁGINA DE LOGIN ──────────────────────────────────────────────────────────
async function iniciarPaginaLogin() {
  const c = getClient();

  // Se já tem sessão válida → vai direto ao painel
  const session = await getSession();
  if (session) { window.location.replace('painel.html'); return; }

  // Contador de TTKs (anon — só funciona se a policy de SELECT permitir anon ou viewer)
  fetch(`${SUPABASE_URL}/rest/v1/tickets?select=id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  }).then(r => r.ok ? r.json() : [])
    .then(d => { const el = document.getElementById('ttk-total'); if (el) el.textContent = d.length ?? '—'; })
    .catch(() => {});

  // Toggle senha
  document.getElementById('eye-login')?.addEventListener('click', () => {
    const i = document.getElementById('l-senha');
    i.type = i.type === 'password' ? 'text' : 'password';
  });

  // Alternar formulários
  document.getElementById('link-esqueci')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-esqueci').classList.remove('hidden');
  });
  document.getElementById('link-voltar-login')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('form-esqueci').classList.add('hidden');
    document.getElementById('form-login').classList.remove('hidden');
  });

  // Permitir Enter para logar
  document.getElementById('l-senha')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-entrar')?.click();
  });

  // ── LOGIN ──
  document.getElementById('btn-entrar')?.addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const senha = document.getElementById('l-senha').value;
    if (!email || !senha) { _msgErro('Preencha e-mail e senha.'); return; }

    const btn = document.getElementById('btn-entrar');
    btn.disabled = true; btn.textContent = 'Verificando...';

    const { data, error } = await c.auth.signInWithPassword({ email, password: senha });

    if (error) {
      _msgErro('E-mail ou senha incorretos.');
      btn.disabled = false; btn.textContent = 'Entrar'; return;
    }

    const perfil = await getPerfil(data.user.id);
    if (!perfil || !perfil.ativo) {
      await c.auth.signOut();
      _msgErro('Usuário desativado. Contate o administrador.');
      btn.disabled = false; btn.textContent = 'Entrar'; return;
    }

    // Guarda role na session para uso local (não é segurança — só conveniência de UI)
    sessionStorage.setItem('fb_role', perfil.role);
    sessionStorage.setItem('fb_nome', perfil.nome || email);

    window.location.replace('painel.html');
  });

  // ── ESQUECI SENHA — usa reset nativo do Supabase (envia e-mail real) ──
  document.getElementById('btn-esqueci')?.addEventListener('click', async () => {
    const email = document.getElementById('e-email').value.trim();
    if (!email) { _msgErro('Informe seu e-mail.'); return; }

    const btn = document.getElementById('btn-esqueci');
    btn.disabled = true; btn.textContent = 'Enviando...';

    const { error } = await c.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/alterar-senha.html'
    });

    btn.disabled = false; btn.textContent = 'Enviar link';

    if (error) { _msgErro('Erro ao enviar. Verifique o e-mail.'); return; }

    _msgOk('✅ Link enviado! Verifique sua caixa de entrada.');
    document.getElementById('form-esqueci').classList.add('hidden');
  });
}
