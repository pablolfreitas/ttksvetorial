// ===== painel.js =====
// Busca, exibe e gerencia tickets do Supabase

// Ordem das regiões na tabela
const ORDEM_REGIOES = ["NORTE", "SUL", "SERRA", "TAQUARI"];

let todosTickets = [];
let ticketEditando = null;
let ticketDeletando = null;

// ===== FETCH TICKETS =====
async function carregarTickets() {
  document.getElementById("tabela-wrapper").innerHTML = '<div class="loading">Carregando...</div>';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=*&order=data_inicio.asc`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    if (!res.ok) throw new Error("Erro ao buscar tickets");
    todosTickets = await res.json();
    renderTabela();
    document.getElementById("ultima-atualizacao").textContent =
      "Atualizado às " + new Date().toLocaleTimeString("pt-BR");
  } catch (err) {
    document.getElementById("tabela-wrapper").innerHTML =
      `<div class="loading" style="color:#e74c3c;">❌ ${err.message}<br><br>Verifique as credenciais no supabase-config.js</div>`;
  }
}

// ===== RENDER =====
function renderTabela() {
  const filtroTag = document.getElementById("filtro-tag").value;
  const filtroBusca = document.getElementById("filtro-busca").value.toLowerCase();

  let tickets = todosTickets.filter(t => {
    const matchTag = !filtroTag || t.tag === filtroTag;
    const matchBusca = !filtroBusca ||
      (t.ttk || "").toLowerCase().includes(filtroBusca) ||
      (t.cidade || "").toLowerCase().includes(filtroBusca) ||
      (t.id_servico || "").toLowerCase().includes(filtroBusca) ||
      (t.regiao || "").toLowerCase().includes(filtroBusca);
    return matchTag && matchBusca;
  });

  // Agrupa por cidade (usando ORDEM_REGIOES como grupos principais)
  // Estratégia: agrupa por campo "grupo_regiao" se existir, senão por cidade
  const grupos = {};

  // Garante que os grupos padrão apareçam mesmo vazios
  ORDEM_REGIOES.forEach(r => { grupos[r] = []; });

  tickets.forEach(t => {
    const grupo = (t.grupo_regiao || "SEM REGIÃO").toUpperCase();
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(t);
  });

  const wrapper = document.getElementById("tabela-wrapper");
  wrapper.innerHTML = "";

  // Cabeçalho da tabela
  const tplHeader = `
    <table class="tickets-table" style="margin-bottom:0">
      <thead>
        <tr>
          <th>TTKs</th>
          <th>ID de Serviço</th>
          <th>SP</th>
          <th>Atualização</th>
          <th>Cidade</th>
          <th>Sigla</th>
          <th>TAG</th>
          <th>Dat. Início</th>
          <th></th>
        </tr>
      </thead>
    </table>`;

  wrapper.insertAdjacentHTML("beforeend", tplHeader);

  Object.entries(grupos).forEach(([nomeGrupo, lista]) => {
    // Só mostra grupos com filtro ativo ou com tickets
    if (lista.length === 0 && (filtroBusca || filtroTag)) return;

    const div = document.createElement("div");
    div.className = "grupo-regiao";

    const tituloDiv = document.createElement("div");
    tituloDiv.className = "grupo-titulo";
    tituloDiv.textContent = nomeGrupo;
    div.appendChild(tituloDiv);

    const table = document.createElement("table");
    table.className = "tickets-table";

    const tbody = document.createElement("tbody");

    if (lista.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="11" class="sem-tickets">—</td>`;
      tbody.appendChild(tr);
    } else {
      lista.forEach(t => {
        const tagClass = t.tag === "Massiva" ? "tag-Massiva" : t.tag === "NOC" ? "tag-NOC" : "tag-pendencia";
        const dataAtual = t.atualizado_em ? formatarData(t.atualizado_em) : "—";
        const dataInicio = t.data_inicio ? formatarData(t.data_inicio) : "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${t.ttk || "—"}</strong></td>
          <td>${t.id_servico || "—"}</td>
          <td>${t.sp || "—"}</td>
          <td>${dataAtual}</td>
          <td>${t.cidade || "—"}</td>
          <td>${t.sigla || "—"}</td>
          <td><span class="tag-badge ${tagClass}">${t.tag || "—"}</span></td>
          <td>${dataInicio}</td>
          <td><button class="btn-delete" data-id="${t.id}" data-ttk="${t.ttk}">🗑️</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    div.appendChild(table);
    wrapper.appendChild(div);
  });

  // Eventos inline
  wrapper.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => abrirModalDelete(btn.dataset.id, btn.dataset.ttk));
  });
}

// ===== FORMATAÇÃO =====
function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ===== MODAL EDITAR REGIÃO =====
function abrirModalRegiao(id) {
  ticketEditando = todosTickets.find(t => t.id == id);
  if (!ticketEditando) return;
  document.getElementById("modal-ttk").textContent = ticketEditando.ttk;
  document.getElementById("modal-texto").value = ticketEditando.regiao || "";
  document.getElementById("modal-regiao").classList.remove("hidden");
  document.getElementById("modal-texto").focus();
}

document.getElementById("modal-cancelar").addEventListener("click", () => {
  document.getElementById("modal-regiao").classList.add("hidden");
  ticketEditando = null;
});

document.getElementById("modal-salvar").addEventListener("click", async () => {
  if (!ticketEditando) return;
  const novaRegiao = document.getElementById("modal-texto").value.trim();
  const btn = document.getElementById("modal-salvar");
  btn.disabled = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketEditando.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ regiao: novaRegiao, atualizado_em: new Date().toISOString() })
    });

    if (!res.ok) throw new Error("Erro ao atualizar");

    // Atualiza localmente
    const idx = todosTickets.findIndex(t => t.id == ticketEditando.id);
    if (idx >= 0) {
      todosTickets[idx].regiao = novaRegiao;
      todosTickets[idx].atualizado_em = new Date().toISOString();
    }

    document.getElementById("modal-regiao").classList.add("hidden");
    ticketEditando = null;
    renderTabela();
    mostrarAlerta("✅ Região atualizada!");
  } catch (err) {
    mostrarAlerta("❌ " + err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ===== MODAL DELETAR =====
function abrirModalDelete(id, ttk) {
  ticketDeletando = id;
  document.getElementById("delete-ttk").textContent = ttk;
  document.getElementById("modal-delete").classList.remove("hidden");
}

document.getElementById("delete-cancelar").addEventListener("click", () => {
  document.getElementById("modal-delete").classList.add("hidden");
  ticketDeletando = null;
});

document.getElementById("delete-confirmar").addEventListener("click", async () => {
  if (!ticketDeletando) return;
  const btn = document.getElementById("delete-confirmar");
  btn.disabled = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketDeletando}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) throw new Error("Erro ao deletar");

    todosTickets = todosTickets.filter(t => t.id != ticketDeletando);
    document.getElementById("modal-delete").classList.add("hidden");
    ticketDeletando = null;
    renderTabela();
    mostrarAlerta("🗑️ Ticket removido.");
  } catch (err) {
    mostrarAlerta("❌ " + err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ===== ALERTA =====
function mostrarAlerta(msg, erro = false) {
  const el = document.getElementById("alerta");
  el.textContent = msg;
  el.className = "alerta" + (erro ? " erro" : "");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ===== FILTROS =====
document.getElementById("filtro-tag").addEventListener("change", renderTabela);
document.getElementById("filtro-busca").addEventListener("input", renderTabela);
document.getElementById("btn-atualizar").addEventListener("click", carregarTickets);

// ===== AUTO-ATUALIZAR a cada 30s =====
carregarTickets();
setInterval(carregarTickets, 30000);
