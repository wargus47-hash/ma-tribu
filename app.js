/* ============================================================
   Ma Tribu — organisation familiale (PWA mono-utilisateur) — v4
   Données 100% locales (localStorage). Aucun compte, hors-ligne.
   ============================================================ */

const STORE_KEY = 'matribu_v1';

const RAYONS = [
  'Fruits & Légumes', 'Frais', 'Viande & Poisson', 'Surgelés',
  'Épicerie salée', 'Épicerie sucrée', 'Petit-déj', 'Boissons',
  'Hygiène & Maison', 'Bébé & Enfant', 'Autres'
];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DOW = ['L','M','M','J','V','S','D'];

/* ---------- Utilitaires ---------- */
let _seq = 0;
function uid() { return 'id' + Date.now().toString(36) + (_seq++).toString(36); }
function iso(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), j = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${j}`; }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function today() { return new Date(); }
function todayISO() { return iso(new Date()); }
function mondayOf(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function frLong(d) { return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function frShort(s) { return s ? parseISO(s).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function nextDate(s, rep) { const d = parseISO(s); if (rep === 'semaine') d.setDate(d.getDate() + 7); else if (rep === 'mois') d.setMonth(d.getMonth() + 1); else if (rep === 'an') d.setFullYear(d.getFullYear() + 1); return iso(d); }
function moment() { return new Date().getHours() < 14 ? 'matin' : 'soir'; }
function eur(n) { return (+n).toFixed(2).replace('.', ','); }

/* Prochain échange : 1er jour (après aujourd'hui) où la présence change */
function nextExchange() {
  const base = parseISO(todayISO());
  let prev = !!data.presence[todayISO()];
  for (let i = 1; i <= 90; i++) { const k = iso(addDays(base, i)); const cur = !!data.presence[k]; if (cur !== prev) return { date: k, present: cur }; prev = cur; }
  return null;
}

/* Pictogramme automatique pour le mode enfant */
function pictoFor(s) {
  s = (s || '').toLowerCase();
  const map = [['lever','⏰'],['réveil','⏰'],['habill','👕'],['pyjama','🌙'],['petit-déj','🥣'],['déjeun','🥣'],['goûter','🍎'],['dent','🪥'],['cartable','🎒'],['bain','🛁'],['douche','🚿'],['dîner','🍽️'],['din','🍽️'],['mang','🍽️'],['repas','🍽️'],['histoire','📖'],['lect','📖'],['livre','📖'],['lit','🛏️'],['dodo','🛏️'],['couch','🛏️'],['main','🧼'],['rang','🧸'],['jouet','🧸'],['devoir','✏️'],['leçon','✏️'],['chauss','👟'],['manteau','🧥'],['toilette','🚽'],['pipi','🚽'],['cheveu','💈']];
  for (const [k, e] of map) if (s.includes(k)) return e;
  return '⭐';
}

/* ---------- Données par défaut ---------- */
function seedRoutines() {
  const mk = (arr) => arr.map((x) => ({ id: uid(), texte: x, fait: false }));
  return {
    petit: { matin: mk(['Se lever', "S'habiller", 'Petit-déjeuner', 'Se brosser les dents']), soir: mk(['Le bain', 'Dîner', 'Se brosser les dents', 'Une histoire', 'Au lit']) },
    grand: { matin: mk(['Se lever', "S'habiller", 'Petit-déjeuner', 'Se brosser les dents', 'Préparer le cartable']), soir: mk(['Devoirs', 'Douche', 'Dîner', 'Se brosser les dents', 'Lecture', 'Au lit']) }
  };
}
function seedRecettes() {
  return [
    { id: 'r1', nom: 'Pâtes bolognaise', emoji: '🍝', ing: [['Pâtes','Épicerie salée'],['Viande hachée','Viande & Poisson'],['Sauce tomate','Épicerie salée'],['Oignon','Fruits & Légumes']] },
    { id: 'r2', nom: 'Poulet rôti & purée', emoji: '🍗', ing: [['Poulet','Viande & Poisson'],['Pommes de terre','Fruits & Légumes'],['Beurre','Frais'],['Lait','Frais']] },
    { id: 'r3', nom: 'Coquillettes jambon', emoji: '🧀', ing: [['Coquillettes','Épicerie salée'],['Jambon','Frais'],['Gruyère râpé','Frais'],['Crème fraîche','Frais']] },
    { id: 'r4', nom: 'Steak & haricots verts', emoji: '🥩', ing: [['Steak haché','Viande & Poisson'],['Haricots verts','Surgelés'],['Pommes de terre','Fruits & Légumes']] },
    { id: 'r5', nom: 'Omelette & salade', emoji: '🍳', ing: [['Œufs','Frais'],['Salade','Fruits & Légumes'],['Pain','Petit-déj']] },
    { id: 'r6', nom: 'Poisson pané & riz', emoji: '🐟', ing: [['Poisson pané','Surgelés'],['Riz','Épicerie salée'],['Citron','Fruits & Légumes']] },
    { id: 'r7', nom: 'Croque & soupe', emoji: '🥪', ing: [['Pain de mie','Petit-déj'],['Jambon','Frais'],['Gruyère râpé','Frais'],['Soupe','Épicerie salée']] },
    { id: 'r8', nom: 'Quiche & salade', emoji: '🥧', ing: [['Pâte brisée','Frais'],['Œufs','Frais'],['Lardons','Frais'],['Crème fraîche','Frais'],['Salade','Fruits & Légumes']] },
    { id: 'r9', nom: 'Riz cantonais', emoji: '🍚', ing: [['Riz','Épicerie salée'],['Petits pois','Surgelés'],['Œufs','Frais'],['Jambon','Frais']] },
    { id: 'r10', nom: 'Hachis parmentier', emoji: '🥔', ing: [['Viande hachée','Viande & Poisson'],['Pommes de terre','Fruits & Légumes'],['Beurre','Frais'],['Lait','Frais']] },
    { id: 'r11', nom: 'Pizza', emoji: '🍕', ing: [['Pâte à pizza','Frais'],['Sauce tomate','Épicerie salée'],['Fromage râpé','Frais']] },
    { id: 'r12', nom: 'Tomates farcies', emoji: '🍅', ing: [['Tomates','Fruits & Légumes'],['Viande hachée','Viande & Poisson'],['Riz','Épicerie salée']] }
  ];
}
function seed() {
  return {
    version: 4,
    reglages: { grand: 'Le grand', petit: 'Le petit', welcomeDismissed: false },
    courses: [],
    recurrents: [
      { nom: 'Lait', rayon: 'Frais' }, { nom: 'Pain', rayon: 'Petit-déj' }, { nom: 'Œufs', rayon: 'Frais' },
      { nom: 'Beurre', rayon: 'Frais' }, { nom: 'Yaourts', rayon: 'Frais' }, { nom: 'Jambon', rayon: 'Frais' },
      { nom: 'Pâtes', rayon: 'Épicerie salée' }, { nom: 'Riz', rayon: 'Épicerie salée' }, { nom: 'Céréales', rayon: 'Petit-déj' },
      { nom: 'Compotes', rayon: 'Épicerie sucrée' }, { nom: 'Pommes', rayon: 'Fruits & Légumes' }, { nom: 'Bananes', rayon: 'Fruits & Légumes' },
      { nom: 'Eau', rayon: 'Boissons' }, { nom: "Jus d'orange", rayon: 'Boissons' },
      { nom: 'Papier toilette', rayon: 'Hygiène & Maison' }, { nom: 'Liquide vaisselle', rayon: 'Hygiène & Maison' }
    ],
    recettes: seedRecettes(),
    menu: {},
    presence: {},
    transition: [
      ['Doudou','petit'],['Cartable','grand'],['Tenue + chaussures de sport','grand'],['Affaires de toilette','deux'],
      ['Pyjama','deux'],['Manteau / veste','deux'],['Médicaments / ordonnance','deux'],['Chargeur / tablette','grand'],
      ['Gourde','deux'],['Devoirs / cahier de liaison','grand']
    ].map(([nom, qui]) => ({ id: uid(), nom, qui, fait: false })),
    routines: seedRoutines(),
    rappels: [],
    contacts: [],
    budget: [],
    notes: []
  };
}

/* ---------- Persistance + migration ---------- */
let data;
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); data = raw ? JSON.parse(raw) : seed(); }
  catch (e) { data = seed(); }
  migrate();
}
function migrate() {
  const s = seed();
  data.reglages = data.reglages || s.reglages;
  if (data.reglages.welcomeDismissed === undefined) data.reglages.welcomeDismissed = false;
  data.courses = data.courses || [];
  data.recurrents = data.recurrents || s.recurrents;
  data.recettes = data.recettes || s.recettes;
  data.menu = data.menu || {};
  data.presence = data.presence || {};
  data.transition = data.transition || s.transition;
  data.rappels = data.rappels || [];
  data.contacts = data.contacts || [];
  data.budget = data.budget || [];
  data.notes = data.notes || [];
  if (!data.routines) data.routines = s.routines;
  else if (data.routines.matin || data.routines.soir) { const old = data.routines; data.routines = seedRoutines(); data.routines.petit = { matin: old.matin || [], soir: old.soir || [] }; }
  else { data.routines.petit = data.routines.petit || seedRoutines().petit; data.routines.grand = data.routines.grand || seedRoutines().grand; }
  data.version = 4;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { toast('⚠️ Sauvegarde impossible (mémoire pleine ?)'); } }

/* ---------- Toast + modal de confirmation ---------- */
let toastTimer;
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200); }
function confirmDialog(msg, onYes, opts) {
  opts = opts || {};
  const bd = document.createElement('div'); bd.className = 'backdrop';
  bd.innerHTML = `<div class="modal"><p>${esc(msg)}</p><div class="btn-row"><button class="btn" data-no>Annuler</button><button class="btn btn-primary" style="${opts.danger ? 'background:var(--danger)' : ''}" data-yes>${esc(opts.yes || 'Confirmer')}</button></div></div>`;
  document.body.appendChild(bd);
  const close = () => bd.remove();
  bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
  bd.querySelector('[data-no]').addEventListener('click', close);
  bd.querySelector('[data-yes]').addEventListener('click', () => { close(); onYes(); });
}

/* ---------- Navigation + état ---------- */
let activeTab = 'accueil';
let calRef = mondayOf(today());
let weekRef = mondayOf(today());
let familleChild = 'petit';
let showRecForm = false;
let editRec = false;
let rangeMode = false;
let rangeStart = null;
const TITLES = { accueil: "Aujourd'hui", courses: 'Liste de courses', repas: 'Repas de la semaine', garde: 'Garde & transitions', famille: 'Routines & rappels' };

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + tab; });
  document.getElementById('screen-title').textContent = TITLES[tab];
  document.getElementById('screen-date').textContent = tab === 'accueil' ? frLong(today()) : '';
  render();
  window.scrollTo(0, 0);
}
function render() {
  const el = document.getElementById('screen-' + activeTab);
  ({ accueil: renderAccueil, courses: renderCourses, repas: renderRepas, garde: renderGarde, famille: renderFamille }[activeTab])(el);
}

/* Ligne de check-list cliquable sur toute sa surface (le ✕ ne coche pas) */
function wireRow(row, onToggle, onDelete) {
  row.addEventListener('click', onToggle);
  const x = row.querySelector('[data-act="del"]');
  if (x) x.addEventListener('click', (e) => { e.stopPropagation(); onDelete(); });
}

/* ============================================================
   ACCUEIL — tableau de bord
   ============================================================ */
function renderAccueil(el) {
  const ti = todayISO();
  const present = !!data.presence[ti];
  const m = data.menu[ti] || {};
  const repas = m.meal || null;
  const aRacheter = data.courses.filter((c) => !c.fait).length;
  const transitionRestante = data.transition.filter((x) => !x.fait).length;
  const ex = nextExchange();
  const mom = moment();
  const prog = (child) => { const l = data.routines[child][mom]; return { d: l.filter((x) => x.fait).length, t: l.length }; };
  const pP = prog('petit'), pG = prog('grand');
  const prochains = data.rappels.filter((r) => !r.fait).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 3);

  el.innerHTML = `
    ${!data.reglages.welcomeDismissed ? `
      <div class="welcome">
        <h2>👋 Bienvenue dans Ma Tribu</h2>
        <div class="muted">Ton quotidien, en 4 réflexes :</div>
        <ol>
          <li><b>⚙️ en haut à droite</b> → mets les prénoms des enfants</li>
          <li><b>📅 Garde</b> → marque tes jours (ou périodes) de garde</li>
          <li><b>🍽️ Repas</b> → planifie, puis envoie les ingrédients aux 🛒 Courses</li>
          <li><b>🎒 Garde</b> → coche le sac de transition à chaque échange</li>
        </ol>
        <button class="btn btn-primary btn-block" id="wel-ok">C'est parti 🚀</button>
      </div>` : ''}

    <div class="dash-hero">
      <div class="small">${esc(cap(frLong(today())))}</div>
      <div class="big">${present ? "👧🧒 Les enfants sont avec toi aujourd'hui" : "🙂 Journée sans les enfants"}</div>
      ${ex ? `<div class="exch">🔄 Prochain échange : ${esc(frShort(ex.date))} · ${ex.present ? 'ils arrivent' : 'ils repartent'} (${esc(rappelLabel(ex.date))})</div>` : ''}
    </div>

    <div class="card">
      <h2>🍽️ Ce soir</h2>
      ${repas
        ? `<div class="item"><span class="label">${esc(repas)}</span>${m.rid ? `<button class="btn btn-mini" id="d-cart">🛒 Ingrédients</button>` : ''}<button class="btn btn-mini btn-ghost" id="d-dice">🎲</button></div>`
        : `<button class="btn btn-accent btn-block" id="d-random">🎲 Qu'est-ce qu'on mange ?</button>`}
    </div>

    <div class="dash-grid">
      <div class="stat" data-go="courses"><div class="n">${aRacheter}</div><div class="t">article(s) à acheter</div></div>
      <div class="stat" data-go="garde"><div class="n">${transitionRestante}</div><div class="t">à préparer pour l'échange 🎒</div></div>
    </div>

    <div class="section-title">${mom === 'matin' ? '☀️ Routines du matin' : '🌙 Routines du soir'}</div>
    <div class="card">
      ${[['petit', data.reglages.petit, pP], ['grand', data.reglages.grand, pG]].map(([c, nom, p]) => `
        <div class="prog-row" data-mode="${c}">
          <span class="nm">${esc(nom)}</span>
          <span class="prog-bar"><i style="width:${p.t ? Math.round(p.d / p.t * 100) : 0}%"></i></span>
          <span class="ct">${p.d}/${p.t}</span><span class="go">▶</span>
        </div>`).join('')}
    </div>

    <div class="section-title">Prochains rappels</div>
    <div class="card">
      ${prochains.length ? prochains.map((r) => { const late = r.date && parseISO(r.date) < parseISO(ti); return `<div class="item"><span class="label">${esc(r.texte)}${r.repeat && r.repeat !== 'none' ? ' 🔁' : ''}</span><span class="tag ${late ? 'late' : ''}">${r.date ? esc(rappelLabel(r.date)) : '—'}</span></div>`; }).join('')
        : `<div class="empty"><span class="e">✅</span>Rien de prévu. Ajoute un rappel dans l'onglet Famille.</div>`}
    </div>

    <div class="section-title">Accès rapide</div>
    <div class="quick">
      <button data-go="courses"><span class="e">🛒</span>Ma liste de courses</button>
      <button data-go="repas"><span class="e">🍽️</span>Planifier les repas</button>
      <button data-go="garde"><span class="e">🎒</span>Sac de transition</button>
      <button data-go="famille"><span class="e">🧸</span>Routines & rappels</button>
    </div>`;

  const wel = el.querySelector('#wel-ok');
  if (wel) wel.addEventListener('click', () => { data.reglages.welcomeDismissed = true; save(); renderAccueil(el); });
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.go)));
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => openModeEnfant(b.dataset.mode)));
  const dr = el.querySelector('#d-random'), dd = el.querySelector('#d-dice');
  const pickTonight = () => { const r = data.recettes[Math.floor(Math.random() * data.recettes.length)]; data.menu[ti] = Object.assign({}, data.menu[ti], { meal: r.nom, rid: r.id }); save(); renderAccueil(el); toast('🎲 Ce soir : ' + r.emoji + ' ' + r.nom); };
  if (dr) dr.addEventListener('click', pickTonight);
  if (dd) dd.addEventListener('click', pickTonight);
  const dc = el.querySelector('#d-cart');
  if (dc) dc.addEventListener('click', () => addRecetteToCourses(ti, 'soir'));
}
function rappelLabel(s) {
  const diff = Math.round((parseISO(s) - parseISO(todayISO())) / 86400000);
  if (diff < 0) return 'en retard'; if (diff === 0) return "aujourd'hui"; if (diff === 1) return 'demain';
  if (diff < 7) return 'dans ' + diff + ' j'; return parseISO(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ============================================================
   COURSES (+ gestion récurrents + budget)
   ============================================================ */
function renderCourses(el) {
  const restants = data.courses.filter((c) => !c.fait).length;
  const groups = {};
  data.courses.forEach((c) => { (groups[c.rayon] = groups[c.rayon] || []).push(c); });
  let listHtml = '';
  RAYONS.forEach((rayon) => {
    const items = (groups[rayon] || []).sort((a, b) => (a.fait - b.fait));
    if (!items.length) return;
    listHtml += `<div class="rayon-group"><div class="rayon-title">${esc(rayon)}</div><div class="list">` +
      items.map((c) => `<div class="item ${c.fait ? 'done' : ''}" data-id="${c.id}"><span class="check">${c.fait ? '✓' : ''}</span><span class="label">${esc(c.nom)}</span><button class="x" data-act="del">✕</button></div>`).join('') + `</div></div>`;
  });
  if (!data.courses.length) listHtml = `<div class="empty"><span class="e">🛒</span>Ta liste est vide. Ajoute un article ou tape un produit récurrent ci-dessous.</div>`;

  const mk = todayISO().slice(0, 7);
  const moisTotal = data.budget.filter((b) => (b.date || '').slice(0, 7) === mk).reduce((s, b) => s + (+b.montant || 0), 0);

  el.innerHTML = `
    <div class="card">
      <div class="field-row">
        <input class="input" id="c-nom" placeholder="Ajouter un article…" autocomplete="off" enterkeyhint="done" />
        <select class="select" id="c-rayon">${RAYONS.map((r) => `<option>${r}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary btn-block" id="c-add">Ajouter à la liste</button>
    </div>

    <div class="section-title">Produits récurrents — ${editRec ? 'touche pour retirer' : 'touche pour ajouter'}</div>
    <div class="card">
      <div class="chips">${data.recurrents.map((r, i) => `<button class="chip ${editRec ? 'del' : 'add'}" data-rec="${i}">${esc(r.nom)}${editRec ? ' ✕' : ''}</button>`).join('')}</div>
      <button class="btn btn-mini btn-ghost" id="rec-edit" style="margin-top:8px">${editRec ? '✓ Terminé' : '✏️ Gérer mes récurrents'}</button>
      ${editRec ? `<div class="field-row" style="margin-top:8px"><input class="input" id="rec-nom" placeholder="Nouveau récurrent…" enterkeyhint="done" /><select class="select" id="rec-rayon">${RAYONS.map((r) => `<option>${r}</option>`).join('')}</select></div><button class="btn btn-mini btn-block" id="rec-add">Ajouter ce récurrent</button>` : ''}
    </div>

    <div class="section-title">Ma liste ${restants ? '· ' + restants + ' à acheter' : ''}</div>
    <div class="card">
      ${listHtml}
      ${data.courses.some((c) => c.fait) ? `<div class="btn-row" style="margin-top:12px"><button class="btn btn-mini" id="c-uncheck">Tout décocher</button><button class="btn btn-mini" id="c-clear">Retirer les articles cochés</button></div>` : ''}
    </div>

    <div class="section-title">💶 Budget courses</div>
    <div class="card">
      <div class="budg-total">${eur(moisTotal)} €</div>
      <div class="muted">dépensé en ${MOIS[new Date().getMonth()]}</div>
      <div class="field-row" style="margin-top:10px"><input class="input" id="bg-montant" type="number" inputmode="decimal" step="0.01" placeholder="Montant €" /><input class="input" id="bg-note" placeholder="Note (ex. Lidl)" /></div>
      <button class="btn btn-block" id="bg-add">Ajouter une dépense</button>
      <div class="list" style="margin-top:8px">${[...data.budget].reverse().slice(0, 6).map((b) => `<div class="item budget" data-bid="${b.id}"><span class="label">${esc(b.note || 'Course')} <span class="muted">· ${esc(frShort(b.date))}</span></span><span class="tag">${eur(b.montant)} €</span><button class="x" data-delb>✕</button></div>`).join('')}</div>
    </div>`;

  const addItem = () => { const nom = document.getElementById('c-nom').value.trim(); if (!nom) return; data.courses.push({ id: uid(), nom, rayon: document.getElementById('c-rayon').value, fait: false }); save(); renderCourses(el); };
  document.getElementById('c-add').addEventListener('click', addItem);
  document.getElementById('c-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });

  el.querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.rec;
    if (editRec) { const r = data.recurrents[i]; data.recurrents.splice(i, 1); save(); renderCourses(el); toast(r.nom + ' retiré des récurrents'); return; }
    const r = data.recurrents[i];
    if (data.courses.some((c) => c.nom.toLowerCase() === r.nom.toLowerCase() && !c.fait)) { toast(r.nom + ' est déjà dans la liste'); return; }
    data.courses.push({ id: uid(), nom: r.nom, rayon: r.rayon, fait: false }); save(); renderCourses(el); toast(r.nom + ' ajouté');
  }));
  document.getElementById('rec-edit').addEventListener('click', () => { editRec = !editRec; renderCourses(el); });
  const recAdd = document.getElementById('rec-add');
  if (recAdd) recAdd.addEventListener('click', () => {
    const nom = document.getElementById('rec-nom').value.trim(); if (!nom) return;
    if (data.recurrents.some((r) => r.nom.toLowerCase() === nom.toLowerCase())) { toast('Déjà dans tes récurrents'); return; }
    data.recurrents.push({ nom, rayon: document.getElementById('rec-rayon').value }); save(); renderCourses(el); toast(nom + ' ajouté aux récurrents');
  });

  el.querySelectorAll('.item[data-id]').forEach((row) => {
    const id = row.dataset.id;
    wireRow(row,
      () => { const c = data.courses.find((x) => x.id === id); c.fait = !c.fait; save(); renderCourses(el); },
      () => { data.courses = data.courses.filter((x) => x.id !== id); save(); renderCourses(el); });
  });
  const unc = document.getElementById('c-uncheck'); if (unc) unc.addEventListener('click', () => { data.courses.forEach((c) => c.fait = false); save(); renderCourses(el); });
  const clr = document.getElementById('c-clear'); if (clr) clr.addEventListener('click', () => { data.courses = data.courses.filter((c) => !c.fait); save(); renderCourses(el); toast('Articles cochés retirés'); });

  const addBg = () => { const montant = parseFloat(document.getElementById('bg-montant').value); if (isNaN(montant)) { toast('Indique un montant'); return; } data.budget.push({ id: uid(), date: todayISO(), montant, note: document.getElementById('bg-note').value.trim() }); save(); renderCourses(el); };
  document.getElementById('bg-add').addEventListener('click', addBg);
  el.querySelectorAll('[data-bid]').forEach((row) => row.querySelector('[data-delb]').addEventListener('click', () => { data.budget = data.budget.filter((x) => x.id !== row.dataset.bid); save(); renderCourses(el); }));
}

/* ============================================================
   REPAS (+ remplir la semaine, aléatoire, midi week-end, recettes perso)
   ============================================================ */
function renderRepas(el) {
  const start = new Date(weekRef);
  const ti = todayISO();
  let rows = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i); const key = iso(d); const isToday = key === ti; const abbr = JOURS[i].slice(0, 3);
    if (i >= 5) rows += mealRowHtml(key, 'midi', abbr, d.getDate(), isToday, true);
    rows += mealRowHtml(key, 'soir', abbr, d.getDate(), isToday, i >= 5);
  }
  const end = addDays(start, 6);
  const label = `${start.getDate()} ${MOIS[start.getMonth()].slice(0, 4)}. – ${end.getDate()} ${MOIS[end.getMonth()].slice(0, 4)}.`;

  el.innerHTML = `
    <div class="btn-row" style="margin-bottom:14px">
      <button class="btn btn-accent" style="flex:1" id="r-random">🎲 Ce soir ?</button>
      <button class="btn btn-primary" style="flex:1" id="r-fill">✨ Remplir la semaine</button>
    </div>
    <div class="card">
      <div class="cal-head"><button id="w-prev">‹</button><div class="m">Semaine du ${label}</div><button id="w-next">›</button></div>
      ${rows}
    </div>
    <div class="card">
      <h2>🛒 Tout d'un coup</h2>
      <p class="sub">Ajoute en une fois les ingrédients de tous les repas planifiés cette semaine à ta liste de courses.</p>
      <button class="btn btn-accent btn-block" id="w-allcart">Générer la liste de courses de la semaine</button>
    </div>
    <div class="section-title">Piocher une recette (remplit le prochain jour libre)</div>
    <div class="card">
      <div class="chips">${data.recettes.map((r) => `<button class="chip" data-recette="${r.id}">${r.emoji} ${esc(r.nom)}</button>`).join('')}</div>
      <button class="btn btn-ghost" id="rc-toggle" style="margin-top:8px">➕ Ajouter ma recette</button>
      <div id="rc-form" ${showRecForm ? '' : 'hidden'} style="margin-top:8px">
        <input class="input" id="rc-nom" placeholder="Nom du plat (ex. Gratin de courgettes)" style="margin-bottom:8px" />
        <textarea class="input" id="rc-ing" rows="4" placeholder="Un ingrédient par ligne. Tu peux préciser le rayon après une virgule :&#10;Courgettes, Fruits & Légumes&#10;Crème fraîche, Frais"></textarea>
        <button class="btn btn-primary btn-block" id="rc-save" style="margin-top:8px">Enregistrer la recette</button>
      </div>
    </div>`;

  el.querySelectorAll('.day-row').forEach((row) => {
    const key = row.dataset.key, slot = row.dataset.slot;
    const input = row.querySelector('[data-meal]');
    input.addEventListener('change', () => { data.menu[key] = data.menu[key] || {}; if (slot === 'soir') data.menu[key].meal = input.value.trim(); else data.menu[key].midi = input.value.trim(); save(); });
    row.querySelector('[data-pick]').addEventListener('click', () => openRecipePicker(key, slot));
    row.querySelector('[data-cart]').addEventListener('click', () => addRecetteToCourses(key, slot));
  });
  document.getElementById('w-prev').addEventListener('click', () => { weekRef = addDays(weekRef, -7); renderRepas(el); });
  document.getElementById('w-next').addEventListener('click', () => { weekRef = addDays(weekRef, 7); renderRepas(el); });
  document.getElementById('w-allcart').addEventListener('click', () => addWeekToCourses(start));
  document.getElementById('r-random').addEventListener('click', () => { const r = data.recettes[Math.floor(Math.random() * data.recettes.length)]; data.menu[ti] = Object.assign({}, data.menu[ti], { meal: r.nom, rid: r.id }); save(); renderRepas(el); toast('🎲 Ce soir : ' + r.emoji + ' ' + r.nom); });
  document.getElementById('r-fill').addEventListener('click', () => fillWeek(start, el));
  el.querySelectorAll('[data-recette]').forEach((b) => b.addEventListener('click', () => {
    const r = data.recettes.find((x) => x.id === b.dataset.recette);
    let target = null;
    for (let i = 0; i < 7; i++) { const k = iso(addDays(start, i)); if (!(data.menu[k] && data.menu[k].meal)) { target = k; break; } }
    if (!target) { toast('La semaine est déjà remplie'); return; }
    data.menu[target] = Object.assign({}, data.menu[target], { meal: r.nom, rid: r.id });
    save(); renderRepas(el); toast(r.nom + ' → ' + frLong(parseISO(target)));
  }));
  document.getElementById('rc-toggle').addEventListener('click', () => { showRecForm = !showRecForm; renderRepas(el); });
  const rcSave = document.getElementById('rc-save');
  if (rcSave) rcSave.addEventListener('click', () => {
    const nom = document.getElementById('rc-nom').value.trim(); if (!nom) { toast('Donne un nom au plat'); return; }
    const ing = document.getElementById('rc-ing').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const p = l.split(','); const n = p[0].trim(); let rayon = 'Autres';
      if (p[1]) { const rt = p[1].trim().toLowerCase(); const f = RAYONS.find((x) => x.toLowerCase() === rt || x.toLowerCase().includes(rt) || rt.includes(x.toLowerCase())); if (f) rayon = f; }
      return [n, rayon];
    }).filter((x) => x[0]);
    data.recettes.push({ id: uid(), nom, emoji: '🍴', ing }); showRecForm = false; save(); renderRepas(el); toast('Recette ajoutée ✓');
  });
}
function fillWeek(start, el) {
  const pool = data.recettes; let n = 0; let last = '';
  for (let i = 0; i < 7; i++) {
    const k = iso(addDays(start, i));
    if (data.menu[k] && data.menu[k].meal) continue;
    let r, tries = 0; do { r = pool[Math.floor(Math.random() * pool.length)]; tries++; } while (r.id === last && tries < 8);
    data.menu[k] = Object.assign({}, data.menu[k], { meal: r.nom, rid: r.id }); last = r.id; n++;
  }
  save(); renderRepas(el); toast(n ? n + ' dîner(s) ajouté(s) ✨' : 'La semaine était déjà remplie');
}
function mealRowHtml(key, slot, abbr, dnum, isToday, showPill) {
  const m = data.menu[key] || {};
  const val = slot === 'soir' ? (m.meal || '') : (m.midi || '');
  return `<div class="day-row" data-key="${key}" data-slot="${slot}"><div class="d ${isToday ? 'today' : ''}">${abbr}<br>${dnum}</div>${showPill ? `<span class="slotpill ${slot}">${slot}</span>` : ''}<input class="meal" data-meal placeholder="—" value="${esc(val)}" /><button class="ic" data-pick title="Choisir une recette">📖</button><button class="ic" data-cart title="Ajouter les ingrédients aux courses">🛒</button></div>`;
}
function pushIngredients(rid) {
  const r = data.recettes.find((x) => x.id === rid); if (!r) return 0; let added = 0;
  r.ing.forEach(([nom, rayon]) => { if (data.courses.some((c) => c.nom.toLowerCase() === nom.toLowerCase() && !c.fait)) return; data.courses.push({ id: uid(), nom, rayon, fait: false }); added++; });
  return added;
}
function addRecetteToCourses(key, slot) {
  const m = data.menu[key] || {}; const rid = slot === 'soir' ? m.rid : m.midiRid;
  if (!rid) { toast("Choisis d'abord une recette (📖) pour ce repas"); return; }
  const n = pushIngredients(rid); save(); toast(n ? n + ' ingrédient(s) ajouté(s) aux courses' : 'Déjà dans la liste');
}
function addWeekToCourses(start) {
  let total = 0, jours = 0;
  for (let i = 0; i < 7; i++) { const m = data.menu[iso(addDays(start, i))]; if (!m) continue; if (m.rid) { total += pushIngredients(m.rid); jours++; } if (m.midiRid) { total += pushIngredients(m.midiRid); jours++; } }
  save();
  if (!jours) { toast('Aucune recette planifiée cette semaine'); return; }
  toast(total ? total + ' ingrédient(s) ajoutés ✓' : 'Tout est déjà dans la liste');
}

/* Sélecteur de recette (overlay tactile, remplace prompt) */
function openRecipePicker(key, slot) {
  let filter = '';
  const m0 = data.menu[key] || {}; const cur = slot === 'soir' ? m0.meal : m0.midi;
  const ov = document.createElement('div'); ov.className = 'overlay';
  closeOverlay();
  ov.innerHTML = `
    <div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>Choisir un repas</h2></div>
    <div class="overlay-body">
      <input class="input" id="rp-search" placeholder="Rechercher une recette…" autocomplete="off" />
      ${cur ? `<p class="muted" style="margin:10px 2px">Actuellement : <b>${esc(cur)}</b></p>` : ''}
      <div class="list" id="rp-list" style="margin-top:8px">${recipeRowsHtml('')}</div>
      <button class="btn btn-block" id="rp-clear" style="margin-top:14px;color:var(--danger)">✕ Vider ce repas</button>
    </div>`;
  document.body.appendChild(ov);
  const assign = (rec) => { const mm = data.menu[key] || {}; if (slot === 'soir') { mm.meal = rec.nom; mm.rid = rec.id; } else { mm.midi = rec.nom; mm.midiRid = rec.id; } data.menu[key] = mm; save(); closeOverlay(); render(); toast(rec.emoji + ' ' + rec.nom); };
  const wireRows = () => ov.querySelectorAll('[data-rid]').forEach((r) => r.addEventListener('click', () => assign(data.recettes.find((x) => x.id === r.dataset.rid))));
  wireRows();
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  const search = ov.querySelector('#rp-search');
  search.addEventListener('input', () => { filter = search.value; ov.querySelector('#rp-list').innerHTML = recipeRowsHtml(filter); wireRows(); });
  ov.querySelector('#rp-clear').addEventListener('click', () => { const mm = data.menu[key] || {}; if (slot === 'soir') { delete mm.meal; delete mm.rid; } else { delete mm.midi; delete mm.midiRid; } data.menu[key] = mm; save(); closeOverlay(); render(); toast('Repas vidé'); });
}
function recipeRowsHtml(filter) {
  const f = (filter || '').toLowerCase().trim();
  const list = data.recettes.filter((r) => !f || r.nom.toLowerCase().includes(f));
  if (!list.length) return `<div class="empty">Aucune recette trouvée.</div>`;
  return list.map((r) => `<div class="item recipe" data-rid="${r.id}"><span class="label">${r.emoji} ${esc(r.nom)}</span><span class="go">＋</span></div>`).join('');
}

/* ============================================================
   GARDE — calendrier (avec mode période) + sac de transition
   ============================================================ */
function renderGarde(el) {
  const y = calRef.getFullYear(), m = calRef.getMonth();
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const nbDays = new Date(y, m + 1, 0).getDate();
  const ti = todayISO();
  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= nbDays; d++) {
    const key = iso(new Date(y, m, d));
    cells += `<div class="cal-cell ${data.presence[key] ? 'on' : ''} ${key === ti ? 'today' : ''} ${key === rangeStart ? 'pending' : ''}" data-day="${key}">${d}</div>`;
  }
  const reste = data.transition.filter((x) => !x.fait).length;
  const whoLabel = { grand: data.reglages.grand, petit: data.reglages.petit, deux: 'Les deux' };
  const whoClass = { grand: 'who-grand', petit: 'who-petit', deux: 'who-deux' };
  const ex = nextExchange();

  el.innerHTML = `
    <div class="card">
      <h2>📅 Quand as-tu les enfants ?</h2>
      ${rangeMode ? `<div class="hint">${rangeStart ? 'Touche maintenant le <b>dernier</b> jour de la période.' : 'Touche le <b>premier</b> jour de la période.'}</div>` : `<p class="sub">Touche un jour pour le cocher/décocher, ou marque toute une période d'un coup.</p>`}
      ${ex ? `<div class="hint" style="background:var(--primary-soft);border-color:#bfe0db;color:var(--primary-d)">🔄 Prochain échange : <b>${esc(frShort(ex.date))}</b> · ${ex.present ? 'ils arrivent' : 'ils repartent'} (${esc(rappelLabel(ex.date))})</div>` : ''}
      <div class="cal-head"><button id="m-prev">‹</button><div class="m">${MOIS[m]} ${y}</div><button id="m-next">›</button></div>
      <div class="cal-grid">${DOW.map((x) => `<div class="cal-dow">${x}</div>`).join('')}</div>
      <div class="cal-grid" style="margin-top:5px">${cells}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn btn-mini ${rangeMode ? 'btn-primary' : ''}" id="g-range">${rangeMode ? '✕ Annuler la période' : '📌 Marquer une période'}</button></div>
      <div class="legend"><span><span class="dot" style="background:var(--primary)"></span>Avec les enfants</span><span><span class="dot" style="background:#fff;border:1.5px solid var(--amber)"></span>Aujourd'hui</span></div>
    </div>
    <div class="section-title">🎒 Le sac de transition ${reste ? '· ' + reste + ' à préparer' : '· prêt ✓'}</div>
    <div class="card">
      <p class="sub">Ce qui doit suivre les enfants à chaque échange. Coche en préparant le sac, puis réinitialise pour la prochaine fois.</p>
      <div class="list">${data.transition.map((it) => `<div class="item ${it.fait ? 'done' : ''}" data-id="${it.id}"><span class="check">${it.fait ? '✓' : ''}</span><span class="label">${esc(it.nom)}</span><span class="tag ${whoClass[it.qui]}">${esc(whoLabel[it.qui])}</span><button class="x" data-act="del">✕</button></div>`).join('')}</div>
      <div class="field-row" style="margin-top:12px"><input class="input" id="tr-nom" placeholder="Ajouter une affaire…" autocomplete="off" enterkeyhint="done" /><select class="select" id="tr-qui"><option value="deux">Les deux</option><option value="grand">${esc(data.reglages.grand)}</option><option value="petit">${esc(data.reglages.petit)}</option></select></div>
      <div class="btn-row"><button class="btn btn-mini" id="tr-add">Ajouter</button><button class="btn btn-mini btn-primary" id="tr-reset">↻ Réinitialiser pour le prochain échange</button></div>
    </div>`;

  el.querySelectorAll('[data-day]').forEach((c) => c.addEventListener('click', () => {
    const k = c.dataset.day;
    if (rangeMode) {
      if (!rangeStart) { rangeStart = k; renderGarde(el); }
      else { let a = parseISO(rangeStart), b = parseISO(k); if (a > b) { const t = a; a = b; b = t; } for (let d = new Date(a); d <= b; d = addDays(d, 1)) data.presence[iso(d)] = true; rangeMode = false; rangeStart = null; save(); renderGarde(el); toast('Période marquée ✓'); }
      return;
    }
    if (data.presence[k]) delete data.presence[k]; else data.presence[k] = true; save(); renderGarde(el);
  }));
  document.getElementById('g-range').addEventListener('click', () => { rangeMode = !rangeMode; rangeStart = null; renderGarde(el); });
  document.getElementById('m-prev').addEventListener('click', () => { calRef = new Date(y, m - 1, 1); renderGarde(el); });
  document.getElementById('m-next').addEventListener('click', () => { calRef = new Date(y, m + 1, 1); renderGarde(el); });
  el.querySelectorAll('.item[data-id]').forEach((row) => {
    const id = row.dataset.id;
    wireRow(row,
      () => { const it = data.transition.find((x) => x.id === id); it.fait = !it.fait; save(); renderGarde(el); },
      () => { data.transition = data.transition.filter((x) => x.id !== id); save(); renderGarde(el); });
  });
  const addTr = () => { const nom = document.getElementById('tr-nom').value.trim(); if (!nom) return; data.transition.push({ id: uid(), nom, qui: document.getElementById('tr-qui').value, fait: false }); save(); renderGarde(el); };
  document.getElementById('tr-add').addEventListener('click', addTr);
  document.getElementById('tr-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTr(); });
  document.getElementById('tr-reset').addEventListener('click', () => { data.transition.forEach((x) => x.fait = false); save(); renderGarde(el); toast('Sac réinitialisé — prêt pour le prochain échange'); });
}

/* ============================================================
   FAMILLE — routines par enfant + mode enfant + rappels + pense-bête
   ============================================================ */
function renderFamille(el) {
  const child = familleChild;
  const childName = child === 'petit' ? data.reglages.petit : data.reglages.grand;
  const rappels = [...data.rappels].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const ti = todayISO();

  el.innerHTML = `
    <div class="seg">
      <button data-fc="petit" class="${child === 'petit' ? 'on' : ''}">👧 ${esc(data.reglages.petit)}</button>
      <button data-fc="grand" class="${child === 'grand' ? 'on' : ''}">🧒 ${esc(data.reglages.grand)}</button>
    </div>
    <button class="btn btn-accent btn-block" id="f-mode" style="margin-bottom:14px">▶️ Mode enfant — ${esc(childName)} (grand écran à pictos)</button>
    <div class="card">
      <h2>☀️ Routine du matin</h2>
      <div class="list" data-moment="matin">${routineItems(child, 'matin')}</div>
      <div class="field-row" style="margin-top:10px"><input class="input" id="rm-nom" placeholder="Ajouter une étape…" autocomplete="off" enterkeyhint="done" /><button class="btn btn-mini" id="rm-add">＋</button></div>
    </div>
    <div class="card">
      <h2>🌙 Routine du soir</h2>
      <div class="list" data-moment="soir">${routineItems(child, 'soir')}</div>
      <div class="field-row" style="margin-top:10px"><input class="input" id="rs-nom" placeholder="Ajouter une étape…" autocomplete="off" enterkeyhint="done" /><button class="btn btn-mini" id="rs-add">＋</button></div>
      <button class="btn btn-ghost" id="r-reset" style="margin-top:6px">↻ Remettre les routines à zéro (pour demain)</button>
    </div>

    <div class="section-title">🔔 Rappels (RDV, école, paiements…)</div>
    <div class="card">
      <div class="field-row"><input class="input" id="rap-nom" placeholder="Ex. RDV pédiatre, payer la cantine…" autocomplete="off" enterkeyhint="done" /></div>
      <div class="field-row"><input class="input" id="rap-date" type="date" value="${ti}" /><select class="select" id="rap-rep"><option value="none">Une fois</option><option value="semaine">Chaque semaine</option><option value="mois">Chaque mois</option><option value="an">Chaque année</option></select></div>
      <button class="btn btn-primary btn-block" id="rap-add">Ajouter le rappel</button>
      <div class="list" style="margin-top:8px">${rappels.length ? rappels.map((r) => { const late = r.date && parseISO(r.date) < parseISO(ti) && !r.fait; return `<div class="item ${r.fait ? 'done' : ''}" data-rid="${r.id}"><span class="check">${r.fait ? '✓' : ''}</span><span class="label">${esc(r.texte)}${r.repeat && r.repeat !== 'none' ? ' 🔁' : ''}</span><span class="tag ${late ? 'late' : ''}">${r.date ? esc(rappelLabel(r.date)) : '—'}</span><button class="x" data-act="del">✕</button></div>`; }).join('') : `<div class="empty"><span class="e">🔔</span>Aucun rappel pour l'instant.</div>`}</div>
    </div>

    <div class="section-title">📝 Pense-bête (maison & admin)</div>
    <div class="card">
      <div class="field-row"><input class="input" id="nt-nom" placeholder="Ex. Renouveler la carte d'identité, lancer une lessive…" autocomplete="off" enterkeyhint="done" /><button class="btn btn-primary" id="nt-add">＋</button></div>
      <div class="list">${data.notes.length ? data.notes.map((n) => `<div class="item ${n.fait ? 'done' : ''}" data-nid="${n.id}"><span class="check">${n.fait ? '✓' : ''}</span><span class="label">${esc(n.texte)}</span><button class="x" data-act="del">✕</button></div>`).join('') : `<div class="empty"><span class="e">📝</span>Note ici tout ce qui te passe par la tête.</div>`}</div>
      ${data.notes.some((n) => n.fait) ? `<button class="btn btn-mini" id="nt-clear" style="margin-top:10px">Nettoyer les tâches faites</button>` : ''}
    </div>`;

  el.querySelectorAll('[data-fc]').forEach((b) => b.addEventListener('click', () => { familleChild = b.dataset.fc; renderFamille(el); }));
  document.getElementById('f-mode').addEventListener('click', () => openModeEnfant(child));

  el.querySelectorAll('[data-moment]').forEach((box) => {
    const mom = box.dataset.moment;
    box.querySelectorAll('.item').forEach((row) => {
      const id = row.dataset.id;
      wireRow(row,
        () => { const it = data.routines[child][mom].find((x) => x.id === id); it.fait = !it.fait; save(); renderFamille(el); },
        () => { data.routines[child][mom] = data.routines[child][mom].filter((x) => x.id !== id); save(); renderFamille(el); });
    });
  });
  const addRoutine = (mom, inputId) => { const v = document.getElementById(inputId).value.trim(); if (!v) return; data.routines[child][mom].push({ id: uid(), texte: v, fait: false }); save(); renderFamille(el); };
  document.getElementById('rm-add').addEventListener('click', () => addRoutine('matin', 'rm-nom'));
  document.getElementById('rs-add').addEventListener('click', () => addRoutine('soir', 'rs-nom'));
  document.getElementById('rm-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addRoutine('matin', 'rm-nom'); });
  document.getElementById('rs-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addRoutine('soir', 'rs-nom'); });
  document.getElementById('r-reset').addEventListener('click', () => { data.routines[child].matin.forEach((x) => x.fait = false); data.routines[child].soir.forEach((x) => x.fait = false); save(); renderFamille(el); toast('Routines remises à zéro'); });

  const addRap = () => { const texte = document.getElementById('rap-nom').value.trim(); if (!texte) return; data.rappels.push({ id: uid(), texte, date: document.getElementById('rap-date').value || '', repeat: document.getElementById('rap-rep').value, fait: false }); save(); renderFamille(el); };
  document.getElementById('rap-add').addEventListener('click', addRap);
  document.getElementById('rap-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addRap(); });
  el.querySelectorAll('[data-rid]').forEach((row) => {
    const id = row.dataset.rid;
    wireRow(row,
      () => { const r = data.rappels.find((x) => x.id === id); if (r.repeat && r.repeat !== 'none' && !r.fait && r.date) { r.date = nextDate(r.date, r.repeat); toast('Reporté au ' + frShort(r.date)); } else r.fait = !r.fait; save(); renderFamille(el); },
      () => { data.rappels = data.rappels.filter((x) => x.id !== id); save(); renderFamille(el); });
  });

  const addNote = () => { const v = document.getElementById('nt-nom').value.trim(); if (!v) return; data.notes.push({ id: uid(), texte: v, fait: false }); save(); renderFamille(el); };
  document.getElementById('nt-add').addEventListener('click', addNote);
  document.getElementById('nt-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addNote(); });
  el.querySelectorAll('[data-nid]').forEach((row) => {
    const id = row.dataset.nid;
    wireRow(row,
      () => { const n = data.notes.find((x) => x.id === id); n.fait = !n.fait; save(); renderFamille(el); },
      () => { data.notes = data.notes.filter((x) => x.id !== id); save(); renderFamille(el); });
  });
  const ntClear = document.getElementById('nt-clear');
  if (ntClear) ntClear.addEventListener('click', () => { data.notes = data.notes.filter((n) => !n.fait); save(); renderFamille(el); });
}
function routineItems(child, mom) {
  return data.routines[child][mom].map((it) => `<div class="item ${it.fait ? 'done' : ''}" data-id="${it.id}"><span class="check">${it.fait ? '✓' : ''}</span><span class="label">${esc(it.texte)}</span><button class="x" data-act="del">✕</button></div>`).join('');
}

/* ============================================================
   MODE ENFANT (overlay plein écran, gros pictogrammes)
   ============================================================ */
function closeOverlay() { document.querySelectorAll('.overlay').forEach((o) => o.remove()); }
function openModeEnfant(child) { renderModeEnfant(child, moment()); }
function renderModeEnfant(child, mom) {
  closeOverlay();
  const list = data.routines[child][mom];
  const name = child === 'petit' ? data.reglages.petit : data.reglages.grand;
  const allDone = list.length && list.every((x) => x.fait);
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `
    <div class="overlay-head"><button class="overlay-close" data-close>←</button><h2>${esc(name)}</h2></div>
    <div class="overlay-body">
      <div class="seg"><button data-moment="matin" class="${mom === 'matin' ? 'on' : ''}">☀️ Matin</button><button data-moment="soir" class="${mom === 'soir' ? 'on' : ''}">🌙 Soir</button></div>
      ${allDone ? `<div class="kid-bravo"><span class="e">🎉</span>Bravo ${esc(name)}, tout est fait !</div>` : ''}
      <div class="kid-grid">${list.map((it) => `<div class="kid-card ${it.fait ? 'done' : ''}" data-id="${it.id}"><div class="kid-pict">${pictoFor(it.texte)}</div><div class="kid-label">${esc(it.texte)}</div></div>`).join('')}</div>
      <div style="text-align:center;margin-top:18px"><button class="btn btn-ghost" data-reset>↻ Tout recommencer</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelectorAll('[data-moment]').forEach((b) => b.addEventListener('click', () => renderModeEnfant(child, b.dataset.moment)));
  ov.querySelectorAll('.kid-card').forEach((c) => c.addEventListener('click', () => { const it = list.find((x) => x.id === c.dataset.id); it.fait = !it.fait; save(); renderModeEnfant(child, mom); }));
  ov.querySelector('[data-reset]').addEventListener('click', () => { list.forEach((x) => x.fait = false); save(); renderModeEnfant(child, mom); });
}

/* ============================================================
   RÉGLAGES (overlay) — prénoms, contacts, sauvegarde
   ============================================================ */
function openReglages() {
  closeOverlay();
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `
    <div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>Réglages & plus</h2></div>
    <div class="overlay-body">
      <div class="set-section"><h3>Prénoms des enfants</h3>
        <div class="card">
          <div class="field-row"><input class="input" id="set-petit" value="${esc(data.reglages.petit)}" placeholder="Le petit (4 ans)" /></div>
          <div class="field-row"><input class="input" id="set-grand" value="${esc(data.reglages.grand)}" placeholder="Le grand (10 ans)" /></div>
          <button class="btn btn-primary btn-block" id="set-save">Enregistrer</button>
        </div>
      </div>
      <div class="set-section"><h3>📇 Contacts utiles</h3>
        <div class="card">
          <div class="list">${data.contacts.length ? data.contacts.map((c) => `<div class="item" data-cid="${c.id}"><span class="label"><strong>${esc(c.nom)}</strong>${c.role ? ' · <span class="muted">' + esc(c.role) + '</span>' : ''}${c.tel ? '<br><a class="tel-link" href="tel:' + esc(c.tel) + '">📞 ' + esc(c.tel) + '</a>' : ''}</span><button class="x" data-delc>✕</button></div>`).join('') : `<div class="empty"><span class="e">📇</span>Aucun contact. Ajoute l'école, le pédiatre, la nounou, l'autre parent…</div>`}</div>
          <div class="field-row" style="margin-top:10px"><input class="input" id="ct-nom" placeholder="Nom (ex. École, Dr Martin)" /></div>
          <div class="field-row"><input class="input" id="ct-role" placeholder="Rôle (ex. pédiatre)" /><input class="input" id="ct-tel" placeholder="Téléphone" inputmode="tel" /></div>
          <button class="btn btn-block" id="ct-add">Ajouter le contact</button>
        </div>
      </div>
      <div class="set-section"><h3>💾 Sauvegarde</h3>
        <div class="card">
          <p class="sub">Tes données sont sur cet appareil uniquement. Exporte-les de temps en temps (et pour les transférer sur ton téléphone).</p>
          <div class="btn-row"><button class="btn" id="bk-export">⬇️ Exporter mes données</button><label class="btn" style="cursor:pointer">⬆️ Importer<input type="file" id="bk-import" accept="application/json,.json" hidden /></label></div>
          <div class="divider"></div>
          <button class="btn btn-block" id="bk-reset" style="color:var(--danger)">Tout réinitialiser</button>
        </div>
      </div>
      <p class="muted" style="text-align:center">Ma Tribu · v4 · 100 % sur ton appareil</p>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#set-save').addEventListener('click', () => { const p = ov.querySelector('#set-petit').value.trim(), g = ov.querySelector('#set-grand').value.trim(); if (p) data.reglages.petit = p; if (g) data.reglages.grand = g; save(); toast('Prénoms enregistrés'); openReglages(); });
  ov.querySelector('#ct-add').addEventListener('click', () => { const nom = ov.querySelector('#ct-nom').value.trim(); if (!nom) { toast('Indique au moins un nom'); return; } data.contacts.push({ id: uid(), nom, role: ov.querySelector('#ct-role').value.trim(), tel: ov.querySelector('#ct-tel').value.trim() }); save(); openReglages(); });
  ov.querySelectorAll('[data-cid]').forEach((row) => row.querySelector('[data-delc]').addEventListener('click', () => { data.contacts = data.contacts.filter((x) => x.id !== row.dataset.cid); save(); openReglages(); }));
  ov.querySelector('#bk-export').addEventListener('click', exportData);
  ov.querySelector('#bk-import').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
  ov.querySelector('#bk-reset').addEventListener('click', () => confirmDialog('Effacer TOUTES les données et repartir de zéro ?', () => { localStorage.removeItem(STORE_KEY); location.reload(); }, { danger: true, yes: 'Tout effacer' }));
}
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ma-tribu-' + todayISO() + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Sauvegarde téléchargée');
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    let obj; try { obj = JSON.parse(r.result); } catch (e) { toast('Fichier illisible'); return; }
    if (!obj || typeof obj !== 'object' || !('courses' in obj)) { toast('Sauvegarde invalide'); return; }
    confirmDialog('Remplacer les données actuelles par cette sauvegarde ?', () => { data = obj; migrate(); save(); closeOverlay(); setTab(activeTab); toast('Sauvegarde importée ✓'); }, { yes: 'Remplacer' });
  };
  r.readAsText(file);
}

/* ---------- Démarrage ---------- */
function boot() {
  load();
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  document.getElementById('btn-reset').addEventListener('click', openReglages);
  setTab('accueil');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', boot);
