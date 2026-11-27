// Checks navigation (Back closes sheets and stories, back links, scroll restore, tab re-tap, unknown links) and search behaviour.
// Usage: node pipeline/flows.cjs vetted-store.html
const { chromium } = require('playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + require('path').resolve(process.argv[2] || 'vetted-store.html');
  await p.goto(url + '#today'); await p.waitForTimeout(500);
  await p.evaluate(() => scrollTo(0, 1500)); await p.waitForTimeout(100);
  const y0 = await p.evaluate(() => scrollY);   // the page may be shorter than 1500px
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('#main a.card, #main a.row-txt')].find(a => a.getBoundingClientRect().top > 0); a.click(); return a.getAttribute('href'); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => scrollY) === 0, 'listing opens at top ' + href);
  await p.click('a.back'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => location.hash) === '#today', 'back link returns to Today');
  const y = await p.evaluate(() => scrollY); ok(Math.abs(y - y0) < 5, 'Today scroll restored (' + y + ' vs ' + y0 + ')');
  await p.goForward(); await p.waitForTimeout(300); ok(await p.evaluate(() => location.hash) === href, 'forward goes to listing again (back link used history)');
  // sheet + browser back
  await p.click('.product-head [data-get]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('sheet').open), 'sheet opens');
  await p.goBack(); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById('sheet').open)), 'browser back closes sheet');
  ok(await p.evaluate(() => location.hash) === href, 'still on listing after closing sheet');
  // sheet closed with Done, then back goes to previous page
  await p.click('.product-head [data-get]'); await p.waitForTimeout(200);
  await p.click('#sheet [data-closesheet].text-btn'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => history.state?.modal)), 'Done removes the sheet history entry');
  await p.goBack(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash) === '#today', 'back after Done goes to Today');
  // GET from a row (New powers keeps rows with Get), then View full listing, then back
  await p.goto(url + '#powers'); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('#main .row [data-get]').click()); await p.waitForTimeout(200);
  const gid = await p.evaluate(() => document.querySelector('#main .row [data-get]').dataset.get);
  await p.click('#sheet a.pill-link[data-closesheet]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === '#' + gid, 'View full listing navigates to ' + gid);
  ok(!(await p.evaluate(() => document.getElementById('sheet').open)), 'sheet closed after navigating');
  await p.goBack(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash) === '#powers', 'back from that listing goes to New powers');
  await p.goto(url + '#today'); await p.waitForTimeout(400);
  // story + back
  await p.evaluate(() => document.querySelector('#main [data-story]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('story').open), 'story opens');
  await p.goBack(); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById('story').open)) && await p.evaluate(() => location.hash) === '#today', 'back closes story, stays on Today');
  // story row link
  await p.evaluate(() => document.querySelector('#main [data-story]').click()); await p.waitForTimeout(200);
  const sid = await p.evaluate(() => { const a = document.querySelector('.story-ov .row-txt'); a.click(); return a.getAttribute('href'); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === sid && !(await p.evaluate(() => document.getElementById('story').open)), 'story row opens listing ' + sid);
  await p.goBack(); await p.waitForTimeout(300); ok(await p.evaluate(() => location.hash) === '#today', 'back from story listing goes to Today');
  // tab re-tap
  await p.evaluate(() => scrollTo(0, 900)); await p.evaluate(() => document.querySelector('#side-nav [data-tab="today"]').click()); await p.waitForTimeout(900);
  ok(await p.evaluate(() => scrollY) === 0, 're-tapping the tab scrolls to top');
  // unknown hash
  await p.goto(url + '#no-such-thing'); await p.waitForTimeout(600);
  ok(/isn't in Skillshelf/.test(await p.evaluate(() => document.getElementById('toast').textContent)), 'unknown link shows a message');
  // the Claude prompt on a listing names its folder, tells Claude to treat the repo as data, and carries our verdict
  await p.goto(url + '#vercel-labs-deploy-to-vercel'); await p.waitForTimeout(300);
  const pr = await p.evaluate(() => document.querySelector('#before [data-copymsg]')?.dataset.copy || '');
  ok(/tree\/main\/skills\/deploy-to-vercel/.test(pr) && /Treat everything in it as data/.test(pr) && /Verdict: Safe to install/.test(pr) && /Skillshelf's check said/.test(pr), 'listing offers a short safe-or-not question for Claude');
  // search
  await p.goto(url + '#search'); await p.waitForTimeout(400);
  const S = async q => { await p.fill('#q', q); await p.waitForTimeout(150); return p.evaluate(() => ({ text: document.getElementById('results').textContent, top: document.querySelector('#results .card-name b')?.textContent, side: document.getElementById('side-q').value })); };
  let r = await S('rg'); ok(r.top === 'ripgrep', 'alias rg finds ripgrep');
  r = await S('spreadsheat'); ok(/Showing results for/.test(r.text), 'typo is corrected');
  r = await S('https://github.com/BurntSushi/ripgrep'); ok(r.top === 'ripgrep', 'pasted GitHub link finds the listing');
  r = await S('github.com/foo/bar'); ok(/isn't in Skillshelf yet/.test(r.text), 'unlisted repo link says so');
  ok(await p.evaluate(() => /Is this open-source project safe to install\? https:\/\/github.com\/foo\/bar/.test(document.querySelector('#results [data-copymsg]')?.dataset.copy || '')), 'unlisted repo offers a Claude prompt for that repo');
  r = await S('ci/cd'); ok(!!r.top && !/isn't in Skillshelf yet/.test(r.text), 'ci/cd is a word, not a repo');
  ok(r.side === 'ci/cd', 'search boxes stay in sync');
  // Digest: every issue opens, with a title and at least one pick, and a pick leads back to the issue
  await p.goto(url + '#digest'); await p.waitForTimeout(300);
  const issues = await p.evaluate(() => [...document.querySelectorAll('#main a.issue-card')].map(a => a.getAttribute('href')));
  ok(issues.length >= 3, 'digest lists the latest weekly, monthly and yearly issues');
  for (const h of issues) {
    await p.goto(url + h); await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({ h1: document.querySelector('#main .issue-hero h1')?.textContent, picks: document.querySelectorAll('#main .pick').length }));
    ok(r.h1 && r.picks > 0, `issue ${h}: "${r.h1}" with ${r.picks} picks`);
  }
  await p.evaluate(() => document.querySelector('#main .pick a.pk-t').click()); await p.waitForTimeout(300);
  ok(/Digest/.test(await p.evaluate(() => document.querySelector('a.back')?.textContent || '')), 'a pick links back to the Digest');
  // A saved focus from before still shows its bar and filters what's shown
  await p.evaluate(() => { FOCUS = { ...FOCUS0, kinds: ['skill'] }; saveFocus(); });
  await p.goto(url + '#browse'); await p.reload(); await p.waitForTimeout(300);
  const fr = await p.evaluate(() => ({ bar: !!document.querySelector('.focusbar'), bad: [...document.querySelectorAll('#main a.card[href^="#"]')].map(a => BY[a.getAttribute('href').slice(1)]).filter(l => l && !fits(l)).map(l => l.id) }));
  ok(fr.bar && !fr.bad.length, 'an old saved focus shows its bar and filters Browse ' + fr.bad.join(', '));
  await p.evaluate(() => { FOCUS = { ...FOCUS0 }; saveFocus(); });
  // The install sheet: Claude sets it up first, every install option one click away
  await p.goto(url + '#vercel-labs-deploy-to-vercel'); await p.reload(); await p.waitForTimeout(300);
  await p.click('.product-head [data-get]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Ask Claude to set it up/.test(document.querySelector('#sheet .way.lead')?.textContent || '') && document.querySelectorAll('#sheet .diy .inst-card').length > 0), 'install sheet leads with Claude setting it up, with every option under Do it yourself');
  await p.evaluate(() => document.getElementById('sheet').close()); await p.waitForTimeout(200);
  // Install sheet follows the computer: a Windows user sees Windows cards first, never a Homebrew-only card on top
  await p.evaluate(() => { FOCUS = { ...FOCUS0, os: 'Windows' }; saveFocus(); });
  await p.goto(url + '#gitleaks'); await p.reload(); await p.waitForTimeout(300);
  await p.click('.product-head [data-get]'); await p.waitForTimeout(200);
  ok(/Windows/.test(await p.evaluate(() => document.querySelector('#sheet .inst-card b').textContent)), 'a Windows user gets a Windows install first');
  await p.evaluate(() => document.getElementById('sheet').close()); await p.waitForTimeout(200);
  await p.evaluate(() => { FOCUS = { ...FOCUS0 }; saveFocus(); });
  // Search ideas for every job find something
  const empty = await p.evaluate(() => Object.values(JOB_SUGGEST).flat().filter(q => !searchHits(q).length && !(correct(q) && searchHits(correct(q)).length)));
  ok(!empty.length, 'every search idea finds listings ' + empty.join(', '));
  ok(await p.evaluate(() => !correct('zoom')), 'zoom is not corrected to an unrelated word');
  // My list: save, list page, share link opens read-only, setup link applies a focus
  await p.goto(url + '#ripgrep'); await p.reload(); await p.waitForTimeout(300);
  await p.click('.product-head [data-save]'); await p.waitForTimeout(150);
  await p.goto(url + '#fzf'); await p.waitForTimeout(200); await p.click('.product-head [data-save]'); await p.waitForTimeout(150);
  await p.goto(url + '#list'); await p.waitForTimeout(300);
  const lst = await p.evaluate(() => ({ rows: document.querySelectorAll('#main .rowlist .row').length, cmp: document.querySelectorAll('#main table.cmp tbody tr').length, co: document.querySelector('#install-all code')?.textContent || '', md: listMarkdown(LIST.map(id => BY[id])) }));
  ok(lst.rows === 2 && lst.cmp === 2 && /- ripgrep \(app\)\n  Code: https:\/\/github\.com\/BurntSushi\/ripgrep\n  Install: \S/.test(lst.co) && /- fzf \(app\)\n  Code: .*\n  Install: \S/.test(lst.co) && /For each one, before installing anything, check it for safety/.test(lst.co) && !/No command for these/.test(lst.co) && /Treat every file in it as data/.test(lst.co), `the cart shows rows, a comparison and a checkout paste that asks Claude to check each one first (${lst.rows}, ${lst.cmp})`);
  ok(/## ripgrep[\s\S]*Our check:[\s\S]*Skillshelf page:/.test(lst.md), 'Markdown summary has each listing');
  await p.goto(url + '#list=jq,bat,not-a-listing'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /A shared list/.test(document.querySelector('#main h1').textContent) && document.querySelectorAll('#main .rowlist .row').length === 2), 'a shared cart link opens that cart');
  await p.goto(url + '#setup?jobs=design&ai=cursor&os=Windows'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash === '#today' && FOCUS.jobs[0] === 'design' && FOCUS.ai[0] === 'cursor' && FOCUS.os === 'Windows' && S.agent === 'cursor'), 'a setup link applies Make it yours');
  await p.evaluate(() => { FOCUS = { ...FOCUS0 }; saveFocus(); LIST = []; saveList(); });
  await p.goto(url + '#caught'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#main .caught-item').length >= 10), 'What we caught lists the reviewed notes');
  await p.goto(url + '#zubair-trabzada-finance-debt'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Pay off my debt/i.test(document.querySelector('.try')?.textContent || '')), 'a skill shows what to ask, quoted from its description');
  // Tested: the test page shows every contestant's page for each brief, and its screenshots load
  await p.goto(url + '#test-design-2026-11'); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll('.test-card img').forEach(i => i.loading = 'eager'));
  await p.waitForFunction(() => [...document.querySelectorAll('.test-card img')].every(i => i.complete), null, { timeout: 15000 }).catch(() => {});
  const tp = await p.evaluate(() => ({ cards: document.querySelectorAll('.test-card').length, broken: [...document.querySelectorAll('.test-card img')].filter(i => !i.naturalWidth).length, win: document.querySelector('.verdict-box .row-txt b')?.textContent }));
  ok(tp.cards === 10 && tp.broken === 0 && tp.win === 'Impeccable', `test page: 10 pages, screenshots load, verdict leads with the winner (${tp.cards}, ${tp.broken} broken, ${tp.win})`);
  await p.goto(url + '#pbakaus-impeccable'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Our pick/.test(document.querySelector('.tested-box')?.textContent || '') && document.querySelector('.tested-box').getAttribute('href') === '#test-design-2026-11'), 'a tested listing links to its test');
  await p.goto(url + '#today'); await p.waitForTimeout(300);
  const cb = await p.evaluate(() => { const box = document.querySelector('#in-claude'); const codes = [...(box?.querySelectorAll('.copybox code') || [])].map(c => c.textContent); return { codes, copies: [...(box?.querySelectorAll('[data-copy]') || [])].map(b => b.dataset.copy), bar: !!box?.querySelector('.bar-card .bar-drawing') }; });
  ok(cb.bar && cb.codes[0] === '/plugin install skillshelf --marketplace qaisak/vetted-store' && cb.codes.length === 3, 'the home page has the Skillshelf bar: a drawing of it and one line that installs it');
  ok(/claude plugin marketplace update skillshelf, then claude plugin update skillshelf@skillshelf/.test(cb.codes[1] || ''), 'people who already have the bar get one paste that updates it');
  ok(cb.codes[2] === 'https://skillshelf.skillshelf.workers.dev/mcp' && cb.codes.every((c, i) => cb.copies[i] === c), 'Claude chat users still get a copyable connector address');
  // Three tabs, and the old type pages are Browse with a filter
  await p.goto(url + '#today'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#side-nav .nav-item')].map(b => b.textContent.trim().replace(/\d+$/, '')).join(',') === 'Home,Browse,Free alternatives,My list'), 'four tabs: Home, Browse, Free alternatives, My list');
  // One home for everyone: no switch, apps and Claude add-ons on the same page, nothing shown twice
  const home = await p.evaluate(() => { const ids = [...document.querySelectorAll('#main a.card, #main a.alt-card')].map(a => a.getAttribute('href').slice(1));
    return { ids, dup: ids.filter((x, i) => ids.indexOf(x) !== i), doors: document.querySelectorAll('[data-door]').length, bar: !!document.querySelector('#in-claude'),
      kinds: new Set(ids.map(id => BY[id]?.k)).size, heads: [...document.querySelectorAll('#main .shelf-head h2')].map(h => h.firstChild.textContent) }; });
  ok(!home.doors && home.bar && home.kinds === 3 && home.ids.length >= 30, `one home page with apps, skills, connectors and the Skillshelf bar (${home.ids.length} cards: ${home.heads.join(' / ')})`);
  ok(!home.dup.length, 'nothing shows twice on the home page ' + home.dup.join(', '));
  ok(await p.evaluate(() => [...document.querySelectorAll('#main .card-line')].every(e => e.scrollHeight <= e.clientHeight + 2)), 'home cards show their whole sentence');
  // The catalog leaves out what Claude already has, Codex-only skills and test servers; icons are never a developer's photo
  const cat = await p.evaluate(() => ({ cut: L.filter(l => /^(anthropics|openai|NVIDIA)\//.test(l.r) && l.k === 'skill' || l.id === 'mcp-everything').map(l => l.id),
    faces: L.filter(l => !repoOf(l).org && !(D.LG || {})[l.r] && /<img/.test(icon(l))).map(l => l.id),
    jev: ['typesafe-ai-typesafe-ai', 'laya', 'ollaya', 'kev'].every(id => BY[id]) }));
  ok(!cat.cut.length, 'no Anthropic, OpenAI or NVIDIA skills and no test server listed ' + cat.cut.slice(0, 5).join(', '));
  ok(!cat.faces.length, 'no listing uses a person\'s profile photo as its icon ' + cat.faces.slice(0, 5).join(', '));
  ok(cat.jev, 'Jev and its open-source side are listed');
  const alts = await p.evaluate(() => [...document.querySelectorAll('#main .alt-card')].map(a => BY[a.getAttribute('href').slice(1)]));
  ok(alts.length >= 4 && alts.every(l => l && l.alt && l.alt.paid && /^https:\/\//.test(l.alt.src)), 'home shows the free alternatives to paid tools, each with a source (' + alts.length + ')');
  ok(await p.evaluate(() => !!document.querySelector('#main .shelf.alts a.see-all[href="#instead"]')), 'the home alternatives shelf links to all of them');
  ok(await p.evaluate(() => HOME_IDEAS.every(([, q]) => searchHits(q).length)), 'every home search idea finds listings');
  await p.evaluate(() => document.querySelector('#main .ideas [data-suggest]').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash === '#search' && document.querySelectorAll('#results .card').length > 0), 'a home idea opens Browse with results');
  for (const [h, k] of [['tools', 'tool'], ['skills', 'skill'], ['mcp', 'mcp']]) {
    await p.goto(url + '#' + h); await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({ tab: document.querySelector('#side-nav [aria-current="page"]')?.textContent || '', kinds: [...new Set([...document.querySelectorAll('#main .browse-cards a.card')].map(a => BY[a.getAttribute('href').slice(1)].k))] }));
    ok(/Browse/.test(r.tab) && r.kinds.length === 1 && r.kinds[0] === k, '#' + h + ' is Browse filtered to ' + k);
  }
  // Browse: cards with no Get buttons; a topic narrows the list in place and keeps the kind; the setup toggle filters too
  await p.goto(url + '#browse'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#main .browse-cards a.card').length === 30 && !document.querySelector('#main [data-get]')), 'Browse shows 30 calm cards and no Get buttons');
  await p.evaluate(() => document.querySelector('#main button.kind[data-kind="tools"]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => location.hash === '#tools' && S.kind === 'tool'), 'choosing Apps with no topic makes the link #tools');
  await p.evaluate(() => document.querySelector('#main .topics a[href="#for-office"]').click()); await p.waitForTimeout(300);
  const tb = await p.evaluate(() => ({ h: location.hash, h1: document.querySelector('#main h1').textContent, ids: [...document.querySelectorAll('#main .browse-cards a.card')].map(a => a.getAttribute('href').slice(1)),
    inOffice: [...document.querySelectorAll('#main .browse-cards a.card')].every(a => { const l = BY[a.getAttribute('href').slice(1)]; return l.jb.includes('office') && l.k === 'tool'; }) }));
  ok(tb.h === '#for-office' && /Office/.test(tb.h1) && tb.ids.length && tb.inOffice, 'a topic narrows Browse in place and keeps Apps (' + tb.ids.length + ')');
  await p.evaluate(() => document.querySelector('#main [data-easybox]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const ids = [...document.querySelectorAll('#main .browse-cards a.card')].map(a => BY[a.getAttribute('href').slice(1)]); return ids.length > 0 && ids.every(l => l.lv === 1); }), 'One-step setup only leaves one-step listings');
  await p.evaluate(() => { S.easy = false; S.kind = null; });
  // Free alternatives: its own tab, grouped by area, searchable by the product you use now, every claim sourced
  await p.goto(url + '#instead'); await p.waitForTimeout(300);
  const fa = await p.evaluate(() => ({ tab: document.querySelector('#side-nav [aria-current="page"]')?.textContent, cards: [...document.querySelectorAll('#main .alt-card')].map(a => BY[a.getAttribute('href').slice(1)]),
    areas: document.querySelectorAll('#main .topics [data-jump]').length }));
  ok(/Free alternatives/.test(fa.tab) && fa.cards.length >= 30 && fa.areas >= 6 && fa.cards.every(l => l.alt && /^https:\/\//.test(l.alt.src) && l.alt.quote), 'Free alternatives lists ' + fa.cards.length + ' apps by area, each with its source');
  await p.fill('#iq', 'whoop'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const c = [...document.querySelectorAll('#main .alt-card')].map(a => a.getAttribute('href').slice(1)); return c.length === 1 && c[0] === 'noop'; }), 'searching WHOOP finds NOOP');
  await p.fill('#iq', 'zzzz'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /Nothing here replaces/.test(document.getElementById('instead-results').textContent)), 'a product with no alternative says so and offers a full search');
  await p.fill('#iq', ''); await p.waitForTimeout(100);
  ok(await p.evaluate(() => L.filter(l => l.sv && l.alt).every(l => altFree(l) === 'Free to host yourself') && altFree(BY.noop) === 'Free for personal use'), 'self-hosted alternatives and NOOP say what free means for them');
  // Packs show once, under the pack's name
  ok(await p.evaluate(() => !BY['coreyhaines31-aso'] && !BY['addyosmani-context-engineering'] && !BY['thedotmack-claude-mem-install'] && BY['coreyhaines31-ads'].n === 'Marketing Skills' && BY['thedotmack-mem-search'].n === 'claude-mem'), 'marketing, Addy Osmani and claude-mem packs are listed once');
  // Listing pages: four blocks, What it replaces only when known, the details folded
  await p.goto(url + '#voicestudio'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => ['what', 'replaces', 'get', 'before'].every(id => document.getElementById(id)) && !document.getElementById('checks').open && /ElevenLabs/.test(document.getElementById('replaces').textContent)), 'VoiceStudio: four blocks, it replaces ElevenLabs, details folded');
  await p.goto(url + '#ripgrep'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('replaces') && !!document.getElementById('get')), 'a listing with no known alternative has no What it replaces');
  const noCheck = await p.evaluate(() => L.filter(l => !/check it for safety here on my computer/.test(setupPrompt(l)) || !/Ask me before you install/.test(setupPrompt(l))).map(l => l.id));
  ok(!noCheck.length, 'every listing\'s Copy for Claude asks Claude to check the code before installing ' + noCheck.slice(0, 5).join(', '));
  // Before posting: unusual star growth never leads, everyday phrases find the obvious apps, downloads name the right file
  await p.goto(url + '#browse'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !oddStars(BY[document.querySelector('.browse-cards a.card').getAttribute('href').slice(1)])), 'Browse never opens on a project with unusual star growth');
  const firstHit = async q => { await p.fill('#q', q); await p.waitForTimeout(200); return p.evaluate(() => [...document.querySelectorAll('#results a.card')].map(a => a.getAttribute('href').slice(1))); };
  const ep = await firstHit('edit photos'), ro = await firstHit('run ai offline'), tr = await firstHit('tax return');
  ok(ep[0] === 'photocraft' && ep.includes('compositor'), `"edit photos" leads with PhotoCraft, not a flagged project (${ep.slice(0, 3).join(', ')})`);
  ok(ro.includes('ollama') && ro.includes('jan'), `"run ai offline" finds Ollama and Jan (${ro.slice(0, 4).join(', ')})`);
  ok(await p.evaluate(() => /The closest we have/.test(document.getElementById('results').textContent)) || !tr.length, 'a search where nothing matches every word says these are only the closest');
  await p.fill('#q', ''); await p.goto(url + '#handy'); await p.waitForTimeout(300);
  const dl = await p.evaluate(() => { const a = document.querySelector('#get a.dl-file'); return a ? [a.textContent.trim(), a.getAttribute('href')] : null; });
  const wantOS = await p.evaluate(() => myOS());
  ok(!wantOS || (dl && dl[0] === `Download for ${({ macOS: 'Mac', Windows: 'Windows', Linux: 'Linux' })[wantOS]}` && /^https:\/\/github\.com\/cjpais\/Handy\/releases\/download\//.test(dl[1])), `an app's download names the file for this computer (${wantOS}: ${dl && dl[0]})`);
  ok(await p.evaluate(() => document.querySelectorAll('#before details.check-only').length === 1 && document.querySelectorAll('#main [data-copy^="Set up"]').length === 1), 'a listing page has one Copy for Claude; the check-only question is folded');
  ok(await p.evaluate(() => /github\.com\/qaisak\/vetted-store/.test(document.querySelector('.data-note').innerHTML)), 'the footer links to Skillshelf\'s own code on GitHub');
  ok(await p.evaluate(() => SITE === 'https://qaisak.github.io/getskillshelf/' && !COUNTING && document.querySelector('meta[property="og:image"]').content === 'https://qaisak.github.io/getskillshelf/og.png'), 'shared links and the link preview use the public site, and a local copy counts nothing');
  // The sidebar: topics, Suggest a project and the bar card
  await p.goto(url + '#today'); await p.waitForTimeout(300);
  const side = await p.evaluate(() => ({ topics: document.querySelectorAll('#side-topics a.topic').length, card: !!document.querySelector('#side-extra [data-tobar]'), suggest: !!document.querySelector('#side-extra [data-propose]') }));
  ok(side.topics >= 10 && side.card && side.suggest, `the sidebar lists topics (${side.topics}), Suggest a project and the bar card`);
  await p.evaluate(() => document.querySelector('#side-topics a[href="#for-dev"]').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash === '#for-dev' && document.querySelector('#side-topics a[href="#for-dev"]').getAttribute('aria-current') === 'page' && /Developers/.test(document.querySelector('#main h1').textContent)), 'a sidebar topic opens Browse on it and lights up');
  await p.evaluate(() => document.querySelector('#side-extra [data-tobar]').click()); await p.waitForTimeout(700);
  ok(await p.evaluate(() => location.hash === '#today' && Math.abs(document.getElementById('in-claude').getBoundingClientRect().top) < 150), 'the bar card goes to the Skillshelf bar on Home');
  // Suggest a project: a bad link is caught, a listed project says so, a new one is sent (the Worker answered by a stand-in)
  await p.route('https://skillshelf.skillshelf.workers.dev/suggest', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, status: 'new' }) }));
  await p.evaluate(() => { window.SUGGEST_ANYWHERE = true; document.querySelector('#side-extra [data-propose]').click(); }); await p.waitForTimeout(200);
  await p.fill('#pf-repo', 'not a link'); await p.click('#propose-form button[type=submit]'); await p.waitForTimeout(150);
  const sgBad = await p.evaluate(() => document.getElementById('pf-err').textContent);
  await p.fill('#pf-repo', 'https://github.com/pbakaus/impeccable'); await p.click('#propose-form button[type=submit]'); await p.waitForTimeout(150);
  const sgListed = await p.evaluate(() => document.querySelector('#propose .propose-done b')?.textContent);
  await p.evaluate(() => openPropose('')); await p.fill('#pf-repo', 'github.com/some-one/new-tool'); await p.fill('#pf-note', 'Like Notion, offline');
  const sent = p.waitForRequest('https://skillshelf.skillshelf.workers.dev/suggest'); await p.click('#propose-form button[type=submit]');
  const sgBody = JSON.parse((await sent).postData()); await p.waitForTimeout(300);
  const sgDone = await p.evaluate(() => document.querySelector('#propose .propose-done b')?.textContent);
  ok(/Paste a GitHub link/.test(sgBad) && /already on Skillshelf/.test(sgListed) && sgBody.repo === 'some-one/new-tool' && sgBody.note === 'Like Notion, offline' && /Thanks/.test(sgDone), `Suggest a project checks the link, knows what's listed, and sends the rest (${sgListed} / ${sgDone})`);
  await p.keyboard.press('Escape'); await p.unroute('https://skillshelf.skillshelf.workers.dev/suggest');
  await p.goto(url + '#browse'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#main .suggest-line [data-propose]') && !!document.querySelector('.data-note [data-propose]')), 'Suggest is on Browse and in every page\'s footer, phones included');
  ok(!errs.length, 'no page errors ' + errs.join('; '));
  await b.close();
})();
