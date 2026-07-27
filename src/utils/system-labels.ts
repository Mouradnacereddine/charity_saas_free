/**
 * Service de traduction des libellés système.
 *
 * Certains champs en base (ex. Transaction.description) contiennent des préfixes
 * système comme "Orientation médicale confirmée - " ou "Medical referral confirmed - ".
 * Ces préfixes sont stockés dans une seule langue (français ou anglais selon la version).
 *
 * Ce service détecte le préfixe connu et le traduit dans la langue cible, en conservant
 * le suffixe (donnée utilisateur) inchangé.
 *
 * Bonne pratique : les données système sont stockées de manière neutre, la mise en forme
 * linguistique est déléguée à la couche de présentation.
 *
 * Usage :
 *   translateSystemLabel(description, 'en') → "Medical referral confirmed - Analysis 1"
 *   translateSystemLabel(description, 'fr') → "Orientation médicale confirmée - Analyse 1"
 *   translateSystemLabel(description, 'ar') → "توجيه طبي مؤكد - التحاليل 1"
 */
import i18n from '../i18n';

interface SystemLabelTranslation {
  en: string;
  fr: string;
  ar: string;
}

/**
 * Registre central de tous les préfixes systèmes.
 * Chaque clé est le préfixe dans sa langue originale (français).
 * Les traductions sont définies pour chaque langue supportée.
 * Étendre ce registre pour ajouter de nouveaux libellés système.
 */
const SYSTEM_LABELS: Record<string, SystemLabelTranslation> = {
  'Orientation médicale confirmée - ': {
    en: 'Medical referral confirmed - ',
    fr: 'Orientation médicale confirmée - ',
    ar: 'توجيه طبي مؤكد - ',
  },
  'Orientation médicale - ': {
    en: 'Medical referral - ',
    fr: 'Orientation médicale - ',
    ar: 'توجيه طبي - ',
  },
  'Medical referral confirmed - ': {
    en: 'Medical referral confirmed - ',
    fr: 'Orientation médicale confirmée - ',
    ar: 'توجيه طبي مؤكد - ',
  },
  'Medical referral - ': {
    en: 'Medical referral - ',
    fr: 'Orientation médicale - ',
    ar: 'توجيه طبي - ',
  },
};

/**
 * Traduit un libellé système (préfixe) vers la langue cible.
 * Le suffixe (donnée utilisateur) est conservé inchangé.
 *
 * @param text  Texte complet contenant potentiellement un préfixe système connu
 * @param lang  Code langue cible ('en', 'fr', 'ar')
 * @returns     Texte avec le préfixe traduit, ou le texte original si non reconnu
 */
export function translateSystemLabel(text: string, lang?: string): string {
  if (!text) return '';
  const targetLang = lang || i18n.language || 'fr';

  for (const [originalPrefix, translations] of Object.entries(SYSTEM_LABELS)) {
    // Vérifie si le texte commence par le préfixe original (français)
    if (text.startsWith(originalPrefix)) {
      const suffix = text.slice(originalPrefix.length);
      return translations[targetLang as keyof SystemLabelTranslation] + suffix;
    }

    // Vérifie si le texte commence par une des traductions connues
    for (const [srcLang, prefix] of Object.entries(translations)) {
      if (srcLang !== targetLang && text.startsWith(prefix)) {
        const suffix = text.slice(prefix.length);
        return translations[targetLang as keyof SystemLabelTranslation] + suffix;
      }
    }
  }

  return text;
}

export default translateSystemLabel;
