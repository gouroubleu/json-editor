#!/bin/bash

# TEST URLS CORRECTIVES
# Test de plusieurs variations d'URLs pour trouver les bonnes routes

echo "🚀 TEST URLS CORRECTIVES"
echo "========================="

BASE_URL="http://localhost:5502"

# URLs à tester
urls=(
    "/"
    "/bdd/test-user/new/"
    "/bdd/test-user/new"
    "/bdd/test-user/"
    "/bdd/test-user"
    "/schemas/test-user/"
    "/schemas/test-user"
    "/new/"
    "/new"
)

for url in "${urls[@]}"; do
    echo ""
    echo "📍 Test URL: $BASE_URL$url"

    RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$url")

    if [ "$RESPONSE_CODE" = "200" ]; then
        echo "✅ ACCESSIBLE ($RESPONSE_CODE)"

        # Télécharger le contenu pour analyse
        filename="/tmp/test_$(echo $url | tr '/' '_').html"
        curl -s "$BASE_URL$url" > "$filename"
        content_size=$(wc -c < "$filename")

        echo "   📄 Taille: $content_size bytes"
        echo "   📁 Fichier: $filename"

        # Chercher des mots-clés importants
        keywords=0
        grep -qi "array" "$filename" && { echo "   🔍 Trouvé: array"; keywords=$((keywords+1)); }
        grep -qi "adresse" "$filename" && { echo "   🔍 Trouvé: adresse"; keywords=$((keywords+1)); }
        grep -qi "select" "$filename" && { echo "   🔍 Trouvé: select"; keywords=$((keywords+1)); }
        grep -qi "enum" "$filename" && { echo "   🔍 Trouvé: enum"; keywords=$((keywords+1)); }
        grep -qi "jsonschema" "$filename" && { echo "   🔍 Trouvé: jsonschema"; keywords=$((keywords+1)); }
        grep -qi "button" "$filename" && { echo "   🔍 Trouvé: button"; keywords=$((keywords+1)); }
        grep -qi "column" "$filename" && { echo "   🔍 Trouvé: column"; keywords=$((keywords+1)); }

        echo "   📊 Total mots-clés: $keywords"

    elif [ "$RESPONSE_CODE" = "301" ] || [ "$RESPONSE_CODE" = "302" ]; then
        echo "↪️  REDIRECTION ($RESPONSE_CODE)"

        # Suivre la redirection
        redirect_url=$(curl -s -I "$BASE_URL$url" | grep -i "location:" | cut -d' ' -f2 | tr -d '\r')
        if [ -n "$redirect_url" ]; then
            echo "   ↪️  Vers: $redirect_url"
        fi

    elif [ "$RESPONSE_CODE" = "404" ]; then
        echo "❌ NON TROUVÉE ($RESPONSE_CODE)"
    else
        echo "⚠️  AUTRE ($RESPONSE_CODE)"
    fi
done

echo ""
echo "📋 ANALYSE DES FICHIERS TÉLÉCHARGÉS:"
echo "===================================="

for file in /tmp/test_*.html; do
    if [ -f "$file" ]; then
        size=$(wc -c < "$file")
        if [ "$size" -gt 1000 ]; then
            echo "📄 $file ($size bytes) - CONTENU SIGNIFICATIF"
        else
            echo "📄 $file ($size bytes) - CONTENU MINIMAL"
            echo "   Contenu: $(head -1 $file)"
        fi
    fi
done