"use client";

import { useState } from "react";
import {
  Plus,
  BookOpen,
  Users,
  Download,
  Play,
} from "lucide-react";

type MemberTab = "courses" | "community" | "downloads";

const courses = [
  {
    id: 1,
    name: "Dominando o WhatsApp Business",
    description: "Aprenda a usar o WhatsApp para vender mais",
    students: 234,
    modules: 12,
    status: "published",
    thumbnail: "course-1",
  },
  {
    id: 2,
    name: "Automação com IA",
    description: "Crie agentes inteligentes para seu negócio",
    students: 189,
    modules: 8,
    status: "published",
    thumbnail: "course-2",
  },
  {
    id: 3,
    name: "Funis de Venda Lucrativos",
    description: "Estruture funis que convertem",
    students: 156,
    modules: 10,
    status: "draft",
    thumbnail: "course-3",
  },
];

const downloads = [
  { id: 1, name: "Ebook - WhatsApp Marketing", downloads: 567, type: "PDF" },
  { id: 2, name: "Planilha de Controle Financeiro", downloads: 423, type: "XLSX" },
  { id: 3, name: "Templates de Mensagens", downloads: 345, type: "DOCX" },
];

const communityPosts = [
  {
    id: 1,
    author: "Natan Macedo",
    content: "Dica: Usem o agente Safira para qualificar leads B2B",
    likes: 23,
    comments: 8,
    time: "2h",
  },
  {
    id: 2,
    author: "Ana Silva",
    content: "Compartilhando meu fluxo de onboarding que tem 90% de conclusão",
    likes: 45,
    comments: 15,
    time: "5h",
  },
];

export default function MembersPage() {
  const [activeTab, setActiveTab] = useState<MemberTab>("courses");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Área de Membros</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gerencie cursos, comunidade e materiais
          </p>
        </div>
        <button className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Conteúdo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "courses", label: "Cursos", icon: BookOpen },
          { id: "community", label: "Comunidade", icon: Users },
          { id: "downloads", label: "Downloads", icon: Download },
        ] as { id: MemberTab; label: string; icon: typeof BookOpen }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{courses.length}</p>
                  <p className="text-xs text-zinc-500">Total de Cursos</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {courses.reduce((sum, c) => sum + c.students, 0)}
                  </p>
                  <p className="text-xs text-zinc-500">Total de Alunos</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Play className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {courses.reduce((sum, c) => sum + c.modules, 0)}
                  </p>
                  <p className="text-xs text-zinc-500">Total de Módulos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="h-40 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-white">{course.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        course.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {course.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-4">{course.description}</p>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{course.students} alunos</span>
                    <span>{course.modules} módulos</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Course Card */}
            <div className="bg-zinc-900/30 border border-dashed border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors min-h-[280px]">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Plus className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-400">Criar novo curso</p>
            </div>
          </div>
        </div>
      )}

      {/* Community Tab */}
      {activeTab === "community" && (
        <div className="space-y-4">
          {/* Create Post */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-white">N</span>
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Compartilhe algo com a comunidade..."
                  className="w-full h-20 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button className="h-8 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors">
                    Publicar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {communityPosts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-zinc-300">
                    {post.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">{post.author}</p>
                    <span className="text-xs text-zinc-500">{post.time}</span>
                  </div>
                  <p className="text-sm text-zinc-300 mb-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <button className="hover:text-emerald-400 transition-colors">
                      {post.likes} curtidas
                    </button>
                    <button className="hover:text-emerald-400 transition-colors">
                      {post.comments} comentários
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Downloads Tab */}
      {activeTab === "downloads" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-5 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-white">Materiais para Download</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {downloads.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Download className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">
                    {item.downloads} downloads
                  </span>
                  <button className="h-8 px-3 bg-zinc-800 text-zinc-300 text-xs rounded-lg hover:bg-zinc-700 transition-colors">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
