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
  const approfondimentiContent = `<section class="stack-lg">
    <h1>Approfondimenti</h1>
    <p class="lead">Analisi dettagliate, report speciali e contenuti di approfondimento sui temi più rilevanti della politica e della geopolitica contemporanea.</p>
    
    <div class="grid cards">
      <div class="card">
        <h2>Report Speciali</h2>
        <p>Indagini approfondite su temi di particolare rilevanza, con analisi dettagliate e dati esclusivi.</p>
        <ul class="bullet">
          <li>Le dinamiche del sistema partitico italiano</li>
          <li>L'evoluzione delle relazioni UE-Italia</li>
          <li>La crisi energetica in Europa</li>
          <li>Il ruolo dei media nella politica contemporanea</li>
        </ul>
      </div>

      <div class="card">
        <h2>Analisi Tematiche</h2>
        <p>Approfondimenti su specifici argomenti politici e geopolitici, con focus su cause, effetti e prospettive future.</p>
        <ul class="bullet">
          <li>Riforme istituzionali e processi democratici</li>
          <li>Diplomazia e relazioni internazionali</li>
          <li>Economia politica e globalizzazione</li>
          <li>Società civile e partecipazione politica</li>
        </ul>
      </div>

      <div class="card">
        <h2>Dossier</h2>
        <p>Raccolte tematiche di articoli e analisi su argomenti specifici, per una comprensione completa e articolata.</p>
        <ul class="bullet">
          <li>Elezioni e sistemi elettorali</li>
          <li>Crisi geopolitiche e conflitti</li>
          <li>Politiche pubbliche e welfare</li>
          <li>Innovazione tecnologica e politica</li>
        </ul>
      </div>

      <div class="card">
        <h2>Interviste</h2>
        <p>Conversazioni con esperti, politici e analisti per approfondire temi di attualità e ottenere prospettive diverse.</p>
        <ul class="bullet">
          <li>Dialoghi con esperti di politica</li>
          <li>Interviste a rappresentanti istituzionali</li>
          <li>Conversazioni con analisti internazionali</li>
          <li>Testimonianze di protagonisti</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <h2>Metodologia</h2>
      <p>I nostri approfondimenti seguono rigorosi standard editoriali:</p>
      <ul class="bullet">
        <li><strong>Fonti verificabili:</strong> Tutte le informazioni provengono da fonti ufficiali e verificabili</li>
        <li><strong>Analisi oggettiva:</strong> Approccio imparziale basato su dati e fatti</li>
        <li><strong>Esperti qualificati:</strong> Collaborazione con specialisti del settore</li>
        <li><strong>Aggiornamenti continui:</strong> Contenuti sempre aggiornati e rilevanti</li>
      </ul>
    </div>

    <div class="card">
      <h2>Prossimi Approfondimenti</h2>
      <p>Stiamo lavorando su nuovi contenuti di approfondimento. Iscriviti alla newsletter per essere informato sui prossimi report speciali.</p>
      <div class="card-actions">
        <a class="button" href="contatti.html#newsletter">Iscriviti alla newsletter</a>
      </div>
    </div>
  </section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'approfondimenti.html'), renderLayout({ title: 'Approfondimenti', contentHtml: approfondimentiContent }));

  const autori = Array.isArray(data['Autori']) ? data['Autori'] : [];
  const autoriContent = `<section class="stack-lg">
    <h1>Autori</h1>
    <p class="lead">Conosci i nostri collaboratori e le loro aree di expertise.</p>
    
    <div class="grid cards">
      <div class="card">
        <div class="author-header">
          <h2>Marco Rossi</h2>
          <p class="author-title">Analista di Politica Interna</p>
        </div>
        <div class="author-bio">
          <p>Marco Rossi è un analista politico con oltre 15 anni di esperienza nel settore. Specializzato in politica italiana e istituzioni europee, ha collaborato con diverse testate nazionali e think tank internazionali.</p>
          <p>Laureato in Scienze Politiche all'Università di Roma La Sapienza, ha conseguito un Master in Relazioni Internazionali presso la London School of Economics. I suoi articoli si concentrano su riforme istituzionali, dinamiche partitiche e processi decisionali europei.</p>
        </div>
        <div class="author-meta">
          <div class="meta-item">
            <strong>Specializzazione:</strong> Politica interna, Istituzioni europee
          </div>
          <div class="meta-item">
            <strong>Articoli pubblicati:</strong> 47
          </div>
          <div class="meta-item">
            <strong>Ultimo articolo:</strong> "Analisi del sistema partitico italiano"
          </div>
        </div>
      </div>

      <div class="card">
        <div class="author-header">
          <h2>Anna Bianchi</h2>
          <p class="author-title">Esperta di Relazioni Internazionali</p>
        </div>
        <div class="author-bio">
          <p>Anna Bianchi è una studiosa di relazioni internazionali con particolare focus su diplomazia, conflitti e cooperazione internazionale. Ha lavorato come consulente per organizzazioni internazionali e think tank specializzati in geopolitica.</p>
          <p>Dottorato in Relazioni Internazionali all'Università di Bologna, ha trascorso periodi di ricerca a Washington DC e Bruxelles. La sua expertise include la politica estera italiana, le dinamiche UE e i rapporti transatlantici.</p>
        </div>
        <div class="author-meta">
          <div class="meta-item">
            <strong>Specializzazione:</strong> Relazioni internazionali, Geopolitica
          </div>
          <div class="meta-item">
            <strong>Articoli pubblicati:</strong> 32
          </div>
          <div class="meta-item">
            <strong>Ultimo articolo:</strong> "Le relazioni tra UE e Italia"
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Collabora con noi</h2>
      <p>Sei un esperto di politica, geopolitica o economia? Stiamo sempre alla ricerca di nuovi collaboratori per arricchire la nostra redazione.</p>
      <p>Invia il tuo curriculum e una proposta di articolo a: <strong>redazione@example.com</strong></p>
      <div class="card-actions">
        <a class="button" href="contatti.html">Contattaci</a>
      </div>
    </div>
  </section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'autori.html'), renderLayout({ title: 'Autori', contentHtml: autoriContent }));

  const chiSiamo = Array.isArray(data['Chi siamo']) ? data['Chi siamo'] : [];
  const chiSiamoContent = `<section class="stack-lg">
    <h1>Chi siamo</h1>
    <p class="lead">Politica & Geopolitica è un progetto editoriale indipendente dedicato all'analisi approfondita della politica italiana e delle relazioni internazionali.</p>
    
    <div class="card">
      <h2>La nostra missione</h2>
      <p>Crediamo che una democrazia funzioni meglio quando i cittadini hanno accesso a informazioni accurate, analisi approfondite e prospettive diverse sui temi politici e geopolitici. Il nostro obiettivo è fornire contenuti di qualità che aiutino a comprendere la complessità del mondo contemporaneo.</p>
    </div>

    <div class="grid cards">
      <div class="card">
        <h3>Indipendenza editoriale</h3>
        <p>Non siamo legati a partiti politici, gruppi di interesse o ideologie specifiche. La nostra indipendenza ci permette di offrire analisi oggettive e imparziali.</p>
      </div>

      <div class="card">
        <h3>Rigore metodologico</h3>
        <p>Ogni articolo e analisi si basa su fonti verificabili, dati ufficiali e metodologie consolidate. La qualità delle informazioni è la nostra priorità.</p>
      </div>

      <div class="card">
        <h3>Esperti qualificati</h3>
        <p>Collaboriamo con analisti, ricercatori e esperti riconosciuti nel campo della politica, delle relazioni internazionali e dell'economia.</p>
      </div>

      <div class="card">
        <h3>Accessibilità</h3>
        <p>Rendiamo temi complessi comprensibili a tutti, mantenendo al contempo la profondità e la precisione dell'analisi specialistica.</p>
      </div>
    </div>

    <div class="card">
      <h2>I nostri valori</h2>
      <ul class="bullet">
        <li><strong>Trasparenza:</strong> Rendiamo sempre pubbliche le nostre fonti e metodologie</li>
        <li><strong>Accuratezza:</strong> Verifichiamo ogni informazione prima della pubblicazione</li>
        <li><strong>Equilibrio:</strong> Presentiamo prospettive diverse sui temi controversi</li>
        <li><strong>Responsabilità:</strong> Riconosciamo l'impatto delle nostre analisi sul dibattito pubblico</li>
        <li><strong>Innovazione:</strong> Esploriamo nuovi approcci all'analisi politica</li>
      </ul>
    </div>

    <div class="card">
      <h2>La nostra storia</h2>
      <p>Nato nel 2025, Politica & Geopolitica è il risultato della collaborazione tra esperti di politica, giornalisti e ricercatori che hanno deciso di creare uno spazio per l'analisi politica di qualità. Il progetto è cresciuto rapidamente, attirando l'attenzione di lettori interessati a comprendere meglio i fenomeni politici e geopolitici.</p>
      
      <p>Oggi siamo una piattaforma riconosciuta per la qualità delle nostre analisi e per l'approccio rigoroso all'informazione politica.</p>
    </div>

    <div class="card">
      <h2>Il nostro team</h2>
      <p>Il nostro team è composto da professionisti con diverse competenze e background:</p>
      <ul class="bullet">
        <li><strong>Analisti politici:</strong> Specialisti in politica italiana e comparata</li>
        <li><strong>Esperti di relazioni internazionali:</strong> Studiosi di geopolitica e diplomazia</li>
        <li><strong>Giornalisti:</strong> Professionisti dell'informazione con esperienza pluriennale</li>
        <li><strong>Ricercatori:</strong> Accademici e studiosi di scienze politiche</li>
      </ul>
    </div>

    <div class="card">
      <h2>Collaborazioni</h2>
      <p>Collaboriamo con università, think tank, centri di ricerca e altre organizzazioni per arricchire le nostre analisi e ampliare la nostra rete di esperti.</p>
      
      <p>Se sei interessato a collaborare con noi, visita la pagina <a href="autori.html">Autori</a> o contattaci direttamente.</p>
    </div>

    <div class="card">
      <h2>Contattaci</h2>
      <p>Hai domande, suggerimenti o vuoi collaborare con noi? Non esitare a contattarci.</p>
      <div class="card-actions">
        <a class="button" href="contatti.html">Scrivici</a>
        <a class="button" href="autori.html">Conosci i nostri autori</a>
      </div>
    </div>
  </section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'chi-siamo.html'), renderLayout({ title: 'Chi siamo', contentHtml: chiSiamoContent }));

  const contattiContent = `<section class="stack-lg">
    <h1>Contatti</h1>
    <p class="lead">Siamo qui per ascoltare le tue opinioni, rispondere alle tue domande e costruire insieme una comunità di lettori informati e appassionati di politica e geopolitica.</p>
    
    <div class="card">
      <h2>📧 Contattaci</h2>
      <p>Per qualsiasi richiesta, proposta di collaborazione o informazione:</p>
      <p><strong>info@politicageopolitica.it</strong></p>
      <p>Rispondiamo entro 24-48 ore nei giorni lavorativi.</p>
    </div>

    <div class="card">
      <h2>📬 Newsletter</h2>
      <p>Iscriviti alla nostra newsletter per ricevere aggiornamenti sui nuovi articoli, approfondimenti esclusivi e analisi in anteprima.</p>
      
      <div class="newsletter-form">
        <form action="#" method="POST" class="stack-md">
          <div class="form-group">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" required placeholder="La tua email">
          </div>
          <div class="form-group">
            <label for="name">Nome (opzionale)</label>
            <input type="text" id="name" name="name" placeholder="Il tuo nome">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" name="privacy" required>
              Accetto la <a href="#privacy">Privacy Policy</a> *
            </label>
          </div>
          <button type="submit" class="button">Iscriviti alla newsletter</button>
        </form>
      </div>
    </div>

    <div class="card">
      <h2>🤝 Collaborazioni e Partnership</h2>
      <p>Siamo sempre interessati a nuove collaborazioni con:</p>
      <ul class="bullet">
        <li><strong>Universitarie:</strong> Dipartimenti di scienze politiche, relazioni internazionali, economia</li>
        <li><strong>Think tank:</strong> Centri di ricerca e analisi politica</li>
        <li><strong>Media:</strong> Giornali, riviste e piattaforme digitali</li>
        <li><strong>Istituzioni:</strong> Organizzazioni pubbliche e private</li>
      </ul>
      <p>Se rappresenti una di queste realtà, contattaci per discutere possibili partnership.</p>
    </div>

    <div class="card">
      <h2>📋 Modulo di Contatto</h2>
      <p>Compila il form qui sotto per inviarci un messaggio diretto:</p>
      
      <form action="#" method="POST" class="stack-md">
        <div class="form-group">
          <label for="contact-name">Nome e Cognome *</label>
          <input type="text" id="contact-name" name="name" required placeholder="Il tuo nome completo">
        </div>
        
        <div class="form-group">
          <label for="contact-email">Email *</label>
          <input type="email" id="contact-email" name="email" required placeholder="La tua email">
        </div>
        
        <div class="form-group">
          <label for="contact-subject">Oggetto *</label>
          <select id="contact-subject" name="subject" required>
            <option value="">Seleziona un argomento</option>
            <option value="info">Informazioni generali</option>
            <option value="collaboration">Proposta di collaborazione</option>
            <option value="article">Proposta di articolo</option>
            <option value="technical">Problema tecnico</option>
            <option value="feedback">Feedback e suggerimenti</option>
            <option value="other">Altro</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="contact-message">Messaggio *</label>
          <textarea id="contact-message" name="message" rows="6" required placeholder="Scrivi il tuo messaggio..."></textarea>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" name="privacy" required>
            Accetto la <a href="#privacy">Privacy Policy</a> *
          </label>
        </div>
        
        <button type="submit" class="button">Invia messaggio</button>
      </form>
    </div>

    <div class="card">
      <h2>🔗 Social Media</h2>
      <p>Seguici sui nostri canali social per aggiornamenti in tempo reale:</p>
      <div class="social-links">
        <a href="#" class="button">Twitter/X</a>
        <a href="#" class="button">LinkedIn</a>
        <a href="#" class="button">Telegram</a>
      </div>
    </div>

    <div class="card">
      <h2>📄 Privacy e Trasparenza</h2>
      <p>Rispettiamo la tua privacy. I dati che ci fornisci vengono utilizzati esclusivamente per:</p>
      <ul class="bullet">
        <li>Rispondere alle tue richieste</li>
        <li>Inviarti la newsletter (solo se richiesta)</li>
        <li>Migliorare i nostri servizi</li>
      </ul>
      <p>Non vendiamo, condividiamo o utilizziamo i tuoi dati per altri scopi. Per maggiori informazioni, consulta la nostra <a href="#privacy">Privacy Policy</a>.</p>
    </div>
  </section>`;
  await writeFileSafe(path.join(ROOT_DIR, 'contatti.html'), renderLayout({ title: 'Contatti', contentHtml: contattiContent }));

  // Crea directory articoli se non esiste
  await ensureDir(path.join(ROOT_DIR, 'articoli'));

  for (const article of articles) {
    const articleHtml = `${renderBreadcrumb([
      { label: 'Home', href: '../index.html' },
      { label: article.section, href: `../sezioni/${slugify(article.section)}.html` },
      { label: article.title }
    ])}
    <article class="stack-lg">
      <div class="meta"><span class="pill">${article.section}</span><time>${new Date(article.date).toLocaleDateString('it-IT')}</time></div>
      <h1>${article.title}</h1>
      <p class="lead">${article.excerpt}</p>
      
      <div class="card">
        <p><strong>Autore:</strong> ${article.author}</p>
        <p><strong>Tempo di lettura:</strong> 8-10 minuti</p>
      </div>

      <div class="card">
        <h2>Introduzione</h2>
        <p>Questo articolo rappresenta un esempio di contenuto esteso per testare il layout e la leggibilità del sito. I contenuti reali verranno sostituiti successivamente con analisi approfondite e articoli originali.</p>
        
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      </div>

      <div class="card">
        <h2>Analisi del contesto</h2>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        
        <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
        
        <h3>Sottosezione importante</h3>
        <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
      </div>

      <div class="card">
        <h2>Implicazioni e prospettive</h2>
        <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.</p>
        
        <p>Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.</p>
        
        <h3>Considerazioni finali</h3>
        <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.</p>
      </div>

      <div class="card">
        <h2>Conclusioni</h2>
        <p>Questo articolo di prova dimostra come il layout si comporta con contenuti più lunghi e strutturati. La tipografia, gli spazi e la gerarchia visiva sono stati ottimizzati per garantire una lettura confortevole su tutti i dispositivi.</p>
        
        <p>In futuro, questo spazio sarà occupato da analisi approfondite, dati, citazioni e contenuti originali che forniranno valore ai lettori interessati alla politica e alla geopolitica.</p>
      </div>

      <div class="card">
        <h3>Note metodologiche</h3>
        <p>Questo è un articolo di prova generato automaticamente per verificare layout e navigazione. Sostituiscilo con contenuti reali in seguito.</p>
        <p><strong>Autore:</strong> ${article.author}</p>
        <p><strong>Data pubblicazione:</strong> ${new Date(article.date).toLocaleDateString('it-IT')}</p>
        <p><strong>Sezione:</strong> ${article.section}</p>
      </div>
    </article>`;
    await writeFileSafe(path.join(ROOT_DIR, `articoli/${article.slug}.html`), renderLayout({ title: article.title, contentHtml: articleHtml, isSubPage: true }));
  }

  console.log('Build completata. Tutte le pagine sono state generate nella directory principale per GitHub Pages.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
}); 