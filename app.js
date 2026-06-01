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
    version: 6,
    reglages: { grand: 'Le grand', petit: 'Le petit', welcomeDismissed: false, theme: 'clair', accent: 'teal', midiSemaine: false },
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
  if (data.reglages.theme === undefined) data.reglages.theme = 'clair';
  if (data.reglages.accent === undefined) data.reglages.accent = 'teal';
  if (data.reglages.midiSemaine === undefined) data.reglages.midiSemaine = false;
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
  if (!data.routines) data.routines = s.routines;
  else if (data.routines.matin || data.routines.soir) { const old = data.routines; data.routines = seedRoutines(); data.routines.petit = { matin: old.matin || [], soir: old.soir || [] }; }
  else { data.routines.petit = data.routines.petit || seedRoutines().petit; data.routines.grand = data.routines.grand || seedRoutines().grand; }
  data.version = 6;
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
  const sh = document.getElementById('c-share'); if (sh) sh.addEventListener('click', shareList);

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
function recipeBookRowsHtml(filter) {
  const f = (filter || '').toLowerCase().trim();
  const list = data.recettes.filter((r) => !f || r.nom.toLowerCase().includes(f));
  if (!list.length) return `<div class="empty">Aucune recette trouvée.</div>`;
  return list.map((r) => `<div class="item recipe" data-rid="${r.id}"><span class="label">${r.emoji} ${esc(r.nom)}</span>${r.temps ? `<span class="muted" style="margin-right:6px">${esc(r.temps)}</span>` : ''}<span class="go">›</span></div>`).join('');
}
function openRecipeBook() {
  closeOverlay();
  let filter = '';
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `
    <div class="overlay-head"><button class="overlay-close" data-close>✕</button><h2>📖 Livre de recettes</h2></div>
    <div class="overlay-body">
      <input class="input" id="rb-search" placeholder="Rechercher une recette…" autocomplete="off" />
      <p class="muted" style="margin:10px 2px">${data.recettes.length} recettes — touche pour voir la préparation</p>
      <div class="list" id="rb-list">${recipeBookRowsHtml('')}</div>
    </div>`;
  document.body.appendChild(ov);
  const wire = () => ov.querySelectorAll('.recipe').forEach((row) => row.addEventListener('click', () => openRecipeDetail(row.dataset.rid, 'book')));
  wire();
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  const s = ov.querySelector('#rb-search');
  s.addEventListener('input', () => { filter = s.value; ov.querySelector('#rb-list').innerHTML = recipeBookRowsHtml(filter); wire(); });
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
      <div class="set-section"><h3>🎨 Apparence & options</h3>
        <div class="card">
          <div class="opt-row"><span>🌙 Mode sombre</span><button class="toggle ${data.reglages.theme === 'sombre' ? 'on' : ''}" id="op-theme"><i></i></button></div>
          <div class="divider"></div>
          <div class="opt-row"><span>🎨 Couleur de l'appli</span><div class="swatches">${Object.keys(ACCENTS).map((k) => `<button class="swatch ${data.reglages.accent === k ? 'on' : ''}" data-acc="${k}" style="background:${ACCENTS[k].primary}" title="${ACCENTS[k].nom}"></button>`).join('')}</div></div>
          <div class="divider"></div>
          <div class="opt-row"><span>🍽️ Repas du midi en semaine</span><button class="toggle ${data.reglages.midiSemaine ? 'on' : ''}" id="op-midi"><i></i></button></div>
        </div>
      </div>
      <p class="muted" style="text-align:center">Ma Tribu · v6 · 100 % sur ton appareil</p>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').addEventListener('click', () => { closeOverlay(); render(); });
  ov.querySelector('#set-save').addEventListener('click', () => { const p = ov.querySelector('#set-petit').value.trim(), g = ov.querySelector('#set-grand').value.trim(); if (p) data.reglages.petit = p; if (g) data.reglages.grand = g; save(); toast('Prénoms enregistrés'); openReglages(); });
  ov.querySelector('#ct-add').addEventListener('click', () => { const nom = ov.querySelector('#ct-nom').value.trim(); if (!nom) { toast('Indique au moins un nom'); return; } data.contacts.push({ id: uid(), nom, role: ov.querySelector('#ct-role').value.trim(), tel: ov.querySelector('#ct-tel').value.trim() }); save(); openReglages(); });
  ov.querySelectorAll('[data-cid]').forEach((row) => row.querySelector('[data-delc]').addEventListener('click', () => { data.contacts = data.contacts.filter((x) => x.id !== row.dataset.cid); save(); openReglages(); }));
  ov.querySelector('#bk-export').addEventListener('click', exportData);
  ov.querySelector('#bk-import').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
  ov.querySelector('#bk-reset').addEventListener('click', () => confirmDialog('Effacer TOUTES les données et repartir de zéro ?', () => { localStorage.removeItem(STORE_KEY); location.reload(); }, { danger: true, yes: 'Tout effacer' }));
  ov.querySelector('#op-theme').addEventListener('click', () => { data.reglages.theme = data.reglages.theme === 'sombre' ? 'clair' : 'sombre'; save(); applyTheme(); openReglages(); });
  ov.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => { data.reglages.accent = b.dataset.acc; save(); applyTheme(); openReglages(); }));
  ov.querySelector('#op-midi').addEventListener('click', () => { data.reglages.midiSemaine = !data.reglages.midiSemaine; save(); openReglages(); });
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
function boot() {
  load();
  applyTheme();
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  document.getElementById('btn-reset').addEventListener('click', openReglages);
  setTab('accueil');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', boot);
