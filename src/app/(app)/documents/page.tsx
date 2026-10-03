import Link from "next/link";
import { FileText, GitBranchPlus, Plus, Search } from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { thDate } from "@/lib/dates";
import { DOC_STATUSES, docStatus, revCmp, type DocRow } from "./shared";

export default async function DocumentsPage(props: PageProps<"/documents">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const showObsolete = sp.all === "1";
  const saved = typeof sp.saved === "string";

  const { supabase, role } = await getSession();
  let query = supabase.from("documents").select("*").order("doc_no").limit(1000);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["doc_no", "title_en", "title_th", "title_cn", "remark"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  const { data, error } = await query;
  const rows = (data ?? []) as DocRow[];

  // one entry per document: its newest revision, plus the older ones
  const docs = Object.values(rows.reduce<Record<string, DocRow[]>>((acc, r) => ((acc[r.doc_no] ??= []).push(r), acc), {}))
    .map((revs) => revs.sort((a, b) => revCmp(b.rev, a.rev)))
    .filter((revs) => showObsolete || revs.some((r) => r.status !== "Obsolete"));
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const href = (p: Record<string, string>) => `/documents?${new URLSearchParams({ ...(q ? { q } : {}), ...(showObsolete ? { all: "1" } : {}), ...p })}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:px-7">
      <section className="card flex flex-col gap-3 !p-3 sm:!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <form className="iwrap min-w-0 flex-1">
            {showObsolete && <input type="hidden" name="all" value="1" />}
            <Search className="ic prefix size-4" />
            <input name="q" defaultValue={q} className="input pl search" placeholder="ค้นหาเลขที่ / ชื่อเอกสาร…" aria-label="ค้นหาเอกสาร" />
          </form>
          {role === "editor" && <Link href="/documents/new" className="btn btn-primary"><Plus className="size-4" />เพิ่มเอกสาร</Link>}
        </div>
        <div className="hscroll sm:flex-wrap">
          {DOC_STATUSES.map((s) => (
            <span key={s.v} className="chip !cursor-default" style={{ paddingLeft: 5 }}>
              <span className={`pill sm ${s.tone}`}>{s.th}</span><span className="n">{count(s.v)}</span>
            </span>
          ))}
          <Link href={showObsolete ? `/documents${q ? `?q=${encodeURIComponent(q)}` : ""}` : href({ all: "1" })} className={`chip ${showObsolete ? "sel" : ""}`}>
            {showObsolete ? "ซ่อนเอกสารที่ยกเลิกแล้ว" : "แสดงเอกสารที่ยกเลิกแล้ว"}
          </Link>
        </div>
      </section>

      {saved && <p className="banner info small">บันทึกแล้ว</p>}
      {error && <p className="ierr">{error.message}</p>}
      <p className="small muted px-1">{docs.length} เอกสาร · กฎ: แก้เอกสารทุกครั้งให้เพิ่ม Rev. และเปลี่ยนฉบับเก่าเป็น “ยกเลิกแล้ว”</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {docs.length === 0 && <p className="muted py-6 text-center sm:col-span-2">ยังไม่มีเอกสาร</p>}
        {docs.map((revs) => {
          const cur = revs.find((r) => r.status !== "Obsolete") ?? revs[0];
          const st = docStatus(cur.status);
          const older = revs.filter((r) => r.id !== cur.id);
          return (
            <section key={cur.doc_no} className="scard">
              <div className="row" style={{ gap: 8 }}>
                <span className="kchip sm"><FileText className="size-4" /></span>
                <Link href={`/documents/${cur.id}`} className="mono small" style={{ fontWeight: 700, color: "var(--accentInk)" }}>{cur.doc_no}</Link>
                <span className="tagchip">Rev. {cur.rev}</span>
                <span className="flex-1" />
                <span className={`pill sm ${st?.tone ?? "t-grey"}`}>{st?.th ?? cur.status}</span>
              </div>
              <Link href={`/documents/${cur.id}`} className="block">
                <div className="desc">{cur.title_th || cur.title_en}</div>
                <div className="small muted truncate">{[cur.title_th ? cur.title_en : null, cur.title_cn].filter(Boolean).join(" · ")}</div>
              </Link>
              <div className="row small muted" style={{ gap: 6, flexWrap: "wrap" }}>
                <span>มีผล {cur.effective ? thDate(cur.effective) : "–"}</span>
                {cur.approved_by && <><span className="dot-sep" /><span>อนุมัติ {cur.approved_by}</span></>}
                <span className="flex-1" />
                {role === "editor" && (
                  <Link href={`/documents/new?from=${cur.id}`} className="link"><GitBranchPlus className="size-4" />Rev. ใหม่</Link>
                )}
              </div>
              {older.length > 0 && (
                <details className="small">
                  <summary className="cursor-pointer muted">ฉบับก่อนหน้า {older.length} ฉบับ</summary>
                  <div className="mt-1">
                    {older.map((o) => (
                      <Link key={o.id} href={`/documents/${o.id}`} className="row py-1 hover:underline" style={{ gap: 8 }}>
                        <span className="mono">Rev. {o.rev}</span>
                        <span className={`pill sm ${docStatus(o.status)?.tone ?? "t-grey"}`}>{docStatus(o.status)?.th ?? o.status}</span>
                        <span className="muted">{o.effective ? thDate(o.effective) : ""}</span>
                      </Link>
                    ))}
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
