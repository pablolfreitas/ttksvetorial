// ===== painel.js — Supabase Auth + Realtime + modo visualização =====

const ORDEM_REGIOES  = ['NORTE','SUL','SERRA','TAQUARI'];
let todosTickets     = [];
let ticketEditando   = null;
let ticketDeletando  = null;
let modoVisualizacao = false;
let sb               = null;   // cliente Supabase
let accessToken      = SUPABASE_KEY; // fallback anon

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════
async function init() {
  sb = getClient();

  const params  = new URLSearchParams(window.location.search);
  const session = await getSession();

  if (params.get('modo') === 'visualizacao' || !session) {
    // ── MODO VISUALIZAÇÃO ──────────────────────────────────
    modoVisualizacao = true;
    document.getElementById('banner-visualizacao')?.classList.remove('hidden');
    document.getElementById('btn-logout')?.classList.add('hidden');
    document.getElementById('usuario-nome').textContent = 'Visualização';
    // Esconde Abrir Ticket e Logs
    document.getElementById('nav-abrir')?.remove();
    document.getElementById('nav-logs')?.remove();
  } else {
    // ── MODO AUTENTICADO ───────────────────────────────────
    accessToken = session.access_token;
    const role  = sessionStorage.getItem('fb_role') || '';
    const nome  = sessionStorage.getItem('fb_nome') || session.user.email;
    document.getElementById('usuario-nome').textContent = `${nome} · ${role}`;

    // Esconde Logs para não-admin
    if (!['admin_master','admin'].includes(role)) {
      document.getElementById('nav-logs')?.remove();
    }
  }

  await carregarTickets();
  iniciarRealtime();
}

// ═══════════════════════════════════════════════════════════
// FETCH — só campos necessários, sem select(*)
// ═══════════════════════════════════════════════════════════
async function carregarTickets() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=id,ttk,id_servico,sp,regiao,grupo_regiao,data_inicio,cidade,tag,atualizado_em&order=data_inicio.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error('Erro ao buscar tickets');
    todosTickets = await res.json();
    renderTabela();
    atualizarContadores();
    marcarAtualizado();
  } catch (err) {
    document.getElementById('tabela-wrapper').innerHTML =
      `<div class="loading" style="color:#e74c3c;">❌ ${err.message}</div>`;
  }
}

function marcarAtualizado() {
  const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('ultima-atualizacao').textContent = 'Atualizado às ' + agora;
}

// ═══════════════════════════════════════════════════════════
// REALTIME — substitui polling de 30s
// ═══════════════════════════════════════════════════════════
function iniciarRealtime() {
  if (!sb) return;
  const badge = document.getElementById('realtime-badge');

  sb.channel('tickets-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
      const { eventType, new: novo, old } = payload;
      if      (eventType === 'INSERT') todosTickets.push(novo);
      else if (eventType === 'UPDATE') {
        const i = todosTickets.findIndex(t => t.id === novo.id);
        if (i >= 0) todosTickets[i] = { ...todosTickets[i], ...novo };
      }
      else if (eventType === 'DELETE') todosTickets = todosTickets.filter(t => t.id !== old.id);
      renderTabela();
      atualizarContadores();
      marcarAtualizado();
    })
    .subscribe(status => {
      if (badge) {
        badge.textContent = status === 'SUBSCRIBED' ? '● ao vivo' : '● reconectando';
        badge.style.color = status === 'SUBSCRIBED' ? '#2ecc71'   : '#f39c12';
      }
    });

  // Recalcula barras SLA a cada minuto sem ir ao banco
  setInterval(() => { if (todosTickets.length) renderTabela(); }, 60000);
}

// ═══════════════════════════════════════════════════════════
// CONTADORES
// ═══════════════════════════════════════════════════════════
function atualizarContadores() {
  document.getElementById('cnt-total').textContent    = todosTickets.length;
  document.getElementById('cnt-massiva').textContent  = todosTickets.filter(t => t.tag === 'Massiva').length;
  document.getElementById('cnt-pendencia').textContent = todosTickets.filter(t => t.tag === 'Pendência Técnica').length;
}

// ═══════════════════════════════════════════════════════════
// SLA
// ═══════════════════════════════════════════════════════════
function calcularSLA(t) {
  if (!t.data_inicio) return null;
  const lim       = t.tag === 'Massiva' ? 8 : 24;
  const decorrido = (Date.now() - new Date(t.data_inicio)) / 3600000;
  return { pct: Math.min(Math.round(decorrido / lim * 100), 100), lim, dec: decorrido.toFixed(1) };
}

function slaBar(t) {
  const s = calcularSLA(t);
  if (!s) return `<span style="color:var(--texto-dim)">—</span>`;
  const cor = s.pct < 50 ? '#2ecc71' : s.pct < 80 ? '#f39c12' : '#e74c3c';
  return `<div class="sla-wrap" title="${s.dec}h / ${s.lim}h">
    <div class="sla-bar-bg"><div class="sla-bar-fill" style="width:${s.pct}%;background:${cor};box-shadow:0 0 6px ${cor}88"></div></div>
    <span class="sla-pct" style="color:${cor}">${s.pct}%</span></div>`;
}

// ═══════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════
function renderTabela() {
  // Coluna de ações não existe no modo visualização
  const colAcao = modoVisualizacao ? '' : `<col style="width:70px">`;
  const thAcao  = modoVisualizacao ? '' : `<th></th>`;

  const COLS = `<colgroup>
    <col style="width:155px"><col style="width:200px"><col style="width:60px">
    <col><col style="width:130px"><col style="width:148px">
    <col style="width:155px"><col style="width:138px">${colAcao}</colgroup>`;
  const THEAD = `<thead><tr>
    <th>TTKs</th><th>ID de Serviço</th><th>SP</th><th>Descrição</th>
    <th>SLA</th><th>Cidade</th><th>TAG</th><th>Dat. Início</th>${thAcao}
  </tr></thead>`;

  const wrapper = document.getElementById('tabela-wrapper');
  wrapper.innerHTML = '';

  // Cabeçalho fixo único (sticky)
  wrapper.insertAdjacentHTML('beforeend',
    `<table class="tickets-table" style="margin-bottom:0;table-layout:fixed;width:100%">${COLS}${THEAD}</table>`);

  const grupos = {};
  ORDEM_REGIOES.forEach(r => { grupos[r] = []; });
  todosTickets.forEach(t => {
    const g = (t.grupo_regiao || 'SUL').toUpperCase();
    (grupos[g] = grupos[g] || []).push(t);
  });

  Object.entries(grupos).forEach(([reg, lista]) => {
    const div    = document.createElement('div');
    div.className = 'grupo-regiao';

    const titulo  = document.createElement('div');
    titulo.className = 'grupo-titulo';
    titulo.textContent = reg;
    div.appendChild(titulo);

    const table  = document.createElement('table');
    table.className = 'tickets-table';
    table.style.cssText = 'table-layout:fixed;width:100%';
    table.innerHTML = COLS;

    const tbody = document.createElement('tbody');

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="${modoVisualizacao?8:9}" class="sem-tickets">—</td></tr>`;
    } else {
      lista.forEach(t => {
        const tagCls  = t.tag === 'Massiva' ? 'tag-Massiva' : 'tag-pendencia';
        const spVal   = t.sp || '—';
        const spCls   = spVal.split(',').length >= 3 ? 'cell-sp cell-sp-wrap' : 'cell-sp';
        const atu     = t.atualizado_em
          ? new Date(t.atualizado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
          : '';
        const desc    = (t.regiao || '—');

        // Botões apenas para usuários autenticados
        const btnEditar = modoVisualizacao ? '' :
          `<button class="btn-edit-desc" data-id="${t.id}">Editar</button>`;
        const tdAcao    = modoVisualizacao ? '' :
          `<td class="cell-acoes"><button class="btn-delete" data-id="${t.id}" data-ttk="${t.ttk}">🗑</button></td>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="cell-mono cell-center">${t.ttk||'—'}</td>
          <td class="cell-mono cell-center">${t.id_servico||'—'}</td>
          <td class="${spCls}">${spVal}</td>
          <td class="col-descricao">
            <div class="desc-inner">
              <span class="descricao-texto" title="${desc.replace(/"/g,"'")}">${desc}</span>
              <div class="desc-footer">
                <span class="atualizado-label">${atu ? 'atualizado às '+atu : ''}</span>
                ${btnEditar}
              </div>
            </div>
          </td>
          <td>${slaBar(t)}</td>
          <td class="cell-center">${t.cidade||'—'}</td>
          <td class="cell-center"><span class="tag-badge ${tagCls}">${t.tag||'—'}</span></td>
          <td class="cell-center">${t.data_inicio ? fmtData(t.data_inicio) : '—'}</td>
          ${tdAcao}`;
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    div.appendChild(table);
    wrapper.appendChild(div);
  });

  // Eventos — só quando não é visualização
  if (!modoVisualizacao) {
    wrapper.querySelectorAll('.btn-edit-desc').forEach(b =>
      b.addEventListener('click', () => abrirModalDesc(b.dataset.id)));
    wrapper.querySelectorAll('.btn-delete').forEach(b =>
      b.addEventListener('click', () => abrirModalDel(b.dataset.id, b.dataset.ttk)));
  }
}

// ═══════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════
function fmtData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) + ' ' +
    d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

function hdrs(extra = {}) {
  return { 'Content-Type':'application/json', apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`, Prefer:'return=minimal', ...extra };
}

async function log(acao, ttk, detalhe = '') {
  const usuario = sessionStorage.getItem('fb_nome') || 'sistema';
  fetch(`${SUPABASE_URL}/rest/v1/logs`, {
    method:'POST', headers: hdrs(),
    body: JSON.stringify({ acao, ttk, detalhe, usuario })
  }).catch(() => {});
}

function alerta(msg, erro = false) {
  const el = document.getElementById('alerta');
  el.textContent = msg;
  el.className = 'alerta' + (erro ? ' erro' : '');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ═══════════════════════════════════════════════════════════
// MODAL EDITAR
// ═══════════════════════════════════════════════════════════
function abrirModalDesc(id) {
  ticketEditando = todosTickets.find(t => t.id == id);
  if (!ticketEditando) return;
  document.getElementById('modal-ttk').textContent = ticketEditando.ttk;
  document.getElementById('modal-texto').value     = ticketEditando.regiao || '';
  document.getElementById('modal-regiao').classList.remove('hidden');
}
document.getElementById('modal-cancelar').addEventListener('click', () => {
  document.getElementById('modal-regiao').classList.add('hidden');
  ticketEditando = null;
});
document.getElementById('modal-salvar').addEventListener('click', async () => {
  if (!ticketEditando) return;
  const txt = document.getElementById('modal-texto').value.trim();
  const btn = document.getElementById('modal-salvar');
  btn.disabled = true;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketEditando.id}`, {
      method:'PATCH', headers: hdrs(),
      body: JSON.stringify({ regiao: txt, atualizado_em: new Date().toISOString() })
    });
    if (!r.ok) throw new Error('Erro ao salvar');
    log('EDIÇÃO', ticketEditando.ttk, 'Descrição atualizada');
    document.getElementById('modal-regiao').classList.add('hidden');
    ticketEditando = null;
    alerta('✅ Descrição atualizada!');
  } catch(e) { alerta('❌ ' + e.message, true); }
  finally { btn.disabled = false; }
});

// ═══════════════════════════════════════════════════════════
// MODAL DELETE / ENCERRAR
// ═══════════════════════════════════════════════════════════
function abrirModalDel(id, ttk) {
  ticketDeletando = id;
  document.getElementById('delete-ttk').textContent = ttk;
  document.getElementById('modal-delete').classList.remove('hidden');
}
document.getElementById('delete-cancelar').addEventListener('click', () => {
  document.getElementById('modal-delete').classList.add('hidden');
  ticketDeletando = null;
});

// Finalizar → salva em encerrados
document.getElementById('delete-finalizar').addEventListener('click', async () => {
  if (!ticketDeletando) return;
  const btn = document.getElementById('delete-finalizar');
  btn.disabled = true;
  const t   = todosTickets.find(x => x.id == ticketDeletando);
  const sla = t ? calcularSLA(t) : null;
  try {
    if (t) {
      await fetch(`${SUPABASE_URL}/rest/v1/encerrados`, {
        method:'POST', headers: hdrs(),
        body: JSON.stringify({
          ttk: t.ttk, id_servico: t.id_servico, cidade: t.cidade, tag: t.tag,
          sla_pct: sla?.pct ?? null,
          sla_horas: sla ? `${sla.dec}h / ${sla.lim}h` : null,
          data_inicio: t.data_inicio,
          usuario: sessionStorage.getItem('fb_nome') || 'sistema'
        })
      });
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketDeletando}`,
      { method:'DELETE', headers: hdrs() });
    if (!r.ok) throw new Error('Erro ao remover');
    log('ENCERRADO', t?.ttk, `SLA: ${sla ? sla.pct+'%' : '—'}`);
    document.getElementById('modal-delete').classList.add('hidden');
    ticketDeletando = null;
    alerta('✅ Ticket finalizado e salvo em Encerrados.');
  } catch(e) { alerta('❌ ' + e.message, true); }
  finally { btn.disabled = false; }
});

// Deletar sem salvar
document.getElementById('delete-confirmar').addEventListener('click', async () => {
  if (!ticketDeletando) return;
  const btn = document.getElementById('delete-confirmar');
  btn.disabled = true;
  const t = todosTickets.find(x => x.id == ticketDeletando);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketDeletando}`,
      { method:'DELETE', headers: hdrs() });
    if (!r.ok) throw new Error('Erro ao deletar');
    log('DELETE', t?.ttk, 'Removido sem encerrar');
    document.getElementById('modal-delete').classList.add('hidden');
    ticketDeletando = null;
    alerta('🗑️ Ticket removido.');
  } catch(e) { alerta('❌ ' + e.message, true); }
  finally { btn.disabled = false; }
});

// ═══════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════
init();
