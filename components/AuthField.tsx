"use client";

export default function AuthField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoCapitalize?: "off" | "characters";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
