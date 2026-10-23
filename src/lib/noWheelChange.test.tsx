import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { noWheelChange } from './noWheelChange'

/**
 * Un champ numérique focalisé change de valeur au moindre cran de molette, ce
 * qui modifie un montant pendant qu'on fait défiler la page. Le correctif
 * retire le focus ; c'est ce retrait qui empêche l'incrément natif.
 */
describe('noWheelChange', () => {
  it('retire le focus du champ numérique à la molette', () => {
    const { container } = render(
      <input type="number" defaultValue="500" {...noWheelChange({ type: 'number' })} />,
    )
    const input = container.querySelector('input') as HTMLInputElement

    input.focus()
    expect(document.activeElement).toBe(input)

    fireEvent.wheel(input, { deltaY: -100 })

    // Sans focus, le navigateur n'applique plus le pas d'incrémentation.
    expect(document.activeElement).not.toBe(input)
    expect(input.value).toBe('500')
  })

  it('laisse les champs non numériques intacts', () => {
    const { container } = render(
      <input type="text" defaultValue="abc" {...noWheelChange({ type: 'text' })} />,
    )
    const input = container.querySelector('input') as HTMLInputElement

    input.focus()
    fireEvent.wheel(input, { deltaY: -100 })

    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('abc')
  })

  it('conserve un onWheel fourni par l’appelant', () => {
    let called = 0
    const { container } = render(
      <input
        type="number"
        {...noWheelChange({ type: 'number', onWheel: () => { called += 1 } })}
      />,
    )
    const input = container.querySelector('input') as HTMLInputElement

    input.focus()
    fireEvent.wheel(input, { deltaY: 100 })

    expect(called).toBe(1)
    expect(document.activeElement).not.toBe(input)
  })
})
