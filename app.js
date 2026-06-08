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

/* Couleurs d'accent disponibles */
const ACCENTS = {
  teal:   { nom: 'Sapin',  primary: '#14756a', d: '#0e564e', soft: '#e2f0ee' },
  bleu:   { nom: 'Océan',  primary: '#2563eb', d: '#1d4ed8', soft: '#e5edfd' },
  violet: { nom: 'Mauve',  primary: '#7c3aed', d: '#5b21b6', soft: '#efe7fd' },
  corail: { nom: 'Corail', primary: '#e0533f', d: '#b23a29', soft: '#fde7e2' }
};
function applyTheme() {
  const a = ACCENTS[data.reglages.accent] || ACCENTS.teal;
  const r = document.documentElement.style;
  r.setProperty('--primary', a.primary); r.setProperty('--primary-d', a.d); r.setProperty('--primary-soft', a.soft);
  document.body.classList.toggle('theme-sombre', data.reglages.theme === 'sombre');
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', a.primary);
}

/* Helpers v7 : activités, anniversaires, recettes, notifications */
function todayDow() { return (new Date().getDay() + 6) % 7; }
function tempsMin(t) { if (!t) return 999; t = String(t).toLowerCase(); let m = 0; const h = t.match(/(\d+)\s*h/); if (h) m += parseInt(h[1], 10) * 60; const mn = t.match(/(\d+)\s*min/); if (mn) m += parseInt(mn[1], 10); if (!h && !mn) { const n = parseInt(t, 10); if (!isNaN(n)) m = n; } return m || 999; }
const DESSERT_IDS = new Set(['r27', 'r28', 'r45', 'r46', 'r47', 'r48']);
function seedSanteFor() { return { allergies: '', traitements: '', medecin: '', groupe: '', vetements: '', pointure: '', notes: [], medicaments: [], mesures: [] }; }
function seedRecompensesFor() { return { etoiles: 0, objectif: 10, recompense: '' }; }
function soldeCoparent() { let s = 0; data.depenses.forEach((d) => { const part = (+d.montant || 0) / 2; if (d.payePar === 'moi') s += part; else s -= part; }); return s; }
function nextAnnivInfo(s) {
  if (!s) return null; const p = s.split('-'); const mo = +p[1], da = +p[2]; if (!mo || !da) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0); let d = new Date(now.getFullYear(), mo - 1, da); if (d < now) d = new Date(now.getFullYear() + 1, mo - 1, da);
  const days = Math.round((d - now) / 86400000); const age = (p[0] && +p[0] > 1900) ? d.getFullYear() - +p[0] : null; return { days, date: iso(d), age };
}
function annivLabel(info) { if (!info) return ''; if (info.days === 0) return "🎉 aujourd'hui"; if (info.days === 1) return 'demain'; if (info.days < 30) return 'dans ' + info.days + ' j'; return frShort(info.date); }
function notifyToday(force) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!force && data.reglages.lastNotif === todayISO()) return;
  const items = [];
  data.rappels.filter((r) => !r.fait && r.date && r.date <= todayISO()).forEach((r) => items.push('🔔 ' + r.texte));
  data.activites.filter((a) => a.jour === todayDow()).sort((a, b) => (a.heure || '').localeCompare(b.heure || '')).forEach((a) => items.push('📆 ' + (a.heure ? a.heure + ' — ' : '') + a.nom));
  data.anniversaires.forEach((a) => { const n = nextAnnivInfo(a.date); if (n && n.days === 0) items.push('🎂 Anniversaire de ' + a.nom + ' !'); });
  if (!items.length) { if (force) toast("Rien de spécial aujourd'hui 🙂"); return; }
  try { new Notification('Ma Tribu — aujourd\'hui', { body: items.slice(0, 6).join('\n'), icon: 'icon.svg' }); data.reglages.lastNotif = todayISO(); save(); } catch (e) {}
}
function requestNotifs() {
  if (!('Notification' in window)) { toast('Notifications non supportées ici'); return; }
  Notification.requestPermission().then((p) => {
    data.reglages.notifs = (p === 'granted'); save();
    toast(p === 'granted' ? 'Notifications activées ✓' : 'Notifications refusées');
    if (p === 'granted') notifyToday(true);
    if (document.querySelector('.overlay')) openReglages();
  });
}

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
function seedRoutinesFor() {
  const mk = (arr) => arr.map((x) => ({ id: uid(), texte: x, fait: false }));
  return { matin: mk(['Se lever', "S'habiller", 'Petit-déjeuner', 'Se brosser les dents']), soir: mk(['Dîner', 'Bain ou douche', 'Se brosser les dents', 'Une histoire', 'Au lit']) };
}
function childName(id) { const e = (data.enfants || []).find((x) => x.id === id); return e ? e.prenom : ''; }
function seedEnfant(prenom) { const id = uid(); data.enfants.push({ id, prenom: (prenom || 'Enfant').trim() || 'Enfant' }); data.routines[id] = seedRoutinesFor(); data.sante[id] = seedSanteFor(); data.recompenses[id] = seedRecompensesFor(); return id; }
function quiLabel(q) { return q === 'tous' ? 'Tous' : (childName(q) || '?'); }
function quiOptions(sel) { return '<option value="tous">Tous</option>' + (data.enfants || []).map((e) => `<option value="${e.id}"${sel === e.id ? ' selected' : ''}>${esc(e.prenom)}</option>`).join(''); }
/* Helper textes adaptés au contexte familial */
function contextLabel() {
  const ctx = (data && data.reglages && data.reglages.contextFamily) || 'alternee';
  const labels = {
    alternee: { otherParent: "L'autre parent", nextTransition: 'prochain échange', cohabitation: 'entre les deux maisons', coParent: 'co-parent', context: 'la garde alternée' },
    seul: { otherParent: "L'autre responsable", nextTransition: 'prochaine transition', cohabitation: 'chez toi et ailleurs', coParent: 'responsable', context: 'en tant que parent solo' },
    autre: { otherParent: "L'autre parent/responsable", nextTransition: 'prochaine transition', cohabitation: 'à partager', coParent: 'autre parent', context: 'dans ta situation familiale' }
  };
  return labels[ctx] || labels.alternee;
}
function seedRecettes() {
  return [
    { id: "r1", nom: "Pâtes bolognaise", emoji: "🍝", temps: "30 min", portions: "4 pers.", ing: [["Pâtes","Épicerie salée"],["Viande hachée","Viande & Poisson"],["Sauce tomate","Épicerie salée"],["Oignon","Fruits & Légumes"],["Gruyère râpé","Frais"]], etapes: ["Émince l'oignon et fais-le revenir dans un filet d'huile.","Ajoute la viande hachée et fais-la dorer en l'émiettant.","Verse la sauce tomate, sale, poivre, laisse mijoter 15 min.","Cuis les pâtes dans l'eau bouillante salée (voir paquet).","Égoutte, mélange à la sauce et sers avec le gruyère."] },
    { id: "r2", nom: "Poulet rôti & purée", emoji: "🍗", temps: "1 h", portions: "4 pers.", ing: [["Poulet","Viande & Poisson"],["Pommes de terre","Fruits & Légumes"],["Beurre","Frais"],["Lait","Frais"]], etapes: ["Préchauffe le four à 200°C. Pose le poulet dans un plat, sale, poivre, un peu de beurre dessus.","Enfourne environ 50 min en arrosant à mi-cuisson avec le jus.","Épluche et coupe les pommes de terre, cuis-les 20 min à l'eau salée.","Écrase-les avec du beurre et un peu de lait chaud.","Découpe le poulet et sers avec la purée."] },
    { id: "r3", nom: "Gratin de coquillettes au jambon", emoji: "🧀", temps: "30 min", portions: "4 pers.", ing: [["Coquillettes","Épicerie salée"],["Jambon","Frais"],["Gruyère râpé","Frais"],["Crème fraîche","Frais"],["Lait","Frais"]], etapes: ["Préchauffe le four à 200°C. Cuis les coquillettes un peu moins que le temps indiqué.","Coupe le jambon en dés.","Mélange pâtes, jambon, crème, un peu de lait, sel et poivre.","Verse dans un plat, couvre de gruyère et gratine 15 min."] },
    { id: "r4", nom: "Steak haché & haricots verts", emoji: "🥩", temps: "25 min", portions: "4 pers.", ing: [["Steak haché","Viande & Poisson"],["Haricots verts","Surgelés"],["Pommes de terre","Fruits & Légumes"],["Beurre","Frais"]], etapes: ["Cuis les pommes de terre 20 min à l'eau, écrase-les en purée avec du beurre.","Fais cuire les haricots verts (eau bouillante ou poêle).","Poêle les steaks 2 à 3 min par face selon ta cuisson, sale et poivre.","Sers le tout ensemble."] },
    { id: "r5", nom: "Omelette & salade", emoji: "🍳", temps: "15 min", portions: "4 pers.", ing: [["Œufs","Frais"],["Salade","Fruits & Légumes"],["Pain","Petit-déj"],["Gruyère râpé","Frais"]], etapes: ["Bats les œufs avec sel, poivre et un peu de gruyère.","Verse dans une poêle chaude beurrée, laisse prendre à feu moyen.","Plie l'omelette et sers avec la salade assaisonnée et du pain."] },
    { id: "r6", nom: "Poisson pané & riz", emoji: "🐟", temps: "20 min", portions: "4 pers.", ing: [["Poisson pané","Surgelés"],["Riz","Épicerie salée"],["Citron","Fruits & Légumes"]], etapes: ["Cuis le riz dans deux fois son volume d'eau salée.","Fais cuire le poisson pané à la poêle ou au four (voir paquet).","Sers avec le riz et un quartier de citron."] },
    { id: "r7", nom: "Croque-monsieur & soupe", emoji: "🥪", temps: "20 min", portions: "4 pers.", ing: [["Pain de mie","Petit-déj"],["Jambon","Frais"],["Gruyère râpé","Frais"],["Soupe","Épicerie salée"],["Beurre","Frais"]], etapes: ["Garnis deux tranches de pain de mie de jambon et de gruyère.","Beurre l'extérieur et dore à la poêle des deux côtés.","Réchauffe la soupe et sers ensemble."] },
    { id: "r8", nom: "Quiche lorraine & salade", emoji: "🥧", temps: "45 min", portions: "4 pers.", ing: [["Pâte brisée","Frais"],["Œufs","Frais"],["Lardons","Frais"],["Crème fraîche","Frais"],["Salade","Fruits & Légumes"]], etapes: ["Préchauffe à 200°C. Étale la pâte dans un moule et pique le fond.","Fais revenir les lardons. Bats les œufs avec la crème, sel et poivre.","Répartis les lardons sur la pâte et verse l'appareil.","Cuis 30 min. Sers avec la salade."] },
    { id: "r9", nom: "Riz cantonais", emoji: "🍚", temps: "25 min", portions: "4 pers.", ing: [["Riz","Épicerie salée"],["Petits pois","Surgelés"],["Œufs","Frais"],["Jambon","Frais"],["Oignon","Fruits & Légumes"]], etapes: ["Cuis le riz et laisse-le tiédir. Cuis les petits pois.","Fais une omelette fine et coupe-la en lanières. Coupe le jambon en dés.","Fais sauter le tout à la poêle avec le riz et un peu de sauce soja si tu en as."] },
    { id: "r10", nom: "Hachis parmentier", emoji: "🥔", temps: "45 min", portions: "4 pers.", ing: [["Viande hachée","Viande & Poisson"],["Pommes de terre","Fruits & Légumes"],["Oignon","Fruits & Légumes"],["Beurre","Frais"],["Lait","Frais"],["Gruyère râpé","Frais"]], etapes: ["Cuis les pommes de terre et écrase-les en purée (beurre + lait).","Fais revenir l'oignon puis la viande hachée, sale et poivre.","Dans un plat : viande au fond, purée dessus, gruyère.","Gratine 15 min à 200°C."] },
    { id: "r11", nom: "Pizza maison", emoji: "🍕", temps: "25 min", portions: "4 pers.", ing: [["Pâte à pizza","Frais"],["Sauce tomate","Épicerie salée"],["Fromage râpé","Frais"],["Jambon","Frais"]], etapes: ["Préchauffe à 240°C et étale la pâte.","Étale la sauce tomate, ajoute le jambon et le fromage.","Cuis 12 à 15 min jusqu'à ce que les bords soient dorés."] },
    { id: "r12", nom: "Tomates farcies & riz", emoji: "🍅", temps: "50 min", portions: "4 pers.", ing: [["Tomates","Fruits & Légumes"],["Viande hachée","Viande & Poisson"],["Oignon","Fruits & Légumes"],["Riz","Épicerie salée"]], etapes: ["Préchauffe à 200°C. Creuse les tomates en gardant les chapeaux.","Mélange viande, oignon haché, sel et poivre, puis farcis les tomates.","Pose-les dans un plat et enfourne 35 à 40 min.","Sers avec du riz."] },
    { id: "r13", nom: "Pâtes carbonara", emoji: "🍝", temps: "20 min", portions: "4 pers.", ing: [["Pâtes","Épicerie salée"],["Lardons","Frais"],["Œufs","Frais"],["Crème fraîche","Frais"],["Gruyère râpé","Frais"]], etapes: ["Cuis les pâtes. Fais dorer les lardons à la poêle.","Bats les œufs avec la crème et le gruyère, sel et poivre.","Égoutte les pâtes, mélange hors du feu avec les lardons puis l'appareil aux œufs (la chaleur cuit la sauce)."] },
    { id: "r14", nom: "Lasagnes", emoji: "🍝", temps: "1 h", portions: "4 pers.", ing: [["Plaques de lasagnes","Épicerie salée"],["Viande hachée","Viande & Poisson"],["Sauce tomate","Épicerie salée"],["Béchamel","Frais"],["Fromage râpé","Frais"],["Oignon","Fruits & Légumes"]], etapes: ["Prépare une bolognaise : oignon + viande + sauce tomate, 15 min.","Dans un plat, alterne sauce, plaques et béchamel jusqu'en haut.","Termine par de la béchamel et du fromage.","Cuis 30 à 35 min à 200°C."] },
    { id: "r15", nom: "Gratin de chou-fleur", emoji: "🥦", temps: "40 min", portions: "4 pers.", ing: [["Chou-fleur","Fruits & Légumes"],["Béchamel","Frais"],["Gruyère râpé","Frais"],["Jambon","Frais"]], etapes: ["Cuis le chou-fleur en bouquets 15 min à l'eau salée.","Mets-le dans un plat avec le jambon en dés et nappe de béchamel.","Couvre de gruyère et gratine 20 min à 200°C."] },
    { id: "r16", nom: "Nuggets de poulet maison & frites", emoji: "🍗", temps: "35 min", portions: "4 pers.", ing: [["Filets de poulet","Viande & Poisson"],["Chapelure","Épicerie salée"],["Œufs","Frais"],["Farine","Épicerie salée"],["Frites","Surgelés"]], etapes: ["Coupe le poulet en morceaux. Passe-les dans la farine, l'œuf battu puis la chapelure.","Cuis au four 20 min à 200°C (ou à la poêle) en retournant.","Cuis les frites au four et sers."] },
    { id: "r17", nom: "Boulettes sauce tomate", emoji: "🍖", temps: "35 min", portions: "4 pers.", ing: [["Viande hachée","Viande & Poisson"],["Œufs","Frais"],["Chapelure","Épicerie salée"],["Sauce tomate","Épicerie salée"],["Pâtes","Épicerie salée"]], etapes: ["Mélange viande, 1 œuf, un peu de chapelure, sel et poivre. Forme des boulettes.","Dore-les à la poêle puis ajoute la sauce tomate et laisse mijoter 15 min.","Sers avec des pâtes."] },
    { id: "r18", nom: "Saucisses & purée", emoji: "🌭", temps: "25 min", portions: "4 pers.", ing: [["Saucisses","Viande & Poisson"],["Pommes de terre","Fruits & Légumes"],["Beurre","Frais"],["Lait","Frais"]], etapes: ["Cuis les pommes de terre et écrase-les en purée (beurre + lait).","Fais griller les saucisses à la poêle.","Sers ensemble."] },
    { id: "r19", nom: "Saumon en papillote & riz", emoji: "🐟", temps: "30 min", portions: "4 pers.", ing: [["Pavé de saumon","Viande & Poisson"],["Riz","Épicerie salée"],["Citron","Fruits & Légumes"],["Crème fraîche","Frais"]], etapes: ["Préchauffe à 200°C. Pose chaque pavé sur un papier cuisson avec citron, sel et un peu de crème.","Ferme les papillotes et enfourne 15 à 18 min.","Cuis le riz et sers."] },
    { id: "r20", nom: "Gratin dauphinois", emoji: "🥔", temps: "1 h", portions: "4 pers.", ing: [["Pommes de terre","Fruits & Légumes"],["Crème fraîche","Frais"],["Lait","Frais"],["Ail","Fruits & Légumes"],["Gruyère râpé","Frais"]], etapes: ["Préchauffe à 180°C. Coupe les pommes de terre en fines rondelles.","Dispose-les dans un plat frotté à l'ail, sale et poivre.","Mélange crème et lait, verse dessus, couvre de gruyère.","Cuis 45 min jusqu'à ce que ce soit fondant et doré."] },
    { id: "r21", nom: "Soupe de légumes", emoji: "🥕", temps: "35 min", portions: "4 pers.", ing: [["Carottes","Fruits & Légumes"],["Pommes de terre","Fruits & Légumes"],["Poireaux","Fruits & Légumes"],["Oignon","Fruits & Légumes"]], etapes: ["Épluche et coupe tous les légumes en morceaux.","Couvre d'eau, sale et cuis 25 min.","Mixe et ajoute une noix de beurre ou un peu de crème."] },
    { id: "r22", nom: "Ratatouille & riz", emoji: "🍆", temps: "45 min", portions: "4 pers.", ing: [["Courgettes","Fruits & Légumes"],["Aubergine","Fruits & Légumes"],["Poivrons","Fruits & Légumes"],["Tomates","Fruits & Légumes"],["Oignon","Fruits & Légumes"],["Riz","Épicerie salée"]], etapes: ["Coupe tous les légumes en cubes.","Fais revenir l'oignon, ajoute le reste, sel, poivre et herbes.","Laisse mijoter 30 min à couvert. Sers avec du riz."] },
    { id: "r23", nom: "Tartiflette", emoji: "🧀", temps: "50 min", portions: "4 pers.", ing: [["Pommes de terre","Fruits & Légumes"],["Reblochon","Frais"],["Lardons","Frais"],["Oignon","Fruits & Légumes"],["Crème fraîche","Frais"]], etapes: ["Cuis les pommes de terre 20 min et coupe-les en rondelles.","Fais revenir l'oignon et les lardons.","Dans un plat : pommes de terre, lardons, un peu de crème, reblochon coupé en deux dessus.","Cuis 25 min à 200°C."] },
    { id: "r24", nom: "Cordon bleu & haricots verts", emoji: "🍗", temps: "20 min", portions: "4 pers.", ing: [["Cordons bleus","Frais"],["Haricots verts","Surgelés"],["Pommes de terre","Fruits & Légumes"]], etapes: ["Cuis les cordons bleus à la poêle (voir paquet).","Cuis les haricots verts et/ou des pommes de terre vapeur.","Sers ensemble."] },
    { id: "r25", nom: "Gratin de pâtes au thon", emoji: "🐟", temps: "35 min", portions: "4 pers.", ing: [["Pâtes","Épicerie salée"],["Thon en boîte","Épicerie salée"],["Sauce tomate","Épicerie salée"],["Fromage râpé","Frais"]], etapes: ["Cuis les pâtes. Mélange-les avec le thon égoutté et la sauce tomate.","Verse dans un plat et couvre de fromage.","Gratine 15 min à 200°C."] },
    { id: "r26", nom: "Curry de poulet & riz", emoji: "🍛", temps: "30 min", portions: "4 pers.", ing: [["Filets de poulet","Viande & Poisson"],["Lait de coco","Épicerie salée"],["Curry","Épicerie salée"],["Oignon","Fruits & Légumes"],["Riz","Épicerie salée"]], etapes: ["Coupe le poulet en dés et fais-le dorer avec l'oignon.","Saupoudre de curry, ajoute le lait de coco et laisse mijoter 15 min.","Sers avec du riz."] },
    { id: "r27", nom: "Crêpes (salées ou sucrées)", emoji: "🥞", temps: "30 min", portions: "4 pers.", ing: [["Farine","Épicerie salée"],["Œufs","Frais"],["Lait","Frais"],["Beurre","Frais"]], etapes: ["Mélange farine, œufs, lait et une pincée de sel jusqu'à une pâte lisse.","Laisse reposer si tu peux, puis cuis des crêpes fines à la poêle.","Garnis : jambon-fromage-œuf, ou sucre et confiture."] },
    { id: "r28", nom: "Gâteau au yaourt", emoji: "🍰", temps: "40 min", portions: "6 parts", ing: [["Yaourt","Frais"],["Farine","Épicerie salée"],["Sucre","Épicerie sucrée"],["Œufs","Frais"],["Huile","Épicerie salée"],["Levure","Épicerie sucrée"]], etapes: ["Préchauffe à 180°C. Le pot de yaourt sert de mesure.","Mélange 1 yaourt, 2 pots de sucre, 3 pots de farine, 3 œufs, 1/2 pot d'huile et 1 sachet de levure.","Verse dans un moule et cuis 30 min. Vérifie avec la lame d'un couteau."] },
    { id: "r29", nom: "Velouté de butternut", emoji: "🎃", temps: "35 min", portions: "4 pers.", ing: [["Courge butternut","Fruits & Légumes"],["Pommes de terre","Fruits & Légumes"],["Oignon","Fruits & Légumes"],["Crème fraîche","Frais"]], etapes: ["Épluche et coupe la courge, la pomme de terre et l'oignon.","Couvre d'eau, sale et cuis 25 min.","Mixe avec un peu de crème."] },
    { id: "r30", nom: "Salade composée complète", emoji: "🥗", temps: "15 min", portions: "4 pers.", ing: [["Salade","Fruits & Légumes"],["Tomates","Fruits & Légumes"],["Maïs en boîte","Épicerie salée"],["Thon en boîte","Épicerie salée"],["Œufs","Frais"]], etapes: ["Lave et coupe la salade et les tomates.","Ajoute le maïs, le thon et les œufs durs en quartiers.","Assaisonne (huile, vinaigre, moutarde, sel)."] },
    { id: "r31", nom: "Chili con carne", emoji: "🌶️", temps: "40 min", portions: "4 pers.", ing: [["Viande hachée","Viande & Poisson"],["Haricots rouges","Épicerie salée"],["Sauce tomate","Épicerie salée"],["Oignon","Fruits & Légumes"],["Poivron","Fruits & Légumes"],["Riz","Épicerie salée"]], etapes: ["Fais revenir l'oignon et le poivron en dés.","Ajoute la viande et fais-la dorer.","Ajoute les haricots rouges, la sauce tomate, des épices (cumin, paprika) et du sel. Mijote 20 min.","Sers avec du riz."] },
    { id: "r32", nom: "Couscous poulet-merguez", emoji: "🥘", temps: "50 min", portions: "4 pers.", ing: [["Cuisses de poulet","Viande & Poisson"],["Merguez","Viande & Poisson"],["Semoule","Épicerie salée"],["Courgettes","Fruits & Légumes"],["Carottes","Fruits & Légumes"],["Pois chiches","Épicerie salée"],["Oignon","Fruits & Légumes"]], etapes: ["Fais dorer le poulet et les merguez, puis réserve.","Fais revenir l'oignon, les carottes et les courgettes en morceaux.","Ajoute les pois chiches, des épices à couscous et un peu d'eau, mijote 25 min avec les viandes.","Prépare la semoule (eau bouillante + beurre) et sers ensemble."] },
    { id: "r33", nom: "Blanquette de poulet", emoji: "🍲", temps: "45 min", portions: "4 pers.", ing: [["Blanc de poulet","Viande & Poisson"],["Carottes","Fruits & Légumes"],["Champignons","Fruits & Légumes"],["Oignon","Fruits & Légumes"],["Crème fraîche","Frais"],["Riz","Épicerie salée"]], etapes: ["Coupe la viande en morceaux et fais-la cuire 20 min à l'eau avec carottes et oignon.","Fais revenir les champignons.","Prélève un peu de bouillon, lie-le avec la crème, remets tout et réchauffe sans bouillir.","Sers avec du riz."] },
    { id: "r34", nom: "Burger maison & frites", emoji: "🍔", temps: "30 min", portions: "4 pers.", ing: [["Pains à burger","Petit-déj"],["Steak haché","Viande & Poisson"],["Cheddar","Frais"],["Salade","Fruits & Légumes"],["Tomates","Fruits & Légumes"],["Frites","Surgelés"],["Ketchup","Épicerie salée"]], etapes: ["Cuis les frites au four.","Poêle les steaks et pose une tranche de cheddar dessus pour la faire fondre.","Toaste les pains, garnis de sauce, salade, tomate et steak.","Sers avec les frites."] },
    { id: "r35", nom: "Gratin de courgettes", emoji: "🥒", temps: "40 min", portions: "4 pers.", ing: [["Courgettes","Fruits & Légumes"],["Œufs","Frais"],["Crème fraîche","Frais"],["Gruyère râpé","Frais"],["Riz","Épicerie salée"]], etapes: ["Coupe les courgettes en rondelles et fais-les revenir 10 min.","Bats les œufs avec la crème et le gruyère, sel et poivre.","Mélange aux courgettes et verse dans un plat.","Gratine 20 min à 200°C. Sers avec du riz."] },
    { id: "r36", nom: "Gnocchis à la crème", emoji: "🥟", temps: "20 min", portions: "4 pers.", ing: [["Gnocchis","Épicerie salée"],["Crème fraîche","Frais"],["Lardons","Frais"],["Gruyère râpé","Frais"]], etapes: ["Poêle les gnocchis quelques minutes (ou cuis-les à l'eau).","Ajoute les lardons et fais-les dorer.","Verse la crème, laisse épaissir et parsème de gruyère."] },
    { id: "r37", nom: "Poulet basquaise", emoji: "🍗", temps: "45 min", portions: "4 pers.", ing: [["Cuisses de poulet","Viande & Poisson"],["Poivrons","Fruits & Légumes"],["Tomates","Fruits & Légumes"],["Oignon","Fruits & Légumes"],["Riz","Épicerie salée"]], etapes: ["Fais dorer le poulet puis réserve.","Fais revenir l'oignon et les poivrons en lanières.","Ajoute les tomates, remets le poulet et mijote 30 min.","Sers avec du riz."] },
    { id: "r38", nom: "Wraps au poulet", emoji: "🌯", temps: "25 min", portions: "4 pers.", ing: [["Tortillas","Épicerie salée"],["Filets de poulet","Viande & Poisson"],["Salade","Fruits & Légumes"],["Tomates","Fruits & Légumes"],["Fromage râpé","Frais"]], etapes: ["Coupe le poulet en lanières et fais-le dorer.","Garnis chaque galette de salade, tomate, poulet, fromage et une sauce.","Roule serré et coupe en deux."] },
    { id: "r39", nom: "Nouilles sautées au poulet", emoji: "🍜", temps: "25 min", portions: "4 pers.", ing: [["Nouilles chinoises","Épicerie salée"],["Filets de poulet","Viande & Poisson"],["Carottes","Fruits & Légumes"],["Poivron","Fruits & Légumes"],["Oignon","Fruits & Légumes"]], etapes: ["Cuis les nouilles et égoutte-les.","Fais sauter le poulet en lanières puis les légumes émincés.","Ajoute les nouilles et un peu de sauce soja, fais sauter 3 min."] },
    { id: "r40", nom: "Dahl de lentilles corail", emoji: "🍲", temps: "30 min", portions: "4 pers.", ing: [["Lentilles corail","Épicerie salée"],["Lait de coco","Épicerie salée"],["Oignon","Fruits & Légumes"],["Tomates","Fruits & Légumes"],["Riz","Épicerie salée"]], etapes: ["Fais revenir l'oignon avec des épices (curry, cumin).","Ajoute les lentilles, les tomates, le lait de coco et un peu d'eau.","Mijote 20 min jusqu'à ce que les lentilles soient fondantes.","Sers avec du riz."] },
    { id: "r41", nom: "Soupe à l'oignon gratinée", emoji: "🧅", temps: "40 min", portions: "4 pers.", ing: [["Oignons","Fruits & Légumes"],["Pain","Petit-déj"],["Gruyère râpé","Frais"],["Bouillon","Épicerie salée"],["Beurre","Frais"]], etapes: ["Émince les oignons et fais-les fondre 15 min au beurre jusqu'à ce qu'ils blondissent.","Ajoute le bouillon et mijote 15 min.","Verse en bols, pose du pain et du gruyère dessus.","Gratine au four quelques minutes."] },
    { id: "r42", nom: "Gratin de poisson", emoji: "🐟", temps: "35 min", portions: "4 pers.", ing: [["Filets de poisson blanc","Viande & Poisson"],["Pommes de terre","Fruits & Légumes"],["Béchamel","Frais"],["Gruyère râpé","Frais"]], etapes: ["Cuis les pommes de terre coupées en rondelles.","Dispose le poisson et les pommes de terre dans un plat, nappe de béchamel.","Couvre de gruyère et gratine 20 min à 200°C."] },
    { id: "r43", nom: "Escalope milanaise & spaghetti", emoji: "🍝", temps: "30 min", portions: "4 pers.", ing: [["Escalopes de poulet","Viande & Poisson"],["Chapelure","Épicerie salée"],["Œufs","Frais"],["Spaghetti","Épicerie salée"],["Sauce tomate","Épicerie salée"]], etapes: ["Panne les escalopes : farine, œuf battu, chapelure.","Poêle-les jusqu'à doré des deux côtés.","Cuis les spaghetti et réchauffe la sauce tomate.","Sers l'escalope sur les pâtes."] },
    { id: "r44", nom: "Rôti de porc & pommes de terre", emoji: "🥩", temps: "1 h 15", portions: "4 pers.", ing: [["Rôti de porc","Viande & Poisson"],["Pommes de terre","Fruits & Légumes"],["Oignon","Fruits & Légumes"],["Ail","Fruits & Légumes"]], etapes: ["Préchauffe à 200°C. Pose le rôti dans un plat avec les pommes de terre, l'oignon et l'ail.","Sale, poivre, ajoute un filet d'huile.","Enfourne 1 h en arrosant, retourne à mi-cuisson.","Laisse reposer 5 min avant de découper."] },
    { id: "r45", nom: "Crumble aux pommes", emoji: "🍏", temps: "40 min", portions: "6 parts", ing: [["Pommes","Fruits & Légumes"],["Farine","Épicerie salée"],["Beurre","Frais"],["Sucre","Épicerie sucrée"]], etapes: ["Préchauffe à 180°C. Épluche et coupe les pommes, mets-les dans un plat.","Mélange du bout des doigts farine, beurre et sucre jusqu'à une pâte sableuse.","Émiette sur les pommes.","Cuis 30 min jusqu'à ce que ce soit doré."] },
    { id: "r46", nom: "Pain perdu", emoji: "🍞", temps: "20 min", portions: "4 pers.", ing: [["Pain rassis","Petit-déj"],["Œufs","Frais"],["Lait","Frais"],["Sucre","Épicerie sucrée"],["Beurre","Frais"]], etapes: ["Bats les œufs avec le lait et un peu de sucre.","Trempe les tranches de pain dedans.","Fais-les dorer à la poêle au beurre des deux côtés.","Saupoudre de sucre et sers tiède."] },
    { id: "r47", nom: "Riz au lait", emoji: "🍚", temps: "30 min", portions: "4 pers.", ing: [["Riz rond","Épicerie salée"],["Lait","Frais"],["Sucre","Épicerie sucrée"],["Vanille","Épicerie sucrée"]], etapes: ["Verse le riz dans le lait avec le sucre et la vanille.","Cuis à feu doux 25 min en remuant souvent.","Laisse tiédir : il épaissit en refroidissant."] },
    { id: "r48", nom: "Cookies maison", emoji: "🍪", temps: "25 min", portions: "12 cookies", ing: [["Farine","Épicerie salée"],["Beurre","Frais"],["Sucre","Épicerie sucrée"],["Œufs","Frais"],["Pépites de chocolat","Épicerie sucrée"]], etapes: ["Préchauffe à 180°C. Mélange le beurre mou et le sucre, ajoute l'œuf.","Incorpore la farine puis les pépites.","Dépose des petits tas sur une plaque.","Cuis 10 à 12 min : ils doivent rester moelleux au centre."] }
  ];
}
function seed() {
  return {
    version: 14,
    reglages: { grand: 'Le grand', petit: 'Le petit', welcomeDismissed: false, theme: 'clair', accent: 'teal', midiSemaine: false, notifs: false, lastNotif: '', consignesSitter: '', ville: '', lastExport: '', onboardingDone: false, contextFamily: 'alternee' },
    courses: [],
    recurrents: [
      { nom: 'Pommes', rayon: 'Fruits & Légumes' }, { nom: 'Bananes', rayon: 'Fruits & Légumes' }, { nom: 'Clémentines', rayon: 'Fruits & Légumes' },
      { nom: 'Tomates', rayon: 'Fruits & Légumes' }, { nom: 'Salade', rayon: 'Fruits & Légumes' }, { nom: 'Carottes', rayon: 'Fruits & Légumes' },
      { nom: 'Pommes de terre', rayon: 'Fruits & Légumes' }, { nom: 'Oignons', rayon: 'Fruits & Légumes' }, { nom: 'Ail', rayon: 'Fruits & Légumes' },
      { nom: 'Courgettes', rayon: 'Fruits & Légumes' }, { nom: 'Concombre', rayon: 'Fruits & Légumes' }, { nom: 'Citrons', rayon: 'Fruits & Légumes' },
      { nom: 'Lait', rayon: 'Frais' }, { nom: 'Beurre', rayon: 'Frais' }, { nom: 'Œufs', rayon: 'Frais' }, { nom: 'Yaourts', rayon: 'Frais' },
      { nom: 'Crème fraîche', rayon: 'Frais' }, { nom: 'Gruyère râpé', rayon: 'Frais' }, { nom: 'Jambon', rayon: 'Frais' }, { nom: 'Fromage', rayon: 'Frais' },
      { nom: 'Petits-suisses', rayon: 'Frais' }, { nom: 'Lardons', rayon: 'Frais' }, { nom: 'Pâte feuilletée', rayon: 'Frais' },
      { nom: 'Steak haché', rayon: 'Viande & Poisson' }, { nom: 'Filets de poulet', rayon: 'Viande & Poisson' }, { nom: 'Saucisses', rayon: 'Viande & Poisson' }, { nom: 'Poisson', rayon: 'Viande & Poisson' },
      { nom: 'Légumes surgelés', rayon: 'Surgelés' }, { nom: 'Poisson pané', rayon: 'Surgelés' }, { nom: 'Frites', rayon: 'Surgelés' }, { nom: 'Glaces', rayon: 'Surgelés' },
      { nom: 'Pâtes', rayon: 'Épicerie salée' }, { nom: 'Riz', rayon: 'Épicerie salée' }, { nom: 'Sauce tomate', rayon: 'Épicerie salée' }, { nom: 'Thon en boîte', rayon: 'Épicerie salée' },
      { nom: 'Maïs', rayon: 'Épicerie salée' }, { nom: 'Huile', rayon: 'Épicerie salée' }, { nom: 'Sel', rayon: 'Épicerie salée' }, { nom: 'Farine', rayon: 'Épicerie salée' },
      { nom: 'Soupe', rayon: 'Épicerie salée' }, { nom: 'Ketchup', rayon: 'Épicerie salée' }, { nom: 'Moutarde', rayon: 'Épicerie salée' },
      { nom: 'Sucre', rayon: 'Épicerie sucrée' }, { nom: 'Compotes', rayon: 'Épicerie sucrée' }, { nom: 'Confiture', rayon: 'Épicerie sucrée' },
      { nom: 'Biscuits', rayon: 'Épicerie sucrée' }, { nom: 'Chocolat', rayon: 'Épicerie sucrée' }, { nom: 'Pâte à tartiner', rayon: 'Épicerie sucrée' },
      { nom: 'Pain', rayon: 'Petit-déj' }, { nom: 'Pain de mie', rayon: 'Petit-déj' }, { nom: 'Céréales', rayon: 'Petit-déj' },
      { nom: 'Café', rayon: 'Petit-déj' }, { nom: 'Chocolat en poudre', rayon: 'Petit-déj' }, { nom: 'Biscottes', rayon: 'Petit-déj' },
      { nom: 'Eau', rayon: 'Boissons' }, { nom: "Jus d'orange", rayon: 'Boissons' }, { nom: 'Sirop', rayon: 'Boissons' },
      { nom: 'Papier toilette', rayon: 'Hygiène & Maison' }, { nom: 'Essuie-tout', rayon: 'Hygiène & Maison' }, { nom: 'Liquide vaisselle', rayon: 'Hygiène & Maison' },
      { nom: 'Lessive', rayon: 'Hygiène & Maison' }, { nom: 'Gel douche', rayon: 'Hygiène & Maison' }, { nom: 'Shampoing', rayon: 'Hygiène & Maison' },
      { nom: 'Dentifrice', rayon: 'Hygiène & Maison' }, { nom: 'Éponges', rayon: 'Hygiène & Maison' }, { nom: 'Sacs poubelle', rayon: 'Hygiène & Maison' }, { nom: 'Mouchoirs', rayon: 'Hygiène & Maison' },
      { nom: 'Goûters', rayon: 'Bébé & Enfant' }, { nom: 'Compotes à boire', rayon: 'Bébé & Enfant' }
    ],
    recettes: seedRecettes(),
    menu: {},
    presence: {},
    transition: [
      ['Doudou','petit'],['Cartable','grand'],['Tenue + chaussures de sport','grand'],['Affaires de toilette','deux'],
      ['Pyjama','deux'],['Manteau / veste','deux'],['Médicaments / ordonnance','deux'],['Chargeur / tablette','grand'],
      ['Gourde','deux'],['Devoirs / cahier de liaison','grand']
    ].map(([nom, qui]) => ({ id: uid(), nom, qui, fait: false })),
    enfants: [{ id: 'e1', prenom: 'Mon enfant' }],
    routines: { e1: seedRoutinesFor() },
    rappels: [],
    contacts: [],
    budget: [],
    notes: [],
    activites: [],
    sante: { e1: seedSanteFor() },
    anniversaires: [],
    favoris: [],
    listesExtra: [],
    favJeux: [],
    favSorties: [],
    depenses: [],
    liaison: [],
    vacances: [],
    devoirs: [],
    recompenses: { e1: seedRecompensesFor() },
    pharmacie: seedPharmacie(),
    menage: seedMenage(),
    finances: { revenu: 0, charges: [], depenses: [] },
    journal: [],
    cadeaux: [],
    coffre: []
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
  if (data.reglages.theme === undefined) data.reglages.theme = 'clair';
  if (data.reglages.accent === undefined) data.reglages.accent = 'teal';
  if (data.reglages.midiSemaine === undefined) data.reglages.midiSemaine = false;
  if (data.reglages.notifs === undefined) data.reglages.notifs = false;
  if (data.reglages.lastNotif === undefined) data.reglages.lastNotif = '';
  data.courses = data.courses || [];
  data.recurrents = data.recurrents || s.recurrents;
  data.recettes = seedRecettes().concat((data.recettes || []).filter((r) => !/^r\d+$/.test(r.id)));
  data.menu = data.menu || {};
  data.presence = data.presence || {};
  data.transition = data.transition || s.transition;
  data.rappels = data.rappels || [];
  data.contacts = data.contacts || [];
  data.budget = data.budget || [];
  data.notes = data.notes || [];
  data.activites = data.activites || [];
  data.anniversaires = data.anniversaires || [];
  data.favoris = data.favoris || [];
  data.favJeux = data.favJeux || [];
  data.favSorties = data.favSorties || [];
  data.depenses = data.depenses || [];
  data.liaison = data.liaison || [];
  data.vacances = data.vacances || [];
  data.devoirs = data.devoirs || [];
  data.recompenses = data.recompenses || {};
  if (data.reglages.consignesSitter === undefined) data.reglages.consignesSitter = '';
  if (data.reglages.ville === undefined) data.reglages.ville = '';
  if (data.reglages.lastExport === undefined) data.reglages.lastExport = '';
  if (data.reglages.onboardingDone === undefined) data.reglages.onboardingDone = false;
  if (data.reglages.contextFamily === undefined) data.reglages.contextFamily = 'alternee';
  data.pharmacie = data.pharmacie || seedPharmacie();
  data.menage = data.menage || seedMenage();
  if (!data.finances) data.finances = { revenu: 0, charges: [], depenses: [] }; else { data.finances.charges = data.finances.charges || []; data.finances.depenses = data.finances.depenses || []; if (data.finances.revenu === undefined) data.finances.revenu = 0; }
  data.journal = data.journal || [];
  data.cadeaux = data.cadeaux || [];
  data.coffre = data.coffre || [];
  data.listesExtra = data.listesExtra || [];
  // --- enfants : liste configurable (migration depuis l'ancien petit/grand) ---
  data.routines = data.routines || {};
  data.sante = data.sante || {};
  if (!Array.isArray(data.enfants)) {
    const r = data.reglages || {};
    data.enfants = [{ id: 'e1', prenom: r.petit || 'Le petit' }, { id: 'e2', prenom: r.grand || 'Le grand' }];
    const oldR = data.routines;
    const petitR = (oldR.matin || oldR.soir) ? { matin: oldR.matin || [], soir: oldR.soir || [] } : (oldR.petit || seedRoutinesFor());
    data.routines = { e1: petitR, e2: oldR.grand || seedRoutinesFor() };
    data.sante = { e1: data.sante.petit || seedSanteFor(), e2: data.sante.grand || seedSanteFor() };
    data.recompenses = { e1: data.recompenses.petit || seedRecompensesFor(), e2: data.recompenses.grand || seedRecompensesFor() };
    const mq = (q) => q === 'petit' ? 'e1' : q === 'grand' ? 'e2' : q === 'deux' ? 'tous' : q;
    (data.transition || []).forEach((t) => { t.qui = mq(t.qui); });
    (data.activites || []).forEach((a) => { a.qui = mq(a.qui); });
  }
  if (!data.enfants.length) seedEnfant('Mon enfant');
  data.enfants.forEach((e) => {
    data.routines[e.id] = data.routines[e.id] || seedRoutinesFor();
    data.routines[e.id].matin = data.routines[e.id].matin || []; data.routines[e.id].soir = data.routines[e.id].soir || [];
    const sa = data.sante[e.id] = data.sante[e.id] || seedSanteFor();
    sa.notes = sa.notes || []; sa.medicaments = sa.medicaments || []; sa.mesures = sa.mesures || [];
    ['allergies', 'traitements', 'medecin', 'groupe', 'vetements', 'pointure'].forEach((k) => { if (sa[k] === undefined) sa[k] = ''; });
    data.recompenses[e.id] = data.recompenses[e.id] || seedRecompensesFor();
  });
  data.version = 14;
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
let familleChild = '';
let showRecForm = false;
let editRec = false;
let rangeMode = false;
let rangeStart = null;
let activeListe = 'main';
let jxAge = 'tous';
let jxLieu = 'tous';
let jxFav = false;
let jxSearch = '';
const TITLES = { accueil: "Aujourd'hui", courses: 'Liste de courses', repas: 'Repas de la semaine', garde: 'Garde & transitions', famille: 'Routines & rappels', jeux: 'Bibliothèque de jeux', secours: 'Premiers secours' };

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
  ({ accueil: renderAccueil, courses: renderCourses, repas: renderRepas, garde: renderGarde, famille: renderFamille, jeux: renderJeux, secours: renderSecours }[activeTab])(el);
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
  const prog = (child) => { const l = (data.routines[child] || {})[mom] || []; return { d: l.filter((x) => x.fait).length, t: l.length }; };
  const prochains = data.rappels.filter((r) => !r.fait).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 3);

  el.innerHTML = `
    ${!data.reglages.welcomeDismissed ? `
      <div class="welcome">
        <h2>👋 Bienvenue dans Ma Tribu</h2>
        <div class="muted">Ton quotidien, en 4 réflexes :</div>
        <ol>
          <li><b>⚙️ en haut à droite</b> → ajoute tes enfants (« Mes enfants »)</li>
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
      ${data.enfants.map((e) => { const p = prog(e.id); return `
        <div class="prog-row" data-mode="${e.id}">
          <span class="nm">${esc(e.prenom)}</span>
          <span class="prog-bar"><i style="width:${p.t ? Math.round(p.d / p.t * 100) : 0}%"></i></span>
          <span class="ct">${p.d}/${p.t}</span><span class="go">▶</span>
        </div>`; }).join('')}
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
  const av = accueilTodayHtml(); if (av) el.insertAdjacentHTML('beforeend', av);
  el.insertAdjacentHTML('beforeend', `<div class="section-title">Outils</div><div class="quick"><button id="ac-guide"><span class="e">📖</span>Guide du parent</button><button id="ac-dep"><span class="e">💶</span>Dépenses partagées</button><button id="ac-sitter"><span class="e">🧑‍🍼</span>Mode baby-sitter</button><button id="ac-idee"><span class="e">💡</span>Idée anti-écran</button><button id="ac-budget"><span class="e">💰</span>Budget du mois</button><button id="ac-journal"><span class="e">📔</span>Livre de bord</button><button id="ac-frigo"><span class="e">📺</span>Écran du jour</button></div><div class="card" style="margin-top:14px"><b>💛 Conseil du jour</b><br><span class="muted">${esc(conseilDuJour())}</span></div><div class="card"><b>🎯 Le défi de la semaine</b><br><span class="muted">${esc(defiSemaine())}</span></div>`);
  el.querySelector('#ac-guide').addEventListener('click', openGuide);
  el.querySelector('#ac-dep').addEventListener('click', openDepenses);
  el.querySelector('#ac-sitter').addEventListener('click', openSitter);
  el.querySelector('#ac-idee').addEventListener('click', () => openGameDetail(JEUX[Math.floor(Math.random() * JEUX.length)].id));
  el.querySelector('#ac-budget').addEventListener('click', openBudget);
  el.querySelector('#ac-journal').addEventListener('click', openJournal);
  el.querySelector('#ac-frigo').addEventListener('click', openFrigo);
  injectWeather(el);
  const lastEx = data.reglages.lastExport;
  const hasData = data.courses.length || data.journal.length || data.rappels.length || Object.keys(data.presence).length || Object.keys(data.menu).length;
  const dEx = lastEx ? Math.round((parseISO(todayISO()) - parseISO(lastEx)) / 86400000) : 999;
  if (hasData && dEx > 14) {
    el.insertAdjacentHTML('afterbegin', `<div class="card" style="border:1px solid #f4d68a;background:#fff7e8;color:#7a5a00"><b>💾 Pense à sauvegarder</b><br><span style="font-size:13px">Tes données vivent sur ce téléphone uniquement. ${lastEx ? 'Dernière sauvegarde il y a ' + dEx + ' jours.' : "Tu n'as pas encore fait de sauvegarde."}</span><button class="btn btn-mini btn-block" id="backup-now" style="margin-top:8px">💾 Sauvegarder maintenant</button></div>`);
    el.querySelector('#backup-now').addEventListener('click', () => { exportData(); renderAccueil(el); });
  }
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
  if (activeListe !== 'main') { renderListeExtra(el); return; }
  const restants = data.courses.filter((c) => !c.fait).length;
  const groups = {};
  data.courses.forEach((c) => { (groups[c.rayon] = groups[c.rayon] || []).push(c); });
  let listHtml = '';
  RAYONS.forEach((rayon) => {
    const items = (groups[rayon] || []).sort((a, b) => (a.fait - b.fait));
    if (!items.length) return;
    listHtml += `<div class="rayon-group"><div class="rayon-title">${esc(rayon)}</div><div class="list">` +
      items.map((c) => `<div class="item ${c.fait ? 'done' : ''}" data-id="${c.id}"><span class="check">${c.fait ? '✓' : ''}</span><span class="label">${esc(c.nom)}${c.qte ? ` <span class="muted">(${esc(c.qte)})</span>` : ''}</span><button class="x" data-act="del">✕</button></div>`).join('') + `</div></div>`;
  });
  if (!data.courses.length) listHtml = `<div class="empty"><span class="e">🛒</span>Ta liste est vide. Ajoute un article ou tape un produit récurrent ci-dessous.</div>`;

  const mk = todayISO().slice(0, 7);
  const moisTotal = data.budget.filter((b) => (b.date || '').slice(0, 7) === mk).reduce((s, b) => s + (+b.montant || 0), 0);

  el.innerHTML = `
    <div class="card">
      <div class="field-row">
        <input class="input" id="c-nom" placeholder="Article…" autocomplete="off" enterkeyhint="done" />
        <input class="input" id="c-qte" placeholder="Qté" style="flex:0 0 20%" />
        <select class="select" id="c-rayon" style="flex:0 0 34%">${RAYONS.map((r) => `<option>${r}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary btn-block" id="c-add">Ajouter à la liste</button>
    </div>

    <div class="section-title">Produits récurrents — ${editRec ? 'touche pour retirer' : 'touche pour ajouter'}</div>
    <div class="card">
      <div class="rec-groups">${RAYONS.map((ry) => { const items = data.recurrents.map((r, i) => ({ r, i })).filter((o) => o.r.rayon === ry); if (!items.length) return ''; return `<div class="rec-group"><div class="rayon-title">${esc(ry)}</div><div class="chips">${items.map((o) => `<button class="chip ${editRec ? 'del' : 'add'}" data-rec="${o.i}">${esc(o.r.nom)}${editRec ? ' ✕' : ''}</button>`).join('')}</div></div>`; }).join('')}</div>
      <button class="btn btn-mini btn-ghost" id="rec-edit" style="margin-top:8px">${editRec ? '✓ Terminé' : '✏️ Gérer mes récurrents'}</button>
      ${editRec ? `<div class="field-row" style="margin-top:8px"><input class="input" id="rec-nom" placeholder="Nouveau récurrent…" enterkeyhint="done" /><select class="select" id="rec-rayon">${RAYONS.map((r) => `<option>${r}</option>`).join('')}</select></div><button class="btn btn-mini btn-block" id="rec-add">Ajouter ce récurrent</button>` : ''}
    </div>

    <div class="section-title">Ma liste ${restants ? '· ' + restants + ' à acheter' : ''}</div>
    <div class="card">
      ${listHtml}
      ${data.courses.length ? `<div class="btn-row" style="margin-top:12px"><button class="btn btn-mini" id="c-share">📤 Partager la liste</button>${data.courses.some((c) => c.fait) ? `<button class="btn btn-mini" id="c-uncheck">Tout décocher</button><button class="btn btn-mini" id="c-clear">Retirer les cochés</button>` : ''}</div>` : ''}
    </div>

    <div class="section-title">💶 Budget courses</div>
    <div class="card">
      <div class="budg-total">${eur(moisTotal)} €</div>
      <div class="muted">dépensé en ${MOIS[new Date().getMonth()]}</div>
      <div class="field-row" style="margin-top:10px"><input class="input" id="bg-montant" type="number" inputmode="decimal" step="0.01" placeholder="Montant €" /><input class="input" id="bg-note" placeholder="Note (ex. Lidl)" /></div>
      <button class="btn btn-block" id="bg-add">Ajouter une dépense</button>
      <div class="list" style="margin-top:8px">${[...data.budget].reverse().slice(0, 6).map((b) => `<div class="item budget" data-bid="${b.id}"><span class="label">${esc(b.note || 'Course')} <span class="muted">· ${esc(frShort(b.date))}</span></span><span class="tag">${eur(b.montant)} €</span><button class="x" data-delb>✕</button></div>`).join('')}</div>
    </div>`;

  const addItem = () => { const nom = document.getElementById('c-nom').value.trim(); if (!nom) return; data.courses.push({ id: uid(), nom, qte: document.getElementById('c-qte').value.trim(), rayon: document.getElementById('c-rayon').value, fait: false }); save(); renderCourses(el); };
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
  const sh = document.getElementById('c-share'); if (sh) sh.addEventListener('click', shareList);

  const addBg = () => { const montant = parseFloat(document.getElementById('bg-montant').value); if (isNaN(montant)) { toast('Indique un montant'); return; } data.budget.push({ id: uid(), date: todayISO(), montant, note: document.getElementById('bg-note').value.trim() }); save(); renderCourses(el); };
  document.getElementById('bg-add').addEventListener('click', addBg);
  el.querySelectorAll('[data-bid]').forEach((row) => row.querySelector('[data-delb]').addEventListener('click', () => { data.budget = data.budget.filter((x) => x.id !== row.dataset.bid); save(); renderCourses(el); }));
  el.insertAdjacentHTML('afterbegin', listSelectorHtml());
  wireListSelector(el);
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
    const midi = i >= 5 || data.reglages.midiSemaine;
    if (midi) rows += mealRowHtml(key, 'midi', abbr, d.getDate(), isToday, true);
    rows += mealRowHtml(key, 'soir', abbr, d.getDate(), isToday, midi);
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
    <button class="btn btn-primary btn-block" id="r-book" style="margin-bottom:14px">📖 Livre de recettes (${data.recettes.length} plats)</button>
    <div class="section-title">Piocher une recette (remplit le prochain jour libre)</div>
    <div class="card">
      <div class="chips">${data.recettes.map((r) => `<button class="chip" data-recette="${r.id}">${r.emoji} ${esc(r.nom)}</button>`).join('')}</div>
      <button class="btn btn-ghost" id="rc-toggle" style="margin-top:8px">➕ Ajouter ma recette</button>
      <div id="rc-form" ${showRecForm ? '' : 'hidden'} style="margin-top:8px">
        <input class="input" id="rc-nom" placeholder="Nom du plat (ex. Gratin de courgettes)" style="margin-bottom:8px" />
        <textarea class="input" id="rc-ing" rows="4" placeholder="Ingrédients — un par ligne (rayon après une virgule) :&#10;Courgettes, Fruits & Légumes&#10;Crème fraîche, Frais"></textarea>
        <textarea class="input" id="rc-etapes" rows="4" style="margin-top:8px" placeholder="Étapes de préparation — une par ligne (facultatif) :&#10;Coupe les courgettes en rondelles&#10;Fais revenir 10 min à la poêle"></textarea>
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
  document.getElementById('r-book').addEventListener('click', openRecipeBook);
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
    const etapes = document.getElementById('rc-etapes').value.split('\n').map((l) => l.trim()).filter(Boolean);
    data.recettes.push({ id: uid(), nom, emoji: '🍴', temps: '', portions: '', ing, etapes }); showRecForm = false; save(); renderRepas(el); toast('Recette ajoutée ✓');
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
  const wireRows = () => ov.querySelectorAll('.recipe').forEach((row) => { row.addEventListener('click', () => assign(data.recettes.find((x) => x.id === row.dataset.rid))); const info = row.querySelector('[data-info]'); if (info) info.addEventListener('click', (e) => { e.stopPropagation(); openRecipeDetail(row.dataset.rid, 'picker'); }); });
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
  return list.map((r) => `<div class="item recipe" data-rid="${r.id}"><span class="label">${r.emoji} ${esc(r.nom)}</span><button class="rinfo" data-info="${r.id}" title="Voir la recette">ⓘ</button><span class="go">＋</span></div>`).join('');
}
function recipeBookRowsHtml(filter, cat) {
  const f = (filter || '').toLowerCase().trim();
  let list = data.recettes.filter((r) => !f || r.nom.toLowerCase().includes(f));
  if (cat === 'fav') list = list.filter((r) => data.favoris.includes(r.id));
  else if (cat === 'rapide') list = list.filter((r) => tempsMin(r.temps) <= 25);
  else if (cat === 'dessert') list = list.filter((r) => DESSERT_IDS.has(r.id));
  if (!list.length) return `<div class="empty">Aucune recette.</div>`;
  return list.map((r) => { const fav = data.favoris.includes(r.id); return `<div class="item recipe" data-rid="${r.id}"><span class="label">${r.emoji} ${esc(r.nom)}</span>${r.temps ? `<span class="muted" style="margin-right:2px">${esc(r.temps)}</span>` : ''}<button class="rfav" data-fav="${r.id}">${fav ? '❤️' : '🤍'}</button><span class="go">›</span></div>`; }).join('');
}
function openRecipeBook() {
  closeOverlay();
  let filter = ''; let cat = 'tout';
  const cats = [['tout', 'Tout'], ['fav', '❤️ Favoris'], ['rapide', '⚡ Rapide'], ['dessert', '🍰 Desserts']];
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `
    <div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📖 Livre de recettes</h2></div>
    <div class="overlay-body">
      <input class="input" id="rb-search" placeholder="Rechercher une recette…" autocomplete="off" />
      <div class="chips" id="rb-cats" style="margin-top:10px">${cats.map((c) => `<button class="chip ${c[0] === 'tout' ? 'on' : ''}" data-cat="${c[0]}">${c[1]}</button>`).join('')}</div>
      <div class="list" id="rb-list" style="margin-top:8px">${recipeBookRowsHtml('', 'tout')}</div>
    </div>`;
  document.body.appendChild(ov);
  const wire = () => ov.querySelectorAll('.recipe').forEach((row) => { row.addEventListener('click', () => openRecipeDetail(row.dataset.rid, 'book')); const fb = row.querySelector('[data-fav]'); if (fb) fb.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(row.dataset.rid); refresh(); }); });
  const refresh = () => { ov.querySelector('#rb-list').innerHTML = recipeBookRowsHtml(filter, cat); wire(); };
  wire();
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#rb-search').addEventListener('input', (e) => { filter = e.target.value; refresh(); });
  ov.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; ov.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === b)); refresh(); }));
}
function openRecipeDetail(rid, ctx) {
  const r = data.recettes.find((x) => x.id === rid); if (!r) return;
  closeOverlay();
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `
    <div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>${r.emoji} ${esc(r.nom)}</h2></div>
    <div class="overlay-body">
      ${(r.temps || r.portions) ? `<div class="recipe-meta">${r.temps ? `<span>⏱️ ${esc(r.temps)}</span>` : ''}${r.portions ? `<span>👥 ${esc(r.portions)}</span>` : ''}</div>` : ''}
      <div class="section-title">Ingrédients</div>
      <div class="card"><div class="list">${r.ing.map(([n, ry]) => `<div class="item"><span class="label">${esc(n)}</span><span class="tag">${esc(ry)}</span></div>`).join('')}</div></div>
      ${(r.etapes && r.etapes.length) ? `<div class="section-title">Préparation</div><div class="card"><ol class="steps">${r.etapes.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : `<p class="muted" style="padding:4px">Pas d'étapes pour cette recette.</p>`}
      <div class="btn-row" style="margin-top:6px"><button class="btn btn-accent" style="flex:1" id="rd-cart">🛒 Aux courses</button><button class="btn btn-primary" style="flex:1" id="rd-menu">🍽️ Au menu ce soir</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', () => { closeOverlay(); if (ctx === 'book') openRecipeBook(); else render(); });
  ov.querySelector('#rd-cart').addEventListener('click', () => { const n = pushIngredients(rid); save(); toast(n ? n + ' ingrédient(s) ajoutés aux courses' : 'Déjà dans la liste'); });
  ov.querySelector('#rd-menu').addEventListener('click', () => { const ti = todayISO(); data.menu[ti] = Object.assign({}, data.menu[ti], { meal: r.nom, rid: r.id }); save(); closeOverlay(); setTab('repas'); toast('🍽️ Ce soir : ' + r.nom); });
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
      <div class="list">${data.transition.map((it) => `<div class="item ${it.fait ? 'done' : ''}" data-id="${it.id}"><span class="check">${it.fait ? '✓' : ''}</span><span class="label">${esc(it.nom)}</span><span class="tag">${esc(quiLabel(it.qui))}</span><button class="x" data-act="del">✕</button></div>`).join('')}</div>
      <div class="field-row" style="margin-top:12px"><input class="input" id="tr-nom" placeholder="Ajouter une affaire…" autocomplete="off" enterkeyhint="done" /><select class="select" id="tr-qui">${quiOptions()}</select></div>
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
  const ctx = contextLabel();
  el.insertAdjacentHTML('beforeend', activitesCardHtml() + vacancesCardHtml() + `<button class="btn btn-block" id="g-agenda" style="margin-top:4px">📅 Agenda du mois</button><button class="btn btn-block" id="g-liaison" style="margin-top:8px">📓 Cahier de liaison (${ctx.coParent})</button>`);
  wireActivites(el);
  wireVacances(el);
  el.querySelector('#g-agenda').addEventListener('click', openAgenda);
  el.querySelector('#g-liaison').addEventListener('click', openLiaison);
}

/* ============================================================
   FAMILLE — routines par enfant + mode enfant + rappels + pense-bête
   ============================================================ */
function renderFamille(el) {
  if (!data.enfants.some((e) => e.id === familleChild)) familleChild = data.enfants[0] ? data.enfants[0].id : '';
  const child = familleChild;
  const childNm = childName(child);
  const rappels = [...data.rappels].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const ti = todayISO();

  el.innerHTML = `
    <div class="seg">
      ${data.enfants.map((e) => `<button data-fc="${e.id}" class="${child === e.id ? 'on' : ''}">🧒 ${esc(e.prenom)}</button>`).join('')}
    </div>
    <button class="btn btn-accent btn-block" id="f-mode" style="margin-bottom:14px">▶️ Mode enfant — ${esc(childNm)} (grand écran à pictos)</button>
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
  el.insertAdjacentHTML('beforeend', santeButtonHtml(child) + recompensesCardHtml(child) + devoirsCardHtml() + anniversairesCardHtml() + `<button class="btn btn-block" id="f-cadeaux" style="margin-top:4px">🎁 Idées cadeaux</button><button class="btn btn-block" id="f-minuteur" style="margin-top:8px">⏲️ Minuteur</button>`);
  el.querySelector('#f-sante').addEventListener('click', () => openSante(child));
  el.querySelector('#f-cadeaux').addEventListener('click', openCadeaux);
  el.querySelector('#f-minuteur').addEventListener('click', openMinuteur);
  wireRecompenses(el, child);
  wireDevoirs(el);
  wireAnniversaires(el);
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
  const name = childName(child);
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
      <div class="set-section"><h3>👧🧒 Mes enfants</h3>
        <div class="card">
          ${data.enfants.map((e) => `<div class="field-row" data-enf="${e.id}"><input class="input enf-nom" value="${esc(e.prenom)}" placeholder="Prénom" />${data.enfants.length > 1 ? `<button class="btn btn-mini" data-enfdel style="flex:0 0 auto;color:var(--danger)">✕</button>` : ''}</div>`).join('')}
          <button class="btn btn-mini btn-block" id="enf-save">Enregistrer les prénoms</button>
          <div class="divider"></div>
          <div class="field-row"><input class="input" id="enf-new" placeholder="Ajouter un enfant…" autocomplete="off" /><button class="btn btn-primary" id="enf-add">＋</button></div>
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
      <div class="set-section"><h3>🌦️ Ma ville (météo)</h3><div class="card"><div class="field-row"><input class="input" id="set-ville" value="${esc(data.reglages.ville || '')}" placeholder="Ex. Lyon" /><button class="btn btn-primary" id="set-ville-save">OK</button></div></div></div>
      <div class="set-section"><h3>🔐 Infos importantes</h3><div class="card"><button class="btn btn-block" id="set-coffre">Ouvrir le coffre à infos (sécu, assurances, codes…)</button></div></div>
      <div class="set-section"><h3>🧑‍🍼 Consignes baby-sitter</h3>
        <div class="card"><textarea class="input" id="set-consignes" rows="3" placeholder="Ce que la nounou doit savoir (horaires, repas, écrans, urgences…)">${esc(data.reglages.consignesSitter || '')}</textarea><button class="btn btn-block" id="set-consignes-save" style="margin-top:8px">Enregistrer</button></div>
      </div>
      <div class="set-section"><h3>💾 Sauvegarde</h3>
        <div class="card">
          <p class="sub">Tes données sont sur cet appareil uniquement. Exporte-les de temps en temps (et pour les transférer sur ton téléphone).</p>
          <div class="btn-row"><button class="btn" id="bk-export">⬇️ Exporter mes données</button><label class="btn" style="cursor:pointer">⬆️ Importer<input type="file" id="bk-import" accept="application/json,.json" hidden /></label></div>
          <div class="divider"></div>
          <button class="btn btn-block" id="bk-reset" style="color:var(--danger)">Tout réinitialiser</button>
        </div>
      </div>
      <div class="set-section"><h3>🎨 Apparence & options</h3>
        <div class="card">
          <div class="opt-row"><span>🌙 Mode sombre</span><button class="toggle ${data.reglages.theme === 'sombre' ? 'on' : ''}" id="op-theme"><i></i></button></div>
          <div class="divider"></div>
          <div class="opt-row"><span>🎨 Couleur de l'appli</span><div class="swatches">${Object.keys(ACCENTS).map((k) => `<button class="swatch ${data.reglages.accent === k ? 'on' : ''}" data-acc="${k}" style="background:${ACCENTS[k].primary}" title="${ACCENTS[k].nom}"></button>`).join('')}</div></div>
          <div class="divider"></div>
          <div class="opt-row"><span>🍽️ Repas du midi en semaine</span><button class="toggle ${data.reglages.midiSemaine ? 'on' : ''}" id="op-midi"><i></i></button></div>
          <div class="divider"></div>
          <div class="opt-row"><span>🔔 Notifications<br><span class="muted" style="font-weight:400;font-size:12px">Résumé du jour à l'ouverture de l'appli</span></span><button class="toggle ${data.reglages.notifs ? 'on' : ''}" id="op-notif"><i></i></button></div>
        </div>
      </div>
      <p class="muted" style="text-align:center">Ma Tribu · v6 · 100 % sur ton appareil</p>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#enf-save').addEventListener('click', () => { ov.querySelectorAll('[data-enf]').forEach((row) => { const e = data.enfants.find((x) => x.id === row.dataset.enf); const v = row.querySelector('.enf-nom').value.trim(); if (e && v) e.prenom = v; }); save(); toast('Enregistré ✓'); openReglages(); });
  ov.querySelector('#enf-add').addEventListener('click', () => { const v = ov.querySelector('#enf-new').value.trim(); if (!v) return; seedEnfant(v); save(); openReglages(); });
  ov.querySelectorAll('[data-enf] [data-enfdel]').forEach((b) => b.addEventListener('click', () => { const id = b.closest('[data-enf]').dataset.enf; confirmDialog('Supprimer cet enfant et ses données (routines, santé…) ?', () => { data.enfants = data.enfants.filter((e) => e.id !== id); delete data.routines[id]; delete data.sante[id]; delete data.recompenses[id]; if (familleChild === id) familleChild = data.enfants[0] ? data.enfants[0].id : ''; save(); openReglages(); }, { danger: true, yes: 'Supprimer' }); }));
  ov.querySelector('#ct-add').addEventListener('click', () => { const nom = ov.querySelector('#ct-nom').value.trim(); if (!nom) { toast('Indique au moins un nom'); return; } data.contacts.push({ id: uid(), nom, role: ov.querySelector('#ct-role').value.trim(), tel: ov.querySelector('#ct-tel').value.trim() }); save(); openReglages(); });
  ov.querySelectorAll('[data-cid]').forEach((row) => row.querySelector('[data-delc]').addEventListener('click', () => { data.contacts = data.contacts.filter((x) => x.id !== row.dataset.cid); save(); openReglages(); }));
  ov.querySelector('#bk-export').addEventListener('click', exportData);
  ov.querySelector('#bk-import').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
  ov.querySelector('#bk-reset').addEventListener('click', () => confirmDialog('Effacer TOUTES les données et repartir de zéro ?', () => { localStorage.removeItem(STORE_KEY); location.reload(); }, { danger: true, yes: 'Tout effacer' }));
  ov.querySelector('#op-theme').addEventListener('click', () => { data.reglages.theme = data.reglages.theme === 'sombre' ? 'clair' : 'sombre'; save(); applyTheme(); openReglages(); });
  ov.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => { data.reglages.accent = b.dataset.acc; save(); applyTheme(); openReglages(); }));
  ov.querySelector('#op-midi').addEventListener('click', () => { data.reglages.midiSemaine = !data.reglages.midiSemaine; save(); openReglages(); });
  ov.querySelector('#op-notif').addEventListener('click', () => { if (data.reglages.notifs) { data.reglages.notifs = false; save(); openReglages(); } else requestNotifs(); });
  ov.querySelector('#set-consignes-save').addEventListener('click', () => { data.reglages.consignesSitter = ov.querySelector('#set-consignes').value.trim(); save(); toast('Consignes enregistrées'); });
  ov.querySelector('#set-coffre').addEventListener('click', openCoffre);
  ov.querySelector('#set-ville-save').addEventListener('click', () => { data.reglages.ville = ov.querySelector('#set-ville').value.trim(); weatherCache = null; save(); toast('Ville enregistrée'); });
}
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ma-tribu-' + todayISO() + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); data.reglages.lastExport = todayISO(); save(); toast('Sauvegarde téléchargée ✓');
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

/* ============================================================
   v7 : activités, anniversaires, carnet de santé, listes, favoris
   ============================================================ */
function accueilTodayHtml() {
  const acts = data.activites.filter((a) => a.jour === todayDow()).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));
  const annivs = data.anniversaires.map((a) => ({ a, n: nextAnnivInfo(a.date) })).filter((o) => o.n && o.n.days <= 14).sort((x, y) => x.n.days - y.n.days);
  if (!acts.length && !annivs.length) return '';
  let rows = '';
  acts.forEach((a) => { rows += `<div class="item"><span class="label">📆 ${a.heure ? `<b>${esc(a.heure)}</b> · ` : ''}${esc(a.nom)}</span></div>`; });
  annivs.forEach((o) => { rows += `<div class="item"><span class="label">🎂 ${esc(o.a.nom)}</span><span class="tag">${esc(annivLabel(o.n))}</span></div>`; });
  return `<div class="section-title">📆 À venir</div><div class="card">${rows}</div>`;
}

function activitesCardHtml() {
  const whoLabel = { grand: data.reglages.grand, petit: data.reglages.petit, deux: 'Les 2' };
  const whoClass = { grand: 'who-grand', petit: 'who-petit', deux: 'who-deux' };
  let body = '';
  for (let j = 0; j < 7; j++) {
    const acts = data.activites.filter((a) => a.jour === j).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));
    if (!acts.length) continue;
    body += `<div class="rayon-title">${cap(JOURS[j])}</div>` + acts.map((a) => `<div class="item" data-actid="${a.id}"><span class="label">${a.heure ? `<b>${esc(a.heure)}</b> · ` : ''}${esc(a.nom)}</span><span class="tag">${esc(quiLabel(a.qui))}</span><button class="x" data-actdel>✕</button></div>`).join('');
  }
  if (!body) body = `<div class="empty"><span class="e">📆</span>Ajoute les activités récurrentes des enfants (sport, musique, école…).</div>`;
  return `<div class="section-title">📆 Activités de la semaine</div><div class="card">${body}
    <div class="field-row" style="margin-top:12px"><select class="select" id="ac-jour">${JOURS.map((d, i) => `<option value="${i}">${cap(d)}</option>`).join('')}</select><input class="input" id="ac-heure" type="time" /></div>
    <div class="field-row"><input class="input" id="ac-nom" placeholder="Activité (ex. Foot)" /><select class="select" id="ac-qui">${quiOptions()}</select></div>
    <button class="btn btn-block" id="ac-add">Ajouter l'activité</button></div>`;
}
function wireActivites(scope) {
  const add = () => { const nom = scope.querySelector('#ac-nom').value.trim(); if (!nom) return; data.activites.push({ id: uid(), jour: +scope.querySelector('#ac-jour').value, heure: scope.querySelector('#ac-heure').value, nom, qui: scope.querySelector('#ac-qui').value }); save(); render(); };
  scope.querySelector('#ac-add').addEventListener('click', add);
  scope.querySelectorAll('[data-actid]').forEach((row) => row.querySelector('[data-actdel]').addEventListener('click', () => { data.activites = data.activites.filter((x) => x.id !== row.dataset.actid); save(); render(); }));
}

function anniversairesCardHtml() {
  const list = data.anniversaires.map((a) => ({ a, n: nextAnnivInfo(a.date) })).filter((o) => o.n).sort((x, y) => x.n.days - y.n.days);
  const body = list.length ? list.map((o) => `<div class="item" data-annid="${o.a.id}"><span class="label">🎂 ${esc(o.a.nom)}${o.n.age != null ? ` <span class="muted">(${o.n.age} ans)</span>` : ''}</span><span class="tag">${esc(annivLabel(o.n))}</span><button class="x" data-anndel>✕</button></div>`).join('') : `<div class="empty"><span class="e">🎂</span>Ajoute les anniversaires à ne pas oublier.</div>`;
  return `<div class="section-title">🎂 Anniversaires</div><div class="card">${body}
    <div class="field-row" style="margin-top:12px"><input class="input" id="an-nom" placeholder="Prénom" /><input class="input" id="an-date" type="date" /></div>
    <button class="btn btn-block" id="an-add">Ajouter</button></div>`;
}
function wireAnniversaires(scope) {
  scope.querySelector('#an-add').addEventListener('click', () => { const nom = scope.querySelector('#an-nom').value.trim(); const date = scope.querySelector('#an-date').value; if (!nom || !date) { toast('Prénom + date requis'); return; } data.anniversaires.push({ id: uid(), nom, date }); save(); render(); });
  scope.querySelectorAll('[data-annid]').forEach((row) => row.querySelector('[data-anndel]').addEventListener('click', () => { data.anniversaires = data.anniversaires.filter((x) => x.id !== row.dataset.annid); save(); render(); }));
}

function santeButtonHtml(child) { return `<button class="btn btn-block" id="f-sante" style="margin-top:4px;margin-bottom:14px">🩺 Carnet de santé — ${esc(childName(child))}</button>`; }
function openSante(child) {
  closeOverlay();
  const s = data.sante[child]; const name = childName(child);
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>←</button><h2>🩺 ${esc(name)}</h2></div>
    <div class="overlay-body">
      <div class="card">
        <label class="fld">Groupe sanguin<input class="input" id="sa-groupe" value="${esc(s.groupe || '')}" placeholder="ex. A+" /></label>
        <label class="fld">Allergies<textarea class="input" id="sa-allerg" rows="2" placeholder="ex. arachide, pollen…">${esc(s.allergies || '')}</textarea></label>
        <label class="fld">Traitement en cours<textarea class="input" id="sa-trait" rows="2" placeholder="ex. Ventoline si besoin">${esc(s.traitements || '')}</textarea></label>
        <label class="fld">Médecin / pédiatre<input class="input" id="sa-med" value="${esc(s.medecin || '')}" placeholder="Nom + téléphone" /></label>
        <div class="field-row"><label class="fld" style="flex:1">Taille de vêtements<input class="input" id="sa-vet" value="${esc(s.vetements || '')}" placeholder="ex. 6 ans" /></label><label class="fld" style="flex:1">Pointure<input class="input" id="sa-point" value="${esc(s.pointure || '')}" placeholder="ex. 28" /></label></div>
        <button class="btn btn-primary btn-block" id="sa-save">Enregistrer</button>
      </div>
      <div class="section-title">Vaccins & événements</div>
      <div class="card">
        <div class="list">${s.notes.length ? s.notes.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((n) => `<div class="item" data-snid="${n.id}"><span class="label">${esc(n.texte)}${n.date ? ` <span class="muted">· ${esc(frShort(n.date))}</span>` : ''}</span><button class="x" data-sndel>✕</button></div>`).join('') : `<div class="empty"><span class="e">💉</span>Note les vaccins, rappels, opérations…</div>`}</div>
        <div class="field-row" style="margin-top:10px"><input class="input" id="sn-txt" placeholder="ex. Vaccin DTP" /><input class="input" id="sn-date" type="date" /></div>
        <button class="btn btn-block" id="sn-add">Ajouter</button>
      </div>
      <div class="section-title">💊 Médicaments donnés</div>
      <div class="card">
        <div class="list">${s.medicaments.length ? [...s.medicaments].reverse().map((m) => `<div class="item" data-medid="${m.id}"><span class="label">${esc(m.nom)}${m.dose ? ' · ' + esc(m.dose) : ''} <span class="muted">· ${esc(m.quand || '')}</span></span><button class="x" data-meddel>✕</button></div>`).join('') : `<div class="empty"><span class="e">💊</span>Note chaque prise (anti double-dose entre les 2 maisons).</div>`}</div>
        <div class="field-row" style="margin-top:10px"><input class="input" id="md-nom" placeholder="Médicament" /><input class="input" id="md-dose" placeholder="Dose" style="flex:0 0 32%" /></div>
        <button class="btn btn-block" id="md-add">Ajouter (heure auto)</button>
      </div>
      <div class="section-title">📈 Croissance</div>
      <div class="card">
        <div class="list">${s.mesures.length ? [...s.mesures].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((x) => `<div class="item" data-mesid="${x.id}"><span class="label">${x.taille ? esc(x.taille) + ' cm' : ''}${x.taille && x.poids ? ' · ' : ''}${x.poids ? esc(x.poids) + ' kg' : ''} <span class="muted">· ${esc(frShort(x.date))}</span></span><button class="x" data-mesdel>✕</button></div>`).join('') : `<div class="empty"><span class="e">📈</span>Note la taille et le poids de temps en temps.</div>`}</div>
        <div class="field-row" style="margin-top:10px"><input class="input" id="ms-taille" type="number" inputmode="numeric" placeholder="Taille (cm)" /><input class="input" id="ms-poids" type="number" inputmode="decimal" step="0.1" placeholder="Poids (kg)" /></div>
        <button class="btn btn-block" id="ms-add">Ajouter la mesure</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#sa-save').addEventListener('click', () => { s.groupe = ov.querySelector('#sa-groupe').value.trim(); s.allergies = ov.querySelector('#sa-allerg').value.trim(); s.traitements = ov.querySelector('#sa-trait').value.trim(); s.medecin = ov.querySelector('#sa-med').value.trim(); s.vetements = ov.querySelector('#sa-vet').value.trim(); s.pointure = ov.querySelector('#sa-point').value.trim(); save(); toast('Carnet enregistré ✓'); });
  ov.querySelector('#sn-add').addEventListener('click', () => { const t = ov.querySelector('#sn-txt').value.trim(); if (!t) return; s.notes.push({ id: uid(), texte: t, date: ov.querySelector('#sn-date').value }); save(); openSante(child); });
  ov.querySelectorAll('[data-snid]').forEach((row) => row.querySelector('[data-sndel]').addEventListener('click', () => { s.notes = s.notes.filter((x) => x.id !== row.dataset.snid); save(); openSante(child); }));
  ov.querySelector('#md-add').addEventListener('click', () => { const n = ov.querySelector('#md-nom').value.trim(); if (!n) return; const now = new Date(); const quand = frShort(todayISO()) + ' ' + String(now.getHours()).padStart(2, '0') + 'h' + String(now.getMinutes()).padStart(2, '0'); s.medicaments.push({ id: uid(), nom: n, dose: ov.querySelector('#md-dose').value.trim(), quand }); save(); openSante(child); });
  ov.querySelectorAll('[data-medid]').forEach((row) => row.querySelector('[data-meddel]').addEventListener('click', () => { s.medicaments = s.medicaments.filter((x) => x.id !== row.dataset.medid); save(); openSante(child); }));
  ov.querySelector('#ms-add').addEventListener('click', () => { const t = ov.querySelector('#ms-taille').value.trim(), p = ov.querySelector('#ms-poids').value.trim(); if (!t && !p) return; s.mesures.push({ id: uid(), date: todayISO(), taille: t, poids: p }); save(); openSante(child); });
  ov.querySelectorAll('[data-mesid]').forEach((row) => row.querySelector('[data-mesdel]').addEventListener('click', () => { s.mesures = s.mesures.filter((x) => x.id !== row.dataset.mesid); save(); openSante(child); }));
}

function toggleFav(rid) { const i = data.favoris.indexOf(rid); if (i >= 0) data.favoris.splice(i, 1); else data.favoris.push(rid); save(); }

function listSelectorHtml() {
  let chips = `<button class="lchip ${activeListe === 'main' ? 'on' : ''}" data-lst="main">🛒 Courses</button>`;
  chips += data.listesExtra.map((l) => `<button class="lchip ${activeListe === l.id ? 'on' : ''}" data-lst="${l.id}">${esc(l.nom)}</button>`).join('');
  chips += `<button class="lchip add" data-lst="+">＋ Liste</button>`;
  return `<div class="lists">${chips}</div>`;
}
function wireListSelector(scope) {
  scope.querySelectorAll('[data-lst]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.lst;
    if (v === '+') { const nom = prompt('Nom de la nouvelle liste (ex. Pharmacie, Maison) :'); if (nom && nom.trim()) { const id = uid(); data.listesExtra.push({ id, nom: nom.trim(), items: [] }); activeListe = id; save(); } else return; }
    else activeListe = v;
    renderCourses(scope);
  }));
}
function renderListeExtra(el) {
  const l = data.listesExtra.find((x) => x.id === activeListe);
  if (!l) { activeListe = 'main'; renderCourses(el); return; }
  const restants = l.items.filter((i) => !i.fait).length;
  el.innerHTML = listSelectorHtml() + `
    <div class="card"><div class="field-row"><input class="input" id="le-nom" placeholder="Ajouter à « ${esc(l.nom)} »…" autocomplete="off" enterkeyhint="done" /><button class="btn btn-primary" id="le-add">＋</button></div></div>
    <div class="section-title">${esc(l.nom)} ${restants ? '· ' + restants : ''}</div>
    <div class="card">
      <div class="list">${l.items.length ? l.items.slice().sort((a, b) => a.fait - b.fait).map((i) => `<div class="item ${i.fait ? 'done' : ''}" data-leid="${i.id}"><span class="check">${i.fait ? '✓' : ''}</span><span class="label">${esc(i.nom)}</span><button class="x" data-act="del">✕</button></div>`).join('') : `<div class="empty"><span class="e">📝</span>Liste vide.</div>`}</div>
      <div class="btn-row" style="margin-top:12px"><button class="btn btn-mini" id="le-share">📤 Partager</button><button class="btn btn-mini" id="le-rename">✏️ Renommer</button><button class="btn btn-mini" id="le-del" style="color:var(--danger)">🗑️ Supprimer</button></div>
    </div>`;
  wireListSelector(el);
  const add = () => { const v = el.querySelector('#le-nom').value.trim(); if (!v) return; l.items.push({ id: uid(), nom: v, fait: false }); save(); renderListeExtra(el); };
  el.querySelector('#le-add').addEventListener('click', add);
  el.querySelector('#le-nom').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  el.querySelectorAll('[data-leid]').forEach((row) => { const id = row.dataset.leid; wireRow(row, () => { const it = l.items.find((x) => x.id === id); it.fait = !it.fait; save(); renderListeExtra(el); }, () => { l.items = l.items.filter((x) => x.id !== id); save(); renderListeExtra(el); }); });
  el.querySelector('#le-share').addEventListener('click', () => { const todo = l.items.filter((i) => !i.fait); if (!todo.length) { toast('Liste vide'); return; } const t = '📝 ' + l.nom + '\n' + todo.map((i) => '• ' + i.nom).join('\n'); if (navigator.share) navigator.share({ title: l.nom, text: t }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copié ✓')); });
  el.querySelector('#le-rename').addEventListener('click', () => { const n = prompt('Nouveau nom :', l.nom); if (n && n.trim()) { l.nom = n.trim(); save(); renderListeExtra(el); } });
  el.querySelector('#le-del').addEventListener('click', () => confirmDialog('Supprimer la liste « ' + l.nom + ' » ?', () => { data.listesExtra = data.listesExtra.filter((x) => x.id !== l.id); activeListe = 'main'; save(); renderCourses(el); }, { danger: true, yes: 'Supprimer' }));
}

/* ============================================================
   v9 : dépenses partagées, liaison, baby-sitter, vacances,
        récompenses, devoirs, sorties
   ============================================================ */
function openDepenses() {
  closeOverlay();
  const solde = soldeCoparent();
  const cats = ['Cantine', 'Vêtements', 'Activités', 'Santé', 'École', 'Garde', 'Autre'];
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>💶 Dépenses partagées</h2></div>
    <div class="overlay-body">
      <div class="card" style="text-align:center">
        <div class="budg-total" style="color:${solde >= 0 ? 'var(--ok)' : 'var(--danger)'}">${eur(Math.abs(solde))} €</div>
        <div class="muted">${Math.abs(solde) < 0.01 ? 'Vous êtes à égalité 👍' : (solde > 0 ? "l'autre parent te doit" : "tu dois à l'autre parent")}</div>
        <p class="muted" style="font-size:12px;margin-top:6px">Chaque dépense est partagée 50/50.</p>
      </div>
      <div class="card">
        <div class="field-row"><input class="input" id="dp-montant" type="number" inputmode="decimal" step="0.01" placeholder="Montant €" /><select class="select" id="dp-qui"><option value="moi">J'ai payé</option><option value="autre">L'autre a payé</option></select></div>
        <div class="field-row"><select class="select" id="dp-cat">${cats.map((c) => `<option>${c}</option>`).join('')}</select><input class="input" id="dp-note" placeholder="Note (ex. chaussures)" /></div>
        <button class="btn btn-primary btn-block" id="dp-add">Ajouter la dépense</button>
      </div>
      <div class="section-title">Historique</div>
      <div class="card"><div class="list">${data.depenses.length ? [...data.depenses].reverse().map((d) => `<div class="item" data-dpid="${d.id}"><span class="label">${esc(d.note || d.cat)} <span class="muted">· ${esc(d.cat)} · ${esc(frShort(d.date))} · ${d.payePar === 'moi' ? 'toi' : "l'autre"}</span></span><span class="tag">${eur(d.montant)} €</span><button class="x" data-dpdel>✕</button></div>`).join('') : `<div class="empty"><span class="e">💶</span>Aucune dépense pour l'instant.</div>`}</div></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#dp-add').addEventListener('click', () => { const m = parseFloat(ov.querySelector('#dp-montant').value); if (isNaN(m)) { toast('Indique un montant'); return; } data.depenses.push({ id: uid(), date: todayISO(), montant: m, payePar: ov.querySelector('#dp-qui').value, cat: ov.querySelector('#dp-cat').value, note: ov.querySelector('#dp-note').value.trim() }); save(); openDepenses(); });
  ov.querySelectorAll('[data-dpid]').forEach((row) => row.querySelector('[data-dpdel]').addEventListener('click', () => { data.depenses = data.depenses.filter((x) => x.id !== row.dataset.dpid); save(); openDepenses(); }));
}

function openLiaison() {
  closeOverlay();
  const ov = document.createElement('div'); ov.className = 'overlay';
  const sorted = [...data.liaison].reverse();
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📓 Cahier de liaison</h2></div>
    <div class="overlay-body">
      <p class="muted" style="margin:0 2px 10px">Note ce qu'il faut transmettre à l'autre parent, puis partage-le à l'échange.</p>
      <div class="card"><div class="field-row"><input class="input" id="li-txt" placeholder="Ex. a eu de la fièvre, doit rendre son livre lundi…" enterkeyhint="done" /></div><button class="btn btn-primary btn-block" id="li-add">Ajouter</button></div>
      ${data.liaison.length ? `<button class="btn btn-block" id="li-share" style="margin-bottom:12px">📤 Partager le cahier</button>` : ''}
      <div class="card"><div class="list">${sorted.length ? sorted.map((n) => `<div class="item" data-liid="${n.id}"><span class="label">${esc(n.texte)}<br><span class="muted" style="font-size:12px">${esc(frShort(n.date))}</span></span><button class="x" data-lidel>✕</button></div>`).join('') : `<div class="empty"><span class="e">📓</span>Rien à transmettre pour l'instant.</div>`}</div></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  const add = () => { const t = ov.querySelector('#li-txt').value.trim(); if (!t) return; data.liaison.push({ id: uid(), date: todayISO(), texte: t }); save(); openLiaison(); };
  ov.querySelector('#li-add').addEventListener('click', add);
  ov.querySelector('#li-txt').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  const sh = ov.querySelector('#li-share'); if (sh) sh.addEventListener('click', () => { const t = '📓 Cahier de liaison\n' + [...data.liaison].reverse().map((n) => '• [' + frShort(n.date) + '] ' + n.texte).join('\n'); if (navigator.share) navigator.share({ title: 'Cahier de liaison', text: t }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copié ✓')); });
  ov.querySelectorAll('[data-liid]').forEach((row) => row.querySelector('[data-lidel]').addEventListener('click', () => { data.liaison = data.liaison.filter((x) => x.id !== row.dataset.liid); save(); openLiaison(); }));
}

function openSitter() {
  closeOverlay();
  const acts = data.activites.filter((a) => a.jour === todayDow()).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));
  const childBlock = (c) => { const s = data.sante[c]; const nom = childName(c); return `<div class="section-title">${esc(nom)}</div><div class="card">${s.allergies ? `<p style="margin:0 0 8px"><b>⚠️ Allergies :</b> ${esc(s.allergies)}</p>` : ''}${s.traitements ? `<p style="margin:0 0 8px"><b>💊 Traitement :</b> ${esc(s.traitements)}</p>` : ''}<div class="muted" style="font-size:13px;margin-bottom:6px">Routine du soir</div><div class="list">${data.routines[c].soir.map((it) => `<div class="item"><span class="label">${pictoFor(it.texte)} ${esc(it.texte)}</span></div>`).join('')}</div></div>`; };
  const contacts = data.contacts.map((c) => `<div class="item"><span class="label"><b>${esc(c.nom)}</b>${c.role ? ' · ' + esc(c.role) : ''}${c.tel ? `<br><a class="tel-link" href="tel:${esc(c.tel)}">📞 ${esc(c.tel)}</a>` : ''}</span></div>`).join('');
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>🧑‍🍼 Mode baby-sitter</h2></div>
    <div class="overlay-body">
      ${data.reglages.consignesSitter ? `<div class="jbut">📋 ${esc(data.reglages.consignesSitter)}</div>` : ''}
      ${acts.length ? `<div class="section-title">Aujourd'hui</div><div class="card"><div class="list">${acts.map((a) => `<div class="item"><span class="label">📆 ${a.heure ? '<b>' + esc(a.heure) + '</b> · ' : ''}${esc(a.nom)}</span></div>`).join('')}</div></div>` : ''}
      ${data.enfants.map((e) => childBlock(e.id)).join('')}
      <div class="section-title">📞 Contacts utiles</div>
      <div class="card"><div class="list">${contacts || '<div class="empty">Ajoute des contacts dans les Réglages.</div>'}</div></div>
      <p class="muted" style="text-align:center;font-size:12px">Pour modifier : Famille (🩺), Réglages (consignes, contacts) et Garde.</p>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
}

function vacancesCardHtml() {
  const list = [...data.vacances].sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
  const whoLabel = { moi: 'Avec toi', autre: "Chez l'autre", deux: 'À répartir' };
  const body = list.length ? list.map((v) => `<div class="item" data-vacid="${v.id}"><span class="label">🏖️ ${esc(v.nom)}<br><span class="muted" style="font-size:12px">${esc(frShort(v.debut))} → ${esc(frShort(v.fin))}</span></span><span class="tag">${esc(whoLabel[v.qui] || '')}</span><button class="x" data-vacdel>✕</button></div>`).join('') : `<div class="empty"><span class="e">🏖️</span>Ajoute les vacances scolaires et qui a les enfants.</div>`;
  return `<div class="section-title">🏖️ Vacances scolaires</div><div class="card">${body}
    <div class="field-row" style="margin-top:12px"><input class="input" id="vac-nom" placeholder="Ex. Vacances de février" /><select class="select" id="vac-qui"><option value="moi">Avec toi</option><option value="autre">Chez l'autre</option><option value="deux">À répartir</option></select></div>
    <div class="field-row"><input class="input" id="vac-debut" type="date" /><input class="input" id="vac-fin" type="date" /></div>
    <button class="btn btn-block" id="vac-add">Ajouter</button></div>`;
}
function wireVacances(scope) {
  scope.querySelector('#vac-add').addEventListener('click', () => { const nom = scope.querySelector('#vac-nom').value.trim(); const debut = scope.querySelector('#vac-debut').value; const fin = scope.querySelector('#vac-fin').value; if (!nom || !debut) { toast('Nom + date de début requis'); return; } data.vacances.push({ id: uid(), nom, debut, fin: fin || debut, qui: scope.querySelector('#vac-qui').value }); save(); render(); });
  scope.querySelectorAll('[data-vacid]').forEach((row) => row.querySelector('[data-vacdel]').addEventListener('click', () => { data.vacances = data.vacances.filter((x) => x.id !== row.dataset.vacid); save(); render(); }));
}

function recompensesCardHtml(child) {
  const r = data.recompenses[child]; const nom = childName(child);
  const stars = '⭐'.repeat(Math.min(r.etoiles, r.objectif)) + '▫️'.repeat(Math.max(0, r.objectif - r.etoiles));
  const atteint = r.etoiles >= r.objectif;
  return `<div class="section-title">⭐ Récompenses — ${esc(nom)}</div><div class="card">
    <div style="font-size:20px;text-align:center;letter-spacing:2px;line-height:1.5;word-break:break-word">${stars}</div>
    <div class="muted" style="text-align:center;margin:6px 0">${r.etoiles} / ${r.objectif} étoiles${r.recompense ? ' · 🎁 ' + esc(r.recompense) : ''}</div>
    ${atteint ? `<div class="jbut" style="text-align:center">🎉 Objectif atteint !${r.recompense ? ' ' + esc(r.recompense) : ''}</div>` : ''}
    <div class="btn-row" style="justify-content:center"><button class="btn btn-mini" id="rc-moins">－</button><button class="btn btn-mini btn-primary" id="rc-plus">＋ 1 étoile</button><button class="btn btn-mini" id="rc-rz">↻</button></div>
    <div class="field-row" style="margin-top:10px"><input class="input" id="rc-obj" type="number" inputmode="numeric" value="${r.objectif}" placeholder="Objectif" /><input class="input" id="rc-cadeau" value="${esc(r.recompense)}" placeholder="Récompense (ex. ciné)" /></div>
    <button class="btn btn-mini btn-block" id="rc-save">Enregistrer l'objectif</button></div>`;
}
function wireRecompenses(scope, child) {
  const r = data.recompenses[child];
  scope.querySelector('#rc-plus').addEventListener('click', () => { r.etoiles++; save(); renderFamille(scope); if (r.etoiles === r.objectif) toast('🎉 Objectif atteint !'); });
  scope.querySelector('#rc-moins').addEventListener('click', () => { if (r.etoiles > 0) r.etoiles--; save(); renderFamille(scope); });
  scope.querySelector('#rc-rz').addEventListener('click', () => { r.etoiles = 0; save(); renderFamille(scope); });
  scope.querySelector('#rc-save').addEventListener('click', () => { const o = parseInt(scope.querySelector('#rc-obj').value, 10); if (o > 0) r.objectif = o; r.recompense = scope.querySelector('#rc-cadeau').value.trim(); save(); renderFamille(scope); toast('Objectif enregistré'); });
}

function devoirsCardHtml() {
  const list = [...data.devoirs].sort((a, b) => (a.fait - b.fait) || (a.pour || '').localeCompare(b.pour || ''));
  const body = list.length ? list.map((d) => `<div class="item ${d.fait ? 'done' : ''}" data-dvid="${d.id}"><span class="check">${d.fait ? '✓' : ''}</span><span class="label">${esc(d.texte)}${d.matiere ? ` <span class="muted">· ${esc(d.matiere)}</span>` : ''}${d.pour ? ` <span class="tag">${esc(rappelLabel(d.pour))}</span>` : ''}</span><button class="x" data-act="del">✕</button></div>`).join('') : `<div class="empty"><span class="e">🎒</span>Note les devoirs « pour demain ».</div>`;
  return `<div class="section-title">🎒 Devoirs & école</div><div class="card"><div class="list">${body}</div>
    <div class="field-row" style="margin-top:12px"><input class="input" id="dv-txt" placeholder="Ex. Lire p.20, poésie…" /><input class="input" id="dv-mat" placeholder="Matière" style="flex:0 0 32%" /></div>
    <div class="field-row"><input class="input" id="dv-pour" type="date" /><button class="btn btn-primary" id="dv-add">Ajouter</button></div>
    ${data.devoirs.some((d) => d.fait) ? `<button class="btn btn-mini" id="dv-clear">Nettoyer les devoirs faits</button>` : ''}</div>`;
}
function wireDevoirs(scope) {
  scope.querySelector('#dv-add').addEventListener('click', () => { const t = scope.querySelector('#dv-txt').value.trim(); if (!t) return; data.devoirs.push({ id: uid(), texte: t, matiere: scope.querySelector('#dv-mat').value.trim(), pour: scope.querySelector('#dv-pour').value, fait: false }); save(); renderFamille(scope); });
  scope.querySelectorAll('[data-dvid]').forEach((row) => { const id = row.dataset.dvid; wireRow(row, () => { const d = data.devoirs.find((x) => x.id === id); d.fait = !d.fait; save(); renderFamille(scope); }, () => { data.devoirs = data.devoirs.filter((x) => x.id !== id); save(); renderFamille(scope); }); });
  const c = scope.querySelector('#dv-clear'); if (c) c.addEventListener('click', () => { data.devoirs = data.devoirs.filter((d) => !d.fait); save(); renderFamille(scope); });
}

/* Sorties */
const SORTIES = [
  { id: 's1', nom: 'Parc / aire de jeux', emoji: '🛝', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: "Toboggans, ballon, vélo. Emporte un goûter et de l'eau." },
  { id: 's2', nom: 'Balade en forêt', emoji: '🌲', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: 'Ramasser des feuilles, observer les animaux, faire du land art avec ce qu on trouve.' },
  { id: 's3', nom: 'Bibliothèque / médiathèque', emoji: '📚', cat: 'Culture', lieu: 'int', cout: 'Gratuit', desc: 'Lire, emprunter des livres, souvent un coin jeux pour les petits.' },
  { id: 's4', nom: 'Musée', emoji: '🏛️', cat: 'Culture', lieu: 'int', cout: 'Petit budget', desc: 'Souvent gratuit pour les moins de 12 ans. Choisis-en un adapté (sciences, nature).' },
  { id: 's5', nom: 'Piscine', emoji: '🏊', cat: 'Sport', lieu: 'int', cout: 'Petit budget', desc: 'Toujours un succès. Brassards pour le petit.' },
  { id: 's6', nom: 'Pique-nique', emoji: '🧺', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: 'Au parc ou dans le jardin. Laisse-les préparer le panier avec toi.' },
  { id: 's7', nom: 'Vélo / trottinette', emoji: '🚲', cat: 'Sport', lieu: 'ext', cout: 'Gratuit', desc: 'Une boucle dans le quartier ou une voie verte. Casque obligatoire.' },
  { id: 's8', nom: 'Plage ou lac', emoji: '🏖️', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: 'Châteaux de sable, baignade surveillée, ricochets.' },
  { id: 's9', nom: 'Ferme pédagogique', emoji: '🐄', cat: 'Nature', lieu: 'ext', cout: 'Petit budget', desc: 'Nourrir et caresser les animaux : top pour le petit.' },
  { id: 's10', nom: 'Cinéma', emoji: '🎬', cat: 'Culture', lieu: 'int', cout: 'Petit budget', desc: 'Un film adapté à leur âge, avec du pop-corn.' },
  { id: 's11', nom: 'Patinoire', emoji: '⛸️', cat: 'Sport', lieu: 'int', cout: 'Petit budget', desc: 'Fous rires garantis. Gants conseillés.' },
  { id: 's12', nom: 'Cueillette de saison', emoji: '🍓', cat: 'Nature', lieu: 'ext', cout: 'Petit budget', desc: 'Fraises, pommes selon la saison : on cueille et on cuisine après.' },
  { id: 's13', nom: 'Atelier cuisine maison', emoji: '👨‍🍳', cat: 'Maison', lieu: 'int', cout: 'Gratuit', desc: "Faites une recette ensemble (cookies, pizza). Voir l'onglet Repas !" },
  { id: 's14', nom: 'Géocaching', emoji: '📍', cat: 'Aventure', lieu: 'ext', cout: 'Gratuit', desc: 'Chasse au trésor avec une appli gratuite : on cherche des caches cachées près de chez toi.' },
  { id: 's15', nom: 'Bowling', emoji: '🎳', cat: 'Sport', lieu: 'int', cout: 'Budget', desc: 'Avec les rampes pour les petits. Très festif.' },
  { id: 's16', nom: 'Parc animalier / zoo', emoji: '🦁', cat: 'Nature', lieu: 'ext', cout: 'Budget', desc: "Une grande sortie. Prévois la journée et le pique-nique." },
  { id: 's17', nom: 'Jardinage', emoji: '🌱', cat: 'Maison', lieu: 'ext', cout: 'Gratuit', desc: 'Planter des graines, arroser : ils adorent voir pousser.' },
  { id: 's18', nom: 'Accrobranche', emoji: '🌳', cat: 'Aventure', lieu: 'ext', cout: 'Budget', desc: 'Dès 4-5 ans sur les parcours adaptés. Sensations garanties !' },
  { id: 's19', nom: 'Ludothèque', emoji: '🎲', cat: 'Culture', lieu: 'int', cout: 'Gratuit', desc: "Des centaines de jeux de société à tester sur place ou à emprunter." },
  { id: 's20', nom: 'Spectacle jeunesse', emoji: '🎭', cat: 'Culture', lieu: 'int', cout: 'Petit budget', desc: "Théâtre, marionnettes ou conte : magique pour les plus petits." },
  { id: 's21', nom: 'Caserne de pompiers', emoji: '🚒', cat: 'Aventure', lieu: 'ext', cout: 'Gratuit', desc: "Beaucoup proposent des visites sur demande — les enfants adorent." },
  { id: 's22', nom: 'Mini-golf', emoji: '⛳', cat: 'Sport', lieu: 'ext', cout: 'Petit budget', desc: "Accessible dès 4 ans, fun et tranquille." },
  { id: 's23', nom: "Au bord de l'eau", emoji: '🎣', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: "Observer les canards, faire des ricochets, pique-niquer." },
  { id: 's24', nom: 'Parc aquatique', emoji: '💦', cat: 'Sport', lieu: 'ext', cout: 'Budget', desc: "L'idéal quand il fait chaud. Surveillance rapprochée pour le petit." },
  { id: 's25', nom: 'Trampoline park', emoji: '🤸', cat: 'Sport', lieu: 'int', cout: 'Budget', desc: "Se défouler quand il pleut. Chaussettes antidérapantes obligatoires." },
  { id: 's26', nom: 'Observer les étoiles', emoji: '🔭', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: "Un soir d'été, une couverture, et on cherche les constellations." },
  { id: 's27', nom: 'Brocante / vide-grenier', emoji: '🪙', cat: 'Culture', lieu: 'ext', cout: 'Gratuit', desc: "Chasse aux trésors à petits prix : donne-leur quelques pièces." },
  { id: 's28', nom: 'Petite randonnée', emoji: '🥾', cat: 'Nature', lieu: 'ext', cout: 'Gratuit', desc: "Un parcours court avec un but : cascade, point de vue, parcours santé." },
  { id: 's29', nom: 'Aquarium', emoji: '🐠', cat: 'Culture', lieu: 'int', cout: 'Budget', desc: "Poissons, requins, méduses : émerveillement garanti." },
  { id: 's30', nom: 'Atelier créatif', emoji: '🏺', cat: 'Maison', lieu: 'int', cout: 'Petit budget', desc: "Poterie, peinture ou pâtisserie : cherche un atelier enfants près de chez toi." }
];
let jeuxMode = 'jeux';
function sortiesFiltres() { const f = jxSearch.toLowerCase().trim(); return SORTIES.filter((s) => (jxLieu === 'tous' || jxLieu === 'voiture' || s.lieu === jxLieu) && (!jxFav || data.favSorties.includes(s.id)) && (!f || s.nom.toLowerCase().includes(f) || s.cat.toLowerCase().includes(f))); }
function sortieRowsHtml() { const list = sortiesFiltres(); if (!list.length) return `<div class="empty"><span class="e">🔍</span>Aucune sortie avec ces filtres.</div>`; return list.map((s) => { const fav = data.favSorties.includes(s.id); return `<div class="item recipe" data-sid="${s.id}"><span class="label">${s.emoji} ${esc(s.nom)}<br><span class="muted" style="font-size:12px">${esc(s.cat)} · ${esc(s.cout)}</span></span><button class="rfav" data-sfav="${s.id}">${fav ? '❤️' : '🤍'}</button><span class="go">›</span></div>`; }).join(''); }
function toggleFavSortie(id) { const i = data.favSorties.indexOf(id); if (i >= 0) data.favSorties.splice(i, 1); else data.favSorties.push(id); save(); }
function wireSorties(scope) { scope.querySelectorAll('[data-sid]').forEach((row) => { row.addEventListener('click', () => openSortieDetail(row.dataset.sid)); const fb = row.querySelector('[data-sfav]'); if (fb) fb.addEventListener('click', (e) => { e.stopPropagation(); toggleFavSortie(row.dataset.sfav); scope.querySelector('#jx-list').innerHTML = sortieRowsHtml(); wireSorties(scope); }); }); }
function openSortieDetail(id) {
  const s = SORTIES.find((x) => x.id === id); if (!s) return; closeOverlay();
  const fav = data.favSorties.includes(s.id);
  const lieuTxt = s.lieu === 'int' ? '🏠 Intérieur' : '🌳 Extérieur';
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>${s.emoji} ${esc(s.nom)}</h2></div>
    <div class="overlay-body"><div class="badges"><span class="jbadge">${lieuTxt}</span><span class="jbadge">${esc(s.cat)}</span><span class="jbadge">💰 ${esc(s.cout)}</span></div>
      <div class="card"><p style="margin:0">${esc(s.desc)}</p></div>
      <div class="btn-row" style="margin-top:6px"><button class="btn" style="flex:1" id="sd-fav">${fav ? '❤️ Favori' : '🤍 Favori'}</button><button class="btn btn-accent" style="flex:1" id="sd-other">🎲 Une autre</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#sd-fav').addEventListener('click', () => { toggleFavSortie(s.id); openSortieDetail(s.id); });
  ov.querySelector('#sd-other').addEventListener('click', () => { const p = sortiesFiltres(); if (p.length) openSortieDetail(p[Math.floor(Math.random() * p.length)].id); });
}

/* ============================================================
   JEUX — bibliothèque pour sortir les enfants des écrans
   ============================================================ */
const JEUX = [
  { id: 'j1', nom: 'Cache-cache', emoji: '🙈', cat: 'Plein air', lieu: 'partout', ageMin: 3, ageMax: 12, joueurs: '3+', duree: '15 min', materiel: 'Aucun', but: 'Se cacher sans se faire trouver.', regles: ["Un joueur compte les yeux fermés jusqu'à 20 pendant que les autres se cachent.", "Il part ensuite chercher les cachés.", "Le premier trouvé comptera au tour suivant."], variante: "« 1-2-3 piano » : un caché peut délivrer les autres en touchant le camp avant le chercheur." },
  { id: 'j2', nom: '1, 2, 3, Soleil', emoji: '☀️', cat: 'Plein air', lieu: 'partout', ageMin: 4, ageMax: 12, joueurs: '3+', duree: '15 min', materiel: 'Aucun', but: 'Avancer sans se faire voir bouger.', regles: ["Un meneur face à un mur crie « 1, 2, 3, soleil ! » puis se retourne.", "Les autres avancent quand il ne regarde pas et se figent quand il se retourne.", "Celui qui bouge repart au départ. Le premier à toucher le meneur gagne."] },
  { id: 'j3', nom: "L'épervier", emoji: '🦅', cat: 'Plein air', lieu: 'ext', ageMin: 6, ageMax: 12, joueurs: '6+', duree: '15 min', materiel: 'Aucun', but: 'Traverser sans se faire attraper.', regles: ["Un « épervier » est au milieu, les autres d'un côté du terrain.", "À « Épervier, sors ! » tout le monde traverse vers l'autre côté.", "Les joueurs touchés deviennent éperviers. Le dernier libre gagne."] },
  { id: 'j4', nom: 'Chat perché', emoji: '🐱', cat: 'Plein air', lieu: 'partout', ageMin: 4, ageMax: 10, joueurs: '4+', duree: '15 min', materiel: 'Aucun', but: 'Ne pas être touché par le chat.', regles: ["Un joueur est le « chat » et poursuit les autres.", "On est sauvé si on est perché (pieds surélevés sur un banc, une marche…).", "Le joueur touché au sol devient le chat."] },
  { id: 'j5', nom: 'Le béret', emoji: '🎽', cat: 'Plein air', lieu: 'ext', ageMin: 6, ageMax: 12, joueurs: '6+', duree: '20 min', materiel: 'Un foulard', but: 'Rapporter le foulard dans son camp.', regles: ["Deux équipes face à face, chaque joueur a un numéro. Un foulard au milieu.", "On appelle un numéro : les deux joueurs concernés courent attraper le foulard.", "Il faut le rapporter sans se faire toucher par l'adversaire. 1 point par manche."] },
  { id: 'j6', nom: 'Balle au prisonnier', emoji: '⛹️', cat: 'Plein air', lieu: 'ext', ageMin: 7, ageMax: 12, joueurs: '6+', duree: '20 min', materiel: 'Un ballon mou', but: "Éliminer l'équipe adverse.", regles: ["Deux équipes. On se lance le ballon pour toucher les adversaires.", "Un joueur touché va en « prison » derrière l'équipe adverse.", "Il est délivré s'il attrape une balle. L'équipe qui élimine tout le monde gagne."] },
  { id: 'j7', nom: 'Marelle', emoji: '🦶', cat: 'Plein air', lieu: 'partout', ageMin: 4, ageMax: 10, joueurs: '1+', duree: '10 min', materiel: 'Une craie + un palet', but: 'Faire le parcours à cloche-pied.', regles: ["Dessine une marelle (cases 1 à 10) à la craie.", "Lance le palet dans la case 1, saute à cloche-pied en évitant cette case.", "Récupère le palet au retour. À chaque tour, le palet monte d'une case."] },
  { id: 'j8', nom: 'Course en sac', emoji: '👟', cat: 'Plein air', lieu: 'ext', ageMin: 4, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: "Un sac ou une taie d'oreiller", but: 'Arriver le premier en sautant.', regles: ["Chaque joueur entre dans un grand sac, tenu à la taille.", "Au signal, tout le monde avance en sautant jusqu'à la ligne d'arrivée.", "Le premier arrivé sans tomber gagne."] },
  { id: 'j9', nom: 'Colin-maillard', emoji: '🧣', cat: 'Plein air', lieu: 'partout', ageMin: 5, ageMax: 10, joueurs: '4+', duree: '15 min', materiel: 'Un foulard', but: 'Attraper et reconnaître un joueur les yeux bandés.', regles: ["Un joueur a les yeux bandés et tourne sur lui-même.", "Il cherche à attraper les autres, qui l'évitent en silence.", "Quand il attrape quelqu'un, il doit deviner qui c'est au toucher."] },
  { id: 'j10', nom: 'Loup glacé', emoji: '🧊', cat: 'Plein air', lieu: 'ext', ageMin: 5, ageMax: 11, joueurs: '5+', duree: '15 min', materiel: 'Aucun', but: 'Ne pas être gelé (ou délivrer les gelés).', regles: ["Un « loup » poursuit les autres.", "Touché = gelé, immobile bras écartés.", "Un joueur libre peut délivrer un gelé en passant sous ses bras. Le loup doit tous les geler."] },
  { id: 'j11', nom: 'Saute-mouton', emoji: '🐑', cat: 'Plein air', lieu: 'ext', ageMin: 6, ageMax: 11, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Sauter par-dessus les autres.', regles: ["Un joueur se met courbé, mains sur les genoux.", "Les autres sautent par-dessus son dos à tour de rôle.", "On enchaîne en se replaçant courbé un peu plus loin."] },
  { id: 'j12', nom: 'Jacques a dit', emoji: '🗣️', cat: 'Sans matériel', lieu: 'partout', ageMin: 4, ageMax: 10, joueurs: '3+', duree: '10 min', materiel: 'Aucun', but: "N'obéir que si « Jacques a dit ».", regles: ["Le meneur donne des ordres : « Jacques a dit : touchez-vous le nez ».", "On exécute seulement si la phrase commence par « Jacques a dit ».", "Si on obéit à un ordre sans cette formule, on est éliminé."] },
  { id: 'j13', nom: 'Ni oui ni non', emoji: '🙊', cat: 'Sans matériel', lieu: 'partout', ageMin: 6, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: "Répondre sans dire « oui » ni « non ».", regles: ["Un joueur pose plein de questions rapides.", "L'autre doit répondre sans jamais dire « oui » ni « non ».", "S'il se trompe, on inverse les rôles. Tenir le plus longtemps possible !"] },
  { id: 'j14', nom: 'Qui suis-je ?', emoji: '🤔', cat: 'Devinettes', lieu: 'partout', ageMin: 5, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Faire deviner un animal, un objet ou un personnage.', regles: ["Un joueur pense à quelque chose en secret.", "Les autres posent des questions pour deviner ce que c'est.", "Celui qui trouve fait deviner à son tour."] },
  { id: 'j15', nom: 'Les charades', emoji: '🎭', cat: 'Devinettes', lieu: 'partout', ageMin: 7, ageMax: 12, joueurs: '2+', duree: '15 min', materiel: 'Aucun', but: 'Deviner un mot décomposé en syllabes.', regles: ["« Mon premier… mon deuxième… mon tout… » : chaque partie décrit une syllabe.", "Les autres devinent chaque syllabe puis le mot complet.", "Ex. : mon premier est un métal précieux (or), mon deuxième se boit (thé)… mon tout pique (ortie) !"] },
  { id: 'j16', nom: 'Le portrait (20 questions)', emoji: '❓', cat: 'Devinettes', lieu: 'partout', ageMin: 7, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Deviner en 20 questions maximum.', regles: ["Un joueur choisit secrètement une personne ou une chose.", "Les autres posent jusqu'à 20 questions à réponse « oui ou non ».", "Il faut trouver avant la 20ᵉ question !"] },
  { id: 'j17', nom: 'Statue musicale', emoji: '🗿', cat: 'Mouvement', lieu: 'int', ageMin: 4, ageMax: 10, joueurs: '3+', duree: '10 min', materiel: 'De la musique', but: "Se figer quand la musique s'arrête.", regles: ["On danse tant que la musique joue.", "Quand elle s'arrête, tout le monde se fige en statue.", "Celui qui bouge est éliminé. Le dernier immobile gagne."] },
  { id: 'j18', nom: 'Téléphone arabe', emoji: '☎️', cat: 'Sans matériel', lieu: 'partout', ageMin: 5, ageMax: 12, joueurs: '4+', duree: '5 min', materiel: 'Aucun', but: "Transmettre une phrase à l'oreille.", regles: ["En file, le premier murmure une phrase à l'oreille du suivant.", "Chacun la répète à l'oreille du voisin, une seule fois.", "Le dernier la dit à voix haute : fou rire garanti avec les déformations !"] },
  { id: 'j19', nom: "Le chef d'orchestre", emoji: '🎻', cat: 'Devinettes', lieu: 'int', ageMin: 6, ageMax: 12, joueurs: '4+', duree: '10 min', materiel: 'Aucun', but: 'Trouver qui mène les gestes.', regles: ["Un joueur sort. Les autres choisissent un « chef » qui lance des gestes (taper des mains…).", "Tous imitent le chef discrètement.", "Le joueur revenu doit deviner qui est le chef d'orchestre."] },
  { id: 'j20', nom: 'Jeu de Kim', emoji: '🧠', cat: 'Calme', lieu: 'int', ageMin: 5, ageMax: 12, joueurs: '1+', duree: '10 min', materiel: 'Quelques objets + un torchon', but: 'Mémoriser des objets.', regles: ["Pose une dizaine d'objets sur la table, observe-les 30 secondes.", "Couvre-les avec un torchon : les enfants listent ceux dont ils se souviennent.", "Variante : retire un objet en cachette, il faut deviner lequel manque."], variante: 'En enlever un en douce et faire deviner lequel a disparu.' },
  { id: 'j21', nom: 'Le mime', emoji: '🤫', cat: 'Devinettes', lieu: 'partout', ageMin: 6, ageMax: 12, joueurs: '3+', duree: '15 min', materiel: 'Aucun', but: 'Faire deviner sans parler.', regles: ["Un joueur mime un métier, un animal ou un film, sans parler ni faire de bruit.", "Les autres devinent.", "Celui qui trouve mime à son tour."] },
  { id: 'j22', nom: 'Pierre-feuille-ciseaux', emoji: '✊', cat: 'Sans matériel', lieu: 'partout', ageMin: 4, ageMax: 12, joueurs: '2', duree: '2 min', materiel: 'Aucun', but: "Battre le signe de l'autre.", regles: ["Au compte de trois, chacun montre pierre (poing), feuille (main à plat) ou ciseaux (deux doigts).", "Pierre bat ciseaux, ciseaux battent feuille, feuille bat pierre.", "Parfait pour départager qui commence un autre jeu !"] },
  { id: 'j23', nom: 'Le roi du silence', emoji: '🤐', cat: 'Calme', lieu: 'partout', ageMin: 4, ageMax: 12, joueurs: '2+', duree: 'libre', materiel: 'Aucun', but: 'Se taire le plus longtemps possible.', regles: ["Au signal, tout le monde doit se taire et rester calme.", "Le premier qui parle ou rit a perdu.", "Idéal pour un moment de calme… ou en voiture !"] },
  { id: 'j24', nom: 'Histoire à inventer', emoji: '📚', cat: 'Calme', lieu: 'int', ageMin: 6, ageMax: 12, joueurs: '3+', duree: '15 min', materiel: 'Aucun', but: 'Construire une histoire à plusieurs.', regles: ["Le premier dit une phrase pour commencer une histoire.", "Chacun ajoute une phrase à tour de rôle.", "On obtient une histoire farfelue et collective."] },
  { id: 'j25', nom: 'Le morpion', emoji: '⭕', cat: 'Papier-crayon', lieu: 'partout', ageMin: 5, ageMax: 12, joueurs: '2', duree: '5 min', materiel: 'Papier + crayon', but: 'Aligner 3 symboles.', regles: ["Trace une grille de 3×3 cases.", "Chacun pose à tour de rôle son symbole (O ou X).", "Le premier à aligner 3 symboles (ligne, colonne ou diagonale) gagne."] },
  { id: 'j26', nom: 'Le pendu', emoji: '🔤', cat: 'Papier-crayon', lieu: 'partout', ageMin: 6, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Papier + crayon', but: 'Deviner le mot lettre par lettre.', regles: ["Un joueur choisit un mot et trace un tiret par lettre.", "Les autres proposent des lettres ; les bonnes se placent, les mauvaises ajoutent un trait au pendu.", "Trouver le mot avant que le dessin du pendu soit complet."] },
  { id: 'j27', nom: 'Le petit bac', emoji: '🔡', cat: 'Papier-crayon', lieu: 'partout', ageMin: 7, ageMax: 12, joueurs: '2+', duree: '15 min', materiel: 'Papier + crayon', but: 'Trouver des mots par catégorie.', regles: ["Choisissez des catégories (prénom, animal, ville, objet…) et une lettre au hasard.", "Chacun écrit un mot par catégorie commençant par cette lettre, le plus vite possible.", "« Stop ! » dès que quelqu'un a fini. On compte les points."] },
  { id: 'j28', nom: 'Bataille navale', emoji: '🚢', cat: 'Papier-crayon', lieu: 'int', ageMin: 8, ageMax: 12, joueurs: '2', duree: '20 min', materiel: 'Papier + crayon', but: 'Couler les bateaux adverses.', regles: ["Chacun dessine 2 grilles et place ses bateaux en secret.", "À tour de rôle, on annonce une case (ex. B4) : « touché » ou « à l'eau ».", "Le premier à couler toute la flotte adverse gagne."] },
  { id: 'j29', nom: 'Points et carrés', emoji: '🔳', cat: 'Papier-crayon', lieu: 'partout', ageMin: 7, ageMax: 12, joueurs: '2', duree: '15 min', materiel: 'Papier + crayon', but: 'Fermer le plus de carrés.', regles: ["Dessine une grille de points. Chacun trace un trait entre deux points voisins.", "Fermer un carré = on le marque à son initiale et on rejoue.", "À la fin, celui qui a le plus de carrés gagne."] },
  { id: 'j30', nom: 'Cadavre exquis dessiné', emoji: '🖍️', cat: 'Créatif', lieu: 'int', ageMin: 5, ageMax: 12, joueurs: '3+', duree: '10 min', materiel: 'Papier + crayon', but: 'Dessiner un personnage à plusieurs.', regles: ["Le premier dessine une tête en haut de la feuille, puis la cache en pliant.", "Le suivant dessine le buste sans voir, plie, et ainsi de suite (jambes, pieds).", "On déplie : un personnage rigolo apparaît !"] },
  { id: 'j31', nom: 'La bataille (cartes)', emoji: '🃏', cat: 'Cartes', lieu: 'partout', ageMin: 4, ageMax: 10, joueurs: '2+', duree: '15 min', materiel: 'Un jeu de cartes', but: 'Remporter toutes les cartes.', regles: ["Distribuez toutes les cartes face cachée, en tas devant chacun.", "Chacun retourne sa carte du dessus : la plus forte remporte les deux.", "Cartes égales = « bataille ». Celui qui a tout gagné gagne."] },
  { id: 'j32', nom: 'Le pouilleux', emoji: '🐈', cat: 'Cartes', lieu: 'int', ageMin: 5, ageMax: 10, joueurs: '3+', duree: '15 min', materiel: 'Un jeu (retirer un valet)', but: 'Ne pas garder le valet seul.', regles: ["Retire un valet du jeu, distribue tout. Chacun jette ses paires.", "À tour de rôle, on pioche une carte chez le voisin pour former des paires.", "Celui qui reste avec le valet seul (le « pouilleux ») a perdu."] },
  { id: 'j33', nom: 'Le menteur', emoji: '🤥', cat: 'Cartes', lieu: 'int', ageMin: 7, ageMax: 12, joueurs: '3+', duree: '20 min', materiel: 'Un jeu de cartes', but: 'Se débarrasser de ses cartes en bluffant.', regles: ["Distribue tout. On pose des cartes face cachée en annonçant une valeur (vraie ou fausse).", "Si quelqu'un crie « menteur ! », on retourne : le menteur démasqué ramasse le tas, sinon c'est l'accusateur.", "Le premier sans cartes gagne."] },
  { id: 'j34', nom: 'Construire une cabane', emoji: '🏕️', cat: 'Créatif', lieu: 'partout', ageMin: 4, ageMax: 12, joueurs: '1+', duree: '30 min', materiel: 'Draps, coussins, chaises', but: 'Bâtir un repaire secret.', regles: ["Rassemble draps, coussins, chaises, une table.", "Tends les draps entre les meubles pour faire un toit.", "Aménage l'intérieur : coussins, lampe de poche, livres. C'est leur QG !"] },
  { id: 'j35', nom: 'Pâte à sel', emoji: '🧂', cat: 'Créatif', lieu: 'int', ageMin: 3, ageMax: 10, joueurs: '1+', duree: '30 min', materiel: 'Farine, sel, eau', but: 'Modeler des objets à faire sécher.', regles: ["Mélange 2 doses de farine, 1 de sel, 1 d'eau jusqu'à une pâte souple.", "Modèle des figurines, colliers, animaux…", "Fais sécher à l'air ou au four à basse température, puis peins."] },
  { id: 'j36', nom: 'Origami (la cocotte)', emoji: '🦢', cat: 'Créatif', lieu: 'int', ageMin: 6, ageMax: 12, joueurs: '1+', duree: '15 min', materiel: 'Une feuille carrée', but: 'Plier la cocotte à doigts.', regles: ["Plie une feuille carrée en deux diagonales, puis ramène les 4 coins au centre.", "Retourne et ramène encore les 4 coins. Glisse les doigts dessous.", "Écris des gages ou des couleurs dessous : un classique de la récré !"] },
  { id: 'j37', nom: 'Chasse au trésor', emoji: '🗺️', cat: 'Créatif', lieu: 'partout', ageMin: 5, ageMax: 12, joueurs: '1+', duree: '30 min', materiel: 'Papier (pour les indices)', but: 'Suivre les indices jusqu au trésor.', regles: ["Cache un « trésor » (goûter, petit jouet).", "Prépare une série d'indices qui mènent d'une cachette à la suivante.", "Donne le premier indice : à eux de résoudre la piste jusqu'au bout !"] },
  { id: 'j38', nom: 'Parcours de motricité', emoji: '🤸', cat: 'Mouvement', lieu: 'int', ageMin: 3, ageMax: 8, joueurs: '1+', duree: '20 min', materiel: 'Coussins, ruban adhésif', but: 'Franchir un parcours sans tomber.', regles: ["Crée un parcours : marcher sur une ligne de scotch, sauter de coussin en coussin, passer sous une chaise…", "Les enfants l'enchaînent comme des ninjas.", "Ajoute des défis : à reculons, à cloche-pied, en chronométrant."] },
  { id: 'j39', nom: "Théâtre d'ombres", emoji: '🌑', cat: 'Créatif', lieu: 'int', ageMin: 5, ageMax: 12, joueurs: '2+', duree: '20 min', materiel: 'Une lampe + un mur', but: 'Créer des ombres et raconter une histoire.', regles: ["Éteins la lumière, allume une lampe face à un mur blanc.", "Forme des animaux avec les mains (lapin, oiseau, loup…).", "Invente une petite histoire avec les ombres."] },
  { id: 'j40', nom: 'Le jeu des couleurs', emoji: '🌈', cat: 'Tout-petits', lieu: 'partout', ageMin: 3, ageMax: 6, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Toucher vite une couleur annoncée.', regles: ["Le meneur crie une couleur : « Rouge ! ».", "Tout le monde court toucher quelque chose de cette couleur.", "Le dernier (ou celui qui ne trouve pas) rejoue ou est éliminé."] },
  { id: 'j41', nom: 'Imiter les animaux', emoji: '🐘', cat: 'Tout-petits', lieu: 'partout', ageMin: 2, ageMax: 6, joueurs: '1+', duree: '10 min', materiel: 'Aucun', but: 'Bouger et crier comme les animaux.', regles: ["Nomme un animal : « le canard ! ».", "Les petits l'imitent (démarche et cri).", "Enchaîne les animaux de plus en plus vite : fous rires assurés."] },
  { id: 'j42', nom: 'Le drap qui vole', emoji: '🪂', cat: 'Tout-petits', lieu: 'partout', ageMin: 3, ageMax: 8, joueurs: '3+', duree: '10 min', materiel: 'Un grand drap', but: 'Faire voler le drap tous ensemble.', regles: ["Tout le monde tient les bords d'un grand drap.", "On le soulève très haut ensemble puis on le rabaisse (pose une balle légère dessus à faire sauter).", "Variante : un enfant passe dessous avant que le drap retombe."], variante: "Mettre un ballon de baudruche dessus et le faire rebondir sans le faire tomber." },
  { id: 'j43', nom: 'Le jeu des plaques', emoji: '🚗', cat: 'Trajet', lieu: 'partout', ageMin: 6, ageMax: 12, joueurs: '2+', duree: '15 min', materiel: 'Aucun', but: "Repérer des choses sur les plaques d'immatriculation.", regles: ["Choisis un défi : un chiffre (ex. le 7), une lettre de ton prénom, ou un numéro de département.", "Le premier à le repérer sur une plaque marque un point.", "Premier à 10 points gagné."] },
  { id: 'j44', nom: 'Je vois, je vois', emoji: '👀', cat: 'Trajet', lieu: 'partout', ageMin: 4, ageMax: 10, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: "Faire deviner ce qu'on voit.", regles: ["Un joueur dit « Je vois, je vois… quelque chose de rouge » (une couleur ou une forme).", "Les autres devinent l'objet visible.", "Celui qui trouve choisit à son tour."] },
  { id: 'j45', nom: 'Le compte des voitures', emoji: '🚙', cat: 'Trajet', lieu: 'partout', ageMin: 4, ageMax: 8, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Compter les voitures de sa couleur.', regles: ["Chacun choisit une couleur de voiture.", "On compte les voitures de sa couleur qu'on croise.", "Au bout de 5 minutes, le plus grand total gagne."] },
  { id: 'j46', nom: "L'abécédaire", emoji: '🔤', cat: 'Trajet', lieu: 'partout', ageMin: 6, ageMax: 12, joueurs: '2+', duree: '15 min', materiel: 'Aucun', but: 'Trouver un mot par lettre, de A à Z.', regles: ["Choisissez un thème (villes, animaux, prénoms…).", "À tour de rôle, trouvez un mot pour A, puis B, puis C…", "Si quelqu'un sèche 10 secondes, on passe au mot suivant."] },
  { id: 'j47', nom: 'Devine la chanson', emoji: '🎤', cat: 'Trajet', lieu: 'partout', ageMin: 6, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Reconnaître une chanson fredonnée.', regles: ["Un joueur fredonne une chanson sans les paroles.", "Les autres devinent le titre.", "Celui qui trouve fredonne à son tour."] },
  { id: 'j48', nom: 'Le jeu du contraire', emoji: '🔁', cat: 'Trajet', lieu: 'partout', ageMin: 5, ageMax: 10, joueurs: '2+', duree: '5 min', materiel: 'Aucun', but: 'Dire le contraire le plus vite.', regles: ["Un joueur dit un mot (grand, chaud, jour…).", "L'autre doit répondre le contraire le plus vite possible.", "Hésitation ou erreur = on inverse les rôles."] },
  { id: 'j49', nom: 'Le jeu des panneaux', emoji: '🛑', cat: 'Trajet', lieu: 'partout', ageMin: 6, ageMax: 11, joueurs: '2+', duree: '15 min', materiel: 'Aucun', but: 'Repérer et lire les panneaux.', regles: ["Chacun guette les panneaux le long de la route.", "Le premier à lire ou annoncer un panneau (ville, vitesse, danger) marque un point.", "Pour les petits : repérer une forme (rond, triangle, losange)."] },
  { id: 'j50', nom: 'Le portrait chinois', emoji: '🐉', cat: 'Trajet', lieu: 'partout', ageMin: 7, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Se décrire par des images.', regles: ["Une personne pense à quelqu'un (un proche, un personnage).", "Les autres demandent : « Si c'était un animal ? une couleur ? un plat ? »", "À partir des réponses imagées, ils devinent de qui il s'agit."] },
  { id: 'j51', nom: "L'élastique", emoji: '🦵', cat: 'Plein air', lieu: 'ext', ageMin: 6, ageMax: 12, joueurs: '2+', duree: '15 min', materiel: 'Un grand élastique', but: "Sauter des figures dans l'élastique.", regles: ["Deux joueurs tendent l'élastique autour de leurs chevilles.", "Le troisième enchaîne des figures de saut sans se tromper.", "On monte l'élastique (chevilles, genoux, cuisses) à chaque réussite."] },
  { id: 'j52', nom: 'La corde à sauter', emoji: '🪢', cat: 'Plein air', lieu: 'ext', ageMin: 5, ageMax: 12, joueurs: '1+', duree: '10 min', materiel: 'Une corde', but: 'Sauter en rythme.', regles: ["Saute seul, ou à deux qui tournent la corde pour un troisième.", "Récite une comptine en sautant, un saut par mot.", "Celui qui tient le plus longtemps sans s'emmêler gagne."] },
  { id: 'j53', nom: 'Quilles maison', emoji: '🎳', cat: 'Plein air', lieu: 'ext', ageMin: 5, ageMax: 12, joueurs: '2+', duree: '15 min', materiel: 'Bouteilles + une balle', but: 'Faire tomber les quilles.', regles: ["Aligne des bouteilles en plastique (un peu lestées d'eau) comme des quilles.", "Chacun lance une balle pour en faire tomber le plus possible.", "On compte les quilles tombées. Premier à 30 points."] },
  { id: 'j54', nom: "Le clin d'œil", emoji: '😉', cat: 'Sans matériel', lieu: 'int', ageMin: 8, ageMax: 12, joueurs: '5+', duree: '15 min', materiel: 'Aucun', but: "Se faire « éliminer » d'un clin d'œil.", regles: ["En secret, on désigne un « tueur » (par tirage).", "Le tueur fait un clin d'œil discret aux autres ; qui le reçoit « meurt » en comptant jusqu'à 3.", "Les autres doivent démasquer le tueur avant qu'il élimine tout le monde."] },
  { id: 'j55', nom: "Devine l'objet", emoji: '🤲', cat: 'Calme', lieu: 'int', ageMin: 4, ageMax: 10, joueurs: '2+', duree: '10 min', materiel: 'Des objets + un foulard', but: 'Reconnaître au toucher.', regles: ["Bande les yeux d'un joueur.", "Mets-lui un objet dans les mains.", "Il doit deviner ce que c'est rien qu'au toucher."] },
  { id: 'j56', nom: 'Memory maison', emoji: '🃏', cat: 'Calme', lieu: 'int', ageMin: 4, ageMax: 10, joueurs: '1+', duree: '15 min', materiel: "Paires d'objets ou cartes", but: 'Retrouver les paires.', regles: ["Dispose des paires d'objets (ou de cartes) face cachée.", "Retourne-en deux : si elles sont identiques, tu les gardes et tu rejoues.", "Celui qui a le plus de paires à la fin gagne."] },
  { id: 'j57', nom: 'Dessine sur mon dos', emoji: '✍️', cat: 'Calme', lieu: 'partout', ageMin: 5, ageMax: 12, joueurs: '2+', duree: '10 min', materiel: 'Aucun', but: 'Deviner un dessin tracé dans le dos.', regles: ["Trace une lettre, un chiffre ou une forme simple avec le doigt dans le dos de l'autre.", "Il doit deviner ce que tu as dessiné.", "On inverse les rôles."] },
  { id: 'j58', nom: 'Le jeu du goût', emoji: '👅', cat: 'Calme', lieu: 'int', ageMin: 4, ageMax: 10, joueurs: '2+', duree: '10 min', materiel: 'Petits aliments + foulard', but: 'Reconnaître un aliment les yeux fermés.', regles: ["Bande les yeux du joueur.", "Fais-lui goûter un petit morceau d'aliment.", "Il doit deviner ce que c'est. (Attention aux allergies !)"] },
  { id: 'j59', nom: 'Panier de chaussettes', emoji: '🧦', cat: 'Mouvement', lieu: 'int', ageMin: 3, ageMax: 10, joueurs: '1+', duree: '10 min', materiel: 'Chaussettes en boule + un panier', but: 'Viser le panier.', regles: ["Fais des boules avec des chaussettes (ou du papier).", "Place un panier ou un carton à quelques mètres.", "Chacun vise : le plus adroit gagne. Recule le panier pour corser le jeu."] },
  { id: 'j60', nom: 'Coucou-caché', emoji: '🫣', cat: 'Tout-petits', lieu: 'partout', ageMin: 1, ageMax: 4, joueurs: '1+', duree: '5 min', materiel: 'Aucun', but: 'Faire apparaître et disparaître son visage.', regles: ["Cache ton visage avec tes mains.", "Découvre-le d'un coup en disant « Coucou ! ».", "Le tout-petit adore anticiper le moment où tu réapparais."] }
];
function ageMatch(g, b) { if (b === 'tous') return true; const B = { petits: [3, 5], moyens: [6, 8], grands: [9, 12] }[b]; return g.ageMin <= B[1] && g.ageMax >= B[0]; }
function lieuMatch(g, l) { if (l === 'tous') return true; return g.lieu === l || g.lieu === 'partout'; }
function ageBadge(g) { return (g.ageMin <= 5 && g.ageMax >= 10) ? 'Tous âges' : g.ageMin + '-' + g.ageMax + ' ans'; }
function lieuBadge(g) { return { int: '🏠 Intérieur', ext: '🌳 Extérieur', partout: '🏠🌳 Partout' }[g.lieu]; }
function jeuxFiltres() { const f = jxSearch.toLowerCase().trim(); return JEUX.filter((g) => ageMatch(g, jxAge) && (jxLieu === 'voiture' ? g.cat === 'Trajet' : lieuMatch(g, jxLieu)) && (!jxFav || data.favJeux.includes(g.id)) && (!f || g.nom.toLowerCase().includes(f) || g.cat.toLowerCase().includes(f))); }
function gameRowsHtml() {
  const list = jeuxFiltres();
  if (!list.length) return `<div class="empty"><span class="e">🔍</span>Aucun jeu avec ces filtres. Élargis la recherche !</div>`;
  return list.map((g) => { const fav = data.favJeux.includes(g.id); return `<div class="item recipe" data-jid="${g.id}"><span class="label">${g.emoji} ${esc(g.nom)}<br><span class="muted" style="font-size:12px">${esc(g.cat)} · ${esc(ageBadge(g))}</span></span><button class="rfav" data-jfav="${g.id}">${fav ? '❤️' : '🤍'}</button><span class="go">›</span></div>`; }).join('');
}
function renderJeux(el) {
  const seg = `<div class="seg"><button data-jmode="jeux" class="${jeuxMode === 'jeux' ? 'on' : ''}">🎲 Jeux</button><button data-jmode="sorties" class="${jeuxMode === 'sorties' ? 'on' : ''}">🌳 Sorties</button></div>`;
  const lieux = [['tous', 'Partout'], ['int', '🏠 Intérieur'], ['ext', '🌳 Extérieur']];
  if (jeuxMode === 'sorties') {
    el.innerHTML = seg + `
      <button class="btn btn-accent btn-block" id="sx-random" style="margin-bottom:14px">🎲 Une idée de sortie au hasard</button>
      <input class="input" id="jx-search" placeholder="Rechercher une sortie…" autocomplete="off" value="${esc(jxSearch)}" />
      <div class="chips" style="margin-top:10px">${lieux.map((c) => `<button class="chip ${jxLieu === c[0] ? 'on' : ''}" data-lieu="${c[0]}">${c[1]}</button>`).join('')}<button class="chip ${jxFav ? 'on' : ''}" data-favtoggle>❤️ Favoris</button></div>
      <p class="muted" style="margin:12px 2px 0">${sortiesFiltres().length} idée(s) de sortie</p>
      <div class="list" id="jx-list" style="margin-top:6px">${sortieRowsHtml()}</div>`;
    el.querySelectorAll('[data-jmode]').forEach((b) => b.addEventListener('click', () => { jeuxMode = b.dataset.jmode; renderJeux(el); }));
    el.querySelector('#sx-random').addEventListener('click', () => { const p = sortiesFiltres(); if (!p.length) { toast('Aucune sortie'); return; } openSortieDetail(p[Math.floor(Math.random() * p.length)].id); });
    el.querySelector('#jx-search').addEventListener('input', (e) => { jxSearch = e.target.value; el.querySelector('#jx-list').innerHTML = sortieRowsHtml(); wireSorties(el); });
    el.querySelectorAll('[data-lieu]').forEach((b) => b.addEventListener('click', () => { jxLieu = b.dataset.lieu; renderJeux(el); }));
    el.querySelector('[data-favtoggle]').addEventListener('click', () => { jxFav = !jxFav; renderJeux(el); });
    wireSorties(el);
    return;
  }
  const ages = [['tous', 'Tous âges'], ['petits', '3-5 ans'], ['moyens', '6-8 ans'], ['grands', '9 ans +']];
  el.innerHTML = seg + `
    <button class="btn btn-accent btn-block" id="jx-random" style="margin-bottom:14px">🎲 Propose-moi un jeu au hasard</button>
    <input class="input" id="jx-search" placeholder="Rechercher un jeu…" autocomplete="off" value="${esc(jxSearch)}" />
    <div class="chips" style="margin-top:10px">${ages.map((c) => `<button class="chip ${jxAge === c[0] ? 'on' : ''}" data-age="${c[0]}">${c[1]}</button>`).join('')}</div>
    <div class="chips" style="margin-top:8px">${lieux.map((c) => `<button class="chip ${jxLieu === c[0] ? 'on' : ''}" data-lieu="${c[0]}">${c[1]}</button>`).join('')}<button class="chip ${jxLieu === 'voiture' ? 'on' : ''}" data-lieu="voiture">🚗 Voiture</button><button class="chip ${jxFav ? 'on' : ''}" data-favtoggle>❤️ Favoris</button></div>
    <p class="muted" style="margin:12px 2px 0">${jeuxFiltres().length} jeu(x) — touche pour voir les règles</p>
    <div class="list" id="jx-list" style="margin-top:6px">${gameRowsHtml()}</div>`;
  el.querySelectorAll('[data-jmode]').forEach((b) => b.addEventListener('click', () => { jeuxMode = b.dataset.jmode; renderJeux(el); }));
  el.querySelector('#jx-random').addEventListener('click', randomGame);
  el.querySelector('#jx-search').addEventListener('input', (e) => { jxSearch = e.target.value; el.querySelector('#jx-list').innerHTML = gameRowsHtml(); wireJeux(el); });
  el.querySelectorAll('[data-age]').forEach((b) => b.addEventListener('click', () => { jxAge = b.dataset.age; renderJeux(el); }));
  el.querySelectorAll('[data-lieu]').forEach((b) => b.addEventListener('click', () => { jxLieu = b.dataset.lieu; renderJeux(el); }));
  el.querySelector('[data-favtoggle]').addEventListener('click', () => { jxFav = !jxFav; renderJeux(el); });
  wireJeux(el);
}
function wireJeux(scope) {
  scope.querySelectorAll('[data-jid]').forEach((row) => { row.addEventListener('click', () => openGameDetail(row.dataset.jid)); const fb = row.querySelector('[data-jfav]'); if (fb) fb.addEventListener('click', (e) => { e.stopPropagation(); toggleFavJeu(row.dataset.jfav); scope.querySelector('#jx-list').innerHTML = gameRowsHtml(); wireJeux(scope); }); });
}
function randomGame() { const pool = jeuxFiltres(); if (!pool.length) { toast('Aucun jeu avec ces filtres'); return; } openGameDetail(pool[Math.floor(Math.random() * pool.length)].id); }
function toggleFavJeu(id) { const i = data.favJeux.indexOf(id); if (i >= 0) data.favJeux.splice(i, 1); else data.favJeux.push(id); save(); }
function openGameDetail(id) {
  const g = JEUX.find((x) => x.id === id); if (!g) return;
  closeOverlay();
  const fav = data.favJeux.includes(g.id);
  const badges = [ageBadge(g), lieuBadge(g), '👥 ' + g.joueurs, '⏱️ ' + g.duree, '🎒 ' + g.materiel];
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>${g.emoji} ${esc(g.nom)}</h2></div>
    <div class="overlay-body">
      <div class="badges">${badges.map((b) => `<span class="jbadge">${esc(b)}</span>`).join('')}</div>
      ${g.but ? `<p class="jbut">🎯 ${esc(g.but)}</p>` : ''}
      <div class="section-title">Comment jouer</div>
      <div class="card"><ol class="steps">${g.regles.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      ${g.variante ? `<div class="section-title">Variante</div><div class="card"><p style="margin:0">${esc(g.variante)}</p></div>` : ''}
      <div class="btn-row" style="margin-top:6px"><button class="btn" style="flex:1" id="jd-fav">${fav ? '❤️ Favori' : '🤍 Favori'}</button><button class="btn btn-accent" style="flex:1" id="jd-other">🎲 Un autre</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#jd-fav').addEventListener('click', () => { toggleFavJeu(g.id); openGameDetail(g.id); });
  ov.querySelector('#jd-other').addEventListener('click', randomGame);
}

/* ============================================================
   v10 : le Guide du parent (savoir-faire, urgences, repères…)
   ============================================================ */
const FICHES = [
  { id: 'f1', nom: 'Faire une machine à laver', emoji: '🧺', etapes: ["Trie le linge : blanc, couleur et foncé séparés.", "Vide les poches et ferme les fermetures éclair.", "Mets la lessive (un bouchon) dans le bac du milieu.", "Programme : 30°C au quotidien, 40°C pour draps/serviettes, 60°C pour les torchons.", "Étends vite après la fin du cycle pour éviter les mauvaises odeurs."] },
  { id: 'f2', nom: 'Étendre et plier le linge', emoji: '👕', etapes: ["Secoue chaque vêtement avant d'étendre : il y aura moins de plis.", "Suspends les hauts par le bas ou sur cintre.", "Plie une fois sec : t-shirts en trois, pantalons en deux.", "Range debout dans le tiroir : tu vois tout d'un coup d'œil."] },
  { id: 'f3', nom: 'Enlever une tache', emoji: '🧴', etapes: ["Agis vite et à l'eau FROIDE (le chaud fixe la tache).", "Tache de gras (sauce, beurre) : un peu de liquide vaisselle, frotte doucement.", "Fruits ou herbe : vinaigre blanc ou jus de citron.", "Sang ou chocolat : eau froide et savon, jamais d'eau chaude.", "Lave ensuite le vêtement normalement."] },
  { id: 'f4', nom: 'Recoudre un bouton', emoji: '🧵', etapes: ["Enfile l'aiguille et fais un nœud au bout du fil.", "Pique de dessous le tissu, à travers un trou du bouton.", "Fais 5 à 6 allers-retours dans les trous du bouton.", "Termine par 2-3 petits points sous le tissu, puis coupe le fil."] },
  { id: 'f5', nom: 'Le ménage essentiel', emoji: '🧹', etapes: ["Range d'abord (ramasse ce qui traîne).", "Fais la poussière du haut vers le bas.", "Aspire ou balaie, puis passe la serpillière sur les sols durs.", "Cuisine et WC : une lingette désinfectante régulièrement.", "Astuce : 15 min par jour valent mieux qu'une grosse corvée le week-end."] },
  { id: 'f6', nom: 'Déboucher un évier', emoji: '🚰', etapes: ["Retire les déchets visibles à la main.", "Verse de l'eau bouillante dans le trou.", "Si ça résiste : bicarbonate + vinaigre blanc, attends 15 min, rince à l'eau chaude.", "Sinon une ventouse. En dernier recours, un furet."] },
  { id: 'f7', nom: 'Cuire pâtes et riz', emoji: '🍝', etapes: ["Pâtes : grande casserole d'eau bouillante salée, 8 à 11 min (voir paquet), puis égoutte.", "Riz : 1 volume de riz pour 2 d'eau salée, couvre, feu doux 10-12 min jusqu'à absorption.", "Quantité : environ 80 g de cru par adulte, 50 g par enfant."] },
  { id: 'f8', nom: 'Cuire un œuf', emoji: '🥚', etapes: ["À la coque : 3 min dans l'eau bouillante.", "Mollet : 6 min. Dur : 9 à 10 min.", "Au plat : à la poêle avec un peu d'huile, 2 à 3 min.", "Plonge les œufs durs dans l'eau froide : ils s'écalent plus facilement."] },
  { id: 'f9', nom: 'Repasser sans stress', emoji: '🔥', etapes: ["Repasse le linge légèrement humide, ou avec la vapeur.", "Température : chaud pour le coton, doux pour le synthétique (vérifie l'étiquette).", "Commence par les cols et les manches.", "Astuce : plie le linge dès la sortie de machine, beaucoup n'auront pas besoin de repassage."] },
  { id: 'f10', nom: 'Gérer les poubelles & le tri', emoji: '♻️', etapes: ["Bac jaune : emballages, plastiques, cartons, métal.", "Verre : dans le conteneur à part.", "Ordures ménagères : tout le reste.", "Sors les poubelles la veille du ramassage (note le jour dans tes rappels)."] },
  { id: 'f11', nom: 'Plier un drap-housse', emoji: '🛏️', etapes: ["Glisse tes mains dans deux coins voisins (les élastiques), puis retourne-en un sur l'autre.", "Fais pareil avec les deux autres coins : tu obtiens un seul paquet de 4 coins.", "Pose à plat, rentre les bords arrondis pour former un rectangle.", "Plie en trois : c'est net et compact."] },
  { id: 'f12', nom: 'Changer les draps & faire le lit', emoji: '🛌', etapes: ["Drap-housse : enfile bien les 4 coins du matelas.", "Housse de couette : retourne-la, attrape les 2 coins du fond + ceux de la couette, puis secoue pour qu'elle se déroule.", "Change les draps toutes les 1 à 2 semaines (plus souvent en cas de maladie).", "Astuce : fais participer les enfants, c'est plus rapide à deux."] },
  { id: 'f13', nom: 'Détartrer cafetière & bouilloire', emoji: '☕', etapes: ["Remplis de moitié eau, moitié vinaigre blanc.", "Fais chauffer (ou lance un cycle) et laisse agir 15 à 30 min.", "Vide, puis rince 2 fois à l'eau claire.", "À faire environ une fois par mois selon le calcaire de ta région."] },
  { id: 'f14', nom: 'Congeler & décongeler', emoji: '🧊', etapes: ["Congèle en portions, dans des boîtes ou sachets datés.", "Se congèle bien : plats mijotés, soupes, viande, pain, restes.", "Évite : œufs en coquille, crudités, pommes de terre cuites.", "Décongèle au frigo la veille, jamais à l'air libre. Ne recongèle jamais un produit décongelé."] },
  { id: 'f15', nom: 'Bien ranger le frigo', emoji: '🥶', etapes: ["En haut : restes et produits entamés (zone la moins froide).", "Au milieu : laitages et œufs.", "En bas (le plus froid) : viande et poisson, à manger vite.", "Bac : fruits et légumes. Porte : boissons, condiments, beurre."] },
  { id: 'f16', nom: 'Faire un ourlet rapide', emoji: '✂️', etapes: ["Replie le bas du pantalon à la hauteur voulue et épingle.", "Couds à petits points discrets, OU utilise du fil thermocollant (ourlet sans couture, au fer à repasser).", "Repasse pour bien marquer le pli."] },
  { id: 'f17', nom: 'Repasser une chemise', emoji: '👔', etapes: ["Commence par le col, à plat, des deux côtés.", "Puis les poignets et les manches.", "Ensuite le dos, et les devants autour des boutons.", "Suspends-la aussitôt sur un cintre pour garder le résultat."] },
  { id: 'f18', nom: 'Vitres sans traces', emoji: '🪟', etapes: ["Mélange de l'eau + un peu de vinaigre blanc dans un vaporisateur.", "Essuie avec un chiffon microfibre (ou du papier journal).", "Fais des mouvements en Z, pas en rond.", "Évite le plein soleil : ça sèche trop vite et laisse des traces."] },
  { id: 'f19', nom: 'Cuisiner les restes (anti-gaspi)', emoji: '♻️', etapes: ["Légumes cuits → soupe, omelette, gratin.", "Pain rassis → pain perdu, croûtons, chapelure.", "Riz ou pâtes → poêlée, gratin, salade.", "Viande → hachis, sandwich, riz cantonais. Vérifie toujours l'odeur et l'aspect avant."] },
  { id: 'f20', nom: 'Nettoyer la salle de bain', emoji: '🛁', etapes: ["Vaporise un produit sur lavabo, douche et baignoire ; laisse agir 5 min.", "Frotte, rince, essuie.", "WC : produit sous le rebord, brosse, tire la chasse.", "Termine par le sol et le miroir. Une fois par semaine suffit avec un petit entretien quotidien."] },
  { id: 'f21', nom: 'Goûters & petits-déj malins', emoji: '🍎', etapes: ["Petit-déj équilibré : un produit céréalier (pain, céréales) + un laitage + un fruit + à boire.", "Goûter simple : un fruit + du pain ou des biscuits, ou un yaourt + une compote.", "Ne remplis pas le placard de sucreries : tu n'achètes que ce que tu veux qu'ils mangent.", "Prépare des portions à l'avance (fruits coupés, gourdes)."] },
  { id: 'f22', nom: 'Le sac de piscine / sport', emoji: '🏊', etapes: ["Piscine : maillot + bonnet + lunettes. Sport : tenue + baskets.", "Dans tous les cas : serviette, gourde, un en-cas.", "Ajoute un sac plastique pour le linge mouillé.", "Astuce : garde un sac « prêt » avec l'essentiel pour ne rien oublier."] }
];
const URGENCES = [
  { emoji: '🌡️', titre: 'Fièvre', conseils: ["Découvre l'enfant, fais-le boire souvent, aère la pièce.", "Tu peux donner du paracétamol selon son poids (lis bien la notice).", "Appelle le médecin si la fièvre dure plus de 48h, si l'enfant a moins de 3 mois, ou s'il est très abattu."] },
  { emoji: '🤕', titre: 'Chute ou bosse', conseils: ["Applique du froid (poche de glace dans un linge) 10 min.", "Surveille l'enfant dans les heures qui suivent.", "Appelle le 15 en cas de perte de connaissance, vomissements répétés ou comportement anormal."] },
  { emoji: '🤢', titre: 'Vomissements / diarrhée', conseils: ["Fais boire par petites gorgées, souvent (eau, solution de réhydratation).", "Reprends l'alimentation doucement : riz, banane, compote.", "Consulte si ça dure plus de 24-48h, s'il y a du sang, ou des signes de déshydratation (plus de pipi, grande fatigue)."] },
  { emoji: '🩸', titre: 'Coupure / saignement', conseils: ["Nettoie à l'eau et au savon, désinfecte, mets un pansement.", "Comprime 5 à 10 min si ça saigne.", "Consulte si la plaie est profonde, qu'elle bâille, ou qu'elle est très sale."] },
  { emoji: '🔥', titre: 'Brûlure légère', conseils: ["Passe sous l'eau froide pendant 15 min, tout de suite.", "Ne perce pas les cloques, couvre d'un linge propre.", "Appelle le 15 si la brûlure est étendue, au visage, ou avec de grosses cloques."] },
  { emoji: '😮‍💨', titre: 'Étouffement', conseils: ["S'il tousse, laisse-le tousser, n'interviens pas.", "S'il ne peut plus respirer ni parler : 5 tapes dans le dos, puis compressions (méthode adaptée à son âge).", "Fais appeler le 15 ou le 112 IMMÉDIATEMENT."] },
  { emoji: '🐝', titre: 'Réaction allergique', conseils: ["Simples rougeurs ou démangeaisons : surveille.", "Gonflement du visage/lèvres ou difficulté à respirer : appelle le 15 IMMÉDIATEMENT.", "Si un traitement d'urgence a été prescrit (stylo auto-injecteur), utilise-le."] }
];
const REPERES = [
  { titre: '3 à 5 ans', emoji: '🧒', lignes: [["😴 Sommeil", "10 à 13h par nuit, parfois encore une sieste. Coucher régulier vers 20h."], ["📱 Écrans", "Le moins possible (max ~30 min/jour). Jamais le matin, pendant les repas, ni avant le coucher."], ["🍽️ Repas", "4 temps (matin, midi, goûter, soir). Petites portions : il régule son appétit, ne le force pas."], ["🧦 Autonomie", "S'habiller avec un peu d'aide, ranger ses jouets, mettre la table, se laver les mains."]] },
  { titre: '6 à 11 ans', emoji: '🧑', lignes: [["😴 Sommeil", "9 à 11h par nuit. Coucher régulier, pas d'écran dans la chambre le soir."], ["📱 Écrans", "Environ 1h/jour en semaine, contenu adapté à l'âge, dans une pièce commune."], ["🍽️ Repas", "3 repas + un goûter, variés. Implique-le dans la cuisine."], ["🎒 Autonomie", "Se laver seul, faire ses devoirs, préparer son cartable, aider aux tâches (table, tri du linge)."]] }
];
const RITUELS = [
  ["🌹", "Le rose & épine", "Au dîner, chacun raconte son meilleur moment (rose) et son moins bon (épine) de la journée."],
  ["📖", "L'histoire du soir", "Un livre, blotti dans le lit : le rituel anti-cauchemar, plein de câlins."],
  ["💌", "Le petit mot", "Glisse un mot doux dans le cartable ou la boîte à goûter."],
  ["🍕", "Vendredi pizza-film", "Une soirée détente attendue toute la semaine."],
  ["👨‍🍳", "On cuisine ensemble", "Le week-end, ils choisissent et préparent un plat avec toi."],
  ["🗣️", "Le conseil de famille", "15 min par semaine pour décider ensemble (sorties, règles, petits soucis)."],
  ["🎲", "Le moment rien qu'à nous", "Un jeu tous les trois, sans écran ni téléphone."],
  ["🌅", "Le réveil tout doux", "5 min de câlin avant de se lever : la journée démarre mieux."]
];
const CONSEILS = [
  "Fait, c'est mieux que parfait. Tes enfants veulent un papa présent, pas parfait.",
  "Prépare les affaires du lendemain le soir : le matin sera bien plus calme.",
  "Mange à heure fixe : les enfants sont rassurés par les repères.",
  "Accepte le désordre parfois. Le lien passe avant le rangement.",
  "Un repas simple + un câlin valent mieux qu'un grand plat dans l'énervement.",
  "Prends 10 min pour toi quand ils dorment. Tu n'es utile que reposé.",
  "Une chose à la fois. Tu n'es pas obligé de tout réussir aujourd'hui.",
  "Demande de l'aide : famille, amis, autres parents. Ce n'est pas un échec.",
  "Félicite-toi d'une chose chaque soir. Tu fais déjà énormément.",
  "Écoute avant de réagir : « raconte-moi » désamorce bien des crises.",
  "Garde le même rythme dans tes deux semaines : repas, coucher, règles.",
  "Le batch cooking du dimanche te sauve toute la semaine.",
  "Range 5 min avec eux comme un jeu : à qui ramasse le plus vite !",
  "Une routine affichée évite de répéter dix fois la même chose.",
  "En cas de crise, respire. Ton calme calme l'enfant.",
  "Le rangement attendra : 10 min de jeu avec eux valent de l'or.",
  "Cuisine en double et congèle : un dîner d'avance, c'est un soir de répit.",
  "Affiche le menu de la semaine : fini le « on mange quoi ce soir ? ».",
  "Même heure de coucher = enfant reposé = moins de crises le lendemain.",
  "Limite tes propres écrans devant eux : ils copient tout ce que tu fais.",
  "Un « non » dit calmement vaut mieux que dix « non » criés.",
  "Le matin, commence par un petit plaisir : un bon petit-déj, une blague.",
  "Tu as le droit de t'ennuyer avec eux : ils n'ont pas besoin d'animation non-stop.",
  "Range AVEC eux : ça leur apprend, et tu n'es plus seul à porter la maison.",
  "Note tout dans l'appli plutôt que dans ta tête : ta tête mérite du repos.",
  "Le dimanche soir, prépare la semaine en 10 min : tu te remercieras.",
  "À table, sans téléphone : c'est souvent le meilleur moment de la journée.",
  "Garde une activité rien que pour toi : un parent épanoui est un meilleur parent.",
  "Les bêtises font partie de l'enfance. Respire avant de gronder.",
  "Dis-leur que tu les aimes, surtout les jours difficiles.",
  "Une journée ratée n'efface pas tout ce que tu réussis. Demain est un autre jour."
];
const SAISONS = {
  'Rentrée scolaire': ['Cartable', 'Trousse', 'Cahiers', 'Stylos & crayons', 'Règle, gomme, taille-crayon', 'Agenda', 'Tenue de sport', 'Chaussons', 'Étiquettes au nom', 'Certificat médical / assurance'],
  'Été': ['Maillots de bain', 'Crème solaire', 'Casquettes', 'Lunettes de soleil', 'Sandales', 'Brassards', 'Anti-moustiques', 'Gourdes'],
  'Hiver': ['Manteaux chauds', 'Bonnets, gants, écharpes', 'Bottes', 'Pulls', 'Collants', 'Baume à lèvres']
};
function seedPharmacie() { return ['Thermomètre', 'Paracétamol enfant (sirop)', 'Pansements', 'Désinfectant / antiseptique', 'Sérum physiologique', 'Compresses stériles', 'Sparadrap', 'Pince à épiler', 'Crème pour brûlures', 'Crème anti-piqûres', 'Solution de réhydratation (SRO)', 'Paracétamol adulte'].map((n) => ({ id: uid(), nom: n, fait: false })); }
function seedMenage() { return [["Vaisselle / lave-vaisselle", "Tous les jours"], ["Sortir les poubelles", "1×/semaine"], ["Lessive", "2×/semaine"], ["Passer l'aspirateur", "1×/semaine"], ["Salle de bain & WC", "1×/semaine"], ["Changer les draps", "Toutes les 2 sem."], ["Ranger les chambres", "1×/semaine"], ["Nettoyer le frigo", "1×/mois"]].map(([t, f]) => ({ id: uid(), texte: t, freq: f, fait: false })); }
function conseilDuJour() { const start = new Date(new Date().getFullYear(), 0, 0); const day = Math.floor((new Date() - start) / 86400000); return CONSEILS[day % CONSEILS.length]; }

const SITUATIONS = [
  { emoji: '😡', titre: 'Il fait une crise / une colère', conseils: ["Garde ton calme : ta tension nourrit la sienne.", "Mets des mots sur son émotion : « tu es très en colère ».", "Propose un endroit pour se calmer, reste disponible sans céder sur la règle.", "Une fois apaisé, reparlez de ce qui s'est passé. On accueille l'émotion, pas forcément le comportement."] },
  { emoji: '🍽️', titre: 'Il refuse de manger', conseils: ["Ne force pas, ne transforme pas le repas en bataille.", "Propose sans commenter ; représente l'aliment plus tard, sans pression.", "Implique-le (choisir, cuisiner) et sers de petites portions.", "Un enfant en bonne santé régule son appétit : fais-lui confiance."] },
  { emoji: '🌙', titre: 'Cauchemars / il ne veut pas dormir', conseils: ["Garde un rituel du soir stable et calme (pas d'écran avant).", "Rassure sans t'éterniser : veilleuse, doudou, porte entrouverte.", "Après un cauchemar : réconforte brièvement puis recouche-le dans son lit.", "La régularité des horaires est ta meilleure alliée."] },
  { emoji: '👊', titre: 'Disputes entre frère et sœur', conseils: ["N'arbitre pas tout : laisse-les régler les petits conflits.", "Interviens en cas de danger : sépare sans prendre parti.", "Nomme le besoin de chacun et cherchez une solution ensemble.", "Évite les comparaisons : chacun a son moment d'attention."] },
  { emoji: '📱', titre: 'Il réclame les écrans', conseils: ["Fixe des règles claires et constantes (quand, combien).", "Annonce la fin : « encore 5 min, puis on éteint ».", "Propose une alternative concrète (un jeu, une sortie — onglet Jeux !).", "Montre l'exemple en limitant aussi les tiens."] },
  { emoji: '😢', titre: 'Il est triste, la séparation est dure', conseils: ["Accueille ses émotions sans les minimiser : « c'est normal d'être triste ».", "Rassure : les deux parents l'aiment, ce n'est pas sa faute.", "Garde des repères stables dans tes deux semaines.", "Si la tristesse dure ou s'aggrave, parles-en à un professionnel."] },
  { emoji: '🎒', titre: "Premier jour d'école / nouveauté", conseils: ["Parles-en avant, positivement, sans dramatiser.", "Préparez ensemble la veille (affaires, vêtements).", "Un au revoir court et confiant vaut mieux qu'un long câlin anxieux.", "Prévois un moment rien qu'à vous au retour pour raconter la journée."] },
  { emoji: '🚽', titre: 'Pipi au lit, petits accidents', conseils: ["Reste bienveillant : ce n'est ni de la paresse ni de la provocation.", "Pas de honte ni de punition, ça empire les choses.", "Limite les boissons le soir, passage aux toilettes avant le lit.", "Si ça persiste après 5-6 ans, parles-en au médecin."] },
  { emoji: '🤒', titre: 'Il est malade un jour de garde', conseils: ["Prends sa température, fais-le boire, repos.", "Préviens l'autre parent (cahier de liaison) et l'école.", "Garde le carnet de santé à portée (allergies, traitements).", "En cas de doute → rubrique « En cas de pépin », ou appelle le 15."] },
  { emoji: '🗣️', titre: '« Je veux maman », « pas chez toi »', conseils: ["Ne le prends pas contre toi : c'est l'absence qu'il exprime, pas un rejet.", "Valide : « tu aimerais voir maman, c'est normal ».", "Propose un lien (un dessin, un appel si c'est possible).", "Puis recentrez-vous sur un moment positif ensemble."] }
];
const PHRASES = [
  ["Il traîne le matin", "« Dépêche-toi, tu es toujours en retard ! »", "« Qu'est-ce qu'il te reste à faire avant de partir ? »"],
  ["Il pleure", "« Arrête de pleurer ! »", "« Je vois que tu es triste. Raconte-moi. »"],
  ["Il a fait une bêtise", "« Tu es insupportable ! »", "« Ce que tu as fait n'est pas ok. Comment on répare ? »"],
  ["Il ne range pas", "« Range ta chambre, c'est un dépotoir ! »", "« On range ensemble 5 min ? On commence par les livres. »"],
  ["Ils se disputent", "« Arrêtez tous les deux ! »", "« Chacun son tour me dit ce qui s'est passé. »"],
  ["Il a peur", "« Il n'y a pas de raison d'avoir peur. »", "« Je suis là. Qu'est-ce qui te fait peur ? »"],
  ["Tu es à bout", "« Tu me rends fou ! »", "« J'ai besoin d'une minute pour me calmer, je reviens. »"],
  ["Il réussit quelque chose", "(un simple « c'est bien »)", "« Tu as travaillé dur, je suis fier de toi. »"],
  ["Au coucher", "« Au lit, tout de suite ! »", "« C'est l'heure du câlin et de l'histoire. »"],
  ["Il dit non", "« Parce que c'est comme ça ! »", "« Je comprends que tu n'aies pas envie. C'est l'heure quand même. »"]
];
const DEMARCHES = [
  { emoji: '⚖️', titre: 'Garde & pension alimentaire', desc: "Par accord parental homologué ou via le juge aux affaires familiales (JAF). Garde toujours une trace écrite." },
  { emoji: '💶', titre: 'CAF / allocations', desc: "Signale la séparation et la garde alternée : les allocations peuvent être partagées. Renseigne-toi sur l'ASF si la pension n'est pas versée." },
  { emoji: '🏥', titre: 'Mutuelle & Sécurité sociale', desc: "Tu peux rattacher les enfants à ta mutuelle/sécu en plus de l'autre parent. Demande une carte Vitale à jour." },
  { emoji: '🏫', titre: 'École', desc: "Donne ta nouvelle adresse et demande à recevoir aussi les infos : les deux parents y ont droit. Vérifie cantine et périscolaire." },
  { emoji: '🧾', titre: 'Impôts', desc: "En garde alternée, les enfants comptent en principe pour une demi-part chez chaque parent. Pense à le déclarer." },
  { emoji: '🏠', titre: 'Logement & aides', desc: "Tes aides (APL…) peuvent évoluer avec la nouvelle situation. Vérifie auprès de la CAF." },
  { emoji: '📝', titre: 'Papiers à garder', desc: "Jugement, accord de garde, carnets de santé, livret de famille : range-les et fais des copies." }
];
const RESSOURCES = [
  { nom: 'Enfance en danger', desc: "Écoute pour tout enfant en danger ou en difficulté. Gratuit, 24h/24.", tel: '119', telLabel: '119' },
  { nom: 'Médecin de garde', desc: "Quand ton médecin est fermé (soir, week-end).", tel: '116117', telLabel: '116 117' },
  { nom: 'Net Écoute', desc: "Écrans, harcèlement en ligne, réseaux.", tel: '3018', telLabel: '3018' },
  { nom: 'CAF', desc: "Allocations, garde alternée, aides.", tel: '3230', telLabel: '3230' },
  { nom: 'Médiation familiale', desc: "Pour mieux dialoguer avec l'autre parent : renseigne-toi en mairie, à la CAF ou au tribunal." },
  { nom: 'Soutien à la parentalité', desc: "Maisons des familles, lieux d'accueil parents-enfants, associations locales : ta mairie ou la CAF peut t'orienter." },
  { nom: 'Ton médecin ou un psy', desc: "Coup de mou, épuisement, tristesse qui dure : en parler est essentiel. N'attends pas d'être au fond." }
];
const SOINTOI = [
  "Tu ne peux pas bien t'occuper d'eux si tu t'épuises. Te reposer est utile à tout le monde.",
  "Garde un moment par semaine rien que pour toi (sport, ami, ou ne rien faire).",
  "Mange et dors correctement : c'est la base, même quand c'est la course.",
  "Parle de ce que tu vis : un ami, ta famille, un autre parent, un pro. Tu n'es pas seul.",
  "Baisse tes exigences les jours durs. « Assez bien » suffit largement.",
  "Le soir, repense à 3 choses qui ont été ok aujourd'hui, même petites.",
  "Demander de l'aide n'est pas un échec, c'est une preuve de force.",
  "Prends une vraie pause repas, assis, même 10 minutes.",
  "Sors prendre l'air chaque jour, même 5 minutes : ça remet les idées en place.",
  "Couche-toi un peu plus tôt une fois cette semaine. Le sommeil répare tout.",
  "Dis « non » sans culpabiliser quand tu es déjà débordé.",
  "Bouge un peu : une marche, des étirements. Le corps soulage la tête.",
  "Coupe les notifications le soir : ta soirée t'appartient.",
  "Appelle un ami, vois du monde. Le lien recharge les batteries.",
  "Pardonne-toi tes journées « moyennes ». Tu fais de ton mieux, et c'est déjà beaucoup."
];
const DEFIS = [
  "Instaure le rituel du « rose & épine » à un dîner cette semaine.",
  "Prépare les affaires du lendemain chaque soir pendant une semaine.",
  "Planifie 3 dîners à l'avance et génère la liste de courses.",
  "Range 5 min avec les enfants, comme un jeu, chaque soir.",
  "Coupe les écrans (les tiens aussi) 30 min avant le coucher.",
  "Marque tes prochains jours de garde dans le calendrier.",
  "Cuisine une nouvelle recette avec eux ce week-end.",
  "Fais une sortie de la liste « Sorties » cette semaine.",
  "Prends un vrai moment rien que pour toi cette semaine.",
  "Mets à jour le carnet de santé : allergies, tailles, médecin."
];
function defiSemaine() { const start = new Date(new Date().getFullYear(), 0, 1); const week = Math.floor((new Date() - start) / (7 * 86400000)); return DEFIS[week % DEFIS.length]; }
function openSituations() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🧠 Que faire quand…</h2></div><div class="overlay-body">
    ${SITUATIONS.map((s) => `<div class="section-title">${s.emoji} ${esc(s.titre)}</div><div class="card"><ul class="steps">${s.conseils.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`).join('')}
    <p class="muted" style="text-align:center;font-size:12px">Des pistes générales — chaque enfant est unique, fie-toi aussi à ton ressenti.</p></div>`;
  document.body.appendChild(ov); ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openPhrases() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>💬 Phrases qui aident</h2></div><div class="overlay-body">
    <p class="muted" style="margin:0 2px 12px">Les mots comptent. Voici des reformulations qui désamorcent.</p>
    ${PHRASES.map(([s, a, b]) => `<div class="card"><div class="muted" style="font-size:12px;margin-bottom:6px">${esc(s)}</div><p style="margin:0 0 6px">❌ <span style="color:var(--danger)">${esc(a)}</span></p><p style="margin:0">✅ <b>${esc(b)}</b></p></div>`).join('')}</div>`;
  document.body.appendChild(ov); ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openDemarches() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  const ctx = data.reglages.contextFamily || 'alternee';
  if (ctx !== 'alternee') {
    ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>📑 Démarches</h2></div><div class="overlay-body">
      <div class="jbut" style="background:var(--primary-soft);border-left:3px solid var(--primary);margin-bottom:14px">
        <p style="margin:0;font-size:14px">Cette section est pensée pour les parents séparés. Si tu as besoin de soutien ou de ressources, consulte <b>🆘 Ressources & soutien</b> ci-dessous.</p>
      </div>
      <div class="section-title">Ressources adaptées à ta situation</div>
      <div class="card"><div class="list">${RESSOURCES.map((r) => `<div class="item"><span class="label"><b>${esc(r.nom)}</b><br><span class="muted" style="font-size:13px">${esc(r.desc)}</span></span>${r.tel ? `<a class="tel-link" href="tel:${esc(r.tel)}">📞 ${esc(r.telLabel)}</a>` : ''}</div>`).join('')}</div></div>
    </div>`;
  } else {
    ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>📑 Démarches du parent séparé</h2></div><div class="overlay-body">
      <p class="muted" style="margin:0 2px 12px">Les principales démarches à ne pas oublier après une séparation.</p>
      ${DEMARCHES.map((d) => `<div class="card"><p style="margin:0 0 4px"><b>${d.emoji} ${esc(d.titre)}</b></p><p style="margin:0" class="muted">${esc(d.desc)}</p></div>`).join('')}
      <p class="muted" style="text-align:center;font-size:12px">Infos générales — renseigne-toi auprès des organismes concernés (CAF, mairie, avocat, JAF).</p></div>`;
  }
  document.body.appendChild(ov); ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openRessources() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🆘 Ressources & soutien</h2></div><div class="overlay-body">
    <p class="muted" style="margin:0 2px 12px">Tu n'es pas seul. Demander de l'aide est une force.</p>
    <div class="card"><div class="list">${RESSOURCES.map((r) => `<div class="item"><span class="label"><b>${esc(r.nom)}</b><br><span class="muted" style="font-size:13px">${esc(r.desc)}</span></span>${r.tel ? `<a class="tel-link" href="tel:${esc(r.tel)}">📞 ${esc(r.telLabel)}</a>` : ''}</div>`).join('')}</div></div>
    <p class="muted" style="text-align:center;font-size:12px">Numéros susceptibles d'évoluer — vérifie en cas de besoin.</p></div>`;
  document.body.appendChild(ov); ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
const RECHARGE = [
  "☕ Un café ou un thé au calme, sans téléphone.",
  "🎧 Deux chansons que tu adores, à fond.",
  "🚶 Un tour du pâté de maisons.",
  "🛁 Une douche un peu plus longue que d'habitude.",
  "📖 Quelques pages d'un livre ou d'une BD.",
  "🌳 Cinq minutes dehors, juste à respirer.",
  "📝 Écrire ce qui te pèse sur un papier… puis le froisser.",
  "💬 Un message à quelqu'un que tu aimes.",
  "😌 Ne rien faire du tout, juste t'asseoir, deux minutes."
];
const ALERTES = [
  "Tu es épuisé en permanence, même après avoir dormi.",
  "Tu t'énerves pour un rien, ou tu te sens souvent triste ou vide.",
  "Tu n'as plus goût à ce que tu aimais avant.",
  "Tu te sens débordé au point de ne plus savoir par où commencer."
];
function openSoin() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🧘 Prendre soin de toi</h2></div><div class="overlay-body">
    <div class="jbut">Un papa reposé et soutenu, c'est le plus beau cadeau pour tes enfants. 💛</div>
    <div class="section-title">Au quotidien</div>
    <div class="card"><div class="list">${SOINTOI.map((t) => `<div class="item"><span class="label">${esc(t)}</span></div>`).join('')}</div></div>
    <div class="section-title">Te recharger en 5 minutes</div>
    <div class="card"><div class="list">${RECHARGE.map((t) => `<div class="item"><span class="label">${esc(t)}</span></div>`).join('')}</div></div>
    <div class="section-title">Respirer pour se calmer</div>
    <div class="card"><p style="margin:0 0 12px"><b>Respiration 4-4-6</b><br>Inspire par le nez <b>4 sec</b> → bloque <b>4 sec</b> → souffle par la bouche <b>6 sec</b>. Recommence <b>5 fois</b>.</p><p style="margin:0"><b>Ancrage 5-4-3-2-1</b><br>Nomme 5 choses que tu vois, 4 que tu entends, 3 que tu touches, 2 que tu sens, 1 que tu goûtes. Le calme revient en 1 minute.</p></div>
    <div class="section-title">T'écouter et demander de l'aide</div>
    <div class="card"><div class="list">${ALERTES.map((t) => `<div class="item"><span class="label">${esc(t)}</span></div>`).join('')}</div><p class="muted" style="margin:10px 2px 0">Ces signaux sont normaux quand on porte beaucoup. En parler à ton médecin, à un proche ou à un psy, ce n'est pas un luxe — c'est prendre soin de toute la famille. Voir « 🆘 Ressources & soutien ».</p></div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openGuide() {
  closeOverlay();
  const ctx = data.reglages.contextFamily || 'alternee';
  const demarche_label = ctx === 'alternee' ? '📑 Démarches (parent séparé)' : '📑 Ressources pour ta situation';
  const items = [['🧠 Que faire quand…', 'openSituations'], ['💬 Phrases qui aident', 'openPhrases'], ['💛 Rituels & conseils', 'openRituels'], ['🧭 Repères par âge', 'openReperes'], ['🧰 Fiches pratiques maison', 'openFiches'], ['🧹 Planning ménage', 'openMenage'], ['🩹 En cas de pépin', 'openUrgences'], ['💊 Trousse à pharmacie', 'openTrousse'], ['📋 Checklists de saison', 'openSaison'], ['🎂 Organiser un anniversaire', 'openAnnivGuide'], [demarche_label, 'openDemarches'], ['🆘 Ressources & soutien', 'openRessources'], ['🧘 Prendre soin de toi', 'openSoin'], ['💬 Questions pour papoter', 'openPapoter'], ['🥕 Fruits & légumes de saison', 'openSaisonProduits'], ['📖 Histoires du soir', 'openHistoires']];
  const map = { openFiches, openMenage, openUrgences, openTrousse, openReperes, openRituels, openSaison, openSituations, openPhrases, openDemarches, openRessources, openSoin, openAnnivGuide, openPapoter, openSaisonProduits, openHistoires };
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📖 Le guide du parent</h2></div>
    <div class="overlay-body"><p class="muted" style="margin:0 2px 12px">Tout ce que personne ne t'a expliqué, réuni ici. Tu gères déjà très bien 💪</p>
    <div class="list">${items.map(([lbl, fn]) => `<div class="item recipe" data-g="${fn}"><span class="label">${lbl}</span><span class="go">›</span></div>`).join('')}</div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => map[b.dataset.g]()));
}
function openFiches() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🧰 Fiches pratiques</h2></div><div class="overlay-body"><div class="card"><div class="list">${FICHES.map((f) => `<div class="item recipe" data-fid="${f.id}"><span class="label">${f.emoji} ${esc(f.nom)}</span><span class="go">›</span></div>`).join('')}</div></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
  ov.querySelectorAll('[data-fid]').forEach((r) => r.addEventListener('click', () => ficheDetail(r.dataset.fid)));
}
function ficheDetail(id) {
  const f = FICHES.find((x) => x.id === id); if (!f) return; closeOverlay();
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>${f.emoji} ${esc(f.nom)}</h2></div><div class="overlay-body"><div class="card"><ol class="steps">${f.etapes.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openFiches);
}
function openMenage() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🧹 Planning ménage</h2></div><div class="overlay-body">
    <p class="muted" style="margin:0 2px 10px">Coche au fur et à mesure. 15 min par jour suffisent !</p>
    <div class="card"><div class="list">${data.menage.map((t) => `<div class="item ${t.fait ? 'done' : ''}" data-mnid="${t.id}"><span class="check">${t.fait ? '✓' : ''}</span><span class="label">${esc(t.texte)}</span><span class="tag">${esc(t.freq)}</span><button class="x" data-act="del">✕</button></div>`).join('')}</div>
    <div class="field-row" style="margin-top:12px"><input class="input" id="mn-txt" placeholder="Ajouter une tâche…" /><input class="input" id="mn-freq" placeholder="Fréquence" style="flex:0 0 36%" /></div>
    <div class="btn-row"><button class="btn btn-mini" id="mn-add">Ajouter</button><button class="btn btn-mini btn-primary" id="mn-reset">↻ Tout décocher</button></div></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
  ov.querySelectorAll('[data-mnid]').forEach((row) => { const id = row.dataset.mnid; wireRow(row, () => { const t = data.menage.find((x) => x.id === id); t.fait = !t.fait; save(); openMenage(); }, () => { data.menage = data.menage.filter((x) => x.id !== id); save(); openMenage(); }); });
  ov.querySelector('#mn-add').addEventListener('click', () => { const t = ov.querySelector('#mn-txt').value.trim(); if (!t) return; data.menage.push({ id: uid(), texte: t, freq: ov.querySelector('#mn-freq').value.trim() || '1×/semaine', fait: false }); save(); openMenage(); });
  ov.querySelector('#mn-reset').addEventListener('click', () => { data.menage.forEach((t) => t.fait = false); save(); openMenage(); });
}
function openUrgences() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🩹 En cas de pépin</h2></div><div class="overlay-body">
    <div class="card"><h2>📞 Numéros d'urgence</h2><div class="list">
      <div class="item"><span class="label"><b>SAMU</b> — urgence médicale</span><a class="tel-link" href="tel:15">📞 15</a></div>
      <div class="item"><span class="label"><b>Urgences (Europe)</b></span><a class="tel-link" href="tel:112">📞 112</a></div>
      <div class="item"><span class="label"><b>Pompiers</b></span><a class="tel-link" href="tel:18">📞 18</a></div>
      <div class="item"><span class="label"><b>Centre antipoison</b></span><a class="tel-link" href="tel:0145425900">📞 01 45 42 59 00</a></div>
    </div></div>
    <p class="jbut">⚠️ En cas de doute, de difficulté à respirer ou de perte de connaissance : appelle le 15 sans hésiter.</p>
    ${URGENCES.map((u) => `<div class="section-title">${u.emoji} ${esc(u.titre)}</div><div class="card"><ul class="steps">${u.conseils.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`).join('')}
    <p class="muted" style="text-align:center;font-size:12px">Conseils généraux de bon sens — ils ne remplacent pas l'avis d'un médecin.</p></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openTrousse() {
  closeOverlay(); const manque = data.pharmacie.filter((x) => !x.fait).length;
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>💊 Trousse à pharmacie</h2></div><div class="overlay-body">
    <p class="muted" style="margin:0 2px 10px">Coche ce que tu as déjà. ${manque ? 'Il te manque ' + manque + ' chose(s).' : 'Ta trousse est complète ✓'}</p>
    <div class="card"><div class="list">${data.pharmacie.map((x) => `<div class="item ${x.fait ? 'done' : ''}" data-phid="${x.id}"><span class="check">${x.fait ? '✓' : ''}</span><span class="label">${esc(x.nom)}</span><button class="x" data-act="del">✕</button></div>`).join('')}</div>
    <div class="field-row" style="margin-top:12px"><input class="input" id="ph-txt" placeholder="Ajouter…" /><button class="btn btn-primary" id="ph-add">＋</button></div>
    <button class="btn btn-mini btn-block" id="ph-courses">🛒 Mettre ce qui manque dans une liste « Pharmacie »</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
  ov.querySelectorAll('[data-phid]').forEach((row) => { const id = row.dataset.phid; wireRow(row, () => { const x = data.pharmacie.find((y) => y.id === id); x.fait = !x.fait; save(); openTrousse(); }, () => { data.pharmacie = data.pharmacie.filter((y) => y.id !== id); save(); openTrousse(); }); });
  ov.querySelector('#ph-add').addEventListener('click', () => { const t = ov.querySelector('#ph-txt').value.trim(); if (!t) return; data.pharmacie.push({ id: uid(), nom: t, fait: false }); save(); openTrousse(); });
  ov.querySelector('#ph-courses').addEventListener('click', () => { let l = data.listesExtra.find((x) => x.nom.toLowerCase() === 'pharmacie'); if (!l) { l = { id: uid(), nom: 'Pharmacie', items: [] }; data.listesExtra.push(l); } let n = 0; data.pharmacie.filter((x) => !x.fait).forEach((x) => { if (!l.items.some((i) => i.nom.toLowerCase() === x.nom.toLowerCase() && !i.fait)) { l.items.push({ id: uid(), nom: x.nom, fait: false }); n++; } }); save(); toast(n ? n + ' article(s) → liste « Pharmacie »' : 'Rien à ajouter'); });
}
function openReperes() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🧭 Repères par âge</h2></div><div class="overlay-body">
    ${REPERES.map((r) => `<div class="section-title">${r.emoji} ${esc(r.titre)}</div><div class="card">${r.lignes.map(([t, d]) => `<p style="margin:0 0 10px"><b>${esc(t)}</b><br>${esc(d)}</p>`).join('')}</div>`).join('')}
    <p class="muted" style="text-align:center;font-size:12px">Repères généraux : chaque enfant a son rythme. Fie-toi aussi à ton ressenti.</p></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openRituels() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>💛 Rituels & conseils</h2></div><div class="overlay-body">
    <div class="jbut">💡 ${esc(conseilDuJour())}</div>
    <div class="section-title">Des rituels simples pour créer du lien</div>
    <div class="card"><div class="list">${RITUELS.map(([e, t, d]) => `<div class="item"><span class="label">${e} <b>${esc(t)}</b><br><span class="muted" style="font-size:13px">${esc(d)}</span></span></div>`).join('')}</div></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
}
function openSaison() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>📋 Checklists de saison</h2></div><div class="overlay-body"><p class="muted" style="margin:0 2px 12px">Crée une liste prête à cocher (elle apparaîtra dans l'onglet Courses).</p>${Object.keys(SAISONS).map((k) => `<button class="btn btn-block" style="margin-bottom:10px" data-saison="${esc(k)}">📋 Créer la liste « ${esc(k)} » (${SAISONS[k].length})</button>`).join('')}</div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
  ov.querySelectorAll('[data-saison]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.saison; const l = { id: uid(), nom: k, items: SAISONS[k].map((n) => ({ id: uid(), nom: n, fait: false })) }; data.listesExtra.push(l); activeListe = l.id; save(); closeOverlay(); setTab('courses'); toast('Liste « ' + k + ' » créée ✓'); }));
}

/* ============================================================
   v11 : besoins du papa solo — budget, journal, cadeaux, coffre
   ============================================================ */
function openBudget() {
  closeOverlay();
  const f = data.finances; const mk = todayISO().slice(0, 7);
  const totCharges = f.charges.reduce((s, c) => s + (+c.montant || 0), 0);
  const depMois = f.depenses.filter((d) => (d.date || '').slice(0, 7) === mk);
  const totDep = depMois.reduce((s, d) => s + (+d.montant || 0), 0);
  const reste = (+f.revenu || 0) - totCharges - totDep;
  const cats = ['Maison', 'Énergie', 'Courses', 'Enfants', 'Transport', 'Loisirs', 'Santé', 'Autre'];
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>💰 Budget du mois</h2></div>
    <div class="overlay-body">
      <div class="card" style="text-align:center"><div class="muted">Reste à vivre ce mois-ci</div><div class="budg-total" style="color:${reste >= 0 ? 'var(--ok)' : 'var(--danger)'}">${eur(reste)} €</div><div class="muted" style="font-size:12px">Revenu ${eur(f.revenu)} − charges ${eur(totCharges)} − dépenses ${eur(totDep)}</div></div>
      <div class="card"><label class="fld">Revenu mensuel (€)<input class="input" id="bu-rev" type="number" inputmode="decimal" value="${f.revenu || ''}" placeholder="ex. 2000" /></label><button class="btn btn-mini btn-block" id="bu-rev-save">Enregistrer le revenu</button></div>
      <div class="section-title">Charges fixes (chaque mois)</div>
      <div class="card"><div class="list">${f.charges.length ? f.charges.map((c) => `<div class="item" data-chid="${c.id}"><span class="label">${esc(c.nom)}</span><span class="tag">${eur(c.montant)} €</span><button class="x" data-chdel>✕</button></div>`).join('') : '<div class="empty"><span class="e">🏠</span>Loyer, énergie, assurances, abonnements…</div>'}</div>
        <div class="field-row" style="margin-top:10px"><input class="input" id="ch-nom" placeholder="Ex. Loyer" /><input class="input" id="ch-mt" type="number" inputmode="decimal" placeholder="€" style="flex:0 0 30%" /></div><button class="btn btn-block" id="ch-add">Ajouter une charge</button></div>
      <div class="section-title">Dépenses du mois · ${eur(totDep)} €</div>
      <div class="card"><div class="field-row"><input class="input" id="de-mt" type="number" inputmode="decimal" placeholder="Montant €" /><select class="select" id="de-cat">${cats.map((c) => `<option>${c}</option>`).join('')}</select></div><div class="field-row"><input class="input" id="de-note" placeholder="Note (facultatif)" /><button class="btn btn-primary" id="de-add">＋</button></div>
        <div class="list" style="margin-top:8px">${[...depMois].reverse().slice(0, 8).map((d) => `<div class="item" data-deid="${d.id}"><span class="label">${esc(d.note || d.cat)} <span class="muted">· ${esc(d.cat)} · ${esc(frShort(d.date))}</span></span><span class="tag">${eur(d.montant)} €</span><button class="x" data-dedel>✕</button></div>`).join('')}</div></div>
      <button class="btn btn-block" id="bu-bilan" style="margin-bottom:8px">📊 Voir le bilan du mois</button>
      <p class="muted" style="text-align:center;font-size:12px">100 % privé, stocké sur ton appareil.</p>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#bu-rev-save').addEventListener('click', () => { f.revenu = parseFloat(ov.querySelector('#bu-rev').value) || 0; save(); openBudget(); });
  ov.querySelector('#bu-bilan').addEventListener('click', openBilan);
  ov.querySelector('#ch-add').addEventListener('click', () => { const n = ov.querySelector('#ch-nom').value.trim(); const m = parseFloat(ov.querySelector('#ch-mt').value); if (!n || isNaN(m)) { toast('Nom + montant'); return; } f.charges.push({ id: uid(), nom: n, montant: m }); save(); openBudget(); });
  ov.querySelectorAll('[data-chid]').forEach((row) => row.querySelector('[data-chdel]').addEventListener('click', () => { f.charges = f.charges.filter((x) => x.id !== row.dataset.chid); save(); openBudget(); }));
  ov.querySelector('#de-add').addEventListener('click', () => { const m = parseFloat(ov.querySelector('#de-mt').value); if (isNaN(m)) { toast('Indique un montant'); return; } f.depenses.push({ id: uid(), date: todayISO(), montant: m, cat: ov.querySelector('#de-cat').value, note: ov.querySelector('#de-note').value.trim() }); save(); openBudget(); });
  ov.querySelectorAll('[data-deid]').forEach((row) => row.querySelector('[data-dedel]').addEventListener('click', () => { f.depenses = f.depenses.filter((x) => x.id !== row.dataset.deid); save(); openBudget(); }));
}
function openJournal() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  const sorted = [...data.journal].reverse();
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📔 Livre de bord</h2></div>
    <div class="overlay-body">
      <p class="muted" style="margin:0 2px 10px">Garde une trace des beaux moments. Tu seras content de les relire plus tard. 💛</p>
      <div class="card"><div class="field-row"><input class="input" id="jo-txt" placeholder="Un bon moment d'aujourd'hui…" enterkeyhint="done" /></div><button class="btn btn-primary btn-block" id="jo-add">Ajouter au journal</button></div>
      <div class="card"><div class="list">${sorted.length ? sorted.map((n) => `<div class="item" data-joid="${n.id}"><span class="label">${esc(n.texte)}<br><span class="muted" style="font-size:12px">${esc(frShort(n.date))}</span></span><button class="x" data-jodel>✕</button></div>`).join('') : `<div class="empty"><span class="e">📔</span>Ton premier souvenir t'attend.</div>`}</div></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  const add = () => { const t = ov.querySelector('#jo-txt').value.trim(); if (!t) return; data.journal.push({ id: uid(), date: todayISO(), texte: t }); save(); openJournal(); };
  ov.querySelector('#jo-add').addEventListener('click', add);
  ov.querySelector('#jo-txt').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  ov.querySelectorAll('[data-joid]').forEach((row) => row.querySelector('[data-jodel]').addEventListener('click', () => { data.journal = data.journal.filter((x) => x.id !== row.dataset.joid); save(); openJournal(); }));
}
function openCadeaux() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>🎁 Idées cadeaux</h2></div>
    <div class="overlay-body">
      <p class="muted" style="margin:0 2px 10px">Note les idées au fil de l'eau pour ne plus jamais être pris de court.</p>
      <div class="card"><div class="field-row"><input class="input" id="ca-pour" placeholder="Pour qui ?" /><input class="input" id="ca-occ" placeholder="Occasion" style="flex:0 0 38%" /></div><div class="field-row"><input class="input" id="ca-idee" placeholder="Idée de cadeau" /><button class="btn btn-primary" id="ca-add">＋</button></div></div>
      <div class="card"><div class="list">${data.cadeaux.length ? data.cadeaux.map((c) => `<div class="item ${c.fait ? 'done' : ''}" data-caid="${c.id}"><span class="check">${c.fait ? '✓' : ''}</span><span class="label">${esc(c.idee)} <span class="muted">· ${esc(c.pour)}${c.occasion ? ' · ' + esc(c.occasion) : ''}</span></span><button class="x" data-act="del">✕</button></div>`).join('') : `<div class="empty"><span class="e">🎁</span>Aucune idée notée. Coche quand c'est acheté.</div>`}</div></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#ca-add').addEventListener('click', () => { const idee = ov.querySelector('#ca-idee').value.trim(); const pour = ov.querySelector('#ca-pour').value.trim(); if (!idee || !pour) { toast('Pour qui + idée'); return; } data.cadeaux.push({ id: uid(), pour, idee, occasion: ov.querySelector('#ca-occ').value.trim(), fait: false }); save(); openCadeaux(); });
  ov.querySelectorAll('[data-caid]').forEach((row) => { const id = row.dataset.caid; wireRow(row, () => { const c = data.cadeaux.find((x) => x.id === id); c.fait = !c.fait; save(); openCadeaux(); }, () => { data.cadeaux = data.cadeaux.filter((x) => x.id !== id); save(); openCadeaux(); }); });
}
function openCoffre() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>🔐 Infos importantes</h2></div>
    <div class="overlay-body">
      <p class="muted" style="margin:0 2px 10px">N° de sécu, assurances, code de l'immeuble, artisans, box internet… au même endroit.</p>
      <div class="card"><div class="field-row"><input class="input" id="co-nom" placeholder="Intitulé (ex. Assurance habitation)" /></div><div class="field-row"><input class="input" id="co-val" placeholder="Numéro / info / contact" /><button class="btn btn-primary" id="co-add">＋</button></div></div>
      <div class="card"><div class="list">${data.coffre.length ? data.coffre.map((c) => `<div class="item" data-coid="${c.id}"><span class="label"><b>${esc(c.nom)}</b><br><span class="muted">${esc(c.valeur)}</span></span><button class="x" data-codel>✕</button></div>`).join('') : `<div class="empty"><span class="e">🔐</span>Rien pour l'instant.</div>`}</div></div>
      <p class="muted" style="text-align:center;font-size:12px">Stocké uniquement sur cet appareil. Évite d'y mettre des mots de passe sensibles.</p>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#co-add').addEventListener('click', () => { const n = ov.querySelector('#co-nom').value.trim(); const v = ov.querySelector('#co-val').value.trim(); if (!n) { toast('Indique un intitulé'); return; } data.coffre.push({ id: uid(), nom: n, valeur: v }); save(); openCoffre(); });
  ov.querySelectorAll('[data-coid]').forEach((row) => row.querySelector('[data-codel]').addEventListener('click', () => { data.coffre = data.coffre.filter((x) => x.id !== row.dataset.coid); save(); openCoffre(); }));
}
const ANNIV_ETAPES = [
  ['📅 3-4 semaines avant', ["Fixe la date et l'heure (souvent un après-midi de 14h à 17h).", "Établis la liste d'invités avec ton enfant (souvent : son âge + 1).", "Choisis un thème s'il en veut un (super-héros, animaux, princesse…)."]],
  ['✉️ 2 semaines avant', ["Envoie les invitations (papier, ou message aux parents).", "Commande ou prévois le gâteau (ou fais-le maison, voir l'onglet Repas).", "Prépare 3-4 jeux adaptés à l'âge (onglet Jeux !)."]],
  ['🛒 1 semaine avant', ["Courses : déco, boissons, goûter, bougies, sacs-poubelle.", "Confirme les présences auprès des parents.", "Prépare les pochettes-surprises et le cadeau."]],
  ['🎉 Le jour J', ["Installe la déco le matin, range les objets fragiles.", "Alterne jeux calmes et jeux de défoulement.", "Gâteau + bougies + photos.", "Prévois un moment « cadeaux » et remercie chaque copain au départ."]]
];
function openAnnivGuide() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🎂 Organiser un anniversaire</h2></div><div class="overlay-body">
    ${ANNIV_ETAPES.map(([t, l]) => `<div class="section-title">${esc(t)}</div><div class="card"><ul class="steps">${l.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`).join('')}
    <p class="muted" style="text-align:center;font-size:12px">Le plus important : que ton enfant se sente fêté et aimé. Le reste est bonus 💛</p></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
}

/* ============================================================
   v12 : agenda, bilan, minuteur, météo, papoter, saison,
        histoires du soir, écran frigo
   ============================================================ */
let minTimer = null;
let weatherCache = null;

function openAgenda() {
  closeOverlay();
  let ref = new Date(today().getFullYear(), today().getMonth(), 1);
  let sel = todayISO();
  const ov = document.createElement('div'); ov.className = 'overlay'; document.body.appendChild(ov);
  function eventsOn(key) {
    const dow = (parseISO(key).getDay() + 6) % 7; const items = [];
    if (data.menu[key] && data.menu[key].meal) items.push('🍽️ ' + data.menu[key].meal);
    data.activites.filter((a) => a.jour === dow).sort((a, b) => (a.heure || '').localeCompare(b.heure || '')).forEach((a) => items.push('📆 ' + (a.heure ? a.heure + ' ' : '') + a.nom));
    data.rappels.filter((r) => r.date === key && !r.fait).forEach((r) => items.push('🔔 ' + r.texte));
    data.anniversaires.forEach((a) => { const p = (a.date || '').split('-'); if (p.length === 3 && key.slice(5) === p[1] + '-' + p[2]) items.push('🎂 ' + a.nom); });
    data.vacances.forEach((v) => { if (v.debut && key >= v.debut && key <= (v.fin || v.debut)) items.push('🏖️ ' + v.nom); });
    return items;
  }
  function draw() {
    const y = ref.getFullYear(), m = ref.getMonth();
    const off = (new Date(y, m, 1).getDay() + 6) % 7; const nb = new Date(y, m + 1, 0).getDate(); const ti = todayISO();
    let cells = '';
    for (let i = 0; i < off; i++) cells += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= nb; d++) { const key = iso(new Date(y, m, d)); const ev = eventsOn(key); const dots = ev.length ? '<div class="agd-dots">' + '•'.repeat(Math.min(ev.length, 4)) + '</div>' : ''; cells += `<div class="cal-cell ${data.presence[key] ? 'on' : ''} ${key === ti ? 'today' : ''} ${key === sel ? 'pending' : ''}" data-day="${key}">${d}${dots}</div>`; }
    const list = eventsOn(sel);
    ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📅 Agenda du mois</h2></div><div class="overlay-body">
      <div class="cal-head"><button data-prev>‹</button><div class="m">${MOIS[m]} ${y}</div><button data-next>›</button></div>
      <div class="cal-grid">${DOW.map((x) => `<div class="cal-dow">${x}</div>`).join('')}</div>
      <div class="cal-grid" style="margin-top:5px">${cells}</div>
      <div class="legend"><span><span class="dot" style="background:var(--primary)"></span>Avec les enfants</span><span>• activités, rappels, anniv, vacances</span></div>
      <div class="section-title">${esc(cap(frLong(parseISO(sel))))}</div>
      <div class="card">${list.length ? `<div class="list">${list.map((x) => `<div class="item"><span class="label">${esc(x)}</span></div>`).join('')}</div>` : '<div class="empty"><span class="e">📭</span>Rien de prévu ce jour-là.</div>'}</div>
    </div>`;
    ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
    ov.querySelector('[data-prev]').addEventListener('click', () => { ref = new Date(y, m - 1, 1); draw(); });
    ov.querySelector('[data-next]').addEventListener('click', () => { ref = new Date(y, m + 1, 1); draw(); });
    ov.querySelectorAll('[data-day]').forEach((c) => c.addEventListener('click', () => { sel = c.dataset.day; draw(); }));
  }
  draw();
}

function openBilan() {
  closeOverlay(); const mk = todayISO().slice(0, 7); const f = data.finances;
  const totCharges = f.charges.reduce((s, c) => s + (+c.montant || 0), 0);
  const depMois = f.depenses.filter((d) => (d.date || '').slice(0, 7) === mk);
  const totDep = depMois.reduce((s, d) => s + (+d.montant || 0), 0);
  const reste = (+f.revenu || 0) - totCharges - totDep;
  const parCat = {}; depMois.forEach((d) => { parCat[d.cat] = (parCat[d.cat] || 0) + (+d.montant || 0); });
  const joursGarde = Object.keys(data.presence).filter((k) => k.slice(0, 7) === mk && data.presence[k]).length;
  const courses = data.budget.filter((b) => (b.date || '').slice(0, 7) === mk).reduce((s, b) => s + (+b.montant || 0), 0);
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📊 Bilan de ${MOIS[new Date().getMonth()]}</h2></div><div class="overlay-body">
    <div class="card" style="text-align:center"><div class="muted">Reste à vivre</div><div class="budg-total" style="color:${reste >= 0 ? 'var(--ok)' : 'var(--danger)'}">${eur(reste)} €</div><div class="muted" style="font-size:12px">Revenu ${eur(f.revenu)} − charges ${eur(totCharges)} − dépenses ${eur(totDep)}</div></div>
    <div class="dash-grid"><div class="stat"><div class="n">${joursGarde}</div><div class="t">jours avec les enfants</div></div><div class="stat"><div class="n">${eur(courses)} €</div><div class="t">de courses ce mois</div></div></div>
    <div class="section-title">Dépenses par catégorie</div>
    <div class="card">${Object.keys(parCat).length ? Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="item"><span class="label">${esc(c)}</span><span class="tag">${eur(v)} €</span></div>`).join('') : '<div class="empty"><span class="e">📊</span>Aucune dépense enregistrée ce mois-ci.</div>'}</div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
}

function openMinuteur() {
  closeOverlay(); clearInterval(minTimer);
  let remaining = 120, running = false;
  const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const ov = document.createElement('div'); ov.className = 'overlay'; document.body.appendChild(ov);
  function tick() { if (remaining > 0) { remaining--; const d = ov.querySelector('#mt-disp'); if (d) d.textContent = fmt(remaining); if (remaining === 0) { clearInterval(minTimer); running = false; if (navigator.vibrate) navigator.vibrate([300, 150, 300]); toast('⏰ Temps écoulé !'); paint(); } } }
  function paint() {
    ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>⏲️ Minuteur</h2></div><div class="overlay-body">
      <div style="text-align:center;margin:14px 0"><div id="mt-disp" style="font-size:70px;font-weight:800;color:var(--primary);line-height:1">${fmt(remaining)}</div></div>
      <div class="chips" style="justify-content:center">${[1, 2, 3, 5, 10].map((m) => `<button class="chip" data-min="${m}">${m} min</button>`).join('')}</div>
      <div class="btn-row" style="justify-content:center;margin-top:16px"><button class="btn btn-primary" id="mt-start">${running ? '⏸ Pause' : '▶ Démarrer'}</button><button class="btn" id="mt-reset">↻ Réinitialiser</button></div>
      <p class="muted" style="text-align:center;margin-top:14px">Idéal pour « 2 min de brossage de dents » ou « 5 min pour ranger ». Ça vibre à la fin.</p></div>`;
    ov.querySelector('[data-close]').addEventListener('click', () => { clearInterval(minTimer); closeOverlay(); render(); });
    ov.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => { remaining = +b.dataset.min * 60; running = false; clearInterval(minTimer); paint(); }));
    ov.querySelector('#mt-start').addEventListener('click', () => { if (running) { running = false; clearInterval(minTimer); } else { if (remaining <= 0) remaining = 120; running = true; clearInterval(minTimer); minTimer = setInterval(tick, 1000); } paint(); });
    ov.querySelector('#mt-reset').addEventListener('click', () => { running = false; clearInterval(minTimer); remaining = 120; paint(); });
  }
  paint();
}

function openFrigo() {
  closeOverlay(); const ti = todayISO(); const present = !!data.presence[ti]; const m = data.menu[ti] || {};
  const acts = data.activites.filter((a) => a.jour === todayDow()).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));
  const ex = nextExchange();
  const raps = data.rappels.filter((r) => !r.fait && r.date && r.date >= ti).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📺 Aujourd'hui</h2></div><div class="overlay-body">
    <div class="frigo-date">${esc(cap(frLong(today())))}</div>
    <div class="frigo-big">${present ? '👧🧒 Les enfants sont à la maison' : '🙂 Journée sans les enfants'}</div>
    ${m.meal ? `<div class="frigo-line">🍽️ Ce soir : <b>${esc(m.meal)}</b></div>` : ''}
    ${acts.length ? `<div class="frigo-line">📆 ${acts.map((a) => (a.heure ? '<b>' + esc(a.heure) + '</b> ' : '') + esc(a.nom)).join(' &nbsp;·&nbsp; ')}</div>` : ''}
    ${ex ? `<div class="frigo-line">🔄 Prochain échange : <b>${esc(frShort(ex.date))}</b> (${ex.present ? 'ils arrivent' : 'ils repartent'})</div>` : ''}
    ${raps.length ? raps.map((r) => `<div class="frigo-line">🔔 ${esc(r.texte)} <span class="muted">· ${esc(rappelLabel(r.date))}</span></div>`).join('') : ''}
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
}

const PAPOTE = ["Si tu avais un super-pouvoir, lequel choisirais-tu ?", "C'est quoi ton meilleur souvenir ?", "Si tu étais un animal, tu serais lequel et pourquoi ?", "Qu'est-ce qui t'a fait rire aujourd'hui ?", "Si tu pouvais manger un seul plat toute ta vie, ce serait quoi ?", "Quel est ton rêve le plus fou ?", "Si on partait en voyage demain, on irait où ?", "C'est quoi, pour toi, une journée parfaite ?", "Quelle est la chose la plus gentille qu'on t'ait faite ?", "Si tu étais invisible une journée, tu ferais quoi ?", "Quel métier aimerais-tu faire plus tard ?", "Si tu pouvais parler aux animaux, à qui parlerais-tu ?", "C'est quoi ta plus grande fierté ?", "Si tu inventais un jeu, ce serait quoi ?", "Qu'est-ce que tu préfères chez ton frère ou ta sœur ?", "Si tu avais une baguette magique, tu changerais quoi ?", "Quel est ton moment préféré de la journée ?", "Si tu étais le chef de la maison, quelle règle inventerais-tu ?", "C'est quoi le truc le plus rigolo que tu connaisses ?", "Si tu pouvais voler, où irais-tu en premier ?", "Qu'est-ce qui te rend vraiment heureux ?", "Si tu avais un robot, il ferait quoi pour toi ?", "Quelle est ta chanson préférée en ce moment ?", "Si tu pouvais rencontrer n'importe qui, ce serait qui ?"];
function openPapoter() {
  closeOverlay(); let q = PAPOTE[Math.floor(Math.random() * PAPOTE.length)];
  const ov = document.createElement('div'); ov.className = 'overlay'; document.body.appendChild(ov);
  function draw() {
    ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>💬 Questions pour papoter</h2></div><div class="overlay-body">
      <div class="jbut" style="font-size:19px;text-align:center;padding:26px 18px">${esc(q)}</div>
      <button class="btn btn-accent btn-block" id="pp-next">🎲 Une autre question</button>
      <p class="muted" style="text-align:center;margin-top:14px">Parfait en voiture ou au dîner pour faire parler les enfants 💛</p></div>`;
    ov.querySelector('[data-back]').addEventListener('click', openGuide);
    ov.querySelector('#pp-next').addEventListener('click', () => { q = PAPOTE[Math.floor(Math.random() * PAPOTE.length)]; draw(); });
  }
  draw();
}

const SAISON_PRODUITS = [
  { f: 'Pomme, poire, orange, clémentine, kiwi', l: 'Poireau, carotte, chou, endive, potiron, pomme de terre' },
  { f: 'Pomme, poire, orange, kiwi', l: 'Poireau, chou, endive, carotte, betterave' },
  { f: 'Pomme, poire, kiwi', l: 'Poireau, épinard, endive, carotte, radis' },
  { f: 'Pomme, premières fraises', l: 'Asperge, radis, épinard, petits pois, carotte' },
  { f: 'Fraise, cerise, rhubarbe', l: 'Asperge, radis, petits pois, courgette, épinard' },
  { f: 'Fraise, cerise, abricot, melon', l: 'Courgette, concombre, tomate, petits pois, haricot vert' },
  { f: 'Abricot, pêche, melon, framboise, cerise', l: 'Tomate, courgette, concombre, aubergine, poivron' },
  { f: 'Pêche, prune, melon, raisin, figue', l: 'Tomate, courgette, aubergine, poivron, maïs, haricot vert' },
  { f: 'Raisin, prune, figue, pomme, poire', l: 'Tomate, courgette, poireau, brocoli, épinard' },
  { f: 'Pomme, poire, raisin, coing', l: 'Potiron, poireau, chou, champignon, carotte' },
  { f: 'Pomme, poire, clémentine, kiwi', l: 'Potiron, poireau, chou, endive, carotte' },
  { f: 'Pomme, poire, orange, clémentine, kiwi', l: 'Poireau, chou, endive, potiron, pomme de terre' }
];
function openSaisonProduits() {
  closeOverlay(); const m = new Date().getMonth(); const cur = SAISON_PRODUITS[m];
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>🥕 De saison en ${MOIS[m]}</h2></div><div class="overlay-body">
    <div class="card"><p style="margin:0 0 10px"><b>🍎 Fruits</b><br>${esc(cur.f)}</p><p style="margin:0"><b>🥦 Légumes</b><br>${esc(cur.l)}</p></div>
    <p class="jbut">Acheter de saison = moins cher, meilleur goût, et bon pour la planète. 🌍</p>
    <div class="section-title">Tous les mois</div>
    <div class="card"><div class="list">${SAISON_PRODUITS.map((s, i) => `<div class="item ${i === m ? 'done' : ''}"><span class="label"><b>${cap(MOIS[i])}</b><br><span class="muted" style="font-size:12px">🍎 ${esc(s.f)} · 🥦 ${esc(s.l)}</span></span></div>`).join('')}</div></div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
}

const HISTOIRES = [
  { emoji: '🦊', titre: 'Le petit renard qui ne voulait pas dormir', texte: "Au fond de la forêt, le petit renard Roux refusait de fermer les yeux. « Encore une minute ! » disait-il chaque soir. Sa maman lui montra la lune : « Tu vois, même elle se repose derrière les nuages. » Roux regarda les étoiles s'allumer une à une, comme de petites veilleuses. Il bâilla une fois, deux fois… « Si je dors, je vais rater la nuit », pensa-t-il. Mais la nuit, justement, c'est le moment où l'on rêve des plus belles aventures. Roux ferma enfin les yeux, et dans son rêve, il courait sur un grand tapis d'étoiles. Au matin, il était le renard le plus en forme de toute la forêt. Bonne nuit, petit renard." },
  { emoji: '🌙', titre: 'La lune et le doudou perdu', texte: "Lou avait perdu son doudou lapin. Impossible de dormir sans lui ! Par la fenêtre, la lune lui fit un clin d'œil. « Ne t'inquiète pas, dit-elle tout doucement, je vais éclairer ta chambre pour t'aider à le retrouver. » Sa lumière argentée glissa sous le lit, derrière les coussins, jusqu'à une petite oreille toute douce qui dépassait du panier de linge. « Le voilà ! » murmura Lou en serrant son lapin très fort. « Merci, madame la Lune. » La lune sourit : « Maintenant, dormez bien tous les deux. Je veille sur vous. » Et Lou s'endormit, son doudou contre la joue, bercé par la douce lumière de la lune." },
  { emoji: '🐢', titre: 'La tortue qui rêvait de voler', texte: "Camille la tortue regardait les oiseaux avec envie. « Un jour, je volerai moi aussi », disait-elle. Les autres riaient : « Une tortue, ça ne vole pas ! » Mais Camille ne se décourageait pas. Un soir, elle grimpa tout en haut d'une colline, ferma les yeux… et sentit le vent caresser sa carapace. Elle n'avait pas d'ailes, mais là-haut, avec le vent et le ciel immense, elle se sentait plus légère qu'une plume. « Voler, se dit-elle, c'est peut-être juste se sentir libre. » Et chaque soir, du haut de sa colline, Camille souriait aux étoiles. Parfois, les plus beaux rêves ne se réalisent pas comme on l'imaginait — ils sont encore plus doux." },
  { emoji: '🐻', titre: 'Le gros ours qui avait peur du noir', texte: "Barnabé était un grand ours brun, fort et courageux le jour. Mais le soir venu, dans sa grotte, il n'aimait pas du tout le noir. « Et s'il y avait quelque chose ? » pensait-il. Un soir, il prit son courage à deux pattes et alluma une petite lanterne. Le noir n'était plus partout : juste dans les coins, bien sage. Il comprit que le noir ne cachait rien de méchant — c'était simplement la nuit qui s'installait, douce et tranquille, pour que tout le monde se repose. Barnabé souffla sa lanterne, écouta le vent dans les arbres, et s'endormit en serrant son oreiller. Le lendemain, il dit à ses amis : « Le noir, c'est juste un gros câlin de la nuit. » Bonne nuit, Barnabé." },
  { emoji: '⭐', titre: "L'étoile qui voulait descendre sur Terre", texte: "Tout là-haut, une petite étoile s'ennuyait de briller toujours au même endroit. « Je veux voir la Terre de près ! » disait-elle. Une nuit, elle demanda à un nuage de l'aider à descendre. Mais plus elle s'approchait, plus elle comprenait une chose : vue de près, elle n'éclairait qu'un tout petit coin. Vue du ciel, elle éclairait les rêves de milliers d'enfants endormis. Alors elle remonta tout doucement à sa place et se remit à scintiller de toutes ses forces. « Ma place est ici, à veiller sur tout le monde. » Et si tu regardes par la fenêtre, c'est peut-être elle qui te fait un clin d'œil, juste avant que tu fermes les yeux. Fais de beaux rêves." },
  { emoji: '🐌', titre: "L'escargot pressé", texte: "Gaston l'escargot en avait assez d'être lent. « Tout le monde va plus vite que moi ! » râlait-il. Un matin, il décida de se dépêcher coûte que coûte. Il fonça… et passa à côté de la rosée qui brillait, des fraises mûres, du chant des oiseaux. Le soir, fatigué, il n'avait rien vu de sa journée. Le lendemain, il reprit son rythme tranquille. Il sentit le parfum des fleurs, salua une coccinelle, goûta une feuille délicieuse. « Finalement, sourit Gaston, aller doucement, c'est profiter de tout. » Et il s'endormit dans sa jolie coquille, le cœur léger. Parfois, prendre son temps, c'est le plus beau des cadeaux. Bonne nuit, petit escargot." },
  { emoji: '🦉', titre: 'Le hibou qui gardait les rêves', texte: "Chaque nuit, Hulotte le hibou faisait le tour de la forêt. Mais il ne chassait pas : il veillait sur les rêves des animaux endormis. D'un coup d'aile, il rattrapait les cauchemars qui s'échappaient et les transformait en petits nuages de coton, tout doux. Au lapin, il offrait des rêves de carottes géantes ; à l'écureuil, des forêts pleines de noisettes ; aux enfants, des rêves de câlins et de rires. « Dormez tranquilles, murmurait-il, je suis là. » Au petit matin, fatigué mais content, Hulotte rentrait se coucher, sachant que tout le monde avait bien dormi. Ce soir, lui aussi veille sur toi. Ferme les yeux : ton plus beau rêve t'attend." },
  { emoji: '🐳', titre: 'La baleine et le petit poisson', texte: "Dans l'océan vivait Mona, une immense baleine, et Pic, un tout petit poisson argenté. « Tu es si grande, et moi si petit, soupirait Pic. À quoi je sers ? » Mona sourit : « Regarde. » Quand un courant trop fort arrivait, le petit Pic se faufilait entre les rochers où Mona ne pouvait pas aller, et trouvait le chemin. « Tu vois, dit Mona, grand ou petit, chacun a sa force. » Depuis, ils voyageaient ensemble : la grande pour protéger, le petit pour guider. Et le soir, Pic s'endormait à l'abri, tout près de son énorme amie qui le berçait de son chant grave. Tu es peut-être petit, toi aussi — mais tu comptes énormément. Bonne nuit." }
];
function openHistoires() {
  closeOverlay(); const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>📖 Histoires du soir</h2></div><div class="overlay-body"><div class="card"><div class="list">${HISTOIRES.map((h, i) => `<div class="item recipe" data-hist="${i}"><span class="label">${h.emoji} ${esc(h.titre)}</span><span class="go">›</span></div>`).join('')}</div></div><p class="muted" style="text-align:center;font-size:12px">À lire tout doucement, blottis ensemble. 💛</p></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openGuide);
  ov.querySelectorAll('[data-hist]').forEach((r) => r.addEventListener('click', () => histoireDetail(+r.dataset.hist)));
}
function histoireDetail(i) {
  const h = HISTOIRES[i]; if (!h) return; closeOverlay();
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>${h.emoji} ${esc(h.titre)}</h2></div><div class="overlay-body"><div class="card"><p style="margin:0;font-size:16px;line-height:1.7">${esc(h.texte)}</p></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', openHistoires);
}

function weatherDesc(code) {
  if (code === 0) return ['☀️', 'Ensoleillé', 'ext'];
  if (code <= 3) return ['⛅', 'Nuageux', 'ext'];
  if (code <= 48) return ['🌫️', 'Brouillard', 'int'];
  if (code <= 67) return ['🌧️', 'Pluvieux', 'int'];
  if (code <= 77) return ['❄️', 'Neige', 'int'];
  if (code <= 82) return ['🌦️', 'Averses', 'int'];
  return ['⛈️', 'Orageux', 'int'];
}
function injectWeather(el) {
  const ville = (data.reglages.ville || '').trim(); if (!ville) return;
  const hero = el.querySelector('.dash-hero'); if (!hero) return;
  hero.insertAdjacentHTML('afterend', `<div class="card" id="weather-card"><span class="muted">🌦️ Météo…</span></div>`);
  const set = (html) => { const c = el.querySelector('#weather-card'); if (c) c.innerHTML = html; };
  const show = (d) => { const [emo, desc, lieu] = weatherDesc(d.code); const sugg = lieu === 'ext' ? "Beau temps : tente une sortie ou un jeu dehors !" : "Plutôt dedans aujourd'hui : un jeu ou une activité maison."; set(`<div style="display:flex;align-items:center;gap:12px"><span style="font-size:32px">${emo}</span><span><b>${esc(d.name)} · ${d.temp}°C</b><br><span class="muted" style="font-size:13px">${desc} — ${sugg}</span></span></div>`); };
  if (weatherCache && weatherCache.ville === ville && (Date.now() - weatherCache.ts < 3600000)) { show(weatherCache.data); return; }
  fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(ville) + '&count=1&language=fr&format=json')
    .then((r) => r.json())
    .then((g) => { if (!g.results || !g.results[0]) { set('<span class="muted">🌦️ Ville « ' + esc(ville) + ' » introuvable (Réglages).</span>'); return Promise.reject(); } const o = g.results[0]; return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + o.latitude + '&longitude=' + o.longitude + '&current=temperature_2m,weather_code').then((r) => r.json()).then((w) => ({ name: o.name, temp: Math.round(w.current.temperature_2m), code: w.current.weather_code })); })
    .then((d) => { weatherCache = { ville, ts: Date.now(), data: d }; show(d); })
    .catch(() => { const c = el.querySelector('#weather-card'); if (c && /Météo…/.test(c.textContent)) set('<span class="muted">🌦️ Météo indisponible (hors-ligne).</span>'); });
}

/* ============================================================
   SECOURS — gestes de premiers secours (tous publics)
   ============================================================ */
const SECOURS = [
  { id: 'sc1', emoji: '🫀', titre: "Arrêt cardiaque", cat: 'Urgence vitale', gestes: ["La personne ne réagit pas et ne respire pas (ou anormalement).", "Appelle le 15 (ou fais-le appeler) et demande un défibrillateur.", "Compressions : au centre de la poitrine, bras tendus, appuie fort et vite (5-6 cm, 100 à 120 par minute).", "Si tu es formé : 30 compressions puis 2 insufflations. Sinon, fais les compressions sans t'arrêter.", "Dès qu'un défibrillateur (DAE) arrive, allume-le et suis ses instructions vocales."], alerte: "Appelle le 15 immédiatement et ne t'arrête qu'à l'arrivée des secours." },
  { id: 'sc2', emoji: '😮‍💨', titre: "Étouffement (adulte ou enfant)", cat: 'Urgence vitale', gestes: ["La personne ne peut plus parler, tousser ni respirer.", "Donne 5 claques vigoureuses dans le dos, entre les omoplates.", "Si ça ne suffit pas : 5 compressions abdominales (Heimlich) — poing au creux de l'estomac, tire vers toi et vers le haut.", "Alterne 5 claques / 5 compressions jusqu'à ce que ça se débloque.", "Si la personne perd connaissance : allonge-la et commence les compressions (voir Arrêt cardiaque)."], alerte: "Appelle le 15 si l'obstruction ne se lève pas ou en cas de perte de connaissance." },
  { id: 'sc3', emoji: '👶', titre: "Étouffement (bébé de moins d'1 an)", cat: 'Bébé & enfant', gestes: ["Allonge le bébé sur ton avant-bras, tête plus basse que le corps.", "Donne 5 claques dans le dos, entre les omoplates.", "Retourne-le sur le dos : 5 compressions thoraciques avec 2 doigts, au milieu de la poitrine.", "Alterne 5 claques / 5 compressions.", "NE FAIS PAS la méthode de Heimlich (compressions abdominales) sur un bébé."], alerte: "Appelle le 15 sans attendre." },
  { id: 'sc4', emoji: '🩸', titre: "Hémorragie (saignement abondant)", cat: 'Urgence vitale', gestes: ["Appuie fortement et directement sur la plaie (avec un tissu propre si possible).", "Allonge la personne.", "Maintiens la pression sans jamais relâcher.", "Si tu as un garrot ET une formation, utilise-le sur un membre, en dernier recours (note l'heure de pose)."], alerte: "Appelle le 15 et continue de comprimer jusqu'aux secours." },
  { id: 'sc5', emoji: '😵', titre: "Inconscient qui respire (PLS)", cat: 'Urgence vitale', gestes: ["La personne ne répond pas mais respire.", "Bascule doucement sa tête en arrière pour libérer les voies aériennes.", "Mets-la en Position Latérale de Sécurité (sur le côté, bouche tournée vers le sol).", "Surveille qu'elle continue de respirer.", "Couvre-la pour la garder au chaud."], alerte: "Appelle le 15 et surveille la respiration jusqu'aux secours." },
  { id: 'sc6', emoji: '🧠', titre: "AVC (attaque cérébrale)", cat: 'Urgence vitale', gestes: ["Pense « VITE » : Visage qui tombe d'un côté ? Incapacité à lever un bras ? Trouble de la parole ?", "Si UN SEUL de ces signes apparaît, c'est une urgence.", "Note l'heure exacte d'apparition des signes (très important pour les médecins).", "Allonge la personne, ne lui donne ni à boire ni à manger."], alerte: "Appelle le 15 IMMÉDIATEMENT — chaque minute compte." },
  { id: 'sc7', emoji: '❤️', titre: "Douleur dans la poitrine", cat: 'Malaise', gestes: ["Douleur qui serre la poitrine, parfois le bras gauche ou la mâchoire, avec sueurs et essoufflement.", "Mets la personne au repos complet, assise ou demi-assise.", "Desserre ses vêtements et rassure-la.", "Ne la laisse pas seule."], alerte: "Appelle le 15 sans attendre, même en cas de simple doute." },
  { id: 'sc8', emoji: '🦴', titre: "Fracture ou entorse", cat: 'Traumatisme', gestes: ["Ne tente jamais de remettre le membre en place.", "Immobilise la zone dans la position où elle se trouve.", "Applique du froid (poche de glace dans un linge) pour limiter le gonflement.", "Surélève le membre si possible."], alerte: "Consulte les urgences ; appelle le 15 si déformation importante ou os apparent." },
  { id: 'sc9', emoji: '🤕', titre: "Traumatisme crânien / grosse chute", cat: 'Traumatisme', gestes: ["Si tu suspectes une atteinte du dos ou de la nuque, NE BOUGE PAS la personne.", "Garde-la allongée et au calme, parle-lui.", "Surveille son état de conscience."], alerte: "Appelle le 15 en cas de perte de connaissance, vomissements, confusion, ou saignement de l'oreille/du nez." },
  { id: 'sc10', emoji: '🩹', titre: "Plaie / coupure", cat: 'Brûlure & plaie', gestes: ["Lave-toi les mains. Nettoie la plaie à l'eau et au savon.", "Désinfecte, puis couvre d'un pansement.", "Si ça saigne, comprime quelques minutes."], alerte: "Consulte si la plaie est profonde, bâille, est très sale, ou si ton vaccin antitétanique n'est pas à jour." },
  { id: 'sc11', emoji: '🔥', titre: "Brûlure", cat: 'Brûlure & plaie', gestes: ["Passe la zone sous l'eau fraîche (pas glacée) pendant 15 minutes.", "Retire bagues, montre et vêtements non collés à la peau.", "Ne perce pas les cloques, couvre d'un linge propre.", "Ne mets ni beurre, ni dentifrice, ni glaçon."], alerte: "Appelle le 15 si la brûlure est étendue, profonde, au visage, aux mains, aux parties génitales, ou chez un enfant." },
  { id: 'sc12', emoji: '😣', titre: "Malaise / évanouissement", cat: 'Malaise', gestes: ["Allonge la personne et surélève ses jambes.", "Desserre ses vêtements et fais de l'air.", "Si elle est diabétique et consciente, donne-lui du sucre.", "Au réveil, laisse-la se relever tout doucement."], alerte: "Appelle le 15 si elle ne reprend pas connaissance rapidement ou se sent vraiment mal." },
  { id: 'sc13', emoji: '🌡️', titre: "Coup de chaleur / insolation", cat: 'Malaise', gestes: ["Mets la personne à l'ombre, au frais.", "Déshabille-la en partie et rafraîchis-la (linge humide, ventilation).", "Fais-la boire de l'eau fraîche si elle est consciente."], alerte: "Appelle le 15 en cas de fièvre élevée, confusion ou perte de connaissance." },
  { id: 'sc14', emoji: '🐝', titre: "Réaction allergique grave", cat: 'Urgence vitale', gestes: ["Gonflement du visage, des lèvres ou de la gorge, difficulté à respirer, malaise.", "Si la personne a un stylo d'adrénaline prescrit, aide-la à l'utiliser (dans la cuisse).", "Installe-la assise pour mieux respirer (ou allongée si elle se sent mal)."], alerte: "Appelle le 15 IMMÉDIATEMENT." },
  { id: 'sc15', emoji: '⚡', titre: "Crise d'épilepsie (convulsions)", cat: 'Malaise', gestes: ["Écarte les objets dangereux et protège sa tête (coussin, vêtement).", "NE mets RIEN dans sa bouche et ne la maintiens pas de force.", "Note l'heure de début de la crise.", "Quand les secousses s'arrêtent, mets-la en PLS (sur le côté)."], alerte: "Appelle le 15 si la crise dure plus de 5 min, se répète, ou si c'est la première fois." },
  { id: 'sc16', emoji: '🧪', titre: "Intoxication (produit, médicament)", cat: 'Autre', gestes: ["Ne fais PAS vomir la personne.", "Ne lui donne rien à boire sans avis médical.", "Garde l'emballage du produit ou du médicament avec toi."], alerte: "Appelle le Centre antipoison (01 45 42 59 00) ou le 15." },
  { id: 'sc17', emoji: '🌊', titre: "Noyade", cat: 'Urgence vitale', gestes: ["Sors la personne de l'eau en assurant TA sécurité d'abord.", "Si elle ne respire pas, commence la réanimation (voir Arrêt cardiaque).", "Si elle respire, mets-la en PLS et couvre-la."], alerte: "Appelle le 15 ou le 18 sans attendre." },
  { id: 'sc18', emoji: '🔌', titre: "Électrisation", cat: 'Urgence vitale', gestes: ["COUPE le courant AVANT de toucher la personne (disjoncteur, prise).", "Ne la touche jamais tant que le courant passe.", "Une fois en sécurité, vérifie sa respiration : PLS ou réanimation selon son état."], alerte: "Appelle le 15 ou le 18." },
  { id: 'sc19', emoji: '👃', titre: "Saignement de nez", cat: 'Brûlure & plaie', gestes: ["Assieds la personne, tête penchée en AVANT (surtout pas en arrière).", "Pince fermement les narines pendant 10 minutes, sans relâcher.", "Fais-la respirer par la bouche."], alerte: "Consulte si le saignement dure plus de 20 min, est très abondant, ou survient après un choc à la tête." },
  { id: 'sc20', emoji: '🐍', titre: "Piqûre / morsure", cat: 'Autre', gestes: ["Piqûre d'insecte : retire le dard, désinfecte, applique du froid.", "Tique : retire-la avec un tire-tique sans l'écraser, désinfecte, surveille l'apparition d'une rougeur.", "Morsure animale : lave abondamment à l'eau et au savon, puis désinfecte."], alerte: "Appelle le 15 en cas de gêne respiratoire (allergie), de morsure de serpent ou de morsure profonde." },
  { id: 'sc21', emoji: '🍬', titre: "Hypoglycémie (malaise du diabétique)", cat: 'Malaise', gestes: ["Signes chez un diabétique : sueurs, tremblements, pâleur, confusion, faim soudaine.", "Si la personne est consciente : donne-lui du sucre vite (morceaux de sucre, jus de fruits, soda — pas « light »).", "Reste avec elle ; elle devrait aller mieux en 10 à 15 minutes.", "Si elle est inconsciente : NE donne RIEN par la bouche et mets-la en PLS."], alerte: "Appelle le 15 si elle est inconsciente, convulse, ou ne s'améliore pas." },
  { id: 'sc22', emoji: '👁️', titre: "Projection dans l'œil", cat: 'Autre', gestes: ["Rince l'œil abondamment à l'eau tiède pendant au moins 15 minutes.", "Garde l'œil ouvert ; fais couler l'eau du coin interne vers l'extérieur.", "Ne frotte pas l'œil. Retire les lentilles si tu peux.", "Garde l'emballage du produit s'il s'agit d'un produit chimique."], alerte: "Appelle le 15 ou le Centre antipoison pour un produit chimique ; consulte en urgence si douleur ou baisse de vue." },
  { id: 'sc23', emoji: '🦷', titre: "Dent cassée ou arrachée", cat: 'Traumatisme', gestes: ["Récupère la dent en la tenant par le haut (la couronne), jamais par la racine.", "Ne la nettoie pas et ne la frotte pas.", "Conserve-la dans du lait (ou dans la salive, contre la joue) pour la garder vivante.", "File chez le dentiste : une dent peut parfois être réimplantée dans l'heure."], alerte: "Consulte un dentiste en urgence (ou le 15 en cas de gros traumatisme du visage)." },
  { id: 'sc24', emoji: '🫁', titre: "Crise d'asthme", cat: 'Malaise', gestes: ["Installe la personne assise, légèrement penchée en avant, et rassure-la.", "Aide-la à prendre son inhalateur de secours (le bleu), 1 à 2 bouffées.", "Renouvelle selon sa prescription si nécessaire.", "Desserre ses vêtements et fais de l'air."], alerte: "Appelle le 15 si la gêne est forte, si l'inhalateur ne fait pas effet, ou si elle a du mal à parler." }
];
let secCat = 'Tout';
let secSearch = '';
function secoursRowsHtml() {
  const f = secSearch.toLowerCase().trim();
  const list = SECOURS.filter((s) => (secCat === 'Tout' || s.cat === secCat) && (!f || s.titre.toLowerCase().includes(f)));
  if (!list.length) return '<div class="empty"><span class="e">🔍</span>Aucun geste trouvé.</div>';
  return list.map((s) => `<div class="item recipe" data-secid="${s.id}"><span class="label">${s.emoji} ${esc(s.titre)}<br><span class="muted" style="font-size:12px">${esc(s.cat)}</span></span><span class="go">›</span></div>`).join('');
}
function renderSecours(el) {
  const cats = ['Tout', 'Urgence vitale', 'Traumatisme', 'Malaise', 'Brûlure & plaie', 'Bébé & enfant', 'Autre'];
  el.innerHTML = `
    <div class="jbut" style="background:#fde8e4;color:var(--danger)">⚠️ Ces fiches ne remplacent pas une formation aux premiers secours (PSC1). En cas d'urgence, appelle le 15 ou le 112.</div>
    <div class="card"><h2>📞 Numéros d'urgence</h2><div class="quick">
      <a class="sec-num" href="tel:15"><b>15</b><span>SAMU</span></a>
      <a class="sec-num" href="tel:112"><b>112</b><span>Urgences (Europe)</span></a>
      <a class="sec-num" href="tel:18"><b>18</b><span>Pompiers</span></a>
      <a class="sec-num" href="tel:17"><b>17</b><span>Police</span></a>
      <a class="sec-num" href="tel:114"><b>114</b><span>Sourds (par SMS)</span></a>
      <a class="sec-num" href="tel:0145425900"><b>☎️</b><span>Antipoison</span></a>
    </div></div>
    <div class="card" style="text-align:center"><b>Le réflexe : PROTÉGER → ALERTER → SECOURIR</b><br><span class="muted" style="font-size:13px">Mets en sécurité, appelle le 15, puis agis.</span></div>
    <input class="input" id="sec-search" placeholder="Rechercher un geste…" autocomplete="off" value="${esc(secSearch)}" />
    <div class="chips" style="margin-top:10px">${cats.map((c) => `<button class="chip ${secCat === c ? 'on' : ''}" data-seccat="${esc(c)}">${c}</button>`).join('')}</div>
    <div class="list" id="sec-list" style="margin-top:8px">${secoursRowsHtml()}</div>`;
  el.querySelector('#sec-search').addEventListener('input', (e) => { secSearch = e.target.value; el.querySelector('#sec-list').innerHTML = secoursRowsHtml(); wireSec(el); });
  el.querySelectorAll('[data-seccat]').forEach((b) => b.addEventListener('click', () => { secCat = b.dataset.seccat; renderSecours(el); }));
  wireSec(el);
}
function wireSec(scope) { scope.querySelectorAll('[data-secid]').forEach((r) => r.addEventListener('click', () => openSecoursDetail(r.dataset.secid))); }
function openSecoursDetail(id) {
  const s = SECOURS.find((x) => x.id === id); if (!s) return; closeOverlay();
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="overlay-head"><button class="overlay-close" data-back>←</button><h2>${s.emoji} ${esc(s.titre)}</h2></div><div class="overlay-body">
    <div class="section-title">Les gestes, étape par étape</div>
    <div class="card"><ol class="steps">${s.gestes.map((g) => `<li>${esc(g)}</li>`).join('')}</ol></div>
    ${s.alerte ? `<div class="jbut" style="background:#fde8e4;color:var(--danger)">📞 ${esc(s.alerte)}</div>` : ''}
    <a class="btn btn-block" href="tel:15" style="background:var(--danger);color:#fff">📞 Appeler le 15 (SAMU)</a>
    <p class="muted" style="text-align:center;font-size:12px;margin-top:10px">Le mieux : suis une formation PSC1 (souvent gratuite via les pompiers, la Croix-Rouge…).</p></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-back]').addEventListener('click', () => { closeOverlay(); render(); });
}

/* ---------- Démarrage ---------- */
function shareList() {
  const groups = {};
  data.courses.filter((c) => !c.fait).forEach((c) => { (groups[c.rayon] = groups[c.rayon] || []).push(c.nom); });
  if (!Object.keys(groups).length) { toast('Rien à partager (liste vide)'); return; }
  let txt = '🛒 Liste de courses\n';
  RAYONS.forEach((ry) => { if (groups[ry]) txt += `\n${ry} :\n` + groups[ry].map((n) => '• ' + n).join('\n') + '\n'; });
  if (navigator.share) navigator.share({ title: 'Liste de courses', text: txt }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Liste copiée ✓')).catch(() => toast('Copie impossible'));
  else toast('Partage non disponible sur cet appareil');
}
/* ---------- Onboarding wizard (1er lancement) ---------- */
function renderOnboarding(el) {
  let step = 1;
  let contextSelected = 'alternee';
  let enfantsAccum = [{ prenom: 'Mon enfant' }];

  function showStep(s) {
    step = s;
    document.querySelectorAll('.onboarding-step').forEach((st) => st.classList.remove('active'));
    document.getElementById('onb-step-' + s).classList.add('active');
  }

  function finishOnboarding() {
    const newEnfants = enfantsAccum.map((e) => ({ id: uid(), prenom: e.prenom.trim() || 'Enfant' }));
    data.reglages.contextFamily = contextSelected;
    data.reglages.onboardingDone = true;
    data.enfants = newEnfants;
    data.routines = {};
    data.sante = {};
    data.recompenses = {};
    newEnfants.forEach((e) => {
      data.routines[e.id] = seedRoutinesFor();
      data.sante[e.id] = seedSanteFor();
      data.recompenses[e.id] = seedRecompensesFor();
    });
    save();
    el.innerHTML = '';
    boot();
  }

  el.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-counter"><span id="onb-counter">Étape 1 / 4</span></div>

      <!-- Étape 1 : Accueil + contexte -->
      <div class="onboarding-step active" id="onb-step-1">
        <div class="onboarding-body" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
          <h1 style="font-size:48px;margin-bottom:20px">👋</h1>
          <h2>Bienvenue dans Ma Tribu</h2>
          <p style="color:var(--muted);margin-bottom:30px;max-width:280px">Une app simple pour t'organiser au quotidien en tant que parent.</p>
          <div style="margin-bottom:30px;width:100%;max-width:300px">
            <div style="margin-bottom:20px">
              <input type="radio" name="context" value="alternee" checked id="c1" /><label for="c1" style="margin-left:10px;cursor:pointer">Je suis en garde alternée</label><br/>
              <span style="font-size:12px;color:var(--muted);margin-left:30px">Enfants chez moi une semaine / une semaine ailleurs</span>
            </div>
            <div style="margin-bottom:20px">
              <input type="radio" name="context" value="seul" id="c2" /><label for="c2" style="margin-left:10px;cursor:pointer">Je suis parent solo</label><br/>
              <span style="font-size:12px;color:var(--muted);margin-left:30px">Les enfants sont avec moi</span>
            </div>
            <div>
              <input type="radio" name="context" value="autre" id="c3" /><label for="c3" style="margin-left:10px;cursor:pointer">Autre situation</label><br/>
              <span style="font-size:12px;color:var(--muted);margin-left:30px">Tutelle, partage différent, etc.</span>
            </div>
          </div>
        </div>
        <div class="onboarding-feet">
          <button class="btn btn-primary btn-block" id="onb-next-1">Suivant</button>
        </div>
      </div>

      <!-- Étape 2 : Enfants -->
      <div class="onboarding-step" id="onb-step-2">
        <div class="onboarding-body">
          <h2>Qui sont tes enfants ?</h2>
          <div id="onb-enfants-list" style="margin-bottom:20px"></div>
          <div class="card">
            <div style="display:flex;gap:8px">
              <input class="input" id="onb-prenom" placeholder="Prénom" style="flex:1" enterkeyhint="next" />
            </div>
            <button class="btn btn-accent btn-block" id="onb-add-enfant" style="margin-top:10px">+ Ajouter un enfant</button>
          </div>
        </div>
        <div class="onboarding-feet">
          <button class="btn" id="onb-back-2">← Retour</button>
          <button class="btn btn-primary" id="onb-next-2" style="flex:1">Suivant</button>
        </div>
      </div>

      <!-- Étape 3 : Ville + Notifications -->
      <div class="onboarding-step" id="onb-step-3">
        <div class="onboarding-body" style="display:flex;flex-direction:column;justify-content:center">
          <h2>Pour finir…</h2>
          <div class="card">
            <label style="display:block;font-weight:bold;margin-bottom:8px">📍 Où habites-tu ?</label>
            <input class="input" id="onb-ville" placeholder="Ville ou code postal" style="margin-bottom:10px" />
            <span style="font-size:12px;color:var(--muted)">Pour afficher la météo sur le tableau de bord (optionnel)</span>
          </div>
          <div class="card">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="onb-notifs" />
              <span>🔔 Activer les notifications</span>
            </label>
            <span style="font-size:12px;color:var(--muted);display:block;margin-top:10px">Tu seras averti des rappels et activités du jour</span>
          </div>
        </div>
        <div class="onboarding-feet">
          <button class="btn" id="onb-back-3">← Retour</button>
          <button class="btn btn-primary" id="onb-next-3" style="flex:1">Suivant</button>
        </div>
      </div>

      <!-- Étape 4 : Résumé -->
      <div class="onboarding-step" id="onb-step-4">
        <div class="onboarding-body" style="display:flex;flex-direction:column;justify-content:center">
          <h2>C'est prêt ! 🎉</h2>
          <div class="card">
            <p style="font-weight:bold;margin-bottom:10px">Résumé :</p>
            <div style="font-size:14px;color:var(--muted)">
              <p><b>Situation familiale :</b> <span id="onb-recap-context"></span></p>
              <p><b>Enfants :</b> <span id="onb-recap-enfants"></span></p>
              <div id="onb-recap-ville" style="display:none"><p><b>Localité :</b> <span id="onb-recap-ville-text"></span></p></div>
            </div>
          </div>
          <div class="card" style="background:var(--primary-soft);border-left:3px solid var(--primary)">
            <p style="margin:0;font-size:13px">💡 Tu peux modifier tous ces paramètres dans ⚙️ Réglages quand tu veux.</p>
          </div>
        </div>
        <div class="onboarding-feet">
          <button class="btn" id="onb-back-4">← Retour</button>
          <button class="btn btn-primary btn-block" id="onb-finish">C'est parti 🚀</button>
        </div>
      </div>
    </div>`;

  // Rendre la liste d'enfants dans l'étape 2
  function renderEnfantsList() {
    const list = document.getElementById('onb-enfants-list');
    list.innerHTML = enfantsAccum.map((e, i) => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <span>${esc(e.prenom)}</span>
        <button class="btn btn-mini" data-del-enfant="${i}">Retirer</button>
      </div>`).join('');
    list.querySelectorAll('[data-del-enfant]').forEach((b) => b.addEventListener('click', () => {
      enfantsAccum.splice(+b.dataset.delEnfant, 1);
      renderEnfantsList();
    }));
  }
  renderEnfantsList();

  // Étape 1 : contexte
  document.querySelectorAll('input[name="context"]').forEach((r) => {
    r.addEventListener('change', () => { contextSelected = r.value; });
    if (r.value === contextSelected) r.checked = true;
  });
  document.getElementById('onb-next-1').addEventListener('click', () => { showStep(2); document.getElementById('onb-counter').textContent = 'Étape 2 / 4'; });

  // Étape 2 : enfants
  const addEnfant = () => {
    const p = document.getElementById('onb-prenom').value.trim();
    if (!p) { toast('Indique un prénom'); return; }
    enfantsAccum.push({ prenom: p });
    document.getElementById('onb-prenom').value = '';
    renderEnfantsList();
    toast(p + ' ajouté ✓');
  };
  document.getElementById('onb-add-enfant').addEventListener('click', addEnfant);
  document.getElementById('onb-prenom').addEventListener('keydown', (e) => { if (e.key === 'Enter') addEnfant(); });
  document.getElementById('onb-back-2').addEventListener('click', () => { showStep(1); document.getElementById('onb-counter').textContent = 'Étape 1 / 4'; });
  document.getElementById('onb-next-2').addEventListener('click', () => {
    if (!enfantsAccum.length) { toast('Ajoute au moins un enfant'); return; }
    showStep(3); document.getElementById('onb-counter').textContent = 'Étape 3 / 4';
  });

  // Étape 3 : ville + notifs
  document.getElementById('onb-back-3').addEventListener('click', () => { showStep(2); document.getElementById('onb-counter').textContent = 'Étape 2 / 4'; });
  document.getElementById('onb-next-3').addEventListener('click', () => {
    const ville = document.getElementById('onb-ville').value.trim();
    if (ville) data.reglages.ville = ville;
    if (document.getElementById('onb-notifs').checked) data.reglages.notifs = true;
    showStep(4);
    // Remplir le résumé
    const ctxLabels = { alternee: 'Garde alternée', seul: 'Parent solo', autre: 'Autre situation' };
    document.getElementById('onb-recap-context').textContent = ctxLabels[contextSelected] || contextSelected;
    document.getElementById('onb-recap-enfants').textContent = enfantsAccum.map((e) => e.prenom).join(', ');
    if (ville) {
      document.getElementById('onb-recap-ville').style.display = 'block';
      document.getElementById('onb-recap-ville-text').textContent = ville;
    }
    document.getElementById('onb-counter').textContent = 'Étape 4 / 4';
  });

  // Étape 4 : finish
  document.getElementById('onb-back-4').addEventListener('click', () => { showStep(3); document.getElementById('onb-counter').textContent = 'Étape 3 / 4'; });
  document.getElementById('onb-finish').addEventListener('click', finishOnboarding);
}

function boot() {
  load();
  applyTheme();
  // Si onboarding pas complété, afficher le wizard et ne pas continuer
  if (!data.reglages.onboardingDone) {
    renderOnboarding(document.getElementById('app'));
    return;
  }
  if (data.reglages.notifs) notifyToday();
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  document.getElementById('btn-reset').addEventListener('click', openReglages);
  setTab('accueil');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing) return; refreshing = true; location.reload(); });
  }
}
document.addEventListener('DOMContentLoaded', boot);
