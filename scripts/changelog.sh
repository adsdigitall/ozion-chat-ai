#!/bin/bash
# Changelog generator script
set -e

VERSION=${1:-"1.0.0"}

echo "📝 Ozion Chat AI Changelog Generator"
echo "====================================="
echo "Versão: $VERSION"
echo ""

# Get commits since last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$LAST_TAG" ]; then
  echo "📋 Mudanças desde $LAST_TAG:"
  echo ""
  git log "$LAST_TAG"..HEAD --oneline --no-merges | while read -r line; do
    HASH=$(echo "$line" | cut -d' ' -f1)
    MSG=$(echo "$line" | cut -d' ' -f2-)
    
    # Categorize commit
    case "$MSG" in
      feat*|add*) echo "  ✨ $MSG" ;;
      fix*|bug*) echo "  🐛 $MSG" ;;
      refactor*|improve*) echo "  ⚡ $MSG" ;;
      breaking*) echo "  💥 $MSG" ;;
      security*|sec*) echo "  🔒 $MSG" ;;
      *) echo "  📝 $MSG" ;;
    esac
  done
else
  echo "📋 Todos os commits:"
  git log --oneline --no-merges | head -20
fi

echo ""
echo "📊 Resumo:"
echo "  Commits: $(git log --oneline --no-merges | wc -l | tr -d ' ')"
echo "  Arquivos modificados: $(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ' || echo 'N/A')"
echo ""
echo "✅ Changelog gerado!"
