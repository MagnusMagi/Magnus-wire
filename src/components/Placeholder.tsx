export function Placeholder({
  label,
  ratio = "aspect-[4/3]",
}: {
  label: string;
  ratio?: string;
}) {
  return (
    <div
      className={`grid place-items-center ${ratio} border border-line text-ink-3 text-[10px] tracking-[0.22em]`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--color-panel) 0 11px, #dcd8cd 11px 22px)",
      }}
    >
      {label}
    </div>
  );
}
