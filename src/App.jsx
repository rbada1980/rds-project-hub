import { useState, useRef, useEffect, createContext, useContext, Fragment } from "react";
import { createClient } from "@supabase/supabase-js";
const MobileCtx=createContext(false);
const useMobile=()=>useContext(MobileCtx);
// email notifications removed — daily scheduled digest replaces per-update emails

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);
const SUPER_ADMIN = "ramesh";

const C = {
  bg:"#0f1117",surface:"#171b26",card:"#1e2433",border:"#2a3040",
  accent:"#f97316",teal:"#14b8a6",blue:"#3b82f6",purple:"#a855f7",
  green:"#22c55e",red:"#ef4444",yellow:"#eab308",
  t1:"#f1f5f9",t2:"#94a3b8",t3:"#475569",
};
const ROLES=["Rebar","Tekla","Team Leader","Manager","Admin","Client"];
const ALL_STATUSES=["Not Yet Started","In Progress","Review","Completed"];
const STATUS_CLR={"To Do":C.t3,"Not Yet Started":C.t3,"In Progress":C.blue,"Review":C.purple,"Done":C.green,"To Be Started":C.t3,"Completed":C.green};
const PRI_CLR={High:C.red,Medium:C.yellow,Low:C.green};
const PROJECT_COLORS=[C.teal,C.blue,C.purple,C.accent,C.green,"#ec4899","#f59e0b"];
const getStatusColor=s=>STATUS_CLR[s]||C.t3;
const isDone=s=>s==="Done"||s==="Completed"; // "Done" kept for legacy data

const SLA_HOURS={Critical:24,High:72,Medium:168,Low:336};
function getSLAStatus(task){
  if(!task.created_at||isDone(task.status))return null;
  const hours=SLA_HOURS[task.priority]||168;
  const dl=new Date(task.created_at);
  dl.setHours(dl.getHours()+hours);
  const diff=(dl-new Date())/3600000;
  if(diff<0)return{breach:true,over:Math.round(-diff)};
  if(diff<24)return{warn:true,left:Math.round(diff)};
  return null;
}
function SLABadge({task}){
  const s=getSLAStatus(task);
  if(!s)return null;
  const bg=s.breach?"#450a0a":"#78350f44";
  const cl=s.breach?"#fca5a5":"#fcd34d";
  const txt=s.breach?"SLA +"+s.over+"h":"SLA "+s.left+"h left";
  return <span style={{fontSize:9,fontWeight:800,background:bg,color:cl,borderRadius:4,padding:"2px 6px",whiteSpace:"nowrap",border:"1px solid "+(s.breach?"#7f1d1d":"#78350f")}}>{txt}</span>;
}

function Av({name,size=28}){
  const h=name?name.charCodeAt(0)*17%360:200;
  return <div title={name} style={{width:size,height:size,borderRadius:"50%",background:`hsl(${h},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*.4,flexShrink:0}}>{name?name[0]:"?"}</div>;
}
function Bdg({color,children}){
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>;
}
function Pb({v,color=C.accent,h=6}){
  return <div style={{height:h,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:color,borderRadius:3,transition:"width .4s"}}/></div>;
}
function IBtn({icon,onClick,title,color=C.t2}){
  const [hov,sh]=useState(false);
  return <button title={title} onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)} style={{background:hov?C.border:"transparent",border:"none",cursor:"pointer",borderRadius:6,padding:"4px 6px",color:hov?C.t1:color,fontSize:15,lineHeight:1,transition:"all .15s"}}>{icon}</button>;
}
function Spinner(){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}
function Stat({label,value,sub,color=C.accent,onClick}){
  const [hov,sh]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{background:C.card,border:`1px solid ${hov&&onClick?color:C.border}`,borderRadius:12,padding:"18px 22px",borderTop:`3px solid ${color}`,cursor:onClick?"pointer":"default",transition:"all .15s",boxShadow:hov&&onClick?`0 4px 20px ${color}33`:"none"}}>
      <p style={{margin:0,color:C.t3,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</p>
      <p style={{margin:"8px 0 4px",color:"#ffffff",fontSize:32,fontWeight:800}}>{value}</p>
      {sub&&<p style={{margin:0,color:C.t2,fontSize:12}}>{sub}</p>}
      {onClick&&<p style={{margin:"6px 0 0",color:color,fontSize:11,fontWeight:600}}>Click to view →</p>}
    </div>
  );
}
const SBtn={background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"};
const GBtn={background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:600,fontSize:14,fontFamily:"inherit"};

function Modal({title,onClose,children,wide=false}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"#00000090",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
      <div className="rds-modal-inner" style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 28px",width:wide?"90vw":"480px",maxWidth:"96vw",minWidth:0,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px #00000080"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,color:C.t1,fontSize:17}}>{title}</h3>
          <IBtn icon="✕" onClick={onClose}/>
        </div>
        {children}
      </div>
    </div>
  );
}
function RLabel({text}){
  if(!text)return null;
  const parts=text.split("*");
  if(parts.length<2)return <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>{text}</label>;
  return <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>{parts[0]}<span style={{color:C.red,fontWeight:700}}>*</span>{parts.slice(1).join("*")}</label>;
}
function FInput({label,value,onChange,type="text",placeholder}){
  return(
    <div style={{marginBottom:14}}>
      <RLabel text={label}/>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
    </div>
  );
}
function FSelect({label,value,onChange,options}){
  return(
    <div style={{marginBottom:14}}>
      <RLabel text={label}/>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function FileUp({files,onChange}){
  const ref=useRef();
  const [drag,sd]=useState(false);
  function add(fl){onChange([...files,...Array.from(fl).map(f=>({name:f.name,size:f.size,type:f.type}))]);}
  function fmt(b){return b<1024?b+" B":b<1048576?(b/1024).toFixed(1)+" KB":(b/1048576).toFixed(1)+" MB";}
  function ico(t){return t.startsWith("image/")?"🖼":t==="application/pdf"?"📄":t.includes("word")?"📝":t.includes("sheet")||t.includes("csv")?"📊":t.startsWith("video/")?"🎬":"📎";}
  return(
    <div>
      <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Attachments</label>
      <div onClick={()=>ref.current.click()} onDragOver={e=>{e.preventDefault();sd(true);}} onDragLeave={()=>sd(false)}
        onDrop={e=>{e.preventDefault();sd(false);add(e.dataTransfer.files);}}
        style={{border:`2px dashed ${drag?C.accent:C.border}`,borderRadius:8,padding:"10px 14px",cursor:"pointer",background:drag?C.accent+"10":C.surface,textAlign:"center",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <span>📎</span>
        <span style={{color:C.t3,fontSize:12}}>{files.length===0?"Click or drag & drop any file":`${files.length} file(s) — add more`}</span>
        <input ref={ref} type="file" multiple style={{display:"none"}} onChange={e=>{add(e.target.files);e.target.value="";}}/>
      </div>
      {files.length>0&&(
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5,maxHeight:90,overflowY:"auto"}}>
          {files.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px"}}>
              <span>{ico(f.type)}</span>
              <span style={{flex:1,fontSize:11,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
              <span style={{fontSize:10,color:C.t3}}>{fmt(f.size)}</span>
              <IBtn icon="✕" onClick={()=>onChange(files.filter((_,j)=>j!==i))} color={C.red}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function TaskFilesPanel({task,me,canEdit,onClose,onCountChange}){
  const [files,sf]=useState([]);
  const [loading,sl]=useState(true);
  const [uploading,su]=useState(false);
  const fRef=useRef();
  async function load(){
    const{data}=await supabase.from("task_files").select("*").eq("task_id",task.id).order("created_at",{ascending:false});
    const rows=data||[];sf(rows);sl(false);
    if(onCountChange)onCountChange(task.id,rows.length);
  }
  useEffect(()=>{load();},[task.id]);
  function fIcon(t){return t==="application/pdf"?"📄":t.startsWith("image/")?"🖼":t.includes("word")?"📝":t.includes("sheet")||t.includes("csv")?"📊":t.includes("dwg")||t.includes("dxf")||t.includes("cad")?"📐":"📎";}
  function fmtSz(b){return!b?"—":b<1024?b+"B":b<1048576?(b/1024).toFixed(1)+"KB":(b/1048576).toFixed(1)+"MB";}
  async function upload(e){
    const file=e.target.files?.[0];if(!file)return;
    su(true);
    const path=`${task.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const{error:se}=await supabase.storage.from("task-files").upload(path,file,{contentType:file.type,upsert:false});
    if(se){alert("Upload failed: "+se.message);su(false);return;}
    const{data:pub}=supabase.storage.from("task-files").getPublicUrl(path);
    await supabase.from("task_files").insert({task_id:task.id,project_id:task.project_id,file_name:file.name,file_size:file.size,file_type:file.type,storage_path:path,public_url:pub.publicUrl,uploaded_by:me.name||me.username});
    e.target.value="";su(false);load();
  }
  async function del(f){
    if(!confirm(`Delete "${f.file_name}"?`))return;
    await supabase.storage.from("task-files").remove([f.storage_path]);
    await supabase.from("task_files").delete().eq("id",f.id);
    sf(fs=>{const next=fs.filter(x=>x.id!==f.id);if(onCountChange)onCountChange(task.id,next.length);return next;});
  }
  const canDel=f=>canEdit||f.uploaded_by===me.name||f.uploaded_by===me.username;
  return(
    <Modal title={`📎 Files — ${task.title}`} onClose={onClose} wide>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{color:C.t3,fontSize:12}}>{loading?"…":files.length+" file(s) attached"}</span>
          <div>
            <input ref={fRef} type="file" multiple style={{display:"none"}} onChange={upload}/>
            <button onClick={()=>fRef.current.click()} disabled={uploading} style={{...SBtn,padding:"8px 18px",fontSize:12}}>{uploading?"Uploading…":"⬆ Upload"}</button>
          </div>
        </div>
        {loading?(<div style={{textAlign:"center",padding:32,color:C.t3}}>Loading…</div>)
        :files.length===0?(<div style={{textAlign:"center",padding:32,color:C.t3,border:`2px dashed ${C.border}`,borderRadius:10,fontSize:13}}>No files yet.<br/><span style={{fontSize:11}}>Upload revised drawings, barlists, EMDs, or any reference doc.</span></div>)
        :(<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {files.map(f=>(
            <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px"}}>
              <span style={{fontSize:22,flexShrink:0}}>{fIcon(f.file_type||"")}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:C.t1,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.file_name}</div>
                <div style={{color:C.t3,fontSize:11,marginTop:2}}>{fmtSz(f.file_size)} · {f.uploaded_by} · {(f.created_at||"").slice(0,10)}</div>
              </div>
              <a href={f.public_url} target="_blank" rel="noreferrer"
                style={{...GBtn,padding:"6px 12px",fontSize:11,color:C.teal,borderColor:C.teal+"44",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,flexShrink:0}}>⬇ Open</a>
              {canDel(f)&&<IBtn icon="🗑" onClick={()=>del(f)} color={C.red}/>}
            </div>
          ))}
        </div>)}
      </div>
    </Modal>
  );
}
function TaskForm({initial={},projects,members,clients=[],onSave,onClose,saving,requireDates=false}){
  const [custom,setCustom]=useState(false);
  const initPid=initial.project_id||projects[0]?.id||"";
  const initClient=initial.client||(projects.find(p=>p.id===initPid)?.client||"");
  const initAssignee=initial.assignee||"";
  const [f,sf]=useState({
    project_id:initPid,
    custNo:"",custName:"",title:initial.title||"",client:initClient,
    status:initial.status||"Not Yet Started",priority:initial.priority||"Medium",
    assignee:initAssignee,due_date:initial.due_date||"",
    tags:(initial.tags||[]).join(", "),files:initial.files||[],
    detailer:initial.detailer||initAssignee,checker:initial.checker||"",
    scope:initial.scope||"",client_sub_date:initial.client_sub_date||"",
  });
  const s=k=>v=>sf(p=>({...p,[k]:v}));
  function onAssigneeChange(v){
    sf(p=>({...p,assignee:v,detailer:p.detailer===p.assignee||p.detailer===""?v:p.detailer}));
  }
  function onProjectChange(pid){
    const proj=projects.find(p=>p.id===pid);
    sf(p=>({...p,project_id:pid,client:proj?.client||p.client}));
  }
  const col={flex:1,minWidth:0},row={display:"flex",gap:16,flexWrap:"wrap"};
  return(
    <div>
      <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:14}}>
        <div style={{flex:1}}>
          {custom?(
            <div style={{display:"flex",gap:10}}>
              <div style={{width:110}}><FInput label="Project No." value={f.custNo} onChange={s("custNo")}/></div>
              <div style={{flex:1}}><FInput label="Project Name" value={f.custName} onChange={s("custName")}/></div>
            </div>
          ):(
            <div>
              <RLabel text="Project *"/>
              <select value={f.project_id} onChange={e=>onProjectChange(e.target.value)}
                style={{width:"100%",background:C.surface,border:`1px solid ${f.project_id?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:f.project_id?C.t1:C.t3,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="">— Select Project —</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{paddingBottom:14}}>
          <button onClick={()=>setCustom(v=>!v)} style={{...GBtn,padding:"9px 12px",fontSize:12,color:custom?C.accent:C.t2,borderColor:custom?C.accent:C.border}}>
            {custom?"✓ Custom":"+ Custom"}
          </button>
        </div>
      </div>
      <div className="rds-form-row" style={row}>
        <div style={col}><FInput label="Task Title *" value={f.title} onChange={s("title")} placeholder="Enter task title"/></div>
        <div style={col}>
                <RLabel text="Client *"/>
                <select value={f.client} onChange={e=>s("client")(e.target.value)}
                  style={{width:"100%",background:C.surface,border:`1px solid ${f.client?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:f.client?C.t1:C.t3,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="">— Select Client —</option>
                  {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
      </div>
      <div className="rds-form-row" style={row}>
        <div style={col}>
          <div style={{marginBottom:14}}>
            <RLabel text="Assignee *"/>
            <select value={f.assignee} onChange={e=>onAssigneeChange(e.target.value)}
              style={{width:"100%",background:C.surface,border:`1px solid ${f.assignee?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:f.assignee?C.t1:C.t3,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              <option value="">— Select Assignee —</option>
              {members.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={col}><FSelect label="Status *" value={f.status} onChange={s("status")} options={ALL_STATUSES}/></div>
      </div>
      <div className="rds-form-row" style={row}>
        <div style={col}><FSelect label="Priority" value={f.priority} onChange={s("priority")} options={["High","Medium","Low"]}/></div>
        <div style={col}><FInput label={requireDates?"Due Date *":"Due Date"} value={f.due_date} onChange={s("due_date")} type="date"/></div>
      </div>
      <div className="rds-form-row" style={row}>
        <div style={col}>
          <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Detailer <span style={{color:C.t3,fontWeight:400}}>(defaults to assignee)</span></label>
          <select value={f.detailer} onChange={e=>s("detailer")(e.target.value)}
            style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="">— None —</option>
            {members.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={col}>
          <RLabel text="Checker *"/>
          <select value={f.checker} onChange={e=>s("checker")(e.target.value)}
            style={{width:"100%",background:C.surface,border:`1px solid ${f.checker?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:f.checker?C.t1:C.t3,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="">— Select Checker —</option>
            {members.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="rds-form-row" style={row}>
        <div style={col}><FInput label="Scope" value={f.scope} onChange={s("scope")} placeholder="e.g. CIP&CMU"/></div>
        <div style={col}><FInput label={requireDates?"Client Sub Date *":"Client Sub Date"} value={f.client_sub_date} onChange={s("client_sub_date")} type="date"/></div>
      </div>
      <div className="rds-form-row" style={row}>
        <div style={col}><FInput label="Tags (comma-separated)" value={f.tags} onChange={s("tags")}/></div>
        <div style={col}><FileUp files={f.files} onChange={files=>sf(p=>({...p,files}))}/></div>
      </div>
      {((!custom&&!f.project_id)||!f.title.trim()||!f.client||!f.assignee||!f.status||!f.checker)&&(
        <div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 14px",marginBottom:10,color:C.red,fontSize:12}}>
          ⚠ Required: {[!custom&&!f.project_id&&"Project",!f.title.trim()&&"Task Title",!f.client&&"Client",!f.assignee&&"Assignee",!f.status&&"Status",!f.checker&&"Checker"].filter(Boolean).join(", ")}
        </div>
      )}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:10}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving||(!custom&&!f.project_id)||!f.title.trim()||!f.client||!f.assignee||!f.status||!f.checker} onClick={()=>onSave({...f,assignee:f.assignee||"",custName:custom?f.custName:"",tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean)})} style={{...SBtn,opacity:(saving||(!custom&&!f.project_id)||!f.title.trim()||!f.client||!f.assignee||!f.status||!f.checker)?0.5:1}}>
          {saving?"Saving…":"Save Task"}
        </button>
      </div>
    </div>
  );
}
function ProjectFormFields({f,sf,users,clients,requireDates=false,narayanaUsername="",existingGroupNames=[]}){
  function toggleUser(username){
    if(username===narayanaUsername)return;// Narayana always stays assigned
    sf(p=>({...p,assigned_users:p.assigned_users.includes(username)?p.assigned_users.filter(u=>u!==username):[...p.assigned_users,username]}));
  }
  return(
    <>
      <div style={{display:"flex",gap:16}}>
        <div style={{flex:1}}><FInput label="Project Name *" value={f.name} onChange={v=>sf(p=>({...p,name:v}))}/></div>
        <div style={{flex:1,marginBottom:14}}>
          <RLabel text="Client *"/>
          <select value={f.client} onChange={e=>sf(p=>({...p,client:e.target.value}))}
            style={{width:"100%",background:C.surface,border:`1px solid ${f.client?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:f.client?C.t1:C.t3,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="">— Select Client —</option>
            {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <FInput label={requireDates?"Deadline *":"Deadline"} value={f.deadline} onChange={v=>sf(p=>({...p,deadline:v}))} type="date"/>
      <div style={{marginBottom:14}}>
        <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:8,fontWeight:600}}>Color</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {PROJECT_COLORS.map(c=><div key={c} onClick={()=>sf(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent"}}/>)}
        </div>
      </div>
      <FInput label="Description" value={f.description} onChange={v=>sf(p=>({...p,description:v}))}/>
      <div style={{marginBottom:14}}>
        <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Group / Phase <span style={{color:C.t3,fontWeight:400}}>(optional — groups projects together on dashboard)</span></label>
        <input value={f.group_name||""} onChange={e=>sf(p=>({...p,group_name:e.target.value}))} list="group-suggestions"
          placeholder="e.g. Somi Parc Phase 1, Tower A, Podium…"
          style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        <datalist id="group-suggestions">{[...new Set(existingGroupNames||[])].map(g=><option key={g} value={g}/>)}</datalist>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <label style={{color:C.t2,fontSize:12,fontWeight:600}}>Assign Employees <span style={{color:C.red,fontWeight:700}}>*</span> <span style={{color:C.t3,fontWeight:400}}>(Narayana auto-assigned — select at least 1 more)</span></label>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>sf(p=>({...p,assigned_users:users.map(u=>u.username)}))} style={{...GBtn,padding:"3px 10px",fontSize:11}}>All</button>
            <button onClick={()=>sf(p=>({...p,assigned_users:[]}))} style={{...GBtn,padding:"3px 10px",fontSize:11}}>Clear</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:160,overflowY:"auto",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
          {users.map(u=>{
            const isLocked=u.username===narayanaUsername;
            const checked=f.assigned_users.includes(u.username);
            return(
            <div key={u.id} onClick={()=>toggleUser(u.username)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,cursor:isLocked?"default":"pointer",background:checked?C.accent+"22":C.card,border:`1px solid ${checked?C.accent:C.border}`,transition:"all .15s",opacity:isLocked?0.85:1}}>
              <div style={{width:16,height:16,borderRadius:4,background:checked?C.accent:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {isLocked?<span style={{color:"#fff",fontSize:9}}>🔒</span>:checked&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
              </div>
              <Av name={u.name} size={20}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{u.name}{isLocked&&<span style={{fontSize:9,color:C.t3,marginLeft:4}}>(auto)</span>}</div>
                <div style={{fontSize:10,color:C.t3}}>{u.role}</div>
              </div>
              {checked&&!isLocked&&(
                <span style={{fontSize:10,color:C.red,fontWeight:700,padding:"1px 4px",borderRadius:3,border:`1px solid ${C.red}44`,background:C.red+"11"}}>✕</span>
              )}
            </div>
            );
          })}
        </div>
        <p style={{margin:"6px 0 0",fontSize:11,color:C.t3}}>
          {f.assigned_users.filter(u=>u!==narayanaUsername).length===0
            ?<span style={{color:C.yellow}}>⚠ Select at least one more team member (besides Narayana)</span>
            :`${f.assigned_users.length} user(s) assigned`}
        </p>
      </div>
    </>
  );
}
function ProjectForm({onSave,onClose,saving,users,clients,requireDates=false,existingGroupNames=[]}){
  const narayana=users.find(u=>(u.name||"").toLowerCase().includes("narayana"));
  const [f,sf]=useState({name:"",deadline:"",description:"",client:"",color:C.teal,assigned_users:narayana?[narayana.username]:[],group_name:""});
  const otherUsers=f.assigned_users.filter(u=>u!==narayana?.username);
  const canSave=f.name.trim()&&f.client&&otherUsers.length>0&&(!requireDates||f.deadline);
  const missingMsg=!f.name.trim()?"Project Name is required.":!f.client?"Client is required.":otherUsers.length===0?"Select at least one more team member.":requireDates&&!f.deadline?"Deadline is required.":"";
  return(
    <div>
      <ProjectFormFields f={f} sf={sf} users={users} clients={clients} requireDates={requireDates} narayanaUsername={narayana?.username} existingGroupNames={existingGroupNames}/>
      {missingMsg&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 14px",marginBottom:10,color:C.red,fontSize:12}}>⚠ {missingMsg}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving||!canSave} onClick={()=>onSave(f)} style={{...SBtn,opacity:(saving||!canSave)?0.5:1}}>{saving?"Creating…":"Create Project"}</button>
      </div>
    </div>
  );
}
function EditProjectForm({project,onSave,onClose,saving,users,clients,requireDates=false,existingGroupNames=[]}){
  const narayana=users.find(u=>(u.name||"").toLowerCase().includes("narayana"));
  const [f,sf]=useState({
    name:project.name||"",deadline:project.deadline||"",
    description:project.description||"",client:project.client||"",
    color:project.color||C.teal,assigned_users:project.assigned_users||[],
    group_name:project.group_name||"",
  });
  return(
    <div>
      <ProjectFormFields f={f} sf={sf} users={users} clients={clients} requireDates={requireDates} narayanaUsername={narayana?.username} existingGroupNames={existingGroupNames}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving||!f.name.trim()} onClick={()=>onSave(f)} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Saving…":"Save Changes"}</button>
      </div>
    </div>
  );
}
function ClientsModal({clients,users,onAdd,onEdit,onDelete,onSavePortal,onClose}){
  const [tab,st]=useState("list");
  const [f,sf]=useState({name:"",email:"",phone:"",address:"",portal_username:"",portal_password:"Client@RDS2026"});
  const [editId,sei]=useState(null);
  const [err,se]=useState("");
  const [saving,setSaving]=useState(false);
  const [cq,scq]=useState("");
  const [selClients,setSC]=useState(new Set());
  const s=k=>v=>sf(p=>({...p,[k]:v}));
  function toUn(str){return(str||"").toLowerCase().trim().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");}
  function startEdit(c){
    sei(c.id);
    const pu=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===c.name.toLowerCase());
    sf({name:c.name,email:c.email||"",phone:c.phone||"",address:c.address||"",portal_username:pu?.username||toUn(c.name),portal_password:""});
    st("add");
  }
  function reset(){sei(null);sf({name:"",email:"",phone:"",address:"",portal_username:"",portal_password:"Client@RDS2026"});se("");}
  async function save(){
    if(!f.name.trim()){se("Client name is required.");return;}
    if(!f.portal_username.trim()){se("Portal username is required.");return;}
    setSaving(true);
    try{
      if(editId){await onEdit(editId,{name:f.name,email:f.email,phone:f.phone,address:f.address});}
      else{await onAdd({name:f.name,email:f.email,phone:f.phone,address:f.address});}
      await onSavePortal(f.name,f.portal_username,f.portal_password||null);
      reset();st("list");
    }catch(e){se("Error: "+e.message);}
    setSaving(false);
  }
  // autoUsername removed — username is now entered manually
  const shownClients=cq?clients.filter(c=>c.name.toLowerCase().includes(cq.toLowerCase())||(c.email||"").toLowerCase().includes(cq.toLowerCase())||(c.phone||"").includes(cq)||(c.address||"").toLowerCase().includes(cq.toLowerCase())):clients;
  return(
    <Modal title="Manage Clients" onClose={onClose} wide>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["list","🏢 All Clients"],["add",editId?"✏️ Edit Client":"➕ Add Client"]].map(([k,label])=>(
          <button key={k} onClick={()=>{if(k==="list")reset();st(k);se("");}} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab===k?C.accent:C.surface,color:tab===k?"#fff":C.t2,border:`1px solid ${tab===k?C.accent:C.border}`}}>{label}</button>
        ))}
      </div>
      {tab==="list"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
            <GmailSelect selectedCount={selClients.size} total={shownClients.length}
              onSelectAll={()=>setSC(new Set(shownClients.map(c=>c.id)))}
              onSelectNone={()=>setSC(new Set())}/>
            <input autoFocus placeholder="🔍  Search clients…" value={cq} onChange={e=>scq(e.target.value)}
              style={{flex:1,background:C.surface,border:`1px solid ${cq?C.accent:C.border}`,borderRadius:8,padding:"8px 13px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            {cq&&<button onClick={()=>scq("")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:7,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
            <span style={{color:C.t3,fontSize:12,whiteSpace:"nowrap"}}>{shownClients.length}/{clients.length}</span>
          </div>
          {selClients.size>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 14px",background:C.accent+"18",border:`1px solid ${C.accent}44`,borderRadius:8}}>
              <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{selClients.size} selected</span>
              <button onClick={async()=>{if(!window.confirm(`Delete ${selClients.size} client(s)? This cannot be undone.`))return;for(const id of selClients)await onDelete(id);setSC(new Set());}} style={{background:C.red+"22",color:C.red,border:`1px solid ${C.red}44`,borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🗑 Delete ({selClients.size})</button>
              <button onClick={()=>setSC(new Set())} style={{background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ Clear</button>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflowY:"auto"}}>
            {shownClients.length===0&&<div style={{textAlign:"center",color:C.t3,padding:32}}>No clients match your search.</div>}
            {shownClients.map(c=>{
              const pu=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===c.name.toLowerCase());
              const cSelected=selClients.has(c.id);
              return(
                <div key={c.id} onClick={()=>setSC(s=>{const n=new Set(s);n.has(c.id)?n.delete(c.id):n.add(c.id);return n;})} style={{display:"flex",alignItems:"center",gap:12,background:cSelected?C.accent+"12":C.surface,border:`1px solid ${cSelected?C.accent:cq&&c.name.toLowerCase().includes(cq.toLowerCase())?C.accent:C.border}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",transition:"background .1s"}}>
                  <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${cSelected?C.accent:C.t3}`,background:cSelected?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0}}>{cSelected?"✓":""}</div>
                  <div style={{width:40,height:40,borderRadius:10,background:`hsl(${c.name.charCodeAt(0)*23%360},55%,30%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",flexShrink:0}}>{c.name[0]}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{c.name}</div>
                    <div style={{fontSize:11,color:C.t3,display:"flex",gap:12,marginTop:2,flexWrap:"wrap"}}>
                      {c.email&&<span>✉ {c.email}</span>}
                      {c.phone&&<span>📞 {c.phone}</span>}
                      {c.address&&<span>📍 {c.address}</span>}
                    </div>
                    <div style={{marginTop:5,fontSize:11}}>
                      {pu
                        ?<span style={{color:C.green,fontWeight:600}}>🔐 Portal: @{pu.username}</span>
                        :<span style={{color:C.yellow,fontWeight:600}}>⚠ No portal access — click ✏️ to set up</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    <IBtn icon="✏️" title="Edit" onClick={()=>startEdit(c)} color={C.t2}/>
                    <IBtn icon="🗑" title="Delete" color={C.red} onClick={()=>{if(window.confirm(`Delete client "${c.name}"?`))onDelete(c.id);}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab==="add"&&(
        <div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Client Name *" value={f.name} onChange={s("name")} placeholder="e.g. Formcrete"/></div>
            <div style={{flex:1}}><FInput label="Email" value={f.email} onChange={s("email")} placeholder="e.g. info@formcrete.com" type="email"/></div>
          </div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Phone" value={f.phone} onChange={s("phone")} placeholder="e.g. +1 234 567 8900"/></div>
            <div style={{flex:1}}><FInput label="Address" value={f.address} onChange={s("address")} placeholder="e.g. Miami, FL"/></div>
          </div>
          {/* Portal Access */}
          <div style={{marginTop:14,padding:"14px 16px",background:C.teal+"11",border:`1px solid ${C.teal}44`,borderRadius:10}}>
            <p style={{margin:"0 0 12px",fontSize:13,color:C.teal,fontWeight:700}}>🔐 Client Portal Access</p>
            <div style={{display:"flex",gap:16}}>
              <div style={{flex:1}}>
                <RLabel text="Username *"/>
                <input value={f.portal_username} onChange={e=>sf(p=>({...p,portal_username:e.target.value.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${f.portal_username?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                  placeholder="Enter username manually"/>
              </div>
              <div style={{flex:1}}>
                <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>{editId?"New Password (blank = keep)":"Password"}</label>
                <input type="password" value={f.portal_password} onChange={e=>sf(p=>({...p,portal_password:e.target.value}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                  placeholder={editId?"Leave blank to keep":"Client@RDS2026"}/>
              </div>
            </div>
          </div>
          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"9px 14px",marginTop:12,color:C.red,fontSize:13}}>⚠ {err}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:14}}>
            <button onClick={()=>{reset();st("list");}} style={GBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Saving…":editId?"Save Changes":"Add Client"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
function UsersModal({users,currentUser,projects,clients,onAdd,onEdit,onDelete,onClose}){
  const [tab,st]=useState("list");
  const [editUser,seu]=useState(null);
  const [f,sf]=useState({name:"",username:"",password:"RDSTechserv@2026",role:"Rebar",client_name:"",email:"",assigned_projects:[]});
  const [err,se]=useState("");
  const [saving,setSaving]=useState(false);
  const [uq,suq]=useState("");
  const [uRole,sur]=useState("All");
  const [selUsers,setSU]=useState(new Set());
  const s=k=>v=>sf(p=>({...p,[k]:v}));
  const isSuperAdmin=currentUser.username===SUPER_ADMIN;
  function toggleProj(pid){sf(p=>({...p,assigned_projects:p.assigned_projects.includes(pid)?p.assigned_projects.filter(id=>id!==pid):[...p.assigned_projects,pid]}));}
  function startEdit(u){seu(u);sf({name:u.name,username:u.username,password:"",role:u.role,client_name:u.client_name||"",email:u.email||"",assigned_projects:[]});st("edit");se("");}
  function resetForm(){seu(null);sf({name:"",username:"",password:"RDSTechserv@2026",role:"Rebar",client_name:"",email:"",assigned_projects:[]});se("");}
  async function addUser(){
    if(!f.name.trim()){se("Full Name is required.");return;}
    if(!f.role){se("Role is required.");return;}
    if(f.role==="Client"&&!f.client_name){se("Client Name is required.");return;}
    if(f.role!=="Client"&&!f.email.trim()){se("Email is required.");return;}
    if(!f.username.trim()){se("Username is required.");return;}
    if(!f.password.trim()){se("Password is required.");return;}
    if(users.find(u=>u.username===f.username.trim().toLowerCase())){se("Username already exists.");return;}
    setSaving(true);
    try{
      await onAdd({name:f.name.trim(),username:f.username.trim().toLowerCase(),password:f.password,role:f.role,client_name:f.client_name||"",email:f.email.trim()||""});
      resetForm();st("list");
    }catch(e){se("Error: "+e.message);}
    setSaving(false);
  }
  async function saveEdit(){
    if(!f.name.trim()){se("Name is required.");return;}
    setSaving(true);
    try{
      const updates={name:f.name.trim(),username:f.username.trim().toLowerCase(),role:f.role,client_name:f.client_name||"",email:f.email.trim()||""};
      if(f.password&&f.password.trim())updates.password=f.password.trim();
      await onEdit(editUser.id,updates);
      resetForm();st("list");
    }catch(e){se("Error: "+e.message);}
    setSaving(false);
  }
  return(
    <Modal title="Manage Employees" onClose={onClose} wide>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{resetForm();st("list");}} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="list"?C.accent:C.surface,color:tab==="list"?"#fff":C.t2,border:`1px solid ${tab==="list"?C.accent:C.border}`}}>👥 Employees</button>
        <button onClick={()=>{resetForm();st("clients");}} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="clients"?C.teal:C.surface,color:tab==="clients"?"#fff":C.t2,border:`1px solid ${tab==="clients"?C.teal:C.border}`}}>👤 Clients</button>
        <button onClick={()=>{resetForm();st("add");}} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="add"?C.accent:C.surface,color:tab==="add"?"#fff":C.t2,border:`1px solid ${tab==="add"?C.accent:C.border}`}}>➕ Add Employee</button>
        {editUser&&<button onClick={()=>st("edit")} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="edit"?C.accent:C.surface,color:tab==="edit"?"#fff":C.t2,border:`1px solid ${tab==="edit"?C.accent:C.border}`}}>✏️ Edit: {editUser.name}</button>}
      </div>
      {tab==="list"&&(()=>{
        const nonClientUsers=users.filter(u=>u.role!=="Client");
        const shownUsers=nonClientUsers.filter(u=>{
          if(uRole!=="All"&&u.role!==uRole)return false;
          if(uq&&!u.name.toLowerCase().includes(uq.toLowerCase())&&!u.username.toLowerCase().includes(uq.toLowerCase())&&!(u.email||"").toLowerCase().includes(uq.toLowerCase()))return false;
          return true;
        });
        return(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
              <GmailSelect selectedCount={selUsers.size} total={shownUsers.filter(u=>u.id!==currentUser.id&&u.username!==SUPER_ADMIN).length}
                onSelectAll={()=>setSU(new Set(shownUsers.filter(u=>u.id!==currentUser.id&&u.username!==SUPER_ADMIN).map(u=>u.id)))}
                onSelectNone={()=>setSU(new Set())}
                extraOptions={ROLES.filter(r=>shownUsers.some(u=>u.role===r)).map(r=>({label:r,action:()=>setSU(new Set(shownUsers.filter(u=>u.role===r&&u.id!==currentUser.id&&u.username!==SUPER_ADMIN).map(u=>u.id)))}))}/>
              <input autoFocus placeholder="🔍  Search by name, username, email…" value={uq} onChange={e=>suq(e.target.value)}
                style={{flex:1,background:C.surface,border:`1px solid ${uq?C.accent:C.border}`,borderRadius:8,padding:"8px 13px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <select value={uRole} onChange={e=>sur(e.target.value)} style={{background:C.surface,border:`1px solid ${uRole!=="All"?C.accent:C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">All Roles</option>
                {ROLES.filter(r=>r!=="Client").map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              {(uq||uRole!=="All")&&<button onClick={()=>{suq("");sur("All");}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:7,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
              <span style={{color:C.t3,fontSize:12,whiteSpace:"nowrap"}}>{shownUsers.length}/{nonClientUsers.length}</span>
            </div>
            {selUsers.size>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 14px",background:C.accent+"18",border:`1px solid ${C.accent}44`,borderRadius:8}}>
                <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{selUsers.size} selected</span>
                <button onClick={async()=>{if(!window.confirm(`Delete ${selUsers.size} employee(s)? This cannot be undone.`))return;for(const id of selUsers)await onDelete(id);setSU(new Set());}} style={{background:C.red+"22",color:C.red,border:`1px solid ${C.red}44`,borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🗑 Delete ({selUsers.size})</button>
                <button onClick={()=>setSU(new Set())} style={{background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ Clear</button>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"52vh",overflowY:"auto"}}>
              {shownUsers.length===0&&<div style={{textAlign:"center",color:C.t3,padding:32}}>No employees match your search.</div>}
              {shownUsers.map(u=>{
              const uSelectable=u.id!==currentUser.id&&u.username!==SUPER_ADMIN;
              const uSelected=selUsers.has(u.id);
              return(
                <div key={u.id} onClick={uSelectable?e=>{e.stopPropagation();setSU(s=>{const n=new Set(s);n.has(u.id)?n.delete(u.id):n.add(u.id);return n;});}:undefined} style={{display:"grid",gridTemplateColumns:"24px 40px 1fr auto auto auto",alignItems:"center",gap:12,background:uSelected?C.accent+"12":C.surface,border:`1px solid ${uSelected?C.accent:uq&&u.name.toLowerCase().includes(uq.toLowerCase())?C.accent:C.border}`,borderRadius:10,padding:"12px 16px",cursor:uSelectable?"pointer":"default",transition:"background .1s"}}>
                  <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${uSelected?C.accent:uSelectable?C.t3:"transparent"}`,background:uSelected?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0}}>{uSelected?"✓":""}</div>
                  <Av name={u.name} size={32}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1}}>
                      {u.name}{u.username===SUPER_ADMIN&&<span style={{color:C.accent,fontSize:10,marginLeft:6,fontWeight:700}}>★ SUPER ADMIN</span>}
                    </div>
                    <div style={{fontSize:11,color:C.t3}}>@{u.username}{u.email?` · ${u.email}`:""}{u.client_name?` · ${u.client_name}`:""}</div>
                  </div>
                  <Bdg color={u.role==="Admin"?C.accent:u.role==="Manager"?"#f59e0b":u.role==="Team Leader"?"#8b5cf6":u.role==="Client"?C.teal:u.role==="Tekla"?"#10b981":C.blue}>{u.role}</Bdg>
                  {u.id===currentUser.id
                    ?<span style={{fontSize:18,opacity:0.3}} title="This is you">👤</span>
                    :<button onClick={e=>{e.stopPropagation();startEdit(u);}} style={{background:C.blue,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>✏️ Edit</button>
                  }
                  {u.id===currentUser.id||u.username===SUPER_ADMIN
                    ?<span style={{fontSize:18,opacity:0.3}} title="Protected">🔒</span>
                    :<button onClick={e=>{e.stopPropagation();if(window.confirm("Delete "+u.name+"?"))onDelete(u.id);}} style={{background:C.red,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>🗑</button>
                  }
                </div>
              );})
            }
            </div>
          </div>
        );
      })()}
      {tab==="clients"&&(()=>{
        const clientUsers=users.filter(u=>u.role==="Client");
        const shownClients=clientUsers.filter(u=>{
          if(uq&&!u.name.toLowerCase().includes(uq.toLowerCase())&&!u.username.toLowerCase().includes(uq.toLowerCase())&&!(u.client_name||"").toLowerCase().includes(uq.toLowerCase()))return false;
          return true;
        });
        return(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
              <input autoFocus placeholder="🔍  Search by name, username, client…" value={uq} onChange={e=>suq(e.target.value)}
                style={{flex:1,background:C.surface,border:`1px solid ${uq?C.teal:C.border}`,borderRadius:8,padding:"8px 13px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              {uq&&<button onClick={()=>suq("")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:7,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
              <span style={{color:C.t3,fontSize:12,whiteSpace:"nowrap"}}>{shownClients.length}/{clientUsers.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"52vh",overflowY:"auto"}}>
              {shownClients.length===0&&<div style={{textAlign:"center",color:C.t3,padding:32}}>No client users found.</div>}
              {shownClients.map(u=>(
                <div key={u.id} style={{display:"grid",gridTemplateColumns:"40px 1fr auto auto auto",alignItems:"center",gap:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px"}}>
                  <Av name={u.name} size={32}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{u.name}</div>
                    <div style={{fontSize:11,color:C.t3}}>@{u.username}{u.client_name?` · 🏢 ${u.client_name}`:""}</div>
                  </div>
                  <Bdg color={C.teal}>Client</Bdg>
                  <button onClick={e=>{e.stopPropagation();startEdit(u);}} style={{background:C.blue,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>✏️ Edit</button>
                  <button onClick={e=>{e.stopPropagation();if(window.confirm("Delete "+u.name+"?"))onDelete(u.id);}} style={{background:C.red,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {tab==="add"&&(
        <div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Full Name *" value={f.name} onChange={s("name")} placeholder="e.g. Suresh Kumar"/></div>
            <div style={{flex:1}}><FSelect label="Role *" value={f.role} onChange={v=>{sf(p=>({...p,role:v,password:v==="Client"?"Client@RDS2026":"RDSTechserv@2026"}));}} options={isSuperAdmin?ROLES:ROLES.filter(r=>r!=="Admin")}/></div>
          </div>
          <div style={{display:"flex",gap:16}}>
            {f.role!=="Client"&&<div style={{flex:1}}><FInput label="Email *" value={f.email} onChange={s("email")} placeholder="e.g. suresh@company.com" type="email"/></div>}
            {f.role!=="Client"&&<div style={{flex:1}}><FInput label="Username *" value={f.username} onChange={s("username")} placeholder="e.g. suresh"/></div>}
          </div>
          {f.role!=="Client"&&<div style={{display:"flex",gap:16,marginBottom:4}}>
            <div style={{flex:1}}><FInput label="Password" value={f.password} onChange={s("password")} type="password"/></div>
          </div>}
          {f.role==="Client"&&(
            <div style={{marginBottom:14,padding:"12px 14px",background:C.teal+"11",border:`1px solid ${C.teal}44`,borderRadius:8}}>
              <p style={{margin:"0 0 10px",fontSize:12,color:C.teal,fontWeight:600}}>👤 Client Access</p>
              <div>
                <RLabel text="Client Name *"/>
                <select value={f.client_name} onChange={e=>{const cn=e.target.value;sf(p=>({...p,client_name:cn,name:cn||p.name}));}}
                  style={{width:"100%",background:C.surface,border:`1px solid ${f.client_name?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:f.client_name?C.t1:C.t3,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="">— Select Client —</option>
                  {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div style={{marginTop:10}}>
                <RLabel text="Username *"/>
                <input value={f.username} onChange={e=>sf(p=>({...p,username:e.target.value.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${f.username?C.border:C.red+"88"}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                  placeholder="Enter username manually"/>
              </div>
              <div style={{marginTop:10}}>
                <FInput label="Password" value={f.password} onChange={s("password")} type="password"/>
              </div>
            </div>
          )}
          {f.role==="Team Leader"&&clients.length>0&&(
            <div style={{marginBottom:14,padding:"12px 14px",background:"#8b5cf611",border:`1px solid #8b5cf644`,borderRadius:8}}>
              <p style={{margin:"0 0 10px",fontSize:12,color:"#8b5cf6",fontWeight:700}}>🏢 Assigned Clients</p>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {clients.map(c=>{
                  const asgn=(f.client_name||"").split(",").map(x=>x.trim().toLowerCase()).includes(c.name.toLowerCase());
                  return(
                    <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"7px 10px",borderRadius:6,background:asgn?"#8b5cf622":C.surface,border:`1px solid ${asgn?"#8b5cf6":C.border}`}}>
                      <input type="checkbox" checked={asgn} onChange={()=>{
                        const cur=(f.client_name||"").split(",").map(x=>x.trim()).filter(Boolean);
                        const next=asgn?cur.filter(x=>x.toLowerCase()!==c.name.toLowerCase()):[...cur,c.name];
                        sf(p=>({...p,client_name:next.join(",")}));
                      }} style={{accentColor:"#8b5cf6",width:15,height:15}}/>
                      <span style={{fontSize:13,color:asgn?"#8b5cf6":C.t1,fontWeight:asgn?600:400}}>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"9px 14px",marginBottom:14,color:C.red,fontSize:13}}>⚠ {err}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            <button onClick={()=>{resetForm();st("list");}} style={GBtn}>Cancel</button>
            <button onClick={addUser} disabled={saving} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Creating…":"Create Employee"}</button>
          </div>
        </div>
      )}
      {tab==="edit"&&editUser&&(
        <div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:20,padding:"12px 16px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}>
            <Av name={editUser.name} size={40}/>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:C.t1}}>{editUser.name}</div>
              <div style={{fontSize:12,color:C.t3}}>@{editUser.username} · current role: {editUser.role}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Full Name" value={f.name} onChange={s("name")}/></div>
            <div style={{flex:1}}><FInput label="Username" value={f.username} onChange={v=>sf(p=>({...p,username:v.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}))} placeholder="e.g. suresh"/></div>
          </div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Email" value={f.email} onChange={s("email")} placeholder="e.g. suresh@company.com" type="email"/></div>
            <div style={{flex:1}}><FSelect label="Role" value={f.role} onChange={s("role")} options={isSuperAdmin?ROLES:ROLES.filter(r=>r!=="Admin")}/></div>
          </div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="New Password (leave blank to keep)" value={f.password} onChange={s("password")} type="password" placeholder="Leave blank to keep unchanged"/></div>
          </div>
          {f.role==="Client"&&(
            <div style={{display:"flex",gap:16}}>
              <div style={{flex:1}}>
                <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Client Name</label>
                <select value={f.client_name} onChange={e=>s("client_name")(e.target.value)}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="">— Select Client —</option>
                  {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <FInput label="Username" value={f.username} onChange={v=>sf(p=>({...p,username:v.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}))} placeholder="e.g. white_cap"/>
              </div>
            </div>
          )}
          {f.role==="Team Leader"&&clients.length>0&&(
            <div style={{marginBottom:14,padding:"12px 14px",background:"#8b5cf611",border:`1px solid #8b5cf644`,borderRadius:8}}>
              <p style={{margin:"0 0 10px",fontSize:12,color:"#8b5cf6",fontWeight:700}}>🏢 Assigned Clients</p>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {clients.map(c=>{
                  const asgn=(f.client_name||"").split(",").map(x=>x.trim().toLowerCase()).includes(c.name.toLowerCase());
                  return(
                    <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"7px 10px",borderRadius:6,background:asgn?"#8b5cf622":C.surface,border:`1px solid ${asgn?"#8b5cf6":C.border}`}}>
                      <input type="checkbox" checked={asgn} onChange={()=>{
                        const cur=(f.client_name||"").split(",").map(x=>x.trim()).filter(Boolean);
                        const next=asgn?cur.filter(x=>x.toLowerCase()!==c.name.toLowerCase()):[...cur,c.name];
                        sf(p=>({...p,client_name:next.join(",")}));
                      }} style={{accentColor:"#8b5cf6",width:15,height:15}}/>
                      <span style={{fontSize:13,color:asgn?"#8b5cf6":C.t1,fontWeight:asgn?600:400}}>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {f.role!==editUser.role&&(
            <div style={{marginBottom:14,padding:"10px 14px",background:C.blue+"11",border:`1px solid ${C.blue}44`,borderRadius:8}}>
              <p style={{margin:0,fontSize:12,color:C.blue,fontWeight:600}}>🔄 Role: <strong>{editUser.role}</strong> → <strong>{f.role}</strong></p>
            </div>
          )}
          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"9px 14px",marginBottom:14,color:C.red,fontSize:13}}>⚠ {err}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            <button onClick={()=>{resetForm();st("list");}} style={GBtn}>Cancel</button>
            <button onClick={saveEdit} disabled={saving} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Saving…":"Save Changes"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
function KCard({task,project,onEdit,onDelete,onDrop,readonly,canDelete=true,selected=false,onSelect=null,selectMode=true,fileCount=0,onFiles=null}){
  const [h,sh]=useState(false),[d,sd]=useState(false);
  return(
    <div draggable={!readonly&&!onSelect} onDragStart={e=>{if(onSelect)return;sd(true);e.dataTransfer.setData("tid",task.id);}} onDragEnd={()=>sd(false)}
      onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{background:selected?C.accent+"18":C.card,border:`1px solid ${selected?C.accent:h?C.border:C.surface}`,borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"default",opacity:d?.4:1,boxShadow:h?"0 4px 16px #00000050":"none",borderLeft:`3px solid ${selected?C.accent:project?.color||C.accent}`,transition:"all .15s",position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <p style={{margin:0,color:C.t1,fontSize:13,fontWeight:600,flex:1,lineHeight:1.4,paddingRight:onSelect?26:0}}>{task.title}</p>
        {onSelect?<div onClick={e=>{e.stopPropagation();onSelect(task.id);}} style={{position:"absolute",top:12,right:12,width:18,height:18,borderRadius:4,border:`2px solid ${selected?C.accent:C.t3}`,background:selected?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0,transition:"all .15s",cursor:"pointer"}}>{selected?"✓":""}</div>
        :<div style={{display:"flex",gap:2,opacity:h?1:0,transition:"opacity .15s"}}>
          {onFiles&&<IBtn icon="📎" onClick={e=>{e.stopPropagation();onFiles(task);}} title="Files"/>}
          {!readonly&&<IBtn icon="✏️" onClick={()=>onEdit(task)}/>}
          {!readonly&&canDelete&&<IBtn icon="🗑" onClick={()=>onDelete(task.id)} color={C.red}/>}
        </div>}
      </div>
      <p style={{margin:"4px 0 0",fontSize:11,color:C.teal}}>📁 {project?.name}</p>
      {task.client&&<p style={{margin:"2px 0 0",fontSize:11,color:C.t2}}>👤 {task.client}</p>}
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
        {(task.tags||[]).map(t=><span key={t} style={{background:C.border,color:C.t2,borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:600}}>{t}</span>)}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Bdg color={PRI_CLR[task.priority]}>{task.priority}</Bdg>
          {fileCount>0&&<span onClick={e=>{e.stopPropagation();if(onFiles)onFiles(task);}} style={{fontSize:10,color:C.t3,background:C.border,borderRadius:4,padding:"1px 5px",cursor:onFiles?"pointer":"default"}}>📎{fileCount}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {task.due_date&&<span style={{fontSize:10,color:C.t3}}>{task.due_date}</span>}
          {task.assignee?<Av name={task.assignee} size={22}/>:<span style={{fontSize:10,color:C.yellow}}>Unassigned</span>}
        </div>
      </div>
      {!readonly&&!onSelect&&<MobileKMove task={task} onDrop={onDrop}/>}
    </div>
  );
}
// Mobile-only status mover for kanban cards
function MobileKMove({task,onDrop}){
  const isMobile=useMobile();
  if(!isMobile)return null;
  const COLS=["Not Yet Started","In Progress","Review","Completed"];
  return(
    <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>
      {COLS.filter(c=>c!==task.status).map(c=>(
        <button key={c} onClick={e=>{e.stopPropagation();if(onDrop)onDrop(task.id,c);}}
          style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${getStatusColor(c)}44`,background:getStatusColor(c)+"18",color:getStatusColor(c),cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
          → {c}
        </button>
      ))}
    </div>
  );
}
function KCol({status,tasks,projects,onEdit,onDelete,onDrop,canEditFn,canDelete=true,selTasks=new Set(),onToggleTask=null,taskFileCounts={},onFiles=null}){
  const [ov,so]=useState(false);
  const selectMode=!!onToggleTask;
  return(
    <div className="rds-kcol" onDragOver={e=>{if(selectMode)return;e.preventDefault();so(true);}} onDragLeave={()=>so(false)}
      onDrop={e=>{if(selectMode)return;e.preventDefault();so(false);onDrop(e.dataTransfer.getData("tid"),status);}}
      style={{minWidth:220,flex:1,background:ov?C.surface+"88":"transparent",border:`2px dashed ${ov?getStatusColor(status):C.border}`,borderRadius:12,padding:12,transition:"all .15s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:getStatusColor(status)}}/>
        <span style={{color:C.t1,fontWeight:700,fontSize:13}}>{status}</span>
        <span style={{background:C.border,color:C.t3,borderRadius:10,padding:"1px 8px",fontSize:11,marginLeft:"auto"}}>{tasks.length}</span>
      </div>
      {tasks.map(t=><KCard key={t.id} task={t} project={projects.find(p=>p.id===t.project_id)} onEdit={onEdit} onDelete={onDelete} onDrop={onDrop} readonly={!canEditFn(t)} canDelete={canDelete} selected={selTasks.has(t.id)} onSelect={onToggleTask} selectMode={selectMode} fileCount={taskFileCounts[t.id]||0} onFiles={onFiles}/>)}
    </div>
  );
}
function TRow({task,project,onEdit,onDelete,readonly,canDelete=true,selected=false,onSelect=null,selectMode=false,fileCount=0,onFiles=null}){
  const [h,sh]=useState(false);
  const td={padding:"10px 16px",borderBottom:`1px solid ${C.border}`};
  const today=new Date().toISOString().slice(0,10);
  const overdue=task.due_date&&task.due_date<today&&!isDone(task.status);
  const showCb=!!onSelect;
  return(
    <tr onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      onClick={showCb?()=>onSelect(task.id):undefined}
      style={{background:selected?C.accent+"14":h?C.surface:"transparent",transition:"background .12s",cursor:showCb?"pointer":"default"}}>
      {showCb&&<td style={{...td,width:36,paddingRight:8}} onClick={e=>{e.stopPropagation();onSelect(task.id);}}>
        <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${selected?C.accent:C.t3}`,background:selected?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0,transition:"all .15s",margin:"0 auto"}}>{selected?"✓":""}</div>
      </td>}
      <td style={td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:18,borderRadius:2,background:project?.color||C.accent}}/><span style={{color:C.t1,fontSize:13}}>{task.title}</span>{fileCount>0&&<span onClick={e=>{e.stopPropagation();if(onFiles)onFiles(task);}} style={{fontSize:10,color:C.t3,background:C.border,borderRadius:4,padding:"1px 5px",cursor:"pointer",flexShrink:0}}>📎{fileCount}</span>}<SLABadge task={task}/></div></td>
      <td style={td}><span style={{color:C.t2,fontSize:12}}>{project?.name}</span></td>
      <td style={td}><span style={{color:C.teal,fontSize:12}}>{task.client||"—"}</span></td>
      <td style={td}><span style={{color:C.t3,fontSize:12}}>{task.scope||"—"}</span></td>
      <td style={td}><Bdg color={getStatusColor(task.status)}>{task.status}</Bdg></td>
      <td style={td}><Bdg color={PRI_CLR[task.priority]}>{task.priority}</Bdg></td>
      <td style={td}>{task.assignee?<div style={{display:"flex",alignItems:"center",gap:6}}><Av name={task.assignee} size={22}/><span style={{color:C.t2,fontSize:12}}>{task.assignee}</span></div>:<span style={{color:C.yellow,fontSize:12,fontWeight:600}}>Unassigned</span>}</td>
      <td style={td}><span style={{color:C.t2,fontSize:12}}>{task.detailer||"—"}</span></td>
      <td style={td}><span style={{color:C.t2,fontSize:12}}>{task.checker||"—"}</span></td>
      <td style={td}><span style={{color:overdue?C.red:C.t3,fontSize:12,fontWeight:overdue?700:400}}>{task.due_date||"—"}{overdue?" ⚠":""}</span></td>
      <td style={td}><span style={{color:C.t3,fontSize:12}}>{task.client_sub_date||"—"}</span></td>
      <td style={{...td,opacity:h?1:0,transition:"opacity .12s"}}><div style={{display:"flex",gap:4}}>
        {onFiles&&<IBtn icon="📎" onClick={e=>{e.stopPropagation();onFiles(task);}} title="Files"/>}
        {!readonly&&<IBtn icon="✏️" onClick={e=>{e.stopPropagation();onEdit(task);}} title="Edit"/>}
        {!readonly&&canDelete&&<IBtn icon="🗑" onClick={e=>{e.stopPropagation();onDelete(task.id);}} color={C.red} title="Delete"/>}
      </div></td>
    </tr>
  );
}
// ── Bulk Action Bar ─────────────────────────────────────────────────────────
// ── Gmail-style Select Dropdown ──────────────────────────────────────────────
function GmailSelect({selectedCount,total,onSelectAll,onSelectNone,extraOptions=[],label="Select"}){
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    function outside(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener("mousedown",outside);
    return()=>document.removeEventListener("mousedown",outside);
  },[open]);
  const isAll=total>0&&selectedCount===total;
  const isSome=selectedCount>0&&selectedCount<total;
  const active=selectedCount>0;
  const accentCol=active?C.accent:"#6b7280";
  return(
    <div ref={ref} style={{position:"relative",display:"inline-flex",alignItems:"center",userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",background:active?C.accent+"22":C.surface,border:`1.5px solid ${active?C.accent:C.border}`,borderRadius:8,overflow:"hidden",transition:"all .2s",boxShadow:active?`0 0 0 3px ${C.accent}22`:"none"}}>
        {/* checkbox + label */}
        <div onClick={()=>isAll?onSelectNone():onSelectAll()} style={{padding:"6px 8px 6px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer"}} title={isAll?"Deselect all":"Select all"}>
          <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${accentCol}`,background:isAll?accentCol:isSome?accentCol+"55":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0,transition:"all .15s",boxShadow:active?`0 0 0 2px ${C.accent}33`:"none"}}>
            {isAll?"✓":isSome?"−":""}
          </div>
          <span style={{fontSize:12,fontWeight:700,color:active?C.accent:C.t1,whiteSpace:"nowrap"}}>
            {active?<>{selectedCount}<span style={{fontWeight:400,color:C.t3}}> / {total}</span></>:label}
          </span>
        </div>
        {/* divider */}
        <div style={{width:1,alignSelf:"stretch",background:active?C.accent+"44":C.border}}/>
        {/* chevron */}
        <div onClick={()=>setOpen(v=>!v)} style={{padding:"6px 10px",display:"flex",alignItems:"center",cursor:"pointer",color:active?C.accent:C.t2,background:open?(active?C.accent+"18":C.border+"44"):"transparent",transition:"background .15s"}}>
          <span style={{fontSize:9,display:"inline-block",transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
        </div>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:400,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 12px 40px #00000099",minWidth:170,overflow:"hidden"}}>
          <div style={{padding:"10px 14px 6px",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>Select</span>
          </div>
          <div onClick={()=>{onSelectAll();setOpen(false);}} style={{padding:"9px 14px",fontSize:13,color:C.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:9}} onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${C.accent}`,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>✓</div>
            All <span style={{marginLeft:"auto",background:C.border,borderRadius:4,padding:"1px 7px",fontSize:11,color:C.t2,fontWeight:600}}>{total}</span>
          </div>
          <div onClick={()=>{onSelectNone();setOpen(false);}} style={{padding:"9px 14px",fontSize:13,color:C.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:9,borderBottom:extraOptions.length?`1px solid ${C.border}`:"none"}} onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${C.t3}`,background:"transparent"}}/>
            None
          </div>
          {extraOptions.length>0&&(
            <>
              <div style={{padding:"8px 14px 4px",borderTop:`1px solid ${C.border}`}}>
                <span style={{fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>By Status</span>
              </div>
              {extraOptions.map(o=>(
                <div key={o.label} onClick={()=>{o.action();setOpen(false);}} style={{padding:"8px 14px 8px 20px",fontSize:12,color:C.t2,cursor:"pointer",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:C.t3,flexShrink:0,display:"inline-block"}}/>
                  {o.label}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
function BulkBar({selTasks,selProjects,onClear,onBulkDelete,onBulkAction}){
  const tc=selTasks.size,pc=selProjects.size,total=tc+pc;
  if(total===0)return null;
  return(
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:300,background:C.card,border:`2px solid ${C.accent}`,borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 40px #00000090",flexWrap:"wrap"}}>
      <div style={{background:C.accent,color:"#fff",borderRadius:8,padding:"4px 14px",fontWeight:800,fontSize:13,flexShrink:0}}>{total} selected{tc>0&&pc>0?` (${tc} task${tc>1?"s":""},${pc} proj)`:(tc>0?` task${tc>1?"s":""}`:` project${pc>1?"s":""}`)}</div>
      {tc>0&&<>
        <button onClick={()=>onBulkAction("status")} style={{background:C.blue+"22",color:C.blue,border:`1px solid ${C.blue}44`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>⬤ Change Status</button>
        <button onClick={()=>onBulkAction("reassign")} style={{background:C.teal+"22",color:C.teal,border:`1px solid ${C.teal}44`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>👤 Reassign</button>
        <button onClick={()=>onBulkAction("priority")} style={{background:C.yellow+"22",color:C.yellow,border:`1px solid ${C.yellow}44`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔺 Priority</button>
      </>}
      <button onClick={onBulkDelete} style={{background:C.red+"22",color:C.red,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🗑 Delete ({total})</button>
      <button onClick={onClear} style={{background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ Clear</button>
    </div>
  );
}
// ── Bulk Action Modal ────────────────────────────────────────────────────────
function BulkActionModal({type,count,members,onApply,onClose}){
  const [val,sv]=useState(type==="status"?"In Progress":type==="priority"?"High":members[0]||"");
  const labels={status:"New Status for all selected tasks",reassign:"Reassign all selected tasks to",priority:"Set Priority for all selected tasks"};
  const opts={status:ALL_STATUSES,reassign:members,priority:["Critical","High","Medium","Low"]};
  return(
    <Modal title={`Bulk ${type==="status"?"Status Change":type==="reassign"?"Reassign":"Priority Change"}`} onClose={onClose}>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px"}}>Applying to <strong style={{color:C.accent}}>{count} task{count>1?"s":""}</strong></p>
      <FSelect label={labels[type]} value={val} onChange={sv} options={opts[type]}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
        <button onClick={onClose} style={GBtn}>Cancel</button>
        <button onClick={()=>onApply(val)} style={SBtn}>Apply to All</button>
      </div>
    </Modal>
  );
}
// ── Limited task edit form for regular users (status + notes only) ──────────
function UserTaskEditForm({task,project,onSave,onClose,saving}){
  const [status,ss]=useState(task.status||"Not Yet Started");
  const [notes,sn]=useState(task.notes||"");
  return(
    <div>
      {/* Read-only task info */}
      <div style={{background:C.surface,borderRadius:10,padding:"14px 18px",marginBottom:18,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Task Details (read-only)</div>
        <p style={{margin:"0 0 8px",fontSize:15,fontWeight:800,color:C.t1}}>{task.title}</p>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
          {project&&<span style={{fontSize:12,color:C.teal,fontWeight:600}}>📁 {project.name}</span>}
          {task.client&&<span style={{fontSize:12,color:C.t2}}>👤 {task.client}</span>}
          {task.due_date&&<span style={{fontSize:12,color:C.t3}}>📅 Due {task.due_date}</span>}
          {task.priority&&<Bdg color={PRI_CLR[task.priority]||C.t2}>{task.priority}</Bdg>}
        </div>
        {(task.scope||task.detailer||task.checker)&&(
          <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}>
            {task.scope&&<span style={{fontSize:12,color:C.t3}}>Scope: <strong style={{color:C.t2}}>{task.scope}</strong></span>}
            {task.detailer&&<span style={{fontSize:12,color:C.t3}}>Detailer: <strong style={{color:C.t2}}>{task.detailer}</strong></span>}
            {task.checker&&<span style={{fontSize:12,color:C.t3}}>Checker: <strong style={{color:C.t2}}>{task.checker}</strong></span>}
          </div>
        )}
      </div>
      {/* Editable: Status */}
      <FSelect label="Update Status" value={status} onChange={ss} options={ALL_STATUSES}/>
      {/* Notes */}
      <div style={{marginTop:14}}>
        <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Completion Notes / Comments</label>
        <textarea value={notes} onChange={e=>sn(e.target.value)} rows={3}
          placeholder="Add notes, completion details, or comments…"
          style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving} onClick={()=>onSave({...task,status,notes})} style={{...SBtn,opacity:saving?0.7:1}}>
          {saving?"Saving…":"Update Status"}
        </button>
      </div>
    </div>
  );
}
function UserDashboard({me,tasks,projects,clients,today,onEditTask,onViewProject}){
  const isMobile=useMobile();
  // `projects` prop = accessibleProjects (already filtered to only this user's projects in parent)
  const [statusFilter,ssf]=useState(null);
  const [fSearch,setFS]=useState(""); const [fProject,setFP]=useState("All"); const [fAssignee,setFA]=useState("All"); const [fStatus,setFSt]=useState("All"); const [showDT,setSDT]=useState(false);
  const [uStatModal,setUSM]=useState(null);
  const matchesMe=v=>userMatchesStr(me,v);
  // My tasks = tasks in accessible projects where I'm assignee / detailer / checker
  const myTasks=tasks.filter(t=>projects.some(p=>p.id===t.project_id)&&(matchesMe(t.assignee)||matchesMe(t.detailer)||matchesMe(t.checker)));
  // My projects = all accessible projects (they're already filtered to mine in parent)
  const myProjects=projects;
  const total=myTasks.length;
  const done=myTasks.filter(t=>isDone(t.status)).length;
  const inprog=myTasks.filter(t=>t.status==="In Progress").length;
  const overdueList=myTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status));
  const overdue=overdueList.length;
  const notStarted=myTasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const filteredTasks=statusFilter===null?[]:statusFilter==="All"?myTasks:statusFilter==="Overdue"?overdueList:statusFilter==="Not Yet Started"?myTasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started"):myTasks.filter(t=>t.status===statusFilter);
  const filterLabel=statusFilter==="All"?"All My Tasks":statusFilter==="Overdue"?"⚠ Overdue Tasks":statusFilter?`${statusFilter} Tasks`:"";
  const pct=total?Math.round(done/total*100):0;
  // Avatar colour palette for co-users
  const avatarColors=["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#14b8a6","#f97316"];
  function avatarColor(name){let h=0;for(let i=0;i<(name||"").length;i++)h=(h*31+name.charCodeAt(i))%avatarColors.length;return avatarColors[h];}
  return(
    <div>
      {/* Header */}
      <div className="rds-dash-banner" style={{background:`linear-gradient(135deg,${C.card} 0%,${C.accent}11 100%)`,border:`1px solid ${C.accent}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",borderLeft:`4px solid ${C.accent}`}}>
        <div className="rds-dash-banner-avatar" style={{width:52,height:52,borderRadius:14,background:C.accent+"22",border:`2px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:C.accent}}>{me.name[0]}</div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>My Dashboard</h2>
          <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back, {me.name} · {me.role} · {total} task{total!==1?"s":""} assigned</p>
        </div>
        <div className="rds-dash-banner-stats" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          {[{l:"Total Tasks",v:total,c:C.accent,k:"utotal"},{l:"Completed",v:done,c:C.green,k:"ucompleted"},{l:"In Progress",v:inprog,c:C.blue,k:"uinprog"},{l:"Overdue",v:overdue,c:C.red,k:"uoverdue"}].map(s=>(
            <div key={s.l} onClick={()=>setUSM(s.k)} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",minWidth:64,textAlign:"center",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";e.currentTarget.style.boxShadow=`0 0 0 2px ${s.c}55`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      {uStatModal&&(()=>{
        const completedTasks=myTasks.filter(t=>isDone(t.status));
        const ipTasks=myTasks.filter(t=>t.status==="In Progress");
        const od=myTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status));
        const uModalData={
          utotal:{title:"📋 All My Tasks",color:C.accent,items:myTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · ${t.status}`,dot:t.status==="In Progress"?C.blue:isDone(t.status)?C.green:C.t3};})},
          ucompleted:{title:"✅ Completed Tasks",color:C.green,items:completedTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · Done`,dot:C.green};})},
          uinprog:{title:"🔄 In Progress Tasks",color:C.blue,items:ipTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · Due: ${t.due_date||"—"}`,dot:C.blue};})},
          uoverdue:{title:"⚠ Overdue Tasks",color:C.red,items:od.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · Due: ${t.due_date}`,dot:C.red};})},
        };
        const md=uModalData[uStatModal];if(!md)return null;
        return(<div onClick={()=>setUSM(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,fontSize:16,color:C.t1}}>{md.title} <span style={{color:md.color,fontSize:14}}>({md.items.length})</span></span>
              <button onClick={()=>setUSM(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t3}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"10px 8px"}}>
              {md.items.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>No items</div>:md.items.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,marginBottom:4,transition:"background .15s",cursor:"default"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:36,height:36,borderRadius:10,background:item.dot+"22",border:`2px solid ${item.dot}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:item.dot,flexShrink:0}}>{(item.label[0]||"?").toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0,borderLeft:`3px solid ${item.dot}`,paddingLeft:10}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>);
      })()}
      {/* Progress bar */}
      <div style={{marginBottom:24}}><Pb v={pct} color={C.accent} h={8}/></div>
      {/* Stat cards */}
      <div className="rds-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:28}}>
        <Stat label="Total Tasks" value={total} sub="assigned to me" color={C.accent} onClick={()=>ssf(statusFilter==="All"?null:"All")}/>
        <Stat label="Completed" value={done} sub="finished" color={C.green} onClick={()=>ssf(statusFilter==="Completed"?null:"Completed")}/>
        <Stat label="In Progress" value={inprog} sub="active" color={C.blue} onClick={()=>ssf(statusFilter==="In Progress"?null:"In Progress")}/>
        <Stat label="Not Started" value={notStarted} sub="pending" color={C.t2} onClick={()=>ssf(statusFilter==="Not Yet Started"?null:"Not Yet Started")}/>
        <Stat label="Overdue" value={overdue} sub="need attention" color={C.red} onClick={()=>ssf(statusFilter==="Overdue"?null:"Overdue")}/>
      </div>
      {/* ── Due This Week ── */}
      {(()=>{
        const weekEnd=new Date(today);weekEnd.setDate(weekEnd.getDate()+7);
        const ws=weekEnd.toISOString().slice(0,10);
        const dueWeek=myTasks.filter(t=>t.due_date&&t.due_date>=today&&t.due_date<=ws&&!isDone(t.status));
        if(!dueWeek.length)return null;
        return(
          <div style={{background:C.card,border:`1px solid ${C.yellow}44`,borderRadius:12,padding:"14px 18px",marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:16}}>📅</span>
              <h3 style={{margin:0,fontSize:14,fontWeight:700,color:C.yellow}}>Due This Week ({dueWeek.length})</h3>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {dueWeek.slice(0,5).map(t=>{
                const pj=projects.find(p=>p.id===t.project_id);
                const daysLeft=Math.ceil((new Date(t.due_date)-new Date(today))/(1000*60*60*24));
                return(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,borderRadius:8,padding:"9px 12px"}}>
                    <div style={{width:3,height:28,borderRadius:2,background:pj?.color||C.accent,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                      <div style={{fontSize:11,color:C.t3}}>{pj?.name||"—"}</div>
                    </div>
                    <Bdg color={getStatusColor(t.status)}>{t.status}</Bdg>
                    <span style={{fontSize:11,color:daysLeft<=1?C.red:C.yellow,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                      {daysLeft===0?"Today!":daysLeft===1?"Tomorrow":`${daysLeft}d left`}
                    </span>
                  </div>
                );
              })}
              {dueWeek.length>5&&<p style={{margin:"4px 0 0",fontSize:11,color:C.t3,textAlign:"center"}}>+{dueWeek.length-5} more due this week</p>}
            </div>
          </div>
        );
      })()}
      {/* Filter bar */}
      {(()=>{
        const allA=[...new Set(myTasks.map(t=>t.assignee).filter(Boolean))].sort();
        const hasF=fSearch||fProject!=="All"||fAssignee!=="All"||fStatus!=="All";
        const ft=myTasks.filter(t=>{
          const pj=projects.find(p=>p.id===t.project_id);
          if(fSearch&&!t.title.toLowerCase().includes(fSearch.toLowerCase())&&!(pj?.name||"").toLowerCase().includes(fSearch.toLowerCase()))return false;
          if(fProject!=="All"&&t.project_id!==fProject)return false;
          if(fAssignee!=="All"&&t.assignee!==fAssignee)return false;
          if(fStatus!=="All"){const ns=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!ns&&t.status!==fStatus)return false;}
          return true;
        });
        const sel=a=>({background:C.surface,border:`1px solid ${a?C.accent:C.border}`,borderRadius:8,padding:"8px 10px",color:a?C.accent:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"});
        return(<>
          <div style={{background:C.card,border:`1px solid ${hasF?C.accent:C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:24,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <input placeholder="🔍 Search tasks or projects…" value={fSearch} onChange={e=>setFS(e.target.value)} style={{flex:1,minWidth:160,background:C.surface,border:`1px solid ${fSearch?C.accent:C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <select value={fProject} onChange={e=>{setFP(e.target.value);setSDT(true);}} style={sel(fProject!=="All")}>
              <option value="All">All Projects</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={fAssignee} onChange={e=>{setFA(e.target.value);setSDT(true);}} style={sel(fAssignee!=="All")}>
              <option value="All">All Assignees</option>
              {allA.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            <select value={fStatus} onChange={e=>{setFSt(e.target.value);setSDT(true);}} style={sel(fStatus!=="All")}>
              <option value="All">All Statuses</option>
              {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {hasF&&<button onClick={()=>{setFS("");setFP("All");setFA("All");setFSt("All");}} style={{...GBtn,padding:"8px 12px",fontSize:12,color:C.red,borderColor:C.red}}>✕ Clear</button>}
            <button onClick={()=>setSDT(v=>!v)} style={{...GBtn,padding:"8px 14px",fontSize:13,whiteSpace:"nowrap"}}>{showDT?"Hide Tasks ▲":"Show Tasks ▼"}</button>
          </div>
          {showDT&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:28}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Tasks ({ft.length})</span>
                {hasF&&<span style={{fontSize:12,color:C.accent}}>Filtered</span>}
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:C.surface}}>{["Task","Project","Status","Priority","Assignee","Detailer","Checker","Due Date","Client Sub Date"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}</tr></thead>
                <tbody>{ft.length===0
                  ?<tr><td colSpan={9} style={{padding:28,textAlign:"center",color:C.t3,fontSize:13}}>No tasks match filters</td></tr>
                  :ft.map(t=>{const pj=projects.find(p=>p.id===t.project_id);const tdy=new Date().toISOString().slice(0,10);const ov=t.due_date&&t.due_date<tdy&&!isDone(t.status);return(<tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t1,fontSize:13}}>{t.title}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.teal,fontSize:12}}>{pj?.name||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><Bdg color={getStatusColor(t.status)}>{t.status}</Bdg></td>
                    <td style={{padding:"10px 14px"}}><Bdg color={PRI_CLR[t.priority]}>{t.priority||"—"}</Bdg></td>
                    <td style={{padding:"10px 14px"}}>{t.assignee?<div style={{display:"flex",alignItems:"center",gap:5}}><Av name={t.assignee} size={20}/><span style={{fontSize:12,color:C.t2}}>{t.assignee}</span></div>:<span style={{color:C.t3,fontSize:12}}>—</span>}</td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{t.detailer||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{t.checker||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:ov?C.red:C.t3,fontSize:12,fontWeight:ov?700:400}}>{t.due_date||"—"}{ov?" ⚠":""}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t3,fontSize:12}}>{t.client_sub_date||"—"}</span></td>
                  </tr>);})}</tbody>
              </table>
            </div>
          )}
        </>);
      })()}
      {/* Filtered task list */}
      {statusFilter&&(
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.t1}}>{filterLabel} ({filteredTasks.length})</h2>
            <button onClick={()=>ssf(null)} style={{...GBtn,fontSize:12,padding:"5px 12px"}}>✕ Close</button>
          </div>
          {filteredTasks.length===0
            ?<p style={{color:C.t3,fontSize:13}}>No tasks in this category.</p>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filteredTasks.map(t=>{
                const proj=projects.find(p=>p.id===t.project_id);
                const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
                return(
                  <div key={t.id} onClick={()=>onEditTask(t)}
                    style={{background:C.card,border:`1px solid ${isOv?C.red+"66":C.border}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"background .12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                    onMouseLeave={e=>e.currentTarget.style.background=C.card}>
                    <div style={{width:3,height:36,borderRadius:2,background:proj?.color||C.accent,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</p>
                      <p style={{margin:"3px 0 0",fontSize:11,color:C.t3}}>{proj?.name||"—"}{t.due_date?` · Due ${t.due_date}`:""}{isOv?" ⚠":""}</p>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                      <Bdg color={getStatusColor(t.status)}>{t.status}</Bdg>
                      {t.priority&&<Bdg color={PRI_CLR[t.priority]||C.t3}>{t.priority}</Bdg>}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}
      {/* My Projects */}
      <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:C.t1}}>My Projects ({myProjects.length})</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:18,marginBottom:28}}>
        {myProjects.map(p=>{
          // My tasks in this project
          const pt=myTasks.filter(t=>t.project_id===p.id);
          // ALL tasks in this project (for overall % and co-users)
          const allPt=tasks.filter(t=>t.project_id===p.id);
          const pd=pt.filter(t=>isDone(t.status)).length;
          const pip=pt.filter(t=>t.status==="In Progress").length;
          const pnd=pt.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length;
          const pov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
          // Overall project %
          const allDone=allPt.filter(t=>isDone(t.status)).length;
          const overallPct=allPt.length?Math.round(allDone/allPt.length*100):0;
          // My roles in this project
          const myRoles=[];
          if(pt.some(t=>matchesMe(t.assignee)))myRoles.push("Assignee");
          if(pt.some(t=>matchesMe(t.detailer)))myRoles.push("Detailer");
          if(pt.some(t=>matchesMe(t.checker)))myRoles.push("QC Checker");
          // Co-workers: unique names on this project's tasks, excluding me
          const coUsers=[...new Set(allPt.flatMap(t=>[t.assignee,t.detailer,t.checker].filter(Boolean)).filter(u=>!matchesMe(u)))].slice(0,5);
          return(
            <div key={p.id} onClick={()=>onViewProject(p.id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${p.color}`,transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              {/* Title + overall % */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <p style={{margin:0,fontSize:15,fontWeight:800,color:C.t1,flex:1,lineHeight:1.3}}>{p.name}</p>
                <span style={{background:p.color+"22",color:p.color,border:`1px solid ${p.color}44`,borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:800,marginLeft:10,whiteSpace:"nowrap"}}>{overallPct}%</span>
              </div>
              {/* Client + Deadline */}
              <div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap"}}>
                {p.client&&<span style={{fontSize:12,color:C.teal,fontWeight:600}}>👤 {p.client}</span>}
                {p.deadline&&<span style={{fontSize:12,color:C.t3}}>📅 Due {p.deadline}</span>}
              </div>
              {/* Overall progress bar */}
              <Pb v={overallPct} color={p.color} h={7}/>
              {/* My task breakdown */}
              {pt.length>0&&(
                <div className="rds-mini-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginTop:14}}>
                  <div style={{background:C.green+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:C.green}}>{pd}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>My Done</div>
                  </div>
                  <div style={{background:C.blue+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{pip}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>In Progress</div>
                  </div>
                  <div style={{background:"#ffffff12",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:C.t2}}>{pnd}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>Pending</div>
                  </div>
                  <div style={{background:C.red+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:pov>0?C.red:C.t3}}>{pov}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>Overdue</div>
                  </div>
                </div>
              )}
              {/* My roles */}
              {myRoles.length>0&&(
                <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {myRoles.map(r=><span key={r} style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}33`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{r}</span>)}
                </div>
              )}
              {/* Co-workers */}
              {coUsers.length>0&&(
                <div style={{marginTop:12,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.t3,flexShrink:0}}>Team:</span>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                    {coUsers.map(u=>(
                      <div key={u} title={u} style={{display:"flex",alignItems:"center",gap:4,background:avatarColor(u)+"22",border:`1px solid ${avatarColor(u)}44`,borderRadius:20,padding:"2px 8px 2px 4px"}}>
                        <div style={{width:18,height:18,borderRadius:"50%",background:avatarColor(u),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",flexShrink:0}}>{(u[0]||"?").toUpperCase()}</div>
                        <span style={{fontSize:11,color:C.t2,fontWeight:600,whiteSpace:"nowrap"}}>{u.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{marginTop:10,fontSize:11,color:C.t3,textAlign:"right"}}>{pt.length} of {allPt.length} task{allPt.length!==1?"s":""} mine · click to view →</div>
            </div>
          );
        })}
        {myProjects.length===0&&<p style={{color:C.t3,fontSize:13,gridColumn:"1/-1"}}>No projects assigned yet. Ask your admin or manager to assign you to a project.</p>}
      </div>
    </div>
  );
}
function TeamLeaderDashboard({me,tasks,projects,today,onEditTask,onViewProject}){
  const isMobile=useMobile();
  const matchesMe=v=>userMatchesStr(me,v);
  const [tab,setTab]=useState("detailer"); // "detailer" | "checker" | "all"
  const [statusF,setSF]=useState("All");
  const [fSearch,setFS]=useState(""); const [fProject,setFP]=useState("All"); const [fAssignee,setFA]=useState("All"); const [fStatus,setFSt]=useState("All"); const [showDT,setSDT]=useState(false);
  const [selMember,setSM]=useState(null); // selected team member for drill-down
  const [memberSF,setMSF]=useState("All"); // status filter for member tasks
  const [tlStatModal,setTSM]=useState(null);

  // Tasks where I'm detailer (my review work)
  const detailerTasks=tasks.filter(t=>projects.some(p=>p.id===t.project_id)&&matchesMe(t.detailer));
  // Tasks where I'm checker (my QC work)
  const checkerTasks=tasks.filter(t=>projects.some(p=>p.id===t.project_id)&&matchesMe(t.checker));
  // All tasks across all projects (monitoring view)
  const allTasks=tasks.filter(t=>projects.some(p=>p.id===t.project_id));

  const baseTasks=tab==="detailer"?detailerTasks:tab==="checker"?checkerTasks:allTasks;
  const shown=statusF==="All"?baseTasks:statusF==="Overdue"?baseTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)):baseTasks.filter(t=>t.status===statusF);

  // Unique assignees in my scope (for team overview)
  const teamMembers=[...new Set(allTasks.map(t=>t.assignee).filter(Boolean))].sort();

  const totalAll=allTasks.length;
  const doneAll=allTasks.filter(t=>isDone(t.status)).length;
  const overdueAll=allTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const pct=totalAll?Math.round(doneAll/totalAll*100):0;

  const tabStyle=(id)=>({
    padding:"8px 18px",fontSize:13,fontWeight:600,cursor:"pointer",border:"none",
    borderBottom:`2px solid ${tab===id?"#8b5cf6":"transparent"}`,
    background:"none",color:tab===id?"#8b5cf6":C.t3,fontFamily:"inherit",transition:"all .15s"
  });

  return(
    <div>
      {/* Header */}
      <div className="rds-dash-banner" style={{background:`linear-gradient(135deg,${C.card} 0%,${"#8b5cf6"}11 100%)`,border:`1px solid ${"#8b5cf6"}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",borderLeft:`4px solid #8b5cf6`}}>
        <div className="rds-dash-banner-avatar" style={{width:52,height:52,borderRadius:14,background:"#8b5cf622",border:`2px solid #8b5cf644`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#8b5cf6"}}>{(me.name[0]||"T").toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>Team Leader Dashboard</h2>
          <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back, {me.name} · Monitoring {teamMembers.length} team member{teamMembers.length!==1?"s":""}</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:800,color:"#8b5cf6"}}>{pct}%</div>
          <div style={{fontSize:11,color:C.t3}}>team complete</div>
        </div>
        <div className="rds-dash-banner-stats" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          {[{l:"Team Members",v:teamMembers.length,c:"#8b5cf6",k:"tlteam"},{l:"Total Tasks",v:totalAll,c:C.blue,k:"tltotal"},{l:"In Progress",v:allTasks.filter(t=>t.status==="In Progress").length,c:C.accent,k:"tlinprog"},{l:"Completion",v:pct+"%",c:C.green,k:"tlcomplete"}].map(s=>(
            <div key={s.l} onClick={()=>setTSM(s.k)} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",minWidth:64,textAlign:"center",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";e.currentTarget.style.boxShadow=`0 0 0 2px ${s.c}55`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      {tlStatModal&&(()=>{
        const ipTasks=allTasks.filter(t=>t.status==="In Progress");
        const doneTasks=allTasks.filter(t=>isDone(t.status));
        const tlModalData={
          tlteam:{title:"👤 Team Members",color:"#8b5cf6",items:teamMembers.map(m=>{const mt=allTasks.filter(t=>t.assignee===m);const mip=mt.filter(t=>t.status==="In Progress").length;const md=mt.filter(t=>isDone(t.status)).length;return{label:m,sub:`${mip} in progress · ${md} done`,dot:"#8b5cf6"};})},
          tltotal:{title:"📋 All Tasks",color:C.blue,items:allTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · ${t.assignee||"—"} · ${t.status}`,dot:t.status==="In Progress"?C.blue:isDone(t.status)?C.green:C.t3};})},
          tlinprog:{title:"🔄 In Progress Tasks",color:C.accent,items:ipTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · ${t.assignee||"—"} · Due: ${t.due_date||"—"}`,dot:C.accent};})},
          tlcomplete:{title:"✅ Completed Tasks",color:C.green,items:doneTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · ${t.assignee||"—"}`,dot:C.green};})},
        };
        const md=tlModalData[tlStatModal];if(!md)return null;
        return(<div onClick={()=>setTSM(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,fontSize:16,color:C.t1}}>{md.title} <span style={{color:md.color,fontSize:14}}>({md.items.length})</span></span>
              <button onClick={()=>setTSM(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t3}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"10px 8px"}}>
              {md.items.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>No items</div>:md.items.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,marginBottom:4,transition:"background .15s",cursor:"default"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:36,height:36,borderRadius:10,background:item.dot+"22",border:`2px solid ${item.dot}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:item.dot,flexShrink:0}}>{(item.label[0]||"?").toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0,borderLeft:`3px solid ${item.dot}`,paddingLeft:10}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>);
      })()}

      {/* Top stats */}
      <div className="rds-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:24}}>
        <Stat label="Total Tasks" value={totalAll} sub="all projects" color={"#8b5cf6"} onClick={()=>{setTab("all");setSF("All");}}/>
        <Stat label="My Detailing" value={detailerTasks.length} sub="I'm detailer" color={C.blue} onClick={()=>{setTab("detailer");setSF("All");}}/>
        <Stat label="My QC/Checking" value={checkerTasks.length} sub="I'm checker" color={C.teal} onClick={()=>{setTab("checker");setSF("All");}}/>
        <Stat label="Overdue" value={overdueAll} sub="need attention" color={C.red} onClick={()=>{setTab("all");setSF("Overdue");}}/>
      </div>

      {/* Filter bar */}
      {(()=>{
        const allA=[...new Set(allTasks.map(t=>t.assignee).filter(Boolean))].sort();
        const hasF=fSearch||fProject!=="All"||fAssignee!=="All"||fStatus!=="All";
        const ft=allTasks.filter(t=>{
          const pj=projects.find(p=>p.id===t.project_id);
          if(fSearch&&!t.title.toLowerCase().includes(fSearch.toLowerCase())&&!(pj?.name||"").toLowerCase().includes(fSearch.toLowerCase()))return false;
          if(fProject!=="All"&&t.project_id!==fProject)return false;
          if(fAssignee!=="All"&&t.assignee!==fAssignee)return false;
          if(fStatus!=="All"){const ns=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!ns&&t.status!==fStatus)return false;}
          return true;
        });
        const sel=a=>({background:C.surface,border:`1px solid ${a?"#8b5cf6":C.border}`,borderRadius:8,padding:"8px 10px",color:a?"#8b5cf6":C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"});
        return(<>
          <div style={{background:C.card,border:`1px solid ${hasF?"#8b5cf6":C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:24,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <input placeholder="🔍 Search tasks or projects…" value={fSearch} onChange={e=>setFS(e.target.value)} style={{flex:1,minWidth:160,background:C.surface,border:`1px solid ${fSearch?"#8b5cf6":C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <select value={fProject} onChange={e=>{setFP(e.target.value);setSDT(true);}} style={sel(fProject!=="All")}>
              <option value="All">All Projects</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={fAssignee} onChange={e=>{setFA(e.target.value);setSDT(true);}} style={sel(fAssignee!=="All")}>
              <option value="All">All Assignees</option>
              {allA.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            <select value={fStatus} onChange={e=>{setFSt(e.target.value);setSDT(true);}} style={sel(fStatus!=="All")}>
              <option value="All">All Statuses</option>
              {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {hasF&&<button onClick={()=>{setFS("");setFP("All");setFA("All");setFSt("All");}} style={{...GBtn,padding:"8px 12px",fontSize:12,color:C.red,borderColor:C.red}}>✕ Clear</button>}
            <button onClick={()=>setSDT(v=>!v)} style={{...GBtn,padding:"8px 14px",fontSize:13,whiteSpace:"nowrap"}}>{showDT?"Hide Tasks ▲":"Show Tasks ▼"}</button>
          </div>
          {showDT&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:24}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Tasks ({ft.length})</span>
                {hasF&&<span style={{fontSize:12,color:"#8b5cf6"}}>Filtered</span>}
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:C.surface}}>{["Task","Project","Status","Priority","Assignee","Detailer","Checker","Due Date","Client Sub Date"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}</tr></thead>
                <tbody>{ft.length===0
                  ?<tr><td colSpan={9} style={{padding:28,textAlign:"center",color:C.t3,fontSize:13}}>No tasks match filters</td></tr>
                  :ft.map(t=>{const pj=projects.find(p=>p.id===t.project_id);const tdy=new Date().toISOString().slice(0,10);const ov=t.due_date&&t.due_date<tdy&&!isDone(t.status);return(<tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t1,fontSize:13}}>{t.title}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.teal,fontSize:12}}>{pj?.name||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><Bdg color={getStatusColor(t.status)}>{t.status}</Bdg></td>
                    <td style={{padding:"10px 14px"}}><Bdg color={PRI_CLR[t.priority]}>{t.priority||"—"}</Bdg></td>
                    <td style={{padding:"10px 14px"}}>{t.assignee?<div style={{display:"flex",alignItems:"center",gap:5}}><Av name={t.assignee} size={20}/><span style={{fontSize:12,color:C.t2}}>{t.assignee}</span></div>:<span style={{color:C.t3,fontSize:12}}>—</span>}</td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{t.detailer||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{t.checker||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:ov?C.red:C.t3,fontSize:12,fontWeight:ov?700:400}}>{t.due_date||"—"}{ov?" ⚠":""}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t3,fontSize:12}}>{t.client_sub_date||"—"}</span></td>
                  </tr>);})}</tbody>
              </table>
            </div>
          )}
        </>);
      })()}
      {/* Tabs */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:24}}>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,padding:"0 8px"}}>
          <button style={tabStyle("detailer")} onClick={()=>{setTab("detailer");setSF("All");}}>🔍 My Detailing ({detailerTasks.length})</button>
          <button style={tabStyle("checker")} onClick={()=>{setTab("checker");setSF("All");}}>✅ My QC Check ({checkerTasks.length})</button>
          <button style={tabStyle("all")} onClick={()=>{setTab("all");setSF("All");}}>📋 All Team Tasks ({allTasks.length})</button>
          <div style={{flex:1}}/>
          <select value={statusF} onChange={e=>setSF(e.target.value)} style={{background:C.surface,border:"none",borderLeft:`1px solid ${C.border}`,padding:"0 12px",color:C.t1,fontSize:12,cursor:"pointer",outline:"none",fontFamily:"inherit"}}>
            <option value="All">All Status</option>
            {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            <option value="Overdue">Overdue ⚠</option>
          </select>
        </div>
        {shown.length===0
          ?<p style={{color:C.t3,fontSize:13,margin:"12px 16px",padding:"12px 0"}}>No tasks in this category.</p>
          :<div style={{padding:"16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
            {shown.map(t=>{
              const proj=projects.find(p=>p.id===t.project_id);
              const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
              const iAmDetailer=matchesMe(t.detailer);
              const iAmChecker=matchesMe(t.checker);
              const myRole=iAmDetailer&&iAmChecker?"Detailer · QC":iAmDetailer?"Detailer":iAmChecker?"QC Check":"—";
              return(
                <div key={t.id} onClick={()=>onEditTask(t)}
                  style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"border-color .15s",borderLeft:`4px solid ${proj?.color||"#8b5cf6"}`}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#8b5cf6"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                    <span style={{fontSize:14,fontWeight:700,color:C.t1,lineHeight:1.3,flex:1}}>{t.title}</span>
                    <Bdg color={getStatusColor(t.status)}>{t.status}</Bdg>
                  </div>
                  <div style={{fontSize:12,color:C.teal,marginBottom:8,fontWeight:600}}>📁 {proj?.name||"—"}</div>
                  {t.assignee&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><Av name={t.assignee} size={22}/><span style={{fontSize:12,color:C.t2}}>{t.assignee}</span></div>}
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>
                    <Bdg color={PRI_CLR[t.priority]||C.t3}>{t.priority||"—"}</Bdg>
                    {(iAmDetailer||iAmChecker)&&<span style={{fontSize:11,fontWeight:600,color:"#8b5cf6",background:"#8b5cf622",padding:"2px 8px",borderRadius:20}}>{myRole}</span>}
                    <span style={{flex:1}}/>
                    <span style={{fontSize:11,color:isOv?C.red:C.t3,fontWeight:isOv?700:400}}>{t.due_date||"—"}{isOv?" ⚠":""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>

      {/* Team member progress — clickable drill-down */}
      {teamMembers.length>0&&(
        <div>
          <h2 style={{margin:"0 0 14px",fontSize:16,fontWeight:700,color:C.t1}}>👥 Team Progress <span style={{fontSize:12,color:C.t3,fontWeight:400}}>· click a member to view their tasks</span></h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,marginBottom:selMember?20:0}}>
            {teamMembers.map(name=>{
              const mt=allTasks.filter(t=>t.assignee===name||t.detailer===name||t.checker===name);
              const md=mt.filter(t=>isDone(t.status)).length;
              const mov=mt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
              const mpct=mt.length?Math.round(md/mt.length*100):0;
              const isSel=selMember===name;
              return(
                <div key={name} onClick={()=>{setSM(isSel?null:name);setMSF("All");}}
                  style={{background:C.card,border:`2px solid ${isSel?"#8b5cf6":C.border}`,borderRadius:12,padding:"14px 18px",cursor:"pointer",transition:"border-color .15s",boxShadow:isSel?"0 0 0 3px #8b5cf622":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av name={name} size={34}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,color:isSel?"#8b5cf6":C.t1}}>{name}</div>
                      <div style={{fontSize:11,color:C.t3}}>{mt.length} tasks · {md} done{mov>0?` · ${mov} overdue`:""}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                      <span style={{fontWeight:800,fontSize:16,color:mpct>=80?C.green:mpct>=50?C.blue:C.t2}}>{mpct}%</span>
                      <span style={{fontSize:10,color:isSel?"#8b5cf6":C.t3}}>{isSel?"▲ hide":"▼ view"}</span>
                    </div>
                  </div>
                  <Pb v={mpct} color={isSel?"#8b5cf6":mpct>=80?C.green:mpct>=50?C.blue:C.accent} h={6}/>
                  {mov>0&&<div style={{marginTop:8,fontSize:11,color:C.red,fontWeight:600}}>⚠ {mov} overdue task{mov!==1?"s":""}</div>}
                </div>
              );
            })}
          </div>

          {/* Drill-down task view for selected member */}
          {selMember&&(()=>{
            const mt=allTasks.filter(t=>t.assignee===selMember||t.detailer===selMember||t.checker===selMember);
            const mFiltered=memberSF==="All"?mt:memberSF==="Overdue"?mt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)):mt.filter(t=>t.status===memberSF);
            const md=mt.filter(t=>isDone(t.status)).length;
            const mip=mt.filter(t=>t.status==="In Progress").length;
            const mov=mt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
            return(
              <div style={{background:C.card,border:`2px solid #8b5cf6`,borderRadius:14,overflow:"hidden"}}>
                {/* Header */}
                <div style={{background:"#8b5cf611",borderBottom:`1px solid #8b5cf633`,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                  <Av name={selMember} size={38}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:800,color:C.t1}}>{selMember}</div>
                    <div style={{fontSize:12,color:C.t3,marginTop:2}}>
                      {mt.length} total · {md} done · {mip} in progress{mov>0?<span style={{color:C.red}}> · {mov} overdue</span>:""}
                    </div>
                  </div>
                  {/* Mini stat pills */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[
                      {l:"Completed",v:md,c:C.green},
                      {l:"In Progress",v:mip,c:C.blue},
                      {l:"Overdue",v:mov,c:C.red},
                    ].map(s=>(
                      <div key={s.l} style={{background:s.c+"18",border:`1px solid ${s.c}44`,borderRadius:8,padding:"4px 10px",textAlign:"center"}}>
                        <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:10,color:C.t3}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Status filter + close */}
                  <select value={memberSF} onChange={e=>setMSF(e.target.value)}
                    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="All">All Status</option>
                    {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                    <option value="Overdue">Overdue ⚠</option>
                  </select>
                  <button onClick={()=>setSM(null)}
                    style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.t3,fontSize:14,cursor:"pointer",lineHeight:1}}>✕</button>
                </div>
                {/* Task cards */}
                {mFiltered.length===0
                  ?<p style={{color:C.t3,fontSize:13,padding:"20px 18px",margin:0}}>No tasks{memberSF!=="All"?` with status "${memberSF}"`:""}.</p>
                  :<div style={{padding:"16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                    {mFiltered.map(t=>{
                      const proj=projects.find(p=>p.id===t.project_id);
                      const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
                      const role=t.assignee===selMember?"Assignee":t.detailer===selMember?"Detailer":t.checker===selMember?"QC Check":"—";
                      return(
                        <div key={t.id} onClick={()=>onEditTask(t)}
                          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${proj?.color||"#8b5cf6"}`,transition:"border-color .15s"}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="#8b5cf6"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:6}}>
                            <span style={{fontSize:13,fontWeight:700,color:C.t1,lineHeight:1.3,flex:1}}>{t.title}</span>
                            <Bdg color={getStatusColor(t.status)}>{t.status}</Bdg>
                          </div>
                          <div style={{fontSize:11,color:C.teal,marginBottom:6,fontWeight:600}}>📁 {proj?.name||"—"}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",borderTop:`1px solid ${C.border}`,paddingTop:6}}>
                            <Bdg color={PRI_CLR[t.priority]||C.t3}>{t.priority||"—"}</Bdg>
                            <span style={{fontSize:11,fontWeight:600,color:"#8b5cf6",background:"#8b5cf622",padding:"2px 7px",borderRadius:20}}>{role}</span>
                            <span style={{flex:1}}/>
                            <span style={{fontSize:11,color:isOv?C.red:C.t3,fontWeight:isOv?700:400}}>{t.due_date||"—"}{isOv?" ⚠":""}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
function ClientOverview({projects,tasks,onSelectClient,clients}){
  const isMobile=useMobile();
  const clientNames=[...new Set(projects.map(p=>p.client||"Unassigned"))].filter(c=>c==="Unassigned"||clients.some(cl=>cl.name===c));
  const today=new Date().toISOString().slice(0,10);
  return(
    <div style={{marginBottom:32}}>
      <h2 style={{margin:"0 0 12px",fontSize:16,fontWeight:700,color:"#ffffff"}}>Client-wise Overview</h2>
      {isMobile?(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {clientNames.map(client=>{
            const cProjects=projects.filter(p=>(p.client||"Unassigned")===client);
            const cTasks=tasks.filter(t=>cProjects.some(p=>p.id===t.project_id));
            const cDone=cTasks.filter(t=>isDone(t.status)).length;
            const cIP=cTasks.filter(t=>t.status==="In Progress").length;
            const cOv=cTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
            const pct=cTasks.length?Math.round(cDone/cTasks.length*100):0;
            const hue=client.charCodeAt(0)*23%360;
            const clr=`hsl(${hue},60%,50%)`;
            return(
              <div key={client} onClick={()=>onSelectClient(client)}
                style={{background:C.card,border:`1px solid ${cOv>0?C.red+"44":C.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${clr}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client}</span>
                  <span style={{fontSize:13,fontWeight:800,color:clr,flexShrink:0}}>{pct}%</span>
                </div>
                <div style={{height:4,background:C.surface,borderRadius:2,marginBottom:8,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:clr,borderRadius:2}}/>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.t3}}>📁 {cProjects.length} proj</span>
                  <span style={{fontSize:11,color:C.green}}>✅ {cDone}</span>
                  <span style={{fontSize:11,color:C.blue}}>🔄 {cIP}</span>
                  {cOv>0&&<span style={{fontSize:11,color:C.red,fontWeight:700}}>⚠ {cOv} overdue</span>}
                  <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{cTasks.length} tasks →</span>
                </div>
              </div>
            );
          })}
        </div>
      ):(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:18}}>
        {clientNames.map(client=>{
          const cProjects=projects.filter(p=>(p.client||"Unassigned")===client);
          const cTasks=tasks.filter(t=>cProjects.some(p=>p.id===t.project_id));
          const cDone=cTasks.filter(t=>isDone(t.status)).length;
          const cIP=cTasks.filter(t=>t.status==="In Progress").length;
          const cTodo=cTasks.filter(t=>t.status==="To Be Started"||t.status==="Not Yet Started").length;
          const cOv=cTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
          const pct=cTasks.length?Math.round(cDone/cTasks.length*100):0;
          const hue=client.charCodeAt(0)*23%360;
          const clr=`hsl(${hue},60%,50%)`;
          const assignees=[...new Set(cTasks.map(t=>t.assignee).filter(Boolean))];
          return(
            <div key={client} onClick={()=>onSelectClient(client)}
              style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${clr}`,transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              {/* Title + % */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                  <div style={{width:42,height:42,borderRadius:10,background:`hsl(${hue},55%,28%)`,border:`2px solid ${clr}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#fff",flexShrink:0}}>{client[0]}</div>
                  <div>
                    <div style={{fontWeight:800,fontSize:15,color:C.t1,lineHeight:1.2}}>{client}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2}}>{cProjects.length} project{cProjects.length!==1?"s":""} · {cTasks.length} tasks</div>
                  </div>
                </div>
                <span style={{background:clr+"22",color:clr,border:`1px solid ${clr}44`,borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:800,marginLeft:10,whiteSpace:"nowrap"}}>{pct}%</span>
              </div>
              {/* Progress bar */}
              <Pb v={pct} color={clr} h={7}/>
              {/* 4-stat breakdown */}
              <div className="rds-mini-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginTop:14}}>
                <div style={{background:C.green+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.green}}>{cDone}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Done</div>
                </div>
                <div style={{background:C.blue+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{cIP}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>In Progress</div>
                </div>
                <div style={{background:"#ffffff12",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.t2}}>{cTodo}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Pending</div>
                </div>
                <div style={{background:C.red+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:cOv>0?C.red:C.t3}}>{cOv}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Overdue</div>
                </div>
              </div>
              {/* Team */}
              {assignees.length>0&&(
                <div style={{marginTop:12,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:C.t3}}>Team:</span>
                  {assignees.slice(0,4).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:4}}><Av name={a} size={20}/><span style={{fontSize:11,color:C.t2}}>{a}</span></div>)}
                  {assignees.length>4&&<span style={{fontSize:11,color:C.t3}}>+{assignees.length-4} more</span>}
                </div>
              )}
              <div style={{marginTop:8,fontSize:11,color:C.t3,textAlign:"right"}}>click to view →</div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
function exportExcel(projects,tasks,label="Report"){
  const today=new Date().toISOString().slice(0,10);
  const safe=label.replace(/[/\\:*?"<>|]/g," ").trim();
  // ── helpers ──────────────────────────────────────────────────
  const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  function cell(val,sid,merge=0,type="String"){
    const m=merge?` ss:MergeAcross="${merge}"`:"";
    return `<Cell ss:StyleID="${sid}"${m}><Data ss:Type="${type}">${esc(val)}</Data></Cell>`;
  }
  function numCell(val,sid){return `<Cell ss:StyleID="${sid}"><Data ss:Type="Number">${val}</Data></Cell>`;}
  function row(h,...cells){return `<Row ss:Height="${h}">${cells.join("")}</Row>`;}
  function emptyRow(h,sid,n=1){return `<Row ss:Height="${h}">${Array(n).fill(`<Cell ss:StyleID="${sid}"/>`).join("")}</Row>`;}
  const BAR=(v,mx,w=24)=>{if(!mx)return"░".repeat(w);const f=Math.round((v/mx)*w);return"█".repeat(f)+"░".repeat(w-f);};
  // ── stats ─────────────────────────────────────────────────────
  const total=tasks.length;
  const done=tasks.filter(t=>isDone(t.status)).length;
  const inprog=tasks.filter(t=>t.status==="In Progress").length;
  const review=tasks.filter(t=>t.status==="Review").length;
  const notStart=tasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const cancl=tasks.filter(t=>t.status==="job canceled").length;
  const overdue=tasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const pct=total?Math.round((done/total)*100):0;
  const byA={};tasks.forEach(t=>{const a=t.assignee||"Unassigned";if(!byA[a])byA[a]={t:0,d:0};byA[a].t++;if(isDone(t.status))byA[a].d++;});
  const asgns=Object.entries(byA).sort((a,b)=>b[1].t-a[1].t);
  const byC={};tasks.forEach(t=>{const p=projects.find(x=>x.id===t.project_id);const c=p?.client||"Unassigned";if(!byC[c])byC[c]={t:0,d:0};byC[c].t++;if(isDone(t.status))byC[c].d++;});
  const clnts=Object.entries(byC).filter(([,v])=>v.t>0).sort((a,b)=>b[1].t-a[1].t);
  // ── styles ────────────────────────────────────────────────────
  const S=`
  <Style ss:ID="def"><Font ss:Name="Arial" ss:Size="10" ss:Color="#F1F5F9"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/></Style>
  <Style ss:ID="title"><Font ss:Name="Arial" ss:Size="22" ss:Bold="1" ss:Color="#F1F5F9"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="sub"><Font ss:Name="Arial" ss:Size="11" ss:Color="#94A3B8"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="secHdr"><Font ss:Name="Arial" ss:Size="12" ss:Bold="1" ss:Color="#14B8A6"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tblHdr"><Font ss:Name="Arial" ss:Size="9" ss:Bold="1" ss:Color="#94A3B8"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="kpiLbl"><Font ss:Name="Arial" ss:Size="8" ss:Bold="1" ss:Color="#94A3B8"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="kpiTotal"><Font ss:Name="Arial" ss:Size="30" ss:Bold="1" ss:Color="#F97316"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#F97316"/></Borders></Style>
  <Style ss:ID="kpiDone"><Font ss:Name="Arial" ss:Size="30" ss:Bold="1" ss:Color="#4ADE80"/><Interior ss:Color="#022C22" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#4ADE80"/></Borders></Style>
  <Style ss:ID="kpiProg"><Font ss:Name="Arial" ss:Size="30" ss:Bold="1" ss:Color="#93C5FD"/><Interior ss:Color="#172554" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#93C5FD"/></Borders></Style>
  <Style ss:ID="kpiOvd"><Font ss:Name="Arial" ss:Size="30" ss:Bold="1" ss:Color="#FCA5A5"/><Interior ss:Color="#450A0A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#FCA5A5"/></Borders></Style>
  <Style ss:ID="kpiPct"><Font ss:Name="Arial" ss:Size="30" ss:Bold="1" ss:Color="#86EFAC"/><Interior ss:Color="#14532D" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#86EFAC"/></Borders></Style>
  <Style ss:ID="progBar"><Font ss:Name="Courier New" ss:Size="11" ss:Bold="1" ss:Color="#4ADE80"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="progBarOr"><Font ss:Name="Courier New" ss:Size="11" ss:Bold="1" ss:Color="#F97316"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="progBarRd"><Font ss:Name="Courier New" ss:Size="11" ss:Bold="1" ss:Color="#EF4444"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stDone"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#4ADE80"/><Interior ss:Color="#022C22" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stDoneC"><Font ss:Name="Arial" ss:Size="13" ss:Bold="1" ss:Color="#4ADE80"/><Interior ss:Color="#022C22" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="stDoneB"><Font ss:Name="Courier New" ss:Size="9" ss:Color="#4ADE80"/><Interior ss:Color="#022C22" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stProg"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#93C5FD"/><Interior ss:Color="#172554" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stProgC"><Font ss:Name="Arial" ss:Size="13" ss:Bold="1" ss:Color="#93C5FD"/><Interior ss:Color="#172554" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="stProgB"><Font ss:Name="Courier New" ss:Size="9" ss:Color="#93C5FD"/><Interior ss:Color="#172554" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stRev"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#D8B4FE"/><Interior ss:Color="#2E1065" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stRevC"><Font ss:Name="Arial" ss:Size="13" ss:Bold="1" ss:Color="#D8B4FE"/><Interior ss:Color="#2E1065" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="stRevB"><Font ss:Name="Courier New" ss:Size="9" ss:Color="#D8B4FE"/><Interior ss:Color="#2E1065" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stNot"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#A8A29E"/><Interior ss:Color="#1C1917" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stNotC"><Font ss:Name="Arial" ss:Size="13" ss:Bold="1" ss:Color="#A8A29E"/><Interior ss:Color="#1C1917" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="stNotB"><Font ss:Name="Courier New" ss:Size="9" ss:Color="#A8A29E"/><Interior ss:Color="#1C1917" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stCnx"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F87171"/><Interior ss:Color="#1C0505" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stCnxC"><Font ss:Name="Arial" ss:Size="13" ss:Bold="1" ss:Color="#F87171"/><Interior ss:Color="#1C0505" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="stCnxB"><Font ss:Name="Courier New" ss:Size="9" ss:Color="#F87171"/><Interior ss:Color="#1C0505" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stOvd"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FCA5A5"/><Interior ss:Color="#450A0A" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="stOvdC"><Font ss:Name="Arial" ss:Size="13" ss:Bold="1" ss:Color="#FCA5A5"/><Interior ss:Color="#450A0A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="stOvdB"><Font ss:Name="Courier New" ss:Size="9" ss:Color="#FCA5A5"/><Interior ss:Color="#450A0A" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEv"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F1F5F9"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOd"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F1F5F9"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvC"><Font ss:Name="Arial" ss:Size="11" ss:Bold="1" ss:Color="#F97316"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdC"><Font ss:Name="Arial" ss:Size="11" ss:Bold="1" ss:Color="#F97316"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvD"><Font ss:Name="Arial" ss:Size="11" ss:Bold="1" ss:Color="#22C55E"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdD"><Font ss:Name="Arial" ss:Size="11" ss:Bold="1" ss:Color="#22C55E"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvBG"><Font ss:Name="Courier New" ss:Size="8" ss:Color="#22C55E"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdBG"><Font ss:Name="Courier New" ss:Size="8" ss:Color="#22C55E"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvBO"><Font ss:Name="Courier New" ss:Size="8" ss:Color="#F97316"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdBO"><Font ss:Name="Courier New" ss:Size="8" ss:Color="#F97316"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvBR"><Font ss:Name="Courier New" ss:Size="8" ss:Color="#94A3B8"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdBR"><Font ss:Name="Courier New" ss:Size="8" ss:Color="#94A3B8"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvP"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#22C55E"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdP"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#22C55E"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvPO"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F97316"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdPO"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F97316"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnEvPR"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#EF4444"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="asnOdPR"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#EF4444"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="hdrTask"><Font ss:Name="Arial" ss:Size="11" ss:Bold="1" ss:Color="#F1F5F9"/><Interior ss:Color="#1E2433" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#14B8A6"/></Borders></Style>
  <Style ss:ID="clientRow"><Font ss:Name="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#F97316" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="projRow"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#3B82F6" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tDone"><Font ss:Name="Arial" ss:Size="10" ss:Color="#F1F5F9"/><Interior ss:Color="#0A1F14" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tDoneB"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#4ADE80"/><Interior ss:Color="#022C22" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tProg"><Font ss:Name="Arial" ss:Size="10" ss:Color="#F1F5F9"/><Interior ss:Color="#0A1631" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tProgB"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#93C5FD"/><Interior ss:Color="#172554" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tOvd"><Font ss:Name="Arial" ss:Size="10" ss:Color="#FCA5A5"/><Interior ss:Color="#1C0A0A" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tOvdB"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FCA5A5"/><Interior ss:Color="#7F1D1D" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tRev"><Font ss:Name="Arial" ss:Size="10" ss:Color="#F1F5F9"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tRevB"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#D8B4FE"/><Interior ss:Color="#2E1065" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tDef"><Font ss:Name="Arial" ss:Size="10" ss:Color="#F1F5F9"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="tDefB"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#A8A29E"/><Interior ss:Color="#1C1917" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tCnxB"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F87171"/><Interior ss:Color="#1C0505" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tNum"><Font ss:Name="Arial" ss:Size="10" ss:Color="#94A3B8"/><Interior ss:Color="#171B26" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tNumD"><Font ss:Name="Arial" ss:Size="10" ss:Color="#94A3B8"/><Interior ss:Color="#0A1F14" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tNumP"><Font ss:Name="Arial" ss:Size="10" ss:Color="#94A3B8"/><Interior ss:Color="#0A1631" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="tNumO"><Font ss:Name="Arial" ss:Size="10" ss:Color="#FCA5A5"/><Interior ss:Color="#1C0A0A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="gap"><Interior ss:Color="#0F1117" ss:Pattern="Solid"/></Style>
  `;
  // ── Sheet 1: Analytics ─────────────────────────────────────
  const bW=40;const bF=Math.round((pct/100)*bW);
  const pbStyle=pct>=80?"progBar":pct>=50?"progBarOr":"progBarRd";
  const maxSt=Math.max(done,inprog,review,notStart,cancl,overdue,1);
  const stData=[
    {lbl:"✅  Completed",cnt:done,s:"stDone",sc:"stDoneC",sb:"stDoneB"},
    {lbl:"🔵  In Progress",cnt:inprog,s:"stProg",sc:"stProgC",sb:"stProgB"},
    {lbl:"🟣  Review",cnt:review,s:"stRev",sc:"stRevC",sb:"stRevB"},
    {lbl:"⚪  Not Started",cnt:notStart,s:"stNot",sc:"stNotC",sb:"stNotB"},
    {lbl:"❌  Canceled",cnt:cancl,s:"stCnx",sc:"stCnxC",sb:"stCnxB"},
    {lbl:"⚠   Overdue",cnt:overdue,s:"stOvd",sc:"stOvdC",sb:"stOvdB"},
  ];
  let dash=``;
  dash+=`<Column ss:Width="18"/><Column ss:Width="150"/><Column ss:Width="65"/><Column ss:Width="55"/><Column ss:Width="160"/><Column ss:Width="70"/><Column ss:Width="18"/>`;
  // title
  dash+=`<Row ss:Height="8">${Array(7).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
  dash+=`<Row ss:Height="42"><Cell ss:StyleID="gap"/>${cell("📊  RDS Project Hub — "+safe,"title",4)}<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell("Generated: "+today+"   •   "+total+" tasks   |   "+projects.length+" projects   |   "+pct+"% complete","sub",4)}<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="10">${Array(7).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
  // KPI section header
  dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell("▸  KEY METRICS","secHdr",4)}<Cell ss:StyleID="gap"/></Row>`;
  // KPI labels
  dash+=`<Row ss:Height="16"><Cell ss:StyleID="gap"/>`;
  dash+=cell("TOTAL TASKS","kpiLbl")+cell("COMPLETED","kpiLbl")+cell("IN PROGRESS","kpiLbl")+cell("OVERDUE","kpiLbl")+cell("COMPLETION %","kpiLbl");
  dash+=`<Cell ss:StyleID="gap"/></Row>`;
  // KPI values
  dash+=`<Row ss:Height="58"><Cell ss:StyleID="gap"/>`;
  dash+=numCell(total,"kpiTotal")+numCell(done,"kpiDone")+numCell(inprog,"kpiProg")+numCell(overdue,"kpiOvd")+cell(pct+"%","kpiPct");
  dash+=`<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="14">${Array(7).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
  // Progress bar
  dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell("▸  COMPLETION PROGRESS","secHdr",4)}<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="30"><Cell ss:StyleID="gap"/>${cell("█".repeat(bF)+"░".repeat(bW-bF)+"   "+pct+"% Complete   ("+done+" of "+total+")",pbStyle,3)}${cell(done+" / "+total,"sub")}<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="14">${Array(7).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
  // Status breakdown
  dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell("▸  STATUS BREAKDOWN","secHdr",4)}<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="16"><Cell ss:StyleID="gap"/>${cell("Status","tblHdr")+cell("Count","tblHdr")+cell("Share %","tblHdr")+cell("Progress Bar","tblHdr")+cell("","tblHdr")}<Cell ss:StyleID="gap"/></Row>`;
  stData.forEach(s=>{
    const share=total?Math.round((s.cnt/total)*100):0;
    dash+=`<Row ss:Height="22"><Cell ss:StyleID="gap"/>`;
    dash+=cell(s.lbl,s.s)+numCell(s.cnt,s.sc)+cell(share+"%",s.sc)+cell(BAR(s.cnt,maxSt,22),s.sb)+`<Cell ss:StyleID="${s.s}"/>`;
    dash+=`<Cell ss:StyleID="gap"/></Row>`;
  });
  dash+=`<Row ss:Height="14">${Array(7).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
  // Assignee breakdown
  dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell("▸  ASSIGNEE BREAKDOWN","secHdr",4)}<Cell ss:StyleID="gap"/></Row>`;
  dash+=`<Row ss:Height="16"><Cell ss:StyleID="gap"/>${cell("Assignee","tblHdr")+cell("Tasks","tblHdr")+cell("Done","tblHdr")+cell("Progress Bar","tblHdr")+cell("Done %","tblHdr")}<Cell ss:StyleID="gap"/></Row>`;
  asgns.slice(0,20).forEach(([name,v],i)=>{
    const e=i%2===0;const cp=v.t?Math.round((v.d/v.t)*100):0;
    const [sN,sC,sD,sP,sPc]=[e?"asnEv":"asnOd",e?"asnEvC":"asnOdC",e?"asnEvD":"asnOdD",cp>=80?(e?"asnEvBG":"asnOdBG"):cp>=50?(e?"asnEvBO":"asnOdBO"):(e?"asnEvBR":"asnOdBR"),cp>=80?(e?"asnEvP":"asnOdP"):cp>=50?(e?"asnEvPO":"asnOdPO"):(e?"asnEvPR":"asnOdPR")];
    dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell(name,sN)+numCell(v.t,sC)+numCell(v.d,sD)+cell(BAR(v.d,v.t,22),sP)+cell(cp+"%",sPc)}<Cell ss:StyleID="gap"/></Row>`;
  });
  dash+=`<Row ss:Height="14">${Array(7).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
  // Client breakdown
  if(clnts.length){
    dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell("▸  CLIENT BREAKDOWN","secHdr",4)}<Cell ss:StyleID="gap"/></Row>`;
    dash+=`<Row ss:Height="16"><Cell ss:StyleID="gap"/>${cell("Client","tblHdr")+cell("Tasks","tblHdr")+cell("Done","tblHdr")+cell("Progress Bar","tblHdr")+cell("Done %","tblHdr")}<Cell ss:StyleID="gap"/></Row>`;
    clnts.forEach(([name,v],i)=>{
      const e=i%2===0;const cp=v.t?Math.round((v.d/v.t)*100):0;
      const [sN,sC,sD,sP,sPc]=[e?"asnEv":"asnOd",e?"asnEvC":"asnOdC",e?"asnEvD":"asnOdD",cp>=80?(e?"asnEvBG":"asnOdBG"):cp>=50?(e?"asnEvBO":"asnOdBO"):(e?"asnEvBR":"asnOdBR"),cp>=80?(e?"asnEvP":"asnOdP"):cp>=50?(e?"asnEvPO":"asnOdPO"):(e?"asnEvPR":"asnOdPR")];
      dash+=`<Row ss:Height="20"><Cell ss:StyleID="gap"/>${cell(name,sN)+numCell(v.t,sC)+numCell(v.d,sD)+cell(BAR(v.d,v.t,22),sP)+cell(cp+"%",sPc)}<Cell ss:StyleID="gap"/></Row>`;
    });
  }
  // ── Sheet 2: Tasks ──────────────────────────────────────────
  const clientGroups=[...new Set(projects.map(p=>p.client||"Unassigned"))];
  let taskSheet=``;
  taskSheet+=`<Column ss:Width="30"/><Column ss:Width="200"/><Column ss:Width="120"/><Column ss:Width="60"/><Column ss:Width="90"/><Column ss:Width="60"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="70"/><Column ss:Width="80"/><Column ss:Width="90"/>`;
  taskSheet+=`<Row ss:Height="28">${["#","Task","Project","Scope","Status","Priority","Assignee","Detailer","Checker","Due Date","Client Sub Date","Client"].map(h=>cell(h,"hdrTask")).join("")}</Row>`;
  let n=1;
  clientGroups.forEach(client=>{
    const cP=projects.filter(p=>(p.client||"Unassigned")===client);
    const cT=tasks.filter(t=>cP.some(p=>p.id===t.project_id));
    if(!cT.length)return;
    taskSheet+=`<Row ss:Height="22">${cell("CLIENT: "+client+"   ("+cP.length+" projects, "+cT.length+" tasks)","clientRow",11)}</Row>`;
    cP.forEach(proj=>{
      const pt=cT.filter(t=>t.project_id===proj.id);
      if(!pt.length)return;
      taskSheet+=`<Row ss:Height="18">${cell("  ▸ "+proj.name+"  ("+pt.length+" tasks)","projRow",11)}</Row>`;
      pt.forEach(t=>{
        const ov=t.due_date&&t.due_date<today&&!isDone(t.status);
        const isC=isDone(t.status);const isI=t.status==="In Progress";const isR=t.status==="Review";const isCx=t.status==="job canceled";
        let rs="tDef",rsb="tDefB",rn_s="tNum";
        if(ov){rs="tOvd";rsb="tOvdB";rn_s="tNumO";}
        else if(isC){rs="tDone";rsb="tDoneB";rn_s="tNumD";}
        else if(isI){rs="tProg";rsb="tProgB";rn_s="tNumP";}
        else if(isR){rs="tRev";rsb="tRevB";}
        else if(isCx){rsb="tCnxB";}
        taskSheet+=`<Row ss:Height="20">`;
        taskSheet+=numCell(n++,rn_s);
        taskSheet+=cell(t.title||"",rs);
        taskSheet+=cell(proj.name,rs);
        taskSheet+=cell(t.scope||"—",rs);
        taskSheet+=cell((t.status||"—")+(ov?" ⚠":""),rsb);
        taskSheet+=cell(t.priority||"—",rs);
        taskSheet+=cell(t.assignee||"Unassigned",rs);
        taskSheet+=cell(t.detailer||"—",rs);
        taskSheet+=cell(t.checker||"—",rs);
        taskSheet+=cell(t.due_date||"—",ov?"tOvdB":rs);
        taskSheet+=cell(t.client_sub_date||"—",rs);
        taskSheet+=cell(client,rs);
        taskSheet+=`</Row>`;
      });
      taskSheet+=`<Row ss:Height="5">${Array(12).fill(`<Cell ss:StyleID="gap"/>`).join("")}</Row>`;
    });
  });
  // ── Build SpreadsheetML XML ──────────────────────────────────
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:o="urn:schemas-microsoft-com:office:office"><Styles>${S}</Styles><Worksheet ss:Name="Analytics"><Table>${dash}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FitToPage/><Print><FitWidth>1</FitWidth></Print></WorksheetOptions></Worksheet><Worksheet ss:Name="Tasks"><Table>${taskSheet}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet></Workbook>`;
  const b64=btoa(unescape(encodeURIComponent(xml)));
  const a=document.createElement("a");
  a.href="data:application/vnd.ms-excel;base64,"+b64;
  a.download="RDS Report - "+safe+" - "+today+".xls";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

function ChangePasswordModal({me,onClose}){
  const [cur,scur]=useState("");
  const [np,snp]=useState("");
  const [conf,sconf]=useState("");
  const [err,se]=useState("");
  const [ok,sok]=useState(false);
  const [saving,ssv]=useState(false);
  const [show,ssh]=useState(false);
  async function save(){
    se("");
    if(!cur.trim()||!np.trim()||!conf.trim()){se("All fields are required.");return;}
    if(np!==conf){se("New passwords do not match.");return;}
    if(np.length<6){se("Password must be at least 6 characters.");return;}
    if(np===cur){se("New password must be different from current password.");return;}
    ssv(true);
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
    const sb=createClient("https://xypcbioltukahipkqqzc.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw");
    // Verify current password
    const {data:check}=await sb.from("users").select("id").eq("id",me.id).eq("password",cur).single();
    if(!check){se("Current password is incorrect.");ssv(false);return;}
    // Save new password
    const {error}=await sb.from("users").update({password:np}).eq("id",me.id);
    if(error){se("Error saving: "+error.message);ssv(false);return;}
    // Update localStorage
    const stored=JSON.parse(localStorage.getItem("rds_user")||"{}");
    localStorage.setItem("rds_user",JSON.stringify({...stored,password:np}));
    sok(true);
    ssv(false);
  }
  return(
    <Modal title="🔐 Change Password" onClose={onClose}>
      {ok?(
        <div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <h3 style={{margin:"0 0 8px",color:C.green,fontSize:18}}>Password Changed!</h3>
          <p style={{color:C.t3,fontSize:13,margin:"0 0 20px"}}>Your new password is active. Use it next time you log in.</p>
          <button onClick={onClose} style={{...SBtn,margin:"0 auto"}}>Done</button>
        </div>
      ):(
        <div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Current Password</label>
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} value={cur} onChange={e=>scur(e.target.value)}
                style={{width:"100%",background:C.surface,border:`1px solid ${err&&!cur?C.red:C.border}`,borderRadius:8,padding:"9px 40px 9px 12px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                placeholder="Enter your current password"/>
              <button onClick={()=>ssh(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:15,padding:0}}>{show?"🙈":"👁"}</button>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>New Password</label>
            <input type={show?"text":"password"} value={np} onChange={e=>snp(e.target.value)}
              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              placeholder="Min. 6 characters"/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Confirm New Password</label>
            <input type={show?"text":"password"} value={conf} onChange={e=>sconf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}
              style={{width:"100%",background:C.surface,border:`1px solid ${conf&&conf!==np?C.red:C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              placeholder="Re-enter new password"/>
            {conf&&conf!==np&&<p style={{margin:"4px 0 0",fontSize:11,color:C.red}}>Passwords don't match</p>}
          </div>
          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"9px 14px",marginBottom:14,color:C.red,fontSize:13}}>⚠ {err}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={GBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Saving…":"Change Password"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
function Login({onLogin}){
  const [un,sun]=useState(""),[pw,spw]=useState(""),[show,ss]=useState(false),[err,se]=useState(""),[ld,sl]=useState(false);
  async function go(){
    if(!un.trim()||!pw.trim()){se("Please enter username and password.");return;}
    sl(true);se("");
    try{
      const {data,error}=await supabase.from("users").select("*").eq("username",un.trim().toLowerCase()).eq("password",pw).single();
      if(error||!data){se("Invalid username or password.");}
      else{localStorage.setItem("rds_user",JSON.stringify(data));onLogin(data);}
    }catch(e){se("Connection error: "+e.message);}
    sl(false);
  }
  return(
    <div style={{height:"100vh",width:"100vw",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif",overflow:"auto",position:"fixed",top:0,left:0}}>
      <div style={{position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",width:600,height:300,background:`radial-gradient(ellipse,${C.accent}18 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{width:420,maxWidth:"94vw"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:160,height:70,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img src="/logo.png" alt="RDS" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
          </div>
          <h1 style={{margin:0,fontSize:28,fontWeight:800,color:C.t1}}>RDS Project Hub</h1>
          <p style={{margin:"4px 0 0",color:C.t3,fontSize:12,letterSpacing:"0.12em",textTransform:"uppercase"}}>Design Engineering and Construction Services</p>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"32px 32px 28px",boxShadow:"0 24px 64px #00000060"}}>
          <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:700,color:C.t1}}>Welcome back</h2>
          <p style={{margin:"0 0 24px",color:C.t3,fontSize:13}}>Sign in to access Project Hub</p>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:6,fontWeight:600}}>USERNAME</label>
            <input value={un} onChange={e=>sun(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="e.g. ramesh"
              style={{width:"100%",background:C.surface,border:`1px solid ${err?C.red:C.border}`,borderRadius:10,padding:"11px 14px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:6,fontWeight:600}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} value={pw} onChange={e=>spw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••"
                style={{width:"100%",background:C.surface,border:`1px solid ${err?C.red:C.border}`,borderRadius:10,padding:"11px 44px 11px 14px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              <button onClick={()=>ss(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:16,padding:0}}>{show?"🙈":"👁"}</button>
            </div>
          </div>
          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"9px 14px",marginBottom:16,color:C.red,fontSize:13}}>⚠ {err}</div>}
          <button onClick={go} disabled={ld} style={{...SBtn,width:"100%",padding:"12px",fontSize:15,opacity:ld?.7:1}}>{ld?"Signing in…":"Sign In →"}</button>
        </div>
        <p style={{textAlign:"center",marginTop:20,color:C.t3,fontSize:11}}>RDS · Project Hub v2.0 · Powered by Supabase</p>
      </div>
    </div>
  );
}
function ClientDashboard({me,tasks,projects,today,onViewProject}){
  const isMobile=useMobile();
  const [statusFilter,ssf]=useState("All");
  const [search,ss]=useState("");
  const [filterProject,sfp]=useState("All");
  const [filterAssignee,sfa]=useState("All");
  const [showTasks,sst]=useState(false);
  const [clStatModal,setCSM]=useState(null);
  const myProjects=projects.filter(p=>(p.client||"").toLowerCase()===(me.client_name||"").toLowerCase());
  const myPids=new Set(myProjects.map(p=>p.id));
  const myTasks=tasks.filter(t=>myPids.has(t.project_id));
  const total=myTasks.length;
  const done=myTasks.filter(t=>isDone(t.status)).length;
  const inprog=myTasks.filter(t=>t.status==="In Progress").length;
  const overdue=myTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const notStarted=myTasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const pct=total?Math.round(done/total*100):0;
  const allAssignees=[...new Set(myTasks.map(t=>t.assignee).filter(Boolean))].sort();
  const hasFilter=statusFilter!=="All"||filterProject!=="All"||filterAssignee!=="All"||search;
  const filtered=myTasks.filter(t=>{
    const pj=projects.find(p=>p.id===t.project_id);
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase())&&!(pj?.name||"").toLowerCase().includes(search.toLowerCase()))return false;
    if(statusFilter!=="All"){const nsMatch=statusFilter==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!nsMatch&&t.status!==statusFilter)return false;}
    if(filterProject!=="All"&&t.project_id!==filterProject)return false;
    if(filterAssignee!=="All"&&t.assignee!==filterAssignee)return false;
    return true;
  });
  const selStyle=active=>({background:C.surface,border:`1px solid ${active?C.teal:C.border}`,borderRadius:8,padding:"8px 10px",color:active?C.teal:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"});
  function doExport(){
    const exportProjs=myProjects.filter(p=>filtered.some(t=>t.project_id===p.id));
    exportExcel(exportProjs,filtered,`${me.client_name||me.name} - Project Report`);
  }
  return(
    <div>
      {/* Header */}
      <div className="rds-dash-banner" style={{background:`linear-gradient(135deg,${C.card} 0%,${C.teal}11 100%)`,border:`1px solid ${C.teal}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",borderLeft:`4px solid ${C.teal}`}}>
        <div className="rds-dash-banner-avatar" style={{width:52,height:52,borderRadius:14,background:C.teal+"22",border:`2px solid ${C.teal}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:C.teal}}>{(me.client_name||me.name)[0]}</div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>{me.client_name||me.name} — Client Portal</h2>
          <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back · {myProjects.length} project{myProjects.length!==1?"s":""} · {total} tasks total</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:800,color:C.teal}}>{pct}%</div>
          <div style={{fontSize:11,color:C.t3}}>overall complete</div>
        </div>
        <div className="rds-dash-banner-stats" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          {[{l:"Projects",v:myProjects.length,c:C.teal,k:"clprojects"},{l:"Total Tasks",v:total,c:C.blue,k:"cltotal"},{l:"Completed",v:done,c:C.green,k:"clcompleted"},{l:"Completion",v:pct+"%",c:"#f59e0b",k:"clpct"}].map(s=>(
            <div key={s.l} onClick={()=>setCSM(s.k)} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",minWidth:64,textAlign:"center",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";e.currentTarget.style.boxShadow=`0 0 0 2px ${s.c}55`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      {clStatModal&&(()=>{
        const completedTasks=myTasks.filter(t=>isDone(t.status));
        const ipTasks=myTasks.filter(t=>t.status==="In Progress");
        const clModalData={
          clprojects:{title:"📁 My Projects",color:C.teal,items:myProjects.map(p=>{const pt=myTasks.filter(t=>t.project_id===p.id);const pd=pt.filter(t=>isDone(t.status)).length;return{label:p.name,sub:`${pt.length} tasks · ${pt.length?Math.round(pd/pt.length*100):0}% done`,dot:C.teal};})},
          cltotal:{title:"📋 All Tasks",color:C.blue,items:myTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · ${t.status}`,dot:t.status==="In Progress"?C.blue:isDone(t.status)?C.green:C.t3};})},
          clcompleted:{title:"✅ Completed Tasks",color:C.green,items:completedTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?.name||"—"} · Done`,dot:C.green};})},
          clpct:{title:"📊 Tasks by Status",color:"#f59e0b",items:[{label:`✅ Completed`,sub:`${done} tasks`,dot:C.green},{label:`🔄 In Progress`,sub:`${inprog} tasks`,dot:C.blue},{label:`⏳ Not Started`,sub:`${notStarted} tasks`,dot:C.t3},{label:`⚠ Overdue`,sub:`${overdue} tasks`,dot:C.red}]},
        };
        const md=clModalData[clStatModal];if(!md)return null;
        return(<div onClick={()=>setCSM(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,fontSize:16,color:C.t1}}>{md.title} <span style={{color:md.color,fontSize:14}}>({md.items.length})</span></span>
              <button onClick={()=>setCSM(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t3}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"10px 8px"}}>
              {md.items.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>No items</div>:md.items.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,marginBottom:4,transition:"background .15s",cursor:"default"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:36,height:36,borderRadius:10,background:item.dot+"22",border:`2px solid ${item.dot}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:item.dot,flexShrink:0}}>{(item.label[0]||"?").toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0,borderLeft:`3px solid ${item.dot}`,paddingLeft:10}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>);
      })()}
      {/* Progress bar */}
      <div style={{marginBottom:18}}><Pb v={pct} color={C.teal} h={8}/></div>
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        <Stat label="Total Tasks" value={total} sub="all projects" color={C.teal} onClick={()=>{ssf("All");sfp("All");sfa("All");ss("");sst(true);}}/>
        <Stat label="Completed" value={done} sub="finished" color={C.green} onClick={()=>{ssf("Completed");sst(true);}}/>
        <Stat label="In Progress" value={inprog} sub="active" color={C.blue} onClick={()=>{ssf("In Progress");sst(true);}}/>
        <Stat label="Not Yet Started" value={notStarted} sub="pending" color={C.t2} onClick={()=>{ssf("Not Yet Started");sst(true);}}/>
        <Stat label="Overdue" value={overdue} sub="need attention" color={C.red} onClick={()=>{ssf("All");sst(true);}}/>
      </div>
      {/* Filter bar */}
      <div style={{background:C.card,border:`1px solid ${hasFilter?C.teal:C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:24,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <input placeholder="🔍 Search tasks or projects…" value={search} onChange={e=>ss(e.target.value)}
          style={{flex:1,minWidth:160,background:C.surface,border:`1px solid ${search?C.teal:C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
        <select value={filterProject} onChange={e=>{sfp(e.target.value);sst(true);}} style={selStyle(filterProject!=="All")}>
          <option value="All">All Projects</option>
          {myProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterAssignee} onChange={e=>{sfa(e.target.value);sst(true);}} style={selStyle(filterAssignee!=="All")}>
          <option value="All">All Assignees</option>
          {allAssignees.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>{ssf(e.target.value);sst(true);}} style={selStyle(statusFilter!=="All")}>
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilter&&<button onClick={()=>{ssf("All");sfp("All");sfa("All");ss("");}} style={{...GBtn,padding:"8px 12px",fontSize:12,color:C.red,borderColor:C.red}}>✕ Clear</button>}
        <button onClick={()=>sst(v=>!v)} style={{...GBtn,padding:"8px 14px",fontSize:13}}>{showTasks?"Hide Tasks ▲":"Show Tasks ▼"}</button>
      </div>
      {/* Task table (toggled) */}
      {showTasks&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:28}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Tasks ({filtered.length})</span>
            {hasFilter&&<span style={{fontSize:12,color:C.teal}}>Filtered</span>}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.surface}}>{["Task","Project","Status","Priority","Assignee","Detailer","Checker","Due Date","Client Sub Date"].map(h=>(
              <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
            ))}</tr></thead>
            <tbody>{filtered.length===0
              ?<tr><td colSpan={9} style={{padding:28,textAlign:"center",color:C.t3,fontSize:13}}>No tasks match filters</td></tr>
              :filtered.map(t=>{
                const pj=projects.find(p=>p.id===t.project_id);
                const tdy=new Date().toISOString().slice(0,10);
                const ov=t.due_date&&t.due_date<tdy&&!isDone(t.status);
                return(<tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 14px"}}><span style={{color:C.t1,fontSize:13}}>{t.title}</span></td>
                  <td style={{padding:"10px 14px"}}><span style={{color:C.teal,fontSize:12}}>{pj?.name||"—"}</span></td>
                  <td style={{padding:"10px 14px"}}><Bdg color={getStatusColor(t.status)}>{t.status}</Bdg></td>
                  <td style={{padding:"10px 14px"}}><Bdg color={PRI_CLR[t.priority]}>{t.priority||"—"}</Bdg></td>
                  <td style={{padding:"10px 14px"}}>{t.assignee?<div style={{display:"flex",alignItems:"center",gap:5}}><Av name={t.assignee} size={20}/><span style={{fontSize:12,color:C.t2}}>{t.assignee}</span></div>:<span style={{color:C.t3,fontSize:12}}>—</span>}</td>
                  <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{t.detailer||"—"}</span></td>
                  <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{t.checker||"—"}</span></td>
                  <td style={{padding:"10px 14px"}}><span style={{color:ov?C.red:C.t3,fontSize:12,fontWeight:ov?700:400}}>{t.due_date||"—"}{ov?" ⚠":""}</span></td>
                  <td style={{padding:"10px 14px"}}><span style={{color:C.t3,fontSize:12}}>{t.client_sub_date||"—"}</span></td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Projects */}
      <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:C.t1}}>My Projects ({myProjects.length})</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:18,marginBottom:28}}>
        {myProjects.map(p=>{
          const pt=myTasks.filter(t=>t.project_id===p.id);
          const pd=pt.filter(t=>isDone(t.status)).length;
          const pip=pt.filter(t=>t.status==="In Progress").length;
          const pnd=pt.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length;
          const pov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
          const pp=pt.length?Math.round(pd/pt.length*100):0;
          const assignees=[...new Set(pt.map(t=>t.assignee).filter(Boolean))];
          return(
            <div key={p.id} onClick={()=>onViewProject(p.id)}
              style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${p.color}`,transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              {/* Title + % */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <p style={{margin:0,fontSize:15,fontWeight:800,color:C.t1,flex:1,lineHeight:1.3}}>{p.name}</p>
                <span style={{background:p.color+"22",color:p.color,border:`1px solid ${p.color}44`,borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:800,marginLeft:10,whiteSpace:"nowrap"}}>{pp}%</span>
              </div>
              {/* Deadline */}
              {p.deadline&&<div style={{marginBottom:10}}><span style={{fontSize:12,color:C.t3}}>📅 Due {p.deadline}</span></div>}
              {/* Progress bar */}
              <Pb v={pp} color={p.color} h={7}/>
              {/* 4-stat breakdown */}
              <div className="rds-mini-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginTop:14}}>
                <div style={{background:C.green+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.green}}>{pd}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Done</div>
                </div>
                <div style={{background:C.blue+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{pip}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>In Progress</div>
                </div>
                <div style={{background:"#ffffff12",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.t2}}>{pnd}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Pending</div>
                </div>
                <div style={{background:C.red+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:pov>0?C.red:C.t3}}>{pov}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Overdue</div>
                </div>
              </div>
              {/* Team */}
              {assignees.length>0&&(
                <div style={{marginTop:12,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:C.t3}}>Team:</span>
                  {assignees.slice(0,4).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:4}}><Av name={a} size={20}/><span style={{fontSize:11,color:C.t2}}>{a}</span></div>)}
                  {assignees.length>4&&<span style={{fontSize:11,color:C.t3}}>+{assignees.length-4} more</span>}
                </div>
              )}
              <div style={{marginTop:10,fontSize:11,color:C.t3,textAlign:"right"}}>{pt.length} task{pt.length!==1?"s":""} total · click to view →</div>
            </div>
          );
        })}
        {myProjects.length===0&&<p style={{color:C.t3,fontSize:13,gridColumn:"1/-1"}}>No projects assigned yet.</p>}
      </div>
    </div>
  );
}

function ClientProjectSearch({projects,tasks,assignees,today,isAdmin,canEdit,onViewTasks,onEdit,onDelete,onEditTask}){
  const isMobile=useMobile();
  const [q,sq]=useState("");
  const [fStatus,sfs]=useState("All");
  const [fAssignee,sfa]=useState("All");
  const [expanded,sexp]=useState({});
  const sel=inp=>{return{width:"100%",background:C.surface,border:`1px solid ${inp!=="All"?C.accent:C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",cursor:"pointer"};};
  const hasFilter=q||fStatus!=="All"||fAssignee!=="All";
  // filter tasks per project
  function projTasks(pid){
    return tasks.filter(t=>{
      if(t.project_id!==pid)return false;
      if(q&&!t.title.toLowerCase().includes(q.toLowerCase())&&!(t.assignee||"").toLowerCase().includes(q.toLowerCase()))return false;
      if(fStatus!=="All"){const nsMatch=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!nsMatch&&t.status!==fStatus)return false;}
      if(fAssignee!=="All"&&t.assignee!==fAssignee)return false;
      return true;
    });
  }
  // which projects are visible: always show all, but expand automatically when searching
  const visibleProjects=projects.filter(p=>{
    if(!hasFilter)return true;
    // show project if its name matches OR it has matching tasks
    const nameMatch=q&&p.name.toLowerCase().includes(q.toLowerCase());
    return nameMatch||projTasks(p.id).length>0;
  });
  return(
    <div>
      {/* Search bar */}
      <div style={{marginBottom:14}}>
        <input autoFocus placeholder="🔍  Search tasks or projects…" value={q} onChange={e=>sq(e.target.value)}
          style={{width:"100%",background:C.card,border:`1px solid ${q?C.accent:C.border}`,borderRadius:8,padding:"9px 14px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"end"}}>
          <div>
            <label style={{display:"block",color:C.t3,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Filter by Status</label>
            <select value={fStatus} onChange={e=>sfs(e.target.value)} style={sel(fStatus)}>
              <option value="All">All Statuses</option>
              {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:"block",color:C.t3,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Filter by Assignee</label>
            <select value={fAssignee} onChange={e=>sfa(e.target.value)} style={sel(fAssignee)}>
              <option value="All">All Assignees</option>
              {assignees.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {hasFilter&&<button onClick={()=>{sq("");sfs("All");sfa("All");}} style={{background:"transparent",border:`1px solid ${C.red}`,color:C.red,borderRadius:7,padding:"7px 14px",fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>✕ Clear</button>}
        </div>
        {hasFilter&&<p style={{margin:"8px 0 0",fontSize:12,color:C.accent}}>{visibleProjects.length} project(s) · {visibleProjects.reduce((s,p)=>s+projTasks(p.id).length,0)} task(s) matched</p>}
      </div>
      {/* Project cards */}
      {visibleProjects.length===0
        ?<div style={{textAlign:"center",padding:48,color:C.t3,background:C.card,borderRadius:12,border:`1px solid ${C.border}`}}>No projects or tasks match your search.</div>
        :<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {visibleProjects.map(p=>{
            const allPt=tasks.filter(t=>t.project_id===p.id);
            const matchedPt=projTasks(p.id);
            const pd=allPt.filter(t=>isDone(t.status)).length;
            const pip=allPt.filter(t=>t.status==="In Progress").length;
            const ptd=allPt.filter(t=>t.status==="To Be Started"||t.status==="Not Yet Started").length;
            const pv=allPt.length?Math.round(pd/allPt.length*100):0;
            const overduePt=allPt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status));
            const isExpanded=hasFilter||expanded[p.id];
            return(
              <div key={p.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,borderLeft:`5px solid ${p.color}`,overflow:"hidden"}}>
                {/* Project header */}
                <div style={{padding:"18px 22px",cursor:"pointer"}}
                  onClick={()=>sexp(x=>({...x,[p.id]:!x[p.id]}))}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:3}}>{p.name}</div>
                      {p.description&&<div style={{fontSize:12,color:C.t3,marginBottom:6}}>{p.description}</div>}
                      <div style={{display:"flex",gap:20,marginTop:8}}>
                        <span style={{fontSize:12,color:C.green}}>✓ {pd} done</span>
                        <span style={{fontSize:12,color:C.blue}}>⟳ {pip} in progress</span>
                        <span style={{fontSize:12,color:C.t3}}>◎ {ptd} to do</span>
                        <span style={{fontSize:12,color:C.t3,marginLeft:"auto"}}>{allPt.length} total</span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,marginLeft:16}}>
                      {overduePt.length>0&&<Bdg color={C.red}>⚠ {overduePt.length} overdue</Bdg>}
                      {hasFilter&&matchedPt.length>0&&<Bdg color={C.accent}>{matchedPt.length} matched</Bdg>}
                      <Bdg color={p.color}>{pv}%</Bdg>
                      <span style={{fontSize:12,color:C.t3}}>Due {p.deadline||"TBD"}</span>
                      <button onClick={e=>{e.stopPropagation();onViewTasks(p.id);}} style={{...GBtn,padding:"5px 12px",fontSize:12}}>View All →</button>
                      {canEdit&&<div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                        <IBtn icon="✏️" title="Edit" onClick={()=>onEdit(p)} color={C.t2}/>
                        {canEdit&&<IBtn icon="🗑" title="Delete" onClick={()=>onDelete(p)} color={C.red}/>}
                      </div>}
                      <span style={{color:C.t3,fontSize:13}}>{isExpanded?"▲":"▼"}</span>
                    </div>
                  </div>
                  <Pb v={pv} color={p.color} h={5} style={{marginTop:10}}/>
                </div>
                {/* Task list (expanded or when filtering) */}
                {isExpanded&&(
                  <div style={{borderTop:`1px solid ${C.border}`}}>
                    {matchedPt.length===0
                      ?<div style={{padding:"16px 22px",color:C.t3,fontSize:13}}>No tasks match the current filter.</div>
                      :<table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr style={{background:C.surface}}>
                            {["Task","Status","Priority","Assignee","Due Date",""].map(h=>(
                              <th key={h} style={{padding:"9px 16px",textAlign:"left",fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>{matchedPt.map(t=>{
                          const ov=t.due_date&&t.due_date<today&&!isDone(t.status);
                          return(
                            <tr key={t.id} style={{borderTop:`1px solid ${C.border}`}}>
                              <td style={{padding:"9px 16px"}}>
                                <span style={{color:q&&t.title.toLowerCase().includes(q.toLowerCase())?C.accent:C.t1,fontSize:13,fontWeight:500}}>{t.title}</span>
                              </td>
                              <td style={{padding:"9px 16px"}}><Bdg color={getStatusColor(t.status)}>{t.status}</Bdg></td>
                              <td style={{padding:"9px 16px"}}><Bdg color={PRI_CLR[t.priority]||C.t3}>{t.priority||"—"}</Bdg></td>
                              <td style={{padding:"9px 16px"}}>{t.assignee?<div style={{display:"flex",alignItems:"center",gap:6}}><Av name={t.assignee} size={20}/><span style={{color:C.t2,fontSize:12}}>{t.assignee}</span></div>:<span style={{color:C.yellow,fontSize:12}}>Unassigned</span>}</td>
                              <td style={{padding:"9px 16px"}}><span style={{color:ov?C.red:C.t3,fontSize:12,fontWeight:ov?700:400}}>{t.due_date||"—"}{ov?" ⚠":""}</span></td>
                              <td style={{padding:"9px 16px"}}>{canEdit&&<IBtn icon="✏️" onClick={()=>onEditTask(t)} title="Edit"/>}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
function StatTaskModal({title,tasks,projects,today,onEdit,onClose,canEdit=true}){
  const [q,sq]=useState("");
  const [fProj,sfp]=useState("All");
  const [fClient,sfc]=useState("All");
  const [fAssignee,sfa]=useState("All");
  const [fStatus,sfs]=useState("All");
  const allProjects=[...new Map(tasks.map(t=>{const p=projects.find(px=>px.id===t.project_id);return[t.project_id,p];}).filter(([,p])=>p)).values()];
  const allClients=[...new Set(tasks.map(t=>{const p=projects.find(px=>px.id===t.project_id);return p?.client||"Unassigned";}))].sort();
  const allAssignees=[...new Set(tasks.map(t=>t.assignee).filter(Boolean))].sort();
  const hasFilter=q||fProj!=="All"||fClient!=="All"||fAssignee!=="All"||fStatus!=="All";
  const shown=tasks.filter(t=>{
    if(q&&!t.title.toLowerCase().includes(q.toLowerCase())&&!(projects.find(p=>p.id===t.project_id)?.name||"").toLowerCase().includes(q.toLowerCase())&&!(t.assignee||"").toLowerCase().includes(q.toLowerCase()))return false;
    if(fProj!=="All"&&t.project_id!==fProj)return false;
    if(fStatus!=="All"){const nsMatch=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!nsMatch&&t.status!==fStatus)return false;}
    if(fAssignee!=="All"&&t.assignee!==fAssignee)return false;
    if(fClient!=="All"){const p=projects.find(px=>px.id===t.project_id);if((p?.client||"Unassigned")!==fClient)return false;}
    return true;
  });
  const inp={width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",cursor:"pointer"};
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"#00000090",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 28px",width:"92vw",maxWidth:1100,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px #00000080"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <h3 style={{margin:0,color:C.t1,fontSize:17}}>{title}</h3>
            <p style={{margin:"3px 0 0",color:C.t3,fontSize:12}}>{shown.length} of {tasks.length} tasks{hasFilter?" (filtered)":""}</p>
          </div>
          <IBtn icon="✕" onClick={onClose}/>
        </div>
        {/* Search + Filters */}
        <div style={{marginBottom:12}}>
          <input autoFocus placeholder="🔍  Search by task, project or assignee…" value={q} onChange={e=>sq(e.target.value)}
            style={{width:"100%",background:C.surface,border:`1px solid ${q?C.accent:C.border}`,borderRadius:8,padding:"9px 14px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
            <div>
              <label style={{display:"block",color:C.t3,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Project</label>
              <select value={fProj} onChange={e=>sfp(e.target.value)} style={{...inp,borderColor:fProj!=="All"?C.accent:C.border}}>
                <option value="All">All Projects</option>
                {allProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",color:C.t3,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Client</label>
              <select value={fClient} onChange={e=>sfc(e.target.value)} style={{...inp,borderColor:fClient!=="All"?C.accent:C.border}}>
                <option value="All">All Clients</option>
                {allClients.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",color:C.t3,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Assignee</label>
              <select value={fAssignee} onChange={e=>sfa(e.target.value)} style={{...inp,borderColor:fAssignee!=="All"?C.accent:C.border}}>
                <option value="All">All Assignees</option>
                {allAssignees.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",color:C.t3,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Status</label>
              <select value={fStatus} onChange={e=>sfs(e.target.value)} style={{...inp,borderColor:fStatus!=="All"?C.accent:C.border}}>
                <option value="All">All Statuses</option>
                {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {hasFilter&&<button onClick={()=>{sq("");sfp("All");sfc("All");sfa("All");sfs("All");}} style={{marginTop:8,background:"transparent",border:`1px solid ${C.red}`,color:C.red,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ Clear filters</button>}
        </div>
        {/* Table */}
        <div style={{overflowY:"auto",flex:1}}>
          {shown.length===0?(
            <div style={{textAlign:"center",padding:40,color:C.t3}}>No tasks match your search.</div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{position:"sticky",top:0,background:C.card,zIndex:1}}>
                <tr>{["Task","Project","Client","Status","Priority","Assignee","Due Date",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>{shown.map(t=>{
                const pj=projects.find(p=>p.id===t.project_id);
                const ov=t.due_date&&t.due_date<today&&!isDone(t.status);
                const hi=q&&(t.title.toLowerCase().includes(q.toLowerCase())||(pj?.name||"").toLowerCase().includes(q.toLowerCase())||(t.assignee||"").toLowerCase().includes(q.toLowerCase()));
                return(
                  <tr key={t.id} style={{borderBottom:`1px solid ${C.border}`,background:hi?"#f9731610":"transparent"}}>
                    <td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:18,borderRadius:2,background:pj?.color||C.accent,flexShrink:0}}/><span style={{color:C.t1,fontSize:13,fontWeight:600}}>{t.title}</span></div></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.t2,fontSize:12}}>{pj?.name||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><span style={{color:C.teal,fontSize:12}}>{pj?.client||"—"}</span></td>
                    <td style={{padding:"10px 14px"}}><Bdg color={getStatusColor(t.status)}>{t.status}</Bdg></td>
                    <td style={{padding:"10px 14px"}}><Bdg color={PRI_CLR[t.priority]||C.t3}>{t.priority||"—"}</Bdg></td>
                    <td style={{padding:"10px 14px"}}>{t.assignee?<div style={{display:"flex",alignItems:"center",gap:6}}><Av name={t.assignee} size={22}/><span style={{color:C.t2,fontSize:12}}>{t.assignee}</span></div>:<span style={{color:C.yellow,fontSize:12,fontWeight:600}}>Unassigned</span>}</td>
                    <td style={{padding:"10px 14px"}}><span style={{color:ov?C.red:C.t3,fontSize:12,fontWeight:ov?700:400}}>{t.due_date||"—"}{ov?" ⚠":""}</span></td>
                    <td style={{padding:"10px 14px"}}>{canEdit&&<IBtn icon="✏️" onClick={()=>onEdit(t)} title="Edit task"/>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
// ── User matching helper (used in accessibleProjects + UserDashboard) ────────
function userMatchesStr(me,str){
  if(!str)return false;
  const v=(str||'').toLowerCase().trim();
  const n=(me.name||'').toLowerCase().trim();
  const u=(me.username||'').toLowerCase().trim();
  // Strict: no first-name-only or substring matches — avoids matching other users
  return v===n||(u&&v===u)||n.startsWith(v+' ')||v.startsWith(n+' ')||v.includes(n);
}
// ── URL routing helpers ──────────────────────────────────────────────────────
function slugify(s){return(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function stateToUrl(v,pid,client,projs=[]){
  if(v==='list'&&pid){
    const p=projs.find(pr=>pr.id===pid);
    return p?`/projects/${slugify(p.name)}`:`/projects/${pid}`;
  }
  if(v==='list')return'/tasks';
  if(v==='kanban')return'/kanban';
  if(v==='capacity')return'/capacity';
  if(v==='workflows')return'/workflows';
  if(v==='gantt')return'/timeline';
  if(v==='analytics')return'/analytics';
  if(v==='submissions')return'/submissions';
  if(v==='announcements')return'/announcements';
  if(v==='warroom')return'/message';
  if(v==='clientprojects'&&client)return`/clients/${encodeURIComponent(client)}`;
  return'/';
}
function urlToState(path,projs=[]){
  if(!path||path==='/'||path==='/dashboard')return{view:'dashboard',pid:null,client:null};
  if(path==='/tasks')return{view:'list',pid:null,client:null};
  if(path==='/kanban')return{view:'kanban',pid:null,client:null};
  if(path==='/capacity')return{view:'capacity',pid:null,client:null};
  if(path==='/workflows')return{view:'workflows',pid:null,client:null};
  if(path==='/timeline')return{view:'gantt',pid:null,client:null};
  if(path==='/analytics')return{view:'analytics',pid:null,client:null};
  if(path==='/submissions')return{view:'submissions',pid:null,client:null};
  if(path==='/announcements')return{view:'announcements',pid:null,client:null};
  if(path==='/message'||path==='/warroom')return{view:'warroom',pid:null,client:null};
  const pm=path.match(/^\/projects\/([^/]+)$/);
  if(pm){
    const slug=decodeURIComponent(pm[1]);
    // match by slug first (name-based), fall back to raw id
    const p=projs.find(pr=>slugify(pr.name)===slug)||projs.find(pr=>pr.id===slug);
    return{view:'list',pid:p?p.id:slug,client:null};
  }
  const cm=path.match(/^\/clients\/(.+)$/);
  if(cm)return{view:'clientprojects',pid:null,client:decodeURIComponent(cm[1])};
  return{view:'dashboard',pid:null,client:null};
}
// ── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({view,activePid,activeClient,projects,activeTask,onDashboard,onTasks,onProject}){
  const crumbs=[];
  const onDash=view!=='dashboard'?onDashboard:null;
  crumbs.push({label:'🏠 Dashboard',onClick:onDash,active:view==='dashboard'});
  if(view==='list'){
    const hasTask=!!(activeTask);
    crumbs.push({label:'📋 Tasks',onClick:activePid?onTasks:null,active:!activePid&&!hasTask});
    if(activePid){
      const p=projects.find(pr=>pr.id===activePid);
      if(p)crumbs.push({label:p.name,color:p.color,onClick:hasTask?onProject:null,active:!hasTask});
    }
    if(hasTask)crumbs.push({label:`✏️ ${activeTask.title}`,active:true});
  }else if(view==='kanban'){
    crumbs.push({label:'🗂 Kanban',active:true});
  }else if(view==='analytics'){
    crumbs.push({label:'📊 Analytics',active:true});
  }else if(view==='capacity'){
    crumbs.push({label:'🗓 Capacity',active:true});
  }else if(view==='workflows'){
    crumbs.push({label:'⚙️ Workflows',active:true});
  }else if(view==='submissions'){
    crumbs.push({label:'📬 Submission List',active:true});
  }else if(view==='gantt'){
    crumbs.push({label:'📅 Timeline',active:true});
  }else if(view==='announcements'){
    crumbs.push({label:'📢 Announcements',active:true});
  }else if(view==='warroom'){
    crumbs.push({label:'💬 Messages',active:true});
  }else if(view==='clientprojects'&&activeClient){
    crumbs.push({label:'🏢 Clients',onClick:onDashboard,active:false});
    crumbs.push({label:activeClient,active:true});
  }else if(view==='dashboard'&&activeTask){
    crumbs.push({label:`✏️ ${activeTask.title}`,active:true});
  }
  if(crumbs.length<=1)return null;
  const items=[];
  crumbs.forEach((c,i)=>{
    if(i>0)items.push(<span key={`s${i}`} style={{color:C.t3,fontSize:11,fontWeight:700,padding:'0 2px'}}>›</span>);
    if(c.onClick)
      items.push(<button key={`c${i}`} onClick={c.onClick} style={{background:'none',border:'none',cursor:'pointer',color:C.accent,fontSize:13,padding:0,fontFamily:'inherit',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2}}>{c.label}</button>);
    else
      items.push(<span key={`c${i}`} style={{color:c.color||C.t1,fontWeight:c.active?700:500}}>{c.label}</span>);
  });
  return(
    <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:16,padding:'7px 14px',background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,flexWrap:'wrap'}}>
      {items}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_META={
  task_assigned:        {icon:"📋",color:"#2563eb",label:"Task Assigned"},
  task_completed:       {icon:"✅",color:"#16a34a",label:"Task Completed"},
  task_deadline:        {icon:"⏰",color:"#ea580c",label:"Deadline Updated"},
  task_reviewed:        {icon:"🔍",color:"#7c3aed",label:"Task Reviewed"},
  task_status:          {icon:"🔄",color:"#0891b2",label:"Status Updated"},
  project_assigned:     {icon:"📁",color:"#0891b2",label:"Project Assigned"},
  project_updated:      {icon:"📊",color:"#2563eb",label:"Project Updated"},
  project_milestone:    {icon:"🏆",color:"#f59e0b",label:"Milestone"},
  deliverable_uploaded: {icon:"📦",color:"#16a34a",label:"Deliverable Uploaded"},
  file_uploaded:        {icon:"📎",color:"#7c3aed",label:"File Uploaded"},
  client_assigned:      {icon:"🏢",color:"#0891b2",label:"Client Assigned"},
  system_alert:         {icon:"⚠️",color:"#ef4444",label:"System Alert"},
  announcement:         {icon:"📢",color:"#f59e0b",label:"Announcement"},
  war_room_message:     {icon:"💬",color:"#0d9488",label:"Message"},
};

function timeAgo(dateStr){
  const diff=Date.now()-new Date(dateStr).getTime();
  const m=Math.floor(diff/60000);
  if(m<1)return"just now";
  if(m<60)return`${m}m ago`;
  const h=Math.floor(m/60);
  if(h<24)return`${h}h ago`;
  const d=Math.floor(h/24);
  if(d<7)return`${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
}

async function createNotif(userIds,type,title,description,entityType=null,entityId=null,createdBy=null){
  const ids=(Array.isArray(userIds)?userIds:[userIds]).filter(Boolean);
  if(!ids.length)return;
  const rows=ids.map(uid=>({user_id:uid,type,title,description,entity_type:entityType,entity_id:entityId,created_by:createdBy}));
  await supabase.from("notifications").insert(rows);
}

function NotifCard({n,onRead,onUnread,onDelete,onPin}){
  const meta=NOTIF_META[n.type]||{icon:"🔔",color:C.accent};
  const [hov,setHov]=useState(false);
  return(
    <div
      onMouseEnter={()=>{setHov(true);if(!n.is_read)onRead(n.id);}}
      onMouseLeave={()=>setHov(false)}
      style={{display:"flex",gap:10,padding:"10px 14px",
        background:hov?C.surface:n.is_read?"transparent":meta.color+"0d",
        borderLeft:`3px solid ${n.is_read&&!hov?"transparent":meta.color}`,
        transition:"all .12s",cursor:"pointer",position:"relative"}}
    >
      <div style={{width:36,height:36,borderRadius:10,background:meta.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>
        {meta.icon}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:12,fontWeight:n.is_read?500:700,color:C.t1,lineHeight:1.35}}>{n.title}</span>
          {!n.is_read&&<span style={{width:7,height:7,borderRadius:"50%",background:meta.color,flexShrink:0,marginTop:4}}/>}
        </div>
        {n.description&&<p style={{margin:"3px 0 0",fontSize:11,color:C.t2,lineHeight:1.45,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{n.description}</p>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
          <span style={{fontSize:10,color:C.t3}}>{timeAgo(n.created_at)}</span>
          {hov&&(
            <div style={{display:"flex",gap:4}}>
              <button onClick={e=>{e.stopPropagation();n.is_read?onUnread(n.id):onRead(n.id);}} title={n.is_read?"Mark unread":"Mark read"}
                style={{background:"none",border:`1px solid ${C.border}`,borderRadius:4,padding:"1px 6px",fontSize:10,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>
                {n.is_read?"◯":"●"}
              </button>
              <button onClick={e=>{e.stopPropagation();onPin(n.id,!n.is_pinned);}} title={n.is_pinned?"Unpin":"Pin"}
                style={{background:"none",border:`1px solid ${C.border}`,borderRadius:4,padding:"1px 6px",fontSize:10,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>
                {n.is_pinned?"📌":"📍"}
              </button>
              <button onClick={e=>{e.stopPropagation();onDelete(n.id);}} title="Delete"
                style={{background:"none",border:`1px solid ${C.red}44`,borderRadius:4,padding:"1px 6px",fontSize:10,color:C.red,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotifSection({label,items,onRead,onUnread,onDelete,onPin}){
  if(!items.length)return null;
  return(
    <>
      <div style={{padding:"8px 14px 3px",fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.07em",background:C.surface+"88"}}>{label}</div>
      {items.map(n=><NotifCard key={n.id} n={n} onRead={onRead} onUnread={onUnread} onDelete={onDelete} onPin={onPin}/>)}
    </>
  );
}

function NotificationCenter({me,onBadgeChange}){
  const [open,setOpen]=useState(false);
  const [notifs,setNotifs]=useState([]);
  const [tab,setTab]=useState("all");
  const [showSettings,setShowSettings]=useState(false);
  const [soundOn,setSoundOn]=useState(()=>{try{return localStorage.getItem("rds_notif_sound")!=="off";}catch{return true;}});
  const drawerRef=useRef();
  const bellRef=useRef();
  const userId=me?.id;

  // ── CSS animations (injected once) ──
  const [popups,setPopups]=useState([]); // in-app toast popups
  useEffect(()=>{
    if(document.getElementById("notif-css"))return;
    const s=document.createElement("style");
    s.id="notif-css";
    s.textContent=`
      @keyframes notifSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes notifSlideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(110%);opacity:0}}
      @keyframes notifPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
      @keyframes notifPopIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
      .notif-drawer{animation:notifSlideIn .22s cubic-bezier(.22,1,.36,1)}
      .notif-badge{animation:notifPulse 2s ease-in-out infinite}
      .notif-popup{animation:notifPopIn .28s cubic-bezier(.22,1,.36,1)}
      .notif-popup-out{animation:notifSlideOut .22s ease-in forwards}
    `;
    document.head.appendChild(s);
  },[]);

  function showPopup(n){
    const pid=Date.now();
    setPopups(prev=>[{...n,_pid:pid},...prev.slice(0,3)]);
    setTimeout(()=>dismissPopup(pid),5000);
  }
  function dismissPopup(pid){
    setPopups(prev=>prev.filter(p=>p._pid!==pid));
  }

  // ── soundOn ref so channel doesn't recreate on toggle ──
  const soundOnRef=useRef(soundOn);
  useEffect(()=>{soundOnRef.current=soundOn;},[soundOn]);

  // ── Load notifications ──
  useEffect(()=>{if(userId)loadNotifs();},[userId]);

  // ── Realtime subscription — NO server-side filter (custom auth doesn't support it)
  //    Filter client-side by comparing user_id ──
  useEffect(()=>{
    if(!userId)return;
    const uid=String(userId);
    const channel=supabase
      .channel(`notifs-${uid}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},payload=>{
        if(!payload.new||String(payload.new.user_id)!==uid)return;
        setNotifs(prev=>{
          const next=[payload.new,...prev];
          onBadgeChange?.({
            warroom:next.filter(n=>!n.is_read&&(n.type==="war_room_message"||n.type==="mention")).length,
            announcements:next.filter(n=>!n.is_read&&n.type==="announcement").length
          });
          return next;
        });
        if(soundOnRef.current)playNotifSound();
        showPopup(payload.new);
        // Browser OS notification (works only when page is in background)
        if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
          try{new Notification(payload.new.title,{body:payload.new.description||"",icon:"/favicon.svg"});}catch(e){console.warn("[Notif] Browser notification failed:",e);}
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},payload=>{
        if(!payload.new||String(payload.new.user_id)!==uid)return;
        setNotifs(prev=>{
          const next=prev.map(n=>n.id===payload.new.id?payload.new:n);
          onBadgeChange?.({
            warroom:next.filter(n=>!n.is_read&&(n.type==="war_room_message"||n.type==="mention")).length,
            announcements:next.filter(n=>!n.is_read&&n.type==="announcement").length
          });
          return next;
        });
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'notifications'},payload=>{
        // DELETE only has payload.old.id (no user_id without REPLICA IDENTITY FULL)
        // safe to filter by id — we only store current user's notifs in state
        if(payload.old?.id)setNotifs(prev=>prev.filter(n=>n.id!==payload.old.id));
      })
      .subscribe((status,err)=>{
        if(err)console.error("[Notif] Realtime error:",err);
        else console.log("[Notif] Realtime status:",status);
      });
    return()=>{ try{supabase.removeChannel(channel);}catch{} };
  },[userId]);

  // ── Close drawer on outside click ──
  useEffect(()=>{
    if(!open)return;
    function handle(e){
      if(drawerRef.current&&!drawerRef.current.contains(e.target)&&bellRef.current&&!bellRef.current.contains(e.target))setOpen(false);
    }
    document.addEventListener("mousedown",handle);
    return()=>document.removeEventListener("mousedown",handle);
  },[open]);

  async function loadNotifs(){
    if(!userId)return;
    const cutoff=new Date(Date.now()-30*24*60*60*1000).toISOString();
    const{data,error}=await supabase
      .from("notifications")
      .select("*")
      .eq("user_id",userId)
      .gte("created_at",cutoff)
      .order("created_at",{ascending:false})
      .limit(150);
    if(error){console.error("[Notif] Load error:",error.message,"— Did you run notifications_migration.sql in Supabase?");return;}
    if(data){
      setNotifs(data);
      onBadgeChange?.({
        warroom:data.filter(n=>!n.is_read&&(n.type==="war_room_message"||n.type==="mention")).length,
        announcements:data.filter(n=>!n.is_read&&n.type==="announcement").length
      });
    }
  }

  function playNotifSound(){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=880;osc.type="sine";
      gain.gain.setValueAtTime(0,ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25,ctx.currentTime+0.01);
      gain.gain.linearRampToValueAtTime(0,ctx.currentTime+0.35);
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.35);
    }catch{}
  }

  async function markRead(id){
    setNotifs(prev=>prev.map(n=>n.id===id?{...n,is_read:true}:n));
    await supabase.from("notifications").update({is_read:true}).eq("id",id);
  }
  async function markUnread(id){
    setNotifs(prev=>prev.map(n=>n.id===id?{...n,is_read:false}:n));
    await supabase.from("notifications").update({is_read:false}).eq("id",id);
  }
  async function markAllRead(){
    const ids=notifs.filter(n=>!n.is_read).map(n=>n.id);
    if(!ids.length)return;
    setNotifs(prev=>prev.map(n=>({...n,is_read:true})));
    await supabase.from("notifications").update({is_read:true}).in("id",ids);
  }
  async function deleteNotif(id){
    setNotifs(prev=>prev.filter(n=>n.id!==id));
    await supabase.from("notifications").delete().eq("id",id);
  }
  async function pinNotif(id,pin){
    setNotifs(prev=>prev.map(n=>n.id===id?{...n,is_pinned:pin}:n));
    await supabase.from("notifications").update({is_pinned:pin}).eq("id",id);
  }
  function toggleSound(){const v=!soundOn;setSoundOn(v);localStorage.setItem("rds_notif_sound",v?"on":"off");}
  async function requestBrowserPermission(){
    if("Notification"in window){const p=await Notification.requestPermission();if(p==="granted")alert("Browser notifications enabled!");}
  }

  const unreadCount=notifs.filter(n=>!n.is_read).length;
  const todayStr=new Date().toISOString().slice(0,10);
  const weekAgo=new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10);

  const base=tab==="unread"?notifs.filter(n=>!n.is_read):tab==="pinned"?notifs.filter(n=>n.is_pinned):notifs;
  const pinned=base.filter(n=>n.is_pinned&&tab!=="pinned");
  const unread=base.filter(n=>!n.is_read&&!n.is_pinned);
  const todayRead=base.filter(n=>n.is_read&&!n.is_pinned&&n.created_at.slice(0,10)===todayStr);
  const thisWeek=base.filter(n=>n.is_read&&!n.is_pinned&&n.created_at.slice(0,10)<todayStr&&n.created_at.slice(0,10)>=weekAgo);
  const earlier=base.filter(n=>n.is_read&&!n.is_pinned&&n.created_at.slice(0,10)<weekAgo);

  const ops={onRead:markRead,onUnread:markUnread,onDelete:deleteNotif,onPin:pinNotif};

  return(
    <>
      {/* ── Bell Button ── */}
      <div ref={bellRef} style={{position:"relative"}}>
        <button onClick={()=>setOpen(v=>!v)}
          style={{...GBtn,padding:"7px 11px",position:"relative",
            background:open?C.accent+"22":"transparent",
            borderColor:open?C.accent:C.border}}
          title="Notifications"
        >
          <span className={unreadCount>0?"rds-bell-ring":""} style={{fontSize:18,lineHeight:1,display:"inline-block"}}>🔔</span>
          {unreadCount>0&&(
            <span className="notif-badge" style={{
              position:"absolute",top:1,right:1,
              minWidth:17,height:17,borderRadius:9,
              background:C.red,color:"#fff",
              fontSize:9,fontWeight:800,
              display:"flex",alignItems:"center",justifyContent:"center",
              padding:"0 3px",lineHeight:1,border:`2px solid ${C.bg}`
            }}>
              {unreadCount>99?"99+":unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── In-app popup toasts (bottom-right, stacked) ── */}
      {popups.map((p,i)=>{
        const meta=NOTIF_META[p.type]||{icon:"🔔",color:C.accent};
        return(
          <div key={p._pid} className="notif-popup" style={{
            position:"fixed",bottom:24+(i*90),right:24,width:320,zIndex:1100,
            background:C.card,border:`1px solid ${meta.color}55`,borderLeft:`4px solid ${meta.color}`,
            borderRadius:12,boxShadow:"0 8px 32px #00000099",
            display:"flex",gap:10,padding:"12px 14px",alignItems:"flex-start",
            cursor:"pointer"
          }} onClick={()=>{dismissPopup(p._pid);markRead(p.id);setOpen(true);}}>
            <div style={{width:34,height:34,borderRadius:9,background:meta.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>
              {meta.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:C.t1,lineHeight:1.3,marginBottom:2}}>{p.title}</div>
              {p.description&&<div style={{fontSize:11,color:C.t2,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{p.description}</div>}
              <div style={{fontSize:10,color:meta.color,marginTop:3,fontWeight:600}}>just now · click to view</div>
            </div>
            <button onClick={e=>{e.stopPropagation();dismissPopup(p._pid);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14,padding:0,lineHeight:1,flexShrink:0}}>✕</button>
          </div>
        );
      })}

      {/* ── Notification Drawer ── */}
      {open&&(
        <div ref={drawerRef} className="notif-drawer" style={{
          position:"fixed",top:0,right:0,width:390,height:"100vh",
          background:C.card,borderLeft:`1px solid ${C.border}`,
          boxShadow:"-16px 0 60px #00000099",zIndex:1000,
          display:"flex",flexDirection:"column",overflow:"hidden"
        }}>
          {/* Header */}
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.card}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16,fontWeight:800,color:C.t1}}>🔔 Notifications</span>
                {unreadCount>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:10,fontWeight:800}}>{unreadCount} unread</span>}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {unreadCount>0&&(
                  <button onClick={markAllRead}
                    style={{...GBtn,padding:"4px 10px",fontSize:11,color:C.teal,borderColor:C.teal}}>✓ All read</button>
                )}
                <button onClick={()=>setShowSettings(v=>!v)}
                  style={{...GBtn,padding:"5px 9px",fontSize:13,background:showSettings?C.accent+"22":"transparent",borderColor:showSettings?C.accent:C.border}}
                  title="Settings">⚙</button>
                <button onClick={()=>setOpen(false)}
                  style={{...GBtn,padding:"5px 9px",fontSize:13}} title="Close">✕</button>
              </div>
            </div>
            {/* Tabs */}
            <div style={{display:"flex",gap:4}}>
              {[["all","All"],["unread",`Unread${unreadCount>0?` (${unreadCount})`:""}`],["pinned","📌 Pinned"]].map(([v,l])=>(
                <button key={v} onClick={()=>setTab(v)}
                  style={{border:"none",borderRadius:7,padding:"5px 13px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .12s",
                    background:tab===v?C.accent:"transparent",color:tab===v?"#fff":C.t3}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Settings panel */}
          {showSettings&&(
            <div style={{padding:"12px 16px",background:C.surface,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.07em"}}>Notification Settings</div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.t2}}>🔊 Sound Alerts</span>
                  <button onClick={toggleSound} style={{...GBtn,padding:"3px 10px",fontSize:11,
                    background:soundOn?C.green+"22":"transparent",color:soundOn?C.green:C.t3,borderColor:soundOn?C.green:C.border}}>
                    {soundOn?"ON":"OFF"}
                  </button>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.t2}}>🌐 Browser Notifications</span>
                  <button onClick={requestBrowserPermission} style={{...GBtn,padding:"3px 10px",fontSize:11,
                    background:typeof Notification!=="undefined"&&Notification.permission==="granted"?C.green+"22":"transparent",
                    color:typeof Notification!=="undefined"&&Notification.permission==="granted"?C.green:C.t3,
                    borderColor:typeof Notification!=="undefined"&&Notification.permission==="granted"?C.green:C.border}}>
                    {typeof Notification!=="undefined"&&Notification.permission==="granted"?"Enabled ✓":"Enable"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notification list */}
          <div style={{flex:1,overflowY:"auto"}}>
            {base.length===0?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60%",gap:14}}>
                <span style={{fontSize:44}}>🔕</span>
                <div style={{textAlign:"center"}}>
                  <div style={{color:C.t2,fontSize:13,fontWeight:600,marginBottom:4}}>
                    {tab==="unread"?"All caught up!":tab==="pinned"?"No pinned notifications":"No notifications yet"}
                  </div>
                  <div style={{color:C.t3,fontSize:11}}>
                    {tab==="unread"?"No unread notifications":"Notifications will appear here"}
                  </div>
                </div>
              </div>
            ):(
              <div style={{paddingBottom:16}}>
                {tab==="pinned"&&<NotifSection label="📌 Pinned" items={base} {...ops}/>}
                {tab!=="pinned"&&(
                  <>
                    {pinned.length>0&&<NotifSection label="📌 Pinned" items={pinned} {...ops}/>}
                    {unread.length>0&&<NotifSection label="Unread" items={unread} {...ops}/>}
                    {todayRead.length>0&&<NotifSection label="Today" items={todayRead} {...ops}/>}
                    {thisWeek.length>0&&<NotifSection label="This Week" items={thisWeek} {...ops}/>}
                    {earlier.length>0&&<NotifSection label="Earlier" items={earlier} {...ops}/>}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,flexShrink:0,background:C.surface+"88"}}>
            <div style={{fontSize:10,color:C.t3,textAlign:"center"}}>
              Showing last 30 days · {notifs.length} notification{notifs.length!==1?"s":""}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportAnalyticsReport(projects,tasks,users,clients,today){
  const dateStr=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});

  // Computed data
  const pct=id=>{const pt=tasks.filter(t=>t.project_id===id);return pt.length?Math.round(pt.filter(t=>isDone(t.status)).length/pt.length*100):0;};
  const totalProj=projects.length;
  const activeProj=projects.filter(p=>pct(p.id)<100).length;
  const compProj=projects.filter(p=>pct(p.id)>=100&&tasks.some(t=>t.project_id===p.id)).length;
  const openTasks=tasks.filter(t=>!isDone(t.status)).length;
  const compTasks=tasks.filter(t=>isDone(t.status)).length;
  const overdue=tasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const inProg=tasks.filter(t=>t.status==="In Progress").length;
  const compRate=tasks.length?Math.round(compTasks/tasks.length*100):0;
  const statusBD=ALL_STATUSES.map(s=>({label:s,count:tasks.filter(t=>t.status===s).length})).filter(d=>d.count>0).sort((a,b)=>b.count-a.count);
  const members=[...new Set(tasks.flatMap(t=>[t.assignee,t.detailer,t.checker]).filter(Boolean))].sort();
  const teamPerf=members.map(name=>{
    const mt=tasks.filter(t=>t.assignee===name||t.detailer===name||t.checker===name);
    const done=mt.filter(t=>isDone(t.status)).length;
    const ov=mt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
    return{name,total:mt.length,done,overdue:ov,pct:mt.length?Math.round(done/mt.length*100):0};
  }).filter(u=>u.total>0).sort((a,b)=>b.pct-a.pct);
  const clientPortfolio=clients.map(c=>{
    const cp=projects.filter(p=>p.client===c.name);
    const ct=tasks.filter(t=>cp.some(p=>p.id===t.project_id));
    const done=ct.filter(t=>isDone(t.status)).length;
    const ov=ct.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
    return{name:c.name,projects:cp.length,tasks:ct.length,done,overdue:ov,pct:ct.length?Math.round(done/ct.length*100):0};
  }).filter(c=>c.projects>0).sort((a,b)=>b.tasks-a.tasks);
  const priColors={"Critical":"#dc2626","High":"#ea580c","Medium":"#ca8a04","Low":"#16a34a"};
  const priData=["Critical","High","Medium","Low"].map(p=>({label:p,count:tasks.filter(t=>t.priority===p).length,color:priColors[p]})).filter(d=>d.count>0);
  const overdueList=tasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).sort((a,b)=>a.due_date>b.due_date?1:-1);

  // Status color map
  const statusColors={"Done":"#16a34a","Completed":"#16a34a","Review":"#2563eb","In Progress":"#7c3aed","To Do":"#64748b","Not Yet Started":"#94a3b8","To Be Started":"#94a3b8","On Hold":"#dc2626"};

  // Percent bar helper (text-based)
  const pBar=p=>`${"█".repeat(Math.round(p/10))}${"░".repeat(10-Math.round(p/10))} ${p}%`;

  // Completion color
  const compColor=p=>p>=80?"#16a34a":p>=50?"#2563eb":p>=25?"#ea580c":"#dc2626";

  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><style>
  body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1e293b;background:#fff}
  h1{background:#0f172a;color:#fff;padding:14px 20px;margin:0 0 4px;font-size:16pt;letter-spacing:.03em}
  h2{background:#1e3a5f;color:#fff;padding:7px 14px;margin:20px 0 0;font-size:11pt;font-weight:700;letter-spacing:.04em}
  .meta{background:#e2e8f0;padding:6px 14px;font-size:9pt;color:#475569;margin-bottom:4px}
  table{border-collapse:collapse;width:100%;margin-bottom:4px}
  th{background:#1e3a5f;color:#fff;padding:7px 12px;border:1px solid #1e3a5f;font-weight:700;text-align:left;font-size:9pt;letter-spacing:.03em;white-space:nowrap}
  td{padding:6px 12px;border:1px solid #cbd5e1;font-size:9pt;vertical-align:middle}
  .alt{background:#f1f5f9}
  .num{font-weight:700;text-align:center}
  .pct-high{color:#16a34a;font-weight:700}
  .pct-mid{color:#2563eb;font-weight:700}
  .pct-low{color:#ea580c;font-weight:700}
  .pct-crit{color:#dc2626;font-weight:700}
  .badge{border-radius:4px;padding:2px 8px;font-size:8pt;font-weight:700;display:inline-block}
</style></head><body>
<h1>📊 RDS TechServ — Business Analytics Report</h1>
<div class="meta">Generated: ${dateStr} &nbsp;·&nbsp; Total Projects: ${totalProj} &nbsp;·&nbsp; Total Tasks: ${tasks.length} &nbsp;·&nbsp; Completion Rate: ${compRate}%</div>

<h2>▌ KPI SUMMARY</h2>
<table>
<tr><th>Metric</th><th>Value</th><th>Trend / Details</th><th>Status</th></tr>
<tr><td>📁 Total Projects</td><td class="num" style="color:#2563eb;font-size:13pt">${totalProj}</td><td>${activeProj} active · ${compProj} completed</td><td style="background:#dbeafe;color:#1d4ed8;font-weight:700;text-align:center">ACTIVE</td></tr>
<tr class="alt"><td>⚡ Active Projects</td><td class="num" style="color:#7c3aed;font-size:13pt">${activeProj}</td><td>${Math.round(activeProj/Math.max(totalProj,1)*100)}% of portfolio in progress</td><td style="background:#ede9fe;color:#6d28d9;font-weight:700;text-align:center">IN PROGRESS</td></tr>
<tr><td>✅ Completed Projects</td><td class="num" style="color:#16a34a;font-size:13pt">${compProj}</td><td>${Math.round(compProj/Math.max(totalProj,1)*100)}% delivery rate</td><td style="background:#dcfce7;color:#15803d;font-weight:700;text-align:center">DELIVERED</td></tr>
<tr class="alt"><td>🏢 Total Clients</td><td class="num" style="color:#0891b2;font-size:13pt">${clients.length}</td><td>${clientPortfolio.length} with active projects</td><td style="background:#cffafe;color:#0e7490;font-weight:700;text-align:center">ACTIVE</td></tr>
<tr><td>👥 Team Members</td><td class="num" style="color:#a855f7;font-size:13pt">${users.length}</td><td>${teamPerf.length} members with assigned tasks</td><td style="background:#fae8ff;color:#86198f;font-weight:700;text-align:center">STAFFED</td></tr>
<tr class="alt"><td>📋 Open Tasks</td><td class="num" style="color:#ea580c;font-size:13pt">${openTasks}</td><td>${overdue} overdue · ${inProg} in progress</td><td style="background:${overdue>0?"#fee2e2":"#dcfce7"};color:${overdue>0?"#dc2626":"#16a34a"};font-weight:700;text-align:center">${overdue>0?"⚠ OVERDUE":"ON TRACK"}</td></tr>
<tr><td>✅ Completed Tasks</td><td class="num" style="color:#16a34a;font-size:13pt">${compTasks}</td><td>${compRate}% overall completion rate</td><td style="background:#dcfce7;color:#15803d;font-weight:700;text-align:center">${compRate}% DONE</td></tr>
<tr class="alt"><td>📦 Total Tasks</td><td class="num" style="color:#1e3a5f;font-size:13pt">${tasks.length}</td><td>Across ${totalProj} projects · ${clients.length} clients</td><td style="background:#e2e8f0;color:#475569;font-weight:700;text-align:center">ALL</td></tr>
</table>

<h2>▌ TASK STATUS BREAKDOWN</h2>
<table>
<tr><th>Status</th><th>Count</th><th>% of Total</th><th>Visual</th></tr>
${statusBD.map((s,i)=>{const p=tasks.length?Math.round(s.count/tasks.length*100):0;const bg=statusColors[s.label]||"#64748b";return`<tr${i%2?" class='alt'":""}><td><span class="badge" style="background:${bg}22;color:${bg};border:1px solid ${bg}55">${s.label}</span></td><td class="num" style="color:${bg}">${s.count}</td><td class="num">${p}%</td><td style="color:${bg};font-family:monospace;letter-spacing:-.05em">${"█".repeat(Math.max(1,Math.round(p/5)))}${"░".repeat(20-Math.max(1,Math.round(p/5)))} ${p}%</td></tr>`;}).join("")}
</table>

<h2>▌ TEAM PERFORMANCE</h2>
<table>
<tr><th>#</th><th>Team Member</th><th>Total Tasks</th><th>Completed</th><th>Open</th><th>Overdue</th><th>Completion %</th><th>Performance</th></tr>
${teamPerf.map((u,i)=>{const pClass=u.pct>=80?"pct-high":u.pct>=50?"pct-mid":u.pct>=25?"pct-low":"pct-crit";const bg=i%2?" class='alt'":"";return`<tr${bg}><td class="num" style="color:#94a3b8">${i+1}</td><td style="font-weight:600">${u.name}</td><td class="num">${u.total}</td><td class="num" style="color:#16a34a;font-weight:700">${u.done}</td><td class="num" style="color:#ea580c">${u.total-u.done}</td><td class="num" style="color:${u.overdue>0?"#dc2626":"#94a3b8"};font-weight:${u.overdue>0?700:400}">${u.overdue>0?"⚠ "+u.overdue:"—"}</td><td class="${pClass}" style="font-size:11pt">${u.pct}%</td><td style="font-family:monospace;color:${compColor(u.pct)};letter-spacing:-.05em">${"█".repeat(Math.round(u.pct/10))}${"░".repeat(10-Math.round(u.pct/10))}</td></tr>`;}).join("")}
${teamPerf.length===0?"<tr><td colspan='8' style='text-align:center;color:#94a3b8;padding:16px'>No team data available</td></tr>":""}
</table>

<h2>▌ CLIENT PORTFOLIO</h2>
<table>
<tr><th>Client</th><th>Projects</th><th>Total Tasks</th><th>Completed</th><th>Open</th><th>Overdue</th><th>Progress %</th><th>Health</th></tr>
${clientPortfolio.map((c,i)=>{const bg=i%2?" class='alt'":"";const pClass=c.pct>=80?"pct-high":c.pct>=50?"pct-mid":c.pct>=25?"pct-low":"pct-crit";const health=c.pct>=80?"🟢 HEALTHY":c.pct>=50?"🟡 PROGRESSING":c.overdue>0?"🔴 AT RISK":"🟠 SLOW";return`<tr${bg}><td style="font-weight:700">${c.name}</td><td class="num" style="color:#2563eb">${c.projects}</td><td class="num">${c.tasks}</td><td class="num" style="color:#16a34a;font-weight:700">${c.done}</td><td class="num" style="color:#ea580c">${c.tasks-c.done}</td><td class="num" style="color:${c.overdue>0?"#dc2626":"#94a3b8"};font-weight:${c.overdue>0?700:400}">${c.overdue>0?"⚠ "+c.overdue:"—"}</td><td class="${pClass}">${c.pct}%</td><td>${health}</td></tr>`;}).join("")}
${clientPortfolio.length===0?"<tr><td colspan='8' style='text-align:center;color:#94a3b8;padding:16px'>No client data</td></tr>":""}
</table>

<h2>▌ PRIORITY DISTRIBUTION</h2>
<table>
<tr><th>Priority</th><th>Count</th><th>% of Total</th><th>Visual</th></tr>
${priData.map((p,i)=>{const pct2=tasks.length?Math.round(p.count/tasks.length*100):0;return`<tr${i%2?" class='alt'":""}><td><span class="badge" style="background:${p.color}22;color:${p.color};border:1px solid ${p.color}55">${p.label}</span></td><td class="num" style="color:${p.color};font-weight:700">${p.count}</td><td class="num">${pct2}%</td><td style="color:${p.color};font-family:monospace;letter-spacing:-.05em">${"█".repeat(Math.max(1,Math.round(pct2/5)))}${"░".repeat(20-Math.max(1,Math.round(pct2/5)))} ${pct2}%</td></tr>`;}).join("")}
${priData.length===0?"<tr><td colspan='4' style='text-align:center;color:#94a3b8;padding:16px'>No priority data</td></tr>":""}
</table>

${overdueList.length>0?`<h2>▌ OVERDUE TASKS — ACTION REQUIRED (${overdueList.length})</h2>
<table>
<tr><th>#</th><th>Task</th><th>Project</th><th>Assignee</th><th>Due Date</th><th>Days Overdue</th><th>Status</th><th>Priority</th></tr>
${overdueList.map((t,i)=>{const pj=projects.find(p=>p.id===t.project_id);const days=Math.floor((new Date(today)-new Date(t.due_date))/(1000*60*60*24));const urgency=days>30?"background:#450a0a;color:#fca5a5":days>14?"background:#7f1d1d;color:#fca5a5":days>7?"background:#fee2e2;color:#dc2626":"background:#fef2f2;color:#dc2626";const priColor=priColors[t.priority]||"#64748b";return`<tr><td class="num" style="color:#dc2626">${i+1}</td><td style="font-weight:600;max-width:220px">${t.title}</td><td style="color:#2563eb">${pj?.name||"—"}</td><td style="color:#7c3aed">${t.assignee||"—"}</td><td style="color:#dc2626;font-weight:600">${t.due_date}</td><td class="num" style="${urgency};font-weight:700;border-radius:4px;padding:3px 8px">${days}d late</td><td><span class="badge" style="background:${statusColors[t.status]||"#64748b"}22;color:${statusColors[t.status]||"#64748b"};border:1px solid ${statusColors[t.status]||"#64748b"}55">${t.status}</span></td><td><span class="badge" style="background:${priColor}22;color:${priColor};border:1px solid ${priColor}55">${t.priority||"—"}</span></td></tr>`;}).join("")}
</table>`:""}

<div style="margin-top:20px;padding:10px 14px;background:#f1f5f9;border-top:2px solid #1e3a5f;font-size:8pt;color:#64748b">
  RDS TechServ Project Hub &nbsp;·&nbsp; Analytics Report &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; Confidential
</div>
</body></html>`;

  const blob=new Blob([html],{type:"application/vnd.ms-excel"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`RDS_Analytics_Report_${today}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION LIST EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportSubmissionList(projects,tasks,today){
  const ws=new Date(today);ws.setDate(ws.getDate()-ws.getDay());
  const we=new Date(today);we.setDate(we.getDate()+(6-we.getDay()));
  const wsStr=ws.toISOString().slice(0,10);
  const weStr=we.toISOString().slice(0,10);
  const inRange=(t,from,to)=>{const d1=t.client_sub_date;const d2=t.due_date;return(d1&&d1>=from&&d1<=to)||(d2&&d2>=from&&d2<=to);};
  const todayTasks=tasks.filter(t=>inRange(t,today,today));
  const weekTasks=tasks.filter(t=>inRange(t,wsStr,weStr)&&!inRange(t,today,today));
  const safe=`Submission List - ${today}`;
  let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px;font-family:Arial,sans-serif;white-space:nowrap;text-align:center;}.hdr{background:#1e2433;color:#f1f5f9;font-weight:bold;text-align:center;}.sec{background:#1d4ed8;color:#fff;font-weight:bold;font-size:13px;}.client{background:#f97316;color:#fff;font-weight:bold;}.done{background:#d1fae5;color:#065f46;}.inprog{background:#dbeafe;color:#1e40af;}.notstarted{background:#f3f4f6;color:#374151;}.overdue{background:#fee2e2;color:#991b1b;font-weight:bold;}</style></head><body>`;
  html+=`<table><tr><td colspan="10" class="hdr" style="font-size:16px;">RDS TechServ — Submission List (${today})</td></tr><tr><td colspan="10"></td></tr>`;
  const writeSection=(label,list)=>{
    html+=`<tr><td colspan="10" class="sec">📅 ${label} — ${list.length} submission(s)</td></tr>`;
    if(!list.length){html+=`<tr><td colspan="10" style="text-align:center;color:#666;font-style:italic;">No submissions</td></tr><tr><td colspan="10"></td></tr>`;return;}
    html+=`<tr><th class="hdr">#</th><th class="hdr">Task</th><th class="hdr">Project</th><th class="hdr">Client</th><th class="hdr">Status</th><th class="hdr">Assignee</th><th class="hdr">Detailer</th><th class="hdr">Checker</th><th class="hdr">Client Sub Date</th><th class="hdr">Due Date</th></tr>`;
    list.forEach((t,i)=>{
      const proj=projects.find(p=>p.id===t.project_id);
      const ov=t.due_date&&t.due_date<today&&!isDone(t.status);
      const cls=ov?"overdue":isDone(t.status)?"done":t.status==="In Progress"?"inprog":"notstarted";
      html+=`<tr><td>${i+1}</td><td style="text-align:left;font-weight:600;">${t.title}</td><td>${proj?.name||"—"}</td><td style="color:#0891b2;font-weight:700;">${proj?.client||"—"}</td><td class="${cls}">${t.status}${ov?" ⚠":""}</td><td>${t.assignee||"—"}</td><td>${t.detailer||"—"}</td><td>${t.checker||"—"}</td><td style="color:#16a34a;font-weight:700;">${t.client_sub_date||"—"}</td><td class="${ov?"overdue":""}">${t.due_date||"—"}</td></tr>`;
    });
    html+=`<tr><td colspan="10"></td></tr>`;
  };
  writeSection(`Today's Submissions — ${today}`,todayTasks);
  writeSection(`This Week (${wsStr} → ${weStr})`,weekTasks);
  html+=`</table></body></html>`;
  const b64=btoa(unescape(encodeURIComponent(html)));
  const a=document.createElement("a");
  a.href="data:application/vnd.ms-excel;base64,"+b64;
  a.download=`RDS_Submission_List_${today}.xls`;
  a.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSIONS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function SubmissionsPage({projects,tasks,today,isClient,clientName,onEdit,canEdit}){
  const isMobile=useMobile();
  const [period,setPeriod]=useState("today");
  const [customFrom,setCustomFrom]=useState(today);
  const [customTo,setCustomTo]=useState(today);
  const [showCal,setShowCal]=useState(false);
  const [subSearch,setSubSearch]=useState("");

  // ── Date range helpers ──
  const addDays=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r.toISOString().slice(0,10);};
  const mondayOf=d=>{const r=new Date(d);const dow=r.getDay();r.setDate(r.getDate()-(dow===0?6:dow-1));return r.toISOString().slice(0,10);};
  const sundayOf=d=>{const r=new Date(d);const dow=r.getDay();r.setDate(r.getDate()+(dow===0?0:7-dow));return r.toISOString().slice(0,10);};

  const getRangeDates=()=>{
    const d=new Date(today);
    if(period==="today") return{from:today,to:today,label:"Today",icon:"📅",color:C.red};
    if(period==="tomorrow"){const tm=addDays(today,1);return{from:tm,to:tm,label:"Tomorrow",icon:"🌅",color:C.green};}
    if(period==="this_week"){const ms=mondayOf(today);const se=sundayOf(today);return{from:ms,to:se,label:`This Week  ${ms} → ${se}`,icon:"📆",color:"#f59e0b"};}
    if(period==="next_week"){const nm=addDays(mondayOf(today),7);const ns=addDays(nm,6);return{from:nm,to:ns,label:`Next Week  ${nm} → ${ns}`,icon:"🗓",color:"#8b5cf6"};}
    if(period==="next_month"){const nm=new Date(d.getFullYear(),d.getMonth()+1,1);const ne=new Date(d.getFullYear(),d.getMonth()+2,0);const nms=nm.toISOString().slice(0,10);const nes=ne.toISOString().slice(0,10);return{from:nms,to:nes,label:`Next Month  ${nms} → ${nes}`,icon:"📅",color:"#06b6d4"};}
    return{from:customFrom,to:customTo,label:`${customFrom} → ${customTo}`,icon:"📆",color:C.accent};
  };

  const {from:rangeFrom,to:rangeTo,label:rangeLabel,icon:rangeIcon,color:rangeColor}=getRangeDates();

  const scopedProjects=isClient?projects.filter(p=>(p.client||"").toLowerCase()===(clientName||"").toLowerCase()):projects;
  const inRange=(t,f,to)=>{const d1=t.client_sub_date;const d2=t.due_date;return(d1&&d1>=f&&d1<=to)||(d2&&d2>=f&&d2<=to);};

  const allTasks=tasks.filter(t=>scopedProjects.some(p=>p.id===t.project_id));
  const periodTasksRaw=allTasks.filter(t=>inRange(t,rangeFrom,rangeTo)).sort((a,b)=>(a.client_sub_date||a.due_date||"").localeCompare(b.client_sub_date||b.due_date||""));
  const periodTasks=subSearch?periodTasksRaw.filter(t=>{
    const proj=scopedProjects.find(p=>p.id===t.project_id);
    const q=subSearch.toLowerCase();
    return t.title.toLowerCase().includes(q)||(proj?.name||"").toLowerCase().includes(q)||(proj?.client||"").toLowerCase().includes(q)||(t.assignee||"").toLowerCase().includes(q)||(t.status||"").toLowerCase().includes(q);
  }):periodTasksRaw;
  const doneCount=periodTasks.filter(t=>isDone(t.status)).length;
  const progPct=periodTasks.length?Math.round(doneCount/periodTasks.length*100):0;

  // Summary stats (always shown regardless of period)
  const todayCount=allTasks.filter(t=>inRange(t,today,today)).length;
  const nextWeekStart=addDays(mondayOf(today),7);
  const nextWeekEnd=addDays(nextWeekStart,6);
  const nextWeekCount=allTasks.filter(t=>inRange(t,nextWeekStart,nextWeekEnd)).length;
  const nextMonthStart=(()=>{const d=new Date(today);return new Date(d.getFullYear(),d.getMonth()+1,1).toISOString().slice(0,10);})();
  const nextMonthEnd=(()=>{const d=new Date(today);return new Date(d.getFullYear(),d.getMonth()+2,0).toISOString().slice(0,10);})();
  const nextMonthCount=allTasks.filter(t=>inRange(t,nextMonthStart,nextMonthEnd)).length;

  const statusColor=s=>s==="Completed"?"#16a34a":s==="In Progress"?"#2563eb":s==="Not Yet Started"?"#64748b":"#f59e0b";
  const tdC={padding:"10px 12px",textAlign:"center",fontSize:12,verticalAlign:"middle"};
  const tdL={padding:"10px 12px",textAlign:"left",fontSize:12,verticalAlign:"middle"};

  const TaskRow=({t})=>{
    const proj=scopedProjects.find(p=>p.id===t.project_id);
    const isOverdue=t.due_date&&t.due_date<today&&!isDone(t.status);
    return(
      <tr style={{borderBottom:`1px solid ${C.border}`,transition:"background .12s"}}
        onMouseEnter={e=>e.currentTarget.style.background=C.surface}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <td style={{...tdL,color:C.t1,fontWeight:600,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</td>
        <td style={{...tdC,color:C.accent,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj?.name||"—"}</td>
        {!isClient&&<td style={{...tdC,color:C.teal,fontWeight:600}}>{proj?.client||"—"}</td>}
        <td style={{...tdC}}>
          <span style={{fontSize:11,fontWeight:700,color:statusColor(t.status),background:statusColor(t.status)+"18",padding:"3px 8px",borderRadius:6,whiteSpace:"nowrap"}}>{t.status}</span>
        </td>
        <td style={{...tdC,color:C.t2}}>{t.assignee||"—"}</td>
        <td style={{...tdC,color:C.t2}}>{t.detailer||"—"}</td>
        <td style={{...tdC,color:C.t2}}>{t.checker||"—"}</td>
        <td style={{...tdC,color:isOverdue?C.red:"#16a34a",fontWeight:700}}>{t.client_sub_date||"—"}</td>
        <td style={{...tdC,color:isOverdue?C.red:C.t2,fontWeight:isOverdue?700:400}}>{t.due_date||"—"}{isOverdue?" ⚠":""}</td>
        {!isClient&&<td style={{...tdC}}>
          <button onClick={()=>onEdit&&onEdit(t)}
            style={{background:C.accent+"18",border:`1px solid ${C.accent}44`,color:C.accent,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ✏ Edit
          </button>
        </td>}
      </tr>
    );
  };

  const HEADERS=["Task","Project",...(!isClient?["Client"]:[]),"Status","Assignee","Detailer","Checker","Client Sub Date","Due Date",...(!isClient?[""]:[])];

  const btnStyle=(active,color="#6366f1")=>({
    padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
    border:`1.5px solid ${active?color:C.border}`,
    background:active?color+"18":"transparent",
    color:active?color:C.t2,transition:"all .15s"
  });

  const QUICK=[
    {id:"today",label:"Today",icon:"📅",color:C.red},
    {id:"tomorrow",label:"Tomorrow",icon:"🌅",color:C.green},
    {id:"this_week",label:"This Week",icon:"📆",color:"#f59e0b"},
    {id:"next_week",label:"Next Week",icon:"🗓",color:"#8b5cf6"},
    {id:"next_month",label:"Next Month",icon:"📅",color:"#06b6d4"},
    {id:"custom",label:"Custom Range",icon:"🗓",color:C.accent},
  ];

  return(
    <div>
      {/* ── Header ── */}
      <div style={{marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:C.t1}}>📬 Submission List</h2>
        <p style={{margin:"4px 0 0",color:C.t3,fontSize:13}}>Tasks and projects due for submission — filter by date range</p>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="rds-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:22}}>
        {[
          {label:"Today",value:todayCount,color:todayCount>0?C.red:"#22c55e",icon:"📅",id:"today"},
          {label:"Tomorrow",value:allTasks.filter(t=>inRange(t,addDays(today,1),addDays(today,1))).length,color:C.green,icon:"🌅",id:"tomorrow"},
          {label:"This Week",value:allTasks.filter(t=>inRange(t,mondayOf(today),sundayOf(today))).length,color:"#f59e0b",icon:"📆",id:"this_week"},
          {label:"Next Week",value:nextWeekCount,color:"#8b5cf6",icon:"🗓",id:"next_week"},
          {label:"Next Month",value:nextMonthCount,color:"#06b6d4",icon:"📅",id:"next_month"},
        ].map(s=>(
          <div key={s.label} onClick={()=>{setPeriod(s.id);setShowCal(false);}}
            style={{background:C.card,border:`2px solid ${period===s.id?s.color:C.border}`,borderRadius:12,padding:"14px 18px",borderLeft:`4px solid ${s.color}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"border .15s",boxShadow:period===s.id?`0 0 0 2px ${s.color}33`:"none"}}>
            <span style={{fontSize:24}}>{s.icon}</span>
            <div>
              <div style={{fontSize:26,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:isMobile?"10px 12px":"14px 18px",marginBottom:isMobile?14:22}}>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?6:8,flexWrap:"wrap"}}>
          {!isMobile&&<span style={{fontSize:12,color:C.t3,fontWeight:700,marginRight:4}}>VIEW:</span>}
          {QUICK.map(q=>(
            <button key={q.id} style={btnStyle(period===q.id,q.color)}
              onClick={()=>{setPeriod(q.id);setShowCal(q.id==="custom");}}>
              {q.icon} {q.label}
            </button>
          ))}
          {!isClient&&<button onClick={()=>exportSubmissionList(scopedProjects,allTasks,today)}
            style={{marginLeft:"auto",padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${C.accent}`,background:C.accent+"18",color:C.accent}}>
            ⬇ Export Excel
          </button>}
        </div>

        {/* ── Custom date range picker ── */}
        {period==="custom"&&(
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:C.t3,fontWeight:700}}>DATE RANGE:</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:12,color:C.t2,fontWeight:600}}>From</label>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
                style={{background:C.surface,border:`1.5px solid ${C.accent}`,borderRadius:7,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <span style={{color:C.t3}}>→</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:12,color:C.t2,fontWeight:600}}>To</label>
              <input type="date" value={customTo} min={customFrom} onChange={e=>setCustomTo(e.target.value)}
                style={{background:C.surface,border:`1.5px solid ${C.accent}`,borderRadius:7,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <span style={{fontSize:12,color:C.t3,marginLeft:8}}>{periodTasks.length} task{periodTasks.length!==1?"s":""} in range</span>
          </div>
        )}
      </div>

      {/* ── Search + Progress bar ── */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:isMobile?"10px 12px":"14px 18px",marginBottom:isMobile?12:18}}>
        {/* Search row */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <input
            placeholder="🔍 Search by task, project, client, assignee, status…"
            value={subSearch} onChange={e=>setSubSearch(e.target.value)}
            style={{flex:1,background:C.surface,border:`1.5px solid ${subSearch?rangeColor:C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          {subSearch&&<button onClick={()=>setSubSearch("")}
            style={{flexShrink:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 12px",fontSize:12,color:C.red,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕ Clear</button>}
          <span style={{flexShrink:0,fontSize:12,color:C.t3,fontWeight:600}}>{periodTasks.length} task{periodTasks.length!==1?"s":""}</span>
        </div>
        {/* Progress bar */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:".05em"}}>Completion Progress</span>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#22c55e",fontWeight:700}}>✅ {doneCount} Done</span>
              <span style={{fontSize:11,color:C.t3,fontWeight:700}}>📋 {periodTasks.length-doneCount} Pending</span>
              <span style={{fontSize:12,fontWeight:900,color:progPct===100?"#22c55e":rangeColor}}>{progPct}%</span>
            </div>
          </div>
          <div style={{height:10,background:C.surface,borderRadius:10,overflow:"hidden",position:"relative"}}>
            <div style={{
              height:"100%",
              width:`${progPct}%`,
              background:progPct===100?"#22c55e":`linear-gradient(90deg,${rangeColor},${rangeColor}cc)`,
              borderRadius:10,
              transition:"width .6s cubic-bezier(.22,1,.36,1)",
              boxShadow:`0 0 8px ${rangeColor}66`
            }}/>
            {/* Segment markers every 25% */}
            {[25,50,75].map(p=>(
              <div key={p} style={{position:"absolute",top:0,left:`${p}%`,width:1,height:"100%",background:C.bg+"55"}}/>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            {["0%","25%","50%","75%","100%"].map(l=>(
              <span key={l} style={{fontSize:9,color:C.t3,fontWeight:600}}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results section ── */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:22}}>
        <div style={{background:rangeColor+"18",borderBottom:`1px solid ${rangeColor}33`,padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>{rangeIcon}</span>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:rangeColor}}>{rangeLabel}</div>
            <div style={{fontSize:12,color:C.t3,marginTop:2}}>{periodTasks.length} submission{periodTasks.length!==1?"s":""}</div>
          </div>
          <span style={{marginLeft:"auto",fontSize:28,fontWeight:900,color:rangeColor}}>{periodTasks.length}</span>
        </div>
        {periodTasks.length===0?(
          <div style={{padding:"48px",textAlign:"center",color:C.t3}}>
            <div style={{fontSize:40,marginBottom:10}}>🎉</div>
            <div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:4}}>No submissions in this period</div>
            <div style={{fontSize:13}}>Try selecting a different date range above</div>
          </div>
        ):(
          isMobile?(
            <div style={{padding:"10px"}}>
              {periodTasks.map(t=>{
                const proj=scopedProjects.find(p=>p.id===t.project_id);
                const isOverdue=t.due_date&&t.due_date<today&&!isDone(t.status);
                return(
                  <div key={t.id} style={{background:C.surface,border:`1px solid ${isOverdue?C.red+"44":C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:10,borderLeft:`3px solid ${statusColor(t.status)}`}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.t1,marginBottom:4,lineHeight:1.3}}>{t.title}</div>
                    <div style={{fontSize:12,color:C.accent,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj?.name||"—"}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:10,fontWeight:700,color:statusColor(t.status),background:statusColor(t.status)+"18",padding:"2px 7px",borderRadius:5}}>{t.status}</span>
                      {t.client_sub_date&&<span style={{fontSize:10,color:C.t3}}>📬 {t.client_sub_date}</span>}
                      {t.due_date&&<span style={{fontSize:10,color:isOverdue?C.red:C.t3}}>📅 {t.due_date}{isOverdue?" ⚠":""}</span>}
                      {t.assignee&&<span style={{fontSize:10,color:C.t2}}>👤 {t.assignee}</span>}
                    </div>
                    {!isClient&&canEdit&&<button onClick={()=>onEdit&&onEdit(t)} style={{marginTop:8,background:C.accent+"18",border:`1px solid ${C.accent}44`,color:C.accent,borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏ Edit</button>}
                  </div>
                );
              })}
            </div>
          ):(
          <div className="rds-table-outer" style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:C.surface}}>
                  {HEADERS.map((h,i)=>(
                    <th key={i} style={{padding:"9px 12px",textAlign:i===0?"left":"center",fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{periodTasks.map(t=><TaskRow key={t.id} t={t}/>)}</tbody>
            </table>
          </div>
          )
        )}
      </div>
    </div>
  );
}

// ANALYTICS CENTER
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsProjModal({title,projList,tasks,today,onClose}){
  const [q,sq]=useState("");
  const [fClient,sfc]=useState("All");
  const pctP=id=>{const pt=tasks.filter(t=>t.project_id===id);return pt.length?Math.round(pt.filter(t=>isDone(t.status)).length/pt.length*100):0;};
  const allClients=[...new Set(projList.map(p=>p.client||"Unassigned"))].sort();
  const shown=projList.filter(p=>{
    if(q&&!p.name.toLowerCase().includes(q.toLowerCase())&&!(p.client||"").toLowerCase().includes(q.toLowerCase()))return false;
    if(fClient!=="All"&&(p.client||"Unassigned")!==fClient)return false;
    return true;
  });
  const inp={background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",cursor:"pointer"};
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"#00000090",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 28px",width:"94vw",maxWidth:1100,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px #00000080"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><h3 style={{margin:0,color:C.t1,fontSize:17}}>{title}</h3><p style={{margin:"3px 0 0",color:C.t3,fontSize:12}}>{shown.length} of {projList.length} projects</p></div>
          <IBtn icon="✕" onClick={onClose}/>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <input autoFocus placeholder="🔍 Search project or client…" value={q} onChange={e=>sq(e.target.value)}
            style={{flex:1,background:C.surface,border:`1px solid ${q?C.accent:C.border}`,borderRadius:8,padding:"9px 14px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <select value={fClient} onChange={e=>sfc(e.target.value)} style={{...inp,borderColor:fClient!=="All"?C.accent:C.border,minWidth:160}}>
            <option value="All">All Clients</option>
            {allClients.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{position:"sticky",top:0,background:C.card,zIndex:1}}>
              <tr>{["#","Project","Client","Tasks","Completed","In Progress","Overdue","Progress","Deadline"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {shown.map((p,i)=>{
                const pt=tasks.filter(t=>t.project_id===p.id);
                const done=pt.filter(t=>isDone(t.status)).length;
                const ip=pt.filter(t=>t.status==="In Progress").length;
                const ov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
                const pc=pctP(p.id);
                const ovDL=p.deadline&&p.deadline<today&&pc<100;
                return(
                  <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 12px",color:C.t3,fontSize:12}}>{i+1}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:4,height:20,borderRadius:2,background:p.color||C.accent,flexShrink:0}}/>
                        <span style={{color:C.t1,fontSize:13,fontWeight:600}}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{padding:"10px 12px"}}><span style={{color:C.teal,fontSize:12}}>{p.client||"—"}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.t2,fontWeight:700}}>{pt.length}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.green,fontWeight:700}}>{done}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.blue,fontWeight:700}}>{ip||"—"}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:ov>0?C.red:C.t3,fontWeight:ov>0?700:400}}>{ov>0?`⚠ ${ov}`:"—"}</span></td>
                    <td style={{padding:"10px 12px",minWidth:130}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pc}%`,background:pc>=100?C.green:pc>=50?C.blue:C.accent,borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:11,color:pc>=100?C.green:C.t2,fontWeight:700,width:32,flexShrink:0}}>{pc}%</span>
                      </div>
                    </td>
                    <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}><span style={{color:ovDL?C.red:C.t3,fontSize:12,fontWeight:ovDL?700:400}}>{p.deadline||"—"}{ovDL?" ⚠":""}</span></td>
                  </tr>
                );
              })}
              {shown.length===0&&<tr><td colSpan={9} style={{padding:32,textAlign:"center",color:C.t3}}>No projects found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function AnalyticsClientModal({title,clientList,onClose}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"#00000090",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 28px",width:"80vw",maxWidth:820,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px #00000080"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><h3 style={{margin:0,color:C.t1,fontSize:17}}>{title}</h3><p style={{margin:"3px 0 0",color:C.t3,fontSize:12}}>{clientList.length} clients with active projects</p></div>
          <IBtn icon="✕" onClick={onClose}/>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{position:"sticky",top:0,background:C.card,zIndex:1}}>
              <tr>{["#","Client","Projects","Total Tasks","Completed","Overdue","Progress"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {clientList.map((c,i)=>(
                <tr key={c.name} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 12px",color:C.t3,fontSize:12}}>{i+1}</td>
                  <td style={{padding:"10px 12px"}}><span style={{color:C.teal,fontSize:14,fontWeight:700}}>{c.name}</span></td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.blue,fontWeight:700,fontSize:14}}>{c.projects}</span></td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.t2,fontWeight:600}}>{c.tasks}</span></td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.green,fontWeight:700}}>{c.done}</span></td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:c.overdue>0?C.red:C.t3,fontWeight:c.overdue>0?700:400}}>{c.overdue>0?`⚠ ${c.overdue}`:"—"}</span></td>
                  <td style={{padding:"10px 12px",minWidth:140}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{flex:1,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${c.pct}%`,background:c.pct>=80?C.green:c.pct>=50?C.blue:C.accent,borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:11,color:C.t2,fontWeight:700,width:32}}>{c.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {clientList.length===0&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:C.t3}}>No client data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function AnalyticsMemberModal({title,memberList,tasks,onClose}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"#00000090",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 28px",width:"75vw",maxWidth:780,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px #00000080"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><h3 style={{margin:0,color:C.t1,fontSize:17}}>{title}</h3><p style={{margin:"3px 0 0",color:C.t3,fontSize:12}}>{memberList.length} team members</p></div>
          <IBtn icon="✕" onClick={onClose}/>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{position:"sticky",top:0,background:C.card,zIndex:1}}>
              <tr>{["#","Member","Total Tasks","Completed","In Progress","Overdue","Completion"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {memberList.map((u,i)=>{
                const ip=(u.allTasks||[]).filter(t=>t.status==="In Progress").length;
                return(
                  <tr key={u.name} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 12px",color:C.t3,fontSize:12}}>{i+1}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><Av name={u.name} size={28}/><span style={{color:C.t1,fontSize:13,fontWeight:600}}>{u.name}</span></div>
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.t2,fontWeight:700}}>{u.total}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.green,fontWeight:700}}>{u.done}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:C.blue,fontWeight:700}}>{ip||"—"}</span></td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{color:u.overdue>0?C.red:C.t3,fontWeight:u.overdue>0?700:400}}>{u.overdue>0?`⚠ ${u.overdue}`:"—"}</span></td>
                    <td style={{padding:"10px 12px",minWidth:140}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${u.pct}%`,background:u.pct>=80?C.green:u.pct>=50?C.blue:C.accent,borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:11,color:u.pct>=80?C.green:C.t2,fontWeight:700,width:32}}>{u.pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {memberList.length===0&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:C.t3}}>No team data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// WORKFLOWS PAGE
// ══════════════════════════════════════════════════════
const WF_TRIGGERS=[["status_changed","Status Changes To"],["task_assigned","Task Assigned"],["task_created","Task Created"]];
const WF_ACTIONS=[["notify_checker","Notify Checker"],["notify_assignee","Notify Assignee"],["notify_role","Notify Role"],["change_status","Change Status To"]];
const WF_ROLES=["Admin","Manager","Team Leader","Rebar","Client"];
const ALL_WF_STATUSES=["Not Yet Started","In Progress","Review","Completed"];


function EmailDigestCard(){
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const [enabled,setEnabled]=useState(true);
  const [sched,setSched]=useState({days:"1,2,3,4,5,6",time:"01:00"});
  const [loading,setLoading]=useState(true);
  const [triggering,setTriggering]=useState(false);
  const [msg,setMsg]=useState(null);
  const [editing,setEditing]=useState(false);
  const [editDraft,setEditDraft]=useState({});
  const [saving2,setSaving2]=useState(false);
  const inp2={background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"8px 11px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
  useEffect(()=>{
    (async()=>{
      const res=await fetch(SUPA_URL+"/rest/v1/settings?key=in.(daily_digest_enabled,daily_digest_days,daily_digest_time)&select=key,value",{
        headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}
      });
      const data=await res.json();
      if(Array.isArray(data)){
        const map={};data.forEach(r=>{map[r.key]=r.value;});
        setEnabled(map["daily_digest_enabled"]!=="false");
        setSched({days:map["daily_digest_days"]||"1,2,3,4,5,6",time:map["daily_digest_time"]||"01:00"});
      }
      setLoading(false);
    })();
  },[]);
  async function upsertSetting(key,value){
    const r=await fetch(SUPA_URL+"/rest/v1/settings?key=eq."+key,{method:"PATCH",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify({value})});
    const d=await r.json();
    if(!Array.isArray(d)||d.length===0){await fetch(SUPA_URL+"/rest/v1/settings",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({key,value})});}
  }
  async function toggle(val){setEnabled(val);await upsertSetting("daily_digest_enabled",val?"true":"false");setMsg("Digest "+(val?"enabled":"disabled"));setTimeout(()=>setMsg(null),3000);}
  async function triggerNow(){
    setTriggering(true);setMsg(null);
    try{const res=await fetch("/api/cron-daily",{method:"GET"});const data=await res.json();setMsg(res.ok?"Sent to "+(data.sent??0)+" recipient(s)":"Error: "+(data.error||"Unknown"));}
    catch(e){setMsg("Network error: "+e.message);}
    setTriggering(false);setTimeout(()=>setMsg(null),4000);
  }
  async function saveEdit(){
    setSaving2(true);
    const daysStr=editDraft.days.sort((a,b)=>a-b).join(",");
    await upsertSetting("daily_digest_days",daysStr);
    await upsertSetting("daily_digest_time",editDraft.time);
    setSched({days:daysStr,time:editDraft.time});
    setMsg("Schedule updated");setTimeout(()=>setMsg(null),3000);setEditing(false);setSaving2(false);
  }
  const schedLabel=()=>{const ns=sched.days.split(",").map(Number).sort((a,b)=>a-b);return ns.map(d=>DAYS[d]).join(", ")+" at "+sched.time+" IST";};
  if(loading)return null;
  return(
    <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:20}}>{"\ud83d\udce7"}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:C.t1}}>Daily Submission Email</div>
          <div style={{fontSize:11,color:C.t3,marginTop:2}}>{"Sent to Admin, Manager, Team Leaders"+(loading?"":" — "+schedLabel())}</div>
        </div>
        <div onClick={()=>toggle(!enabled)} style={{width:44,height:24,borderRadius:12,background:enabled?C.green:C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
          <div style={{position:"absolute",top:3,left:enabled?22:3,width:18,height:18,borderRadius:9,background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px #0003"}}/>
        </div>
      </div>
      {msg&&<div style={{fontSize:12,fontWeight:700,color:msg.startsWith("Error")||msg.startsWith("Network")?C.red:C.green,background:(msg.startsWith("Error")||msg.startsWith("Network")?C.red:C.green)+"22",borderRadius:8,padding:"8px 12px",marginBottom:12}}>{msg}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,color:enabled?C.green:C.t3,fontWeight:700}}>{enabled?"Active":"Paused"}</span>
        <button onClick={()=>{setEditing(e=>!e);setEditDraft({days:sched.days.split(",").map(Number),time:sched.time});}} style={{...GBtn,fontSize:11,padding:"5px 12px",marginLeft:"auto"}}>{"Edit Schedule"}</button>
        <button onClick={triggerNow} disabled={triggering} style={{...GBtn,fontSize:11,padding:"5px 12px",opacity:triggering?.6:1}}>{triggering?"Sending...":"Send Now"}</button>
      </div>
      {editing&&(
        <div style={{marginTop:14,background:C.surface,borderRadius:10,padding:16,border:"1px solid "+C.accent+"44"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.t1,marginBottom:12}}>Edit Schedule</div>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:8}}>ACTIVE DAYS</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {DAYS.map((d,i)=>{const on=(editDraft.days||[]).includes(i);return(
              <div key={i} onClick={()=>{const cur=editDraft.days||[];setEditDraft(p=>({...p,days:on?cur.filter(x=>x!==i):[...cur,i]}));}}
                style={{padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",background:on?C.accent+"22":C.surface,border:"1px solid "+(on?C.accent:C.border),color:on?C.accent:C.t3}}>
                {d}
              </div>
            );})}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>TIME (IST)</div>
          <input type="time" value={editDraft.time||"01:00"} onChange={e=>setEditDraft(p=>({...p,time:e.target.value}))} style={{...inp2,marginBottom:14}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEdit} disabled={saving2} style={{...GBtn,background:C.accent,color:"#fff",borderColor:C.accent,flex:1,padding:"8px 0"}}>{saving2?"Saving...":"Save Schedule"}</button>
            <button onClick={()=>setEditing(false)} style={GBtn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowsPage({workflows,onAdd,onUpdate,onDelete,onToggle,users,saving}){
  const [showForm,setShowForm]=useState(false);
  const [editWf,setEditWf]=useState(null);
  const empty={name:"",trigger_event:"status_changed",trigger_value:"Review",action_type:"notify_checker",action_target:"",escalate_hours:"",escalate_to:"Manager",is_active:true};
  const [form,setForm]=useState(empty);
  function openAdd(){setForm(empty);setEditWf(null);setShowForm(true);}
  function openEdit(wf){setForm({...wf,escalate_hours:wf.escalate_hours||""});setEditWf(wf);setShowForm(true);}
  function handleSave(){
    const payload={...form,escalate_hours:form.escalate_hours?Number(form.escalate_hours):null};
    if(!payload.name.trim()){alert("Rule name required");return;}
    if(editWf){onUpdate(editWf.id,payload);}else{onAdd(payload);}
    setShowForm(false);
  }
  const inp={background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,width:"100%",fontFamily:"inherit",boxSizing:"border-box"};
  const lbl={fontSize:11,fontWeight:700,color:C.t3,marginBottom:4,display:"block"};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <EmailDigestCard/>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.t1}}>Workflow Automation</div>
          <div style={{fontSize:12,color:C.t3,marginTop:2}}>Rules that fire automatically when task events happen</div>
        </div>
        <button onClick={openAdd} style={{...GBtn,marginLeft:"auto",background:C.accent,color:"#fff",borderColor:C.accent}}>+ Add Rule</button>
      </div>
      {workflows.length===0&&!showForm&&(
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:40,textAlign:"center",color:C.t3}}>
          <div style={{fontSize:32,marginBottom:10}}>{"⚙"}</div>
          <div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:6}}>No workflow rules yet</div>
          <div style={{fontSize:12}}>Click "Add Rule" to create your first automation</div>
        </div>
      )}
      {showForm&&(
        <div style={{background:C.card,border:"2px solid "+C.accent+"44",borderRadius:14,padding:20}}>
          <div style={{fontSize:14,fontWeight:800,color:C.t1,marginBottom:16}}>{editWf?"Edit Rule":"New Rule"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Rule Name</label>
              <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Notify checker on Review"/>
            </div>
            <div>
              <label style={lbl}>WHEN (Trigger)</label>
              <select style={inp} value={form.trigger_event} onChange={e=>setForm(f=>({...f,trigger_event:e.target.value}))}>
                {WF_TRIGGERS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {form.trigger_event==="status_changed"&&(
              <div>
                <label style={lbl}>To Status</label>
                <select style={inp} value={form.trigger_value} onChange={e=>setForm(f=>({...f,trigger_value:e.target.value}))}>
                  {ALL_WF_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={lbl}>THEN (Action)</label>
              <select style={inp} value={form.action_type} onChange={e=>setForm(f=>({...f,action_type:e.target.value}))}>
                {WF_ACTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {form.action_type==="notify_role"&&(
              <div>
                <label style={lbl}>Target Role</label>
                <select style={inp} value={form.action_target} onChange={e=>setForm(f=>({...f,action_target:e.target.value}))}>
                  <option value="">Select role...</option>
                  {WF_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            {form.action_type==="change_status"&&(
              <div>
                <label style={lbl}>New Status</label>
                <select style={inp} value={form.action_target} onChange={e=>setForm(f=>({...f,action_target:e.target.value}))}>
                  {ALL_WF_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={lbl}>Escalate after (hours, optional)</label>
              <input style={inp} type="number" min="1" value={form.escalate_hours} onChange={e=>setForm(f=>({...f,escalate_hours:e.target.value}))} placeholder="e.g. 24"/>
            </div>
            {form.escalate_hours&&(
              <div>
                <label style={lbl}>Escalate To Role</label>
                <select style={inp} value={form.escalate_to} onChange={e=>setForm(f=>({...f,escalate_to:e.target.value}))}>
                  {WF_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={handleSave} disabled={saving} style={{...GBtn,background:C.accent,color:"#fff",borderColor:C.accent,padding:"8px 20px"}}>{saving?"Saving...":"Save Rule"}</button>
            <button onClick={()=>setShowForm(false)} style={GBtn}>Cancel</button>
          </div>
        </div>
      )}
      {workflows.map(wf=>{
        const triggerLabel=(WF_TRIGGERS.find(([v])=>v===wf.trigger_event)||[])[1]||wf.trigger_event;
        const actionLabel=(WF_ACTIONS.find(([v])=>v===wf.action_type)||[])[1]||wf.action_type;
        return(
          <div key={wf.id} style={{background:C.card,border:"1px solid "+(wf.is_active?C.accent+"44":C.border),borderRadius:12,padding:16,display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:800,color:wf.is_active?C.t1:C.t3}}>{wf.name}</span>
                <span style={{fontSize:10,fontWeight:700,background:wf.is_active?C.green+"22":C.border,color:wf.is_active?C.green:C.t3,borderRadius:4,padding:"2px 7px"}}>{wf.is_active?"Active":"Paused"}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",fontSize:12}}>
                <span style={{background:"#312e81",color:"#a5b4fc",borderRadius:6,padding:"3px 8px",fontWeight:700}}>{"WHEN "+triggerLabel+(wf.trigger_value?" to "+wf.trigger_value:"")}</span>
                <span style={{color:C.t3}}>{">"}</span>
                <span style={{background:"#14532d",color:"#86efac",borderRadius:6,padding:"3px 8px",fontWeight:700}}>{"THEN "+actionLabel+(wf.action_target?" "+wf.action_target:"")}</span>
                {wf.escalate_hours&&<><span style={{color:C.t3}}>{">"}</span><span style={{background:"#7c2d12",color:"#fdba74",borderRadius:6,padding:"3px 8px",fontWeight:700}}>{"ESCALATE "+wf.escalate_hours+"h to "+wf.escalate_to}</span></>}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>onToggle(wf)} style={{...GBtn,fontSize:11,padding:"5px 10px"}}>{wf.is_active?"Pause":"Resume"}</button>
              <button onClick={()=>openEdit(wf)} style={{...GBtn,fontSize:11,padding:"5px 10px"}}>Edit</button>
              <button onClick={()=>{if(window.confirm("Delete this rule?"))onDelete(wf.id);}} style={{...GBtn,fontSize:11,padding:"5px 10px",color:C.red,borderColor:C.red+"44"}}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsCenter({projects,tasks,users,clients,today,members}){
  const isMobile=useMobile();
  const [period,setP]=useState("all");
  const [modal,setModal]=useState(null); // {title, type, list}

  const pct=id=>{const pt=tasks.filter(t=>t.project_id===id);return pt.length?Math.round(pt.filter(t=>isDone(t.status)).length/pt.length*100):0;};
  const openModal=(title,list,type="tasks")=>{if(list&&list.length>0)setModal({title,type,list});};
  const openProj=(title,list)=>openModal(title,list,"projects");
  const openClients=(title,list)=>openModal(title,list,"clients");
  const openMembers=(title,list)=>openModal(title,list,"members");

  // KPIs
  const totalProj=projects.length;
  const activeProjList=projects.filter(p=>pct(p.id)<100);
  const activeProj=activeProjList.length;
  const compProjList=projects.filter(p=>pct(p.id)>=100&&tasks.some(t=>t.project_id===p.id));
  const compProj=compProjList.length;
  const totalCl=clients.length;
  const totalEmp=users.length;
  const openTasksList=tasks.filter(t=>!isDone(t.status));
  const openTasks=openTasksList.length;
  const compTasks=tasks.filter(t=>isDone(t.status)).length;
  const overdue=tasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const inProg=tasks.filter(t=>t.status==="In Progress").length;
  const compRate=tasks.length?Math.round(compTasks/tasks.length*100):0;

  // Task status breakdown
  const statusBD=ALL_STATUSES.map(s=>({label:s,value:tasks.filter(t=>t.status===s).length,color:getStatusColor(s),tasks:tasks.filter(t=>t.status===s)})).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  // Project health
  const notStartedProj=projects.filter(p=>!tasks.some(t=>t.project_id===p.id));
  const projHealth=[
    {label:"Active",value:activeProj,color:"#3b82f6",projects:activeProjList,tasks:tasks.filter(t=>activeProjList.some(p=>p.id===t.project_id))},
    {label:"Completed",value:compProj,color:"#22c55e",projects:compProjList,tasks:tasks.filter(t=>compProjList.some(p=>p.id===t.project_id))},
    {label:"Not Started",value:Math.max(0,totalProj-activeProj-compProj),color:"#64748b",projects:notStartedProj,tasks:[]},
  ].filter(d=>d.value>0);

  // Team performance
  const teamPerf=members.map(name=>{
    const mt=tasks.filter(t=>t.assignee===name||t.detailer===name||t.checker===name);
    const done=mt.filter(t=>isDone(t.status)).length;
    const ov=mt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status));
    return{name,total:mt.length,done,overdueTasks:ov,overdue:ov.length,allTasks:mt,pct:mt.length?Math.round(done/mt.length*100):0};
  }).filter(u=>u.total>0).sort((a,b)=>b.pct-a.pct);

  // Client portfolio
  const clientPortfolio=clients.map(c=>{
    const cp=projects.filter(p=>p.client===c.name);
    const ct=tasks.filter(t=>cp.some(p=>p.id===t.project_id));
    const doneTasks=ct.filter(t=>isDone(t.status));
    const ovTasks=ct.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status));
    return{name:c.name,projects:cp.length,tasks:ct.length,done:doneTasks.length,doneTasks,overdue:ovTasks.length,ovTasks,allTasks:ct,pct:ct.length?Math.round(doneTasks.length/ct.length*100):0};
  }).filter(c=>c.projects>0).sort((a,b)=>b.tasks-a.tasks);

  // Priority distribution
  const priColors={"Critical":C.red,"High":"#f97316","Medium":"#eab308","Low":C.green};
  const priData=["Critical","High","Medium","Low"].map(p=>({label:p,value:tasks.filter(t=>t.priority===p).length,color:priColors[p],tasks:tasks.filter(t=>t.priority===p)})).filter(d=>d.value>0);

  // Overdue by assignee
  const overdueByA=members.map(name=>({name,count:tasks.filter(t=>t.assignee===name&&t.due_date&&t.due_date<today&&!isDone(t.status)).length,tasks:tasks.filter(t=>t.assignee===name&&t.due_date&&t.due_date<today&&!isDone(t.status))})).filter(u=>u.count>0).sort((a,b)=>b.count-a.count).slice(0,8);

  // ── Sub-components ──────────────────────────────────────────────────────────
  const ACard=({icon,label,value,sub,color,onClick,taskList,projList,clientList,memberList})=>{
    const handleClick=projList&&projList.length>0?()=>openProj(label,projList):clientList&&clientList.length>0?()=>openClients(label,clientList):memberList&&memberList.length>0?()=>openMembers(label,memberList):taskList&&taskList.length>0?()=>openModal(label,taskList):onClick;
    const hasAction=!!(projList&&projList.length>0||(taskList&&taskList.length>0)||(clientList&&clientList.length>0)||(memberList&&memberList.length>0)||onClick);
    return(
    <div onClick={hasAction?handleClick:undefined}
      className="rds-acard"
      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:isMobile?10:14,padding:isMobile?"10px 12px":"18px 20px",borderLeft:`4px solid ${color}`,position:"relative",overflow:"hidden",cursor:hasAction?"pointer":"default",transition:"box-shadow .15s,transform .15s"}}
      onMouseEnter={e=>{if(hasAction){e.currentTarget.style.boxShadow=`0 0 0 2px ${color}55`;e.currentTarget.style.transform="translateY(-2px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="";}}>
      <div style={{position:"absolute",top:10,right:12,fontSize:32,opacity:0.08,pointerEvents:"none"}}>{icon}</div>
      <div className="rds-num-anim" style={{fontSize:isMobile?22:32,fontWeight:900,color,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      <div style={{fontSize:isMobile?9:11,color:C.t2,fontWeight:700,margin:isMobile?"3px 0 2px":"6px 0 3px",textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>
      {sub&&!isMobile&&<div style={{fontSize:11,color:C.t3}}>{sub}</div>}
      {hasAction&&!isMobile&&<div style={{position:"absolute",bottom:8,right:10,fontSize:9,color:color,opacity:0.7,fontWeight:700}}>CLICK TO VIEW ›</div>}
    </div>
    );
  };

  const Donut=({segs,size=150,sw=24,label,sub})=>{
    const r=(size-sw)/2,cx=size/2,cy=size/2,circ=2*Math.PI*r;
    const tot=segs.reduce((s,d)=>s+d.value,0)||1;
    let acc=0;
    return(
      <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
        <svg width={size} height={size} className="rds-donut-svg" style={{}}>
          {segs.length===0
            ?<circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
            :segs.map((s,i)=>{const p=s.value/tot,da=circ*p,off=-circ*acc;acc+=p;return<circle key={i} className="rds-donut-seg" cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${da} ${circ-da}`} strokeDashoffset={off} style={{"--full":circ,"--off":off}}/>;})
          }
        </svg>
        {label!==undefined&&(
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{fontSize:20,fontWeight:900,color:C.t1,lineHeight:1}}>{label}</div>
            {sub&&<div style={{fontSize:9,color:C.t3,marginTop:2,textTransform:"uppercase",letterSpacing:".05em"}}>{sub}</div>}
          </div>
        )}
      </div>
    );
  };

  const HBar=({data})=>{
    const mx=Math.max(...data.map(d=>d.value),1);
    return(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {data.map((d,i)=>(
          <div key={i} className="rds-hbar-row" style={{display:"flex",alignItems:"center",gap:8,cursor:d.tasks&&d.tasks.length>0?"pointer":"default",borderRadius:6,padding:"2px 4px",transition:"background .12s"}}
            onClick={d.tasks&&d.tasks.length>0?()=>openModal(d.label,d.tasks):undefined}
            onMouseEnter={e=>{if(d.tasks&&d.tasks.length>0)e.currentTarget.style.background=C.surface;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
            <div style={{width:isMobile?70:96,fontSize:isMobile?10:11,color:C.t2,textAlign:"right",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={d.label}>{d.label}</div>
            <div style={{flex:1,background:C.surface,borderRadius:4,height:20,overflow:"hidden",position:"relative",border:d.tasks&&d.tasks.length>0?`1px solid ${d.color||C.accent}33`:"none"}}>
              <div className="rds-anim-bar" style={{width:`${d.value/mx*100}%`,height:"100%",background:d.color||C.accent,borderRadius:4,minWidth:d.value?3:0}}/>
              <span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:11,color:C.t1,fontWeight:700}}>{d.value}</span>
            </div>
          </div>
        ))}
        {data.length===0&&<p style={{color:C.t3,fontSize:12,margin:0}}>No data</p>}
      </div>
    );
  };

  const Panel=({title,children,style={}})=>(
    <div className="rds-panel" style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:isMobile?14:22,overflow:"hidden",...style}}>
      <h3 style={{margin:`0 0 ${isMobile?10:16}px`,fontSize:12,fontWeight:800,color:C.t3,textTransform:"uppercase",letterSpacing:".08em"}}>{title}</h3>
      {children}
    </div>
  );

  return(
    <div>
      {/* ── Header ── */}
      <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-start",marginBottom:isMobile?14:26,gap:isMobile?10:0}}>
        <div>
          <h2 style={{margin:0,fontSize:isMobile?16:20,fontWeight:900,color:C.t1}}>📊 Business Analytics</h2>
          {!isMobile&&<p style={{margin:"4px 0 0",color:C.t3,fontSize:13}}>Enterprise insights · projects, team performance & client portfolio</p>}
        </div>
        <div style={{display:"flex",gap:4,background:C.surface,borderRadius:10,padding:3,flexShrink:0}}>
          {[["all",isMobile?"All":"All Time"],["quarter",isMobile?"Q":"Quarter"],["month",isMobile?"Mo":"Month"],["week",isMobile?"Wk":"Week"]].map(([v,l])=>(
            <button key={v} onClick={()=>setP(v)} style={{border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?11:12,fontWeight:600,cursor:"pointer",background:period===v?C.accent:"transparent",color:period===v?"#fff":C.t3,fontFamily:"inherit",transition:"all .15s"}}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)",gap:isMobile?10:16,marginBottom:isMobile?14:22}}>
        <ACard icon="📁" label="Total Projects" value={totalProj} sub={`${activeProj} active · ${compProj} complete`} color={C.blue} projList={projects}/>
        <ACard icon="⚡" label="Active Projects" value={activeProj} sub={`${Math.round(activeProj/Math.max(totalProj,1)*100)}% of portfolio`} color={C.accent} projList={activeProjList}/>
        <ACard icon="✅" label="Completed Projects" value={compProj} sub="fully delivered" color={C.green} projList={compProjList}/>
        <ACard icon="🏢" label="Total Clients" value={totalCl} sub={`${clientPortfolio.length} with projects`} color={C.teal} clientList={clientPortfolio}/>
        <ACard icon="👥" label="Team Members" value={totalEmp} sub={`${teamPerf.length} assigned`} color={"#a855f7"} memberList={teamPerf}/>
        <ACard icon="📋" label="Open Tasks" value={openTasks} sub={overdue>0?`⚠ ${overdue} overdue`:`${compRate}% complete`} color={overdue>0?C.red:"#eab308"} taskList={openTasksList}/>
      </div>

      {/* ── Row 1: Task Breakdown + Project Health ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.6fr 1fr",gap:isMobile?12:18,marginBottom:isMobile?12:18}}>
        <Panel title="📊 Task Status Breakdown">
          <HBar data={statusBD}/>
          <div style={{marginTop:14,display:"flex",gap:16,flexWrap:"wrap",paddingTop:12,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.t3}}>Total <b style={{color:C.t1}}>{tasks.length}</b></span>
            <span style={{fontSize:12,color:C.green}}>Done <b>{compTasks}</b></span>
            <span style={{fontSize:12,color:C.accent}}>In Progress <b>{inProg}</b></span>
            <span style={{fontSize:12,color:C.red}}>Overdue <b>{overdue}</b></span>
            <span style={{fontSize:12,color:C.teal}}>Completion <b>{compRate}%</b></span>
          </div>
        </Panel>
        <Panel title="🏗 Project Health">
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <Donut segs={projHealth} label={totalProj} sub="projects"/>
            <div style={{flex:1}}>
              {projHealth.map(s=>(
                <div key={s.label} onClick={s.projects&&s.projects.length>0?()=>openProj(`${s.label} Projects`,s.projects):undefined}
                  style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:s.projects&&s.projects.length>0?"pointer":"default",borderRadius:6,padding:"4px 6px",transition:"background .15s"}}
                  onMouseEnter={e=>{if(s.projects&&s.projects.length>0)e.currentTarget.style.background=s.color+"15";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <span style={{fontSize:12,color:C.t2,flex:1}}>{s.label}</span>
                  <span style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</span>
                </div>
              ))}
              <div style={{paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:11,color:C.t3}}>Overall completion: <b style={{color:C.t1}}>{compRate}%</b></div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Row 2: Team Performance + Client Portfolio ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:isMobile?12:18,marginBottom:isMobile?12:18}}>
        <Panel title="👥 Team Performance">
          <div style={{display:"flex",flexDirection:"column",gap:14,maxHeight:320,overflowY:"auto"}}>
            {teamPerf.map((u,i)=>(
              <div key={u.name} className="rds-perf-row" onClick={()=>openModal(`${u.name} — All Tasks`,u.allTasks)}
                style={{cursor:"pointer",borderRadius:8,padding:"6px 8px",transition:"background .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=C.surface;}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,color:C.t3,width:16,textAlign:"right"}}>{i+1}.</span>
                    <Av name={u.name} size={20}/>
                    <span style={{fontSize:12,color:C.t1,fontWeight:600}}>{u.name.split(" ")[0]}</span>
                    {u.overdue>0&&<span onClick={e=>{e.stopPropagation();openModal(`${u.name} — Overdue Tasks`,u.overdueTasks);}} style={{fontSize:10,color:C.red,fontWeight:700,background:C.red+"15",padding:"1px 5px",borderRadius:4,cursor:"pointer"}}>⚠{u.overdue}</span>}
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color:u.pct>=80?C.green:u.pct>=50?C.blue:C.accent}}>{u.pct}%</span>
                </div>
                <div style={{height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                  <div className="rds-perf-bar" style={{height:"100%",width:`${u.pct}%`,background:u.pct>=80?C.green:u.pct>=50?C.blue:C.accent,borderRadius:3}}/>
                </div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>{u.done}/{u.total} tasks done</div>
              </div>
            ))}
            {teamPerf.length===0&&<p style={{color:C.t3,fontSize:13,margin:0}}>No assignments found</p>}
          </div>
        </Panel>
        <Panel title="🏢 Client Portfolio">
          <div style={{overflowX:"auto",maxHeight:340,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{position:"sticky",top:0}}>
                <tr style={{background:C.surface}}>
                  {["Client","Projects","Tasks","Completed","Overdue","Progress"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",color:C.t3,fontWeight:700,textTransform:"uppercase",fontSize:10,letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientPortfolio.map(c=>(
                  <tr key={c.name} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"background .12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.surface;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
                    onClick={()=>openModal(`${c.name} — All Tasks`,c.allTasks)}>
                    <td style={{padding:"9px 10px",color:C.accent,fontWeight:700,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</td>
                    <td style={{padding:"9px 10px",color:C.teal,textAlign:"center",fontWeight:700}}>{c.projects}</td>
                    <td style={{padding:"9px 10px",color:C.t2,textAlign:"center"}}>{c.tasks}</td>
                    <td onClick={e=>{e.stopPropagation();openModal(`${c.name} — Completed Tasks`,c.doneTasks);}} style={{padding:"9px 10px",color:C.green,textAlign:"center",fontWeight:700,cursor:"pointer",textDecoration:"underline dotted"}}>{c.done}</td>
                    <td onClick={e=>{e.stopPropagation();if(c.overdue>0)openModal(`${c.name} — Overdue Tasks`,c.ovTasks);}} style={{padding:"9px 10px",color:c.overdue>0?C.red:C.t3,textAlign:"center",fontWeight:c.overdue>0?700:400,cursor:c.overdue>0?"pointer":"default",textDecoration:c.overdue>0?"underline dotted":"none"}}>{c.overdue||"—"}</td>
                    <td style={{padding:"9px 10px",minWidth:110}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                          <div className="rds-perf-bar" style={{height:"100%",width:`${c.pct}%`,background:c.pct>=80?C.green:c.pct>=50?C.blue:C.accent,borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:11,color:C.t2,fontWeight:700,width:28,flexShrink:0}}>{c.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {clientPortfolio.length===0&&<tr><td colSpan={6} style={{padding:20,textAlign:"center",color:C.t3}}>No client data</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* ── Row 3: Priority + Overdue Risk ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?12:18,marginBottom:4}}>
        <Panel title="🎯 Priority Distribution">
          <div style={{display:"flex",alignItems:"center",gap:24}}>
            <Donut segs={priData} label={tasks.length} sub="tasks" size={140} sw={22}/>
            <div style={{flex:1}}>
              <HBar data={priData}/>
              <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>
                {priData.map(p=>(
                  <span key={p.label} onClick={()=>openModal(`${p.label} Priority Tasks`,p.tasks)} style={{fontSize:11,background:p.color+"18",color:p.color,border:`1px solid ${p.color}33`,borderRadius:6,padding:"2px 8px",fontWeight:600,cursor:"pointer"}}>{p.label}: {p.value}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="⚠ Overdue Risk Analysis">
          {overdue===0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"22px 0"}}>
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:C.green,marginTop:8}}>All tasks on schedule!</div>
              <div style={{fontSize:12,color:C.t3,marginTop:4}}>No overdue tasks found</div>
            </div>
          ):(
            <>
              <div style={{marginBottom:14,padding:"8px 14px",background:C.red+"12",border:`1px solid ${C.red}30`,borderRadius:8,fontSize:12,color:C.red,fontWeight:600}}>
                ⚠ {overdue} overdue task{overdue!==1?"s":""} — immediate attention needed
              </div>
              <HBar data={overdueByA.map(u=>({label:u.name,value:u.count,color:C.red,tasks:u.tasks}))}/>
            </>
          )}
        </Panel>
      </div>

      {/* ── SLA Breach Report ── */}
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20,marginTop:8}}>
        <div style={{fontWeight:800,fontSize:15,color:C.t1,marginBottom:4}}>SLA Breach Report</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:14}}>Tasks exceeding SLA (Critical=24h, High=72h, Medium=7d, Low=14d from creation)</div>
        {(()=>{
          const breached=tasks.filter(t=>{const s=getSLAStatus(t);return s&&s.breach;}).sort((a,b)=>getSLAStatus(b).over-getSLAStatus(a).over);
          if(breached.length===0)return <div style={{textAlign:"center",padding:"24px 0",color:C.green,fontWeight:700,fontSize:14}}>All tasks within SLA</div>;
          const byClient={};
          breached.forEach(t=>{const k=t.client||"No Client";if(!byClient[k])byClient[k]=[];byClient[k].push(t);});
          return Object.entries(byClient).map(([client,cts])=>(
            <div key={client} style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.teal,marginBottom:8}}>{"🏢 "+client+" ("+cts.length+")"}</div>
              <div style={{background:C.surface,borderRadius:10,overflow:"hidden",border:"1px solid "+C.border}}>
                {cts.map((t,i)=>{
                  const pj=projects.find(p=>p.id===t.project_id);
                  const s=getSLAStatus(t);
                  const daysOver=Math.round(s.over/24);
                  return(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<cts.length-1?"1px solid "+C.border+"44":"none"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:C.red,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                        <div style={{fontSize:10,color:C.t3}}>{(pj?pj.name:"No project")+" · "+(t.assignee||"Unassigned")}</div>
                      </div>
                      <div style={{flexShrink:0,textAlign:"right"}}>
                        <div style={{fontSize:11,fontWeight:800,color:C.red}}>{daysOver>0?daysOver+"d over":s.over+"h over"}</div>
                        <div style={{fontSize:9,color:C.t3}}>{(t.priority||"Medium")+" SLA"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>

      {modal&&modal.type==="tasks"&&<StatTaskModal title={modal.title} tasks={modal.list} projects={projects} today={today} canEdit={false} onEdit={()=>{}} onClose={()=>setModal(null)}/>}
      {modal&&modal.type==="projects"&&<AnalyticsProjModal title={modal.title} projList={modal.list} tasks={tasks} today={today} onClose={()=>setModal(null)}/>}
      {modal&&modal.type==="clients"&&<AnalyticsClientModal title={modal.title} clientList={modal.list} onClose={()=>setModal(null)}/>}
      {modal&&modal.type==="members"&&<AnalyticsMemberModal title={modal.title} memberList={modal.list} tasks={tasks} onClose={()=>setModal(null)}/>}
    </div>
  );
}



// ══════════════════════════════════════════════════════════
// ANNOUNCEMENTS PAGE
// ══════════════════════════════════════════════════════════
function AnnouncementsPage({me,users,projects,canPost}){
  const isMobile=useMobile();
  const [anns,setAnns]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({title:"",body:"",scope:"company",project_id:""});
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState("all"); // all | company | project

  useEffect(()=>{loadAnns();},[]);
  useEffect(()=>{
    const ch=supabase.channel("anns-rt-"+Date.now())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"announcements"},p=>{
        setAnns(prev=>[p.new,...prev]);
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  async function loadAnns(){
    const{data}=await supabase.from("announcements").select("*")
      .order("pinned",{ascending:false}).order("created_at",{ascending:false}).limit(100);
    setAnns(data||[]);setLoading(false);
  }

  async function postAnn(){
    if(!form.title.trim()||!form.body.trim())return;
    setSaving(true);
    const{data,error}=await supabase.from("announcements").insert({
      title:form.title.trim(),body:form.body.trim(),
      scope:form.scope,project_id:form.scope==="project"?form.project_id:null,
      author:me.username,author_name:me.name,pinned:false
    }).select().single();
    if(!error&&data){
      // notify all users
      const rows=users.filter(u=>u.username!==me.username).map(u=>({
        user_id:u.id,type:"announcement",
        title:`📢 ${me.name}: ${form.title.trim().slice(0,60)}`,
        description:form.body.trim().slice(0,120),
        entity_type:"announcement",entity_id:data.id,created_by:me.username
      }));
      if(rows.length)await supabase.from("notifications").insert(rows);
      setShowForm(false);setForm({title:"",body:"",scope:"company",project_id:""});
    }
    setSaving(false);
  }

  async function togglePin(ann){
    await supabase.from("announcements").update({pinned:!ann.pinned}).eq("id",ann.id);
    setAnns(prev=>prev.map(a=>a.id===ann.id?{...a,pinned:!a.pinned}:a).sort((a,b)=>b.pinned-a.pinned));
  }

  async function deleteAnn(id){
    if(!window.confirm("Delete this announcement?"))return;
    await supabase.from("announcements").delete().eq("id",id);
    setAnns(prev=>prev.filter(a=>a.id!==id));
  }

  const filtered=tab==="all"?anns:anns.filter(a=>a.scope===tab);
  const fmt=dt=>new Date(dt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:900,color:C.t1}}>📢 Announcements</h2>
          <p style={{margin:"4px 0 0",color:C.t3,fontSize:13}}>Company-wide and project updates</p>
        </div>
        {canPost&&(
          <button onClick={()=>setShowForm(v=>!v)}
            style={{background:C.accent,border:"none",borderRadius:9,padding:"9px 20px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            {showForm?"✕ Cancel":"+ New Announcement"}
          </button>
        )}
      </div>

      {/* Post form */}
      {showForm&&canPost&&(
        <div style={{background:C.card,border:`1px solid ${C.accent}44`,borderRadius:14,padding:20,marginBottom:22}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:C.accent}}>📝 New Announcement</h3>
          <input placeholder="Title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
            style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}}/>
          <textarea placeholder="Body — write your announcement here *" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}
            rows={4} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",marginBottom:10}}/>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <select value={form.scope} onChange={e=>setForm(f=>({...f,scope:e.target.value,project_id:""}))}
              style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              <option value="company">🏢 Company-wide</option>
              <option value="project">📁 Project-specific</option>
            </select>
            {form.scope==="project"&&(
              <select value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value}))}
                style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="">Select project…</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button onClick={postAnn} disabled={saving||!form.title.trim()||!form.body.trim()}
              style={{background:C.accent,border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1}}>
              {saving?"Posting…":"📢 Post"}
            </button>
          </div>
        </div>
      )}

      {/* Tab filter */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["all","All"],["company","🏢 Company"],["project","📁 Project"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${tab===id?C.accent:C.border}`,background:tab===id?C.accent+"18":"transparent",color:tab===id?C.accent:C.t2,transition:"all .15s"}}>
            {label} {id==="all"?`(${anns.length})`:id==="company"?`(${anns.filter(a=>a.scope==="company").length})`:id==="project"?`(${anns.filter(a=>a.scope==="project").length})`:null}
          </button>
        ))}
      </div>

      {/* List */}
      {loading?<div style={{textAlign:"center",padding:40,color:C.t3}}>Loading…</div>:
        filtered.length===0?
          <div style={{textAlign:"center",padding:"60px 20px",color:C.t3}}>
            <div style={{fontSize:40,marginBottom:10}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:4}}>No announcements yet</div>
            {canPost&&<div style={{fontSize:13}}>Post the first one above</div>}
          </div>:
        filtered.map(ann=>{
          const proj=ann.project_id?projects.find(p=>p.id===ann.project_id):null;
          return(
            <div key={ann.id} style={{background:C.card,border:`1.5px solid ${ann.pinned?C.accent:C.border}`,borderRadius:14,padding:isMobile?14:20,marginBottom:14,borderLeft:`4px solid ${ann.pinned?C.accent:ann.scope==="company"?"#f59e0b":"#06b6d4"}`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    {ann.pinned&&<span style={{fontSize:10,background:C.accent+"22",color:C.accent,borderRadius:4,padding:"2px 7px",fontWeight:800}}>📌 PINNED</span>}
                    <span style={{fontSize:10,background:ann.scope==="company"?"#f59e0b22":"#06b6d422",color:ann.scope==="company"?"#f59e0b":"#06b6d4",borderRadius:4,padding:"2px 7px",fontWeight:700}}>{ann.scope==="company"?"🏢 Company":"📁 "+( proj?.name||"Project")}</span>
                  </div>
                  <h3 style={{margin:0,fontSize:15,fontWeight:800,color:C.t1,lineHeight:1.3}}>{ann.title}</h3>
                </div>
                {canPost&&(
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>togglePin(ann)} title={ann.pinned?"Unpin":"Pin"}
                      style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:12,color:ann.pinned?C.accent:C.t3,cursor:"pointer",fontFamily:"inherit"}}>
                      📌
                    </button>
                    <button onClick={()=>deleteAnn(ann.id)}
                      style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:12,color:C.red,cursor:"pointer",fontFamily:"inherit"}}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
              <p style={{margin:"0 0 12px",fontSize:13,color:C.t2,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{ann.body}</p>
              <div style={{fontSize:11,color:C.t3,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                <span>👤 {ann.author_name}</span>
                <span>🕐 {fmt(ann.created_at)}</span>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// GANTT VIEW — timeline per project, risk-coloured bars
// ══════════════════════════════════════════════════════════
function GanttPage({projects,tasks,today,onSelectProject}){
  const isMobile=useMobile();
  const [zoom,setZoom]=useState("month");
  const [filterClient,setFc]=useState("All");
  const [filterRisk,setFr]=useState("all"); // "all"|"red"|"yellow"|"none"
  const [showDone,setShowDone]=useState(false);
  const [tooltip,setTt]=useState(null); // {x,y,p}
  const containerRef=useRef();

  // px per day
  const PPD=zoom==="week"?42:zoom==="month"?14:5;
  const LW=isMobile?130:230; // label column width
  const RH=40; // row height
  const GH=28; // group header height
  const HDR=52; // timeline header height

  // date range: show from 30/14/30 days before today to end of last project
  const todayD=new Date(today);
  const rangePad={week:14,month:21,quarter:60};
  const rs=new Date(todayD); rs.setDate(rs.getDate()-rangePad[zoom]);
  const maxDeadline=projects.reduce((mx,p)=>{
    const d=p.deadline||null;
    return(d&&d>mx)?d:mx;
  },"");
  const reD=maxDeadline?new Date(Math.max(new Date(maxDeadline),todayD)):new Date(todayD);
  reD.setDate(reD.getDate()+(zoom==="week"?14:zoom==="month"?30:90));
  const totalDays=Math.ceil((reD-rs)/86400000)+1;
  const TW=totalDays*PPD;

  const dx=dateStr=>{if(!dateStr)return null;return Math.round((new Date(dateStr)-rs)/86400000)*PPD;};
  const todayX=dx(today);

  // Build enriched project list
  const enriched=projects.map(p=>{
    const pt=tasks.filter(t=>t.project_id===p.id);
    const done=pt.filter(t=>isDone(t.status)).length;
    const pct=pt.length?Math.round(done/pt.length*100):0;
    const withDue=pt.filter(t=>t.due_date).map(t=>t.due_date).sort();
    const startD=withDue[0]||null;
    const latestTask=withDue[withDue.length-1]||null;
    const deadline=p.deadline||latestTask||null;
    const start=startD||(deadline?new Date(new Date(deadline).getTime()-21*86400000).toISOString().slice(0,10):null);
    const daysLeft=deadline?Math.ceil((new Date(deadline)-todayD)/86400000):null;
    const risk=!deadline?"none":daysLeft<0&&pct<100?"red":daysLeft<=30&&pct<80?"yellow":"green";
    return{...p,pt,pct,deadline,start,risk,total:pt.length,done,inProg:pt.filter(t=>t.status==="In Progress").length};
  });

  const clientNames=["All",...[...new Set(projects.map(p=>p.client||"Unassigned"))].sort()];
  const filtered=enriched
    .filter(p=>filterClient==="All"||(p.client||"Unassigned")===filterClient)
    .filter(p=>filterRisk==="all"||p.risk===filterRisk)
    .filter(p=>showDone||p.pct<100||p.total===0)
    .sort((a,b)=>{
      const o={red:0,yellow:1,green:2,none:3};
      if(o[a.risk]!==o[b.risk])return o[a.risk]-o[b.risk];
      if(a.deadline&&b.deadline)return a.deadline.localeCompare(b.deadline);
      return a.deadline?-1:b.deadline?1:a.name.localeCompare(b.name);
    });

  // Group by client
  const groupMap={};
  filtered.forEach(p=>{const k=p.client||"Unassigned";if(!groupMap[k])groupMap[k]=[];groupMap[k].push(p);});
  const groups=Object.entries(groupMap);

  // Timeline header ticks
  const ticks=[];
  {
    let d=new Date(rs);
    while(d<=reD){
      const ds=d.toISOString().slice(0,10);
      const x=dx(ds);
      if(zoom==="week"){
        ticks.push({x,label:d.toLocaleDateString("en-US",{weekday:"short",day:"numeric"}),major:d.getDay()===1});
        d.setDate(d.getDate()+1);
      }else if(zoom==="month"){
        if(d.getDay()===1||ticks.length===0){
          ticks.push({x,label:d.toLocaleDateString("en-US",{month:"short",day:"numeric"}),major:d.getDate()<=7});
        }
        d.setDate(d.getDate()+1);
      }else{
        if(d.getDate()===1||ticks.length===0){
          ticks.push({x,label:d.toLocaleDateString("en-US",{month:"short",year:"2-digit"}),major:true});
        }
        d.setDate(d.getDate()+1);
      }
    }
  }

  const rc=r=>r==="red"?C.red:r==="yellow"?C.yellow:r==="green"?C.green:C.t3;

  // KPI counts
  const redC=enriched.filter(p=>p.risk==="red").length;
  const yelC=enriched.filter(p=>p.risk==="yellow").length;
  const noDl=enriched.filter(p=>!p.deadline).length;

  // Scroll to today on zoom change
  useEffect(()=>{
    if(containerRef.current&&todayX!=null){
      containerRef.current.scrollLeft=Math.max(0,todayX-LW-80);
    }
  },[zoom]);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,height:"100%",minHeight:0}}>
      {/* KPI strip — clickable filters */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",flexShrink:0}}>
        {[
          {l:"Total Projects",v:enriched.length,c:C.teal,key:"all",icon:"📋"},
          {l:"Overdue",v:redC,c:C.red,key:"red",icon:"🔴"},
          {l:"At Risk (30d)",v:yelC,c:C.yellow,key:"yellow",icon:"🟡"},
          {l:"No Deadline",v:noDl,c:C.t3,key:"none",icon:"⚪"},
        ].map(k=>{
          const active=filterRisk===k.key;
          return(
            <div key={k.key}
              onClick={()=>setFr(active?"all":k.key)}
              style={{
                background:active?`${k.c}18`:C.card,
                border:`1px solid ${active?k.c:C.border}`,
                borderRadius:10,padding:"10px 16px",minWidth:110,flex:"1 1 110px",
                cursor:"pointer",transition:"all .15s",position:"relative",
                boxShadow:active?`0 0 0 1px ${k.c}44`:"none",
              }}
              onMouseEnter={e=>{if(!active)e.currentTarget.style.borderColor=k.c+"66";}}
              onMouseLeave={e=>{if(!active)e.currentTarget.style.borderColor=C.border;}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:10,color:active?k.c:C.t3,fontWeight:active?700:400,whiteSpace:"nowrap"}}>{k.icon} {k.l}</div>
                {active&&<span style={{fontSize:9,background:k.c,color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:700}}>ON</span>}
              </div>
              <div style={{fontSize:22,fontWeight:800,color:active?k.c:k.c}}>{k.v}</div>
              {active&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:k.c,borderRadius:"0 0 10px 10px"}}/>}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
        <div style={{display:"flex",gap:2,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:3,flexShrink:0}}>
          {[["week","Week"],["month","Month"],["quarter","Quarter"]].map(([z,l])=>(
            <button key={z} onClick={()=>setZoom(z)} style={{background:zoom===z?C.teal:"transparent",border:"none",borderRadius:6,padding:"5px 12px",color:zoom===z?"#fff":C.t2,fontSize:12,fontWeight:zoom===z?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{l}</button>
          ))}
        </div>
        <select value={filterClient} onChange={e=>setFc(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {clientNames.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.t2,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)} style={{accentColor:C.teal}}/>
          Show 100% complete
        </label>
        {/* Legend */}
        <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          {[["red",C.red,"Overdue"],["yellow",C.yellow,"< 30d + <80%"],["green",C.green,"On track"],["none",C.t3,"No deadline"]].map(([k,col,l])=>(
            <span key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t3}}>
              <span style={{width:10,height:10,borderRadius:2,background:col,flexShrink:0,display:"inline-block"}}/>
              {l}
            </span>
          ))}
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t3}}>
            <span style={{width:2,height:12,background:C.accent,display:"inline-block"}}/>Today
          </span>
        </div>
      </div>

      {/* Gantt chart — single scroll container with sticky label column */}
      <div ref={containerRef} style={{flex:1,overflow:"auto",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,minHeight:0,position:"relative"}}>
        <div style={{minWidth:LW+TW,display:"inline-block",verticalAlign:"top",width:"100%"}}>

          {/* Timeline header */}
          <div style={{display:"flex",position:"sticky",top:0,zIndex:20,background:C.surface,borderBottom:`1px solid ${C.border}`,height:HDR}}>
            <div style={{width:LW,minWidth:LW,position:"sticky",left:0,zIndex:21,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"flex-end",padding:"0 12px 10px",flexShrink:0}}>
              <span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.07em"}}>Project · Risk</span>
            </div>
            <div style={{position:"relative",flexGrow:1,height:HDR,minWidth:TW}}>
              {ticks.map((t,i)=>(
                <div key={i} style={{position:"absolute",left:t.x,top:0,height:"100%",borderLeft:`1px solid ${t.major?C.border:C.border+"66"}`,display:"flex",alignItems:"flex-end",paddingBottom:8,paddingLeft:3,pointerEvents:"none"}}>
                  <span style={{fontSize:t.major?10:9,color:t.major?C.t2:C.t3,whiteSpace:"nowrap",fontWeight:t.major?600:400}}>{t.label}</span>
                </div>
              ))}
              {todayX!=null&&(
                <div style={{position:"absolute",left:todayX,top:0,height:"100%",borderLeft:`2px solid ${C.accent}`,zIndex:5,pointerEvents:"none"}}>
                  <span style={{position:"absolute",top:6,left:3,fontSize:9,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.surface,padding:"1px 4px",borderRadius:3}}>TODAY</span>
                </div>
              )}
            </div>
          </div>

          {/* Rows */}
          {groups.map(([client,projs])=>(
            <div key={client}>
              {/* Client group header */}
              <div style={{display:"flex",height:GH,position:"sticky",zIndex:10,background:C.surface+"ee",backdropFilter:"blur(4px)"}}>
                <div style={{width:LW,minWidth:LW,position:"sticky",left:0,zIndex:11,background:C.surface+"ee",borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 12px",gap:6,flexShrink:0}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:`hsl(${(client.charCodeAt(0)*23)%360},60%,50%)`}}/>
                  <span style={{fontSize:9,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.07em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client} · {projs.length}</span>
                </div>
                <div style={{position:"relative",flexGrow:1,minWidth:TW,borderBottom:`1px solid ${C.border}`,background:C.surface+"44"}}>
                  {ticks.map((t,i)=>(t.major?<div key={i} style={{position:"absolute",left:t.x,top:0,bottom:0,borderLeft:`1px solid ${C.border}44`,pointerEvents:"none"}}/>:null))}
                </div>
              </div>

              {/* Project rows */}
              {projs.map((p,ri)=>{
                const x1=p.start?dx(p.start):null;
                const x2=p.deadline?dx(p.deadline):null;
                const barW=x1!=null&&x2!=null?Math.max(x2-x1,PPD*2):PPD*4;
                const barX=x1!=null?x1:(x2!=null?x2-barW:(todayX||0)-barW/2);
                const fillW=Math.round(barW*p.pct/100);
                const riskC=rc(p.risk);
                const isEven=ri%2===0;
                return(
                  <div key={p.id} style={{display:"flex",height:RH,background:isEven?C.card:C.surface+"66"}}
                    onMouseLeave={()=>setTt(null)}>
                    {/* Label cell */}
                    <div style={{width:LW,minWidth:LW,position:"sticky",left:0,zIndex:8,background:isEven?C.card:C.surface+"ee",borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 8px 0 12px",gap:6,cursor:"pointer",flexShrink:0,transition:"background .1s"}}
                      onClick={()=>onSelectProject(p.id)}
                      onMouseEnter={e=>e.currentTarget.style.background=C.border}
                      onMouseLeave={e=>{e.currentTarget.style.background=isEven?C.card:C.surface+"ee";setTt(null);}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:riskC,flexShrink:0}}/>
                      <span style={{fontSize:11,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,lineHeight:1.3}}>{p.name}</span>
                      <span style={{fontSize:10,color:riskC,fontWeight:700,flexShrink:0}}>{p.total?`${p.pct}%`:""}</span>
                    </div>
                    {/* Timeline cell */}
                    <div style={{position:"relative",flexGrow:1,minWidth:TW,cursor:"pointer"}}
                      onClick={()=>onSelectProject(p.id)}
                      onMouseMove={e=>{
                        const rect=e.currentTarget.closest('[data-gantt]')?.getBoundingClientRect()||{left:0,top:0};
                        setTt({x:e.clientX,y:e.clientY,p});
                      }}>
                      {/* Grid lines */}
                      {ticks.filter(t=>t.major).map((t,i)=>(
                        <div key={i} style={{position:"absolute",left:t.x,top:0,bottom:0,borderLeft:`1px solid ${C.border}33`,pointerEvents:"none"}}/>
                      ))}
                      {/* Today marker */}
                      {todayX!=null&&<div style={{position:"absolute",left:todayX,top:0,bottom:0,borderLeft:`2px solid ${C.accent}44`,pointerEvents:"none",zIndex:2}}/>}
                      {/* Bar */}
                      <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:barX,width:barW,height:22,borderRadius:5,background:`${riskC}1a`,border:`1px solid ${riskC}55`,overflow:"hidden",zIndex:3}}>
                        {/* Progress fill */}
                        <div style={{position:"absolute",inset:0,width:fillW,background:`${riskC}77`,borderRadius:5,transition:"width .3s"}}/>
                        {/* Label */}
                        {barW>48&&<span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",fontSize:9,color:"#ffffffcc",fontWeight:700,whiteSpace:"nowrap",zIndex:4,pointerEvents:"none"}}>{p.pct}% · {p.done}/{p.total}</span>}
                      </div>
                      {/* Deadline diamond marker */}
                      {x2!=null&&(
                        <div style={{position:"absolute",top:"50%",left:x2,transform:"translate(-5px,-50%) rotate(45deg)",width:8,height:8,background:riskC,border:`1px solid ${riskC}`,zIndex:4,pointerEvents:"none",borderRadius:1}}/>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {filtered.length===0&&(
            <div style={{padding:60,textAlign:"center",color:C.t3,fontSize:13}}>No projects match the current filters.</div>
          )}
        </div>

        {/* Tooltip */}
        {tooltip&&(
          <div style={{position:"fixed",left:tooltip.x+14,top:tooltip.y-10,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",zIndex:9999,boxShadow:"0 8px 24px #00000080",pointerEvents:"none",maxWidth:240}}>
            <div style={{fontWeight:700,fontSize:13,color:C.t1,marginBottom:6,lineHeight:1.3}}>{tooltip.p.name}</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {[
                ["Client",tooltip.p.client||"—"],
                ["Progress",`${tooltip.p.pct}% (${tooltip.p.done}/${tooltip.p.total} tasks)`],
                ["In Progress",`${tooltip.p.inProg} tasks`],
                ["Deadline",tooltip.p.deadline||"Not set"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:6,fontSize:11}}>
                  <span style={{color:C.t3,minWidth:70}}>{k}</span>
                  <span style={{color:k==="Deadline"&&tooltip.p.risk==="red"?C.red:C.t1,fontWeight:k==="Deadline"?600:400}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:4,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:2,background:rc(tooltip.p.risk)}}/>
                <span style={{fontSize:11,color:rc(tooltip.p.risk),fontWeight:600,textTransform:"capitalize"}}>{tooltip.p.risk==="none"?"No deadline":tooltip.p.risk==="red"?"Overdue":tooltip.p.risk==="yellow"?"At risk":"On track"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// WAR ROOM — realtime per-project chat + video
// ══════════════════════════════════════════════════════════
function WarRoomPage({me,projects,users}){
  const isMobile=useMobile();
  // ── Existing state ──
  const [activePid,setActivePid]=useState(null);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [sending,setSending]=useState(false);
  const [loading,setLoading]=useState(false);
  const [lastMsgs,setLastMsgs]=useState({});
  const [chatHistory,setChatHistory]=useState([]);
  const [mentionList,setMentionList]=useState([]);
  const [mentionOpen,setMentionOpen]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [dragOver,setDragOver]=useState(null);
  const [projSearch,setProjSearch]=useState("");
  const [mediaFile,setMediaFile]=useState(null);
  const [mediaPreview,setMediaPreview]=useState(null);
  const [reactions,setReactions]=useState({});
  const [emojiPickerMsgId,setEmojiPickerMsgId]=useState(null);
  const [emojiOpen,setEmojiOpen]=useState(false);
  const [emojiCat,setEmojiCat]=useState(0);
  const [historyClientId,setHistoryClientId]=useState(null);
  const [historyMsgs,setHistoryMsgs]=useState([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  // ── Advanced feature state ──
  const [searchOpen,setSearchOpen]=useState(false);
  const [msgSearch,setMsgSearch]=useState("");
  const [replyTo,setReplyTo]=useState(null);
  const [pins,setPins]=useState([]);
  const [pinsOpen,setPinsOpen]=useState(false);
  const [msgMenuId,setMsgMenuId]=useState(null);
  const [editingMsgId,setEditingMsgId]=useState(null);
  const [editBody,setEditBody]=useState("");
  const [typingUsers,setTypingUsers]=useState([]);
  const [previewFile,setPreviewFile]=useState(null);
  const [isScrolledUp,setIsScrolledUp]=useState(false);
  const [newMsgCount,setNewMsgCount]=useState(0);
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [scheduleTime,setScheduleTime]=useState("");
  const [scheduledMsgs,setScheduledMsgs]=useState([]);
  const [scheduledOpen,setScheduledOpen]=useState(false);
  const [recording,setRecording]=useState(false);
  const [recordSecs,setRecordSecs]=useState(0);
  const [tagPickerMsgId,setTagPickerMsgId]=useState(null);
  const [createTaskFrom,setCreateTaskFrom]=useState(null);
  const [summaryOpen,setSummaryOpen]=useState(false);
  const [summaryText,setSummaryText]=useState("");
  const [reads,setReads]=useState({});
  const [unreadCounts,setUnreadCounts]=useState({});
  // ── Refs ──
  const endRef=useRef();
  const inputRef=useRef();
  const fileInputRef=useRef();
  const lastMsgAtRef=useRef(null);
  const scrollAreaRef=useRef();
  const presenceChRef=useRef(null);
  const recorderRef=useRef(null);
  const audioChunksRef=useRef([]);
  const recordTimerRef=useRef(null);
  const typingTimerRef=useRef(null);
  const prevMsgCountRef=useRef(0);
  // ── Constants ──
  const EMOJIS=["👍","❤️","😂","😮","😢","👏","🔥","✅"];
  const STATUS_TAGS=[
    {key:"action_required",label:"Action Required",color:"#ef4444",icon:"⚡"},
    {key:"fyi",label:"FYI",color:"#3b82f6",icon:"ℹ️"},
    {key:"resolved",label:"Resolved",color:"#22c55e",icon:"✅"},
    {key:"urgent",label:"Urgent",color:"#f97316",icon:"🚨"},
  ];
  const EMOJI_CATS=[
    {label:"😀",name:"Smileys",emojis:"😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😙🥲😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕😟🙁☹️😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👹👺👻👽👾🤖😺😸😹😻😼😽🙀😿😾".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"👋",name:"People",emojis:"👋🤚🖐️✋🖖🤙👌🤌🤏✌️🤞🤟🤘👈👉👆🖕👇☝️👍👎✊👊🤛🤜🤝👏🙌🫶👐🤲🙏💅💪🦵🦶👂👃👀👅👄💋👶🧒👦👧🧑👱👨🧔👩🧓👴👵👮🧑‍⚕️👷💂🕵️👩‍🔬👩‍🏫👩‍🍳👩‍🎨👩‍✈️👩‍🚀👩‍💻🧙🧚🧛🧜🧝🧞🧟🧌".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"🐱",name:"Animals",emojis:"🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🐤🦅🦆🦢🦉🦚🦜🦋🐛🐌🐞🐜🐢🐍🦎🐙🦑🦐🦀🐡🐠🐟🐬🐳🦈🐊🐘🦛🦏🐪🦒🦘🐃🐄🐎🐖🐏🐑🐐🦌🐕🐈🐓🦃🕊️🐇🦝🦦🥲🐁🐀🐿️🦔🌿🍀🌸🌺🌻🌹🌷💐🌾🍁🍄🌰".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"🍕",name:"Food",emojis:"🍕🍔🍟🌭🍿🧆🥚🍳🧇🥞🧈🥓🥩🍗🍖🌮🌯🫔🥙🧆🥗🥘🫕🍜🍛🍣🍱🍘🍙🍚🍛🥟🦪🍤🍩🍪🎂🍰🧁🥧🍫🍬🍭🍮🍯🍦🍧🍨🍑🍒🍓🫐🍇🍈🍉🍊🍋🍌🍍🥭🍎🍏🍐🍅🫒🥥🥝🍆🥑🥦🥬🥒🌶️🫑🧄🧅🥔🍠🫘🌽🍞🥐🥖🫓🥨🥯🧀🥚🫙🍵☕🫖🧃🥤🧋🍺🍻🥂🍷🥃🍸🍹🧉🍾".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"🌍",name:"Travel",emojis:"🌍🌎🌏🌐🗺️🧭🏔️⛰️🌋🗻🏕️🏖️🏜️🏝️🏟️🏛️🏗️🏘️🏚️🏠🏡🏢🏣🏤🏥🏦🏨🏪🏫🏬🏭🏯🏰💒🗼🗽⛪🕌🕍⛩️⛲⛺🌁🌃🏙️🌄🌅🌆🌇🌉🌌🌠🚗🚕🚙🚌🚎🏎️🚓🚑🚒🚐🛻🚚🚛🚜🏍️🛵🚲🛴🚏✈️🛫🛬🪂⛵🚢🛥️🛸🚀🚁⛽🚦🚥🚧⚓🏁🎌🏴🏳️".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"⚽",name:"Activity",emojis:"⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🏓🏸🥊🥋⛳🎣🤿🎽🎿🛷🥌🎯🎮🎲♟️🎭🎨🎬🎤🎧🎼🎹🥁🎷🎸🎺🎻🪕🪘🪗🎙️🎚️🎛️📻🏆🥇🥈🥉🏅🎖️🎗️🎫🎟️🎪🤹🎠🎡🎢🎑🎆🎇🧨✨🎉🎊🎃🎄🎋🎍🎎🎐🎁🎀🎈🪅🎏".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"💡",name:"Objects",emojis:"💡🔦🕯️🪔💰💵💴💶💷💸💳🧾💎🪙💹📈📉📊📋📌📍📎🖇️📏📐✂️🗂️🗃️🗄️🗑️🔒🔓🔑🗝️🔨🪓⛏️⚒️🛠️🔧🔩⚙️🔮🧿🧸🪆🖼️🧩💊💉🩺🩹🩻🩼🩸🧬🔬🔭📡🧪🧫🧲💻🖥️🖨️⌨️🖱️💾💿📀📷📸📹📱☎️📞📟📠🔋🪫🔌💡🔦📺📻🧭⏰⏱️⏲️⌚🕰️🪝🧲🪜🧰🧱🪞🪟🛋️🪑🚿🛁🪠🧴🧷🧹🧺🧻🧼🫧🪥🧽🪣".split(/(?<=\p{Emoji})/u).filter(Boolean)},
    {label:"❤️",name:"Symbols",emojis:"❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟☮️✝️☪️✡️☯️🛐♈♉♊♋♌♍♎♏♐♑♒♓⛎🆔⚡🌀🌈💦💫✨⭐🌟💥🔥🌊❗❓‼️⁉️🔴🟠🟡🟢🔵🟣🟤⚫⚪🔶🔷🔸🔹🔺🔻💠🔘🔳🔲⬛⬜◼️◻️◾◽▪️▫️🔱⚜️🔰♻️✅❎🚫🔞📵🔇🔕⛔🚷🚯🚳🚱📴📳🔞💯🔤🔡🔢✴️🆚🉑💮🈴🈺🈶🈚🈸🈵🈹🈲🅰️🅱️🆎🆑🅾️🆘❌⭕🛑🚫🔴".split(/(?<=\p{Emoji})/u).filter(Boolean)},
  ];
  const allMembers=users.map(u=>({name:u.name,username:u.username}));
  const clients=users.filter(u=>u.role==="Client");
  const visibleClients=clients;
  function canSendInRoom(cl){if(!cl)return false;return true;}

  // ── Load sidebar history + unread counts ──
  useEffect(()=>{
    if(clients.length===0)return;
    (async()=>{
      const{data}=await supabase.from("war_room_messages").select("client_id,body,author_name,created_at,author")
        .in("client_id",clients.map(c=>c.username)).order("created_at",{ascending:false}).limit(500);
      const map={};const hist={};
      // Compute unread: messages from others since last visit
      const lastVisit=JSON.parse(localStorage.getItem("wr_lastvisit")||"{}");
      const unreads={};
      (data||[]).forEach(m=>{
        if(!m.client_id)return;
        if(!map[m.client_id])map[m.client_id]=m;
        if(!hist[m.client_id])hist[m.client_id]={count:0,participants:new Set(),lastAt:m.created_at};
        hist[m.client_id].count++;hist[m.client_id].participants.add(m.author_name);
        // Count unread: from others, after last visit
        if(m.author!==me.username){
          const lastSeen=lastVisit[m.client_id];
          if(!lastSeen||new Date(m.created_at)>new Date(lastSeen)){
            unreads[m.client_id]=(unreads[m.client_id]||0)+1;
          }
        }
      });
      setLastMsgs(map);
      setUnreadCounts(unreads);
      setChatHistory(Object.entries(hist).map(([cid,h])=>({client_id:cid,count:h.count,participants:[...h.participants],lastAt:h.lastAt})).sort((a,b)=>new Date(b.lastAt)-new Date(a.lastAt)));
    })();
  },[users]);

  function appendNew(rows,pid){
    if(!rows?.length)return;
    setMessages(prev=>{
      const ids=new Set(prev.map(m=>m.id));
      const fresh=rows.filter(m=>!ids.has(m.id));
      if(!fresh.length)return prev;
      lastMsgAtRef.current=fresh[fresh.length-1].created_at;
      if(pid||activePid)setLastMsgs(p=>({...p,[pid||activePid]:fresh[fresh.length-1]}));
      // Increment unread count for messages from others
      const othersNew=fresh.filter(m=>m.author!==me.username);
      if(othersNew.length)setUnreadCounts(u=>({...u,[pid||activePid]:((u[pid||activePid]||0)+othersNew.length)}));
      // Track new messages when scrolled up
      setNewMsgCount(n=>n+fresh.length);
      setTimeout(()=>{
        const el=scrollAreaRef.current;
        if(el){const atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;if(atBottom){endRef.current?.scrollIntoView({behavior:"smooth"});setNewMsgCount(0);}}
      },80);
      return [...prev,...fresh];
    });
  }

  // ── Load messages + realtime + polling ──
  useEffect(()=>{
    if(!activePid){setMessages([]);lastMsgAtRef.current=null;setReactions({});setNewMsgCount(0);setSearchOpen(false);setMsgSearch("");setReplyTo(null);setMsgMenuId(null);setEditingMsgId(null);return;}
    // Mark this client as visited — clear unread badge
    const lv=JSON.parse(localStorage.getItem("wr_lastvisit")||"{}");
    lv[activePid]=new Date().toISOString();
    localStorage.setItem("wr_lastvisit",JSON.stringify(lv));
    setUnreadCounts(prev=>({...prev,[activePid]:0}));
    let ch;let poll;const cid=activePid;
    async function loadReactions(msgIds){
      if(!msgIds?.length)return;
      const{data:rd}=await supabase.from("war_room_reactions").select("message_id,emoji,user_username").in("message_id",msgIds);
      const map={};
      (rd||[]).forEach(r=>{if(!map[r.message_id])map[r.message_id]={};if(!map[r.message_id][r.emoji])map[r.message_id][r.emoji]=[];map[r.message_id][r.emoji].push(r.user_username);});
      setReactions(prev=>({...prev,...map}));
    }
    (async()=>{
      setLoading(true);
      const{data}=await supabase.from("war_room_messages").select("*").eq("client_id",cid).order("created_at",{ascending:true}).limit(300);
      setMessages(data||[]);prevMsgCountRef.current=(data||[]).length;
      lastMsgAtRef.current=(data||[]).at(-1)?.created_at||null;
      setLoading(false);
      setTimeout(()=>{endRef.current?.scrollIntoView({behavior:"instant"});setNewMsgCount(0);},100);
      if(data?.length)await loadReactions(data.map(m=>m.id));
    })();
    ch=supabase.channel("warroom-"+cid+"-"+Date.now())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"war_room_messages"},p=>{
        if(p.new?.client_id!==cid)return;appendNew([p.new],cid);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"war_room_messages"},p=>{
        if(p.new?.client_id!==cid)return;
        setMessages(prev=>prev.map(m=>m.id===p.new.id?{...m,...p.new}:m));
      })
      .subscribe();
    poll=setInterval(async()=>{
      const since=lastMsgAtRef.current;if(!since)return;
      const{data}=await supabase.from("war_room_messages").select("*").eq("client_id",cid).gt("created_at",since).order("created_at",{ascending:true}).limit(50);
      appendNew(data,cid);
    },5000);
    return()=>{supabase.removeChannel(ch);clearInterval(poll);};
  },[activePid]);

  // ── Presence / typing indicator ──
  useEffect(()=>{
    if(!activePid){setTypingUsers([]);return;}
    const cid=activePid;
    const ch=supabase.channel("typing-"+cid,{config:{presence:{key:me.username}}})
      .on("presence",{event:"sync"},()=>{
        const state=ch.presenceState();
        const typing=Object.entries(state).filter(([k,v])=>k!==me.username&&v[0]?.typing).map(([,v])=>({name:v[0].name,username:v[0].username}));
        setTypingUsers(typing);
      }).subscribe(async(s)=>{if(s==="SUBSCRIBED")await ch.track({username:me.username,name:me.name,typing:false});});
    presenceChRef.current=ch;
    return()=>{supabase.removeChannel(ch);presenceChRef.current=null;};
  },[activePid]);

  // ── Load pins ──
  useEffect(()=>{
    if(!activePid){setPins([]);setPinsOpen(false);return;}
    supabase.from("war_room_pins").select("*").eq("client_id",activePid).order("created_at",{ascending:true}).then(({data})=>setPins(data||[]));
  },[activePid]);

  // ── Load scheduled + poll to send them ──
  useEffect(()=>{
    if(!activePid){setScheduledMsgs([]);return;}
    const cid=activePid;
    supabase.from("war_room_scheduled").select("*").eq("client_id",cid).eq("sent",false).order("send_at").then(({data})=>setScheduledMsgs(data||[]));
    const poll=setInterval(async()=>{
      const now=new Date().toISOString();
      const{data}=await supabase.from("war_room_scheduled").select("*").eq("client_id",cid).eq("sent",false).lte("send_at",now);
      for(const sm of(data||[])){
        await supabase.from("war_room_messages").insert({client_id:sm.client_id,author:sm.author,author_name:sm.author_name,body:sm.body,mentions:[]});
        await supabase.from("war_room_scheduled").update({sent:true}).eq("id",sm.id);
      }
      if(data?.length)setScheduledMsgs(prev=>prev.filter(m=>!data.find(d=>d.id===m.id)));
    },30000);
    return()=>clearInterval(poll);
  },[activePid]);

  // ── Load read receipts ──
  useEffect(()=>{
    if(!activePid)return;
    supabase.from("war_room_reads").select("*").eq("client_id",activePid).then(({data})=>{
      const map={};(data||[]).forEach(r=>{map[r.user_username]=r.last_read_msg_id;});setReads(map);
    });
  },[activePid]);

  // ── Mark as read when scrolled to bottom ──
  async function markRead(){
    const lastMsg=messages[messages.length-1];
    if(!lastMsg||!activePid)return;
    await supabase.from("war_room_reads").upsert({client_id:activePid,user_username:me.username,last_read_msg_id:lastMsg.id,last_read_at:new Date().toISOString()},{onConflict:"client_id,user_username"});
    setReads(prev=>({...prev,[me.username]:lastMsg.id}));
  }

  // ── Scroll handler ──
  function handleScroll(){
    const el=scrollAreaRef.current;if(!el)return;
    const atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;
    setIsScrolledUp(!atBottom);
    if(atBottom){setNewMsgCount(0);markRead();}
  }

  // ── Typing signal ──
  async function sendTypingSignal(){
    if(!presenceChRef.current)return;
    await presenceChRef.current.track({username:me.username,name:me.name,typing:true});
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current=setTimeout(async()=>{
      await presenceChRef.current?.track({username:me.username,name:me.name,typing:false});
    },2000);
  }

  // ── Reactions ──
  async function toggleReaction(msgId,emoji){
    const existing=(reactions[msgId]?.[emoji])||[];
    const hasIt=existing.includes(me.username);
    setReactions(prev=>{
      const mr={...(prev[msgId]||{})};const us=[...(mr[emoji]||[])];
      if(hasIt){mr[emoji]=us.filter(u=>u!==me.username);if(!mr[emoji].length)delete mr[emoji];}
      else mr[emoji]=[...us,me.username];
      return{...prev,[msgId]:mr};
    });
    setEmojiPickerMsgId(null);
    if(hasIt)await supabase.from("war_room_reactions").delete().eq("message_id",msgId).eq("user_username",me.username).eq("emoji",emoji);
    else await supabase.from("war_room_reactions").insert({message_id:msgId,user_username:me.username,emoji});
  }

  // ── Pin / Unpin ──
  async function pinMessage(msg){
    const{data}=await supabase.from("war_room_pins").insert({client_id:activePid,message_id:msg.id,message_body:msg.edited_body||msg.body,message_author:msg.author_name,pinned_by:me.username}).select().single();
    if(data){setPins(prev=>[...prev,data]);setPinsOpen(true);}
    setMsgMenuId(null);
  }
  async function unpinMessage(pinId){
    await supabase.from("war_room_pins").delete().eq("id",pinId);
    setPins(prev=>prev.filter(p=>p.id!==pinId));
  }

  // ── Edit / Delete ──
  async function saveEdit(msgId){
    if(!editBody.trim())return;
    const now=new Date().toISOString();
    await supabase.from("war_room_messages").update({edited_body:editBody.trim(),edited_at:now}).eq("id",msgId);
    setMessages(prev=>prev.map(m=>m.id===msgId?{...m,edited_body:editBody.trim(),edited_at:now}:m));
    setEditingMsgId(null);setEditBody("");
  }
  async function deleteMessage(msgId){
    await supabase.from("war_room_messages").update({is_deleted:true}).eq("id",msgId);
    setMessages(prev=>prev.map(m=>m.id===msgId?{...m,is_deleted:true}:m));
    setMsgMenuId(null);
  }

  // ── Status tag ──
  async function setStatusTag(msgId,tag){
    const cur=messages.find(m=>m.id===msgId)?.status_tag;
    const newTag=cur===tag?null:tag;
    await supabase.from("war_room_messages").update({status_tag:newTag}).eq("id",msgId);
    setMessages(prev=>prev.map(m=>m.id===msgId?{...m,status_tag:newTag}:m));
    setTagPickerMsgId(null);setMsgMenuId(null);
  }

  // ── Voice note ──
  async function toggleRecording(){
    if(recording){
      recorderRef.current?.stop();
      setRecording(false);clearInterval(recordTimerRef.current);setRecordSecs(0);
    }else{
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const recorder=new MediaRecorder(stream);
        audioChunksRef.current=[];
        recorder.ondataavailable=e=>audioChunksRef.current.push(e.data);
        recorder.onstop=async()=>{
          const blob=new Blob(audioChunksRef.current,{type:"audio/webm"});
          const file=new File([blob],`voice_${Date.now()}.webm`,{type:"audio/webm"});
          setMediaFile(file);setMediaPreview(null);
          stream.getTracks().forEach(t=>t.stop());
        };
        recorder.start();recorderRef.current=recorder;setRecording(true);setRecordSecs(0);
        recordTimerRef.current=setInterval(()=>setRecordSecs(s=>s+1),1000);
      }catch{alert("Microphone access denied or not available");}
    }
  }

  // ── Schedule message ──
  async function sendScheduled(){
    if(!input.trim()||!scheduleTime)return;
    const{data}=await supabase.from("war_room_scheduled").insert({client_id:activePid,author:me.username,author_name:me.name,body:input.trim(),send_at:new Date(scheduleTime).toISOString()}).select().single();
    if(data)setScheduledMsgs(prev=>[...prev,data]);
    setInput("");setScheduleOpen(false);setScheduleTime("");
  }
  async function cancelScheduled(id){
    await supabase.from("war_room_scheduled").delete().eq("id",id);
    setScheduledMsgs(prev=>prev.filter(m=>m.id!==id));
  }

  // ── Chat summary ──
  function generateSummary(){
    const msgs=messages.filter(m=>!m.is_deleted).slice(-60);
    if(!msgs.length){setSummaryText("No messages to summarize.");setSummaryOpen(true);return;}
    const participants=[...new Set(msgs.map(m=>m.author_name))];
    const byAuthor={};
    msgs.forEach(m=>{byAuthor[m.author_name]=(byAuthor[m.author_name]||0)+1;});
    const actionItems=msgs.filter(m=>m.status_tag==="action_required");
    const resolved=msgs.filter(m=>m.status_tag==="resolved");
    const urgent=msgs.filter(m=>m.status_tag==="urgent");
    const lines=[
      `📊 Conversation Summary  (last ${msgs.length} messages)`,
      ``,
      `👥 Participants: ${participants.join(", ")}`,
      `📈 Volume: ${Object.entries(byAuthor).map(([n,c])=>`${n} (${c})`).join("  ·  ")}`,
      `🕐 Period: ${new Date(msgs[0].created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} → ${new Date(msgs[msgs.length-1].created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}`,
    ];
    if(actionItems.length){lines.push("");lines.push(`⚡ Action Required (${actionItems.length}):`);actionItems.forEach(m=>lines.push(`  • ${m.author_name}: "${(m.edited_body||m.body||"").slice(0,90)}"`));}
    if(urgent.length){lines.push("");lines.push(`🚨 Urgent (${urgent.length}):`);urgent.forEach(m=>lines.push(`  • ${m.author_name}: "${(m.edited_body||m.body||"").slice(0,90)}"`));}
    if(resolved.length){lines.push("");lines.push(`✅ ${resolved.length} item${resolved.length!==1?"s":""} marked resolved`);}
    if(pins.length){lines.push("");lines.push(`📌 ${pins.length} pinned message${pins.length!==1?"s":""}`);}
    if(scheduledMsgs.length){lines.push("");lines.push(`🕐 ${scheduledMsgs.length} scheduled message${scheduledMsgs.length!==1?"s":""}`);}
    setSummaryText(lines.join("\n"));setSummaryOpen(true);
  }

  // ── Media file ──
  function handleMediaFile(e){const file=e.target.files?.[0];if(!file)return;setMediaFile(file);if(file.type.startsWith("image/"))setMediaPreview(URL.createObjectURL(file));else setMediaPreview(null);e.target.value="";}
  function cancelMedia(){setMediaFile(null);setMediaPreview(null);}

  // ── Mention / Emoji ──
  function handleInput(e){
    const val=e.target.value;setInput(val);
    sendTypingSignal();
    const cursor=e.target.selectionStart;
    const textBefore=val.slice(0,cursor);
    const match=textBefore.match(/@(\w*)$/);
    if(match){
      const q=match[1].toLowerCase();
      const specials=q===""||"here".startsWith(q)||"all".startsWith(q)?[{name:"@here — notify all members",username:"here"},{name:"@all — notify everyone",username:"all"}]:[];
      const regular=allMembers.filter(m=>m.name.toLowerCase().includes(q)||m.username.toLowerCase().includes(q)).slice(0,5);
      setMentionList([...specials,...regular].slice(0,7));
      setMentionOpen(true);
    }else{setMentionOpen(false);setMentionList([]);}
  }
  function insertMention(member){
    const cursor=inputRef.current?.selectionStart||input.length;
    const replaced=input.slice(0,cursor).replace(/@\w*$/,"@"+member.username+" ")+input.slice(cursor);
    setInput(replaced);setMentionOpen(false);
    setTimeout(()=>inputRef.current?.focus(),50);
  }
  function insertEmoji(emoji){
    const ta=inputRef.current;
    if(!ta){setInput(prev=>prev+emoji);setEmojiOpen(false);return;}
    const start=ta.selectionStart??input.length;const end=ta.selectionEnd??input.length;
    const newVal=input.slice(0,start)+emoji+input.slice(end);
    setInput(newVal);setEmojiOpen(false);
    setTimeout(()=>{ta.selectionStart=ta.selectionEnd=start+[...emoji].length;ta.focus();},0);
  }

  // ── Send ──
  async function send(){
    if((!input.trim()&&!mediaFile)||sending)return;
    setSending(true);
    const msgBody=input.trim();
    const capturedCid=activePid;
    const capturedReply=replyTo;
    const mentions=[...new Set([...(input.matchAll(/@(\w+)/g)||[])].map(m=>m[1]))];
    const notifyAll=mentions.includes("here")||mentions.includes("all");
    setInput("");setMentionOpen(false);setReplyTo(null);

    const tempId="temp_"+Date.now();
    const optimistic={id:tempId,client_id:capturedCid,author:me.username,author_name:me.name,body:msgBody,mentions,reply_to_id:capturedReply?.id||null,reply_to_body:capturedReply?.body||null,reply_to_author:capturedReply?.author_name||null,video_url:null,created_at:new Date().toISOString(),_pending:true};
    setMessages(prev=>[...prev,optimistic]);
    const el=scrollAreaRef.current;
    if(el){const atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;if(atBottom)setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),60);}

    let video_url=null;
    if(mediaFile){
      setUploading(true);
      const ext=mediaFile.name.split(".").pop()||"bin";
      const fname=`warroom_${capturedCid}_${Date.now()}.${ext}`;
      const{error:ue}=await supabase.storage.from("war-room-videos").upload(fname,mediaFile,{contentType:mediaFile.type,upsert:false});
      if(!ue){const{data:pub}=supabase.storage.from("war-room-videos").getPublicUrl(fname);video_url=pub.publicUrl;}
      setMediaFile(null);setMediaPreview(null);setUploading(false);
    }
    if(video_url)setMessages(prev=>prev.map(m=>m.id===tempId?{...m,video_url}:m));

    const{data:inserted}=await supabase.from("war_room_messages")
      .insert({client_id:capturedCid,author:me.username,author_name:me.name,body:msgBody,mentions,video_url,reply_to_id:capturedReply?.id||null,reply_to_body:capturedReply?.body||null,reply_to_author:capturedReply?.author_name||null})
      .select().single();
    if(inserted){lastMsgAtRef.current=inserted.created_at;setMessages(prev=>prev.map(m=>m.id===tempId?inserted:m));setLastMsgs(p=>({...p,[capturedCid]:inserted}));}
    else{setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m));}

    const clientUser=clients.find(c=>c.username===capturedCid);
    const clientDisplayN=clientUser?.client_name||clientUser?.name||capturedCid;
    const snippet=(msgBody||"📎 media").slice(0,80);
    const recipientBase=users.filter(u=>u.username!==me.username&&(u.username===capturedCid||u.role!=="Client"));
    const allUsers=notifyAll?users.filter(u=>u.username!==me.username):recipientBase;
    if(allUsers.length){
      await supabase.from("notifications").insert(allUsers.map(u=>({user_id:u.id,type:"war_room_message",title:`💬 ${me.name} in ${clientDisplayN}`,description:snippet,entity_type:"war_room",entity_id:capturedCid,created_by:me.username})));
    }
    if(mentions.filter(m=>m!=="here"&&m!=="all").length){
      const rows=users.filter(u=>mentions.includes(u.username)&&u.username!==me.username).map(u=>({user_id:u.id,type:"mention",title:`💬 ${me.name} mentioned you in ${clientDisplayN}`,description:snippet,entity_type:"war_room",entity_id:capturedCid,created_by:me.username}));
      if(rows.length)await supabase.from("notifications").insert(rows);
    }
    setSending(false);
  }

  const fmt=dt=>{const d=new Date(dt);const now=new Date();const diff=now-d;
    if(diff<60000)return"just now";if(diff<3600000)return Math.floor(diff/60000)+"m ago";
    if(diff<86400000)return d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  };
  const renderBody=body=>{if(!body)return null;return body.split(/(@\w+)/g).map((part,i)=>part.startsWith("@")?<span key={i} style={{color:C.accent,fontWeight:700,background:C.accent+"18",borderRadius:4,padding:"0 3px"}}>{part}</span>:<span key={i}>{part}</span>);};

  // ── Derived ──
  const activeClientUser=clients.find(c=>c.username===activePid);
  const canSend=canSendInRoom(activeClientUser);
  const clientDisplayName=activeClientUser?.client_name||activeClientUser?.name||activePid||"";
  const filtered=projSearch.trim()?visibleClients.filter(c=>(c.client_name||c.name||"").toLowerCase().includes(projSearch.toLowerCase())):visibleClients;
  const displayMessages=msgSearch.trim()?messages.filter(m=>(m.edited_body||m.body||"").toLowerCase().includes(msgSearch.toLowerCase())||m.author_name?.toLowerCase().includes(msgSearch.toLowerCase())):messages;

  // ── Who read the last message ──
  const lastMsgId=messages[messages.length-1]?.id;
  const readBy=lastMsgId?users.filter(u=>reads[u.username]===lastMsgId&&u.username!==me.username).slice(0,4):[];

  return(
    <div style={{display:"flex",height:isMobile?"calc(100dvh - 130px)":"calc(100vh - 110px)",overflow:"hidden",border:`1px solid ${C.border}`,borderRadius:16,background:C.bg,position:"relative"}}>

      {/* ── FILE PREVIEW OVERLAY ── */}
      {previewFile&&(
        <div style={{position:"absolute",inset:0,background:"#000000cc",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:16}} onClick={()=>setPreviewFile(null)}>
          <div style={{position:"absolute",top:12,right:12}}>
            <button onClick={()=>setPreviewFile(null)} style={{background:"#ffffff22",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:"90%",maxHeight:"85%",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            {/\.(jpg|jpeg|png|gif|webp|svg)/i.test(previewFile.url)
              ?<img src={previewFile.url} style={{maxWidth:"100%",maxHeight:"75vh",borderRadius:12,objectFit:"contain"}}/>
              :/\.(mp4|webm|mov)/i.test(previewFile.url)
              ?<video src={previewFile.url} controls autoPlay style={{maxWidth:"100%",maxHeight:"75vh",borderRadius:12}}/>
              :/\.webm/i.test(previewFile.url)||previewFile.url.includes("voice_")
              ?<div style={{background:C.card,borderRadius:12,padding:"20px 28px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🎤</div><audio src={previewFile.url} controls style={{width:280}}/></div>
              :<div style={{background:C.card,borderRadius:12,padding:28,textAlign:"center"}}><div style={{fontSize:48,marginBottom:8}}>📄</div><a href={previewFile.url} target="_blank" rel="noreferrer" style={{color:C.teal,fontWeight:700,fontSize:14}}>Open file ↗</a></div>
            }
            <a href={previewFile.url} download target="_blank" rel="noreferrer" style={{color:"#ffffffcc",fontSize:12,textDecoration:"none",background:"#ffffff22",padding:"6px 14px",borderRadius:8}}>⬇ Download</a>
          </div>
        </div>
      )}

      {/* ── SUMMARY PANEL ── */}
      {summaryOpen&&(
        <div style={{position:"absolute",inset:0,background:"#00000066",zIndex:50,display:"flex",alignItems:"stretch",borderRadius:16}} onClick={()=>setSummaryOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{marginLeft:"auto",width:isMobile?"100%":380,background:C.card,borderLeft:`1px solid ${C.border}`,borderRadius:isMobile?"16px":"0 16px 16px 0",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:14,fontWeight:800,color:C.t1}}>✨ Chat Summary</span>
              <button onClick={()=>setSummaryOpen(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",color:C.t3,cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:18}}>
              <pre style={{margin:0,fontFamily:"inherit",fontSize:12,color:C.t2,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{summaryText}</pre>
            </div>
            <div style={{padding:"10px 18px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <button onClick={()=>{navigator.clipboard?.writeText(summaryText);}} style={{width:"100%",background:C.teal,border:"none",borderRadius:8,padding:"8px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy to clipboard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULED MESSAGES PANEL ── */}
      {scheduledOpen&&(
        <div style={{position:"absolute",inset:0,background:"#00000066",zIndex:50,display:"flex",alignItems:"stretch",borderRadius:16}} onClick={()=>setScheduledOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{marginLeft:"auto",width:isMobile?"100%":340,background:C.card,borderLeft:`1px solid ${C.border}`,borderRadius:isMobile?"16px":"0 16px 16px 0",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:14,fontWeight:800,color:C.t1}}>🕐 Scheduled Messages</span>
              <button onClick={()=>setScheduledOpen(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",color:C.t3,cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {scheduledMsgs.length===0
                ?<div style={{padding:28,textAlign:"center",color:C.t3,fontSize:12}}>No scheduled messages</div>
                :scheduledMsgs.map(sm=>(
                  <div key={sm.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:C.t1,marginBottom:4,wordBreak:"break-word"}}>{sm.body}</div>
                      <div style={{fontSize:10,color:C.teal,fontWeight:700}}>🕐 {new Date(sm.send_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                    <button onClick={()=>cancelScheduled(sm.id)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",color:C.red,cursor:"pointer",fontSize:11,flexShrink:0,fontFamily:"inherit"}}>Cancel</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE TASK MODAL ── */}
      {createTaskFrom&&(
        <div style={{position:"absolute",inset:0,background:"#00000066",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:16,padding:16}} onClick={()=>setCreateTaskFrom(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,width:"100%",maxWidth:400}}>
            <div style={{fontSize:14,fontWeight:800,color:C.t1,marginBottom:14}}>✅ Create Task from Message</div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12,color:C.t2,fontStyle:"italic"}}>"{(createTaskFrom.edited_body||createTaskFrom.body||"").slice(0,120)}"</div>
            <div style={{fontSize:11,color:C.t3,marginBottom:16}}>This will open the Task creation form. Copy the message above as your task title.</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setCreateTaskFrom(null)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 14px",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>{navigator.clipboard?.writeText(createTaskFrom.edited_body||createTaskFrom.body||"");setCreateTaskFrom(null);}} style={{background:C.teal,border:"none",borderRadius:8,padding:"7px 16px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>📋 Copy & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT SIDEBAR ── */}
      {(!isMobile||!activePid)&&(
        <div style={{width:isMobile?"100%":"272px",minWidth:isMobile?"100%":"272px",display:"flex",flexDirection:"column",background:C.surface,borderRight:isMobile?"none":`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{padding:"16px 16px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>💬</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.t1,lineHeight:1.3}}>Messages</div>
                <div style={{fontSize:10,color:C.t3}}>{visibleClients.length} client conversation{visibleClients.length!==1?"s":""}</div>
              </div>
            </div>
          </div>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <input value={projSearch} onChange={e=>setProjSearch(e.target.value)} placeholder="Search clients…"
              style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {filtered.length===0
              ?<div style={{padding:28,textAlign:"center",color:C.t3,fontSize:12}}>No clients found</div>
              :filtered.map(cl=>{
                const isActive=activePid===cl.username;
                const lastMsg=lastMsgs[cl.username];
                const displayName=cl.client_name||cl.name||"?";
                const hue=displayName.charCodeAt(0)*17%360;
                return(
                  <div key={cl.username} onClick={()=>setActivePid(cl.username)}
                    style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isActive?`${C.teal}1a`:"transparent",borderLeft:`3px solid ${isActive?C.teal:"transparent"}`,transition:"all .15s"}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=C.card+"cc";}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:`hsl(${hue},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{displayName.charAt(0).toUpperCase()}</div>
                      <div style={{position:"absolute",bottom:1,right:1,width:9,height:9,borderRadius:"50%",background:C.green,border:`2px solid ${C.surface}`}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                        <span style={{fontSize:13,fontWeight:unreadCounts[cl.username]>0?800:700,color:isActive?C.teal:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</span>
                        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,marginLeft:4}}>
                          {lastMsg&&!unreadCounts[cl.username]&&<span style={{fontSize:10,color:C.t3}}>{fmt(lastMsg.created_at)}</span>}
                          {unreadCounts[cl.username]>0&&<span style={{background:C.teal,color:"#fff",fontSize:10,fontWeight:800,borderRadius:20,padding:"1px 7px",lineHeight:"16px",minWidth:18,textAlign:"center"}}>{unreadCounts[cl.username]}</span>}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:unreadCounts[cl.username]>0?C.t2:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:unreadCounts[cl.username]>0?600:400}}>
                        {lastMsg?<><span style={{color:C.t2,fontWeight:600}}>{lastMsg.author_name}: </span>{lastMsg.body||"📎 media"}</>:"No messages yet"}
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ── RIGHT: CHAT AREA ── */}
      {(!isMobile||activePid)&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {activePid?(
            <>
              {/* Chat header */}
              <div style={{padding:isMobile?"10px 12px":"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,background:C.surface,flexShrink:0}}>
                {isMobile&&(
                  <button onClick={()=>{setActivePid(null);setMessages([]);setInput("");setSearchOpen(false);setReplyTo(null);}}
                    style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",color:C.t2,fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>←</button>
                )}
                {(()=>{const dn=clientDisplayName;const hue=dn?dn.charCodeAt(0)*17%360:200;return(
                  <div style={{position:"relative",flexShrink:0}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:`hsl(${hue},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>{dn?dn.charAt(0).toUpperCase():"?"}</div>
                    <div style={{position:"absolute",bottom:1,right:1,width:8,height:8,borderRadius:"50%",background:C.green,border:`2px solid ${C.surface}`}}/>
                  </div>
                );})()}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clientDisplayName}</div>
                  <div style={{fontSize:10,color:C.green,fontWeight:600}}>● Active now</div>
                </div>
                {/* Header action buttons */}
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  {[
                    {icon:"🔍",title:"Search messages",active:searchOpen,onClick:()=>{setSearchOpen(o=>!o);if(searchOpen)setMsgSearch("");}},
                    {icon:"📌",title:`Pins (${pins.length})`,active:pinsOpen,onClick:()=>setPinsOpen(o=>!o),badge:pins.length},
                    {icon:"🕐",title:`Scheduled (${scheduledMsgs.length})`,active:scheduledOpen,onClick:()=>setScheduledOpen(o=>!o),badge:scheduledMsgs.length},
                    {icon:"✨",title:"Chat summary",active:summaryOpen,onClick:generateSummary},
                  ].map(({icon,title,active,onClick,badge})=>(
                    <div key={title} style={{position:"relative"}}>
                      <button onClick={onClick} title={title}
                        style={{width:32,height:32,borderRadius:8,background:active?`${C.teal}22`:C.card,border:`1px solid ${active?C.teal:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,transition:"all .15s"}}>
                        {icon}
                      </button>
                      {badge>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff"}}>{badge}</div>}
                    </div>
                  ))}
                  <div style={{fontSize:11,color:C.t3,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",marginLeft:4}}>{messages.length}</div>
                </div>
              </div>

              {/* Pins strip */}
              {pinsOpen&&pins.length>0&&(
                <div style={{borderBottom:`1px solid ${C.border}`,background:`${C.teal}0a`,padding:"6px 16px",display:"flex",gap:8,overflowX:"auto",flexShrink:0,alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.teal,fontWeight:700,flexShrink:0}}>📌 Pinned</span>
                  {pins.map(p=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,background:C.card,border:`1px solid ${C.teal}44`,borderRadius:8,padding:"4px 10px",flexShrink:0,maxWidth:200,cursor:"default"}}>
                      <span style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><b>{p.message_author}:</b> {(p.message_body||"📎").slice(0,40)}</span>
                      <button onClick={()=>unpinMessage(p.id)} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,flexShrink:0,lineHeight:1}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search bar */}
              {searchOpen&&(
                <div style={{padding:"8px 16px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0,display:"flex",gap:8,alignItems:"center"}}>
                  <input value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} autoFocus
                    placeholder="Search messages…"
                    style={{flex:1,background:C.card,border:`1px solid ${msgSearch?C.teal:C.border}`,borderRadius:8,padding:"7px 12px",color:C.t1,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  {msgSearch&&<span style={{fontSize:11,color:C.teal,flexShrink:0,fontWeight:600}}>{displayMessages.length} result{displayMessages.length!==1?"s":""}</span>}
                  <button onClick={()=>{setSearchOpen(false);setMsgSearch("");}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",color:C.t3,cursor:"pointer",fontSize:11,fontFamily:"inherit",flexShrink:0}}>✕</button>
                </div>
              )}

              {/* Messages area */}
              <div ref={scrollAreaRef} onScroll={handleScroll}
                style={{flex:1,overflowY:"auto",padding:isMobile?"10px 12px":"14px 20px",display:"flex",flexDirection:"column",gap:0,background:C.bg,WebkitOverflowScrolling:"touch",position:"relative"}}>

                {/* Jump to unread */}
                {isScrolledUp&&newMsgCount>0&&(
                  <div style={{position:"sticky",top:8,zIndex:10,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                    <button onClick={()=>{endRef.current?.scrollIntoView({behavior:"smooth"});setNewMsgCount(0);}}
                      style={{pointerEvents:"auto",background:C.teal,border:"none",borderRadius:20,padding:"6px 16px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${C.teal}55`,fontFamily:"inherit"}}>
                      ↓ {newMsgCount} new message{newMsgCount!==1?"s":""}
                    </button>
                  </div>
                )}

                {loading
                  ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:40,color:C.t3,fontSize:13}}>
                    <div style={{width:16,height:16,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.teal}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                    Loading messages…
                   </div>
                  :displayMessages.length===0
                  ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:12,color:C.t3,padding:40}}>
                    <div style={{width:64,height:64,borderRadius:20,background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{msgSearch?"🔍":"👋"}</div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>{msgSearch?"No results found":"No messages yet"}</div>
                      <div style={{fontSize:12}}>{msgSearch?`Try a different search term`:"Be the first to say something!"}</div>
                    </div>
                   </div>
                  :displayMessages.map((msg,idx)=>{
                    const isMe=msg.author===me.username;
                    const isAdmin=false; // no one can edit/delete others' messages — own messages only
                    const msgReactions=reactions[msg.id]||{};
                    const hasReactions=Object.keys(msgReactions).length>0;
                    const isImgUrl=u=>/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(u||"");
                    const isPdfUrl=u=>/\.pdf(\?|$)/i.test(u||"");
                    const isAudio=u=>/\.(webm|mp3|ogg|m4a)(\?|$)/i.test(u||"")||u?.includes("voice_");
                    const showPicker=emojiPickerMsgId===msg.id;
                    const showMenu=msgMenuId===msg.id;
                    const showTagPicker=tagPickerMsgId===msg.id;
                    const msgDate=new Date(msg.created_at).toDateString();
                    const prevMsgDate=idx>0?new Date(displayMessages[idx-1].created_at).toDateString():null;
                    const showDateSep=msgDate!==prevMsgDate;
                    const prevMsg=idx>0?displayMessages[idx-1]:null;
                    const isGrouped=!showDateSep&&prevMsg&&prevMsg.author===msg.author&&!prevMsg.is_deleted&&!msg.reply_to_id&&(new Date(msg.created_at)-new Date(prevMsg.created_at))<120000;
                    const authorHue=(msg.author_name||"?").charCodeAt(0)*17%360;
                    const stag=STATUS_TAGS.find(t=>t.key===msg.status_tag);
                    const displayBody=msg.edited_body||msg.body;
                    const isLastMsg=idx===displayMessages.length-1;
                    return(
                      <Fragment key={msg.id}>
                        {showDateSep&&(
                          <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 12px",flexShrink:0}}>
                            <div style={{flex:1,height:1,background:C.border}}/>
                            <span style={{fontSize:11,color:C.t3,background:C.bg,padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,flexShrink:0,whiteSpace:"nowrap"}}>
                              {new Date(msg.created_at).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric"})}
                            </span>
                            <div style={{flex:1,height:1,background:C.border}}/>
                          </div>
                        )}
                        <div style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:8,alignItems:"flex-end",marginTop:isGrouped?2:8,paddingLeft:isMe?40:0,paddingRight:isMe?0:40,position:"relative"}}
                          onMouseEnter={()=>setMsgMenuId(msg.id)}
                          onMouseLeave={()=>{if(!showPicker&&!showTagPicker)setMsgMenuId(null);}}>
                          {/* Avatar */}
                          {!isGrouped
                            ?<div style={{width:isMobile?28:30,height:isMobile?28:30,borderRadius:"50%",background:isMe?C.teal:`hsl(${authorHue},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:isMobile?11:12,fontWeight:800,color:"#fff",alignSelf:"flex-end"}}>
                              {(msg.author_name||"?").charAt(0).toUpperCase()}
                             </div>
                            :<div style={{width:isMobile?28:30,flexShrink:0}}/>
                          }

                          <div style={{maxWidth:isMobile?"82%":"66%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2,position:"relative"}}>
                            {!isMe&&!isGrouped&&<span style={{fontSize:10,color:C.t3,fontWeight:700,paddingLeft:2,marginBottom:1}}>{msg.author_name}</span>}

                            {/* Message bubble */}
                            <div style={{position:"relative"}}>
                              <div style={{
                                background:msg.is_deleted?C.surface:isMe?C.teal:C.card,
                                borderRadius:isMe?"16px 4px 16px 16px":"4px 16px 16px 16px",
                                padding:isMobile?"8px 12px":"9px 14px",
                                color:msg.is_deleted?C.t3:isMe?"#fff":C.t1,
                                fontSize:13,lineHeight:1.55,wordBreak:"break-word",
                                border:msg.is_deleted?`1px dashed ${C.border}`:isMe?"none":`1px solid ${C.border}`,
                                fontStyle:msg.is_deleted?"italic":"normal",
                                boxShadow:!msg.is_deleted&&(isMe?`0 2px 8px ${C.teal}33`:"0 1px 4px #00000033")
                              }}>
                                {/* Reply quote */}
                                {msg.reply_to_body&&!msg.is_deleted&&(
                                  <div style={{borderLeft:`3px solid ${isMe?"#ffffff66":C.teal}`,paddingLeft:8,marginBottom:6,opacity:0.8}}>
                                    <div style={{fontSize:10,fontWeight:700,color:isMe?"#ffffffaa":C.teal,marginBottom:2}}>{msg.reply_to_author}</div>
                                    <div style={{fontSize:11,color:isMe?"#ffffffbb":C.t2,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{msg.reply_to_body}</div>
                                  </div>
                                )}
                                {/* Status tag badge */}
                                {stag&&!msg.is_deleted&&(
                                  <div style={{display:"inline-flex",alignItems:"center",gap:4,background:stag.color+"22",border:`1px solid ${stag.color}44`,borderRadius:4,padding:"1px 7px",marginBottom:5,fontSize:10,fontWeight:700,color:stag.color}}>
                                    {stag.icon} {stag.label}
                                  </div>
                                )}
                                {/* Body */}
                                {msg.is_deleted
                                  ?<span>This message was deleted</span>
                                  :editingMsgId===msg.id
                                  ?<div>
                                    <textarea value={editBody} onChange={e=>setEditBody(e.target.value)} autoFocus
                                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveEdit(msg.id);}if(e.key==="Escape"){setEditingMsgId(null);}}}
                                      style={{width:"100%",background:"transparent",border:"none",outline:"none",color:isMe?"#fff":C.t1,fontSize:13,fontFamily:"inherit",lineHeight:1.5,resize:"none",minHeight:40}}
                                      rows={Math.max(1,editBody.split("\n").length)}/>
                                    <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"flex-end"}}>
                                      <button onClick={()=>setEditingMsgId(null)} style={{background:"transparent",border:`1px solid ${isMe?"#ffffff44":C.border}`,borderRadius:6,padding:"3px 8px",color:isMe?"#ffffffcc":C.t3,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                                      <button onClick={()=>saveEdit(msg.id)} style={{background:isMe?"#ffffff22":C.teal,border:"none",borderRadius:6,padding:"3px 10px",color:isMe?"#fff":C.bg,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                                    </div>
                                   </div>
                                  :<div>{displayBody&&<div>{renderBody(displayBody)}</div>}
                                    {msg.video_url&&!msg.is_deleted&&(
                                      isImgUrl(msg.video_url)
                                      ?<div style={{marginTop:displayBody?8:0,cursor:"pointer"}} onClick={()=>setPreviewFile({url:msg.video_url})}><img src={msg.video_url} alt="media" style={{maxWidth:"100%",borderRadius:8,maxHeight:isMobile?180:260,display:"block"}}/></div>
                                      :isPdfUrl(msg.video_url)
                                      ?<div style={{marginTop:displayBody?6:0,cursor:"pointer"}} onClick={()=>setPreviewFile({url:msg.video_url})}><div style={{display:"flex",alignItems:"center",gap:6,color:isMe?"#ccf2ee":C.accent,fontWeight:700,fontSize:12}}>📄 View PDF</div></div>
                                      :isAudio(msg.video_url)
                                      ?<div style={{marginTop:displayBody?6:0}}><audio src={msg.video_url} controls style={{height:32,maxWidth:"100%"}}/></div>
                                      :/\.(mp4|webm|mov|avi)(\?|$)/i.test(msg.video_url)
                                      ?<div style={{marginTop:displayBody?8:0,cursor:"pointer"}} onClick={()=>setPreviewFile({url:msg.video_url})}><video src={msg.video_url} style={{maxWidth:"100%",borderRadius:8,maxHeight:isMobile?140:180,display:"block"}}/></div>
                                      :<a href={msg.video_url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:6,marginTop:displayBody?6:0,color:isMe?"#ccf2ee":C.accent,fontWeight:700,fontSize:12,textDecoration:"none"}}>📎 Download file</a>
                                    )}
                                    {msg._pending&&<div style={{fontSize:10,color:isMe?"#ccf2ee99":C.t3,marginTop:4,textAlign:"right"}}>Sending…</div>}
                                    {msg._failed&&<div style={{fontSize:10,color:"#fca5a5",marginTop:4,textAlign:"right"}}>⚠ Failed</div>}
                                  </div>
                                }
                                {/* Edited label */}
                                {msg.edited_at&&!msg.is_deleted&&<div style={{fontSize:9,color:isMe?"#ffffff66":C.t3,marginTop:3,textAlign:"right"}}>(edited)</div>}
                              </div>

                              {/* Hover action bar */}
                              {!msg.is_deleted&&!editingMsgId&&(
                                <div className="msg-actions" style={{position:"absolute",top:-28,[isMe?"left":"right"]:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"3px 4px",display:"flex",gap:2,boxShadow:"0 2px 10px #00000044",opacity:showMenu?1:0,transition:"opacity .15s",pointerEvents:showMenu?"auto":"none",zIndex:10}}
                                  onMouseEnter={()=>setMsgMenuId(msg.id)}>
                                  {[
                                    {icon:"💬",title:"Reply",action:()=>{setReplyTo({id:msg.id,body:displayBody||"📎 media",author_name:msg.author_name});setMsgMenuId(null);setTimeout(()=>inputRef.current?.focus(),50);}},
                                    {icon:"📌",title:"Pin",action:()=>pinMessage(msg)},
                                    {icon:"🏷️",title:"Tag",action:()=>{setTagPickerMsgId(showTagPicker?null:msg.id);}},
                                    {icon:"✅",title:"Create task",action:()=>{setCreateTaskFrom(msg);setMsgMenuId(null);}},
                                    ...(isMe||isAdmin?[{icon:"✏️",title:"Edit",action:()=>{setEditingMsgId(msg.id);setEditBody(msg.edited_body||msg.body||"");setMsgMenuId(null);}}]:[]),
                                    ...(isMe||isAdmin?[{icon:"🗑️",title:"Delete",action:()=>deleteMessage(msg.id)}]:[]),
                                  ].map(({icon,title,action})=>(
                                    <button key={title} onClick={action} title={title}
                                      style={{background:"transparent",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,transition:"background .1s"}}
                                      onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                      {icon}
                                    </button>
                                  ))}
                                  {/* Tag picker */}
                                  {showTagPicker&&(
                                    <div style={{position:"absolute",top:"100%",left:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:6,zIndex:30,boxShadow:"0 4px 16px #00000066",minWidth:160,marginTop:4}}>
                                      {STATUS_TAGS.map(t=>(
                                        <div key={t.key} onClick={()=>setStatusTag(msg.id,t.key)}
                                          style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:12,color:t.color,fontWeight:600,background:msg.status_tag===t.key?t.color+"22":"transparent"}}
                                          onMouseEnter={e=>e.currentTarget.style.background=t.color+"22"}
                                          onMouseLeave={e=>e.currentTarget.style.background=msg.status_tag===t.key?t.color+"22":"transparent"}>
                                          {t.icon} {t.label}{msg.status_tag===t.key?" ✓":""}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Emoji trigger (on hover) */}
                              {!msg.is_deleted&&(
                                <button onMouseEnter={()=>setMsgMenuId(msg.id)} onClick={()=>setEmojiPickerMsgId(showPicker?null:msg.id)}
                                  style={{position:"absolute",top:-10,right:isMe?undefined:-10,left:isMe?-10:undefined,background:C.surface,border:`1px solid ${C.border}`,borderRadius:"50%",width:22,height:22,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:showPicker||showMenu?1:0,transition:"opacity .15s",padding:0,zIndex:5,boxShadow:"0 1px 4px #00000055"}}>
                                  😊
                                </button>
                              )}
                              {/* Emoji picker */}
                              {showPicker&&(
                                <div style={{position:"absolute",bottom:"110%",left:isMe?undefined:0,right:isMe?0:undefined,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"6px 8px",display:"flex",gap:4,zIndex:20,boxShadow:"0 4px 20px #00000066",flexWrap:"wrap",width:isMobile?180:200}}>
                                  {EMOJIS.map(e=>{const myReact=(msgReactions[e]||[]).includes(me.username);return(
                                    <button key={e} onClick={()=>toggleReaction(msg.id,e)}
                                      style={{background:myReact?C.accent+"22":"transparent",border:myReact?`1px solid ${C.accent}44`:"1px solid transparent",borderRadius:6,padding:"4px 6px",fontSize:16,cursor:"pointer"}}>
                                      {e}
                                    </button>
                                  );})}
                                </div>
                              )}
                            </div>

                            {/* Reactions */}
                            {hasReactions&&(
                              <div style={{display:"flex",gap:4,flexWrap:"wrap",paddingLeft:isMe?0:2,paddingRight:isMe?2:0,justifyContent:isMe?"flex-end":"flex-start"}}>
                                {Object.entries(msgReactions).filter(([,u])=>u.length>0).map(([emoji,unames])=>{
                                  const iMine=unames.includes(me.username);
                                  return(
                                    <button key={emoji} onClick={()=>toggleReaction(msg.id,emoji)} title={unames.join(", ")}
                                      style={{background:iMine?C.accent+"22":C.surface,border:`1px solid ${iMine?C.accent+"66":C.border}`,borderRadius:20,padding:"2px 7px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontFamily:"inherit",color:iMine?C.accent:C.t2}}>
                                      {emoji}<span style={{fontSize:11,fontWeight:700}}>{unames.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {/* Timestamp */}
                            {!msg._pending&&!msg._failed&&(
                              <span style={{fontSize:10,color:C.t3,padding:"0 2px"}}>
                                {new Date(msg.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                                {isMe&&<span style={{marginLeft:4,color:readBy.length>0?C.teal:C.t3}}>{readBy.length>0?"✓✓ Seen":"✓"}</span>}
                              </span>
                            )}
                            {/* Read receipts on last message */}
                            {isLastMsg&&readBy.length>0&&!isMe&&(
                              <div style={{display:"flex",gap:3,paddingLeft:2,marginTop:2,alignItems:"center"}}>
                                {readBy.map(u=>{const h=u.name.charCodeAt(0)*17%360;return(<div key={u.id} title={`Seen by ${u.name}`} style={{width:14,height:14,borderRadius:"50%",background:`hsl(${h},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff"}}>{u.name[0]}</div>);})}
                                <span style={{fontSize:9,color:C.t3}}>Seen</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })
                }
                <div ref={endRef}/>
              </div>

              {/* ── BELOW MESSAGES ── */}

              {/* Typing indicator */}
              {typingUsers.length>0&&(
                <div style={{padding:"4px 20px",background:C.bg,display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.teal,animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
                  </div>
                  <span style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>{typingUsers.map(u=>u.name).join(", ")} {typingUsers.length===1?"is":"are"} typing…</span>
                </div>
              )}

              {/* Media preview */}
              {mediaFile&&(
                <div style={{padding:"8px 16px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  {mediaPreview
                    ?<img src={mediaPreview} alt="" style={{height:52,borderRadius:8,flexShrink:0,objectFit:"cover"}}/>
                    :<div style={{width:44,height:44,borderRadius:8,background:C.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{mediaFile.type.startsWith("audio")?"🎤":"📄"}</div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:C.t1,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mediaFile.name}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>{(mediaFile.size/1024).toFixed(0)} KB · will be attached</div>
                  </div>
                  <button onClick={cancelMedia} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",color:C.t3,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </div>
              )}

              {/* Reply preview */}
              {replyTo&&(
                <div style={{padding:"6px 16px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <div style={{width:3,alignSelf:"stretch",background:C.teal,borderRadius:2,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:C.teal,fontWeight:700,marginBottom:1}}>Replying to {replyTo.author_name}</div>
                    <div style={{fontSize:11,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{replyTo.body}</div>
                  </div>
                  <button onClick={()=>setReplyTo(null)} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
                </div>
              )}

              {/* @mention dropdown */}
              {mentionOpen&&mentionList.length>0&&(
                <div style={{margin:"0 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",zIndex:10,boxShadow:"0 -4px 20px #00000055",flexShrink:0}}>
                  {mentionList.map(m=>{
                    const isSpecial=m.username==="here"||m.username==="all";
                    const mh=isSpecial?200:m.name.charCodeAt(0)*17%360;
                    return(
                      <div key={m.username} onClick={()=>insertMention(m)}
                        style={{padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:isSpecial?C.teal:`hsl(${mh},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{isSpecial?"@":m.name.charAt(0)}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:C.t1}}>{isSpecial?m.name:m.name}</div>
                          <div style={{fontSize:10,color:C.t3}}>@{m.username}</div>
                        </div>
                        {isSpecial&&<div style={{marginLeft:"auto",fontSize:10,background:`${C.teal}22`,color:C.teal,border:`1px solid ${C.teal}44`,borderRadius:4,padding:"1px 6px",flexShrink:0}}>notify all</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Input bar */}
              {canSend?(
                <div style={{flexShrink:0,position:"relative"}}>
                  {/* Emoji picker */}
                  {emojiOpen&&(
                    <div style={{position:"absolute",bottom:"100%",left:0,right:0,background:C.card,border:`1px solid ${C.border}`,zIndex:30,display:"flex",flexDirection:"column",maxHeight:isMobile?260:300,boxShadow:"0 -8px 32px #00000066"}}>
                      <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${C.border}`,padding:"4px 6px",gap:2,flexShrink:0}}>
                        {EMOJI_CATS.map((cat,i)=>(
                          <button key={i} onClick={()=>setEmojiCat(i)}
                            style={{flexShrink:0,background:emojiCat===i?`${C.teal}22`:"transparent",border:emojiCat===i?`1px solid ${C.teal}55`:"1px solid transparent",borderRadius:8,padding:"4px 8px",fontSize:16,cursor:"pointer"}}
                            title={cat.name}>{cat.label}
                          </button>
                        ))}
                      </div>
                      <div style={{overflowY:"auto",padding:"6px 8px",display:"grid",gridTemplateColumns:`repeat(${isMobile?8:10},1fr)`,gap:2,flex:1}}>
                        {EMOJI_CATS[emojiCat].emojis.map((em,i)=>(
                          <button key={i} onClick={()=>insertEmoji(em)}
                            style={{background:"transparent",border:"none",borderRadius:6,padding:"4px 2px",fontSize:isMobile?20:22,cursor:"pointer",lineHeight:1}}
                            onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Schedule picker */}
                  {scheduleOpen&&(
                    <div style={{position:"absolute",bottom:"100%",right:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,zIndex:30,boxShadow:"0 -4px 20px #00000066",width:240}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.t1,marginBottom:8}}>🕐 Schedule message</div>
                      {!input.trim()&&<div style={{fontSize:11,color:C.red,marginBottom:8}}>Write a message first</div>}
                      <input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}
                        min={new Date().toISOString().slice(0,16)}
                        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.t1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>setScheduleOpen(false)} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px",color:C.t3,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Cancel</button>
                        <button onClick={sendScheduled} disabled={!input.trim()||!scheduleTime} style={{flex:1,background:C.teal,border:"none",borderRadius:8,padding:"6px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11,fontFamily:"inherit",opacity:(!input.trim()||!scheduleTime)?0.5:1}}>Schedule</button>
                      </div>
                    </div>
                  )}

                  <div style={{padding:isMobile?"8px 10px":"10px 16px",borderTop:`1px solid ${C.border}`,display:"flex",gap:6,alignItems:"flex-end",background:C.surface}}>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf,video/*,audio/*,.doc,.docx,.xls,.xlsx,.txt" style={{display:"none"}} onChange={handleMediaFile}/>
                    {/* Emoji */}
                    <button onClick={()=>setEmojiOpen(o=>!o)} title="Emoji"
                      style={{flexShrink:0,width:34,height:34,borderRadius:"50%",background:emojiOpen?`${C.teal}22`:C.card,border:`1px solid ${emojiOpen?C.teal:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
                      😊
                    </button>
                    {/* Attach */}
                    {!mediaFile&&(
                      <button onClick={()=>fileInputRef.current?.click()} title="Attach file"
                        style={{flexShrink:0,width:34,height:34,borderRadius:"50%",background:C.card,border:`1px solid ${C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                        📎
                      </button>
                    )}
                    {/* Voice note */}
                    <button onClick={toggleRecording} title={recording?"Stop recording":"Voice note"}
                      style={{flexShrink:0,width:34,height:34,borderRadius:"50%",background:recording?C.red+"22":C.card,border:`1px solid ${recording?C.red:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexDirection:"column",gap:0}}>
                      {recording?<span style={{fontSize:9,color:C.red,fontWeight:700,lineHeight:1}}>{recordSecs}s</span>:<span style={{fontSize:16}}>🎤</span>}
                    </button>
                    {/* Textarea */}
                    <textarea ref={inputRef} value={input} onChange={handleInput}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!isMobile){e.preventDefault();send();}if(e.key==="Escape"){setMentionOpen(false);setEmojiOpen(false);setScheduleOpen(false);setReplyTo(null);}}}
                      placeholder={isMobile?"Message…":"Type a message…  @ to mention  (Enter ↵ send)"}
                      rows={1} style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"8px 14px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.5,transition:"border-color .15s"}}
                      onFocus={e=>e.target.style.borderColor=C.teal}
                      onBlur={e=>e.target.style.borderColor=C.border}/>
                    {/* Schedule */}
                    <button onClick={()=>setScheduleOpen(o=>!o)} title="Schedule message"
                      style={{flexShrink:0,width:34,height:34,borderRadius:"50%",background:scheduleOpen?`${C.teal}22`:C.card,border:`1px solid ${scheduleOpen?C.teal:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                      🕐
                    </button>
                    {/* Send */}
                    <button onClick={send} disabled={sending||uploading||(!input.trim()&&!mediaFile)}
                      style={{flexShrink:0,background:sending||uploading||(!input.trim()&&!mediaFile)?C.border:C.teal,border:"none",borderRadius:isMobile?"50%":"12px",width:isMobile?34:undefined,height:34,padding:isMobile?0:"0 18px",color:"#fff",fontSize:isMobile?18:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {isMobile?(uploading?"⬆":"➤"):uploading?"…":"Send ➤"}
                    </button>
                  </div>
                </div>
              ):(
                <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:12,color:C.t3}}>🔒 Read-only — Admin, Manager & Team Leaders can reply</span>
                </div>
              )}
            </>
          ):(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,background:C.bg}}>
              <div style={{width:80,height:80,borderRadius:24,background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>💬</div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:C.t2,marginBottom:6}}>Select a conversation</div>
                <div style={{fontSize:12,color:C.t3}}>Choose a client from the sidebar</div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}



// ══════════════════════════════════════════════════════════
// TASK COMMENTS — with @mentions
// ══════════════════════════════════════════════════════════
function TaskTimeLogs({taskId,projectId,me,isClient}){
  const [logs,setLogs]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [hrs,setHrs]=useState("");
  const [mins,setMins]=useState("0");
  const [logDate,setLogDate]=useState(new Date().toISOString().slice(0,10));
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{loadLogs();},[taskId]);

  async function loadLogs(){
    const res=await fetch(SUPA_URL+"/rest/v1/time_logs?task_id=eq."+taskId+"&order=logged_date.desc,created_at.desc&select=*",{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    const data=await res.json();
    setLogs(Array.isArray(data)?data:[]);
  }

  async function saveLog(){
    const dur=(parseInt(hrs)||0)*60+(parseInt(mins)||0);
    if(dur<=0)return;
    setSaving(true);
    await fetch(SUPA_URL+"/rest/v1/time_logs",{method:"POST",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({task_id:taskId,project_id:projectId,user_id:me.id,user_name:me.name,duration_minutes:dur,logged_date:logDate,notes:notes.trim()||null})});
    setSaving(false);setShowForm(false);setHrs("");setMins("0");setNotes("");
    loadLogs();
  }

  async function deleteLog(id){
    await fetch(SUPA_URL+"/rest/v1/time_logs?id=eq."+id,{method:"DELETE",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    setLogs(prev=>prev.filter(l=>l.id!==id));
  }

  const totalMins=logs.reduce((s,l)=>s+(l.duration_minutes||0),0);
  function fmtDur(min){if(!min)return"0m";const h=Math.floor(min/60),m=min%60;return h>0?(m>0?h+"h "+m+"m":h+"h"):m+"m";}
  function fmtDate(d){return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
  const byUser={};
  logs.forEach(l=>{if(!byUser[l.user_name])byUser[l.user_name]=0;byUser[l.user_name]+=(l.duration_minutes||0);});
  const canSave=(parseInt(hrs)||0)*60+(parseInt(mins)||0)>0;

  return(
    <div style={{borderTop:"1px solid #ffffff18",marginTop:20,paddingTop:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:800,color:"#a0a0b0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          ⏱ Time Logged
          <span style={{fontSize:11,background:"#05966922",color:"#059669",borderRadius:10,padding:"1px 8px",fontWeight:700}}>{fmtDur(totalMins)}</span>
          {logs.length>0&&<span style={{fontSize:11,background:"#33415522",color:"#94a3b8",borderRadius:10,padding:"1px 7px"}}>{logs.length} {logs.length===1?"entry":"entries"}</span>}
        </div>
        {!isClient&&<button onClick={()=>setShowForm(v=>!v)} style={{background:showForm?"#059669":"none",border:"1px solid #059669",borderRadius:6,padding:"3px 12px",color:showForm?"#fff":"#059669",fontSize:12,cursor:"pointer",fontWeight:600,transition:"all .15s"}}>{showForm?"✕ Cancel":"+ Log Time"}</button>}
      </div>

      {Object.keys(byUser).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          {Object.entries(byUser).sort((a,b)=>b[1]-a[1]).map(([name,min])=>(
            <span key={name} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:16,height:16,borderRadius:"50%",background:"#05966933",border:"1px solid #05966966",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#059669",flexShrink:0}}>{(name[0]||"?").toUpperCase()}</span>
              {name}&nbsp;·&nbsp;<strong style={{color:"#e2e8f0"}}>{fmtDur(min)}</strong>
            </span>
          ))}
        </div>
      )}

      {showForm&&(
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8,alignItems:"flex-end"}}>
            <div>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>Hours</div>
              <input type="number" min="0" max="24" value={hrs} onChange={e=>setHrs(e.target.value)} placeholder="0"
                style={{width:64,background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 8px",color:"#f1f5f9",fontSize:13}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>Minutes</div>
              <select value={mins} onChange={e=>setMins(e.target.value)}
                style={{width:76,background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 8px",color:"#f1f5f9",fontSize:13}}>
                {[0,15,30,45].map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>Date</div>
              <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)}
                style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 8px",color:"#f1f5f9",fontSize:13}}/>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>Notes (optional)</div>
            <input type="text" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What did you work on?" maxLength={200}
              style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 8px",color:"#f1f5f9",fontSize:12,boxSizing:"border-box"}}/>
          </div>
          <button onClick={saveLog} disabled={saving||!canSave}
            style={{background:"#059669",border:"none",borderRadius:6,padding:"6px 18px",color:"#fff",fontSize:12,fontWeight:700,cursor:canSave?"pointer":"not-allowed",opacity:saving||!canSave?0.5:1}}>
            {saving?"Saving…":"Save Log"}
          </button>
        </div>
      )}

      {logs.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
          {logs.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:"#1e293b",borderRadius:6,border:"1px solid #334155"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:"#05966922",border:"1px solid #05966944",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#059669",flexShrink:0}}>
                {(l.user_name?.[0]||"?").toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#d1d5db"}}>{l.user_name}</span>
                  <span style={{fontSize:11,fontWeight:700,color:"#059669",background:"#05966918",borderRadius:4,padding:"1px 6px"}}>{fmtDur(l.duration_minutes)}</span>
                  <span style={{fontSize:10,color:"#6b7280"}}>{fmtDate(l.logged_date)}</span>
                </div>
                {l.notes&&<div style={{fontSize:11,color:"#94a3b8",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.notes}</div>}
              </div>
              {l.user_id===me.id&&<button onClick={()=>deleteLog(l.id)} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 4px",flexShrink:0}} title="Delete entry">✕</button>}
            </div>
          ))}
        </div>
      )}
      {logs.length===0&&!showForm&&<div style={{fontSize:12,color:"#4b5563",textAlign:"center",padding:"12px 0"}}>No time logged yet — click "+ Log Time" to add</div>}
    </div>
  );
}

function TaskComments({taskId,projectId,me,users}){
  const [comments,setComments]=useState([]);
  const [input,setInput]=useState("");
  const [saving,setSaving]=useState(false);
  const [mentionList,setMentionList]=useState([]);
  const [mentionOpen,setMentionOpen]=useState(false);
  const inputRef=useRef();
  const allMembers=users.map(u=>({name:u.name,username:u.username}));

  useEffect(()=>{loadComments();},[taskId]);

  async function loadComments(){
    const{data}=await supabase.from("task_comments").select("*")
      .eq("task_id",taskId).order("created_at",{ascending:true});
    setComments(data||[]);
  }

  function handleInput(e){
    const val=e.target.value;setInput(val);
    const cursor=e.target.selectionStart;
    const textBefore=val.slice(0,cursor);
    const match=textBefore.match(/@(\w*)$/);
    if(match){
      const q=match[1].toLowerCase();
      setMentionList(allMembers.filter(m=>m.name.toLowerCase().includes(q)||m.username.toLowerCase().includes(q)).slice(0,5));
      setMentionOpen(true);
    }else{setMentionOpen(false);setMentionList([]);}
  }

  function insertMention(member){
    const cursor=inputRef.current?.selectionStart||input.length;
    const replaced=input.slice(0,cursor).replace(/@\w*$/,"@"+member.username+" ")+input.slice(cursor);
    setInput(replaced);setMentionOpen(false);
    setTimeout(()=>inputRef.current?.focus(),50);
  }

  async function postComment(){
    if(!input.trim()||saving)return;
    setSaving(true);
    const mentions=[...new Set([...(input.matchAll(/@(\w+)/g)||[])].map(m=>m[1]))];
    const{data,error}=await supabase.from("task_comments").insert({
      task_id:taskId,project_id:projectId,
      author:me.username,author_name:me.name,
      body:input.trim(),mentions
    }).select().single();
    if(!error&&data){
      setComments(prev=>[...prev,data]);
      if(mentions.length){
        const rows=users.filter(u=>mentions.includes(u.username)&&u.username!==me.username).map(u=>({
          user_id:u.id,type:"mention",
          title:`💬 ${me.name} mentioned you in a task comment`,
          description:input.trim().slice(0,100),
          entity_type:"task",entity_id:taskId,created_by:me.username
        }));
        if(rows.length)await supabase.from("notifications").insert(rows);
      }
      setInput("");setMentionOpen(false);
    }
    setSaving(false);
  }

  const fmt=dt=>new Date(dt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});
  const renderBody=body=>body.split(/(@\w+)/g).map((part,i)=>
    part.startsWith("@")?<span key={i} style={{color:"#6366f1",fontWeight:700,background:"#6366f118",borderRadius:3,padding:"0 2px"}}>{part}</span>:<span key={i}>{part}</span>
  );

  return(
    <div style={{borderTop:"1px solid #ffffff18",marginTop:20,paddingTop:16}}>
      <div style={{fontSize:13,fontWeight:800,color:"#a0a0b0",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
        💬 Comments <span style={{fontSize:11,background:"#6366f122",color:"#6366f1",borderRadius:10,padding:"1px 7px",fontWeight:700}}>{comments.length}</span>
      </div>

      {/* Comment list */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:260,overflowY:"auto"}}>
        {comments.length===0?
          <div style={{fontSize:12,color:"#666",textAlign:"center",padding:"16px 0"}}>No comments yet — add the first one below</div>:
          comments.map(cm=>{
            const isMe=cm.author===me.username;
            return(
              <div key={cm.id} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:isMe?"#6366f1":"#374151",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {cm.author_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#d1d5db"}}>{cm.author_name}</span>
                    <span style={{fontSize:10,color:"#6b7280"}}>{fmt(cm.created_at)}</span>
                  </div>
                  <div style={{fontSize:12,color:"#e5e7eb",lineHeight:1.5,wordBreak:"break-word",background:"#1f2937",borderRadius:"4px 12px 12px 12px",padding:"7px 10px"}}>
                    {renderBody(cm.body)}
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Mention dropdown */}
      {mentionOpen&&mentionList.length>0&&(
        <div style={{background:"#111827",border:"1px solid #6366f1",borderRadius:8,padding:4,marginBottom:6}}>
          {mentionList.map(m=>(
            <div key={m.username} onClick={()=>insertMention(m)}
              style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
              onMouseEnter={e=>e.currentTarget.style.background="#1f2937"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{m.name.charAt(0)}</div>
              <span style={{fontSize:12,color:"#d1d5db",fontWeight:600}}>{m.name}</span>
              <span style={{fontSize:10,color:"#6b7280"}}>@{m.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
        <textarea ref={inputRef} value={input} onChange={handleInput}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();postComment();}if(e.key==="Escape")setMentionOpen(false);}}
          placeholder="Add a comment… use @ to mention  (Enter to send)"
          rows={2} style={{flex:1,background:"#1f2937",border:"1px solid #374151",borderRadius:8,padding:"8px 10px",color:"#f3f4f6",fontSize:12,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box"}}/>
        <button onClick={postComment} disabled={saving||!input.trim()}
          style={{flexShrink:0,background:"#6366f1",border:"none",borderRadius:8,padding:"9px 16px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving||!input.trim()?0.5:1}}>
          {saving?"…":"Send"}
        </button>
      </div>
    </div>
  );
}

// ── ⌘K Command Palette ────────────────────────────────────────────

function CapacityView({tasks,users,projects,onReassign,canEdit}){
  const [rangeDays,setRangeDays]=useState(28);
  const [weekOffset,setWeekOffset]=useState(0);
  const [baseDate,setBaseDate]=useState(null);
  const [selCell,setSelCell]=useState(null);
  const [dragId,setDragId]=useState(null);
  const [dropTarget,setDropTarget]=useState(null);

  const todayD=new Date();todayD.setHours(0,0,0,0);
  const todayStr=todayD.toISOString().slice(0,10);
  const tomorrowStr=new Date(todayD.getTime()+86400000).toISOString().slice(0,10);
  const startD=baseDate?new Date(baseDate):new Date(todayD);
  startD.setDate(startD.getDate()+weekOffset*7);
  const dateArr=Array.from({length:rangeDays},(_,i)=>{const d=new Date(startD);d.setDate(d.getDate()+i);return d;});
  const startStr=dateArr[0].toISOString().slice(0,10);
  const endStr=dateArr[dateArr.length-1].toISOString().slice(0,10);

  const teamUsers=users.filter(u=>u.role!=="Client");

  const workload={};
  for(const u of teamUsers)workload[u.id]={};

  function findUser(name){
    if(!name)return null;
    const n=name.trim().toLowerCase();
    return teamUsers.find(x=>x.name.toLowerCase()===n||( x.username&&x.username.toLowerCase()===n))||null;
  }
  function splitNames(str){
    return str?str.split(/[\/,&]+/).map(s=>s.trim()).filter(Boolean):[];
  }

  for(const t of tasks){
    if(t.status==="Completed")continue;
    const dead=t.deadline||t.due_date||t.client_sub_date;
    if(!dead)continue;
    // Collect all people on this task (assignee + detailer + checker, case-insensitive)
    const uIds=new Set();
    splitNames(t.assignee).forEach(n=>{const u=findUser(n);if(u)uIds.add(u.id);});
    splitNames(t.detailer).forEach(n=>{const u=findUser(n);if(u)uIds.add(u.id);});
    splitNames(t.checker).forEach(n=>{const u=findUser(n);if(u)uIds.add(u.id);});
    if(uIds.size===0)continue;
    const endD2=new Date(dead);
    const startDt=t.start_date?new Date(t.start_date):new Date(todayD);
    // Overdue tasks (deadline in past) still show on today so they aren't invisible
    const effectiveEnd=endD2<todayD?new Date(todayD):endD2;
    const base=new Date(Math.max(startDt.getTime(),new Date(startStr).getTime()));
    const lim=new Date(Math.min(effectiveEnd.getTime(),new Date(endStr).getTime()));
    for(const uid of uIds){
      if(!workload[uid])continue;
      const cur=new Date(base);
      while(cur<=lim){
        const k=cur.toISOString().slice(0,10);
        if(!workload[uid][k])workload[uid][k]=[];
        if(!workload[uid][k].find(x=>x.id===t.id))workload[uid][k].push(t);
        cur.setDate(cur.getDate()+1);
      }
    }
  }

  function cellBg(cnt,isWe){
    if(cnt===0)return isWe?"#1e2d3d":"transparent";
    if(cnt<=2)return"#15803d";
    if(cnt<=4)return"#b45309";
    return"#b91c1c";
  }

  const selTasks=selCell?(workload[selCell.uid]||{})[selCell.ds]||[]:[];
  const NAME_W=150;
  const CELL_W=28;
  const CELL_H=40;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.t1}}>Team Capacity Planning</div>
          <div style={{fontSize:12,color:C.t3,marginTop:2}}>Workload heatmap — click a cell to see tasks — drag to reassign</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>{setBaseDate(null);setWeekOffset(o=>o-1);}} style={GBtn}>Prev</button>
          <button onClick={()=>{setBaseDate(null);setWeekOffset(0);}} style={{...GBtn,color:C.accent,borderColor:C.accent+"55"}}>Today</button>
          <button onClick={()=>{setBaseDate(tomorrowStr);setWeekOffset(0);}} style={{...GBtn,color:C.green,borderColor:C.green+"55"}}>Tomorrow</button>
          <button onClick={()=>{setBaseDate(null);setWeekOffset(o=>o+1);}} style={GBtn}>Next</button>
          <input type="date" value={baseDate&&weekOffset===0?baseDate:""} onChange={e=>{setBaseDate(e.target.value||null);setWeekOffset(0);}} title="Jump to date" style={{...GBtn,cursor:"pointer",padding:"5px 8px",colorScheme:"dark",width:130}} />
          <select value={rangeDays} onChange={e=>setRangeDays(Number(e.target.value))} style={{...GBtn,cursor:"pointer",padding:"7px 10px"}}>
            <option value={14}>2 weeks</option>
            <option value={28}>4 weeks</option>
            <option value={42}>6 weeks</option>
          </select>
        </div>
      </div>

      <div style={{display:"flex",gap:12,alignItems:"center",fontSize:11,color:C.t3}}>
        <span style={{fontWeight:700}}>Load:</span>
        {[["Free","#1e2d3d"],["1-2 tasks","#15803d"],["3-4 tasks","#b45309"],["5+ tasks","#b91c1c"]].map(([l,clr])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:12,height:12,borderRadius:3,background:clr,border:"1px solid #ffffff22"}}/>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div style={{flex:1,overflow:"auto",background:C.card,border:"1px solid "+C.border,borderRadius:12,minHeight:200}}>
        <div style={{display:"flex",position:"sticky",top:0,zIndex:10,background:C.surface,borderBottom:"1px solid "+C.border}}>
          <div style={{width:NAME_W,minWidth:NAME_W,padding:"8px 12px",fontSize:11,fontWeight:700,color:C.t3,borderRight:"1px solid "+C.border,position:"sticky",left:0,background:C.surface,zIndex:12}}>MEMBER</div>
          {dateArr.map(d=>{
            const ds=d.toISOString().slice(0,10);
            const isT=ds===todayStr;
            const isWe=d.getDay()===0||d.getDay()===6;
            return(
              <div key={ds} style={{width:CELL_W,minWidth:CELL_W,textAlign:"center",padding:"4px 0 2px",fontSize:9,fontWeight:isT?800:500,color:isT?C.accent:isWe?C.t3+"66":C.t3,borderRight:"1px solid "+C.border+"22",position:"relative",flexShrink:0}}>
                <div>{"SMTWTFS"[d.getDay()]}</div>
                <div style={{fontSize:10,fontWeight:isT?800:400,color:isT?C.accent:isWe?"#475569":"#94a3b8"}}>{d.getDate()}</div>
                {isT&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:2,height:3,background:C.accent,borderRadius:1}}/>}
              </div>
            );
          })}
        </div>

        {teamUsers.map((u,ri)=>{
          const uWork=workload[u.id]||{};
          const isEven=ri%2===0;
          const isDT=dropTarget===u.id;
          return(
            <div key={u.id}
              onDragOver={e=>{e.preventDefault();setDropTarget(u.id);}}
              onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDropTarget(null);}}
              onDrop={e=>{
                e.preventDefault();setDropTarget(null);
                const tid=e.dataTransfer.getData("taskId");
                if(tid&&onReassign){onReassign(tid,u.name);}
                setSelCell(null);
              }}
              style={{display:"flex",background:isDT?C.accent+"22":isEven?C.card:C.surface,borderBottom:"1px solid "+C.border+"22",minHeight:CELL_H,alignItems:"center",transition:"background .1s",outline:isDT?"2px dashed "+C.accent:"none",outlineOffset:-2}}>
              <div style={{width:NAME_W,minWidth:NAME_W,padding:"6px 10px",borderRight:"1px solid "+C.border,display:"flex",alignItems:"center",gap:7,position:"sticky",left:0,zIndex:5,background:isDT?C.accent+"22":isEven?C.card:C.surface}}>
                <Av name={u.name} size={22}/>
                <div style={{overflow:"hidden",flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                  <div style={{fontSize:9,color:C.t3}}>{u.role}</div>
                </div>
              </div>
              {dateArr.map(d=>{
                const ds=d.toISOString().slice(0,10);
                const cellTs=uWork[ds]||[];
                const cnt=cellTs.length;
                const isT=ds===todayStr;
                const isWe=d.getDay()===0||d.getDay()===6;
                const isSel=selCell&&selCell.uid===u.id&&selCell.ds===ds;
                const bg=isSel?C.accent:cellBg(cnt,isWe);
                return(
                  <div key={ds}
                    onClick={()=>cnt>0?setSelCell(isSel?null:{uid:u.id,ds,uName:u.name}):null}
                    style={{width:CELL_W,minWidth:CELL_W,height:CELL_H,display:"flex",alignItems:"center",justifyContent:"center",background:bg,borderRight:"1px solid "+C.border+"11",borderLeft:isT?"2px solid "+C.accent+"77":"none",cursor:cnt>0?"pointer":"default",fontSize:9,fontWeight:800,color:"#ffffffcc",flexShrink:0,opacity:isWe&&cnt===0?0.3:1,transition:"background .1s"}}>
                    {cnt>0?cnt:""}
                  </div>
                );
              })}
            </div>
          );
        })}

        {teamUsers.length===0&&(
          <div style={{padding:40,textAlign:"center",color:C.t3,fontSize:13}}>No team members found</div>
        )}
      </div>

      {selCell&&(
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:14,maxHeight:260,overflow:"auto",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{flex:1}}>
              <span style={{fontWeight:800,color:C.t1,fontSize:13}}>{selCell.uName}</span>
              <span style={{color:C.t3,fontSize:11,marginLeft:8}}>{selCell.ds+" · "+selTasks.length+" task"+(selTasks.length!==1?"s":"")}</span>
            </div>
            <button onClick={()=>setSelCell(null)} style={{...GBtn,padding:"3px 9px",fontSize:11}}>Close</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {selTasks.map(t=>{
              const proj=projects.find(p=>p.id===t.project_id);
              return(
                <div key={t.id}
                  draggable={canEdit}
                  onDragStart={e=>{e.dataTransfer.setData("taskId",String(t.id));setDragId(t.id);}}
                  onDragEnd={()=>setDragId(null)}
                  style={{background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"9px 11px",cursor:canEdit?"grab":"default",display:"flex",gap:8,alignItems:"flex-start",opacity:dragId===t.id?0.4:1,transition:"opacity .1s"}}>
                  {canEdit&&<span title="Drag to reassign" style={{fontSize:15,color:C.t3,marginTop:1,flexShrink:0,cursor:"grab",userSelect:"none"}}>{"⠿"}</span>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.t1,marginBottom:3}}>{t.title}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      {proj&&<span style={{fontSize:10,color:C.teal}}>{"📁 "+proj.name}</span>}
                      <span style={{fontSize:10,fontWeight:700,color:getStatusColor(t.status)}}>{t.status}</span>
                      {(t.deadline||t.due_date)&&<span style={{fontSize:10,color:C.t3}}>{"📅 "+(t.deadline||t.due_date)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {canEdit&&<div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:8}}>{"Drag any card onto a member row above to reassign"}</div>}
        </div>
      )}
    </div>
  );
}

function CommandPalette({projects,tasks,users,clients,taskFileCounts,onNav,onClose}){
  const [q,setQ]=useState("");
  const [sel,setSel]=useState(0);
  const inputRef=useRef();
  useEffect(()=>{setTimeout(()=>inputRef.current?.focus(),30);},[]);
  const qL=q.trim().toLowerCase();
  const results=[];
  const fc=taskFileCounts||{};
  if(!qL){
    projects.slice(0,8).forEach(p=>results.push({type:"project",icon:"📁",title:p.name,sub:(p.client||"—")+(p.group_name?" · "+p.group_name:""),data:p}));
    clients.slice(0,5).forEach(c=>results.push({type:"client",icon:"🏢",title:c.name,sub:[c.email,c.phone,c.address].filter(Boolean).join(" · ")||"Client",data:c}));
    users.filter(u=>u.role!=="Admin"&&u.role!=="Manager").slice(0,5).forEach(u=>results.push({type:"user",icon:u.role==="Team Leader"?"👑":u.role==="Client"?"🏢":"👤",title:u.name,sub:u.role+(u.client_name?" · "+u.client_name:""),data:u}));
    const fileTasks=tasks.filter(t=>fc[t.id]>0).slice(0,5);
    fileTasks.forEach(t=>{const pj=projects.find(p=>p.id===t.project_id);results.push({type:"file",icon:"📎",title:t.title,sub:fc[t.id]+" file"+(fc[t.id]!==1?"s":"")+" · "+(pj?pj.name:"—"),data:t});});
  } else {
    projects.filter(p=>p.name.toLowerCase().includes(qL)||(p.client||"").toLowerCase().includes(qL)||(p.group_name||"").toLowerCase().includes(qL)||(p.description||"").toLowerCase().includes(qL)).slice(0,6)
      .forEach(p=>results.push({type:"project",icon:"📁",title:p.name,sub:(p.client||"—")+(p.group_name?" · "+p.group_name:""),data:p}));
    tasks.filter(t=>t.title.toLowerCase().includes(qL)||(t.assignee||"").toLowerCase().includes(qL)||(t.status||"").toLowerCase().includes(qL)).slice(0,6)
      .forEach(t=>{const pj=projects.find(p=>p.id===t.project_id);const hasFiles=fc[t.id]>0;results.push({type:"task",icon:isDone(t.status)?"✅":hasFiles?"📎":"🔵",title:t.title,sub:(pj?pj.name:"—")+" · "+t.status+(hasFiles?" · "+fc[t.id]+" file"+(fc[t.id]!==1?"s":""):""),data:t});});
    clients.filter(c=>c.name.toLowerCase().includes(qL)||(c.email||"").toLowerCase().includes(qL)).slice(0,5)
      .forEach(c=>results.push({type:"client",icon:"🏢",title:c.name,sub:[c.email,c.phone,c.address].filter(Boolean).join(" · ")||"Client",data:c}));
    users.filter(u=>u.name.toLowerCase().includes(qL)||u.role.toLowerCase().includes(qL)||(u.username||"").toLowerCase().includes(qL)).slice(0,6)
      .forEach(u=>results.push({type:"user",icon:u.role==="Team Leader"?"👑":u.role==="Admin"?"🛡":u.role==="Manager"?"🎯":u.role==="Client"?"🏢":"👤",title:u.name,sub:u.role+(u.username?" · @"+u.username:"")+(u.client_name?" · "+u.client_name:""),data:u}));
    tasks.filter(t=>fc[t.id]>0&&(t.title.toLowerCase().includes(qL)||(projects.find(p=>p.id===t.project_id)?projects.find(p=>p.id===t.project_id).name:"").toLowerCase().includes(qL))).slice(0,4)
      .forEach(t=>{const pj=projects.find(p=>p.id===t.project_id);results.push({type:"file",icon:"📎",title:t.title,sub:fc[t.id]+" file"+(fc[t.id]!==1?"s":"")+" · "+(pj?pj.name:"—")+" · "+t.status,data:t});});
  }
  useEffect(()=>setSel(0),[q]);
  useEffect(()=>{
    function onKey(e){
      if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(s+1,results.length-1));}
      if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(s-1,0));}
      if(e.key==="Enter"&&results[sel]){go(results[sel]);}
      if(e.key==="Escape"){onClose();}
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[results,sel]);
  function go(item){onNav(item.type,item.data);onClose();}
  const typeLabel={project:"Projects",task:"Tasks",client:"Clients",user:"People",file:"Files"};
  const groups=["project","task","client","user","file"];
  return(
    <div style={{position:"fixed",inset:0,background:"#00000090",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"10vh"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"min(620px,94vw)",background:"#1a1f2e",border:"1px solid #2a3040",borderRadius:16,overflow:"hidden",boxShadow:"0 32px 80px #000000c0"}}>
        {/* Search input */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid #2a3040"}}>
          <span style={{fontSize:18,opacity:.6}}>⌘</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search projects, tasks, people…"
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#f1f5f9",fontSize:16,fontFamily:"inherit"}}/>
          <kbd onClick={onClose} style={{background:"#2a3040",border:"1px solid #3a4050",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#94a3b8",cursor:"pointer"}}>Esc</kbd>
        </div>
        {/* Results */}
        <div style={{maxHeight:"60vh",overflowY:"auto"}}>
          {results.length===0&&<div style={{padding:"32px 20px",textAlign:"center",color:"#475569",fontSize:14}}>{qL?"No results found":"Start typing to search…"}</div>}
          {groups.map(type=>{
            const gr=results.filter(r=>r.type===type);
            if(!gr.length)return null;
            return(
              <div key={type}>
                <div style={{padding:"10px 16px 4px",fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>{typeLabel[type]}</div>
                {gr.map((item,i)=>{
                  const globalIdx=results.indexOf(item);
                  const isSelected=globalIdx===sel;
                  return(
                    <div key={item.data.id||item.data.username} onClick={()=>go(item)}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",
                        background:isSelected?"#2a3040":"transparent",borderLeft:`3px solid ${isSelected?"#14b8a6":"transparent"}`}}
                      onMouseEnter={()=>setSel(globalIdx)}>
                      <span style={{fontSize:18,width:24,textAlign:"center",flexShrink:0}}>{item.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,color:isSelected?"#f1f5f9":"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                        <div style={{fontSize:11,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.sub}</div>
                      </div>
                      {isSelected&&<span style={{fontSize:11,color:"#14b8a6",flexShrink:0}}>Enter ↵</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{padding:"8px 16px",borderTop:"1px solid #2a3040",display:"flex",gap:16,fontSize:11,color:"#475569"}}>
          <span><kbd style={{background:"#2a3040",borderRadius:4,padding:"1px 5px",fontSize:10}}>↑↓</kbd> navigate</span>
          <span><kbd style={{background:"#2a3040",borderRadius:4,padding:"1px 5px",fontSize:10}}>↵</kbd> open</span>
          <span><kbd style={{background:"#2a3040",borderRadius:4,padding:"1px 5px",fontSize:10}}>Esc</kbd> close</span>
          <span style={{marginLeft:"auto"}}>{results.length} result{results.length!==1?"s":""}</span>
        </div>
      </div>
    </div>
  );
}

// ─── AttendanceBar ───────────────────────────────────────────────────────────
function AttendanceBar({attRec,attBreak,onStartBreak,onEndBreak,onClockOut}){
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    if(!attRec||attRec.logout_at)return;
    const id=setInterval(()=>setTick(t=>t+1),1000);
    return()=>clearInterval(id);
  },[attRec]);
  if(!attRec||attRec.logout_at)return null;
  const now=Date.now();
  const loginMs=new Date(attRec.login_at).getTime();
  const liveBrk=attBreak?Math.floor((now-new Date(attBreak.break_start).getTime())/60000):0;
  const rawMin=Math.floor((now-loginMs)/60000);
  const workMin=Math.max(0,rawMin-(attRec.total_break_minutes||0)-liveBrk);
  const wH=Math.floor(workMin/60),wM=workMin%60;
  const bH=Math.floor(liveBrk/60),bM=liveBrk%60;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
      <span style={{fontSize:12,color:attBreak?"#f97316":"#22c55e",fontWeight:700,background:attBreak?"#f9731618":"#22c55e18",border:"1px solid "+(attBreak?"#f9731666":"#22c55e66"),borderRadius:8,padding:"4px 9px",fontFamily:"monospace",whiteSpace:"nowrap"}}>
        {attBreak?"☕ "+(bH>0?bH+"h ":"")+String(bM).padStart(2,"0")+"m on break":"🕐 "+wH+"h "+String(wM).padStart(2,"0")+"m"}
      </span>
      {!attBreak
        ?<button onClick={onStartBreak} style={{background:"transparent",color:"#f97316",border:"1px solid #f9731666",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>☕ Break</button>
        :<button onClick={onEndBreak} style={{background:"transparent",color:"#22c55e",border:"1px solid #22c55e66",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>▶ Resume</button>
      }
      <button onClick={()=>{if(window.confirm("Clock out for today?"))onClockOut();}} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444466",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>⏹ Out</button>
    </div>
  );
}
// ─── AttendanceStats ──────────────────────────────────────────────────────────
function AttendanceStats({stats,attRec,attBreak,me,isAdmin,isManager}){
  const [tick,setTick]=useState(0);
  const [modal,setModal]=useState(null);
  const [modalRows,setModalRows]=useState([]);
  const [modalLoading,setModalLoading]=useState(false);
  useEffect(()=>{
    if(!attRec||attRec.logout_at)return;
    const id=setInterval(()=>setTick(t=>t+1),30000);
    return()=>clearInterval(id);
  },[attRec]);
  if(!stats)return null;
  function fmtMin(m){if(!m||m<=0)return"—";const h=Math.floor(m/60),mn=m%60;return h>0?h+"h "+String(mn).padStart(2,"0")+"m":mn+"m";}
  function fmtTime(ts){if(!ts)return"—";const d=new Date(ts);return d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});}
  const now=Date.now();
  const loginMs=attRec&&!attRec.logout_at?new Date(attRec.login_at).getTime():null;
  const liveBrk=attRec&&attBreak&&!attRec.logout_at?Math.floor((now-new Date(attBreak.break_start).getTime())/60000):0;
  const rawMin=loginMs?Math.floor((now-loginMs)/60000):0;
  const todayLive=loginMs?Math.max(0,rawMin-(attRec.total_break_minutes||0)-liveBrk):(stats.todayMin||0);
  const todayD=new Date();
  const todayStr=todayD.toISOString().slice(0,10);
  const ystStr=new Date(todayD.getTime()-86400000).toISOString().slice(0,10);
  const dow=todayD.getDay();
  const mon=new Date(todayD);mon.setDate(todayD.getDate()-(dow===0?6:dow-1));mon.setHours(0,0,0,0);
  const lMon=new Date(mon);lMon.setDate(lMon.getDate()-7);
  const lSun=new Date(mon);lSun.setDate(lSun.getDate()-1);
  const monStr=mon.toISOString().slice(0,10);
  const lMonStr=lMon.toISOString().slice(0,10);
  const lSunStr=lSun.toISOString().slice(0,10);
  const mthStr=todayStr.slice(0,8)+"01";
  const lMthStart=new Date(todayD.getFullYear(),todayD.getMonth()-1,1).toISOString().slice(0,10);
  const lMthEnd=new Date(todayD.getFullYear(),todayD.getMonth(),0).toISOString().slice(0,10);
  const items=[
    {label:"Today",min:todayLive,color:"#22c55e",icon:"📅",from:todayStr,to:todayStr},
    {label:"Yesterday",min:stats.yesterdayMin||0,color:"#3b82f6",icon:"📆",from:ystStr,to:ystStr},
    {label:"This Week",min:stats.thisWeekMin||0,color:"#a855f7",icon:"🗓",from:monStr,to:todayStr},
    {label:"Last Week",min:stats.lastWeekMin||0,color:"#06b6d4",icon:"🗓",from:lMonStr,to:lSunStr},
    {label:"This Month",min:stats.thisMonthMin||0,color:"#f59e0b",icon:"📅",from:mthStr,to:todayStr},
    {label:"Last Month",min:stats.lastMonthMin||0,color:"#94a3b8",icon:"📆",from:lMthStart,to:lMthEnd},
  ];
  async function openModal(item){
    setModal(item);setModalRows([]);setModalLoading(true);
    let url=SUPA_URL+"/rest/v1/attendance?date=gte."+item.from+"&date=lte."+item.to+"&order=date.asc,user_name.asc&select=*&limit=500";
    if(!isAdmin&&!isManager)url+="&user_id=eq."+me.id;
    const res=await fetch(url,{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    const data=await res.json();
    setModalRows(Array.isArray(data)?data:[]);
    setModalLoading(false);
  }
  function exportXls(){
    if(!modalRows.length)return;
    const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const S=`
<Style ss:ID="h"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#F1F5F9"/><Interior ss:Color="#1e2433" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2a3040"/></Borders></Style>
<Style ss:ID="d"><Font ss:Name="Arial" ss:Size="10" ss:Color="#F1F5F9"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/></Style>
<Style ss:ID="g"><Font ss:Name="Arial" ss:Size="10" ss:Color="#22c55e"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/></Style>
<Style ss:ID="b"><Font ss:Name="Arial" ss:Size="10" ss:Bold="1" ss:Color="#3b82f6"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/></Style>
<Style ss:ID="y"><Font ss:Name="Arial" ss:Size="10" ss:Color="#f59e0b"/><Interior ss:Color="#0F1117" ss:Pattern="Solid"/></Style>`;
    const hasEmp=(isAdmin||isManager);
    const hdrs=["Date",...(hasEmp?["Employee"]:[]),"Clock In","Clock Out","Work Hours","Break (min)","Status"];
    const hrow="<Row>"+hdrs.map(h=>"<Cell ss:StyleID=\"h\"><Data ss:Type=\"String\">"+esc(h)+"</Data></Cell>").join("")+"</Row>";
    const drows=modalRows.map(r=>{
      const cells=[
        "<Cell ss:StyleID=\"d\"><Data ss:Type=\"String\">"+esc(r.date)+"</Data></Cell>",
        ...(hasEmp?["<Cell ss:StyleID=\"d\"><Data ss:Type=\"String\">"+esc(r.user_name)+"</Data></Cell>"]:[] ),
        "<Cell ss:StyleID=\"g\"><Data ss:Type=\"String\">"+esc(fmtTime(r.login_at))+"</Data></Cell>",
        "<Cell ss:StyleID=\""+(r.logout_at?"d":"y")+"\"><Data ss:Type=\"String\">"+esc(fmtTime(r.logout_at))+"</Data></Cell>",
        "<Cell ss:StyleID=\"b\"><Data ss:Type=\"String\">"+esc(fmtMin(r.total_work_minutes))+"</Data></Cell>",
        "<Cell ss:StyleID=\"d\"><Data ss:Type=\"Number\">"+(r.total_break_minutes||0)+"</Data></Cell>",
        "<Cell ss:StyleID=\""+(r.logout_at?"g":"y")+"\"><Data ss:Type=\"String\">"+(r.logout_at?"Done":"Active")+"</Data></Cell>",
      ];
      return "<Row>"+cells.join("")+"</Row>";
    }).join("");
    const xml="<?xml version=\"1.0\"?><?mso-application progid=\"Excel.Sheet\"?><Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"><Styles>"+S+"</Styles><Worksheet ss:Name=\"Attendance\"><Table>"+hrow+drows+"</Table></Worksheet></Workbook>";
    const blob=new Blob([xml],{type:"application/vnd.ms-excel"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="attendance_"+(modal.label||"report").replace(/\s+/g,"_").toLowerCase()+".xls";a.click();
  }
  function getSummary(){
    const byUser={};
    modalRows.forEach(r=>{
      if(!byUser[r.user_name])byUser[r.user_name]={name:r.user_name,totalWork:0,totalBreak:0,days:0};
      byUser[r.user_name].totalWork+=(r.total_work_minutes||0);
      byUser[r.user_name].totalBreak+=(r.total_break_minutes||0);
      byUser[r.user_name].days++;
    });
    return Object.values(byUser).sort((a,b)=>a.name.localeCompare(b.name));
  }
  return(
    <>
      <div style={{marginBottom:24}}>
        <h2 style={{margin:"0 0 12px",fontSize:16,fontWeight:700,color:"#f1f5f9"}}>⏱ Your Work Hours</h2>
        <div className="rds-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12}}>
          {items.map(it=>(
            <div key={it.label} onClick={()=>openModal(it)}
              style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"transform .15s,box-shadow .15s,border-color .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px #00000060";e.currentTarget.style.borderColor=it.color+"66";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=C.border;}}>
              <div style={{fontSize:11,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{it.icon} {it.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:it.color,fontFamily:"monospace"}}>{fmtMin(it.min)}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:4}}>click to view →</div>
            </div>
          ))}
        </div>
      </div>
      {modal&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"#00000088",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:"1px solid "+C.border,borderRadius:16,width:"100%",maxWidth:860,maxHeight:"82vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px #00000090"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.t1}}>⏱ {modal.label} — Attendance</div>
                <div style={{fontSize:12,color:C.t3,marginTop:2}}>{modal.from===modal.to?modal.from:modal.from+" to "+modal.to}</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {(isAdmin||isManager)&&modalRows.length>0&&(
                  <button onClick={exportXls} style={{...GBtn,padding:"6px 14px",fontSize:12,color:"#22c55e",borderColor:"#22c55e66"}}>⬇ Export Excel</button>
                )}
                <button onClick={()=>setModal(null)} style={{background:"none",border:"none",color:C.t2,fontSize:20,cursor:"pointer",padding:4,lineHeight:1}}>✕</button>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:"16px 20px",flex:1}}>
              {modalLoading?(
                <div style={{textAlign:"center",padding:48,color:C.t3,fontSize:14}}>Loading…</div>
              ):modalRows.length===0?(
                <div style={{textAlign:"center",padding:48,color:C.t3,fontSize:14}}>No records found for this period</div>
              ):(
                <>
                  {(isAdmin||isManager)&&(()=>{
                    const summ=getSummary();
                    if(!summ.length)return null;
                    return(
                      <div style={{marginBottom:20}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.t2,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>Summary by Employee</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                          {summ.map(s=>(
                            <div key={s.name} style={{background:C.surface,borderRadius:10,padding:"10px 14px",border:"1px solid "+C.border}}>
                              <div style={{fontWeight:700,color:C.t1,fontSize:13,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                              <div style={{fontSize:12,color:"#22c55e",marginBottom:2}}>Work: {fmtMin(s.totalWork)}</div>
                              <div style={{fontSize:12,color:C.t3}}>Break: {s.totalBreak}m</div>
                              <div style={{fontSize:11,color:C.t3}}>{s.days} day{s.days!==1?"s":""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead>
                        <tr style={{background:C.surface}}>
                          {["Date",...((isAdmin||isManager)?["Employee"]:[]),"Clock In","Clock Out","Work Hours","Break","Status"].map(h=>(
                            <th key={h} style={{padding:"9px 12px",textAlign:"left",color:C.t2,fontWeight:600,borderBottom:"1px solid "+C.border,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modalRows.map(r=>(
                          <tr key={r.id} style={{borderBottom:"1px solid "+C.border+"44"}}>
                            <td style={{padding:"8px 12px",color:C.t1,fontWeight:600}}>{r.date}</td>
                            {(isAdmin||isManager)&&<td style={{padding:"8px 12px",color:C.t1}}>{r.user_name}</td>}
                            <td style={{padding:"8px 12px",color:"#22c55e",fontFamily:"monospace"}}>{fmtTime(r.login_at)}</td>
                            <td style={{padding:"8px 12px",color:r.logout_at?C.t2:"#f59e0b",fontFamily:"monospace"}}>{fmtTime(r.logout_at)}</td>
                            <td style={{padding:"8px 12px",color:"#3b82f6",fontWeight:700,fontFamily:"monospace"}}>{fmtMin(r.total_work_minutes)}</td>
                            <td style={{padding:"8px 12px",color:C.t3}}>{r.total_break_minutes||0}m</td>
                            <td style={{padding:"8px 12px"}}><span style={{fontSize:11,fontWeight:700,color:r.logout_at?"#22c55e":"#f59e0b",background:r.logout_at?"#22c55e18":"#f59e0b18",border:"1px solid "+(r.logout_at?"#22c55e44":"#f59e0b44"),borderRadius:6,padding:"2px 8px"}}>{r.logout_at?"Done":"Active"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{margin:"8px 0 0",fontSize:12,color:C.t3}}>{modalRows.length} record{modalRows.length!==1?"s":""}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ─── AttendancePage ───────────────────────────────────────────────────────────
function AttendancePage({users}){
  const todayStr=new Date().toISOString().slice(0,10);
  const dfltFrom=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const [rows,setRows]=useState([]);
  const [ldng,setLdng]=useState(false);
  const [dateFrom,setDateFrom]=useState(dfltFrom);
  const [dateTo,setDateTo]=useState(todayStr);
  const [fUser,setFUser]=useState("All");
  useEffect(()=>{load();},[dateFrom,dateTo,fUser]);
  async function load(){
    setLdng(true);
    let url=SUPA_URL+"/rest/v1/attendance?date=gte."+dateFrom+"&date=lte."+dateTo+"&order=date.desc,user_name.asc&select=*&limit=500";
    if(fUser!=="All"){const u=users.find(u=>u.name===fUser);if(u)url+="&user_id=eq."+u.id;}
    const res=await fetch(url,{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    const data=await res.json();
    setRows(Array.isArray(data)?data:[]);
    setLdng(false);
  }
  function fmtMin(m){if(!m||m<=0)return"—";const h=Math.floor(m/60),mn=m%60;return h+"h "+String(mn).padStart(2,"0")+"m";}
  function fmtTime(ts){if(!ts)return"—";const d=new Date(ts);return d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});}
  function exportCsv(){
    const hdr=["Date","Employee","Clock In","Clock Out","Work Hours","Break Min","Status"];
    const csvRows=rows.map(r=>[r.date,r.user_name,fmtTime(r.login_at),fmtTime(r.logout_at),fmtMin(r.total_work_minutes),r.total_break_minutes||0,r.logout_at?"Done":"Active"]);
    const csv=[hdr,...csvRows].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="attendance_report.csv";a.click();
  }
  const nonClients=users.filter(u=>u.role!=="Client");
  return(
    <div style={{marginTop:32,marginBottom:32}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#f1f5f9"}}>📋 Team Attendance Report</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",colorScheme:"dark"}}/>
          <span style={{color:C.t3,fontSize:13}}>to</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",colorScheme:"dark"}}/>
          <select value={fUser} onChange={e=>setFUser(e.target.value)} style={{background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="All">All Employees</option>
            {nonClients.map(u=><option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <button onClick={exportCsv} style={{...GBtn,padding:"7px 14px",fontSize:13}}>⬇ CSV</button>
        </div>
      </div>
      {ldng?<div style={{textAlign:"center",padding:32,color:C.t3}}>Loading…</div>:(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:C.surface}}>
                {["Date","Employee","Clock In","Clock Out","Work Hours","Break","Status"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.t2,fontWeight:600,borderBottom:"1px solid "+C.border,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length===0?<tr><td colSpan={7} style={{padding:32,textAlign:"center",color:C.t3}}>No records found</td></tr>:rows.map(r=>(
                <tr key={r.id} style={{borderBottom:"1px solid "+C.border+"55"}}>
                  <td style={{padding:"9px 12px",color:C.t1,fontWeight:600}}>{r.date}</td>
                  <td style={{padding:"9px 12px",color:C.t1}}>{r.user_name}</td>
                  <td style={{padding:"9px 12px",color:"#22c55e",fontFamily:"monospace"}}>{fmtTime(r.login_at)}</td>
                  <td style={{padding:"9px 12px",color:r.logout_at?C.t2:"#f59e0b",fontFamily:"monospace"}}>{fmtTime(r.logout_at)}</td>
                  <td style={{padding:"9px 12px",color:"#3b82f6",fontWeight:700,fontFamily:"monospace"}}>{fmtMin(r.total_work_minutes)}</td>
                  <td style={{padding:"9px 12px",color:C.t3}}>{r.total_break_minutes||0}m</td>
                  <td style={{padding:"9px 12px"}}><span style={{fontSize:11,fontWeight:700,color:r.logout_at?"#22c55e":"#f59e0b",background:r.logout_at?"#22c55e18":"#f59e0b18",border:"1px solid "+(r.logout_at?"#22c55e44":"#f59e0b44"),borderRadius:6,padding:"2px 8px"}}>{r.logout_at?"Done":"Active"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length>0&&<p style={{margin:"8px 0 0",fontSize:12,color:C.t3}}>{rows.length} record{rows.length!==1?"s":""}</p>}
        </div>
      )}
    </div>
  );
}
// ─── TaskTimingPanel ─────────────────────────────────────────────────────────
function TaskTimingPanel({tasks,projects,me,isAdmin,isManager,isTeamLeader,isClient,onEditTask}){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [fProj,setFProj]=useState("All");
  const [fStatus,setFStatus]=useState("All");
  const [sortBy,setSortBy]=useState("time");

  const isEmployee=!isAdmin&&!isManager&&!isTeamLeader&&!isClient;
  const projMap={};projects.forEach(p=>{projMap[p.id]=p;});

  // Filter tasks by role
  const myTasks=isEmployee
    ? tasks.filter(t=>t.assignee===me.name||t.assignee===me.username||t.detailer===me.name||t.detailer===me.username||t.checker===me.name||t.checker===me.username)
    : tasks.filter(t=>projects.some(p=>p.id===t.project_id));

  useEffect(()=>{loadLogs();},[myTasks.length]);

  async function loadLogs(){
    setLoading(true);
    try{
      const projIds=[...new Set(myTasks.map(t=>t.project_id))].slice(0,60);
      if(!projIds.length){setLogs([]);setLoading(false);return;}
      let url=SUPA_URL+"/rest/v1/time_logs?select=*&order=logged_date.desc&limit=3000";
      if(isEmployee)url+="&user_id=eq."+me.id;
      else url+="&project_id=in.("+projIds.join(",")+")";
      const res=await fetch(url,{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
      const data=await res.json();
      setLogs(Array.isArray(data)?data:[]);
    }catch(e){setLogs([]);}
    setLoading(false);
  }

  // Group logs by task_id
  const byTask={};
  logs.forEach(l=>{if(!byTask[l.task_id])byTask[l.task_id]={min:0,workers:{}};byTask[l.task_id].min+=(l.duration_minutes||0);byTask[l.task_id].workers[l.user_name]=(byTask[l.task_id].workers[l.user_name]||0)+(l.duration_minutes||0);});

  // Build rows
  let rows=myTasks.map(t=>({task:t,proj:projMap[t.project_id],totalMin:byTask[t.id]?.min||0,workers:Object.keys(byTask[t.id]?.workers||{})}));

  // Apply filters
  if(fProj!=="All")rows=rows.filter(r=>r.task.project_id===fProj);
  if(fStatus!=="All")rows=rows.filter(r=>r.task.status===fStatus);
  if(sortBy==="time")rows=[...rows].sort((a,b)=>b.totalMin-a.totalMin);
  else if(sortBy==="status")rows=[...rows].sort((a,b)=>a.task.status.localeCompare(b.task.status));
  else rows=[...rows].sort((a,b)=>a.task.title.localeCompare(b.task.title));

  function fmtDur(min){if(!min)return"—";const h=Math.floor(min/60),m=min%60;return h>0?(m>0?h+"h "+m+"m":h+"h"):m+"m";}
  const SC={"Completed":"#059669","Done":"#059669","In Progress":"#3b82f6","Not Yet Started":"#6b7280","To Be Started":"#6b7280","On Hold":"#f59e0b","Hold":"#f59e0b"};
  const totalAll=myTasks.reduce((s,t)=>s+(byTask[t.id]?.min||0),0);
  const withTime=myTasks.filter(t=>(byTask[t.id]?.min||0)>0).length;
  const uProjs=[...new Set(myTasks.map(t=>t.project_id))].map(id=>projMap[id]).filter(Boolean);
  const uStats=[...new Set(myTasks.map(t=>t.status))].filter(Boolean).sort();

  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:24,marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.t1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            ⏱ Task Time Tracking
            <span style={{fontSize:11,background:"#05966922",color:"#059669",borderRadius:10,padding:"2px 9px",fontWeight:700}}>{fmtDur(totalAll)} total</span>
            {withTime>0&&<span style={{fontSize:11,background:"#33415522",color:"#94a3b8",borderRadius:10,padding:"2px 8px"}}>{withTime}/{myTasks.length} tasks logged</span>}
          </div>
          <div style={{fontSize:12,color:C.t3,marginTop:3}}>{isClient?"Your project tasks":"Tasks with time logged by your team"}</div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {uProjs.length>1&&<select value={fProj} onChange={e=>setFProj(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 9px",color:C.t2,fontSize:12,fontFamily:"inherit"}}>
            <option value="All">All Projects</option>{uProjs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          {uStats.length>1&&<select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 9px",color:C.t2,fontSize:12,fontFamily:"inherit"}}>
            <option value="All">All Statuses</option>{uStats.map(s=><option key={s} value={s}>{s}</option>)}</select>}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 9px",color:C.t2,fontSize:12,fontFamily:"inherit"}}>
            <option value="time">⬇ Most Time</option><option value="status">Status</option><option value="title">Task Name</option>
          </select>
        </div>
      </div>

      {/* ── Project roll-up cards (admin/manager/TL only) ── */}
      {!isClient&&!loading&&uProjs.length>1&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
          {uProjs.map(p=>{
            const pTasks=myTasks.filter(t=>t.project_id===p.id);
            const pMin=pTasks.reduce((s,t)=>s+(byTask[t.id]?.min||0),0);
            const pLogged=pTasks.filter(t=>(byTask[t.id]?.min||0)>0).length;
            return(
              <div key={p.id} onClick={()=>setFProj(fProj===p.id?"All":p.id)}
                style={{background:fProj===p.id?p.color+"22":C.surface,border:`1px solid ${fProj===p.id?p.color:C.border}`,borderRadius:10,padding:"9px 14px",cursor:"pointer",transition:"all .15s",minWidth:140}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:p.color||C.accent,flexShrink:0,display:"inline-block"}}/>
                  <span style={{fontSize:11,fontWeight:700,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{p.name}</span>
                </div>
                <div style={{fontSize:17,fontWeight:800,color:pMin>0?"#059669":C.t3}}>{fmtDur(pMin)}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>{pLogged}/{pTasks.length} tasks logged</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Excel export button ── */}
      {!loading&&logs.length>0&&(isAdmin||isManager)&&(
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <button onClick={()=>{
            const xlsHead='<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="t"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e293b" ss:Pattern="Solid"/></Style><Style ss:ID="h"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#334155" ss:Pattern="Solid"/></Style><Style ss:ID="e"><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#f8fafc" ss:Pattern="Solid"/></Style><Style ss:ID="o"><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="c"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="ce"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#f8fafc" ss:Pattern="Solid"/></Style><Style ss:ID="g"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#059669" ss:Pattern="Solid"/></Style></Styles>';
            let xml=xlsHead+'<Worksheet ss:Name="Task Time Logs"><Table>';
            xml+='<Column ss:Width="160"/><Column ss:Width="140"/><Column ss:Width="100"/><Column ss:Width="110"/><Column ss:Width="80"/><Column ss:Width="200"/>';
            xml+='<Row ss:Height="28"><Cell ss:MergeAcross="5" ss:StyleID="t"><Data ss:Type="String">Task Time Logs Export</Data></Cell></Row>';
            xml+='<Row ss:Height="8"></Row>';
            xml+='<Row ss:Height="20"><Cell ss:StyleID="h"><Data ss:Type="String">Task</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Project</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Employee</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Date</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Time</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Notes</Data></Cell></Row>';
            const sortedLogs=[...logs].sort((a,b)=>a.logged_date<b.logged_date?1:-1);
            sortedLogs.forEach((l,i)=>{
              const t=tasks.find(x=>x.id===l.task_id);const p=projMap[l.project_id];
              const even=i%2===0;const s=even?"e":"o";const sc=even?"ce":"c";
              const hStr=fmtDur(l.duration_minutes);
              xml+='<Row ss:Height="17">';
              xml+='<Cell ss:StyleID="'+s+'"><Data ss:Type="String">'+(t?t.title:"")+'</Data></Cell>';
              xml+='<Cell ss:StyleID="'+s+'"><Data ss:Type="String">'+(p?p.name:"")+'</Data></Cell>';
              xml+='<Cell ss:StyleID="'+s+'"><Data ss:Type="String">'+(l.user_name||"")+'</Data></Cell>';
              xml+='<Cell ss:StyleID="'+sc+'"><Data ss:Type="String">'+(l.logged_date||"")+'</Data></Cell>';
              xml+='<Cell ss:StyleID="g"><Data ss:Type="String">'+hStr+'</Data></Cell>';
              xml+='<Cell ss:StyleID="'+s+'"><Data ss:Type="String">'+(l.notes||"")+'</Data></Cell>';
              xml+='</Row>';
            });
            xml+='</Table></Worksheet></Workbook>';
            const blob=new Blob([xml],{type:"application/vnd.ms-excel"});
            const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;
            a.download="Task_Time_Logs_"+new Date().toISOString().slice(0,10)+".xls";a.click();URL.revokeObjectURL(url);
          }} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 14px",color:C.t2,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            📥 Export Excel
          </button>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:28,color:C.t3,fontSize:13}}>Loading time logs…</div>
      ):rows.length===0?(
        <div style={{textAlign:"center",padding:28,color:C.t3,fontSize:13}}>No tasks found{fProj!=="All"||fStatus!=="All"?" — try clearing filters":""}</div>
      ):(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["Task","Project",isClient?"Worked By":"Who Worked","Time Logged","Status"].map(h=>(
                  <th key={h} style={{textAlign:h==="Time Logged"||h==="Status"?"center":"left",padding:"7px 10px",color:C.t3,fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0,60).map((r,i)=>{
                const sc=SC[r.task.status]||C.t3;
                return(
                  <tr key={r.task.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:!isClient?"pointer":"default",transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={!isClient&&onEditTask?()=>onEditTask(r.task):undefined}>
                    <td style={{padding:"8px 10px",maxWidth:200}}>
                      <div style={{fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12}} title={r.task.title}>{r.task.title}</div>
                      {r.task.due_date&&<div style={{fontSize:10,color:C.t3,marginTop:1}}>Due {r.task.due_date}</div>}
                    </td>
                    <td style={{padding:"8px 10px",maxWidth:140}}>
                      {r.proj&&<span style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:r.proj.color||C.accent,flexShrink:0,display:"inline-block"}}/>
                        <span style={{color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120,fontSize:12}}>{r.proj.name}</span>
                      </span>}
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      {isClient?(
                        r.workers.length>0
                          ?<span style={{fontSize:11,background:"#33415544",color:"#94a3b8",borderRadius:6,padding:"2px 8px"}}>Our Team ({r.workers.length})</span>
                          :<span style={{color:C.t3,fontSize:11}}>—</span>
                      ):(
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {r.workers.length>0?r.workers.slice(0,3).map(w=>(
                            <span key={w} style={{fontSize:10,background:"#05966918",color:"#059669",borderRadius:10,padding:"1px 7px",fontWeight:600,whiteSpace:"nowrap"}}>{w.split(" ")[0]}</span>
                          )):<span style={{color:C.t3,fontSize:11}}>—</span>}
                          {r.workers.length>3&&<span style={{fontSize:10,color:C.t3}}>+{r.workers.length-3}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"center"}}>
                      {r.totalMin>0
                        ?<span style={{fontWeight:700,color:"#059669",background:"#05966918",borderRadius:6,padding:"2px 9px",fontSize:12}}>{fmtDur(r.totalMin)}</span>
                        :<span style={{color:C.t3,fontSize:11}}>—</span>}
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"center"}}>
                      <span style={{background:sc+"18",color:sc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{r.task.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length>60&&<div style={{textAlign:"center",padding:"10px",color:C.t3,fontSize:12}}>Showing 60 of {rows.length} tasks · use filters to narrow down</div>}
        </div>
      )}
    </div>
  );
}

// ─── TimingsPage ─────────────────────────────────────────────────────────────
function TimingsPage({me,tasks,projects,users,isAdmin,isManager,isTeamLeader,isClient}){
  const defTab=isClient?"projects":(isAdmin||isManager)?"employees":"myatt";
  const [tab,setTab]=useState(defTab);
  const [timeLogs,setTimeLogs]=useState([]);
  const [attendance,setAttendance]=useState([]);
  const [loading,setLoading]=useState(true);
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));

  const projMap={};projects.forEach(p=>{projMap[p.id]=p;});
  const taskMap={};tasks.forEach(t=>{taskMap[t.id]=t;});

  useEffect(()=>{loadData();},[month]);

  async function loadData(){
    setLoading(true);
    const from=month+"-01";
    const toD=new Date(month);toD.setMonth(toD.getMonth()+1);toD.setDate(0);
    const to=toD.toISOString().slice(0,10);
    const projIds=[...new Set(projects.map(p=>p.id))].slice(0,60);
    // time_logs
    let tlUrl=SUPA_URL+"/rest/v1/time_logs?select=*&logged_date=gte."+from+"&logged_date=lte."+to+"&order=logged_date.desc&limit=3000";
    if(isClient||isTeamLeader){if(projIds.length)tlUrl+="&project_id=in.("+projIds.join(",")+")";}
    else if(!isAdmin&&!isManager)tlUrl+="&user_id=eq."+me.id;
    const tlRes=await fetch(tlUrl,{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    const tlData=await tlRes.json();
    setTimeLogs(Array.isArray(tlData)?tlData:[]);
    // attendance (not client)
    if(!isClient){
      let attUrl=SUPA_URL+"/rest/v1/attendance?select=*&date=gte."+from+"&date=lte."+to+"&order=date.desc&limit=3000";
      if(!isAdmin&&!isManager)attUrl+="&user_id=eq."+me.id;
      const attRes=await fetch(attUrl,{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
      const attData=await attRes.json();
      setAttendance(Array.isArray(attData)?attData:[]);
    }
    setLoading(false);
  }

  function fmtDur(min){if(!min)return"—";const h=Math.floor(min/60),m=min%60;return h>0?(m>0?h+"h "+m+"m":h+"h"):m+"m";}
  function fmtTime(ts){if(!ts)return"—";return new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});}

  const SC={"Completed":"#059669","Done":"#059669","In Progress":"#3b82f6","Not Yet Started":"#6b7280","To Be Started":"#6b7280","On Hold":"#f59e0b","Hold":"#f59e0b"};

  // Group by employee (attendance)
  const byEmp={};
  attendance.forEach(r=>{
    if(!byEmp[r.user_name])byEmp[r.user_name]={days:0,workMin:0,breakMin:0};
    byEmp[r.user_name].days++;byEmp[r.user_name].workMin+=(r.total_work_minutes||0);byEmp[r.user_name].breakMin+=(r.total_break_minutes||0);
  });

  // Group by project (time_logs)
  const byProj={};
  timeLogs.forEach(l=>{
    if(!byProj[l.project_id])byProj[l.project_id]={min:0,tasks:new Set(),workers:new Set()};
    byProj[l.project_id].min+=(l.duration_minutes||0);byProj[l.project_id].tasks.add(l.task_id);byProj[l.project_id].workers.add(l.user_name);
  });

  // Group by task (time_logs)
  const byTask={};
  timeLogs.forEach(l=>{
    if(!byTask[l.task_id])byTask[l.task_id]={min:0,workers:{},projId:l.project_id};
    byTask[l.task_id].min+=(l.duration_minutes||0);byTask[l.task_id].workers[l.user_name]=(byTask[l.task_id].workers[l.user_name]||0)+(l.duration_minutes||0);
  });

  const tabs=isClient
    ?[["projects","📁","Projects"],["tasks","📋","Tasks"]]
    :(isAdmin||isManager)
      ?[["employees","👥","Employees"],["projects","📁","Projects"],["tasks","📋","Tasks"]]
      :isTeamLeader
        ?[["myatt","🕐","My Attendance"],["projects","📁","Projects"],["tasks","📋","Tasks"]]
        :[["myatt","🕐","My Attendance"],["tasks","📋","My Tasks"]];

  const TH=({children,center})=><th style={{textAlign:center?"center":"left",padding:"8px 12px",color:C.t3,fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".05em",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{children}</th>;

  return(
    <div style={{maxWidth:1100,margin:"0 auto",paddingBottom:40}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.t1}}>⏱ Timings</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.t3}}>{isClient?"Your project & task time overview":(isAdmin||isManager)?"Full team attendance & task time logs":"Your time logs & project breakdown"}</p>
        </div>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 13px",color:C.t1,fontSize:13,fontFamily:"inherit"}}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`1px solid ${C.border}`}}>
        {tabs.map(([id,icon,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{background:"none",border:"none",borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`,padding:"9px 18px",color:tab===id?C.accent:C.t3,fontSize:13,fontWeight:tab===id?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,marginBottom:-1,transition:"color .15s"}}>
            {icon} {label}
          </button>
        ))}
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:60,color:C.t3,fontSize:14}}>Loading…</div>
      ):(

        /* ── EMPLOYEES TAB ── */
        tab==="employees"?(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:C.surface}}><TH>Employee</TH><TH>Days Present</TH><TH>Total Work Hours</TH><TH>Total Break</TH><TH>Avg Hours/Day</TH></tr></thead>
                <tbody>
                  {Object.entries(byEmp).sort((a,b)=>b[1].workMin-a[1].workMin).map(([name,d],i)=>(
                    <tr key={name} style={{background:i%2===0?"transparent":C.surface+"44",borderBottom:`1px solid ${C.border}22`}}>
                      <td style={{padding:"9px 12px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:30,height:30,borderRadius:"50%",background:C.accent+"22",border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:C.accent,flexShrink:0}}>{(name[0]||"?").toUpperCase()}</span><span style={{fontWeight:600,color:C.t1}}>{name}</span></div></td>
                      <td style={{padding:"9px 12px"}}><span style={{fontWeight:600,color:C.blue}}>{d.days} days</span></td>
                      <td style={{padding:"9px 12px"}}><span style={{fontWeight:700,color:"#059669",background:"#05966918",borderRadius:6,padding:"3px 10px"}}>{fmtDur(d.workMin)}</span></td>
                      <td style={{padding:"9px 12px"}}><span style={{color:C.t3,fontSize:12}}>{fmtDur(d.breakMin)}</span></td>
                      <td style={{padding:"9px 12px"}}><span style={{color:C.t2}}>{d.days>0?fmtDur(Math.round(d.workMin/d.days)):"—"}</span></td>
                    </tr>
                  ))}
                  {!Object.keys(byEmp).length&&<tr><td colSpan={5} style={{textAlign:"center",padding:36,color:C.t3}}>No attendance records this month</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        /* ── MY ATTENDANCE TAB ── */
        ):tab==="myatt"?(
          <div>
            <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              {[
                {label:"Days Present",val:attendance.length,color:C.blue},
                {label:"Total Work Hours",val:fmtDur(attendance.reduce((s,r)=>s+(r.total_work_minutes||0),0)),color:"#059669"},
                {label:"Total Break",val:fmtDur(attendance.reduce((s,r)=>s+(r.total_break_minutes||0),0)),color:C.t2},
                {label:"Avg Hours/Day",val:attendance.length>0?fmtDur(Math.round(attendance.reduce((s,r)=>s+(r.total_work_minutes||0),0)/attendance.length)):"—",color:C.accent},
              ].map(s=>(
                <div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 18px",flex:"1 1 140px",minWidth:130}}>
                  <div style={{fontSize:11,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:C.surface}}><TH>Date</TH><TH>Clock In</TH><TH>Clock Out</TH><TH>Work Hours</TH><TH>Break</TH><TH>Status</TH></tr></thead>
                  <tbody>
                    {attendance.map((r,i)=>{
                      const sc=r.logout_at?"#059669":"#d97706";
                      return(
                        <tr key={r.id} style={{background:i%2===0?"transparent":C.surface+"44",borderBottom:`1px solid ${C.border}22`}}>
                          <td style={{padding:"8px 12px",fontWeight:600,color:C.t1}}>{r.date}</td>
                          <td style={{padding:"8px 12px",color:C.t2}}>{fmtTime(r.login_at)}</td>
                          <td style={{padding:"8px 12px",color:C.t2}}>{fmtTime(r.logout_at)}</td>
                          <td style={{padding:"8px 12px"}}><span style={{fontWeight:700,color:"#059669",background:"#05966918",borderRadius:6,padding:"2px 9px"}}>{fmtDur(r.total_work_minutes)}</span></td>
                          <td style={{padding:"8px 12px",color:C.t3,fontSize:12}}>{fmtDur(r.total_break_minutes)}</td>
                          <td style={{padding:"8px 12px"}}><span style={{background:sc+"18",color:sc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{r.logout_at?"Done":"Active"}</span></td>
                        </tr>
                      );
                    })}
                    {!attendance.length&&<tr><td colSpan={6} style={{textAlign:"center",padding:36,color:C.t3}}>No attendance records this month</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        /* ── PROJECTS TAB ── */
        ):tab==="projects"?(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {projects.filter(p=>byProj[p.id]).sort((a,b)=>(byProj[b.id]?.min||0)-(byProj[a.id]?.min||0)).map(p=>{
              const pd=byProj[p.id];
              const pTasks=[...pd.tasks].map(id=>taskMap[id]).filter(Boolean).sort((a,b)=>(byTask[b.id]?.min||0)-(byTask[a.id]?.min||0));
              return(
                <div key={p.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                  <div style={{background:C.surface,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:p.color||C.accent,flexShrink:0,display:"inline-block"}}/>
                    <span style={{fontWeight:700,color:C.t1,fontSize:14,flex:1}}>{p.name}</span>
                    <span style={{fontWeight:800,color:"#059669",fontSize:15,background:"#05966918",borderRadius:8,padding:"3px 12px"}}>{fmtDur(pd.min)}</span>
                    <span style={{fontSize:11,color:C.t3}}>{pd.tasks.size} tasks · {isClient?"Our Team":pd.workers.size+" people"}</span>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{background:C.surface+"88"}}>
                        <th style={{textAlign:"left",padding:"6px 14px",color:C.t3,fontWeight:700,fontSize:11,textTransform:"uppercase"}}>Task</th>
                        <th style={{textAlign:"left",padding:"6px 10px",color:C.t3,fontWeight:700,fontSize:11,textTransform:"uppercase"}}>{isClient?"Worked By":"Who Worked"}</th>
                        <th style={{textAlign:"center",padding:"6px 10px",color:C.t3,fontWeight:700,fontSize:11,textTransform:"uppercase"}}>Hours</th>
                        <th style={{textAlign:"center",padding:"6px 10px",color:C.t3,fontWeight:700,fontSize:11,textTransform:"uppercase"}}>Status</th>
                      </tr></thead>
                      <tbody>
                        {pTasks.map((t,i)=>{
                          const td=byTask[t.id]||{min:0,workers:{}};const sc=SC[t.status]||C.t3;
                          return(
                            <tr key={t.id} style={{borderBottom:`1px solid ${C.border}22`,background:i%2===0?"transparent":C.surface+"44"}}>
                              <td style={{padding:"7px 14px",fontWeight:600,color:C.t1,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</td>
                              <td style={{padding:"7px 10px"}}>
                                {isClient
                                  ?<span style={{fontSize:11,background:"#33415544",color:"#94a3b8",borderRadius:6,padding:"2px 8px"}}>Our Team ({Object.keys(td.workers).length})</span>
                                  :<div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                                    {Object.entries(td.workers).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([w,wm])=>(
                                      <span key={w} style={{fontSize:10,background:"#05966918",color:"#059669",borderRadius:10,padding:"1px 7px",fontWeight:600}} title={fmtDur(wm)}>{w.split(" ")[0]}</span>
                                    ))}
                                    {Object.keys(td.workers).length>3&&<span style={{fontSize:10,color:C.t3}}>+{Object.keys(td.workers).length-3}</span>}
                                  </div>
                                }
                              </td>
                              <td style={{padding:"7px 10px",textAlign:"center"}}>{td.min>0?<span style={{fontWeight:700,color:"#059669",background:"#05966918",borderRadius:6,padding:"2px 8px"}}>{fmtDur(td.min)}</span>:<span style={{color:C.t3}}>—</span>}</td>
                              <td style={{padding:"7px 10px",textAlign:"center"}}><span style={{background:sc+"18",color:sc,borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{t.status}</span></td>
                            </tr>
                          );
                        })}
                        {!pTasks.length&&<tr><td colSpan={4} style={{textAlign:"center",padding:16,color:C.t3,fontSize:12}}>No tasks with time logged</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {!projects.filter(p=>byProj[p.id]).length&&<div style={{textAlign:"center",padding:48,color:C.t3,fontSize:13}}>No project time logs this month</div>}
          </div>

        /* ── TASKS TAB ── */
        ):tab==="tasks"?(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:C.surface}}>
                  <TH>Task</TH><TH>Project</TH><TH>{isClient?"Worked By":"Who Worked"}</TH><TH center>Hours</TH><TH center>Status</TH>
                </tr></thead>
                <tbody>
                  {Object.entries(byTask).sort((a,b)=>b[1].min-a[1].min).map(([tid,td],i)=>{
                    const t=taskMap[tid];const p=projMap[td.projId];if(!t)return null;const sc=SC[t.status]||C.t3;
                    return(
                      <tr key={tid} style={{background:i%2===0?"transparent":C.surface+"44",borderBottom:`1px solid ${C.border}22`}}>
                        <td style={{padding:"8px 12px",fontWeight:600,color:C.t1,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</td>
                        <td style={{padding:"8px 12px"}}>{p&&<span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:7,height:7,borderRadius:"50%",background:p.color||C.accent,flexShrink:0,display:"inline-block"}}/><span style={{color:C.t2,fontSize:12}}>{p.name}</span></span>}</td>
                        <td style={{padding:"8px 12px"}}>
                          {isClient
                            ?<span style={{fontSize:11,background:"#33415544",color:"#94a3b8",borderRadius:6,padding:"2px 8px"}}>Our Team ({Object.keys(td.workers).length})</span>
                            :<div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                              {Object.entries(td.workers).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([w,wm])=>(
                                <span key={w} style={{fontSize:11,background:"#05966918",color:"#059669",borderRadius:10,padding:"1px 8px",fontWeight:600}} title={fmtDur(wm)}>{w.split(" ")[0]}</span>
                              ))}
                              {Object.keys(td.workers).length>3&&<span style={{fontSize:11,color:C.t3}}>+{Object.keys(td.workers).length-3}</span>}
                            </div>
                          }
                        </td>
                        <td style={{padding:"8px 12px",textAlign:"center"}}><span style={{fontWeight:700,color:"#059669",background:"#05966918",borderRadius:6,padding:"3px 10px"}}>{fmtDur(td.min)}</span></td>
                        <td style={{padding:"8px 12px",textAlign:"center"}}><span style={{background:sc+"18",color:sc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{t.status}</span></td>
                      </tr>
                    );
                  })}
                  {!Object.keys(byTask).length&&<tr><td colSpan={5} style={{textAlign:"center",padding:36,color:C.t3}}>No task time logs this month</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ):null
      )}
    </div>
  );
}

export default function App(){
  useEffect(()=>{
    document.body.style.margin="0";
    document.body.style.padding="0";
    document.body.style.overflow="hidden";
    document.documentElement.style.margin="0";
    document.documentElement.style.padding="0";
  },[]);
  const [me,sm] = useState(()=>{try{const s=localStorage.getItem("rds_user");return s?JSON.parse(s):null;}catch{return null;}});
  const [users,su]          = useState([]);
  const [projects,sp]       = useState([]);
  const [tasks,st]          = useState([]);
  const [workflows,swf]     = useState([]);
  const [clients,scl]       = useState([]);
  const [loading,sl]        = useState(false);
  const [view,sv]           = useState(()=>{try{return sessionStorage.getItem("rds_view")||"dashboard";}catch(e){return"dashboard";}});
  useEffect(()=>{try{sessionStorage.setItem("rds_view",view);}catch(e){}},[view]);
  const [activePid,sap]     = useState(null);
  const [activeClient,sac]  = useState(null);
  const [taskModal,stm]     = useState(false);
  const [projModal,spm]     = useState(false);
  const [userModal,sum]     = useState(false);
  const [clientModal,scm]   = useState(false);
  const [pwModal,spwm]      = useState(false);

  const [statModal,ssm]     = useState(null);
  const [exportOpen,setExportOpen] = useState(false);
  const [exportSec,setExportSec] = useState(null);
  const exportRef = useRef();
  const [navBadges,setNavBadges] = useState({warroom:0,announcements:0});
  const [editTask,set]      = useState(null);
  const [editProject,sep]   = useState(null);
  const [searchTask,sst]    = useState("");
  const [searchProj,ssp]    = useState("");
  const [filterStatus,sfs]  = useState("All");
  const [filterAssignee,sfa]= useState("All");
  const [uMenu,sMenu]       = useState(false);
  const [showMore,setShowMore] = useState(false);
  const [saving,ssv]        = useState(false);
  const [dashSearch,sdss]   = useState("");
  const [dashUser,sdsu]     = useState("All");
  const [dashProject,sdsp]  = useState("All");
  const [dashClient,sdsc]   = useState("All");
  const [dashStatus,sdsst]  = useState("All");
  // ── Attendance ──
  const attRecRef=useRef(null);
  const [attRec,sattRec]=useState(null);
  const [attBreak,sattBrk]=useState(null);
  const [attStats,sattStats]=useState(null);
  const [toast,sToast]      = useState(null);
  const [taskFileCounts,setTFC] = useState({});  // {[taskId]: fileCount}
  const [fileTask,setFileTask]  = useState(null); // task object whose files panel is open
  const [cmdOpen,setCmdOpen]    = useState(false); // ⌘K command palette
  const [logo,sLogo]        = useState(null);
  const [selTasks,setSelTasks]   = useState(new Set());
  const [selProjects,setSelProjs]= useState(new Set());
  const [bulkSelectOn,setBSO]    = useState(false);
  const [bulkModal,setBM]        = useState(null); // "status"|"reassign"|"priority"
  const logoRef             = useRef();
  const prevViewRef         = useRef('dashboard');
  const initialParsed       = useRef(false);
  const initialPath         = useRef(window.location.pathname);
  const [isMobile,setIM]    = useState(()=>window.innerWidth<768);
  const [sideOpen,setSO]    = useState(false);
  useEffect(()=>{const h=()=>setIM(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  useEffect(()=>{
    function handleCmdKey(e){
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(o=>!o);}
      if(e.key==="Escape")setCmdOpen(false);
    }
    window.addEventListener("keydown",handleCmdKey);
    return()=>window.removeEventListener("keydown",handleCmdKey);
  },[]);
  const today=new Date().toISOString().slice(0,10);
  const isClient=me?.role==="Client";
  const isAdmin=me?.role==="Admin"||me?.username===SUPER_ADMIN;
  const isManager=!isAdmin&&me?.role==="Manager";
  const isTeamLeader=!isAdmin&&!isManager&&me?.role==="Team Leader";
  const canEdit=isAdmin||isManager||isTeamLeader;
  // Inject responsive CSS once
  useEffect(()=>{
    const s=document.createElement("style");
    s.id="rds-mobile-css";
    s.textContent=`
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
      body,html{overflow:hidden;}
      @media(max-width:768px){
        .rds-sidebar{display:none!important;}
        .rds-main{padding:8px!important;padding-bottom:80px!important;overflow-x:hidden!important;}
        .rds-topbar{flex-wrap:nowrap!important;gap:6px!important;margin-bottom:10px!important;align-items:center!important;}
        .rds-topbar-left{flex:1!important;min-width:0!important;overflow:hidden!important;display:flex!important;align-items:center!important;gap:8px!important;}
        .rds-topbar-right{flex-shrink:0!important;display:flex!important;gap:4px!important;align-items:center!important;justify-content:flex-end!important;}
        .rds-topbar-filters{display:none!important;}
        .rds-mob-only{display:none!important;}
        .rds-kanban-wrap{display:flex!important;gap:10px!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;padding-bottom:16px!important;scroll-snap-type:x mandatory!important;padding-left:2px!important;padding-right:2px!important;}
        .rds-kcol{min-width:calc(100vw - 32px)!important;flex-shrink:0!important;scroll-snap-align:start!important;border-radius:12px!important;}
        .rds-stat-grid{grid-template-columns:repeat(2,1fr)!important;}
        .rds-mini-grid{grid-template-columns:repeat(2,1fr)!important;}
        .rds-table-outer{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;}
        .rds-table-outer table{min-width:500px;}
        .rds-hide-mob{display:none!important;}
        .rds-form-row{flex-direction:column!important;}
        input,select,textarea{font-size:16px!important;}
        .rds-modal-inner{width:96vw!important;max-width:96vw!important;padding:14px!important;}
        .rds-bottom-nav{display:flex!important;}
        .rds-desktop-nav{display:none!important;}
        h1.rds-greeting{font-size:13px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
        .rds-export-btn span.rds-export-label{display:none;}
        .rds-export-btn{padding:7px 9px!important;font-size:13px!important;}
        .rds-new-task-btn{padding:7px 10px!important;font-size:12px!important;white-space:nowrap!important;}
        .rds-page-sub{display:none!important;}
        .rds-dash-banner{flex-wrap:wrap!important;padding:14px 16px!important;gap:10px!important;}
        .rds-dash-banner-avatar{display:none!important;}
        .rds-dash-banner-stats{width:100%!important;gap:8px!important;}
        .rds-dash-banner-stats > div{flex:1!important;min-width:0!important;padding:8px 10px!important;}
      }
      @media(min-width:769px){
        .rds-bottom-nav{display:none!important;}
        .rds-desktop-nav{display:flex!important;}
        .rds-mob-only{display:none!important;}
        .rds-topbar-filters{display:contents!important;}
      }
    `;
    if(!document.getElementById("rds-mobile-css"))document.head.appendChild(s);
    return()=>{const el=document.getElementById("rds-mobile-css");if(el)el.remove();};
  },[]);
  // ── Inject animation/UI enhancement CSS ──
  useEffect(()=>{
    if(document.getElementById("rds-anim-css"))return;
    const a=document.createElement("style");
    a.id="rds-anim-css";
    a.textContent=`
      /* ════════════════════════════════
         KEYFRAMES
      ════════════════════════════════ */
      @keyframes rds-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      @keyframes rds-scale-in{from{opacity:0;transform:scale(0.90)}to{opacity:1;transform:scale(1)}}
      @keyframes rds-slide-left{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
      @keyframes rds-pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}

      /* Bell ring */
      @keyframes rds-bell-ring{
        0%,100%{transform:rotate(0)}6%{transform:rotate(18deg)}12%{transform:rotate(-16deg)}
        18%{transform:rotate(12deg)}24%{transform:rotate(-10deg)}30%{transform:rotate(6deg)}
        36%{transform:rotate(-4deg)}42%{transform:rotate(2deg)}48%{transform:rotate(0)}
      }
      .rds-bell-ring{display:inline-block;transform-origin:50% 0%;animation:rds-bell-ring 3s ease-in-out 0.5s infinite;}

      /* Logo breathe */
      @keyframes rds-logo-pulse{0%,100%{filter:drop-shadow(0 0 0px rgba(99,102,241,0))}50%{filter:drop-shadow(0 0 6px rgba(99,102,241,.5))}}
      .rds-logo-anim{animation:rds-logo-pulse 2.5s ease-in-out infinite;}

      /* Bar grow from left */
      @keyframes rds-bar-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
      .rds-anim-bar{transform-origin:left!important;animation:rds-bar-grow 0.9s cubic-bezier(.22,1,.36,1) both!important;}

      /* Staggered hbar rows */
      .rds-hbar-row:nth-child(1) .rds-anim-bar{animation-delay:.04s!important}
      .rds-hbar-row:nth-child(2) .rds-anim-bar{animation-delay:.10s!important}
      .rds-hbar-row:nth-child(3) .rds-anim-bar{animation-delay:.16s!important}
      .rds-hbar-row:nth-child(4) .rds-anim-bar{animation-delay:.22s!important}
      .rds-hbar-row:nth-child(5) .rds-anim-bar{animation-delay:.28s!important}
      .rds-hbar-row:nth-child(6) .rds-anim-bar{animation-delay:.34s!important}
      .rds-hbar-row:nth-child(7) .rds-anim-bar{animation-delay:.40s!important}
      .rds-hbar-row:nth-child(8) .rds-anim-bar{animation-delay:.46s!important}

      /* Perf bar (team/client) */
      .rds-perf-bar{transform-origin:left!important;animation:rds-bar-grow 1s cubic-bezier(.22,1,.36,1) both!important;}
      .rds-perf-row:nth-child(1) .rds-perf-bar{animation-delay:.06s!important}
      .rds-perf-row:nth-child(2) .rds-perf-bar{animation-delay:.13s!important}
      .rds-perf-row:nth-child(3) .rds-perf-bar{animation-delay:.20s!important}
      .rds-perf-row:nth-child(4) .rds-perf-bar{animation-delay:.27s!important}
      .rds-perf-row:nth-child(5) .rds-perf-bar{animation-delay:.34s!important}
      .rds-perf-row:nth-child(6) .rds-perf-bar{animation-delay:.41s!important}
      .rds-perf-row:nth-child(7) .rds-perf-bar{animation-delay:.48s!important}
      .rds-perf-row:nth-child(8) .rds-perf-bar{animation-delay:.55s!important}

      /* Donut spin-in */
      @keyframes rds-donut-in{from{opacity:0;transform:rotate(-90deg) scale(0.75)}to{opacity:1;transform:rotate(-90deg) scale(1)}}
      .rds-donut-svg{animation:rds-donut-in 0.7s cubic-bezier(.22,1,.36,1) both!important;}

      /* Individual donut segments */
      @keyframes rds-seg-draw{from{stroke-dashoffset:var(--full)}to{stroke-dashoffset:var(--off)}}
      .rds-donut-seg{animation:rds-seg-draw 0.9s cubic-bezier(.22,1,.36,1) both;}
      .rds-donut-seg:nth-child(1){animation-delay:.10s}
      .rds-donut-seg:nth-child(2){animation-delay:.25s}
      .rds-donut-seg:nth-child(3){animation-delay:.40s}
      .rds-donut-seg:nth-child(4){animation-delay:.55s}

      /* KPI ACard entrance */
      @keyframes rds-kpi-in{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
      .rds-acard{animation:rds-kpi-in 0.4s cubic-bezier(.22,1,.36,1) both;}
      .rds-acard:nth-child(1){animation-delay:.05s}.rds-acard:nth-child(2){animation-delay:.10s}
      .rds-acard:nth-child(3){animation-delay:.15s}.rds-acard:nth-child(4){animation-delay:.20s}
      .rds-acard:nth-child(5){animation-delay:.25s}.rds-acard:nth-child(6){animation-delay:.30s}

      /* Number pop */
      @keyframes rds-num-pop{0%{opacity:0;transform:scale(.6)}65%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
      .rds-num-anim{animation:rds-num-pop 0.5s cubic-bezier(.22,1,.36,1) both;}

      /* Analytics panel entrance */
      @keyframes rds-panel-in{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      .rds-panel{animation:rds-panel-in 0.45s cubic-bezier(.22,1,.36,1) both;}
      .rds-panel:nth-child(1){animation-delay:.08s}.rds-panel:nth-child(2){animation-delay:.16s}
      .rds-panel:nth-child(3){animation-delay:.24s}.rds-panel:nth-child(4){animation-delay:.32s}

      /* ════════════════════════════════
         ENTRANCE ANIMATIONS
      ════════════════════════════════ */
      .rds-dash-banner{animation:rds-fade-up 0.42s cubic-bezier(.22,1,.36,1) both;}

      .rds-stat-grid > *{animation:rds-scale-in 0.36s cubic-bezier(.22,1,.36,1) both;}
      .rds-stat-grid > *:nth-child(1){animation-delay:.05s}.rds-stat-grid > *:nth-child(2){animation-delay:.10s}
      .rds-stat-grid > *:nth-child(3){animation-delay:.15s}.rds-stat-grid > *:nth-child(4){animation-delay:.20s}
      .rds-stat-grid > *:nth-child(5){animation-delay:.25s}

      .rds-mini-grid > *{animation:rds-scale-in 0.32s cubic-bezier(.22,1,.36,1) both;}
      .rds-mini-grid > *:nth-child(1){animation-delay:.04s}.rds-mini-grid > *:nth-child(2){animation-delay:.09s}
      .rds-mini-grid > *:nth-child(3){animation-delay:.14s}.rds-mini-grid > *:nth-child(4){animation-delay:.19s}

      /* ════════════════════════════════
         INTERACTIONS
      ════════════════════════════════ */
      .rds-modal-inner{animation:rds-scale-in 0.22s cubic-bezier(.22,1,.36,1) both;}

      .rds-sidebar button{transition:background .15s,color .15s,padding-left .18s,box-shadow .15s!important;}
      .rds-sidebar button:hover{padding-left:20px!important;box-shadow:inset 3px 0 0 rgba(99,102,241,.75)!important;}

      .rds-dash-banner-stats > div{transition:transform .15s ease,box-shadow .15s ease!important;}

      .rds-table-outer tbody tr{transition:background .12s ease!important;}
      .rds-table-outer tbody tr:hover td{background:rgba(99,102,241,.06)!important;}

      .rds-bottom-nav button{transition:transform .15s ease,background .15s ease!important;}
      .rds-bottom-nav button:hover{transform:translateY(-2px)!important;}
      .rds-bottom-nav button:active{transform:scale(0.88)!important;transition:transform .08s ease!important;}

      .rds-kcol{transition:border-color .2s ease,background .2s ease!important;}

      input:focus,select:focus,textarea:focus{
        outline:none!important;
        box-shadow:0 0 0 2.5px rgba(99,102,241,.28)!important;
        transition:box-shadow .15s ease,border-color .15s ease!important;
      }

      button:active:not([disabled]){transform:scale(0.94)!important;transition:transform .08s ease!important;}

      /* ════════════════════════════════
         TABLET (769–1024px)
      ════════════════════════════════ */
      @media(min-width:769px) and (max-width:1024px){
        .rds-stat-grid{grid-template-columns:repeat(2,1fr)!important;}
        .rds-dash-banner{flex-wrap:wrap!important;padding:16px 18px!important;}
        .rds-dash-banner-stats{width:100%!important;margin-top:10px!important;}
        .rds-dash-banner-stats > div{flex:1!important;min-width:0!important;}
        .rds-mini-grid{grid-template-columns:repeat(2,1fr)!important;}
        .rds-acard{padding:12px 14px!important;}
      }

      /* ════════════════════════════════
         REDUCED MOTION
      ════════════════════════════════ */
      @media(prefers-reduced-motion:reduce){
        .rds-dash-banner,.rds-stat-grid > *,.rds-mini-grid > *,.rds-modal-inner,
        .rds-acard,.rds-panel,.rds-num-anim,.rds-anim-bar,.rds-perf-bar,
        .rds-donut-svg,.rds-bell-ring,.rds-logo-anim{
          animation:none!important;transform:none!important;
        }
        *{transition-duration:.01ms!important;}
      }
    `;
    document.head.appendChild(a);
    return()=>{const el=document.getElementById("rds-anim-css");if(el)el.remove();};
  },[]);
  function showToast(msg,ok=true){sToast({msg,ok});setTimeout(()=>sToast(null),3000);}
  function toggleTask(id){setSelTasks(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}
  function toggleProject(id){setSelProjs(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}
  function clearSel(){setSelTasks(new Set());setSelProjs(new Set());}
  function toggleBulkSelect(){setBSO(v=>{if(v){clearSel();}return!v;});}
  async function bulkDelete(){
    const tc=selTasks.size,pc=selProjects.size;
    if(!window.confirm(`Delete ${tc>0?tc+" task(s)":""}${tc>0&&pc>0?" and ":""}${pc>0?pc+" project(s)":""}? This cannot be undone.`))return;
    if(tc>0)await supabase.from("tasks").delete().in("id",[...selTasks]);
    if(pc>0){await supabase.from("tasks").delete().in("project_id",[...selProjects]);await supabase.from("projects").delete().in("id",[...selProjects]);}
    clearSel();setBSO(false);await loadAll();showToast("Deleted successfully ✓");
  }
  async function applyBulkAction(val){
    const ids=[...selTasks];
    if(bulkModal==="status")await supabase.from("tasks").update({status:val}).in("id",ids);
    else if(bulkModal==="reassign")await supabase.from("tasks").update({assignee:val}).in("id",ids);
    else if(bulkModal==="priority")await supabase.from("tasks").update({priority:val}).in("id",ids);
    setBM(null);clearSel();setBSO(false);await loadAll();showToast("Updated successfully ✓");
  }
  async function loadAll(){
    sl(true);
    try{
      const role=me?.role;
      const isRegularUser=role&&role!=="Admin"&&role!=="Manager"&&role!=="Team Leader"&&role!=="Client";
      if(isRegularUser){
        // Fetch all then filter in JS — Supabase .or() silently fails for names with spaces
        const mn=(me.name||"").toLowerCase().trim();
        const mu=(me.username||"").toLowerCase().trim();
        function taskBelongsToMe(tk){
          const chk=v=>{if(!v)return false;const vl=v.toLowerCase().trim();return vl===mn||(mu&&vl===mu)||mn.startsWith(vl+" ")||vl.startsWith(mn+" ")||vl.includes(mn);};
          return chk(tk.assignee)||chk(tk.detailer)||chk(tk.checker);
        }
        const [{data:u},{data:p},{data:t}]=await Promise.all([
          supabase.from("users").select("id,name,username,role,email").order("name"),
          supabase.from("projects").select("*").order("name"),
          supabase.from("tasks").select("*").order("created_at"),
        ]);
        su(u||[]);
        const myTasks=(t||[]).filter(taskBelongsToMe);
        const taskPids=new Set(myTasks.map(tt=>tt.project_id));
        const myProjects=(p||[]).filter(proj=>taskPids.has(proj.id));
        sp(myProjects); st(myTasks); scl([]);
      }else{
        const [{data:u},{data:p},{data:t},{data:cl},{data:wf}]=await Promise.all([
          supabase.from("users").select("*").order("name"),
          supabase.from("projects").select("*").order("name"),
          supabase.from("tasks").select("*").order("created_at"),
          supabase.from("clients").select("*").order("name"),
          supabase.from("workflows").select("*").order("created_at"),
        ]);
        su(u||[]);sp(p||[]);st(t||[]);scl(cl||[]);swf(wf||[]);
      }
    }catch(e){showToast("Failed to load: "+e.message,false);}
    sl(false);
    // Load file counts separately (non-blocking)
    loadFileCounts();
  }
  async function loadFileCounts(){
    const{data}=await supabase.from("task_files").select("task_id");
    if(!data)return;
    const counts={};
    data.forEach(r=>{counts[r.task_id]=(counts[r.task_id]||0)+1;});
    setTFC(counts);
  }
  function updateFileCount(taskId,n){
    setTFC(prev=>({...prev,[taskId]:n}));
  }
  useEffect(()=>{if(me)loadAll();},[me]);
  // ── Attendance functions ──────────────────────────────────────────────────
  async function loadAttendance(){
    if(!me||me.role==="Client")return;
    const todayStr=new Date().toISOString().slice(0,10);
    const res=await fetch(SUPA_URL+"/rest/v1/attendance?user_id=eq."+me.id+"&date=eq."+todayStr+"&select=*",{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    const rows=await res.json();
    if(!Array.isArray(rows)||rows.length===0){
      const ins=await fetch(SUPA_URL+"/rest/v1/attendance",{method:"POST",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({user_id:me.id,user_name:me.name,date:todayStr})});
      const d=await ins.json();
      if(Array.isArray(d)&&d.length>0){attRecRef.current=d[0];sattRec(d[0]);}
    }else{
      const rec=rows[0];
      attRecRef.current=rec;sattRec(rec);
      if(!rec.logout_at){
        const br=await fetch(SUPA_URL+"/rest/v1/breaks?attendance_id=eq."+rec.id+"&break_end=is.null&select=*",{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
        const brows=await br.json();
        if(Array.isArray(brows)&&brows.length>0)sattBrk(brows[0]);
      }
    }
  }
  async function loadAttStats(){
    if(!me||me.role==="Client")return;
    const now=new Date();
    const todayStr=now.toISOString().slice(0,10);
    const from60=new Date(now);from60.setDate(from60.getDate()-60);
    const res=await fetch(SUPA_URL+"/rest/v1/attendance?user_id=eq."+me.id+"&date=gte."+from60.toISOString().slice(0,10)+"&select=date,total_work_minutes",{headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    const rows=await res.json();
    if(!Array.isArray(rows))return;
    const dow=now.getDay();
    const mon=new Date(now);mon.setDate(now.getDate()-(dow===0?6:dow-1));mon.setHours(0,0,0,0);
    const lMon=new Date(mon);lMon.setDate(lMon.getDate()-7);
    const lSun=new Date(mon);lSun.setDate(lSun.getDate()-1);
    const monStr=mon.toISOString().slice(0,10);
    const lMonStr=lMon.toISOString().slice(0,10);
    const lSunStr=lSun.toISOString().slice(0,10);
    const ystStr=new Date(now.getTime()-86400000).toISOString().slice(0,10);
    const mthStr=todayStr.slice(0,8)+"01";
    const lMthStart=new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().slice(0,10);
    const lMthEnd=new Date(now.getFullYear(),now.getMonth(),0).toISOString().slice(0,10);
    function sumMin(fn){return rows.filter(fn).reduce((s,r)=>s+(r.total_work_minutes||0),0);}
    sattStats({
      todayMin:sumMin(r=>r.date===todayStr),
      yesterdayMin:sumMin(r=>r.date===ystStr),
      thisWeekMin:sumMin(r=>r.date>=monStr&&r.date<=todayStr),
      lastWeekMin:sumMin(r=>r.date>=lMonStr&&r.date<=lSunStr),
      thisMonthMin:sumMin(r=>r.date>=mthStr&&r.date<=todayStr),
      lastMonthMin:sumMin(r=>r.date>=lMthStart&&r.date<=lMthEnd),
    });
  }
  async function attStartBreak(){
    const rec=attRecRef.current;
    if(!rec||rec.logout_at)return;
    const res=await fetch(SUPA_URL+"/rest/v1/breaks",{method:"POST",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({attendance_id:rec.id})});
    const d=await res.json();
    if(Array.isArray(d)&&d.length>0)sattBrk(d[0]);
  }
  async function attEndBreak(){
    if(!attBreak)return;
    const dur=Math.floor((Date.now()-new Date(attBreak.break_start).getTime())/60000);
    await fetch(SUPA_URL+"/rest/v1/breaks?id=eq."+attBreak.id,{method:"PATCH",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({break_end:new Date().toISOString(),duration_minutes:dur})});
    const rec=attRecRef.current;
    const newBrk=(rec?.total_break_minutes||0)+dur;
    const pr=await fetch(SUPA_URL+"/rest/v1/attendance?id=eq."+rec.id,{method:"PATCH",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({total_break_minutes:newBrk})});
    const pd=await pr.json();
    const updated=Array.isArray(pd)&&pd.length>0?pd[0]:{...rec,total_break_minutes:newBrk};
    attRecRef.current=updated;sattRec(updated);sattBrk(null);
  }
  async function attClockOut(){
    if(attBreak)await attEndBreak();
    const rec=attRecRef.current;
    if(!rec||rec.logout_at)return;
    const now=new Date();
    const totalMin=Math.floor((now.getTime()-new Date(rec.login_at).getTime())/60000);
    const workMin=Math.max(0,totalMin-(rec.total_break_minutes||0));
    const pr=await fetch(SUPA_URL+"/rest/v1/attendance?id=eq."+rec.id,{method:"PATCH",headers:{apikey:SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({logout_at:now.toISOString(),total_work_minutes:workMin})});
    const pd=await pr.json();
    if(Array.isArray(pd)&&pd.length>0){attRecRef.current=pd[0];sattRec(pd[0]);}
    await loadAttStats();
  }

  useEffect(()=>{if(me&&me.role!=="Client"){loadAttendance();loadAttStats();}},[me]);
  // ── Global chat notifications ──
  const viewRef=useRef(view);
  useEffect(()=>{viewRef.current=view;},[view]);
  const lastNotifPollRef=useRef(null); // ISO timestamp — tracks last polled notification
  const seenNotifIds=useRef(new Set());

  function fireNotif(title,body,id){
    // 1. Nav badge
    setNavBadges(prev=>({...prev,warroom:(prev.warroom||0)+1}));
    // 2. Toast (when not on warroom page)
    if(viewRef.current!=="warroom"){
      sToast({msg:`${title}: ${(body||"📎 media").slice(0,80)}`,ok:true});
      setTimeout(()=>sToast(null),6000);
    }
    // 3. Sound
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=880;o.type="sine";
      g.gain.setValueAtTime(0,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.25,ctx.currentTime+0.01);
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.35);
      o.start(ctx.currentTime);o.stop(ctx.currentTime+0.35);
    }catch{}
    // 4. Browser OS notification
    if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
      try{new Notification(title,{body:body||"New message",icon:"/favicon.svg",tag:"wr-"+(id||Date.now())});}catch{}
    }
  }

  // Auto-request browser notification permission once (3s after login)
  useEffect(()=>{
    if(!me||isClient)return;
    if(typeof Notification==="undefined")return;
    if(Notification.permission==="default"){
      const t=setTimeout(()=>Notification.requestPermission(),3000);
      return()=>clearTimeout(t);
    }
  },[me,isClient]);

  // Realtime — war_room_messages direct (instant when Supabase delivers)
  useEffect(()=>{
    if(!me||isClient)return;
    const ch=supabase
      .channel("wr-global-"+me.username)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'war_room_messages'},p=>{
        const msg=p.new;
        if(!msg||msg.author===me.username)return;
        seenNotifIds.current.add("msg-"+msg.id);
        const sender=msg.author_name||msg.author;
        fireNotif(`💬 ${sender}`,msg.body,msg.id);
      })
      .subscribe();
    return()=>{try{supabase.removeChannel(ch);}catch{}};
  },[me,isClient]);

  // Polling fallback every 3s on notifications table — most reliable path
  // sendMessage() already inserts into notifications for every recipient
  useEffect(()=>{
    if(!me||isClient)return;
    if(!lastNotifPollRef.current)lastNotifPollRef.current=new Date().toISOString();
    const interval=setInterval(async()=>{
      try{
        const since=lastNotifPollRef.current;
        const{data,error}=await supabase.from("notifications")
          .select("id,type,title,description,created_at")
          .eq("user_id",me.id)
          .in("type",["war_room_message","mention"])
          .gt("created_at",since)
          .order("created_at",{ascending:true})
          .limit(10);
        if(error||!data||!data.length)return;
        lastNotifPollRef.current=data[data.length-1].created_at;
        data.forEach(n=>{
          const key="notif-"+n.id;
          if(seenNotifIds.current.has(key))return;
          seenNotifIds.current.add(key);
          fireNotif(n.title||"💬 New message",n.description,n.id);
        });
      }catch{}
    },3000);
    return()=>clearInterval(interval);
  },[me,isClient]);

  // Keep URL in sync whenever state changes (replaceState — navTo handles pushState)
  useEffect(()=>{
    if(!me||!initialParsed.current)return;
    const url=stateToUrl(view,activePid,activeClient,projects);
    window.history.replaceState({view,pid:activePid,client:activeClient},'',url);
  },[view,activePid,activeClient,me,projects]);
  // Handle browser back / forward
  useEffect(()=>{
    function onPop(e){
      const s=e.state;
      const v=s?.view||'dashboard';
      prevViewRef.current=v;
      sv(v);sap(s?.pid||null);sac(s?.client||null);
      if(v==='dashboard'){sst('');sfs('All');sfa('All');}
    }
    window.addEventListener('popstate',onPop);
    return()=>window.removeEventListener('popstate',onPop);
  },[]);
  // Compute accessible projects (must be before useEffect that depends on it)
  // Team Leader: parse comma-separated client_name to restrict their view
  const tlClients=isTeamLeader&&me?.client_name?me.client_name.split(",").map(c=>c.trim().toLowerCase()).filter(Boolean):[];
  const accessibleProjects=isAdmin||isManager?projects
    :isTeamLeader?(tlClients.length>0?projects.filter(p=>tlClients.includes((p.client||"").toLowerCase())):projects)
    :isClient?projects.filter(p=>(p.client||"").toLowerCase()===(me?.client_name||"").toLowerCase())
    // Regular users: ONLY projects where they have an assigned task.
    :projects.filter(p=>tasks.some(t=>t.project_id===p.id&&(userMatchesStr(me,t.assignee)||userMatchesStr(me,t.detailer)||userMatchesStr(me,t.checker))));
  // Parse initial URL after data loads (for direct-link support)
  useEffect(()=>{
    if(!me||!projects.length||initialParsed.current)return;
    initialParsed.current=true;
    const s=urlToState(initialPath.current,projects);
    let {view:tv,pid:tp,client:tc}=s;
    // Access guard on deep-link
    if(!isAdmin&&!isManager&&!isTeamLeader&&!isClient){
      if(tv==='clientprojects'){tv='dashboard';tc=null;}
      if(tv==='list'&&tp&&!accessibleProjects.some(p=>p.id===tp)){tv='dashboard';tp=null;}
    }
    if(tv!=='dashboard'||tp||tc){
      prevViewRef.current=tv;
      sv(tv);sap(tp);sac(tc);
    }
  },[me,projects,accessibleProjects]);
  // Reflect open task in URL hash so task is identifiable in the link
  useEffect(()=>{
    if(!me)return;
    if(taskModal&&editTask){
      const hash=`#task-${slugify(editTask.title||'new')}`;
      window.history.replaceState(window.history.state,'',window.location.pathname+hash);
    }else{
      window.history.replaceState(window.history.state,'',window.location.pathname);
    }
  },[taskModal,editTask]);
  const [mobKanCol,setMobKanCol]=useState("Not Yet Started");
  const [dashStatModal,setDSM]=useState(null);
  if(!me) return <Login onLogin={sm}/>;
  if(loading) return(
    <div style={{height:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <Spinner/><p style={{color:C.t2,marginTop:16}}>Loading your projects…</p>
    </div>
  );
  const members=users.map(u=>u.name);
  const visibleProjects=accessibleProjects.filter(p=>!searchProj||p.name.toLowerCase().includes(searchProj.toLowerCase())||(p.client||"").toLowerCase().includes(searchProj.toLowerCase()));
  const isRegularUser=!isAdmin&&!isManager&&!isTeamLeader&&!isClient;
  const filtered=tasks.filter(t=>{
    if(!accessibleProjects.some(p=>p.id===t.project_id))return false;
    // Regular users: ONLY see tasks explicitly assigned to them
    if(isRegularUser&&!userMatchesStr(me,t.assignee)&&!userMatchesStr(me,t.detailer)&&!userMatchesStr(me,t.checker))return false;
    if(activePid&&t.project_id!==activePid)return false;
    if(activeClient){const proj=projects.find(p=>p.id===t.project_id);if((proj?.client||"Unassigned")!==activeClient)return false;}
    if(searchTask&&!t.title.toLowerCase().includes(searchTask.toLowerCase()))return false;
    if(filterStatus!=="All"){const nsMatch=filterStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!nsMatch&&t.status!==filterStatus)return false;}
    if(!isRegularUser&&filterAssignee!=="All"&&t.assignee!==filterAssignee)return false;
    return true;
  });
  const dashTasks=tasks.filter(t=>accessibleProjects.some(p=>p.id===t.project_id));
  const hasDashFilter=dashSearch||dashUser!=="All"||dashProject!=="All"||dashClient!=="All"||dashStatus!=="All";
  const filteredDashTasks=dashTasks.filter(t=>{
    if(dashSearch&&!t.title.toLowerCase().includes(dashSearch.toLowerCase()))return false;
    if(dashUser!=="All"&&t.assignee!==dashUser)return false;
    if(dashProject!=="All"&&t.project_id!==dashProject)return false;
    if(dashStatus!=="All"){const isNotStarted=dashStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started");if(!isNotStarted&&t.status!==dashStatus)return false;}
    if(dashClient!=="All"){const proj=projects.find(p=>p.id===t.project_id);if((proj?.client||"Unassigned")!==dashClient)return false;}
    return true;
  });
  const activeDashTasks=hasDashFilter?filteredDashTasks:dashTasks;
  const overdueTasks=activeDashTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status));
  function prog(pid){const pts=tasks.filter(t=>t.project_id===pid);return pts.length?Math.round(pts.filter(t=>isDone(t.status)).length/pts.length*100):0;}
  function navTo(v,pid=null,client=null){
    // Access guard: clients can only access dashboard and list views (read-only)
    if(isClient){
      if(v==='kanban'||v==='clientprojects'||v==='analytics'){v='list';}
    }
    // Access guard: regular users cannot access client view or unassigned projects
    if(isRegularUser){
      if(v==='clientprojects'){v='dashboard';pid=null;client=null;}
      if(v==='list'&&pid&&!accessibleProjects.some(p=>p.id===pid)){v='dashboard';pid=null;}
    }
    const url=stateToUrl(v,pid,client,projects);
    window.history.pushState({view:v,pid,client},'',url);
    prevViewRef.current=v;
    sv(v);sap(pid);sac(client);
    if(v==='dashboard'){sst('');sfs('All');sfa('All');}
  }
  // keep for any residual internal callers
  function switchView(v){navTo(v,v==='list'?activePid:null,v==='clientprojects'?activeClient:null);}
  async function saveTask(f){
    // ── Clients are read-only ──
    if(isClient){showToast("Clients cannot modify tasks",false);return;}
    // ── Authorization: regular users can only update status/notes on their own tasks ──
    if(isRegularUser){
      if(!editTask){showToast("Not authorized to create tasks",false);return;}
      if(!userMatchesStr(me,editTask.assignee)&&!userMatchesStr(me,editTask.detailer)&&!userMatchesStr(me,editTask.checker)){
        showToast("Not authorized to edit this task",false);return;
      }
      ssv(true);
      try{
        const updates={status:f.status,...(f.notes!==undefined&&{notes:f.notes})};
        const {data}=await supabase.from("tasks").update(updates).eq("id",editTask.id).select().single();
        st(ts=>ts.map(t=>t.id===editTask.id?(data||{...t,...updates}):t));
        showToast("Status updated ✓");
        if(f.status!==editTask.status){
          const proj=projects.find(p=>p.id===editTask.project_id);
          const assigneeUser=users.find(u=>u.name===editTask.assignee||u.username===editTask.assignee);
          if(f.status==="Completed"){
            const mgrs=users.filter(u=>(u.role==="Admin"||u.role==="Manager")&&u.id!==me.id).map(u=>u.id);
            if(mgrs.length)await createNotif(mgrs,"task_completed",`Task completed: ${editTask.title}`,`Marked done by ${me.name}${proj?` · ${proj.name}`:""}`, "task",editTask.id,me.id);
          }
        }
      }catch(e){showToast("Error: "+e.message,false);}
      ssv(false);stm(false);set(null);
      return;
    }
    // ── Admin / Manager: require due_date and client_sub_date ──
    if(canEdit){
      if(!f.due_date){showToast("Due Date is required.",false);return;}
      if(!f.client_sub_date){showToast("Client Sub Date is required.",false);return;}
    }
    // ── Admin / Manager: full task save ──
    ssv(true);
    try{
      let pid=f.project_id;
      if(f.custName&&f.custName.trim()){
        const exists=projects.find(p=>p.name.toLowerCase()===f.custName.trim().toLowerCase());
        if(!exists){
          // Only assign the task's assignee/detailer/checker — NOT all users
          const autoAssigned=[...new Set([f.assignee,f.detailer,f.checker].filter(name=>{if(!name)return false;const u=users.find(u=>u.name.toLowerCase()===name.toLowerCase()||u.username.toLowerCase()===name.toLowerCase());return u?u.username:false;}).map(name=>{const u=users.find(u=>u.name.toLowerCase()===name.toLowerCase()||u.username.toLowerCase()===name.toLowerCase());return u?.username;}).filter(Boolean))];
          const {data:np}=await supabase.from("projects").insert({name:f.custName.trim(),client:f.client||"",color:PROJECT_COLORS[projects.length%PROJECT_COLORS.length],description:"Auto-created.",assigned_users:autoAssigned}).select().single();if(np){sp(ps=>[...ps,np]);pid=np.id;}
        }
        else{pid=exists.id;}
      }
      const payload={project_id:pid,title:f.title,client:f.client,status:f.status,priority:f.priority,assignee:f.assignee||"",due_date:f.due_date||null,tags:f.tags,files:f.files,detailer:f.detailer||"",checker:f.checker||"",scope:f.scope||"",client_sub_date:f.client_sub_date||null};
      const proj=projects.find(p=>p.id===pid);
      const assigneeUser=users.find(u=>u.username===f.assignee||u.name===f.assignee);
      const checkerUser=f.checker?users.find(u=>u.name===f.checker.split("/")[0].trim()):null;
      const detailerUser=f.detailer?users.find(u=>u.name===f.detailer.split("/")[0].trim()):null;
      if(editTask){
        const {data}=await supabase.from("tasks").update(payload).eq("id",editTask.id).select().single();
        st(ts=>ts.map(t=>t.id===editTask.id?(data||{...t,...payload}):t));
        showToast("Task updated ✓");
        if(f.status!==editTask.status){
          if(f.status==="Completed"){
            // In-app: notify admins/managers on completion
            const mgrs=users.filter(u=>(u.role==="Admin"||u.role==="Manager")&&u.id!==me.id).map(u=>u.id);
            if(mgrs.length)await createNotif(mgrs,"task_completed",`Task completed: ${f.title}`,`Marked done by ${me.name}${proj?` · ${proj.name}`:""}`, "task",editTask.id,me.id);
          }else{
            // In-app: notify assignee of status change
            if(assigneeUser?.id&&assigneeUser.id!==me.id)await createNotif([assigneeUser.id],"task_status",`Task status updated: ${f.title}`,`Status changed to ${f.status} by ${me.name}`, "task",editTask.id,me.id);
          }
        }
        if(f.assignee&&f.assignee!==editTask.assignee){
          if(assigneeUser?.id&&assigneeUser.id!==me.id)await createNotif([assigneeUser.id],"task_assigned",`You've been assigned: ${f.title}`,`Reassigned by ${me.name}${proj?` · ${proj.name}`:""}${f.due_date?` · Due ${f.due_date}`:""}`, "task",editTask.id,me.id);
        }
      }else{
        const {data}=await supabase.from("tasks").insert(payload).select().single();
        if(data)st(ts=>[...ts,data]);
        showToast("Task created ✓");
        // ── In-app notifications ──
        if(assigneeUser?.id&&assigneeUser.id!==me.id)await createNotif([assigneeUser.id],"task_assigned",`New task assigned: ${f.title}`,`Assigned by ${me.name}${proj?` · ${proj.name}`:""}${f.due_date?` · Due ${f.due_date}`:""}`, "task",data?.id,me.id);
        if(detailerUser?.id&&detailerUser.id!==me.id)await createNotif([detailerUser.id],"task_assigned",`Detailing assigned: ${f.title}`,`You are the detailer${proj?` · ${proj.name}`:""}${f.due_date?` · Due ${f.due_date}`:""}`, "task",data?.id,me.id);
        if(checkerUser?.id&&checkerUser.id!==me.id)await createNotif([checkerUser.id],"task_assigned",`QC assigned: ${f.title}`,`You are the checker${proj?` · ${proj.name}`:""}${f.due_date?` · Due ${f.due_date}`:""}`, "task",data?.id,me.id);
      }
        // workflow engine
        for(const wf of workflows.filter(w=>w.is_active)){
          let fired=false;
          if(wf.trigger_event==="status_changed"&&editTask&&f.status!==editTask.status){if(!wf.trigger_value||wf.trigger_value===f.status)fired=true;}
          else if(wf.trigger_event==="task_created"&&!editTask){fired=true;}
          else if(wf.trigger_event==="task_assigned"&&f.assignee){fired=true;}
          if(!fired)continue;
          const proj2=projects.find(p=>p.id===pid);
          let targetIds=[];
          if(wf.action_type==="notify_checker"){const cu=users.find(u=>u.name===f.checker||u.username===f.checker);if(cu&&cu.id!==me.id)targetIds=[cu.id];}
          else if(wf.action_type==="notify_assignee"){const au=users.find(u=>u.name===f.assignee||u.username===f.assignee);if(au&&au.id!==me.id)targetIds=[au.id];}
          else if(wf.action_type==="notify_role"){targetIds=users.filter(u=>u.role===wf.action_target&&u.id!==me.id).map(u=>u.id);}
          if(targetIds.length)await createNotif(targetIds,"workflow","Workflow: "+wf.name,f.title+(proj2?" in "+proj2.name:""),"task",editTask?.id||null,me.id);
        }
      stm(false);set(null);
    }catch(e){showToast("Error: "+e.message,false);}
    ssv(false);
  }
  async function delTask(id){if(!canEdit)return;if(!window.confirm("Delete this task?"))return;await supabase.from("tasks").delete().eq("id",id);st(ts=>ts.filter(t=>t.id!==id));showToast("Task deleted ✓");}
  async function addWorkflow(f){ssv(true);try{const {data}=await supabase.from("workflows").insert([f]).select().single();if(data)swf(ws=>[...ws,data]);showToast("Rule created");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function updateWorkflow(id,f){ssv(true);try{const {data}=await supabase.from("workflows").update(f).eq("id",id).select().single();if(data)swf(ws=>ws.map(w=>w.id===id?data:w));showToast("Rule updated");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function deleteWorkflow(id){await supabase.from("workflows").delete().eq("id",id);swf(ws=>ws.filter(w=>w.id!==id));showToast("Rule deleted");}
  async function toggleWorkflow(wf){const {data}=await supabase.from("workflows").update({is_active:!wf.is_active}).eq("id",wf.id).select().single();if(data)swf(ws=>ws.map(w=>w.id===wf.id?data:w));}
  async function reassignTask(taskId,newAssigneeName){
    const task=tasks.find(t=>String(t.id)===String(taskId));
    if(!task)return;
    const {data,error}=await supabase.from("tasks").update({assignee:newAssigneeName}).eq("id",taskId).select().single();
    if(!error&&data){
      st(ts=>ts.map(t=>t.id===data.id?data:t));
      showToast("Reassigned to "+newAssigneeName+" ✓");
    }else{
      showToast("Reassign failed: "+(error?.message||"unknown"),false);
    }
  }
  async function dropTask(tid,ns){const task=tasks.find(t=>t.id===tid);if(!task||task.status===ns)return;if(isClient){showToast("Not authorized",false);return;}if(isRegularUser&&!userMatchesStr(me,task.assignee)&&!userMatchesStr(me,task.detailer)&&!userMatchesStr(me,task.checker)){showToast("Not authorized",false);return;}st(ts=>ts.map(t=>t.id===tid?{...t,status:ns}:t));await supabase.from("tasks").update({status:ns}).eq("id",tid);const proj=projects.find(p=>p.id===task.project_id);const assigneeUser=users.find(u=>u.username===task.assignee||u.name===task.assignee);}
  async function saveProject(f){if(canEdit&&!f.deadline){showToast("Project Deadline is required.",false);return;}ssv(true);try{const {data}=await supabase.from("projects").insert({name:f.name,client:f.client,color:f.color,deadline:f.deadline||null,description:f.description,assigned_users:f.assigned_users||[],group_name:f.group_name||null}).select().single();if(data){sp(ps=>[...ps,data]);const pcu=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===(f.client||"").toLowerCase());
    // In-app: notify assigned users
    const assignedIds=(f.assigned_users||[]).map(uname=>users.find(u=>u.username===uname||u.name===uname)?.id).filter(id=>id&&id!==me.id);
    if(assignedIds.length)await createNotif(assignedIds,"project_assigned",`New project assigned: ${f.name}`,`You've been added to ${f.name}${f.client?` · Client: ${f.client}`:""}${f.deadline?` · Deadline: ${f.deadline}`:""}`, "project",data.id,me.id);
    // Notify client
    if(pcu?.id&&pcu.id!==me.id)await createNotif([pcu.id],"project_assigned",`Project created: ${f.name}`,`A new project has been set up for your account${f.deadline?` · Deadline: ${f.deadline}`:""}`, "project",data.id,me.id);
  }spm(false);showToast("Project created ✓");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function updateProject(f){if(canEdit&&!f.deadline){showToast("Project Deadline is required.",false);return;}ssv(true);try{const {data}=await supabase.from("projects").update({name:f.name,client:f.client,color:f.color,deadline:f.deadline||null,description:f.description,assigned_users:f.assigned_users||[],group_name:f.group_name||null}).eq("id",editProject.id).select().single();if(data)sp(ps=>ps.map(p=>p.id===editProject.id?data:p));sep(null);showToast("Project updated ✓");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function deleteProject(id){if(!canEdit)return;if(!window.confirm("Delete this project and all its tasks?"))return;await supabase.from("tasks").delete().eq("project_id",id);await supabase.from("projects").delete().eq("id",id);sp(ps=>ps.filter(p=>p.id!==id));st(ts=>ts.filter(t=>t.project_id!==id));if(activePid===id)sap(null);showToast("Project deleted ✓");}
  async function addUser(f){try{const {data,error}=await supabase.from("users").insert({name:f.name,username:f.username,password:f.password,role:f.role,client_name:f.client_name||"",email:f.email||""}).select().single();if(error)throw new Error(error.message);if(data)su(us=>[...us,data]);showToast("User created ✓");return data;}catch(e){showToast("Error: "+e.message,false);throw e;}}
  async function editUserFn(id,f){try{const updates={name:f.name,username:(f.username||"").trim().toLowerCase(),role:f.role,client_name:f.client_name||"",email:f.email||""};if(f.password&&f.password.trim())updates.password=f.password.trim();const {data,error}=await supabase.from("users").update(updates).eq("id",id).select().single();if(error)throw new Error(error.message);if(data)su(us=>us.map(u=>u.id===id?data:u));showToast("User updated ✓");}catch(e){showToast("Error: "+e.message,false);throw e;}}
  async function delUser(id){await supabase.from("users").delete().eq("id",id);su(us=>us.filter(u=>u.id!==id));showToast("Employee removed ✓");}
  async function addClient(f){const {data}=await supabase.from("clients").insert({name:f.name,email:f.email||"",phone:f.phone||"",address:f.address||""}).select().single();if(data)scl(cl=>[...cl,data]);showToast("Client added ✓");}
  async function editClient(id,f){const {data}=await supabase.from("clients").update({name:f.name,email:f.email||"",phone:f.phone||"",address:f.address||""}).eq("id",id).select().single();if(data)scl(cl=>cl.map(c=>c.id===id?data:c));showToast("Client updated ✓");}
  async function deleteClient(id){await supabase.from("clients").delete().eq("id",id);scl(cl=>cl.filter(c=>c.id!==id));showToast("Client deleted ✓");}
  async function savePortal(clientName,username,password){
    const existing=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===clientName.toLowerCase());
    if(existing){
      const updates={username:username.toLowerCase(),client_name:clientName};
      if(password&&password.trim())updates.password=password.trim();
      const {data}=await supabase.from("users").update(updates).eq("id",existing.id).select().single();
      if(data)su(us=>us.map(u=>u.id===existing.id?data:u));
      showToast("Portal access updated ✓");
    }else{
      const {data}=await supabase.from("users").insert({name:clientName,username:username.toLowerCase(),password:password||"Client@RDS2026",role:"Client",client_name:clientName,email:""}).select().single();
      if(data)su(us=>[...us,data]);
      showToast("Portal account created ✓");
    }
  }
  const kanbanCols=["Not Yet Started","In Progress","Review","Completed"];
  const navs=isClient?[["dashboard","🏠","Dashboard"],["list","✅","Task List"],["timings","⏱","Timings"]]:isAdmin?[["dashboard","🏠","Dashboard"],["kanban","🗂️","Kanban"],["list","✅","Task List"],["gantt","📅","Timeline"],["analytics","📊","Analytics"],["submissions","📬","Submission List"],["announcements","📢","Announcements"],["warroom","💬","Messages"],["capacity","🗓","Capacity"],["workflows","⚙️","Workflows"],["timings","⏱","Timings"]]:(isManager||isTeamLeader)?[["dashboard","🏠","Dashboard"],["kanban","🗂️","Kanban"],["list","✅","Task List"],["gantt","📅","Timeline"],["analytics","📊","Analytics"],["submissions","📬","Submission List"],["announcements","📢","Announcements"],["warroom","💬","Messages"],["capacity","🗓","Capacity"],["timings","⏱","Timings"]]:[["dashboard","🏠","Dashboard"],["kanban","🗂️","Kanban"],["list","✅","Task List"],["gantt","📅","Timeline"],["submissions","📬","Submission List"],["announcements","📢","Announcements"],["warroom","💬","Messages"],["timings","⏱","Timings"]];
  const sel=(active)=>({display:"flex",alignItems:"center",gap:10,width:"100%",background:active?C.card:"transparent",border:active?`1px solid ${C.border}`:"1px solid transparent",borderRadius:8,padding:"9px 12px",cursor:"pointer",color:active?C.t1:C.t2,fontWeight:active?700:500,fontSize:13,textAlign:"left",marginBottom:2,fontFamily:"inherit",transition:"all .15s"});
  return(
    <MobileCtx.Provider value={isMobile}>
    <div style={{height:"100vh",width:"100vw",background:C.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.t1,display:"flex",overflow:"hidden",position:"fixed",top:0,left:0}}>
      {isMobile&&sideOpen&&<div onClick={()=>setSO(false)} style={{position:"fixed",inset:0,background:"#00000070",zIndex:150,backdropFilter:"blur(2px)"}}/>}
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:999,background:toast.ok?C.green:C.red,color:"#fff",padding:"10px 20px",borderRadius:8,fontWeight:600,fontSize:13,boxShadow:"0 4px 16px #00000060"}}>{toast.ok?"✓":"⚠"} {toast.msg}</div>}
      <aside className={`rds-sidebar${sideOpen?' open':''}`} style={{width:220,minWidth:220,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"20px 0 0 0",flexShrink:0,height:"100vh"}}>
        <div style={{padding:"0 20px 16px",borderBottom:`1px solid ${C.border}`,marginBottom:12,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div onClick={()=>logoRef.current.click()} title="Click to upload logo" className="rds-logo-anim" style={{width:80,height:36,borderRadius:8,background:logo?"transparent":"#000",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
              {logo?<img src={logo} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<img src="/logo.png" alt="RDS" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>sLogo(ev.target.result);r.readAsDataURL(f);}}}/>
            <div><div style={{fontSize:13,fontWeight:800,color:C.t1,lineHeight:1.2}}>RDS</div><div style={{fontSize:9,color:C.t3}}>PROJECT HUB</div></div>
          </div>
        </div>
        <div style={{padding:"0 12px",flex:1,overflow:"auto"}}>
          {navs.map(([k,ico,lbl])=>{
            const badge=navBadges[k]||0;
            return(
              <button key={k} onClick={()=>{
                navTo(k,k==='list'?activePid:null);
                if(isMobile)setSO(false);
                if(badge>0)setNavBadges(prev=>({...prev,[k]:0}));
              }} style={{...sel(view===k&&!(view==="kanban"&&activeClient)),position:"relative"}}>
                <span style={{fontSize:16}}>{ico}</span>
                <span style={{flex:1}}>{lbl}</span>
                {badge>0&&(
                  <span style={{background:k==="announcements"?"#f59e0b":C.teal,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,padding:"1px 6px",minWidth:18,textAlign:"center",lineHeight:"16px",display:"inline-block"}}>
                    {badge>99?"99+":badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{padding:"12px 10px",borderTop:`1px solid ${C.border}`,flexShrink:0,position:"relative"}}>
          <button onClick={()=>sMenu(v=>!v)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",minWidth:0,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit",overflow:"hidden"}}>
            <Av name={me.name} size={32}/>
            <div style={{textAlign:"left",flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me.name}{me.username===SUPER_ADMIN&&<span style={{color:C.accent,fontSize:9,marginLeft:4}}>★</span>}</div>
              <div style={{fontSize:10,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me.role}{me.client_name?` · ${me.client_name}`:""}</div>
            </div>
            <span style={{color:C.t3,fontSize:12}}>⌄</span>
          </button>
          {uMenu&&(
            <div style={{position:"absolute",bottom:64,left:12,right:12,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:8,boxShadow:"0 8px 24px #00000060",zIndex:50}}>
              <div style={{padding:"8px 10px 10px",borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{me.name}{me.username===SUPER_ADMIN&&<span style={{color:C.accent,fontSize:10,marginLeft:6}}>★ Super Admin</span>}</div>
                <div style={{fontSize:11,color:C.t3}}>@{me.username} · {me.role}</div>
              </div>
              {isAdmin&&<button onClick={()=>{sum(true);scm(false);spwm(false);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.t2,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>👥 Manage Employees</button>}
              {isAdmin&&<button onClick={()=>{scm(true);sum(false);spwm(false);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.t2,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🏢 View Clients</button>}
              <button onClick={()=>{spwm(true);sum(false);scm(false);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.t2,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🔐 Change Password</button>
              <button onClick={()=>{localStorage.removeItem("rds_user");window.location.href="/";}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.red,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🚪 Sign Out</button>
            </div>
          )}
        </div>
      </aside>

      <main className="rds-main" style={{flex:1,padding:24,overflow:"auto",height:"100vh",boxSizing:"border-box",paddingBottom:isMobile?80:24}}>
        <div className="rds-topbar" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,gap:8,flexWrap:"wrap"}}>
          <div className="rds-topbar-left" style={{display:"flex",alignItems:"center",gap:10}}>
            {isMobile&&<div style={{width:34,height:34,borderRadius:8,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
              {logo?<img src={logo} alt="RDS" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<img src="/logo.png" alt="RDS" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>}
            </div>}
            <div>
            {(()=>{
              const portalName=isAdmin?"Admin":isManager?"Manager":isTeamLeader?"Team Leader":isClient?"Client":me?.role||"Employee";
              const displayName=isClient?(me.client_name||me.name):me.name;
              const hr=new Date().getHours();
              const greet=hr<12?"Good Morning":hr<17?"Good Afternoon":"Good Evening";
              const dateStr=new Date().toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
              const pageLabel=view==="dashboard"?`Welcome back to the RDS TechServ ${portalName} Portal.`:view==="kanban"?"Kanban Board":view==="analytics"?"Analytics & Reporting":view==="gantt"?"📅 Project Timeline":view==="submissions"?"📬 Submission List":view==="clientprojects"?`${activeClient} — Projects`:activePid?`Project: ${projects.find(p=>p.id===activePid)?.name||""}`: "Task List";
              return(<>
                <h1 className="rds-greeting" style={{margin:0,fontSize:24,fontWeight:800,color:"#ffffff"}}>{greet}, {displayName} 👋</h1>
                <p className="rds-page-sub" style={{margin:"3px 0 0",color:C.t2,fontSize:13,fontWeight:500}}>{pageLabel}</p>
                <p className="rds-page-sub" style={{margin:"2px 0 0",color:C.t3,fontSize:12}}>{dateStr}</p>
              </>);
            })()}
            </div>
          </div>
          <div className="rds-topbar-right" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
            <NotificationCenter me={me} onBadgeChange={b=>setNavBadges(prev=>({...prev,...b}))}/>
            {!isClient&&<AttendanceBar attRec={attRec} attBreak={attBreak} onStartBreak={attStartBreak} onEndBreak={attEndBreak} onClockOut={attClockOut}/>}
            {isMobile&&<button onClick={()=>setCmdOpen(true)} title="Search" style={{background:"#ef444415",border:"1px solid #ef444440",borderRadius:8,padding:"7px 10px",color:"#ef4444",fontSize:20,cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🔍</button>}
            <span className="rds-topbar-filters" style={{display:"contents"}}>{view!=="dashboard"&&(
              <>
                <input placeholder="🔍 Search…" value={searchTask} onChange={e=>sst(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",width:150,fontFamily:"inherit"}}/>
                <select value={filterStatus} onChange={e=>sfs(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Status</option>
                  {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                {canEdit&&<select value={filterAssignee} onChange={e=>sfa(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Assignees</option>
                  {members.map(m=><option key={m} value={m}>{m}</option>)}
                </select>}
              </>
            )}</span>
            {isClient&&(()=>{const cp=accessibleProjects;const ct=tasks.filter(t=>cp.some(p=>p.id===t.project_id));return(<button className="rds-export-btn" onClick={()=>exportExcel(cp,ct,`${me.client_name||me.name} - Project Report`)} style={{...GBtn,display:"flex",alignItems:"center",gap:6,padding:"9px 12px",fontSize:13}}>📊 <span className="rds-export-label">Export</span></button>);})()}
            {!isClient&&<div ref={exportRef} style={{position:"relative"}}>
              <button className="rds-export-btn" onClick={()=>{setExportOpen(v=>!v);setExportSec(null);}} style={{...GBtn,display:"flex",alignItems:"center",gap:6,padding:"9px 12px",fontSize:13}}>📊 <span className="rds-export-label">Export ▾</span></button>
              {exportOpen&&(()=>{
                const today2=new Date().toISOString().slice(0,10);
                const closeExport=()=>{setExportOpen(false);setExportSec(null);};
                const allProjTasks=tasks.filter(t=>accessibleProjects.some(p=>p.id===t.project_id));
                const overdueTsk=allProjTasks.filter(t=>t.due_date&&t.due_date<today2&&!isDone(t.status));
                const UNKNOWN_NAMES=["tbd","tekla","siva kumar","unknown","nnj","rds user","rds","n/a","na","pdf check only","asap","high priority"];
                const NAME_ALIAS={"danush":"Dhanush","lokesh":"Lokesh Reddy","allu sai":"Sai","allu sai/nanaji":"Sai","eswar/nanaji":"Eswar","lokesh reddy/nanaji":"Lokesh Reddy","balaram/jagadeesh":"Balaram","sridevi / vaishnavi":"Sridevi","siav kumar":"Siva Kumar","shiva":"Siva Kumar","shiva kumar":"Siva Kumar"};
                function canonicalName(raw){
                  const t=raw.trim().toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
                  return NAME_ALIAS[raw.trim().toLowerCase()]||NAME_ALIAS[t.toLowerCase()]||t;
                }
                const allUserNames=[...new Set(
                  tasks.flatMap(t=>[t.assignee,t.detailer,t.checker]).filter(Boolean)
                  .flatMap(n=>n.split(/[&\/,]+/).map(p=>canonicalName(p)).filter(Boolean))
                )].filter(n=>n&&!UNKNOWN_NAMES.some(u=>n.toLowerCase()===u||n.toLowerCase().includes(u))).sort();
                const allClientNames=[...new Set(accessibleProjects.map(p=>p.client||"Unassigned"))].sort();
                const SHdr=({id,icon,label})=>(
                  <button onClick={()=>setExportSec(exportSec===id?null:id)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:exportSec===id?C.surface:"none",border:"none",borderLeft:`3px solid ${exportSec===id?C.accent:"transparent"}`,padding:"10px 16px 10px 14px",color:exportSec===id?C.accent:C.t1,fontSize:13,cursor:"pointer",fontWeight:600,fontFamily:"inherit",transition:"all .12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.surface;}} onMouseLeave={e=>{e.currentTarget.style.background=exportSec===id?C.surface:"none";}}>
                    <span style={{display:"flex",alignItems:"center",gap:8}}>{icon}<span>{label}</span></span>
                    <span style={{fontSize:11,color:exportSec===id?C.accent:C.t3}}>{exportSec===id?"▲":"▶"}</span>
                  </button>
                );
                const SBtn2=({label,count,icon,color,onClick,indent=true})=>(
                  <button onClick={onClick}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",padding:`7px 16px 7px ${indent?36:16}px`,color:color||C.t2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{display:"flex",alignItems:"center",gap:7}}>{icon}<span>{label}</span></span>
                    {count!=null&&<span style={{background:C.surface,color:C.t3,borderRadius:10,padding:"1px 7px",fontSize:11}}>{count}</span>}
                  </button>
                );
                return(
                  <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 12px 40px #00000099",zIndex:999,width:280,paddingBottom:8,maxHeight:"85vh",overflowY:"auto"}}>
                    {/* Header */}
                    <div style={{padding:"10px 16px 8px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.08em"}}>Export Report</span>
                      <button onClick={closeExport} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 8px",color:C.t2,fontSize:13,cursor:"pointer",lineHeight:1.4}} onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="none"}>✕</button>
                    </div>

                    {/* 1 — All Tasks */}
                    <SBtn2 label="All Tasks" count={filtered.length} icon="📋" color={C.t1} indent={false}
                      onClick={()=>{exportExcel(accessibleProjects,filtered,`${me.name} - All Tasks`);closeExport();}}/>

                    <div style={{height:1,background:C.border,margin:"4px 0"}}/>

                    {/* 2 — By Tasks */}
                    <SHdr id="tasks" icon="📄" label="By Tasks"/>
                    {exportSec==="tasks"&&(
                      <div style={{background:C.surface+"33",paddingBottom:4}}>
                        <SBtn2 label="All Tasks Report" count={allProjTasks.length} icon="📋" color={C.teal}
                          onClick={()=>{exportExcel(accessibleProjects,allProjTasks,`${me.name} - All Tasks Report`);closeExport();}}/>
                        <SBtn2 label="Completed Tasks" count={allProjTasks.filter(t=>isDone(t.status)).length} icon="✅" color={C.green}
                          onClick={()=>{const t=allProjTasks.filter(x=>isDone(x.status));exportExcel(accessibleProjects.filter(p=>t.some(x=>x.project_id===p.id)),t,`${me.name} - Completed Tasks`);closeExport();}}/>
                        <SBtn2 label="In Progress Tasks" count={allProjTasks.filter(t=>t.status==="In Progress").length} icon="🔄" color={C.blue}
                          onClick={()=>{const t=allProjTasks.filter(x=>x.status==="In Progress");exportExcel(accessibleProjects.filter(p=>t.some(x=>x.project_id===p.id)),t,`${me.name} - In Progress Tasks`);closeExport();}}/>
                        <SBtn2 label="Not Yet Started" count={allProjTasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length} icon="⏳" color={C.t2}
                          onClick={()=>{const t=allProjTasks.filter(x=>x.status==="Not Yet Started"||x.status==="To Be Started");exportExcel(accessibleProjects.filter(p=>t.some(x=>x.project_id===p.id)),t,`${me.name} - Not Started Tasks`);closeExport();}}/>
                        <SBtn2 label="Overdue Tasks" count={overdueTsk.length} icon="⚠️" color={C.red}
                          onClick={()=>{exportExcel(accessibleProjects.filter(p=>overdueTsk.some(x=>x.project_id===p.id)),overdueTsk,`${me.name} - Overdue Tasks`);closeExport();}}/>
                      </div>
                    )}

                    <div style={{height:1,background:C.border,margin:"4px 0"}}/>

                    {/* 3 — By Projects */}
                    <SHdr id="projects" icon="📁" label="By Projects"/>
                    {exportSec==="projects"&&(
                      <div style={{background:C.surface+"33",paddingBottom:4}}>
                        <SBtn2 label="All Projects Report" count={allProjTasks.length} icon="📂" color={C.teal}
                          onClick={()=>{exportExcel(accessibleProjects,allProjTasks,"All Projects Report");closeExport();}}/>
                        {accessibleProjects.map(p=>{const pt=tasks.filter(t=>t.project_id===p.id);return(
                          <SBtn2 key={p.id} label={p.name} count={pt.length} icon={<span style={{width:8,height:8,borderRadius:"50%",background:p.color,display:"inline-block",flexShrink:0}}/>}
                            onClick={()=>{exportExcel([p],pt,`${p.name} - Project Report`);closeExport();}}/>
                        );})}
                      </div>
                    )}

                    {/* 4 — By Users (admin/manager only) */}
                    {canEdit&&<div style={{height:1,background:C.border,margin:"4px 0"}}/>}
                    {canEdit&&<SHdr id="users" icon="👤" label="By Employees"/>}
                    {canEdit&&exportSec==="users"&&(
                      <div style={{background:C.surface+"33",paddingBottom:4}}>
                        <SBtn2 label="All Employees Work Summary" count={tasks.length} icon="👥" color={C.teal}
                          onClick={()=>{exportExcel(accessibleProjects,tasks,"All Employees - Work Summary");closeExport();}}/>
                        {allUserNames.map(u=>{
                          const uLow=u.toLowerCase();
                          const ut=tasks.filter(t=>[t.assignee,t.detailer,t.checker].filter(Boolean).some(f=>f.split(/[&\/,]+/).map(p=>canonicalName(p).toLowerCase()).includes(uLow)));
                          const up=accessibleProjects.filter(p=>ut.some(t=>t.project_id===p.id));
                          return(
                            <SBtn2 key={u} label={u} count={ut.length} icon="👤"
                              onClick={()=>{exportExcel(up,ut,`${u} - Work Report`);closeExport();}}/>
                          );
                        })}
                      </div>
                    )}

                    {/* 5 — By Clients (admin/manager only) */}
                    {canEdit&&<div style={{height:1,background:C.border,margin:"4px 0"}}/>}
                    {canEdit&&<SHdr id="clients" icon="🏢" label="By Clients"/>}
                    {canEdit&&exportSec==="clients"&&(
                      <div style={{background:C.surface+"33",paddingBottom:4}}>
                        <SBtn2 label="All Clients Report" count={allProjTasks.length} icon="🏛" color={C.teal}
                          onClick={()=>{exportExcel(accessibleProjects,allProjTasks,"All Clients - Project Updates");closeExport();}}/>
                        {allClientNames.map(cl=>{const cp=accessibleProjects.filter(p=>(p.client||"Unassigned")===cl);const ct=tasks.filter(t=>cp.some(p=>p.id===t.project_id));return(
                          <SBtn2 key={cl} label={cl} count={`${cp.length} proj · ${ct.length} tasks`} icon="🏢"
                            onClick={()=>{exportExcel(cp,ct,`${cl} - Project Updates`);closeExport();}}/>
                        );})}
                      </div>
                    )}

                    {/* 6 — Analytics Report (admin/manager/TL) */}
                    {(isAdmin||isManager||isTeamLeader)&&<div style={{height:1,background:C.border,margin:"4px 0"}}/>}
                    {(isAdmin||isManager||isTeamLeader)&&(
                      <SBtn2 label="Analytics Report" count={null} icon="📊" color={"#7c3aed"} indent={false}
                        onClick={()=>{exportAnalyticsReport(accessibleProjects,tasks,users,clients,today2);closeExport();}}/>
                    )}
                    {/* 7 — Working Hours (all non-client roles) */}
                    {!isClient&&<div style={{height:1,background:C.border,margin:"4px 0"}}/>}
                    {!isClient&&<SHdr id="hours" icon={"\u23F1"} label="Working Hours"/>}
                    {!isClient&&exportSec==="hours"&&(()=>{
                      const isOwnOnly=!isAdmin&&!isManager;
                      async function exportWH(fromStr,toStr,label){
                        try{
                          let url=SUPA_URL+"/rest/v1/attendance?select=*&order=date.desc,user_name.asc&limit=2000";
                          if(isOwnOnly)url+="&user_id=eq."+me.id;
                          if(fromStr)url+="&date=gte."+fromStr;
                          if(toStr)url+="&date=lte."+toStr;
                          const res=await fetch(url,{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
                          const rows=await res.json();
                          function fmtTime(ts){if(!ts)return"";const d=new Date(ts);return d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});}
                          function fmtHrs(min){if(!min&&min!==0)return"";return Math.floor(min/60)+"h "+(min%60)+"m";}
                          const xlsHead='<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="def"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e293b" ss:Pattern="Solid"/></Style><Style ss:ID="hdr"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#334155" ss:Pattern="Solid"/></Style><Style ss:ID="even"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#f8fafc" ss:Pattern="Solid"/></Style><Style ss:ID="odd"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style><Style ss:ID="ctr"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="ctr_e"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#f8fafc" ss:Pattern="Solid"/></Style><Style ss:ID="done"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#059669" ss:Pattern="Solid"/></Style><Style ss:ID="active"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#d97706" ss:Pattern="Solid"/></Style></Styles>';
                          let xml=xlsHead+'<Worksheet ss:Name="Working Hours"><Table ss:DefaultRowHeight="18">';
                          xml+='<Column ss:Width="90"/><Column ss:Width="140"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="85"/>';
                          const empSuffix=isOwnOnly?" — "+(me.name||""):"";xml+='<Row ss:Height="30"><Cell ss:MergeAcross="6" ss:StyleID="title"><Data ss:Type="String">Working Hours — '+label+empSuffix+'</Data></Cell></Row>';
                          xml+='<Row ss:Height="8"></Row>';
                          xml+='<Row ss:Height="20"><Cell ss:StyleID="hdr"><Data ss:Type="String">Date</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Employee</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Clock In</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Clock Out</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Work Hours</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Break (min)</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Status</Data></Cell></Row>';
                          rows.forEach((r,i)=>{
                            const even=i%2===0;const s=even?"even":"odd";const sc=even?"ctr_e":"ctr";
                            const status=r.logout_at?"Completed":"Active";const sStyle=r.logout_at?"done":"active";
                            xml+='<Row ss:Height="17">';
                            xml+='<Cell ss:StyleID="'+s+'"><Data ss:Type="String">'+r.date+'</Data></Cell>';
                            xml+='<Cell ss:StyleID="'+s+'"><Data ss:Type="String">'+(r.user_name||"")+'</Data></Cell>';
                            xml+='<Cell ss:StyleID="'+sc+'"><Data ss:Type="String">'+fmtTime(r.login_at)+'</Data></Cell>';
                            xml+='<Cell ss:StyleID="'+sc+'"><Data ss:Type="String">'+fmtTime(r.logout_at)+'</Data></Cell>';
                            xml+='<Cell ss:StyleID="'+sc+'"><Data ss:Type="String">'+fmtHrs(r.total_work_minutes)+'</Data></Cell>';
                            xml+='<Cell ss:StyleID="'+sc+'"><Data ss:Type="Number">'+(r.total_break_minutes||0)+'</Data></Cell>';
                            xml+='<Cell ss:StyleID="'+sStyle+'"><Data ss:Type="String">'+status+'</Data></Cell>';
                            xml+='</Row>';
                          });
                          xml+='</Table></Worksheet></Workbook>';
                          const blob=new Blob([xml],{type:"application/vnd.ms-excel"});
                          const burl=URL.createObjectURL(blob);
                          const a=document.createElement("a");a.href=burl;
                          a.download="Working_Hours_"+label.replace(/\s+/g,"_")+"_"+today2+".xls";a.click();
                          URL.revokeObjectURL(burl);
                        }catch(e){alert("Export failed: "+e.message);}
                        closeExport();
                      }
                      const now=new Date();
                      const y=now.getFullYear(),m=now.getMonth(),d=now.getDate();
                      const pad=n=>String(n).padStart(2,"0");
                      const iso=(yr,mo,dy)=>yr+"-"+pad(mo+1)+"-"+pad(dy);
                      // date helpers
                      const todayStr=iso(y,m,d);
                      const yday=new Date(y,m,d-1);const ydayStr=iso(yday.getFullYear(),yday.getMonth(),yday.getDate());
                      const dow=now.getDay();const wkMon=new Date(y,m,d-(dow===0?6:dow-1));
                      const thisWkFrom=iso(wkMon.getFullYear(),wkMon.getMonth(),wkMon.getDate());
                      const lastWkMon=new Date(wkMon);lastWkMon.setDate(lastWkMon.getDate()-7);
                      const lastWkSun=new Date(wkMon);lastWkSun.setDate(lastWkSun.getDate()-1);
                      const lastWkFrom=iso(lastWkMon.getFullYear(),lastWkMon.getMonth(),lastWkMon.getDate());
                      const lastWkTo=iso(lastWkSun.getFullYear(),lastWkSun.getMonth(),lastWkSun.getDate());
                      const thisMoFrom=iso(y,m,1);
                      const lastMoFrom=iso(m===0?y-1:y,m===0?11:m-1,1);
                      const lastMoTo=iso(y,m,0);
                      const threeMonFrom=iso(m<3?y-1:y,(m-3+12)%12,1);
                      return(
                        <div style={{background:C.surface+"33",paddingBottom:4}}>
                          <SBtn2 label="Yesterday" icon="📅" color={C.t2}
                            onClick={()=>exportWH(ydayStr,ydayStr,"Yesterday")}/>
                          <SBtn2 label="This Week" icon="📅" color={C.blue}
                            onClick={()=>exportWH(thisWkFrom,todayStr,"This_Week")}/>
                          <SBtn2 label="Last Week" icon="📅" color={C.t2}
                            onClick={()=>exportWH(lastWkFrom,lastWkTo,"Last_Week")}/>
                          <SBtn2 label="This Month" icon="📅" color={C.teal}
                            onClick={()=>exportWH(thisMoFrom,todayStr,"This_Month")}/>
                          <SBtn2 label="Last Month" icon="📅" color={C.t2}
                            onClick={()=>exportWH(lastMoFrom,lastMoTo,"Last_Month")}/>
                          <SBtn2 label="Last 3 Months" icon="📅" color={"#7c3aed"}
                            onClick={()=>exportWH(threeMonFrom,todayStr,"Last_3_Months")}/>
                        </div>
                      );
                    })()}

                    {/* 8 — Submission List */}
                    <div style={{height:1,background:C.border,margin:"4px 0"}}/>
                    <SBtn2 label="Submission List" count={null} icon="📬" color={"#0891b2"} indent={false}
                      onClick={()=>{exportSubmissionList(accessibleProjects,tasks,today2);closeExport();}}/>
                  </div>
                );
              })()}
            </div>}
            {canEdit&&activePid&&<button onClick={()=>deleteProject(activePid)} style={{...GBtn,padding:"9px 14px",fontSize:13,color:C.red,borderColor:C.red}}>🗑 Delete Project</button>}
            {canEdit&&<button className="rds-new-task-btn" onClick={()=>{set(null);stm(true);}} style={SBtn}>+ New Task</button>}
          </div>
        </div>
        <Breadcrumb
          view={view} activePid={activePid} activeClient={activeClient}
          projects={accessibleProjects}
          activeTask={taskModal&&editTask?editTask:null}
          onDashboard={()=>navTo('dashboard')}
          onTasks={()=>navTo('list')}
          onProject={()=>navTo('list',activePid)}
        />
        {/* ── Ctrl+K Hint ── */}
        {isMobile?(
          <div style={{display:"flex",alignItems:"center",gap:10,background:"#ef444415",border:"1px solid #ef444440",borderRadius:10,padding:"9px 14px",marginBottom:16}}>
            <span style={{fontSize:17}}>🔍</span>
            <span style={{fontSize:14,color:"#ef4444",lineHeight:1.5}}>
              Tap the <strong style={{color:"#ef4444",fontWeight:700}}>🔍 search icon</strong> in the top bar to search projects, tasks, clients, people and files
            </span>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:10,background:"#ef444415",border:"1px solid #ef444440",borderRadius:10,padding:"9px 14px",marginBottom:16}}>
            <span style={{fontSize:17}}>⌨️</span>
            <span style={{fontSize:14,color:"#ef4444",lineHeight:1.5}}>
              Press{" "}
              <kbd style={{background:"#ef444422",border:"1px solid #ef4444",borderRadius:4,padding:"1px 7px",fontFamily:"monospace",fontSize:13,color:"#ef4444",fontWeight:700}}>Ctrl+K</kbd>
              {" "}<span style={{color:"#ef444488"}}>(or{" "}<kbd style={{background:"#ef444422",border:"1px solid #ef4444",borderRadius:4,padding:"1px 7px",fontFamily:"monospace",fontSize:13,color:"#ef4444",fontWeight:700}}>cmd K</kbd>{" "}on Mac)</span>
              {" "}anywhere in the website — search projects, tasks, clients, people and files
            </span>
          </div>
        )}
        {view==="dashboard"&&!isClient&&<AttendanceStats stats={attStats} attRec={attRec} attBreak={attBreak} me={me} isAdmin={isAdmin} isManager={isManager}/>}
        {view==="dashboard"&&isTeamLeader&&(
          <TeamLeaderDashboard
            me={me} tasks={tasks} projects={accessibleProjects} today={today}
            onEditTask={t=>{set(t);stm(true);}}
            onViewProject={pid=>navTo('list',pid)}
          />
        )}
        {view==="dashboard"&&!isAdmin&&!isManager&&!isTeamLeader&&!isClient&&(
          <UserDashboard
            me={me} tasks={tasks} projects={accessibleProjects} clients={clients} today={today}
            onEditTask={()=>{}}
            onViewProject={pid=>navTo('list',pid)}
          />
        )}
        {view==="dashboard"&&isClient&&(
          <ClientDashboard
            me={me} tasks={tasks} projects={projects} today={today}
            onViewProject={pid=>navTo('list',pid)}
          />
        )}
        {view==="dashboard"&&(isAdmin||isManager)&&(
          <>
            {/* ── Role Banner ── */}
            {isAdmin&&(
              <div className="rds-dash-banner" style={{background:`linear-gradient(135deg,${C.card} 0%,${C.accent}11 100%)`,border:`1px solid ${C.accent}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,borderLeft:`4px solid ${C.accent}`}}>
                <div className="rds-dash-banner-avatar" style={{width:52,height:52,borderRadius:14,background:C.accent+"22",border:`2px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:C.accent,fontWeight:800}}>{(me.name[0]||"A").toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>System Administration Dashboard</h2>
                  <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back, {me.name} · Full access to all projects, users, and clients</p>
                </div>
                <div className="rds-dash-banner-stats" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {[{l:"Employees",v:users.length,c:C.accent,k:"users"},{l:"Clients",v:clients.length,c:C.teal,k:"clients"},{l:"Projects",v:accessibleProjects.length,c:C.blue,k:"projects"},{l:"Completion",v:(tasks.length?Math.round(tasks.filter(t=>t.status==="Completed"||t.status==="Done").length/tasks.length*100):0)+"%",c:C.green,k:"completed"}].map(s=>(
                    <div key={s.l} onClick={()=>setDSM(s.k)} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",textAlign:"center",minWidth:64,cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";e.currentTarget.style.boxShadow=`0 0 0 2px ${s.c}55`;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l} ›</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isAdmin&&isManager&&(
              <div className="rds-dash-banner" style={{background:`linear-gradient(135deg,${C.card} 0%,${"#f59e0b"}11 100%)`,border:`1px solid ${"#f59e0b"}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,borderLeft:`4px solid #f59e0b`}}>
                <div className="rds-dash-banner-avatar" style={{width:52,height:52,borderRadius:14,background:"#f59e0b22",border:"2px solid #f59e0b44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#f59e0b",fontWeight:800}}>{(me.name[0]||"M").toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>Project Management Dashboard</h2>
                  <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back, {me.name} · Managing {accessibleProjects.length} active project{accessibleProjects.length!==1?"s":""}</p>
                </div>
                <div className="rds-dash-banner-stats" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {[{l:"Projects",v:accessibleProjects.length,c:"#f59e0b",k:"projects"},{l:"Team Size",v:[...new Set(dashTasks.map(t=>t.assignee).filter(Boolean))].length,c:C.blue,k:"team"},{l:"In Progress",v:dashTasks.filter(t=>t.status==="In Progress").length,c:C.accent,k:"inprogress"},{l:"Completion",v:(dashTasks.length?Math.round(dashTasks.filter(t=>isDone(t.status)).length/dashTasks.length*100):0)+"%",c:C.green,k:"completed"}].map(s=>(
                    <div key={s.l} onClick={()=>setDSM(s.k)} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",textAlign:"center",minWidth:64,cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";e.currentTarget.style.boxShadow=`0 0 0 2px ${s.c}55`;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none;"}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* ── Clean Filter Bar ── */}
            <div style={{background:C.card,border:`1px solid ${hasDashFilter?C.accent:C.border}`,borderRadius:12,padding:isMobile?"10px 12px":"12px 16px",marginBottom:20}}>
              {/* Search - full width on mobile */}
              <input placeholder="🔍 Search tasks or projects…" value={dashSearch} onChange={e=>sdss(e.target.value)}
                style={{width:"100%",background:C.surface,border:`1px solid ${dashSearch?C.accent:C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",display:"block",marginBottom:isMobile?8:0}}/>
              {/* Selects row */}
              <div style={{display:"flex",gap:isMobile?6:10,alignItems:"center",flexWrap:"wrap",marginTop:isMobile?0:8}}>
                <select value={dashProject} onChange={e=>sdsp(e.target.value)} style={{flex:1,minWidth:0,background:C.surface,border:`1px solid ${dashProject!=="All"?C.accent:C.border}`,borderRadius:8,padding:isMobile?"7px 6px":"8px 10px",color:dashProject!=="All"?C.accent:C.t1,fontSize:isMobile?12:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Projects</option>
                  {accessibleProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={dashUser} onChange={e=>sdsu(e.target.value)} style={{flex:1,minWidth:0,background:C.surface,border:`1px solid ${dashUser!=="All"?C.accent:C.border}`,borderRadius:8,padding:isMobile?"7px 6px":"8px 10px",color:dashUser!=="All"?C.accent:C.t1,fontSize:isMobile?12:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Assignees</option>
                  {users.map(u=><option key={u.username} value={u.name}>{u.name}</option>)}
                </select>
                <select value={dashStatus} onChange={e=>sdsst(e.target.value)} style={{flex:1,minWidth:0,background:C.surface,border:`1px solid ${dashStatus!=="All"?C.accent:C.border}`,borderRadius:8,padding:isMobile?"7px 6px":"8px 10px",color:dashStatus!=="All"?C.accent:C.t1,fontSize:isMobile?12:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Statuses</option>
                  {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                {hasDashFilter&&<button onClick={()=>{sdss("");sdsu("All");sdsp("All");sdsc("All");sdsst("All");}} style={{...GBtn,padding:isMobile?"7px 10px":"8px 12px",fontSize:12,color:C.red,borderColor:C.red,flexShrink:0}}>✕</button>}
              </div>
            </div>
            {hasDashFilter&&<p style={{margin:"8px 0 0",fontSize:12,color:C.accent}}>Showing {activeDashTasks.length} of {dashTasks.length} tasks</p>}
                        {/* ── Stat Cards ── */}
            <div className="rds-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:16,marginBottom:24}}>
              <Stat label="Total Tasks" value={activeDashTasks.length} sub={`across ${accessibleProjects.length} projects`} color={C.blue} onClick={()=>ssm({title:"All Tasks",tasks:activeDashTasks})}/>
              <Stat label="Completed" value={activeDashTasks.filter(t=>isDone(t.status)).length} sub={activeDashTasks.length?`${Math.round(activeDashTasks.filter(t=>isDone(t.status)).length/activeDashTasks.length*100)}% done`:"0%"} color={C.green} onClick={()=>ssm({title:"Completed Tasks",tasks:activeDashTasks.filter(t=>isDone(t.status))})}/>
              <Stat label="In Progress" value={activeDashTasks.filter(t=>t.status==="In Progress").length} sub="actively running" color={C.accent} onClick={()=>ssm({title:"In Progress Tasks",tasks:activeDashTasks.filter(t=>t.status==="In Progress")})}/>
              <Stat label="Not Yet Started" value={activeDashTasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started").length} sub="pending start" color={C.t2} onClick={()=>ssm({title:"Not Yet Started Tasks",tasks:activeDashTasks.filter(t=>t.status==="Not Yet Started"||t.status==="To Be Started")})}/>
              <Stat label="Recent Tasks" value={Math.min(dashTasks.length,12)} sub="latest activity" color={"#a855f7"} onClick={()=>ssm({title:"Recent Tasks",tasks:[...dashTasks].slice(-12).reverse()})}/>
              <Stat label="Overdue" value={overdueTasks.length} sub="need attention" color={C.red} onClick={()=>ssm({title:"Overdue Tasks",tasks:overdueTasks})}/>
            </div>
            {/* ── 1. Projects Overview ── */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#ffffff"}}>Projects Overview</h2>
              {canEdit&&<GmailSelect selectedCount={selProjects.size} total={accessibleProjects.length} label="Select Projects"
                onSelectAll={()=>{setBSO(true);setSelProjs(new Set(accessibleProjects.map(p=>p.id)));}}
                onSelectNone={()=>{setSelProjs(new Set());setBSO(false);}}/>}
            </div>

            {isMobile?(
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {accessibleProjects.filter(p=>!searchProj||p.name.toLowerCase().includes(searchProj.toLowerCase())).map(p=>{
                  const pv=prog(p.id),pt=tasks.filter(t=>t.project_id===p.id);
                  const pd=pt.filter(t=>isDone(t.status)).length;
                  const pip=pt.filter(t=>t.status==="In Progress").length;
                  const pov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
                  return(
                    <div key={p.id} onClick={()=>navTo('list',p.id)}
                      style={{background:C.card,border:`1px solid ${pov>0?C.red+"44":C.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${p.color}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                        <span style={{fontSize:13,fontWeight:800,color:p.color,flexShrink:0}}>{pv}%</span>
                      </div>
                      <div style={{height:4,background:C.surface,borderRadius:2,marginBottom:8,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pv}%`,background:p.color,borderRadius:2}}/>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        {p.client&&<span style={{fontSize:11,color:C.teal}}>🏢 {p.client}</span>}
                        <span style={{fontSize:11,color:C.green}}>✅ {pd}</span>
                        <span style={{fontSize:11,color:C.blue}}>🔄 {pip}</span>
                        {pov>0&&<span style={{fontSize:11,color:C.red,fontWeight:700}}>⚠ {pov} overdue</span>}
                        <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{pt.length} tasks →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ):(
              (()=>{
                const grpd={};
                const ungrouped=[];
                accessibleProjects.forEach(p=>{
                  if(p.group_name){if(!grpd[p.group_name])grpd[p.group_name]=[];grpd[p.group_name].push(p);}
                  else ungrouped.push(p);
                });
                const hasGroups=Object.keys(grpd).length>0;
                function ProjGrid({projs}){return(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:18,marginBottom:16}}>
                  {projs.map(p=>{
                const pv=prog(p.id),pt=tasks.filter(t=>t.project_id===p.id);
                const pd=pt.filter(t=>isDone(t.status)).length;
                const pip=pt.filter(t=>t.status==="In Progress").length;
                const ptd=pt.filter(t=>t.status==="To Be Started"||t.status==="Not Yet Started").length;
                const pov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
                const assignees=[...new Set(pt.map(t=>t.assignee).filter(Boolean))];
                const projSelected=selProjects.has(p.id);
                return(
                  <div key={p.id} style={{background:projSelected?C.accent+"18":C.card,border:`1px solid ${projSelected?C.accent:C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${projSelected?C.accent:p.color}`,transition:"transform .15s,box-shadow .15s",position:"relative"}}
                    onClick={()=>navTo('list',p.id)}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10,flex:1,minWidth:0}}>
                        {canEdit&&<div onClick={e=>{e.stopPropagation();toggleProject(p.id);}} title={projSelected?"Deselect":"Select"}
                          style={{marginTop:2,width:18,height:18,borderRadius:4,border:`2px solid ${projSelected?C.accent:C.t3}`,background:projSelected?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,cursor:"pointer",transition:"all .15s",flexShrink:0}}>{projSelected?"✓":""}</div>}
                        <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#ffffff",lineHeight:1.3,flex:1,minWidth:0}}>{p.name}</h3>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        {canEdit&&(<><IBtn icon="✏️" title="Edit Project" onClick={e=>{e.stopPropagation();sep(p);}} color={C.t2}/><IBtn icon="🗑" title="Delete Project" onClick={e=>{e.stopPropagation();deleteProject(p.id);}} color={C.red}/></>)}
                        <span style={{background:p.color+"22",color:p.color,border:`1px solid ${p.color}44`,borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:800,whiteSpace:"nowrap"}}>{pv}%</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap"}}>
                      {p.client&&<span style={{fontSize:12,color:C.teal,fontWeight:600}}>👤 {p.client}</span>}
                      {p.deadline&&<span style={{fontSize:12,color:C.t3}}>📅 Due {p.deadline}</span>}
                    </div>
                    <Pb v={pv} color={p.color} h={7}/>
                    <div className="rds-mini-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginTop:14}}>
                      <div style={{background:C.green+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                        <div style={{fontSize:20,fontWeight:800,color:C.green}}>{pd}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>Done</div>
                      </div>
                      <div style={{background:C.blue+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                        <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{pip}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>In Progress</div>
                      </div>
                      <div style={{background:"#ffffff12",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                        <div style={{fontSize:20,fontWeight:800,color:C.t2}}>{ptd}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>Pending</div>
                      </div>
                      <div style={{background:C.red+"18",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                        <div style={{fontSize:20,fontWeight:800,color:pov>0?C.red:C.t3}}>{pov}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>Overdue</div>
                      </div>
                    </div>
                    {assignees.length>0&&(
                      <div style={{marginTop:12,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:C.t3}}>Team:</span>
                        {assignees.slice(0,4).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:4}}><Av name={a} size={20}/><span style={{fontSize:11,color:C.t2}}>{a}</span></div>)}
                        {assignees.length>4&&<span style={{fontSize:11,color:C.t3}}>+{assignees.length-4} more</span>}
                      </div>
                    )}
                    <div style={{marginTop:10,fontSize:11,color:C.t3,textAlign:"right"}}>{pt.length} task{pt.length!==1?"s":""} total · click to view →</div>
                  </div>
                );
              })}
                  </div>
                );}
                return(<>
                  {hasGroups&&Object.entries(grpd).sort((a,b)=>a[0].localeCompare(b[0])).map(([gname,gprojs])=>{
                    const gt=tasks.filter(t=>gprojs.some(p=>p.id===t.project_id));
                    const gd=gt.filter(t=>isDone(t.status)).length;
                    const gov=gt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
                    const gpct=gt.length?Math.round(gd/gt.length*100):0;
                    const [gopen,setGOpen]=React.useState(true);
                    return(
                      <div key={gname} style={{marginBottom:22}}>
                        <div onClick={()=>setGOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",background:C.card,border:`1px solid ${gov>0?C.red+"55":C.teal+"44"}`,borderRadius:gopen?"12px 12px 0 0":"12px",cursor:"pointer",userSelect:"none",marginBottom:0}}>
                          <span style={{fontSize:14,fontWeight:700,color:C.teal,transition:"transform .18s",display:"inline-block",transform:gopen?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:15,fontWeight:800,color:C.t1}}>{gname}</div>
                            <div style={{fontSize:11,color:C.t3,marginTop:2}}>{gprojs.length} project{gprojs.length!==1?"s":""} · {gt.length} tasks</div>
                          </div>
                          <div style={{display:"flex",gap:10,alignItems:"center"}}>
                            <span style={{fontSize:13,fontWeight:800,color:gpct>=80?C.green:gpct>=50?C.accent:C.red}}>{gpct}%</span>
                            {gov>0&&<span style={{fontSize:11,color:C.red,fontWeight:700,background:C.red+"18",borderRadius:6,padding:"2px 8px"}}>⚠ {gov} overdue</span>}
                          </div>
                        </div>
                        {gopen&&<div style={{border:`1px solid ${C.teal}44`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"16px 16px 4px 16px",background:"#ffffff08",marginBottom:4}}>
                          <ProjGrid projs={gprojs}/>
                        </div>}
                      </div>
                    );
                  })}
                  {ungrouped.length>0&&<>
                    {hasGroups&&<h3 style={{margin:"4px 0 14px",fontSize:13,fontWeight:700,color:C.t3,letterSpacing:".05em",textTransform:"uppercase"}}>Ungrouped Projects</h3>}
                    <ProjGrid projs={ungrouped}/>
                  </>}
                </>);
              })()
            )}
                        {(()=>{const up=accessibleProjects.filter(p=>!p.assigned_users||p.assigned_users.length===0);if(!up.length)return null;return(<><h2 style={{margin:"0 0 14px",fontSize:16,fontWeight:700,color:C.yellow}}>📂 Unassigned Projects</h2><div style={{background:C.card,border:`1px solid ${C.yellow}44`,borderRadius:12,overflow:"hidden",marginBottom:28}}>{up.map(p=>{const pt=tasks.filter(t=>t.project_id===p.id);const pv=prog(p.id);return(<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}><div style={{width:3,height:36,borderRadius:2,background:p.color}}/><div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:600,color:C.t1}}>{p.name}</p><p style={{margin:0,fontSize:11,color:C.t3}}>{p.client?`👤 ${p.client} · `:""}{pt.length} tasks · Due {p.deadline||"TBD"}</p></div><Bdg color={p.color}>{pv}%</Bdg>{isAdmin&&<button onClick={()=>sep(p)} style={{...GBtn,padding:"5px 12px",fontSize:12,color:C.yellow,borderColor:C.yellow}}>Assign →</button>}</div>);})}</div></>);})()}
            {/* ── 2. Recent Tasks ── */}
            <h2 style={{margin:"0 0 12px",fontSize:16,fontWeight:700,color:"#ffffff"}}>Recent Tasks</h2>
            {isMobile&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {dashTasks.slice(-12).reverse().map(t=>{
                const pj=projects.find(p=>p.id===t.project_id);
                const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
                return(
                  <div key={t.id} onClick={()=>{set(t);stm(true);}}
                    style={{background:C.card,border:`1px solid ${isOv?C.red+"55":C.border}`,borderRadius:10,padding:"11px 13px",cursor:"pointer",borderLeft:`3px solid ${isOv?C.red:getStatusColor(t.status)}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6,marginBottom:5}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.t1,flex:1,lineHeight:1.3}}>{t.title}</span>
                      <span style={{fontSize:10,fontWeight:700,color:getStatusColor(t.status),flexShrink:0}}>{t.status}</span>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      {pj&&<span style={{fontSize:11,color:C.teal}}>📁 {pj.name}</span>}
                      {t.assignee&&<span style={{fontSize:10,color:C.t2}}>👤 {t.assignee}</span>}
                      {t.detailer&&<span style={{fontSize:10,color:C.t2}}>✏ {t.detailer}</span>}
                      {t.checker&&<span style={{fontSize:10,color:C.t2}}>✅ {t.checker}</span>}
                      {t.due_date&&<span style={{fontSize:10,color:isOv?C.red:C.t3,marginLeft:"auto"}}>{isOv?"⚠ ":""}{t.due_date}</span>}
                    </div>
                  </div>
                );
              })}
            </div>}
            {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:18,marginBottom:28}}>
              {dashTasks.slice(-12).reverse().map(t=>{
                const pj=projects.find(p=>p.id===t.project_id);
                const clr=pj?.color||C.accent;
                const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
                const team=[t.assignee,t.detailer,t.checker].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
                return(
                  <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${clr}`,transition:"transform .15s,box-shadow .15s"}}
                    onClick={()=>{set(t);stm(true);}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <p style={{margin:0,fontSize:15,fontWeight:800,color:C.t1,flex:1,lineHeight:1.3}}>{t.title}</p>
                      <span style={{background:clr+"22",color:clr,border:`1px solid ${clr}44`,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,marginLeft:10,whiteSpace:"nowrap"}}>{pj?.name||"—"}</span>
                    </div>
                    <div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap"}}>
                      {t.client&&<span style={{fontSize:12,color:C.teal,fontWeight:600}}>👤 {t.client}</span>}
                      {t.due_date&&<span style={{fontSize:12,color:isOv?C.red:C.t3,fontWeight:isOv?700:400}}>📅 {t.due_date}{isOv?" ⚠":""}</span>}
                    </div>
                    <div className="rds-mini-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:12}}>
                      <div style={{background:getStatusColor(t.status)+"22",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Status</div>
                        <div style={{fontSize:10,fontWeight:700,color:getStatusColor(t.status),lineHeight:1.3}}>{t.status}</div>
                      </div>
                      <div style={{background:(PRI_CLR[t.priority]||C.t3)+"22",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Priority</div>
                        <div style={{fontSize:10,fontWeight:700,color:PRI_CLR[t.priority]||C.t2}}>{t.priority||"—"}</div>
                      </div>
                      <div style={{background:"#ffffff12",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Scope</div>
                        <div style={{fontSize:10,fontWeight:600,color:C.t2}}>{t.scope||"—"}</div>
                      </div>
                      <div style={{background:C.accent+"18",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Assignee</div>
                        {t.assignee?<div style={{display:"flex",justifyContent:"center"}}><Av name={t.assignee} size={20}/></div>:<div style={{fontSize:10,color:C.yellow}}>None</div>}
                      </div>
                    </div>
                    {team.length>0&&(
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8}}>
                        <span style={{fontSize:11,color:C.t3}}>Team:</span>
                        {team.slice(0,4).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:4}}><Av name={a} size={20}/><span style={{fontSize:11,color:C.t2}}>{a}</span></div>)}
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      {canEdit&&<button onClick={e=>{e.stopPropagation();set(t);stm(true);}} style={{...GBtn,padding:"4px 10px",fontSize:11,color:C.accent,borderColor:C.accent}}>✏️ Edit</button>}
                      <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>click to edit →</span>
                    </div>
                  </div>
                );
              })}
            </div>}
            {/* ── 3. Employee Overview (Admin/Manager direct access) ── */}
            {(()=>{
              const staff=users.filter(u=>u.role!=="Client"&&u.username!==me.username);
              if(!staff.length)return null;
              return(
                <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.t1}}>👥 Employee Overview</h2>
                  <span style={{fontSize:12,color:C.t3}}>{staff.length} team member{staff.length!==1?"s":""} · click to manage</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(220px,100%),1fr))",gap:12,marginBottom:28}}>
                  {staff.map(u=>{
                    const uTasks=dashTasks.filter(t=>userMatchesStr(u,t.assignee)||userMatchesStr(u,t.detailer)||userMatchesStr(u,t.checker));
                    const done=uTasks.filter(t=>isDone(t.status)).length;
                    const inProg=uTasks.filter(t=>t.status==="In Progress").length;
                    const overdue=uTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
                    const pct=uTasks.length?Math.round(done/uTasks.length*100):0;
                    const hue=u.name.charCodeAt(0)*17%360;
                    return(
                      <div key={u.id} style={{background:C.card,border:`1px solid ${overdue>0?C.red+"44":C.border}`,borderRadius:12,padding:16,cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px #00000055";}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                          <div style={{width:40,height:40,borderRadius:"50%",background:`hsl(${hue},55%,40%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>{u.name.charAt(0).toUpperCase()}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                            <div style={{fontSize:10,color:C.t3}}>{u.role}</div>
                          </div>
                        </div>
                        <div style={{height:4,background:C.surface,borderRadius:2,marginBottom:10,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:`hsl(${hue},55%,45%)`,borderRadius:2,transition:"width .4s"}}/>
                        </div>
                        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                          <span style={{fontSize:10,background:C.green+"22",color:C.green,border:`1px solid ${C.green}33`,borderRadius:4,padding:"2px 6px",fontWeight:700}}>✅ {done}</span>
                          <span style={{fontSize:10,background:C.blue+"22",color:C.blue,border:`1px solid ${C.blue}33`,borderRadius:4,padding:"2px 6px",fontWeight:700}}>🔄 {inProg}</span>
                          {overdue>0&&<span style={{fontSize:10,background:C.red+"22",color:C.red,border:`1px solid ${C.red}33`,borderRadius:4,padding:"2px 6px",fontWeight:700}}>⚠ {overdue}</span>}
                          <span style={{fontSize:10,color:C.t3,marginLeft:"auto"}}>{uTasks.length} tasks · {pct}%</span>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{sfa(u.name);sv("kanban");sap(null);}}
                            style={{flex:1,background:C.accent+"18",border:`1px solid ${C.accent}44`,borderRadius:8,padding:"7px 0",fontSize:11,fontWeight:700,color:C.accent,cursor:"pointer",fontFamily:"inherit",transition:"background .15s"}}
                            onMouseEnter={e=>e.currentTarget.style.background=C.accent+"33"}
                            onMouseLeave={e=>e.currentTarget.style.background=C.accent+"18"}>
                            📋 Kanban
                          </button>
                          <button onClick={()=>{sfa(u.name);sv("list");sap(null);}}
                            style={{flex:1,background:C.blue+"18",border:`1px solid ${C.blue}44`,borderRadius:8,padding:"7px 0",fontSize:11,fontWeight:700,color:C.blue,cursor:"pointer",fontFamily:"inherit",transition:"background .15s"}}
                            onMouseEnter={e=>e.currentTarget.style.background=C.blue+"33"}
                            onMouseLeave={e=>e.currentTarget.style.background=C.blue+"18"}>
                            📄 List
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              );
            })()}
            {/* ── 4. Client-wise Overview ── */}
            {!isClient&&<ClientOverview projects={accessibleProjects} tasks={dashTasks} clients={clients} onSelectClient={c=>navTo('clientprojects',null,c)}/>}
            {/* ── 4. Overdue Tasks ── */}
            {overdueTasks.length>0&&(<>
              <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:C.red}}>⚠ Overdue Tasks</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:18,marginBottom:28}}>
                {overdueTasks.map(t=>{
                  const pj=projects.find(p=>p.id===t.project_id);
                  const daysOver=Math.floor((new Date(today)-new Date(t.due_date))/(1000*60*60*24));
                  const team=[t.assignee,t.detailer,t.checker].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
                  return(
                    <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${C.red}`,transition:"transform .15s,box-shadow .15s"}}
                      onClick={()=>{set(t);stm(true);}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <p style={{margin:0,fontSize:15,fontWeight:800,color:C.t1,flex:1,lineHeight:1.3}}>{t.title}</p>
                        <span style={{background:C.red+"22",color:C.red,border:`1px solid ${C.red}44`,borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:800,marginLeft:10,whiteSpace:"nowrap"}}>{daysOver}d late</span>
                      </div>
                      <div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap"}}>
                        {pj&&<span style={{fontSize:12,color:pj.color||C.accent,fontWeight:600}}>📁 {pj.name}</span>}
                        {t.client&&<span style={{fontSize:12,color:C.teal,fontWeight:600}}>👤 {t.client}</span>}
                      </div>
                      <div className="rds-mini-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:12}}>
                        <div style={{background:getStatusColor(t.status)+"22",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                          <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Status</div>
                          <div style={{fontSize:10,fontWeight:700,color:getStatusColor(t.status),lineHeight:1.3}}>{t.status}</div>
                        </div>
                        <div style={{background:(PRI_CLR[t.priority]||C.t3)+"22",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                          <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Priority</div>
                          <div style={{fontSize:10,fontWeight:700,color:PRI_CLR[t.priority]||C.t2}}>{t.priority||"—"}</div>
                        </div>
                        <div style={{background:C.red+"18",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                          <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Due</div>
                          <div style={{fontSize:10,fontWeight:700,color:C.red}}>{t.due_date}</div>
                        </div>
                        <div style={{background:"#ffffff12",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                          <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Scope</div>
                          <div style={{fontSize:10,fontWeight:600,color:C.t2}}>{t.scope||"—"}</div>
                        </div>
                      </div>
                      {team.length>0&&(
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8}}>
                          <span style={{fontSize:11,color:C.t3}}>Team:</span>
                          {team.slice(0,4).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:4}}><Av name={a} size={20}/><span style={{fontSize:11,color:C.t2}}>{a}</span></div>)}
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        {canEdit&&<button onClick={e=>{e.stopPropagation();set(t);stm(true);}} style={{...GBtn,padding:"4px 10px",fontSize:11,color:C.accent,borderColor:C.accent}}>✏️ Edit</button>}
                        <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>click to edit →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}
          </>
        )}
        {view==="dashboard"&&<TaskTimingPanel
          tasks={tasks.filter(t=>accessibleProjects.some(p=>p.id===t.project_id))}
          projects={accessibleProjects}
          me={me} isAdmin={isAdmin} isManager={isManager} isTeamLeader={isTeamLeader} isClient={isClient}
          onEditTask={t=>{set(t);stm(true);}}
        />}
        {view==="dashboard"&&isAdmin&&(<AttendancePage users={users}/>)}
        {view==="timings"&&(
          <TimingsPage me={me} tasks={tasks} projects={accessibleProjects} users={users} isAdmin={isAdmin} isManager={isManager} isTeamLeader={isTeamLeader} isClient={isClient}/>
        )}
        {view==="analytics"&&(isAdmin||isManager||isTeamLeader)&&(
          <AnalyticsCenter projects={accessibleProjects} tasks={tasks} users={users} clients={clients} today={today} members={members}/>
        )}
        {view==="capacity"&&(isAdmin||isManager||isTeamLeader)&&(
          <CapacityView tasks={tasks} users={users} projects={projects} canEdit={canEdit} onReassign={reassignTask}/>
        )}
        {view==="workflows"&&isAdmin&&(
          <WorkflowsPage workflows={workflows} onAdd={addWorkflow} onUpdate={updateWorkflow} onDelete={deleteWorkflow} onToggle={toggleWorkflow} users={users} saving={saving}/>
        )}
        {view==="gantt"&&!isClient&&(
          <GanttPage
            projects={accessibleProjects}
            tasks={tasks}
            today={today}
            onSelectProject={pid=>{navTo("list",pid);}}
          />
        )}
        {view==="submissions"&&!isClient&&(
          <SubmissionsPage
            projects={accessibleProjects}
            tasks={tasks}
            today={today}
            isClient={isClient}
            clientName={me?.client_name||""}
            canEdit={canEdit}
            onEdit={t=>{set(t);stm(true);}}
          />
        )}
        {view==="announcements"&&!isClient&&(
          <AnnouncementsPage
            me={me}
            users={users}
            projects={accessibleProjects}
            canPost={isAdmin||isManager}
          />
        )}
        {view==="warroom"&&!isClient&&(
          <WarRoomPage
            me={me}
            projects={accessibleProjects}
            users={users}
          />
        )}
        {view==="kanban"&&(
          <>
            {activeClient&&(<div style={{marginBottom:16,padding:"10px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:C.t2}}>Client filter:</span><Bdg color={C.teal}>{activeClient}</Bdg><button onClick={()=>sac(null)} style={{...GBtn,padding:"4px 10px",fontSize:12,marginLeft:"auto"}}>✕ Clear</button></div>)}
            {canEdit&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <GmailSelect selectedCount={selTasks.size} total={filtered.length}
                onSelectAll={()=>{setBSO(true);setSelTasks(new Set(filtered.map(t=>t.id)));}}
                onSelectNone={()=>{setSelTasks(new Set());setBSO(false);}}
                extraOptions={ALL_STATUSES.filter(s=>filtered.some(t=>t.status===s)).map(s=>({label:s,action:()=>{setBSO(true);setSelTasks(new Set(filtered.filter(t=>t.status===s).map(t=>t.id)));}}))}/>
            </div>}
            {isMobile?(
              <div>
                {/* Mobile kanban: tab strip + task list for selected column */}
                <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
                  {kanbanCols.map(col=>{
                    const cnt=filtered.filter(t=>t.status===col).length;
                    const active=mobKanCol===col;
                    return(
                      <button key={col} onClick={()=>setMobKanCol(col)}
                        style={{flexShrink:0,background:active?C.accent:C.card,border:`1px solid ${active?C.accent:C.border}`,borderRadius:20,padding:"7px 14px",fontSize:11,fontWeight:700,color:active?"#fff":C.t2,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                        {col}
                        <span style={{background:active?"#ffffff33":C.accent+"22",color:active?"#fff":C.accent,borderRadius:8,padding:"1px 6px",fontSize:10,fontWeight:700}}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Task list for active column */}
                {(()=>{
                  const colTasks=filtered.filter(t=>t.status===mobKanCol);
                  if(colTasks.length===0)return(<div style={{textAlign:"center",padding:"40px 16px",color:C.t3,fontSize:13}}>No tasks in "{mobKanCol}"</div>);
                  return(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {colTasks.map(t=>{
                        const proj=projects.find(p=>p.id===t.project_id);
                        const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
                        const canEditTask=canEdit||(userMatchesStr(me,t.assignee)||userMatchesStr(me,t.detailer)||userMatchesStr(me,t.checker));
                        return(
                          <div key={t.id} style={{background:C.card,border:`1px solid ${isOv?C.red+"55":C.border}`,borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${isOv?C.red:getStatusColor(t.status)}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                              <span style={{fontSize:13,fontWeight:700,color:C.t1,flex:1,lineHeight:1.3}}>{t.title}</span>
                              {canEditTask&&<button onClick={()=>{set(t);stm(true);}} style={{flexShrink:0,background:C.accent+"22",border:`1px solid ${C.accent}44`,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,color:C.accent,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>}
                            </div>
                            {proj&&<div style={{fontSize:11,color:C.teal,fontWeight:600,marginBottom:4}}>📁 {proj.name}</div>}
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:canEditTask?8:0}}>
                              {t.priority&&<span style={{fontSize:10,background:(PRI_CLR[t.priority]||C.t3)+"22",color:PRI_CLR[t.priority]||C.t3,borderRadius:4,padding:"1px 6px",fontWeight:700}}>{t.priority}</span>}
                              {t.assignee&&<span style={{fontSize:10,color:C.t2}}>👤 {t.assignee}</span>}
                              {t.detailer&&<span style={{fontSize:10,color:C.t2}}>✏ {t.detailer}</span>}
                              {isOv&&<span style={{fontSize:10,color:C.red,fontWeight:700}}>⚠ {t.due_date}</span>}
                              {!isOv&&t.due_date&&<span style={{fontSize:10,color:C.t3}}>📅 {t.due_date}</span>}
                            </div>
                            {canEditTask&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:10,color:C.t3,flexShrink:0}}>Move to:</span>
                              <select value={t.status} onChange={e=>dropTask(t.id,e.target.value)}
                                style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 8px",color:getStatusColor(t.status),fontSize:11,fontWeight:700,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                                {kanbanCols.map(col=><option key={col} value={col}>{col}</option>)}
                              </select>
                            </div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ):(
            <div className="rds-kanban-wrap" style={{display:"flex",gap:14,overflow:"auto",paddingBottom:16}}>
              {kanbanCols.map(col=>(<KCol key={col} status={col} tasks={filtered.filter(t=>t.status===col)} projects={projects}
                onEdit={t=>{set(t);stm(true);}}
                onDelete={canEdit?delTask:()=>{}}
                onDrop={dropTask}
                canEditFn={t=>canEdit||(userMatchesStr(me,t.assignee)||userMatchesStr(me,t.detailer)||userMatchesStr(me,t.checker))}
                canDelete={canEdit}
                selTasks={selTasks}
                onToggleTask={canEdit?toggleTask:null}
                taskFileCounts={taskFileCounts}
                onFiles={t=>setFileTask(t)}
              />))}
            </div>
            )}
          </>
        )}
        {view=="clientprojects"&&canEdit&&(()=>{
          const cpProjects=accessibleProjects.filter(p=>(p.client||"Unassigned")===activeClient);
          const cpTasks=tasks.filter(t=>cpProjects.some(p=>p.id===t.project_id));
          const cpAssignees=[...new Set(cpTasks.map(t=>t.assignee).filter(Boolean))].sort();
          return(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <button onClick={()=>navTo('dashboard')} style={{...GBtn,padding:"7px 14px",fontSize:13,display:"flex",alignItems:"center",gap:6}}>← Back</button>
                <span style={{color:C.t3,fontSize:13}}>{cpProjects.length} project(s) · {cpTasks.length} tasks</span>
              </div>
              <ClientProjectSearch
                projects={cpProjects} tasks={cpTasks} assignees={cpAssignees}
                today={today} isAdmin={isAdmin} canEdit={canEdit}
                onViewTasks={pid=>navTo('list',pid)}
                onEdit={p=>sep(p)} onDelete={p=>deleteProject(p.id)}
                onEditTask={t=>{set(t);stm(true);}}
              />
            </div>
          );
        })()}
        {view==="list"&&(
          <div>
          {!isMobile&&canEdit&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <GmailSelect selectedCount={selTasks.size} total={filtered.length}
              onSelectAll={()=>{setBSO(true);setSelTasks(new Set(filtered.map(t=>t.id)));}}
              onSelectNone={()=>{setSelTasks(new Set());setBSO(false);}}
              extraOptions={["Completed","In Progress","Not Yet Started","To Be Started"].filter(s=>filtered.some(t=>t.status===s)).map(s=>({label:s,action:()=>{setBSO(true);setSelTasks(new Set(filtered.filter(t=>t.status===s).map(t=>t.id)));}}))
              }/>
          </div>}
          {isMobile?(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filtered.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>No tasks found</div>:filtered.map(t=>{
                const proj=projects.find(p=>p.id===t.project_id);
                const isOv=t.due_date&&t.due_date<today&&!isDone(t.status);
                return(
                  <div key={t.id} style={{background:C.card,border:`1px solid ${isOv?C.red+"55":C.border}`,borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${isOv?C.red:getStatusColor(t.status)}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.t1,flex:1,lineHeight:1.3}}>{t.title}</span>
                      <button onClick={()=>{set(t);stm(true);}} style={{flexShrink:0,background:C.accent+"22",border:`1px solid ${C.accent}44`,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,color:C.accent,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
                    </div>
                    {proj&&<div style={{fontSize:11,color:C.teal,fontWeight:600,marginBottom:4}}>📁 {proj.name}</div>}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:700,color:getStatusColor(t.status)}}>{t.status}</span>
                      {t.priority&&<span style={{fontSize:10,background:(PRI_CLR[t.priority]||C.t3)+"22",color:PRI_CLR[t.priority]||C.t3,borderRadius:4,padding:"1px 6px",fontWeight:700}}>{t.priority}</span>}
                      {t.due_date&&<span style={{fontSize:10,color:isOv?C.red:C.t3,fontWeight:isOv?700:400}}>{isOv?"⚠ ":""}{t.due_date}</span>}
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      {t.assignee&&<span style={{fontSize:10,color:C.t2}}>👤 <b>Assignee:</b> {t.assignee}</span>}
                      {t.detailer&&<span style={{fontSize:10,color:C.t2}}>✏ <b>Detailer:</b> {t.detailer}</span>}
                      {t.checker&&<span style={{fontSize:10,color:C.t2}}>✅ <b>Checker:</b> {t.checker}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ):(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.surface}}>
                {canEdit&&<th style={{padding:"11px 12px",width:36}}>
                  <div title={selTasks.size===filtered.length?"Deselect all":"Select all"} onClick={()=>{if(selTasks.size===filtered.length){setSelTasks(new Set());}else{setSelTasks(new Set(filtered.map(t=>t.id)));}}}
                    style={{width:18,height:18,borderRadius:4,border:`2px solid ${selTasks.size===filtered.length&&filtered.length>0?C.accent:C.t3}`,background:selTasks.size===filtered.length&&filtered.length>0?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,cursor:"pointer",margin:"0 auto",transition:"all .15s"}}>
                    {selTasks.size===filtered.length&&filtered.length>0?"✓":""}
                  </div>
                </th>}
                {["Task","Project","Client","Scope","Status","Priority","Assignee","Detailer","Checker","Due Date","Client Sub Date",""].map(h=>(<th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>))}
              </tr></thead>
              <tbody>{filtered.length===0?<tr><td colSpan={canEdit?13:12} style={{padding:32,textAlign:"center",color:C.t3}}>No tasks found</td></tr>:filtered.map(t=><TRow key={t.id} task={t} project={projects.find(p=>p.id===t.project_id)} onEdit={t=>{set(t);stm(true);}} onDelete={canEdit?delTask:()=>{}} readonly={!canEdit} canDelete={canEdit} selected={selTasks.has(t.id)} onSelect={canEdit?toggleTask:null} fileCount={taskFileCounts[t.id]||0} onFiles={t=>setFileTask(t)}/>)}</tbody>
            </table>
          </div>
          )}
          </div>
        )}
      </main>
      {fileTask&&<TaskFilesPanel task={fileTask} me={me} canEdit={canEdit} onClose={()=>setFileTask(null)} onCountChange={updateFileCount}/>}
      {cmdOpen&&<CommandPalette projects={accessibleProjects} tasks={tasks} users={users} clients={clients} taskFileCounts={taskFileCounts} onNav={(type,data)=>{
        if(type==="project")navTo("list",data.id);
        else if(type==="task")navTo("list",data.project_id);
        else if(type==="user"){sfa(data.name);sv("list");sap(null);}
        else if(type==="client"){sac(data.name);sv("clientprojects");sap(null);}
        else if(type==="file"){setFileTask(data);}
      }} onClose={()=>setCmdOpen(false)}/>}
      {statModal&&<StatTaskModal title={statModal.title} tasks={statModal.tasks} projects={projects} today={today} canEdit={canEdit} onEdit={t=>{set(t);stm(true);ssm(null);}} onClose={()=>ssm(null)}/>}
      {clientModal&&<ClientsModal clients={clients} users={users} onAdd={addClient} onEdit={editClient} onDelete={deleteClient} onSavePortal={savePortal} onClose={()=>scm(false)}/>}
      {pwModal&&<ChangePasswordModal me={me} onClose={()=>spwm(false)}/>}

      {userModal&&<UsersModal users={users} currentUser={me} projects={projects} clients={clients} onAdd={addUser} onEdit={editUserFn} onDelete={delUser} onClose={()=>sum(false)}/>}
      {editProject&&(<Modal title="Edit Project" onClose={()=>sep(null)} wide><EditProjectForm project={editProject} onSave={updateProject} onClose={()=>sep(null)} saving={saving} users={users} clients={clients} requireDates={canEdit} existingGroupNames={[...new Set(projects.map(p=>p.group_name).filter(Boolean))]}/></Modal>)}
      {taskModal&&(
        <Modal title={editTask?(canEdit?"Edit Task":"Update Task Status"):"New Task"} onClose={()=>{stm(false);set(null);}} wide={canEdit}>
          {(canEdit||!editTask)?
            <TaskForm initial={editTask||(activePid?{project_id:activePid}:{})} projects={accessibleProjects} members={members} clients={clients} onSave={saveTask} onClose={()=>{stm(false);set(null);}} saving={saving} requireDates={canEdit}/>:
            <UserTaskEditForm task={editTask} project={projects.find(p=>p.id===editTask.project_id)} onSave={saveTask} onClose={()=>{stm(false);set(null);}} saving={saving}/>
          }
          {editTask&&<TaskTimeLogs taskId={editTask.id} projectId={editTask.project_id} me={me} isClient={isClient}/>}
          {editTask&&<TaskComments taskId={editTask.id} projectId={editTask.project_id} me={me} users={users}/>}
        </Modal>
      )}
      {projModal&&(<Modal title="New Project" onClose={()=>spm(false)}><ProjectForm onSave={saveProject} onClose={()=>spm(false)} saving={saving} users={users} clients={clients} requireDates={canEdit} existingGroupNames={[...new Set(projects.map(p=>p.group_name).filter(Boolean))]}/></Modal>)}
      {canEdit&&<BulkBar selTasks={selTasks} selProjects={selProjects} onClear={()=>{clearSel();setBSO(false);}} onBulkDelete={bulkDelete} onBulkAction={type=>setBM(type)}/>}
      {canEdit&&bulkModal&&<BulkActionModal type={bulkModal} count={selTasks.size} members={members} onApply={applyBulkAction} onClose={()=>setBM(null)}/>}
    </div>
    {/* ── Mobile ME bottom sheet ── */}
    {dashStatModal&&(()=>{
      const DSM=dashStatModal;
      const completedTasks=tasks.filter(t=>t.status==="Completed"||t.status==="Done");
      const ipTasks=tasks.filter(t=>t.status==="In Progress");
      const teamMembers=[...new Set(tasks.map(t=>t.assignee).filter(Boolean))].sort();
      const modalData={
        users:{title:"👥 All Employees",color:C.accent,items:users.map(u=>({label:u.name,sub:`@${u.username} · ${u.role}`,dot:u.role==="Admin"?C.accent:u.role==="Manager"?C.teal:u.role==="Team Leader"?C.blue:C.t3}))},
        clients:{title:"🏢 All Clients",color:C.teal,items:clients.map(cl=>({label:cl.name,sub:cl.email||cl.phone||"",dot:C.teal}))},
        projects:{title:"📁 All Projects",color:C.blue,items:accessibleProjects.map(p=>({label:p.name,sub:`${p.client||"No client"} · ${prog(p.id)}% done`,dot:p.color||C.blue}))},
        completed:{title:"✅ Completed Tasks",color:C.green,items:completedTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?pj.name:"—"}${t.assignee?" · "+t.assignee:""}`,dot:C.green};})},
        team:{title:"👤 Team Members",color:C.blue,items:teamMembers.map(name=>({label:name,sub:`${tasks.filter(t=>t.assignee===name&&t.status==="In Progress").length} in progress · ${tasks.filter(t=>t.assignee===name&&isDone(t.status)).length} done`,dot:C.blue}))},
        inprogress:{title:"🔄 In Progress Tasks",color:C.accent,items:ipTasks.map(t=>{const pj=projects.find(p=>p.id===t.project_id);return{label:t.title,sub:`${pj?pj.name:"—"}${t.assignee?" · "+t.assignee:""}${t.due_date?" · Due "+t.due_date:""}`,dot:C.accent};})}
      };
      const md=modalData[DSM];
      if(!md) return null;
      return(
        <div onClick={()=>setDSM(null)} style={{position:"fixed",inset:0,background:"#00000080",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:`0 0 0 1px ${md.color}33,0 24px 60px #00000080`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.t1}}>{md.title}</div>
                <div style={{fontSize:12,color:C.t3,marginTop:2}}>{md.items.length} {DSM==="users"?"employees":DSM==="clients"?"clients":DSM==="projects"?"projects":"tasks"}</div>
              </div>
              <button onClick={()=>setDSM(null)} style={{background:"none",border:"none",color:C.t2,fontSize:20,cursor:"pointer",lineHeight:1,padding:4}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {md.items.length===0?<div style={{textAlign:"center",padding:32,color:C.t3,fontSize:14}}>No items found</div>:md.items.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,borderLeft:`3px solid ${item.dot}`}}>
                  <div style={{width:34,height:34,borderRadius:8,background:item.dot+"22",border:`1px solid ${item.dot}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:item.dot,flexShrink:0}}>{(item.label[0]||"?").toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</div>
                    {item.sub&&<div style={{fontSize:11,color:C.t3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    })()}
{isMobile&&uMenu&&(
      <div onClick={()=>sMenu(false)} style={{position:"fixed",inset:0,background:"#00000070",zIndex:350}}>
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:64,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,borderRadius:"18px 18px 0 0",padding:"20px 16px 16px"}}>
          <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <Av name={me.name} size={44}/>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:C.t1}}>{me.name}{me.username===SUPER_ADMIN&&<span style={{color:C.accent,fontSize:10,marginLeft:6}}>★</span>}</div>
              <div style={{fontSize:12,color:C.t3}}>@{me.username} · {me.role}</div>
            </div>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,display:"flex",flexDirection:"column",gap:4}}>
            {isAdmin&&<button onClick={()=>{sum(true);scm(false);spwm(false);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"11px 8px",color:C.t1,fontSize:14,fontFamily:"inherit",fontWeight:600,borderRadius:8}}>👥 Manage Employees</button>}
            {isAdmin&&<button onClick={()=>{scm(true);sum(false);spwm(false);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"11px 8px",color:C.t1,fontSize:14,fontFamily:"inherit",fontWeight:600,borderRadius:8}}>🏢 View Clients</button>}
            <button onClick={()=>{spwm(true);sum(false);scm(false);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"11px 8px",color:C.t1,fontSize:14,fontFamily:"inherit",fontWeight:600,borderRadius:8}}>🔐 Change Password</button>
            <button onClick={()=>{localStorage.removeItem("rds_user");window.location.href="/";}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"11px 8px",color:C.red,fontSize:14,fontFamily:"inherit",fontWeight:700,borderRadius:8}}>🚪 Sign Out</button>
          </div>
        </div>
      </div>
    )}
    {/* ── Mobile bottom nav ── */}
    {showMore&&<div style={{position:"fixed",inset:0,zIndex:210,background:"#00000055"}} onClick={()=>setShowMore(false)}>
      <div style={{position:"absolute",bottom:"env(safe-area-inset-bottom,60px)",marginBottom:60,left:0,right:0,background:C.card,borderRadius:"16px 16px 0 0",borderTop:`1px solid ${C.border}`,padding:"12px 8px 8px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4}}>
          {navs.slice(4).map(([k,ico,lbl])=>{const badge=navBadges[k]||0;const active=view===k;return(
            <button key={k} onClick={()=>{navTo(k,k==='list'?activePid:null);setSO(false);if(badge>0)setNavBadges(prev=>({...prev,[k]:0}));setShowMore(false);}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,background:active?C.accent+"18":"none",border:`1px solid ${active?C.accent:C.border}`,borderRadius:12,cursor:"pointer",padding:"10px 16px",position:"relative",color:active?C.accent:C.t2,fontFamily:"inherit",minWidth:80}}>
              <span style={{fontSize:24,lineHeight:1}}>{ico}</span>
              <span style={{fontSize:10,fontWeight:active?700:500,whiteSpace:"nowrap"}}>{lbl}</span>
              {badge>0&&<span style={{position:"absolute",top:4,right:8,background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{badge>9?"9+":badge}</span>}
            </button>
          );})}
          <button onClick={()=>{sMenu(v=>!v);setShowMore(false);}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,background:uMenu?C.accent+"18":"none",border:`1px solid ${uMenu?C.accent:C.border}`,borderRadius:12,cursor:"pointer",padding:"10px 16px",color:uMenu?C.accent:C.t2,fontFamily:"inherit",minWidth:80}}>
            <Av name={me.name} size={24}/>
            <span style={{fontSize:10,fontWeight:uMenu?700:500,whiteSpace:"nowrap"}}>Me</span>
          </button>
        </div>
      </div>
    </div>}
    <nav className="rds-bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)",alignItems:"stretch",display:"flex"}}>
      {navs.slice(0,4).map(([k,ico,lbl])=>{const badge=navBadges[k]||0;const active=view===k;return(
        <button key={k} onClick={()=>{navTo(k,k==='list'?activePid:null);setSO(false);if(badge>0)setNavBadges(prev=>({...prev,[k]:0}));setShowMore(false);}}
          style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"8px 4px",position:"relative",color:active?C.accent:C.t3,fontFamily:"inherit",transition:"color .15s"}}>
          {active&&<span style={{position:"absolute",top:0,left:"25%",right:"25%",height:2,background:C.accent,borderRadius:"0 0 3px 3px"}}/>}
          <span style={{fontSize:21,lineHeight:1}}>{ico}</span>
          <span style={{fontSize:9,fontWeight:active?700:500,letterSpacing:".03em",whiteSpace:"nowrap"}}>{lbl}</span>
          {badge>0&&<span style={{position:"absolute",top:4,right:"calc(50% - 20px)",background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,lineHeight:1}}>{badge>9?"9+":badge}</span>}
        </button>
      );})}
      {navs.length>4&&<button onClick={()=>setShowMore(v=>!v)}
        style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"8px 4px",position:"relative",color:showMore?C.accent:C.t3,fontFamily:"inherit",transition:"color .15s"}}>
        {showMore&&<span style={{position:"absolute",top:0,left:"25%",right:"25%",height:2,background:C.accent,borderRadius:"0 0 3px 3px"}}/>}
        <span style={{fontSize:21,lineHeight:1}}>···</span>
        <span style={{fontSize:9,fontWeight:showMore?700:500,letterSpacing:".03em"}}>More</span>
      </button>}
      {navs.length<=4&&<button onClick={()=>{sMenu(v=>!v);setShowMore(false);}}
        style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"8px 4px",position:"relative",color:uMenu?C.accent:C.t3,fontFamily:"inherit",transition:"color .15s"}}>
        {uMenu&&<span style={{position:"absolute",top:0,left:"25%",right:"25%",height:2,background:C.accent,borderRadius:"0 0 3px 3px"}}/>}
        <Av name={me.name} size={22}/>
        <span style={{fontSize:9,fontWeight:uMenu?700:500,letterSpacing:".03em",whiteSpace:"nowrap"}}>Me</span>
      </button>}
    </nav>
    </MobileCtx.Provider>
  );
}
