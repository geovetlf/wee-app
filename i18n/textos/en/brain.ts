/*
 * Weë Brain: its workplace.
 *
 * Typed against the Spanish file: a key missing here does not compile. The
 * names —Weë Brain and its six satellites— never go through the translator:
 * they are brand, and they come from `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Your smart assistant for everything',
  slogan: 'Imagine · Ask · Create · Connect',
  description: 'All the power of Weë, in a single conversation.',
  systemLabel: 'Weë Brain, connected to every other Weë AI section',
  goTo: 'Go to {{seccion}}',
  placeholder: 'Write your message here...',
  settingsHint: 'How you want me to answer.',
  searchGroup: 'Search the internet',
  imageLabel: 'Image',
  settingsLabel: 'Settings',
  blockLeft: '{{restantes}} of {{total}} answers left',
};
