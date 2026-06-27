import Link from "next/link";
import type { ComponentProps } from "react";

export const mdxComponents = {
  h2: (p: ComponentProps<"h2">) => (
    <h2 className="font-serif text-[25px] font-semibold tracking-tight mt-9 mb-3" {...p} />
  ),
  h3: (p: ComponentProps<"h3">) => (
    <h3 className="font-mono text-[13px] font-bold uppercase tracking-wide mt-7 mb-2.5" {...p} />
  ),
  p: (p: ComponentProps<"p">) => (
    <p className="text-[15.5px] leading-[1.75] mb-[22px] text-ink" {...p} />
  ),
  a: ({ href = "#", ...p }: ComponentProps<"a">) => (
    <Link href={href} className="text-wire-d underline underline-offset-[3px] hover:text-signal" {...p} />
  ),
  ul: (p: ComponentProps<"ul">) => <ul className="mb-[22px] pl-0 list-none space-y-2.5" {...p} />,
  ol: (p: ComponentProps<"ol">) => <ol className="mb-[22px] pl-6 list-decimal space-y-2.5" {...p} />,
  li: (p: ComponentProps<"li">) => (
    <li className="relative pl-6 text-[15.5px] leading-[1.6] before:content-['▸'] before:absolute before:left-0 before:text-signal before:font-bold" {...p} />
  ),
  blockquote: (p: ComponentProps<"blockquote">) => (
    <blockquote className="my-8 pl-6 border-l-[3px] border-signal font-serif italic text-[25px] leading-[1.35] font-medium text-ink" {...p} />
  ),
  table: (p: ComponentProps<"table">) => (
    <div className="overflow-x-auto mb-6">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: (p: ComponentProps<"th">) => (
    <th className="text-left align-top p-[11px_14px] border-b border-line bg-panel font-mono text-[12.5px] font-bold text-ink" {...p} />
  ),
  td: (p: ComponentProps<"td">) => (
    <td className="text-left align-top p-[11px_14px] border-b border-line text-ink-2" {...p} />
  ),
  hr: (p: ComponentProps<"hr">) => <hr className="border-0 border-t border-line my-8" {...p} />,
};
