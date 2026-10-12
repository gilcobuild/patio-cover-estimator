/* Gilco site photos: saves the customer's quote and collects 4 existing-condition photos + 1 front-of-house photo.
   Used by index.html (after "Get my quote") and photos.html (come back later / at contract signing). */
(function(){
const SBU="https://tgbgianugkdtvvoodiuf.supabase.co";
const ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmdpYW51Z2tkdHZ2b29kaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4Mzg5MjMsImV4cCI6MjEwNzQxNDkyM30.r1kie-OKalQedvq5zyopm1QaDPd-Pdk_LcT19XYl2j4";
const SLOTS=[
  {k:"c1",t:"Patio area from your back door",h:"Stand in the doorway and shoot out toward the yard."},
  {k:"c2",t:"Back of the house from the yard",h:"Show the wall and roof edge where the cover attaches."},
  {k:"c3",t:"Left side of the patio area",h:"Stand at the left edge and shoot across."},
  {k:"c4",t:"Right side of the patio area",h:"Stand at the right edge and shoot across."},
  {k:"front",t:"Front of your house",h:"From the street, so the installer finds the right house. You can add this later or when you sign.",opt:true}];
const css=`.gp{display:grid;gap:12px}.gp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gp-slot{position:relative;display:grid;gap:6px;border:1px dashed #b8c0c8;border-radius:10px;padding:8px;background:#fff;cursor:pointer;min-width:0}
.gp-slot.has{border-style:solid;border-color:#b9dcc7;background:#f3faf6}.gp-slot.opt{grid-column:1/-1}
.gp-slot input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.gp-pic{aspect-ratio:4/3;border-radius:7px;background:#eef1f3 center/cover no-repeat;display:grid;place-items:center;color:#5d6872;font-size:28px}
.gp-slot.opt .gp-pic{aspect-ratio:16/7}
.gp-slot b{font-size:13.5px;line-height:1.25}.gp-slot span{font-size:12px;color:#5d6872;line-height:1.3}
.gp-slot em{font-style:normal;font-size:12px;font-weight:700;color:#8a5a2b}.gp-slot.has em{color:#2f7d4f}
.gp-bar{font-size:14px;font-weight:600}.gp-bar.ok{color:#2f7d4f}
.gp-link{display:flex;gap:8px;align-items:center;font-size:13px;color:#5d6872;flex-wrap:wrap}
.gp-link button{border:1px solid #d3d8dd;background:#fff;border-radius:7px;padding:6px 10px;font:600 13px inherit;cursor:pointer;color:#1d2329}`;
function addCss(){if(document.getElementById("gpcss"))return;const s=document.createElement("style");s.id="gpcss";s.textContent=css;document.head.appendChild(s)}
async function rpc(fn,args){
  const r=await fetch(SBU+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:ANON,Authorization:"Bearer "+ANON,"Content-Type":"application/json"},body:JSON.stringify(args)});
  if(!r.ok)throw new Error("HTTP "+r.status);return r.json();
}
function shrink(file){
  return new Promise((ok,bad)=>{
    const img=new Image(),u=URL.createObjectURL(file);
    img.onload=()=>{const k=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
      const c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
      c.toBlob(b=>b?ok(b):bad(new Error("shrink")),"image/jpeg",0.82)};
    img.onerror=()=>{URL.revokeObjectURL(u);bad(new Error("read"))};img.src=u;
  });
}
async function upload(token,slot,file){
  const blob=await shrink(file);
  const path=`${token}/${slot}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}.jpg`;
  const r=await fetch(`${SBU}/storage/v1/object/site-photos/${path}`,{method:"POST",
    headers:{apikey:ANON,Authorization:"Bearer "+ANON,"Content-Type":"image/jpeg","x-upsert":"false"},body:blob});
  if(!r.ok)throw new Error("upload "+r.status);
  const res=await rpc("pc_photo_add",{p_token:token,p_slot:slot,p_path:path});
  if(res.state!=="ok")throw new Error(res.state);
  return res.photos;
}
const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
function mount(box,token,photos,opts){
  addCss();opts=opts||{};let busy={};
  const link=location.origin+location.pathname.replace(/[^/]*$/,"")+"photos.html?q="+token;
  function draw(){
    const need=SLOTS.filter(s=>!s.opt), have=need.filter(s=>photos[s.k]).length;
    box.innerHTML=`<div class="gp">
      ${opts.title!==false?`<h2 style="margin-top:6px">5. Photos of your patio area</h2>
      <p class="hint" style="margin:0">We need 4 photos of the area where the cover goes to confirm your price and plan the install. Tap a box to take or choose a photo.</p>`:""}
      <div class="gp-bar ${have===4?"ok":""}">${have===4?"All 4 required photos received. Thank you!":`${have} of 4 required photos`}</div>
      <div class="gp-grid">${SLOTS.map(s=>{const p=photos[s.k];return `<label class="gp-slot ${p?"has":""} ${s.opt?"opt":""}">
        <div class="gp-pic" ${p?`style="background-image:url('${esc(p.url)}')"`:""}>${p?"":"📷"}</div>
        <b>${esc(s.t)}${s.opt?" (optional for now)":""}</b><span>${esc(s.h)}</span>
        <em>${busy[s.k]?"Uploading…":p?"✓ Received — tap to replace":"Tap to add photo"}</em>
        <input type="file" accept="image/*" data-k="${s.k}" aria-label="${esc(s.t)}" ${busy[s.k]?"disabled":""}></label>`}).join("")}</div>
      <p class="hint" id="gpMsg" style="margin:0" aria-live="polite"></p>
      ${opts.showLink!==false?`<div class="gp-link">Add photos later from any phone with your photo link: <button type="button" id="gpCopy">Copy photo link</button></div>`:""}
    </div>`;
    box.querySelectorAll("input[type=file]").forEach(inp=>inp.onchange=async()=>{
      const f=inp.files&&inp.files[0];if(!f)return;const k=inp.dataset.k;busy[k]=true;draw();
      try{photos=await upload(token,k,f);busy[k]=false;draw()}
      catch(e){busy[k]=false;draw();box.querySelector("#gpMsg").textContent="That photo didn't upload. Check your signal and try again."}
    });
    const cp=box.querySelector("#gpCopy");
    if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(link);cp.textContent="Link copied"}catch(_){prompt("Copy your photo link:",link)}};
  }
  draw();
}
window.GilcoPhotos={rpc,mount,SLOTS};
/* estimator hook: save the quote when "Get my quote" is pressed, then show the photo step */
const book=document.getElementById("book"), step=document.getElementById("photoStep");
if(book&&step){
  book.addEventListener("submit",async()=>{
    try{if(typeof S==="undefined"||!S.sized)return}catch(_){return}
    const c=calc(), w=+document.getElementById("w").value, g=id=>document.getElementById(id).value.trim();
    const body={cust:{name:g("cname"),phone:g("cphone"),email:g("cemail"),addr:g("caddr"),city:g("ccity"),state:g("cstate").toUpperCase(),zip:g("czip")},
      cfg:{w,p:+document.getElementById("p").value,roof:S.roof,mount:S.mount,color:S.color,fans:S.fans,base:S.base,ds:S.ds,tier:S.tier,term:S.term},
      sell:c.sell,install:g("cdate")};
    let tok=null;try{tok=localStorage.getItem("gilcoQuoteToken")}catch(_){}
    step.hidden=false;step.innerHTML=`<p class="hint">Saving your quote…</p>`;
    try{const r=await rpc("pc_quote_save",{p_token:tok,p:body});
      try{localStorage.setItem("gilcoQuoteToken",r.token)}catch(_){}
      mount(step,r.token,r.photos||{});}
    catch(e){step.innerHTML=`<p class="hint">We couldn't save your quote just now. Check your signal and tap Get my quote again.</p>`}
  });
}
})();
