export function LTR({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate', display: 'inline-block' }}>
      {children}
    </span>
  );
}
