const DOCTORS=[
 {id:1,name:"Dr. Anika Rao",spec:"General physician",exp:12,fee:400,color:"#0e6b66"},
 {id:2,name:"Dr. Vikram Shah",spec:"Cardiologist",exp:18,fee:900,color:"#9b3d5a"},
 {id:3,name:"Dr. Meera Nair",spec:"Pediatrician",exp:9,fee:500,color:"#c47a12"},
 {id:4,name:"Dr. Sameer Khan",spec:"Dermatologist",exp:7,fee:600,color:"#3d5a9b"},
 {id:5,name:"Dr. Lakshmi Iyer",spec:"Gynecologist",exp:15,fee:800,color:"#6b4a9b"},
 {id:6,name:"Dr. Arjun Reddy",spec:"Orthopedist",exp:11,fee:750,color:"#2f7d4f"}
];
const TIMES=["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30"];
const KEY="careslot.appointments.v1";
let state={spec:"All",doc:null,date:null,time:null};
let appts=load();

function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return []}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(appts))}catch(e){}}
const $=id=>document.getElementById(id);
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const initials=n=>n.replace("Dr. ","").split(" ").map(w=>w[0]).join("");
const fmtDate=(s,o)=>new Date(s+"T00:00").toLocaleDateString("en-IN",o||{weekday:"short",day:"numeric",month:"short"});
const fmtTime=t=>{const[h,m]=t.split(":").map(Number);return(h%12||12)+":"+String(m).padStart(2,"0")+(h<12?" am":" pm")};
function nextDays(){const out=[];const d=new Date();while(out.length<7){if(d.getDay()!==0)out.push(new Date(d));d.setDate(d.getDate()+1)}return out}
function hash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h}
function taken(docId,date,time){
  if(appts.some(a=>a.docId===docId&&a.date===date&&a.time===time))return true;
  return hash(docId+date+time)%5===0; // simulated bookings by other patients
}
function isPast(date,time){return new Date(date+"T"+time)<=new Date()}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2800)}

function renderChips(){
  const specs=["All",...new Set(DOCTORS.map(d=>d.spec))];
  $("chips").innerHTML=specs.map(s=>`<button class="chip" aria-pressed="${s===state.spec}" data-s="${s}">${s}</button>`).join("");
  $("chips").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.spec=b.dataset.s;renderChips();renderDocs()});
}
function renderDocs(){
  const list=DOCTORS.filter(d=>state.spec==="All"||d.spec===state.spec);
  $("docs").innerHTML=list.map(d=>`<button class="doc" aria-pressed="${state.doc===d.id}" data-id="${d.id}">
    <span class="av" style="background:${d.color}">${initials(d.name)}</span>
    <span><b>${d.name}</b><small>${d.spec}</small></span>
    <span class="meta">${d.exp} yrs experience<br>₹${d.fee} per visit</span></button>`).join("");
  $("docs").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    state.doc=+b.dataset.id;state.time=null;if(!state.date)state.date=iso(nextDays()[0]);
    renderDocs();renderPanel();
    if(window.innerWidth<=900)$("panel").scrollIntoView({behavior:"smooth"});
  });
}
function renderPanel(){
  const p=$("panel"),d=DOCTORS.find(x=>x.id===state.doc);
  if(!d){p.innerHTML=`<h2>Book your visit</h2><p class="sub">Select a doctor to see available times.</p>`;return}
  const days=nextDays().map(x=>`<button class="day" data-d="${iso(x)}" aria-pressed="${iso(x)===state.date}"><span>${x.toLocaleDateString("en-IN",{weekday:"short"})}</span><b>${x.getDate()}</b></button>`).join("");
  const slots=TIMES.map(t=>{const off=taken(d.id,state.date,t)||isPast(state.date,t);
    return `<button class="slot" data-t="${t}" ${off?"disabled":""} aria-pressed="${state.time===t}">${fmtTime(t)}</button>`}).join("");
  p.innerHTML=`<h2>${d.name}</h2><p class="sub">${d.spec} · ₹${d.fee}</p>
    <span class="label">Choose a day</span><div class="days">${days}</div>
    <span class="label">Choose a time</span><div class="slots">${slots}</div>
    <span class="label" style="margin-top:18px">Patient details</span>
    <input id="pname" value="${esc(user?user.name:"")}" placeholder="Full name" autocomplete="name" aria-label="Full name"><p class="err" id="e1"></p>
    <input id="pphone" placeholder="Mobile number (10 digits)" inputmode="numeric" autocomplete="tel" aria-label="Mobile number"><p class="err" id="e2"></p>
    <textarea id="preason" rows="2" placeholder="Reason for visit (optional)" aria-label="Reason for visit"></textarea>
    <button class="btn" id="confirm" ${state.time?"":"disabled"}>${state.time?"Confirm appointment":"Pick a time to continue"}</button>`;
  p.querySelectorAll(".day").forEach(b=>b.onclick=()=>{state.date=b.dataset.d;state.time=null;renderPanel()});
  p.querySelectorAll(".slot").forEach(b=>b.onclick=()=>{state.time=b.dataset.t;keepForm(renderPanel)});
  $("confirm").onclick=confirmBooking;
}
function keepForm(fn){const v=["pname","pphone","preason"].map(i=>$(i).value);fn();["pname","pphone","preason"].forEach((i,k)=>$(i).value=v[k])}
function confirmBooking(){
  if(!user){show("auth");return}
  const name=$("pname").value.trim(),phone=$("pphone").value.replace(/\s/g,"");
  let ok=true;
  $("e1").textContent=name.length<2?(ok=false,"Enter the patient's full name."):"";
  $("e2").textContent=/^\d{10}$/.test(phone)?"":(ok=false,"Enter a 10-digit mobile number.");
  if(!ok)return;
  if(taken(state.doc,state.date,state.time)){toast("That time was just taken. Pick another.");state.time=null;renderPanel();return}
  const d=DOCTORS.find(x=>x.id===state.doc);
  appts.push({id:Date.now(),owner:user.email,docId:d.id,doctor:d.name,spec:d.spec,fee:d.fee,date:state.date,time:state.time,name,phone,reason:$("preason").value.trim()});
  save();toast("Booked with "+d.name+" on "+fmtDate(state.date)+" at "+fmtTime(state.time));
  state.time=null;renderPanel();renderAppts();show("mine");
}
function renderAppts(){
  const up=appts.filter(a=>user&&a.owner===user.email).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("count").textContent=up.length;
  $("appts").innerHTML=up.length?up.map(a=>`<div class="appt">
    <div class="when">${fmtDate(a.date)}<br>${fmtTime(a.time)}</div>
    <div class="info"><b>${esc(a.doctor)}</b><small>${esc(a.spec)} · ₹${a.fee}</small><small>Patient: ${esc(a.name)} · ${esc(a.phone)}</small>${a.reason?`<small>Reason: ${esc(a.reason)}</small>`:""}</div>
    <button class="cancel" data-id="${a.id}">Cancel</button></div>`).join("")
  :`<div class="empty"><p>You have no appointments yet.</p><button class="btn" id="goBook">Book your first visit</button></div>`;
  $("appts").querySelectorAll(".cancel").forEach(b=>b.onclick=()=>{
    if(!confirm("Cancel this appointment?"))return;
    appts=appts.filter(a=>a.id!==+b.dataset.id);save();renderAppts();renderPanel();toast("Appointment cancelled")});
  const g=$("goBook");if(g)g.onclick=()=>show("book");
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function show(v){
  ["book","mine","auth"].forEach(k=>$("view-"+k).classList.toggle("hidden",k!==v));
  $("tab-book").setAttribute("aria-selected",v==="book");$("tab-mine").setAttribute("aria-selected",v==="mine");
  window.scrollTo({top:0});
}
$("tab-book").onclick=()=>show("book");$("tab-mine").onclick=()=>show("mine");
renderChips();renderDocs();

/* ---------- Login / Sign up (frontend only, stored in this browser) ---------- */
const UKEY="careslot.users.v1",SKEY="careslot.session.v1";
let user=null,mode="in";
function getUsers(){try{return JSON.parse(localStorage.getItem(UKEY))||{}}catch(e){return {}}}
function setUsers(u){try{localStorage.setItem(UKEY,JSON.stringify(u))}catch(e){}}
async function hashPw(pw,salt){
  try{
    const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+pw));
    return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
  }catch(e){return String(hash(salt+pw))}
}
function setMode(m){
  mode=m;
  $("s-in").setAttribute("aria-selected",m==="in");$("s-up").setAttribute("aria-selected",m==="up");
  $("f-name").classList.toggle("hidden",m!=="up");
  $("atitle").textContent=m==="in"?"Welcome back":"Create your account";
  $("asubmit").textContent=m==="in"?"Log in":"Sign up";
  ["ea0","ea1","ea2"].forEach(i=>$(i).textContent="");
}
async function submitAuth(){
  const name=$("aname").value.trim(),email=$("aemail").value.trim().toLowerCase(),pw=$("apass").value;
  let ok=true;
  ["ea0","ea1","ea2"].forEach(i=>$(i).textContent="");
  if(mode==="up"&&name.length<2){$("ea0").textContent="Enter your full name.";ok=false}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$("ea1").textContent="Enter a valid email address.";ok=false}
  if(pw.length<6){$("ea2").textContent="Password must be at least 6 characters.";ok=false}
  if(!ok)return;
  const users=getUsers();
  if(mode==="up"){
    if(users[email]){$("ea1").textContent="This email is already registered. Try logging in.";return}
    const salt=String(Date.now())+Math.random();
    users[email]={name,salt,hash:await hashPw(pw,salt)};
    setUsers(users);login(email,name);toast("Account created. Welcome, "+name+"!");
  }else{
    const u=users[email];
    if(!u||u.hash!==await hashPw(pw,u.salt)){$("ea2").textContent="Incorrect email or password.";return}
    login(email,u.name);toast("Welcome back, "+u.name+"!");
  }
}
function login(email,name){
  user={email,name};
  try{localStorage.setItem(SKEY,email)}catch(e){}
  $("aname").value="";$("aemail").value="";$("apass").value="";
  applyAuth();renderPanel();renderAppts();show("book");
}
function logout(){
  user=null;state.doc=null;state.time=null;
  try{localStorage.removeItem(SKEY)}catch(e){}
  applyAuth();renderDocs();renderPanel();renderAppts();setMode("in");show("auth");toast("You have logged out.");
}
function applyAuth(){
  $("nav").classList.toggle("hidden",!user);$("user").classList.toggle("hidden",!user);
  if(user)$("uname").textContent="Hi, "+user.name.split(" ")[0];
}
function init(){
  try{const em=localStorage.getItem(SKEY),u=getUsers()[em];if(u)user={email:em,name:u.name}}catch(e){}
  applyAuth();renderPanel();renderAppts();show(user?"book":"auth");
}
$("s-in").onclick=()=>setMode("in");$("s-up").onclick=()=>setMode("up");
$("asubmit").onclick=submitAuth;$("logout").onclick=logout;
["aname","aemail","apass"].forEach(i=>$(i).addEventListener("keydown",e=>{if(e.key==="Enter")submitAuth()}));
init();

$("tab-book").onclick=()=>show("book");$("tab-mine").onclick=()=>show("mine");
renderChips();renderDocs();renderPanel();renderAppts();
