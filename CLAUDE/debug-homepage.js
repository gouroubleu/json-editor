const puppeteer = require('puppeteer');

async function debugHomepage() {
  console.log('🔍 DEBUG HOMEPAGE');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('📍 Navigation vers http://localhost:5501/');
    await page.goto('http://localhost:5501/');
    await page.waitForSelector('body', { timeout: 10000 });

    // Capturer le contenu de la page
    const content = await page.content();
    console.log('📄 CONTENU DE LA PAGE:');
    console.log(content);

    // Capturer tous les liens
    const links = await page.$$eval('a', links =>
      links.map(link => ({
        href: link.href,
        text: link.textContent.trim()
      }))
    );

    console.log('🔗 LIENS TROUVÉS:');
    links.forEach(link => {
      console.log(`- "${link.text}" → ${link.href}`);
    });

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-homepage.png' });

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  } finally {
    await browser.close();
  }
}

debugHomepage().catch(console.error);