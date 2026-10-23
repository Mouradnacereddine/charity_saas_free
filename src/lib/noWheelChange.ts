import type React from 'react'

/**
 * Neutralise la molette sur un `<input type="number">`.
 *
 * Un champ numérique focalisé change de valeur à chaque cran de molette : en
 * faisant défiler la page, l'utilisateur modifie le montant sans le voir. On
 * retire le focus au survol de la molette, avant que le navigateur n'applique
 * le changement — la valeur reste donc intacte.
 *
 * `preventDefault()` ne conviendrait pas : React attache l'écouteur `wheel`
 * en mode passif, l'appel serait ignoré et un avertissement s'afficherait en
 * console.
 */
export function blurOnWheel<T extends HTMLElement>(e: React.WheelEvent<T>): void {
  e.currentTarget.blur()
}

/**
 * À étaler sur un `<input>` (`{...noWheelChange(props)}`) : neutralise la
 * molette uniquement sur les champs numériques, et conserve un `onWheel`
 * explicite fourni par l'appelant.
 */
export function noWheelChange<T extends HTMLInputElement>(props: {
  type?: React.HTMLInputTypeAttribute
  onWheel?: React.WheelEventHandler<T>
}): { onWheel?: React.WheelEventHandler<T> } {
  if (props.type !== 'number') return { onWheel: props.onWheel }
  return {
    onWheel: (e: React.WheelEvent<T>) => {
      e.currentTarget.blur()
      props.onWheel?.(e)
    },
  }
}
