import type { TFunction } from 'i18next'

/**
 * Le serveur répond `{ error, code }`. `error` reste un texte de secours
 * (ancien comportement, utile si le client est plus ancien que l'API) ; `code`
 * est stable et permet d'afficher le message dans la langue choisie par
 * l'utilisateur, au lieu du texte figé dans celle du développeur.
 */
export function apiErrorMessage(
  err: any,
  t: TFunction,
  fallbackKey: string,
): string {
  const code: string | undefined = err?.response?.data?.code
  if (code) {
    const key = `errors.${code}`
    const translated = t(key)
    // i18next renvoie la clé elle-même quand la traduction n'existe pas.
    if (translated !== key) return translated
  }
  // `err.message` n'est volontairement pas utilisé pour les erreurs réseau :
  // axios y met un texte anglais figé (« Network Error », « timeout of 0ms
  // exceeded ») qui produirait le même défaut qu'ici — un message dans une
  // langue que l'utilisateur n'a pas choisie.
  return err?.response?.data?.error || t(fallbackKey)
}
