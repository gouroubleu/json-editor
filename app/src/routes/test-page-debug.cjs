/**
 * Script de debugging pour analyser ce qui se trouve sur la page
 * Usage: node test-page-debug.cjs
 */

const puppeteer = require('puppeteer');

const CONFIG = {
  baseUrl: 'http://localhost:8002',
  userNewUrl: 'http://localhost:8002/bo/schemaEditor/bdd/user/new/',
  screenshotsDir: './test-screenshots',
  timeout: 30000,
  headless: false,
  slowMo: 500,
};

async function debugPage() {
  let browser = null;
  let page = null;

  try {
    console.log('🔍 Démarrage du debugging de la page...');
    
    // Lancer le navigateur
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigation
    console.log(`📍 Navigation vers: ${CONFIG.userNewUrl}`);
    await page.goto(CONFIG.userNewUrl, { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.timeout 
    });

    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Prendre un screenshot
    await page.screenshot({ 
      path: './test-screenshots/debug-full-page.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot sauvegardé: debug-full-page.png');

    // Analyser le contenu de la page
    console.log('\n🔍 Analyse du contenu de la page:');
    
    // Titre de la page
    const title = await page.title();
    console.log(`📄 Titre: ${title}`);

    // URL actuelle 
    const currentUrl = await page.url();
    console.log(`🌐 URL actuelle: ${currentUrl}`);

    // Chercher différents éléments possibles
    const selectors = [
      'body',
      '.horizontal-entity-viewer',
      '.entity-column',
      '.property-column',
      '.fixed-left-panel',
      '.columns-container',
      '.columns-scroll',
      '.field-item',
      '.field-name',
      'button',
      'input',
      'h1, h2, h3',
      '.error',
      '.notification'
    ];

    console.log('\n📋 Éléments trouvés sur la page:');
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`✅ ${selector}: ${elements.length} élément(s)`);
        
        // Pour certains éléments, afficher le texte
        if (elements.length > 0 && ['h1', 'h2', 'h3', '.error', '.notification'].some(s => selector.includes(s))) {
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            const text = await elements[i].evaluate(el => el.textContent?.trim() || '');
            if (text) {
              console.log(`   ${i + 1}. "${text}"`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ ${selector}: Erreur - ${error.message}`);
      }
    }

    // Chercher spécifiquement les boutons
    console.log('\n🔘 Analyse des boutons:');
    try {
      const buttons = await page.$$eval('button', btns => 
        btns.map(btn => ({
          text: btn.textContent?.trim() || '',
          title: btn.title || '',
          className: btn.className || '',
          id: btn.id || ''
        })).filter(btn => btn.text || btn.title)
      );
      
      buttons.slice(0, 10).forEach((btn, index) => {
        console.log(`   ${index + 1}. Text: "${btn.text}", Title: "${btn.title}"`);
      });
      
      if (buttons.length > 10) {
        console.log(`   ... et ${buttons.length - 10} autres boutons`);
      }
    } catch (error) {
      console.log(`❌ Erreur analyse boutons: ${error.message}`);
    }

    // Chercher spécifiquement les inputs
    console.log('\n📝 Analyse des inputs:');
    try {
      const inputs = await page.$$eval('input', inputs => 
        inputs.map(input => ({
          type: input.type || '',
          name: input.name || '',
          placeholder: input.placeholder || '',
          className: input.className || ''
        }))
      );
      
      inputs.slice(0, 5).forEach((input, index) => {
        console.log(`   ${index + 1}. Type: "${input.type}", Name: "${input.name}", Placeholder: "${input.placeholder}"`);
      });
    } catch (error) {
      console.log(`❌ Erreur analyse inputs: ${error.message}`);
    }

    // Vérifier s'il y a des erreurs JavaScript
    console.log('\n🐛 Vérification des erreurs JavaScript:');
    const jsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (jsErrors.length > 0) {
      console.log('❌ Erreurs JavaScript détectées:');
      jsErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ Aucune erreur JavaScript détectée');
    }

    // Vérifier le HTML brut de certaines sections
    console.log('\n📄 Extrait du HTML:');
    try {
      const bodyContent = await page.$eval('body', el => el.innerHTML.substring(0, 500));
      console.log(`Body (premiers 500 caractères): ${bodyContent}...`);
    } catch (error) {
      console.log(`❌ Impossible de récupérer le HTML: ${error.message}`);
    }

  } catch (error) {
    console.error(`💥 Erreur durant le debugging: ${error.message}`);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('\n✅ Debugging terminé');
  }
}

debugPage();