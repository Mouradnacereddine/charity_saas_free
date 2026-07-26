import { type ReactNode } from 'react';
import i18nInstance from '../../i18n';

/**
 * Rendu de texte i18n avec interpolation manuelle des variables nommées.
 *
 * Raison d'être : i18next n'interpole pas les variables `{var}` quand le locale
 * contient du markup HTML (ex. `<strong>{ratio}%</strong>`), même via <Trans>
 * avec components+values (constaté expérimentalement sur ce projet). Ce composant
 * contourne le problème en :
 *   1. récupérant le template via i18nInstance.t (qui résout la clé + la langue) ;
 *   2. substituant manuellement chaque variable de `values` ;
 *   3. injectant le résultat via dangerouslySetInnerHTML pour rendre les balises
 *      du locale (<strong>, etc.).
 *
 * Sûreté : le contenu vient UNIQUEMENT de nos fichiers de locales (sources
 * contrôlées), jamais d'une entrée utilisateur → pas de risque XSS. Les valeurs
 * interpolées (montants, noms, %) proviennent de nos données applicatives et ne
 * contiennent pas de HTML utilisateur.
 */
function interpolate(template: string, values?: Record<string, unknown>): string {
  if (!values) return template;
  let out = template;
  for (const [k, v] of Object.entries(values)) {
    const keyPattern = '{' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '}';
    out = out.split(keyPattern).join(String(v));
  }
  return out;
}

export function SmartText({
  i18nKey,
  values,
  className,
}: {
  i18nKey: string;
  values?: Record<string, unknown>;
  className?: string;
}): ReactNode {
  const template = i18nInstance.t(i18nKey) as string;
  const html = interpolate(template, values);
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}