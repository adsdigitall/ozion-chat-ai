-- Align the AI provider model with the Ozion IA blueprint.

ALTER TABLE public.ai_agents
  DROP CONSTRAINT IF EXISTS ai_agents_provider_check;

ALTER TABLE public.ai_agents
  ADD CONSTRAINT ai_agents_provider_check
  CHECK (provider IN ('openai', 'openrouter', 'gemini', 'claude', 'deepseek', 'groq', 'dify'));
