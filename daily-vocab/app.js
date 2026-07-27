/* Daily Vocab — Wikipedia-style. Vanilla JS, state in localStorage. */
(function () {
  "use strict";
  var WORDS = window.WORDS || [];
  var KEY = "dailyVocab.v2";

  function pad(n){return n<10?"0"+n:""+n;}
  function tk(d){d=d||new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
  function dayNum(d){d=d||new Date();var l=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor(l.getTime()/86400000);}
  function pretty(k){var p=k.split("-");return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});}
  function shortD(k){var p=k.split("-");return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString(undefined,{month:"short",day:"numeric"});}
  function id(x){return document.getElementById(x);}
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}

  var state = load();
  function load(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&typeof s==="object"){s.history=s.history||[];s.goals=s.goals||[];s.notify=s.notify||{enabled:false};return s;}}catch(e){}return {history:[],goals:[],notify:{enabled:false}};}
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}

  function wIdx(d){return WORDS.length?dayNum(d)%WORDS.length:0;}
  function wod(){return WORDS[wIdx()];}
  function seen(){var i=wIdx(),k=tk();if(!state.history.some(function(h){return h.date===k;})){state.history.push({date:k,index:i,word:WORDS[i].word});save();}}
  function toast(m){var t=id("toast");t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(function(){t.hidden=true;},2600);}

  /* ---------- rendering ---------- */
  function explainHTML(w){return w.simple?'<button class="exp-btn" data-explain type="button">Show simple definition</button><div class="note" data-simplebox hidden><span class="lab">In plain words</span>'+esc(w.simple)+'</div>':"";}
  function synHTML(w){return '<p class="syn-line"><span class="lbl">Synonyms: </span>'+w.synonyms.map(function(s){return '<span class="syn">'+esc(s)+'</span>';}).join("")+'</p>';}
  function bodyHTML(w){return '<p class="def">'+esc(w.definition)+'</p>'+explainHTML(w)+'<p class="example">'+esc(w.example)+'</p>'+synHTML(w)+'<div class="note"><span class="lab">Memory tip</span>'+esc(w.tip)+'</div>';}
  function metaHTML(w){return '<span class="ipa">'+esc(w.ipa)+'</span> · <span class="pos">'+esc(w.pos)+'</span>';}
  function detailHTML(w){return '<h3>'+esc(w.word)+'</h3><p class="meta">'+metaHTML(w)+'</p>'+bodyHTML(w);}

  function streak(){if(!state.history.length)return 0;var days={};state.history.forEach(function(h){days[h.date]=true;});var n=0,d=new Date();if(!days[tk(d)])d.setDate(d.getDate()-1);while(days[tk(d)]){n++;d.setDate(d.getDate()-1);}return n;}
  function renderStreak(){var el=id("streakWrap"),s=streak();el.innerHTML=s>=2?'<span class="streak">Current streak: '+s+' days</span>':"";}

  function renderToday(){
    var w=wod();
    id("dateLine").textContent="Word of the day · "+pretty(tk());
    id("headword").textContent=w.word;
    id("meta").innerHTML=metaHTML(w);
    id("cardBody").innerHTML=bodyHTML(w);
    var pc=id("pcWord");if(pc)pc.textContent=w.word;
    renderStreak();
    var box=id("todayGoalBox");box.innerHTML="";
    var g=state.goals.filter(function(x){return x.word===w.word&&!done(x);})[0];
    if(g)box.appendChild(goalNode(g,true));
  }

  /* ---------- goals ---------- */
  function done(g){return g.checkins.length>=g.target;}
  function createGoal(word,days){var w=WORDS.filter(function(x){return x.word===word;})[0];if(!w)return;if(state.goals.filter(function(g){return g.word===word&&!done(g);})[0]){toast("You already have an active goal for "+word);sv("goals");return;}state.goals.unshift({id:"g"+Date.now(),word:word,def:w.definition,target:days,checkins:[]});save();toast("Goal set — use "+word+" every day for "+days+" days.");renderAll();sv("goals");}
  function checkin(gid){var g=state.goals.filter(function(x){return x.id===gid;})[0];if(!g)return;var k=tk();if(g.checkins.indexOf(k)!==-1){toast("Already checked in today.");return;}g.checkins.push(k);save();toast(done(g)?"Goal complete — you practiced "+g.word+" for "+g.target+" days.":"Checked in: "+g.checkins.length+" / "+g.target+" days.");renderAll();}
  function delGoal(gid){state.goals=state.goals.filter(function(x){return x.id!==gid;});save();renderAll();}
  function goalNode(g,compact){
    var d=done(g),ct=g.checkins.indexOf(tk())!==-1,pct=Math.min(100,Math.round(g.checkins.length/g.target*100));
    var el=document.createElement("div");el.className="goal"+(d?" done":"");
    var dots="";for(var i=0;i<g.target;i++){dots+='<div class="dot'+(i<g.checkins.length?" f":"")+'">'+(i<g.checkins.length?"✓":(i+1))+"</div>";}
    var act;
    if(d)act='<span class="cd">Mastered</span> <button class="link-btn" data-del="'+g.id+'">Remove</button>';
    else if(ct)act='<span class="cd">Checked in today</span> <button class="link-btn" data-del="'+g.id+'">Give up</button>';
    else act='<button class="btn btn-good" data-checkin="'+g.id+'">I used it today</button><button class="link-btn" data-del="'+g.id+'">Give up</button>';
    el.innerHTML='<div class="goal-top"><span class="gw">'+esc(g.word)+'</span><span class="gs '+(d?"done":"")+'">'+(d?"Complete":g.checkins.length+"/"+g.target+" days")+'</span></div>'+(compact?"":'<div class="gd">'+esc(g.def)+'</div>')+'<div class="prog"><span style="width:'+pct+'%"></span></div><div class="dots">'+dots+'</div><div class="gact">'+act+'</div>';
    return el;
  }
  function renderGoals(){var l=id("goalsList");l.innerHTML="";if(!state.goals.length){l.innerHTML='<div class="empty"><span class="big">&#9873;</span>No goals yet. Open Today and select Set a practice goal.</div>';return;}state.goals.forEach(function(g){l.appendChild(goalNode(g,false));});}
  function renderHist(){var l=id("historyList");var items=state.history.slice().sort(function(a,b){return a.date<b.date?1:-1;});l.innerHTML="";if(!items.length){l.innerHTML='<div class="empty"><span class="big">&#128214;</span>No words yet — check back tomorrow.</div>';return;}items.forEach(function(h){var w=WORDS[h.index];if(!w)return;var n=document.createElement("div");n.className="hist";n.innerHTML='<div><div class="hw">'+esc(w.word)+'</div><div class="hd">'+esc(w.definition)+'</div></div><div class="hdt">'+(h.date===tk()?"Today":shortD(h.date))+'</div>';n.addEventListener("click",function(){openDetail(w);});l.appendChild(n);});}
  function renderAll(){renderToday();renderGoals();renderHist();}

  /* ---------- tabs / modals ---------- */
  function sv(name){document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.dataset.view===name);});document.querySelectorAll(".view").forEach(function(v){v.classList.toggle("on",v.id==="view-"+name);});}
  var pending=null,days=5;
  function openGoal(word){pending=word;id("goalModalWord").textContent=word;id("goalModal").hidden=false;}
  function closeGoal(){id("goalModal").hidden=true;}
  var detailW=null;
  function openDetail(w){detailW=w;id("detailBody").innerHTML=detailHTML(w);id("detailModal").hidden=false;}
  function closeDetail(){id("detailModal").hidden=true;}

  /* ---------- pronunciation ---------- */
  function speak(t){if(!("speechSynthesis" in window)){toast("Speech is not supported here.");return;}try{if(speechSynthesis.paused)speechSynthesis.resume();speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=0.92;var vs=speechSynthesis.getVoices()||[],v=vs.filter(function(x){return /^en/i.test(x.lang);})[0];if(v)u.voice=v;speechSynthesis.speak(u);toast("Speaking: "+t);}catch(e){toast("Could not play audio.");}}

  /* ---------- notifications ---------- */
  function isIOS(){return /iP(hone|ad|od)/.test(navigator.userAgent);}
  function standalone(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;}
  function notifyBtn(){var b=id("notifyBtn"),on=state.notify.enabled&&("Notification" in window)&&Notification.permission==="granted";b.classList.toggle("on",on);b.textContent=on?"🔔":"🔕";nhint();}
  function nhint(){var box=id("notifyHint");if(state.nhintClosed){box.hidden=true;return;}var on=state.notify.enabled&&("Notification" in window)&&Notification.permission==="granted";if(on){box.hidden=true;return;}var m;if(!("Notification" in window))m="<b>Tip:</b> On iPhone, add this to your Home Screen first, then open it from there to enable reminders.";else if(isIOS()&&!standalone())m="<b>Turn on daily reminders:</b> tap Share, then Add to Home Screen, open the app from that icon, and tap the bell.";else m="<b>Want a daily nudge?</b> Tap the bell (top right) and choose Allow to get a new word every day.";box.innerHTML='<span>'+m+'</span><button class="x" id="nx" aria-label="Dismiss">&times;</button>';box.hidden=false;var c=id("nx");if(c)c.addEventListener("click",function(){state.nhintClosed=true;save();box.hidden=true;});}
  function showNotif(t,b){try{navigator.serviceWorker.ready.then(function(r){r.showNotification(t,{body:b,icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag:"daily-vocab"});});}catch(e){if("Notification" in window&&Notification.permission==="granted")new Notification(t,{body:b});}}
  async function toggleNotify(){if(!("Notification" in window)){toast("Notifications are not supported here.");return;}if(state.notify.enabled&&Notification.permission==="granted"){state.notify.enabled=false;save();notifyBtn();toast("Daily reminders off.");return;}var p=Notification.permission;if(p!=="granted")p=await Notification.requestPermission();if(p!=="granted"){toast("Reminders need notification permission.");notifyBtn();return;}state.notify.enabled=true;save();try{var r=await navigator.serviceWorker.ready;if("periodicSync" in r){var st=await navigator.permissions.query({name:"periodic-background-sync"});if(st.state==="granted")await r.periodicSync.register("daily-word",{minInterval:20*60*60*1000});}}catch(e){}var w=wod();showNotif("Daily Vocab: "+w.word,"Today's word: "+w.definition+" Try using it in a sentence.");notifyBtn();toast("Daily reminders on.");}

  /* ---------- sentence / grammar check (rule-based, offline) ---------- */
  function checkGrammar(raw){
    var text=(raw||"").trim();
    if(!text)return {empty:true};
    var issues=[];
    var first=text.match(/[a-zA-Z]/);
    if(first && first[0]===first[0].toLowerCase() && first[0]!==first[0].toUpperCase())
      issues.push("Start the sentence with a capital letter.");
    if(!/[.!?]["'\u2019\u201d)\]]?$/.test(text))
      issues.push("End with a period (.), question mark (?), or exclamation mark (!).");
    if(/ {2,}/.test(raw)) issues.push("Remove the extra space(s) between words.");
    if(/\s[.,!?;:]/.test(text)) issues.push("Remove the space before punctuation.");
    var rep=text.match(/\b(\w+)\s+\1\b/i);
    if(rep) issues.push("Repeated word: \u201c"+rep[1]+"\u201d appears twice in a row.");
    if(/\bi\b/.test(text)) issues.push("Capitalize the word \u201cI\u201d.");
    var subs=[
      [/\balot\b/i,"\u201calot\u201d is not a word \u2014 use \u201ca lot\u201d."],
      [/\bdefinately\b/i,"Spelling: use \u201cdefinitely\u201d."],
      [/\brecieve\b/i,"Spelling: use \u201creceive\u201d (i before e except after c)."],
      [/\bteh\b/i,"Spelling: use \u201cthe\u201d."],
      [/\buntill\b/i,"Spelling: use \u201cuntil\u201d."],
      [/\bgonna\b/i,"Informal \u2014 use \u201cgoing to\u201d."],
      [/\bwanna\b/i,"Informal \u2014 use \u201cwant to\u201d."],
      [/\byour welcome\b/i,"Use \u201cyou\u2019re welcome\u201d."],
      [/\bcould of\b/i,"Use \u201ccould have\u201d, not \u201ccould of\u201d."],
      [/\bshould of\b/i,"Use \u201cshould have\u201d, not \u201cshould of\u201d."],
      [/\bwould of\b/i,"Use \u201cwould have\u201d, not \u201cwould of\u201d."],
      [/\b(he|she|it) don't\b/i,"Use \u201cdoesn\u2019t\u201d after he/she/it."],
      [/\bi (is|are|was not|were)\b/i,"Use \u201cI am\u201d / \u201cI was\u201d."],
      [/\b(they|we|you) is\b/i,"Use \u201care\u201d after they/we/you."],
      [/\bmore better\b/i,"\u201cmore better\u201d is a double comparative \u2014 use \u201cbetter\u201d."]
    ];
    subs.forEach(function(s){if(s[0].test(text))issues.push(s[1]);});
    var an=text.match(/\ba ([aeiou]\w*)/i);
    if(an && !/^(u|one|uni|use|user|euro|ubi|uni)/i.test(an[1])) issues.push("Use \u201can\u201d before a vowel sound: \u201can "+an[1]+"\u201d.");
    var aa=text.match(/\ban ([b-df-hj-np-tv-z]\w*)/i);
    if(aa && !/^(hour|honest|honou?r|heir)/i.test(aa[1])) issues.push("Use \u201ca\u201d before a consonant sound: \u201ca "+aa[1]+"\u201d.");
    return {issues:issues,words:(text.match(/\S+/g)||[]).length};
  }

  function runCheck(){
    var raw=id("sentence").value;
    var out=id("checkResults");
    var r=checkGrammar(raw);
    if(r.empty){out.innerHTML='<div class="note warn">Type a sentence first, then select \u201cCheck my sentence\u201d.</div>';return;}
    var html="";
    if(!r.issues.length){
      html+='<div class="note ok"><span class="lab">Looks good</span>No obvious grammar or spelling issues found in your '+r.words+'-word sentence. Nice work!</div>';
    }else{
      html+='<p class="result-head">Found '+r.issues.length+' thing'+(r.issues.length>1?"s":"")+' to review:</p>';
      r.issues.forEach(function(t){html+='<div class="note warn">'+esc(t)+'</div>';});
    }
    var w=wod();
    var re=new RegExp("\\b"+w.word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");
    if(re.test(raw)){
      html+='<div class="note ok">\u2713 You used today\u2019s word, \u201c'+esc(w.word)+'\u201d.</div>';
      var g=state.goals.filter(function(x){return x.word===w.word&&!done(x)&&x.checkins.indexOf(tk())===-1;})[0];
      if(g)html+='<div class="actions"><button class="btn btn-good" data-checkin="'+g.id+'">Count this as today\u2019s practice</button></div>';
    }
    out.innerHTML=html;
  }

  /* ---------- init ---------- */
  function init(){
    if(!WORDS.length){id("cardBody").innerHTML='<p class="empty">Word list failed to load.</p>';return;}
    seen();renderAll();notifyBtn();sv("today");
    document.querySelectorAll(".tab").forEach(function(t){t.addEventListener("click",function(){sv(t.dataset.view);});});
    id("setGoalBtn").addEventListener("click",function(){openGoal(wod().word);});
    id("speakBtn").addEventListener("click",function(){speak(wod().word);});
    id("checkBtn").addEventListener("click",runCheck);
    id("clearBtn").addEventListener("click",function(){id("sentence").value="";id("checkResults").innerHTML="";});
    id("sentence").addEventListener("keydown",function(e){if((e.metaKey||e.ctrlKey)&&e.key==="Enter")runCheck();});
    id("notifyBtn").addEventListener("click",toggleNotify);
    id("dayChoices").addEventListener("click",function(e){var c=e.target.closest(".chip");if(!c)return;document.querySelectorAll("#dayChoices .chip").forEach(function(x){x.classList.remove("on");});c.classList.add("on");days=+c.dataset.days;});
    id("goalCancel").addEventListener("click",closeGoal);
    id("goalConfirm").addEventListener("click",function(){if(pending)createGoal(pending,days);closeGoal();});
    id("goalModal").addEventListener("click",function(e){if(e.target.id==="goalModal")closeGoal();});
    id("detailClose").addEventListener("click",closeDetail);
    id("detailGoal").addEventListener("click",function(){if(detailW){closeDetail();openGoal(detailW.word);}});
    id("detailModal").addEventListener("click",function(e){if(e.target.id==="detailModal")closeDetail();});
    document.body.addEventListener("click",function(e){
      var ex=e.target.closest("[data-explain]");
      if(ex){var b=ex.parentNode.querySelector("[data-simplebox]");if(b){var sh=b.hidden;b.hidden=!sh;ex.textContent=sh?"Hide simple definition":"Show simple definition";}return;}
      var ci=e.target.closest("[data-checkin]");if(ci){checkin(ci.getAttribute("data-checkin"));return;}
      var dl=e.target.closest("[data-del]");if(dl){if(confirm("Remove this goal?"))delGoal(dl.getAttribute("data-del"));return;}
    });
    document.addEventListener("visibilitychange",function(){if(!document.hidden){seen();renderAll();}});
    if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(function(){});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
