const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:30001/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // disable animations for stable screenshot like previous
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--animations', 'disabled');
    // inject style to disable transitions
    const s = document.createElement('style');
    s.textContent = `* { animation: none !important; transition: none !important; } .hero-orb, .hero-light, .hero-spotlight, .hero-horizon, .hero-grid { animation: none !important; }`;
    document.head.appendChild(s);
  });
  await page.waitForTimeout(500);
  // get hero bounding and computed styles
  const info = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const cs = getComputedStyle(hero);
    const inner = document.querySelector('.hero-inner');
    const csInner = inner ? getComputedStyle(inner) : null;
    const trust = document.querySelector('.hero-trust');
    const csTrust = trust ? getComputedStyle(trust) : null;
    const trustLi = document.querySelector('.hero-trust li');
    const csLi = trustLi ? getComputedStyle(trustLi) : null;
    const callCard = document.querySelector('.call-card');
    const agentCard = document.querySelector('.agent-card');
    const routing = document.querySelector('.routing-line');
    const heroBg = document.querySelector('.hero-bg');
    const orb = document.querySelector('.hero-orb');
    const res = {
      hero: {
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        height: cs.height,
        minHeight: cs.minHeight,
        background: cs.background,
        backgroundColor: cs.backgroundColor,
        box: hero ? hero.getBoundingClientRect() : null,
      },
      heroBg: heroBg ? getComputedStyle(heroBg).background : null,
      orb: orb ? {
        top: getComputedStyle(orb).top,
        right: getComputedStyle(orb).right,
        width: getComputedStyle(orb).width,
        height: getComputedStyle(orb).height,
        opacity: getComputedStyle(orb).opacity,
        filter: getComputedStyle(orb).filter,
        background: getComputedStyle(orb).background,
        backgroundImage: getComputedStyle(orb).backgroundImage,
      } : null,
      inner: inner ? {
        gridTemplateColumns: csInner.gridTemplateColumns,
        gap: csInner.gap,
        maxWidth: csInner.maxWidth,
        height: csInner.height,
        box: inner.getBoundingClientRect(),
      } : null,
      trust: trust ? {
        marginTop: csTrust.marginTop,
        gap: csTrust.gap,
        box: trust.getBoundingClientRect(),
      } : null,
      trustLi: trustLi ? {
        margin: csLi.margin,
        marginTop: csLi.marginTop,
        fontSize: csLi.fontSize,
      } : null,
      callCard: callCard ? {
        width: getComputedStyle(callCard).width,
        height: getComputedStyle(callCard).height,
        padding: getComputedStyle(callCard).padding,
        zIndex: getComputedStyle(callCard).zIndex,
        box: callCard.getBoundingClientRect(),
      } : null,
      agentCard: agentCard ? {
        width: getComputedStyle(agentCard).width,
        height: getComputedStyle(agentCard).height,
        padding: getComputedStyle(agentCard).padding,
        zIndex: getComputedStyle(agentCard).zIndex,
        top: getComputedStyle(agentCard).top,
        right: getComputedStyle(agentCard).right,
        box: agentCard.getBoundingClientRect(),
      } : null,
      routing: routing ? {
        zIndex: getComputedStyle(routing).zIndex,
        box: routing.getBoundingClientRect(),
        path: routing.querySelector('.routing-pulse') ? routing.querySelector('.routing-pulse').getAttribute('d') : null,
      } : null,
      heroProduct: document.querySelector('.hero-product') ? {
        minHeight: getComputedStyle(document.querySelector('.hero-product')).minHeight,
        box: document.querySelector('.hero-product').getBoundingClientRect(),
      } : null,
    };
    return res;
  });
  console.log(JSON.stringify(info, null, 2));
  // screenshot hero element
  const hero = page.locator('.hero');
  await hero.screenshot({ path: 'C:/Users/jaisi/Documents/GDS Creatives/call-center/.design-work/screenshots/hero-1440-cdp.png' });
  console.log('saved hero-1440-cdp.png');
  await page.screenshot({ path: 'C:/Users/jaisi/Documents/GDS Creatives/call-center/.design-work/screenshots/page-1440-cdp.png', fullPage: false });
  console.log('saved page-1440-cdp.png');
  // also 768 and 375
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(500);
  await hero.screenshot({ path: 'C:/Users/jaisi/Documents/GDS Creatives/call-center/.design-work/screenshots/hero-768-cdp.png' });
  console.log('saved hero-768-cdp.png');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await hero.screenshot({ path: 'C:/Users/jaisi/Documents/GDS Creatives/call-center/.design-work/screenshots/hero-375-cdp.png' });
  console.log('saved hero-375-cdp.png');
  await browser.close();
})();
