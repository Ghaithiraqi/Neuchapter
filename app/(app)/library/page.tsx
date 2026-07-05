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

// ─── Unit Accordion ───────────────────────────────────────────────────────────

function UnitRow({
  unit,
  initialOpen = false,
  shouldScroll = false,
}: {
  unit: Unit;
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
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          margin: 0,
          marginBottom: pi < text.split('\n\n').length - 1 ? 10 : 0,
        }}
        dangerouslySetInnerHTML={{
          __html: para
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>')
            .replace(/\n/g, '<br/>'),
        }}
      />
    ));
  };

  return (
    <div
      ref={rowRef}
      style={{
        border: shouldScroll ? '1px solid var(--gold-primary)' : '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-small)',
        overflow: 'hidden',
        background: open ? 'var(--bg-elevated)' : 'var(--bg-card)',
        transition: 'background 0.2s ease, border-color 0.3s ease',
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
          gap: 12,
          textAlign: 'right',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            color: 'var(--gold-primary)',
            fontWeight: 700,
            width: 28,
            flexShrink: 0,
            textAlign: 'center',
          }}
        >
          {unit.unitNumber === 99 ? '✦' : unit.unitNumber}
        </span>
        <div
          style={{
            width: 1,
            height: 20,
            background: 'var(--border-mid)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-primary)',
            fontWeight: open ? 600 : 400,
            textAlign: 'right',
            transition: 'font-weight 0.15s',
          }}
        >
          {unit.unitTitle}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            flexShrink: 0,
            display: 'inline-block',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>

      {/* المحتوى الكامل */}
      {open && (
        <div
          style={{
            padding: '0 16px 16px',
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ paddingTop: 14 }}>
            {renderContent(unit.content)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────

const BOOK_COLORS: Record<string, string> = {
  atomic_habits:     '#E8B872',
  seven_habits:      '#7FA88C',
  your_brain_on_porn: '#A78BFA',
};

function BookCard({ book, onSelect }: { book: Book; onSelect: () => void }) {
  const color = BOOK_COLORS[book.bookSlug] ?? 'var(--gold-primary)';
  // اسم عربي قصير: ما قبل القوس الأول
  const shortTitle = book.bookTitle.split('(')[0].trim();

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '18px 20px',
        background: 'var(--bg-card)',
        border: `1px solid ${color}30`,
        borderRadius: 'var(--radius-card)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        textAlign: 'right',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* شريط اللون */}
      <div
        style={{
          width: 4,
          height: 52,
          borderRadius: 4,
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            color: 'var(--text-primary)',
            fontWeight: 700,
            marginBottom: 5,
            lineHeight: 1.4,
          }}
        >
          {shortTitle}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          {book.unitCount} وحدة
        </div>
      </div>
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="var(--text-muted)"
        style={{ flexShrink: 0, transform: 'scaleX(-1)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
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

  const color = selectedBook
    ? (BOOK_COLORS[selectedBook.bookSlug] ?? 'var(--gold-primary)')
    : 'var(--gold-primary)';

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        minHeight: 'calc(100vh - 110px)',
        padding: '24px 20px 100px',
      }}
    >
      {/* ─── هيدر ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {selectedBook ? (
          <button
            onClick={backToBooks}
            style={{
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            ← رجوع
          </button>
        ) : (
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            ← الرئيسية
          </button>
        )}

        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--text-primary)',
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {selectedBook ? selectedBook.bookTitle.split('(')[0].trim() : 'المكتبة'}
          </h1>
          {!selectedBook && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-muted)',
                margin: '3px 0 0',
              }}
            >
              المعرفة العلمية من الكتب الثلاثة
            </p>
          )}
          {selectedBook && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: color,
                margin: '3px 0 0',
                opacity: 0.8,
              }}
            >
              {units.length > 0 ? `${units.length} وحدة` : ''}
            </p>
          )}
        </div>
      </div>

      {/* ─── قائمة الكتب ───────────────────────────────────────────────────── */}
      {!selectedBook && (
        <>
          {booksLoading && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
              }}
            >
              <div style={{ marginBottom: 8, fontSize: 24 }}>📚</div>
              جارٍ التحميل...
            </div>
          )}

          {booksError && (
            <div
              style={{
                textAlign: 'center',
                padding: 32,
                color: 'var(--alert-warm)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                background: 'rgba(216,90,48,0.06)',
                border: '1px solid rgba(216,90,48,0.2)',
                borderRadius: 'var(--radius-card)',
              }}
            >
              {booksError}
            </div>
          )}

          {!booksLoading && !booksError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {books.map((book) => (
                <BookCard
                  key={book.bookSlug}
                  book={book}
                  onSelect={() => openBook(book)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── وحدات الكتاب ──────────────────────────────────────────────────── */}
      {selectedBook && (
        <>
          {/* شريط ملوّن */}
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: color,
              marginBottom: 20,
              opacity: 0.6,
            }}
          />

          {unitsLoading && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
              }}
            >
              <div style={{ marginBottom: 8, fontSize: 22 }}>⏳</div>
              جارٍ تحميل الوحدات...
            </div>
          )}

          {unitsError && (
            <div
              style={{
                textAlign: 'center',
                padding: 32,
                color: 'var(--alert-warm)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                background: 'rgba(216,90,48,0.06)',
                border: '1px solid rgba(216,90,48,0.2)',
                borderRadius: 'var(--radius-card)',
              }}
            >
              {unitsError}
            </div>
          )}

          {!unitsLoading && units.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {units.map((unit) => {
                const isTarget = unitParam !== null && unit.unitNumber === unitParam;
                return (
                  <UnitRow
                    key={unit.unitNumber}
                    unit={unit}
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
    <Suspense
      fallback={
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          جاري التحميل...
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
