import { server$ } from '@builder.io/qwik-city';
import type { JsonSchemaOutput, VersionInfo, VersionedSchema } from '../types';

// Fonction pour vérifier si un changement de type est compatible avec la BDD
const isTypeChangeCompatible = (oldType: string, newType: string): boolean => {
  // Changements compatibles qui ne cassent rien en BDD
  const compatibleChanges = [
    ['string', 'number'],    // string "123" -> number 123
    ['string', 'integer'],   // string "123" -> integer 123
    ['number', 'string'],    // number 123 -> string "123"
    ['integer', 'string'],   // integer 123 -> string "123"
    ['integer', 'number'],   // integer 123 -> number 123.0
    ['boolean', 'string'],   // boolean true -> string "true"
  ];
  
  return compatibleChanges.some(([from, to]) => from === oldType && to === newType);
};

// Fonction pour comparer deux schémas et déterminer le type de changement
const compareSchemas = (oldSchema: JsonSchemaOutput, newSchema: JsonSchemaOutput): 'major' | 'minor' => {
  const oldProps = oldSchema.properties || {};
  const newProps = newSchema.properties || {};
  const oldRequired = oldSchema.required || [];
  const newRequired = newSchema.required || [];

  // CHANGEMENTS MAJEURS (incompatibles) - Version +1.0
  
  // 1. Type racine différent
  if (oldSchema.type !== newSchema.type) {
    return 'major';
  }

  // 2. Propriétés supprimées
  const oldPropNames = Object.keys(oldProps);
  const newPropNames = Object.keys(newProps);
  const removedProps = oldPropNames.filter(prop => !newPropNames.includes(prop));
  if (removedProps.length > 0) {
    return 'major';
  }

  // 3. Propriétés requises supprimées
  const removedRequired = oldRequired.filter(prop => !newRequired.includes(prop));
  if (removedRequired.length > 0) {
    return 'major';
  }

  // 4. Changements de type incompatibles
  for (const propName of oldPropNames) {
    if (newProps[propName] && oldProps[propName].type !== newProps[propName].type) {
      if (!isTypeChangeCompatible(oldProps[propName].type, newProps[propName].type)) {
        return 'major';
      }
    }
  }

  // 5. Contraintes plus strictes sur propriétés existantes
  for (const propName of oldPropNames) {
    if (newProps[propName]) {
      const oldProp = oldProps[propName];
      const newProp = newProps[propName];
      
      // Contraintes string plus strictes
      if (oldProp.type === 'string' && newProp.type === 'string') {
        if ((newProp.minLength && (!oldProp.minLength || newProp.minLength > oldProp.minLength)) ||
            (newProp.maxLength && oldProp.maxLength && newProp.maxLength < oldProp.maxLength)) {
          return 'major';
        }
      }
      
      // Contraintes number plus strictes
      if (['number', 'integer'].includes(oldProp.type) && ['number', 'integer'].includes(newProp.type)) {
        if ((newProp.minimum && (!oldProp.minimum || newProp.minimum > oldProp.minimum)) ||
            (newProp.maximum && oldProp.maximum && newProp.maximum < oldProp.maximum)) {
          return 'major';
        }
      }
      
      // Enum plus restrictif
      if (oldProp.enum && newProp.enum && newProp.enum.length < oldProp.enum.length) {
        return 'major';
      }
    }
  }

  // CHANGEMENTS MINEURS (compatibles) - Version +0.1
  // Tout le reste est considéré comme compatible
  return 'minor';
};

// Fonction pour incrémenter une version (format 2 chiffres: MAJOR.MINOR)
const incrementVersion = (currentVersion: string, changeType: 'major' | 'minor'): string => {
  // Parser la version actuelle
  const parts = currentVersion.split('.');
  let major = parseInt(parts[0], 10) || 1;
  
  // Le minor doit être traité comme un entier, pas un float
  // 1.0 → minor=0, 1.1 → minor=1, 1.9 → minor=9, etc.
  let minor = 0;
  if (parts[1]) {
    if (parts[1].includes('.')) {
      // Si c'est quelque chose comme "1.1" traité comme float
      minor = Math.round(parseFloat(parts[1]) * 10);
    } else {
      // Si c'est un entier simple
      minor = parseInt(parts[1], 10);
    }
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

  // Formatage: x.y où y va de 0 à 9, puis ça passe à x+1.0
  if (minor >= 10) {
    major += 1;
    minor = 0;
  }

  return `${major}.${minor}`;
};

// Fonction pour générer une description de changement
const generateChangeDescription = (
  changeType: 'major' | 'minor',
  oldSchema: JsonSchemaOutput,
  newSchema: JsonSchemaOutput
): string => {
  const oldProps = oldSchema.properties || {};
  const newProps = newSchema.properties || {};
  const oldPropNames = Object.keys(oldProps);
  const newPropNames = Object.keys(newProps);
  const oldRequired = oldSchema.required || [];
  const newRequired = newSchema.required || [];

  const addedProps = newPropNames.filter(prop => !oldPropNames.includes(prop));
  const removedProps = oldPropNames.filter(prop => !newPropNames.includes(prop));
  const addedRequired = newRequired.filter(prop => !oldRequired.includes(prop));
  const removedRequired = oldRequired.filter(prop => !newRequired.includes(prop));

  const changes: string[] = [];

  if (oldSchema.type !== newSchema.type) {
    changes.push(`Type racine: ${oldSchema.type} → ${newSchema.type}`);
  }

  if (removedProps.length > 0) {
    changes.push(`Propriétés supprimées: ${removedProps.join(', ')}`);
  }

  if (addedProps.length > 0) {
    changes.push(`Nouvelles propriétés: ${addedProps.join(', ')}`);
  }

  if (removedRequired.length > 0) {
    changes.push(`Champs requis supprimés: ${removedRequired.join(', ')}`);
  }

  if (addedRequired.length > 0) {
    changes.push(`Nouveaux champs requis: ${addedRequired.join(', ')}`);
  }

  // Changements de types avec indication de compatibilité
  const typeChanges: string[] = [];
  const compatibleTypeChanges: string[] = [];
  
  for (const propName of oldPropNames) {
    if (newProps[propName] && oldProps[propName].type !== newProps[propName].type) {
      const oldType = oldProps[propName].type;
      const newType = newProps[propName].type;
      
      if (isTypeChangeCompatible(oldType, newType)) {
        compatibleTypeChanges.push(`${propName}: ${oldType} → ${newType}`);
      } else {
        typeChanges.push(`${propName}: ${oldType} → ${newType}`);
      }
    }
  }

  if (typeChanges.length > 0) {
    changes.push(`Types incompatibles: ${typeChanges.join(', ')}`);
  }

  if (compatibleTypeChanges.length > 0) {
    changes.push(`Types compatibles: ${compatibleTypeChanges.join(', ')}`);
  }

  // Changements de contraintes
  const constraintChanges: string[] = [];
  for (const propName of oldPropNames) {
    if (newProps[propName]) {
      const oldProp = oldProps[propName];
      const newProp = newProps[propName];
      
      if (oldProp.description !== newProp.description) {
        constraintChanges.push(`Description ${propName}`);
      }
      if (oldProp.minLength !== newProp.minLength || oldProp.maxLength !== newProp.maxLength) {
        constraintChanges.push(`Contraintes ${propName}`);
      }
    }
  }

  if (constraintChanges.length > 0) {
    changes.push(`Contraintes modifiées: ${constraintChanges.join(', ')}`);
  }

  if (changes.length === 0) {
    return changeType === 'major' ? 
      'Changements incompatibles avec BDD' : 
      'Améliorations compatibles avec BDD';
  }

  return changes.join('; ');
};

// Server function pour sauvegarder une version dans le dossier versions
export const backupVersion = server$(async function(
  schemaName: string,
  versionedSchema: VersionedSchema
): Promise<{ success: boolean; message: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
    const versionsDir = path.join(schemasDir, 'versions', schemaName);
    
    // Créer les dossiers si nécessaire
    await fs.mkdir(versionsDir, { recursive: true });
    
    // Sauvegarder la version
    const versionFilePath = path.join(versionsDir, `v${versionedSchema.version}.json`);
    await fs.writeFile(versionFilePath, JSON.stringify(versionedSchema, null, 2), 'utf8');
    
    return {
      success: true,
      message: `Version ${versionedSchema.version} sauvegardée`
    };
  } catch (error) {
    console.error('Erreur backup version:', error);
    return {
      success: false,
      message: `Erreur lors du backup: ${error}`
    };
  }
});

// Server function pour lire la version actuelle d'un schéma
export const getCurrentSchemaVersion = server$(async function(
  schemaName: string
): Promise<VersionedSchema | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
    const filePath = path.join(schemasDir, `${schemaName}.json`);
    
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const schemaData = JSON.parse(content);
    
    // Si c'est un ancien schéma sans version, l'initialiser
    if (!schemaData.version) {
      return {
        id: schemaData.id || `${schemaName}-${Date.now()}`,
        name: schemaData.name || schemaName,
        version: '1.0',
        schema: {
          type: schemaData.type,
          title: schemaData.title,
          description: schemaData.description,
          properties: schemaData.properties,
          required: schemaData.required,
          items: schemaData.items
        },
        versionInfo: {
          version: '1.0',
          createdAt: schemaData.createdAt || new Date().toISOString(),
          changeType: 'major',
          changeDescription: 'Version initiale',
          previousVersion: undefined
        },
        createdAt: schemaData.createdAt || new Date().toISOString(),
        updatedAt: schemaData.updatedAt || new Date().toISOString()
      };
    }
    
    return schemaData;
  } catch (error) {
    return null;
  }
});

// Server function pour créer une nouvelle version d'un schéma
export const createNewVersion = server$(async function(
  schemaName: string,
  newSchema: JsonSchemaOutput
): Promise<{ success: boolean; versionedSchema?: VersionedSchema; message: string }> {
  try {
    // Récupérer la version actuelle
    const currentVersionedSchema = await getCurrentSchemaVersion.call(this, schemaName);
    
    let newVersion: string;
    let changeType: 'major' | 'minor' | 'patch';
    let changeDescription: string;
    
    if (currentVersionedSchema) {
      // Comparer avec la version existante
      changeType = compareSchemas(currentVersionedSchema.schema, newSchema);
      newVersion = incrementVersion(currentVersionedSchema.version, changeType);
      changeDescription = generateChangeDescription(changeType, currentVersionedSchema.schema, newSchema);
      
      // Sauvegarder la version actuelle comme backup
      await backupVersion.call(this, schemaName, currentVersionedSchema);
    } else {
      // Premier schéma
      newVersion = '1.0';
      changeType = 'major';
      changeDescription = 'Version initiale';
    }
    
    // Créer le nouveau schéma versionné
    const newVersionedSchema: VersionedSchema = {
      id: currentVersionedSchema?.id || `${schemaName}-${Date.now()}`,
      name: schemaName,
      version: newVersion,
      schema: {
        ...newSchema,
        version: newVersion
      },
      versionInfo: {
        version: newVersion,
        createdAt: new Date().toISOString(),
        changeType,
        changeDescription,
        previousVersion: currentVersionedSchema?.version
      },
      createdAt: currentVersionedSchema?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      versionedSchema: newVersionedSchema,
      message: `Nouvelle version ${newVersion} (${changeType}) créée: ${changeDescription}`
    };
  } catch (error) {
    console.error('Erreur création version:', error);
    return {
      success: false,
      message: `Erreur lors de la création de version: ${error}`
    };
  }
});

// Server function pour lister toutes les versions d'un schéma
export const getSchemaVersionHistory = server$(async function(
  schemaName: string
): Promise<VersionInfo[]> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
    const versionsDir = path.join(schemasDir, 'versions', schemaName);
    
    try {
      const files = await fs.readdir(versionsDir);
      const versions: VersionInfo[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('v')) {
          const filePath = path.join(versionsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const versionData: VersionedSchema = JSON.parse(content);
          versions.push(versionData.versionInfo);
        }
      }
      
      // Trier par version décroissante
      return versions.sort((a, b) => {
        const aVersion = a.version.split('.').map(n => parseInt(n, 10));
        const bVersion = b.version.split('.').map(n => parseInt(n, 10));
        
        for (let i = 0; i < 3; i++) {
          if (bVersion[i] !== aVersion[i]) {
            return bVersion[i] - aVersion[i];
          }
        }
        return 0;
      });
    } catch (error) {
      return [];
    }
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    return [];
  }
});

// Server function pour restaurer une version spécifique
export const restoreVersion = server$(async function(
  schemaName: string,
  version: string
): Promise<{ success: boolean; message: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
    const versionFilePath = path.join(schemasDir, 'versions', schemaName, `v${version}.json`);
    const currentFilePath = path.join(schemasDir, `${schemaName}.json`);
    
    // Lire la version à restaurer
    await fs.access(versionFilePath);
    const versionContent = await fs.readFile(versionFilePath, 'utf8');
    const versionData: VersionedSchema = JSON.parse(versionContent);
    
    // Sauvegarder la version actuelle avant restauration
    const currentSchema = await getCurrentSchemaVersion.call(this, schemaName);
    if (currentSchema) {
      await backupVersion.call(this, schemaName, currentSchema);
    }
    
    // Créer une nouvelle version avec un numéro incrémenté
    const newVersion = currentSchema ? 
      incrementVersion(currentSchema.version, 'major') : 
      incrementVersion(version, 'major');
    
    const restoredSchema: VersionedSchema = {
      ...versionData,
      version: newVersion,
      versionInfo: {
        version: newVersion,
        createdAt: new Date().toISOString(),
        changeType: 'major',
        changeDescription: `Restauration de la version ${version}`,
        previousVersion: currentSchema?.version
      },
      updatedAt: new Date().toISOString()
    };
    
    restoredSchema.schema.version = newVersion;
    
    // Écraser le fichier actuel
    await fs.writeFile(currentFilePath, JSON.stringify(restoredSchema, null, 2), 'utf8');
    
    return {
      success: true,
      message: `Version ${version} restaurée avec le numéro ${newVersion}`
    };
  } catch (error) {
    console.error('Erreur restauration version:', error);
    return {
      success: false,
      message: `Erreur lors de la restauration: ${error}`
    };
  }
});