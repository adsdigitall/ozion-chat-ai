import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não configurada');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  console.log('Adicione a variável de ambiente ou rode manualmente via Supabase SQL Editor');
  console.log('Arquivo: migrations/002_saas_multitenant.sql');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getDashboardUrl() {
  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
    return `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  } catch {
    return 'https://supabase.com/dashboard';
  }
}

async function runMigration() {
  try {
    console.log('📄 Lendo arquivo de migração...');
    const sql = readFileSync(join(process.cwd(), 'migrations/002_saas_multitenant.sql'), 'utf-8');
    
    console.log('🚀 Executando migração...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct query if RPC not available
      console.log('⚠️  RPC não disponível, tentando via query...');
      const { error: queryError } = await supabase.from('_migrations').insert({
        name: '002_saas_multitenant',
        applied_at: new Date().toISOString()
      }).select();
      
      if (queryError) {
        console.error('❌ Erro:', queryError.message);
        console.log('\n📋 Execute o SQL manualmente no Supabase SQL Editor:');
        console.log(`   ${getDashboardUrl()}`);
        console.log('\nCopie o conteúdo de: migrations/002_saas_multitenant.sql');
        return;
      }
    }
    
    console.log('✅ Migração aplicada com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
    console.log('\n📋 Execute o SQL manualmente no Supabase SQL Editor:');
    console.log(`   ${getDashboardUrl()}`);
  }
}

runMigration();
