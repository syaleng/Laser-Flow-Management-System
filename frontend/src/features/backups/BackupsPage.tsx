import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, DatabaseBackup, Download, FileArchive, HardDrive, RefreshCw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { createBackup, deleteBackup, downloadBackup, getBackups, restoreBackup, type SystemBackup } from "./api";

const backupKey = ["system-backups"] as const;
const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export function BackupsPage() {
  const client = useQueryClient();
  const backups = useQuery({ queryKey: backupKey, queryFn: getBackups });
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const refresh = () => void client.invalidateQueries({ queryKey: backupKey });

  const create = useMutation({ mutationFn: createBackup, onSuccess: (value) => { refresh(); setError(""); setMessage(`Backup جوړ شو: ${value.filename}`); }, onError: (value) => setError(value instanceof ApiError ? value.message : "Backup جوړ نه شو.") });
  const remove = useMutation({ mutationFn: deleteBackup, onSuccess: refresh, onError: (value) => setError(value instanceof ApiError ? value.message : "Backup حذف نه شو.") });
  const restore = useMutation({ mutationFn: restoreBackup, onSuccess: () => { setMessage("معلومات په بریالیتوب بېرته راوګرځول شول. مهرباني وکړئ بیا Login شئ."); setError(""); setRestoreOpen(false); window.setTimeout(() => window.location.assign("/login"), 1800); }, onError: (value) => setError(value instanceof ApiError ? value.message : "Restore ناکام شو.") });

  const submitRestore = () => {
    const selectedFile = fileInputRef.current?.files?.[0] ?? file;
    const enteredPassword = passwordInputRef.current?.value || password;
    const enteredConfirmation = (confirmationInputRef.current?.value || confirmation).trim();
    if (!selectedFile || !enteredPassword || enteredConfirmation !== "RESTORE") { setError("فایل، Password او د RESTORE تایید ټول ضروري دي."); return; }
    if (!window.confirm("اوسني ټول معلومات به د دې Backup په معلوماتو بدل شي. ایا ډاډه یاست؟")) return;
    setError(""); restore.mutate({ file: selectedFile, password: enteredPassword });
  };

  return <div className="backup-page space-y-5" dir="rtl">
    <section className="backup-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-blue-950/15 sm:p-8">
      <div className="backup-hero-glow absolute -bottom-24 -left-16 size-72 rounded-full" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-inner"><DatabaseBackup className="size-7 text-blue-100" /></span><div><p className="text-xs font-bold text-blue-200">د معلوماتو خوندي مرکز</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Backup او Restore</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">Database، مشتریان، حسابونه، فرمایشونه او ضمیمه فایلونه په یوه خوندي فایل کې وساتئ.</p></div></div>
        <button type="button" disabled={create.isPending} onClick={() => create.mutate()} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"><DatabaseBackup className="size-5" />{create.isPending ? "Backup جوړېږي…" : "نوی Backup واخلئ"}</button>
      </div>
    </section>

    {(message || error) && <div role="status" className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}{error || message}</div>}

    <div className="grid gap-4 md:grid-cols-3">
      {[{ icon: ShieldCheck, title: "خوندي او تایید شوی", text: "د هر Backup بشپړوالی د ځانګړې نښې له لارې تاییدېږي.", tone: "blue" }, { icon: HardDrive, title: "بشپړ معلومات", text: "Database او ټول media فایلونه په ګډه خوندي کېږي.", tone: "violet" }, { icon: CalendarClock, title: "منظم تاریخچه", text: "د جوړېدو نېټه، وخت، اندازه او جوړوونکی ثبتېږي.", tone: "emerald" }].map(({icon: Icon, title, text, tone}) => <article key={title} className="group flex min-h-28 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"}`}><Icon className="size-5" /></span><div className="min-w-0 pt-0.5"><h2 className="font-black text-slate-900">{title}</h2><p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p></div></article>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4"><div><h2 className="font-black text-slate-950">خوندي شوي Backup فایلونه</h2><p className="mt-1 text-xs text-slate-500">ټول فایلونه: {backups.data?.length ?? 0}</p></div><button type="button" aria-label="فایلونه تازه کول" onClick={() => void backups.refetch()} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-600"><RefreshCw className={`size-4 ${backups.isFetching ? "animate-spin" : ""}`} /></button></div>
      <div className="divide-y divide-slate-100">{backups.data?.map((backup) => <BackupRow key={backup.filename} backup={backup} onDelete={() => { if (window.confirm("دا Backup فایل حذف شي؟")) remove.mutate(backup.filename); }} />)}{backups.isLoading && <p className="p-10 text-center text-sm text-slate-500">فایلونه راخیستل کېږي…</p>}{!backups.isLoading && backups.data?.length === 0 && <p className="p-10 text-center text-sm text-slate-500">تر اوسه Backup نشته. لومړی Backup جوړ کړئ.</p>}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-amber-50 px-5 py-4"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="size-5" /></span><div><h2 className="font-black text-amber-950">معلومات بېرته راګرځول</h2><p className="mt-1 text-xs leading-5 text-amber-800">Restore اوسني معلومات بدلوي؛ یوازې د اړتیا پر وخت یې وکاروئ.</p></div></div><button type="button" onClick={() => setRestoreOpen(!restoreOpen)} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700"><Upload className="size-4" />{restoreOpen ? "برخه بندول" : "Restore فایل ټاکل"}</button></div>
      {restoreOpen && <div className="grid gap-4 border-t border-amber-100 p-5 md:grid-cols-3"><label className="text-xs font-bold text-slate-700">Backup ZIP<input ref={fileInputRef} type="file" accept=".zip,application/zip" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5" /></label><label className="text-xs font-bold text-slate-700">ستاسو Password<input ref={passwordInputRef} type="password" autoComplete="current-password" value={password} onInput={(event) => { setPassword(event.currentTarget.value); setError(""); }} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-700">د تایید لپاره RESTORE ولیکئ<input ref={confirmationInputRef} dir="ltr" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left" /></label><button type="button" disabled={restore.isPending} onClick={submitRestore} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60 md:col-span-3">{restore.isPending ? "معلومات راګرځي…" : "Restore تایید او اجرا کړئ"}</button></div>}
    </section>
  </div>;
}

function BackupRow({ backup, onDelete }: { backup: SystemBackup; onDelete: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-blue-50/40"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><FileArchive className="size-5" /></span><div className="min-w-0"><p dir="ltr" className="truncate text-left text-sm font-black text-slate-900">{backup.filename}</p><p className="mt-1 text-xs text-slate-500">{new Date(backup.created_at).toLocaleString("ps-AF")} · {sizeLabel(backup.size)} · {backup.created_by}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void downloadBackup(backup.filename)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"><Download className="size-4" />کښته کول</button><button type="button" aria-label="Backup حذفول" onClick={onDelete} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100"><Trash2 className="size-4" /></button></div></div>;
}
