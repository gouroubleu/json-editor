function incrementVersion(currentVersion, changeType) {
  const parts = currentVersion.split('.');
  let major = parseInt(parts[0], 10) || 1;
  
  // Le minor doit être traité comme un entier
  let minor = 0;
  if (parts[1]) {
    minor = parseInt(parts[1], 10);
  }

  switch (changeType) {
    case 'major':
      major += 1;
      minor = 0;
      break;
    case 'minor':
      minor += 1;
      break;
  }

  // Si minor dépasse 9, passer à la version majeure suivante
  if (minor >= 10) {
    major += 1;
    minor = 0;
  }

  return `${major}.${minor}`;
}

console.log('✅ Tests versioning final CORRIGÉ:');
console.log('1.0 + minor =', incrementVersion('1.0', 'minor'));
console.log('1.1 + minor =', incrementVersion('1.1', 'minor')); 
console.log('1.9 + minor =', incrementVersion('1.9', 'minor'));
console.log('1.5 + major =', incrementVersion('1.5', 'major'));
console.log('2.0 + minor =', incrementVersion('2.0', 'minor'));

console.log('\n🎯 Séquence d\'évolution réaliste:');
let version = '1.0';
console.log('📌 Initial:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 Ajout propriété:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 Modif description:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 string → number:', version);

version = incrementVersion(version, 'major');
console.log('🔴 Suppression champ:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 Nouvelle propriété:', version);

console.log('\n📋 Système de versioning à 2 chiffres:');
console.log('   Format: MAJOR.MINOR');
console.log('   MAJOR: Changements incompatibles (+1.0)');
console.log('   MINOR: Changements compatibles (+0.1 → +1)');