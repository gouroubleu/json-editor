/**
 * Script simple pour tester la connectivité du serveur
 * Usage: node test-server-connectivity.cjs
 */

const http = require('http');

const CONFIG = {
  baseUrl: 'localhost',
  port: 8002,
  testPath: '/bo/schemaEditor/bdd/user/new/',
  timeout: 5000
};

function testServerConnectivity() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.baseUrl,
      port: CONFIG.port,
      path: CONFIG.testPath,
      method: 'GET',
      timeout: CONFIG.timeout
    };

    console.log(`🔍 Test de connectivité vers: http://${CONFIG.baseUrl}:${CONFIG.port}${CONFIG.testPath}`);

    const req = http.request(options, (res) => {
      console.log(`✅ Serveur accessible - Status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ Serveur inaccessible: ${err.message}`);
      console.log(`💡 Assurez-vous que le serveur est démarré avec: npm run dev`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ Timeout - Le serveur ne répond pas dans les ${CONFIG.timeout}ms`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  const isServerUp = await testServerConnectivity();
  
  if (isServerUp) {
    console.log(`🎉 Serveur prêt ! Vous pouvez maintenant exécuter:`);
    console.log(`   node test-array-columns.cjs`);
    process.exit(0);
  } else {
    console.log(`💥 Le serveur n'est pas accessible.`);
    console.log(`   Démarrez le serveur avec: npm run dev`);
    process.exit(1);
  }
}

main();