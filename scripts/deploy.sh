#!/bin/bash
# Deploy script for Ozion Chat AI
set -e

ENVIRONMENT=${1:-staging}
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Ozion Chat AI Deploy"
echo "========================"
echo "Versão: $VERSION"
echo "Ambiente: $ENVIRONMENT"
echo "Timestamp: $TIMESTAMP"
echo ""

# Build
echo "📦 Buildando projeto..."
npm run build

# Deploy based on environment
case $ENVIRONMENT in
  production)
    echo "🔴 Deploy para PRODUÇÃO..."
    git tag "v$VERSION"
    git push origin "v$VERSION"
    git push origin main
    echo "✅ Deploy production concluído"
    ;;
  staging)
    echo "🟡 Deploy para STAGING..."
    git push origin staging
    echo "✅ Deploy staging concluído"
    ;;
  development)
    echo "🟢 Deploy para DEVELOPMENT..."
    git push origin development
    echo "✅ Deploy development concluído"
    ;;
  *)
    echo "❌ Ambiente inválido: $ENVIRONMENT"
    exit 1
    ;;
esac

echo ""
echo "📊 Resumo do Deploy:"
echo "  Versão: $VERSION"
echo "  Ambiente: $ENVIRONMENT"
echo "  Timestamp: $TIMESTAMP"
echo ""
echo "✅ Deploy concluído com sucesso!"
