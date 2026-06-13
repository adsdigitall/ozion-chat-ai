# CRM de Contatos + Histórico Unificado

## Objetivo
Entregar um CRM operacional completo para o Ozion Chat AI, focado em lista de contatos e timeline unificada com tudo o que acontece no relacionamento com o lead ou cliente.

## Escopo
- Lista de contatos com busca, filtros e ordenação.
- Perfil do contato com dados principais, tags, status, responsável e origem.
- Timeline única com mensagens do WhatsApp, notas internas, tarefas e eventos do sistema.
- Ações rápidas: responder, adicionar nota, criar tarefa, atribuir responsável e alterar status.

## Fora de Escopo
- Pipeline/kanban de oportunidades.
- Automação avançada de campanhas.
- IA de resposta automática dentro deste ciclo.

## Estado Atual do Código
- O backend já usa Express com rotas em `server/routes/*`.
- O frontend principal está em `public/js/ozion.js` e `public/index.html`.
- O sistema já tem Supabase como camada principal de dados.
- Já existem entidades para `contacts`, `conversations`, `messages`, `users`, `tenants` e `tags`.
- O fluxo atual ainda não consolida notas, tarefas e eventos em uma timeline única.

## Design da Solução

### 1. Lista de Contatos
Tela principal do CRM com:
- busca por nome, telefone, email e empresa;
- filtros por tag, status, responsável e origem;
- ordenação por última atividade;
- contadores rápidos por status.

### 2. Perfil do Contato
Painel lateral ou página dedicada com:
- nome, telefone, email, empresa e documento;
- tags;
- status do lead;
- responsável;
- score e origem;
- UTM e IDs de campanha quando existirem.

### 3. Timeline Unificada
A timeline deve misturar os seguintes eventos em ordem cronológica:
- mensagens recebidas e enviadas;
- notas internas;
- tarefas criadas, concluídas ou vencidas;
- eventos de sistema, como atribuição de responsável, mudança de status e tag adicionada/removida.

### 4. Ações de CRM
O usuário deve conseguir:
- responder ao contato;
- registrar nota interna;
- criar tarefa com vencimento;
- concluir tarefa;
- reatribuir responsável;
- mudar status e tags;
- arquivar ou reabrir contato.

## Modelo de Dados

### Reuso de tabelas existentes
- `contacts`: cadastro principal do contato.
- `conversations`: conversa por canal/contato.
- `messages`: mensagens da conversa.
- `tags`: classificação rápida.

### Novas tabelas necessárias
- `contact_notes`: notas internas com autor, texto, tenant, contato e timestamps.
- `contact_tasks`: tarefas com título, descrição, vencimento, status, responsável e contato.
- `contact_events`: eventos de sistema para alimentar a timeline unificada.

### Regra de multi-tenant
Todas as tabelas novas e queries devem filtrar por `tenant_id`.

## API
Rotas propostas:
- `GET /api/contacts/:tenantId` lista contatos.
- `GET /api/contacts/:tenantId/:id` detalha contato e timeline.
- `POST /api/contacts/:tenantId` cria contato.
- `PUT /api/contacts/:tenantId/:id` atualiza contato.
- `POST /api/contacts/:tenantId/:id/notes` cria nota.
- `POST /api/contacts/:tenantId/:id/tasks` cria tarefa.
- `PATCH /api/contacts/:tenantId/:id/tasks/:taskId` atualiza tarefa.
- `POST /api/contacts/:tenantId/:id/events` registra evento interno.

## Fluxo de Dados
1. Uma mensagem chega via webhook ou chat.
2. O contato é localizado ou criado.
3. A conversa recebe a mensagem.
4. O evento entra na timeline.
5. O frontend carrega a lista de contatos.
6. Ao abrir um contato, o frontend busca perfil + timeline unificada.
7. Notas, tarefas e eventos entram no mesmo feed visual.

## Tratamento de Erros
- Se o contato não existir, retornar `404` claro.
- Se faltar `tenant_id`, retornar `400`.
- Se a timeline falhar ao montar, o perfil do contato ainda deve carregar.
- Se o Supabase estiver indisponível, retornar erro genérico e registrar log no backend.

## Testes
- Criar teste de listagem de contatos com filtro por tenant.
- Criar teste de montagem da timeline unificada com mensagens + notas + tarefas.
- Criar teste de autorização por tenant.
- Validar login e consulta de contatos em produção antes de fechar a entrega.

## Critério de Pronto
- Contatos aparecem com dados principais e filtros.
- A timeline mostra mensagens, notas, tarefas e eventos no mesmo lugar.
- O usuário consegue editar o contato e registrar novas interações sem sair do perfil.
- Tudo respeita `tenant_id`.
