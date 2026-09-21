export const QUIPS = [
  "I've got opinions and I'm not afraid to use them.",
  'Ask me anything. I make no promises about being gentle.',
  "Fast, sharp, occasionally too honest. That's the brand.",
  'Real-time search, images, voice — the whole circus.',
  "Warning: may respond with a fact you didn't ask for.",
  'Turn Fun Mode up. You know you want to.',
  "I don't do small talk. I do smart talk with jokes.",
  'Built different. Mostly out of sarcasm.',
  "Say /help if you're lost. I won't judge. Much.",
  'Currently 60% wit, 40% actually useful.',
]

export function randomQuip() {
  return QUIPS[Math.floor(Math.random() * QUIPS.length)]
}
