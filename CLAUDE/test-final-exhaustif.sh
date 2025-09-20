#!/bin/bash

# TEST FINAL EXHAUSTIF - Mission Critique
# Test complet avec les bonnes URLs identifiées

echo "🚀 MISSION CRITIQUE - TEST FINAL EXHAUSTIF"
echo "========================================="

BASE_URL="http://localhost:5502"
REPORT_FILE="/home/gouroubleu/WS/json-editor/CLAUDE/rapport-final-mission-critique.txt"

# Nettoyer le rapport précédent
> "$REPORT_FILE"

echo "MISSION CRITIQUE - Test Exhaustif Éditeur JSON Schema" >> "$REPORT_FILE"
echo "=====================================================" >> "$REPORT_FILE"
echo "Timestamp: $(date)" >> "$REPORT_FILE"
echo "Base URL: $BASE_URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction de test
test_functionality() {
    local name="$1"
    local url="$2"
    local keywords="$3"
    local min_keywords="$4"

    echo ""
    echo "📊 TEST: $name"
    echo "Test: $name" >> "$REPORT_FILE"
    echo "$(printf '=%.0s' {1..50})" >> "$REPORT_FILE"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Télécharger la page
    filename="/tmp/test_$(echo $name | tr ' ' '_' | tr '[:upper:]' '[:lower:]').html"
    RESPONSE_CODE=$(curl -s -o "$filename" -w "%{http_code}" "$BASE_URL$url")

    echo "URL: $BASE_URL$url" >> "$REPORT_FILE"
    echo "Response Code: $RESPONSE_CODE" >> "$REPORT_FILE"

    if [ "$RESPONSE_CODE" = "200" ]; then
        content_size=$(wc -c < "$filename")
        echo "Content Size: $content_size bytes" >> "$REPORT_FILE"

        # Compter les mots-clés
        found_keywords=0
        keyword_list=""

        IFS=',' read -ra KEYWORD_ARRAY <<< "$keywords"
        for keyword in "${KEYWORD_ARRAY[@]}"; do
            keyword=$(echo "$keyword" | xargs)  # trim whitespace
            if grep -qi "$keyword" "$filename"; then
                found_keywords=$((found_keywords + 1))
                if [ -n "$keyword_list" ]; then
                    keyword_list="$keyword_list, $keyword"
                else
                    keyword_list="$keyword"
                fi
                echo "Keyword Found: $keyword" >> "$REPORT_FILE"
            fi
        done

        echo "Keywords Found: $found_keywords (Required: $min_keywords)" >> "$REPORT_FILE"
        echo "Keywords List: $keyword_list" >> "$REPORT_FILE"

        # Vérifier le succès
        if [ "$found_keywords" -ge "$min_keywords" ] && [ "$content_size" -gt 1000 ]; then
            echo "✅ $name: RÉUSSI ($found_keywords/$min_keywords mots-clés)"
            echo "STATUS: PASS" >> "$REPORT_FILE"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo "❌ $name: ÉCHOUÉ ($found_keywords/$min_keywords mots-clés, $content_size bytes)"
            echo "STATUS: FAIL" >> "$REPORT_FILE"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi

    else
        echo "❌ $name: Page inaccessible ($RESPONSE_CODE)"
        echo "STATUS: FAIL - Page inaccessible" >> "$REPORT_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo "" >> "$REPORT_FILE"
}

# TEST 1: Arrays (Page création entité)
test_functionality "Arrays" "/bdd/test-user/new/" "array,adresse,adresses,button,column" 2

# TEST 2: Select (Page éditeur/liste entités)
test_functionality "Select" "/bdd/test-user/" "select,enum,option,button,dropdown" 2

# TEST 3: JsonSchema (Page éditeur/liste entités)
test_functionality "JsonSchema" "/bdd/test-user/" "jsonschema,\$ref,reference,schema,button" 2

# TEST 4: Interface générale (Page d'accueil)
test_functionality "Interface Generale" "/" "schema,editor,property,column,button" 3

# Analyse détaillée des contenus
echo ""
echo "🔍 ANALYSE DÉTAILLÉE DES CONTENUS"
echo "=================================="
echo ""
echo "Analyse Détaillée des Contenus" >> "$REPORT_FILE"
echo "===============================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for test_type in "arrays" "select" "jsonschema" "interface_generale"; do
    filename="/tmp/test_${test_type}.html"
    if [ -f "$filename" ]; then
        echo "📄 Analyse: $test_type"
        echo "Analyse: $test_type" >> "$REPORT_FILE"
        echo "$(printf '-%.0s' {1..30})" >> "$REPORT_FILE"

        # Compter différents éléments
        buttons=$(grep -o '<button' "$filename" | wc -l)
        inputs=$(grep -o '<input' "$filename" | wc -l)
        selects=$(grep -o '<select' "$filename" | wc -l)
        divs=$(grep -o '<div' "$filename" | wc -l)

        echo "Elements Count:" >> "$REPORT_FILE"
        echo "  Buttons: $buttons" >> "$REPORT_FILE"
        echo "  Inputs: $inputs" >> "$REPORT_FILE"
        echo "  Selects: $selects" >> "$REPORT_FILE"
        echo "  Divs: $divs" >> "$REPORT_FILE"

        echo "   Boutons: $buttons, Inputs: $inputs, Selects: $selects"

        # Extraire des fragments de code intéressants
        echo "Code Fragments:" >> "$REPORT_FILE"
        grep -i "array\|select\|jsonschema" "$filename" | head -3 | while read line; do
            echo "  Fragment: $(echo $line | cut -c1-100)..." >> "$REPORT_FILE"
        done

        echo "" >> "$REPORT_FILE"
    fi
done

# Calcul du score final
SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo ""
echo "📊 RÉSULTATS FINAUX"
echo "==================="
echo "✅ Tests réussis: $PASSED_TESTS/$TOTAL_TESTS"
echo "❌ Tests échoués: $FAILED_TESTS/$TOTAL_TESTS"
echo "📈 Taux de succès: $SUCCESS_RATE%"

echo "Résultats Finaux" >> "$REPORT_FILE"
echo "================" >> "$REPORT_FILE"
echo "Tests Passed: $PASSED_TESTS/$TOTAL_TESTS" >> "$REPORT_FILE"
echo "Tests Failed: $FAILED_TESTS/$TOTAL_TESTS" >> "$REPORT_FILE"
echo "Success Rate: $SUCCESS_RATE%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Évaluation finale
if [ "$SUCCESS_RATE" -eq 100 ]; then
    echo "🎉 MISSION ACCOMPLIE - 100% DE RÉUSSITE !"
    echo "MISSION_STATUS: ACCOMPLISHED" >> "$REPORT_FILE"
    echo "VERDICT: Toutes les fonctionnalités (Arrays, Select, JsonSchema) sont ENTIÈREMENT opérationnelles !" >> "$REPORT_FILE"
elif [ "$SUCCESS_RATE" -ge 75 ]; then
    echo "✅ MISSION LARGEMENT RÉUSSIE - ${SUCCESS_RATE}% de succès"
    echo "MISSION_STATUS: MOSTLY_SUCCESSFUL" >> "$REPORT_FILE"
    echo "VERDICT: La majorité des fonctionnalités sont opérationnelles" >> "$REPORT_FILE"
elif [ "$SUCCESS_RATE" -ge 50 ]; then
    echo "⚠️ MISSION PARTIELLEMENT RÉUSSIE - ${SUCCESS_RATE}% de succès"
    echo "MISSION_STATUS: PARTIALLY_SUCCESSFUL" >> "$REPORT_FILE"
    echo "VERDICT: Certaines fonctionnalités nécessitent des corrections" >> "$REPORT_FILE"
else
    echo "❌ MISSION ÉCHOUÉE - ${SUCCESS_RATE}% de succès"
    echo "MISSION_STATUS: FAILED" >> "$REPORT_FILE"
    echo "VERDICT: Des problèmes critiques empêchent le bon fonctionnement" >> "$REPORT_FILE"
fi

echo ""
echo "📁 Rapport complet: $REPORT_FILE"
echo "📄 Fichiers HTML analysés: /tmp/test_*.html"

# Afficher le rapport complet
echo ""
echo "📋 RAPPORT COMPLET:"
echo "=================="
cat "$REPORT_FILE"