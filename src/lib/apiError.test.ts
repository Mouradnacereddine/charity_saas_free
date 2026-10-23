import { describe, it, expect } from 'vitest'
import { apiErrorMessage } from './apiError'

// i18next minimal : renvoie la traduction si elle existe, sinon la clé.
const fakeT = (key: string) =>
  ({
    'errors.INSUFFICIENT_DISPONIBLE': 'Solde insuffisant : le montant restant est réservé',
    'finance.addFailed': "Échec de l'ajout",
    'common.error': 'Erreur',
  })[key] ?? key

describe('apiErrorMessage', () => {
  it('traduit à partir du code, même si le serveur renvoie du texte arabe', () => {
    const err = {
      response: {
        data: {
          code: 'INSUFFICIENT_DISPONIBLE',
          error: 'رصيد غير كافٍ : المبلغ المتبقي مخصص لدعم معلّق',
        },
      },
    }
    expect(apiErrorMessage(err, fakeT as any, 'finance.addFailed')).toBe(
      'Solde insuffisant : le montant restant est réservé',
    )
  })

  it('retombe sur le texte serveur quand le code est inconnu du client', () => {
    const err = {
      response: { data: { code: 'FUTURE_CODE', error: 'Texte serveur' } },
    }
    expect(apiErrorMessage(err, fakeT as any, 'finance.addFailed')).toBe('Texte serveur')
  })

  it('retombe sur le texte serveur si aucun code n’est présent (API plus ancienne)', () => {
    const err = { response: { data: { error: 'Ancien message' } } }
    expect(apiErrorMessage(err, fakeT as any, 'finance.addFailed')).toBe('Ancien message')
  })

  it('utilise la clé de repli pour une erreur réseau', () => {
    expect(apiErrorMessage(new Error('Network Error'), fakeT as any, 'common.error')).toBe('Erreur')
  })
})
