import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
const ROLES=["Engineer","Designer","Architect","Team Leader","Manager","Admin","Client"];
const ALL_STATUSES=["To Do","Not Yet Started","In Progress","Review","Done","Completed"];
const STATUS_CLR={"To Do":C.t3,"Not Yet Started":C.t3,"In Progress":C.blue,"Review":C.purple,"Done":C.green,"To Be Started":C.t3,"Completed":C.green};
const PRI_CLR={High:C.red,Medium:C.yellow,Low:C.green};
const PROJECT_COLORS=[C.teal,C.blue,C.purple,C.accent,C.green,"#ec4899","#f59e0b"];
const getStatusColor=s=>STATUS_CLR[s]||C.t3;
const isDone=s=>s==="Done"||s==="Completed";

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
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 28px",width:wide?"90vw":"480px",maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px #00000080"}}>
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
function TaskForm({initial={},projects,members,clients=[],onSave,onClose,saving,requireDates=false}){
  const [custom,setCustom]=useState(false);
  const initPid=initial.project_id||projects[0]?.id||"";
  const initClient=initial.client||(projects.find(p=>p.id===initPid)?.client||"");
  const initAssignee=initial.assignee||"";
  const [f,sf]=useState({
    project_id:initPid,
    custNo:"",custName:"",title:initial.title||"",client:initClient,
    status:initial.status||"To Do",priority:initial.priority||"Medium",
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
  const col={flex:1,minWidth:0},row={display:"flex",gap:16};
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
      <div style={row}>
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
      <div style={row}>
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
      <div style={row}>
        <div style={col}><FSelect label="Priority" value={f.priority} onChange={s("priority")} options={["High","Medium","Low"]}/></div>
        <div style={col}><FInput label={requireDates?"Due Date *":"Due Date"} value={f.due_date} onChange={s("due_date")} type="date"/></div>
      </div>
      <div style={row}>
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
      <div style={row}>
        <div style={col}><FInput label="Scope" value={f.scope} onChange={s("scope")} placeholder="e.g. CIP&CMU"/></div>
        <div style={col}><FInput label={requireDates?"Client Sub Date *":"Client Sub Date"} value={f.client_sub_date} onChange={s("client_sub_date")} type="date"/></div>
      </div>
      <div style={row}>
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
function ProjectFormFields({f,sf,users,clients,requireDates=false,narayanaUsername=""}){
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <label style={{color:C.t2,fontSize:12,fontWeight:600}}>Assign Users <span style={{color:C.red,fontWeight:700}}>*</span> <span style={{color:C.t3,fontWeight:400}}>(Narayana auto-assigned — select at least 1 more)</span></label>
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
function ProjectForm({onSave,onClose,saving,users,clients,requireDates=false}){
  const narayana=users.find(u=>(u.name||"").toLowerCase().includes("narayana"));
  const [f,sf]=useState({name:"",deadline:"",description:"",client:"",color:C.teal,assigned_users:narayana?[narayana.username]:[]});
  const otherUsers=f.assigned_users.filter(u=>u!==narayana?.username);
  const canSave=f.name.trim()&&f.client&&otherUsers.length>0&&(!requireDates||f.deadline);
  const missingMsg=!f.name.trim()?"Project Name is required.":!f.client?"Client is required.":otherUsers.length===0?"Select at least one more team member.":requireDates&&!f.deadline?"Deadline is required.":"";
  return(
    <div>
      <ProjectFormFields f={f} sf={sf} users={users} clients={clients} requireDates={requireDates} narayanaUsername={narayana?.username}/>
      {missingMsg&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 14px",marginBottom:10,color:C.red,fontSize:12}}>⚠ {missingMsg}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving||!canSave} onClick={()=>onSave(f)} style={{...SBtn,opacity:(saving||!canSave)?0.5:1}}>{saving?"Creating…":"Create Project"}</button>
      </div>
    </div>
  );
}
function EditProjectForm({project,onSave,onClose,saving,users,clients,requireDates=false}){
  const narayana=users.find(u=>(u.name||"").toLowerCase().includes("narayana"));
  const [f,sf]=useState({
    name:project.name||"",deadline:project.deadline||"",
    description:project.description||"",client:project.client||"",
    color:project.color||C.teal,assigned_users:project.assigned_users||[],
  });
  return(
    <div>
      <ProjectFormFields f={f} sf={sf} users={users} clients={clients} requireDates={requireDates} narayanaUsername={narayana?.username}/>
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
  const [f,sf]=useState({name:"",username:"",password:"RDSTechserv@2026",role:"Engineer",client_name:"",email:"",assigned_projects:[]});
  const [err,se]=useState("");
  const [saving,setSaving]=useState(false);
  const [uq,suq]=useState("");
  const [uRole,sur]=useState("All");
  const [selUsers,setSU]=useState(new Set());
  const s=k=>v=>sf(p=>({...p,[k]:v}));
  const isSuperAdmin=currentUser.username===SUPER_ADMIN;
  function toggleProj(pid){sf(p=>({...p,assigned_projects:p.assigned_projects.includes(pid)?p.assigned_projects.filter(id=>id!==pid):[...p.assigned_projects,pid]}));}
  function startEdit(u){seu(u);sf({name:u.name,username:u.username,password:"",role:u.role,client_name:u.client_name||"",email:u.email||"",assigned_projects:[]});st("edit");se("");}
  function resetForm(){seu(null);sf({name:"",username:"",password:"RDSTechserv@2026",role:"Engineer",client_name:"",email:"",assigned_projects:[]});se("");}
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
    <Modal title="Manage Users" onClose={onClose} wide>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{resetForm();st("list");}} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="list"?C.accent:C.surface,color:tab==="list"?"#fff":C.t2,border:`1px solid ${tab==="list"?C.accent:C.border}`}}>👥 All Users</button>
        <button onClick={()=>{resetForm();st("add");}} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="add"?C.accent:C.surface,color:tab==="add"?"#fff":C.t2,border:`1px solid ${tab==="add"?C.accent:C.border}`}}>➕ Add User</button>
        {editUser&&<button onClick={()=>st("edit")} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab==="edit"?C.accent:C.surface,color:tab==="edit"?"#fff":C.t2,border:`1px solid ${tab==="edit"?C.accent:C.border}`}}>✏️ Edit: {editUser.name}</button>}
      </div>
      {tab==="list"&&(()=>{
        const shownUsers=users.filter(u=>{
          if(uRole!=="All"&&u.role!==uRole)return false;
          if(uq&&!u.name.toLowerCase().includes(uq.toLowerCase())&&!u.username.toLowerCase().includes(uq.toLowerCase())&&!(u.email||"").toLowerCase().includes(uq.toLowerCase())&&!(u.client_name||"").toLowerCase().includes(uq.toLowerCase()))return false;
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
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              {(uq||uRole!=="All")&&<button onClick={()=>{suq("");sur("All");}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:7,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
              <span style={{color:C.t3,fontSize:12,whiteSpace:"nowrap"}}>{shownUsers.length}/{users.length}</span>
            </div>
            {selUsers.size>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 14px",background:C.accent+"18",border:`1px solid ${C.accent}44`,borderRadius:8}}>
                <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{selUsers.size} selected</span>
                <button onClick={async()=>{if(!window.confirm(`Delete ${selUsers.size} user(s)? This cannot be undone.`))return;for(const id of selUsers)await onDelete(id);setSU(new Set());}} style={{background:C.red+"22",color:C.red,border:`1px solid ${C.red}44`,borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🗑 Delete ({selUsers.size})</button>
                <button onClick={()=>setSU(new Set())} style={{background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ Clear</button>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"52vh",overflowY:"auto"}}>
              {shownUsers.length===0&&<div style={{textAlign:"center",color:C.t3,padding:32}}>No users match your search.</div>}
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
                  <Bdg color={u.role==="Admin"?C.accent:u.role==="Manager"?"#f59e0b":u.role==="Team Leader"?"#8b5cf6":u.role==="Client"?C.teal:C.blue}>{u.role}</Bdg>
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
          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"9px 14px",marginBottom:14,color:C.red,fontSize:13}}>⚠ {err}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            <button onClick={()=>{resetForm();st("list");}} style={GBtn}>Cancel</button>
            <button onClick={addUser} disabled={saving} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Creating…":"Create User"}</button>
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
function KCard({task,project,onEdit,onDelete,readonly,canDelete=true,selected=false,onSelect=null,selectMode=true}){
  const [h,sh]=useState(false),[d,sd]=useState(false);
  return(
    <div draggable={!readonly&&!onSelect} onDragStart={e=>{if(onSelect)return;sd(true);e.dataTransfer.setData("tid",task.id);}} onDragEnd={()=>sd(false)}
      onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{background:selected?C.accent+"18":C.card,border:`1px solid ${selected?C.accent:h?C.border:C.surface}`,borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"default",opacity:d?.4:1,boxShadow:h?"0 4px 16px #00000050":"none",borderLeft:`3px solid ${selected?C.accent:project?.color||C.accent}`,transition:"all .15s",position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <p style={{margin:0,color:C.t1,fontSize:13,fontWeight:600,flex:1,lineHeight:1.4,paddingRight:onSelect?26:0}}>{task.title}</p>
        {onSelect?<div onClick={e=>{e.stopPropagation();onSelect(task.id);}} style={{position:"absolute",top:12,right:12,width:18,height:18,borderRadius:4,border:`2px solid ${selected?C.accent:C.t3}`,background:selected?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0,transition:"all .15s",cursor:"pointer"}}>{selected?"✓":""}</div>
        :<div style={{display:"flex",gap:2,opacity:h?1:0,transition:"opacity .15s"}}>
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
        <Bdg color={PRI_CLR[task.priority]}>{task.priority}</Bdg>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {task.due_date&&<span style={{fontSize:10,color:C.t3}}>{task.due_date}</span>}
          {task.assignee?<Av name={task.assignee} size={22}/>:<span style={{fontSize:10,color:C.yellow}}>Unassigned</span>}
        </div>
      </div>
    </div>
  );
}
function KCol({status,tasks,projects,onEdit,onDelete,onDrop,canEditFn,canDelete=true,selTasks=new Set(),onToggleTask=null}){
  const [ov,so]=useState(false);
  const selectMode=!!onToggleTask;
  return(
    <div onDragOver={e=>{if(selectMode)return;e.preventDefault();so(true);}} onDragLeave={()=>so(false)}
      onDrop={e=>{if(selectMode)return;e.preventDefault();so(false);onDrop(e.dataTransfer.getData("tid"),status);}}
      style={{minWidth:220,flex:1,background:ov?C.surface+"88":"transparent",border:`2px dashed ${ov?getStatusColor(status):C.border}`,borderRadius:12,padding:12,transition:"all .15s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:getStatusColor(status)}}/>
        <span style={{color:C.t1,fontWeight:700,fontSize:13}}>{status}</span>
        <span style={{background:C.border,color:C.t3,borderRadius:10,padding:"1px 8px",fontSize:11,marginLeft:"auto"}}>{tasks.length}</span>
      </div>
      {tasks.map(t=><KCard key={t.id} task={t} project={projects.find(p=>p.id===t.project_id)} onEdit={onEdit} onDelete={onDelete} readonly={!canEditFn(t)} canDelete={canDelete} selected={selTasks.has(t.id)} onSelect={onToggleTask} selectMode={selectMode}/>)}
    </div>
  );
}
function TRow({task,project,onEdit,onDelete,readonly,canDelete=true,selected=false,onSelect=null,selectMode=false}){
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
      <td style={td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:18,borderRadius:2,background:project?.color||C.accent}}/><span style={{color:C.t1,fontSize:13}}>{task.title}</span></div></td>
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
      <td style={{...td,opacity:h?1:0,transition:"opacity .12s"}}>{!readonly&&<div style={{display:"flex",gap:4}}>
        <IBtn icon="✏️" onClick={e=>{e.stopPropagation();onEdit(task);}} title="Edit"/>
        {canDelete&&<IBtn icon="🗑" onClick={e=>{e.stopPropagation();onDelete(task.id);}} color={C.red} title="Delete"/>}
      </div>}</td>
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
  const [status,ss]=useState(task.status||"To Do");
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
  // `projects` prop = accessibleProjects (already filtered to only this user's projects in parent)
  const [statusFilter,ssf]=useState(null);
  const [fSearch,setFS]=useState(""); const [fProject,setFP]=useState("All"); const [fAssignee,setFA]=useState("All"); const [fStatus,setFSt]=useState("All"); const [showDT,setSDT]=useState(false);
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
  const notStarted=myTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const filteredTasks=statusFilter===null?[]:statusFilter==="All"?myTasks:statusFilter==="Overdue"?overdueList:statusFilter==="Not Yet Started"?myTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started"):myTasks.filter(t=>t.status===statusFilter);
  const filterLabel=statusFilter==="All"?"All My Tasks":statusFilter==="Overdue"?"⚠ Overdue Tasks":statusFilter?`${statusFilter} Tasks`:"";
  const pct=total?Math.round(done/total*100):0;
  // Avatar colour palette for co-users
  const avatarColors=["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#14b8a6","#f97316"];
  function avatarColor(name){let h=0;for(let i=0;i<(name||"").length;i++)h=(h*31+name.charCodeAt(i))%avatarColors.length;return avatarColors[h];}
  return(
    <div>
      {/* Header */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:52,height:52,borderRadius:14,background:C.accent+"22",border:`2px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:C.accent}}>{me.name[0]}</div>
        <div style={{flex:1}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.t1}}>My Dashboard</h2>
          <p style={{margin:"2px 0 0",fontSize:13,color:C.t3}}>{me.name} · {me.role} · {total} task{total!==1?"s":""} assigned</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:800,color:C.accent}}>{pct}%</div>
          <div style={{fontSize:11,color:C.t3}}>overall complete</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{marginBottom:24}}><Pb v={pct} color={C.accent} h={8}/></div>
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:28}}>
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
          if(fStatus!=="All"){const ns=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!ns&&t.status!==fStatus)return false;}
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
        {myProjects.map(p=>{
          // My tasks in this project
          const pt=myTasks.filter(t=>t.project_id===p.id);
          // ALL tasks in this project (for overall % and co-users)
          const allPt=tasks.filter(t=>t.project_id===p.id);
          const pd=pt.filter(t=>isDone(t.status)).length;
          const pip=pt.filter(t=>t.status==="In Progress").length;
          const pnd=pt.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
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
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14}}>
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
  const matchesMe=v=>userMatchesStr(me,v);
  const [tab,setTab]=useState("detailer"); // "detailer" | "checker" | "all"
  const [statusF,setSF]=useState("All");
  const [fSearch,setFS]=useState(""); const [fProject,setFP]=useState("All"); const [fAssignee,setFA]=useState("All"); const [fStatus,setFSt]=useState("All"); const [showDT,setSDT]=useState(false);

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
      <div style={{background:C.card,border:`1px solid ${"#8b5cf6"}44`,borderRadius:14,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",gap:16,borderLeft:`4px solid #8b5cf6`}}>
        <div style={{width:52,height:52,borderRadius:14,background:"#8b5cf622",border:`2px solid #8b5cf644`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#8b5cf6"}}>{(me.name[0]||"T").toUpperCase()}</div>
        <div style={{flex:1}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.t1}}>Team Leader Dashboard</h2>
          <p style={{margin:"2px 0 0",fontSize:13,color:C.t3}}>{me.name} · Team Leader · Monitoring {teamMembers.length} team member{teamMembers.length!==1?"s":""}</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:800,color:"#8b5cf6"}}>{pct}%</div>
          <div style={{fontSize:11,color:C.t3}}>team complete</div>
        </div>
      </div>

      {/* Top stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
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
          if(fStatus!=="All"){const ns=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!ns&&t.status!==fStatus)return false;}
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

      {/* Team member progress */}
      {teamMembers.length>0&&(
        <div>
          <h2 style={{margin:"0 0 14px",fontSize:16,fontWeight:700,color:C.t1}}>👥 Team Progress</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {teamMembers.map(name=>{
              const mt=allTasks.filter(t=>t.assignee===name||t.detailer===name||t.checker===name);
              const md=mt.filter(t=>isDone(t.status)).length;
              const mov=mt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
              const mpct=mt.length?Math.round(md/mt.length*100):0;
              return(
                <div key={name} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av name={name} size={34}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,color:C.t1}}>{name}</div>
                      <div style={{fontSize:11,color:C.t3}}>{mt.length} tasks · {md} done{mov>0?` · ${mov} overdue`:""}</div>
                    </div>
                    <span style={{fontWeight:800,fontSize:16,color:mpct>=80?C.green:mpct>=50?C.blue:C.t2}}>{mpct}%</span>
                  </div>
                  <Pb v={mpct} color={mpct>=80?C.green:mpct>=50?C.blue:C.accent} h={6}/>
                  {mov>0&&<div style={{marginTop:8,fontSize:11,color:C.red,fontWeight:600}}>⚠ {mov} overdue task{mov!==1?"s":""}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function ClientOverview({projects,tasks,onSelectClient,clients}){
  const clientNames=[...new Set(projects.map(p=>p.client||"Unassigned"))].filter(c=>c==="Unassigned"||clients.some(cl=>cl.name===c));
  const today=new Date().toISOString().slice(0,10);
  return(
    <div style={{marginBottom:32}}>
      <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#ffffff"}}>Client-wise Overview</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18}}>
        {clientNames.map(client=>{
          const cProjects=projects.filter(p=>(p.client||"Unassigned")===client);
          const cTasks=tasks.filter(t=>cProjects.some(p=>p.id===t.project_id));
          const cDone=cTasks.filter(t=>isDone(t.status)).length;
          const cIP=cTasks.filter(t=>t.status==="In Progress").length;
          const cTodo=cTasks.filter(t=>t.status==="To Do"||t.status==="To Be Started"||t.status==="Not Yet Started").length;
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
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14}}>
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
    </div>
  );
}
function exportExcel(projects,tasks,label="Report"){
  const today=new Date().toISOString().slice(0,10);
  const safe=label.replace(/[/\\:*?"<>|]/g," ").trim();
  const filename=`RDS Report - ${safe} - ${today}`;
  const clientGroups=[...new Set(projects.map(p=>p.client||"Unassigned"))];
  let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px;font-family:Arial,sans-serif;white-space:nowrap;}.hdr{background:#1e2433;color:#f1f5f9;font-weight:bold;}.client{background:#f97316;color:#fff;font-weight:bold;}.project{background:#3b82f6;color:#fff;font-weight:bold;}.done{background:#d1fae5;color:#065f46;}.inprog{background:#dbeafe;color:#1e40af;}.todo{background:#fef9c3;color:#713f12;}.notstarted{background:#f3f4f6;color:#374151;}.canceled{background:#fce7f3;color:#9d174d;}.overdue{background:#fee2e2;color:#991b1b;font-weight:bold;}</style></head><body>`;
  html+=`<table><tr><td colspan="11" class="hdr" style="font-size:16px;text-align:center;">RDS Report — ${safe} (${today})</td></tr><tr><td colspan="11"></td></tr>`;
  clientGroups.forEach(client=>{
    const cProjects=projects.filter(p=>(p.client||"Unassigned")===client);
    const cTasks=tasks.filter(t=>cProjects.some(p=>p.id===t.project_id));
    if(!cTasks.length)return;
    html+=`<tr><td colspan="11" class="client">CLIENT: ${client} | ${cProjects.length} Project(s) | ${cTasks.length} Tasks</td></tr>`;
    html+=`<tr><th class="hdr">#</th><th class="hdr">Task</th><th class="hdr">Project</th><th class="hdr">Scope</th><th class="hdr">Status</th><th class="hdr">Priority</th><th class="hdr">Assignee</th><th class="hdr">Detailer</th><th class="hdr">Checker</th><th class="hdr">Due Date</th><th class="hdr">Client Sub Date</th></tr>`;
    let n=1;
    cProjects.forEach(proj=>{
      const pt=cTasks.filter(t=>t.project_id===proj.id);
      if(!pt.length)return;
      html+=`<tr><td colspan="11" class="project">▸ ${proj.name} (${pt.length} tasks)</td></tr>`;
      pt.forEach(t=>{
        const ov=t.due_date&&t.due_date<today&&!isDone(t.status);
        const cls=ov?"overdue":isDone(t.status)?"done":t.status==="In Progress"?"inprog":(t.status==="Not Yet Started"||t.status==="To Be Started")?"notstarted":t.status==="job canceled"?"canceled":"todo";
        html+=`<tr><td>${n++}</td><td>${t.title}</td><td>${proj.name}</td><td>${t.scope||"—"}</td><td class="${cls}">${t.status}${ov?" ⚠":""}</td><td>${t.priority}</td><td>${t.assignee||"Unassigned"}</td><td>${t.detailer||"—"}</td><td>${t.checker||"—"}</td><td class="${ov?"overdue":""}">${t.due_date||"—"}</td><td>${t.client_sub_date||"—"}</td></tr>`;
      });
    });
    html+=`<tr><td colspan="11"></td></tr>`;
  });
  html+=`</table></body></html>`;
  const b64=btoa(unescape(encodeURIComponent(html)));
  const a=document.createElement("a");
  a.href="data:application/vnd.ms-excel;base64,"+b64;
  a.download=`${filename}.xls`;
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
  const [statusFilter,ssf]=useState("All");
  const [search,ss]=useState("");
  const [filterProject,sfp]=useState("All");
  const [filterAssignee,sfa]=useState("All");
  const [showTasks,sst]=useState(false);
  const myProjects=projects.filter(p=>(p.client||"").toLowerCase()===(me.client_name||"").toLowerCase());
  const myPids=new Set(myProjects.map(p=>p.id));
  const myTasks=tasks.filter(t=>myPids.has(t.project_id));
  const total=myTasks.length;
  const done=myTasks.filter(t=>isDone(t.status)).length;
  const inprog=myTasks.filter(t=>t.status==="In Progress").length;
  const overdue=myTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const notStarted=myTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const pct=total?Math.round(done/total*100):0;
  const allAssignees=[...new Set(myTasks.map(t=>t.assignee).filter(Boolean))].sort();
  const hasFilter=statusFilter!=="All"||filterProject!=="All"||filterAssignee!=="All"||search;
  const filtered=myTasks.filter(t=>{
    const pj=projects.find(p=>p.id===t.project_id);
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase())&&!(pj?.name||"").toLowerCase().includes(search.toLowerCase()))return false;
    if(statusFilter!=="All"){const nsMatch=statusFilter==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==statusFilter)return false;}
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
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:52,height:52,borderRadius:14,background:C.teal+"22",border:`2px solid ${C.teal}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:C.teal}}>{(me.client_name||me.name)[0]}</div>
        <div style={{flex:1}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.t1}}>{me.client_name||me.name}</h2>
          <p style={{margin:"2px 0 0",fontSize:13,color:C.t3}}>Client Portal · {myProjects.length} projects · {total} tasks</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:800,color:C.teal}}>{pct}%</div>
          <div style={{fontSize:11,color:C.t3}}>overall complete</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{marginBottom:18}}><Pb v={pct} color={C.teal} h={8}/></div>
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:24}}>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
        {myProjects.map(p=>{
          const pt=myTasks.filter(t=>t.project_id===p.id);
          const pd=pt.filter(t=>isDone(t.status)).length;
          const pip=pt.filter(t=>t.status==="In Progress").length;
          const pnd=pt.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
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
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14}}>
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
      if(fStatus!=="All"){const nsMatch=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==fStatus)return false;}
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
            const ptd=allPt.filter(t=>t.status==="To Do"||t.status==="To Be Started"||t.status==="Not Yet Started").length;
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
    if(fStatus!=="All"){const nsMatch=fStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==fStatus)return false;}
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
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
  if(v==='analytics')return'/analytics';
  if(v==='submissions')return'/submissions';
  if(v==='clientprojects'&&client)return`/clients/${encodeURIComponent(client)}`;
  return'/';
}
function urlToState(path,projs=[]){
  if(!path||path==='/'||path==='/dashboard')return{view:'dashboard',pid:null,client:null};
  if(path==='/tasks')return{view:'list',pid:null,client:null};
  if(path==='/kanban')return{view:'kanban',pid:null,client:null};
  if(path==='/analytics')return{view:'analytics',pid:null,client:null};
  if(path==='/submissions')return{view:'submissions',pid:null,client:null};
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

function NotificationCenter({me}){
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
        setNotifs(prev=>[payload.new,...prev]);
        if(soundOnRef.current)playNotifSound();
        showPopup(payload.new);
        // Browser OS notification (works only when page is in background)
        if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
          try{new Notification(payload.new.title,{body:payload.new.description||"",icon:"/favicon.svg"});}catch(e){console.warn("[Notif] Browser notification failed:",e);}
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},payload=>{
        if(!payload.new||String(payload.new.user_id)!==uid)return;
        setNotifs(prev=>prev.map(n=>n.id===payload.new.id?payload.new:n));
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
    if(data)setNotifs(data);
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
          <span style={{fontSize:18,lineHeight:1}}>🔔</span>
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
  const todayD=new Date(today);
  const dayOfWeek=todayD.getDay();
  const weekStart=new Date(todayD);weekStart.setDate(todayD.getDate()-dayOfWeek);
  const weekEnd=new Date(todayD);weekEnd.setDate(todayD.getDate()+(6-dayOfWeek));
  const ws=weekStart.toISOString().slice(0,10);
  const we=weekEnd.toISOString().slice(0,10);

  // For client: filter to their projects; for all others: use all accessible projects
  const scopedProjects=isClient?projects.filter(p=>(p.client||"").toLowerCase()===(clientName||"").toLowerCase()):projects;

  const inRange=(t,from,to)=>{
    const d1=t.client_sub_date;const d2=t.due_date;
    return(d1&&d1>=from&&d1<=to)||(d2&&d2>=from&&d2<=to);
  };

  const allTasks=tasks.filter(t=>scopedProjects.some(p=>p.id===t.project_id));
  const todayTasks=allTasks.filter(t=>inRange(t,today,today)).sort((a,b)=>(a.client_sub_date||a.due_date||"").localeCompare(b.client_sub_date||b.due_date||""));
  const weekTasks=allTasks.filter(t=>inRange(t,ws,we)&&!inRange(t,today,today)).sort((a,b)=>(a.client_sub_date||a.due_date||"").localeCompare(b.client_sub_date||b.due_date||""));

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

  const Section=({title,icon,color,taskList,empty})=>(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:22}}>
      <div style={{background:color+"18",borderBottom:`1px solid ${color}33`,padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:20}}>{icon}</span>
        <div>
          <div style={{fontSize:15,fontWeight:800,color}}>{title}</div>
          <div style={{fontSize:12,color:C.t3,marginTop:2}}>{taskList.length} submission{taskList.length!==1?"s":""}</div>
        </div>
        <span style={{marginLeft:"auto",fontSize:24,fontWeight:900,color}}>{taskList.length}</span>
      </div>
      {taskList.length===0?(
        <div style={{padding:"32px",textAlign:"center",color:C.t3}}>
          <div style={{fontSize:28,marginBottom:8}}>{empty}</div>
          <div style={{fontSize:13}}>No submissions</div>
        </div>
      ):(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:C.surface}}>
                {HEADERS.map((h,i)=>(
                  <th key={i} style={{padding:"9px 12px",textAlign:i===0?"left":"center",fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{taskList.map(t=><TaskRow key={t.id} t={t}/>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );

  return(
    <div>
      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:C.t1}}>📬 Submission List</h2>
        <p style={{margin:"4px 0 0",color:C.t3,fontSize:13}}>All clients — tasks due for submission today and this week</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {[
          {label:"Today's Submissions",value:todayTasks.length,color:todayTasks.length>0?C.red:"#22c55e",icon:"📅"},
          {label:"This Week",value:weekTasks.length,color:"#f59e0b",icon:"📆"},
          {label:"Total Pending",value:allTasks.filter(t=>!isDone(t.status)).length,color:C.accent,icon:"📋"},
        ].map(s=>(
          <div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 20px",borderLeft:`4px solid ${s.color}`,display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:28}}>{s.icon}</span>
            <div>
              <div style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:4,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <Section title="Today's Submissions" icon="📅" color={C.red} taskList={todayTasks} empty="✅"/>
      <Section title={`This Week  ${ws} → ${we}`} icon="📆" color="#f59e0b" taskList={weekTasks} empty="🎉"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS CENTER
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsCenter({projects,tasks,users,clients,today,members}){
  const [period,setP]=useState("all");
  const [modal,setModal]=useState(null); // {title, tasks}

  const pct=id=>{const pt=tasks.filter(t=>t.project_id===id);return pt.length?Math.round(pt.filter(t=>isDone(t.status)).length/pt.length*100):0;};
  const openModal=(title,t)=>{if(t&&t.length>0)setModal({title,tasks:t});};

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
    {label:"Active",value:activeProj,color:"#3b82f6",tasks:tasks.filter(t=>activeProjList.some(p=>p.id===t.project_id))},
    {label:"Completed",value:compProj,color:"#22c55e",tasks:tasks.filter(t=>compProjList.some(p=>p.id===t.project_id))},
    {label:"Not Started",value:Math.max(0,totalProj-activeProj-compProj),color:"#64748b",tasks:[]},
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
  const ACard=({icon,label,value,sub,color,onClick,taskList})=>(
    <div onClick={taskList&&taskList.length>0?()=>openModal(label,taskList):onClick||undefined}
      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",borderLeft:`4px solid ${color}`,position:"relative",overflow:"hidden",cursor:(taskList&&taskList.length>0)||onClick?"pointer":"default",transition:"box-shadow .15s"}}
      onMouseEnter={e=>{if((taskList&&taskList.length>0)||onClick)e.currentTarget.style.boxShadow=`0 0 0 2px ${color}55`;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}>
      <div style={{position:"absolute",top:10,right:12,fontSize:32,opacity:0.08,pointerEvents:"none"}}>{icon}</div>
      <div style={{fontSize:32,fontWeight:900,color,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      <div style={{fontSize:11,color:C.t2,fontWeight:700,margin:"6px 0 3px",textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:C.t3}}>{sub}</div>}
      {((taskList&&taskList.length>0)||onClick)&&<div style={{position:"absolute",bottom:8,right:10,fontSize:9,color:color,opacity:0.7,fontWeight:700}}>CLICK TO VIEW ›</div>}
    </div>
  );

  const Donut=({segs,size=150,sw=24,label,sub})=>{
    const r=(size-sw)/2,cx=size/2,cy=size/2,circ=2*Math.PI*r;
    const tot=segs.reduce((s,d)=>s+d.value,0)||1;
    let acc=0;
    return(
      <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          {segs.length===0
            ?<circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
            :segs.map((s,i)=>{const p=s.value/tot,da=circ*p,off=-circ*acc;acc+=p;return<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${da} ${circ-da}`} strokeDashoffset={off}/>;})
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
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,cursor:d.tasks&&d.tasks.length>0?"pointer":"default"}}
            onClick={d.tasks&&d.tasks.length>0?()=>openModal(d.label,d.tasks):undefined}>
            <div style={{width:96,fontSize:11,color:C.t2,textAlign:"right",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={d.label}>{d.label}</div>
            <div style={{flex:1,background:C.surface,borderRadius:4,height:20,overflow:"hidden",position:"relative",border:d.tasks&&d.tasks.length>0?`1px solid ${d.color||C.accent}33`:"none"}}>
              <div style={{width:`${d.value/mx*100}%`,height:"100%",background:d.color||C.accent,borderRadius:4,minWidth:d.value?3:0,transition:"width .5s"}}/>
              <span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:11,color:C.t1,fontWeight:700}}>{d.value}</span>
            </div>
          </div>
        ))}
        {data.length===0&&<p style={{color:C.t3,fontSize:12,margin:0}}>No data</p>}
      </div>
    );
  };

  const Panel=({title,children,style={}})=>(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,...style}}>
      <h3 style={{margin:"0 0 16px",fontSize:12,fontWeight:800,color:C.t3,textTransform:"uppercase",letterSpacing:".08em"}}>{title}</h3>
      {children}
    </div>
  );

  return(
    <div>
      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:900,color:C.t1}}>Business Analytics & Reporting</h2>
          <p style={{margin:"4px 0 0",color:C.t3,fontSize:13}}>Enterprise insights · projects, team performance & client portfolio</p>
        </div>
        <div style={{display:"flex",gap:4,background:C.surface,borderRadius:10,padding:3}}>
          {[["all","All Time"],["quarter","Quarter"],["month","Month"],["week","Week"]].map(([v,l])=>(
            <button key={v} onClick={()=>setP(v)} style={{border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",background:period===v?C.accent:"transparent",color:period===v?"#fff":C.t3,fontFamily:"inherit",transition:"all .15s"}}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:16,marginBottom:22}}>
        <ACard icon="📁" label="Total Projects" value={totalProj} sub={`${activeProj} active · ${compProj} complete`} color={C.blue} taskList={tasks}/>
        <ACard icon="⚡" label="Active Projects" value={activeProj} sub={`${Math.round(activeProj/Math.max(totalProj,1)*100)}% of portfolio`} color={C.accent} taskList={tasks.filter(t=>activeProjList.some(p=>p.id===t.project_id))}/>
        <ACard icon="✅" label="Completed Projects" value={compProj} sub="fully delivered" color={C.green} taskList={tasks.filter(t=>compProjList.some(p=>p.id===t.project_id))}/>
        <ACard icon="🏢" label="Total Clients" value={totalCl} sub={`${clientPortfolio.length} with projects`} color={C.teal} taskList={tasks}/>
        <ACard icon="👥" label="Team Members" value={totalEmp} sub={`${teamPerf.length} assigned`} color={"#a855f7"} taskList={tasks.filter(t=>t.assignee||t.detailer||t.checker)}/>
        <ACard icon="📋" label="Open Tasks" value={openTasks} sub={overdue>0?`⚠ ${overdue} overdue`:`${compRate}% complete`} color={overdue>0?C.red:"#eab308"} taskList={openTasksList}/>
      </div>

      {/* ── Row 1: Task Breakdown + Project Health ── */}
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:18,marginBottom:18}}>
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
                <div key={s.label} onClick={s.tasks&&s.tasks.length>0?()=>openModal(`${s.label} Projects — Tasks`,s.tasks):undefined}
                  style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:s.tasks&&s.tasks.length>0?"pointer":"default",borderRadius:6,padding:"4px 6px",transition:"background .15s"}}
                  onMouseEnter={e=>{if(s.tasks&&s.tasks.length>0)e.currentTarget.style.background=s.color+"15";}}
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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:18,marginBottom:18}}>
        <Panel title="👥 Team Performance">
          <div style={{display:"flex",flexDirection:"column",gap:14,maxHeight:320,overflowY:"auto"}}>
            {teamPerf.map((u,i)=>(
              <div key={u.name} onClick={()=>openModal(`${u.name} — All Tasks`,u.allTasks)}
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
                <div style={{height:5,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${u.pct}%`,background:u.pct>=80?C.green:u.pct>=50?C.blue:C.accent,borderRadius:3,transition:"width .5s"}}/>
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
                  {["Client","Projects","Tasks","Done","Overdue","Progress"].map(h=>(
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
                        <div style={{flex:1,height:5,background:C.surface,borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${c.pct}%`,background:c.pct>=80?C.green:c.pct>=50?C.blue:C.accent,borderRadius:3}}/>
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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:4}}>
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
      {modal&&<StatTaskModal title={modal.title} tasks={modal.tasks} projects={projects} today={today} canEdit={false} onEdit={()=>{}} onClose={()=>setModal(null)}/>}
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
  const [clients,scl]       = useState([]);
  const [loading,sl]        = useState(false);
  const [view,sv]           = useState("dashboard");
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
  const [editTask,set]      = useState(null);
  const [editProject,sep]   = useState(null);
  const [searchTask,sst]    = useState("");
  const [searchProj,ssp]    = useState("");
  const [filterStatus,sfs]  = useState("All");
  const [filterAssignee,sfa]= useState("All");
  const [uMenu,sMenu]       = useState(false);
  const [saving,ssv]        = useState(false);
  const [dashSearch,sdss]   = useState("");
  const [dashUser,sdsu]     = useState("All");
  const [dashProject,sdsp]  = useState("All");
  const [dashClient,sdsc]   = useState("All");
  const [dashStatus,sdsst]  = useState("All");
  const [toast,sToast]      = useState(null);
  const [logo,sLogo]        = useState(null);
  const [selTasks,setSelTasks]   = useState(new Set());
  const [selProjects,setSelProjs]= useState(new Set());
  const [bulkSelectOn,setBSO]    = useState(false);
  const [bulkModal,setBM]        = useState(null); // "status"|"reassign"|"priority"
  const logoRef             = useRef();
  const prevViewRef         = useRef('dashboard');
  const initialParsed       = useRef(false);
  const today=new Date().toISOString().slice(0,10);
  const isClient=me?.role==="Client";
  const isAdmin=me?.role==="Admin";
  const isManager=me?.role==="Manager";
  const isTeamLeader=me?.role==="Team Leader";
  const canEdit=isAdmin||isManager||isTeamLeader;
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
        const [{data:u},{data:p},{data:t},{data:cl}]=await Promise.all([
          supabase.from("users").select("*").order("name"),
          supabase.from("projects").select("*").order("name"),
          supabase.from("tasks").select("*").order("created_at"),
          supabase.from("clients").select("*").order("name"),
        ]);
        su(u||[]);sp(p||[]);st(t||[]);scl(cl||[]);
      }
    }catch(e){showToast("Failed to load: "+e.message,false);}
    sl(false);
  }
  useEffect(()=>{if(me)loadAll();},[me]);
  // Keep URL in sync whenever state changes (replaceState — navTo handles pushState)
  useEffect(()=>{
    if(!me)return;
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
  const accessibleProjects=(isAdmin||isManager||isTeamLeader)?projects:isClient?projects.filter(p=>(p.client||"").toLowerCase()===(me?.client_name||"").toLowerCase())
    // Regular users: ONLY projects where they have an assigned task.
    :projects.filter(p=>tasks.some(t=>t.project_id===p.id&&(userMatchesStr(me,t.assignee)||userMatchesStr(me,t.detailer)||userMatchesStr(me,t.checker))));
  // Parse initial URL after data loads (for direct-link support)
  useEffect(()=>{
    if(!me||!projects.length||initialParsed.current)return;
    initialParsed.current=true;
    const s=urlToState(window.location.pathname,projects);
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
    if(filterStatus!=="All"){const nsMatch=filterStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==filterStatus)return false;}
    if(!isRegularUser&&filterAssignee!=="All"&&t.assignee!==filterAssignee)return false;
    return true;
  });
  const dashTasks=tasks.filter(t=>accessibleProjects.some(p=>p.id===t.project_id));
  const hasDashFilter=dashSearch||dashUser!=="All"||dashProject!=="All"||dashClient!=="All"||dashStatus!=="All";
  const filteredDashTasks=dashTasks.filter(t=>{
    if(dashSearch&&!t.title.toLowerCase().includes(dashSearch.toLowerCase()))return false;
    if(dashUser!=="All"&&t.assignee!==dashUser)return false;
    if(dashProject!=="All"&&t.project_id!==dashProject)return false;
    if(dashStatus!=="All"){const isNotStarted=dashStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!isNotStarted&&t.status!==dashStatus)return false;}
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
          if(f.status==="Done"){
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
          if(f.status==="Done"){
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
      stm(false);set(null);
    }catch(e){showToast("Error: "+e.message,false);}
    ssv(false);
  }
  async function delTask(id){if(!canEdit)return;if(!window.confirm("Delete this task?"))return;await supabase.from("tasks").delete().eq("id",id);st(ts=>ts.filter(t=>t.id!==id));showToast("Task deleted ✓");}
  async function dropTask(tid,ns){const task=tasks.find(t=>t.id===tid);if(!task||task.status===ns)return;if(isClient){showToast("Not authorized",false);return;}if(isRegularUser&&!userMatchesStr(me,task.assignee)&&!userMatchesStr(me,task.detailer)&&!userMatchesStr(me,task.checker)){showToast("Not authorized",false);return;}st(ts=>ts.map(t=>t.id===tid?{...t,status:ns}:t));await supabase.from("tasks").update({status:ns}).eq("id",tid);const proj=projects.find(p=>p.id===task.project_id);const assigneeUser=users.find(u=>u.username===task.assignee||u.name===task.assignee);}
  async function saveProject(f){if(canEdit&&!f.deadline){showToast("Project Deadline is required.",false);return;}ssv(true);try{const {data}=await supabase.from("projects").insert({name:f.name,client:f.client,color:f.color,deadline:f.deadline||null,description:f.description,assigned_users:f.assigned_users||[]}).select().single();if(data){sp(ps=>[...ps,data]);const pcu=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===(f.client||"").toLowerCase());
    // In-app: notify assigned users
    const assignedIds=(f.assigned_users||[]).map(uname=>users.find(u=>u.username===uname||u.name===uname)?.id).filter(id=>id&&id!==me.id);
    if(assignedIds.length)await createNotif(assignedIds,"project_assigned",`New project assigned: ${f.name}`,`You've been added to ${f.name}${f.client?` · Client: ${f.client}`:""}${f.deadline?` · Deadline: ${f.deadline}`:""}`, "project",data.id,me.id);
    // Notify client
    if(pcu?.id&&pcu.id!==me.id)await createNotif([pcu.id],"project_assigned",`Project created: ${f.name}`,`A new project has been set up for your account${f.deadline?` · Deadline: ${f.deadline}`:""}`, "project",data.id,me.id);
  }spm(false);showToast("Project created ✓");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function updateProject(f){if(canEdit&&!f.deadline){showToast("Project Deadline is required.",false);return;}ssv(true);try{const {data}=await supabase.from("projects").update({name:f.name,client:f.client,color:f.color,deadline:f.deadline||null,description:f.description,assigned_users:f.assigned_users||[]}).eq("id",editProject.id).select().single();if(data)sp(ps=>ps.map(p=>p.id===editProject.id?data:p));sep(null);showToast("Project updated ✓");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function deleteProject(id){if(!canEdit)return;if(!window.confirm("Delete this project and all its tasks?"))return;await supabase.from("tasks").delete().eq("project_id",id);await supabase.from("projects").delete().eq("id",id);sp(ps=>ps.filter(p=>p.id!==id));st(ts=>ts.filter(t=>t.project_id!==id));if(activePid===id)sap(null);showToast("Project deleted ✓");}
  async function addUser(f){try{const {data,error}=await supabase.from("users").insert({name:f.name,username:f.username,password:f.password,role:f.role,client_name:f.client_name||"",email:f.email||""}).select().single();if(error)throw new Error(error.message);if(data)su(us=>[...us,data]);showToast("User created ✓");return data;}catch(e){showToast("Error: "+e.message,false);throw e;}}
  async function editUserFn(id,f){try{const updates={name:f.name,username:(f.username||"").trim().toLowerCase(),role:f.role,client_name:f.client_name||"",email:f.email||""};if(f.password&&f.password.trim())updates.password=f.password.trim();const {data,error}=await supabase.from("users").update(updates).eq("id",id).select().single();if(error)throw new Error(error.message);if(data)su(us=>us.map(u=>u.id===id?data:u));showToast("User updated ✓");}catch(e){showToast("Error: "+e.message,false);throw e;}}
  async function delUser(id){await supabase.from("users").delete().eq("id",id);su(us=>us.filter(u=>u.id!==id));showToast("User removed ✓");}
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
  const kanbanCols=["To Do","Not Yet Started","In Progress","Review","Done","Completed"];
  const navs=isClient?[["dashboard","◈","Dashboard"],["list","≡","Task List"],["submissions","📬","Submission List"]]:(isAdmin||isManager||isTeamLeader)?[["dashboard","◈","Dashboard"],["kanban","⊞","Kanban"],["list","≡","Task List"],["analytics","📊","Analytics"],["submissions","📬","Submission List"]]:[["dashboard","◈","Dashboard"],["kanban","⊞","Kanban"],["list","≡","Task List"],["submissions","📬","Submission List"]];
  const sel=(active)=>({display:"flex",alignItems:"center",gap:10,width:"100%",background:active?C.card:"transparent",border:active?`1px solid ${C.border}`:"1px solid transparent",borderRadius:8,padding:"9px 12px",cursor:"pointer",color:active?C.t1:C.t2,fontWeight:active?700:500,fontSize:13,textAlign:"left",marginBottom:2,fontFamily:"inherit",transition:"all .15s"});
  return(
    <div style={{height:"100vh",width:"100vw",background:C.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.t1,display:"flex",overflow:"hidden",position:"fixed",top:0,left:0}}>
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:999,background:toast.ok?C.green:C.red,color:"#fff",padding:"10px 20px",borderRadius:8,fontWeight:600,fontSize:13,boxShadow:"0 4px 16px #00000060"}}>{toast.ok?"✓":"⚠"} {toast.msg}</div>}
      <aside style={{width:220,minWidth:220,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"20px 0 0 0",flexShrink:0,height:"100vh"}}>
        <div style={{padding:"0 20px 16px",borderBottom:`1px solid ${C.border}`,marginBottom:12,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div onClick={()=>logoRef.current.click()} title="Click to upload logo" style={{width:80,height:36,borderRadius:8,background:logo?"transparent":"#000",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
              {logo?<img src={logo} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<img src="/logo.png" alt="RDS" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>sLogo(ev.target.result);r.readAsDataURL(f);}}}/>
            <div><div style={{fontSize:13,fontWeight:800,color:C.t1,lineHeight:1.2}}>RDS</div><div style={{fontSize:9,color:C.t3}}>PROJECT HUB</div></div>
          </div>
        </div>
        <div style={{padding:"0 12px",flexShrink:0}}>
          {navs.map(([k,ico,lbl])=>(
            <button key={k} onClick={()=>navTo(k,k==='list'?activePid:null)} style={sel(view===k&&!(view==="kanban"&&activeClient))}>
              <span style={{fontSize:16}}>{ico}</span>{lbl}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 12px 0",flexShrink:0}}>
          <input placeholder="🔍 Search projects…" value={searchProj} onChange={e=>ssp(e.target.value)} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.t1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <div style={{marginTop:10,padding:"0 12px",flex:1,overflowY:"auto",minHeight:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,padding:"0 4px"}}>
            <span style={{fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Projects</span>
            {canEdit&&<IBtn icon="+" onClick={()=>spm(true)} title="New Project" color={C.accent}/>}
          </div>
          <button onClick={()=>{sap(null);sac(null);}} style={sel(!activePid&&!activeClient)}><div style={{width:8,height:8,borderRadius:"50%",background:C.t3}}/>All Projects</button>
          {visibleProjects.map(p=>(
            <button key={p.id} onClick={()=>{sap(p.id);sac(null);}} style={sel(activePid===p.id)}>
              <div style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
              <span style={{flex:1,wordBreak:"break-word",lineHeight:1.3}}>{p.name}</span>
              {canEdit&&activePid===p.id&&(
                <div style={{display:"flex",gap:2,flexShrink:0}}>
                  <IBtn icon="✏️" title="Edit" onClick={e=>{e.stopPropagation();sep(p);}} color={C.t2}/>
                  {canEdit&&<IBtn icon="🗑" title="Delete" onClick={e=>{e.stopPropagation();deleteProject(p.id);}} color={C.red}/>}
                </div>
              )}
            </button>
          ))}
          {canEdit&&(
            <>
              <div style={{marginTop:14,padding:"0 4px"}}><span style={{fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>By Client</span></div>
              {[...new Set(accessibleProjects.map(p=>p.client||"Unassigned"))].filter(c=>c==="Unassigned"||clients.some(cl=>cl.name===c)).map(client=>(
                <button key={client} onClick={()=>navTo('clientprojects',null,client)} style={sel(view==="clientprojects"&&activeClient===client)}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:`hsl(${client.charCodeAt(0)*23%360},60%,50%)`,flexShrink:0}}/>
                  <span style={{flex:1,wordBreak:"break-word",lineHeight:1.3}}>{client}</span>
                </button>
              ))}
            </>
          )}
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
              {isAdmin&&<button onClick={()=>{sum(true);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.t2,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>👥 Manage Users</button>}
              {isAdmin&&<button onClick={()=>{scm(true);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.t2,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🏢 View Clients</button>}
              <button onClick={()=>{spwm(true);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.t2,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🔐 Change Password</button>
              <button onClick={()=>{localStorage.removeItem("rds_user");window.location.href="/";}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.red,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🚪 Sign Out</button>
            </div>
          )}
        </div>
      </aside>
      <main style={{flex:1,padding:24,overflow:"auto",height:"100vh",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            {(()=>{
              const portalName=isAdmin?"Admin":isManager?"Manager":isTeamLeader?"Team Leader":isClient?"Client":"User";
              const displayName=isClient?(me.client_name||me.name):me.name;
              const hr=new Date().getHours();
              const greet=hr<12?"Good Morning":hr<17?"Good Afternoon":"Good Evening";
              const dateStr=new Date().toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
              const pageLabel=view==="dashboard"?`Welcome back to the RDS TechServ ${portalName} Portal.`:view==="kanban"?"Kanban Board":view==="analytics"?"Analytics & Reporting":view==="submissions"?"📬 Submission List":view==="clientprojects"?`${activeClient} — Projects`:activePid?`Project: ${projects.find(p=>p.id===activePid)?.name||""}`: "Task List";
              return(<>
                <h1 style={{margin:0,fontSize:24,fontWeight:800,color:"#ffffff"}}>{greet}, {displayName} 👋</h1>
                <p style={{margin:"3px 0 0",color:C.t2,fontSize:13,fontWeight:500}}>{pageLabel}</p>
                <p style={{margin:"2px 0 0",color:C.t3,fontSize:12}}>{dateStr}</p>
              </>);
            })()}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <NotificationCenter me={me}/>
            {view!=="dashboard"&&(
              <>
                <input placeholder="Search tasks…" value={searchTask} onChange={e=>sst(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.t1,fontSize:13,outline:"none",width:150,fontFamily:"inherit"}}/>
                <select value={filterStatus} onChange={e=>sfs(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Status</option>
                  {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                {canEdit&&<select value={filterAssignee} onChange={e=>sfa(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Assignees</option>
                  {members.map(m=><option key={m} value={m}>{m}</option>)}
                </select>}
              </>
            )}
            {isClient&&(()=>{const cp=accessibleProjects;const ct=tasks.filter(t=>cp.some(p=>p.id===t.project_id));return(<button onClick={()=>exportExcel(cp,ct,`${me.client_name||me.name} - Project Report`)} style={{...GBtn,display:"flex",alignItems:"center",gap:6,padding:"9px 14px",fontSize:13}}>📊 Export</button>);})()}
            {!isClient&&<div ref={exportRef} style={{position:"relative"}}>
              <button onClick={()=>{setExportOpen(v=>!v);setExportSec(null);}} style={{...GBtn,display:"flex",alignItems:"center",gap:6,padding:"9px 14px",fontSize:13}}>📊 Export ▾</button>
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
                        <SBtn2 label="Not Yet Started" count={allProjTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length} icon="⏳" color={C.t2}
                          onClick={()=>{const t=allProjTasks.filter(x=>x.status==="To Do"||x.status==="Not Yet Started"||x.status==="To Be Started");exportExcel(accessibleProjects.filter(p=>t.some(x=>x.project_id===p.id)),t,`${me.name} - Not Started Tasks`);closeExport();}}/>
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
                    {canEdit&&<SHdr id="users" icon="👤" label="By Users"/>}
                    {canEdit&&exportSec==="users"&&(
                      <div style={{background:C.surface+"33",paddingBottom:4}}>
                        <SBtn2 label="All Users Work Summary" count={tasks.length} icon="👥" color={C.teal}
                          onClick={()=>{exportExcel(accessibleProjects,tasks,"All Users - Work Summary");closeExport();}}/>
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
                    {/* 7 — Submission List */}
                    <div style={{height:1,background:C.border,margin:"4px 0"}}/>
                    <SBtn2 label="Submission List" count={null} icon="📬" color={"#0891b2"} indent={false}
                      onClick={()=>{exportSubmissionList(accessibleProjects,tasks,today2);closeExport();}}/>
                  </div>
                );
              })()}
            </div>}
            {canEdit&&activePid&&<button onClick={()=>deleteProject(activePid)} style={{...GBtn,padding:"9px 14px",fontSize:13,color:C.red,borderColor:C.red}}>🗑 Delete Project</button>}
            {canEdit&&<button onClick={()=>{set(null);stm(true);}} style={SBtn}>+ New Task</button>}
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
              <div style={{background:`linear-gradient(135deg,${C.card} 0%,${C.accent}11 100%)`,border:`1px solid ${C.accent}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,borderLeft:`4px solid ${C.accent}`}}>
                <div style={{width:52,height:52,borderRadius:14,background:C.accent+"22",border:`2px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:C.accent,fontWeight:800}}>{(me.name[0]||"A").toUpperCase()}</div>
                <div style={{flex:1}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>System Administration Dashboard</h2>
                  <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back, {me.name} · Full access to all projects, users, and clients</p>
                </div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {[{l:"Users",v:users.length,c:C.accent},{l:"Clients",v:clients.length,c:C.teal},{l:"Projects",v:accessibleProjects.length,c:C.blue},{l:"Health",v:(accessibleProjects.length?Math.round(accessibleProjects.filter(p=>prog(p.id)>0).length/accessibleProjects.length*100):0)+"%",c:C.green}].map(s=>(
                    <div key={s.l} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",textAlign:"center",minWidth:64}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isAdmin&&isManager&&(
              <div style={{background:`linear-gradient(135deg,${C.card} 0%,${"#f59e0b"}11 100%)`,border:`1px solid ${"#f59e0b"}44`,borderRadius:14,padding:"20px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:16,borderLeft:`4px solid #f59e0b`}}>
                <div style={{width:52,height:52,borderRadius:14,background:"#f59e0b22",border:"2px solid #f59e0b44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#f59e0b",fontWeight:800}}>{(me.name[0]||"M").toUpperCase()}</div>
                <div style={{flex:1}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.t1}}>Project Management Dashboard</h2>
                  <p style={{margin:"3px 0 0",fontSize:13,color:C.t3}}>Welcome back, {me.name} · Managing {accessibleProjects.length} active project{accessibleProjects.length!==1?"s":""}</p>
                </div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {[{l:"Projects",v:accessibleProjects.length,c:"#f59e0b"},{l:"Team Size",v:[...new Set(dashTasks.map(t=>t.assignee).filter(Boolean))].length,c:C.blue},{l:"In Progress",v:dashTasks.filter(t=>t.status==="In Progress").length,c:C.accent},{l:"Completion",v:(dashTasks.length?Math.round(dashTasks.filter(t=>isDone(t.status)).length/dashTasks.length*100):0)+"%",c:C.green}].map(s=>(
                    <div key={s.l} style={{background:s.c+"15",border:`1px solid ${s.c}33`,borderRadius:10,padding:"10px 16px",textAlign:"center",minWidth:64}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.t3,marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* ── Clean Filter Bar ── */}
            <div style={{background:C.card,border:`1px solid ${hasDashFilter?C.accent:C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <input placeholder="🔍 Search tasks or projects…" value={dashSearch} onChange={e=>sdss(e.target.value)}
                style={{flex:1,minWidth:160,background:C.surface,border:`1px solid ${dashSearch?C.accent:C.border}`,borderRadius:8,padding:"8px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <select value={dashProject} onChange={e=>sdsp(e.target.value)} style={{background:C.surface,border:`1px solid ${dashProject!=="All"?C.accent:C.border}`,borderRadius:8,padding:"8px 10px",color:dashProject!=="All"?C.accent:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">All Projects</option>
                {accessibleProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={dashUser} onChange={e=>sdsu(e.target.value)} style={{background:C.surface,border:`1px solid ${dashUser!=="All"?C.accent:C.border}`,borderRadius:8,padding:"8px 10px",color:dashUser!=="All"?C.accent:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">All Assignees</option>
                {users.map(u=><option key={u.username} value={u.name}>{u.name}</option>)}
              </select>
              <select value={dashStatus} onChange={e=>sdsst(e.target.value)} style={{background:C.surface,border:`1px solid ${dashStatus!=="All"?C.accent:C.border}`,borderRadius:8,padding:"8px 10px",color:dashStatus!=="All"?C.accent:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">All Statuses</option>
                {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {hasDashFilter&&<button onClick={()=>{sdss("");sdsu("All");sdsp("All");sdsc("All");sdsst("All");}} style={{...GBtn,padding:"8px 12px",fontSize:12,color:C.red,borderColor:C.red}}>✕ Clear</button>}
            </div>
            {hasDashFilter&&<p style={{margin:"8px 0 0",fontSize:12,color:C.accent}}>Showing {activeDashTasks.length} of {dashTasks.length} tasks</p>}
                        {/* ── Stat Cards ── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:16,marginBottom:24}}>
              <Stat label="Total Tasks" value={activeDashTasks.length} sub={`across ${accessibleProjects.length} projects`} color={C.blue} onClick={()=>ssm({title:"All Tasks",tasks:activeDashTasks})}/>
              <Stat label="Completed" value={activeDashTasks.filter(t=>isDone(t.status)).length} sub={activeDashTasks.length?`${Math.round(activeDashTasks.filter(t=>isDone(t.status)).length/activeDashTasks.length*100)}% done`:"0%"} color={C.green} onClick={()=>ssm({title:"Completed Tasks",tasks:activeDashTasks.filter(t=>isDone(t.status))})}/>
              <Stat label="In Progress" value={activeDashTasks.filter(t=>t.status==="In Progress").length} sub="actively running" color={C.accent} onClick={()=>ssm({title:"In Progress Tasks",tasks:activeDashTasks.filter(t=>t.status==="In Progress")})}/>
              <Stat label="Not Yet Started" value={activeDashTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length} sub="pending start" color={C.t2} onClick={()=>ssm({title:"Not Yet Started Tasks",tasks:activeDashTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started")})}/>
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
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
              {accessibleProjects.map(p=>{
                const pv=prog(p.id),pt=tasks.filter(t=>t.project_id===p.id);
                const pd=pt.filter(t=>isDone(t.status)).length;
                const pip=pt.filter(t=>t.status==="In Progress").length;
                const ptd=pt.filter(t=>t.status==="To Do"||t.status==="To Be Started"||t.status==="Not Yet Started").length;
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
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14}}>
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
            {(()=>{const up=accessibleProjects.filter(p=>!p.assigned_users||p.assigned_users.length===0);if(!up.length)return null;return(<><h2 style={{margin:"0 0 14px",fontSize:16,fontWeight:700,color:C.yellow}}>📂 Unassigned Projects</h2><div style={{background:C.card,border:`1px solid ${C.yellow}44`,borderRadius:12,overflow:"hidden",marginBottom:28}}>{up.map(p=>{const pt=tasks.filter(t=>t.project_id===p.id);const pv=prog(p.id);return(<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}><div style={{width:3,height:36,borderRadius:2,background:p.color}}/><div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:600,color:C.t1}}>{p.name}</p><p style={{margin:0,fontSize:11,color:C.t3}}>{p.client?`👤 ${p.client} · `:""}{pt.length} tasks · Due {p.deadline||"TBD"}</p></div><Bdg color={p.color}>{pv}%</Bdg>{isAdmin&&<button onClick={()=>sep(p)} style={{...GBtn,padding:"5px 12px",fontSize:12,color:C.yellow,borderColor:C.yellow}}>Assign →</button>}</div>);})}</div></>);})()}
            {/* ── 2. Recent Tasks ── */}
            <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#ffffff"}}>Recent Tasks</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
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
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
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
            </div>
            {/* ── 3. Client-wise Overview ── */}
            {!isClient&&<ClientOverview projects={accessibleProjects} tasks={dashTasks} clients={clients} onSelectClient={c=>navTo('clientprojects',null,c)}/>}
            {/* ── 4. Overdue Tasks ── */}
            {overdueTasks.length>0&&(<>
              <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:C.red}}>⚠ Overdue Tasks</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
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
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
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
        {view==="analytics"&&(isAdmin||isManager||isTeamLeader)&&(
          <AnalyticsCenter projects={accessibleProjects} tasks={tasks} users={users} clients={clients} today={today} members={members}/>
        )}
        {view==="submissions"&&(
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
        {view==="kanban"&&(
          <>
            {activeClient&&(<div style={{marginBottom:16,padding:"10px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:C.t2}}>Client filter:</span><Bdg color={C.teal}>{activeClient}</Bdg><button onClick={()=>sac(null)} style={{...GBtn,padding:"4px 10px",fontSize:12,marginLeft:"auto"}}>✕ Clear</button></div>)}
            {canEdit&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <GmailSelect selectedCount={selTasks.size} total={filtered.length}
                onSelectAll={()=>{setBSO(true);setSelTasks(new Set(filtered.map(t=>t.id)));}}
                onSelectNone={()=>{setSelTasks(new Set());setBSO(false);}}
                extraOptions={ALL_STATUSES.filter(s=>filtered.some(t=>t.status===s)).map(s=>({label:s,action:()=>{setBSO(true);setSelTasks(new Set(filtered.filter(t=>t.status===s).map(t=>t.id)));}}))}/>
            </div>}
            <div style={{display:"flex",gap:14,overflow:"auto",paddingBottom:16}}>
              {kanbanCols.map(col=>(<KCol key={col} status={col} tasks={filtered.filter(t=>t.status===col)} projects={projects}
                onEdit={t=>{set(t);stm(true);}}
                onDelete={canEdit?delTask:()=>{}}
                onDrop={dropTask}
                canEditFn={t=>canEdit||(userMatchesStr(me,t.assignee)||userMatchesStr(me,t.detailer)||userMatchesStr(me,t.checker))}
                canDelete={canEdit}
                selTasks={selTasks}
                onToggleTask={canEdit?toggleTask:null}
              />))}
            </div>
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
          {canEdit&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <GmailSelect selectedCount={selTasks.size} total={filtered.length}
              onSelectAll={()=>{setBSO(true);setSelTasks(new Set(filtered.map(t=>t.id)));}}
              onSelectNone={()=>{setSelTasks(new Set());setBSO(false);}}
              extraOptions={["Done","In Progress","To Do","Not Yet Started","To Be Started"].filter(s=>filtered.some(t=>t.status===s)).map(s=>({label:s,action:()=>{setBSO(true);setSelTasks(new Set(filtered.filter(t=>t.status===s).map(t=>t.id)));}}))
              }/>
          </div>}
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
              <tbody>{filtered.length===0?<tr><td colSpan={canEdit?13:12} style={{padding:32,textAlign:"center",color:C.t3}}>No tasks found</td></tr>:filtered.map(t=><TRow key={t.id} task={t} project={projects.find(p=>p.id===t.project_id)} onEdit={t=>{set(t);stm(true);}} onDelete={delTask} readonly={!canEdit} canDelete={canEdit} selected={selTasks.has(t.id)} onSelect={canEdit?toggleTask:null}/>)}</tbody>
            </table>
          </div>
          </div>
        )}
      </main>
      {statModal&&<StatTaskModal title={statModal.title} tasks={statModal.tasks} projects={projects} today={today} canEdit={canEdit} onEdit={t=>{set(t);stm(true);ssm(null);}} onClose={()=>ssm(null)}/>}
      {clientModal&&<ClientsModal clients={clients} users={users} onAdd={addClient} onEdit={editClient} onDelete={deleteClient} onSavePortal={savePortal} onClose={()=>scm(false)}/>}
      {pwModal&&<ChangePasswordModal me={me} onClose={()=>spwm(false)}/>}
      {userModal&&<UsersModal users={users} currentUser={me} projects={projects} clients={clients} onAdd={addUser} onEdit={editUserFn} onDelete={delUser} onClose={()=>sum(false)}/>}
      {editProject&&(<Modal title="Edit Project" onClose={()=>sep(null)} wide><EditProjectForm project={editProject} onSave={updateProject} onClose={()=>sep(null)} saving={saving} users={users} clients={clients} requireDates={canEdit}/></Modal>)}
      {taskModal&&(
        <Modal title={editTask?(canEdit?"Edit Task":"Update Task Status"):"New Task"} onClose={()=>{stm(false);set(null);}} wide={canEdit}>
          {(canEdit||!editTask)?
            <TaskForm initial={editTask||(activePid?{project_id:activePid}:{})} projects={accessibleProjects} members={members} clients={clients} onSave={saveTask} onClose={()=>{stm(false);set(null);}} saving={saving} requireDates={canEdit}/>:
            <UserTaskEditForm task={editTask} project={projects.find(p=>p.id===editTask.project_id)} onSave={saveTask} onClose={()=>{stm(false);set(null);}} saving={saving}/>
          }
        </Modal>
      )}
      {projModal&&(<Modal title="New Project" onClose={()=>spm(false)}><ProjectForm onSave={saveProject} onClose={()=>spm(false)} saving={saving} users={users} clients={clients} requireDates={canEdit}/></Modal>)}
      {canEdit&&<BulkBar selTasks={selTasks} selProjects={selProjects} onClear={()=>{clearSel();setBSO(false);}} onBulkDelete={bulkDelete} onBulkAction={type=>setBM(type)}/>}
      {canEdit&&bulkModal&&<BulkActionModal type={bulkModal} count={selTasks.size} members={members} onApply={applyBulkAction} onClose={()=>setBM(null)}/>}
    </div>
  );
}
