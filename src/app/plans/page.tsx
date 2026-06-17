"use client";

import { useState } from "react";
import {
  Check,
  Crown,
  Zap,
  Star,
} from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "mês",
    description: "Para testar a plataforma",
    color: "from-zinc-500 to-zinc-600",
    icon: Zap,
    features: [
      "1 número WhatsApp",
      "100 contatos",
      "50 conversas/mês",
      "1 fluxo",
      "1 agente IA",
      "Analytics básico",
    ],
    limits: {
      numbers: 1,
      contacts: 100,
      conversations: 50,
      flows: 1,
      agents: 1,
    },
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 197,
    period: "mês",
    description: "Para pequenos negócios",
    color: "from-blue-500 to-blue-600",
    icon: Star,
    features: [
      "2 números WhatsApp",
      "1.000 contatos",
      "500 conversas/mês",
      "5 fluxos",
      "3 agentes IA",
      "Analytics completo",
      "Suporte por email",
    ],
    limits: {
      numbers: 2,
      contacts: 1000,
      conversations: 500,
      flows: 5,
      agents: 3,
    },
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 497,
    period: "mês",
    description: "Para empresas em crescimento",
    color: "from-purple-500 to-purple-600",
    icon: Crown,
    features: [
      "5 números WhatsApp",
      "10.000 contatos",
      "5.000 conversas/mês",
      "Fluxos ilimitados",
      "10 agentes IA",
      "Voice Studio",
      "CTWA completo",
      "Suporte prioritário",
    ],
    limits: {
      numbers: 5,
      contacts: 10000,
      conversations: 5000,
      flows: -1,
      agents: 10,
    },
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 997,
    period: "mês",
    description: "Para operações de grande escala",
    color: "from-amber-500 to-amber-600",
    icon: Crown,
    features: [
      "Números ilimitados",
      "Contatos ilimitados",
      "Conversas ilimitadas",
      "Fluxos ilimitados",
      "Agentes IA ilimitados",
      "Voice Studio completo",
      "Multi-workspace",
      "White-label",
      "Suporte 24/7",
      "API dedicada",
    ],
    limits: {
      numbers: -1,
      contacts: -1,
      conversations: -1,
      flows: -1,
      agents: -1,
    },
    popular: false,
  },
];

export default function PlansPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Planos e Preços</h1>
        <p className="text-zinc-400 mt-2">
          Escolha o plano ideal para o seu negócio
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span
          className={`text-sm ${
            billingPeriod === "monthly" ? "text-white" : "text-zinc-500"
          }`}
        >
          Mensal
        </span>
        <button
          onClick={() =>
            setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")
          }
          className={`relative w-12 h-6 rounded-full transition-colors ${
            billingPeriod === "yearly" ? "bg-emerald-500" : "bg-zinc-700"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              billingPeriod === "yearly" ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm ${
            billingPeriod === "yearly" ? "text-white" : "text-zinc-500"
          }`}
        >
          Anual
          <span className="ml-2 text-xs text-emerald-400">-20%</span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const yearlyPrice = Math.round(plan.price * 0.8);
          const displayPrice =
            billingPeriod === "yearly" ? yearlyPrice : plan.price;
          const PlanIcon = plan.icon;

          return (
            <div
              key={plan.id}
              className={`relative bg-zinc-900/50 border rounded-xl p-6 ${
                plan.popular
                  ? "border-purple-500/50 shadow-lg shadow-purple-500/10"
                  : "border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                >
                  <PlanIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-500">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-white">Grátis</span>
                  ) : (
                    <>
                      <span className="text-sm text-zinc-400">R$</span>
                      <span className="text-3xl font-bold text-white">
                        {displayPrice}
                      </span>
                      <span className="text-sm text-zinc-400">/{plan.period}</span>
                    </>
                  )}
                </div>
                {billingPeriod === "yearly" && plan.price > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">
                    <span className="line-through">R$ {plan.price}</span>
                    <span className="ml-2 text-emerald-400">
                      Economia de R$ {plan.price - yearlyPrice}/mês
                    </span>
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  plan.popular
                    ? "bg-purple-500 hover:bg-purple-600 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}
              >
                {plan.price === 0 ? "Começar Grátis" : "Assinar Agora"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Features Comparison */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-6">
          Comparação Detalhada
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Recurso
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className="text-center py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[
                {
                  feature: "Números WhatsApp",
                  values: ["1", "2", "5", "Ilimitado"],
                },
                {
                  feature: "Contatos",
                  values: ["100", "1.000", "10.000", "Ilimitado"],
                },
                {
                  feature: "Conversas/mês",
                  values: ["50", "500", "5.000", "Ilimitado"],
                },
                {
                  feature: "Fluxos",
                  values: ["1", "5", "Ilimitado", "Ilimitado"],
                },
                {
                  feature: "Agentes IA",
                  values: ["1", "3", "10", "Ilimitado"],
                },
                {
                  feature: "Voice Studio",
                  values: ["-", "-", "✓", "✓"],
                },
                {
                  feature: "CTWA",
                  values: ["-", "-", "✓", "✓"],
                },
                {
                  feature: "Multi-workspace",
                  values: ["-", "-", "-", "✓"],
                },
                {
                  feature: "White-label",
                  values: ["-", "-", "-", "✓"],
                },
                {
                  feature: "Suporte",
                  values: ["Community", "Email", "Prioritário", "24/7"],
                },
              ].map((row) => (
                <tr key={row.feature}>
                  <td className="py-3 px-4 text-sm text-zinc-300">
                    {row.feature}
                  </td>
                  {row.values.map((value, index) => (
                    <td
                      key={index}
                      className="py-3 px-4 text-sm text-center text-zinc-300"
                    >
                      {value === "✓" ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : value === "-" ? (
                        <span className="text-zinc-600">-</span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
