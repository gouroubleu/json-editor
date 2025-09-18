// Script à exécuter dans la console du navigateur pour simuler le clic
console.log('🚀 Début de la simulation du clic sur la flèche adresse');

// 1. Trouver la propriété adresse
const adresseField = document.querySelector('.field-item[q\\:key="adresse"]');
if (!adresseField) {
    console.error('❌ Propriété adresse non trouvée');
    throw new Error('Propriété adresse non trouvée');
}
console.log('✅ Propriété adresse trouvée', adresseField);

// 2. Trouver le bouton flèche
const arrowButton = adresseField.querySelector('.field-actions button');
if (!arrowButton) {
    console.error('❌ Bouton flèche non trouvé');
    throw new Error('Bouton flèche non trouvé');
}
console.log('✅ Bouton flèche trouvé', arrowButton);

// 3. Capturer l'état avant le clic
const columnsBefore = document.querySelectorAll('.entity-column');
console.log(`📊 Nombre de colonnes avant clic: ${columnsBefore.length}`);

// 4. Simuler le clic
console.log('🖱️ Simulation du clic...');
arrowButton.click();

// 5. Attendre et vérifier les changements
setTimeout(() => {
    console.log('🔍 Vérification des changements après clic...');

    const columnsAfter = document.querySelectorAll('.entity-column');
    console.log(`📊 Nombre de colonnes après clic: ${columnsAfter.length}`);

    if (columnsAfter.length > columnsBefore.length) {
        console.log('✅ Nouvelle colonne détectée !');

        // Analyser la nouvelle colonne
        const newColumn = columnsAfter[columnsAfter.length - 1];
        const title = newColumn.querySelector('.column-title')?.textContent;
        console.log(`📋 Titre de la nouvelle colonne: "${title}"`);

        // Chercher les boutons d'action
        const buttons = newColumn.querySelectorAll('button');
        console.log(`🔘 Boutons trouvés dans la nouvelle colonne: ${buttons.length}`);

        buttons.forEach((btn, index) => {
            console.log(`🔘 Bouton ${index + 1}: "${btn.textContent.trim()}"`);
        });

        // Chercher spécifiquement les boutons d'ajout
        const addButtons = Array.from(buttons).filter(btn =>
            btn.textContent.includes('+') ||
            btn.textContent.includes('Ajouter') ||
            btn.textContent.includes('Nouveau')
        );
        console.log(`➕ Boutons d'ajout trouvés: ${addButtons.length}`);

        if (addButtons.length > 0) {
            console.log('✅ Bouton d\\'ajout trouvé - prêt pour ajouter un élément');
            console.log('🎯 Cliquez sur ce bouton pour ajouter un élément:', addButtons[0]);
        } else {
            console.log('❌ Aucun bouton d\\'ajout trouvé dans la nouvelle colonne');
        }

    } else {
        console.log('❌ Aucune nouvelle colonne créée');
    }

    // Afficher l'état JSON actuel si possible
    const jsonButton = document.querySelector('button[title*="JSON"], button:contains("JSON")');
    if (jsonButton) {
        console.log('👁️ Bouton JSON trouvé pour vérifier l\\'état');
    }

}, 1000);

console.log('✅ Script de simulation lancé - résultats dans 1 seconde');