"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth-client";
import { MiniDonut, MiniLine, MiniBar } from "@/components/dashboard-mini-charts";

const AdminCharts = dynamic(() => import("@/components/admin-home-charts"), { ssr: false });

interface Summary { total_calls: number; total_revenue_cents: number; active_campaigns: number; agents_online: number; total_leads: number; }
interface LiveCall { id: string; from_hash: string; state: string; started_at: string; campaign_id: string; agent_id: string | null; }
interface VolumePoint { date: string; count: number; }
interface DurationPoint { date: string; avg_seconds: number; total_calls: number; }
interface RevenuePoint { date: string; revenue_cents: number; count: number; }
interface ConversionPoint { date: string; total: number; connected: number; conversion_rate: number; }

function delta(values: number[]): { pct: number | null; dir: "up"|"down"|"flat" } {
  if(values.length<2) return {pct:null, dir:"flat"};
  const first=values[0]||0, last=values[values.length-1]||0;
  if(first===0 && last===0) return {pct:null, dir:"flat"};
  if(first===0) return {pct:100, dir:"up"};
  const pct=((last-first)/first)*100; if(Math.abs(pct)<0.5) return {pct:0, dir:"flat"};
  return {pct:Math.round(pct), dir: pct>0?"up":"down"};
}
function PremiumEmpty({ title, hint, ctaHref, ctaLabel }: {title:string; hint:string; ctaHref:string; ctaLabel:string}){
  return (<div className="premium-empty" role="img" aria-label={title}><div className="premium-empty__glow" aria-hidden/><p className="premium-empty__title">{title}</p><p className="premium-empty__hint">{hint}</p><Link href={ctaHref} className="btn btn-primary btn-sm" style={{marginTop:10}}>{ctaLabel}</Link></div>);
}

export default function DashboardPage(){
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const [summary,setSummary]=useState<Summary|null>(null);
  const [liveCalls,setLiveCalls]=useState<LiveCall[]>([]);
  const [loading,setLoading]=useState(true);
  const [volData,setVolData]=useState<VolumePoint[]>([]);
  const [durData,setDurData]=useState<DurationPoint[]>([]);
  const [revData,setRevData]=useState<RevenuePoint[]>([]);
  const [convData,setConvData]=useState<ConversionPoint[]>([]);
  const [recentCalls,setRecentCalls]=useState<LiveCall[]>([]);
  const [dispoData,setDispoData]=useState<{name:string;value:number}[]>([]);

  useEffect(()=>{
    async function loadDashboard(){
      let recentUrl="/api/v1/calls?limit=5&sort=started_at:desc";
      if(!isAdmin){
        try{ const meRes=await fetch("/api/v1/me"); if(meRes.ok){ const meBody=await meRes.json(); const agentId=meBody.data?.agentId ?? meBody.data?.agent?.id ?? null; if(agentId) recentUrl=`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&limit=5&sort=started_at:desc`; } }catch{}
      }
      const [s,c,v,d,rv,cv,rc]=await Promise.all([
        fetch("/api/v1/reports/summary").then(r=>r.ok?r.json():null),
        fetch("/api/v1/calls?state=ringing,connected&limit=5").then(r=>r.ok?r.json():null),
        fetch("/api/v1/reports/calls-volume?days=7").then(r=>r.ok?r.json():null),
        fetch("/api/v1/reports/duration?days=7").then(r=>r.ok?r.json():null),
        fetch("/api/v1/reports/revenue?days=7").then(r=>r.ok?r.json():null),
        fetch("/api/v1/reports/conversion?days=7").then(r=>r.ok?r.json():null),
        fetch(recentUrl).then(r=>r.ok?r.json():null),
      ]);
      if(s) setSummary(s.data); if(c) setLiveCalls(c.data ?? []);
      if(v) setVolData(v.data ?? []); if(d) setDurData(d.data ?? []); if(rv) setRevData(rv.data ?? []); if(cv) setConvData(cv.data ?? []);
      if(rc) setRecentCalls(rc.data ?? []); setLoading(false);
    }
    loadDashboard();
    fetch("/api/v1/dispositions").then(async r=>{
      if(!r.ok) return; try{ const b=await r.json(); const rows: {outcome:string}[] = b.data ?? []; if(Array.isArray(rows)&&rows.length){ const m=new Map<string,number>(); for(const row of rows) m.set(row.outcome||"unknown",(m.get(row.outcome||"unknown")||0)+1); const arr=[...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6); setDispoData(arr); } else setDispoData([]);}catch{}
    }).catch(()=>{});
  },[isAdmin]);

  const greeting=(()=>{ const h=new Date().getHours(); if(h<12) return "Good morning"; if(h<18) return "Good afternoon"; return "Good evening"; })();
  const firstName=user?.name?.split(" ")[0] ?? "Operator";
  const volTrend=useMemo(()=>{ const fmt=(d:string)=>{ try{ const dt=new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`;}catch{ return d.slice(5,10);} }; return volData.map(p=>({name:fmt(p.date), value:p.count})); },[volData]);
  const earningsTrend=useMemo(()=>{ const fmt=(d:string)=>{ try{ const dt=new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`;}catch{ return d.slice(5,10);} }; return revData.map(p=>({name:fmt(p.date), value:Math.round(p.revenue_cents/100)})); },[revData]);
  const totalVol=volData.reduce((a,b)=>a+b.count,0);
  const avgDurSec=durData.length? Math.round(durData.reduce((a,b)=>a+b.avg_seconds,0)/durData.length):0;
  const totalEarn=revData.reduce((a,b)=>a+b.revenue_cents,0)/100;
  const volDelta=useMemo(()=>delta(volTrend.map(v=>v.value)),[volTrend]);
  const earnDelta=useMemo(()=>delta(earningsTrend.map(v=>v.value)),[earningsTrend]);
  const hasVol=volTrend.some(v=>v.value>0);
  const hasEarn=earningsTrend.some(v=>v.value>0);

  if(loading){
    return (<div className="dashboard-page"><div className="stack" style={{gap:24}}><div className="skeleton skeleton-text" style={{width:200}}/><div className="skeleton skeleton-text" style={{width:320}}/><div className="metrics">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton skeleton-text" style={{height:100}}/>)}</div></div></div>);
  }

  return (
    <div className="dashboard-page">
      <header className="console-header">
        <div><p className="eyebrow"><i/> {isAdmin ? "ADMIN CONTROL PLANE" : "AGENT CONSOLE"}</p><h1>{greeting}, {firstName}.</h1><p className="text-muted" style={{fontSize:13, margin:"6px 0 0", maxWidth:560}}>{isAdmin ? "Live queue, revenue health and team capacity — act in one click." : "Your readiness and earnings — the two numbers that decide your day."}</p></div>
        <div className="header-right"><span className="clock">{new Date().toLocaleTimeString("en-US",{hour12:false})} CT</span>{isAdmin && <Link href="/dashboard/admin/agencies/new" className="btn btn-primary">+ New agency</Link>}</div>
      </header>

      {isAdmin ? (
        <>
          <div className="status-band"><span><i/> ADMIN PANEL</span><span>{summary?.agents_online ?? 0} agents online</span><span>{summary?.active_campaigns ?? 0} active campaigns</span><span>Last sync: now</span></div>
          <div className="metrics">
            <Metric label="Total calls" value={String(summary?.total_calls ?? 0)} detail={`${summary?.active_campaigns ?? 0} active campaigns`} />
            <Metric label="Agents online" value={String(summary?.agents_online ?? 0)} detail="Across all agencies" />
            <Metric label="Total leads" value={String(summary?.total_leads ?? 0)} detail="In pipeline" />
            <Metric label="Revenue" value={summary ? `$${((summary.total_revenue_cents ?? 0)/100).toLocaleString()}` : "$0"} detail="Current cycle" />
          </div>
          <AdminCharts volume={volData} revenue={revData} conversion={convData} duration={durData} />
          <div className="dashboard-grid">
            <section className="panel live-panel">
              <div className="panel-head"><div><span className="section-label">LIVE QUEUE</span><h2>Call movement</h2></div><Link href="/dashboard/admin/dispositions" className="quiet-button">Dispositions →</Link></div>
              <div className="call-list">{liveCalls.length===0 ? <div className="empty-state"><p>No live calls</p></div> : liveCalls.map(c=><Link href={`/dashboard/calls/${c.id}`} className="call-row" key={c.id}><span className="call-id">{c.id.slice(0,8)}</span><div><strong>{c.from_hash?.slice(0,14) ?? "Anonymous"}</strong><small>{c.campaign_id?.slice(0,8) ?? "—"}</small></div><span className={`state ${c.state}`}>{c.state}</span><button aria-label={`Open ${c.id}`}>↗</button></Link>)}</div>
            </section>
            <section className="panel route-panel">
              <div className="panel-head"><div><span className="section-label">AGENCY OVERVIEW</span><h2>Quick actions</h2></div></div>
              <div style={{padding:"var(--space-4)", display:"flex", flexDirection:"column", gap:8}}>
                <Link href="/dashboard/agents" className="btn btn-primary btn-sm">Manage Agents</Link>
                <Link href="/dashboard/admin/agencies" className="btn btn-sm">View Agencies</Link>
                <Link href="/dashboard/agents/recruit" className="btn btn-sm">Recruit Agents</Link>
              </div>
            </section>
          </div>
        </>
      ) : (
        /* AGENT — premium hero bento */
        <div className="agent-hero-bento" aria-label="Agent primary">
          {/* Ready hero — primary */}
          <div className="hero-card hero-card--primary" style={{"--accent-rgb":"6,182,212"} as React.CSSProperties}>
            <div className="hero-card__top">
              <span className="hero-kicker">READY TO TAKE CALLS</span>
              <span className="badge" style={{background:"rgba(6,182,212,.14)", border:"1px solid rgba(6,182,212,.28)", color:"#22d3ee"}}><i className="dot dot--online" style={{marginRight:6}}/> Available</span>
            </div>
            <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}>
              <div style={{flex:1, minWidth:180}}>
                <p className="hero-value" style={{fontSize:42}}>Available</p>
                <p className="hero-sub">{summary?.agents_online ?? 0} agents online now · <span style={{color:"var(--muted)"}}>{recentCalls.length ? `${recentCalls.length} recent` : "no calls yet"} · your queue is yours alone</span></p>
                <div style={{display:"flex", gap:8, marginTop:14}}>
                  <Link href="/dashboard/take-calls" className="btn btn-primary btn-sm" style={{flex:1, justifyContent:"center"}}>Go to Softphone →</Link>
                  <Link href="/dashboard/calls" className="btn btn-sm" style={{flex:1, justifyContent:"center"}}>History</Link>
                </div>
                {recentCalls.length>0 && (
                  <div className="call-list" style={{marginTop:14}}>
                    <span className="section-label" style={{display:"block", marginBottom:6}}>YOUR RECENT — last 3</span>
                    {recentCalls.slice(0,3).map(c=>(
                      <Link href={`/dashboard/calls/${c.id}`} className="call-row" key={c.id} style={{padding:"8px 10px"}}>
                        <span className="call-id">{c.id.slice(0,8)}</span>
                        <div><strong style={{fontSize:13}}>{c.from_hash?.slice(0,14) ?? "Anonymous"}</strong><small>{new Date(c.started_at).toLocaleTimeString()}</small></div>
                        <span className={`state ${c.state}`}>{c.state}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div style={{width:160, flexShrink:0}}>
                {dispoData.length ? (
                  <MiniDonut data={dispoData} height={140} ariaLabel="My dispositions" centerLabel={String(dispoData.reduce((a,b)=>a+b.value,0))} />
                ) : (
                  <div className="premium-empty premium-empty--compact">
                    <p className="premium-empty__title" style={{fontSize:13}}>No dispositions yet</p>
                    <p className="premium-empty__hint">Close a call — your sold / follow-up mix shows here.</p>
                  </div>
                )}
                <p className="text-mono-sm" style={{fontSize:10, textAlign:"center", marginTop:6, color:"var(--muted)"}}>MY OUTCOMES · {dispoData.length ? "live" : "demo"}</p>
              </div>
            </div>
            <div className="hero-glow" aria-hidden/>
          </div>

          {/* Performance hero */}
          <div className="hero-card">
            <div className="hero-card__top">
              <span className="hero-kicker">YOUR PERFORMANCE · 7D</span>
              <span className="delta-badge delta-neutral">{totalVol} calls</span>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
              <div>
                <p className="text-mono-sm" style={{fontSize:10, color:"var(--muted)"}}>EARNINGS</p>
                <p style={{font:"600 22px var(--serif)", margin:"4px 0 0"}}>${totalEarn.toFixed(2)}</p>
                <div style={{marginTop:8, height:64}}>{hasEarn ? <MiniBar data={earningsTrend.length?earningsTrend:[{name:"Mon",value:12},{name:"Tue",value:18}]} height={64} ariaLabel="Earnings bar compact" /> : <div style={{height:64, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10}}>No earnings yet</div>}</div>
                <p className="text-mono-sm" style={{fontSize:10, marginTop:4, color: earnDelta.dir==="up" ? "#10B981" : earnDelta.dir==="down" ? "#EF4444" : "var(--muted)"}}>{earnDelta.pct!==null ? `${earnDelta.dir==="up"?"↗":"↘"} ${Math.abs(earnDelta.pct!)}% vs start` : "paid only"}</p>
              </div>
              <div>
                <p className="text-mono-sm" style={{fontSize:10, color:"var(--muted)"}}>CALL VOLUME</p>
                <p style={{font:"600 22px var(--serif)", margin:"4px 0 0"}}>{totalVol}</p>
                <div style={{marginTop:8, height:64}}>{hasVol ? <MiniLine data={volTrend.length?volTrend:[{name:"Mon",value:1},{name:"Tue",value:3}]} height={64} ariaLabel="Volume line compact" color="#06B6D4" /> : <div style={{height:64, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10}}>No calls yet</div>}</div>
                <p className="text-mono-sm" style={{fontSize:10, marginTop:4, color: volDelta.dir==="up" ? "#10B981" : volDelta.dir==="down" ? "#EF4444" : "var(--muted)"}}>{volDelta.pct!==null ? `${volDelta.dir==="up"?"↗":"↘"} ${Math.abs(volDelta.pct!)}%` : "7 days"}</p>
              </div>
            </div>
            <div style={{display:"flex", gap:8, marginTop:12}}>
              <Link href="/dashboard/wallet/agent" className="btn btn-sm" style={{flex:1}}>My Wallet</Link>
              <Link href="/dashboard/reports" className="btn btn-ghost btn-sm" style={{flex:1}}>Reports →</Link>
            </div>
          </div>

          {/* Compact side — avg duration + quick actions */}
          <div className="hero-side-stack">
            <div className="mini-tile">
              <span className="mini-tile__kicker">AVG DURATION</span>
              <p className="mini-tile__value">{avgDurSec ? `${Math.floor(avgDurSec/60)}m ${avgDurSec%60}s` : "—"}</p>
              <p className="mini-tile__sub">{durData.length ? "7-day avg" : "no data"}</p>
            </div>
            <div className="mini-tile" style={{display:"flex", flexDirection:"column", gap:8}}>
              <span className="mini-tile__kicker">QUICK ACTIONS</span>
              <Link href="/dashboard/take-calls" className="btn btn-primary btn-sm" style={{width:"100%", justifyContent:"center"}}>Take Calls</Link>
              <Link href="/dashboard/scripts" className="btn btn-ghost btn-sm" style={{width:"100%", justifyContent:"center"}}>Scripts</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string; }){
  return (<article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>);
}
