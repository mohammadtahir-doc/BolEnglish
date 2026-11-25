import React from "react";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-12">
      <section className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center mx-auto font-black text-2xl">
          404
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 font-semibold">
            This page does not exist.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-3d-primary transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Welcome Page</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
