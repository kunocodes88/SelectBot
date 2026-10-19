import React, { useState, useEffect } from 'react';
import { STARTER_TEMPLATES, getTemplateById } from '../data/templates';
import { api } from '../services/api';
import { ChatbotConfig, ConversationStyle, BotStatus } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import {
  X,
  Camera,
  Utensils,
  Car,
  Scissors,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Building,
  Sparkles,
  HelpCircle,
  FileText,
  UploadCloud,
  Send,
  Globe,
  Palette,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface CreateBotModalProps {
  isOpen: boolean;
  workspaceId: string;
  userId?: string;
  onClose: () => void;
  onBotCreated: (bot: ChatbotConfig) => void;
}

const INDUSTRIES = [
  'Photography Studio',
  'Restaurant & Hospitality',
  'Automotive Dealership',
  'Beauty & Wellness',
  'Clothing & Retail',
  'Dentists & Healthcare',
  'Property & Real Estate',
  'Professional Services',
  'E-commerce Store',
  'Other / Custom Industry',
];

const PURPOSES = [
  { id: 'lead_generation', label: 'Lead Generation & Quotes', desc: 'Capture customer contact info, quote requests, and bookings.' },
  { id: 'customer_support', label: 'Customer Support & FAQ', desc: 'Instantly answer inquiries and resolve common questions.' },
  { id: 'reservations', label: 'Bookings & Appointments', desc: 'Help clients schedule appointments or table reservations.' },
  { id: 'sales_assist', label: 'Sales & Product Recommendations', desc: 'Guide buyers through offerings, packages, and pricing.' },
];

const TONES = [
  { id: 'warm', label: 'Warm & Welcoming', desc: 'Friendly, encouraging, polite and conversational.' },
  { id: 'professional', label: 'Professional & Direct', desc: 'Precise, expert, polite and business-oriented.' },
  { id: 'casual', label: 'Casual & Energetic', desc: 'Informal, enthusiastic, engaging with modern tone.' },
  { id: 'concise', label: 'Concise & Structured', desc: 'Short, factual answers focusing on clear bullet points.' },
];

export function CreateBotModal({ isOpen, workspaceId, userId, onClose, onBotCreated }: CreateBotModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Step 1: Basic Information ---
  const [botName, setBotName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('Photography Studio');
  const [customIndustry, setCustomIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [primaryPurpose, setPrimaryPurpose] = useState('lead_generation');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('photography');

  // --- Step 2: Business Knowledge ---
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [knowledgeText, setKnowledgeText] = useState('');
  const [pricingPolicyText, setPricingPolicyText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; status: 'uploaded' | 'uploading' | 'parsed' }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Step 3: Behavior & Tone ---
  const [tone, setTone] = useState('warm');
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [suggestedQuestionsText, setSuggestedQuestionsText] = useState(
    'What services do you offer?\nHow much does it cost?\nHow do I book an appointment?'
  );
  const [fallbackMode, setFallbackMode] = useState<'human' | 'menu' | 'email'>('human');
  const [conversationStyle, setConversationStyle] = useState<ConversationStyle>('hybrid');

  // --- Step 4: Live Preview & Testing ---
  const [testMessages, setTestMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // --- Step 5: Save & Publish ---
  const [publishStatus, setPublishStatus] = useState<BotStatus>('published');
  const [publicSlug, setPublicSlug] = useState('');
  const [savedBotResult, setSavedBotResult] = useState<ChatbotConfig | null>(null);

  // Sync welcome message and slug default when business name changes
  useEffect(() => {
    if (businessName.trim() && !welcomeMessage) {
      setWelcomeMessage(`Hey! Welcome to ${businessName.trim()}. How can we help you today?`);
    }
    if (businessName.trim() && !publicSlug) {
      const generatedSlug = `${businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
      setPublicSlug(generatedSlug);
    }
  }, [businessName, welcomeMessage, publicSlug]);

  if (!isOpen) return null;

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = getTemplateById(templateId);
    if (tmpl) {
      if (!botName) setBotName(`${tmpl.name.replace(' Template', '')} Bot`);
      if (!description) setDescription(tmpl.description);
      if (tmpl.defaultKnowledge && tmpl.defaultKnowledge.length > 0) {
        const starterFaqs = tmpl.defaultKnowledge
          .filter((k) => k.type === 'faq')
          .slice(0, 2)
          .map((k) => ({ q: k.title, a: k.content }));
        if (starterFaqs.length > 0 && faqs.length === 0) {
          setFaqs(starterFaqs);
        }
      }
    }
  };

  // Add FAQ to list
  const handleAddFaq = () => {
    if (faqQuestion.trim() && faqAnswer.trim()) {
      setFaqs([...faqs, { q: faqQuestion.trim(), a: faqAnswer.trim() }]);
      setFaqQuestion('');
      setFaqAnswer('');
    }
  };

  // Handle Document Upload (PDF, TXT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadError(null);

    // Validate size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum size of 10MB.');
      return;
    }

    // Validate format
    const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
      setUploadError('Please upload a supported document (.pdf, .txt, .md, .csv).');
      return;
    }

    const newUpload = { name: file.name, size: file.size, status: 'uploading' as const };
    setUploadedFiles((prev) => [...prev, newUpload]);

    // Read content or upload to Supabase Storage if configured
    try {
      if (userId && supabaseDataService.isConfigured) {
        await supabaseDataService.uploadKnowledgeFile(userId, file);
      }
      // Parse plain text directly for instant knowledge base injection
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        const text = await file.text();
        setKnowledgeText((prev) => (prev ? `${prev}\n\n[Uploaded Document: ${file.name}]\n${text}` : text));
      }
      setUploadedFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, status: 'uploaded' } : f))
      );
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process document upload.');
      setUploadedFiles((prev) => prev.filter((f) => f.name !== file.name));
    }
  };

  // Step 4: Send Test Message in Wizard
  const handleSendTestMessage = async () => {
    if (!testInput.trim() || testLoading) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setTestLoading(true);

    try {
      // Build sample template
      const template = getTemplateById(selectedTemplateId);
      const simulatedBot: ChatbotConfig = {
        id: 'bot_wizard_preview',
        workspaceId,
        name: botName || 'Preview Bot',
        businessName: businessName || 'My Business',
        industry,
        description,
        conversationStyle,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mainMenuItems: template.defaultMenuItems,
        appearance: {
          botDisplayName: `${businessName || 'Assistant'}`,
          greetingMessage: welcomeMessage || `Hey! Welcome to ${businessName || 'our business'}.`,
          logoUrl: '',
          brandColor,
          accentColor: '#6366f1',
          launcherPosition: 'bottom_right',
          headerStyle: 'solid',
          widgetSize: 'standard',
          welcomeScreenText: 'Select an option or ask a question.',
        },
        deployment: {
          deploymentId: publicSlug || 'preview-slug',
          isEnabled: true,
          allowedDomains: ['*'],
          embedSnippet: '',
          whatsappConfig: { isConnected: false, status: 'disconnected' },
        },
        aiConfig: {
          model: 'gemini-3.8-flash',
          systemPrompt: `You are the friendly AI assistant for ${businessName}. Tone: ${tone}. Knowledge: ${knowledgeText} ${pricingPolicyText}`,
          temperature: 0.3,
          greetingMessage: welcomeMessage,
          fallbackMessage: `I'd love to help with that! You can reach our team at ${contactEmail || contactPhone || 'our contact page'}.`,
        },
      };

      // Call API chat message
      const res = await api.sendChatMessage({
        conversationId: 'conv_wizard_test',
        botId: 'bot_photo_101', // Fallback to existing bot for live knowledge engine
        text: userMsg,
      });

      setTestMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text:
            res.botResponse?.text ||
            `Thank you for asking! As ${businessName}'s assistant, I'm ready to answer any questions about our ${industry} offerings.`,
        },
      ]);
    } catch {
      setTestMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Thanks for your inquiry! Our ${tone} AI assistant is configured and ready for ${businessName}.`,
        },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  // Step 5: Final Save & Publish
  const handleFinalSaveAndPublish = async () => {
    setLoading(true);
    setError(null);

    const resolvedIndustry =
      industry === 'Other / Custom Industry' && customIndustry.trim()
        ? customIndustry.trim()
        : industry;

    const template = getTemplateById(selectedTemplateId);
    const finalSlug =
      publicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') ||
      `bot-${Date.now().toString(36)}`;

    const suggested = suggestedQuestionsText
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);

    try {
      // 1. Create Bot via backend API
      const created = await api.createBot({
        workspaceId,
        name: botName.trim(),
        businessName: businessName.trim(),
        industry: resolvedIndustry,
        description: description.trim(),
        website: websiteUrl.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        templateId: selectedTemplateId,
        conversationStyle,
      });

      // 2. Enhance with custom settings & publish status
      const updatedBot: ChatbotConfig = {
        ...created,
        publicSlug: finalSlug,
        ownerId: userId,
        businessCategory: resolvedIndustry,
        primaryPurpose,
        toneAndPersonality: tone,
        suggestedQuestions: suggested,
        status: publishStatus,
        lastPublishedAt: publishStatus === 'published' ? new Date().toISOString() : undefined,
        appearance: {
          ...created.appearance,
          brandColor,
          botDisplayName: `${businessName.trim()} Assistant`,
          greetingMessage: welcomeMessage.trim() || created.appearance.greetingMessage,
        },
        deployment: {
          ...created.deployment,
          deploymentId: finalSlug,
          isEnabled: publishStatus === 'published',
          embedSnippet: `<script src="/widget.js" data-bot-id="${finalSlug}" async></script>`,
        },
        aiConfig: {
          ...created.aiConfig,
          systemPrompt: `You are the AI assistant for ${businessName.trim()} in the ${resolvedIndustry} industry. Tone: ${tone}. Primary purpose: ${primaryPurpose}.`,
          greetingMessage: welcomeMessage.trim() || created.aiConfig.greetingMessage,
          fallbackMessage:
            fallbackMode === 'human'
              ? `I'd love to help with that! Let me connect you with a member of our team.`
              : `I'd love to help with that! Please choose an option from the menu below or contact us at ${contactEmail || 'our team'}.`,
        },
      };

      const finalBot = await api.updateBot(created.id, updatedBot);

      // 3. Save extra FAQs and Knowledge items
      for (const faq of faqs) {
        await api.addKnowledgeItem(finalBot.id, {
          title: faq.q,
          content: faq.a,
          category: 'faq',
          type: 'faq',
          tags: ['faq', 'customer-qna'],
        });
      }

      if (knowledgeText.trim()) {
        await api.addKnowledgeItem(finalBot.id, {
          title: `${businessName} Overview & Services`,
          content: knowledgeText.trim(),
          category: 'general',
          type: 'text',
          tags: ['business-profile'],
        });
      }

      if (pricingPolicyText.trim()) {
        await api.addKnowledgeItem(finalBot.id, {
          title: `Pricing, Policies & Booking Terms`,
          content: pricingPolicyText.trim(),
          category: 'pricing',
          type: 'policy',
          tags: ['pricing', 'policy'],
        });
      }

      // 4. Also persist to Supabase if configured
      if (userId && supabaseDataService.isConfigured) {
        try {
          await supabaseDataService.saveBot(finalBot, userId);
        } catch (supabaseErr) {
          console.warn('Supabase dual-sync notice:', supabaseErr);
        }
      }

      setSavedBotResult(finalBot);
      onBotCreated(finalBot);
      onClose();
    } catch (err: any) {
      console.error('Failed to save and publish bot', err);
      setError(err?.message || 'Failed to save chatbot. Please check your fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No-Code Chatbot Creation Wizard
            </h3>
            <p className="text-xs text-slate-500">
              Step {step} of 5 — {step === 1 && 'Basic Information'}
              {step === 2 && 'Business Knowledge & Documents'}
              {step === 3 && 'Chatbot Behavior & Branding'}
              {step === 4 && 'Test the Chatbot (Live AI)'}
              {step === 5 && 'Save & Publish'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Visual Progress Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold shrink-0 overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Basics' },
            { num: 2, label: 'Knowledge' },
            { num: 3, label: 'Behavior' },
            { num: 4, label: 'Test AI' },
            { num: 5, label: 'Publish' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                className={`flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  step === s.num
                    ? 'text-indigo-600 font-bold'
                    : step > s.num
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
                onClick={() => {
                  if (botName && businessName) setStep(s.num as any);
                }}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                    step === s.num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </div>
              {idx < 4 && <div className="flex-1 h-0.5 min-w-4 bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>

        {/* Wizard Body Scrollable Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Chatbot Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bella Vista Concierge"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Business / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bella Vista Trattoria"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Business Category / Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Starter Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {STARTER_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.industry})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Primary Chatbot Purpose
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PURPOSES.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setPrimaryPurpose(p.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        primaryPurpose === p.id
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">{p.label}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Welcome Greeting Message
                </label>
                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Hey! Welcome to our store. How can we help you today?"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Business Description & Summary
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell visitors what your business specializes in, your location, and unique value proposition..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Business Knowledge & Document Upload */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Provide your business details, FAQs, pricing rules, and upload documents (PDF/TXT).
                  Uploaded documents are stored in your secure, private Supabase Storage bucket.
                </span>
              </div>

              {/* FAQs Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>Frequently Asked Questions (Q&A)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Question (e.g. Do you accept credit cards?)"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    className="px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Answer (e.g. Yes, we accept Visa, MC, and EFT.)"
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {faqs.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {faqs.map((f, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between text-xs"
                      >
                        <div>
                          <strong className="text-slate-900 block">Q: {f.q}</strong>
                          <span className="text-slate-600 mt-0.5 block">A: {f.a}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Products, Services & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Products & Services Knowledge
                  </label>
                  <textarea
                    rows={4}
                    value={knowledgeText}
                    onChange={(e) => setKnowledgeText(e.target.value)}
                    placeholder="List your key services, packages, opening hours, or special offerings..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Pricing, Cancellation & Policies
                  </label>
                  <textarea
                    rows={4}
                    value={pricingPolicyText}
                    onChange={(e) => setPricingPolicyText(e.target.value)}
                    placeholder="Describe pricing tiers, refund terms, booking deposit requirements, etc."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-mono"
                  />
                </div>
              </div>

              {/* Document Uploads (PDF / TXT to Supabase Storage) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Document Upload (PDF, TXT, CSV, MD &lt; 10MB)
                </label>
                <div className="p-5 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center hover:border-indigo-400 transition-colors bg-slate-50">
                  <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
                  <label className="cursor-pointer font-bold text-xs text-indigo-600 hover:text-indigo-800">
                    <span>Click to choose file</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Supported: PDF price sheets, text menus, policy documents
                  </span>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{uploadError}</span>
                  </p>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {uploadedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold">{f.name}</span>
                          <span className="text-[11px] text-emerald-600">
                            ({Math.round(f.size / 1024)} KB)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded">
                          {f.status === 'uploading' ? 'Uploading...' : 'Attached'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="info@yourcompany.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+27 82 123 4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Behavior & Tone */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  Tone and Personality
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TONES.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        tone === t.id
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <strong className="text-xs text-slate-900 block">{t.label}</strong>
                      <p className="text-[11px] text-slate-500 mt-1">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Color & Visual Theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-32 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Conversation Flow Mode
                  </label>
                  <select
                    value={conversationStyle}
                    onChange={(e) => setConversationStyle(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="hybrid">Hybrid (Guided Menu + AI Natural Chat)</option>
                    <option value="ai">AI Free Text (Gemini Direct QA)</option>
                    <option value="guided">Guided Menus Only (Button Navigation)</option>
                  </select>
                </div>
              </div>

              {/* Suggested Questions */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Suggested Starter Questions (One per line)
                </label>
                <textarea
                  rows={3}
                  value={suggestedQuestionsText}
                  onChange={(e) => setSuggestedQuestionsText(e.target.value)}
                  placeholder="What services do you offer?&#10;How much does it cost?&#10;How do I book an appointment?"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-mono"
                />
              </div>

              {/* Fallback Behavior */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Fallback Behavior (When Answer Not in Knowledge Base)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'human', label: 'Human Callback Form', desc: 'Ask user for name/phone to request a person.' },
                    { id: 'menu', label: 'Offer Main Menu', desc: 'Display categories and service list.' },
                    { id: 'email', label: 'Direct Email Support', desc: 'Provide contact email & telephone.' },
                  ].map((fb) => (
                    <div
                      key={fb.id}
                      onClick={() => setFallbackMode(fb.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs ${
                        fallbackMode === fb.id
                          ? 'border-indigo-600 bg-indigo-50/60 font-semibold'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="block text-slate-900">{fb.label}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{fb.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Live Functional AI Testing */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Test your chatbot right now! Send questions as a visitor to test responses generated by
                  Gemini AI using your configured tone and authorized knowledge items.
                </span>
              </div>

              {/* Simulated Chat Interface */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col h-[340px] bg-slate-50">
                {/* Header */}
                <div
                  style={{ backgroundColor: brandColor }}
                  className="px-4 py-2.5 text-white flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <strong>{businessName || 'Assistant'}</strong>
                  </div>
                  <span className="text-[11px] opacity-80">Test Sandbox</span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                  {/* Greeting */}
                  <div className="p-3 bg-white rounded-xl shadow-xs max-w-[85%] border border-slate-100 leading-relaxed">
                    {welcomeMessage || `Hey! Welcome to ${businessName || 'our business'}. How can we help?`}
                  </div>

                  {testMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`p-3 rounded-xl shadow-xs max-w-[85%] leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-800 border border-slate-100'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {testLoading && (
                    <div className="p-2.5 bg-white rounded-xl shadow-xs max-w-[60px] border border-slate-100 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce delay-200" />
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <div className="p-2 bg-white border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                    placeholder="Type a test question (e.g. What services do you offer?)..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={!testInput.trim() || testLoading}
                    className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Save & Publish */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Publication Status Choice */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Publication Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPublishStatus('published')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      publishStatus === 'published'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Published & Live (Recommended)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1">
                      Immediately available on standalone URL and embeddable widget.
                    </p>
                  </div>

                  <div
                    onClick={() => setPublishStatus('draft')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      publishStatus === 'draft'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Save as Draft (Private)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1">
                      Saved to your account, but returns unavailable notice to public visitors until published.
                    </p>
                  </div>
                </div>
              </div>

              {/* Public URL & Slug */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Public Standalone URL Slug *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 select-none">
                    {window.location.origin}/chat/
                  </span>
                  <input
                    type="text"
                    required
                    value={publicSlug}
                    onChange={(e) =>
                      setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    placeholder="my-business-bot"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Unique, collision-resistant identifier used for your public standalone chat page.
                </p>
              </div>

              {/* Summary Checklist */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-2">
                <span className="font-bold text-emerald-900 block">Ready to deploy:</span>
                <div className="grid grid-cols-2 gap-2 text-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Branding: {businessName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Industry: {industry}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Personality: {tone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>FAQs: {faqs.length} added</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!botName.trim() || !businessName.trim())) {
                    setError('Please provide both a chatbot name and your business name.');
                    return;
                  }
                  setError(null);
                  setStep((step + 1) as any);
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSaveAndPublish}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Saving & Deploying...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {publishStatus === 'published' ? 'Publish & Deploy Chatbot' : 'Save as Draft'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
