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
//   explain - a short grammar note (title + body + examples), no scoring
//   mcq    - multiple choice (dir: 'it-en' recognize, or 'en-it' produce)
//   build  - drag/tap word tiles into the correct Italian sentence
//   type   - type the Italian translation from a free text box
//   listen - hear the Italian spoken aloud, choose what it means
//   match  - match a small set of Italian/English pairs
//   speak  - say the Italian phrase out loud, scored against speech recognition

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
        mcq('it-en', 'Di dove sei?', 'Where are you from? (informal)', ['Where are you going?', 'Where are you from?', 'How long are you staying?', 'Do you live here?']),
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
    title: 'Final Checkpoint',
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
