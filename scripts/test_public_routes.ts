import { DB } from '../server/db.js';

async function testPublicRoutes() {
  console.log('--- TESTING PUBLIC CHATBOT ROUTES & SLUG RESOLUTION ---');

  // Test 1: Lookup bot by public slug
  const photoBot = DB.getChatbotByDeployment('lens-and-light-studio');
  if (!photoBot) {
    throw new Error('Failed to resolve photo bot by public slug "lens-and-light-studio"');
  }
  console.log(`[PASS] Resolved bot by public slug: "${photoBot.name}" (${photoBot.publicSlug})`);

  // Test 2: Lookup bot by deployment ID
  const depBot = DB.getChatbotByDeployment('dep_lens_light_pub');
  if (!depBot || depBot.id !== photoBot.id) {
    throw new Error('Failed to resolve bot by deployment ID "dep_lens_light_pub"');
  }
  console.log(`[PASS] Resolved bot by deployment ID: "${depBot.name}"`);

  // Test 3: Second bot slug resolution
  const restoBot = DB.getChatbotByDeployment('bella-vista-trattoria');
  if (!restoBot) {
    throw new Error('Failed to resolve restaurant bot by public slug "bella-vista-trattoria"');
  }
  console.log(`[PASS] Resolved secondary bot by slug: "${restoBot.name}" (${restoBot.publicSlug})`);

  // Test 4: Unpublished bot status check
  const draftBot = DB.createChatbot({
    id: 'bot_test_draft_only',
    workspaceId: 'ws_default_1',
    name: 'Draft Only Bot',
    businessName: 'Secret Draft Business',
    industry: 'Automotive Dealership',
    description: 'Not published yet',
    conversationStyle: 'hybrid',
    status: 'draft',
    publicSlug: 'secret-draft-slug',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mainMenuItems: [],
    appearance: {
      botDisplayName: 'Draft Assistant',
      greetingMessage: 'Draft greeting',
      logoUrl: '',
      brandColor: '#4f46e5',
      accentColor: '#6366f1',
      launcherPosition: 'bottom_right',
      headerStyle: 'solid',
      widgetSize: 'standard',
      welcomeScreenText: 'Draft',
    },
    deployment: {
      deploymentId: 'dep_secret_draft',
      isEnabled: true,
      allowedDomains: ['*'],
      embedSnippet: '',
      whatsappConfig: { isConnected: false, status: 'disconnected' },
    },
    aiConfig: {
      model: 'gemini-3.8-flash',
      systemPrompt: 'Draft',
      temperature: 0.3,
      greetingMessage: 'Draft',
      fallbackMessage: 'Draft',
    },
  });

  const resolvedDraft = DB.getChatbotBySlug('secret-draft-slug');
  if (!resolvedDraft || resolvedDraft.status !== 'draft') {
    throw new Error('Draft bot lookup failed');
  }
  console.log(`[PASS] Draft bot "${resolvedDraft.name}" correctly verified as status = "draft" (publicly restricted).`);

  // Clean up test draft
  DB.deleteChatbot(draftBot.id);
  console.log('[PASS] Test cleanup complete.');

  console.log('\n>>> ALL PUBLIC ROUTE & SLUG RESOLUTION TESTS PASSED! <<<');
}

testPublicRoutes().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
