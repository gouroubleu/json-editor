#!/bin/bash

# Script d'installation des MCP pour le projet Rhinov Auto-Site
# Usage: ./setup-mcp.sh

echo "🚀 Installation des MCP Servers - Rhinov Auto-Site"
echo "=================================================="

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f ".claude/mcp-servers/package.json" ]; then
    echo "❌ Erreur: Exécutez ce script depuis la racine du projet"
    exit 1
fi

# Installer les dépendances MCP
echo "📦 Installation des dépendances MCP..."
cd .claude/mcp-servers
npm install

# Rendre les scripts exécutables
echo "🔧 Configuration des permissions..."
chmod +x *.js

# Retourner à la racine
cd ../..

# Vérifier la configuration
echo "🔍 Vérification de la configuration MCP..."
if claude mcp list >/dev/null 2>&1; then
    echo "✅ Configuration MCP réussie !"
    echo ""
    echo "📋 MCP disponibles :"
    echo "  - css-validator      : Validation CSS automatique"
    echo "  - scss-compiler      : Compilation SCSS" 
    echo "  - lighthouse-performance : Tests de performance"
    echo "  - figma-design       : Intégration Figma"
    echo ""
    echo "🎯 Utilisez 'claude mcp list' pour voir l'état de connexion"
else
    echo "⚠️ Erreur lors de la vérification. Vérifiez votre configuration Claude."
fi

echo ""
echo "📖 Documentation complète : .claude/mcp-servers/README.md"
echo "✨ Les MCP sont maintenant prêts à être utilisés par vos agents !"