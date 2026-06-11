#!/bin/bash
# Rollback script for Ozion Chat AI
set -e

TARGET_VERSION=${1:-""}

echo "⏪ Ozion Chat AI Rollback"
echo "=========================="

if [ -z "$TARGET_VERSION" ]; then
  echo "📋 Últimas versões disponíveis:"
  git tag --sort=-version:refname | head -5
  echo ""
  echo "Uso: ./scripts/rollback.sh v1.0.0"
  exit 1
fi

echo "🎯 Versão alvo: $TARGET_VERSION"
echo ""

# Verify tag exists
if ! git rev-parse "$TARGET_VERSION" >/dev/null 2>&1; then
  echo "❌ Tag não encontrada: $TARGET_VERSION"
  exit 1
fi

echo "📦 Restaurando versão..."
git checkout "$TARGET_VERSION"

echo "📦 Instalando dependências..."
npm ci

echo "📦 Buildando..."
npm run build

echo "🔄 Restaurando banco de dados..."
LATEST_BACKUP=$(ls -t backups/*.db 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  cp "$LATEST_BACKUP" data/ozion.db
  echo "  ✅ Banco restaurado"
else
  echo "  ⚠️ Nenhum backup encontrado"
fi

echo ""
echo "📊 Rollback concluído:"
echo "  Versão: $TARGET_VERSION"
echo ""
echo "⚠️ Execute git checkout main para voltar ao desenvolvimento"
echo ""
echo "✅ Rollback concluído!"
