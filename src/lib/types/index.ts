export type UserRole = "master" | "admin" | "agent" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: PlanType;
  logo?: string;
  created_at: string;
}

export type PlanType = "free" | "starter" | "pro" | "enterprise";

export interface Contact {
  id: string;
  workspace_id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  tags: Tag[];
  status: ContactStatus;
  origin?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
  creative?: string;
  score: number;
  temperature: "hot" | "warm" | "cold";
  ai_summary?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export type ContactStatus = "new" | "interested" | "qualified" | "proposal" | "won" | "lost" | "risk";

export interface Tag {
  id: string;
  name: string;
  color: string;
  workspace_id: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  contact_id: string;
  contact: Contact;
  channel: ChannelType;
  phone_number: string;
  status: ConversationStatus;
  assigned_to?: User;
  tags: Tag[];
  flow_id?: string;
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus = "open" | "waiting" | "closed";
export type ChannelType = "whatsapp" | "instagram" | "facebook" | "web";

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  type: MessageType;
  sender: "contact" | "agent" | "ai";
  sender_name?: string;
  media_url?: string;
  read: boolean;
  created_at: string;
}

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "template"
  | "flow";

export interface Flow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  status: "draft" | "published";
  analytics?: FlowAnalytics;
  created_at: string;
  updated_at: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface FlowAnalytics {
  entries: number;
  conversions: number;
  abandonment: number;
  revenue: number;
}

export interface AIAgent {
  id: string;
  workspace_id: string;
  name: string;
  avatar?: string;
  prompt: string;
  objective: string;
  rules: string[];
  knowledge_base: string[];
  memory: boolean;
  status: "active" | "inactive";
  conversations_handled: number;
  created_at: string;
}

export interface WhatsAppConnection {
  id: string;
  workspace_id: string;
  phone_number: string;
  display_name: string;
  waba_id: string;
  phone_number_id: string;
  business_id: string;
  status: "connected" | "disconnected" | "error";
  type: "cloud_api" | "qrcode";
  created_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  platform: "meta" | "google" | "tiktok";
  status: "active" | "paused" | "completed";
  budget: number;
  spent: number;
  leads: number;
  purchases: number;
  cpa: number;
  roi: number;
  roas: number;
  created_at: string;
}

export interface Sale {
  id: string;
  workspace_id: string;
  contact_id: string;
  contact: Contact;
  amount: number;
  platform: string;
  status: "completed" | "refunded" | "pending";
  product?: string;
  created_at: string;
}

export interface Integration {
  id: string;
  workspace_id: string;
  name: string;
  type: IntegrationType;
  status: "connected" | "disconnected" | "error";
  config: Record<string, unknown>;
  created_at: string;
}

export type IntegrationType =
  | "openrouter"
  | "openai"
  | "gemini"
  | "claude"
  | "deepseek"
  | "groq"
  | "dify"
  | "elevenlabs"
  | "utmify"
  | "kiwify"
  | "hotmart"
  | "perfectpay"
  | "asaas"
  | "stripe"
  | "mercadopago"
  | "make"
  | "zapier"
  | "n8n";

export interface DashboardStats {
  leads_today: number;
  leads_week: number;
  leads_month: number;
  conversations_open: number;
  conversations_waiting: number;
  conversations_closed: number;
  revenue: number;
  sales: number;
  conversion_rate: number;
  top_tags: { name: string; count: number; color: string }[];
  top_flows: { name: string; entries: number }[];
  lead_sources: { source: string; count: number }[];
  campaigns: { name: string; leads: number; roi: number }[];
}

export interface HealthStatus {
  service: string;
  status: "online" | "unstable" | "error";
  latency?: number;
  last_check: string;
}

export interface LogEntry {
  id: string;
  action: string;
  user: string;
  target: string;
  details: string;
  created_at: string;
}
