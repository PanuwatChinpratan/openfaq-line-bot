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

function Header() {
  return (
    <header className="topbar">
      <NavLink className="brand" to="/chat" aria-label="OpenFAQ Bot home">
        <span className="brand-mark">
          <Bot size={22} />
        </span>
        <span>OpenFAQ Bot</span>
      </NavLink>
      <nav aria-label="หลัก">
        <NavLink to="/chat">
          <MessageSquare size={18} />
          Chat Demo
        </NavLink>
        <NavLink to="/knowledge">
          <BookOpen size={18} />
          Knowledge
        </NavLink>
        <NavLink to="/architecture">
          <GitBranch size={18} />
          Architecture
        </NavLink>
        <NavLink to="/admin">
          <ShieldCheck size={18} />
          Admin
        </NavLink>
      </nav>
      <a className="github-link" href="https://github.com" target="_blank" rel="noreferrer">
        GitHub
      </a>
    </header>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}

function TraceRail({ result, loading }: { result: ChatResponse; loading: boolean }) {
  return (
    <aside className="trace" aria-label="Retrieval trace">
      <div className="panel-heading">
        <div>
          <h2>Retrieval trace</h2>
          <p>ขั้นตอนค้นหาคำตอบจริง</p>
        </div>
        <Database size={20} />
      </div>
      <div className="trace-list">
        {result.trace.map((item, index) => (
          <div className={`trace-step ${item.stage === 'rrf' ? 'final' : ''}`} key={item.stage}>
            <span className="step-number">{index + 1}</span>
            <div className="trace-card">
              <div>
                <strong>
                  {item.stage === 'rrf'
                    ? 'RRF (รวมคะแนน)'
                    : `${item.stage[0].toUpperCase()}${item.stage.slice(1)}`}
                </strong>
                <span>{loading ? '…' : item.score.toFixed(2)}</span>
              </div>
              <p>{item.title}</p>
              <small>{item.candidateId}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="confidence">
        <div>
          <strong>Confidence</strong>
          <span>
            {result.confidence.toFixed(2)}{' '}
            <small>
              {result.confidence >= 0.78 ? 'สูง' : result.confidence >= 0.58 ? 'ปานกลาง' : 'ต่ำ'}
            </small>
          </span>
        </div>
        <div className="meter">
          <i style={{ width: `${result.confidence * 100}%` }} />
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
      <section className="page-heading">
        <h1>ลองถามคำถามร้านค้า</h1>
        <p>Hybrid search ทำงานได้แม้ไม่เปิด AI</p>
      </section>
      <div className="chat-layout">
        <section className="chat-panel">
          <div className="messages" aria-live="polite">
            <div className="day">วันนี้</div>
            <div className="message user">
              {question}
              <span>
                10:14 <Check size={14} />
              </span>
            </div>
            <div className="assistant-row">
              <span className="bot-avatar">
                <Bot size={24} />
              </span>
              <div>
                <div className="message assistant">
                  {mutation.isPending
                    ? 'กำลังค้นหาคำตอบ…'
                    : mutation.isError
                      ? 'เชื่อมต่อ API ไม่สำเร็จ กรุณาลองอีกครั้ง'
                      : result.answer}
                  {result.source && (
                    <a href={`/knowledge#${result.source.faqId}`}>
                      <BookOpen size={16} />
                      อ้างอิง: {result.source.title}
                    </a>
                  )}
                </div>
                <div className="feedback">
                  <button type="button">
                    <ThumbsUp size={18} />
                    ช่วยได้
                  </button>
                  <button type="button">
                    <ThumbsDown size={18} />
                    ไม่ตรงคำถาม
                  </button>
                </div>
              </div>
            </div>
          </div>
          <form className="composer" onSubmit={submit}>
            <MessageSquare size={20} />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="พิมพ์คำถาม เช่น คืนสินค้าได้ไหม"
              aria-label="คำถาม"
            />
            <button disabled={mutation.isPending} type="submit">
              <Send size={18} />
              ส่ง
            </button>
          </form>
        </section>
        <TraceRail result={result} loading={mutation.isPending} />
      </div>
      <footer className="statusbar">
        <span>
          <i />
          ระบบทำงานปกติ
        </span>
        <span>
          โหมด: <strong>{result.mode === 'local-ai' ? 'Local AI' : 'Public Lite'}</strong>
        </span>
        <span>
          Hybrid search: <strong>เปิด</strong>
        </span>
        <span>
          AI: <strong>{result.mode === 'local-ai' ? 'เปิด' : 'ปิด'}</strong>
        </span>
      </footer>
    </AppShell>
  );
}

function KnowledgePage() {
  const query = useQuery({ queryKey: ['faqs'], queryFn: api.faqs });
  return (
    <AppShell>
      <section className="page-heading">
        <h1>Knowledge</h1>
        <p>คำตอบที่เผยแพร่และใช้เป็นแหล่งอ้างอิงของบอต</p>
      </section>
      <section className="knowledge-list">
        {query.isLoading && <p>กำลังโหลด…</p>}
        {query.isError && <p>ยังเชื่อมต่อ API ไม่ได้</p>}
        {query.data?.map((faq) => (
          <article id={faq.id} key={faq.id}>
            <span>{faq.category}</span>
            <h2>{faq.question}</h2>
            <p>{faq.answer}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}

function ArchitecturePage() {
  const steps = [
    'LINE Webhook',
    'Normalize',
    'Exact + Fuzzy',
    'Vector Search',
    'RRF + Confidence',
    'Flex Reply',
  ];
  return (
    <AppShell>
      <section className="page-heading">
        <h1>Architecture</h1>
        <p>เล็กพอให้เข้าใจ แต่ครบพอให้ใช้งานจริง</p>
      </section>
      <section className="architecture-flow">
        {steps.map((step, index) => (
          <div key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
            {index < steps.length - 1 && <ChevronRight />}
          </div>
        ))}
      </section>
      <div className="architecture-copy">
        <section>
          <h2>Retrieval first</h2>
          <p>
            ระบบค้นจากข้อมูลที่เผยแพร่แล้วเท่านั้น Exact match ตอบได้ทันที ส่วน fuzzy และ vector จะรวมอันดับด้วย RRF
          </p>
        </section>
        <section>
          <h2>AI เป็น optional</h2>
          <p>
            Public Lite ส่งคำตอบมาตรฐานโดยตรง Local AI ใช้ Ollama เรียบเรียงเฉพาะ context ที่ผ่าน
            confidence threshold
          </p>
        </section>
        <section>
          <h2>Safe by default</h2>
          <p>ตรวจ LINE signature, mask ข้อมูลสำคัญ, กัน webhook ซ้ำ และไม่ให้ LLM เข้าถึงฐานข้อมูลโดยตรง</p>
        </section>
      </div>
    </AppShell>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('admin@openfaq.local');
  const [password, setPassword] = useState('');
  const login = useMutation({ mutationFn: () => api.login(email, password), onSuccess: onDone });
  return (
    <div className="login">
      <LogIn size={28} />
      <h1>เข้าสู่ระบบ Admin</h1>
      <p>สำหรับเจ้าของคลังคำถามเท่านั้น</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
        <label>
          อีเมล
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          รหัสผ่าน
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {login.isError && <span className="form-error">อีเมลหรือรหัสผ่านไม่ถูกต้อง</span>}
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
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
    <aside className="inspector">
      <div className="inspector-head">
        <div>
          <h2>{faq.question}</h2>
          <span className={`status ${faq.status}`}>
            {faq.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="ปิด">
          <X />
        </button>
      </div>
      <label>
        คำถามหลัก
        <textarea
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
        />
      </label>
      <label>
        คำถามรูปแบบอื่น
        <input
          value={draft.variants.join(', ')}
          onChange={(e) =>
            setDraft({
              ...draft,
              variants: e.target.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label>
        คำตอบ
        <textarea
          className="answer-input"
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
        />
      </label>
      <label>
        หมวดหมู่
        <input
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        />
      </label>
      <div className="embedding-state">
        <Database size={18} />
        <span>
          <strong>Embedding พร้อมใช้งาน</strong>
          <small>อัปเดตเมื่อเผยแพร่ FAQ</small>
        </span>
      </div>
      <div className="inspector-actions">
        <button type="button" onClick={() => save.mutate({ ...draft, status: 'draft' })}>
          บันทึกฉบับร่าง
        </button>
        <button className="primary" type="button" onClick={() => publish.mutate()}>
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
  if (!authenticated)
    return (
      <AppShell>
        <Login onDone={() => setAuthenticated(true)} />
      </AppShell>
    );
  return (
    <AppShell>
      <div className={`admin-layout ${selected ? 'has-inspector' : ''}`}>
        <section className="admin-main">
          <div className="admin-title">
            <div>
              <h1>คลังคำถาม</h1>
              <p>จัดการคำถามและคำตอบที่บอตใช้ในการตอบผู้ใช้งาน</p>
            </div>
            <button type="button" className="primary">
              <Plus size={18} />
              เพิ่ม FAQ
            </button>
          </div>
          <div className="table-tools">
            <label>
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาคำถามหรือคำตอบ"
              />
            </label>
            <button type="button" className="active">
              ทั้งหมด
            </button>
            <button type="button">เผยแพร่แล้ว</button>
            <button type="button">ฉบับร่าง</button>
            <button type="button">ต้องตรวจสอบ</button>
          </div>
          <div className="faq-table">
            <div className="table-row table-head">
              <span>คำถาม</span>
              <span>หมวดหมู่</span>
              <span>สถานะ</span>
              <span>อัปเดตล่าสุด</span>
              <span>การทำงาน</span>
            </div>
            {rows.map((faq) => (
              <button
                type="button"
                className={`table-row ${selected?.id === faq.id ? 'selected' : ''}`}
                key={faq.id}
                onClick={() => setSelected(faq)}
              >
                <span>{faq.question}</span>
                <span>{faq.category}</span>
                <span>
                  <i className={`status ${faq.status}`}>
                    {faq.status === 'published'
                      ? 'เผยแพร่แล้ว'
                      : faq.status === 'needs_review'
                        ? 'ต้องตรวจสอบ'
                        : 'ฉบับร่าง'}
                  </i>
                </span>
                <span>{new Date(faq.updatedAt).toLocaleDateString('th-TH')}</span>
                <span>
                  <Pencil size={17} />
                </span>
              </button>
            ))}
          </div>
          {query.isLoading && <p className="table-state">กำลังโหลดคลังคำถาม…</p>}
          {query.isError && <p className="table-state">โหลดข้อมูลไม่สำเร็จ</p>}
        </section>
        {selected && <FaqInspector faq={selected} onClose={() => setSelected(null)} />}
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
