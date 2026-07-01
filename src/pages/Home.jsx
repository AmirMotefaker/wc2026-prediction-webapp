// src/pages/Home.jsx — Professional WC2026 Dashboard

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useFixtures } from "../hooks/useFixtures";
import { useFIFARankings } from "../hooks/useFIFARankings";

const GITHUB = "https://github.com/AmirMotefaker/wc2026-prediction-webapp";
const OPTA   = "https://dataviz.theanalyst.com/opta-football-predictions/?competition=FIFA%20World%20Cup";

const GROUP_COLORS = {
  A:"#E53E3E",B:"#DD6B20",C:"#D69E2E",D:"#38A169",
  E:"#319795",F:"#3182CE",G:"#805AD5",H:"#D53F8C",
  I:"#E53E3E",J:"#DD6B20",K:"#38A169",L:"#3182CE",
};

const NAV = ["today","upcoming","results","standings","rankings","opta"];
const NAV_LABELS = { today:"Today",upcoming:"Upcoming",results:"Results",standings:"Standings",rankings:"Rankings",opta:"Opta AI" };

function pts(x) { return x ?? 0; }

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { fixtures, lastSynced, source } = useFixtures();
  const { rankings, loading: rLoad } = useFIFARankings();
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalUsers, setTotalUsers]   = useState(null);
  const [tab, setTab]                 = useState("today");
  const [optaLoaded, setOptaLoaded]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db,"users"), orderBy("totalPoints","desc"), limit(50));
        const s = await getDocs(q);
        setLeaderboard(s.docs.map(d => d.data()));
        setTotalUsers((await getDocs(collection(db,"users"))).size);
      } catch(e) { console.error(e); }
    }
    load();
  }, []);

  const myRank = leaderboard.findIndex(u => u.uid === profile?.uid) + 1;
  const today  = new Date().toISOString().slice(0,10);

  const todayFix    = fixtures.filter(f => f.date === today);
  const upcomingFix = fixtures.filter(f => f.status==="scheduled" && f.date > today)
                              .sort((a,b) => a.date.localeCompare(b.date)).slice(0,12);
  const resultsFix  = fixtures.filter(f => f.status==="finished")
                              .sort((a,b) => b.date.localeCompare(a.date)).slice(0,16);

  const finished = fixtures.filter(f=>f.status==="finished").length;
  const remaining = fixtures.filter(f=>f.status==="scheduled").length;

  // Group standings
  const groupLetters = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  const [selGroup, setSelGroup] = useState("A");

  return (
    <div style={{background:"#0D1B2A",minHeight:"100vh",color:"#E8F4FD"}}>

      {/* ── Hero ── */}
      <div style={{background:"linear-gradient(135deg,#0D1B2A 0%,#1A3A5C 55%,#0D1B2A 100%)",borderBottom:"1px solid #C8A84B22",padding:"16px 16px 12px"}}>
        <div className="max-w-4xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span style={{fontSize:32}}>⚽</span>
              <div>
                <div style={{fontSize:20,fontWeight:900,letterSpacing:2,color:"#C8A84B"}}>WORLD CUP 2026</div>
                <div style={{fontSize:11,color:"#7BA4C5"}}>USA · Canada · Mexico · Jun 11 – Jul 19</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href={GITHUB} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1.5" style={{fontSize:11,color:"#7BA4C5",textDecoration:"none"}}>
                <GitHubIcon size={14}/> GitHub
              </a>
              <a href="https://amirmotefaker.ir" target="_blank" rel="noreferrer" style={{fontSize:11,color:"#7BA4C5",textDecoration:"none"}}>🌐 amirmotefaker.ir</a>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              {v:finished,l:"Played",c:"#C8A84B"},
              {v:remaining,l:"Remaining",c:"#E8F4FD"},
              {v:totalUsers??0,l:"Predictors",c:"#E8F4FD"},
              {v:myRank>0?`#${myRank}`:"–",l:"Your Rank",c:"#C8A84B"},
            ].map(s=>(
              <div key={s.l} style={{background:"#0D1B2A55",border:"1px solid #ffffff08",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:10,color:"#7BA4C5",marginTop:3,letterSpacing:.5,textTransform:"uppercase"}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* User card */}
          <div style={{background:"#0D1B2A66",border:"1px solid #C8A84B33",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div className="flex items-center gap-3">
              <button onClick={()=>navigate("/profile")} style={{width:40,height:40,borderRadius:"50%",background:"#C8A84B",border:"none",cursor:"pointer",fontSize:16,fontWeight:900,color:"#0D1B2A",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {profile?.photoURL ? <img src={profile.photoURL} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}}/> : profile?.displayName?.[0]?.toUpperCase()||"?"}
              </button>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:"#E8F4FD"}}>{profile?.displayName}</div>
                <div style={{fontSize:11,color:"#7BA4C5"}}>{myRank>0?`Ranked #${myRank} of ${totalUsers}`:"Make your first prediction!"}</div>
              </div>
            </div>
            <div className="text-right">
              <div style={{fontSize:28,fontWeight:900,color:"#C8A84B",lineHeight:1}}>{pts(profile?.totalPoints)}</div>
              <div style={{fontSize:10,color:"#7BA4C5",letterSpacing:1,textTransform:"uppercase"}}>points</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sync status bar ── */}
      {lastSynced && (
        <div style={{background:"#38A16922",borderBottom:"1px solid #38A16933",padding:"6px 16px",textAlign:"center"}}>
          <span style={{fontSize:11,color:"#68D391"}}>🔄 Live · Last synced {new Date(lastSynced).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})} · Source: {source}</span>
        </div>
      )}

      {/* ── Navigation tabs ── */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div style={{display:"flex",gap:4,overflowX:"auto",padding:"4px 0"}}>
          {NAV.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s",
                background:tab===t?"#C8A84B":"#1A3A5C",
                color:tab===t?"#0D1B2A":"#7BA4C5"}}>
              {NAV_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 pb-8">

        {/* Today */}
        {tab==="today" && (
          <div>
            <SectionHeader icon="📅" label="Today's Matches" />
            {todayFix.length===0
              ? <EmptyState msg="No matches scheduled today" sub="Check Upcoming tab for next fixtures" />
              : todayFix.map(m=><MatchRow key={m.match_id} match={m} />)
            }
          </div>
        )}

        {/* Upcoming */}
        {tab==="upcoming" && (
          <div>
            <SectionHeader icon="⏭️" label="Upcoming Fixtures" />
            {upcomingFix.map(m=><MatchRow key={m.match_id} match={m} showTime />)}
          </div>
        )}

        {/* Results */}
        {tab==="results" && (
          <div>
            <SectionHeader icon="✅" label="Recent Results" />
            {resultsFix.map(m=><MatchRow key={m.match_id} match={m} />)}
          </div>
        )}

        {/* Standings */}
        {tab==="standings" && (
          <div>
            <SectionHeader icon="📊" label="Group Standings" />
            <div className="flex flex-wrap gap-2 mb-4">
              {groupLetters.map(g=>(
                <button key={g} onClick={()=>setSelGroup(g)}
                  style={{width:36,height:36,borderRadius:8,fontSize:12,fontWeight:800,border:"none",cursor:"pointer",
                    background:selGroup===g?"#C8A84B":"#1A3A5C",color:selGroup===g?"#0D1B2A":"#7BA4C5"}}>
                  {g}
                </button>
              ))}
            </div>
            <GroupTable group={selGroup} fixtures={fixtures}/>

            {/* Scoring rules card */}
            <div style={{background:"#1A3A5C",borderRadius:12,border:"1px solid #C8A84B22",padding:16,marginTop:16}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"#7BA4C5",textTransform:"uppercase",marginBottom:10}}>Scoring Rules</div>
              {[
                {pts:10,color:"#C8A84B",label:"Exact scoreline"},
                {pts:7, color:"#68D391",label:"Correct goal difference"},
                {pts:5, color:"#90CDF4",label:"Correct winner / draw"},
                {pts:2, color:"#FC8181",label:"Wrong prediction"},
              ].map(r=>(
                <div key={r.pts} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #0D1B2A33"}}>
                  <span style={{fontSize:18,fontWeight:900,color:r.color,width:28,textAlign:"center"}}>{r.pts}</span>
                  <span style={{fontSize:12,color:"#E8F4FD"}}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tab==="results" && (
          <div className="mt-6">
            <SectionHeader icon="🏆" label="Leaderboard" />
            <LeaderboardTable leaderboard={leaderboard} profile={profile}/>
          </div>
        )}

        {/* Rankings */}
        {tab==="rankings" && (
          <div>
            <SectionHeader icon="🌍" label="FIFA World Rankings" sub={<a href="https://inside.fifa.com/fifa-world-ranking/men" target="_blank" rel="noreferrer" style={{fontSize:11,color:"#C8A84B",textDecoration:"none"}}>Official ↗</a>} />
            <div style={{background:"#1A3A5C",borderRadius:12,overflow:"hidden",border:"1px solid #ffffff08"}}>
              {rLoad ? <div style={{padding:24,textAlign:"center",color:"#7BA4C5"}}>Loading rankings...</div> : (
                <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                  <thead><tr style={{borderBottom:"1px solid #0D1B2A"}}>
                    <th style={{padding:"10px 14px",color:"#7BA4C5",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"left",textTransform:"uppercase"}}>Rank</th>
                    <th style={{padding:"10px 14px",color:"#7BA4C5",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"left",textTransform:"uppercase"}}>Team</th>
                    <th style={{padding:"10px 14px",color:"#7BA4C5",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"right",textTransform:"uppercase"}}>Points</th>
                  </tr></thead>
                  <tbody>
                    {rankings.slice(0,48).map((r,i)=>(
                      <tr key={r.id||r.name} style={{borderBottom:"1px solid #0D1B2A22",background:i<3?"#C8A84B0A":"transparent"}}>
                        <td style={{padding:"9px 14px",fontWeight:700,fontSize:12,color:i<3?"#C8A84B":"#7BA4C5"}}>#{r.rank}</td>
                        <td style={{padding:"9px 14px",fontWeight:600,color:"#E8F4FD"}}>{r.name}</td>
                        <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontSize:12,color:"#7BA4C5"}}>{r.points?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Opta AI */}
        {tab==="opta" && (
          <div>
            <SectionHeader icon="🔮" label="Opta Supercomputer Predictions"
              sub={<a href="https://theanalyst.com/competition/fifa-world-cup/predictions" target="_blank" rel="noreferrer" style={{fontSize:11,color:"#C8A84B",textDecoration:"none"}}>Full site ↗</a>}/>
            <div style={{fontSize:12,color:"#7BA4C5",marginBottom:12}}>Live win/draw/loss probabilities for every match, powered by Stats Perform / Opta.</div>
            {!optaLoaded && (
              <div style={{background:"#1A3A5C",borderRadius:12,height:500,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #C8A84B22"}}>
                <span style={{color:"#7BA4C5"}}>Loading Opta predictions...</span>
              </div>
            )}
            <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #C8A84B22",display:optaLoaded?"block":"none"}}>
              <iframe src={OPTA} title="Opta WC2026 Predictions" width="100%" height="600"
                style={{border:"none",display:"block",background:"#fff"}} onLoad={()=>setOptaLoaded(true)}/>
            </div>
            <div style={{marginTop:12,background:"#1A3A5C",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#7BA4C5",border:"1px solid #C8A84B22"}}>
              📈 Want to know how many points teams need to advance? <a href="https://theanalyst.com/articles/world-cup-2026-how-many-points-needed-third-placed-teams-opta-supercomputer" target="_blank" rel="noreferrer" style={{color:"#C8A84B",fontWeight:700}}>Read Opta's analysis ↗</a>
            </div>
          </div>
        )}

        {/* Always show leaderboard on standings tab */}
        {tab==="standings" && (
          <div className="mt-6">
            <SectionHeader icon="🏆" label="Leaderboard" />
            <LeaderboardTable leaderboard={leaderboard} profile={profile}/>
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",padding:"24px 0 8px",borderTop:"1px solid #1A3A5C",marginTop:32}}>
          <div style={{fontSize:12,color:"#7BA4C5",marginBottom:4}}>
            Built by{" "}
            <a href="https://github.com/AmirMotefaker" target="_blank" rel="noreferrer" style={{color:"#C8A84B",fontWeight:700,textDecoration:"none"}}>Amir Motefaker</a>
            {" · "}
            <a href="https://amirmotefaker.ir" target="_blank" rel="noreferrer" style={{color:"#C8A84B",textDecoration:"none"}}>amirmotefaker.ir</a>
          </div>
          <a href={GITHUB} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#7BA4C5",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4}}>
            <GitHubIcon size={12}/> Open Source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, sub }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,fontSize:10,fontWeight:700,letterSpacing:2,color:"#7BA4C5",textTransform:"uppercase"}}>
        <span style={{fontSize:14}}>{icon}</span>{label}
      </div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

function EmptyState({ msg, sub }) {
  return (
    <div style={{background:"#1A3A5C",borderRadius:12,padding:"32px 16px",textAlign:"center",border:"1px solid #ffffff08"}}>
      <div style={{color:"#E8F4FD",fontWeight:600,marginBottom:6}}>{msg}</div>
      {sub && <div style={{color:"#7BA4C5",fontSize:12}}>{sub}</div>}
    </div>
  );
}

function MatchRow({ match, showTime }) {
  const isDone = match.status === "finished";
  const isLive = match.status === "live";
  const gc = GROUP_COLORS[match.group] || "#7BA4C5";

  return (
    <div style={{background:"#1A3A5C",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,border:`1px solid ${isLive?"#E53E3E44":"#ffffff06"}`,marginBottom:6,transition:"border-color .2s"}}>
      <div style={{width:22,height:22,borderRadius:5,background:gc+"22",color:gc,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{match.group}</div>

      <span style={{fontSize:12,fontWeight:600,color:"#E8F4FD",flex:1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.team_a_name}</span>

      {isDone || isLive ? (
        <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
          <span style={{fontSize:18,fontWeight:900,color:"#C8A84B",width:18,textAlign:"center"}}>{match.score_a??"-"}</span>
          <span style={{color:"#7BA4C5",padding:"0 1px"}}>:</span>
          <span style={{fontSize:18,fontWeight:900,color:"#C8A84B",width:18,textAlign:"center"}}>{match.score_b??"-"}</span>
        </div>
      ) : (
        <div style={{flexShrink:0,textAlign:"center",minWidth:64}}>
          {showTime && match.kickoff_tehran ? (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#E8F4FD"}}>{match.kickoff_tehran}<span style={{color:"#7BA4C5",fontWeight:400,fontSize:10}}> IRN</span></div>
              <div style={{fontSize:10,color:"#7BA4C5"}}>{match.date?.slice(5)}</div>
            </div>
          ) : (
            <span style={{fontSize:10,fontWeight:700,color:"#7BA4C5",background:"#0D1B2A",padding:"3px 8px",borderRadius:6}}>vs</span>
          )}
        </div>
      )}

      <span style={{fontSize:12,fontWeight:600,color:"#E8F4FD",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.team_b_name}</span>

      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,flexShrink:0,
        background:isDone?"#38A16922":isLive?"#E53E3E22":"#0D1B2A",
        color:isDone?"#68D391":isLive?"#FC8181":"#7BA4C5",
        border:`1px solid ${isDone?"#38A16944":isLive?"#E53E3E44":"#ffffff11"}`}}>
        {isDone?"FT":isLive?"● LIVE":"SCH"}
      </span>
    </div>
  );
}

function GroupTable({ group, fixtures }) {
  const teamsData = { A:["Mexico","South Korea","South Africa","Czechia"],B:["Canada","Switzerland","Qatar","Bosnia and Herzegovina"],C:["Brazil","Morocco","Scotland","Haiti"],D:["United States","Australia","Paraguay","Turkiye"],E:["Germany","Ivory Coast","Ecuador","Curacao"],F:["Netherlands","Japan","Sweden","Tunisia"],G:["Belgium","Iran","Egypt","New Zealand"],H:["Spain","Uruguay","Saudi Arabia","Cape Verde"],I:["France","Senegal","Norway","Iraq"],J:["Argentina","Austria","Algeria","Jordan"],K:["Portugal","Colombia","Uzbekistan","DR Congo"],L:["England","Croatia","Ghana","Panama"] };
  const teams = teamsData[group] || [];
  const table = {};
  teams.forEach(n => { table[n]={name:n,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}; });

  fixtures.filter(f=>f.group===group&&f.status==="finished").forEach(m=>{
    const a=table[m.team_a_name], b=table[m.team_b_name];
    if(!a||!b) return;
    a.p++;b.p++;a.gf+=m.score_a;a.ga+=m.score_b;b.gf+=m.score_b;b.ga+=m.score_a;
    if(m.score_a>m.score_b){a.w++;a.pts+=3;b.l++;}
    else if(m.score_a<m.score_b){b.w++;b.pts+=3;a.l++;}
    else{a.d++;b.d++;a.pts++;b.pts++;}
  });

  const rows = Object.values(table).map(r=>({...r,gd:r.gf-r.ga}))
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);

  const gc = GROUP_COLORS[group]||"#7BA4C5";

  return (
    <div style={{background:"#1A3A5C",borderRadius:12,overflow:"hidden",border:"1px solid #ffffff08"}}>
      <div style={{background:gc,padding:"8px 16px",fontSize:11,fontWeight:800,color:"#0D1B2A",letterSpacing:1,textTransform:"uppercase"}}>Group {group}</div>
      <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
        <thead><tr style={{borderBottom:"1px solid #0D1B2A"}}>
          {["#","Team","P","W","D","L","GF","GA","GD","Pts"].map(h=>(
            <th key={h} style={{padding:"8px 8px",color:"#7BA4C5",fontSize:10,fontWeight:700,textAlign:h==="Team"?"left":"center",letterSpacing:.5,textTransform:"uppercase"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={r.name} style={{borderBottom:"1px solid #0D1B2A22",background:i<2?"#38A16908":"transparent",borderLeft:i<2?`3px solid ${gc}`:"3px solid transparent"}}>
              <td style={{padding:"9px 8px",textAlign:"center",color:"#7BA4C5",fontSize:11}}>{i+1}</td>
              <td style={{padding:"9px 8px",fontWeight:600,color:"#E8F4FD",whiteSpace:"nowrap"}}>{r.name}</td>
              {[r.p,r.w,r.d,r.l,r.gf,r.ga].map((v,j)=>(
                <td key={j} style={{padding:"9px 8px",textAlign:"center",color:"#7BA4C5"}}>{v}</td>
              ))}
              <td style={{padding:"9px 8px",textAlign:"center",color:r.gd>0?"#68D391":r.gd<0?"#FC8181":"#7BA4C5",fontWeight:600}}>{r.gd>0?"+"+r.gd:r.gd}</td>
              <td style={{padding:"9px 14px",textAlign:"center",fontWeight:900,fontSize:14,color:"#C8A84B"}}>{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardTable({ leaderboard, profile }) {
  return (
    <div style={{background:"#1A3A5C",borderRadius:12,overflow:"hidden",border:"1px solid #ffffff08"}}>
      {leaderboard.length===0
        ? <div style={{padding:24,textAlign:"center",color:"#7BA4C5"}}>No predictions yet — be the first! 🎯</div>
        : <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid #0D1B2A"}}>
              <th style={{padding:"10px 14px",color:"#7BA4C5",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"left",textTransform:"uppercase"}}>#</th>
              <th style={{padding:"10px 14px",color:"#7BA4C5",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"left",textTransform:"uppercase"}}>Player</th>
              <th style={{padding:"10px 14px",color:"#7BA4C5",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"right",textTransform:"uppercase"}}>Points</th>
            </tr></thead>
            <tbody>
              {leaderboard.map((u,i)=>{
                const isMe=u.uid===profile?.uid;
                return (
                  <tr key={u.uid} style={{borderBottom:"1px solid #0D1B2A22",background:isMe?"#C8A84B11":"transparent"}}>
                    <td style={{padding:"10px 14px",fontSize:16,textAlign:"center"}}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":<span style={{color:"#7BA4C5",fontSize:13}}>{i+1}</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:"#E8F4FD"}}>
                      {u.displayName}
                      {isMe&&<span style={{marginLeft:8,fontSize:10,background:"#C8A84B",color:"#0D1B2A",padding:"2px 8px",borderRadius:10,fontWeight:800}}>YOU</span>}
                    </td>
                    <td style={{padding:"10px 14px",textAlign:"right",fontWeight:900,fontSize:16,color:"#C8A84B"}}>{u.totalPoints??0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      }
    </div>
  );
}

function GitHubIcon({ size=16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}
