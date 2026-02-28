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

// Gera link do Google Maps
function gerarMaps(rua, bairro, cidade) {
  if (!rua && !bairro && !cidade) return "";
  const end = encodeURIComponent(`${rua}, ${bairro}, ${cidade}`);
  return `https://www.google.com/maps/search/?api=1&query=${end}`;
}

// Gera a máscara formatada igual ao print
function gerarMascara(d) {
  const maps = gerarMaps(d.rua, d.bairro, d.cidade);
  return `TTK: ${d.ttk}
ID Serviço: ${d.id_servico}
Causa Raiz:
TAG: ${d.tag}
ARD: ${d.ard}
SP: ${d.sp}
CTOs: ${d.cto}
Clientes Afetados: ${d.clientes}
Rua: ${d.rua}
Bairro: ${d.bairro}
Cidade: ${d.cidade}
Localização: ${maps}
Data Inicio: ${d.data_inicio_fmt}
Data Fim:
Obs:


SLA:
Material gasto:

SIM:( ) Não alterar escrita, apenas coloque o X sem espaço se gasto material FiBrasil
NÃO:( ) Não alterar escrita, apenas coloque o X sem espaço se gasto material FiBrasil
Endereço complementar da atividade realizada:
Metragem do cabo aplicado:
Metragem do cabo retirado:

DESCREVA SUA ATIVIDADE:

Equipe:`;
}

// Limpar formulário
document.getElementById("btn-limpar").addEventListener("click", () => {
  document.getElementById("form-ticket").reset();
  document.getElementById("regiao").value = "Região acionada, aguardando disponibilidade de equipe";
  document.getElementById("sigla").value = "";
  document.getElementById("mascara-texto").value = "";
  setDataAtual();
});

// Copiar máscara
document.getElementById("btn-copiar").addEventListener("click", () => {
  const txt = document.getElementById("mascara-texto");
  if (!txt.value) return;
  txt.select();
  txt.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(txt.value).then(() => {
    mostrarAlerta("✅ Máscara copiada!");
  }).catch(() => {
    document.execCommand("copy");
    mostrarAlerta("✅ Máscara copiada!");
  });
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
    btn.textContent = "✅ Salvar e Gerar Máscara";
    return;
  }

  const cidadeSelect = document.getElementById("cidade");
  const cidadeOpt    = cidadeSelect.options[cidadeSelect.selectedIndex];

  // Formata data para exibição na máscara
  const dataRaw = document.getElementById("data_inicio").value;
  let dataFmt = "";
  if (dataRaw) {
    const d = new Date(dataRaw);
    dataFmt = d.toLocaleDateString("pt-BR") + " " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const dados = {
    ttk:          document.getElementById("ttk").value.trim(),
    id_servico:   document.getElementById("id_servico").value.trim(),
    ard:          document.getElementById("ard").value.trim(),
    sp:           document.getElementById("sp").value.trim(),
    cto:          document.getElementById("cto").value.trim(),
    clientes:     document.getElementById("clientes").value.trim(),
    rua:          document.getElementById("rua").value.trim(),
    bairro:       document.getElementById("bairro").value.trim(),
    cidade:       cidadeSelect.value,
    sigla:        document.getElementById("sigla").value.trim().toUpperCase(),
    tag:          tag.value,
    regiao:       document.getElementById("regiao").value.trim(),
    grupo_regiao: cidadeOpt.dataset.grupo || "SUL",
    data_inicio:  dataRaw || null,
    data_inicio_fmt: dataFmt,
    atualizado_em: new Date().toISOString(),
  };

  // Payload para o Supabase (só os campos da tabela)
  const payload = {
    ttk:          dados.ttk,
    id_servico:   dados.id_servico,
    sp:           dados.sp || null,
    regiao:       dados.regiao,
    grupo_regiao: dados.grupo_regiao,
    data_inicio:  dados.data_inicio,
    cidade:       dados.cidade,
    sigla:        dados.sigla,
    tag:          dados.tag,
    atualizado_em: dados.atualizado_em,
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

    // Gera e exibe a máscara
    document.getElementById("mascara-texto").value = gerarMascara(dados);
    mostrarAlerta("✅ Ticket salvo! Máscara gerada.");

  } catch (err) {
    console.error(err);
    mostrarAlerta("❌ Erro: " + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ Salvar e Gerar Máscara";
  }
});
