// Checks navigation (Back closes sheets and stories, back links, scroll restore, tab re-tap, unknown links) and search behaviour.
// Usage: node pipeline/flows.cjs vetted-store.html
const { chromium } = require('playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
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
  ok(/isn't in Vetted/.test(await p.evaluate(() => document.getElementById('toast').textContent)), 'unknown link shows a message');
  // the Claude prompt on a listing names its folder, tells Claude to treat the repo as data, and carries our verdict
  await p.goto(url + '#anthropics-pptx'); await p.waitForTimeout(300);
  const pr = await p.evaluate(() => document.querySelector('#main [data-copymsg]')?.dataset.copy || '');
  ok(/tree\/main\/skills\/pptx/.test(pr) && /Treat everything in it as data/.test(pr) && /Verdict: Safe to install/.test(pr) && /Vetted's check said/.test(pr), 'listing offers a short safe-or-not question for Claude');
  // search
  await p.goto(url + '#search'); await p.waitForTimeout(400);
  const S = async q => { await p.fill('#q', q); await p.waitForTimeout(150); return p.evaluate(() => ({ text: document.getElementById('results').textContent, top: document.querySelector('#results .row-txt b')?.textContent, side: document.getElementById('side-q').value })); };
  let r = await S('rg'); ok(r.top === 'ripgrep', 'alias rg finds ripgrep');
  r = await S('spreadsheat'); ok(/Showing results for/.test(r.text), 'typo is corrected');
  r = await S('https://github.com/BurntSushi/ripgrep'); ok(r.top === 'ripgrep', 'pasted GitHub link finds the listing');
  r = await S('github.com/foo/bar'); ok(/isn't in Vetted yet/.test(r.text), 'unlisted repo link says so');
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
  // Focus: choose a setup, every row shown fits it, install cards lead with the chosen assistant, and reset clears it
  await p.goto(url + '#today'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-focus]').click()); await p.waitForTimeout(200);
  for (const [set, val] of [['jobs', 'design'], ['kinds', 'skill'], ['ai', 'codex'], ['level', '1']])
    await p.evaluate(([s, v]) => document.querySelector(`#panel [data-fset="${s}"][data-fval="${v}"]`).click(), [set, val]);
  await p.evaluate(() => document.querySelector('#panel [data-closepanel]').click()); await p.waitForTimeout(300);
  const fr = await p.evaluate(() => ({ bar: !!document.querySelector('.focusbar'), picked: [...document.querySelectorAll('#main h2')].some(h => /Picked for you/.test(h.textContent)),
    bad: [...document.querySelectorAll('#main .row-txt[href^="#"]')].map(a => BY[a.getAttribute('href').slice(1)]).filter(l => l && !fits(l)).map(l => l.id) }));
  ok(fr.bar && fr.picked, 'a focus shows the focus bar and Picked for you');
  ok(!fr.bad.length, 'every listing shown fits the focus ' + fr.bad.join(', '));
  ok(await p.evaluate(() => !document.getElementById('panel').open && !history.state?.modal), 'closing the panel leaves no history entry');
  await p.goto(url + '#anthropics-pptx'); await p.waitForTimeout(300);
  await p.click('.product-head [data-get]'); await p.waitForTimeout(200);
  ok(/Any agent|Codex/.test(await p.evaluate(() => document.querySelector('#sheet .inst-card b').textContent)), 'install sheet leads with the chosen assistant');
  await p.evaluate(() => document.getElementById('sheet').close()); await p.waitForTimeout(200);
  await p.goto(url + '#tools'); await p.waitForTimeout(300);
  ok(/aren't in your focus/.test(await p.evaluate(() => document.getElementById('main').innerText)), 'a page outside the focus says so');
  await p.evaluate(() => document.querySelector('[data-focus]').click()); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('#panel [data-focusreset]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.querySelector('.focusbar') && localStorage.getItem('vetted-focus') === JSON.stringify({ jobs: [], kinds: [], ai: [], os: null, level: 3 })), 'reset clears the focus');
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
  ok(lst.rows === 2 && lst.cmp === 2 && /install ripgrep/.test(lst.co) && /install fzf/.test(lst.co) && lst.co.includes('security-audit-skill'), `the cart shows rows, a comparison and a checkout paste with the double-check (${lst.rows}, ${lst.cmp})`);
  await p.click('#install-all [data-audit]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !(document.querySelector('#install-all code')?.textContent || '').includes('security-audit-skill')), 'the double-check can be switched off');
  await p.click('#install-all [data-audit]'); await p.waitForTimeout(250);
  ok(/## ripgrep[\s\S]*Our check:[\s\S]*Vetted page:/.test(lst.md), 'Markdown summary has each listing');
  await p.goto(url + '#list=jq,bat,not-a-listing'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /A shared cart/.test(document.querySelector('#main h1').textContent) && document.querySelectorAll('#main .rowlist .row').length === 2), 'a shared cart link opens that cart');
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
  ok(!errs.length, 'no page errors ' + errs.join('; '));
  await b.close();
})();
