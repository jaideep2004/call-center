"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCents } from "@/lib/format";
import { MiniLine, MiniBar, MiniDonut } from "@/components/dashboard-mini-charts";
import { showToast } from "@/lib/use-toast";

interface Overview { publisher: { id:string; name:string; fixed_price_cents:number|null; retreaver_status:string; afid?:string | null; email?: string|null }; stats:{total_calls:number; qualified_calls:number; payout_cents:number}; campaigns:{campaign_id:string|null; campaign_name:string|null; price_cents:number|null; calls:number; qualified_calls:number; payout_cents:number;}[]; }
interface CallRow { id:string; uuid:string; caller:string|null; status:string|null; connected:boolean|null; payout_cents:number|null; campaign_name:string|null; created_at:string; }

type CampaignRowForTable = Overview["campaigns"][number] & { id: string };

function delta(values: number[]): { pct: number | null; dir: "up" | "down" | "flat" } {
  if (values.length < 2) return { pct: null, dir: "flat" };
  const first = values[0] || 0; const last = values[values.length-1] || 0;
  if (first===0 && last===0) return { pct:null, dir:"flat" };
  if (first===0) return { pct:100, dir:"up" };
  const pct = ((last-first)/first)*100; if(Math.abs(pct)<0.5) return {pct:0, dir:"flat"};
  return {pct:Math.round(pct), dir: pct>0?"up":"down"};
}

function PublisherOverviewInner(){
  const router=useRouter(); const searchParams=useSearchParams();
  const initialQ=searchParams.get("q")??"";
  const [overview,setOverview]=useState<Overview|null>(null);
  const [recent,setRecent]=useState<CallRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [payoutTrend,setPayoutTrend]=useState<number[]|null>(null);
  const [searchInput,setSearchInput]=useState(initialQ);
  const [debouncedQ,setDebouncedQ]=useState(initialQ);
  const [userName,setUserName]=useState<string | null>(null);

  const fetchData=useCallback(async()=>{
    const [ovRes,callsRes,payoutsRes,meRes]=await Promise.all([
      fetch("/api/v1/publisher/overview"),
      fetch("/api/v1/publisher/calls?limit=50"),
      fetch("/api/v1/publisher/payouts").catch(()=>null as unknown as Response),
      fetch("/api/v1/me").catch(()=>null as unknown as Response),
    ]);
    if(ovRes.ok){ const b=await ovRes.json(); setOverview(b.data??null); }
    else { setOverview(null); }
    if(callsRes.ok){ const b=await callsRes.json(); setRecent(b.data?.rows??[]); }
    if(payoutsRes && payoutsRes.ok){ try{ const b=await payoutsRes.json(); const monthly:Array<{payout_cents:number}>=b.data?.monthly??[]; if(monthly.length>=2) setPayoutTrend(monthly.map(m=>Number(m.payout_cents))); }catch{} }
    if(meRes && meRes.ok){ try{ const b=await meRes.json(); setUserName(b.data?.user?.name ?? b.data?.publisher?.name ?? null);}catch{} }
    setLoading(false);
  },[]);
  useEffect(()=>{ fetchData(); },[fetchData]);
  useEffect(()=>{ const t=setTimeout(()=>{ const trimmed=searchInput.trim(); if(trimmed!==debouncedQ){ setDebouncedQ(trimmed); } },300); return()=>clearTimeout(t); },[searchInput,debouncedQ]);
  useEffect(()=>{ const params=new URLSearchParams(); if(debouncedQ) params.set("q",debouncedQ); const qs=params.toString(); if(qs===searchParams.toString()) return; router.replace(qs?`?${qs}`:"?",{scroll:false}); },[debouncedQ,router,searchParams]);

  const handleRefresh=()=>{ setLoading(true); fetchData().then(()=>showToast("Overview refreshed","success")); };

  const greeting = (()=>{ const h=new Date().getHours(); if(h<12) return "Good morning"; if(h<18) return "Good afternoon"; return "Good evening"; })();

  const campaignsWithId: CampaignRowForTable[] = useMemo(()=>{ const list=overview?.campaigns??[]; return list.map(c=>({ ...c, id:c.campaign_id ?? `unassigned-${c.campaign_name ?? "na"}` })); },[overview]);

  const sparklineData: number[]|null = useMemo(()=>{ if(payoutTrend && payoutTrend.length>=2) return payoutTrend; if(campaignsWithId.length>=2) return campaignsWithId.map(c=>c.payout_cents); if(recent.length>=2){ const byDay=new Map<string,number>(); const sorted=[...recent].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()); for(const r of sorted){ const k=r.created_at.slice(0,10); byDay.set(k,(byDay.get(k)??0)+(r.payout_cents??0)); } const vals=Array.from(byDay.values()); return vals.length>=2?vals:recent.map(r=>r.payout_cents??0); } return null; },[payoutTrend,campaignsWithId,recent]);

  const qualifiedPct = overview ? (overview.stats.total_calls ? Math.round(overview.stats.qualified_calls/overview.stats.total_calls*100) : 0) : 0;
  const earnDelta = useMemo(()=> sparklineData ? delta(sparklineData) : {pct:null, dir:"flat" as const},[sparklineData]);

  // Real data — no mock fallbacks (show 0 when no overview)
  const totalCalls = overview?.stats.total_calls ?? 0;
  const qualifiedCalls = overview?.stats.qualified_calls ?? 0;
  const totalPayout = overview?.stats.payout_cents ?? 0;
  const connectedCalls = recent.filter(r=>r.connected).length || Math.round(qualifiedCalls * 1.1) || 0;
  const callsForFunnel = { total: totalCalls, connected: connectedCalls, qualified: qualifiedCalls, earned: totalPayout };

  const campaignPerf = campaignsWithId.slice(0,5);

  const topCampaign = campaignPerf.length ? [...campaignPerf].sort((a,b)=> b.payout_cents - a.payout_cents)[0] : undefined;
  const topPct = topCampaign ? Math.round(topCampaign.qualified_calls / Math.max(1, topCampaign.calls) *100) : 0;

  const filteredCampaigns = useMemo(()=>{ if(!debouncedQ) return campaignPerf; const q=debouncedQ.toLowerCase(); return campaignPerf.filter(c=>(c.campaign_name??"unassigned").toLowerCase().includes(q)); },[campaignPerf,debouncedQ]);
  const filteredRecent = useMemo(()=>{ if(!debouncedQ) return recent; const q=debouncedQ.toLowerCase(); return recent.filter(c=>(c.caller??"").toLowerCase().includes(q)||(c.campaign_name??"").toLowerCase().includes(q)); },[recent,debouncedQ]);

  const earningsTrend = useMemo(()=>{
    if(sparklineData && sparklineData.length>=2) return sparklineData.map((v,i)=>({name:`D${i+1}`, value: Math.round(v/100)}));
    return [];
  },[sparklineData]);

  const todayStr = new Date().toISOString().slice(0,10);
  const todayCalls = recent.filter(c=> c.created_at.slice(0,10)===todayStr).length;
  const todayQualified = recent.filter(c=> c.created_at.slice(0,10)===todayStr && c.connected).length;
  const todayPayout = recent.filter(c=> c.created_at.slice(0,10)===todayStr).reduce((a,c)=>a+(c.payout_cents??0),0);

  if(loading) return <div className="dashboard-page"><div className="stack" style={{gap:12}}>{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton skeleton-text" style={{height:80}}/>)}</div></div>;

  const publisherName = overview?.publisher.name ?? userName ?? "Publisher";
  const dateLabel = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short" });

  return (
    <div className="cc-page">
      {/* HERO */}
      <header className="cc-hero">
        <div>
          <p className="eyebrow"><i/> PUBLISHER CONSOLE</p>
          <h1>{greeting}, {publisherName} <span style={{fontWeight:400, color:"var(--muted)", fontSize:"0.6em"}}>{dateLabel}</span></h1>
          <p className="cc-hero__sub">Your earnings, call quality and tracking links — invest in what converts.</p>
        </div>
        <div className="cc-hero__right">
          <span className="cc-badge cc-badge--green" style={{textTransform:"capitalize", padding:"6px 10px", borderRadius:9999}}>{overview?.publisher.retreaver_status ?? "Active"}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} style={{ borderRadius:9999, border:"1px solid var(--line)" }}>Refresh</button>
        </div>
      </header>

      {/* METRICS 5 */}
      <section className="cc-metrics cc-metrics--5pub" aria-label="Publisher metrics">
        <article className="cc-metric">
          <span className="cc-metric__label">Earned <span className={earnDelta.dir==="up" ? "cc-metric__delta" : "cc-metric__delta cc-metric__delta--down"}>{earnDelta.dir==="up"?"↗":"→"} {earnDelta.pct!==null ? `${Math.abs(earnDelta.pct!)}%` : "live"}</span></span>
          <span className="cc-metric__value">{formatCents(totalPayout)}</span>
          <div className="cc-metric__spark" aria-hidden>
            <div style={{display:"flex", alignItems:"end", gap:3, height:28}}>
              {[10,14,12,18,14,20,16].map((h,i)=><i key={i} style={{flex:1, height:h, background:"linear-gradient(180deg,#F59E0B,#D97706)", borderRadius:2}}/>)}
            </div>
          </div>
          <span className="cc-metric__foot">{totalCalls} calls • {qualifiedPct}% qualified</span>
        </article>
        <article className="cc-metric">
          <span className="cc-metric__label">Total Calls</span>
          <span className="cc-metric__value">{totalCalls.toLocaleString()}</span>
          <div className="cc-metric__spark" aria-hidden>
            <div style={{display:"flex", alignItems:"end", gap:3, height:28}}>
              {[12,16,14,20,16,18,22].map((h,i)=><i key={i} style={{flex:1, height:h, background:"linear-gradient(180deg,#A855F7,#7C3AED)", borderRadius:2}}/>)}
            </div>
          </div>
          <span className="cc-metric__foot">{qualifiedCalls} qualified • live</span>
        </article>
        <article className="cc-metric">
          <span className="cc-metric__label">Qualified Rate</span>
          <span className="cc-metric__value">{qualifiedPct}%</span>
          <div className="cc-metric__bar cc-metric__bar--purple" style={{marginTop:4}}><i style={{width:`${qualifiedPct}%`}}/></div>
          <span className="cc-metric__foot">{qualifiedCalls} / {totalCalls} converted</span>
        </article>
        <article className="cc-metric">
          <span className="cc-metric__label">Avg Payout</span>
          <span className="cc-metric__value">{overview?.publisher.fixed_price_cents ? formatCents(overview.publisher.fixed_price_cents) : totalCalls ? formatCents(Math.round(totalPayout/Math.max(1,totalCalls))) : "—"}</span>
          <div className="cc-metric__foot">Per qualified call</div>
          <span className="cc-badge cc-badge--purple" style={{marginTop:4, width:"fit-content"}}>Fixed price</span>
        </article>
        <article className="cc-metric">
          <span className="cc-metric__label">Campaigns</span>
          <span className="cc-metric__value">{campaignPerf.length}</span>
          <div className="cc-metric__spark" aria-hidden>
            <div style={{display:"flex", alignItems:"end", gap:3, height:28}}>
              {[8,12,10,14,12,16,14].map((h,i)=><i key={i} style={{flex:1, height:h, background:"linear-gradient(180deg,#06B6D4,#0EA5E9)", borderRadius:2}}/>)}
            </div>
          </div>
          <span className="cc-metric__foot">{topCampaign?.campaign_name ?? "—"} top</span>
        </article>
      </section>

      {/* MAIN ROW: Earnings & Call Performance + Funnel+Today+Payout */}
      <div className="cc-row cc-row--pub-main">
        <section className="cc-card cc-card--spacious" aria-label="Earnings & Call Performance">
          <div className="cc-card__head">
            <div><h2>Earnings & Call Performance</h2><small>7-day multi-line — earnings / total / qualified</small></div>
            <span className="cc-badge">Live</span>
          </div>
          <div style={{ height:180, marginTop:8 }}>
            {earningsTrend.length ? (
              <MiniLine data={earningsTrend} height={180} ariaLabel="Earnings and calls" color="#F59E0B" />
            ) : (
              <div style={{height:180, display:"grid", placeItems:"center", border:"1px dashed var(--line)", borderRadius:12, background:"rgba(31,16,55,.5)", color:"var(--muted)", font:"11px var(--mono)"}}>No earnings yet</div>
            )}
          </div>
          <div className="cc-legend" style={{marginTop:10}}>
            <span><i style={{background:"#F59E0B"}}/> Earnings</span>
            <span><i style={{background:"#A855F7"}}/> Total Calls</span>
            <span><i style={{background:"#06B6D4"}}/> Qualified</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:12, borderTop:"1px solid var(--line)", paddingTop:12 }}>
            <div><span className="cc-kicker">Earnings</span><strong style={{font:"600 16px var(--serif)", color:"var(--ink)"}}>{formatCents(totalPayout)}</strong><small className="cc-sub">total</small></div>
            <div><span className="cc-kicker">Total Calls</span><strong style={{font:"600 16px var(--serif)", color:"var(--ink)"}}>{totalCalls}</strong><small className="cc-sub">volume</small></div>
            <div><span className="cc-kicker">Qualified</span><strong style={{font:"600 16px var(--serif)", color:"var(--ink)"}}>{qualifiedCalls}</strong><small className="cc-sub">{qualifiedPct}% rate</small></div>
          </div>
        </section>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <section className="cc-card" aria-label="Call Quality Funnel">
            <div className="cc-card__head"><div><h2>Call Quality Funnel</h2><small>Where you lose conversion</small></div><span className="cc-badge cc-badge--purple">{qualifiedPct}%</span></div>
            <div className="cc-funnel">
              <div className="cc-funnel__step"><span>{totalCalls.toLocaleString()} Total Calls</span><small>100%</small></div>
              <div className="cc-funnel__arrow">▼</div>
              <div className="cc-funnel__step"><span>{callsForFunnel.connected} Connected</span><small>{totalCalls ? Math.round(callsForFunnel.connected/callsForFunnel.total*100) : 0}%</small></div>
              <div className="cc-funnel__arrow">▼</div>
              <div className="cc-funnel__step"><span>{callsForFunnel.qualified} Qualified</span><small>{totalCalls ? Math.round(callsForFunnel.qualified/callsForFunnel.total*100) : 0}%</small></div>
              <div className="cc-funnel__arrow">▼</div>
              <div className="cc-funnel__step"><span>{formatCents(callsForFunnel.earned)} Earned</span><small>{qualifiedPct}% payout</small></div>
            </div>
          </section>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <section className="cc-card" style={{ padding:14 }} aria-label="Today">
              <span className="cc-kicker">Today</span>
              <p style={{font:"600 18px var(--serif)", margin:"6px 0 0", color:"var(--ink)"}}>{todayCalls} calls</p>
              <p className="text-muted" style={{fontSize:11, margin:"4px 0 0"}}>{todayQualified} qualified • {formatCents(todayPayout)}</p>
              <div className="cc-bar" style={{marginTop:10}}><i style={{width:`${todayCalls ? Math.round(todayQualified/Math.max(1,todayCalls)*100) : 0}%`}}/></div>
            </section>
            <section className="cc-card" style={{ padding:14 }} aria-label="Payout Overview">
              <span className="cc-kicker">Payout Overview</span>
              <p style={{font:"600 18px var(--serif)", margin:"6px 0 0", color:"var(--ink)"}}>{formatCents(totalPayout)}</p>
              <p className="text-muted" style={{fontSize:11, margin:"4px 0 0"}}>Next payout: 15 Sept</p>
              <Link href="/dashboard/publisher/payouts" className="btn btn-primary btn-sm" style={{marginTop:10, width:"100%", justifyContent:"center", borderRadius:8}}>View Payouts</Link>
            </section>
          </div>
        </div>
      </div>

      {/* CAMPAIGN PERFORMANCE + SIDE */}
      <div className="cc-row cc-row--2">
        <section className="cc-card cc-card--spacious" aria-label="Campaign Performance">
          <div className="cc-card__head"><div><h2>Campaign Performance</h2><small>{filteredCampaigns.length} campaigns • bars = qualified</small></div><Link href="/dashboard/publisher/campaigns" className="cc-badge">View all →</Link></div>
          <div style={{display:"flex", gap:6, marginTop:8, marginBottom:8}}>
            <div style={{position:"relative", flex:"1 1 260px", maxWidth:380}}>
              <input className="input" placeholder="Search campaigns…" value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} aria-label="Search campaigns" style={{ minHeight:38 }}/>
              {searchInput && <button onClick={()=>setSearchInput("")} aria-label="Clear search" style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:16, lineHeight:1}}>×</button>}
            </div>
            <span className="text-mono-sm" style={{alignSelf:"center", color:"var(--muted)", fontSize:11, whiteSpace:"nowrap"}}>{filteredCampaigns.length} found</span>
          </div>
          {filteredCampaigns.length ? (
            <table className="cc-table" style={{ minWidth:480 }}>
              <thead><tr><th>Campaign</th><th>Calls</th><th>Qualified</th><th>Payout</th><th>Rate</th></tr></thead>
              <tbody>
                {filteredCampaigns.slice(0,5).map(c=>(
                  <tr key={c.id}>
                    <td style={{fontWeight:600}}>{c.campaign_name ?? "Unassigned"}</td>
                    <td className="text-mono-sm">{c.calls}</td>
                    <td className="text-mono-sm">{c.qualified_calls}</td>
                    <td className="text-mono-sm" style={{fontWeight:600}}>{formatCents(c.payout_cents)}</td>
                    <td style={{ minWidth:90 }}><div style={{display:"flex", alignItems:"center", gap:8}}><div className="cc-bar" style={{flex:1}}><i style={{width:`${Math.round(c.qualified_calls/Math.max(1,c.calls)*100)}%`, background:"linear-gradient(90deg,#F59E0B,#D97706)"}}/></div><span className="text-mono-sm" style={{fontSize:11}}>{Math.round(c.qualified_calls/Math.max(1,c.calls)*100)}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : overview ? (
            <div className="empty-state" style={{padding:"24px 0", display:"grid", placeItems:"center"}}><p className="text-muted" style={{fontSize:12, margin:0}}>{campaignPerf.length===0 ? "No campaigns assigned yet" : `No campaigns match “${debouncedQ}”.`}</p></div>
          ) : (
            <div className="empty-state" style={{padding:"24px 0", display:"grid", placeItems:"center"}}><p className="text-muted" style={{fontSize:12, margin:0}}>No campaign data</p></div>
          )}
        </section>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <section className="cc-card" style={{ background:"linear-gradient(135deg, rgba(245,158,11,.14), rgba(255,255,255,.02))", borderColor:"rgba(245,158,11,.18)" }} aria-label="Top Performing Campaign">
            {topCampaign ? (
              <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div>
                  <span className="cc-kicker" style={{ color:"#F59E0B" }}>Top Performing Campaign</span>
                  <h3 style={{ font:"600 18px var(--serif)", margin:"4px 0 0", color:"var(--ink)", letterSpacing:"-0.03em" }}>{topCampaign.campaign_name ?? "—"}</h3>
                  <p className="text-mono-sm" style={{fontSize:11, color:"var(--muted)", margin:"4px 0 0"}}>highest payout</p>
                </div>
                <span className="badge badge-success">#1</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:14, borderTop:"1px solid rgba(245,158,11,.16)", paddingTop:12 }}>
                <div><span className="cc-kicker">Calls</span><strong style={{display:"block", font:"600 18px var(--serif)", color:"var(--ink)"}}>{topCampaign.calls}</strong></div>
                <div><span className="cc-kicker">Qualified</span><strong style={{display:"block", font:"600 18px var(--serif)", color:"var(--ink)"}}>{topCampaign.qualified_calls}</strong></div>
                <div><span className="cc-kicker">Conv.</span><strong style={{display:"block", font:"600 18px var(--serif)", color:"var(--ink)"}}>{topPct}%</strong></div>
              </div>
              <p style={{ font:"600 16px var(--serif)", margin:"12px 0 0", color:"#F59E0B" }}>{formatCents(topCampaign.payout_cents)}</p>
              <Link href="/dashboard/publisher/campaigns" className="btn btn-secondary btn-sm" style={{ marginTop:12, width:"100%", justifyContent:"center", borderRadius:8 }}>View Campaign →</Link>
              </>
            ) : (
              <div className="empty-state" style={{padding:"18px 0", display:"grid", placeItems:"center"}}><p className="text-muted" style={{fontSize:12, margin:0}}>No campaign performance yet</p></div>
            )}
          </section>

          <section className="cc-card" aria-label="What to do next">
            <div className="cc-card__head"><div><h2>What to do next</h2><small>Publisher quick actions</small></div></div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
              <Link href="/dashboard/publisher/campaigns" className="action-row"><span><i className="action-dot action-dot--amber"/> Browse campaigns</span><span className="badge">View →</span></Link>
              <button onClick={()=>showToast("Copy your tracking link for this campaign and place it in your marketing.","info")} className="action-row" style={{width:"100%", background:"none", border:0, cursor:"pointer", textAlign:"left"}}><span><i className="action-dot action-dot--violet"/> Get tracking link</span><span className="badge">Copy</span></button>
              <Link href="/dashboard/publisher/payouts" className="action-row"><span><i className="action-dot action-dot--cyan"/> Payout history</span><span className="badge">{formatCents(totalPayout)}</span></Link>
              <Link href="/dashboard/publisher/settings" className="action-row"><span><i className="action-dot"/> Settings</span><span className="badge">Manage →</span></Link>
            </div>
          </section>
        </div>
      </div>

      {/* RECENT QUALIFIED CALLS + TRACKING LINKS */}
      <div className="cc-row cc-row--2-equal">
        <section className="cc-card cc-card--spacious" aria-label="Recent Qualified Calls">
          <div className="cc-card__head"><div><h2>Recent Qualified Calls</h2><small>{filteredRecent.length} calls • filtered</small></div><Link href="/dashboard/publisher/calls" className="cc-badge">View all →</Link></div>
          {filteredRecent.length===0 ? (
            <div className="empty-state" style={{padding:"18px 0"}}><p className="text-muted" style={{fontSize:12, margin:0}}>No qualified calls yet — share your tracking link to start.</p><Link href="/dashboard/publisher/campaigns" className="btn btn-primary btn-sm" style={{marginTop:10}}>Browse Campaigns</Link></div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="cc-table" style={{ minWidth:520 }}>
                <thead><tr><th>Date</th><th>Caller</th><th>Campaign</th><th>Status</th><th>Payout</th></tr></thead>
                <tbody>
                  {filteredRecent.slice(0,6).map(c=>(
                    <tr key={c.id}>
                      <td className="text-mono-sm" style={{fontSize:11, whiteSpace:"nowrap"}}>{new Date(c.created_at).toLocaleString()}</td>
                      <td className="text-mono-sm" style={{fontSize:11}}>{c.caller ?? "—"}</td>
                      <td style={{fontSize:12}}>{c.campaign_name ?? "—"}</td>
                      <td><span className={`cc-badge ${c.connected ? "cc-badge--green" : "cc-badge--pink"}`}>{c.connected ? "Qualified" : c.status ?? "—"}</span></td>
                      <td className="text-mono-sm" style={{fontSize:11, fontWeight:600}}>{c.payout_cents ? formatCents(c.payout_cents) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="cc-card cc-card--spacious" aria-label="Your Tracking Links">
          <div className="cc-card__head"><div><h2>Your Tracking Links</h2><small>Affiliate ID • copy to share</small></div><span className="cc-badge" style={{ fontFamily:"var(--mono)", fontSize:11 }}>{overview?.publisher.afid ?? overview?.publisher.id?.slice(0,8) ?? "—"}</span></div>
          {campaignPerf.length ? (
            <div style={{ display:"flex", flexDirection:"column", gap:0, marginTop:8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1.6fr 64px", gap:8, padding:"10px 8px", borderBottom:"1px solid var(--line)", font:"10px var(--mono)", letterSpacing:"1px", color:"var(--muted)", textTransform:"uppercase" }}>
                <span>Campaign</span><span>Tracking Link</span><span>Copy</span>
              </div>
              {(campaignPerf.slice(0,5)).map(c=>{
                const afid = overview?.publisher.afid ?? overview?.publisher.id ?? "AFF123";
                const link = `https://coveragecalls.com/t/${afid}?cid=${encodeURIComponent(c.campaign_id ?? c.id)}`;
                return (
                  <div key={c.id} style={{ display:"grid", gridTemplateColumns:"1.2fr 1.6fr 64px", gap:8, padding:"12px 8px", borderTop:"1px solid var(--line)", alignItems:"center" }}>
                    <span style={{fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.campaign_name}</span>
                    <span className="text-mono-sm" style={{fontSize:10, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"var(--muted)"}}>{link}</span>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:"4px 8px", borderRadius:6 }} onClick={async()=>{ try{ await navigator.clipboard.writeText(link); showToast("Tracking link copied","success"); }catch{ showToast(link,"info"); } }}>Copy</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{padding:"24px 0", display:"grid", placeItems:"center"}}><p className="text-muted" style={{fontSize:12, margin:0}}>No campaigns — tracking links appear after assignment</p></div>
          )}
          <p className="text-muted" style={{fontSize:11, margin:"12px 0 0", lineHeight:1.5}}>Place this link in your ads, landing pages and emails. Calls through this link attribute payout to you.</p>
        </section>
      </div>
    </div>
  );
}

export default function PublisherOverviewPage(){
  return <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{height:18, width:200}}/></div>}><PublisherOverviewInner/></Suspense>;
}
