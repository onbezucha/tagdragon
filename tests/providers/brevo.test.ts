import { describe, it, expect } from 'vitest';
import { brevo } from '../../src/providers/brevo';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches in-automate.brevo.com/p', () => {
    expect(brevo.pattern.test('https://in-automate.brevo.com/p')).toBe(true);
  });

  it('matches in-automate.brevo.com/p with path', () => {
    expect(brevo.pattern.test('https://in-automate.brevo.com/pixel')).toBe(true);
  });

  it('matches in-automate.sendinblue.com/p', () => {
    expect(brevo.pattern.test('https://in-automate.sendinblue.com/p')).toBe(true);
  });

  it('does not match brevo.com homepage', () => {
    expect(brevo.pattern.test('https://www.brevo.com/')).toBe(false);
  });

  it('does not match sendinblue.com homepage', () => {
    expect(brevo.pattern.test('https://www.sendinblue.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and sets _eventName', () => {
    const url = 'https://in-automate.brevo.com/p?event=open';
    const postBody = undefined;

    const result = brevo.parseParams(url, postBody);

    expect(result['Event']).toBe('open');
    expect(result._eventName).toBe('open');
  });

  it('extracts id (Contact ID)', () => {
    const url = 'https://in-automate.brevo.com/p?id=CONTACT123';
    const postBody = undefined;

    const result = brevo.parseParams(url, postBody);

    expect(result['Contact ID']).toBe('CONTACT123');
  });

  it('extracts m (Email)', () => {
    const url = 'https://in-automate.brevo.com/p?m=user@example.com';
    const postBody = undefined;

    const result = brevo.parseParams(url, postBody);

    expect(result['Email']).toBe('user@example.com');
  });

  it('extracts multiple params together', () => {
    const url = 'https://in-automate.sendinblue.com/pixel?event=click&id=CT456&m=test@test.com';
    const postBody = undefined;

    const result = brevo.parseParams(url, postBody);

    expect(result['Event']).toBe('click');
    expect(result['Contact ID']).toBe('CT456');
    expect(result['Email']).toBe('test@test.com');
    expect(result._eventName).toBe('click');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://in-automate.brevo.com/p';

    const result = brevo.parseParams(url, undefined);

    expect(result['Event']).toBeUndefined();
    expect(result['Contact ID']).toBeUndefined();
    expect(result['Email']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});
