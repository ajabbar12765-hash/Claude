// Daily Vocab — iOS home-screen widget for Scriptable
// Large (4x4) widget: word of the day + meaning + example.
// Also supports small, medium and extra-large.
//
// SETUP
// 1. Install "Scriptable" from the App Store (free).
// 2. Open Scriptable, tap + , paste this whole file, name it "Daily Vocab".
// 3. Long-press your Home Screen -> + -> Scriptable -> pick the LARGE (4x4) size.
// 4. Long-press the new widget -> Edit Widget -> Script: "Daily Vocab".
//
// TAPPING THE WIDGET should open the app, not Scriptable. This script handles
// that on its own, but the most reliable setup is:
//    Long-press widget -> Edit Widget -> When Interacting: "Open URL"
//    -> URL: the APP_URL below.
//
// Your deployed Daily Vocab URL. Tapping the widget opens the app on exactly
// the word shown here. Change this if you deploy somewhere else.
const APP_URL = "https://claude-fxv1.vercel.app";

// If the widget is set to "Run Script" when tapped, Scriptable opens instead of
// the app. When that happens this sends you straight on to the app.
// Set to false if you'd rather preview the widget inside Scriptable.
const OPEN_APP_WHEN_TAPPED = true;

// iOS will not launch a Home Screen web app from a link -- an https:// URL
// always opens Safari. To land in the installed app instead, make a Shortcut
// that opens it and put the Shortcut's URL here, e.g.
//   const CUSTOM_TAP_URL = "shortcuts://run-shortcut?name=Daily%20Vocab";
// Leave it empty to open APP_URL in Safari.
const CUSTOM_TAP_URL = "";

// [word, ipa, part of speech, definition, plain-words, example]
const WORDS = [["ubiquitous","/yoo-BIK-wih-tus/","adjective","Present, appearing, or found everywhere.","It's everywhere — you see it no matter where you look.","Smartphones have become ubiquitous in modern life."],["pragmatic","/prag-MAT-ik/","adjective","Dealing with things sensibly and realistically rather than idealistically.","Practical — you focus on what actually works, not on what sounds perfect.","She took a pragmatic approach and fixed what could actually be fixed."],["candid","/KAN-did/","adjective","Truthful and straightforward; frank.","Honest and open — you say what you really think.","I appreciate your candid feedback on the draft."],["meticulous","/muh-TIK-yuh-lus/","adjective","Showing great attention to detail; very careful and precise.","Super careful — you check every little detail.","He kept meticulous records of every transaction."],["resilient","/rih-ZIL-yunt/","adjective","Able to recover quickly from difficulties; tough.","You bounce back fast after something bad happens.","The economy proved surprisingly resilient after the shock."],["nuance","/NOO-ahns/","noun","A subtle difference in meaning, expression, or tone.","A small, subtle detail that changes the meaning slightly.","The translation missed the nuance of the original joke."],["advocate","/AD-vuh-kayt/","verb","To publicly recommend or support a cause or policy.","To speak up in support of something you believe in.","She advocates for cleaner public transport."],["ambivalent","/am-BIV-uh-lunt/","adjective","Having mixed or contradictory feelings about something.","You feel two ways about it at once — part yes, part no.","He felt ambivalent about the promotion — flattered but anxious."],["concise","/kun-SYSE/","adjective","Giving a lot of information clearly in a few words; brief but comprehensive.","Short and to the point, with no wasted words.","Keep the summary concise — one paragraph at most."],["diligent","/DIL-ih-junt/","adjective","Showing careful and persistent effort in work.","Hard-working and steady — you keep at it carefully.","Her diligent research paid off in the final report."],["eloquent","/EL-uh-kwunt/","adjective","Fluent and persuasive in speaking or writing.","You speak or write so well that people are moved and convinced.","The senator gave an eloquent defense of the bill."],["tenacious","/tuh-NAY-shus/","adjective","Holding firmly to a goal or opinion; persistent.","You don't give up — you hold on and keep going.","Her tenacious pursuit of the truth impressed everyone."],["prudent","/PROO-dunt/","adjective","Acting with care and thought for the future; wise.","Careful and sensible — you think ahead before acting.","It's prudent to keep three months of savings."],["articulate","/ar-TIK-yuh-lut/","adjective","Able to express thoughts clearly and effectively.","Good at putting your thoughts into clear words.","She's remarkably articulate for someone so nervous."],["innate","/ih-NAYT/","adjective","Existing from birth; inborn and natural.","Something you're born with, not something you learned.","He has an innate talent for languages."],["scrutinize","/SKROO-tuh-nyze/","verb","To examine or inspect closely and thoroughly.","To look at something very closely and carefully.","Auditors scrutinized every line of the budget."],["profound","/pruh-FOWND/","adjective","Very great, intense, or deeply felt; showing deep insight.","Very deep and powerful — it goes far beyond the surface.","Her mentor had a profound effect on her career."],["versatile","/VUR-suh-tul/","adjective","Able to adapt to many different functions or activities.","Good at lots of different things; can handle many roles.","A versatile employee who can handle sales and support."],["coherent","/koh-HEER-unt/","adjective","Logical and consistent; clearly connected.","It makes sense and the parts fit together clearly.","Try to give a coherent argument, not scattered points."],["gregarious","/gruh-GAIR-ee-us/","adjective","Fond of company; sociable.","You love being around people and enjoy company.","His gregarious nature made him the heart of every gathering."],["astute","/uh-STOOT/","adjective","Having sharp judgment; shrewd and perceptive.","Sharp and clever — you quickly notice what's really going on.","An astute investor who spotted the trend early."],["empathy","/EM-puh-thee/","noun","The ability to understand and share another's feelings.","Being able to feel and understand what someone else feels.","Good managers lead with empathy, not just authority."],["impeccable","/im-PEK-uh-bul/","adjective","In accordance with the highest standards; flawless.","Perfect — without a single fault or mistake.","Her timing was impeccable."],["reciprocate","/rih-SIP-ruh-kayt/","verb","To respond to an action or feeling in kind; return the favor.","To give back the same kindness or favor you received.","They helped us move, so we reciprocated the next weekend."],["salient","/SAY-lee-unt/","adjective","Most noticeable or important; standing out.","The most important part — the bit that stands out.","Let's focus on the salient points and skip the details."],["cordial","/KOR-jul/","adjective","Warm and friendly in manner.","Warm and friendly toward someone.","They kept a cordial relationship despite the rivalry."],["lucid","/LOO-sid/","adjective","Clear and easy to understand; thinking clearly.","Clear and easy to follow.","She gave a lucid explanation of a complex topic."],["amiable","/AY-mee-uh-bul/","adjective","Having a friendly and pleasant manner.","Nice and friendly — easy to like.","Our new neighbor is genuinely amiable."],["compelling","/kum-PEL-ing/","adjective","Powerfully convincing or captivating.","So convincing or interesting that you can't ignore it.","The lawyer made a compelling case to the jury."],["diplomatic","/dip-luh-MAT-ik/","adjective","Skilled at handling situations tactfully.","Good at saying things carefully so nobody gets upset.","He gave a diplomatic answer that offended no one."],["endeavor","/en-DEV-ur/","verb","To try hard to achieve something.","To try hard to do something.","We endeavor to reply within 24 hours."],["feasible","/FEE-zuh-bul/","adjective","Possible to do easily or conveniently.","Doable — it can actually be done.","Is it feasible to finish this by Friday?"],["genuine","/JEN-yoo-in/","adjective","Truly what it is said to be; sincere and authentic.","Real and honest — not fake.","Her concern felt completely genuine."],["humble","/HUM-bul/","adjective","Modest; not proud or arrogant.","Modest — you don't brag or act better than others.","Despite his success, he stayed humble."],["intuitive","/in-TOO-ih-tiv/","adjective","Understood or known instinctively, without conscious reasoning.","Easy to understand or feel without having to think hard.","The app has an intuitive design anyone can use."],["judicious","/joo-DISH-us/","adjective","Having or showing good judgment.","Wise — you make smart, well-thought-out choices.","A judicious use of the budget kept the project alive."],["leverage","/LEV-ur-ij/","verb","To use something to maximum advantage.","To use what you have to get the most out of it.","We can leverage our network to find candidates."],["mitigate","/MIT-ih-gayt/","verb","To make less severe, serious, or painful.","To make a bad thing less bad.","Insurance helps mitigate financial risk."],["novel","/NOV-ul/","adjective","New, original, or unusual in an interesting way.","New and fresh — something not done before.","They proposed a novel solution nobody had tried."],["objective","/ub-JEK-tiv/","adjective","Not influenced by personal feelings; based on facts.","Fair and fact-based — not swayed by your feelings.","Try to stay objective when reviewing your own work."],["plausible","/PLAW-zuh-bul/","adjective","Seeming reasonable or probable.","Believable — it sounds like it could be true.","That's a plausible explanation, but let's verify it."],["quintessential","/kwin-tuh-SEN-shul/","adjective","Representing the most perfect example of a quality.","The perfect example of its kind.","He's the quintessential gentleman."],["rapport","/ra-POR/","noun","A close and harmonious relationship with mutual understanding.","A good, easy connection between people who 'get' each other.","She quickly built a rapport with new clients."],["sincere","/sin-SEER/","adjective","Free from pretense; genuine and honest.","You really mean what you say — no pretending.","Please accept my sincere apologies."],["transparent","/trans-PAIR-unt/","adjective","Open and honest; easy to perceive or detect.","Open and honest — nothing is hidden.","We aim to be transparent about our pricing."],["unprecedented","/un-PRES-ih-den-tid/","adjective","Never done or known before.","Never happened before — totally new.","The response was unprecedented in the company's history."],["viable","/VY-uh-bul/","adjective","Capable of working successfully; feasible.","It can actually work.","It's the only viable option we have left."],["wary","/WAIR-ee/","adjective","Cautious about possible dangers or problems.","Careful and a little suspicious of possible trouble.","Be wary of deals that seem too good to be true."],["zealous","/ZEL-us/","adjective","Filled with eager, passionate commitment.","Really eager and passionate about something.","A zealous volunteer who never misses an event."],["affable","/AF-uh-bul/","adjective","Friendly, good-natured, and easy to talk to.","Friendly and easy to chat with.","The host was affable and put everyone at ease."],["benevolent","/buh-NEV-uh-lunt/","adjective","Well-meaning and kindly.","Kind and generous — you want good things for others.","A benevolent donor funded the whole library."],["cautious","/KAW-shus/","adjective","Careful to avoid potential problems or dangers.","Careful — you avoid taking risks.","He's cautious with money after the crash."],["decisive","/dih-SY-siv/","adjective","Settling an issue quickly and effectively; resolute.","You make firm decisions quickly, without dithering.","Her decisive leadership saved the deal."],["earnest","/UR-nist/","adjective","Sincere and serious in intention.","Serious and sincere — you really mean it.","He made an earnest effort to improve."],["fortuitous","/for-TOO-ih-tus/","adjective","Happening by chance, often in a lucky way.","A lucky accident — it happened by chance and worked out well.","A fortuitous meeting led to the partnership."],["gracious","/GRAY-shus/","adjective","Courteous, kind, and pleasant, especially to those of lower rank.","Kind and polite, even to people who can't do anything for you.","She was gracious in both victory and defeat."],["harmonious","/har-MOH-nee-us/","adjective","Free from disagreement; forming a pleasing whole.","Peaceful and well-matched — everything gets along.","They built a harmonious working relationship."],["immaculate","/ih-MAK-yuh-lut/","adjective","Perfectly clean, neat, or tidy; flawless.","Spotlessly clean and tidy.","The kitchen was immaculate before the guests arrived."],["jovial","/JOH-vee-ul/","adjective","Cheerful and friendly.","Happy and good-humored.","His jovial laugh filled the room."],["kindle","/KIN-dul/","verb","To arouse or inspire (an emotion or interest); to light a fire.","To spark or start something — a fire or a feeling.","The trip kindled her love of travel."],["laudable","/LAW-duh-bul/","adjective","Deserving praise and commendation.","Worth praising — a good and admirable thing to do.","A laudable goal, even if hard to reach."],["magnanimous","/mag-NAN-ih-mus/","adjective","Generous or forgiving, especially toward a rival.","Big-hearted — generous even to people you could resent.","She was magnanimous in her congratulations to the winner."],["nostalgic","/nos-TAL-jik/","adjective","Feeling a sentimental longing for the past.","Missing the good old days in a sweet, fond way.","Old songs make me nostalgic for college."],["optimistic","/op-tuh-MIS-tik/","adjective","Hopeful and confident about the future.","You expect good things to happen.","Despite setbacks, she stayed optimistic."],["poignant","/POIN-yunt/","adjective","Evoking a keen sense of sadness or regret; deeply touching.","So touching it makes you a little sad or emotional.","The film's ending was quietly poignant."],["quaint","/KWAYNT/","adjective","Attractively unusual or old-fashioned.","Charmingly old-fashioned in a cute way.","We stayed in a quaint village inn."],["resourceful","/rih-SORS-ful/","adjective","Able to find clever ways to overcome difficulties.","Clever at finding ways to solve problems with what you have.","A resourceful traveler always finds a way."],["steadfast","/STED-fast/","adjective","Firm and unwavering in purpose or loyalty.","Loyal and steady — you don't waver or quit.","A steadfast friend through every hardship."],["tactful","/TAKT-ful/","adjective","Showing sensitivity in dealing with others.","Careful with your words so you don't hurt feelings.","A tactful reminder, not a public scolding."],["unwavering","/un-WAY-vur-ing/","adjective","Steady and resolute; not faltering.","Rock-steady — you never waver or lose focus.","Her unwavering focus got the project across the line."],["vivid","/VIV-id/","adjective","Producing strong, clear images in the mind; intensely bright.","So clear and bright it feels real in your mind.","She has vivid memories of that summer."],["wholesome","/HOHL-sum/","adjective","Conducive to health or moral well-being.","Good for you — healthy and clean.","A wholesome meal and an early night."],["exemplary","/ig-ZEM-pluh-ree/","adjective","Serving as a desirable model; outstanding.","So good it's a model for others to copy.","Her exemplary work set the standard for the team."],["yearn","/YURN/","verb","To have an intense longing for something.","To want something so much it almost aches.","After years abroad, he yearned for home."],["zenith","/ZEE-nith/","noun","The highest point; the peak of success.","The very top — the highest, best point.","The band was at the zenith of its fame."],["adept","/uh-DEPT/","adjective","Very skilled or proficient at something.","Really good at something.","She's adept at defusing tense meetings."],["brevity","/BREV-ih-tee/","noun","Concise and exact use of words; shortness of time.","Keeping things short.","For the sake of brevity, I'll list only the highlights."],["conducive","/kun-DOO-siv/","adjective","Making a certain situation or outcome likely or possible.","It helps something happen — a good setting for it.","A quiet room is conducive to focus."],["deft","/DEFT/","adjective","Neatly skillful and quick in movement or handling.","Skillful and quick with your hands or mind.","A deft touch turned the mess into a plan."],["elicit","/ih-LIS-it/","verb","To draw out a response, answer, or fact from someone.","To get a reaction or answer out of someone.","The question elicited an honest reply."],["frugal","/FROO-gul/","adjective","Careful and economical with money or resources.","Careful with money — you don't waste it.","Her frugal habits let her save quickly."],["gauge","/GAYJ/","verb","To estimate or measure something; to judge.","To size something up or measure it.","It's hard to gauge his reaction from an email."],["hone","/HOHN/","verb","To refine or perfect a skill over time.","To slowly sharpen and improve a skill.","She honed her public speaking for years."],["incisive","/in-SY-siv/","adjective","Intelligently analytical and clear-thinking; sharp.","Sharp and clear-thinking — you cut straight to the point.","An incisive question cut to the heart of the issue."],["jargon","/JAR-gun/","noun","Special words used by a profession that others find hard to understand.","Insider words a job uses that outsiders don't get.","Skip the jargon and explain it plainly."],["kudos","/KOO-dohs/","noun","Praise and honor received for an achievement.","Praise or credit for doing something well.","Kudos to the whole team for shipping on time."],["lofty","/LAWF-tee/","adjective","Of a noble or elevated nature; very high.","Very high — either tall or big and ambitious.","They set lofty goals for the quarter."],["myriad","/MEER-ee-ud/","noun","A countless or extremely great number.","A huge number — too many to count.","There are a myriad of options to choose from."],["nimble","/NIM-bul/","adjective","Quick and light in movement or thought.","Quick and light on your feet — or quick-thinking.","A nimble startup can pivot in days."],["onus","/OH-nus/","noun","The responsibility or burden for something.","The job or duty that's on you to handle.","The onus is on us to prove it works."],["prowess","/PROW-is/","noun","Skill or expertise in a particular activity.","Great skill at something.","His technical prowess impressed the panel."],["quell","/KWEL/","verb","To put an end to, usually by force; to calm or subdue.","To calm down or shut down something (like panic or a fight).","A few calm words quelled the panic."],["robust","/roh-BUST/","adjective","Strong, healthy, and able to withstand difficulty.","Strong and sturdy — it can take a beating.","We need a robust plan that survives surprises."],["savvy","/SAV-ee/","adjective","Shrewd and knowledgeable, especially in practical matters.","Street-smart — you know how things really work.","A savvy shopper who never overpays."],["tangible","/TAN-juh-bul/","adjective","Perceptible by touch; real and concrete.","Real and solid — something you can actually touch or measure.","We finally saw tangible results."],["uphold","/up-HOHLD/","verb","To support, maintain, or defend (a principle or decision).","To stand by and keep something in place.","The court upheld the original ruling."],["vindicate","/VIN-dih-kayt/","verb","To clear of blame or prove right.","To prove someone was right after all.","The results vindicated her risky decision."],["warrant","/WOR-unt/","verb","To justify or make necessary; to guarantee.","To be a good enough reason for something.","The problem doesn't warrant a full rewrite."],["adroit","/uh-DROIT/","adjective","Clever or skillful in using the hands or mind.","Clever and skillful at handling things.","An adroit negotiator who reads the room."],["bolster","/BOHL-stur/","verb","To support, strengthen, or reinforce.","To back something up and make it stronger.","New data bolstered their argument."],["cogent","/KOH-junt/","adjective","Clear, logical, and convincing.","A clear argument that's hard to disagree with.","She made a cogent argument for the change."],["discern","/dih-SURN/","verb","To perceive or recognize something, often with effort.","To notice or make out something, even when it's not obvious.","It's hard to discern the truth from rumor."],["endorse","/en-DORS/","verb","To publicly declare approval or support.","To openly say you approve of or back something.","Several experts endorsed the method."]];

// ---- word of the day (same rule as the app) ----
function wordOfDay() {
  const n = new Date();
  const local = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const dayNum = Math.floor(local.getTime() / 86400000);
  const i = ((dayNum % WORDS.length) + WORDS.length) % WORDS.length;
  const w = WORDS[i];
  return { idx: i, word: w[0], ipa: w[1], pos: w[2], def: w[3], simple: w[4], ex: w[5] };
}

function appLink(idx) {
  if (CUSTOM_TAP_URL) return CUSTOM_TAP_URL;
  if (!APP_URL) return null;
  return APP_URL + (APP_URL.indexOf("?") === -1 ? "?" : "&") + "w=" + idx;
}

// ---- palette ----
const INK       = new Color("#ffffff");
const DIM       = new Color("#c9cfe4");
const FAINT     = new Color("#9aa2bd");
const GOLD      = new Color("#f4c869");
const TEAL      = new Color("#5fe3d0");

function background() {
  const g = new LinearGradient();
  g.colors = [new Color("#241a5e"), new Color("#141a3a"), new Color("#0b1020")];
  g.locations = [0, 0.55, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  return g;
}

function accentBar(parent, width) {
  const row = parent.addStack();
  const bar = row.addStack();
  bar.size = new Size(width, 3);
  bar.cornerRadius = 2;
  bar.backgroundColor = GOLD;
}

function header(w, family) {
  const row = w.addStack();
  row.centerAlignContent();
  const sym = SFSymbol.named("book.fill");
  const img = row.addImage(sym.image);
  img.imageSize = new Size(12, 12);
  img.tintColor = GOLD;
  row.addSpacer(6);
  const t = row.addText("DAILY VOCAB");
  t.font = Font.boldSystemFont(family === "small" ? 8 : 9);
  t.textColor = FAINT;
  row.addSpacer();
  if (family !== "small") {
    const d = row.addText(
      new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()
    );
    d.font = Font.boldSystemFont(9);
    d.textColor = FAINT;
  }
}

function addWord(w, text, size) {
  const t = w.addText(text);
  t.font = new Font("Georgia-Bold", size);
  t.textColor = INK;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.4;
  return t;
}

function addMeta(w, d) {
  const row = w.addStack();
  row.centerAlignContent();
  const ipa = row.addText(d.ipa);
  ipa.font = new Font("Georgia-Italic", 12);
  ipa.textColor = FAINT;
  ipa.lineLimit = 1;
  row.addSpacer(8);
  const pos = row.addText(d.pos);
  pos.font = Font.boldSystemFont(10);
  pos.textColor = TEAL;
  pos.lineLimit = 1;
}

function buildWidget(family) {
  const d = wordOfDay();
  const w = new ListWidget();
  w.backgroundGradient = background();
  // hand the exact word to the app so the two always agree
  if (APP_URL) w.url = appLink(d.idx);

  // refresh just after midnight so the word flips on the new day
  const n = new Date();
  const midnight = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 1);
  w.refreshAfterDate = midnight;

  if (family === "small") {
    w.setPadding(14, 14, 14, 14);
    header(w, family);
    w.addSpacer(6);
    addWord(w, d.word, 26);
    w.addSpacer(4);
    const p = w.addText(d.pos);
    p.font = Font.boldSystemFont(10);
    p.textColor = TEAL;
    w.addSpacer(4);
    const def = w.addText(d.simple || d.def);
    def.font = Font.systemFont(10);
    def.textColor = DIM;
    def.lineLimit = 3;
    def.minimumScaleFactor = 0.8;
    return w;
  }

  if (family === "medium") {
    w.setPadding(16, 18, 16, 18);
    header(w, family);
    w.addSpacer(8);
    addWord(w, d.word, 30);
    w.addSpacer(3);
    addMeta(w, d);
    w.addSpacer(8);
    const def = w.addText(d.def);
    def.font = Font.systemFont(12);
    def.textColor = DIM;
    def.lineLimit = 2;
    return w;
  }

  // large (4x4) and extraLarge
  const big = family === "extraLarge";
  w.setPadding(20, 22, 20, 22);
  header(w, family);
  w.addSpacer(big ? 14 : 10);

  addWord(w, d.word, big ? 52 : 42);
  w.addSpacer(6);
  addMeta(w, d);
  w.addSpacer(10);
  accentBar(w, 46);
  w.addSpacer(12);

  const lab = w.addText("MEANING");
  lab.font = Font.boldSystemFont(9);
  lab.textColor = GOLD;
  w.addSpacer(4);
  const def = w.addText(d.def);
  def.font = Font.systemFont(big ? 17 : 15);
  def.textColor = INK;
  def.lineLimit = 3;
  def.minimumScaleFactor = 0.85;

  if (d.simple) {
    w.addSpacer(10);
    const lab2 = w.addText("IN PLAIN WORDS");
    lab2.font = Font.boldSystemFont(9);
    lab2.textColor = TEAL;
    w.addSpacer(3);
    const s = w.addText(d.simple);
    s.font = Font.systemFont(big ? 15 : 13);
    s.textColor = DIM;
    s.lineLimit = 2;
    s.minimumScaleFactor = 0.85;
  }

  w.addSpacer();

  const ex = w.addText("“" + d.ex + "”");
  ex.font = new Font("Georgia-Italic", big ? 15 : 13);
  ex.textColor = DIM;
  ex.lineLimit = 2;
  ex.minimumScaleFactor = 0.85;

  w.addSpacer(8);
  const foot = w.addText(APP_URL ? "Tap to practice →" : "One word a day");
  foot.font = Font.systemFont(9);
  foot.textColor = FAINT;

  return w;
}

const family = config.widgetFamily || "large";
const widget = buildWidget(family);

// Everything is braced and wrapped in an async function on purpose: a bare
// top-level "await" inside a braceless if/else fails to parse in Scriptable.
async function run() {
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else if (OPEN_APP_WHEN_TAPPED && appLink(0)) {
    // Tapped while the widget is set to "Run Script" -> hand over to the app.
    Safari.open(appLink(wordOfDay().idx));
  } else if (family === "small") {
    await widget.presentSmall();
  } else if (family === "medium") {
    await widget.presentMedium();
  } else {
    await widget.presentLarge();
  }
  Script.complete();
}
run();

// ---------------------------------------------------------------------------
// END OF FILE. If this line is missing in Scriptable, the paste was cut short
// -- select all, delete, and paste the whole file again.
// ---------------------------------------------------------------------------
