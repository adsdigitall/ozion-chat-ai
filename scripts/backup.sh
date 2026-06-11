#!/bin/bash
# Backup script for Ozion Chat AI
set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TYPE=${1:-full}

echo "💾 Ozion Chat AI Backup"
echo "========================"
echo "Tipo: $TYPE"
echo "Timestamp: $TIMESTAMP"
echo ""

mkdir -p "$BACKUP_DIR"

backup_database() {
  echo "📦 Backup do banco de dados..."
  if [ -f "data/ozion.db" ]; then
    cp "data/ozion.db" "$BACKUP_DIR/database_$TIMESTAMP.db"
    echo "  ✅ Banco copiado"
  else
    echo "  ⚠️ Banco não encontrado"
  fi
}

backup_flows() {
  echo "📦 Backup dos fluxos..."
  if [ -f "data/ozion.db" ]; then
    sqlite3 data/ozion.db ".dump flows" > "$BACKUP_DIR/flows_$TIMESTAMP.sql" 2>/dev/null || true
    echo "  ✅ Fluxos exportados"
  fi
}

backup_agents() {
  echo "📦 Backup dos agentes..."
  if [ -f "data/ozion.db" ]; then
    sqlite3 data/ozion.db ".dump agents" > "$BACKUP_DIR/agents_$TIMESTAMP.sql" 2>/dev/null || true
    echo "  ✅ Agentes exportados"
  fi
}

backup_config() {
  echo "📦 Backup das configurações..."
  mkdir -p "$BACKUP_DIR/config_$TIMESTAMP"
  cp -r public/ "$BACKUP_DIR/config_$TIMESTAMP/" 2>/dev/null || true
  cp package.json "$BACKUP_DIR/config_$TIMESTAMP/" 2>/dev/null || true
  cp tsconfig.json "$BACKUP_DIR/config_$TIMESTAMP/" 2>/dev/null || true
  echo "  ✅ Config exportada"
}

backup_integrations() {
  echo "📦 Backup das integrações..."
  if [ -f "data/ozion.db" ]; then
    sqlite3 data/ozion.db ".dump integrations" > "$BACKUP_DIR/integrations_$TIMESTAMP.sql" 2>/dev/null || true
    sqlite3 data/ozion.db ".dump whatsapp_credentials" > "$BACKUP_DIR/whatsapp_$TIMESTAMP.sql" 2>/dev/null || true
    echo "  ✅ Integrações exportadas"
  fi
}

case $TYPE in
  full)
    backup_database
    backup_flows
    backup_agents
    backup_config
    backup_integrations
    ;;
  database) backup_database ;;
  flows) backup_flows ;;
  agents) backup_agents ;;
  config) backup_config ;;
  integrations) backup_integrations ;;
  *)
    echo "❌ Tipo inválido: $TYPE"
    exit 1
    ;;
esac

# Compress
echo ""
echo "📦 Comprimindo backup..."
tar -czf "$BACKUP_DIR/ozion_backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" . 2>/dev/null || true
echo "  ✅ Backup comprimido"

echo ""
echo "📊 Resumo do Backup:"
echo "  Tipo: $TYPE"
echo "  Timestamp: $TIMESTAMP"
echo "  Tamanho: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "✅ Backup concluído com sucesso!"
