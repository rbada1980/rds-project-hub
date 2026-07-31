// attendance-reminder.cjs
// Run at 10:00 AM IST on weekdays via Task Scheduler
// Finds all employees with no attendance record today → emails HR

const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

// IST today date
function todayIST(){
  return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}); // YYYY-MM-DD
}

function dayOfWeek(){
  return new Date().toLocaleDateString("en-US",{timeZone:"Asia/Kolkata",weekday:"long"});
}

async function main(){
  const today=todayIST();
  const day=new Date().toLocaleString("en-US",{timeZone:"Asia/Kolkata",weekday:"short"});
  // Skip weekends
  if(day==="Sat"||day==="Sun"){console.log("Weekend — skipping");return;}

  // Get all active employees (not Admin, not Client)
  const {data:allUsers}=await sb.from("users").select("id,name,role,email,is_active")
    .not("role","in","(Admin,Client)")
    .neq("is_active",false);

  if(!allUsers||allUsers.length===0){console.log("No employees found");return;}

  // Get today's attendance records
  const {data:attRows}=await sb.from("attendance").select("user_id").eq("date",today);
  const presentIds=new Set((attRows||[]).map(r=>r.user_id));

  // Find absent employees
  const absent=allUsers.filter(u=>!presentIds.has(u.id));

  if(absent.length===0){
    console.log(`✅ All ${allUsers.length} employees marked attendance for ${today}`);
    return;
  }

  console.log(`⚠ ${absent.length} employees not marked attendance for ${today}:`);
  absent.forEach(u=>console.log(`  - ${u.name} (${u.role})`));

  // Build email HTML
  const rows=absent.map(u=>`
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${u.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">${u.role}</td>
    </tr>`).join("");

  const html=`
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;border-radius:12px 12px 0 0">
      <h2 style="color:#fff;margin:0">⚠️ Attendance Alert — ${dayOfWeek()}, ${today}</h2>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">
        ${absent.length} of ${allUsers.length} employees have not marked attendance by 10:00 AM IST
      </p>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Employee</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Role</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">— RDS Projects Auto Alert · Sent at 10:00 AM IST</p>
    </div>
  </div>`;

  // Send via local server
  try{
    const res=await fetch("http://localhost:3000/api/send-email",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        to:["lavanya@rdstechserv.com","ramesh@rdstechserv.com"],
        subject:`⚠️ Attendance Alert — ${absent.length} not marked (${today})`,
        html,
        fromName:"RDS Projects",
        fromEmail:"noreply@hub-rdsprojects.com"
      })
    });
    const d=await res.json();
    if(d.ok) console.log("✅ HR email sent");
    else console.log("❌ Email error:",d.error);
  }catch(e){
    console.log("❌ Could not reach local server:",e.message);
  }
}

main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
