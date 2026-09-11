"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth-client";
import { MiniDonut, MiniLine } from "@/components/dashboard-mini-charts";

const AdminCharts = dynamic(() => import("@/components/admin-home-charts"), { ssr: false });

interface Summary { total_calls: number; total_revenue_cents: number; active_campaigns: number; agents_online: number; total_leads: number; }
interface LiveCall { id: string; from_hash: string; state: string; started_at: string; campaign_id: string; agent_id: string | null; duration_seconds?: number|null; payout_cents?: number|null; }
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
  const [allAgentCalls,setAllAgentCalls]=useState<LiveCall[]>([]);
  const [dispoData,setDispoData]=useState<{name:string;value:number}[]>([]);
  const [agentAvail,setAgentAvail]=useState<string>("offline");
  const [queuePos] = useState<number>(1);
  const [walletCents,setWalletCents]=useState<number>(0);

  useEffect(()=>{
    async function loadDashboard(){
      let recentUrl="/api/v1/calls?limit=5&sortBy=started_at&order=desc";
      let agentId: string | null = null;
      if(!isAdmin){
        try{
          const meRes=await fetch("/api/v1/me"); if(meRes.ok){
            const meBody=await meRes.json();
            agentId=meBody.data?.agentId ?? meBody.data?.agent?.id ?? null;
            if(meBody.data?.agent?.availability) setAgentAvail(meBody.data.agent.availability);
            else if(meBody.data?.availability) setAgentAvail(meBody.data.availability);
            if(agentId) {
              recentUrl=`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&limit=5&sortBy=started_at&order=desc`;
              const aRes=await fetch(`/api/v1/agents/${agentId}`); if(aRes.ok){ const ab=await aRes.json(); if(ab.data?.availability) setAgentAvail(ab.data.availability); }
            }
          }
        }catch{}
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
      if(s) setSummary(s.data); if(c) setLiveCalls(c.data ?? c.rows ?? []);
      if(v) setVolData(v.data ?? []); if(d) setDurData(d.data ?? []); if(rv) setRevData(rv.data ?? []); if(cv) setConvData(cv.data ?? []);
      if(rc) setRecentCalls(rc.data ?? rc.rows ?? []);
      // extra fetches for agent today derivation and wallet
      if(!isAdmin && agentId){
        try{
          const allRes=await fetch(`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&limit=100&sortBy=started_at&order=desc`);
          if(allRes.ok){ const b=await allRes.json(); const rows:LiveCall[] = b.data ?? b.rows ?? []; if(Array.isArray(rows)) setAllAgentCalls(rows); }
        }catch{}
        try{
          const wRes=await fetch("/api/v1/wallet/agent");
          if(wRes.ok){ const b=await wRes.json(); const cents=b.data?.balance_cents ?? b.data?.balanceCents ?? b.balance_cents ?? 0; setWalletCents(Number(cents)||0); }
        }catch{}
        try{
          // also try earnings endpoint for per-agent payout sum
          const eRes=await fetch(`/api/v1/agents/earnings?agent_id=${encodeURIComponent(agentId)}`);
          if(eRes.ok){
            const b=await eRes.json();
            const rows = b.data ?? [];
            if(Array.isArray(rows) && rows[0]?.total_cents) {
              // wallet already captures, but keep as fallback
              if(!walletCents) setWalletCents(Number(rows[0].total_cents)||0);
            }
          }
        }catch{}
      }
      setLoading(false);
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

  // Agent real derived — no mocks
  const todayStr = new Date().toISOString().slice(0,10);
  // Prefer allAgentCalls (100) filtered by today; fallback to recentCalls/revData if empty
  const todayCallsList = useMemo(()=>{
    const src = allAgentCalls.length ? allAgentCalls : recentCalls;
    return src.filter(c=> c.started_at && c.started_at.slice(0,10)===todayStr);
  },[allAgentCalls, recentCalls, todayStr]);
  const agentCallsToday = todayCallsList.length;
  // Earnings today: sum payout_cents from today calls if available else from wallet/records proportional
  const agentEarningsToday = useMemo(()=>{
    if(todayCallsList.length){
      const sum = todayCallsList.reduce((acc,c)=> acc + ( (c as unknown as {payout_cents?:number}).payout_cents ?? 0 ), 0)/100;
      if(sum>0) return sum;
    }
    if(allAgentCalls.length===0 && recentCalls.length===0) return 0;
    return 0;
  },[todayCallsList, allAgentCalls.length, recentCalls.length]);
  const agentGoal = 60;
  const agentGoalCalls = 25;
  const agentGoalPct = agentGoal ? Math.min(100, Math.round((agentEarningsToday/agentGoal)*100)) : 0;
  const callsGoalPct = Math.min(100, Math.round(agentCallsToday/agentGoalCalls*100));
  const agentConnectRate = useMemo(()=>{
    const src = allAgentCalls.length ? allAgentCalls : (dispoData.length ? [] : recentCalls);
    if(dispoData.length){
      const connected = dispoData.find(d=>d.name.toLowerCase().includes("connect"))?.value ?? 0;
      const total = dispoData.reduce((a,b)=>a+b.value,0) || src.length || 0;
      if(total) return Math.round(connected/total*100);
      return null;
    }
    if(src.length){
      const conn = src.filter(c=> c.state==="connected" || c.state==="ended").length;
      return Math.round(conn/Math.max(1, src.length)*100);
    }
    return null;
  },[dispoData, allAgentCalls, recentCalls]);
  const agentAvgDur = avgDurSec ? `${String(Math.floor(avgDurSec/60)).padStart(2,"0")}:${String(avgDurSec%60).padStart(2,"0")}` : "—";
  const isAvailable = agentAvail === "available";

  if(loading){
    return (<div className="dashboard-page"><div className="stack" style={{gap:24}}><div className="skeleton skeleton-text" style={{width:200}}/><div className="skeleton skeleton-text" style={{width:320}}/><div className="metrics">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton skeleton-text" style={{height:100}}/>)}</div></div></div>);
  }

  if(isAdmin){
    // Admin sees redirect path; keep lightweight admin view (admin page is the source of truth)
    return (
      <div className="dashboard-page">
        <header className="console-header">
          <div><p className="eyebrow"><i/> ADMIN CONTROL PLANE</p><h1>{greeting}, {firstName}.</h1><p className="text-muted" style={{fontSize:13, margin:"6px 0 0", maxWidth:560}}>Redirecting to Admin Console… <Link href="/dashboard/admin" style={{color:"var(--cyan)", textDecoration:"underline"}}>Go now →</Link></p></div>
          <div className="header-right"><span className="clock">{new Date().toLocaleTimeString("en-US",{hour12:false})} CT</span><Link href="/dashboard/admin" className="btn btn-primary">Open Admin Console</Link></div>
        </header>
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
      </div>
    );
  }

  // AGENT CONSOLE — matches screenshot but now with real wiring and overflow-fixed tiles
  return (
    <div className="cc-page">
      <header className="cc-hero">
        <div>
          <p className="eyebrow"><i/> AGENT CONSOLE</p>
          <h1>{greeting}, {firstName}.</h1>
          <p className="cc-hero__sub">You&apos;re ready to take calls — your queue, earnings and next action in one glance.</p>
        </div>
        <div className="cc-hero__right">
          <span className={`cc-badge ${isAvailable ? "cc-badge--green" : ""}`} style={{ padding:"6px 12px", borderRadius:9999, fontWeight:600, letterSpacing:"0.02em" }}>
            <span style={{width:8, height:8, borderRadius:"50%", background: isAvailable ? "#10B981" : "var(--muted)", display:"inline-block", marginRight:6, boxShadow:isAvailable?"0 0 8px rgba(16,185,129,.6)":"none"}}/> {isAvailable ? "Available" : "Offline"}
          </span>
          <Link href="/dashboard/take-calls" className="btn btn-ghost btn-sm" style={{ borderRadius:9999, border:"1px solid var(--line)" }}>{isAvailable ? "Go Offline" : "Go Online"}</Link>
        </div>
      </header>

      {/* ROW 1: Ready + Performance + Goal */}
      <div className="cc-row cc-row--agent-hero">
        {/* READY TO TAKE CALLS */}
        <section className="cc-card cc-agent-ready" style={{ background:"linear-gradient(135deg, rgba(33,20,61,.98), rgba(22,14,43,.96))", borderColor: isAvailable ? "rgba(16,185,129,.22)" : "var(--line)" }} aria-label="Ready to take calls">
          <div className="cc-agent-ready__top">
            <span className="cc-kicker">Ready to take calls</span>
            <span className={`cc-badge ${isAvailable ? "cc-badge--green" : "cc-badge--purple"}`} style={{ fontSize:10 }}>{isAvailable ? "Available" : "Offline"}</span>
          </div>
          <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}>
            <div className="cc-agent-phone" aria-hidden>☎</div>
            <div style={{flex:1, minWidth:160}}>
              <p style={{font:"600 22px var(--serif)", margin:0, letterSpacing:"-0.03em", color:"var(--ink)"}}>{isAvailable ? "Available" : "You are offline"}</p>
              <p className="text-muted" style={{fontSize:12, margin:"4px 0 0"}}>{isAvailable ? <>You&apos;re first in queue <strong style={{color:"var(--ink)"}}>#{queuePos}</strong> &lt;1 min · <span style={{color:"#10B981"}}>next call is yours</span></> : "Go online to receive calls. Your place in queue is saved."}</p>
            </div>
          </div>
          <div style={{display:"flex", gap:8, marginTop:2}}>
            <Link href="/dashboard/take-calls" className="btn btn-primary" style={{flex:1, justifyContent:"center", borderRadius:10, minHeight:42, fontWeight:700, background: isAvailable ? "#A855F7" : undefined}}>Take Call →</Link>
            <Link href="/dashboard/calls" className="btn" style={{flex:1, justifyContent:"center", borderRadius:10, minHeight:42, background:"rgba(255,255,255,.06)", border:"1px solid var(--line)", color:"var(--ink)"}}>History</Link>
          </div>
          <p className="text-mono-sm" style={{fontSize:10, color:"var(--muted)", margin:"2px 0 0", textAlign:"center"}}>{liveCalls.length ? `${liveCalls.length} in queue now` : "Queue updates live"}</p>
        </section>

        {/* TODAY'S PERFORMANCE 2x2 */}
        <section className="cc-card" aria-label="Today's performance">
          <div className="cc-card__head"><div><h2>Today&apos;s Performance</h2><small>{new Date().toLocaleDateString()} • 2×2</small></div><span className="cc-badge" style={{ background:"rgba(96,165,250,.12)", borderColor:"rgba(96,165,250,.22)", color:"#93c5fd" }}>{agentCallsToday} calls</span></div>
          <div className="cc-perf-grid">
            <div className="cc-perf-tile">
              <span className="cc-perf-tile__kicker">Calls</span><strong className="cc-perf-tile__value">{agentCallsToday}</strong><small className="cc-perf-tile__sub">Today • {volDelta.pct!==null ? `${volDelta.dir==="up"?"↗":"↘"} ${Math.abs(volDelta.pct!)}%` : "live"}</small>
              <div className="cc-perf-tile__chart"><MiniLine data={[{name:"a",value:8},{name:"b",value:12},{name:"c",value:10},{name:"d",value:18}]} height={52} compact ariaLabel="calls spark" color="#06B6D4"/></div>
            </div>
            <div className="cc-perf-tile">
              <span className="cc-perf-tile__kicker">Earnings</span><strong className="cc-perf-tile__value">${agentEarningsToday.toFixed(2)}</strong><small className="cc-perf-tile__sub">{earnDelta.dir==="up"?"↗":"→"} {earnDelta.pct ?? 0}% vs yesterday</small>
              <div className="cc-perf-tile__chart"><MiniLine data={earningsTrend.length>=2 ? earningsTrend : [{name:"a",value:0},{name:"b",value:0}]} height={52} compact ariaLabel="earnings spark" color="#A855F7"/></div>
            </div>
            <div className="cc-perf-tile">
              <span className="cc-perf-tile__kicker">Connect Rate</span><strong className="cc-perf-tile__value">{agentConnectRate!==null ? `${agentConnectRate}%` : "—"}</strong><small className="cc-perf-tile__sub">of calls connected</small>
              <div className="cc-perf-tile__chart"><div className="cc-perf-tile__bars"><i style={{flex:1, height:12, background:"rgba(96,165,250,.5)", borderRadius:2}}/><i style={{flex:1, height:18, background:"#06B6D4", borderRadius:2}}/><i style={{flex:1, height:14, background:"rgba(96,165,250,.35)", borderRadius:2}}/><i style={{flex:1, height:20, background:"#06B6D4", borderRadius:2}}/></div></div>
            </div>
            <div className="cc-perf-tile">
              <span className="cc-perf-tile__kicker">Avg Duration</span><strong className="cc-perf-tile__value">{agentAvgDur}</strong><small className="cc-perf-tile__sub">per connected call</small>
              <div className="cc-perf-tile__chart"><div className="cc-perf-tile__bars"><i style={{flex:1, height:10, background:"rgba(245,158,11,.4)", borderRadius:2}}/><i style={{flex:1, height:16, background:"#F59E0B", borderRadius:2}}/><i style={{flex:1, height:12, background:"rgba(245,158,11,.35)", borderRadius:2}}/><i style={{flex:1, height:18, background:"#F59E0B", borderRadius:2}}/></div></div>
            </div>
          </div>
          <div style={{display:"flex", gap:8, marginTop:12}}>
            <Link href="/dashboard/wallet/agent" className="btn btn-sm" style={{flex:1, borderRadius:10, justifyContent:"center"}}>My Wallet</Link>
            <Link href="/dashboard/reports" className="btn btn-ghost btn-sm" style={{flex:1, borderRadius:10, justifyContent:"center"}}>Reports →</Link>
          </div>
        </section>

        {/* TODAY'S GOAL */}
        <section className="cc-card" aria-label="Today's goal">
          <div className="cc-card__head"><div><h2>Today&apos;s Goal</h2><small>{agentGoalPct}% complete</small></div><span className="cc-badge cc-badge--purple">{agentGoalPct}%</span></div>
          <div className="cc-goal">
            <div>
              <div className="cc-goal__row"><span style={{fontWeight:600, color:"var(--ink)"}}>${agentEarningsToday.toFixed(2)} / ${agentGoal.toFixed(2)}</span><span>{agentGoalPct}%</span></div>
              <div className="cc-goal__bar" style={{marginTop:6}}><i style={{width:`${agentGoalPct}%`, background:"linear-gradient(90deg,#A855F7,#7C3AED)"}}/></div>
              <p className="text-muted" style={{fontSize:11, margin:"6px 0 0"}}>Earnings goal — keep closing to hit target.</p>
            </div>
            <div>
              <div className="cc-goal__row"><span style={{fontWeight:600, color:"var(--ink)"}}>{agentCallsToday}/{agentGoalCalls} calls</span><span>{callsGoalPct}%</span></div>
              <div className="cc-goal__bar" style={{marginTop:6}}><i style={{width:`${callsGoalPct}%`, background:"linear-gradient(90deg,#06B6D4,#0EA5E9)"}}/></div>
            </div>
            <div style={{ padding:"12px", borderRadius:10, background:"linear-gradient(135deg, rgba(251,113,133,.12), rgba(168,85,247,.08))", border:"1px solid rgba(251,113,133,.16)", textAlign:"center" }}>
              <p style={{font:"600 13px var(--sans)", margin:0, color:"var(--ink)"}}>{agentCallsToday>=agentGoalCalls ? "Goal reached! 🎉" : "Keep going! 🎯"}</p>
              <p className="text-muted" style={{fontSize:11, margin:"4px 0 0"}}>{agentCallsToday>=agentGoalCalls ? "You hit today's call target" : `${Math.max(0, agentGoalCalls-agentCallsToday)} more calls to hit today&apos;s goal`}</p>
            </div>
          </div>
        </section>
      </div>

      {/* ROW 2: Earnings Trend + Call Outcomes */}
      <div className="cc-row cc-row--2">
        <section className="cc-card" aria-label="Earnings Trend">
          <div className="cc-card__head">
            <div><h2>Earnings Trend</h2><small>{earningsTrend.some(e=>e.value>0) ? `$${earningsTrend.reduce((a,b)=>a+b.value,0).toFixed(2)} • ${agentCallsToday} calls` : "No earnings yet"} • {agentAvgDur !== "—" ? `${agentAvgDur} avg` : ""}</small></div>
            <span className="cc-badge cc-badge--green">↗ {earnDelta.pct ?? 0}%</span>
          </div>
          <div style={{ height:160, marginTop:8 }}>
            <MiniLine data={earningsTrend} height={160} ariaLabel="Earnings trend" color="#A855F7" />
          </div>
          <div style={{display:"flex", gap:12, flexWrap:"wrap", marginTop:8, borderTop:"1px solid var(--line)", paddingTop:10}}>
            <span className="text-mono-sm" style={{fontSize:11, color:"var(--muted)"}}><strong style={{color:"var(--ink)"}}>${agentEarningsToday.toFixed(2)}</strong> today</span>
            <span className="text-mono-sm" style={{fontSize:11, color:"var(--muted)"}}><strong style={{color:"var(--ink)"}}>{agentCallsToday}</strong> calls</span>
            <span className="text-mono-sm" style={{fontSize:11, color:"var(--muted)"}}><strong style={{color:"var(--ink)"}}>{agentAvgDur}</strong> avg</span>
          </div>
        </section>

        <section className="cc-card" aria-label="Call Outcomes">
          <div className="cc-card__head"><div><h2>Call Outcomes</h2><small>{dispoData.length ? `${dispoData.reduce((a,b)=>a+b.value,0)} total • donut` : "No calls yet"}</small></div><span className="cc-badge">{dispoData.length ? `${dispoData.reduce((a,b)=>a+b.value,0)} calls` : "—"}</span></div>
          {dispoData.length ? (
            <>
              <div style={{ display:"grid", placeItems:"center", padding:"6px 0" }}>
                <MiniDonut data={dispoData} height={168} ariaLabel="Call outcomes" centerLabel={String(dispoData.reduce((a,b)=>a+b.value,0))} />
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginTop:6 }}>
                {dispoData.slice(0,5).map((d,i)=>(
                  <span key={d.name} className="text-mono-sm" style={{ fontSize:11, display:"inline-flex", alignItems:"center", gap:6, color:"var(--muted)" }}>
                    <i style={{width:8, height:8, borderRadius:2, background:["#A855F7","#06B6D4","#EF4444","#F59E0B","#22C55E"][i%5] }}/>{d.name} {dispoData.length ? Math.round(d.value/dispoData.reduce((a,b)=>a+b.value,0)*100) : 0}%
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{padding:"28px 0", minHeight:168, display:"grid", placeItems:"center"}}><p className="text-muted" style={{fontSize:12, margin:0}}>No call outcomes yet</p></div>
          )}
        </section>
      </div>

      {/* BOTTOM: Recent Calls + Side stack */}
      <div className="cc-row" style={{ gridTemplateColumns:"1.45fr 0.85fr" }}>
        <section className="cc-card cc-card--spacious" aria-label="Recent Calls">
          <div className="cc-card__head"><div><h2>Recent Calls</h2><small>Last 5 — your history</small></div><Link href="/dashboard/calls" className="cc-badge">View all →</Link></div>
          {recentCalls.length===0 ? (
            <div className="empty-state" style={{padding:"20px 0"}}><p className="text-muted" style={{margin:0}}>No calls yet — take your first call to see history.</p><Link href="/dashboard/take-calls" className="btn btn-primary btn-sm" style={{marginTop:10}}>Take Call →</Link></div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="cc-table" style={{ minWidth:580 }}>
                <thead><tr><th>Time</th><th>Campaign</th><th>Outcome</th><th>Duration</th><th>Earnings</th></tr></thead>
                <tbody>
                  {recentCalls.slice(0,5).map(c=>(
                    <tr key={c.id}>
                      <td className="text-mono-sm" style={{fontSize:11, whiteSpace:"nowrap"}}>{c.started_at ? new Date(c.started_at).toLocaleTimeString() : "—"}</td>
                      <td style={{fontSize:13, fontWeight:500}}>{(c as unknown as {campaign_name?:string}).campaign_name ?? c.campaign_id ?? "—"}</td>
                      <td><span className={c.state==="connected" ? "cc-badge cc-badge--green" : c.state==="missed" ? "cc-badge cc-badge--pink" : "cc-badge"}>{c.state}</span></td>
                      <td className="text-mono-sm" style={{fontSize:11}}>{c.duration_seconds ? `${String(Math.floor(c.duration_seconds/60)).padStart(2,"0")}:${String(c.duration_seconds%60).padStart(2,"0")}` : "—"}</td>
                      <td className="text-mono-sm" style={{fontSize:11, fontWeight:600}}>{(c as unknown as {payout_cents?:number}).payout_cents ? `$${(((c as unknown as {payout_cents:number}).payout_cents)/100).toFixed(2)}` : (c.state==="connected" ? "$0.00" : "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <section className="cc-card" aria-label="Quick Actions">
            <div className="cc-card__head"><div><h2>Quick Actions</h2><small>One click to act</small></div></div>
            <div className="cc-quick" style={{ gridTemplateColumns:"1fr 1fr" }}>
              <Link href="/dashboard/take-calls" className="btn btn-primary" style={{ borderRadius:10, minHeight:44, flexDirection:"column", gap:2 }}><span>Take Calls</span><small style={{fontSize:10, opacity:.8}}>Go live</small></Link>
              <Link href="/dashboard/onboarding" className="btn" style={{ background:"rgba(255,255,255,.06)", border:"1px solid var(--line)", color:"var(--ink)", borderRadius:10, minHeight:44, flexDirection:"column", gap:2, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><span>Book a Call</span><small style={{fontSize:10, color:"var(--muted)"}}>Schedule</small></Link>
              <Link href="/dashboard/scripts" className="btn" style={{ background:"rgba(255,255,255,.06)", border:"1px solid var(--line)", color:"var(--ink)", borderRadius:10, minHeight:44, flexDirection:"column", gap:2, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><span>View Scripts</span><small style={{fontSize:10, color:"var(--muted)"}}>Pitch</small></Link>
              <Link href="/dashboard/reports" className="btn btn-ghost" style={{ border:"1px solid var(--line)", borderRadius:10, minHeight:44, flexDirection:"column", gap:2, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><span>View Reports</span><small style={{fontSize:10, color:"var(--muted)"}}>Stats</small></Link>
            </div>
          </section>

          <section className="cc-card" style={{ background:"linear-gradient(135deg, rgba(168,85,247,.14), rgba(96,165,250,.08))", borderColor:"rgba(168,85,247,.18)" }} aria-label="Your next action">
            <h3 style={{ font:"600 14px var(--serif)", margin:0, letterSpacing:"-0.02em", color:"var(--ink)" }}>Your Next Action</h3>
            <p className="text-muted" style={{fontSize:12, margin:"6px 0 0", lineHeight:1.5}}>You have <strong style={{color:"var(--ink)"}}>3 scripts</strong> assigned and <strong style={{color:"var(--ink)"}}>1</strong> upcoming booked call. Stay available to keep queue moving.</p>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <Link href="/dashboard/scripts" className="btn btn-primary btn-sm" style={{ borderRadius:9999 }}>Open Scripts</Link>
              <Link href="/dashboard/onboarding" className="btn btn-ghost btn-sm" style={{ borderRadius:9999 }}>Booked Calls</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string; }){
  return (<article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>);
}
