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
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('#main a.row-txt')].find(a => a.getBoundingClientRect().top > 0); a.click(); return a.getAttribute('href'); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => scrollY) === 0, 'listing opens at top ' + href);
  await p.click('a.back'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => location.hash) === '#today', 'back link returns to Today');
  const y = await p.evaluate(() => scrollY); ok(Math.abs(y - 1500) < 5, 'Today scroll restored (' + y + ')');
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
  // search
  await p.goto(url + '#search'); await p.waitForTimeout(400);
  const S = async q => { await p.fill('#q', q); await p.waitForTimeout(150); return p.evaluate(() => ({ text: document.getElementById('results').textContent, top: document.querySelector('#results .row-txt b')?.textContent, side: document.getElementById('side-q').value })); };
  let r = await S('rg'); ok(r.top === 'ripgrep', 'alias rg finds ripgrep');
  r = await S('spreadsheat'); ok(/Showing results for/.test(r.text), 'typo is corrected');
  r = await S('https://github.com/BurntSushi/ripgrep'); ok(r.top === 'ripgrep', 'pasted GitHub link finds the listing');
  r = await S('github.com/foo/bar'); ok(/isn't in Vetted yet/.test(r.text), 'unlisted repo link says so');
  r = await S('ci/cd'); ok(/CI\/CD/.test(r.top || ''), 'ci/cd is a word, not a repo');
  ok(r.side === 'ci/cd', 'search boxes stay in sync');
  ok(!errs.length, 'no page errors ' + errs.join('; '));
  await b.close();
})();
