import { defineShikiSetup } from '@slidev/types'
import { bundledLanguages } from 'shiki/langs'
import vueLangBundle from '@shikijs/langs/vue'
import hsmlGrammar from './hsml.tmLanguage.json'

const hsml = {
  ...(hsmlGrammar as any),
  name: 'hsml',
}

/**
 * Vue's bundled TextMate grammar hard-codes a `<template lang="...">` branch for
 * every language it knows (pug, ts, scss, ...) but not for `hsml`, so an
 * `hsml` template falls through to plain HTML highlighting.
 *
 * We clone the existing `pug` branch — which embeds `text.pug` inside the
 * template — and rewrite it to embed our `text.hsml` grammar instead, so
 * ```vue blocks containing `<template lang="hsml">` get real highlighting.
 *
 * Returns the full Vue grammar bundle (the `vue` grammar plus the sibling
 * grammars it embeds: css, json, html-derivative, vue-directives, ...). It must
 * be loaded as one unit, exactly like Shiki's built-in `vue`, otherwise those
 * embedded languages aren't resolved.
 */
function patchedVueBundle() {
  const bundle = (vueLangBundle as any[]).map((g) =>
    g && typeof g === 'object' ? structuredClone(g) : g,
  )
  const vueGrammar = bundle[bundle.length - 1]

  const isPugBranch = (p: any) =>
    typeof p?.begin === 'string' && p.begin.includes('pug')

  // Find the array of `lang="..."` template branches that contains the pug one.
  function findLangBranches(node: any): any[] | undefined {
    if (Array.isArray(node)) {
      if (node.some(isPugBranch)) return node
      for (const item of node) {
        const found = findLangBranches(item)
        if (found) return found
      }
      return undefined
    }
    if (node && typeof node === 'object') {
      for (const value of Object.values(node)) {
        const found = findLangBranches(value)
        if (found) return found
      }
    }
    return undefined
  }

  const branches = findLangBranches(vueGrammar.patterns)
  if (branches) {
    const pugIndex = branches.findIndex(isPugBranch)
    // `pug` only appears as `pug\b` (in begin) and `text.pug` (embedded scope),
    // so a blanket replace safely produces the `hsml` equivalent.
    const hsmlBranch = JSON.parse(
      JSON.stringify(branches[pugIndex]).replaceAll('pug', 'hsml'),
    )
    branches.splice(pugIndex, 0, hsmlBranch)

    // Ship the `hsml` grammar inside this bundle and declare it in
    // `embeddedLangs`, exactly like the css/json/html grammars Vue embeds.
    // This guarantees `hsml` is loaded together with `vue` (Slidev loads `vue`
    // on demand), so the branch's `include: text.hsml` actually resolves —
    // otherwise the template body stays unhighlighted.
    vueGrammar.embeddedLangs = [...(vueGrammar.embeddedLangs ?? []), 'hsml']
    bundle.push(structuredClone(hsml))
  }
  // If `branches` is undefined the grammar shape changed upstream; we still
  // return the bundle so `vue` keeps working, just without hsml highlighting.

  return bundle
}

export default defineShikiSetup(() => {
  return {
    themes: {
      dark: 'vitesse-dark',
      light: 'vitesse-light',
    },
    // Record format (not an array): Slidev allows lazy loader functions here,
    // which we need so the patched `vue` grammar is loaded together with the
    // sibling grammars it embeds. markdown/html/css/js/ts are loaded by Slidev
    // by default.
    langs: {
      pug: bundledLanguages.pug,
      sh: bundledLanguages.sh,
      mermaid: bundledLanguages.mermaid,
      log: bundledLanguages.log,
      yaml: bundledLanguages.yaml,
      vue: () => patchedVueBundle(),
      hsml: () => [hsml],
    },
  }
})
