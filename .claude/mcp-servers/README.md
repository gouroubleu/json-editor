# MCP Servers - Rhinov Auto-Site

Ce dossier contient les serveurs MCP (Model Context Protocol) personnalisés pour le projet Rhinov Auto-Site.

## 🎯 MCP Disponibles

### 1. **CSS Validator** (`css-validator.js`)
- **Description** : Validation automatique du CSS avec W3C CSS Validator et linting Stylelint
- **Outils** :
  - `validate_css` : Validation CSS avec l'API W3C
  - `lint_css` : Linting CSS avec Stylelint
- **Usage** : Vérification de la qualité du CSS généré

### 2. **SCSS Compiler** (`scss-compiler.js`)  
- **Description** : Compilation et analyse de code SCSS/Sass
- **Outils** :
  - `compile_scss` : Compilation SCSS vers CSS
  - `watch_scss` : Surveillance et compilation automatique
  - `analyze_scss` : Analyse de code SCSS et suggestions
- **Usage** : Automatisation des workflows SCSS

### 3. **Lighthouse Performance** (`lighthouse.js`)
- **Description** : Tests de performance web avec Lighthouse et PageSpeed Insights
- **Outils** :
  - `lighthouse_audit` : Audit complet Lighthouse
  - `pagespeed_insights` : Analyse Google PageSpeed
  - `performance_budget` : Vérification des budgets de performance
- **Usage** : Mesure et optimisation des performances

### 4. **Figma Design** (`figma-design.js`)
- **Description** : Intégration avec Figma pour extraction de design tokens
- **Outils** :
  - `figma_get_file` : Récupération d'informations Figma
  - `figma_extract_colors` : Extraction de palette de couleurs  
  - `figma_generate_css` : Génération de CSS depuis Figma
  - `figma_export_assets` : Export d'assets Figma
  - `design_system_tokens` : Extraction de tokens de design system
- **Usage** : Automatisation design-to-code

## 🚀 Installation

Les dépendances sont automatiquement installées :

```bash
npm install @modelcontextprotocol/sdk form-data node-fetch
```

## 📁 Structure

```
.claude/mcp-servers/
├── css-validator.js      # Validation CSS
├── scss-compiler.js      # Compilation SCSS  
├── lighthouse.js         # Performance web
├── figma-design.js       # Intégration Figma
├── package.json          # Dépendances
├── package-lock.json     # Lock file
└── README.md            # Cette documentation
```

## ⚙️ Configuration

Les MCP sont configurés dans `.mcp.json` et `~/.claude.json` :

```json
{
  "mcpServers": {
    "css-validator": {
      "type": "stdio",
      "command": "node",
      "args": [".claude/mcp-servers/css-validator.js"]
    }
  }
}
```

## 🔧 Utilisation dans les Agents

Ces MCP permettent aux agents de :

- ✅ **Valider automatiquement** le CSS généré
- ✅ **Compiler et optimiser** le SCSS  
- ✅ **Tester les performances** des modules créés
- ✅ **Extraire les couleurs et tokens** depuis Figma
- ✅ **Générer du CSS cohérent** avec les maquettes

## 🤝 Partage d'Équipe

Ces MCP sont versionnés avec le projet et partagés automatiquement avec toute l'équipe.

Chaque développeur peut utiliser :
```bash
claude mcp list  # Voir les MCP disponibles
```

## 🐛 Debug

Pour tester un MCP individuellement :
```bash
node .claude/mcp-servers/css-validator.js --test
```

## 📝 Développement

Pour ajouter un nouveau MCP :

1. Créer le fichier `.js` dans ce dossier
2. Ajouter la configuration dans `.mcp.json`
3. Tester avec `claude mcp list`
4. Documenter dans ce README