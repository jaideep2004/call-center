"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCents } from "@/lib/format";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { MiniPie, MiniLine, MiniBar } from "@/components/dashboard-mini-charts";
import { showToast } from "@/lib/use-toast";

function delta(values: number[]): { pct: number | null; dir: "up" | "down" | "flat" } {
  if (values.length < 2) return { pct: null, dir: "flat" };
  const first = values[0] || 0; const last = values[values.length-1] || 0;
  if (first===0 && last===0) return { pct:null, dir:"flat" };
  if (first===0) return { pct:100, dir:"up" };
  const pct = ((last-first)/first)*100; if(Math.abs(pct)<0.5) return {pct:0, dir:"flat"};
  return {pct:Math.round(pct), dir: pct>0?"up":"down"};
}
function PremiumEmpty({ title, hint, ctaHref, ctaLabel }: {title:string; hint:string; ctaHref:string; ctaLabel:string}) {
  return (<div className="premium-empty" role="img" aria-label={title}><div className="premium-empty__glow" aria-hidden/><p className="premium-empty__title">{title}</p><p className="premium-empty__hint">{hint}</p><Link href={ctaHref} className="btn btn-primary btn-sm" style={{marginTop:10}}>{ctaLabel}</Link></div>);
}

interface Overview { publisher: { id:string; name:string; fixed_price_cents:number|null; retreaver_status:string }; stats:{total_calls:number; qualified_calls:number; payout_cents:number}; campaigns:{campaign_id:string|null; campaign_name:string|null; price_cents:number|null; calls:number; qualified_calls:number; payout_cents:number;}[]; }
interface CallRow { id:string; uuid:string; caller:string|null; status:string|null; connected:boolean|null; payout_cents:number|null; campaign_name:string|null; created_at:string; }
type CampaignRowForTable = Overview["campaigns"][number] & { id: string };
const PAGE_SIZE=10;

function PublisherOverviewInner(){
  const router=useRouter(); const searchParams=useSearchParams();
  const initialQ=searchParams.get("q")??""; const initialPage=Math.max(1,Number(searchParams.get("page")??"1")||1);
  const [overview,setOverview]=useState<Overview|null>(null); const [recent,setRecent]=useState<CallRow[]>([]); const [loading,setLoading]=useState(true); const [payoutTrend,setPayoutTrend]=useState<number[]|null>(null);
  const [searchInput,setSearchInput]=useState(initialQ); const [debouncedQ,setDebouncedQ]=useState(initialQ); const [campaignPage,setCampaignPage]=useState(initialPage); const [callsPage,setCallsPage]=useState(initialPage); const hasMounted=useRef(false);

  const fetchData=useCallback(async()=>{
    const [ovRes,callsRes,payoutsRes]=await Promise.all([fetch("/api/v1/publisher/overview"),fetch("/api/v1/publisher/calls?limit=50"),fetch("/api/v1/publisher/payouts").catch(()=>null as unknown as Response)]);
    if(ovRes.ok){ const b=await ovRes.json(); setOverview(b.data??null); }
    if(callsRes.ok){ const b=await callsRes.json(); setRecent(b.data?.rows??[]); }
    if(payoutsRes && payoutsRes.ok){ try{ const b=await payoutsRes.json(); const monthly:Array<{payout_cents:number}>=b.data?.monthly??[]; if(monthly.length>=2) setPayoutTrend(monthly.map(m=>Number(m.payout_cents))); }catch{} }
    setLoading(false);
  },[]);
  useEffect(()=>{ fetchData(); },[fetchData]);
  useEffect(()=>{ const t=setTimeout(()=>{ const trimmed=searchInput.trim(); if(trimmed!==debouncedQ){ setDebouncedQ(trimmed); setCampaignPage(1); setCallsPage(1);} },300); return()=>clearTimeout(t); },[searchInput,debouncedQ]);
  useEffect(()=>{ if(!hasMounted.current){hasMounted.current=true; return;} const params=new URLSearchParams(); if(debouncedQ) params.set("q",debouncedQ); if(campaignPage>1) params.set("page",String(campaignPage)); const qs=params.toString(); if(qs===searchParams.toString()) return; router.replace(qs?`?${qs}`:"?",{scroll:false}); },[debouncedQ,campaignPage,router,searchParams]);

  const campaignsWithId: CampaignRowForTable[] = useMemo(()=>{ const list=overview?.campaigns??[]; return list.map(c=>({ ...c, id:c.campaign_id ?? `unassigned-${c.campaign_name ?? "na"}` })); },[overview]);
  const filteredCampaigns=useMemo(()=>{ if(!debouncedQ) return campaignsWithId; const q=debouncedQ.toLowerCase(); return campaignsWithId.filter(c=>(c.campaign_name??"unassigned").toLowerCase().includes(q)||String(c.price_cents??"").includes(q)||String(c.calls).includes(q)||String(c.payout_cents).includes(q)); },[campaignsWithId,debouncedQ]);
  const filteredRecent=useMemo(()=>{ if(!debouncedQ) return recent; const q=debouncedQ.toLowerCase(); return recent.filter(c=>(c.caller??"").toLowerCase().includes(q)||(c.campaign_name??"").toLowerCase().includes(q)||(c.status??"").toLowerCase().includes(q)||(c.connected?"connected":"missed").includes(q)||new Date(c.created_at).toLocaleString().toLowerCase().includes(q)); },[recent,debouncedQ]);
  const campaignTotalPages=Math.max(1,Math.ceil(filteredCampaigns.length/PAGE_SIZE)); const safeCampaignPage=Math.min(campaignPage,campaignTotalPages); const pagedCampaigns=useMemo(()=>{ const s=(safeCampaignPage-1)*PAGE_SIZE; return filteredCampaigns.slice(s,s+PAGE_SIZE); },[filteredCampaigns,safeCampaignPage]);
  const callsTotalPages=Math.max(1,Math.ceil(filteredRecent.length/PAGE_SIZE)); const safeCallsPage=Math.min(callsPage,callsTotalPages); const pagedRecent=useMemo(()=>{ const s=(safeCallsPage-1)*PAGE_SIZE; return filteredRecent.slice(s,s+PAGE_SIZE); },[filteredRecent,safeCallsPage]);

  const sparklineData: number[]|null = useMemo(()=>{ if(payoutTrend && payoutTrend.length>=2) return payoutTrend; if(campaignsWithId.length>=2) return campaignsWithId.map(c=>c.payout_cents); if(recent.length>=2){ const byDay=new Map<string,number>(); const sorted=[...recent].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()); for(const r of sorted){ const k=r.created_at.slice(0,10); byDay.set(k,(byDay.get(k)??0)+(r.payout_cents??0)); } const vals=Array.from(byDay.values()); return vals.length>=2?vals:recent.map(r=>r.payout_cents??0); } return null; },[payoutTrend,campaignsWithId,recent]);

  const handleRefresh=()=>{ setLoading(true); fetchData().then(()=>showToast("Overview refreshed","success")); };

  const pieByCampaign=useMemo(()=>{ if(!campaignsWithId.length) return [] as {name:string;value:number}[]; return campaignsWithId.filter(c=>c.payout_cents>0).map(c=>({name:(c.campaign_name??"Unassigned").slice(0,18), value:c.payout_cents})).slice(0,6); },[campaignsWithId]);
  const qualifiedBar=useMemo(()=>{ if(!campaignsWithId.length) return [] as {name:string;value:number}[]; return campaignsWithId.slice(0,6).map(c=>({name:(c.campaign_name??"Unassigned").slice(0,14), value:c.qualified_calls})); },[campaignsWithId]);
  const totalCallsForBarLabel=useMemo(()=>campaignsWithId.reduce((a,b)=>a+b.calls,0),[campaignsWithId]);
  const qualifiedPct = overview ? (overview.stats.total_calls ? Math.round(overview.stats.qualified_calls/overview.stats.total_calls*100) : 0) : 0;
  const earnDelta = useMemo(()=> sparklineData ? delta(sparklineData) : {pct:null, dir:"flat" as const},[sparklineData]);
  const hasEarn = (overview?.stats.payout_cents ?? 0) > 0 || (sparklineData && sparklineData.some(v=>v>0));

  const campaignColumns: Column<CampaignRowForTable>[] = [
    { key:"campaign_name", header:"Campaign", sortable:true, render:(c)=>c.campaign_name ?? <span className="text-muted">Unassigned</span> },
    { key:"price_cents", header:"Buyer price", render:(c)=>c.price_cents ? formatCents(c.price_cents) : "—" },
    { key:"calls", header:"Calls", sortable:true, render:(c)=><span className="text-mono-sm">{c.calls}</span> },
    { key:"qualified_calls", header:"Qualified", render:(c)=><span className="text-mono-sm">{c.qualified_calls}</span> },
    { key:"payout_cents", header:"Payout", sortable:true, className:"text-right", render:(c)=><span className="text-mono-sm" style={{fontWeight:600}}>{formatCents(c.payout_cents)}</span> },
  ];
  const callColumns: Column<CallRow>[] = [
    { key:"created_at", header:"Date", sortable:true, render:(c)=><span className="text-mono-sm">{new Date(c.created_at).toLocaleString()}</span> },
    { key:"caller", header:"Caller", render:(c)=><span className="text-mono-sm">{c.caller ?? "—"}</span> },
    { key:"campaign_name", header:"Campaign", render:(c)=>c.campaign_name ?? <span className="text-muted">—</span> },
    { key:"status", header:"Status", render:(c)=><span className={`badge ${c.connected ? "badge-success" : "badge-info"}`}>{c.connected?"Connected":c.status??"—"}</span> },
    { key:"payout_cents", header:"Payout", className:"text-right", render:(c)=><span className="text-mono-sm">{c.payout_cents ? formatCents(c.payout_cents) : "—"}</span> },
  ];
  const [campaignSortBy,setCampaignSortBy]=useState<string>("payout_cents"); const [campaignOrder,setCampaignOrder]=useState<"asc"|"desc">("desc");
  const [callSortBy,setCallSortBy]=useState<string>("created_at"); const [callOrder,setCallOrder]=useState<"asc"|"desc">("desc");
  const sortedPagedCampaigns=useMemo(()=>{ const out=[...pagedCampaigns]; out.sort((a,b)=>{ let cmp=0; if(campaignSortBy==="campaign_name") cmp=(a.campaign_name??"").localeCompare(b.campaign_name??""); else if(campaignSortBy==="calls") cmp=a.calls-b.calls; else if(campaignSortBy==="payout_cents") cmp=a.payout_cents-b.payout_cents; return campaignOrder==="asc"?cmp:-cmp; }); return out; },[pagedCampaigns,campaignSortBy,campaignOrder]);
  const sortedPagedRecent=useMemo(()=>{ const out=[...pagedRecent]; out.sort((a,b)=>{ let cmp=0; if(callSortBy==="created_at") cmp=new Date(a.created_at).getTime()-new Date(b.created_at).getTime(); else if(callSortBy==="caller") cmp=(a.caller??"").localeCompare(b.caller??""); return callOrder==="asc"?cmp:-cmp; }); return out; },[pagedRecent,callSortBy,callOrder]);
  function handleCampaignSort(f:string){ if(campaignSortBy===f) setCampaignOrder(o=>o==="asc"?"desc":"asc"); else{ setCampaignSortBy(f); setCampaignOrder(f==="campaign_name"?"asc":"desc"); } }
  function handleCallSort(f:string){ if(callSortBy===f) setCallOrder(o=>o==="asc"?"desc":"asc"); else{ setCallSortBy(f); setCallOrder(f==="caller"?"asc":"desc"); } }

  if(loading) return <div className="dashboard-page"><div className="stack" style={{gap:12}}>{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton skeleton-text"/>)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i/> PUBLISHER / OVERVIEW</p>
          <h1>{overview?.publisher.name ?? "Overview"}</h1>
          <p className="text-muted" style={{fontSize:13, margin:"6px 0 0", maxWidth:560}}>Earned, qualified rate and where your calls convert — so you invest in the right campaign.</p>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <span className={`badge ${overview?.publisher.retreaver_status==="active"?"badge-success":overview?.publisher.retreaver_status==="paused"?"badge-warning":"badge-info"}`}>{overview?.publisher.retreaver_status ?? "—"}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>Refresh</button>
        </div>
      </div>

      {/* HERO BENTO — earned hero + calls hero + side stack */}
      <div className="admin-hero-bento" aria-label="Primary metrics" data-role="publisher">
        <div className="hero-card hero-card--primary" style={{"--accent-rgb":"245,158,11" } as React.CSSProperties}>
          <div className="hero-card__top">
            <span className="hero-kicker">EARNED · TOTAL</span>
            {hasEarn && earnDelta.pct!==null ? <span className={`delta-badge ${earnDelta.dir==="up"?"delta-up":earnDelta.dir==="down"?"delta-down":""}`}>{earnDelta.dir==="up"?"↗":earnDelta.dir==="down"?"↘":"→"} {Math.abs(earnDelta.pct!)}%</span> : <span className="delta-badge delta-neutral">live</span>}
          </div>
          <p className="hero-value">{formatCents(overview?.stats.payout_cents ?? 0)}</p>
          <p className="hero-sub">{overview?.stats.total_calls ?? 0} calls · {qualifiedPct}% qualified · <span style={{color:"var(--muted)"}}>{overview?.publisher.fixed_price_cents ? `${formatCents(overview.publisher.fixed_price_cents)}/call` : "variable payout"}</span></p>
          <div className="hero-spark" aria-hidden>
            {hasEarn && sparklineData && sparklineData.length>=2 ? <MiniLine data={sparklineData.map((v,i)=>({name:`${i}`, value: Math.round(v/100)}))} height={96} ariaLabel="Payout trend" color="#F59E0B" /> : (
              <div style={{height:96, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10, background:"rgba(31,16,55,.4)"}}>
                No payouts yet — share your tracking link to start earning
              </div>
            )}
          </div>
          <div className="hero-actions">
            <Link href="/dashboard/publisher/payouts" className="btn btn-sm" style={{flex:1}}>Payouts →</Link>
            <Link href="/dashboard/publisher/campaigns" className="btn btn-ghost btn-sm" style={{flex:1}}>Campaigns</Link>
          </div>
          <div className="hero-glow" aria-hidden/>
        </div>

        <div className="hero-card">
          <div className="hero-card__top">
            <span className="hero-kicker">CALLS · QUALIFIED</span>
            <span className="delta-badge" style={{background:"rgba(16,185,129,.14)", border:"1px solid rgba(16,185,129,.28)", color:"#6ee7b7"}}>{qualifiedPct}% rate</span>
          </div>
          <p className="hero-value">{overview?.stats.total_calls ?? 0}<span style={{font:"400 20px var(--sans)", color:"var(--muted)", marginLeft:8}}>/ {overview?.stats.qualified_calls ?? 0} qualified</span></p>
          <p className="hero-sub">{filteredCampaigns.length} active campaigns · <span style={{color:"var(--muted)"}}>avg {overview?.stats.total_calls ? (overview.stats.qualified_calls/overview.stats.total_calls*100).toFixed(0) : 0}% convert</span></p>
          <div className="hero-spark" aria-hidden>
            {qualifiedBar.length ? <MiniBar data={qualifiedBar.slice(0,6)} height={96} ariaLabel="Qualified per campaign" /> : (
              <div style={{height:96, display:"grid", placeItems:"center", color:"var(--muted)", font:"11px var(--mono)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:10}}>No qualified breakdown yet</div>
            )}
          </div>
          <div className="hero-actions">
            <Link href="/dashboard/publisher/calls" className="btn btn-sm" style={{flex:1}}>Call log →</Link>
            <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>showToast("Share your tracking link to start receiving calls.","info")}>How to get calls</button>
          </div>
        </div>

        <div className="hero-side-stack">
          <div className="mini-tile">
            <span className="mini-tile__kicker">PER-CALL PAYOUT</span>
            <p className="mini-tile__value">{overview?.publisher.fixed_price_cents ? formatCents(overview.publisher.fixed_price_cents) : "—"}</p>
            <p className="mini-tile__sub">Fixed price</p>
            <Link href="/dashboard/publisher/settings" className="mini-tile__link">Settings →</Link>
          </div>
          <div className="mini-tile">
            <div className="mini-tile__head"><span className="mini-tile__kicker">STATUS</span><span className={`dot ${overview?.publisher.retreaver_status==="active"?"dot--online":"dot--offline"}`}><i/></span></div>
            <p className="mini-tile__value" style={{fontSize:18, textTransform:"capitalize"}}>{overview?.publisher.retreaver_status ?? "—"}</p>
            <p className="mini-tile__sub">Retreaver</p>
            <Link href="/dashboard/publisher/settings" className="mini-tile__link">Manage →</Link>
          </div>
        </div>
      </div>

      {/* LEVEL 2 — distinct breakdowns, not duplicate trend */}
      <div className="mini-bento" aria-label="Publisher insights">
        <div className="mini-chart-card">
          <div className="mini-chart-card-head"><div><span className="mini-chart-label">PAYOUT BY CAMPAIGN</span><span className="mini-chart-subtitle">{pieByCampaign.length ? `${pieByCampaign.length} campaigns` : "no payouts yet"}</span></div></div>
          <div className="mini-chart-card-body">{pieByCampaign.length ? <MiniPie data={pieByCampaign} height={160} ariaLabel="Payout by campaign pie"/> : <PremiumEmpty title="No payout breakdown" hint="Once a qualified call is billed, payout per campaign appears here." ctaHref="/dashboard/publisher/campaigns" ctaLabel="View campaigns"/>}</div>
        </div>
        <div className="mini-chart-card">
          <div className="mini-chart-card-head"><div><span className="mini-chart-label">QUALIFIED VS TOTAL</span><span className="mini-chart-subtitle">{overview?.stats.qualified_calls ?? 0} / {totalCallsForBarLabel} qualified</span></div></div>
          <div className="mini-chart-card-body">{qualifiedBar.length ? <MiniBar data={qualifiedBar} height={160} ariaLabel="Qualified vs total bar"/> : <PremiumEmpty title="No qualification data" hint="Qualified calls show which campaigns convert best." ctaHref="/dashboard/publisher/calls" ctaLabel="Call log"/>}</div>
        </div>
        <div className="mini-chart-card" style={{display:"flex", flexDirection:"column"}}>
          <div className="mini-chart-card-head"><div><span className="mini-chart-label">WHAT TO DO NEXT</span><span className="mini-chart-subtitle">Publisher quick actions</span></div></div>
          <div className="mini-chart-card-body" style={{gap:10, justifyContent:"center"}}>
            <div className="action-list">
              <Link href="/dashboard/publisher/campaigns" className="action-row"><span><i className="action-dot action-dot--amber"/> Browse campaigns</span><span className="badge">View →</span></Link>
              <button onClick={()=>showToast("Copy your tracking number for this campaign and place it in your marketing.","info")} className="action-row" style={{width:"100%", background:"none", border:0, cursor:"pointer", textAlign:"left"}}><span><i className="action-dot action-dot--violet"/> Get tracking link</span><span className="badge">Copy</span></button>
              <Link href="/dashboard/publisher/payouts" className="action-row"><span><i className="action-dot action-dot--cyan"/> Payout history</span><span className="badge">{formatCents(overview?.stats.payout_cents ?? 0)}</span></Link>
              <Link href="/dashboard/publisher/settings" className="action-row"><span><i className="action-dot"/> Settings</span><span className="badge">Manage →</span></Link>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__primary">
          <div style={{position:"relative", flex:"1 1 260px", maxWidth:380}}>
            <input className="input" placeholder="Search campaigns, callers, status…" value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} aria-label="Search overview"/>
            {searchInput && <button onClick={()=>setSearchInput("")} aria-label="Clear search" style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:16, lineHeight:1}}>×</button>}
          </div>
        </div>
        <span className="filter-bar__meta">{filteredCampaigns.length} campaign(s) · {filteredRecent.length} call(s){debouncedQ?" (filtered)":""}</span>
      </div>

      <section className="card card--spacious">
        <div className="card-header" style={{marginBottom:0, padding:0, border:0}}><h2 style={{font:"500 18px var(--serif)", margin:0}}>Campaigns</h2><Link href="/dashboard/publisher/campaigns" className="btn btn-ghost btn-sm">View all</Link></div>
        {(overview?.campaigns.length ?? 0)===0 ? <div className="empty-state"><p><strong>No campaign data yet</strong></p><p className="text-muted">Once calls are attributed to you, they&apos;ll appear here per campaign.</p><Link href="/dashboard/publisher/campaigns" className="btn btn-primary btn-sm" style={{marginTop:"var(--space-4)"}}>Browse Campaigns</Link></div> : filteredCampaigns.length===0 ? <div className="empty-state"><p>No campaigns match &quot;{debouncedQ}&quot;.</p><button className="btn btn-secondary btn-sm" style={{marginTop:"var(--space-4)"}} onClick={()=>setSearchInput("")}>Clear search</button></div> : <DataTable columns={campaignColumns} data={sortedPagedCampaigns} loading={false} emptyMessage="No campaigns match your search." page={safeCampaignPage} totalPages={campaignTotalPages} total={filteredCampaigns.length} onPageChange={setCampaignPage} sortBy={campaignSortBy} order={campaignOrder} onSort={handleCampaignSort} />}
      </section>

      <section className="card card--spacious">
        <div className="card-header" style={{marginBottom:0, padding:0, border:0}}><h2 style={{font:"500 18px var(--serif)", margin:0}}>Recent calls</h2><Link href="/dashboard/publisher/calls" className="btn btn-ghost btn-sm">View all</Link></div>
        {recent.length===0 ? <div className="empty-state"><p><strong>No calls yet</strong></p><p className="text-muted">Calls routed through your campaign will appear here.</p><div style={{display:"flex", gap:8, marginTop:"var(--space-4)"}}><Link href="/dashboard/publisher/campaigns" className="btn btn-primary btn-sm">View Campaigns</Link><button className="btn btn-secondary btn-sm" onClick={()=>showToast("Share your tracking link to start receiving calls.","info")}>How to get calls</button></div></div> : filteredRecent.length===0 ? <div className="empty-state"><p>No calls match &quot;{debouncedQ}&quot;.</p><button className="btn btn-secondary btn-sm" style={{marginTop:"var(--space-4)"}} onClick={()=>setSearchInput("")}>Clear search</button></div> : <DataTable columns={callColumns} data={sortedPagedRecent} loading={false} emptyMessage="No calls match your search." page={safeCallsPage} totalPages={callsTotalPages} total={filteredRecent.length} onPageChange={setCallsPage} sortBy={callSortBy} order={callOrder} onSort={handleCallSort} />}
      </section>
    </div>
  );
}

export default function PublisherOverviewPage(){
  return <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{height:18, width:200}}/></div>}><PublisherOverviewInner/></Suspense>;
}
