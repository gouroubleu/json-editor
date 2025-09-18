// Script de test browser pour vérifier l'application
const { execSync } = require('child_process');

console.log('=== TEST DE BOUT EN BOUT RÉEL ===');

// Test 1: Vérifier que la page principale se charge
console.log('\n1. Test de chargement de la page principale...');
try {
  const result = execSync(`timeout 10 google-chrome --headless --disable-gpu --virtual-time-budget=5000 --dump-dom http://localhost:5501/`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 });

  if (result.includes('Rhinov Auto-Site') || result.includes('JSON Editor')) {
    console.log('✅ Page principale chargée avec succès');
  } else {
    console.log('❌ Page principale ne contient pas le contenu attendu');
    console.log('Contenu récupéré:', result.substring(0, 500) + '...');
  }
} catch (error) {
  console.log('❌ Erreur lors du chargement de la page:', error.message);
}

// Test 2: Récupérer le HTML et chercher les erreurs JavaScript
console.log('\n2. Test de récupération du HTML complet...');
try {
  const html = execSync(`curl -s http://localhost:5501/`, { encoding: 'utf8' });

  // Chercher des indices d'erreurs
  if (html.includes('Failed to fetch')) {
    console.log('❌ Erreur "Failed to fetch" trouvée dans le HTML');
  }

  if (html.includes('5501-dev.33800.nowhere84.com')) {
    console.log('❌ URL incorrecte trouvée: 5501-dev.33800.nowhere84.com');
  }

  if (html.includes('QwikCityProvider')) {
    console.log('✅ Composants Qwik détectés');
  }

  // Sauvegarder le HTML pour inspection
  require('fs').writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/page-output.html', html);
  console.log('📄 HTML sauvegardé dans page-output.html');

} catch (error) {
  console.log('❌ Erreur lors de la récupération HTML:', error.message);
}

console.log('\n=== FIN DU TEST ===');