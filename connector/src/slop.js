// Finds common tells of AI-written text. These are patterns, not proof: people write some of them too, so the result says
// how often each one shows up and lets the person decide what to ban. Every rule has a plain reason a reader would give.
const w = list => new RegExp(`\\b(?:${list.join('|')})\\b`, 'gi');

export const SLOP_RULES = [
  { id: 'buzzwords', label: 'AI buzzwords', why: 'Words chatbots overuse that make writing sound generic',
    re: w(['delve[sd]?', 'delving', 'tapestry', 'testament', 'realm', 'leverag(?:e|es|ed|ing)', 'seamless(?:ly)?', 'robust', 'elevat(?:e|es|ed|ing)', 'unlock(?:s|ed|ing)?', 'unleash(?:es|ed|ing)?',
      'embark(?:s|ed|ing)?', 'vibrant', 'bustling', 'intricate', 'pivotal', 'paramount', 'synerg(?:y|ies)', 'game[- ]changer', 'cutting[- ]edge', 'holistic', 'meticulous(?:ly)?',
      'underscor(?:e|es|ed|ing)', 'showcas(?:e|es|ed|ing)', 'resonat(?:e|es|ed|ing)', 'foster(?:s|ed|ing)?', 'ever[- ]evolving', 'navigat(?:e|es|ing) the complexities', 'treasure trove', 'beacon', 'myriad', 'plethora', 'bolster(?:s|ed|ing)?', 'harness(?:es|ed|ing)? the power', 'empower(?:s|ed|ing)?', 'supercharg(?:e|es|ed|ing)', 'streamlin(?:e|es|ed|ing)']) },
  { id: 'openers', label: 'Stock openers', why: 'Throat-clearing that delays the point',
    re: /\b(?:in today's (?:(?:fast-paced|fast-moving|digital|ever-changing|ever-evolving|rapidly (?:changing|evolving)|modern|competitive|interconnected),? )+(?:world|age|landscape|era|economy)|in the (?:ever-evolving|fast-paced|dynamic) (?:world|landscape|realm) of|when it comes to|in the world of|let's dive (?:in|into)|let's explore|imagine a world)\b/gi },
  { id: 'filler', label: 'Filler phrases', why: 'Phrases that add words but no meaning',
    re: /\b(?:it(?:'s| is) (?:important|worth|crucial|essential) to (?:note|remember|mention|consider) that|it's worth noting|needless to say|at the end of the day|plays? a (?:crucial|vital|pivotal|key) role|a wide (?:range|array|variety) of|serves as a|stands as a|in order to)\b/gi },
  { id: 'notjust', label: '"It\'s not X, it\'s Y"', why: 'A contrast chatbots use to sound profound',
    re: /\b(?:it'?s|this is|that'?s|isn'?t|aren'?t|is) not (?:just|only|merely|simply|about) [^.!?\n]{1,60}?[,;—–-]+\s*(?:it'?s|but|this is|they'?re)\b/gi },
  { id: 'wrapup', label: 'Wrap-up lines', why: 'Summaries and sign-offs nobody asked for',
    re: /\b(?:in conclusion|in summary|to sum up|i hope this helps|hope this helps|feel free to (?:reach out|ask|let me know)|let me know if you (?:have any|need|want))\b|\b(?:overall|ultimately),/gi },
  { id: 'eager', label: 'Eager openings', why: 'Praise and enthusiasm before the answer',
    re: /(?:^|\n|[.!?]\s+)(?:great question|certainly|absolutely|of course|sure thing|what a (?:great|fantastic|wonderful))[!,.]/gi },
  { id: 'emdash', label: 'Em dashes', why: 'Heavy use of — is a common chatbot habit; commas or full stops usually read better',
    re: /\s?—\s?/g },
  { id: 'whether', label: '"Whether you\'re X or Y"', why: 'A sales-pitch construction that speaks to everyone and no one',
    re: /\bwhether you(?:'re| are) an? [^,.!?\n]{1,40}? or an? [^,.!?\n]{1,40}?(?=[,.!?])/gi },
  { id: 'reveal', label: 'Fake suspense', why: '"The result?" and "Here\'s the thing:" set up a reveal that isn\'t one',
    re: /\b(?:here'?s the (?:thing|kicker|catch|deal)\b|the (?:result|answer|best part|catch|kicker)\?|spoiler:|but here'?s\b)/gi },
  { id: 'hedge', label: 'Stacked hedges', why: 'Several softeners in a row make the writing sound unsure',
    re: /\b(?:may potentially|could potentially|might possibly|can potentially|arguably perhaps|it seems that it may)\b/gi },
  { id: 'emoji', label: 'Emoji bullets', why: 'Rows of emoji used as bullet points read as generated',
    re: /(?:^|\n)\s*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?)\s+/gu },
];

export function analyzeSlop(input) {
  const text = String(input || '').slice(0, 20000);
  // Pasted text often has curly quotes (’ “ ”). The rules are written with straight ones, so match against a copy with
  // straight quotes: same length, so every position still points at the original text.
  const plain = text.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
  const words = (plain.match(/\b[\w'-]+\b/g) || []).length;
  const hits = [];
  for (const r of SLOP_RULES) {
    const matches = [];
    for (const m of plain.matchAll(r.re)) { if (m[0].trim()) matches.push({ start: m.index, end: m.index + m[0].length, text: text.slice(m.index, m.index + m[0].length).trim() }); if (matches.length >= 50) break; }
    // One em dash is fine; flag them only when they're frequent
    if (r.id === 'emdash' && matches.length < Math.max(2, Math.ceil(words / 150))) continue;
    if (matches.length) hits.push({ id: r.id, label: r.label, why: r.why, count: matches.length, examples: [...new Set(matches.map(m => m.text.toLowerCase()))].slice(0, 5), matches });
  }
  const total = hits.reduce((a, h) => a + h.count, 0), per100 = words ? total / words * 100 : 0;
  const level = !words ? 'empty' : per100 >= 3 || hits.length >= 5 ? 'high' : per100 >= 1 || hits.length >= 2 ? 'some' : total ? 'low' : 'none';
  return { view: 'slop', words, total, level, verdict: { empty: 'Paste some text to check.', none: 'No common AI tells found.', low: 'A trace of AI tells.', some: 'Some AI tells.', high: 'Lots of AI tells.' }[level], hits, text };
}
