import type { ReactNode } from "react";
import { Zap } from "lucide-react";

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
        <Zap size={22} strokeWidth={2.5} />
      </div>
      <div className="text-left">
        <h1 className="text-lg font-bold leading-tight text-slate-900">SmartOps</h1>
        <p className="text-xs leading-tight text-slate-500">AI General Manager</p>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Brand />
        </div>
        {children}
      </div>
    </div>
  );
}
