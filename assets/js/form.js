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
  const sel = this.options[this.selectedIndex];
  document.getElementById("sigla").value = sel.dataset.sigla || "";
});

// Pré-preenche data/hora atual no horário local do browser
const dataInput = document.getElementById("data_inicio");
function setDataAtual() {
  const agora = new Date();
  // Formata como YYYY-MM-DDTHH:MM no horário local
  const pad = n => String(n).padStart(2, "0");
  const local = `${agora.getFullYear()}-${pad(agora.getMonth()+1)}-${pad(agora.getDate())}T${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
  dataInput.value = local;
}
setDataAtual();

// Gera link Google Maps
function gerarMaps(rua, bairro, cidade) {
  if (!rua && !bairro && !cidade) return "";
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(`${rua}, ${bairro}, ${cidade}`);
}

// Gera máscara formatada
function gerarMascara(d) {
  const maps = gerarMaps(d.rua, d.bairro, d.cidade);
  const sla  = d.tag === "Massiva" ? "8 Horas" : "24 Horas";
  const obs  = d.obs
    ? `Observações para a equipe: ${d.obs}`
    : "Observações para a equipe:";

  return `TTK: ${d.ttk}
ID Serviço: ${d.id_servico}
Causa Raiz: Equipe deve preencher
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
${obs}


SLA: ${sla}
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
  navigator.clipboard.writeText(txt.value)
    .then(() => mostrarAlerta("✅ Máscara copiada!"))
    .catch(() => {
      txt.select();
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
  const dataRaw      = document.getElementById("data_inicio").value;

  // Formata data para exibição na máscara (já está no horário local digitado)
  let dataFmt = "";
  if (dataRaw) {
    const [datePart, timePart] = dataRaw.split("T");
    const [ano, mes, dia] = datePart.split("-");
    const [hora, min] = timePart.split(":");
    dataFmt = `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  // Para salvar no Supabase: datetime-local já é horário local (Brasília)
  // Apenas adicionamos o offset correto sem somar horas extras
  let dataISO = null;
  if (dataRaw) {
    // Cria a data interpretando como horário local do browser
    dataISO = new Date(dataRaw).toISOString();
  }

  const dados = {
    ttk:             document.getElementById("ttk").value.trim(),
    id_servico:      document.getElementById("id_servico").value.trim(),
    ard:             document.getElementById("ard").value.trim(),
    sp:              document.getElementById("sp").value.trim(),
    cto:             document.getElementById("cto").value.trim(),
    clientes:        document.getElementById("clientes").value.trim(),
    rua:             document.getElementById("rua").value.trim(),
    bairro:          document.getElementById("bairro").value.trim(),
    cidade:          cidadeSelect.value,
    sigla:           document.getElementById("sigla").value.trim().toUpperCase(),
    tag:             tag.value,
    regiao:          document.getElementById("regiao").value.trim(),
    obs:             document.getElementById("obs").value.trim(),
    grupo_regiao:    cidadeOpt.dataset.grupo || "SUL",
    data_inicio_fmt: dataFmt,
  };

  const payload = {
    ttk:          dados.ttk,
    id_servico:   dados.id_servico,
    sp:           dados.sp || null,
    regiao:       dados.regiao,
    grupo_regiao: dados.grupo_regiao,
    data_inicio:  dataISO,
    cidade:       dados.cidade,
    sigla:        dados.sigla,
    tag:          dados.tag,
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
