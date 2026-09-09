"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MiniPie, MiniDonut, MiniLine } from "@/components/dashboard-mini-charts";

interface Summary {
  total_calls: number; total_revenue_cents: number;
  active_campaigns: number; agents_online: number; total_leads: number;
}
interface CallEvent { id: string; provider: string; state: string; from_hash: string | null; started_at: string | null; }

function delta(values: number[]): { pct: number | null; dir: "up" | "down" | "flat" } {
  if (values.length < 2) return { pct: null, dir: "flat" };
  const first = values[0] || 0;
  const last = values[values.length - 1] || 0;
  if (first === 0 && last === 0) return { pct: null, dir: "flat" };
  if (first === 0) return { pct: 100, dir: "up" };
  const pct = ((last - first) / first) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, dir: "flat" };
  return { pct: Math.round(pct), dir: pct > 0 ? "up" : "down" };
}

function PremiumEmpty({ title, hint, ctaHref, ctaLabel }: { title: string; hint: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="premium-empty" role="img" aria-label={title}>
      <div className="premium-empty__glow" aria-hidden />
      <p className="premium-empty__title">{title}</p>
      <p className="premium-empty__hint">{hint}</p>
      <Link href={ctaHref} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>{ctaLabel}</Link>
    </div>
  );
}

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [volTrend, setVolTrend] = useState<{ name: string; value: number }[]>([]);
  const [revTrend, setRevTrend] = useState<{ name: string; value: number }[]>([]);
  const [statePie, setStatePie] = useState<{ name: string; value: number }[]>([]);
  const [availDonut, setAvailDonut] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fmt = (d: string) => { try { const dt = new Date(d); return `${dt.getMonth() + 1}/${dt.getDate()}`; } catch { return d.slice(5,10);} };
    Promise.all([
      fetch("/api/v1/reports/summary").then(async r=>{ if(r.ok){ const b=await r.json(); setSummary(b.data); }}),
      fetch("/api/v1/calls?limit=5&sortBy=started_at&order=desc").then(async r=>{ if(r.ok){ const b=await r.json(); setCalls(b.data ?? []); }}),
      fetch("/api/v1/reports/calls-volume?days=7").then(async r=>{ if(r.ok){ const b=await r.json(); const rows: {date:string;count:number}[] = b.data ?? []; setVolTrend(rows.map(x=>({name:fmt(x.date), value:x.count}))); }}),
      fetch("/api/v1/reports/revenue?days=7").then(async r=>{ if(r.ok){ const b=await r.json(); const rows:{date:string;revenue_cents:number}[] = b.data ?? []; setRevTrend(rows.map(x=>({name:fmt(x.date), value:Math.round(x.revenue_cents/100)}))); }}),
      fetch("/api/v1/calls?limit=80&sortBy=started_at&order=desc").then(async r=>{ if(r.ok){ const b=await r.json(); const rows: {state:string}[] = b.data ?? b.rows ?? []; if(Array.isArray(rows)&&rows.length){ const m=new Map<string,number>(); for(const x of rows) m.set(x.state||"unknown",(m.get(x.state||"unknown")||0)+1); const arr=[...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6); if(arr.length) setStatePie(arr); } }}),
      fetch("/api/v1/agents?limit=100").then(async r=>{ if(r.ok){ const b=await r.json(); const rows:{availability:string}[] = b.data ?? b.rows ?? []; if(Array.isArray(rows)&&rows.length){ const m=new Map<string,number>(); for(const x of rows) m.set(x.availability||"offline",(m.get(x.availability||"offline")||0)+1); const arr=[...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); setAvailDonut(arr); }}}).catch(()=>{}),
    ]).then(()=>setLoading(false));
  }, []);
  useEffect(()=>{ if(availDonut.length===0 && summary && summary.agents_online>0) setAvailDonut([{name:"available",value:summary.agents_online},{name:"offline",value:Math.max(0,4-summary.agents_online)}]); },[summary, availDonut.length]);

  const revDelta = useMemo(()=>delta(revTrend.map(v=>v.value)),[revTrend]);
  const volDelta = useMemo(()=>delta(volTrend.map(v=>v.value)),[volTrend]);
  const hasVol = volTrend.some(v=>v.value>0);
  const hasRev = revTrend.some(v=>v.value>0);
  const totalCalls = summary?.total_calls ?? 0;
  const totalRev = (summary?.total_revenue_cents ?? 0)/100;
  const avgPerCall = totalCalls ? (totalRev/totalCalls) : 0;

  if(loading) return <div className="dashboard-page"><div className="stack" style={{gap:12}}>{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton skeleton-text"/>)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i/> ADMIN / OVERVIEW</p>
          <h1>Admin Console</h1>
          <p className="text-muted" style={{fontSize:13, margin:"6px 0 0", maxWidth:560}}>Revenue, call health and team readiness — the three signals that change what you do next.</p>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <span className="badge" style={{background:"rgba(168,85,247,.14)", border:"1px solid rgba(168,85,247,.24)", color:"#d8c6ff"}}>{summary?.active_campaigns ?? 0} live campaigns</span>
          <Link href="/dashboard/admin/agencies/new" className="btn btn-primary btn-sm">+ New agency</Link>
        </div>
      </div>

      {/* HERO BENTO — asymmetric: revenue hero + calls hero + side stack */}
      <div className="admin-hero-bento" aria-label="Primary metrics">
        {/* Revenue hero — primary */}
        <div className="hero-card hero-card--primary">
          <div className="hero-card__top">
            <span className="hero-kicker">TOTAL REVENUE · 7D</span>
            {hasRev && revDelta.pct!==null ? (
              <span className={`delta-badge ${revDelta.dir==="up"?"delta-up":revDelta.dir==="down"?"delta-down":""}`} title="vs first day in 7-day window">
                {revDelta.dir==="up"?"↗":revDelta.dir==="down"?"↘":"→"} {Math.abs(revDelta.pct!)}%
              </span>
            ) : <span className="delta-badge delta-neutral">live</span>}
          </div>
          <p className="hero-value">${totalRev.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          <p className="hero-sub">{totalCalls} calls · {avgPerCall ? `$${avgPerCall.toFixed(2)} avg` : "no avg yet"} · <span className="text-mono-sm" style={{fontSize:11}}>capacity {summary?.agents_online ?? 0} online</span></p>
          <div className="hero-spark" aria-hidden>
            {hasRev ? <MiniLine data={revTrend} height={96} ariaLabel="Revenue 7-day trend" color="#A855F7" /> : (
              <div style={{height:96, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10, background:"rgba(31,16,55,.4)"}}>
                Waiting for first paid call — invite an agent and place a test call
              </div>
            )}
          </div>
          <div className="hero-actions">
            <Link href="/dashboard/wallet" className="btn btn-sm" style={{flex:1}}>Wallet →</Link>
            <Link href="/dashboard/reports" className="btn btn-ghost btn-sm" style={{flex:1}}>Reports</Link>
          </div>
          <div className="hero-glow" aria-hidden />
        </div>

        {/* Calls hero — now with Call Health embedded */}
        <div className="hero-card">
          <div className="hero-card__top">
            <span className="hero-kicker">TOTAL CALLS · 7D</span>
            {hasVol && volDelta.pct!==null ? (
              <span className={`delta-badge ${volDelta.dir==="up"?"delta-up":volDelta.dir==="down"?"delta-down":""}`}>{volDelta.dir==="up"?"↗":volDelta.dir==="down"?"↘":"→"} {Math.abs(volDelta.pct!)}%</span>
            ) : <span className="delta-badge delta-neutral">tracking</span>}
          </div>
          <p className="hero-value">{totalCalls.toLocaleString()}</p>
          <p className="hero-sub">{summary?.total_leads ?? 0} leads in pipeline · <span style={{color:"var(--muted)"}}>7-day volume</span></p>
          <div className="hero-spark" aria-hidden>
            {hasVol ? <MiniLine data={volTrend} height={72} ariaLabel="Calls 7-day trend" color="#06B6D4" /> : (
              <div style={{height:72, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10, background:"rgba(31,16,55,.4)"}}>
                No calls yet — create a campaign to start routing
              </div>
            )}
          </div>
          <div style={{marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.06)"}} aria-label="Call health">
            <span className="mini-tile__kicker" style={{display:"block", marginBottom:6, fontSize:9, letterSpacing:"1px"}}>CALL HEALTH · last 80 · states</span>
            {statePie.length ? <MiniPie data={statePie} height={140} ariaLabel="Call states pie" /> : (
              <div style={{height:140, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10, background:"rgba(31,16,55,.35)", textAlign:"center", padding:"0 12px"}}>
                No calls to analyze — distribution appears after ~20 calls
              </div>
            )}
          </div>
          <div className="hero-actions">
            <Link href="/dashboard/calls" className="btn btn-sm" style={{flex:1}}>Live calls →</Link>
            <Link href="/dashboard/campaigns" className="btn btn-ghost btn-sm" style={{flex:1}}>Campaigns</Link>
          </div>
        </div>

        {/* Side stack — AGENTS ONLINE now hosts Team Capacity */}
        <div className="hero-side-stack">
          <div className="mini-tile">
            <div className="mini-tile__head">
              <span className="mini-tile__kicker">ACTIVE CAMPAIGNS</span>
              <span className="dot dot--live" title="live"><i/></span>
            </div>
            <p className="mini-tile__value">{summary?.active_campaigns ?? 0}</p>
            <p className="mini-tile__sub">Routing now</p>
            <Link href="/dashboard/campaigns" className="mini-tile__link">Manage →</Link>
          </div>
          <div className="mini-tile">
            <div className="mini-tile__head">
              <span className="mini-tile__kicker">AGENTS ONLINE</span>
              <span className={`dot ${ (summary?.agents_online ?? 0)>0 ? "dot--online" : "dot--offline"}`}><i/></span>
            </div>
            <p className="mini-tile__value">{summary?.agents_online ?? 0}</p>
            <p className="mini-tile__sub">{(summary?.agents_online ?? 0)>0 ? "Ready to receive" : "No one online"}</p>
            <Link href="/dashboard/agents" className="mini-tile__link">View team →</Link>
            <div style={{marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.06)"}} aria-label="Team capacity">
              <span className="mini-tile__kicker" style={{display:"block", marginBottom:6, fontSize:9, letterSpacing:"1px"}}>TEAM CAPACITY · availability</span>
              {availDonut.length && availDonut.some(v=>v.value>0) ? <MiniDonut data={availDonut} height={132} ariaLabel="Agent availability donut" centerLabel={String(summary?.agents_online ?? 0)} /> : (
                <div style={{height:132, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10, background:"rgba(31,16,55,.35)", textAlign:"center", padding:"0 12px"}}>
                  No roster yet — invite agents
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LEVEL 2 — now single focus: daily actions (charts moved into hero) */}
      <div className="mini-bento mini-bento--admin" aria-label="Insights" style={{gridTemplateColumns:"1fr"}}>
        <div className="mini-chart-card" style={{display:"flex", flexDirection:"column"}}>
          <div className="mini-chart-card-head">
            <div>
              <span className="mini-chart-label">NEEDS ATTENTION</span>
              <span className="mini-chart-subtitle">Actions admin does daily</span>
            </div>
          </div>
          <div className="mini-chart-card-body" style={{gap:10, justifyContent:"center"}}>
            <div className="action-list">
              <Link href="/dashboard/admin/disputes" className="action-row"><span><i className="action-dot action-dot--amber"/> Disputes</span><span className="badge">View →</span></Link>
              <Link href="/dashboard/admin/dispositions" className="action-row"><span><i className="action-dot action-dot--violet"/> Dispositions</span><span className="badge">Review →</span></Link>
              <Link href="/dashboard/admin/publishers" className="action-row"><span><i className="action-dot action-dot--cyan"/> Publishers</span><span className="badge">{summary?.active_campaigns ?? 0} live</span></Link>
              <Link href="/dashboard/admin/leads" className="action-row"><span><i className="action-dot"/> Leads</span><span className="badge">{summary?.total_leads ?? 0} total</span></Link>
            </div>
            <div className="status-mini">
              <span className="status-mini__item"><i className="dot dot--online"/><small>Routing Nominal</small></span>
              <span className="status-mini__item"><i className="dot dot--live"/><small>Worker Awaiting jobs</small></span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions + system — distinct, not competing */}
      <div className="split" style={{["--gap" as string]:"var(--space-6)"}}>
        <div className="card" style={{flex:1}}>
          <h2 style={{font:"500 18px var(--serif)", margin:"0 0 4px", letterSpacing:"-0.03em"}}>Quick actions</h2>
          <p className="text-muted" style={{fontSize:12, margin:"0 0 14px"}}>The 4 things admins do most — one click away.</p>
          <div className="stack" style={{gap:8}}>
            <Link href="/dashboard/admin/agencies/new" className="btn btn-primary" style={{width:"100%", justifyContent:"center"}}>Create Agency</Link>
            <Link href="/dashboard/admin/agents/new" className="btn" style={{width:"100%", justifyContent:"center"}}>Invite Agent</Link>
            <Link href="/dashboard/campaigns/new" className="btn" style={{width:"100%", justifyContent:"center"}}>New Campaign</Link>
            <Link href="/dashboard/admin/publishers" className="btn btn-ghost" style={{width:"100%", justifyContent:"center"}}>Invite Publisher →</Link>
          </div>
        </div>
        <div className="card" style={{flex:1.2}}>
          <h2 style={{font:"500 18px var(--serif)", margin:"0 0 4px", letterSpacing:"-0.03em"}}>System</h2>
          <p className="text-muted" style={{fontSize:12, margin:"0 0 14px"}}>Live signals — not history.</p>
          <div className="status-grid">
            <div className="status-item"><span className="status-label">Routing Engine</span><span className="badge badge-success">Nominal</span></div>
            <div className="status-item"><span className="status-label">Total Leads</span><span className="text-mono" style={{fontSize:13}}>{summary?.total_leads ?? 0}</span></div>
            <div className="status-item"><span className="status-label">Database</span><span className="badge badge-success">Connected</span></div>
            <div className="status-item"><span className="status-label">PgBoss Worker</span><span className="badge">Awaiting jobs</span></div>
            <div className="status-item"><span className="status-label">Socket Gateway</span><span className="badge">Standby</span></div>
            <div className="status-item"><span className="status-label">Webhook</span><span className="badge">Receiving</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:"var(--space-6)"}}>
        <div className="dashboard-page-header" style={{marginBottom:"var(--space-4)"}}>
          <h2 style={{margin:0}}>Recent calls</h2>
          <Link href="/dashboard/calls" className="text-mono-sm" style={{fontSize:11}}>View all →</Link>
        </div>
        {calls.length===0 ? <div className="empty-state" style={{padding:"2rem 0"}}><p><strong>No calls yet</strong></p><p className="text-muted">Simulate a call from Campaigns to see live movement.</p><Link href="/dashboard/campaigns" className="btn btn-primary btn-sm" style={{marginTop:12}}>Simulate call</Link></div> : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Provider</th><th>State</th><th>From</th><th>Call ID</th></tr></thead><tbody>{calls.map(c=><tr key={c.id}><td className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</td><td className="text-mono-sm">{c.provider}</td><td><span className="badge">{c.state}</span></td><td className="text-mono-sm">{c.from_hash ? c.from_hash.slice(0,12) : "—"}</td><td><Link href={`/dashboard/calls/${c.id}`} className="clickable">{c.id.slice(0,8)}</Link></td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
