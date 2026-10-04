// The sample course: works fully offline, so anyone can try lessons, exams,
// marking, flashcards and the mastery map before adding their own syllabus.

const T = (id, title, summary, objectives, weight = 2) => ({ id, title, summary, objectives, weight });
const mcq = (id, topicId, difficulty, prompt, options, answerIndex, explanation) => ({ id, type: 'mcq', topicId, difficulty, prompt, options, answerIndex, modelAnswer: options[answerIndex], rubric: '', explanation, source: 'GCSE Biology textbook — cell biology chapter', checked: true });
const tf = (id, topicId, difficulty, prompt, isTrue, explanation) => ({ id, type: 'tf', topicId, difficulty, prompt, options: ['True', 'False'], answerIndex: isTrue ? 0 : 1, modelAnswer: isTrue ? 'True' : 'False', rubric: '', explanation, source: 'GCSE Biology textbook — cell biology chapter', checked: true });
const short = (id, topicId, difficulty, prompt, modelAnswer, rubric, explanation) => ({ id, type: 'short', topicId, difficulty, prompt, options: [], answerIndex: -1, modelAnswer, rubric, explanation, source: 'GCSE Biology textbook — cell biology chapter', checked: true });

const PHOTOSYNTHESIS = `## The big idea
Plants make their own food. Photosynthesis uses **light energy** to turn carbon dioxide and water into **glucose**, releasing oxygen as a by-product. Almost every food chain on Earth starts here.

## Explained
### The equation
$$6\\,\\mathrm{CO_2} + 6\\,\\mathrm{H_2O} \\xrightarrow{\\text{light}} \\mathrm{C_6H_{12}O_6} + 6\\,\\mathrm{O_2}$$
In words: carbon dioxide + water → glucose + oxygen (using light energy).

### Where it happens
Photosynthesis happens in **chloroplasts**, found mainly in palisade cells near the top of the leaf. Chloroplasts contain **chlorophyll**, a green pigment that absorbs light — mostly red and blue light. Green light is reflected, which is why leaves look green.

### Energy in, not out
Photosynthesis is **endothermic**: energy is transferred *from* the environment (as light) *to* the chloroplasts.

### Two linked stages
| Stage | Where | What happens |
|---|---|---|
| Light-dependent reactions | Thylakoid membranes | Light splits water, releasing O₂ and making ATP and NADPH |
| Calvin cycle | Stroma | ATP and NADPH power the fixing of CO₂ into glucose |

### Limiting factors
The rate is limited by whichever factor is in shortest supply: **light intensity**, **carbon dioxide concentration**, and **temperature** (enzymes work best at an optimum and denature if it gets too hot). The amount of chlorophyll also matters.

### What plants do with glucose
Respiration, making **starch** for storage, **cellulose** for cell walls, **amino acids** (with nitrate ions from the soil) for proteins, and fats and oils for storage in seeds.

## Worked example
A student moves a lamp closer to pondweed and counts bubbles of oxygen per minute.

1. Light intensity follows an **inverse square law**: $\\text{light intensity} \\propto \\dfrac{1}{d^2}$.
2. Halving the distance from 20 cm to 10 cm makes the light $\\left(\\tfrac{20}{10}\\right)^2 = 4$ times more intense.
3. The bubble rate rises — until another factor (CO₂ or temperature) becomes limiting, when the graph levels off.

## Common mistakes
- Saying plants "get food from the soil". The soil provides water and mineral ions; the *food* (glucose) is made in the leaves.
- Thinking plants only respire at night. Plants respire **all the time**; in daylight photosynthesis is usually faster, so there is a net release of oxygen.
- Saying heat makes the enzymes "die". Enzymes are not alive — they **denature** (the active site changes shape).

## Key terms
- **Chlorophyll** — green pigment in chloroplasts that absorbs light.
- **Endothermic** — a reaction that takes in energy from the surroundings.
- **Limiting factor** — the factor in shortest supply that stops the rate increasing.

## Check yourself
1. Which gas is released by photosynthesis?
<details><summary>Answer</summary>Oxygen, from splitting water molecules.</details>

2. Why does increasing temperature eventually *decrease* the rate?
<details><summary>Answer</summary>The enzymes involved denature above their optimum temperature, so the reactions slow down.</details>

3. If a lamp moves from 30 cm to 15 cm away, by what factor does light intensity change?
<details><summary>Answer</summary>$(30/15)^2 = 4$, so it becomes four times more intense.</details>

## Where to read more
Your GCSE Biology textbook — the chapter on photosynthesis and its limiting factors (bioenergetics).`;

const CELLS = `## The big idea
Every living thing is made of cells, and animal and plant cells share the same basic kit. Plant cells add a few extra parts that let them make food and stay rigid.

## Explained
### Parts found in both animal and plant cells
| Part | Job |
|---|---|
| **Nucleus** | Contains the genetic material (DNA) that controls the cell |
| **Cytoplasm** | Gel where most chemical reactions happen |
| **Cell membrane** | Controls what enters and leaves the cell |
| **Mitochondria** | Site of aerobic respiration — release most of the cell's energy |
| **Ribosomes** | Site of protein synthesis |

### Extra parts in plant cells
- **Cell wall** made of cellulose — strengthens and supports the cell.
- **Chloroplasts** — absorb light for photosynthesis.
- **Permanent vacuole** filled with cell sap — keeps the cell turgid.

## Worked example
*A cell has a nucleus, a cell membrane, mitochondria and a cell wall, but no chloroplasts. Could it be a plant cell?*

Yes. Root cells are underground and get no light, so they have **no chloroplasts** — but they still have a cell wall and a permanent vacuole. A cell wall alone rules out an animal cell.

## Common mistakes
- Saying the cell wall "controls what enters the cell" — that is the **membrane**. The wall is fully permeable.
- Saying mitochondria "make energy". Energy cannot be made; respiration **releases** energy from glucose.
- Assuming every plant cell has chloroplasts.

## Key terms
- **Organelle** — a structure inside a cell with a specific job.
- **Eukaryotic** — cells with a nucleus (animals, plants, fungi).

## Check yourself
1. Which organelle is the site of protein synthesis?
<details><summary>Answer</summary>Ribosomes.</details>

2. Name the three parts found in plant cells but not animal cells.
<details><summary>Answer</summary>Cell wall, chloroplasts and a permanent vacuole.</details>

3. Why don't root hair cells have chloroplasts?
<details><summary>Answer</summary>They are underground, receive no light, and so can't photosynthesise.</details>

## Where to read more
Your GCSE Biology textbook — the chapter on cell structure.`;

export function demoCourse() {
  const now = Date.now();
  const day = 86400000;
  const exam = new Date(now + 24 * day);
  const examDate = `${exam.getFullYear()}-${String(exam.getMonth() + 1).padStart(2, '0')}-${String(exam.getDate()).padStart(2, '0')}`;

  const bank = [
    mcq('d1', 't1', 1, 'Which organelle makes most of a cell’s ATP?', ['Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'], 1, 'Aerobic respiration happens in the mitochondria and releases most of the cell’s energy. Ribosomes make proteins; the Golgi packages proteins; lysosomes digest waste.'),
    mcq('d2', 't1', 1, 'What is the function of the cell membrane?', ['Store DNA', 'Make proteins', 'Control what enters and leaves', 'Digest waste'], 2, 'The membrane is partially permeable and controls the movement of substances in and out. DNA is stored in the nucleus; proteins are made at ribosomes.'),
    mcq('d3', 't1', 1, 'Which structure contains the genetic material?', ['Nucleus', 'Ribosome', 'Cell wall', 'Vacuole'], 0, 'In animal and plant cells the DNA is held in the nucleus. The cell wall supports the cell; the vacuole stores cell sap.'),
    mcq('d4', 't1', 2, 'Which set of structures is found in plant cells but not in animal cells?', ['Cell wall, chloroplasts and a permanent vacuole', 'Nucleus, ribosomes and mitochondria', 'Cell membrane and cytoplasm', 'Ribosomes and a cell membrane'], 0, 'Both cell types have a nucleus, membrane, cytoplasm, mitochondria and ribosomes. Only plant cells have a cellulose cell wall, chloroplasts and a permanent vacuole.'),
    tf('d5', 't1', 1, 'Ribosomes are the site of protein synthesis.', true, 'Ribosomes join amino acids together to make proteins.'),
    mcq('d6', 't2', 2, 'Where is the genetic material found in a bacterial cell?', ['Inside a nucleus', 'As a single loop of DNA in the cytoplasm, plus small rings called plasmids', 'Inside the mitochondria', 'In the cell wall'], 1, 'Bacteria are prokaryotes: they have no nucleus. Their DNA is a single circular chromosome free in the cytoplasm, often with plasmids. They have no mitochondria.'),
    tf('d7', 't2', 1, 'Prokaryotic cells contain mitochondria.', false, 'Prokaryotic cells have no membrane-bound organelles — no nucleus and no mitochondria.'),
    mcq('d8', 't3', 2, 'An image of a cell is 6 mm wide. The real cell is 0.02 mm wide. What is the magnification?', ['×12', '×120', '×300', '×3000'], 2, 'Magnification = image size ÷ real size = 6 ÷ 0.02 = 300. Make sure both sizes are in the same units first.'),
    mcq('d9', 't3', 2, 'Why can electron microscopes show smaller structures than light microscopes?', ['They have a higher resolution', 'They use coloured stains', 'They can view living cells', 'They use glass lenses'], 0, 'Resolution is the ability to distinguish two points that are close together. Electron microscopes have much higher resolution (and magnification). They cannot view living cells.'),
    short('d10', 't3', 2, 'Convert $25\\ \\mu m$ into millimetres. Show your working.', '$25 \\div 1000 = 0.025$ mm', '1 mark: dividing by 1000 (1 mm = 1000 µm); 1 mark: 0.025 mm', 'There are 1000 micrometres in a millimetre, so divide by 1000: 25 µm = 0.025 mm.'),
    mcq('d11', 't5', 1, 'Diffusion is the net movement of particles…', ['from a lower to a higher concentration', 'from a higher to a lower concentration', 'across a membrane using energy from respiration', 'of water only'], 1, 'Diffusion is passive: particles spread out from where they are more concentrated to where they are less concentrated. Using energy describes active transport.'),
    tf('d12', 't5', 1, 'Increasing the temperature increases the rate of diffusion.', true, 'Particles have more kinetic energy at higher temperatures, so they move and spread out faster.'),
    mcq('d13', 't6', 2, 'Osmosis is the movement of…', ['water across a partially permeable membrane from a dilute to a more concentrated solution', 'solute particles from a high to a low concentration', 'water against a concentration gradient using energy', 'glucose into cells'], 0, 'Osmosis is the diffusion of water from a dilute solution (lots of water) to a more concentrated one, across a partially permeable membrane. It needs no energy.'),
    mcq('d14', 't6', 2, 'A potato chip is left in a concentrated salt solution for an hour. What happens to its mass?', ['It increases', 'It decreases', 'It stays the same', 'It doubles'], 1, 'The solution outside is more concentrated than the cell sap, so water leaves the potato cells by osmosis and the chip loses mass.'),
    mcq('d15', 't7', 1, 'Which process moves substances against a concentration gradient?', ['Diffusion', 'Osmosis', 'Active transport', 'Evaporation'], 2, 'Active transport moves substances from a dilute to a more concentrated region, which needs energy from respiration. Diffusion and osmosis go down the gradient.'),
    tf('d16', 't7', 1, 'Active transport requires energy from respiration.', true, 'Moving substances against a concentration gradient needs energy, which comes from respiration (so cells doing it have many mitochondria).'),
    mcq('d17', 't8', 1, 'Complete the word equation for aerobic respiration: glucose + oxygen → …', ['carbon dioxide + water', 'lactic acid', 'ethanol + carbon dioxide', 'glucose + water'], 0, 'Aerobic respiration: glucose + oxygen → carbon dioxide + water (releasing energy). Lactic acid and ethanol come from anaerobic respiration.'),
    tf('d18', 't8', 2, 'Aerobic respiration releases more energy per glucose molecule than anaerobic respiration.', true, 'Glucose is fully oxidised in aerobic respiration, so much more energy is released than in anaerobic respiration, where it is only partly broken down.'),
    mcq('d19', 't9', 2, 'What does anaerobic respiration in human muscle cells produce?', ['Lactic acid', 'Ethanol and carbon dioxide', 'Oxygen', 'Carbon dioxide and water'], 0, 'In muscles: glucose → lactic acid. Ethanol and carbon dioxide are produced by anaerobic respiration in yeast and plant cells.'),
    mcq('d20', 't9', 2, 'What does anaerobic respiration in yeast produce?', ['Lactic acid only', 'Ethanol and carbon dioxide', 'Oxygen and glucose', 'Water only'], 1, 'In yeast (fermentation): glucose → ethanol + carbon dioxide. This is used in brewing and bread-making.'),
    mcq('d21', 't10', 1, 'Where does photosynthesis occur?', ['Nucleus', 'Chloroplast', 'Vacuole', 'Cytoplasm'], 1, 'Chloroplasts contain chlorophyll, which absorbs the light energy needed for photosynthesis.'),
    tf('d22', 't10', 2, 'Photosynthesis is an endothermic reaction.', true, 'Energy is transferred from the environment (as light) to the chloroplasts, so it is endothermic.'),
    short('d23', 't10', 2, 'Name **two** factors that can limit the rate of photosynthesis.', 'Any two of: light intensity, carbon dioxide concentration, temperature (also amount of chlorophyll).', '1 mark each for any two of: light intensity; carbon dioxide concentration; temperature; amount of chlorophyll', 'Whichever of these is in shortest supply limits the rate. Water is not usually accepted as a limiting factor at GCSE.'),
    mcq('d24', 't11', 2, 'Mitosis produces…', ['two genetically identical cells', 'four genetically different cells', 'two gametes', 'one large cell'], 0, 'Mitosis produces two genetically identical daughter cells for growth and repair. Four genetically different gametes are made by meiosis.'),
    tf('d25', 't11', 2, 'DNA is replicated before mitosis begins.', true, 'During the cell cycle the DNA is copied (and organelles such as mitochondria increase in number) before the cell divides.'),
    mcq('d26', 't12', 2, 'Embryonic stem cells can…', ['differentiate into most types of cell', 'only become blood cells', 'no longer divide', 'only be found in plants'], 0, 'Embryonic stem cells are undifferentiated and can become most types of human cell. Adult bone marrow stem cells are more limited (e.g. blood cells).'),
    mcq('d27', 't12', 2, 'In plants, where are stem cells found?', ['In meristems', 'In xylem vessels only', 'In the waxy cuticle', 'In root hair cells only'], 0, 'Meristem tissue at the tips of roots and shoots contains stem cells that can differentiate into any type of plant cell throughout the plant’s life.'),
  ];

  const h = (topicId, r, daysAgo, d = 2) => ({ topicId, r, d, t: now - daysAgo * day, src: 'exam' });
  const card = (id, topicId, front, back, dueInDays) => ({ id, topicId, front, back, src: 'ai', created: now - 3 * day, due: now + dueInDays * day, interval: Math.max(0, dueInDays), ease: 2.5, reps: dueInDays > 0 ? 1 : 0, lapses: 0 });

  return {
    id: 'demo',
    demo: true,
    created: now - 4 * day,
    title: 'Cell biology — Year 10',
    subject: 'Biology',
    level: 'High school (Year 10, GCSE)',
    summary: 'The sample course: cell structure, transport, cell energy and cell division at GCSE level. Try a lesson, take a practice exam and watch the mastery map change.',
    syllabus: 'Unit 1 Cell structure: animal and plant cells; prokaryotic and eukaryotic cells; microscopy; specialised cells.\nUnit 2 Transport in cells: diffusion; osmosis; active transport.\nUnit 3 Cell energy: aerobic respiration; anaerobic respiration; photosynthesis.\nUnit 4 Cell division: mitosis and the cell cycle; stem cells.',
    books: ['GCSE Biology Student Book', 'GCSE Biology Revision Guide'],
    examDate,
    examFormat: 'Written paper: multiple choice, short answers and calculations',
    struggles: 'Osmosis and magnification calculations',
    units: [
      { id: 'u1', title: 'Cell structure', topics: [
        T('t1', 'Animal and plant cells', 'The organelles of eukaryotic cells and what each one does.', ['Name the parts of animal and plant cells', 'Describe the function of each part', 'Explain how plant cells differ from animal cells'], 3),
        T('t2', 'Prokaryotic and eukaryotic cells', 'How bacterial cells differ from animal and plant cells.', ['Compare prokaryotic and eukaryotic cells', 'Describe the structure of a bacterial cell'], 2),
        T('t3', 'Microscopy and magnification', 'Light and electron microscopes, and magnification calculations.', ['Use magnification = image size ÷ real size', 'Convert between mm, µm and nm', 'Compare light and electron microscopes'], 3),
        T('t4', 'Cell specialisation', 'How cells are adapted to their functions.', ['Explain adaptations of sperm, nerve, muscle, root hair, xylem and phloem cells', 'Describe differentiation'], 1),
      ] },
      { id: 'u2', title: 'Transport in cells', topics: [
        T('t5', 'Diffusion', 'The passive spread of particles down a concentration gradient.', ['Define diffusion', 'Explain the factors that affect the rate of diffusion', 'Explain surface area to volume ratio'], 2),
        T('t6', 'Osmosis', 'The diffusion of water across a partially permeable membrane.', ['Define osmosis', 'Predict what happens to cells in different solutions', 'Calculate percentage change in mass'], 3),
        T('t7', 'Active transport', 'Moving substances against a concentration gradient using energy.', ['Define active transport', 'Explain why it needs energy from respiration', 'Give examples in plants and animals'], 2),
      ] },
      { id: 'u3', title: 'Cell energy', topics: [
        T('t8', 'Aerobic respiration', 'Releasing energy from glucose using oxygen.', ['Write the word equation', 'State where it happens', 'Explain why organisms need energy'], 3),
        T('t9', 'Anaerobic respiration', 'Respiration without oxygen in muscles, plants and yeast.', ['Compare aerobic and anaerobic respiration', 'Explain oxygen debt'], 2),
        T('t10', 'Photosynthesis', 'How plants use light to make glucose, and what limits the rate.', ['Write the word and symbol equations', 'Explain limiting factors', 'Use the inverse square law for light intensity'], 3),
      ] },
      { id: 'u4', title: 'Cell division', topics: [
        T('t11', 'Mitosis and the cell cycle', 'How cells copy their DNA and divide for growth and repair.', ['Describe the stages of the cell cycle', 'Explain the importance of mitosis'], 2),
        T('t12', 'Stem cells', 'Undifferentiated cells, their uses and the ethical issues.', ['Describe embryonic, adult and meristem stem cells', 'Evaluate the uses of stem cells'], 2),
      ] },
    ],
    lessons: {
      t10: { md: PHOTOSYNTHESIS, style: 'normal', created: now - 2 * day },
      t1: { md: CELLS, style: 'normal', created: now - 3 * day },
    },
    read: { t1: true, t10: true },
    history: [
      h('t1', 1, 3), h('t1', 1, 3), h('t1', 0.85, 2),
      h('t3', 0, 3), h('t3', 1, 2),
      h('t5', 0, 2), h('t6', 0, 2), h('t6', 0.5, 1),
      h('t8', 1, 2), h('t8', 1, 1),
      h('t10', 1, 2), h('t10', 0, 1), h('t10', 1, 1),
    ],
    exams: [],
    cards: [
      card('k1', 't1', 'What is the function of the mitochondria?', 'Site of aerobic respiration — releases energy for the cell.', 0),
      card('k2', 't1', 'Which three structures do plant cells have that animal cells do not?', 'A cellulose cell wall, chloroplasts and a permanent vacuole.', 0),
      card('k3', 't3', 'What is the equation for magnification?', 'Magnification = image size ÷ real size (same units).', 0),
      card('k4', 't6', 'Define osmosis.', 'The diffusion of water from a dilute to a more concentrated solution through a partially permeable membrane.', 0),
      card('k5', 't7', 'Why does active transport need energy?', 'It moves substances against a concentration gradient; the energy comes from respiration.', 2),
      card('k6', 't9', 'What does anaerobic respiration in muscles produce?', 'Lactic acid (glucose → lactic acid).', 0),
      card('k7', 't10', 'Name three limiting factors of photosynthesis.', 'Light intensity, carbon dioxide concentration and temperature.', 3),
      card('k8', 't11', 'What does mitosis produce?', 'Two genetically identical diploid daughter cells.', 1),
    ],
    mistakes: [],
    bank,
    chat: [],
    planDone: {},
    dailyMinutes: 45,
  };
}
