import type { ChatResponse, FaqDto, TraceStage } from '@openfaq/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Database,
  GitBranch,
  LogIn,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { api } from './api';

const sampleTrace: TraceStage[] = [
  { stage: 'exact', score: 1, candidateId: 'shipping.time', title: 'นโยบายการจัดส่ง' },
  { stage: 'fuzzy', score: 0.78, candidateId: 'shipping.time', title: 'จัดส่งใช้เวลากี่วัน' },
  { stage: 'vector', score: 0.62, candidateId: 'shipping.time', title: 'ระยะเวลาจัดส่ง' },
  { stage: 'rrf', score: 0.91, candidateId: 'shipping.time', title: 'นโยบายการจัดส่ง' },
];

const initialAnswer: ChatResponse = {
  answer: 'จัดส่งภายใน 1–3 วันทำการ พร้อมเลขติดตามหลังส่งสินค้า',
  decision: 'answer',
  confidence: 0.91,
  source: { faqId: 'shipping.time', title: 'นโยบายการจัดส่ง' },
  suggestions: [],
  trace: sampleTrace,
  mode: 'public-lite',
};

const pageHeadingClass = 'mx-auto max-w-[1500px] px-4 pb-5 pt-7 sm:px-8 sm:pt-8';
const pageTitleClass = 'mb-1.5 text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-3xl';
const primaryButtonClass =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-green-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-wait disabled:opacity-55';
const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100';

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'flex shrink-0 items-center gap-2 border-b-2 px-2 py-3 text-xs font-medium transition sm:px-3 sm:text-sm lg:px-4',
    isActive
      ? 'border-green-600 text-green-700'
      : 'border-transparent text-slate-600 hover:border-green-300 hover:text-green-700',
  ].join(' ');
}

function Header() {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:h-[72px] sm:gap-5 sm:px-5 lg:gap-12 lg:px-8">
      <NavLink
        className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-xl font-bold text-slate-900 no-underline"
        to="/chat"
        aria-label="OpenFAQ Bot home"
      >
        <span className="grid size-9 place-items-center rounded-xl border-2 border-green-600 text-green-600">
          <Bot size={22} />
        </span>
        <span className="hidden sm:inline">OpenFAQ Bot</span>
      </NavLink>
      <nav className="flex min-w-0 self-stretch overflow-x-auto" aria-label="หลัก">
        <NavLink className={navClass} to="/chat">
          <MessageSquare className="hidden lg:block" size={18} />
          Chat Demo
        </NavLink>
        <NavLink className={navClass} to="/knowledge">
          <BookOpen className="hidden lg:block" size={18} />
          Knowledge
        </NavLink>
        <NavLink className={navClass} to="/architecture">
          <GitBranch className="hidden lg:block" size={18} />
          Architecture
        </NavLink>
        <NavLink className={navClass} to="/admin">
          <ShieldCheck className="hidden lg:block" size={18} />
          Admin
        </NavLink>
      </nav>
      <a
        className="ml-auto hidden rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 no-underline transition hover:border-slate-300 hover:bg-slate-50 lg:block"
        href="https://github.com/PanuwatChinpratan/openfaq-line-bot"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
    </header>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-72px)]">{children}</main>
    </>
  );
}

function TraceRail({ result, loading }: { result: ChatResponse; loading: boolean }) {
  return (
    <aside
      className="rounded-xl border border-slate-200 bg-white p-5 lg:p-[22px]"
      aria-label="Retrieval trace"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">Retrieval trace</h2>
          <p className="mt-1 text-[13px] text-slate-500">ขั้นตอนค้นหาคำตอบจริง</p>
        </div>
        <Database className="text-slate-500" size={20} />
      </div>
      <div className="mt-5">
        {result.trace.map((item, index) => {
          const isFinal = item.stage === 'rrf';
          return (
            <div
              className="relative grid grid-cols-[28px_1fr] gap-2.5 pb-4 before:absolute before:bottom-[-2px] before:left-3 before:top-6 before:w-0.5 before:bg-green-200 before:content-[''] last:before:hidden"
              key={item.stage}
            >
              <span
                className={`z-1 grid size-[25px] place-items-center rounded-full text-[13px] text-white ${
                  isFinal ? 'bg-blue-600 ring-6 ring-blue-100' : 'bg-green-600'
                }`}
              >
                {index + 1}
              </span>
              <div
                className={`rounded-lg border p-3.5 ${
                  isFinal ? 'border-blue-600' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between gap-3">
                  <strong className={isFinal ? 'text-blue-600' : ''}>
                    {isFinal
                      ? 'RRF (รวมคะแนน)'
                      : `${item.stage[0].toUpperCase()}${item.stage.slice(1)}`}
                  </strong>
                  <span className={`font-semibold ${isFinal ? 'text-blue-600' : 'text-green-700'}`}>
                    {loading ? '…' : item.score.toFixed(2)}
                  </span>
                </div>
                <p className="mb-0.5 mt-2">{item.title}</p>
                <small className="text-slate-400">{item.candidateId}</small>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <strong>Confidence</strong>
          <span className="text-xl font-bold text-green-600">
            {result.confidence.toFixed(2)}{' '}
            <small className="text-[13px]">
              {result.confidence >= 0.78 ? 'สูง' : result.confidence >= 0.58 ? 'ปานกลาง' : 'ต่ำ'}
            </small>
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <i
            className="block h-full rounded-full bg-green-600 transition-[width] duration-500"
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

function ChatPage() {
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('ของจะถึงกี่วันคะ');
  const [result, setResult] = useState(initialAnswer);
  const mutation = useMutation({ mutationFn: api.chat, onSuccess: setResult });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setQuestion(message);
    setInput('');
    mutation.mutate(message);
  };

  return (
    <AppShell>
      <section className={pageHeadingClass}>
        <h1 className={pageTitleClass}>ลองถามคำถามร้านค้า</h1>
        <p className="text-slate-500">Hybrid search ทำงานได้แม้ไม่เปิด AI</p>
      </section>
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 pb-4 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
        <section className="flex min-h-[580px] flex-col rounded-xl border border-slate-200 bg-white lg:min-h-[650px]">
          <div className="flex-1 px-4 py-5 sm:px-7" aria-live="polite">
            <div className="mx-auto mb-7 w-max rounded-lg bg-slate-100 px-3.5 py-1 text-[13px] text-slate-500">
              วันนี้
            </div>
            <div className="ml-auto w-max max-w-[88%] rounded-xl border border-green-200 bg-green-50 px-5 py-4 leading-relaxed sm:max-w-[70%]">
              {question}
              <span className="mt-1.5 flex items-center justify-end gap-1 text-xs text-slate-500">
                10:14 <Check size={14} />
              </span>
            </div>
            <div className="mt-9 flex max-w-[680px] items-start gap-2.5 sm:mt-12 sm:gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green-600 text-white sm:size-[46px]">
                <Bot size={24} />
              </span>
              <div className="min-w-0">
                <div className="min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 leading-relaxed sm:min-w-[440px]">
                  {mutation.isPending
                    ? 'กำลังค้นหาคำตอบ…'
                    : mutation.isError
                      ? 'เชื่อมต่อ API ไม่สำเร็จ กรุณาลองอีกครั้ง'
                      : result.answer}
                  {result.source ? (
                    <a
                      className="mt-4 flex items-center gap-2 border-t border-dashed border-slate-300 pt-3.5 text-sm text-blue-600 no-underline hover:text-blue-700"
                      href={`/knowledge#${result.source.faqId}`}
                    >
                      <BookOpen size={16} />
                      อ้างอิง: {result.source.title}
                    </a>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-green-600 bg-white px-3.5 py-2 text-green-700 transition hover:bg-green-50"
                    type="button"
                  >
                    <ThumbsUp size={18} />
                    ช่วยได้
                  </button>
                  <button
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-slate-600 transition hover:bg-slate-50"
                    type="button"
                  >
                    <ThumbsDown size={18} />
                    ไม่ตรงคำถาม
                  </button>
                </div>
              </div>
            </div>
          </div>
          <form
            className="m-4 flex items-center rounded-xl border border-slate-200 py-2 pl-4 pr-2 text-slate-500 focus-within:border-green-600 focus-within:ring-3 focus-within:ring-green-100"
            onSubmit={submit}
          >
            <MessageSquare className="shrink-0" size={20} />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2 text-slate-800 outline-none placeholder:text-slate-400"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="พิมพ์คำถาม เช่น คืนสินค้าได้ไหม"
              aria-label="คำถาม"
            />
            <button className={primaryButtonClass} disabled={mutation.isPending} type="submit">
              <Send size={18} />
              <span className="hidden sm:inline">ส่ง</span>
            </button>
          </form>
        </section>
        <TraceRail result={result} loading={mutation.isPending} />
      </div>
      <footer className="flex min-h-14 flex-wrap items-center justify-around gap-2 border-t border-slate-200 px-4 py-3 text-[13px] text-slate-500 sm:px-7">
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-green-600" />
          ระบบทำงานปกติ
        </span>
        <span>
          โหมด:{' '}
          <strong className="text-green-700">
            {result.mode === 'local-ai' ? 'Local AI' : 'Public Lite'}
          </strong>
        </span>
        <span>
          Hybrid search: <strong className="text-green-700">เปิด</strong>
        </span>
        <span>
          AI:{' '}
          <strong className="text-green-700">{result.mode === 'local-ai' ? 'เปิด' : 'ปิด'}</strong>
        </span>
      </footer>
    </AppShell>
  );
}

function KnowledgePage() {
  const query = useQuery({ queryKey: ['faqs'], queryFn: api.faqs });
  return (
    <AppShell>
      <section className={pageHeadingClass}>
        <h1 className={pageTitleClass}>Knowledge</h1>
        <p className="text-slate-500">คำตอบที่เผยแพร่และใช้เป็นแหล่งอ้างอิงของบอต</p>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        {query.isLoading ? <p className="text-slate-500">กำลังโหลด…</p> : null}
        {query.isError ? <p className="text-red-600">ยังเชื่อมต่อ API ไม่ได้</p> : null}
        {query.data?.map((faq) => (
          <article
            className="scroll-mt-24 border-t border-slate-200 py-6 first:border-t-0"
            id={faq.id}
            key={faq.id}
          >
            <span className="text-[13px] font-semibold text-green-700">{faq.category}</span>
            <h2 className="my-2 text-xl font-bold">{faq.question}</h2>
            <p className="leading-relaxed text-slate-600">{faq.answer}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}

const architectureSteps = [
  'LINE Webhook',
  'Normalize',
  'Exact + Fuzzy',
  'Vector Search',
  'RRF + Confidence',
  'Flex Reply',
];

function ArchitecturePage() {
  return (
    <AppShell>
      <section className={pageHeadingClass}>
        <h1 className={pageTitleClass}>Architecture</h1>
        <p className="text-slate-500">เล็กพอให้เข้าใจ แต่ครบพอให้ใช้งานจริง</p>
      </section>
      <section className="mx-auto my-5 flex max-w-6xl flex-col items-stretch gap-1.5 px-4 pb-8 sm:px-8 lg:mb-12 lg:flex-row lg:pb-0">
        {architectureSteps.map((step, index) => (
          <div
            className="relative flex flex-1 items-center gap-2.5 border-t-2 border-green-600 px-2 py-4"
            key={step}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-50 text-sm text-green-700">
              {index + 1}
            </span>
            <strong>{step}</strong>
            {index < architectureSteps.length - 1 ? (
              <ChevronRight className="ml-auto rotate-90 text-slate-400 lg:rotate-0" />
            ) : null}
          </div>
        ))}
      </section>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        {[
          {
            title: 'Retrieval first',
            copy: 'ระบบค้นจากข้อมูลที่เผยแพร่แล้วเท่านั้น Exact match ตอบได้ทันที ส่วน fuzzy และ vector จะรวมอันดับด้วย RRF',
          },
          {
            title: 'AI เป็น optional',
            copy: 'Public Lite ส่งคำตอบมาตรฐานโดยตรง Local AI ใช้ Ollama เรียบเรียงเฉพาะ context ที่ผ่าน confidence threshold',
          },
          {
            title: 'Safe by default',
            copy: 'ตรวจ LINE signature, mask ข้อมูลสำคัญ, กัน webhook ซ้ำ และไม่ให้ LLM เข้าถึงฐานข้อมูลโดยตรง',
          },
        ].map((item) => (
          <section
            className="grid gap-2 border-t border-slate-200 py-5 lg:grid-cols-[190px_1fr]"
            key={item.title}
          >
            <h2 className="text-lg font-bold">{item.title}</h2>
            <p className="leading-relaxed text-slate-500">{item.copy}</p>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('admin@openfaq.local');
  const [password, setPassword] = useState('');
  const login = useMutation({ mutationFn: () => api.login(email, password), onSuccess: onDone });
  return (
    <div className="mx-4 mt-16 max-w-[420px] rounded-xl border border-slate-200 p-7 sm:mx-auto sm:mt-24 sm:p-8">
      <LogIn className="text-green-600" size={28} />
      <h1 className="mb-0.5 mt-4 text-2xl font-bold">เข้าสู่ระบบ Admin</h1>
      <p className="mb-6 text-slate-500">สำหรับเจ้าของคลังคำถามเท่านั้น</p>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
        <label className="grid gap-2 text-sm font-semibold">
          อีเมล
          <input
            className={fieldClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          รหัสผ่าน
          <input
            className={fieldClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {login.isError ? (
          <span className="text-[13px] text-red-600">อีเมลหรือรหัสผ่านไม่ถูกต้อง</span>
        ) : null}
        <button className={primaryButtonClass} type="submit">
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
}

function statusClass(status: FaqDto['status']) {
  const colors: Record<FaqDto['status'], string> = {
    published: 'bg-green-50 text-green-700',
    draft: 'bg-blue-50 text-blue-700',
    needs_review: 'bg-amber-50 text-amber-700',
    archived: 'bg-slate-100 text-slate-600',
  };
  return `inline-block w-max rounded-md px-2 py-1 text-xs not-italic ${colors[status]}`;
}

function statusLabel(status: FaqDto['status']) {
  return {
    published: 'เผยแพร่แล้ว',
    draft: 'ฉบับร่าง',
    needs_review: 'ต้องตรวจสอบ',
    archived: 'เก็บถาวร',
  }[status];
}

function FaqInspector({ faq, onClose }: { faq: FaqDto; onClose: () => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(faq);
  const save = useMutation({
    mutationFn: api.saveFaq,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-faqs'] }),
  });
  const publish = useMutation({
    mutationFn: () => api.publishFaq(faq.id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-faqs'] }),
  });
  return (
    <aside className="fixed inset-x-0 bottom-0 top-16 z-15 flex flex-col gap-5 overflow-auto border-l border-slate-200 bg-white p-6 shadow-[-12px_0_30px_rgb(0_0_0/0.07)] sm:top-[72px] lg:static lg:z-auto lg:shadow-none">
      <div className="flex justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold">{faq.question}</h2>
          <span className={statusClass(faq.status)}>{statusLabel(faq.status)}</span>
        </div>
        <button
          className="cursor-pointer text-slate-500 transition hover:text-slate-900"
          type="button"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X />
        </button>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        คำถามหลัก
        <textarea
          className={`${fieldClass} min-h-[70px] resize-y leading-relaxed`}
          value={draft.question}
          onChange={(event) => setDraft({ ...draft, question: event.target.value })}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        คำถามรูปแบบอื่น
        <input
          className={fieldClass}
          value={draft.variants.join(', ')}
          onChange={(event) =>
            setDraft({
              ...draft,
              variants: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        คำตอบ
        <textarea
          className={`${fieldClass} min-h-[135px] resize-y leading-relaxed`}
          value={draft.answer}
          onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        หมวดหมู่
        <input
          className={fieldClass}
          value={draft.category}
          onChange={(event) => setDraft({ ...draft, category: event.target.value })}
        />
      </label>
      <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-600">
        <Database className="shrink-0" size={18} />
        <span className="grid">
          <strong>Embedding พร้อมใช้งาน</strong>
          <small className="mt-1 text-slate-500">อัปเดตเมื่อเผยแพร่ FAQ</small>
        </span>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <button
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition hover:bg-slate-50"
          type="button"
          onClick={() => save.mutate({ ...draft, status: 'draft' })}
        >
          บันทึกฉบับร่าง
        </button>
        <button className={primaryButtonClass} type="button" onClick={() => publish.mutate()}>
          เผยแพร่
        </button>
      </div>
    </aside>
  );
}

function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [selected, setSelected] = useState<FaqDto | null>(null);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: api.adminFaqs,
    enabled: authenticated,
  });
  const rows = useMemo(
    () =>
      query.data?.filter((faq) =>
        `${faq.question} ${faq.answer}`.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [query.data, search],
  );
  if (!authenticated) {
    return (
      <AppShell>
        <Login onDone={() => setAuthenticated(true)} />
      </AppShell>
    );
  }
  return (
    <AppShell>
      <div
        className={`grid min-h-[calc(100vh-72px)] ${
          selected ? 'lg:grid-cols-[minmax(620px,1.9fr)_minmax(360px,1fr)]' : 'grid-cols-1'
        }`}
      >
        <section className="min-w-0 px-4 py-7 sm:px-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className={pageTitleClass}>คลังคำถาม</h1>
              <p className="text-slate-500">จัดการคำถามและคำตอบที่บอตใช้ในการตอบผู้ใช้งาน</p>
            </div>
            <button type="button" className={primaryButtonClass}>
              <Plus size={18} />
              <span className="hidden sm:inline">เพิ่ม FAQ</span>
            </button>
          </div>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            <label className="mr-3 flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:w-auto sm:min-w-[280px]">
              <Search className="shrink-0 text-slate-500" size={18} />
              <input
                className="w-full border-0 outline-none"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาคำถามหรือคำตอบ"
              />
            </label>
            {['ทั้งหมด', 'เผยแพร่แล้ว', 'ฉบับร่าง', 'ต้องตรวจสอบ'].map((label, index) => (
              <button
                className={`cursor-pointer whitespace-nowrap rounded-lg border px-3 py-2 text-sm ${
                  index === 0
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                type="button"
                key={label}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <div className="grid min-h-12 min-w-[760px] grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_70px] items-center border-b border-slate-200 px-4 text-left text-[13px] font-semibold text-slate-600">
              <span>คำถาม</span>
              <span>หมวดหมู่</span>
              <span>สถานะ</span>
              <span>อัปเดตล่าสุด</span>
              <span>การทำงาน</span>
            </div>
            {rows.map((faq) => (
              <button
                type="button"
                className={`grid min-h-[58px] w-full min-w-[760px] cursor-pointer grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_70px] items-center border-b border-slate-200 px-4 text-left text-slate-700 transition last:border-b-0 hover:bg-green-50/50 ${
                  selected?.id === faq.id
                    ? 'bg-green-50 outline-1 -outline-offset-1 outline-green-600'
                    : 'bg-white'
                }`}
                key={faq.id}
                onClick={() => setSelected(faq)}
              >
                <span>{faq.question}</span>
                <span>{faq.category}</span>
                <span>
                  <i className={statusClass(faq.status)}>{statusLabel(faq.status)}</i>
                </span>
                <span>{new Date(faq.updatedAt).toLocaleDateString('th-TH')}</span>
                <span>
                  <Pencil size={17} />
                </span>
              </button>
            ))}
          </div>
          {query.isLoading ? (
            <p className="py-4 text-center text-slate-500">กำลังโหลดคลังคำถาม…</p>
          ) : null}
          {query.isError ? <p className="py-4 text-center text-red-600">โหลดข้อมูลไม่สำเร็จ</p> : null}
        </section>
        {selected ? <FaqInspector faq={selected} onClose={() => setSelected(null)} /> : null}
      </div>
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
