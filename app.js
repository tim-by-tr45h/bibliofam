const C = window.CONFIG, sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
const TYPES = ['Livre', 'BD', 'Manga', 'DVD', 'Blu-ray', 'CD', 'Jeu'];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { tab: 'home', me: null, email: '', profiles: [], items: [], q: '', ft: '', fo: '', sort: 'created_at', mode: 'add', batch: true, scanner: null, busy: false, cur: null, ex: [] };
const TABS = [
  ['home', 'Accueil', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['scan', 'Scanner', 'M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16'],
  ['lib', 'Bibliothèque', 'M5 4h4v16H5zM11 4h4v16h-4zM17.5 5l3 .8-3.5 14-3-.8z'],
  ['set', 'Réglages', 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4']
];

/* ---------- utilitaires ---------- */
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.className = 'show'; clearTimeout(tt); tt = setTimeout(() => t.className = '', 2400); }
function fail(e) { toast(/fetch|network/i.test(e.message) ? 'Connexion perdue, réessayez' : 'Erreur : ' + e.message); }
const col = n => n === 'Famille' ? '#c99a2e' : (S.profiles.find(p => p.name === n)?.color || '#888');
const owners = list => [...new Set(list.flatMap(x => x.owners || []))].join(', ') || 'la famille';
const cover = i => i.cover ? `<img src="${esc(i.cover)}" loading="lazy" alt="">` : `<div class="nc"><b>${esc((i.title || '?')[0])}</b><small>${esc(i.type)}</small></div>`;
const card = i => `<div class="card" data-act="open" data-id="${i.id}"><div class="cv">${cover(i)}${i.duplicate ? '<span class="x2">×2</span>' : ''}</div><div class="t">${esc(i.title)}</div><div class="a">${esc(i.author)}</div><div class="dots">${(i.owners || []).map(o => `<i style="background:${col(o)}" title="${esc(o)}"></i>`).join('')}</div></div>`;

/* ---------- connexion ---------- */
function login(msg = '') {
  $('#app').innerHTML = `<div class="login"><div class="logo">📚</div><h1>Bibliothèque familiale</h1><p class="mut">Connectez-vous pour voir vos livres.</p><input id="em" type="email" placeholder="E-mail" autocomplete="username"><input id="pw" type="password" placeholder="Mot de passe" autocomplete="current-password"><button class="btn" data-act="login">Se connecter</button><p class="err">${msg}</p></div>`;
}
async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return login();
    S.email = session.user.email;
    const [p, i] = await Promise.all([sb.from('profiles').select('*'), sb.from('products').select('*').order('created_at', { ascending: false })]);
    if (p.error || i.error) throw (p.error || i.error);
    S.profiles = p.data; S.items = i.data;
    S.me = S.profiles.find(x => x.id === session.user.id);
    if (!S.me) return login('Ce compte n’a pas de profil. Contactez l’administrateur.');
    render();
  } catch (e) { login('Impossible de charger les données : ' + esc(e.message)); }
}

/* ---------- vues ---------- */
const home = () => {
  const n = S.items.length, by = t => S.items.filter(i => i.type === t).length;
  return `<h1>Bonjour ${esc(S.me.name)}</h1><p class="mut">${n} produit${n > 1 ? 's' : ''} à la maison${n ? ' : ' + TYPES.filter(by).map(t => by(t) + ' ' + t.toLowerCase()).join(', ') : ''}</p><button class="btn" data-act="go" data-tab="scan">Ajouter un produit</button><h2>Derniers ajouts</h2>${n ? `<div class="grid">${S.items.slice(0, 12).map(card).join('')}</div>` : '<p class="empty">Aucun produit pour l’instant.<br>Scannez votre premier livre.</p>'}`;
};
const filt = () => {
  const q = S.q.toLowerCase(), k = S.sort;
  const a = S.items.filter(i => (!S.ft || i.type === S.ft) && (!S.fo || (S.fo === 'dup' ? i.duplicate : (i.owners || []).includes(S.fo))) && (!q || (i.title + ' ' + (i.author || '') + ' ' + (i.genre || '')).toLowerCase().includes(q)));
  return a.sort((x, y) => k === 'created_at' ? y.created_at.localeCompare(x.created_at) : k === 'year' ? (y.year || 0) - (x.year || 0) : String(x[k] || '').localeCompare(String(y[k] || ''), 'fr'));
};
const gridHtml = () => { const a = filt(); return a.length ? `<div class="grid">${a.map(card).join('')}</div>` : '<p class="empty">Aucun résultat.<br>Essayez un autre filtre.</p>'; };
const chip = (act, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}">${esc(label)}</button>`;
const lib = () => `<h1>Bibliothèque</h1><input id="q" class="search" type="search" placeholder="Titre, auteur, genre…" value="${esc(S.q)}">
<div class="chips scroll">${chip('ft', '', 'Tous', !S.ft)}${TYPES.map(t => chip('ft', t, t, S.ft === t)).join('')}</div>
<div class="chips scroll">${chip('fo', '', 'Tout le monde', !S.fo)}${['Famille', ...S.profiles.map(p => p.name)].map(n => chip('fo', n, n, S.fo === n)).join('')}${chip('fo', 'dup', 'Doublons', S.fo === 'dup')}</div>
<select id="sort">${[['created_at', 'Date d’ajout'], ['title', 'Titre'], ['author', 'Auteur'], ['genre', 'Genre'], ['year', 'Année']].map(([v, l]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>Trier par : ${l}</option>`).join('')}</select>
<div id="libgrid">${gridHtml()}</div>`;
const scan = () => `<h1>Scanner</h1><div class="seg"><button data-act="mode" data-v="add" class="${S.mode === 'add' ? 'on' : ''}">Ajouter</button><button data-act="mode" data-v="check" class="${S.mode === 'check' ? 'on' : ''}">Vérifier</button></div><div id="reader"></div><p class="mut c">${S.mode === 'add' ? 'Placez le code-barres dans le cadre.' : 'Vérifiez si un produit est déjà à la maison, sans l’ajouter.'}</p><div class="row"><input id="isbn" inputmode="numeric" placeholder="ISBN ou code-barres"><button class="btn sm" data-act="isbn">Valider</button></div>${S.mode === 'add' ? `<label class="chk"><input type="checkbox" id="batch" ${S.batch ? 'checked' : ''}> Scan en rafale</label><button class="link" data-act="manual">Saisir les infos à la main</button>` : ''}`;
const set = () => `<h1>Réglages</h1><div class="panel"><div class="who"><span class="av" style="background:${S.me.color}">${esc(S.me.name[0])}</span><div><b>${esc(S.me.name)}</b><div class="mut">${esc(S.email)}</div></div></div></div><div class="panel"><button class="row-btn" data-act="pwd">Changer mon mot de passe</button><button class="row-btn" data-act="csv">Exporter la bibliothèque (CSV)</button><button class="row-btn" data-act="out">Se déconnecter</button></div><div class="panel mut"><b>Installer sur iPhone</b><br>Dans Safari : Partager, puis « Sur l’écran d’accueil ».</div><p class="mut c">Bibliothèque familiale · version 1</p>`;

function render() {
  stopScan();
  $('#app').innerHTML = `<main>${{ home, scan, lib, set }[S.tab]()}</main><nav>${TABS.map(([k, l, d]) => `<button data-act="go" data-tab="${k}" class="${S.tab === k ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg>${l}</button>`).join('')}</nav>`;
  if (S.tab === 'scan') startScan();
}

/* ---------- scan ---------- */
function stopScan() { const sc = S.scanner; S.scanner = null; S.busy = false; if (sc) sc.stop().then(() => sc.clear()).catch(() => { }); }
async function startScan() {
  const F = Html5QrcodeSupportedFormats;
  const sc = new Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A], useBarCodeDetectorIfSupported: true, verbose: false });
  S.scanner = sc;
  const cfg = { fps: 15, aspectRatio: 1.5, qrbox: (w, h) => ({ width: Math.floor(w * 0.9), height: Math.floor(h * 0.55) }) };
  try { await sc.start({ facingMode: 'environment' }, { ...cfg, videoConstraints: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }, handle, () => { }); }
  catch (e1) {
    try { await sc.start({ facingMode: 'environment' }, cfg, handle, () => { }); }
    catch (e2) { $('#reader').innerHTML = '<p class="err" style="color:#fff">Caméra indisponible. Autorisez-la dans les réglages de Safari, ou saisissez le code ci-dessous.</p>'; }
  }
}
const resume = () => { S.busy = false; try { S.scanner?.resume(); } catch (e) { } };
async function lookup(code) {
  const log = [];
  const J = async (name, u) => { try { const r = await fetch(u); if (!r.ok) { log.push(name + ' : erreur ' + r.status); return null; } return await r.json(); } catch (e) { log.push(name + ' : réseau bloqué'); return null; } };
  const isBook = /^97[89]/.test(code);
  for (const q of isBook ? ['isbn:' + code, code] : ['isbn:' + code]) {
    const j = await J('Google Books', 'https://www.googleapis.com/books/v1/volumes?maxResults=1&q=' + q), v = j?.items?.[0]?.volumeInfo;
    if (v?.title) return { title: v.title + (v.subtitle ? ' : ' + v.subtitle : ''), author: (v.authors || []).join(', '), genre: (v.categories || [])[0] || '', year: parseInt(v.publishedDate) || '', cover: (v.imageLinks?.thumbnail || '').replace('http:', 'https:'), type: 'Livre' };
    if (j) log.push('Google Books : aucun résultat');
  }
  const oj = await J('Open Library', `https://openlibrary.org/api/books?bibkeys=ISBN:${code}&format=json&jscmd=data`), o = oj?.['ISBN:' + code];
  if (o?.title) return { title: o.title, author: (o.authors || []).map(a => a.name).join(', '), genre: (o.subjects || [])[0]?.name || '', year: parseInt(o.publish_date) || '', cover: o.cover?.medium || '', type: 'Livre' };
  if (oj) log.push('Open Library : aucun résultat');
  const e = await J('Open Library (2)', `https://openlibrary.org/isbn/${code}.json`);
  if (e?.title) return { title: e.title, author: '', genre: '', year: parseInt(e.publish_date) || '', cover: e.covers?.[0] ? `https://covers.openlibrary.org/b/id/${e.covers[0]}-M.jpg` : '', type: 'Livre' };
  return { type: isBook ? 'Livre' : 'DVD', dbg: code + ' → ' + [...new Set(log)].join(' · ') };
}
async function handle(code) {
  if (S.busy) return;
  S.busy = true; try { S.scanner?.pause(true); } catch (e) { }
  const ex = S.items.filter(i => i.barcode === code), m = ex[0] || await lookup(code);
  if (S.mode === 'check') {
    $('#sheet').innerHTML = `<div class="bd" data-act="close"></div><div class="sh c"><div class="big">${ex.length ? '✅' : '🆕'}</div><h2>${esc(m.title || code)}</h2><p>${ex.length ? 'Déjà à la maison : ' + esc(owners(ex)) : 'Pas encore dans la bibliothèque'}</p><button class="btn" data-act="close">Suivant</button></div>`;
    $('#sheet').className = 'open';
  } else { openForm({ ...m, id: undefined, barcode: code, owners: undefined }, ex); if (!ex.length && !m.title) toast('Infos introuvables : complétez la fiche'); }
}

/* ---------- fiche produit ---------- */
function openForm(it, ex = []) {
  S.cur = it; S.ex = ex;
  const names = ['Famille', ...S.profiles.map(p => p.name)], own = it.owners || [S.me.name];
  $('#sheet').innerHTML = `<div class="bd" data-act="close"></div><div class="sh"><h2>${it.id ? 'Modifier le produit' : 'Nouveau produit'}</h2>
${ex.length ? `<div class="warn">Déjà enregistré : ${esc(owners(ex))}<button class="link" data-act="dup">C’est un exemplaire en plus</button></div>` : ''}
${it.dbg ? `<div class="warn">Recherche automatique sans résultat. ${esc(it.dbg)}</div>` : ''}
${it.cover ? `<div class="fcov"><img src="${esc(it.cover)}" alt=""></div>` : ''}
<label>Titre<input id="f_title" value="${esc(it.title)}"></label>
<label>Auteur<input id="f_author" value="${esc(it.author)}"></label>
<div class="two"><label>Genre<input id="f_genre" value="${esc(it.genre)}"></label><label>Année<input id="f_year" type="number" inputmode="numeric" value="${esc(it.year)}"></label></div>
<label>Type<select id="f_type">${TYPES.map(t => `<option ${t === it.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
<div class="lbl">Possédé par</div><div class="chips" id="f_own">${names.map(n => `<label class="chip ${own.includes(n) ? 'on' : ''}"><input type="checkbox" value="${esc(n)}" ${own.includes(n) ? 'checked' : ''} hidden>${esc(n)}</label>`).join('')}</div>
${it.id ? `<label class="chk"><input type="checkbox" id="f_dup" ${it.duplicate ? 'checked' : ''}> J’ai un exemplaire en double</label>` : ''}
<button class="btn" data-act="save">${it.id ? 'Enregistrer' : 'Ajouter à la bibliothèque'}</button>
${it.id ? '<button class="link red" data-act="del">Supprimer ce produit</button>' : ''}<button class="link" data-act="close">Annuler</button></div>`;
  $('#sheet').className = 'open';
}
function closeSheet() { $('#sheet').className = ''; $('#sheet').innerHTML = ''; }
async function save() {
  const g = id => $('#' + id).value.trim(), it = S.cur;
  if (!g('f_title')) return toast('Le titre est obligatoire');
  const row = { title: g('f_title'), author: g('f_author') || null, genre: g('f_genre') || null, year: parseInt(g('f_year')) || null, type: g('f_type'), owners: [...document.querySelectorAll('#f_own input:checked')].map(i => i.value) };
  if (it.id) {
    row.duplicate = $('#f_dup').checked;
    const { data, error } = await sb.from('products').update(row).eq('id', it.id).select().single();
    if (error) return fail(error);
    S.items = S.items.map(x => x.id === it.id ? data : x); toast('Modifié ✓');
  } else {
    Object.assign(row, { barcode: it.barcode || null, cover: it.cover || null, added_by: S.me.id });
    const { data, error } = await sb.from('products').insert(row).select().single();
    if (error) return fail(error);
    S.items.unshift(data); toast('Ajouté ✓');
  }
  closeSheet();
  if (S.tab === 'scan') { if (S.batch) resume(); else { S.tab = 'home'; render(); } } else render();
}

/* ---------- événements ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, v = b.dataset.v;
  if (a === 'login') {
    const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
    return error ? login('E-mail ou mot de passe incorrect.') : init();
  }
  if (a === 'go') { S.tab = b.dataset.tab; render(); }
  else if (a === 'mode') { S.mode = v; render(); }
  else if (a === 'ft') { S.ft = v; render(); }
  else if (a === 'fo') { S.fo = v; render(); }
  else if (a === 'open') openForm(S.items.find(i => i.id === b.dataset.id));
  else if (a === 'isbn') { const c = $('#isbn').value.replace(/\D/g, ''); c.length >= 8 ? handle(c) : toast('Code invalide'); }
  else if (a === 'manual') openForm({ type: 'Livre' });
  else if (a === 'close') { closeSheet(); if (S.tab === 'scan') resume(); }
  else if (a === 'save') save();
  else if (a === 'dup') {
    const { data, error } = await sb.from('products').update({ duplicate: true }).eq('id', S.ex[0].id).select().single();
    if (error) return fail(error);
    S.items = S.items.map(x => x.id === data.id ? data : x); closeSheet(); toast('Exemplaire en plus noté ✓'); resume();
  }
  else if (a === 'del') {
    if (!confirm('Supprimer ce produit ?')) return;
    const { error } = await sb.from('products').delete().eq('id', S.cur.id);
    if (error) return fail(error);
    S.items = S.items.filter(x => x.id !== S.cur.id); closeSheet(); toast('Supprimé'); render();
  }
  else if (a === 'pwd') {
    const p = prompt('Nouveau mot de passe (8 caractères minimum)');
    if (p && p.length >= 8) { const { error } = await sb.auth.updateUser({ password: p }); toast(error ? error.message : 'Mot de passe modifié ✓'); }
  }
  else if (a === 'csv') {
    const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const rows = [['Titre', 'Auteur', 'Genre', 'Année', 'Type', 'Code-barres', 'Propriétaires', 'Doublon', 'Date d’ajout'], ...S.items.map(i => [i.title, i.author, i.genre, i.year, i.type, i.barcode, (i.owners || []).join(' + '), i.duplicate ? 'oui' : '', i.created_at.slice(0, 10)])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(';')).join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'bibliotheque.csv' }).click();
  }
  else if (a === 'out') { await sb.auth.signOut(); S.items = []; login(); }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; $('#libgrid').innerHTML = gridHtml(); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'batch') S.batch = t.checked;
  else if (t.id === 'sort') { S.sort = t.value; $('#libgrid').innerHTML = gridHtml(); }
  else if (t.closest('#f_own')) t.parentElement.classList.toggle('on', t.checked);
});
init();
