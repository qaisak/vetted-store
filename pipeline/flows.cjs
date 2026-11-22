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
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('#main a.row-txt')].find(a => a.getBoundingClientRect().top > 0); a.click(); return a.getAttribute('href'); });
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
  // GET from a row, then View full listing, then back
  await p.evaluate(() => document.querySelector('#main .row [data-get]').click()); await p.waitForTimeout(200);
  const gid = await p.evaluate(() => document.querySelector('#main .row [data-get]').dataset.get);
  await p.click('#sheet a.pill-link[data-closesheet]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === '#' + gid, 'View full listing navigates to ' + gid);
  ok(!(await p.evaluate(() => document.getElementById('sheet').open)), 'sheet closed after navigating');
  await p.goBack(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash) === '#today', 'back from that listing goes to Today');
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
  await p.goto(url + '#anthropics-pptx'); await p.waitForTimeout(300);
  const pr = await p.evaluate(() => document.querySelector('#before [data-copymsg]')?.dataset.copy || '');
  ok(/tree\/main\/skills\/pptx/.test(pr) && /Treat everything in it as data/.test(pr) && /Verdict: Safe to install/.test(pr) && /Skillshelf's check said/.test(pr), 'listing offers a short safe-or-not question for Claude');
  // search
  await p.goto(url + '#search'); await p.waitForTimeout(400);
  const S = async q => { await p.fill('#q', q); await p.waitForTimeout(150); return p.evaluate(() => ({ text: document.getElementById('results').textContent, top: document.querySelector('#results .row-txt b')?.textContent, side: document.getElementById('side-q').value })); };
  let r = await S('rg'); ok(r.top === 'ripgrep', 'alias rg finds ripgrep');
  r = await S('spreadsheat'); ok(/Showing results for/.test(r.text), 'typo is corrected');
  r = await S('https://github.com/BurntSushi/ripgrep'); ok(r.top === 'ripgrep', 'pasted GitHub link finds the listing');
  r = await S('github.com/foo/bar'); ok(/isn't in Skillshelf yet/.test(r.text), 'unlisted repo link says so');
  ok(await p.evaluate(() => /Is this open-source project safe to install\? https:\/\/github.com\/foo\/bar/.test(document.querySelector('#results [data-copymsg]')?.dataset.copy || '')), 'unlisted repo offers a Claude prompt for that repo');
  r = await S('ci/cd'); ok(/CI\/CD/.test(r.top || ''), 'ci/cd is a word, not a repo');
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
  const fr = await p.evaluate(() => ({ bar: !!document.querySelector('.focusbar'), bad: [...document.querySelectorAll('#main .row-txt[href^="#"]')].map(a => BY[a.getAttribute('href').slice(1)]).filter(l => l && !fits(l)).map(l => l.id) }));
  ok(fr.bar && !fr.bad.length, 'an old saved focus shows its bar and filters Browse ' + fr.bad.join(', '));
  await p.evaluate(() => { FOCUS = { ...FOCUS0 }; saveFocus(); });
  // The install sheet: Claude sets it up first, every install option one click away
  await p.goto(url + '#anthropics-pptx'); await p.reload(); await p.waitForTimeout(300);
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
  ok(lst.rows === 2 && lst.cmp === 2 && /1\. ripgrep — run: \S/.test(lst.co) && /2\. fzf — run: \S/.test(lst.co) && lst.co.includes('security-audit-skill'), `the cart shows rows, a comparison and a checkout paste with the double-check (${lst.rows}, ${lst.cmp})`);
  await p.click('#install-all [data-audit]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !(document.querySelector('#install-all code')?.textContent || '').includes('security-audit-skill')), 'the double-check can be switched off');
  await p.click('#install-all [data-audit]'); await p.waitForTimeout(250);
  ok(/## ripgrep[\s\S]*Our check:[\s\S]*Skillshelf page:/.test(lst.md), 'Markdown summary has each listing');
  await p.goto(url + '#list=jq,bat,not-a-listing'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /A shared list/.test(document.querySelector('#main h1').textContent) && document.querySelectorAll('#main .rowlist .row').length === 2), 'a shared cart link opens that cart');
  await p.goto(url + '#setup?jobs=design&ai=cursor&os=Windows'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash === '#today' && FOCUS.jobs[0] === 'design' && FOCUS.ai[0] === 'cursor' && FOCUS.os === 'Windows' && S.agent === 'cursor'), 'a setup link applies Make it yours');
  await p.evaluate(() => { FOCUS = { ...FOCUS0 }; saveFocus(); LIST = []; saveList(); });
  await p.goto(url + '#caught'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#main .caught-item').length >= 10), 'What we caught lists the reviewed notes');
  await p.goto(url + '#anthropics-invoice-chase'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Who owes me money/i.test(document.querySelector('.try')?.textContent || '')), 'a skill shows what to ask, quoted from its description');
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
  ok(cb.bar && cb.codes[0] === '/plugin marketplace add qaisak/vetted-store' && cb.codes[1] === '/plugin install skillshelf@skillshelf', 'home leads with the Skillshelf bar: a drawing of it and its two install commands');
  ok(cb.codes[2] === 'https://skillshelf.skillshelf.workers.dev/mcp' && cb.codes.every((c, i) => cb.copies[i] === c), 'Claude chat users still get a copyable connector address');
  // Three tabs, and the old type pages are Browse with a filter
  await p.goto(url + '#today'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#side-nav .nav-item')].map(b => b.textContent.trim().replace(/\d+$/, '')).join(',') === 'Home,Browse,My list'), 'three tabs: Home, Browse, My list');
  const alts = await p.evaluate(() => [...document.querySelectorAll('#main .alt-card')].map(a => BY[a.getAttribute('href').slice(1)]));
  ok(alts.length >= 4 && alts.every(l => l && l.alt && l.alt.paid && /^https:\/\//.test(l.alt.src)), 'home shows the free alternatives to paid tools, each with a source (' + alts.length + ')');
  ok(await p.evaluate(() => HOME_IDEAS.every(([, q]) => searchHits(q).length)), 'every home search idea finds listings');
  await p.evaluate(() => document.querySelector('#main .ideas [data-suggest]').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => location.hash === '#search' && document.querySelectorAll('#results .row').length > 0), 'a home idea opens Browse with results');
  for (const [h, k] of [['tools', 'tool'], ['skills', 'skill'], ['mcp', 'mcp']]) {
    await p.goto(url + '#' + h); await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({ tab: document.querySelector('#side-nav [aria-current="page"]')?.textContent || '', kinds: [...new Set([...document.querySelectorAll('#main .rowlist .row-txt')].map(a => BY[a.getAttribute('href').slice(1)].k))] }));
    ok(/Browse/.test(r.tab) && r.kinds.length === 1 && r.kinds[0] === k, '#' + h + ' is Browse filtered to ' + k);
  }
  // Listing pages: four blocks, What it replaces only when known, the details folded
  await p.goto(url + '#voicestudio'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => ['what', 'replaces', 'get', 'before'].every(id => document.getElementById(id)) && !document.getElementById('checks').open && /ElevenLabs/.test(document.getElementById('replaces').textContent)), 'VoiceStudio: four blocks, it replaces ElevenLabs, details folded');
  await p.goto(url + '#ripgrep'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('replaces') && !!document.getElementById('get')), 'a listing with no known alternative has no What it replaces');
  ok(!errs.length, 'no page errors ' + errs.join('; '));
  await b.close();
})();
