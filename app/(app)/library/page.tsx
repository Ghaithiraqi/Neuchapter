'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Book {
  bookSlug: string;
  bookTitle: string;
  unitCount: number;
}

interface Unit {
  unitNumber: number;
  unitTitle: string;
  content: string;
}

// ─── Design tokens (local, matches analysis/chat/settings) ────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 20,
};

const BOOK_COLORS: Record<string, string> = {
  atomic_habits: '#2EBE80',
  seven_habits: '#376EC8',
  your_brain_on_porn: '#4A3CB4',
};
const DEFAULT_COLOR = '#5DCDA5';

// ─── Loading dots ─────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '40px 0' }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCDA5', animation: `blink 1.2s ease-in-out ${d}s infinite` }} />
      ))}
    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#9CA6BD',
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── Unit Accordion ───────────────────────────────────────────────────────────

function UnitRow({
  unit,
  color,
  initialOpen = false,
  shouldScroll = false,
}: {
  unit: Unit;
  color: string;
  initialOpen?: boolean;
  shouldScroll?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldScroll && rowRef.current) {
      const t = setTimeout(
        () => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        120
      );
      return () => clearTimeout(t);
    }
  }, [shouldScroll]);

  // تنسيق المحتوى: **نص** → bold، أسطر فارغة → فقرات
  const renderContent = (text: string) => {
    return text.split('\n\n').map((para, pi) => (
      <p
        key={pi}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          color: '#B6BFCF',
          lineHeight: 1.85,
          margin: 0,
          marginBottom: pi < text.split('\n\n').length - 1 ? 10 : 0,
        }}
        dangerouslySetInnerHTML={{
          __html: para
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#EAF2EE;font-weight:600">$1</strong>')
            .replace(/\n/g, '<br/>'),
        }}
      />
    ));
  };

  return (
    <div
      ref={rowRef}
      style={{
        border: shouldScroll ? `1px solid ${color}80` : '1px solid rgba(255,255,255,.07)',
        borderRadius: 16,
        overflow: 'hidden',
        background: open ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.025)',
        boxShadow: shouldScroll ? `0 0 24px ${color}25` : 'none',
        transition: 'background 0.3s ease, border-color 0.4s ease',
      }}
    >
      {/* عنوان الوحدة — قابل للنقر */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          textAlign: 'right',
          minHeight: 44,
        }}
      >
        <span
          style={{
            width: 28, height: 28, borderRadius: 9, flexShrink: 0,
            background: `${color}1F`,
            color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
          }}
        >
          {unit.unitNumber === 99 ? '✦' : unit.unitNumber}
        </span>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: '#EAF2EE',
            fontWeight: open ? 600 : 400,
            textAlign: 'right',
            transition: 'font-weight 0.2s',
          }}
        >
          {unit.unitTitle}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#6B7A8C',
            flexShrink: 0,
            display: 'inline-block',
            transition: 'transform 0.3s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>

      {/* المحتوى الكامل */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ paddingTop: 14 }}>
            {renderContent(unit.content)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────

function BookCard({ book, onSelect }: { book: Book; onSelect: () => void }) {
  const color = BOOK_COLORS[book.bookSlug] ?? DEFAULT_COLOR;
  // اسم عربي قصير: ما قبل القوس الأول
  const shortTitle = book.bookTitle.split('(')[0].trim();

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '18px 18px',
        ...CARD,
        borderColor: `${color}30`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        textAlign: 'right',
        transition: 'border-color 0.3s ease, background 0.3s ease',
        minHeight: 44,
      }}
    >
      <span
        style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: `linear-gradient(140deg, ${color}2A, ${color}10)`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 014 18.5v-13z" strokeLinejoin="round" />
          <path d="M20 5.5C20 4.7 19.3 4 18.5 4H12v16h6.5a1.5 1.5 0 001.5-1.5v-13z" strokeLinejoin="round" />
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15.5,
            color: '#EAF2EE',
            fontWeight: 700,
            marginBottom: 4,
            lineHeight: 1.4,
          }}
        >
          {shortTitle}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#8A93A6' }}>
          {book.unitCount} وحدة
        </div>
      </div>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="#808AA0" style={{ flexShrink: 0, transform: 'scaleX(-1)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: 'center', padding: '28px 22px',
        color: '#D85A30', fontFamily: 'var(--font-body)', fontSize: 13,
        background: 'rgba(216,90,48,.06)', border: '1px solid rgba(216,90,48,.2)', borderRadius: 20,
      }}
    >
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookParam = searchParams.get('book');
  const unitParam = searchParams.get('unit') ? parseInt(searchParams.get('unit')!, 10) : null;

  // حالة القائمة
  const [books, setBooks]               = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError]     = useState('');

  // حالة الكتاب المختار
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [units, setUnits]               = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError]     = useState('');

  // ─── جلب قائمة الكتب ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/knowledge/books')
      .then((r) => r.json())
      .then((d: { books?: Book[]; error?: string }) => {
        if (d.books) setBooks(d.books);
        else setBooksError(d.error ?? 'خطأ في جلب الكتب');
      })
      .catch(() => setBooksError('تعذّر الاتصال'))
      .finally(() => setBooksLoading(false));
  }, []);

  // ─── فتح كتاب تلقائيًا عند وجود bookParam ─────────────────────────────────
  useEffect(() => {
    if (!booksLoading && bookParam && books.length > 0 && !selectedBook) {
      const book = books.find((b) => b.bookSlug === bookParam);
      if (book) openBook(book);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booksLoading, books]);

  // ─── جلب وحدات كتاب ───────────────────────────────────────────────────────
  const openBook = async (book: Book) => {
    setSelectedBook(book);
    setUnits([]);
    setUnitsError('');
    setUnitsLoading(true);

    try {
      const res = await fetch(`/api/knowledge/book/${book.bookSlug}`);
      const d = await res.json() as { units?: Unit[]; error?: string };
      if (d.units) setUnits(d.units);
      else setUnitsError(d.error ?? 'خطأ في جلب الوحدات');
    } catch {
      setUnitsError('تعذّر الاتصال');
    } finally {
      setUnitsLoading(false);
    }
  };

  const backToBooks = () => {
    setSelectedBook(null);
    setUnits([]);
    setUnitsError('');
  };

  const color = selectedBook ? (BOOK_COLORS[selectedBook.bookSlug] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

  return (
    <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>

      {/* ─── هيدر ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {selectedBook ? (
          <BackButton onClick={backToBooks} label="رجوع لقائمة الكتب" />
        ) : (
          <BackButton onClick={() => router.push('/')} label="الرئيسية" />
        )}

        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 19, color: '#EAF2EE', lineHeight: 1.35 }}>
            {selectedBook ? selectedBook.bookTitle.split('(')[0].trim() : 'المكتبة'}
          </h1>
          {!selectedBook && (
            <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD' }}>
              المعرفة العلمية من الكتب الثلاثة
            </p>
          )}
          {selectedBook && (
            <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-body)', fontSize: 12, color, opacity: 0.85 }}>
              {units.length > 0 ? `${units.length} وحدة` : ''}
            </p>
          )}
        </div>
      </div>

      {/* ─── قائمة الكتب ───────────────────────────────────────────────────── */}
      {!selectedBook && (
        <>
          {booksLoading && <LoadingDots />}
          {booksError && <ErrorState message={booksError} />}
          {!booksLoading && !booksError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {books.map((book) => (
                <BookCard key={book.bookSlug} book={book} onSelect={() => openBook(book)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── وحدات الكتاب ──────────────────────────────────────────────────── */}
      {selectedBook && (
        <>
          {/* شريط ملوّن */}
          <div style={{ height: 3, borderRadius: 2, background: color, marginBottom: 20, opacity: 0.55 }} />

          {unitsLoading && <LoadingDots />}
          {unitsError && <ErrorState message={unitsError} />}

          {!unitsLoading && units.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 12 }}>
              {units.map((unit) => {
                const isTarget = unitParam !== null && unit.unitNumber === unitParam;
                return (
                  <UnitRow
                    key={unit.unitNumber}
                    unit={unit}
                    color={color}
                    initialOpen={isTarget}
                    shouldScroll={isTarget}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Export with Suspense (useSearchParams requires it) ───────────────────────

export default function LibraryPage() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <LibraryContent />
    </Suspense>
  );
}
