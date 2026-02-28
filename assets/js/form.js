// ===== form.js =====
// Envia o ticket para o Supabase

const REGIOES = ["NORTE", "SUL", "SERRA", "TAQUARI", "NOROESTE", "FRONTEIRA OESTE"];

function mostrarAlerta(msg, erro = false) {
  const el = document.getElementById("alerta");
  el.textContent = msg;
  el.className = "alerta" + (erro ? " erro" : "");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// Pré-preenche data/hora atual
const dataInput = document.getElementById("data_inicio");
const agora = new Date();
agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
dataInput.value = agora.toISOString().slice(0, 16);

// Limpar formulário
document.getElementById("btn-limpar").addEventListener("click", () => {
  document.getElementById("form-ticket").reset();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  dataInput.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
});

// Submit
document.getElementById("form-ticket").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("btn-enviar");
  btn.disabled = true;
  btn.textContent = "Salvando...";

  const tag = document.querySelector('input[name="tag"]:checked');
  if (!tag) {
    mostrarAlerta("⛔ Selecione uma TAG antes de salvar.", true);
    btn.disabled = false;
    btn.textContent = "✅ Salvar Ticket";
    return;
  }

  const payload = {
    ttk:        document.getElementById("ttk").value.trim(),
    id_servico: document.getElementById("id_servico").value.trim(),
    sp:         document.getElementById("sp").value || null,
    regiao:     document.getElementById("regiao").value.trim(),
    data_inicio: document.getElementById("data_inicio").value || null,
    cidade:     document.getElementById("cidade").value,
    sigla:      document.getElementById("sigla").value.trim().toUpperCase(),
    tag:        tag.value,
    tecnico:    document.getElementById("tecnico").value.trim(),
    atualizado_em: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Erro ao salvar");
    }

    mostrarAlerta("✅ Ticket salvo com sucesso!");
    document.getElementById("form-ticket").reset();
    dataInput.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);

  } catch (err) {
    console.error(err);
    mostrarAlerta("❌ Erro: " + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ Salvar Ticket";
  }
});
