import { Fragment, type ReactNode } from "react";

// Tiny markdown renderer — just enough for the assistant's answers:
// **bold**, bullet lists, and pipe tables. No external dependency.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-t-${i}`}>{part}</Fragment>;
  });
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → spacing
    if (!line.trim()) {
      i++;
      continue;
    }

    // Table: a line with pipes followed by a --- separator row
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`tbl-${i}`} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700"
                  >
                    {renderInline(h, `th-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-slate-50/50">
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                      {renderInline(c, `td-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-2 list-disc space-y-1 pl-5">
          {items.map((it, ii) => (
            <li key={ii} className="text-slate-700">
              {renderInline(it, `li-${ii}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={`p-${i}`} className="my-2 leading-relaxed text-slate-700">
        {renderInline(line, `p-${i}`)}
      </p>,
    );
    i++;
  }

  return <div className="text-[15px]">{blocks}</div>;
}
