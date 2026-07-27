/**
 * Test d'interpolation réelle des SmartText pour les recommandations Smart Analytics.
 * Garde-fou contre une régression du bug "{ratio}" affiché en dur.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SmartText } from '../components/common/SmartText';
import i18nInstance from '../i18n';

beforeAll(async () => {
  await i18nInstance.changeLanguage('ar');
});

describe('Interpolation Smart Analytics via <SmartText>', () => {
  it('interpole {ratio} dans excellentText', () => {
    render(
      <div data-testid="p">
        <SmartText i18nKey="analytics.excellentText" values={{ ratio: '42.3' }} />
      </div>
    );
    const text = screen.getByTestId('p').textContent || '';
    expect(text).not.toContain('{ratio}');
    expect(text).toContain('42.3');
  });

  it('interpole {donor}, {share}, {amount} dans donorRiskText', () => {
    render(
      <div data-testid="p2">
        <SmartText
          i18nKey="analytics.donorRiskText"
          values={{ donor: 'أحمد', share: '65.0', amount: '12000 دج' }}
        />
      </div>
    );
    const text = screen.getByTestId('p2').textContent || '';
    expect(text).not.toContain('{donor}');
    expect(text).not.toContain('{share}');
    expect(text).not.toContain('{amount}');
    expect(text).toContain('أحمد');
    expect(text).toContain('65.0');
  });

  it('interpole {reserve} dans safetyMarginText', () => {
    render(
      <div data-testid="p3">
        <SmartText i18nKey="analytics.safetyMarginText" values={{ reserve: '5000 دج' }} />
      </div>
    );
    const text = screen.getByTestId('p3').textContent || '';
    expect(text).not.toContain('{reserve}');
    expect(text).toContain('5000');
  });

  it('interpole {total}, {days}, {avgPerDay} dans velocityText', () => {
    render(
      <div data-testid="p4">
        <SmartText
          i18nKey="analytics.velocityText"
          values={{ total: 12, days: 5, avgPerDay: 2.4 }}
        />
      </div>
    );
    const text = screen.getByTestId('p4').textContent || '';
    expect(text).not.toContain('{total}');
    expect(text).not.toContain('{days}');
    expect(text).not.toContain('{avgPerDay}');
  });
});
