/* Daily Vocab — vanilla JS, state in localStorage. Storage key is stable. */
(function () {
  "use strict";
  var WORDS = window.WORDS || [];
  var KEY = "dailyVocab.v2"; /* do NOT change — changing it wipes saved progress */

  function pad(n){return n<10?"0"+n:""+n;}
  function tk(d){d=d||new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
  function parseK(k){var p=k.split("-");return new Date(+p[0],+p[1]-1,+p[2]);}
  function dayNum(d){d=d||new Date();var l=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor(l.getTime()/86400000);}
  function pretty(k){return parseK(k).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});}
  function shortD(k){return parseK(k).toLocaleDateString(undefined,{month:"short",day:"numeric"});}
  function id(x){return document.getElementById(x);}
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  function reWord(w){return new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");}

  var state = load();
  function load(){
    try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&typeof s==="object"){
      s.history=Array.isArray(s.history)?s.history:[];
      s.notify=s.notify||{enabled:false};
      /* migrate older goals that predate some fields, so new code can't crash on them */
      s.goals=(Array.isArray(s.goals)?s.goals:[]).map(function(g){
        g=g||{}; g.checkins=Array.isArray(g.checkins)?g.checkins:[];
        g.target=g.target||5; if(!g.startDate)g.startDate=g.checkins[0]||tk(); return g;
      });
      return s;}}catch(e){}
    return {history:[],goals:[],notify:{enabled:false}};
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}
  function toast(m){var t=id("toast");if(!t)return;t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(function(){t.hidden=true;},2800);}
  var notice=null; /* transient message to show after a word change */

  /* ---------- current word & progression ---------- */
  function wod(){return WORDS[(state.curIdx!=null?state.curIdx:0)]||WORDS[0];}
  function logHistory(){
    var k=state.curDate, i=state.curIdx;
    var last=state.history[state.history.length-1];
    if(last && last.date===k && last.index===i) return;
    state.history.push({date:k,index:i,word:WORDS[i].word});
  }
  function advanceWord(T){
    state.curIdx=((state.curIdx==null?dayNum()%WORDS.length:state.curIdx)+1)%WORDS.length;
    state.curDate=T; logHistory();
  }
  /* the active (incomplete, unbroken) goal for the current word, if any */
  function activeGoal(){
    if(state.curIdx==null)return null;
    var w=WORDS[state.curIdx].word;
    return state.goals.filter(function(g){return g.word===w && !g.broken && g.checkins.length<g.target;})[0]||null;
  }
  function done(g){return g.checkins.length>=g.target;}
  /* any day from start up to (but not including) today without a check-in = missed */
  function hasMissedDay(g,T){
    if(!g.startDate)return false;
    var d=parseK(g.startDate);
    while(tk(d)<T){ if(g.checkins.indexOf(tk(d))===-1) return true; d.setDate(d.getDate()+1); }
    return false;
  }
  function ensureCurrentWord(){
    var T=tk();
    if(state.curIdx==null){ state.curIdx=dayNum()%WORDS.length; state.curDate=T; logHistory(); save(); return; }
    var g=activeGoal();
    if(g){
      if(hasMissedDay(g,T)){
        g.broken=true; g.brokenDate=T;
        notice="You missed a day on \u201c"+g.word+"\u201d, so the goal ended. Here\u2019s a new word.";
        advanceWord(T); save(); return;
      }
      /* goal on track and incomplete -> keep the word locked */
      return;
    }
    /* no active goal -> a fresh word each new day */
    if(state.curDate!==T){ advanceWord(T); save(); }
  }

  /* ---------- rendering ---------- */
  function explainHTML(w){return w.simple?'<button class="exp-btn" data-explain type="button">Show simple definition</button><div class="note note-teal" data-simplebox hidden><span class="lab">In plain words</span>'+esc(w.simple)+'</div>':"";}
  function synHTML(w){return '<p class="syn-line"><span class="lbl">Synonyms: </span>'+w.synonyms.map(function(s){return '<span class="syn">'+esc(s)+'</span>';}).join("")+'</p>';}
  function rememberHTML(w){
    return '<div class="note note-rose"><span class="lab">Remember it</span>'+
      '<ul class="remember"><li><b>Picture it.</b> Turn \u201c'+esc(w.word)+'\u201d into a vivid, exaggerated mental image \u2014 the sillier, the stickier (the keyword method).</li>'+
      '<li><b>Space it out.</b> Look at it again today, tomorrow, then in a few days. Spaced reviews beat cramming.</li>'+
      '<li><b>Use it.</b> Say or write \u201c'+esc(w.word)+'\u201d in a real sentence \u2014 try the <b>Practice</b> tab.</li></ul></div>';
  }
  function bodyHTML(w){return '<p class="def">'+esc(w.definition)+'</p>'+explainHTML(w)+'<p class="example">'+esc(w.example)+'</p>'+synHTML(w)+'<div class="note note-amber"><span class="lab">Memory tip</span>'+esc(w.tip)+'</div>'+rememberHTML(w);}
  function metaHTML(w){return '<span class="ipa">'+esc(w.ipa)+'</span><span class="pos">'+esc(w.pos)+'</span>';}
  function detailHTML(w){return '<h3>'+esc(w.word)+'</h3><p class="meta">'+metaHTML(w)+'</p>'+bodyHTML(w);}

  function streak(){if(!state.history.length)return 0;var days={};state.history.forEach(function(h){days[h.date]=true;});var n=0,d=new Date();if(!days[tk(d)])d.setDate(d.getDate()-1);while(days[tk(d)]){n++;d.setDate(d.getDate()-1);}return n;}
  function renderStreak(){var el=id("streakWrap"),s=streak();el.innerHTML=s>=2?'<span class="streak">Current streak: '+s+' days</span>':"";}

  function renderToday(){
    var w=wod();
    var g=activeGoal();
    if(g){
      var day=g.checkins.length+1;
      id("dateLine").textContent="Practicing this word · day "+Math.min(day,g.target)+" of "+g.target;
    }else{
      id("dateLine").textContent="Word of the day · "+pretty(tk());
    }
    id("headword").textContent=w.word;
    id("meta").innerHTML=metaHTML(w);
    id("cardBody").innerHTML=bodyHTML(w);
    var pc=id("pcWord");if(pc)pc.textContent=w.word;
    renderStreak();
    var box=id("todayGoalBox");box.innerHTML="";
    if(g)box.appendChild(goalNode(g,true));
    if(notice){toast(notice);notice=null;}
  }

  /* ---------- goals ---------- */
  function createGoal(word,days){
    if(activeGoal()){toast("Finish your current word first.");sv("goals");return;}
    var w=WORDS.filter(function(x){return x.word===word;})[0];if(!w)return;
    state.goals.unshift({id:"g"+Date.now(),word:word,def:w.definition,target:days,startDate:tk(),checkins:[]});
    save();toast("Goal set — practice \u201c"+word+"\u201d for "+days+" days. The word stays until you finish.");renderAll();sv("today");
  }
  function checkin(gid){
    var g=state.goals.filter(function(x){return x.id===gid;})[0];if(!g)return;
    var k=tk();if(g.checkins.indexOf(k)!==-1){toast("Already checked in today.");return;}
    g.checkins.push(k);save();
    if(done(g))toast("\uD83C\uDF89 Goal complete — you practiced \u201c"+g.word+"\u201d for "+g.target+" days. A new word arrives tomorrow.");
    else toast("Checked in: "+g.checkins.length+" / "+g.target+" days. Keep going!");
    renderAll();
  }
  function delGoal(gid){
    var g=state.goals.filter(function(x){return x.id===gid;})[0];
    var wasActive=g && !g.broken && !done(g);
    state.goals=state.goals.filter(function(x){return x.id!==gid;});
    if(wasActive){ advanceWord(tk()); toast("Goal dropped — here\u2019s a new word."); }
    save();renderAll();if(wasActive)sv("today");
  }
  function goalNode(g,compact){
    var d=done(g),ct=g.checkins.indexOf(tk())!==-1,pct=Math.min(100,Math.round(g.checkins.length/g.target*100));
    var el=document.createElement("div");el.className="goal"+(d?" done":"");
    var dots="";for(var i=0;i<g.target;i++){dots+='<div class="dot'+(i<g.checkins.length?" f":"")+'">'+(i<g.checkins.length?"✓":(i+1))+"</div>";}
    var act;
    if(d)act='<span class="cd">Mastered</span> <button class="link-btn" data-del="'+g.id+'">Remove</button>';
    else if(ct)act='<span class="cd">Checked in today</span> <button class="link-btn" data-del="'+g.id+'">Quit</button>';
    else act='<button class="btn btn-good" data-checkin="'+g.id+'">I used it today</button><button class="link-btn" data-del="'+g.id+'">Quit</button>';
    el.innerHTML='<div class="goal-top"><span class="gw">'+esc(g.word)+'</span><span class="gs '+(d?"done":"")+'">'+(d?"Complete":g.checkins.length+"/"+g.target+" days")+'</span></div>'+(compact?"":'<div class="gd">'+esc(g.def)+'</div>')+'<div class="prog"><span style="width:'+pct+'%"></span></div><div class="dots">'+dots+'</div><div class="gact">'+act+'</div>';
    return el;
  }
  function renderGoals(){var l=id("goalsList");l.innerHTML="";if(!state.goals.length){l.innerHTML='<div class="empty"><span class="big">&#9873;</span>No goals yet. On Today, select Set a practice goal to lock a word until you master it.</div>';return;}state.goals.forEach(function(g){l.appendChild(goalNode(g,false));});}
  function renderHist(){var l=id("historyList");var items=state.history.slice().sort(function(a,b){return a.date<b.date?1:-1;});l.innerHTML="";if(!items.length){l.innerHTML='<div class="empty"><span class="big">&#128214;</span>No words yet — check back tomorrow.</div>';return;}items.forEach(function(h){var w=WORDS[h.index];if(!w)return;var n=document.createElement("div");n.className="hist";n.innerHTML='<div><div class="hw">'+esc(w.word)+'</div><div class="hd">'+esc(w.definition)+'</div></div><div class="hdt">'+(h.date===tk()?"Today":shortD(h.date))+'</div>';n.addEventListener("click",function(){openDetail(w);});l.appendChild(n);});}
  function activeDaySet(){var s={};state.history.forEach(function(h){s[h.date]=1;});state.goals.forEach(function(g){g.checkins.forEach(function(d){s[d]=1;});});return s;}
  function renderCalendar(){
    var wrap=id("calWrap");if(!wrap)return;
    var active=activeDaySet();
    var now=new Date(),y=now.getFullYear(),m=now.getMonth();
    var first=new Date(y,m,1),startDow=first.getDay(),dim=new Date(y,m+1,0).getDate();
    var title=first.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    var s=streak(),todayK=tk(),count=0;
    for(var d=1;d<=dim;d++){if(active[y+"-"+pad(m+1)+"-"+pad(d)])count++;}
    var html='<div class="cal"><div class="cal-head"><span class="cal-title">'+title+'</span>'+(s>=2?'<span class="streak">🔥 '+s+'-day streak</span>':"")+'</div><div class="cal-grid">';
    ["S","M","T","W","T","F","S"].forEach(function(x){html+='<div class="cal-dow">'+x+'</div>';});
    for(var i=0;i<startDow;i++)html+='<div class="cal-cell empty"></div>';
    for(var day=1;day<=dim;day++){var k=y+"-"+pad(m+1)+"-"+pad(day);var cls="cal-cell";if(active[k])cls+=" on";if(k===todayK)cls+=" today";html+='<div class="'+cls+'">'+day+'</div>';}
    html+='</div><div class="cal-foot">'+count+' active day'+(count===1?"":"s")+' this month</div></div>';
    wrap.innerHTML=html;
  }
  function renderAll(){renderToday();renderGoals();renderHist();renderCalendar();}

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

  /* ---------- grammar + usage check (offline, no punctuation nagging) ---------- */
  function checkGrammar(raw){
    var text=(raw||"").trim();
    if(!text)return {empty:true};
    var issues=[];
    var rep=text.match(/\b(\w+)\s+\1\b/i);
    if(rep) issues.push("Repeated word: \u201c"+rep[1]+"\u201d appears twice in a row.");
    var subs=[
      [/\b(he|she|it) don'?t\b/i,"Subject-verb: use \u201cdoesn\u2019t\u201d after he/she/it."],
      [/\buse (\w+) good\b/i,"Adverb: use \u201cwell\u201d, not \u201cgood\u201d, to describe an action."],
      [/\bi (is|are|were)\b/i,"Subject-verb: use \u201cI am\u201d (or \u201cI was\u201d)."],
      [/\b(they|we|you) is\b/i,"Subject-verb: use \u201care\u201d after they/we/you."],
      [/\b(he|she|it|they|we|you|i) (has|have) went\b/i,"Verb form: use \u201cgone\u201d (have gone), not \u201cwent\u201d."],
      [/\bcould of\b/i,"Use \u201ccould have\u201d, not \u201ccould of\u201d."],
      [/\bshould of\b/i,"Use \u201cshould have\u201d, not \u201cshould of\u201d."],
      [/\bwould of\b/i,"Use \u201cwould have\u201d, not \u201cwould of\u201d."],
      [/\bmore better\b/i,"Double comparative \u2014 use \u201cbetter\u201d, not \u201cmore better\u201d."],
      [/\byour welcome\b/i,"Use \u201cyou\u2019re welcome\u201d (you are)."],
      [/\balot\b/i,"Spelling: \u201calot\u201d is not a word \u2014 use \u201ca lot\u201d."],
      [/\bdefinately\b/i,"Spelling: use \u201cdefinitely\u201d."],
      [/\brecieve\b/i,"Spelling: use \u201creceive\u201d (i before e except after c)."],
      [/\bteh\b/i,"Spelling: use \u201cthe\u201d."],
      [/\buntill\b/i,"Spelling: use \u201cuntil\u201d."],
      [/\bseperate\b/i,"Spelling: use \u201cseparate\u201d."],
      [/\boccured\b/i,"Spelling: use \u201coccurred\u201d."]
    ];
    subs.forEach(function(s){if(s[0].test(text))issues.push(s[1]);});
    var an=text.match(/\ba ([aeiou]\w*)/i);
    if(an && !/^(u|one|uni|use|user|euro|ubi)/i.test(an[1])) issues.push("Article: use \u201can\u201d before a vowel sound \u2014 \u201can "+an[1]+"\u201d.");
    var aa=text.match(/\ban ([b-df-hj-np-tv-z]\w*)/i);
    if(aa && !/^(hour|honest|honou?r|heir)/i.test(aa[1])) issues.push("Article: use \u201ca\u201d before a consonant sound \u2014 \u201ca "+aa[1]+"\u201d.");
    return {issues:issues,words:(text.match(/\S+/g)||[]).length};
  }
  function usageCheck(raw,w){
    if(!reWord(w.word).test(raw)) return {used:false};
    var out={used:true,issues:[]};
    var esc2=w.word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    if((w.pos==="adjective"||w.pos==="noun") && new RegExp("\\bto "+esc2+"\\b","i").test(raw))
      out.issues.push("You wrote \u201cto "+w.word+"\u201d. \u201c"+w.word+"\u201d is "+(/^[aeiou]/i.test(w.pos)?"an ":"a ")+w.pos+", so it usually isn\u2019t used as a verb after \u201cto\u201d.");
    if(w.pos==="verb" && new RegExp("\\b(a|an|the) "+esc2+"\\b","i").test(raw))
      out.issues.push("\u201c"+w.word+"\u201d is a verb, so it usually shouldn\u2019t come right after \u201ca/an/the\u201d.");
    return out;
  }
  function correctSentence(raw){
    var s=(raw||"").replace(/\r/g,"").trim();
    if(!s)return s;
    s=s.replace(/\b(\w+)((?:\s+\1\b)+)/gi,"$1");
    s=s.replace(/\b(could|should|would) of\b/gi,function(_,m){return m+" have";});
    s=s.replace(/\b(he|she|it) don'?t\b/gi,function(_,su){return su+" doesn\u2019t";});
    s=s.replace(/\b(they|we|you) is\b/gi,function(_,su){return su+" are";});
    s=s.replace(/\bi (is|are)\b/gi,"I am").replace(/\bi were\b/gi,"I was");
    s=s.replace(/\b(has|have) went\b/gi,"$1 gone");
    s=s.replace(/\bmore better\b/gi,"better");
    s=s.replace(/\byour welcome\b/gi,"you\u2019re welcome");
    s=s.replace(/\buse (\w+) good\b/gi,"use $1 well");
    var sp={alot:"a lot",definately:"definitely",recieve:"receive",teh:"the",untill:"until",seperate:"separate",occured:"occurred"};
    s=s.replace(/\b(alot|definately|recieve|teh|untill|seperate|occured)\b/gi,function(w){return sp[w.toLowerCase()];});
    s=s.replace(/\ba ([aeiou]\w*)/gi,function(m,w){return /^(u|one|uni|use|user|euro|ubi)/i.test(w)?m:"an "+w;});
    s=s.replace(/\ban ([b-df-hj-np-tv-z]\w*)/gi,function(m,w){return /^(hour|honest|honou?r|heir)/i.test(w)?m:"a "+w;});
    s=s.replace(/\s+([.,!?;:])/g,"$1").replace(/\s{2,}/g," ").trim();
    s=s.replace(/\bi\b/g,"I");
    s=s.replace(/^([a-z])/,function(c){return c.toUpperCase();});
    if(!/[.!?]["'\u2019\u201d)\]]?$/.test(s))s=s+".";
    return s;
  }
  function runCheck(){
    var raw=id("sentence").value;
    var out=id("checkResults");
    var r=checkGrammar(raw);
    if(r.empty){out.innerHTML='<div class="note warn">Type a sentence first, then select \u201cCheck my sentence\u201d.</div>';return;}
    var w=wod();
    var u=usageCheck(raw,w);
    var all=r.issues.concat(u.used?u.issues:[]);
    var corrected=correctSentence(raw);
    var changed=corrected && corrected!==raw.trim();
    var html="";
    if(all.length){
      html+='<p class="result-head">Found '+all.length+' thing'+(all.length>1?"s":"")+' to review:</p>';
      all.forEach(function(t){html+='<div class="note warn">'+esc(t)+'</div>';});
    }
    if(changed){
      html+='<div class="note note-fix"><span class="lab">Suggested correction</span>\u201c'+esc(corrected)+'\u201d</div>';
    }else if(!all.length){
      html+='<div class="note ok"><span class="lab">Looks good</span>No grammar or spelling issues spotted in your '+r.words+'-word sentence.</div>';
    }
    if(u.used){
      html+='<div class="note ok">\u2713 You used today\u2019s word, \u201c'+esc(w.word)+'\u201d'+(u.issues.length?" \u2014 but check the note above about how it\u2019s placed.":" as "+(/^[aeiou]/i.test(w.pos)?"an ":"a ")+esc(w.pos)+".")+'</div>';
      var g=activeGoal();
      if(g && g.checkins.indexOf(tk())===-1) html+='<div class="actions"><button class="btn btn-good" data-checkin="'+g.id+'">Count this as today\u2019s practice</button></div>';
    }else{
      html+='<div class="note warn">Your sentence doesn\u2019t include today\u2019s word, \u201c'+esc(w.word)+'\u201d. Try working it in!</div>';
    }
    out.innerHTML=html;
  }

  /* ---------- notifications ---------- */
  function isIOS(){return /iP(hone|ad|od)/.test(navigator.userAgent);}
  function standalone(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;}
  function notifyBtn(){var b=id("notifyBtn"),on=state.notify.enabled&&("Notification" in window)&&Notification.permission==="granted";b.classList.toggle("on",on);b.textContent=on?"🔔":"🔕";nhint();}
  function nhint(){var box=id("notifyHint");if(state.nhintClosed){box.hidden=true;return;}var on=state.notify.enabled&&("Notification" in window)&&Notification.permission==="granted";if(on){box.hidden=true;return;}var m;if(!("Notification" in window))m="<b>Tip:</b> On iPhone, add this to your Home Screen first, then open it from there to enable reminders.";else if(isIOS()&&!standalone())m="<b>Turn on daily reminders:</b> tap Share, then Add to Home Screen, open the app from that icon, and tap the bell.";else m="<b>Want a daily nudge?</b> Tap the bell (top right) and choose Allow to get a new word every day.";box.innerHTML='<span>'+m+'</span><button class="x" id="nx" aria-label="Dismiss">&times;</button>';box.hidden=false;var c=id("nx");if(c)c.addEventListener("click",function(){state.nhintClosed=true;save();box.hidden=true;});}
  function showNotif(t,b){try{navigator.serviceWorker.ready.then(function(r){r.showNotification(t,{body:b,icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag:"daily-vocab"});});}catch(e){if("Notification" in window&&Notification.permission==="granted")new Notification(t,{body:b});}}
  async function toggleNotify(){if(!("Notification" in window)){toast("Notifications are not supported here.");return;}if(state.notify.enabled&&Notification.permission==="granted"){state.notify.enabled=false;save();notifyBtn();toast("Daily reminders off.");return;}var p=Notification.permission;if(p!=="granted")p=await Notification.requestPermission();if(p!=="granted"){toast("Reminders need notification permission.");notifyBtn();return;}state.notify.enabled=true;save();try{var r=await navigator.serviceWorker.ready;if("periodicSync" in r){var st=await navigator.permissions.query({name:"periodic-background-sync"});if(st.state==="granted")await r.periodicSync.register("daily-word",{minInterval:20*60*60*1000});}}catch(e){}var w=wod();showNotif("Daily Vocab: "+w.word,"Practice today's word: "+w.definition);notifyBtn();toast("Daily reminders on.");}

  /* ---------- init ---------- */
  function init(){
    if(!WORDS.length){id("cardBody").innerHTML='<p class="empty">Word list failed to load.</p>';return;}
    /* attach listeners FIRST so the UI is always interactive even if a render throws */
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
      var dl=e.target.closest("[data-del]");if(dl){if(confirm("End this goal? You'll get a new word."))delGoal(dl.getAttribute("data-del"));return;}
    });
    document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh();});
    if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(function(){});
    /* first render — guarded so no data problem can leave a blank, dead screen */
    refresh();notifyBtn();sv("today");
  }
  function refresh(){
    try{ensureCurrentWord();}catch(e){try{state.curIdx=dayNum()%WORDS.length;state.curDate=tk();notice=null;save();}catch(_){}}
    try{renderAll();}catch(e){try{var w=wod();id("headword").textContent=w.word;id("meta").innerHTML=metaHTML(w);id("cardBody").innerHTML=bodyHTML(w);}catch(_){}}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
