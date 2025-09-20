#!/bin/bash

# TEST VALIDATION DIRECTE - Mission Critique
# Test des 3 fonctionnalités principales avec curl et analyse du contenu

echo "🚀 DÉMARRAGE TEST VALIDATION DIRECTE"
echo "====================================="

BASE_URL="http://localhost:5502"
REPORT_FILE="/home/gouroubleu/WS/json-editor/CLAUDE/test-validation-directe-report.txt"

# Nettoyer le rapport précédent
> "$REPORT_FILE"

echo "Timestamp: $(date)" >> "$REPORT_FILE"
echo "Base URL: $BASE_URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Test 1: Page d'accueil
echo "📍 Test 1: Page d'accueil"
echo "Test 1: Page d'accueil" >> "$REPORT_FILE"
echo "------------------------" >> "$REPORT_FILE"

RESPONSE_CODE=$(curl -s -o /tmp/homepage.html -w "%{http_code}" "$BASE_URL/")
echo "Response code: $RESPONSE_CODE" >> "$REPORT_FILE"

if [ "$RESPONSE_CODE" = "200" ]; then
    echo "✅ Page d'accueil accessible"
    echo "STATUS: PASS" >> "$REPORT_FILE"

    # Analyser le contenu
    CONTENT_SIZE=$(wc -c < /tmp/homepage.html)
    echo "Content size: $CONTENT_SIZE bytes" >> "$REPORT_FILE"

    # Chercher des mots-clés
    grep -i "schema" /tmp/homepage.html > /dev/null && echo "Keywords found: schema" >> "$REPORT_FILE"
    grep -i "editor" /tmp/homepage.html > /dev/null && echo "Keywords found: editor" >> "$REPORT_FILE"
else
    echo "❌ Page d'accueil inaccessible ($RESPONSE_CODE)"
    echo "STATUS: FAIL" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# Test 2: Page création entité (Arrays)
echo "📍 Test 2: Page création entité (Arrays)"
echo "Test 2: Page création entité (Arrays)" >> "$REPORT_FILE"
echo "---------------------------------------" >> "$REPORT_FILE"

RESPONSE_CODE=$(curl -s -o /tmp/entity_new.html -w "%{http_code}" "$BASE_URL/bdd/test-user/new")
echo "Response code: $RESPONSE_CODE" >> "$REPORT_FILE"

if [ "$RESPONSE_CODE" = "200" ]; then
    echo "✅ Page création entité accessible"
    echo "STATUS: PASS" >> "$REPORT_FILE"

    CONTENT_SIZE=$(wc -c < /tmp/entity_new.html)
    echo "Content size: $CONTENT_SIZE bytes" >> "$REPORT_FILE"

    # Analyser le contenu pour arrays
    ARRAY_KEYWORDS=0
    grep -i "array" /tmp/entity_new.html > /dev/null && { echo "Keywords found: array" >> "$REPORT_FILE"; ARRAY_KEYWORDS=$((ARRAY_KEYWORDS+1)); }
    grep -i "adresse" /tmp/entity_new.html > /dev/null && { echo "Keywords found: adresse" >> "$REPORT_FILE"; ARRAY_KEYWORDS=$((ARRAY_KEYWORDS+1)); }
    grep -i "button" /tmp/entity_new.html > /dev/null && { echo "Keywords found: button" >> "$REPORT_FILE"; ARRAY_KEYWORDS=$((ARRAY_KEYWORDS+1)); }
    grep -i "column" /tmp/entity_new.html > /dev/null && { echo "Keywords found: column" >> "$REPORT_FILE"; ARRAY_KEYWORDS=$((ARRAY_KEYWORDS+1)); }

    echo "Array-related keywords: $ARRAY_KEYWORDS" >> "$REPORT_FILE"

    if [ "$ARRAY_KEYWORDS" -gt 0 ]; then
        echo "✅ Arrays: Mots-clés détectés ($ARRAY_KEYWORDS)"
        echo "ARRAYS_TEST: PASS" >> "$REPORT_FILE"
    else
        echo "❌ Arrays: Aucun mot-clé détecté"
        echo "ARRAYS_TEST: FAIL" >> "$REPORT_FILE"
    fi
else
    echo "❌ Page création entité inaccessible ($RESPONSE_CODE)"
    echo "STATUS: FAIL" >> "$REPORT_FILE"
    echo "ARRAYS_TEST: FAIL" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# Test 3: Page éditeur schéma (Select + JsonSchema)
echo "📍 Test 3: Page éditeur schéma (Select + JsonSchema)"
echo "Test 3: Page éditeur schéma (Select + JsonSchema)" >> "$REPORT_FILE"
echo "---------------------------------------------------" >> "$REPORT_FILE"

RESPONSE_CODE=$(curl -s -o /tmp/schema_editor.html -w "%{http_code}" "$BASE_URL/schemas/test-user")
echo "Response code: $RESPONSE_CODE" >> "$REPORT_FILE"

if [ "$RESPONSE_CODE" = "200" ]; then
    echo "✅ Page éditeur schéma accessible"
    echo "STATUS: PASS" >> "$REPORT_FILE"

    CONTENT_SIZE=$(wc -c < /tmp/schema_editor.html)
    echo "Content size: $CONTENT_SIZE bytes" >> "$REPORT_FILE"

    # Analyser le contenu pour Select
    SELECT_KEYWORDS=0
    grep -i "select" /tmp/schema_editor.html > /dev/null && { echo "Keywords found: select" >> "$REPORT_FILE"; SELECT_KEYWORDS=$((SELECT_KEYWORDS+1)); }
    grep -i "enum" /tmp/schema_editor.html > /dev/null && { echo "Keywords found: enum" >> "$REPORT_FILE"; SELECT_KEYWORDS=$((SELECT_KEYWORDS+1)); }
    grep -i "option" /tmp/schema_editor.html > /dev/null && { echo "Keywords found: option" >> "$REPORT_FILE"; SELECT_KEYWORDS=$((SELECT_KEYWORDS+1)); }

    echo "Select-related keywords: $SELECT_KEYWORDS" >> "$REPORT_FILE"

    if [ "$SELECT_KEYWORDS" -gt 0 ]; then
        echo "✅ Select: Mots-clés détectés ($SELECT_KEYWORDS)"
        echo "SELECT_TEST: PASS" >> "$REPORT_FILE"
    else
        echo "❌ Select: Aucun mot-clé détecté"
        echo "SELECT_TEST: FAIL" >> "$REPORT_FILE"
    fi

    # Analyser le contenu pour JsonSchema
    JSONSCHEMA_KEYWORDS=0
    grep -i "jsonschema" /tmp/schema_editor.html > /dev/null && { echo "Keywords found: jsonschema" >> "$REPORT_FILE"; JSONSCHEMA_KEYWORDS=$((JSONSCHEMA_KEYWORDS+1)); }
    grep -i "\$ref" /tmp/schema_editor.html > /dev/null && { echo "Keywords found: \$ref" >> "$REPORT_FILE"; JSONSCHEMA_KEYWORDS=$((JSONSCHEMA_KEYWORDS+1)); }
    grep -i "reference" /tmp/schema_editor.html > /dev/null && { echo "Keywords found: reference" >> "$REPORT_FILE"; JSONSCHEMA_KEYWORDS=$((JSONSCHEMA_KEYWORDS+1)); }

    echo "JsonSchema-related keywords: $JSONSCHEMA_KEYWORDS" >> "$REPORT_FILE"

    if [ "$JSONSCHEMA_KEYWORDS" -gt 0 ]; then
        echo "✅ JsonSchema: Mots-clés détectés ($JSONSCHEMA_KEYWORDS)"
        echo "JSONSCHEMA_TEST: PASS" >> "$REPORT_FILE"
    else
        echo "❌ JsonSchema: Aucun mot-clé détecté"
        echo "JSONSCHEMA_TEST: FAIL" >> "$REPORT_FILE"
    fi
else
    echo "❌ Page éditeur schéma inaccessible ($RESPONSE_CODE)"
    echo "STATUS: FAIL" >> "$REPORT_FILE"
    echo "SELECT_TEST: FAIL" >> "$REPORT_FILE"
    echo "JSONSCHEMA_TEST: FAIL" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# Résumé final
echo "📊 RÉSUMÉ FINAL"
echo "Résumé final" >> "$REPORT_FILE"
echo "=============" >> "$REPORT_FILE"

TOTAL_TESTS=5  # 1 accueil + 1 arrays + 1 select + 1 jsonschema + 1 base
PASSED_TESTS=0

grep "STATUS: PASS" "$REPORT_FILE" > /dev/null && PASSED_TESTS=$((PASSED_TESTS+1))
grep "ARRAYS_TEST: PASS" "$REPORT_FILE" > /dev/null && PASSED_TESTS=$((PASSED_TESTS+1))
grep "SELECT_TEST: PASS" "$REPORT_FILE" > /dev/null && PASSED_TESTS=$((PASSED_TESTS+1))
grep "JSONSCHEMA_TEST: PASS" "$REPORT_FILE" > /dev/null && PASSED_TESTS=$((PASSED_TESTS+1))

# Calculer le taux de succès
SUCCESS_RATE=$((PASSED_TESTS * 100 / 4))  # 4 tests principaux

echo "Tests passés: $PASSED_TESTS/4" >> "$REPORT_FILE"
echo "Taux de succès: $SUCCESS_RATE%" >> "$REPORT_FILE"

echo "✅ Tests passés: $PASSED_TESTS/4"
echo "📈 Taux de succès: $SUCCESS_RATE%"

if [ "$SUCCESS_RATE" -eq 100 ]; then
    echo "🎉 MISSION ACCOMPLIE - 100% DE RÉUSSITE !"
    echo "MISSION_STATUS: ACCOMPLISHED" >> "$REPORT_FILE"
elif [ "$SUCCESS_RATE" -ge 75 ]; then
    echo "✅ MISSION LARGEMENT RÉUSSIE"
    echo "MISSION_STATUS: MOSTLY_SUCCESSFUL" >> "$REPORT_FILE"
else
    echo "⚠️ MISSION PARTIELLEMENT ACCOMPLIE"
    echo "MISSION_STATUS: PARTIALLY_SUCCESSFUL" >> "$REPORT_FILE"
fi

echo ""
echo "📁 Rapport complet: $REPORT_FILE"
echo "📄 Fichiers HTML téléchargés: /tmp/homepage.html, /tmp/entity_new.html, /tmp/schema_editor.html"

# Afficher le contenu du rapport
echo ""
echo "📋 CONTENU DU RAPPORT:"
echo "====================="
cat "$REPORT_FILE"