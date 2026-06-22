import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { notify, taskAssignedPayload, statusChangePayload, taskCompletedPayload, projectCreatedPayload } from "./email-notifications/notifications";

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
const ROLES=["Engineer","Designer","Architect","Manager","Admin","Client"];
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
function FInput({label,value,onChange,type="text",placeholder}){
  return(
    <div style={{marginBottom:14}}>
      <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
    </div>
  );
}
function FSelect({label,value,onChange,options}){
  return(
    <div style={{marginBottom:14}}>
      <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>{label}</label>
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
function TaskForm({initial={},projects,members,clients=[],onSave,onClose,saving}){
  const [custom,setCustom]=useState(false);
  const initPid=initial.project_id||projects[0]?.id||"";
  const initClient=initial.client||(projects.find(p=>p.id===initPid)?.client||"");
  const [f,sf]=useState({
    project_id:initPid,
    custNo:"",custName:"",title:initial.title||"",client:initClient,
    status:initial.status||"To Do",priority:initial.priority||"Medium",
    assignee:initial.assignee||"",due_date:initial.due_date||"",
    tags:(initial.tags||[]).join(", "),files:initial.files||[],
    detailer:initial.detailer||"",checker:initial.checker||"",
    scope:initial.scope||"",client_sub_date:initial.client_sub_date||"",
  });
  const s=k=>v=>sf(p=>({...p,[k]:v}));
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
              <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Project</label>
              <select value={f.project_id} onChange={e=>onProjectChange(e.target.value)}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
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
        <div style={col}><FInput label="Task Title" value={f.title} onChange={s("title")} placeholder="Enter task title"/></div>
        <div style={col}>
                <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Client</label>
                <select value={f.client} onChange={e=>s("client")(e.target.value)}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="">— Select Client —</option>
                  {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
      </div>
      <div style={row}>
        <div style={col}>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Assignee</label>
            <select value={f.assignee} onChange={e=>s("assignee")(e.target.value)}
              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              <option value="">— Unassigned —</option>
              {members.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={col}><FSelect label="Status" value={f.status} onChange={s("status")} options={ALL_STATUSES}/></div>
      </div>
      <div style={row}>
        <div style={col}><FSelect label="Priority" value={f.priority} onChange={s("priority")} options={["High","Medium","Low"]}/></div>
        <div style={col}><FInput label="Due Date" value={f.due_date} onChange={s("due_date")} type="date"/></div>
      </div>
      <div style={row}>
        <div style={col}><FInput label="Detailer" value={f.detailer} onChange={s("detailer")} placeholder="e.g. Nanaji"/></div>
        <div style={col}><FInput label="Checker" value={f.checker} onChange={s("checker")} placeholder="e.g. Chandra Mouli"/></div>
      </div>
      <div style={row}>
        <div style={col}><FInput label="Scope" value={f.scope} onChange={s("scope")} placeholder="e.g. CIP&CMU"/></div>
        <div style={col}><FInput label="Client Sub Date" value={f.client_sub_date} onChange={s("client_sub_date")} type="date"/></div>
      </div>
      <div style={row}>
        <div style={col}><FInput label="Tags (comma-separated)" value={f.tags} onChange={s("tags")}/></div>
        <div style={col}><FileUp files={f.files} onChange={files=>sf(p=>({...p,files}))}/></div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:10}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving||!f.title.trim()} onClick={()=>onSave({...f,assignee:f.assignee||"",custName:custom?f.custName:"",tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean)})} style={{...SBtn,opacity:saving?0.7:1}}>
          {saving?"Saving…":"Save Task"}
        </button>
      </div>
    </div>
  );
}
function ProjectFormFields({f,sf,users,clients}){
  function toggleUser(username){
    sf(p=>({...p,assigned_users:p.assigned_users.includes(username)?p.assigned_users.filter(u=>u!==username):[...p.assigned_users,username]}));
  }
  return(
    <>
      <div style={{display:"flex",gap:16}}>
        <div style={{flex:1}}><FInput label="Project Name" value={f.name} onChange={v=>sf(p=>({...p,name:v}))}/></div>
        <div style={{flex:1,marginBottom:14}}>
          <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Client</label>
          <select value={f.client} onChange={e=>sf(p=>({...p,client:e.target.value}))}
            style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="">— Select Client —</option>
            {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <FInput label="Deadline" value={f.deadline} onChange={v=>sf(p=>({...p,deadline:v}))} type="date"/>
      <div style={{marginBottom:14}}>
        <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:8,fontWeight:600}}>Color</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {PROJECT_COLORS.map(c=><div key={c} onClick={()=>sf(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent"}}/>)}
        </div>
      </div>
      <FInput label="Description" value={f.description} onChange={v=>sf(p=>({...p,description:v}))}/>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <label style={{color:C.t2,fontSize:12,fontWeight:600}}>Assign Users <span style={{color:C.t3,fontWeight:400}}>(leave empty = unassigned)</span></label>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>sf(p=>({...p,assigned_users:users.map(u=>u.username)}))} style={{...GBtn,padding:"3px 10px",fontSize:11}}>All</button>
            <button onClick={()=>sf(p=>({...p,assigned_users:[]}))} style={{...GBtn,padding:"3px 10px",fontSize:11}}>Clear</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:160,overflowY:"auto",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
          {users.map(u=>(
            <div key={u.id} onClick={()=>toggleUser(u.username)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,cursor:"pointer",background:f.assigned_users.includes(u.username)?C.accent+"22":C.card,border:`1px solid ${f.assigned_users.includes(u.username)?C.accent:C.border}`,transition:"all .15s"}}>
              <div style={{width:16,height:16,borderRadius:4,background:f.assigned_users.includes(u.username)?C.accent:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {f.assigned_users.includes(u.username)&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
              </div>
              <Av name={u.name} size={20}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{u.name}</div>
                <div style={{fontSize:10,color:C.t3}}>{u.role}</div>
              </div>
              {f.assigned_users.includes(u.username)&&(
                <span style={{fontSize:10,color:C.red,fontWeight:700,padding:"1px 4px",borderRadius:3,border:`1px solid ${C.red}44`,background:C.red+"11"}}>✕</span>
              )}
            </div>
          ))}
        </div>
        <p style={{margin:"6px 0 0",fontSize:11,color:C.t3}}>
          {f.assigned_users.length===0
            ?<span style={{color:C.yellow}}>⚠ No users assigned — project will appear in Unassigned</span>
            :`${f.assigned_users.length} user(s) assigned`}
        </p>
      </div>
    </>
  );
}
function ProjectForm({onSave,onClose,saving,users,clients}){
  const [f,sf]=useState({name:"",deadline:"",description:"",client:"",color:C.teal,assigned_users:[]});
  return(
    <div>
      <ProjectFormFields f={f} sf={sf} users={users} clients={clients}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
        <button onClick={onClose} style={GBtn} disabled={saving}>Cancel</button>
        <button disabled={saving||!f.name.trim()} onClick={()=>onSave(f)} style={{...SBtn,opacity:saving?0.7:1}}>{saving?"Creating…":"Create Project"}</button>
      </div>
    </div>
  );
}
function EditProjectForm({project,onSave,onClose,saving,users,clients}){
  const [f,sf]=useState({
    name:project.name||"",deadline:project.deadline||"",
    description:project.description||"",client:project.client||"",
    color:project.color||C.teal,assigned_users:project.assigned_users||[],
  });
  return(
    <div>
      <ProjectFormFields f={f} sf={sf} users={users} clients={clients}/>
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
  function autoUsername(name){const un=toUn(name);sf(p=>({...p,portal_username:un}));}
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
            <input autoFocus placeholder="🔍  Search clients…" value={cq} onChange={e=>scq(e.target.value)}
              style={{flex:1,background:C.surface,border:`1px solid ${cq?C.accent:C.border}`,borderRadius:8,padding:"8px 13px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            {cq&&<button onClick={()=>scq("")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:7,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
            <span style={{color:C.t3,fontSize:12,whiteSpace:"nowrap"}}>{shownClients.length}/{clients.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflowY:"auto"}}>
            {shownClients.length===0&&<div style={{textAlign:"center",color:C.t3,padding:32}}>No clients match your search.</div>}
            {shownClients.map(c=>{
              const pu=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===c.name.toLowerCase());
              return(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,background:C.surface,border:`1px solid ${cq&&c.name.toLowerCase().includes(cq.toLowerCase())?C.accent:C.border}`,borderRadius:10,padding:"12px 16px"}}>
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
                  <div style={{display:"flex",gap:4}}>
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
            <div style={{flex:1}}><FInput label="Client Name *" value={f.name} onChange={v=>{s("name")(v);if(!editId)autoUsername(v);}} placeholder="e.g. Formcrete"/></div>
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
                <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Username</label>
                <input value={f.portal_username} onChange={e=>sf(p=>({...p,portal_username:e.target.value.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                  placeholder="auto-generated"/>
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
  const s=k=>v=>sf(p=>({...p,[k]:v}));
  const isSuperAdmin=currentUser.username===SUPER_ADMIN;
  function toggleProj(pid){sf(p=>({...p,assigned_projects:p.assigned_projects.includes(pid)?p.assigned_projects.filter(id=>id!==pid):[...p.assigned_projects,pid]}));}
  function startEdit(u){seu(u);sf({name:u.name,username:u.username,password:"",role:u.role,client_name:u.client_name||"",email:u.email||"",assigned_projects:[]});st("edit");se("");}
  function resetForm(){seu(null);sf({name:"",username:"",password:"RDSTechserv@2026",role:"Engineer",client_name:"",email:"",assigned_projects:[]});se("");}
  async function addUser(){
    if(!f.name.trim()||!f.username.trim()||!f.password.trim()){se("All fields are required.");return;}
    if(users.find(u=>u.username===f.username.trim().toLowerCase())){se("Username already exists.");return;}
    setSaving(true);
    try{
      const newUser=await onAdd({name:f.name.trim(),username:f.username.trim().toLowerCase(),password:f.password,role:f.role,client_name:f.client_name||"",email:f.email.trim()||""});
      if(f.role!=="Client"&&f.assigned_projects.length>0&&newUser){
        for(const pid of f.assigned_projects){
          const proj=projects.find(p=>p.id===pid);
          if(proj){const updated=[...(proj.assigned_users||[]),f.username.trim().toLowerCase()];await supabase.from("projects").update({assigned_users:updated}).eq("id",pid);}
        }
      }
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
              <input autoFocus placeholder="🔍  Search by name, username, email…" value={uq} onChange={e=>suq(e.target.value)}
                style={{flex:1,background:C.surface,border:`1px solid ${uq?C.accent:C.border}`,borderRadius:8,padding:"8px 13px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <select value={uRole} onChange={e=>sur(e.target.value)} style={{background:C.surface,border:`1px solid ${uRole!=="All"?C.accent:C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">All Roles</option>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              {(uq||uRole!=="All")&&<button onClick={()=>{suq("");sur("All");}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:7,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
              <span style={{color:C.t3,fontSize:12,whiteSpace:"nowrap"}}>{shownUsers.length}/{users.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"52vh",overflowY:"auto"}}>
              {shownUsers.length===0&&<div style={{textAlign:"center",color:C.t3,padding:32}}>No users match your search.</div>}
              {shownUsers.map(u=>(
                <div key={u.id} style={{display:"grid",gridTemplateColumns:"40px 1fr auto auto auto",alignItems:"center",gap:12,background:C.surface,border:`1px solid ${uq&&u.name.toLowerCase().includes(uq.toLowerCase())?C.accent:C.border}`,borderRadius:10,padding:"12px 16px"}}>
                  <Av name={u.name} size={32}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1}}>
                      {u.name}{u.username===SUPER_ADMIN&&<span style={{color:C.accent,fontSize:10,marginLeft:6,fontWeight:700}}>★ SUPER ADMIN</span>}
                    </div>
                    <div style={{fontSize:11,color:C.t3}}>@{u.username}{u.email?` · ${u.email}`:""}{u.client_name?` · ${u.client_name}`:""}</div>
                  </div>
                  <Bdg color={u.role==="Admin"?C.accent:u.role==="Client"?C.teal:C.blue}>{u.role}</Bdg>
                  {u.id===currentUser.id
                    ?<span style={{fontSize:18,opacity:0.3}} title="This is you">👤</span>
                    :<button onClick={()=>startEdit(u)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>✏️ Edit</button>
                  }
                  {u.id===currentUser.id||u.username===SUPER_ADMIN
                    ?<span style={{fontSize:18,opacity:0.3}} title="Protected">🔒</span>
                    :<button onClick={()=>{if(window.confirm("Delete "+u.name+"?"))onDelete(u.id);}} style={{background:C.red,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>🗑</button>
                  }
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {tab==="add"&&(
        <div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Full Name" value={f.name} onChange={s("name")} placeholder="e.g. Suresh Kumar"/></div>
            <div style={{flex:1}}><FSelect label="Role" value={f.role} onChange={v=>{sf(p=>({...p,role:v,password:v==="Client"?"Client@RDS2026":"RDSTechserv@2026"}));}} options={isSuperAdmin?ROLES:ROLES.filter(r=>r!=="Admin")}/></div>
          </div>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><FInput label="Email" value={f.email} onChange={s("email")} placeholder="e.g. suresh@company.com" type="email"/></div>
            {f.role!=="Client"&&<div style={{flex:1}}><FInput label="Username" value={f.username} onChange={s("username")} placeholder="e.g. suresh"/></div>}
          </div>
          {f.role!=="Client"&&<div style={{display:"flex",gap:16,marginBottom:4}}>
            <div style={{flex:1}}><FInput label="Password" value={f.password} onChange={s("password")} type="password"/></div>
          </div>}
          {f.role==="Client"?(
            <div style={{marginBottom:14,padding:"12px 14px",background:C.teal+"11",border:`1px solid ${C.teal}44`,borderRadius:8}}>
              <p style={{margin:"0 0 10px",fontSize:12,color:C.teal,fontWeight:600}}>👤 Client Access</p>
              <div>
                <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Client Name</label>
                <select value={f.client_name} onChange={e=>{const cn=e.target.value;const au=cn.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");sf(p=>({...p,client_name:cn,username:au,name:cn||p.name}));}}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="">— Select Client —</option>
                  {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div style={{marginTop:10}}>
                <label style={{display:"block",color:C.t2,fontSize:12,marginBottom:5,fontWeight:600}}>Username (auto-generated, editable)</label>
                <input value={f.username} onChange={e=>sf(p=>({...p,username:e.target.value.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                  placeholder="auto-filled from client name"/>
              </div>
              <div style={{marginTop:10}}>
                <FInput label="Password" value={f.password} onChange={s("password")} type="password"/>
              </div>
            </div>
          ):(
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label style={{color:C.t2,fontSize:12,fontWeight:600}}>Assign to Projects</label>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>sf(p=>({...p,assigned_projects:projects.map(p=>p.id)}))} style={{...GBtn,padding:"3px 10px",fontSize:11}}>All</button>
                  <button onClick={()=>sf(p=>({...p,assigned_projects:[]}))} style={{...GBtn,padding:"3px 10px",fontSize:11}}>Clear</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
                {projects.map(p=>(
                  <div key={p.id} onClick={()=>toggleProj(p.id)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,cursor:"pointer",background:f.assigned_projects.includes(p.id)?p.color+"22":C.card,border:`1px solid ${f.assigned_projects.includes(p.id)?p.color:C.border}`}}>
                    <div style={{width:16,height:16,borderRadius:4,background:f.assigned_projects.includes(p.id)?p.color:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {f.assigned_projects.includes(p.id)&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                  </div>
                ))}
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
function KCard({task,project,onEdit,onDelete,readonly}){
  const [h,sh]=useState(false),[d,sd]=useState(false);
  return(
    <div draggable={!readonly} onDragStart={e=>{sd(true);e.dataTransfer.setData("tid",task.id);}} onDragEnd={()=>sd(false)}
      onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{background:C.card,border:`1px solid ${h?C.border:C.surface}`,borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:readonly?"default":"grab",opacity:d?.4:1,boxShadow:h?"0 4px 16px #00000050":"none",borderLeft:`3px solid ${project?.color||C.accent}`,transition:"all .15s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <p style={{margin:0,color:C.t1,fontSize:13,fontWeight:600,flex:1,lineHeight:1.4}}>{task.title}</p>
        {!readonly&&<div style={{display:"flex",gap:2,opacity:h?1:0,transition:"opacity .15s"}}>
          <IBtn icon="✏️" onClick={()=>onEdit(task)}/><IBtn icon="🗑" onClick={()=>onDelete(task.id)} color={C.red}/>
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
function KCol({status,tasks,projects,onEdit,onDelete,onDrop,readonly}){
  const [ov,so]=useState(false);
  return(
    <div onDragOver={e=>{if(!readonly){e.preventDefault();so(true);}}} onDragLeave={()=>so(false)}
      onDrop={e=>{e.preventDefault();so(false);if(!readonly)onDrop(e.dataTransfer.getData("tid"),status);}}
      style={{minWidth:220,flex:1,background:ov?C.surface+"88":"transparent",border:`2px dashed ${ov?getStatusColor(status):C.border}`,borderRadius:12,padding:12,transition:"all .15s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:getStatusColor(status)}}/>
        <span style={{color:C.t1,fontWeight:700,fontSize:13}}>{status}</span>
        <span style={{background:C.border,color:C.t3,borderRadius:10,padding:"1px 8px",fontSize:11,marginLeft:"auto"}}>{tasks.length}</span>
      </div>
      {tasks.map(t=><KCard key={t.id} task={t} project={projects.find(p=>p.id===t.project_id)} onEdit={onEdit} onDelete={onDelete} readonly={readonly}/>)}
    </div>
  );
}
function TRow({task,project,onEdit,onDelete,readonly}){
  const [h,sh]=useState(false);
  const td={padding:"10px 16px",borderBottom:`1px solid ${C.border}`};
  const today=new Date().toISOString().slice(0,10);
  const overdue=task.due_date&&task.due_date<today&&!isDone(task.status);
  return(
    <tr onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)} style={{background:h?C.surface:"transparent",transition:"background .12s"}}>
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
      <td style={{...td,opacity:h?1:0,transition:"opacity .12s"}}>{!readonly&&<div style={{display:"flex",gap:4}}><IBtn icon="✏️" onClick={()=>onEdit(task)} title="Edit"/><IBtn icon="🗑" onClick={()=>onDelete(task.id)} color={C.red} title="Delete"/></div>}</td>
    </tr>
  );
}
function UserDashboard({me,tasks,projects,clients,today,onEditTask,onViewProject}){
  const [statusFilter,ssf]=useState("All");
  const [clientFilter,scf]=useState("All");
  const [search,ss]=useState("");
  // Match by name, username, or first-name (handles Excel short names like "Anji" vs "Anji Reddy")
  const myN=me.name.toLowerCase().trim();
  const myU=(me.username||"").toLowerCase().trim();
  const myFirst=myN.split(" ")[0]; // e.g. "anji"
  function matchesMe(val){
    const v=(val||"").toLowerCase().trim();
    if(!v)return false;
    return v===myN||v===myU||v===myFirst||myN.startsWith(v+" ")||v.startsWith(myFirst+" ")||v.includes(myN)||v.includes(myU);
  }
  const myTasks=tasks.filter(t=>matchesMe(t.assignee)||matchesMe(t.detailer)||matchesMe(t.checker));
  // Also include projects user is assigned to (via assigned_users), even if no direct task match
  const myAssignedProjects=projects.filter(p=>(p.assigned_users||[]).some(u=>u.toLowerCase()===myN||u.toLowerCase()===myU||u.toLowerCase()===myFirst));
  const myProjectIds=new Set([...myTasks.map(t=>t.project_id),...myAssignedProjects.map(p=>p.id)]);
  const myProjects=[...myProjectIds].map(pid=>projects.find(p=>p.id===pid)).filter(Boolean);
  const myClients=[...new Set(myProjects.map(p=>p.client||"Unassigned").filter(Boolean))].sort();
  const filtered=myTasks.filter(t=>{
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase())&&!(projects.find(p=>p.id===t.project_id)?.name||"").toLowerCase().includes(search.toLowerCase()))return false;
    if(statusFilter!=="All"){const nsMatch=statusFilter==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==statusFilter)return false;}
    if(clientFilter!=="All"&&(projects.find(p=>p.id===t.project_id)?.client||"Unassigned")!==clientFilter)return false;
    return true;
  });
  const total=myTasks.length;
  const done=myTasks.filter(t=>isDone(t.status)).length;
  const inprog=myTasks.filter(t=>t.status==="In Progress").length;
  const overdue=myTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const notStarted=myTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const pct=total?Math.round(done/total*100):0;
  return(
    <div>
      {/* Header */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:52,height:52,borderRadius:14,background:C.accent+"22",border:`2px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:C.accent}}>{me.name[0]}</div>
        <div style={{flex:1}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.t1}}>My Dashboard</h2>
          <p style={{margin:"2px 0 0",fontSize:13,color:C.t3}}>{me.name} · {me.role} · {total} tasks assigned</p>
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
        <Stat label="Total Tasks" value={total} sub="assigned to me" color={C.accent} onClick={()=>{ssf("All");scf("All");ss("");}}/>
        <Stat label="Completed" value={done} sub="finished" color={C.green} onClick={()=>ssf("Completed")}/>
        <Stat label="In Progress" value={inprog} sub="active" color={C.blue} onClick={()=>ssf("In Progress")}/>
        <Stat label="Not Yet Started" value={notStarted} sub="pending" color={C.t2} onClick={()=>ssf("Not Yet Started")}/>
        <Stat label="Overdue" value={overdue} sub="need attention" color={C.red} onClick={()=>ssf("All")}/>
      </div>
      {/* My Projects */}
      <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#fff"}}>My Projects ({myProjects.length})</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
        {myProjects.map(p=>{
          const pt=myTasks.filter(t=>t.project_id===p.id);
          const pd=pt.filter(t=>isDone(t.status)).length;
          const pip=pt.filter(t=>t.status==="In Progress").length;
          const pnd=pt.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
          const pov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
          const pct2=pt.length?Math.round(pd/pt.length*100):0;
          const myRoles=[];
          if(pt.some(t=>matchesMe(t.assignee)))myRoles.push("Assignee");
          if(pt.some(t=>matchesMe(t.detailer)))myRoles.push("Detailer");
          if(pt.some(t=>matchesMe(t.checker)))myRoles.push("QC Checker");
          return(
            <div key={p.id} onClick={()=>onViewProject(p.id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${p.color}`,transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              {/* Title + % */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <p style={{margin:0,fontSize:15,fontWeight:800,color:C.t1,flex:1,lineHeight:1.3}}>{p.name}</p>
                <span style={{background:p.color+"22",color:p.color,border:`1px solid ${p.color}44`,borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:800,marginLeft:10,whiteSpace:"nowrap"}}>{pct2}%</span>
              </div>
              {/* Client + Deadline */}
              <div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap"}}>
                {p.client&&<span style={{fontSize:12,color:C.teal,fontWeight:600}}>👤 {p.client}</span>}
                {p.deadline&&<span style={{fontSize:12,color:C.t3}}>📅 Due {p.deadline}</span>}
              </div>
              {/* Progress bar */}
              <Pb v={pct2} color={p.color} h={7}/>
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
              {/* My role badges */}
              {myRoles.length>0&&(
                <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {myRoles.map(r=><span key={r} style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}33`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{r}</span>)}
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
function exportExcel(projects,tasks){
  const today=new Date().toISOString().slice(0,10);
  const clients=[...new Set(projects.map(p=>p.client||"Unassigned"))];
  let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px;font-family:Arial,sans-serif;white-space:nowrap;}.hdr{background:#1e2433;color:#f1f5f9;font-weight:bold;}.client{background:#f97316;color:#fff;font-weight:bold;}.project{background:#3b82f6;color:#fff;font-weight:bold;}.done{background:#d1fae5;color:#065f46;}.inprog{background:#dbeafe;color:#1e40af;}.todo{background:#fef9c3;color:#713f12;}.notstarted{background:#f3f4f6;color:#374151;}.canceled{background:#fce7f3;color:#9d174d;}.overdue{background:#fee2e2;color:#991b1b;font-weight:bold;}</style></head><body>`;
  html+=`<table><tr><td colspan="11" class="hdr" style="font-size:16px;text-align:center;">RDS Project Hub — Task Report (${today})</td></tr><tr><td colspan="11"></td></tr>`;
  clients.forEach(client=>{
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
  a.download=`RDS_Report_${today}.xls`;
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
  const myProjects=projects.filter(p=>(p.client||"").toLowerCase()===(me.client_name||"").toLowerCase());
  const myPids=new Set(myProjects.map(p=>p.id));
  const myTasks=tasks.filter(t=>myPids.has(t.project_id));
  const total=myTasks.length;
  const done=myTasks.filter(t=>isDone(t.status)).length;
  const inprog=myTasks.filter(t=>t.status==="In Progress").length;
  const overdue=myTasks.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
  const notStarted=myTasks.filter(t=>t.status==="To Do"||t.status==="Not Yet Started"||t.status==="To Be Started").length;
  const pct=total?Math.round(done/total*100):0;
  const filtered=myTasks.filter(t=>{
    const pj=projects.find(p=>p.id===t.project_id);
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase())&&!(pj?.name||"").toLowerCase().includes(search.toLowerCase()))return false;
    if(statusFilter!=="All"){const nsMatch=statusFilter==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==statusFilter)return false;}
    return true;
  });
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
      <div style={{marginBottom:24}}><Pb v={pct} color={C.teal} h={8}/></div>
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:28}}>
        <Stat label="Total Tasks" value={total} sub="all projects" color={C.teal} onClick={()=>{ssf("All");ss("");}}/>
        <Stat label="Completed" value={done} sub="finished" color={C.green} onClick={()=>ssf("Completed")}/>
        <Stat label="In Progress" value={inprog} sub="active" color={C.blue} onClick={()=>ssf("In Progress")}/>
        <Stat label="Not Yet Started" value={notStarted} sub="pending" color={C.t2} onClick={()=>ssf("Not Yet Started")}/>
        <Stat label="Overdue" value={overdue} sub="need attention" color={C.red} onClick={()=>ssf("All")}/>
      </div>
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
                        {isAdmin&&<IBtn icon="🗑" title="Delete" onClick={()=>onDelete(p)} color={C.red}/>}
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
// ── URL routing helpers ──────────────────────────────────────────────────────
function slugify(s){return(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function stateToUrl(v,pid,client,projs=[]){
  if(v==='list'&&pid){
    const p=projs.find(pr=>pr.id===pid);
    return p?`/projects/${slugify(p.name)}`:`/projects/${pid}`;
  }
  if(v==='list')return'/tasks';
  if(v==='kanban')return'/kanban';
  if(v==='clientprojects'&&client)return`/clients/${encodeURIComponent(client)}`;
  return'/';
}
function urlToState(path,projs=[]){
  if(!path||path==='/'||path==='/dashboard')return{view:'dashboard',pid:null,client:null};
  if(path==='/tasks')return{view:'list',pid:null,client:null};
  if(path==='/kanban')return{view:'kanban',pid:null,client:null};
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
  const logoRef             = useRef();
  const prevViewRef         = useRef('dashboard');
  const initialParsed       = useRef(false);
  const today=new Date().toISOString().slice(0,10);
  const isClient=me?.role==="Client";
  const isAdmin=me?.role==="Admin";
  const isManager=me?.role==="Manager";
  const canEdit=isAdmin||isManager;
  function showToast(msg,ok=true){sToast({msg,ok});setTimeout(()=>sToast(null),3000);}
  async function loadAll(){
    sl(true);
    try{
      const [{data:u},{data:p},{data:t},{data:cl}]=await Promise.all([
        supabase.from("users").select("*").order("name"),
        supabase.from("projects").select("*").order("name"),
        supabase.from("tasks").select("*").order("created_at"),
        supabase.from("clients").select("*").order("name"),
      ]);
      su(u||[]);sp(p||[]);st(t||[]);scl(cl||[]);
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
  // Parse initial URL after data loads (for direct-link support)
  useEffect(()=>{
    if(!me||!projects.length||initialParsed.current)return;
    initialParsed.current=true;
    const s=urlToState(window.location.pathname,projects);
    if(s.view!=='dashboard'||s.pid||s.client){
      prevViewRef.current=s.view;
      sv(s.view);sap(s.pid);sac(s.client);
    }
  },[me,projects]);
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
  const accessibleProjects=(isAdmin||isManager)?projects:isClient?projects.filter(p=>(p.client||"").toLowerCase()===(me.client_name||"").toLowerCase()):projects.filter(p=>(p.assigned_users||[]).includes(me.username));
  const members=users.map(u=>u.name);
  const visibleProjects=accessibleProjects.filter(p=>!searchProj||p.name.toLowerCase().includes(searchProj.toLowerCase())||(p.client||"").toLowerCase().includes(searchProj.toLowerCase()));
  const filtered=tasks.filter(t=>{
    if(!accessibleProjects.some(p=>p.id===t.project_id))return false;
    if(activePid&&t.project_id!==activePid)return false;
    if(activeClient){const proj=projects.find(p=>p.id===t.project_id);if((proj?.client||"Unassigned")!==activeClient)return false;}
    if(searchTask&&!t.title.toLowerCase().includes(searchTask.toLowerCase()))return false;
    if(filterStatus!=="All"){const nsMatch=filterStatus==="Not Yet Started"&&(t.status==="Not Yet Started"||t.status==="To Be Started"||t.status==="To Do");if(!nsMatch&&t.status!==filterStatus)return false;}
    if(filterAssignee!=="All"&&t.assignee!==filterAssignee)return false;
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
    const url=stateToUrl(v,pid,client,projects);
    window.history.pushState({view:v,pid,client},'',url);
    prevViewRef.current=v;
    sv(v);sap(pid);sac(client);
    if(v==='dashboard'){sst('');sfs('All');sfa('All');}
  }
  // keep for any residual internal callers
  function switchView(v){navTo(v,v==='list'?activePid:null,v==='clientprojects'?activeClient:null);}
  async function saveTask(f){
    ssv(true);
    try{
      let pid=f.project_id;
      if(f.custName&&f.custName.trim()){
        const exists=projects.find(p=>p.name.toLowerCase()===f.custName.trim().toLowerCase());
        if(!exists){const {data:np}=await supabase.from("projects").insert({name:f.custName.trim(),client:f.client||"",color:PROJECT_COLORS[projects.length%PROJECT_COLORS.length],description:"Auto-created.",assigned_users:users.map(u=>u.username)}).select().single();if(np){sp(ps=>[...ps,np]);pid=np.id;}}
        else{pid=exists.id;}
      }
      const payload={project_id:pid,title:f.title,client:f.client,status:f.status,priority:f.priority,assignee:f.assignee||"",due_date:f.due_date||null,tags:f.tags,files:f.files,detailer:f.detailer||"",checker:f.checker||"",scope:f.scope||"",client_sub_date:f.client_sub_date||null};
      const proj=projects.find(p=>p.id===pid);
      const assigneeUser=users.find(u=>u.username===f.assignee||u.name===f.assignee);
      const assigneeEmail=assigneeUser?.email||"";
      const checkerUser=f.checker?users.find(u=>u.name===f.checker.split("/")[0].trim()):null;
      const checkerEmail=checkerUser?.email||"";
      const detailerUser=f.detailer?users.find(u=>u.name===f.detailer.split("/")[0].trim()):null;
      const detailerEmail=detailerUser?.email||"";
      const managerEmail="Manager@hub-rdsprojects.com";
      // Find client user for this project and get their email
      const clientUser=proj?users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===(proj.client||"").toLowerCase()):null;
      const clientEmail=clientUser?.email||"";
      // Helper: notify multiple recipients including client
      function notifyAll(type,payload){
        const emails=new Set([managerEmail]);
        if(assigneeEmail)emails.add(assigneeEmail);
        if(checkerEmail)emails.add(checkerEmail);
        if(detailerEmail)emails.add(detailerEmail);
        if(clientEmail)emails.add(clientEmail);
        emails.forEach(email=>notify(type,{...payload,recipientEmail:email}));
      }
      if(editTask){
        const {data}=await supabase.from("tasks").update(payload).eq("id",editTask.id).select().single();
        st(ts=>ts.map(t=>t.id===editTask.id?(data||{...t,...payload}):t));
        showToast("Task updated ✓");
        if(f.status!==editTask.status){
          if(f.status==="Done"){notifyAll("task_completed",taskCompletedPayload(data||{...editTask,...payload},proj,me));}
          else{notifyAll("status_change",statusChangePayload(data||{...editTask,...payload},proj,editTask.status,f.status,me));}
        }
        if(f.assignee&&f.assignee!==editTask.assignee){notify("task_assigned",taskAssignedPayload(data||{...editTask,...payload},proj,assigneeUser?.name||f.assignee,assigneeEmail||managerEmail,me));}
      }else{
        const {data}=await supabase.from("tasks").insert(payload).select().single();
        if(data)st(ts=>[...ts,data]);
        showToast("Task created ✓");
        if(f.assignee){notify("task_assigned",taskAssignedPayload(data||payload,proj,assigneeUser?.name||f.assignee,assigneeEmail||managerEmail,me));}
      }
      stm(false);set(null);
    }catch(e){showToast("Error: "+e.message,false);}
    ssv(false);
  }
  async function delTask(id){if(!window.confirm("Delete this task?"))return;await supabase.from("tasks").delete().eq("id",id);st(ts=>ts.filter(t=>t.id!==id));showToast("Task deleted ✓");}
  async function dropTask(tid,ns){const task=tasks.find(t=>t.id===tid);if(!task||task.status===ns)return;st(ts=>ts.map(t=>t.id===tid?{...t,status:ns}:t));await supabase.from("tasks").update({status:ns}).eq("id",tid);const proj=projects.find(p=>p.id===task.project_id);const assigneeUser=users.find(u=>u.username===task.assignee||u.name===task.assignee);const checkerUser=task.checker?users.find(u=>u.name===task.checker.split("/")[0].trim()):null;const emails=new Set(["Manager@hub-rdsprojects.com"]);if(assigneeUser?.email)emails.add(assigneeUser.email);if(checkerUser?.email)emails.add(checkerUser.email);if(ns==="Done"){emails.forEach(e=>notify("task_completed",{...taskCompletedPayload({...task,status:ns},proj,me),recipientEmail:e}));}else{emails.forEach(e=>notify("status_change",{...statusChangePayload({...task,status:ns},proj,task.status,ns,me),recipientEmail:e}));}}
  async function saveProject(f){ssv(true);try{const {data}=await supabase.from("projects").insert({name:f.name,client:f.client,color:f.color,deadline:f.deadline||null,description:f.description,assigned_users:f.assigned_users||[]}).select().single();if(data){sp(ps=>[...ps,data]);const pcu=users.find(u=>u.role==="Client"&&(u.client_name||"").toLowerCase()===(f.client||"").toLowerCase());const pce=pcu?.email||"";const pEmails=new Set(["Manager@hub-rdsprojects.com"]);if(pce)pEmails.add(pce);pEmails.forEach(em=>notify("project_created",{...projectCreatedPayload(data,me),recipientEmail:em}));}spm(false);showToast("Project created ✓");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function updateProject(f){ssv(true);try{const {data}=await supabase.from("projects").update({name:f.name,client:f.client,color:f.color,deadline:f.deadline||null,description:f.description,assigned_users:f.assigned_users||[]}).eq("id",editProject.id).select().single();if(data)sp(ps=>ps.map(p=>p.id===editProject.id?data:p));sep(null);showToast("Project updated ✓");}catch(e){showToast("Error: "+e.message,false);}ssv(false);}
  async function deleteProject(id){if(!window.confirm("Delete this project and all its tasks?"))return;await supabase.from("tasks").delete().eq("project_id",id);await supabase.from("projects").delete().eq("id",id);sp(ps=>ps.filter(p=>p.id!==id));st(ts=>ts.filter(t=>t.project_id!==id));if(activePid===id)sap(null);showToast("Project deleted ✓");}
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
  const navs=[["dashboard","◈","Dashboard"],["kanban","⊞","Kanban"],["list","≡","Task List"]];
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
            {(isAdmin||isManager)&&<IBtn icon="+" onClick={()=>spm(true)} title="New Project" color={C.accent}/>}
          </div>
          <button onClick={()=>{sap(null);sac(null);}} style={sel(!activePid&&!activeClient)}><div style={{width:8,height:8,borderRadius:"50%",background:C.t3}}/>All Projects</button>
          {visibleProjects.map(p=>(
            <button key={p.id} onClick={()=>{sap(p.id);sac(null);}} style={sel(activePid===p.id)}>
              <div style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
              <span style={{flex:1,wordBreak:"break-word",lineHeight:1.3}}>{p.name}</span>
              {canEdit&&activePid===p.id&&(
                <div style={{display:"flex",gap:2,flexShrink:0}}>
                  <IBtn icon="✏️" title="Edit" onClick={e=>{e.stopPropagation();sep(p);}} color={C.t2}/>
                  {isAdmin&&<IBtn icon="🗑" title="Delete" onClick={e=>{e.stopPropagation();deleteProject(p.id);}} color={C.red}/>}
                </div>
              )}
            </button>
          ))}
          {!isClient&&(
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
              <button onClick={()=>{localStorage.removeItem("rds_user");sm(null);sMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 10px",color:C.red,fontSize:13,fontFamily:"inherit",borderRadius:6,fontWeight:600}}>🚪 Sign Out</button>
            </div>
          )}
        </div>
      </aside>
      <main style={{flex:1,padding:24,overflow:"auto",height:"100vh",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h1 style={{margin:0,fontSize:24,fontWeight:800,color:"#ffffff"}}>{view==="dashboard"?"Dashboard":view==="kanban"?"Kanban Board":view==="clientprojects"?`${activeClient} — Projects`:"Task List"}</h1>
            <p style={{margin:"3px 0 0",color:C.t3,fontSize:13}}>{activeClient?`Client: ${activeClient}`:activePid?projects.find(p=>p.id===activePid)?.name:"All Projects"}</p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {view!=="dashboard"&&(
              <>
                <input placeholder="Search tasks…" value={searchTask} onChange={e=>sst(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.t1,fontSize:13,outline:"none",width:150,fontFamily:"inherit"}}/>
                <select value={filterStatus} onChange={e=>sfs(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Status</option>
                  {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterAssignee} onChange={e=>sfa(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="All">All Assignees</option>
                  {members.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </>
            )}
            <button onClick={()=>exportExcel(accessibleProjects,filtered)} style={{...GBtn,display:"flex",alignItems:"center",gap:6,padding:"9px 14px",fontSize:13}}>📊 Export</button>
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
        {view==="dashboard"&&!isAdmin&&!isManager&&!isClient&&(
          <UserDashboard
            me={me} tasks={tasks} projects={projects} clients={clients} today={today}
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
            {/* ── Search + Always-visible Filters ── */}
            <div style={{background:C.card,border:`1px solid ${hasDashFilter?C.accent:C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                <input placeholder="🔍  Search tasks, projects, users…" value={dashSearch} onChange={e=>sdss(e.target.value)}
                  style={{flex:1,background:C.surface,border:`1px solid ${dashSearch?C.accent:C.border}`,borderRadius:8,padding:"9px 14px",color:C.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                {hasDashFilter&&<button onClick={()=>{sdss("");sdsu("All");sdsp("All");sdsc("All");sdsst("All");}} style={{...GBtn,padding:"9px 14px",fontSize:13,color:C.red,borderColor:C.red,whiteSpace:"nowrap"}}>✕ Clear All</button>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                <div>
                  <label style={{display:"block",color:C.t3,fontSize:11,fontWeight:600,textTransform:"uppercase",marginBottom:5}}>By User</label>
                  <select value={dashUser} onChange={e=>sdsu(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${dashUser!=="All"?C.accent:C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="All">All Users</option>
                    {users.map(u=><option key={u.username} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",color:C.t3,fontSize:11,fontWeight:600,textTransform:"uppercase",marginBottom:5}}>By Client</label>
                  <select value={dashClient} onChange={e=>sdsc(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${dashClient!=="All"?C.accent:C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="All">All Clients</option>
                    {[...new Set(accessibleProjects.map(p=>p.client||"Unassigned"))].sort().map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",color:C.t3,fontSize:11,fontWeight:600,textTransform:"uppercase",marginBottom:5}}>By Project</label>
                  <select value={dashProject} onChange={e=>sdsp(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${dashProject!=="All"?C.accent:C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="All">All Projects</option>
                    {(dashClient!=="All"?accessibleProjects.filter(p=>(p.client||"Unassigned")===dashClient):accessibleProjects).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",color:C.t3,fontSize:11,fontWeight:600,textTransform:"uppercase",marginBottom:5}}>By Status</label>
                  <select value={dashStatus} onChange={e=>sdsst(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${dashStatus!=="All"?C.accent:C.border}`,borderRadius:7,padding:"7px 10px",color:C.t1,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="All">All Statuses</option>
                    {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {hasDashFilter&&<p style={{margin:"10px 0 0",fontSize:12,color:C.accent}}>Showing {activeDashTasks.length} of {dashTasks.length} tasks</p>}
            </div>
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
            <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#ffffff"}}>Projects Overview</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:18,marginBottom:28}}>
              {accessibleProjects.map(p=>{
                const pv=prog(p.id),pt=tasks.filter(t=>t.project_id===p.id);
                const pd=pt.filter(t=>isDone(t.status)).length;
                const pip=pt.filter(t=>t.status==="In Progress").length;
                const ptd=pt.filter(t=>t.status==="To Do"||t.status==="To Be Started"||t.status==="Not Yet Started").length;
                const pov=pt.filter(t=>t.due_date&&t.due_date<today&&!isDone(t.status)).length;
                const assignees=[...new Set(pt.map(t=>t.assignee).filter(Boolean))];
                return(
                  <div key={p.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",borderTop:`4px solid ${p.color}`,transition:"transform .15s,box-shadow .15s"}}
                    onClick={()=>navTo('list',p.id)}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px #00000070";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <h3 style={{margin:0,fontSize:15,fontWeight:800,flex:1,color:"#ffffff",lineHeight:1.3}}>{p.name}</h3>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:10,flexShrink:0}}>
                        {canEdit&&(<><IBtn icon="✏️" title="Edit Project" onClick={e=>{e.stopPropagation();sep(p);}} color={C.t2}/>{isAdmin&&<IBtn icon="🗑" title="Delete Project" onClick={e=>{e.stopPropagation();deleteProject(p.id);}} color={C.red}/>}</>)}
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
        {view==="kanban"&&(
          <>
            {activeClient&&(<div style={{marginBottom:16,padding:"10px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:C.t2}}>Client filter:</span><Bdg color={C.teal}>{activeClient}</Bdg><button onClick={()=>sac(null)} style={{...GBtn,padding:"4px 10px",fontSize:12,marginLeft:"auto"}}>✕ Clear</button></div>)}
            <div style={{display:"flex",gap:14,overflow:"auto",paddingBottom:16}}>
              {kanbanCols.map(col=>(<KCol key={col} status={col} tasks={filtered.filter(t=>t.status===col)} projects={projects} onEdit={t=>{if(canEdit){set(t);stm(true);}}} onDelete={delTask} onDrop={canEdit?dropTask:()=>{}} readonly={!canEdit}/>))}
            </div>
          </>
        )}
        {view==="clientprojects"&&(()=>{
          const cpProjects=accessibleProjects.filter(p=>(p.client||"Unassigned")===activeClient);
          const cpTasks=tasks.filter(t=>cpProjects.some(p=>p.id===t.project_id));
          const cpAssignees=[...new Set(cpTasks.map(t=>t.assignee).filter(Boolean))].sort();
          return(
            <div>
              {/* Header + Back */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <button onClick={()=>navTo('dashboard')} style={{...GBtn,padding:"7px 14px",fontSize:13,display:"flex",alignItems:"center",gap:6}}>← Back</button>
                <span style={{color:C.t3,fontSize:13}}>{cpProjects.length} project(s) · {cpTasks.length} tasks</span>
              </div>
              {/* Search + Filter bar */}
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
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.surface}}>{["Task","Project","Client","Scope","Status","Priority","Assignee","Detailer","Checker","Due Date","Client Sub Date",""].map(h=>(<th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>{filtered.length===0?<tr><td colSpan={12} style={{padding:32,textAlign:"center",color:C.t3}}>No tasks found</td></tr>:filtered.map(t=><TRow key={t.id} task={t} project={projects.find(p=>p.id===t.project_id)} onEdit={t=>{set(t);stm(true);}} onDelete={delTask} readonly={!canEdit}/>)}</tbody>
            </table>
          </div>
        )}
      </main>
      {statModal&&<StatTaskModal title={statModal.title} tasks={statModal.tasks} projects={projects} today={today} canEdit={canEdit} onEdit={t=>{set(t);stm(true);ssm(null);}} onClose={()=>ssm(null)}/>}
      {clientModal&&<ClientsModal clients={clients} users={users} onAdd={addClient} onEdit={editClient} onDelete={deleteClient} onSavePortal={savePortal} onClose={()=>scm(false)}/>}
      {pwModal&&<ChangePasswordModal me={me} onClose={()=>spwm(false)}/>}
      {userModal&&<UsersModal users={users} currentUser={me} projects={projects} clients={clients} onAdd={addUser} onEdit={editUserFn} onDelete={delUser} onClose={()=>sum(false)}/>}
      {editProject&&(<Modal title="Edit Project" onClose={()=>sep(null)} wide><EditProjectForm project={editProject} onSave={updateProject} onClose={()=>sep(null)} saving={saving} users={users} clients={clients}/></Modal>)}
      {taskModal&&(<Modal title={editTask?"Edit Task":"New Task"} onClose={()=>{stm(false);set(null);}} wide><TaskForm initial={editTask||(activePid?{project_id:activePid}:{})} projects={accessibleProjects} members={members} clients={clients} onSave={saveTask} onClose={()=>{stm(false);set(null);}} saving={saving}/></Modal>)}
      {projModal&&(<Modal title="New Project" onClose={()=>spm(false)}><ProjectForm onSave={saveProject} onClose={()=>spm(false)} saving={saving} users={users} clients={clients}/></Modal>)}
    </div>
  );
}