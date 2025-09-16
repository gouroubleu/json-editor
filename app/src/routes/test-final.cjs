function incrementVersion(currentVersion, changeType) {
  const parts = currentVersion.split('.');
  let major = parseInt(parts[0], 10) || 1;
  let minor = parseFloat(parts[1] || '0');

  switch (changeType) {
    case 'major':
      major += 1;
      minor = 0;
      break;
    case 'minor':
      minor += 0.1;
      minor = Math.round(minor * 10) / 10;
      break;
  }

  if (minor === 0) {
    return `${major}.0`;
  } else if (minor % 1 === 0) {
    return `${major}.${Math.floor(minor)}`;
  } else {
    return `${major}.${minor}`;
  }
}

console.log('✅ Tests versioning final:');
console.log('1.0 + minor =', incrementVersion('1.0', 'minor'));
console.log('1.1 + minor =', incrementVersion('1.1', 'minor')); 
console.log('1.9 + minor =', incrementVersion('1.9', 'minor'));
console.log('1.5 + major =', incrementVersion('1.5', 'major'));
console.log('2.0 + minor =', incrementVersion('2.0', 'minor'));

console.log('\n🎯 Séquence d\'évolution:');
let version = '1.0';
console.log('📌 Initial:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 +minor:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 +minor:', version);

version = incrementVersion(version, 'major');
console.log('🔴 +major:', version);

version = incrementVersion(version, 'minor');
console.log('🟢 +minor:', version);