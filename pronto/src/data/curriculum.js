// Curriculum data for Pronto.
//
// Content is organized survival-first: every unit is a real situation
// (ordering a drink, finding a bathroom, dealing with an emergency)
// rather than an abstract grammar topic. Each unit ends with a
// "scenario" lesson — a short roleplay dialogue that chains the
// unit's phrases together the way you'd actually use them.
//
// On top of that, short "explain" cards teach the grammar pattern
// behind the phrases you just used — the way a good language course
// pairs practice with just enough theory to make the pattern stick —
// and two cumulative "checkpoint" lessons space out review the way a
// real syllabus would.
//
// Exercise shapes:
//   explain   - a short grammar note (title + body + examples), no scoring
//   mcq       - multiple choice (dir: 'it-en' recognize, or 'en-it' produce)
//   build     - drag/tap word tiles into the correct Italian sentence, from English
//   type      - type the Italian translation from a free text box
//   listen    - hear the Italian spoken aloud, choose what it means
//   match     - match a small set of Italian/English pairs
//   speak     - say the Italian phrase out loud, scored against speech recognition
//   dictation - hear the Italian spoken aloud, type exactly what you heard (no
//               English shown up front) — classic dictation, tests sound-to-word
//   reorder   - hear the Italian spoken aloud, drag its own (scrambled) words
//               into the right order — word-order from listening, not translation
//   respond   - hear an Italian prompt, reply out loud in your own words, scored
//               against a short list of acceptable phrasings — open production,
//               not an echo of one fixed line
//
// Every regular unit (u1-u6) also carries a `test` array: a short, timed
// checkpoint (see UnitTest.jsx) that must be passed to unlock the next unit —
// retrieval practice on material from across the whole unit, in fresh
// phrasing, not a copy of the lesson questions.

function lesson(id, title, subtitle, icon, exercises) {
  return {
    id,
    type: 'lesson',
    title,
    subtitle,
    icon,
    exercises: exercises.map((ex, i) => ({ id: `${id}-e${i + 1}`, ...ex })),
  }
}

function checkpointLesson(id, title, subtitle, icon, exercises) {
  return { ...lesson(id, title, subtitle, icon, exercises), checkpoint: true }
}

function scenario(id, title, subtitle, icon, intro, turns, objectiveIds) {
  return { id, type: 'scenario', title, subtitle, icon, intro, turns, objectiveIds }
}

function explain(title, body, examples = []) {
  return { type: 'explain', title, body, examples }
}

function mcq(dir, it, en, options, extra = {}) {
  return { type: 'mcq', dir, it, en, options, ...extra }
}

function build(en, it, distractors, extra = {}) {
  return { type: 'build', en, it, distractors, ...extra }
}

function typeEx(en, it, accept = [], extra = {}) {
  return { type: 'type', en, it, accept, ...extra }
}

function listen(it, en, options, extra = {}) {
  return { type: 'listen', it, en, options, ...extra }
}

function match(pairs, extra = {}) {
  return { type: 'match', pairs, ...extra }
}

function speak(it, en, extra = {}) {
  return { type: 'speak', it, en, ...extra }
}

// Like speak, but the Italian text stays hidden until after the attempt —
// the learner reacts to audio alone instead of reading along, then sees
// which words of the target they actually landed.
function shadow(it, en, extra = {}) {
  return { type: 'shadow', it, en, ...extra }
}

function dictation(it, en, accept = [], extra = {}) {
  return { type: 'dictation', it, en, accept, ...extra }
}

function reorder(it, en, extra = {}) {
  return { type: 'reorder', it, en, ...extra }
}

function respond(promptIt, promptEn, accepts, modelEn, extra = {}) {
  return { type: 'respond', promptIt, promptEn, accepts, modelEn, ...extra }
}

function unitTest(unitId, exercises) {
  return exercises.map((ex, i) => ({ id: `${unitId}-test-e${i + 1}`, ...ex }))
}

export const UNITS = [
  // ────────────────────────────────────────────────────────────
  {
    id: 'u1',
    title: 'First Contact',
    subtitle: 'Primo Contatto',
    icon: 'wave',
    color: '#C1502E',
    learn: [
      'Greet someone appropriately for the time of day',
      'Introduce yourself and ask for a name',
      'Say you don’t understand and ask someone to slow down',
      'Know when to use tu vs. Lei',
    ],
    test: unitTest('u1', [
      mcq('it-en', 'Buonasera', 'Good evening', ['Good morning', 'Good evening', 'Goodbye', 'Hello']),
      typeEx('My name is...', 'Mi chiamo...', ['mi chiamo']),
      mcq('en-it', 'Piacere', 'Nice to meet you', ['Grazie', 'Prego', 'Piacere', 'Scusi']),
      build('I don’t understand', 'Non capisco', ['lo', 'so']),
      typeEx('Do you speak English?', 'Parla inglese?', ['parla inglese']),
      listen('Come sta?', 'How are you? (formal)', ['How are you? (formal)', 'What’s your name?', 'Where are you from?', 'Nice to meet you']),
    ]),
    lessons: [
      lesson('u1l1', 'Hello & Goodbye', 'Greetings that actually match the time of day', 'sun', [
        mcq('it-en', 'Buongiorno', 'Good morning / Good day', ['Good evening', 'Good morning / Good day', 'Good night', 'See you soon']),
        mcq('it-en', 'Buonasera', 'Good evening', ['Good morning', 'Good evening', 'Goodbye', 'Hello']),
        mcq('en-it', 'Buonanotte', 'Good night (when leaving / going to bed)', ['Buongiorno', 'Buonasera', 'Buonanotte', 'Arrivederci']),
        build('Hi, how are you?', 'Ciao, come stai?', ['bene', 'grazie'], {
          note: '"Come stai?" is informal. With someone older, a stranger, or in a shop, use "Come sta?" instead.',
        }),
        typeEx('I’m well, thank you', 'Sto bene, grazie', ['sto bene grazie']),
        mcq('en-it', 'Arrivederci', 'Goodbye (formal / general use)', ['Ciao', 'Arrivederci', 'Buonanotte', 'Prego']),
        listen('A presto', 'See you soon', ['See you soon', 'See you tomorrow', 'Good night', 'Welcome']),
        match([
          { it: 'Ciao', en: 'Hi / Bye (informal)' },
          { it: 'Buongiorno', en: 'Good morning' },
          { it: 'Buonasera', en: 'Good evening' },
          { it: 'A domani', en: 'See you tomorrow' },
        ]),
        speak('Ciao, come stai?', 'Say it out loud: Hi, how are you?'),
      ]),

      lesson('u1l2', 'Please & Thank You', 'The words that make everything else land softer', 'heart', [
        explain(
          'Making a Sentence Negative',
          'To make any Italian sentence negative, put non directly before the verb — no extra helper word needed, unlike English’s "do/does not."',
          [
            { it: 'Non parlo italiano', en: 'I don’t speak Italian' },
            { it: 'Non capisco', en: 'I don’t understand' },
          ],
        ),
        mcq('it-en', 'Per favore', 'Please', ['Thank you', 'Please', 'Sorry', 'You’re welcome']),
        mcq('it-en', 'Grazie mille', 'Thanks a lot', ['No thanks', 'Thanks a lot', 'Excuse me', 'I’m sorry']),
        mcq('en-it', 'Prego', 'You’re welcome', ['Grazie', 'Prego', 'Scusi', 'Piacere']),
        build('Excuse me, I’m sorry', 'Scusi, mi dispiace', ['grazie', 'prego'], {
          note: '"Scusi" (formal) doubles as "excuse me" to get attention AND "sorry" for a small bump. "Mi dispiace" is for when you actually mean it.',
        }),
        typeEx('Do you speak English?', 'Parla inglese?', ['parla inglese'], {
          note: 'This is the single most useful sentence for a nervous beginner — it’s not giving up, it’s buying yourself room.',
        }),
        mcq('en-it', 'Non parlo italiano', 'I don’t speak Italian', ['Non capisco', 'Non parlo italiano', 'Parlo italiano', 'Non lo so']),
        listen('Sì, certo', 'Yes, of course', ['Yes, of course', 'No, sorry', 'I don’t know', 'Maybe']),
        match([
          { it: 'Per favore', en: 'Please' },
          { it: 'Grazie', en: 'Thank you' },
          { it: 'Scusi', en: 'Excuse me / Sorry (formal)' },
          { it: 'Sì / No', en: 'Yes / No' },
        ]),
        speak('Grazie mille', 'Say it out loud: Thanks a lot'),
      ]),

      lesson('u1l3', 'When You Get Stuck', 'What to say the moment you stop understanding', 'question', [
        explain(
          'Formal vs. Informal "You"',
          'Italian has two ways to say "you": tu (informal — friends, family, peers, kids) and Lei (formal, capital L — strangers, elders, anyone in a professional setting). The verb changes shape with each. When you’ve just met someone, default to Lei.',
          [
            { it: 'Come stai? (tu)', en: 'How are you? — casual' },
            { it: 'Come sta? (Lei)', en: 'How are you? — polite' },
          ],
        ),
        mcq('it-en', 'Mi chiamo Marco', 'My name is Marco', ['His name is Marco', 'My name is Marco', 'Call me Marco', 'I am calling Marco']),
        typeEx('What’s your name? (informal)', 'Come ti chiami?', ['come ti chiami']),
        mcq('it-en', 'Piacere', 'Nice to meet you', ['Please', 'Nice to meet you', 'Welcome', 'Good luck']),
        build('I don’t understand', 'Non capisco', ['non', 'lo', 'so'], {
          note: 'Don’t confuse with "Non lo so" (I don’t know) — "Non capisco" specifically means the words aren’t landing.',
        }),
        typeEx('Can you repeat, please? (formal)', 'Può ripetere, per favore?', ['puo ripetere per favore', 'può ripetere per favore']),
        mcq('en-it', 'Più lentamente, per favore', 'More slowly, please', ['Più lentamente, per favore', 'Più velocemente, per favore', 'Ancora una volta', 'Non capisco']),
        listen('Come si dice “water” in italiano?', 'How do you say "water" in Italian?', [
          'How do you say "water" in Italian?',
          'Where is the water?',
          'Do you have water?',
          'I don’t understand water',
        ]),
        match([
          { it: 'Non capisco', en: 'I don’t understand' },
          { it: 'Può ripetere?', en: 'Can you repeat?' },
          { it: 'Più lentamente', en: 'More slowly' },
          { it: 'Come si dice...?', en: 'How do you say...?' },
        ]),
        speak('Non capisco', 'Say it out loud: I don’t understand'),
      ]),

      lesson('u1l3x', 'Talking About Yourself', 'Nationality, work, and the essential verb "to be"', 'user', [
        explain(
          'The Verb Essere (To Be)',
          'Essere is the single most essential — and irregular — verb in Italian. Between essere and avere, you can build an enormous share of everyday sentences.',
          [
            { it: 'io sono', en: 'I am' },
            { it: 'tu sei', en: 'you are' },
            { it: 'lui / lei è', en: 'he / she is' },
          ],
        ),
        mcq('it-en', 'Di dove sei?', 'Where are you from?', ['Where are you going?', 'Where are you from?', 'How old are you?', 'Do you live here?']),
        typeEx('I am American', 'Sono americano/a', ['sono americano', 'sono americana']),
        dictation('Sono di New York', 'I’m from New York', ['sono di new york']),
        build('What’s your profession?', 'Qual è la tua professione?', ['lavoro', 'mestiere'], {
          note: '"Professione" and "lavoro" both mean roughly "job" — professione leans formal, lavoro is the everyday word.',
        }),
        reorder('Sono uno studente', 'I am a student'),
        respond(
          'Che lavoro fai?', 'What work do you do? (informal)',
          ['Sono uno studente', 'Sono un insegnante', 'Lavoro in un ufficio'],
          'I’m a student / I’m a teacher / I work in an office',
        ),
        match([
          { it: 'Sono...', en: 'I am...' },
          { it: 'Uno studente / Una studentessa', en: 'A student' },
          { it: 'Un insegnante', en: 'A teacher' },
          { it: 'Lavoro in...', en: 'I work in...' },
        ]),
      ]),

      scenario(
        'u1l4',
        'Checking In',
        'Scenario: arriving at your B&B',
        'door',
        'You’ve just arrived at your B&B in Rome, jet-lagged and dragging a suitcase. The host opens the door.',
        [
          {
            speaker: 'Host', it: 'Buongiorno! Benvenuto! Come si chiama?', en: 'Good morning! Welcome! What’s your name?',
            choices: [
              { it: 'Mi chiamo Alex, piacere.', en: 'My name is Alex, nice to meet you.', correct: true, feedback: 'Clean and polite — exactly what a host expects to hear.' },
              { it: 'Non lo so.', en: 'I don’t know.', correct: false, feedback: '"Non lo so" means "I don’t know" — probably not the answer for your own name.' },
              { it: 'Grazie mille!', en: 'Thanks a lot!', correct: false, feedback: 'Friendly, but it doesn’t actually answer "what’s your name?"' },
            ],
          },
          {
            speaker: 'Host', it: 'Piacere! Parla italiano?', en: 'Nice to meet you! Do you speak Italian?',
            choices: [
              { it: 'Un po’. Parla inglese?', en: 'A little. Do you speak English?', correct: true, feedback: 'Honest, and it hands the host an easy out if your Italian runs dry.' },
              { it: 'Sì, perfettamente!', en: 'Yes, perfectly!', correct: false, feedback: 'Bold claim — you’re about to get a fast, real answer back and lose the thread.' },
              { it: 'Buonanotte.', en: 'Good night.', correct: false, feedback: 'It’s morning — wrong greeting for the moment.' },
            ],
          },
          {
            speaker: 'Host', it: 'Va bene. La sua camera è al secondo piano. Ha domande?', en: 'Okay. Your room is on the second floor. Any questions?',
            choices: [
              { it: 'Sì — qual è la password del wifi?', en: 'Yes — what’s the wifi password?', correct: true, feedback: 'The single most-asked question at every check-in on earth. Well played.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'That’s for a restaurant table, not a B&B check-in.' },
              { it: 'Dov’è la farmacia?', en: 'Where’s the pharmacy?', correct: false, feedback: 'Not wrong Italian — just not what you actually need right now.' },
            ],
          },
          {
            speaker: 'Host', it: 'È "CasaRoma2024", tutto maiuscolo. Altro?', en: 'It’s "CasaRoma2024", all capitals. Anything else?',
            choices: [
              { it: 'No, va bene così. Grazie mille!', en: 'No, that’s all. Thanks a lot!', correct: true, feedback: 'A graceful close — you’ll use this exact line constantly, not just here.' },
              { it: 'Non capisco niente.', en: 'I don’t understand anything.', correct: false, feedback: 'A bit much — you clearly understood the wifi password just fine.' },
              { it: 'Sono allergico alle noci.', en: 'I’m allergic to nuts.', correct: false, feedback: 'True, maybe — but wildly irrelevant to a wifi password.' },
            ],
          },
        ],
        ['greet-introduce', 'handle-confusion'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u2',
    title: 'At the Café',
    subtitle: 'Al Bar',
    icon: 'cup',
    color: '#1F6F6B',
    learn: [
      'Order a drink and specify still or sparkling water',
      'State a dietary restriction or allergy',
      'Use un / una correctly with everyday nouns',
      'Ask for and pay the bill',
    ],
    test: unitTest('u2', [
      mcq('it-en', 'Vorrei un caffè, per favore', 'I would like a coffee, please', ['I have a coffee', 'I would like a coffee, please', 'Do you have coffee?', 'The coffee is good']),
      typeEx('Sparkling water', 'Acqua frizzante', ['acqua frizzante']),
      mcq('en-it', 'Sono vegetariano/a', 'I’m vegetarian', ['Sono vegetariano/a', 'Mi piacciono le verdure', 'Non mangio verdure', 'Sei vegetariano?']),
      build('The check, please', 'Il conto, per favore', ['tavolo', 'menù']),
      typeEx('How much does it cost?', 'Quanto costa?', ['quanto costa']),
      listen('Ci sono noci?', 'Are there nuts in it?', ['Are there nuts in it?', 'I have nuts', 'Do you want nuts?', 'There are no nuts']),
    ]),
    lessons: [
      lesson('u2l1', 'Ordering a Drink', 'Yes, including the water Duolingo forgot', 'droplet', [
        explain(
          'Gender & the Indefinite Article',
          'Every Italian noun is masculine or feminine, and the word for "a/an" changes to match it: un before most masculine nouns, una before feminine nouns, and un’ before feminine nouns that start with a vowel.',
          [
            { it: 'un caffè', en: 'a coffee (masculine)' },
            { it: 'un’acqua', en: 'a water (feminine, starts with a vowel)' },
            { it: 'una birra', en: 'a beer (feminine)' },
          ],
        ),
        mcq('it-en', 'Vorrei un caffè, per favore', 'I would like a coffee, please', ['I have a coffee', 'I would like a coffee, please', 'Do you have coffee?', 'The coffee is good']),
        typeEx('I would like some water, please', 'Vorrei dell’acqua, per favore', ['vorrei dell\'acqua per favore', 'vorrei dellacqua per favore'], {
          note: '"Vorrei" (I would like) is the single most useful verb in this whole app. It’s softer than "voglio" (I want) and works for ordering absolutely anything.',
          objectiveIds: ['order-drink'],
        }),
        build('A still water, please', 'Un’acqua naturale, per favore', ['frizzante', 'un bicchiere'], {
          note: 'Ask for water in Italy and you’ll get asked back: naturale (still) or frizzante (sparkling)?',
          objectiveIds: ['order-drink'],
        }),
        mcq('en-it', 'Un’acqua frizzante', 'A sparkling water', ['Un’acqua naturale', 'Un’acqua frizzante', 'Un caffè freddo', 'Un bicchiere di vino']),
        typeEx('Can I have a glass of water?', 'Posso avere un bicchiere d’acqua?', ['posso avere un bicchiere d\'acqua', 'posso avere un bicchiere dacqua'], {
          objectiveIds: ['order-drink'],
        }),
        listen('Va bene così, grazie', 'That’s fine like that, thanks', ['That’s fine like that, thanks', 'That’s not what I ordered', 'Nothing else, sorry', 'I changed my mind']),
        mcq('it-en', 'Un cappuccino', 'A cappuccino', ['A croissant', 'A cappuccino', 'A tea', 'A hot chocolate']),
        match([
          { it: 'Vorrei...', en: 'I would like...' },
          { it: 'Acqua naturale', en: 'Still water' },
          { it: 'Acqua frizzante', en: 'Sparkling water' },
          { it: 'Un bicchiere d’acqua', en: 'A glass of water' },
        ]),
        speak('Vorrei dell’acqua, per favore', 'Say it out loud: I would like some water, please', { objectiveIds: ['order-drink'] }),
      ]),

      lesson('u2l2', 'Food & Allergies', 'So you don’t discover the hard way what’s in it', 'croissant', [
        explain(
          'Present Tense: -are Verbs',
          'Regular verbs ending in -are, like mangiare (to eat), follow a predictable pattern in the present tense: drop the -are and add the ending for who’s doing it.',
          [
            { it: 'io mangio', en: 'I eat' },
            { it: 'tu mangi', en: 'you eat' },
            { it: 'lui / lei mangia', en: 'he / she eats' },
          ],
        ),
        mcq('it-en', 'Un cornetto', 'A croissant (Italian-style)', ['A cracker', 'A croissant (Italian-style)', 'A sandwich', 'A muffin']),
        typeEx('What do you recommend? (formal)', 'Che cosa consiglia?', ['che cosa consiglia', 'cosa consiglia']),
        build('I’m vegetarian', 'Sono vegetariano/a', ['non', 'mangio', 'carne'], {
          note: 'Use "vegetariano" if you’re male, "vegetariana" if you’re female — Italian adjectives agree with the speaker.',
          objectiveIds: ['handle-allergy'],
        }),
        typeEx('I’m allergic to nuts', 'Sono allergico/a alle noci', ['sono allergico alle noci', 'sono allergica alle noci'], {
          objectiveIds: ['handle-allergy'],
        }),
        mcq('en-it', 'Ci sono noci?', 'Are there nuts in it?', ['Ci sono noci?', 'Sono le noci?', 'Ho le noci', 'Vorrei noci']),
        listen('Senza zucchero, per favore', 'Without sugar, please', ['Without sugar, please', 'With extra sugar', 'Is there sugar?', 'I love sugar']),
        mcq('it-en', 'Non mangio carne', 'I don’t eat meat', ['I don’t like meat', 'I don’t eat meat', 'I’m eating meat', 'Do you eat meat?']),
        match([
          { it: 'Sono vegetariano/a', en: 'I’m vegetarian' },
          { it: 'Sono allergico/a a...', en: 'I’m allergic to...' },
          { it: 'Ci sono noci?', en: 'Are there nuts in it?' },
          { it: 'Senza zucchero', en: 'Without sugar' },
        ]),
      ]),

      lesson('u2l3', 'Paying the Bill', 'How to close out and leave without confusion', 'coin', [
        mcq('it-en', 'Il conto, per favore', 'The check, please', ['The menu, please', 'The check, please', 'A table, please', 'The bathroom, please']),
        typeEx('How much does it cost?', 'Quanto costa?', ['quanto costa'], { objectiveIds: ['pay-bill'] }),
        build('Can I pay by card?', 'Posso pagare con la carta?', ['contanti', 'in contanti'], { objectiveIds: ['pay-bill'] }),
        mcq('en-it', 'Solo contanti', 'Cash only', ['Solo contanti', 'Solo carta', 'Niente contanti', 'Troppo caro']),
        listen('Tenga il resto', 'Keep the change', ['Keep the change', 'Where’s my change?', 'Is there a discount?', 'I need change']),
        mcq('it-en', 'È incluso il servizio?', 'Is service included?', ['Is the service open?', 'Is service included?', 'Where’s the service?', 'I need service']),
        match([
          { it: 'Il conto, per favore', en: 'The check, please' },
          { it: 'Quanto costa?', en: 'How much does it cost?' },
          { it: 'Con la carta', en: 'By card' },
          { it: 'Tenga il resto', en: 'Keep the change' },
        ]),
      ]),

      lesson('u2l3x', 'Ordering Like a Regular', 'More café vocabulary and how a question actually sounds', 'cup', [
        explain(
          'Yes/No Questions Need No New Words',
          'Turning a statement into a yes/no question in Italian doesn’t change the word order at all — you just say it with a rising intonation at the end (and add a question mark in writing). "È caldo" (It’s hot) becomes "È caldo?" (Is it hot?) with nothing else different.',
          [
            { it: 'È molto caldo.', en: 'It’s very hot.' },
            { it: 'È molto caldo?', en: 'Is it very hot?' },
          ],
        ),
        mcq('it-en', 'Un caffè macchiato', 'An espresso with a dash of milk', ['A milky coffee', 'An espresso with a dash of milk', 'A cold coffee', 'A decaf coffee']),
        typeEx('Two coffees, please', 'Due caffè, per favore', ['due caffe per favore', 'due caffè per favore']),
        dictation('Il conto, per favore', 'The check, please', ['il conto per favore']),
        build('Is it very hot?', 'È molto caldo?', ['freddo', 'tiepido']),
        reorder('Vorrei un tè caldo', 'I’d like a hot tea'),
        respond(
          'Cosa desidera?', 'What would you like?',
          ['Vorrei un caffè', 'Vorrei un tè', 'Vorrei un cappuccino'],
          'I’d like a coffee / a tea / a cappuccino',
        ),
        match([
          { it: 'Un tè', en: 'A tea' },
          { it: 'Caldo / freddo', en: 'Hot / cold' },
          { it: 'Un caffè macchiato', en: 'Espresso with a dash of milk' },
          { it: 'Cosa desidera?', en: 'What would you like?' },
        ]),
      ]),

      scenario(
        'u2l4',
        'Order Like a Local',
        'Scenario: at the bar counter',
        'cup',
        'You walk up to a busy bar counter in Florence. Italians stand at the counter here — it’s faster and cheaper than a table.',
        [
          {
            speaker: 'Barista', it: 'Buongiorno, cosa prende?', en: 'Good morning, what will you have?',
            choices: [
              { it: 'Vorrei un cappuccino, per favore.', en: 'I’d like a cappuccino, please.', correct: true, feedback: '"Vorrei" + item + "per favore" — the exact formula that covers 90% of ordering anything, anywhere.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'You haven’t ordered anything yet — a bit premature.' },
              { it: 'Non lo so.', en: 'I don’t know.', correct: false, feedback: 'Understandable if you’re staring at the pastry case, but doesn’t get you a drink.' },
            ],
          },
          {
            speaker: 'Barista', it: 'Certo. Altro?', en: 'Sure. Anything else?',
            choices: [
              { it: 'Sì, un’acqua naturale, per favore.', en: 'Yes, a still water, please.', correct: true, feedback: 'This is the line that never made it into Duolingo’s lessons — now it’s permanently in yours.' },
              { it: 'Sono vegetariano.', en: 'I’m vegetarian.', correct: false, feedback: 'True, maybe, but it doesn’t answer "anything else?"' },
              { it: 'Buonanotte.', en: 'Good night.', correct: false, feedback: 'Wrong time of day, and not an answer to the question.' },
            ],
          },
          {
            speaker: 'Barista', it: 'Naturale o frizzante?', en: 'Still or sparkling?',
            choices: [
              { it: 'Naturale, grazie.', en: 'Still, thanks.', correct: true, feedback: 'Simple, direct, done — exactly how a local would answer.' },
              { it: 'Sì, per favore.', en: 'Yes, please.', correct: false, feedback: 'This is a "which one" question, not a yes/no question — you’ll just get an awkward pause back.' },
              { it: 'Un caffè.', en: 'A coffee.', correct: false, feedback: 'You already ordered your coffee — this question is only about the water.' },
            ],
          },
          {
            speaker: 'Barista', it: 'Ecco a lei. Sono quattro euro.', en: 'Here you go. That’s four euros.',
            choices: [
              { it: 'Posso pagare con la carta?', en: 'Can I pay by card?', correct: true, feedback: 'Good instinct — many small bars are cash-only, so it’s worth checking before you order next time too.' },
              { it: 'Che cosa consiglia?', en: 'What do you recommend?', correct: false, feedback: 'You’ve already ordered and been given the total — this question is now out of place.' },
              { it: 'Dov’è il bagno?', en: 'Where’s the bathroom?', correct: false, feedback: 'Could be true, but it doesn’t address paying for your order.' },
            ],
          },
        ],
        ['order-drink', 'pay-bill'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u3',
    title: 'At the Restaurant',
    subtitle: 'Al Ristorante',
    icon: 'fork',
    color: '#B8863B',
    learn: [
      'Reserve or ask for a table',
      'Order a full meal and describe a dietary need',
      'Conjugate avere in the present tense',
      'Ask for extras and close out a meal',
    ],
    test: unitTest('u3', [
      mcq('it-en', 'Ho una prenotazione', 'I have a reservation', ['I need a reservation', 'I have a reservation', 'I cancelled my reservation', 'Do you take reservations?']),
      typeEx('I’d like to order', 'Vorrei ordinare', ['vorrei ordinare']),
      mcq('en-it', 'Sono celiaco/a', 'I have celiac disease', ['Sono celiaco/a', 'Sono vegetariano/a', 'Sono allergico/a', 'Non mangio carne']),
      build('Is service included?', 'È incluso il servizio?', ['escluso', 'gratuito']),
      typeEx('A little more bread, please', 'Un altro po’ di pane, per favore', ['un altro po di pane per favore', 'un altro po\' di pane per favore']),
      listen('Tutto bene?', 'Is everything okay?', ['Is everything okay?', 'Are you finished?', 'Do you want dessert?', 'Is it too spicy?']),
    ]),
    lessons: [
      lesson('u3l1', 'Getting a Table', 'Reservations, walk-ins, and getting seated', 'chair', [
        explain(
          'The Verb Avere (To Have)',
          'Avere is one of Italian’s two essential verbs, and it’s irregular — worth memorizing outright. It also shows up in idioms where English uses "to be": ho fame literally means "I have hunger" (I’m hungry).',
          [
            { it: 'io ho', en: 'I have' },
            { it: 'tu hai', en: 'you have' },
            { it: 'lui / lei ha', en: 'he / she has' },
          ],
        ),
        mcq('it-en', 'Ho una prenotazione', 'I have a reservation', ['I need a reservation', 'I have a reservation', 'I cancelled my reservation', 'Do you take reservations?']),
        typeEx('A table for two, please', 'Un tavolo per due, per favore', ['un tavolo per due per favore']),
        build('Do you have a free table?', 'Avete un tavolo libero?', ['occupato', 'prenotato'], {}),
        mcq('en-it', 'Possiamo sederci qui?', 'Can we sit here?', ['Possiamo sederci qui?', 'Possiamo mangiare qui?', 'Dobbiamo aspettare?', 'È libero questo?']),
        listen('Quante persone?', 'How many people?', ['How many people?', 'Which table?', 'What time?', 'Do you have a reservation?']),
        match([
          { it: 'Ho una prenotazione', en: 'I have a reservation' },
          { it: 'Un tavolo per due', en: 'A table for two' },
          { it: 'Tavolo libero', en: 'Free table' },
          { it: 'Quante persone?', en: 'How many people?' },
        ]),
        speak('Un tavolo per due, per favore', 'Say it out loud: A table for two, please'),
      ]),

      lesson('u3l2', 'Ordering & Diets', 'Getting the meal you actually want', 'plate', [
        explain(
          'Adjectives Agree With You',
          'Descriptive adjectives change their ending to match the gender of who or what they describe: -o for masculine, -a for feminine. You’ll see this constantly with words like celiaco/celiaca, vegetariano/vegetariana, and allergico/allergica.',
          [
            { it: 'Sono celiaco (m.)', en: 'I have celiac disease' },
            { it: 'Sono celiaca (f.)', en: 'I have celiac disease' },
          ],
        ),
        mcq('it-en', 'Vorrei ordinare', 'I’d like to order', ['I already ordered', 'I’d like to order', 'I want to cancel', 'Is it ready?']),
        typeEx('I have celiac disease (need gluten-free)', 'Sono celiaco/a', ['sono celiaco', 'sono celiaca'], {
          note: 'Italy takes "senza glutine" (gluten-free) seriously — most menus mark it clearly once you say this.',
          objectiveIds: ['order-meal-dietary'],
        }),
        build('I don’t eat meat', 'Non mangio carne', ['pesce', 'verdura'], { objectiveIds: ['order-meal-dietary'] }),
        mcq('en-it', 'È piccante?', 'Is it spicy?', ['È piccante?', 'È dolce?', 'È freddo?', 'È pronto?']),
        typeEx('What do you recommend to me?', 'Cosa mi consiglia?', ['cosa mi consiglia'], { objectiveIds: ['order-meal-dietary'] }),
        listen('Senza glutine, per favore', 'Gluten-free, please', ['Gluten-free, please', 'With extra bread', 'No thank you', 'Is it fresh?']),
        match([
          { it: 'Vorrei ordinare', en: 'I’d like to order' },
          { it: 'Sono celiaco/a', en: 'I have celiac disease' },
          { it: 'Senza glutine', en: 'Gluten-free' },
          { it: 'Non mangio carne', en: 'I don’t eat meat' },
        ]),
      ]),

      lesson('u3l3', 'Asking at the Table', 'Bread, forks, and the check — without flagging down anyone', 'bread', [
        mcq('it-en', 'Un altro po’ di pane, per favore', 'A little more bread, please', ['No more bread, thanks', 'A little more bread, please', 'Is the bread free?', 'I don’t want bread']),
        typeEx('Could you bring me another fork, please?', 'Mi porta un’altra forchetta, per favore?', ['mi porta unaltra forchetta per favore', 'mi porta un\'altra forchetta per favore']),
        build('Is service included?', 'È incluso il servizio?', ['escluso', 'gratuito'], {}),
        mcq('en-it', 'Il conto, per favore', 'The check, please', ['Il conto, per favore', 'Il tavolo, per favore', 'Il menù, per favore', 'La cucina, per favore']),
        listen('Tutto bene?', 'Is everything okay?', ['Is everything okay?', 'Are you finished?', 'Do you want dessert?', 'Is it too spicy?']),
        match([
          { it: 'Un altro po’ di pane', en: 'A little more bread' },
          { it: 'Una forchetta', en: 'A fork' },
          { it: 'È incluso il servizio?', en: 'Is service included?' },
          { it: 'Il conto', en: 'The check' },
        ]),
      ]),

      lesson('u3l3x', 'Dessert & Wine', 'Closing out a meal like you’ve done it before', 'plate', [
        explain(
          'Molto vs. Troppo',
          'Both molto and troppo intensify an adjective, but they land very differently: molto ("very") is a compliment, troppo ("too much") is a complaint. Mixing them up can turn a compliment into an insult by accident.',
          [
            { it: 'È molto buono!', en: 'It’s very good!' },
            { it: 'È troppo salato.', en: 'It’s too salty.' },
          ],
        ),
        mcq('it-en', 'Il dolce', 'Dessert', ['The main course', 'Dessert', 'The appetizer', 'The bread']),
        typeEx('Do you have a wine list?', 'Avete una lista dei vini?', ['avete una lista dei vini']),
        dictation('Vorrei un dolce, per favore', 'I’d like a dessert, please', ['vorrei un dolce per favore']),
        build('It was delicious', 'Era delizioso', ['buono', 'squisito']),
        reorder('Posso avere il conto?', 'Can I have the bill?'),
        respond(
          'Vuole un dolce?', 'Would you like a dessert? (formal)',
          ['Sì, grazie', 'No, grazie', 'Cosa consiglia?'],
          'Yes, thanks / No, thanks / What do you recommend?',
        ),
        match([
          { it: 'Il dolce', en: 'Dessert' },
          { it: 'La lista dei vini', en: 'The wine list' },
          { it: 'Era delizioso', en: 'It was delicious' },
          { it: 'Molto / troppo', en: 'Very / too much' },
        ]),
      ]),

      scenario(
        'u3l4',
        'Dinner, Start to Finish',
        'Scenario: a full restaurant meal',
        'fork',
        'You’re seated at a trattoria in Bologna with a reservation under your name. The server arrives with menus.',
        [
          {
            speaker: 'Server', it: 'Buonasera! Ha una prenotazione?', en: 'Good evening! Do you have a reservation?',
            choices: [
              { it: 'Sì, per due persone.', en: 'Yes, for two people.', correct: true, feedback: 'Short, confirms the key detail, keeps things moving.' },
              { it: 'Vorrei un cappuccino.', en: 'I’d like a cappuccino.', correct: false, feedback: 'Wrong meal, wrong moment — you haven’t even sat down yet.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'Asking for the check before you’ve ordered would be a very confusing start to dinner.' },
            ],
          },
          {
            speaker: 'Server', it: 'Perfetto, prego. Siete pronti per ordinare?', en: 'Perfect, this way. Are you ready to order?',
            choices: [
              { it: 'Sono celiaco — avete piatti senza glutine?', en: 'I have celiac disease — do you have gluten-free dishes?', correct: true, feedback: 'Leading with your dietary need before ordering saves everyone a headache later.' },
              { it: 'Dov’è il bagno?', en: 'Where’s the bathroom?', correct: false, feedback: 'A fair question eventually, but it skips right past what the server just asked.' },
              { it: 'Solo contanti.', en: 'Cash only.', correct: false, feedback: 'That’s a statement about payment — completely unrelated to ordering food.' },
            ],
          },
          {
            speaker: 'Server', it: 'Certo, abbiamo la pasta senza glutine. Cosa desidera?', en: 'Of course, we have gluten-free pasta. What would you like?',
            choices: [
              { it: 'Vorrei la pasta, per favore.', en: 'I’d like the pasta, please.', correct: true, feedback: 'Simple, direct, and it lands the order.' },
              { it: 'Non mangio niente.', en: 'I don’t eat anything.', correct: false, feedback: 'That would be a strange thing to say at a restaurant you chose to sit down in.' },
              { it: 'Che cosa consiglia?', en: 'What do you recommend?', correct: false, feedback: 'A reasonable question in general, but the server just asked what YOU want — not for more options.' },
            ],
          },
          {
            speaker: 'Server', it: 'Subito. Qualcos’altro? Del pane, magari?', en: 'Right away. Anything else? Some bread, maybe?',
            choices: [
              { it: 'Sì, un altro po’ di pane, grazie.', en: 'Yes, a little more bread, thanks.', correct: true, feedback: 'Exactly the phrase for this exact moment — no hesitation needed.' },
              { it: 'Ho perso il passaporto.', en: 'I lost my passport.', correct: false, feedback: 'A real emergency phrase — just not one that belongs in a bread conversation.' },
              { it: 'Sono le noci?', en: 'Are they the walnuts?', correct: false, feedback: 'Garbled word order — and not an answer to "would you like bread?" anyway.' },
            ],
          },
          {
            speaker: 'Server', it: 'Ecco. Qualcos’altro o il conto?', en: 'Here you go. Anything else, or the check?',
            choices: [
              { it: 'Il conto, per favore. È incluso il servizio?', en: 'The check, please. Is service included?', correct: true, feedback: 'Closing a meal like a regular — asking about service before you tip is a genuinely useful habit.' },
              { it: 'Un tavolo per due, per favore.', en: 'A table for two, please.', correct: false, feedback: 'You’re already seated and finishing your meal — this is what you’d say walking in, not walking out.' },
              { it: 'Non parlo italiano.', en: 'I don’t speak Italian.', correct: false, feedback: 'A bit late for that — you’ve just ordered an entire meal in Italian!' },
            ],
          },
        ],
        ['order-meal-dietary', 'pay-bill'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'c1',
    title: 'Checkpoint',
    subtitle: 'Review: Units 1–3',
    icon: 'trophy',
    color: '#D9A441',
    checkpointUnit: true,
    learn: ['A cumulative review of everything from greetings through paying the bill — no new material.'],
    lessons: [
      checkpointLesson('c1l1', 'Halfway Check-In', 'Everything from greetings to the restaurant', 'trophy', [
        mcq('it-en', 'Buonasera', 'Good evening', ['Good morning', 'Good evening', 'Goodbye', 'Hello']),
        typeEx('I don’t understand', 'Non capisco', ['non capisco']),
        mcq('en-it', 'Vorrei un caffè, per favore', 'I would like a coffee, please', ['Vorrei un caffè, per favore', 'Ho un caffè', 'Un caffè, grazie mille', 'Il caffè è buono']),
        build('A still water, please', 'Un’acqua naturale, per favore', ['frizzante', 'un bicchiere']),
        mcq('it-en', 'Sono vegetariano/a', 'I’m vegetarian', ['I like vegetables', 'I’m vegetarian', 'I don’t eat vegetables', 'Are you vegetarian?']),
        typeEx('The check, please', 'Il conto, per favore', ['il conto per favore']),
        listen('Ho una prenotazione', 'I have a reservation', ['I have a reservation', 'I need a reservation', 'I cancelled my reservation', 'Do you have a table?']),
        match([
          { it: 'Piacere', en: 'Nice to meet you' },
          { it: 'Vorrei...', en: 'I would like...' },
          { it: 'Sono allergico/a a...', en: 'I’m allergic to...' },
          { it: 'Un tavolo per due', en: 'A table for two' },
        ]),
      ]),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u4',
    title: 'Getting Around',
    subtitle: 'In Giro',
    icon: 'compass',
    color: '#3B6FA0',
    learn: [
      'Ask for and follow directions',
      'Buy a train or bus ticket',
      'Form questions with dove, quando, quanto',
      'Understand basic spoken directions',
    ],
    test: unitTest('u4', [
      mcq('it-en', 'Dov’è il bagno?', 'Where’s the bathroom?', ['Where’s the exit?', 'Where’s the bathroom?', 'Is there a bathroom?', 'The bathroom is closed']),
      typeEx('Straight ahead', 'Sempre dritto', ['sempre dritto']),
      mcq('en-it', 'Un biglietto per Firenze', 'A ticket to Florence', ['Un biglietto per Firenze', 'Un biglietto da Firenze', 'Il treno per Firenze', 'Una mappa di Firenze']),
      build('What time does the train leave?', 'A che ora parte il treno?', ['arriva', 'parte il bus']),
      typeEx('Round trip', 'Andata e ritorno', ['andata e ritorno']),
      listen('È a due minuti a piedi', 'It’s a two-minute walk', ['It’s a two-minute walk', 'It’s two hours away', 'It’s closed today', 'It’s very far']),
    ]),
    lessons: [
      lesson('u4l1', 'Where Is It?', 'The question you’ll ask more than any other', 'pin', [
        explain(
          'Asking Questions: Dove, Quando, Quanto',
          'Italian question words sit at the start of the sentence, same as English. The three you’ll lean on constantly while traveling: dove (where), quando (when), and quanto (how much / how far).',
          [
            { it: 'Dov’è...?', en: 'Where is...?' },
            { it: 'Quanto costa?', en: 'How much does it cost?' },
          ],
        ),
        mcq('it-en', 'Dov’è il bagno?', 'Where’s the bathroom?', ['Where’s the exit?', 'Where’s the bathroom?', 'Is there a bathroom?', 'The bathroom is closed']),
        typeEx('Where’s the station?', 'Dov’è la stazione?', ['dove e la stazione', 'dov\'è la stazione']),
        build('Excuse me, where is...? (formal)', 'Scusi, dov’è...?', ['dove sono', 'per favore'], {}),
        mcq('en-it', 'A destra', 'To the right', ['A destra', 'A sinistra', 'Dritto', 'Vicino']),
        mcq('en-it', 'Sempre dritto', 'Straight ahead', ['A destra', 'A sinistra', 'Sempre dritto', 'Dietro']),
        listen('Dietro l’angolo', 'Around the corner', ['Around the corner', 'Straight ahead', 'Very far', 'Next door']),
        match([
          { it: 'Dov’è...?', en: 'Where is...?' },
          { it: 'A destra / a sinistra', en: 'To the right / left' },
          { it: 'Sempre dritto', en: 'Straight ahead' },
          { it: 'Vicino / lontano', en: 'Near / far' },
        ]),
        speak('Dov’è il bagno?', 'Say it out loud: Where’s the bathroom?'),
      ]),

      lesson('u4l2', 'Tickets & Transport', 'Trains, buses, and not missing either', 'train', [
        mcq('it-en', 'Un biglietto per Firenze', 'A ticket to Florence', ['A ticket from Florence', 'A ticket to Florence', 'The Florence train', 'A map of Florence']),
        typeEx('Round trip', 'Andata e ritorno', ['andata e ritorno']),
        build('What time does the train leave?', 'A che ora parte il treno?', ['arriva', 'parte il bus'], { objectiveIds: ['buy-ticket'] }),
        mcq('en-it', 'Da che binario?', 'From which platform?', ['Da che binario?', 'Da che biglietto?', 'Quanto costa?', 'A che ora?']),
        typeEx('How much does the ticket cost?', 'Quanto costa il biglietto?', ['quanto costa il biglietto'], { objectiveIds: ['buy-ticket'] }),
        listen('Solo andata, per favore', 'One way, please', ['One way, please', 'Round trip, please', 'Two tickets, please', 'Is it direct?']),
        match([
          { it: 'Un biglietto per...', en: 'A ticket to...' },
          { it: 'Andata e ritorno', en: 'Round trip' },
          { it: 'Il binario', en: 'The platform' },
          { it: 'A che ora parte?', en: 'What time does it leave?' },
        ]),
      ]),

      lesson('u4l3', 'Understanding the Answer', 'Because asking is only half the job', 'ear', [
        mcq('it-en', 'Quanto è lontano?', 'How far is it?', ['How much is it?', 'How far is it?', 'When does it open?', 'Is it closed?']),
        typeEx('It’s a two-minute walk', 'È a due minuti a piedi', ['e a due minuti a piedi', 'è a due minuti a piedi']),
        build('You have to cross the square (formal)', 'Deve attraversare la piazza', ['dietro', 'vicino'], {}),
        mcq('en-it', 'Non lo so, mi dispiace', 'I don’t know, sorry', ['Non lo so, mi dispiace', 'Non capisco niente', 'Non parlo italiano', 'Non è lontano']),
        listen('È proprio qui davanti', 'It’s right here in front', ['It’s right here in front', 'It’s far from here', 'It’s closed today', 'It’s behind the church']),
        match([
          { it: 'Quanto è lontano?', en: 'How far is it?' },
          { it: 'A piedi', en: 'On foot / walking' },
          { it: 'Attraversare', en: 'To cross' },
          { it: 'Non lo so', en: 'I don’t know' },
        ]),
      ]),

      lesson('u4l3x', 'At the Airport', 'Flights, gates, and things that have to happen on time', 'compass', [
        explain(
          'The Verb Dovere (Must / To Have To)',
          'Dovere ("must") is the third of Italian’s essential modal verbs alongside potere (can) and volere (want). Like potere, it pairs with a second verb in its plain, unconjugated form.',
          [
            { it: 'Devo andare.', en: 'I have to go.' },
            { it: 'Deve aspettare qui.', en: 'You have to wait here. (formal)' },
          ],
        ),
        mcq('it-en', 'Il volo', 'The flight', ['The gate', 'The flight', 'The ticket', 'The luggage']),
        typeEx('Where is the gate?', 'Dov’è il gate?', ['dove e il gate', 'dov\'è il gate']),
        dictation('Il mio volo è in ritardo', 'My flight is delayed', ['il mio volo e in ritardo', 'il mio volo è in ritardo']),
        build('I must check in', 'Devo fare il check-in', ['il volo', 'il bagaglio']),
        reorder('Dove sono i bagagli?', 'Where is the luggage?'),
        respond(
          'Ha un documento d’identità?', 'Do you have an ID? (formal)',
          ['Sì, ecco il passaporto', 'Sì, un momento'],
          'Yes, here’s my passport / Yes, one moment',
        ),
        match([
          { it: 'Il volo', en: 'The flight' },
          { it: 'Il gate', en: 'The gate' },
          { it: 'I bagagli', en: 'The luggage' },
          { it: 'In ritardo', en: 'Delayed / late' },
        ]),
      ]),

      scenario(
        'u4l4',
        'Lost Near the Station',
        'Scenario: finding your way to the platform',
        'compass',
        'Your train leaves in fifteen minutes and you can’t find the entrance to the station. You spot someone walking a dog.',
        [
          {
            speaker: 'Local', it: 'Buongiorno, posso aiutarla?', en: 'Good morning, can I help you?',
            choices: [
              { it: 'Sì, scusi — dov’è la stazione?', en: 'Yes, excuse me — where’s the station?', correct: true, feedback: 'Direct and polite — gets straight to what you need with no wasted time.' },
              { it: 'Sono allergico alle noci.', en: 'I’m allergic to nuts.', correct: false, feedback: 'True, possibly, but bafflingly irrelevant to finding a train station.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'You’re on a street corner, not at a restaurant table.' },
            ],
          },
          {
            speaker: 'Local', it: 'Certo. Vada sempre dritto, poi a destra.', en: 'Sure. Go straight ahead, then right.',
            choices: [
              { it: 'Sempre dritto, poi a destra. Grazie mille!', en: 'Straight ahead, then right. Thanks a lot!', correct: true, feedback: 'Repeating the directions back is one of the best habits you can build — it confirms you actually got it.' },
              { it: 'Non lo so.', en: 'I don’t know.', correct: false, feedback: 'They just told you — this makes it sound like you didn’t hear a word.' },
              { it: 'A che ora parte il treno?', en: 'What time does the train leave?', correct: false, feedback: 'A fine question in general, but this local can’t see your ticket — it won’t help you find the entrance.' },
            ],
          },
          {
            speaker: 'Local', it: 'Quanto è lontano? È a due minuti a piedi.', en: 'How far is it? It’s a two-minute walk.',
            choices: [
              { it: 'Perfetto, grazie ancora!', en: 'Perfect, thanks again!', correct: true, feedback: 'A warm, natural close — you’ve got what you need and the train is now very catchable.' },
              { it: 'È troppo caro.', en: 'It’s too expensive.', correct: false, feedback: 'Nobody mentioned money — this reply comes out of nowhere.' },
              { it: 'Dov’è la farmacia?', en: 'Where’s the pharmacy?', correct: false, feedback: 'A completely different errand — and you’re on the clock for a train.' },
            ],
          },
        ],
        ['ask-directions'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u5',
    title: 'Help & Emergencies',
    subtitle: 'Aiuto ed Emergenze',
    icon: 'cross',
    color: '#A33B4E',
    learn: [
      'Ask for help in an emergency',
      'Describe a symptom at a pharmacy',
      'Use potere to ask what you’re able to do',
      'Report a lost item',
    ],
    test: unitTest('u5', [
      mcq('it-en', 'Ho bisogno di aiuto', 'I need help', ['I need help', 'I’m scared', 'Help, please', 'I don’t need it']),
      typeEx('My head hurts', 'Mi fa male la testa', ['mi fa male la testa']),
      mcq('en-it', 'Ho la febbre', 'I have a fever', ['Ho la febbre', 'Ho fame', 'Ho freddo', 'Ho sete']),
      build('I lost my passport', 'Ho perso il passaporto', ['portafoglio', 'trovato']),
      typeEx('Call a doctor, please (formal)', 'Chiami un medico, per favore', ['chiami un medico per favore']),
      listen('Dov’è il commissariato?', 'Where’s the police station?', ['Where’s the police station?', 'Where’s the pharmacy?', 'Where’s the hospital?', 'Where’s the hotel?']),
    ]),
    lessons: [
      lesson('u5l1', 'Asking for Help', 'The phrases for when something is actually wrong', 'alert', [
        explain(
          'The Verb Potere (Can / To Be Able To)',
          'Potere ("can") is a modal verb — it pairs with a second verb in its plain, unconjugated form, exactly like English "can help." Posso...? ("Can I...?") is one of the most useful phrases you’ll say in Italian, full stop.',
          [
            { it: 'Posso avere...?', en: 'Can I have...?' },
            { it: 'Può ripetere?', en: 'Can you repeat? (formal)' },
          ],
        ),
        mcq('it-en', 'Mi può aiutare?', 'Can you help me?', ['Can I help you?', 'Can you help me?', 'I helped you', 'Who can help?']),
        typeEx('I need help', 'Ho bisogno di aiuto', ['ho bisogno di aiuto'], { objectiveIds: ['get-help'] }),
        build('There’s a problem', 'C’è un problema', ['nessun', 'niente'], { objectiveIds: ['get-help'] }),
        mcq('en-it', 'Chiami un medico, per favore', 'Call a doctor, please (formal)', ['Chiami un medico, per favore', 'Chiama un taxi, per favore', 'Chiami la farmacia', 'Vada dal medico']),
        listen('Chiami la polizia', 'Call the police', ['Call the police', 'Call a doctor', 'Call me later', 'Call the hotel']),
        match([
          { it: 'Mi può aiutare?', en: 'Can you help me?' },
          { it: 'Ho bisogno di aiuto', en: 'I need help' },
          { it: 'C’è un problema', en: 'There’s a problem' },
          { it: 'Chiami la polizia', en: 'Call the police' },
        ]),
        speak('Ho bisogno di aiuto', 'Say it out loud: I need help', { objectiveIds: ['get-help'] }),
      ]),

      lesson('u5l2', 'At the Pharmacy', 'Describing what hurts, precisely enough to get the right box', 'pill', [
        mcq('it-en', 'Dov’è la farmacia più vicina?', 'Where’s the nearest pharmacy?', ['Where’s the pharmacy closing?', 'Where’s the nearest pharmacy?', 'Is the pharmacy open?', 'I need a pharmacy tomorrow']),
        typeEx('My head hurts', 'Mi fa male la testa', ['mi fa male la testa'], { objectiveIds: ['pharmacy'] }),
        build('I have a stomachache', 'Ho mal di stomaco', ['la testa', 'la gola'], { objectiveIds: ['pharmacy'] }),
        mcq('en-it', 'Ho la febbre', 'I have a fever', ['Ho la febbre', 'Ho fame', 'Ho freddo', 'Ho sete']),
        listen('Avete qualcosa per il mal di testa?', 'Do you have something for a headache?', ['Do you have something for a headache?', 'Is there a doctor here?', 'Where’s the exit?', 'Is this medicine safe?']),
        match([
          { it: 'La farmacia', en: 'The pharmacy' },
          { it: 'Mi fa male la testa', en: 'My head hurts' },
          { it: 'Ho la febbre', en: 'I have a fever' },
          { it: 'Ho mal di stomaco', en: 'I have a stomachache' },
        ]),
      ]),

      lesson('u5l3', 'Lost Items & Logistics', 'Passports, wallets, wifi, and other small disasters', 'wifi', [
        mcq('it-en', 'Ho perso il passaporto', 'I lost my passport', ['I found my passport', 'I lost my passport', 'I need a passport', 'My passport is here']),
        typeEx('I lost my wallet', 'Ho perso il portafoglio', ['ho perso il portafoglio']),
        build('What’s the wifi password?', 'Qual è la password del wifi?', ['nome utente', 'account'], {}),
        mcq('en-it', 'Il mio telefono non funziona', 'My phone isn’t working', ['Il mio telefono non funziona', 'Il mio telefono è nuovo', 'Non ho un telefono', 'Il telefono è caro']),
        listen('Dov’è il commissariato?', 'Where’s the police station?', ['Where’s the police station?', 'Where’s the pharmacy?', 'Where’s the hospital?', 'Where’s the hotel?']),
        match([
          { it: 'Ho perso...', en: 'I lost...' },
          { it: 'Il portafoglio', en: 'The wallet' },
          { it: 'La password del wifi', en: 'The wifi password' },
          { it: 'Il commissariato', en: 'The police station' },
        ]),
      ]),

      lesson('u5l3x', 'At the Doctor', 'Describing what’s wrong and for how long', 'cross', [
        explain(
          'Da Quanto Tempo? (For How Long?)',
          'To say how long something has been going on, Italian uses da ("since/for") with the present tense — where English switches to "have been" — plus a simple time phrase for the answer.',
          [
            { it: 'Da quanto tempo ha la febbre?', en: 'How long have you had the fever?' },
            { it: 'Da due giorni.', en: 'For two days.' },
          ],
        ),
        mcq('it-en', 'Il dottore', 'The doctor', ['The nurse', 'The doctor', 'The pharmacist', 'The hospital']),
        typeEx('I feel dizzy', 'Mi gira la testa', ['mi gira la testa']),
        dictation('Ho bisogno di un dottore', 'I need a doctor', ['ho bisogno di un dottore']),
        build('It hurts here', 'Mi fa male qui', ['la testa', 'lo stomaco']),
        reorder('Sono allergico alla penicillina', 'I’m allergic to penicillin'),
        respond(
          'Da quanto tempo ha questo dolore?', 'How long have you had this pain?',
          ['Da due giorni', 'Da stamattina', 'Da una settimana'],
          'For two days / Since this morning / For a week',
        ),
        match([
          { it: 'Il dottore', en: 'The doctor' },
          { it: 'Mi gira la testa', en: 'I feel dizzy' },
          { it: 'Allergico/a a...', en: 'Allergic to...' },
          { it: 'Da quanto tempo?', en: 'For how long?' },
        ]),
      ]),

      scenario(
        'u5l4',
        'Feeling Sick',
        'Scenario: a pharmacy visit',
        'cross',
        'You woke up with a pounding headache and a fever. You find a farmacia with the green cross lit up.',
        [
          {
            speaker: 'Farmacista', it: 'Buongiorno, come posso aiutarla?', en: 'Good morning, how can I help you?',
            choices: [
              { it: 'Mi fa male la testa e ho la febbre.', en: 'My head hurts and I have a fever.', correct: true, feedback: 'Clear symptoms, stated plainly — exactly what a pharmacist needs to help you fast.' },
              { it: 'Un tavolo per due, per favore.', en: 'A table for two, please.', correct: false, feedback: 'You’re not at a restaurant — wrong scene entirely.' },
              { it: 'Sono degli Stati Uniti.', en: 'I’m from the United States.', correct: false, feedback: 'True, but not remotely what the pharmacist asked.' },
            ],
          },
          {
            speaker: 'Farmacista', it: 'Mi dispiace. Da quanto tempo ha la febbre?', en: 'I’m sorry. How long have you had the fever?',
            choices: [
              { it: 'Da questa mattina.', en: 'Since this morning.', correct: true, feedback: 'A short, useful answer that helps them recommend the right thing.' },
              { it: 'Avete uno sconto?', en: 'Do you have a discount?', correct: false, feedback: 'You’re describing a fever, not haggling over a jacket — wrong context.' },
              { it: 'Non lo so, non ho la febbre.', en: 'I don’t know, I don’t have a fever.', correct: false, feedback: 'Contradicts what you just told them — confusing for everyone involved.' },
            ],
          },
          {
            speaker: 'Farmacista', it: 'Capisco. Avete qualcosa per il mal di testa e la febbre.', en: 'I understand. You have something for headache and fever.',
            choices: [
              { it: 'Perfetto, quanto costa?', en: 'Perfect, how much does it cost?', correct: true, feedback: 'Confirms you want it and moves straight to closing the transaction — efficient when you feel awful.' },
              { it: 'Che cosa consiglia per la cena?', en: 'What do you recommend for dinner?', correct: false, feedback: 'A pharmacist can’t help with your dinner plans — stay on topic.' },
              { it: 'Ho perso il passaporto.', en: 'I lost my passport.', correct: false, feedback: 'A real problem, but an unrelated one — finish the pharmacy visit first.' },
            ],
          },
        ],
        ['pharmacy'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u6',
    title: 'Friends & the Market',
    subtitle: 'Amici e Mercato',
    icon: 'basket',
    color: '#7A5C9E',
    learn: [
      'Negotiate a price politely',
      'Make small talk about where you’re from',
      'Count from 1–20 and beyond',
      'Try on and buy something at a market',
    ],
    test: unitTest('u6', [
      mcq('it-en', 'Quanto costa questo?', 'How much does this cost?', ['Is this for sale?', 'How much does this cost?', 'Where did you buy this?', 'Is this fresh?']),
      typeEx('It’s too expensive', 'È troppo caro', ['e troppo caro', 'è troppo caro']),
      mcq('en-it', 'Di dove sei?', 'Where are you from?', ['Di dove sei?', 'Dove vai?', 'Quanto tempo rimani?', 'Dove abiti?']),
      build('I’ll take it', 'Lo prendo', ['lascio', 'provo']),
      typeEx('Can I try it on?', 'Posso provarlo?', ['posso provarlo']),
      listen('Solo sto guardando, grazie', 'I’m just looking, thanks', ['I’m just looking, thanks', 'I’ll take it, thanks', 'It doesn’t fit, thanks', 'I already paid, thanks']),
    ]),
    lessons: [
      lesson('u6l1', 'Numbers & Prices', 'So you know exactly what you’re paying', 'euro', [
        explain(
          'Numbers 1–20',
          'You’ll need numbers constantly for prices, times, and quantities. Here are the first ten — the rest mostly follow the same rhythm (undici, dodici, tredici...).',
          [
            { it: 'uno, due, tre', en: 'one, two, three' },
            { it: 'quattro, cinque, sei', en: 'four, five, six' },
            { it: 'sette, otto, nove, dieci', en: 'seven, eight, nine, ten' },
          ],
        ),
        mcq('it-en', 'Quanto costa questo?', 'How much does this cost?', ['Is this for sale?', 'How much does this cost?', 'Where did you buy this?', 'Is this fresh?']),
        typeEx('It’s too expensive', 'È troppo caro', ['e troppo caro', 'è troppo caro'], { objectiveIds: ['negotiate-price'] }),
        build('Do you have a discount?', 'Avete uno sconto?', ['prezzo pieno', 'gratuito'], { objectiveIds: ['negotiate-price'] }),
        mcq('en-it', 'Dieci euro', 'Ten euros', ['Dieci euro', 'Dieci minuti', 'Due euro', 'Venti euro']),
        listen('Facciamo cinque euro?', 'Shall we say five euros?', ['Shall we say five euros?', 'It costs five euros exactly', 'Do you have five euros?', 'I need five more']),
        match([
          { it: 'Quanto costa?', en: 'How much does it cost?' },
          { it: 'È troppo caro', en: 'It’s too expensive' },
          { it: 'Uno sconto', en: 'A discount' },
          { it: 'Facciamo...?', en: 'Shall we say...? (negotiating)' },
        ]),
        speak('Quanto costa questo?', 'Say it out loud: How much does this cost?'),
      ]),

      lesson('u6l2', 'Small Talk', 'The questions that turn a transaction into a conversation', 'chat', [
        mcq('it-en', 'Di dove sei?', 'Where are you from?', ['Where are you going?', 'Where are you from?', 'How long are you staying?', 'Do you live here?']),
        typeEx('I come from the United States', 'Vengo dagli Stati Uniti', ['vengo dagli stati uniti'], { objectiveIds: ['small-talk'] }),
        build('How long are you staying? (informal)', 'Quanto tempo rimani?', ['sei stato', 'sei venuto'], { objectiveIds: ['small-talk'] }),
        mcq('en-it', 'Mi piace molto l’Italia', 'I like Italy a lot', ['Mi piace molto l’Italia', 'Non mi piace l’Italia', 'Vivo in Italia', 'Vado in Italia']),
        listen('Fa caldo oggi', 'It’s hot today', ['It’s hot today', 'It’s cold today', 'It’s raining today', 'It’s a beautiful day']),
        match([
          { it: 'Di dove sei?', en: 'Where are you from?' },
          { it: 'Vengo da...', en: 'I come from...' },
          { it: 'Quanto tempo rimani?', en: 'How long are you staying?' },
          { it: 'Mi piace molto', en: 'I like it a lot' },
        ]),
      ]),

      lesson('u6l3', 'At the Market', 'Trying things on, sizes, and closing the deal', 'shirt', [
        mcq('it-en', 'Posso provarlo?', 'Can I try it on?', ['Can I buy it?', 'Can I try it on?', 'Is it my size?', 'Can I return it?']),
        typeEx('Do you have a medium size?', 'Avete la taglia media?', ['avete la taglia media'], { objectiveIds: ['negotiate-price'] }),
        build('What color?', 'Di che colore?', ['quanto', 'quale taglia'], {}),
        mcq('en-it', 'Lo prendo', 'I’ll take it', ['Lo prendo', 'Lo lascio', 'Non lo voglio', 'Lo provo']),
        listen('Solo sto guardando, grazie', 'I’m just looking, thanks', ['I’m just looking, thanks', 'I’ll take it, thanks', 'It doesn’t fit, thanks', 'I already paid, thanks']),
        match([
          { it: 'Posso provarlo?', en: 'Can I try it on?' },
          { it: 'La taglia media', en: 'Medium size' },
          { it: 'Lo prendo', en: 'I’ll take it' },
          { it: 'Solo sto guardando', en: 'I’m just looking' },
        ]),
      ]),

      lesson('u6l3x', 'Haggling & Compliments', 'This one, that one, and closing the deal warmly', 'basket', [
        explain(
          'Questo vs. Quello (This vs. That)',
          'Questo ("this") points to something close to you; quello ("that") points to something farther away — both agree in gender and number with the noun, just like other adjectives.',
          [
            { it: 'Questo qui', en: 'This one here' },
            { it: 'Quello là', en: 'That one there' },
          ],
        ),
        mcq('it-en', 'Questo qui', 'This one here', ['That one there', 'This one here', 'Which one?', 'None of them']),
        typeEx('How much for both?', 'Quanto per tutti e due?', ['quanto per tutti e due']),
        dictation('È fatto a mano', 'It’s handmade', ['e fatto a mano', 'è fatto a mano']),
        build('I’ll think about it', 'Ci penso', ['forse', 'magari']),
        reorder('Mi piace molto questo colore', 'I like this color a lot'),
        respond(
          'Le piace questo?', 'Do you like this? (formal)',
          ['Sì, molto', 'Non tanto', 'È carino'],
          'Yes, a lot / Not really / It’s cute',
        ),
        match([
          { it: 'Questo / quello', en: 'This / that' },
          { it: 'Fatto a mano', en: 'Handmade' },
          { it: 'Ci penso', en: 'I’ll think about it' },
          { it: 'Mi piace molto', en: 'I like it a lot' },
        ]),
      ]),

      scenario(
        'u6l4',
        'At the Market Stall',
        'Scenario: browsing, chatting, and buying',
        'basket',
        'It’s Saturday morning at an open-air market in Palermo. A vendor is arranging leather bags on the table.',
        [
          {
            speaker: 'Vendor', it: 'Buongiorno! Le piace questa borsa?', en: 'Good morning! Do you like this bag?',
            choices: [
              { it: 'Sì, molto bella! Quanto costa?', en: 'Yes, very nice! How much does it cost?', correct: true, feedback: 'A compliment plus the price question — exactly how this conversation is supposed to open.' },
              { it: 'Ho perso il portafoglio.', en: 'I lost my wallet.', correct: false, feedback: 'An unfortunate thing to say right as you’re about to shop — and not what was asked.' },
              { it: 'Sono allergico alle noci.', en: 'I’m allergic to nuts.', correct: false, feedback: 'Completely unrelated to a leather bag.' },
            ],
          },
          {
            speaker: 'Vendor', it: 'Trenta euro, fatta a mano.', en: 'Thirty euros, handmade.',
            choices: [
              { it: 'È un po’ caro. Facciamo venticinque?', en: 'It’s a bit pricey. Shall we say twenty-five?', correct: true, feedback: 'Friendly, light haggling — completely normal and expected at an open-air market stall.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'That phrase is for restaurants, not market stalls — the vendor would be baffled.' },
              { it: 'Sto bene, grazie.', en: 'I’m well, thank you.', correct: false, feedback: 'A pleasant thing to say, but it doesn’t respond to the price at all.' },
            ],
          },
          {
            speaker: 'Vendor', it: 'Va bene, ventisette. Di dove sei?', en: 'Okay, twenty-seven. Where are you from?',
            choices: [
              { it: 'Vengo dagli Stati Uniti. Va bene, la prendo!', en: 'I come from the United States. Okay, I’ll take it!', correct: true, feedback: 'You answered the small talk AND closed the deal — this is a real Italian market exchange, start to finish.' },
              { it: 'Non parlo italiano.', en: 'I don’t speak Italian.', correct: false, feedback: 'You’ve been speaking Italian this whole conversation — this would be a very strange thing to claim now.' },
              { it: 'Dov’è la stazione?', en: 'Where’s the station?', correct: false, feedback: 'You’re mid-purchase at a market stall — asking for directions now derails a deal you’re about to close.' },
            ],
          },
        ],
        ['negotiate-price', 'small-talk'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'c2',
    title: 'Checkpoint Two',
    subtitle: 'Review: Units 4–6',
    icon: 'trophy',
    color: '#D9A441',
    checkpointUnit: true,
    learn: ['A cumulative review across the entire course — the closest thing this app has to a final exam.'],
    lessons: [
      checkpointLesson('c2l1', 'Ready for Italy', 'Directions, emergencies, and the market — all together', 'trophy', [
        mcq('it-en', 'Dov’è il bagno?', 'Where’s the bathroom?', ['Where’s the exit?', 'Where’s the bathroom?', 'Is there a bathroom?', 'The bathroom is closed']),
        typeEx('What time does the train leave?', 'A che ora parte il treno?', ['a che ora parte il treno']),
        mcq('en-it', 'Ho bisogno di aiuto', 'I need help', ['Ho bisogno di aiuto', 'Ho paura', 'Aiuto, per favore', 'Non ho bisogno']),
        build('My head hurts', 'Mi fa male la testa', ['la gola', 'lo stomaco']),
        mcq('it-en', 'Ho perso il passaporto', 'I lost my passport', ['I found my passport', 'I lost my passport', 'I need a passport', 'My passport is here']),
        typeEx('How much does it cost?', 'Quanto costa?', ['quanto costa']),
        listen('Di dove sei?', 'Where are you from?', ['Where are you from?', 'Where are you going?', 'How long are you staying?', 'What’s your name?']),
        mcq('en-it', 'Lo prendo', 'I’ll take it', ['Lo prendo', 'Lo lascio', 'Non lo voglio', 'Lo provo']),
        match([
          { it: 'Sempre dritto', en: 'Straight ahead' },
          { it: 'Chiami un medico', en: 'Call a doctor' },
          { it: 'È troppo caro', en: 'It’s too expensive' },
          { it: 'Mi piace molto', en: 'I like it a lot' },
        ]),
      ]),
    ],
  },
  // ────────────────────────────────────────────────────────────
  {
    id: 'u7',
    title: 'Family & Home',
    subtitle: 'Famiglia e Casa',
    icon: 'home',
    color: '#3F8C5B',
    learn: [
      'Talk about your family using possessive adjectives',
      'Say how old someone is',
      'Describe your home and its rooms',
      'Ask about someone else’s family',
    ],
    test: unitTest('u7', [
      mcq('it-en', 'Questa è mia sorella', 'This is my sister', ['This is my mother', 'This is my sister', 'This is my daughter', 'This is my friend']),
      typeEx('I have two brothers', 'Ho due fratelli', ['ho due fratelli']),
      mcq('en-it', 'La mia casa è piccola', 'My house is small', ['La mia casa è piccola', 'La mia casa è grande', 'Il mio letto è piccolo', 'La mia macchina è piccola']),
      build('How old are you?', 'Quanti anni hai?', ['anno', 'sei']),
      listen('C’è un giardino?', 'Is there a garden?', ['Is there a garden?', 'Is there a kitchen?', 'Where is the bathroom?', 'Is the house big?']),
      match([
        { it: 'Mia madre', en: 'My mother' },
        { it: 'Mio fratello', en: 'My brother' },
        { it: 'La cucina', en: 'The kitchen' },
        { it: 'Quanti anni hai?', en: 'How old are you?' },
      ]),
    ]),
    lessons: [
      lesson('u7l1', 'Meet the Family', 'The words for everyone in your life', 'heart', [
        explain(
          'Possessive Adjectives: Mio / Mia',
          'Italian possessives agree with the gender of the thing owned, not the owner — mio for masculine nouns, mia for feminine, regardless of whether you’re a man or a woman.',
          [
            { it: 'mio padre', en: 'my father' },
            { it: 'mia madre', en: 'my mother' },
          ],
        ),
        mcq('it-en', 'Mia madre', 'My mother', ['My father', 'My mother', 'My sister', 'My aunt']),
        typeEx('My father', 'Mio padre', ['mio padre']),
        mcq('en-it', 'Tua sorella', 'Your sister', ['Tua sorella', 'Tuo fratello', 'Tua madre', 'Tuo padre']),
        build('This is my brother', 'Questo è mio fratello', ['sorella', 'padre']),
        listen('Hai fratelli o sorelle?', 'Do you have brothers or sisters?', ['Do you have brothers or sisters?', 'Do you have children?', 'Are you married?', 'Where is your family?']),
        match([
          { it: 'Madre', en: 'Mother' },
          { it: 'Padre', en: 'Father' },
          { it: 'Fratello', en: 'Brother' },
          { it: 'Sorella', en: 'Sister' },
        ]),
        speak('Questa è la mia famiglia', 'Say it out loud: This is my family'),
      ]),

      lesson('u7l2', 'How Old Are You?', 'Ages, and the verb avere at work again', 'user', [
        explain(
          'Avere + Anni (To Be a Certain Age)',
          'Italian doesn’t use “to be” for age the way English does — it uses avere (“to have”) + a number + anni (“years”). Ho trent’anni literally means “I have thirty years.”',
          [
            { it: 'Ho trent’anni', en: 'I am thirty years old' },
            { it: 'Quanti anni hai?', en: 'How old are you?' },
          ],
        ),
        mcq('it-en', 'Quanti anni hai?', 'How old are you?', ['What’s your name?', 'How old are you?', 'Where do you live?', 'Are you married?']),
        typeEx('I am thirty years old', 'Ho trent’anni', ['ho trentanni', 'ho trent anni']),
        mcq('en-it', 'Ho venticinque anni', 'I am twenty-five', ['Ho venticinque anni', 'Ho quindici anni', 'Ho cinquanta anni', 'Ho due figli']),
        build('How old is your brother?', 'Quanti anni ha tuo fratello?', ['sorella', 'madre']),
        dictation('Ho ventotto anni', 'I am twenty-eight years old', ['ho ventotto anni']),
        listen('Mia nonna ha ottant’anni', 'My grandmother is eighty years old', ['My grandmother is eighty years old', 'My grandfather is eighty years old', 'My mother is eighty years old', 'My grandmother is eighteen']),
        match([
          { it: 'Nonno', en: 'Grandfather' },
          { it: 'Nonna', en: 'Grandmother' },
          { it: 'Zio', en: 'Uncle' },
          { it: 'Zia', en: 'Aunt' },
        ]),
      ]),

      lesson('u7l3', 'At Home', 'The rooms and “there is / there are”', 'home', [
        explain(
          'C’è / Ci Sono (There Is / There Are)',
          'C’è introduces one thing, ci sono introduces more than one — the single most useful pair of words for describing any space, from a house to a hotel room.',
          [
            { it: 'C’è una cucina', en: 'There is a kitchen' },
            { it: 'Ci sono tre camere', en: 'There are three bedrooms' },
          ],
        ),
        mcq('it-en', 'La cucina', 'The kitchen', ['The bathroom', 'The kitchen', 'The bedroom', 'The garden']),
        typeEx('The bedroom', 'La camera da letto', ['la camera da letto']),
        mcq('en-it', 'Il bagno', 'The bathroom', ['Il bagno', 'Il salotto', 'La cucina', 'Il giardino'], { objectiveIds: ['talk-about-family'] }),
        build('There are three bedrooms', 'Ci sono tre camere da letto', ['c’è', 'una']),
        listen('C’è un giardino?', 'Is there a garden?', ['Is there a garden?', 'Is there a kitchen?', 'Is the house big?', 'Where do you live?']),
        match([
          { it: 'La cucina', en: 'The kitchen' },
          { it: 'Il salotto', en: 'The living room' },
          { it: 'La camera da letto', en: 'The bedroom' },
          { it: 'Il bagno', en: 'The bathroom' },
        ]),
      ]),

      lesson('u7l3x', 'Extended Family', 'Cousins, marriage, and talking about a big family', 'chat', [
        mcq('it-en', 'Sono sposato', 'I am married', ['I am single', 'I am married', 'I have children', 'I am divorced']),
        typeEx('I am single', 'Sono single', ['sono single'], { objectiveIds: ['talk-about-family'] }),
        build('My cousin lives in Rome', 'Mio cugino vive a Roma', ['abita', 'sorella']),
        reorder('Ho una grande famiglia', 'I have a big family'),
        respond(
          'Hai una famiglia numerosa?', 'Do you have a big family? (informal)',
          ['Sì, ho tre fratelli', 'No, siamo solo in tre', 'Ho una famiglia media'],
          'Yes, I have three siblings / No, there’s just three of us / I have a medium-sized family',
          { objectiveIds: ['talk-about-family'] },
        ),
        match([
          { it: 'Cugino / Cugina', en: 'Cousin' },
          { it: 'Marito', en: 'Husband' },
          { it: 'Moglie', en: 'Wife' },
          { it: 'Figlio / Figlia', en: 'Son / Daughter' },
        ]),
      ]),

      scenario(
        'u7l4',
        'Video Call Home',
        'Scenario: showing an Italian friend around your place',
        'wave',
        'You’re on a video call with an Italian friend who wants the full tour and an introduction to your family.',
        [
          {
            speaker: 'Friend', it: 'Ciao! Fammi vedere la tua casa!', en: 'Hi! Show me your house!',
            choices: [
              { it: 'Certo! Questo è il salotto, e qui c’è la cucina.', en: 'Sure! This is the living room, and here’s the kitchen.', correct: true, feedback: 'A natural, easy way to start a tour — point and name the room.' },
              { it: 'Ho fame.', en: 'I’m hungry.', correct: false, feedback: 'Doesn’t answer the request to see your house at all.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'That’s a restaurant phrase — nobody’s bringing you a bill on a video call.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Bella! Chi vive con te?', en: 'Nice! Who lives with you?',
            choices: [
              { it: 'Vivo con mia sorella e il nostro gatto.', en: 'I live with my sister and our cat.', correct: true, feedback: 'Direct answer to “who” — exactly what was asked.' },
              { it: 'Vivo in Italia.', en: 'I live in Italy.', correct: false, feedback: 'That answers “where,” not “who” — a different question.' },
              { it: 'Non lo so.', en: 'I don’t know.', correct: false, feedback: 'A strange thing to say about your own housemates.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Quanti anni ha tua sorella?', en: 'How old is your sister?',
            choices: [
              { it: 'Ha ventitré anni.', en: 'She’s twenty-three.', correct: true, feedback: 'Uses avere + anni correctly — the exact structure this lesson covered.' },
              { it: 'Si chiama Anna.', en: 'Her name is Anna.', correct: false, feedback: 'That’s her name, not her age.' },
              { it: 'Abita a Milano.', en: 'She lives in Milan.', correct: false, feedback: 'Where she lives isn’t how old she is.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Devo andare. È stato bello vedere la tua famiglia!', en: 'I have to go. It was nice seeing your family!',
            choices: [
              { it: 'Anche per me! A presto!', en: 'Likewise! See you soon!', correct: true, feedback: 'A warm, natural way to close out a video call.' },
              { it: 'Vorrei un caffè.', en: 'I would like a coffee.', correct: false, feedback: 'Out of nowhere — nobody’s ordering anything here.' },
              { it: 'Dov’è la stazione?', en: 'Where’s the station?', correct: false, feedback: 'Random directions question with nothing to do with saying goodbye.' },
            ],
          },
        ],
        ['talk-about-family'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u8',
    title: 'Daily Routine & Time',
    subtitle: 'La Routine Quotidiana',
    icon: 'clock',
    color: '#2E8B95',
    learn: [
      'Tell time in Italian',
      'Talk through your daily routine using reflexive verbs',
      'Use frequency words like always, often, and never',
      'Ask someone about their schedule',
    ],
    test: unitTest('u8', [
      mcq('it-en', 'Mi alzo alle sette', 'I get up at seven', ['I go to bed at seven', 'I get up at seven', 'I wake up early', 'I work until seven']),
      typeEx('I go to bed at eleven', 'Vado a letto alle undici', ['vado a letto alle undici']),
      mcq('en-it', 'Sempre', 'Always', ['Sempre', 'Mai', 'A volte', 'Spesso']),
      build('What time is it?', 'Che ore sono?', ['ora', 'quando']),
      listen('A che ora ti svegli?', 'What time do you wake up?', ['What time do you wake up?', 'What time do you go to bed?', 'What do you do in the morning?', 'Do you wake up early?']),
      match([
        { it: 'La mattina', en: 'The morning' },
        { it: 'Il pomeriggio', en: 'The afternoon' },
        { it: 'La sera', en: 'The evening' },
        { it: 'Mi alzo', en: 'I get up' },
      ]),
    ]),
    lessons: [
      lesson('u8l1', 'What Time Is It?', 'Sono le… and the one exception to remember', 'clock', [
        explain(
          'Telling Time: Sono le… / È l’una',
          'For most hours, use Sono le + the number: sono le tre (it’s three o’clock). One o’clock is the odd one out — it’s singular, so it takes è l’una instead.',
          [
            { it: 'Sono le tre', en: 'It’s three o’clock' },
            { it: 'È l’una', en: 'It’s one o’clock' },
          ],
        ),
        mcq('it-en', 'Che ore sono?', 'What time is it?', ['What day is it?', 'What time is it?', 'When do you arrive?', 'How long does it take?']),
        typeEx('It is three o’clock', 'Sono le tre', ['sono le tre']),
        mcq('en-it', 'È l’una', 'It is one o’clock', ['È l’una', 'Sono le una', 'È le une', 'Sono l’uno']),
        build('It is half past four', 'Sono le quattro e mezza', ['un quarto', 'meno']),
        listen('Sono le otto e un quarto', 'It’s a quarter past eight', ['It’s a quarter past eight', 'It’s eight o’clock', 'It’s half past eight', 'It’s a quarter to eight']),
        match([
          { it: 'La mattina', en: 'Morning' },
          { it: 'Il pomeriggio', en: 'Afternoon' },
          { it: 'La sera', en: 'Evening' },
          { it: 'La notte', en: 'Night' },
        ]),
        shadow('Sono le tre e mezza', 'It’s half past three'),
      ]),

      lesson('u8l2', 'My Morning', 'Reflexive verbs: things you do to yourself', 'sun', [
        explain(
          'Reflexive Verbs: Mi Alzo, Mi Vesto',
          'A reflexive verb describes an action you do to yourself, so it needs a small pronoun (mi/ti/si) right before it — mi alzo literally means “I get myself up.”',
          [
            { it: 'mi alzo', en: 'I get up' },
            { it: 'si sveglia', en: 'he/she wakes up' },
          ],
        ),
        mcq('it-en', 'Mi alzo alle sette', 'I get up at seven', ['I go to bed at seven', 'I get up at seven', 'I wake her up at seven', 'I work at seven']),
        typeEx('I get dressed quickly', 'Mi vesto velocemente', ['mi vesto velocemente']),
        mcq('en-it', 'Mi lavo', 'I wash up', ['Mi lavo', 'Mi alzo', 'Mi vesto', 'Mi sveglio'], { objectiveIds: ['daily-routine'] }),
        build('She wakes up early', 'Si sveglia presto', ['tardi', 'alzo']),
        dictation('Mi alzo presto la mattina', 'I get up early in the morning', ['mi alzo presto la mattina']),
        listen('A che ora ti svegli?', 'What time do you wake up?', ['What time do you wake up?', 'What time do you go to bed?', 'Do you get up early?', 'What time is it?']),
        match([
          { it: 'Svegliarsi', en: 'To wake up' },
          { it: 'Alzarsi', en: 'To get up' },
          { it: 'Vestirsi', en: 'To get dressed' },
          { it: 'Lavarsi', en: 'To wash up' },
        ]),
      ]),

      lesson('u8l2x', 'Always, Often, Never', 'Frequency words that make any routine specific', 'refresh', [
        mcq('it-en', 'Vado sempre in palestra', 'I always go to the gym', ['I never go to the gym', 'I always go to the gym', 'I sometimes go to the gym', 'I used to go to the gym']),
        typeEx('I never eat breakfast', 'Non faccio mai colazione', ['non faccio mai colazione'], { objectiveIds: ['daily-routine'] }),
        build('I often work late', 'Lavoro spesso fino a tardi', ['sempre', 'presto']),
        reorder('Faccio colazione ogni giorno', 'I have breakfast every day'),
        respond(
          'Cosa fai di solito la sera?', 'What do you usually do in the evening? (informal)',
          ['Guardo la TV', 'Leggo un libro', 'Esco con gli amici'],
          'I watch TV / I read a book / I go out with friends',
          { objectiveIds: ['daily-routine'] },
        ),
        match([
          { it: 'Sempre', en: 'Always' },
          { it: 'Spesso', en: 'Often' },
          { it: 'A volte', en: 'Sometimes' },
          { it: 'Mai', en: 'Never' },
        ]),
      ]),

      lesson('u8l3', 'The Workday', 'The verbs that carry you from morning to night', 'bulb', [
        mcq('it-en', 'Vado al lavoro alle otto', 'I go to work at eight', ['I leave work at eight', 'I go to work at eight', 'I wake up at eight', 'I have dinner at eight']),
        typeEx('I have lunch at noon', 'Pranzo a mezzogiorno', ['pranzo a mezzogiorno']),
        mcq('en-it', 'Torno a casa alle sei', 'I come home at six', ['Torno a casa alle sei', 'Vado a casa alle sei', 'Esco di casa alle sei', 'Ceno alle sei']),
        build('I finish work at five', 'Finisco di lavorare alle cinque', ['inizio', 'sette']),
        listen('Che cosa fai di mattina?', 'What do you do in the morning?', ['What do you do in the morning?', 'What do you do in the evening?', 'When do you wake up?', 'Where do you work?']),
        match([
          { it: 'Lavorare', en: 'To work' },
          { it: 'Pranzare', en: 'To have lunch' },
          { it: 'Tornare', en: 'To return' },
          { it: 'Cenare', en: 'To have dinner' },
        ]),
      ]),

      scenario(
        'u8l4',
        'A Day in the Life',
        'Scenario: a new coworker asks about your routine',
        'clock',
        'It’s your first week at an office in Italy, and a coworker asks about your daily routine over coffee.',
        [
          {
            speaker: 'Coworker', it: 'A che ora inizi a lavorare di solito?', en: 'What time do you usually start work?',
            choices: [
              { it: 'Di solito inizio alle nove.', en: 'I usually start at nine.', correct: true, feedback: 'Simple, direct, and answers exactly what was asked.' },
              { it: 'Ho fame.', en: 'I’m hungry.', correct: false, feedback: 'Completely unrelated to your start time.' },
              { it: 'Mi chiamo Marco.', en: 'My name is Marco.', correct: false, feedback: 'You’ve presumably already introduced yourself — this doesn’t answer the question.' },
            ],
          },
          {
            speaker: 'Coworker', it: 'Fai colazione prima di venire?', en: 'Do you have breakfast before coming?',
            choices: [
              { it: 'Sì, faccio sempre colazione a casa.', en: 'Yes, I always have breakfast at home.', correct: true, feedback: 'Uses “sempre” to actually answer how often — a natural, complete reply.' },
              { it: 'No, non ho fratelli.', en: 'No, I don’t have siblings.', correct: false, feedback: 'Family, not breakfast — a total non sequitur here.' },
              { it: 'Vado in palestra la sera.', en: 'I go to the gym in the evening.', correct: false, feedback: 'That’s an evening habit, not an answer about breakfast.' },
            ],
          },
          {
            speaker: 'Coworker', it: 'A che ora torni a casa la sera?', en: 'What time do you go home in the evening?',
            choices: [
              { it: 'Di solito torno verso le sei.', en: 'I usually get home around six.', correct: true, feedback: 'Answers the evening question with the evening time — no confusion.' },
              { it: 'Mi alzo alle sette.', en: 'I get up at seven.', correct: false, feedback: 'That’s your morning, and the question was about the evening.' },
              { it: 'Non lo so ancora.', en: 'I don’t know yet.', correct: false, feedback: 'Odd to not know your own routine — pick a time.' },
            ],
          },
          {
            speaker: 'Coworker', it: 'Interessante, grazie per aver condiviso!', en: 'Interesting, thanks for sharing!',
            choices: [
              { it: 'Di niente! E tu, com’è la tua giornata?', en: 'You’re welcome! And you, what’s your day like?', correct: true, feedback: 'Turns the conversation back to them — exactly how small talk keeps going.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'You’re having coffee at the office, not closing out a restaurant bill.' },
              { it: 'Dov’è la stazione?', en: 'Where’s the station?', correct: false, feedback: 'Random directions question that has nothing to do with this chat.' },
            ],
          },
        ],
        ['daily-routine'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u9',
    title: 'Weather & Hobbies',
    subtitle: 'Tempo e Passatempi',
    icon: 'sun',
    color: '#E0912E',
    learn: [
      'Talk about the weather',
      'Name the seasons and say which is your favorite',
      'Say what you like using piacere',
      'Talk about hobbies and sports',
    ],
    test: unitTest('u9', [
      mcq('it-en', 'Fa caldo oggi', 'It’s hot today', ['It’s cold today', 'It’s hot today', 'It’s raining today', 'It’s windy today']),
      typeEx('It’s raining', 'Piove', ['piove']),
      mcq('en-it', 'Mi piace leggere', 'I like to read', ['Mi piace leggere', 'Mi piace cucinare', 'Mi piace ballare', 'Mi piace nuotare']),
      build('What’s the weather like?', 'Che tempo fa?', ['piove', 'freddo']),
      listen('Mi piacciono gli sport', 'I like sports', ['I like sports', 'I like movies', 'I like music', 'I don’t like sports']),
      match([
        { it: 'La primavera', en: 'Spring' },
        { it: 'L’estate', en: 'Summer' },
        { it: 'L’autunno', en: 'Fall' },
        { it: 'L’inverno', en: 'Winter' },
      ]),
    ]),
    lessons: [
      lesson('u9l1', 'What’s the Weather?', 'Fa caldo, piove, nevica — the essentials', 'sun', [
        explain(
          'Weather with Fare, Piovere, Nevicare',
          'Most weather uses fare (“to do/make”): fa caldo, fa freddo — literally “it makes hot/cold.” Rain and snow get their own verbs instead: piove (it’s raining), nevica (it’s snowing).',
          [
            { it: 'Fa caldo', en: 'It’s hot' },
            { it: 'Piove', en: 'It’s raining' },
          ],
        ),
        mcq('it-en', 'Fa caldo', 'It’s hot', ['It’s cold', 'It’s hot', 'It’s windy', 'It’s raining']),
        typeEx('It’s cold', 'Fa freddo', ['fa freddo']),
        mcq('en-it', 'Piove', 'It’s raining', ['Piove', 'Nevica', 'Fa caldo', 'C’è vento']),
        build('What’s the weather like today?', 'Che tempo fa oggi?', ['piove', 'domani']),
        listen('Nevica in montagna', 'It’s snowing in the mountains', ['It’s snowing in the mountains', 'It’s raining in the city', 'It’s sunny at the beach', 'It’s windy today']),
        match([
          { it: 'Il sole', en: 'Sun' },
          { it: 'La pioggia', en: 'Rain' },
          { it: 'La neve', en: 'Snow' },
          { it: 'Il vento', en: 'Wind' },
        ]),
        shadow('Che tempo fa oggi?', 'What’s the weather like today?'),
      ]),

      lesson('u9l2', 'The Seasons', 'In primavera, in estate — the same little word every time', 'refresh', [
        explain(
          'The Four Seasons: In + Season',
          'Unlike a lot of Italian prepositions, this one stays simple — every season uses in: in primavera, in estate, in autunno, in inverno. No exceptions to memorize.',
          [
            { it: 'In estate fa caldo', en: 'In summer it’s hot' },
            { it: 'In inverno nevica', en: 'In winter it snows' },
          ],
        ),
        mcq('it-en', 'In estate fa caldo', 'In summer it’s hot', ['In winter it’s hot', 'In summer it’s hot', 'In summer it snows', 'In summer it rains']),
        typeEx('In winter it’s cold', 'In inverno fa freddo', ['in inverno fa freddo']),
        mcq('en-it', 'La primavera', 'Spring', ['La primavera', 'L’estate', 'L’autunno', 'L’inverno'], { objectiveIds: ['weather-hobbies'] }),
        build('I like autumn', 'Mi piace l’autunno', ['piacciono', 'estate']),
        listen('Qual è la tua stagione preferita?', 'What’s your favorite season?', ['What’s your favorite season?', 'What’s the weather like?', 'Do you like winter?', 'When is your birthday?']),
        match([
          { it: 'La primavera', en: 'Spring' },
          { it: 'L’estate', en: 'Summer' },
          { it: 'L’autunno', en: 'Fall' },
          { it: 'L’inverno', en: 'Winter' },
        ]),
      ]),

      lesson('u9l2x', 'Free Time & Piacere', 'The verb that works backwards from English', 'heart', [
        explain(
          'Piacere (To Like)',
          'Piacere works in reverse from English — it literally means “to be pleasing.” Use mi piace for one thing/an activity, mi piacciono for more than one: mi piace leggere (reading is pleasing to me), mi piacciono i film (movies are pleasing to me).',
          [
            { it: 'Mi piace leggere', en: 'I like to read' },
            { it: 'Mi piacciono i film', en: 'I like movies' },
          ],
        ),
        mcq('it-en', 'Mi piace leggere', 'I like to read', ['I like to write', 'I like to read', 'I like to travel', 'I don’t like to read']),
        typeEx('I like movies', 'Mi piacciono i film', ['mi piacciono i film']),
        build('Do you like music? (informal)', 'Ti piace la musica?', ['piacciono', 'film']),
        reorder('Non mi piace il calcio', 'I don’t like soccer'),
        respond(
          'Cosa ti piace fare nel tempo libero?', 'What do you like to do in your free time? (informal)',
          ['Mi piace leggere', 'Mi piace viaggiare', 'Mi piace cucinare'],
          'I like to read / I like to travel / I like to cook',
          { objectiveIds: ['weather-hobbies'] },
        ),
        match([
          { it: 'Leggere', en: 'To read' },
          { it: 'Viaggiare', en: 'To travel' },
          { it: 'Cucinare', en: 'To cook' },
          { it: 'Disegnare', en: 'To draw' },
        ]),
      ]),

      lesson('u9l3', 'Hobbies & Sports', 'Giocare a for games, fare for everything else', 'target', [
        explain(
          'Giocare a vs. Fare',
          'Use giocare a for games and sports you play against someone (giocare a calcio, giocare a tennis). Use fare for individual activities and exercise instead (fare yoga, fare nuoto).',
          [
            { it: 'Gioco a calcio', en: 'I play soccer' },
            { it: 'Faccio yoga', en: 'I do yoga' },
          ],
        ),
        mcq('it-en', 'Gioco a calcio', 'I play soccer', ['I watch soccer', 'I play soccer', 'I play tennis', 'I do yoga']),
        typeEx('I do yoga', 'Faccio yoga', ['faccio yoga'], { objectiveIds: ['weather-hobbies'] }),
        mcq('en-it', 'Gioco a tennis', 'I play tennis', ['Gioco a tennis', 'Faccio tennis', 'Gioco a calcio', 'Faccio yoga']),
        build('She swims every week', 'Lei nuota ogni settimana', ['gioca', 'mese']),
        listen('Mi piacciono gli sport', 'I like sports', ['I like sports', 'I don’t like sports', 'I like movies', 'I play soccer']),
        match([
          { it: 'Il calcio', en: 'Soccer' },
          { it: 'Il nuoto', en: 'Swimming' },
          { it: 'La palestra', en: 'The gym' },
          { it: 'Ballare', en: 'To dance' },
        ]),
      ]),

      scenario(
        'u9l4',
        'Planning a Weekend',
        'Scenario: the forecast decides what you and a friend do',
        'compass',
        'A friend calls to plan the weekend, and the forecast isn’t exactly cooperating with the first idea.',
        [
          {
            speaker: 'Friend', it: 'Che tempo fa questo weekend?', en: 'What’s the weather like this weekend?',
            choices: [
              { it: 'Piove sabato, ma domenica c’è il sole.', en: 'It’s raining Saturday, but Sunday is sunny.', correct: true, feedback: 'A clear, useful forecast — exactly the info needed to plan around.' },
              { it: 'Mi piace il calcio.', en: 'I like soccer.', correct: false, feedback: 'A hobby, not a weather report — doesn’t answer the question.' },
              { it: 'Ho trent’anni.', en: 'I am thirty years old.', correct: false, feedback: 'Your age has nothing to do with Saturday’s forecast.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Allora cosa facciamo sabato, se piove?', en: 'So what do we do Saturday, if it rains?',
            choices: [
              { it: 'Possiamo guardare un film a casa.', en: 'We can watch a movie at home.', correct: true, feedback: 'Sensible plan B for a rainy day — matches the forecast you just gave.' },
              { it: 'Andiamo in spiaggia!', en: 'Let’s go to the beach!', correct: false, feedback: 'You literally just said it’s raining Saturday — contradicts your own forecast.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'That’s a restaurant phrase, not weekend planning.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Buona idea! E domenica, con il sole?', en: 'Good idea! And Sunday, with the sun?',
            choices: [
              { it: 'Possiamo giocare a tennis al parco.', en: 'We can play tennis at the park.', correct: true, feedback: 'An outdoor sport that fits perfectly with sunny weather.' },
              { it: 'Nevica troppo.', en: 'It’s snowing too much.', correct: false, feedback: 'Contradicts the sunny Sunday you were just told about.' },
              { it: 'Non mi piace lo sport.', en: 'I don’t like sports.', correct: false, feedback: 'A fair opinion in general, but it shuts down the planning instead of moving it forward.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Perfetto, ci vediamo sabato!', en: 'Perfect, see you Saturday!',
            choices: [
              { it: 'Ci vediamo! A presto!', en: 'See you! Talk soon!', correct: true, feedback: 'A warm, simple sign-off to end the call.' },
              { it: 'Dov’è la farmacia?', en: 'Where’s the pharmacy?', correct: false, feedback: 'Completely unrelated to wrapping up weekend plans.' },
              { it: 'Ho perso il passaporto.', en: 'I lost my passport.', correct: false, feedback: 'An emergency phrase with nothing to do with this conversation.' },
            ],
          },
        ],
        ['weather-hobbies'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'c3',
    title: 'Checkpoint Three',
    subtitle: 'Review: Units 7–9',
    icon: 'trophy',
    color: '#D9A441',
    checkpointUnit: true,
    learn: ['A cumulative review of family, home, routines, and hobbies.'],
    lessons: [
      checkpointLesson('c3l1', 'Halfway Through Real Life', 'Family, home, time, and hobbies — all together', 'trophy', [
        mcq('it-en', 'Questa è mia sorella', 'This is my sister', ['This is my mother', 'This is my sister', 'This is my daughter', 'This is my aunt']),
        typeEx('I get up at seven', 'Mi alzo alle sette', ['mi alzo alle sette']),
        mcq('en-it', 'È l’una', 'It is one o’clock', ['È l’una', 'Sono le una', 'È le une', 'Sono l’uno']),
        build('I like to read', 'Mi piace leggere', ['piacciono', 'cucinare']),
        mcq('it-en', 'Non faccio mai colazione', 'I never eat breakfast', ['I always eat breakfast', 'I never eat breakfast', 'I sometimes eat breakfast', 'I often eat breakfast']),
        typeEx('It’s raining', 'Piove', ['piove']),
        listen('Qual è la tua stagione preferita?', 'What’s your favorite season?', ['What’s your favorite season?', 'What’s the weather like?', 'Do you like winter?', 'How old are you?']),
        mcq('en-it', 'Gioco a calcio', 'I play soccer', ['Gioco a calcio', 'Faccio calcio', 'Gioco a tennis', 'Faccio yoga']),
        match([
          { it: 'Mio fratello', en: 'My brother' },
          { it: 'La cucina', en: 'The kitchen' },
          { it: 'Sempre', en: 'Always' },
          { it: 'L’estate', en: 'Summer' },
        ]),
      ]),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u10',
    title: 'Talking About the Past',
    subtitle: 'Il Passato',
    icon: 'book',
    color: '#6C63A6',
    learn: [
      'Form the passato prossimo with avere',
      'Form the passato prossimo with essere',
      'Talk about what you did yesterday or last week',
      'Tell a simple story using first, then, and finally',
    ],
    test: unitTest('u10', [
      mcq('it-en', 'Ho mangiato la pizza', 'I ate pizza', ['I am eating pizza', 'I ate pizza', 'I want pizza', 'I made pizza']),
      typeEx('I went to Rome', 'Sono andato a Roma', ['sono andato a roma', 'sono andata a roma']),
      mcq('en-it', 'Ha viaggiato a Firenze', 'She traveled to Florence', ['Ha viaggiato a Firenze', 'È viaggiata a Firenze', 'Viaggia a Firenze', 'Ha viaggiare a Firenze']),
      build('Yesterday I worked a lot', 'Ieri ho lavorato molto', ['oggi', 'poco']),
      listen('Cosa hai fatto ieri?', 'What did you do yesterday?', ['What did you do yesterday?', 'What are you doing today?', 'What will you do tomorrow?', 'Where did you go?']),
      match([
        { it: 'Ieri', en: 'Yesterday' },
        { it: 'La settimana scorsa', en: 'Last week' },
        { it: 'L’anno scorso', en: 'Last year' },
        { it: 'Stamattina', en: 'This morning' },
      ]),
    ]),
    lessons: [
      lesson('u10l1', 'Yesterday', 'The passato prossimo with avere', 'book', [
        explain(
          'Passato Prossimo with Avere',
          'Most verbs form the past with avere (present tense) + a past participle: -are verbs end in -ato, -ere in -uto, -ire in -ito. Ho mangiato (I ate) breaks down as ho (I have) + mangiato (eaten).',
          [
            { it: 'Ho mangiato', en: 'I ate' },
            { it: 'Ha studiato', en: 'She/He studied' },
          ],
        ),
        mcq('it-en', 'Ho mangiato la pizza', 'I ate pizza', ['I am eating pizza', 'I ate pizza', 'I want pizza', 'I cook pizza']),
        typeEx('I worked yesterday', 'Ho lavorato ieri', ['ho lavorato ieri']),
        mcq('en-it', 'Ho guardato un film', 'I watched a movie', ['Ho guardato un film', 'Guardo un film', 'Ho visto la TV', 'Ho ascoltato la radio'], { objectiveIds: ['past-story'] }),
        build('She studied Italian', 'Ha studiato italiano', ['studia', 'inglese']),
        listen('Cosa hai fatto ieri?', 'What did you do yesterday?', ['What did you do yesterday?', 'What are you doing now?', 'What will you do tomorrow?', 'Did you eat?']),
        match([
          { it: 'Ho mangiato', en: 'I ate' },
          { it: 'Ho lavorato', en: 'I worked' },
          { it: 'Ho studiato', en: 'I studied' },
          { it: 'Ho guardato', en: 'I watched' },
        ]),
        shadow('Cosa hai fatto ieri?', 'What did you do yesterday?'),
      ]),

      lesson('u10l2', 'Where Did You Go?', 'The passato prossimo with essere', 'compass', [
        explain(
          'Passato Prossimo with Essere',
          'Verbs of motion and state (andare, venire, tornare, arrivare, stare) use essere instead of avere — and the past participle then agrees with the subject’s gender, like an adjective: sono andato if you’re male, sono andata if you’re female.',
          [
            { it: 'Sono andato/a al mercato', en: 'I went to the market' },
            { it: 'È arrivata tardi', en: 'She arrived late' },
          ],
        ),
        mcq('it-en', 'Sono andato al mercato', 'I went to the market', ['I am going to the market', 'I went to the market', 'I want to go to the market', 'I work at the market']),
        typeEx('I went to Rome', 'Sono andato a Roma', ['sono andato a roma', 'sono andata a roma']),
        mcq('en-it', 'È arrivata tardi', 'She arrived late', ['È arrivata tardi', 'Ha arrivato tardi', 'Arriva tardi', 'È arrivato presto']),
        build('We stayed at home', 'Siamo rimasti a casa', ['usciti', 'lavorato']),
        dictation('Sono tornato a casa tardi', 'I came home late', ['sono tornato a casa tardi', 'sono tornata a casa tardi']),
        listen('Dove sei andato ieri?', 'Where did you go yesterday?', ['Where did you go yesterday?', 'Where do you live?', 'Where are you going now?', 'Where were you born?']),
        match([
          { it: 'Sono andato/a', en: 'I went' },
          { it: 'Sono venuto/a', en: 'I came' },
          { it: 'Sono tornato/a', en: 'I returned' },
          { it: 'Sono arrivato/a', en: 'I arrived' },
        ]),
      ]),

      lesson('u10l2x', 'Last Week, Last Year', 'Time words for the past, and the participles that don’t follow the rules', 'clock', [
        mcq('it-en', 'Ho fatto molte cose', 'I did a lot of things', ['I do a lot of things', 'I did a lot of things', 'I will do a lot of things', 'I want to do a lot of things']),
        typeEx('I saw a beautiful movie', 'Ho visto un bel film', ['ho visto un bel film'], { objectiveIds: ['past-story'] }),
        build('He said something interesting', 'Ha detto qualcosa di interessante', ['dice', 'noioso']),
        reorder('La settimana scorsa ho viaggiato', 'Last week I traveled'),
        respond(
          'Cosa hai fatto il weekend scorso?', 'What did you do last weekend? (informal)',
          ['Ho visto amici', 'Sono andato al cinema', 'Ho lavorato'],
          'I saw friends / I went to the movies / I worked',
          { objectiveIds: ['past-story'] },
        ),
        match([
          { it: 'Fatto', en: 'Done' },
          { it: 'Visto', en: 'Seen' },
          { it: 'Detto', en: 'Said' },
          { it: 'Preso', en: 'Taken' },
        ]),
      ]),

      lesson('u10l3', 'Telling a Story', 'Prima, poi, dopo — the words that turn events into a story', 'chat', [
        mcq('it-en', 'Prima ho fatto colazione, poi sono uscito', 'First I had breakfast, then I went out', ['First I went out, then I had breakfast', 'First I had breakfast, then I went out', 'I had breakfast and stayed home', 'I never have breakfast']),
        typeEx('Then we went to the beach', 'Poi siamo andati in spiaggia', ['poi siamo andati in spiaggia'], { objectiveIds: ['past-story'] }),
        mcq('en-it', 'Infine siamo tornati a casa', 'Finally we came home', ['Infine siamo tornati a casa', 'Prima siamo tornati a casa', 'Infine siamo usciti', 'Poi siamo arrivati']),
        build('After that I called my mother', 'Dopo ho chiamato mia madre', ['prima', 'padre']),
        listen('Poi cosa è successo?', 'Then what happened?', ['Then what happened?', 'What happened first?', 'What will happen?', 'Did something happen?']),
        match([
          { it: 'Prima', en: 'First' },
          { it: 'Poi', en: 'Then' },
          { it: 'Dopo', en: 'After' },
          { it: 'Infine', en: 'Finally' },
        ]),
      ]),

      scenario(
        'u10l4',
        'What Did You Do This Weekend?',
        'Scenario: recounting your weekend to a friend',
        'chat',
        'You run into a friend on Monday morning, and they want the full story of your weekend.',
        [
          {
            speaker: 'Friend', it: 'Ciao! Com’è andato il weekend?', en: 'Hi! How was the weekend?',
            choices: [
              { it: 'È andato benissimo, grazie!', en: 'It went really well, thanks!', correct: true, feedback: 'Passato prossimo with essere, matching the question’s own tense — a clean, natural answer.' },
              { it: 'Vado bene, grazie.', en: 'I’m doing well, thanks.', correct: false, feedback: 'Present tense answers “how are you,” not “how was your weekend.”' },
              { it: 'Ho fame.', en: 'I’m hungry.', correct: false, feedback: 'Doesn’t address the weekend at all.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Cosa hai fatto?', en: 'What did you do?',
            choices: [
              { it: 'Sono andato al mare con la mia famiglia.', en: 'I went to the seaside with my family.', correct: true, feedback: 'Passato prossimo with essere — exactly the past-tense recap the question is asking for.' },
              { it: 'Vado al mare ogni giorno.', en: 'I go to the seaside every day.', correct: false, feedback: 'Present tense here answers “what do you usually do,” not “what did you do this weekend.”' },
              { it: 'Mi piace il mare.', en: 'I like the seaside.', correct: false, feedback: 'A preference, not an account of what actually happened.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Che bello! Che tempo faceva?', en: 'How nice! What was the weather like?',
            choices: [
              { it: 'Ha fatto caldo tutto il giorno.', en: 'It was hot all day.', correct: true, feedback: 'Past tense weather report — fits right in with the rest of the story.' },
              { it: 'Nevica sempre in estate.', en: 'It always snows in summer.', correct: false, feedback: 'Both wrong tense and wrong season — it doesn’t snow in summer.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'A restaurant phrase with nothing to do with weekend weather.' },
            ],
          },
          {
            speaker: 'Friend', it: 'Sembra fantastico. Ci vediamo domani!', en: 'Sounds fantastic. See you tomorrow!',
            choices: [
              { it: 'Sì, a domani!', en: 'Yes, see you tomorrow!', correct: true, feedback: 'Short, warm, and exactly matches the goodbye you were just given.' },
              { it: 'Dov’è la stazione?', en: 'Where’s the station?', correct: false, feedback: 'Random directions question with nothing to do with saying goodbye.' },
              { it: 'Ho perso il portafoglio.', en: 'I lost my wallet.', correct: false, feedback: 'An unrelated emergency out of nowhere.' },
            ],
          },
        ],
        ['past-story'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u11',
    title: 'Work & Future Plans',
    subtitle: 'Lavoro e Progetti',
    icon: 'bulb',
    color: '#4E8098',
    learn: [
      'Talk about professions',
      'Form the futuro semplice for what you’ll do next',
      'Talk about goals and plans',
      'Share a simple opinion with secondo me',
    ],
    test: unitTest('u11', [
      mcq('it-en', 'Sono medico', 'I am a doctor', ['I am a teacher', 'I am a doctor', 'I am a lawyer', 'I am an engineer']),
      typeEx('I will work tomorrow', 'Lavorerò domani', ['lavorerò domani']),
      mcq('en-it', 'Secondo me, è una buona idea', 'In my opinion, it’s a good idea', ['Secondo me, è una buona idea', 'Non sono d’accordo', 'Hai ragione', 'Non lo so']),
      build('What do you do for work?', 'Che lavoro fai?', ['lavori', 'quando']),
      listen('Cosa farai il prossimo anno?', 'What will you do next year?', ['What will you do next year?', 'What did you do last year?', 'What do you do now?', 'Where will you go?']),
      match([
        { it: 'Medico', en: 'Doctor' },
        { it: 'Insegnante', en: 'Teacher' },
        { it: 'Avvocato', en: 'Lawyer' },
        { it: 'Ingegnere', en: 'Engineer' },
      ]),
    ]),
    lessons: [
      lesson('u11l1', 'What Do You Do?', 'Professions, and the article Italian skips', 'user', [
        explain(
          'Professions Skip the Article',
          'Unlike English (“I am a doctor”), Italian drops the article after essere with a profession: sono medico, sono insegnante — no un/una needed, unless you add a description like un bravo medico (a good doctor).',
          [
            { it: 'Sono medico', en: 'I am a doctor' },
            { it: 'È insegnante', en: 'She/He is a teacher' },
          ],
        ),
        mcq('it-en', 'Sono medico', 'I am a doctor', ['I am a teacher', 'I am a doctor', 'I am a lawyer', 'I am an engineer']),
        typeEx('I am a teacher', 'Sono insegnante', ['sono insegnante']),
        mcq('en-it', 'È ingegnere', 'She is an engineer', ['È ingegnere', 'È un ingegnere', 'È medico', 'È avvocato'], { objectiveIds: ['work-future'] }),
        build('What do you do for work?', 'Che lavoro fai?', ['lavoro', 'quando']),
        listen('Lavoro in un ospedale', 'I work in a hospital', ['I work in a hospital', 'I work in a school', 'I work in an office', 'I work in a restaurant']),
        match([
          { it: 'Medico', en: 'Doctor' },
          { it: 'Insegnante', en: 'Teacher' },
          { it: 'Avvocato', en: 'Lawyer' },
          { it: 'Ingegnere', en: 'Engineer' },
        ]),
        shadow('Che lavoro fai?', 'What do you do for work?'),
      ]),

      lesson('u11l2', 'Tomorrow, Next Year', 'The futuro semplice for what’s coming up', 'clock', [
        explain(
          'Futuro Semplice',
          'Drop the final -e of the infinitive and add the future endings (-ò, -ai, -à…). -Are verbs also swap their a to e first: lavorare becomes lavorer- before the ending is added.',
          [
            { it: 'Lavorerò domani', en: 'I will work tomorrow' },
            { it: 'Partirà domani', en: 'He/She will leave tomorrow' },
          ],
        ),
        mcq('it-en', 'Lavorerò domani', 'I will work tomorrow', ['I worked yesterday', 'I will work tomorrow', 'I work every day', 'I don’t want to work']),
        typeEx('I will speak Italian', 'Parlerò italiano', ['parlerò italiano']),
        mcq('en-it', 'Partirà domani', 'He will leave tomorrow', ['Partirà domani', 'È partito ieri', 'Parte oggi', 'Partiamo domani']),
        build('We will eat at eight', 'Mangeremo alle otto', ['mangiamo', 'sette']),
        dictation('Partirò domani mattina', 'I will leave tomorrow morning', ['partirò domani mattina']),
        listen('Cosa farai stasera?', 'What will you do tonight?', ['What will you do tonight?', 'What did you do tonight?', 'What are you doing now?', 'Where will you go?']),
        match([
          { it: 'Lavorerò', en: 'I will work' },
          { it: 'Parlerò', en: 'I will speak' },
          { it: 'Partirà', en: 'He/She will leave' },
          { it: 'Mangeremo', en: 'We will eat' },
        ]),
      ]),

      lesson('u11l2x', 'Goals & Plans', 'The irregular futures worth knowing by heart', 'target', [
        mcq('it-en', 'Sarò felice', 'I will be happy', ['I am happy', 'I will be happy', 'I was happy', 'I want to be happy']),
        typeEx('I will have a new job', 'Avrò un nuovo lavoro', ['avrò un nuovo lavoro'], { objectiveIds: ['work-future'] }),
        build('I will go to university', 'Andrò all’università', ['vado', 'scuola']),
        reorder('Il prossimo anno cambierò lavoro', 'Next year I will change jobs'),
        respond(
          'Cosa farai tra cinque anni?', 'What will you do in five years? (informal)',
          ['Avrò un lavoro migliore', 'Vivrò all’estero', 'Non lo so ancora'],
          'I’ll have a better job / I’ll live abroad / I don’t know yet',
          { objectiveIds: ['work-future'] },
        ),
        match([
          { it: 'Sarò', en: 'I will be' },
          { it: 'Avrò', en: 'I will have' },
          { it: 'Andrò', en: 'I will go' },
          { it: 'Farò', en: 'I will do' },
        ]),
      ]),

      lesson('u11l3', 'Sharing an Opinion', 'Secondo me — the easiest way to say what you think', 'chat', [
        explain(
          'Giving an Opinion: Secondo Me',
          'Secondo me (“according to me” / “in my opinion”) is the simplest, most common way Italians share an opinion — and unlike “penso che,” it needs no special verb form afterward.',
          [
            { it: 'Secondo me, è una buona idea', en: 'In my opinion, it’s a good idea' },
            { it: 'Secondo te?', en: 'What do you think? (informal)' },
          ],
        ),
        mcq('it-en', 'Secondo me, è una buona idea', 'In my opinion, it’s a good idea', ['I don’t agree', 'In my opinion, it’s a good idea', 'You’re right', 'I don’t know']),
        typeEx('In my opinion, Italian is beautiful', 'Secondo me, l’italiano è bello', ['secondo me litaliano è bello', 'secondo me l’italiano è bello']),
        mcq('en-it', 'Secondo me, questo ristorante è caro', 'In my opinion, this restaurant is expensive', ['Secondo me, questo ristorante è caro', 'Secondo me, questo ristorante è economico', 'Non mi piace questo ristorante', 'Ho fame']),
        build('I agree with you', 'Sono d’accordo con te', ['sei', 'noi']),
        listen('Cosa ne pensi?', 'What do you think about it?', ['What do you think about it?', 'Do you like it?', 'What will you do?', 'Are you sure?']),
        match([
          { it: 'Secondo me', en: 'In my opinion' },
          { it: 'Sono d’accordo', en: 'I agree' },
          { it: 'Non sono d’accordo', en: 'I disagree' },
          { it: 'Hai ragione', en: 'You’re right' },
        ]),
      ]),

      scenario(
        'u11l4',
        'The Job Interview',
        'Scenario: a low-stakes interview for a summer job',
        'bulb',
        'You’re interviewing for a summer job at an Italian language school, and they want to know about you.',
        [
          {
            speaker: 'Interviewer', it: 'Allora, che lavoro fai adesso?', en: 'So, what do you do for work now?',
            choices: [
              { it: 'Sono insegnante d’inglese.', en: 'I am an English teacher.', correct: true, feedback: 'States your job directly with the article correctly skipped — a clean, confident answer.' },
              { it: 'Ho trent’anni.', en: 'I am thirty years old.', correct: false, feedback: 'Your age wasn’t asked — this dodges the actual question.' },
              { it: 'Mi piace insegnare.', en: 'I like teaching.', correct: false, feedback: 'A preference, not your actual job title — close, but not quite an answer.' },
            ],
          },
          {
            speaker: 'Interviewer', it: 'Interessante. Cosa farai se ti assumiamo?', en: 'Interesting. What will you do if we hire you?',
            choices: [
              { it: 'Insegnerò conversazione agli studenti.', en: 'I will teach conversation to students.', correct: true, feedback: 'Future tense, matching the hypothetical “if we hire you” framing perfectly.' },
              { it: 'Ho insegnato l’anno scorso.', en: 'I taught last year.', correct: false, feedback: 'Past tense answers a different question than what you’ll do going forward.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'A restaurant phrase in the middle of a job interview.' },
            ],
          },
          {
            speaker: 'Interviewer', it: 'Secondo te, cosa rende una buona lezione?', en: 'In your opinion, what makes a good lesson?',
            choices: [
              { it: 'Secondo me, la pratica è più importante della teoria.', en: 'In my opinion, practice is more important than theory.', correct: true, feedback: 'A real opinion, clearly framed with secondo me — exactly what a good interview answer looks like.' },
              { it: 'Non lo so.', en: 'I don’t know.', correct: false, feedback: 'A weak answer for an interview question asking for your opinion.' },
              { it: 'Mi piace la pizza.', en: 'I like pizza.', correct: false, feedback: 'Charming, but completely unrelated to teaching.' },
            ],
          },
          {
            speaker: 'Interviewer', it: 'Ottimo, ti faremo sapere presto!', en: 'Great, we’ll let you know soon!',
            choices: [
              { it: 'Grazie mille, spero di sentirvi presto!', en: 'Thank you so much, I hope to hear from you soon!', correct: true, feedback: 'Polite, enthusiastic, and closes the interview on a strong note.' },
              { it: 'Dov’è la stazione?', en: 'Where’s the station?', correct: false, feedback: 'Out of nowhere — save directions questions for after you leave.' },
              { it: 'Non mi interessa.', en: 'I’m not interested.', correct: false, feedback: 'A strange, dismissive thing to say right after interviewing for the job.' },
            ],
          },
        ],
        ['work-future'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'u12',
    title: 'People & Emotions',
    subtitle: 'Descrivere le Persone',
    icon: 'heart',
    color: '#C2477C',
    learn: [
      'Describe someone’s appearance',
      'Describe personality with comparatives',
      'Talk about how you’re feeling',
      'Compare two things as equal with tanto quanto',
    ],
    test: unitTest('u12', [
      mcq('it-en', 'È alto e simpatico', 'He is tall and nice', ['He is short and shy', 'He is tall and nice', 'He is tall and shy', 'He is short and nice']),
      typeEx('She has curly hair', 'Ha i capelli ricci', ['ha i capelli ricci']),
      mcq('en-it', 'Sono più felice di ieri', 'I am happier than yesterday', ['Sono più felice di ieri', 'Sono meno felice di ieri', 'Ero felice ieri', 'Sarò felice domani']),
      build('He is taller than me', 'Lui è più alto di me', ['bassa', 'quanto']),
      listen('Come ti senti oggi?', 'How do you feel today?', ['How do you feel today?', 'How old are you?', 'What do you look like?', 'Are you tired?']),
      match([
        { it: 'Felice', en: 'Happy' },
        { it: 'Triste', en: 'Sad' },
        { it: 'Stanco/a', en: 'Tired' },
        { it: 'Arrabbiato/a', en: 'Angry' },
      ]),
    ]),
    lessons: [
      lesson('u12l1', 'What Do They Look Like?', 'Physical description, and adjectives that agree', 'user', [
        explain(
          'Describing Appearance: Adjectives Agree',
          'Like every Italian adjective, appearance words change ending to match gender and number: alto/alta/alti/alte. Hair and eyes use avere (ha i capelli ricci — “he/she has curly hair”), not essere.',
          [
            { it: 'È alto', en: 'He is tall' },
            { it: 'Ha i capelli ricci', en: 'She/He has curly hair' },
          ],
        ),
        mcq('it-en', 'È alto', 'He is tall', ['He is short', 'He is tall', 'He is young', 'He is nice']),
        typeEx('She is short', 'È bassa', ['è bassa']),
        mcq('en-it', 'Ha i capelli corti', 'He has short hair', ['Ha i capelli corti', 'Ha i capelli lunghi', 'Ha i capelli ricci', 'È basso'], { objectiveIds: ['describe-people'] }),
        build('She has curly hair', 'Ha i capelli ricci', ['lisci', 'occhi']),
        listen('Ha gli occhi verdi', 'He/She has green eyes', ['He/She has green eyes', 'He/She has brown hair', 'He/She is tall', 'He/She has blue eyes']),
        match([
          { it: 'Alto/a', en: 'Tall' },
          { it: 'Basso/a', en: 'Short' },
          { it: 'I capelli', en: 'Hair' },
          { it: 'Gli occhi', en: 'Eyes' },
        ]),
        shadow('Ha i capelli ricci e gli occhi verdi', 'She has curly hair and green eyes'),
      ]),

      lesson('u12l2', 'Personality', 'Comparing people with più… di and meno… di', 'chat', [
        explain(
          'Comparatives: Più… Di / Meno… Di',
          'To compare two things, sandwich the adjective between più (more) or meno (less) and di (than): più alto di lui (taller than him), meno timido di me (less shy than me).',
          [
            { it: 'Più alto di lui', en: 'Taller than him' },
            { it: 'Meno timido di me', en: 'Less shy than me' },
          ],
        ),
        mcq('it-en', 'È molto simpatico', 'He is very nice', ['He is very shy', 'He is very nice', 'He is very tall', 'He is very tired']),
        typeEx('She is more intelligent than him', 'Lei è più intelligente di lui', ['lei è più intelligente di lui']),
        mcq('en-it', 'Sono meno timido di mia sorella', 'I am less shy than my sister', ['Sono meno timido di mia sorella', 'Sono più timido di mia sorella', 'Sono timido come mia sorella', 'Mia sorella è timida'], { objectiveIds: ['describe-people'] }),
        build('He is funnier than me', 'Lui è più divertente di me', ['meno', 'noiosa']),
        dictation('È simpatica e generosa', 'She is nice and generous', ['è simpatica e generosa']),
        listen('Com’è il tuo migliore amico?', 'What’s your best friend like?', ['What’s your best friend like?', 'Where’s your best friend?', 'How old is your best friend?', 'Do you have a best friend?']),
        match([
          { it: 'Simpatico/a', en: 'Nice' },
          { it: 'Timido/a', en: 'Shy' },
          { it: 'Generoso/a', en: 'Generous' },
          { it: 'Divertente', en: 'Funny' },
        ]),
      ]),

      lesson('u12l2x', 'How Are You Feeling?', 'The vocabulary for every mood', 'heart', [
        mcq('it-en', 'Sono felice', 'I am happy', ['I am sad', 'I am happy', 'I am tired', 'I am angry']),
        typeEx('I am tired', 'Sono stanco', ['sono stanco', 'sono stanca'], { objectiveIds: ['describe-people'] }),
        build('She is worried', 'Lei è preoccupata', ['felice', 'lui']),
        reorder('Oggi mi sento un po’ triste', 'Today I feel a bit sad'),
        respond(
          'Come ti senti oggi?', 'How do you feel today? (informal)',
          ['Mi sento bene', 'Sono un po’ stanco', 'Sono molto felice'],
          'I feel good / I’m a bit tired / I’m very happy',
          { objectiveIds: ['describe-people'] },
        ),
        match([
          { it: 'Felice', en: 'Happy' },
          { it: 'Triste', en: 'Sad' },
          { it: 'Arrabbiato/a', en: 'Angry' },
          { it: 'Stanco/a', en: 'Tired' },
        ]),
      ]),

      lesson('u12l3', 'Just As…', 'Comparing two equal things with tanto quanto', 'target', [
        explain(
          'Comparing Equals: (Tanto)… Quanto',
          'When two things are equally matched rather than one beating the other, drop più/meno and use quanto (or tanto… quanto) instead: alto quanto te (as tall as you).',
          [
            { it: 'Alto quanto te', en: 'As tall as you' },
            { it: 'Simpatico quanto sua sorella', en: 'As nice as his sister' },
          ],
        ),
        mcq('it-en', 'È tanto simpatico quanto sua sorella', 'He is as nice as his sister', ['He is nicer than his sister', 'He is as nice as his sister', 'His sister is nicer than him', 'He is not nice at all']),
        typeEx('I am as tall as you', 'Sono alto quanto te', ['sono alto quanto te', 'sono alta quanto te']),
        mcq('en-it', 'Questa città è bella quanto Roma', 'This city is as beautiful as Rome', ['Questa città è bella quanto Roma', 'Questa città è più bella di Roma', 'Roma è più bella di questa città', 'Questa città non è bella']),
        build('My brother is as funny as me', 'Mio fratello è divertente quanto me', ['più', 'lei']),
        listen('Sei più alto di tuo padre?', 'Are you taller than your father?', ['Are you taller than your father?', 'Is your father tall?', 'Are you as tall as your father?', 'How tall is your father?']),
        match([
          { it: 'Più… di', en: 'More… than' },
          { it: 'Meno… di', en: 'Less… than' },
          { it: '…quanto', en: 'As… as' },
          { it: 'Molto', en: 'Very' },
        ]),
      ]),

      scenario(
        'u12l4',
        'Describing a Friend',
        'Scenario: painting a picture of a friend before they arrive',
        'heart',
        'You’re at a party, and a new acquaintance asks you to describe a mutual friend who hasn’t shown up yet.',
        [
          {
            speaker: 'Acquaintance', it: 'Com’è Marco? Non l’ho mai incontrato.', en: 'What’s Marco like? I’ve never met him.',
            choices: [
              { it: 'È alto, con i capelli scuri, ed è molto simpatico.', en: 'He’s tall, with dark hair, and he’s very nice.', correct: true, feedback: 'Covers looks and personality in one natural sentence — exactly what “what’s he like” is asking for.' },
              { it: 'Ha trent’anni.', en: 'He is thirty years old.', correct: false, feedback: 'His age doesn’t describe what he looks like or is like.' },
              { it: 'Lavora in banca.', en: 'He works at a bank.', correct: false, feedback: 'His job isn’t a description of him as a person.' },
            ],
          },
          {
            speaker: 'Acquaintance', it: 'È timido o estroverso?', en: 'Is he shy or outgoing?',
            choices: [
              { it: 'È molto estroverso, parla con tutti.', en: 'He’s very outgoing, he talks to everyone.', correct: true, feedback: 'Directly answers the either/or question with a supporting detail.' },
              { it: 'È più alto di me.', en: 'He is taller than me.', correct: false, feedback: 'That’s about height, and the question was about personality.' },
              { it: 'Non lo so, l’ho appena conosciuto.', en: 'I don’t know, I just met him.', correct: false, feedback: 'You’re describing him in detail elsewhere in this conversation — this contradicts that you know him well.' },
            ],
          },
          {
            speaker: 'Acquaintance', it: 'Sembra simpatico! È più divertente di te?', en: 'Sounds nice! Is he funnier than you?',
            choices: [
              { it: 'Ah, sì, è molto più divertente di me!', en: 'Ah, yes, he’s much funnier than me!', correct: true, feedback: 'A comparative answer that actually engages with the playful question.' },
              { it: 'Sono stanco oggi.', en: 'I’m tired today.', correct: false, feedback: 'Dodges the question entirely with something unrelated.' },
              { it: 'Non mi piace il calcio.', en: 'I don’t like soccer.', correct: false, feedback: 'Completely off topic.' },
            ],
          },
          {
            speaker: 'Acquaintance', it: 'Non vedo l’ora di conoscerlo!', en: 'I can’t wait to meet him!',
            choices: [
              { it: 'Arriverà tra poco, tranquillo!', en: 'He’ll arrive soon, don’t worry!', correct: true, feedback: 'A reassuring, natural close using the future tense — ties the conversation off nicely.' },
              { it: 'Il conto, per favore.', en: 'The check, please.', correct: false, feedback: 'A restaurant phrase that has nothing to do with the party.' },
              { it: 'Dov’è la farmacia?', en: 'Where’s the pharmacy?', correct: false, feedback: 'Random and unrelated to meeting Marco.' },
            ],
          },
        ],
        ['describe-people'],
      ),
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'c4',
    title: 'Final Checkpoint',
    subtitle: 'Review: Units 10–12',
    icon: 'trophy',
    color: '#D9A441',
    checkpointUnit: true,
    learn: ['A cumulative review across the entire course — every topic, one last time.'],
    lessons: [
      checkpointLesson('c4l1', 'Complete Mastery', 'Past, future, and describing anyone — the whole course, together', 'trophy', [
        mcq('it-en', 'Sono andato al mercato', 'I went to the market', ['I am going to the market', 'I went to the market', 'I want to go to the market', 'I work at the market']),
        typeEx('I will work tomorrow', 'Lavorerò domani', ['lavorerò domani']),
        mcq('en-it', 'Secondo me, è una buona idea', 'In my opinion, it’s a good idea', ['Secondo me, è una buona idea', 'Non sono d’accordo', 'Hai ragione', 'Non lo so']),
        build('He is taller than me', 'Lui è più alto di me', ['bassa', 'quanto']),
        mcq('it-en', 'Sono felice', 'I am happy', ['I am sad', 'I am happy', 'I am tired', 'I am angry']),
        typeEx('I ate pizza yesterday', 'Ho mangiato la pizza ieri', ['ho mangiato la pizza ieri']),
        listen('Cosa farai domani?', 'What will you do tomorrow?', ['What will you do tomorrow?', 'What did you do yesterday?', 'What are you doing now?', 'Where did you go?']),
        mcq('en-it', 'Lei è simpatica quanto sua sorella', 'She is as nice as her sister', ['Lei è simpatica quanto sua sorella', 'Lei è più simpatica di sua sorella', 'Sua sorella è più simpatica', 'Lei non è simpatica']),
        match([
          { it: 'Sono andato/a', en: 'I went' },
          { it: 'Lavorerò', en: 'I will work' },
          { it: 'Secondo me', en: 'In my opinion' },
          { it: 'Più alto di me', en: 'Taller than me' },
        ]),
      ]),
    ],
  },

]

export const OBJECTIVES = [
  { id: 'greet-introduce', label: 'Greet someone and introduce yourself', unit: 'u1' },
  { id: 'handle-confusion', label: 'Say you don’t understand and ask someone to slow down', unit: 'u1' },
  { id: 'order-drink', label: 'Order a coffee and a glass of water', unit: 'u2' },
  { id: 'handle-allergy', label: 'Say you’re vegetarian or allergic to something', unit: 'u2' },
  { id: 'pay-bill', label: 'Ask for the bill and pay', unit: 'u2' },
  { id: 'order-meal-dietary', label: 'Order a full meal and explain a dietary need', unit: 'u3' },
  { id: 'ask-directions', label: 'Ask for and follow directions', unit: 'u4' },
  { id: 'buy-ticket', label: 'Buy a train or bus ticket', unit: 'u4' },
  { id: 'get-help', label: 'Ask for help in an emergency', unit: 'u5' },
  { id: 'pharmacy', label: 'Describe a symptom at a pharmacy', unit: 'u5' },
  { id: 'negotiate-price', label: 'Ask the price and haggle a little', unit: 'u6' },
  { id: 'small-talk', label: 'Make small talk about where you’re from', unit: 'u6' },
  { id: 'talk-about-family', label: 'Talk about your family and describe your home', unit: 'u7' },
  { id: 'daily-routine', label: 'Describe your daily routine', unit: 'u8' },
  { id: 'weather-hobbies', label: 'Talk about the weather and your hobbies', unit: 'u9' },
  { id: 'past-story', label: 'Tell a simple story about the past', unit: 'u10' },
  { id: 'work-future', label: 'Talk about your job and future plans', unit: 'u11' },
  { id: 'describe-people', label: 'Describe a person’s appearance and personality', unit: 'u12' },
]

// Flat lookup of every exercise/scenario id -> the objective ids it proves,
// built once from the unit data above so authors only tag things in one place.
export const OBJECTIVE_REQUIREMENTS = (() => {
  const map = {}
  const push = (objId, itemId) => {
    if (!map[objId]) map[objId] = []
    map[objId].push(itemId)
  }
  for (const unit of UNITS) {
    for (const item of unit.lessons) {
      if (item.type === 'lesson') {
        for (const ex of item.exercises) {
          for (const objId of ex.objectiveIds || []) push(objId, ex.id)
        }
      } else if (item.type === 'scenario') {
        for (const objId of item.objectiveIds || []) push(objId, `${item.id}-done`)
      }
    }
  }
  return map
})()

export function findLesson(lessonId) {
  for (const unit of UNITS) {
    const lesson = unit.lessons.find((l) => l.id === lessonId)
    if (lesson) return { unit, lesson }
  }
  return null
}

// The {it, en} vocab pair(s) a single exercise draws on — exported so the
// Lesson screen can teach a word right as it first comes up, instead of
// dumping every new word in the lesson on the learner before anything starts.
export function vocabForExercise(ex) {
  switch (ex.type) {
    case 'mcq':
    case 'build':
    case 'type':
    case 'listen':
    case 'dictation':
    case 'reorder':
    case 'speak':
    case 'shadow':
      return ex.it && ex.en ? [{ it: ex.it, en: ex.en }] : []
    case 'match':
      return ex.pairs || []
    case 'explain':
      return ex.examples || []
    case 'respond':
      return ex.accepts?.length ? [{ it: ex.accepts[0], en: ex.modelEn || ex.promptEn }] : []
    default:
      return []
  }
}

// The actual Italian words/phrases a lesson teaches, as {it, en} pairs —
// used to ground Volpe's vocabulary in what the learner has really been
// taught, instead of a generic level bucket. Scenario "lessons" pull each
// turn's line plus whichever choice was marked correct (the one the
// learner was meant to produce), skipping the wrong-answer distractors.
export function vocabForLesson(lesson) {
  if (lesson.type === 'scenario') {
    return (lesson.turns || []).flatMap((t) => {
      const correct = t.choices?.find((c) => c.correct)
      return [{ it: t.it, en: t.en }, ...(correct ? [{ it: correct.it, en: correct.en }] : [])]
    })
  }
  return (lesson.exercises || []).flatMap(vocabForExercise)
}
