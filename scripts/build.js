import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const BUILD_VERSION = Date.now();

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFileSafe(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

async function copyImages() {
  const srcImages = path.join(SRC_DIR, 'images');
  const destImages = path.join(ROOT_DIR, 'images');
  try {
    const stat = await fs.stat(srcImages);
    if (!stat.isDirectory()) return;
  } catch {
    return;
  }
  await ensureDir(destImages);
  const entries = await fs.readdir(srcImages, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(srcImages, entry.name);
    const to = path.join(destImages, entry.name);
    if (entry.isDirectory()) {
      await ensureDir(to);
      const subEntries = await fs.readdir(from, { withFileTypes: true });
      for (const sub of subEntries) {
        const fromSub = path.join(from, sub.name);
        const toSub = path.join(to, sub.name);
        if (sub.isDirectory()) continue;
        await fs.copyFile(fromSub, toSub);
      }
    } else {
      await fs.copyFile(from, to);
    }
  }
}

function renderLayout({ title, contentHtml, isSubPage = false }) {
  const basePath = isSubPage ? '../' : './';
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} · Politica & Geopolitica</title>
    <link rel="stylesheet" href="${basePath}styles.css?v=${BUILD_VERSION}" />
  </head>
  <body>
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="${basePath}index.html">Politica & Geopolitica</a>
        <nav class="nav">
          <a href="${basePath}index.html">Home</a>
          <a href="${basePath}sezioni.html">Sezioni</a>
          <a href="${basePath}rubriche.html">Rubriche</a>
          <a href="${basePath}approfondimenti.html">Approfondimenti</a>
          <a href="${basePath}autori.html">Autori</a>
          <a href="${basePath}chi-siamo.html">Chi siamo</a>
          <a href="${basePath}contatti.html">Contatti</a>
        </nav>
      </div>
    </header>
    <main class="container main-content">
      ${contentHtml}
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>© ${new Date().getFullYear()} Politica & Geopolitica · Fonti sempre citate per credibilità.</p>
      </div>
    </footer>
  </body>
</html>`;
}

function renderList(title, items) {
  const lis = items.map((t) => `<li>${t}</li>`).join('');
  return `<section class="card">
    <h1>${title}</h1>
    <ul class="bullet">${lis}</ul>
  </section>`;
}

function renderArticleCard(article, isSubPage = false) {
  const { title, excerpt, date, section, slug } = article;
  const basePath = isSubPage ? '../' : './';
  return `<article class="card card-article">
    <div class="card-body">
      <div class="meta"><span class="pill">${section}</span><time>${new Date(date).toLocaleDateString('it-IT')}</time></div>
      <h3 class="card-title"><a href="${basePath}articoli/${slug}.html">${title}</a></h3>
      <p class="card-text">${excerpt}</p>
    </div>
    <div class="card-actions"><a class="button" href="${basePath}articoli/${slug}.html">Leggi</a></div>
  </article>`;
}

function renderSectionCard(sectionName, isSubPage = false) {
  const slug = slugify(sectionName);
  const basePath = isSubPage ? '../' : './';
  const imgSrc = `${basePath}images/sections/${slug}.jpg`;
  return `<a class="card image-card" href="${basePath}sezioni/${slug}.html">
    <div class="card-media"><img src="${imgSrc}" alt="${sectionName}" loading="lazy" /></div>
    <div class="card-body"><h3 class="card-title">${sectionName}</h3></div>
  </a>`;
}

function renderMacroCard(sectionName, macro, isSubPage = false) {
  const sectionSlug = slugify(sectionName);
  const macroSlug = slugify(macro);
  const basePath = isSubPage ? '../' : './';
  const imgSrc = `${basePath}images/sections/${sectionSlug}.jpg`;
  return `<a class="card image-card" href="${basePath}sezioni/${sectionSlug}-${macroSlug}.html">
    <div class="card-media"><img src="${imgSrc}" alt="${sectionName} · ${macro}" loading="lazy" /></div>
    <div class="card-body"><h3 class="card-title">${macro}</h3><p class="card-text">${sectionName}</p></div>
  </a>`;
}

function renderSectionCardsGrid(sectionName, articles, isSubPage = false) {
  const filtered = articles.filter(a => a.section === sectionName);
  if (!filtered.length) return '';
  return `<section class="stack-md">
    <h2>Articoli</h2>
    <div class="grid cards">${filtered.map(article => renderArticleCard(article, isSubPage)).join('')}</div>
  </section>`;
}

function renderBreadcrumb(crumbs) {
  const lastIndex = crumbs.length - 1;
  const items = crumbs.map((c, i) => {
    if (i === lastIndex || !c.href) return `<li aria-current="page">${c.label}</li>`;
    return `<li><a href="${c.href}">${c.label}</a></li>`;
  }).join('');
  return `<nav class="breadcrumbs" aria-label="breadcrumb"><ol>${items}</ol></nav>`;
}

async function copyStyles() {
  const src = path.join(SRC_DIR, 'styles.css');
  const dest = path.join(ROOT_DIR, 'styles.css');
  let css = '';
  try {
    css = await fs.readFile(src, 'utf-8');
  } catch (err) {
    css = `:root{--bg:#fcfcfc;--surface:#ffffff;--text:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#111827;--accent-2:#2f3b52}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;line-height:1.7;color:var(--text);background:var(--bg)}
.container{max-width:1080px;margin:0 auto;padding:0 20px}
.site-header{position:sticky;top:0;background:rgba(255,255,255,.8);backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--line);}
.header-inner{display:flex;align-items:center;justify-content:space-between;padding:14px 0}
.brand{font-weight:700;color:var(--accent);text-decoration:none;letter-spacing:.2px}
.nav a{margin-left:14px;color:#334155;text-decoration:none;padding:6px 8px;border-radius:6px}
.nav a:hover{background:#f1f5f9}
.main-content{padding:28px 0}
.site-footer{border-top:1px solid var(--line);margin-top:48px;padding:18px 0;color:var(--muted);font-size:14px;background:var(--surface)}
.stack-md>*+*{margin-top:14px}
.stack-lg>*+*{margin-top:22px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;margin:16px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.card:hover{box-shadow:0 6px 16px rgba(15,23,42,.08);transform:translateY(-1px);transition:all .2s ease}
.card h1,.card h2,.card h3{margin:0 0 10px 0}
.bullet{padding-left:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
.grid.cards .card{margin:0;padding:16px}
.lead{color:var(--muted)}
.meta{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px}
.pill{display:inline-block;padding:4px 8px;border:1px solid var(--line);border-radius:999px;background:#f8fafc;color:#334155}
.card-title{font-size:18px;margin:6px 0}
.card-title a{text-decoration:none;color:var(--accent-2)}
.card-text{color:#475569}
.card-actions{margin-top:10px}
.button{display:inline-block;padding:8px 12px;border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:10px;text-decoration:none;font-size:14px}
.button:hover{opacity:.95}
.hero{padding:24px 0 8px}
.kicker{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.title-xl{font-size:36px;line-height:1.15;margin:6px 0 8px}
.subtitle{color:#475569;font-size:16px}
.hero-media img{width:100%;height:auto;border-radius:14px;border:1px solid var(--line);box-shadow:0 1px 2px rgba(0,0,0,.04)}
.breadcrumbs ol{list-style:none;display:flex;gap:8px;padding:0;margin:0 0 12px 0;color:var(--muted);font-size:12px}
.breadcrumbs li+li:before{content:"/";margin-right:8px;color:#94a3b8}
form .row{display:flex;flex-wrap:wrap;gap:12px}
input,textarea{width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--surface)}
button{padding:10px 14px;border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:10px;cursor:pointer}
button:hover{opacity:.95}
.image-card{padding:0;overflow:hidden}
.image-card .card-media{background:#f1f5f9;border-bottom:1px solid var(--line)}
.image-card img{width:100%;height:auto;display:block}
.image-card .card-body{padding:14px}
.card-title{font-weight:600}
.image-card .card-title{font-weight:500}
.image-card .card-text{color:#64748b}
.grid.cards.image-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.section-title{font-weight:400}
.section-title a{text-decoration:none;color:var(--accent-2)}`;
  }
  await writeFileSafe(dest, css);
}

async function build() {
  const raw = await fs.readFile(path.join(ROOT_DIR, 'core.json'), 'utf-8');
  const data = JSON.parse(raw);

  await copyStyles();
  await copyImages();

  const articles = [
    {
      slug: 'prova-prospettive-riforma-istituzionale',
      title: 'Prova · Prospettive di riforma istituzionale',
      excerpt: 'Un articolo di prova per illustrare layout, tipografia e card minimaliste. Contenuti reali verranno aggiunti successivamente.',
      date: new Date().toISOString().slice(0, 10),
      section: 'Politica interna',
      author: 'Redazione'
    },
    {
      slug: 'analisi-sistema-partitico-italiano',
      title: 'Analisi del sistema partitico italiano',
      excerpt: 'Un approfondimento sui partiti politici italiani e le loro dinamiche interne.',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      section: 'Politica interna',
      author: 'Marco Rossi'
    },
    {
      slug: 'relazioni-ue-italia',
      title: 'Le relazioni tra UE e Italia',
      excerpt: 'Analisi delle dinamiche politiche ed economiche tra l\'Unione Europea e l\'Italia.',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      section: 'Relazioni internazionali',
      author: 'Anna Bianchi'
    },
    {
      slug: 'crisi-energetica-europa',
      title: 'La crisi energetica in Europa',
      excerpt: 'Impatto della crisi energetica sui paesi europei e strategie di risposta.',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      section: 'Economia globale',
      author: 'Luca Verdi'
    },
    {
      slug: 'media-informazione-politica',
      title: 'Media e informazione politica',
      excerpt: 'Il ruolo dei media nella formazione dell\'opinione pubblica e nella politica.',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      section: 'Società e cultura politica',
      author: 'Sofia Neri'
    },
    {
      slug: 'storia-democrazia-italiana',
      title: 'Storia della democrazia italiana',
      excerpt: 'Un percorso attraverso la storia democratica dell\'Italia dal dopoguerra a oggi.',
      date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      section: 'Storia e prospettive',
      author: 'Giuseppe Bianchi'
    }
  ];

  const homeItems = Array.isArray(data['Homepage']) ? data['Homepage'] : [];
  const focus = homeItems.find(i => i.toLowerCase().includes('focus')) || 'Focus del mese';
  let heroMedia = '';
  try {
    await fs.access(path.join(SRC_DIR, 'images', 'home_page.jpg'));
    heroMedia = `<figure class="hero-media"><img src="./images/home_page.jpg" alt="Immagine in evidenza homepage" loading="lazy" /></figure>`;
  } catch {}
  const hero = `<section class="hero stack-md">
    <span class="kicker">Politica · Geopolitica · Economia</span>
    <h1 class="title-xl">Analisi indipendenti per capire il mondo</h1>
    <p class="subtitle">Approfondimenti chiari e verificati su politica interna, relazioni internazionali e trend globali.</p>
    ${heroMedia}
  </section>`;
  const focusCard = `<section class="stack-md">
    <div class="card">
      <h2>${focus}</h2>
      <p class="lead">Tema in evidenza: aggiornamenti e chiavi di lettura essenziali.</p>
    </div>
  </section>`;
  const sezioni = data['Sezioni principali'] || {};
  const sezioniList = Object.keys(sezioni).map((nome) => ({ nome, descrizioni: sezioni[nome] || [] }));
  const sezioniMiniGrid = sezioniList.slice(0, 4).map(({ nome }) => renderSectionCard(nome)).join('');
  const sezioniPreview = `<section class="stack-md">
    <h2>Sezioni in evidenza</h2>
    <div class="grid cards">${sezioniMiniGrid}</div>
  </section>`;
  const featured = `<section class="stack-md">
    <h2>In evidenza</h2>
    <div class="grid cards">${articles.slice(0, 3).map(article => renderArticleCard(article)).join('')}</div>
  </section>`;
  const homeContent = `<section class="stack-lg">${hero}${focusCard}${featured}${sezioniPreview}</section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'index.html'), renderLayout({ title: 'Homepage', contentHtml: homeContent }));

  const sezioniGroups = sezioniList.map(({ nome, descrizioni }) => {
    const slug = slugify(nome);
    const macroGrid = (descrizioni || []).map((m) => renderMacroCard(nome, m)).join('');
    return `<section class="stack-md">
      <h2 class="section-title"><a href="./sezioni/${slug}.html">${nome}</a></h2>
      <div class="grid cards">${macroGrid}</div>
    </section>`;
  }).join('');
  const sezioniContent = `<section class="stack-lg">
    <h1>Sezioni</h1>
    <p class="lead">Esplora i macrotemi per ogni area.</p>
    ${sezioniGroups}
  </section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'sezioni.html'), renderLayout({ title: 'Sezioni', contentHtml: sezioniContent }));

  for (const { nome, descrizioni } of sezioniList) {
    const slug = slugify(nome);
    const crumbs = renderBreadcrumb([
      { label: 'Home', href: '../index.html' },
      { label: 'Sezioni', href: '../sezioni.html' },
      { label: nome }
    ]);
    const macroGrid = (descrizioni || []).map((m) => renderMacroCard(nome, m, true)).join('');
    const articlesGrid = renderSectionCardsGrid(nome, articles, true);
    const sectionPageContent = `${crumbs}<section class="stack-lg">
      <div class="card"><h1>${nome}</h1><p class="lead">Macrotemi principali e ultimi articoli.</p></div>
      <div class="grid cards">${macroGrid}</div>
      ${articlesGrid}
    </section>`;
    await writeFileSafe(path.join(ROOT_DIR, `sezioni/${slug}.html`), renderLayout({ title: nome, contentHtml: sectionPageContent, isSubPage: true }));

    for (const punto of (descrizioni || [])) {
      const puntoSlug = slugify(punto);
      const combinedSlug = `${slug}-${puntoSlug}`;
      const crumbs2 = renderBreadcrumb([
        { label: 'Home', href: '../index.html' },
        { label: 'Sezioni', href: '../sezioni.html' },
        { label: nome, href: `../sezioni/${slug}.html` },
        { label: punto }
      ]);
      const puntoHtml = `${crumbs2}<section class="stack-lg">
        <div class="card">
          <h1>${punto}</h1>
          <p class="lead">Pagina correlata a "${nome}". Qui potrai inserire contenuti e link tematici.</p>
        </div>
        ${renderSectionCardsGrid(nome, articles, true)}
      </section>`;
      await writeFileSafe(path.join(ROOT_DIR, `sezioni/${combinedSlug}.html`), renderLayout({ title: `${nome} · ${punto}`, contentHtml: puntoHtml, isSubPage: true }));
    }
  }

  const rubriche = Array.isArray(data['Rubriche fisse']) ? data['Rubriche fisse'] : [];
  await writeFileSafe(path.join(ROOT_DIR, 'rubriche.html'), renderLayout({ title: 'Rubriche', contentHtml: renderList('Rubriche fisse', rubriche) }));

  const approfondimenti = Array.isArray(data['Approfondimenti']) ? data['Approfondimenti'] : [];
  await writeFileSafe(path.join(ROOT_DIR, 'approfondimenti.html'), renderLayout({ title: 'Approfondimenti', contentHtml: renderList('Approfondimenti', approfondimenti) }));

  const autori = Array.isArray(data['Autori']) ? data['Autori'] : [];
  await writeFileSafe(path.join(ROOT_DIR, 'autori.html'), renderLayout({ title: 'Autori', contentHtml: renderList('Autori', autori) }));

  const chiSiamo = Array.isArray(data['Chi siamo']) ? data['Chi siamo'] : [];
  await writeFileSafe(path.join(ROOT_DIR, 'chi-siamo.html'), renderLayout({ title: 'Chi siamo', contentHtml: renderList('Chi siamo', chiSiamo) }));

  const contatti = Array.isArray(data['Contatti']) ? data['Contatti'] : [];
  const contattiContent = `<section class="stack-lg">
    ${renderBreadcrumb([{ label: 'Home', href: './index.html' }, { label: 'Contatti' }])}
    <div class="card">
      <h1>Contatti</h1>
      <p class="lead">Scrivici per proposte editoriali, segnalazioni o collaborazioni.</p>
      <ul class="bullet">${contatti.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>

    <div class="grid cards">
      <a class="card" href="mailto:redazione@example.com"><h3>Email redazione</h3><p class="card-text">redazione@example.com</p></a>
      <a class="card" href="mailto:press@example.com"><h3>Ufficio stampa</h3><p class="card-text">press@example.com</p></a>
      <div class="card"><h3>Social</h3><p class="card-text">Twitter · LinkedIn · Instagram</p></div>
    </div>

    <section class="card">
      <h2>Scrivici</h2>
      <p class="help">Compila il modulo: si aprirà il tuo client di posta con il messaggio precompilato.</p>
      <form id="contactEmailForm">
        <div class="row">
          <input type="text" name="name" placeholder="Nome" required />
          <input type="email" name="email" placeholder="Email" required />
        </div>
        <div class="row">
          <select name="topic" required>
            <option value="Proposta editoriale">Proposta editoriale</option>
            <option value="Segnalazione">Segnalazione</option>
            <option value="Collaborazione">Collaborazione</option>
            <option value="Altro">Altro</option>
          </select>
        </div>
        <textarea name="message" rows="6" placeholder="Messaggio" required></textarea>
        <label><input type="checkbox" name="privacy" required /> Acconsento al trattamento dei dati per rispondere alla mia richiesta</label>
        <div class="form-actions">
          <button type="submit">Invia via email</button>
          <a class="button" href="mailto:redazione@example.com" aria-label="Invia email">Email diretta</a>
        </div>
      </form>
    </section>

    <section class="card" id="newsletter">
      <h2>Newsletter</h2>
      <p class="lead">Iscriviti per ricevere aggiornamenti.</p>
      <form onsubmit="event.preventDefault(); alert('Iscrizione effettuata.');">
        <div class="row">
          <input type="email" name="newsletter" placeholder="La tua email" required />
          <button type="submit">Iscriviti</button>
        </div>
      </form>
    </section>

    <p class="help">Nota privacy: i dati inviati saranno usati solo per rispondere alla richiesta.</p>

    <script>(function(){
      var form = document.getElementById('contactEmailForm');
      if(!form) return;
      form.addEventListener('submit', function(ev){
        ev.preventDefault();
        var name = form.elements['name'].value || '';
        var email = form.elements['email'].value || '';
        var topic = form.elements['topic'].value || 'Richiesta';
        var message = form.elements['message'].value || '';
        var subject = '[' + topic + '] Nuovo messaggio dal sito';
        var body = message + '\n\n—\nNome: ' + name + '\nEmail: ' + email;
        var url = 'mailto:redazione@example.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        window.location.href = url;
      });
    })();</script>
  </section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'contatti.html'), renderLayout({ title: 'Contatti', contentHtml: contattiContent }));

  // Crea directory articoli se non esiste
  await ensureDir(path.join(ROOT_DIR, 'articoli'));

  for (const art