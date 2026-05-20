import { defineShikiSetup } from '@slidev/types'
import hsmlGrammar from './hsml.tmLanguage.json'

export default defineShikiSetup(() => {
  return {
    themes: {
      dark: 'vitesse-dark',
      light: 'vitesse-light',
    },
    langs: [
      'html',
      'css',
      'js',
      'ts',
      'vue',
      'pug',
      'sh',
      'mermaid',
      'log',
      'yaml',
      {
        ...(hsmlGrammar as any),
        name: 'hsml',
      },
    ],
  }
})
