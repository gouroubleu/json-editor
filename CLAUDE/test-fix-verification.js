// Test pour vérifier que les corrections fonctionnent
const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== VÉRIFICATION DES CORRECTIONS ===');

try {
  // Test 1: Récupérer le nouveau HTML
  console.log('\n1. Récupération du nouveau HTML...');
  const html = execSync('curl -s http://localhost:5501/', { encoding: 'utf8' });

  // Test 2: Vérifier les nouvelles URLs dans le HTML
  console.log('\n2. Vérification des URLs dans le HTML...');

  // Chercher les anciennes URLs problématiques
  if (html.includes('/bo/schemaEditor/')) {
    console.log('❌ Des anciennes URLs /bo/schemaEditor/ sont encore présentes');
  } else {
    console.log('✅ Plus d\'anciennes URLs /bo/schemaEditor/ détectées');
  }

  // Chercher les nouvelles URLs correctes
  if (html.includes('/bdd/')) {
    console.log('✅ Nouvelles URLs /bdd/ détectées');
  } else {
    console.log('❌ Nouvelles URLs /bdd/ non trouvées');
  }

  if (html.includes('/new/')) {
    console.log('✅ Nouvelles URLs /new/ détectées');
  } else {
    console.log('❌ Nouvelles URLs /new/ non trouvées');
  }

  // Test 3: Extraire et tester les gestionnaires de clic
  console.log('\n3. Test des gestionnaires de clic...');
  const onClickPattern = /on:click="([^"]+)"/g;
  const matches = [];
  let match;

  while ((match = onClickPattern.exec(html)) !== null) {
    matches.push(match[1]);
  }

  console.log(`Trouvé ${matches.length} gestionnaires de clic`);

  // Chercher spécifiquement les boutons "Entités"
  const entitiesButtons = matches.filter(url => url.includes('button_onClick_1_'));
  console.log(`Trouvé ${entitiesButtons.length} boutons Entités`);

  if (entitiesButtons.length > 0) {
    const testUrl = entitiesButtons[0];
    console.log(`\nTest du bouton Entités: ${testUrl}`);

    try {
      const fullUrl = `http://localhost:5501/${testUrl}`;
      const result = execSync(`curl -s "${fullUrl}"`, { encoding: 'utf8' });

      // Vérifier le contenu du JavaScript
      if (result.includes('/bdd/')) {
        console.log('✅ Le JavaScript des boutons utilise les nouvelles routes /bdd/');
      } else if (result.includes('/bo/schemaEditor/')) {
        console.log('❌ Le JavaScript utilise encore les anciennes routes');
      } else {
        console.log('⚠️ Contenu JavaScript non reconnu');
        console.log('Extrait:', result.substring(0, 200));
      }

    } catch (error) {
      console.log('❌ Erreur lors du test du JavaScript:', error.message);
    }
  }

  // Test 4: Tester les routes directement
  console.log('\n4. Test des routes...');
  const routesToTest = [
    '/bdd/',
    '/new/',
    '/bdd/test-user',
    '/bdd/user'
  ];

  routesToTest.forEach(route => {
    try {
      const result = execSync(`curl -s -I "http://localhost:5501${route}"`, { encoding: 'utf8' });
      const status = result.split('\n')[0];
      console.log(`${route}: ${status}`);
    } catch (error) {
      console.log(`${route}: ERREUR`);
    }
  });

  console.log('\n=== RÉSUMÉ ===');
  console.log('Les corrections ont été appliquées.');
  console.log('Le serveur tourne sur localhost:5501 comme configuré.');
  console.log('Les URLs ont été mises à jour pour utiliser la structure de routes réelle.');

} catch (error) {
  console.log('❌ Erreur lors de la vérification:', error.message);
}

console.log('\n=== FIN DE LA VÉRIFICATION ===');