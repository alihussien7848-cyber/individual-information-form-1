(()=>{
const c=window.APP_CONFIG||{},ready=!!c.SUPABASE_URL&&c.SUPABASE_URL.startsWith("https://")&&c.SUPABASE_ANON_KEY&&!c.SUPABASE_ANON_KEY.includes("YOUR_"),db=ready?supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY):null,$=x=>document.getElementById(x);
let rows=[],editId=null;
const fields=[
["full_name","الاسم الرباعي واللقب","text"],["birth_date","المواليد","date"],["affiliation_date","تاريخ الانتماء","date"],
["marital_status","الحالة الاجتماعية","select"],["mother_name","اسم الأم","text"],["voter_number","رقم الناخب","text"],
["province","المحافظة","text"],["district","القضاء","text"],["subdistrict","الناحية","text"],["mahalla","المحلة","text"],
["street","الزقاق","text"],["house_number","الدار","text"],["education","التحصيل الدراسي","select"],["phone","رقم الهاتف","tel"],
["is_employee","موظف؟","select"],["workplace","مكان الوظيفة","text"],["profession","المهنة","text"],["recommender","المعرف أو المزكي","text"],
["facebook_url","رابط Facebook","url"],["instagram_url","رابط Instagram","url"],["tiktok_url","رابط TikTok","url"],["twitter_url","رابط Twitter / X","url"]
],opts={marital_status:["أعزب","متزوج","مطلق","أرمل"],education:["أمي","يقرأ ويكتب","ابتدائية","متوسطة","إعدادية","دبلوم","بكالوريوس","دبلوم عالٍ","ماجستير","دكتوراه"],is_employee:["نعم","لا"]};
const labels={full_name:"الاسم الرباعي واللقب",birth_date:"المواليد",affiliation_date:"تاريخ الانتماء",marital_status:"الحالة الاجتماعية",mother_name:"اسم الأم",voter_number:"رقم الناخب",province:"المحافظة",district:"القضاء",subdistrict:"الناحية",mahalla:"المحلة",street:"الزقاق",house_number:"الدار",education:"التحصيل الدراسي",phone:"رقم الهاتف",is_employee:"موظف؟",workplace:"مكان الوظيفة",profession:"المهنة",recommender:"المعرف أو المزكي",facebook_url:"Facebook",instagram_url:"Instagram",tiktok_url:"TikTok",twitter_url:"Twitter / X",created_at:"تاريخ الإرسال"};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const safeUrl=v=>{try{const u=new URL(String(v||""));return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
function say(id,t,cl=""){$(id).className=cl;$(id).textContent=t}
async function invoke(action,body={}){const {data,error}=await db.functions.invoke("admin-tools",{body:{action,...body}});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
function show(){$("login").classList.add("hidden");$("panel").classList.remove("hidden");load();loadBackupHistory()}
async function load(){
 say("status","جارٍ التحميل...");
 let q=$("q").value.trim(),query=db.from("submissions").select("*").order("id",{ascending:false}).limit(1000);
 if(q)query=query.or("full_name.ilike.%"+q+"%,phone.ilike.%"+q+"%,voter_number.ilike.%"+q+"%,recommender.ilike.%"+q+"%");
 if($("prov").value.trim())query=query.ilike("province","%"+$("prov").value.trim()+"%");
 if($("emp").value!=="")query=query.eq("is_employee",$("emp").value==="true");
 if($("from").value)query=query.gte("created_at",$("from").value+"T00:00:00");
 if($("to").value)query=query.lte("created_at",$("to").value+"T23:59:59");
 const {data,error}=await query;
 if(error){say("status","تعذر تحميل السجلات. تحقق من صلاحيات المدير وتشغيل تحديث قاعدة البيانات.","error");return}
 rows=data||[];const tb=$("rows");tb.innerHTML="";
 rows.forEach((r,index)=>{
  const links=[["facebook_url","Facebook"],["instagram_url","Instagram"],["tiktok_url","TikTok"],["twitter_url","X"]].filter(([k])=>safeUrl(r[k])).map(([k,n])=>'<a href="'+esc(safeUrl(r[k]))+'" target="_blank" rel="noopener noreferrer">'+n+'</a>').join(" · ")||"—";
  const tr=document.createElement("tr");
  tr.innerHTML='<td>'+String(index+1)+'</td><td>'+esc(r.full_name)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.province)+'</td><td>'+esc(r.district)+'</td><td>'+(r.is_employee?"نعم":"لا")+'</td><td>'+esc(String(r.created_at||"").slice(0,10))+'</td><td>'+links+'</td><td><button data-p="'+esc(r.id)+'">PDF / طباعة</button> <button data-e="'+esc(r.id)+'">تعديل</button> <button data-d="'+esc(r.id)+'">حذف</button></td>';
  tb.appendChild(tr);
 });
 say("status","عدد السجلات: "+rows.length,"success");
}
async function loadBackupHistory(){
 const {data,error}=await db.from("backup_runs").select("created_at,record_count,backup_type").order("created_at",{ascending:false}).limit(1);
 if(!error&&data?.length){const b=data[0];say("backupStatus","آخر نسخة: "+new Date(b.created_at).toLocaleString("ar-IQ")+" — عدد السجلات: "+b.record_count+" — "+(b.backup_type==="scheduled"?"تلقائية":"يدوية"))}
}
function printRecord(r){
 const order=["full_name","birth_date","affiliation_date","marital_status","mother_name","voter_number","province","district","subdistrict","mahalla","street","house_number","education","phone","is_employee","workplace","profession","recommender","facebook_url","instagram_url","tiktok_url","twitter_url","created_at"];
 const body=order.filter(k=>r[k]!==null&&r[k]!==undefined&&r[k]!=="").map(k=>{
  const val=k==="is_employee"?(r[k]?"نعم":"لا"):r[k];
  const url=["facebook_url","instagram_url","tiktok_url","twitter_url"].includes(k)?safeUrl(val):"";
  return '<tr><th>'+esc(labels[k]||k)+'</th><td>'+(url?'<a href="'+esc(url)+'">'+esc(val)+'</a>':esc(val))+'</td></tr>';
 }).join("");
 const w=window.open("","_blank","width=900,height=1000");
 if(!w){say("status","اسمح بالنوافذ المنبثقة حتى تتمكن من طباعة الاستمارة.","error");return}
 w.document.open();w.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>استمارة - '+esc(r.full_name)+'</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:28px;direction:rtl}.head{text-align:center;margin-bottom:24px}.head img{width:115px;height:115px;object-fit:contain}.head h2{font-size:20px;margin:8px}h3{text-align:center;margin:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #9aa8b8;padding:10px;text-align:right;vertical-align:top}th{width:30%;background:#eef3f8}a{color:#174f85;word-break:break-all}@media print{body{margin:12mm}tr{break-inside:avoid}a{color:#111;text-decoration:none}}</style></head><body><div class="head"><img src="'+location.origin+'/logo.png" onerror="this.style.display=\'none\'"><h2>المقاومة الإسلامية - حركة عصائب أهل الحق</h2></div><h3>استمارة معلومات الأفراد</h3><table>'+body+'</table><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>');w.document.close();
}
$("loginForm").onsubmit=async e=>{e.preventDefault();if(!db){say("loginMsg","أكمل إعداد config.js أولاً.","error");return}const f=new FormData(e.target),{error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error){say("loginMsg","بيانات الدخول غير صحيحة أو تعذر الاتصال.","error");return}show()};
$("logout").onclick=async()=>{await db.auth.signOut();$("panel").classList.add("hidden");$("login").classList.remove("hidden")};
$("search").onclick=load;
$("rows").onclick=async e=>{
 const p=e.target.dataset.p;if(p){const r=rows.find(x=>String(x.id)===p);if(r)printRecord(r);return}
 const id=e.target.dataset.e;
 if(id){const r=rows.find(x=>String(x.id)===id);editId=id;$("editFields").innerHTML="";
  for(const [k,label,type] of fields){const l=document.createElement("label");l.textContent=label;let inp;
   if(type==="select"){inp=document.createElement("select");for(const o of opts[k]){const op=document.createElement("option");op.value=k==="is_employee"?(o==="نعم"?"true":"false"):o;op.textContent=o;op.selected=k==="is_employee"?(r[k]===(o==="نعم")):r[k]===o;inp.appendChild(op)}}
   else{inp=document.createElement("input");inp.type=type;inp.value=(k==="birth_date"||k==="affiliation_date")?String(r[k]||"").slice(0,10):(r[k]??"")}
   inp.name=k;l.appendChild(inp);$("editFields").appendChild(l)
  }$("dlg").showModal();return
 }
 const del=e.target.dataset.d;if(del&&confirm("تأكيد حذف السجل؟ لا يمكن التراجع.")){const {error}=await db.from("submissions").delete().eq("id",del);if(error)say("status","فشل الحذف.","error");else load()}
};
$("cancel").onclick=()=>$("dlg").close();
$("save").onclick=async()=>{
 const fd=new FormData($("editForm")),v={};
 for(const [k] of fields){const x=String(fd.get(k)||"").trim();v[k]=k==="is_employee"?x==="true":x}
 if(v.is_employee&&!v.workplace){say("editMsg","أدخل مكان الوظيفة.","error");return}
 for(const k of ["facebook_url","instagram_url","tiktok_url","twitter_url"]){if(v[k]&&!safeUrl(v[k])){say("editMsg","أدخل رابطاً صحيحاً يبدأ بـ https://","error");return}}
 v.consent=true;v.updated_at=new Date().toISOString();
 const {error}=await db.from("submissions").update(v).eq("id",editId);
 if(error){say("editMsg","تعذر حفظ التعديلات. تأكد من تشغيل تحديث قاعدة البيانات.","error");return}
 $("dlg").close();load()
};
$("export").onclick=()=>{
 if(!rows.length)return;
 const data=rows.map((r,index)=>({"التسلسل":index+1,"رقم السجل الداخلي":r.id,"الاسم":r.full_name,"المواليد":r.birth_date,"تاريخ الانتماء":r.affiliation_date,"الحالة الاجتماعية":r.marital_status,"اسم الأم":r.mother_name,"رقم الناخب":r.voter_number,"المحافظة":r.province,"القضاء":r.district,"الناحية":r.subdistrict,"المحلة":r.mahalla,"الزقاق":r.street,"الدار":r.house_number,"التحصيل الدراسي":r.education,"الهاتف":r.phone,"موظف":r.is_employee?"نعم":"لا","مكان الوظيفة":r.workplace,"المهنة":r.profession,"المعرف أو المزكي":r.recommender,"Facebook":r.facebook_url,"Instagram":r.instagram_url,"TikTok":r.tiktok_url,"Twitter / X":r.twitter_url,"تاريخ الإرسال":r.created_at}));
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),"معلومات الأفراد");XLSX.writeFile(wb,"معلومات_الأفراد.xlsx")
};
$("backupNow").onclick=async()=>{
 $("backupNow").disabled=true;say("backupStatus","جارٍ إنشاء النسخة الاحتياطية...");
 try{const result=await invoke("backup",{backupType:"manual"});say("backupStatus","تم إنشاء نسخة احتياطية تضم "+result.record_count+" سجل.");if(result.signed_url){const a=document.createElement("a");a.href=result.signed_url;a.target="_blank";a.rel="noopener";a.click()}loadBackupHistory()}
 catch(e){console.error(e);say("backupStatus","فشل النسخ الاحتياطي: "+(e.message||"تحقق من إعداد Edge Function وStorage."),"error")}
 finally{$("backupNow").disabled=false}
};
$("restorePick").onclick=()=>$("restoreFile").click();
$("restoreFile").onchange=async()=>{
 const file=$("restoreFile").files?.[0];if(!file)return;
 try{
  if(file.size>50*1024*1024)throw new Error("حجم الملف أكبر من 50 ميغابايت.");
  const payload=JSON.parse(await file.text());
  if(payload.format!=="individual-information-form-backup-v1"||!Array.isArray(payload.records))throw new Error("صيغة النسخة الاحتياطية غير صحيحة.");
  if(!confirm("سيتم دمج "+payload.records.length+" سجل مع السجلات الحالية اعتماداً على رقم السجل. لا يتم حذف السجلات الأخرى. هل تريد المتابعة؟"))return;
  say("backupStatus","جارٍ استعادة النسخة...");
  const result=await invoke("restore",{records:payload.records});
  say("backupStatus","اكتملت الاستعادة/المطابقة. عدد السجلات المعالجة: "+result.restored,"success");load()
 }catch(e){say("backupStatus","فشلت الاستعادة: "+(e.message||"خطأ غير معروف"),"error")}
 finally{$("restoreFile").value=""}
};
$("userForm").onsubmit=async e=>{
 e.preventDefault();const email=$("newUserEmail").value.trim();
 try{say("userStatus","جارٍ إرسال الدعوة...");const result=await invoke("create_user",{email,redirectTo:location.origin+"/admin.html"});say("userStatus","تم إرسال دعوة إلى "+result.invited+". يجب على المستخدم إكمال التفعيل من بريده.","success");$("newUserEmail").value=""}
 catch(err){say("userStatus","تعذر إضافة المستخدم: "+(err.message||"تأكد أنك المدير الرئيسي وأن Edge Function مفعّلة."),"error")}
};
if(db)db.auth.getSession().then(({data})=>{if(data.session)show()});
})();