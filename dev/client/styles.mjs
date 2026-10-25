// Lists every rule that sets a property on a node in live Spotify, inherited ones included,
// with !important flags. Useful when a Spotify rule wins over user.css.
//   node dev/client/styles.mjs "#am-sidebar" font-family
//   node dev/client/fonts.mjs  (which font actually renders)
import { chromium } from 'playwright';

const [selector, property] = process.argv.slice(2);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
if (!nodeId) throw new Error('No node for ' + selector);
const matched = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
const show = (origin, style, rule) => {
  for (const p of style?.cssProperties || []) if (p.name === property && p.value) console.log(origin.padEnd(14), '|', rule, '|', p.value.slice(0, 100), p.important ? '!important' : '');
};
show('inline', matched.inlineStyle, 'style=""');
for (const r of matched.matchedCSSRules || []) show(r.rule.origin, r.rule.style, r.rule.selectorList.text);
for (const [i, inherited] of (matched.inherited || []).entries()) {
  show(`inherited#${i}`, inherited.inlineStyle, 'style=""');
  for (const r of inherited.matchedCSSRules || []) show(`inherited#${i}`, r.rule.style, r.rule.selectorList.text);
}
await browser.close().catch(() => {});
