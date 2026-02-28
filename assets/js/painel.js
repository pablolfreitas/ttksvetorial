// ===== painel.js =====

const ORDEM_REGIOES = ["NORTE", "SUL", "SERRA", "TAQUARI"];

let todosTickets = [];
let ticketEditando = null;
let ticketDeletando = null;

// ===== FETCH =====
async function carregarTickets() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=*&order=data_inicio.asc`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
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
  const grupos = {};
  ORDEM_REGIOES.forEach(r => { grupos[r] = []; });

  todosTickets.forEach(t => {
    const grupo = (t.grupo_regiao || "SUL").toUpperCase();
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(t);
  });

  const wrapper = document.getElementById("tabela-wrapper");
  wrapper.innerHTML = "";

  const COLGROUP = `
    <colgroup>
      <col style="width:148px">
      <col style="width:195px">
      <col style="width:72px">
      <col><!-- descrição: ocupa todo o espaço restante -->
      <col style="width:138px">
      <col style="width:148px">
      <col style="width:58px">
      <col style="width:155px">
      <col style="width:138px">
      <col style="width:36px">
    </colgroup>`;

  const THEAD = `
    <thead>
      <tr>
        <th>TTKs</th>
        <th>ID de Serviço</th>
        <th>SP</th>
        <th>Descrição</th>
        <th>Atualização</th>
        <th>Cidade</th>
        <th>Sigla</th>
        <th>TAG</th>
        <th>Dat. Início</th>
        <th></th>
      </tr>
    </thead>`;

  // Cabeçalho fixo único
  wrapper.insertAdjacentHTML("beforeend", `
    <table class="tickets-table" style="margin-bottom:0; table-layout:fixed; width:100%;">
      ${COLGROUP}${THEAD}
    </table>`);

  Object.entries(grupos).forEach(([nomeGrupo, lista]) => {
    const div = document.createElement("div");
    div.className = "grupo-regiao";

    const titulo = document.createElement("div");
    titulo.className = "grupo-titulo";
    titulo.textContent = nomeGrupo;
    div.appendChild(titulo);

    const table = document.createElement("table");
    table.className = "tickets-table";
    table.style.cssText = "table-layout:fixed; width:100%;";
    table.innerHTML = `
      <colgroup>
        <col style="width:148px">
        <col style="width:195px">
        <col style="width:72px">
        <col>
        <col style="width:138px">
        <col style="width:148px">
        <col style="width:58px">
        <col style="width:155px">
        <col style="width:138px">
        <col style="width:36px">
      </colgroup>`;

    const tbody = document.createElement("tbody");

    if (lista.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="10" class="sem-tickets">—</td>`;
      tbody.appendChild(tr);
    } else {
      lista.forEach(t => {
        const tagClass = t.tag === "Massiva" ? "tag-Massiva" : "tag-pendencia";
        const dataAtual  = t.atualizado_em ? formatarData(t.atualizado_em) : "—";
        const dataInicio = t.data_inicio   ? formatarData(t.data_inicio)   : "—";
        const descHtml   = (t.regiao || "—").replace(/\n/g, "<br>");

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="cell-mono">${t.ttk || "—"}</td>
          <td class="cell-mono">${t.id_servico || "—"}</td>
          <td class="cell-sp">${t.sp || "—"}</td>
          <td class="col-descricao">
            <span class="descricao-texto">${descHtml}</span>
            <button class="btn-edit-desc" data-id="${t.id}" title="Editar descrição">✏️</button>
          </td>
          <td>${dataAtual}</td>
          <td>${t.cidade || "—"}</td>
          <td class="cell-center">${t.sigla || "—"}</td>
          <td><span class="tag-badge ${tagClass}">${t.tag || "—"}</span></td>
          <td>${dataInicio}</td>
          <td><button class="btn-delete" data-id="${t.id}" data-ttk="${t.ttk}" title="Apagar">🗑️</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    div.appendChild(table);
    wrapper.appendChild(div);
  });

  wrapper.querySelectorAll(".btn-edit-desc").forEach(btn => {
    btn.addEventListener("click", () => abrirModalDescricao(btn.dataset.id));
  });
  wrapper.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => abrirModalDelete(btn.dataset.id, btn.dataset.ttk));
  });
}

// ===== FORMATAÇÃO =====
function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  // dd/mm HH:MM:SS — sem o ano
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${dia} ${hora}`;
}

// ===== MODAL EDITAR DESCRIÇÃO =====
function abrirModalDescricao(id) {
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
  const novoTexto = document.getElementById("modal-texto").value.trim();
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
      body: JSON.stringify({ regiao: novoTexto, atualizado_em: new Date().toISOString() })
    });
    if (!res.ok) throw new Error("Erro ao atualizar");

    const idx = todosTickets.findIndex(t => t.id == ticketEditando.id);
    if (idx >= 0) {
      todosTickets[idx].regiao = novoTexto;
      todosTickets[idx].atualizado_em = new Date().toISOString();
    }
    document.getElementById("modal-regiao").classList.add("hidden");
    ticketEditando = null;
    renderTabela();
    mostrarAlerta("✅ Descrição atualizada!");
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
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
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

document.getElementById("btn-atualizar").addEventListener("click", carregarTickets);

// Compatibilidade: ignora filtros removidos do HTML

carregarTickets();
setInterval(carregarTickets, 30000);
