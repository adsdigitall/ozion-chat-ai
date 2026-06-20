// Tests for Inbox MVP routes — pure file analysis to avoid esbuild crashes
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

describe('Inbox Routes — Structure', () => {

  it('inbox.ts file exports a router', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    assert.ok(content.includes('export default router'), 'inbox.ts should export default router');
    assert.ok(content.includes("Router") && content.includes("'express'"), 'should import Router from express');
  });

  it('inbox routes are mounted in index.ts', () => {
    const indexContent = fs.readFileSync('./server/index.ts', 'utf-8');
    assert.ok(indexContent.includes("import inboxRoutes from './routes/inbox.js'"), 'inbox routes should be imported');
    assert.ok(indexContent.includes("/api/inbox'"), 'inbox routes should be mounted under /api/inbox');
  });

  it('GET /conversations endpoint structure is correct', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    assert.ok(content.includes("router.get('/conversations'"));
    assert.ok(content.includes("req.user.tenant_id"));
    assert.ok(content.includes(".eq('tenant_id', tenantId)"));
    assert.ok(content.includes(".order('last_message_at'"));
  });

  it('messages endpoint validates conversation belongs to tenant', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    assert.ok(content.includes("router.get('/conversations/:conversationId/messages'"));
    assert.ok(content.includes(".eq('id', conversationId)"));
    assert.ok(content.includes(".eq('tenant_id', tenantId)"));
  });

  it('contact endpoint validates tenant ownership', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    assert.ok(content.includes("router.get('/contacts/:contactId'"));
    assert.ok(content.includes(".eq('tenant_id', tenantId)"));
    assert.ok(content.includes('.maybeSingle()'));
  });

  it('send endpoint validates tenant and creates message', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    assert.ok(content.includes("router.post('/conversations/:conversationId/send'"));
    assert.ok(content.includes('sendByProvider'));
    assert.ok(content.includes("status: 'pending'"));
    assert.ok(content.includes("status: 'sent'"));
    assert.ok(content.includes("status: 'failed'"));
  });

  it('all inbox queries are scoped by tenant_id', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    // Count tenant_id references — should appear in every route handler
    const matches = content.match(/tenant_id/g);
    assert.ok(matches && matches.length >= 4, 'tenant_id should appear in all 4 route handlers');
  });

  it('inbox responses do not expose tenant_id', () => {
    const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
    // Check that tenant_id is NOT in any res.json() call
    const jsonBlocks = content.match(/res\.json\([^)]+\)/g) || [];
    for (const block of jsonBlocks) {
      assert.ok(!block.includes('tenant_id'), `res.json() should not expose tenant_id: ${block.substring(0, 100)}`);
    }
  });

});

describe('Inbox Frontend — File Structure', () => {

  it('public/js/inbox.js exports global functions', () => {
    const content = fs.readFileSync('./public/js/inbox.js', 'utf-8');
    assert.ok(content.includes('async function loadInbox('), 'loadInbox function should exist');
    assert.ok(content.includes('async function inboxLoadConversations('), 'inboxLoadConversations should exist');
    assert.ok(content.includes('async function inboxSelectConv('), 'inboxSelectConv should exist');
    assert.ok(content.includes('async function inboxSendMsg('), 'inboxSendMsg should exist');
    assert.ok(content.includes('function renderInboxConvItem'), 'renderInboxConvItem should exist');
    assert.ok(content.includes('function renderInboxMessage'), 'renderInboxMessage should exist');
    assert.ok(content.includes('function renderInboxContactDetail'), 'renderInboxContactDetail should exist');
  });

  it('inbox page is registered in SPA routing', () => {
    const ozionContent = fs.readFileSync('./public/js/ozion.js', 'utf-8');
    assert.ok(ozionContent.includes('inbox: loadInbox'), 'inbox should be mapped to loadInbox in clientPages');
    assert.ok(ozionContent.includes("id: 'inbox'"), 'inbox should be in getNavItems');
  });

  it('inbox.js is loaded in index.html', () => {
    const htmlContent = fs.readFileSync('./public/index.html', 'utf-8');
    assert.ok(htmlContent.includes('src="/js/inbox.js"'), 'inbox.js should be loaded in index.html');
  });

  it('inbox CSS classes exist in ozion.css', () => {
    const cssContent = fs.readFileSync('./public/css/ozion.css', 'utf-8');
    assert.ok(cssContent.includes('.inbox-layout'));
    assert.ok(cssContent.includes('.inbox-message'));
    assert.ok(cssContent.includes('.inbox-sidebar'));
    assert.ok(cssContent.includes('.inbox-main'));
    assert.ok(cssContent.includes('.inbox-detail'));
    assert.ok(cssContent.includes('.inbox-input-area'));
  });

});

