// ===== auth.js =====
// Sistema de autenticação simples usando tabela usuarios no Supabase
// Senhas criptografadas com SHA-256 (leve, suficiente para uso interno)

// ===== UTILITÁRIOS =====
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function setSession(usuario) {
  sessionStorage.setItem("fibrasil_user", JSON.stringify(usuario));
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem("fibrasil_user")); } catch { return null; }
}
function clearSession() {
  sessionStorage.removeItem("fibrasil_user");
}

// ===== CONTADOR DE TTKs NA TELA DE LOGIN =====
async function carregarContadorTTKs() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=id`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const dados = await res.json();
    const el = document.getElementById("ttk-total");
    if (el) el.textContent = Array.isArray(dados) ? dados.length : "—";
  } catch { /* silencioso */ }
}

// ===== MOSTRAR MENSAGENS =====
function loginErro(msg) {
  const el = document.getElementById("login-erro");
  el.textContent = msg; el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}
function loginOk(msg) {
  const el = document.getElementById("login-ok");
  el.textContent = msg; el.classList.remove("hidden");
}

// ===== TOGGLE SENHA =====
document.getElementById("eye-login")?.addEventListener("click", () => {
  const inp = document.getElementById("l-senha");
  inp.type = inp.type === "password" ? "text" : "password";
});

// ===== ALTERNÂNCIA DE FORMULÁRIOS =====
document.getElementById("link-esqueci")?.addEventListener("click", e => {
  e.preventDefault();
  document.getElementById("form-login").classList.add("hidden");
  document.getElementById("form-esqueci").classList.remove("hidden");
});
document.getElementById("link-voltar-login")?.addEventListener("click", e => {
  e.preventDefault();
  document.getElementById("form-esqueci").classList.add("hidden");
  document.getElementById("form-login").classList.remove("hidden");
});

// ===== LOGIN =====
document.getElementById("btn-entrar")?.addEventListener("click", async () => {
  const email = document.getElementById("l-email").value.trim().toLowerCase();
  const senha = document.getElementById("l-senha").value;

  if (!email || !senha) { loginErro("Preencha e-mail e senha."); return; }

  const btn = document.getElementById("btn-entrar");
  btn.disabled = true; btn.textContent = "Verificando...";

  try {
    const hash = await sha256(senha);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const dados = await res.json();

    if (!dados.length) { loginErro("E-mail não encontrado."); return; }

    const u = dados[0];

    // Admin master: senha em texto puro no banco (visível pelo Supabase)
    // Demais: senha em SHA-256
    const senhaOk = u.role === "admin_master"
      ? (senha === u.senha_hash)           // master: comparação direta
      : (hash === u.senha_hash);           // outros: hash SHA-256

    if (!senhaOk) { loginErro("Senha incorreta."); return; }
    if (!u.ativo) { loginErro("Usuário desativado. Contate o administrador."); return; }

    setSession({ id: u.id, nome: u.nome, email: u.email, role: u.role });

    // Redireciona conforme o papel
    if (u.role === "admin_master" || u.role === "admin") {
      window.location.href = "painel.html";
    } else {
      window.location.href = "painel.html?modo=visualizacao";
    }

  } catch (err) {
    loginErro("Erro ao conectar. Tente novamente.");
    console.error(err);
  } finally {
    btn.disabled = false; btn.textContent = "Entrar";
  }
});

// ===== ESQUECI SENHA — envia e-mail via Supabase Edge (simulado: mostra na tela) =====
document.getElementById("btn-esqueci")?.addEventListener("click", async () => {
  const email = document.getElementById("e-email").value.trim().toLowerCase();
  if (!email) { loginErro("Informe seu e-mail."); return; }

  const btn = document.getElementById("btn-esqueci");
  btn.disabled = true; btn.textContent = "Buscando...";

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}&select=nome`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const dados = await res.json();
    if (!dados.length) { loginErro("E-mail não encontrado."); return; }

    // Por enquanto exibe confirmação — integração com e-mail pode ser adicionada via Edge Function
    loginOk(`✅ Se o e-mail "${email}" estiver cadastrado, entre em contato com o administrador para recuperar sua senha.`);
    document.getElementById("form-esqueci").classList.add("hidden");

  } catch(err) {
    loginErro("Erro ao buscar. Tente novamente.");
  } finally {
    btn.disabled = false; btn.textContent = "Enviar senha";
  }
});

// ===== INICIALIZAÇÃO =====
carregarContadorTTKs();
