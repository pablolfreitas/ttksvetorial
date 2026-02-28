// ===== form.js =====

function mostrarAlerta(msg, erro = false) {
  const el = document.getElementById("alerta");
  el.textContent = msg;
  el.className = "alerta" + (erro ? " erro" : "");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// Auto-fill sigla e grupo ao selecionar cidade
document.getElementById("cidade").addEventListener("change", function () {
  const selected = this.options[this.selectedIndex];
  document.getElementById("sigla").value = selected.dataset.sigla || "";
});

// Pré-preenche data/hora atual
const dataInput = document.getElementById("data_inicio");
function setDataAtual() {
  dataInput.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
}
setDataAtual();

// Limpar formulário — mantém o texto padrão da descrição
document.getElementById("btn-limpar").addEventListener("click", () => {
  document.getElementById("form-ticket").reset();
  document.getElementById("regiao").value = "Região acionada, aguardando disponibilidade de equipe";
  document.getElementById("sigla").value = "";
  setDataAtual();
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

  const cidadeSelect = document.getElementById("cidade");
  const cidadeOpt = cidadeSelect.options[cidadeSelect.selectedIndex];

  const payload = {
    ttk:          document.getElementById("ttk").value.trim(),
    id_servico:   document.getElementById("id_servico").value.trim(),
    sp:           document.getElementById("sp").value.trim() || null,
    regiao:       document.getElementById("regiao").value.trim(),
    grupo_regiao: cidadeOpt.dataset.grupo || "SUL",
    data_inicio:  document.getElementById("data_inicio").value || null,
    cidade:       cidadeSelect.value,
    sigla:        document.getElementById("sigla").value.trim().toUpperCase(),
    tag:          tag.value,
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
    document.getElementById("regiao").value = "Região acionada, aguardando disponibilidade de equipe";
    document.getElementById("sigla").value = "";
    setDataAtual();

  } catch (err) {
    console.error(err);
    mostrarAlerta("❌ Erro: " + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ Salvar Ticket";
  }
});
