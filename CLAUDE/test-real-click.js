// Test de clic réel sur les boutons "Entités"
const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== TEST RÉEL DES CLICS DANS L\'APPLICATION ===');

// Fonction pour extraire les URLs des gestionnaires d'événements
function extractOnClickUrls(html) {
  const onClickPattern = /on:click="([^"]+)"/g;
  const matches = [];
  let match;

  while ((match = onClickPattern.exec(html)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

try {
  // Récupérer le HTML de la page
  const html = fs.readFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/page-output.html', 'utf8');

  // Extraire toutes les URLs des gestionnaires de clic
  const onClickUrls = extractOnClickUrls(html);

  console.log('\nGestionnaires de clic trouvés:');
  onClickUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
  });

  // Chercher spécifiquement les boutons "Entités"
  const entitiesButtons = onClickUrls.filter(url => url.includes('button_onClick_1_'));

  console.log('\nBoutons "Entités" trouvés:');
  entitiesButtons.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
  });

  // Tester l'accès à l'un de ces fichiers JavaScript
  if (entitiesButtons.length > 0) {
    const testUrl = entitiesButtons[0];
    console.log(`\nTest d'accès au fichier JavaScript: ${testUrl}`);

    try {
      const fullUrl = `http://localhost:5501/${testUrl}`;
      console.log(`URL complète: ${fullUrl}`);

      const result = execSync(`curl -s -I "${fullUrl}"`, { encoding: 'utf8' });
      console.log('Réponse HTTP:');
      console.log(result);

    } catch (error) {
      console.log('❌ Erreur lors de l\'accès au fichier JS:', error.message);
    }
  }

  console.log('\n=== VÉRIFICATION DES ROUTES ENTITIES ===');

  // Tester l'accès direct aux routes entities
  const entitiesRoutes = [
    '/entities/test-user',
    '/entities/user',
    '/entities/order'
  ];

  entitiesRoutes.forEach(route => {
    try {
      const fullUrl = `http://localhost:5501${route}`;
      console.log(`\nTest de la route: ${fullUrl}`);

      const result = execSync(`curl -s -I "${fullUrl}"`, { encoding: 'utf8' });
      const firstLine = result.split('\n')[0];
      console.log(`Status: ${firstLine}`);

    } catch (error) {
      console.log(`❌ Erreur pour ${route}:`, error.message);
    }
  });

} catch (error) {
  console.log('❌ Erreur lors du test:', error.message);
}

console.log('\n=== FIN DU TEST ===');