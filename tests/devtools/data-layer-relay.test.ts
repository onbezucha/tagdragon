import { describe, it, expect } from 'vitest';
import { extractEventName, buildPush } from '@/devtools/data-layer-relay';
import type { DataLayerSource } from '@/types/datalayer';

describe('extractEventName', () => {
  it('extracts from event key', () => {
    const result = extractEventName({ event: 'page_view' });
    expect(result).toBe('page_view');
  });

  it('extracts from eventName key', () => {
    const result = extractEventName({ eventName: 'click' });
    expect(result).toBe('click');
  });

  it('extracts from event_name key', () => {
    const result = extractEventName({ event_name: 'signup' });
    expect(result).toBe('signup');
  });

  it('returns undefined when no event key', () => {
    const result = extractEventName({ foo: 'bar' });
    expect(result).toBeUndefined();
  });

  it('ignores non-string event values', () => {
    const result = extractEventName({ event: 42 });
    expect(result).toBeUndefined();
  });
});

describe('buildPush', () => {
  const baseMsg = {
    source: 'gtm' as DataLayerSource,
    pushIndex: 0,
    timestamp: '2024-01-01T00:00:00.000Z',
    data: { event: 'test' },
  };

  it('builds correct DataLayerPush shape', () => {
    const push = buildPush(baseMsg);
    expect(push).toHaveProperty('id');
    expect(push).toHaveProperty('source');
    expect(push).toHaveProperty('sourceLabel');
    expect(push).toHaveProperty('pushIndex');
    expect(push).toHaveProperty('timestamp');
    expect(push).toHaveProperty('data');
    expect(push).toHaveProperty('cumulativeState');
    expect(push).toHaveProperty('isReplay');
    expect(push).toHaveProperty('_eventName');
    expect(push).toHaveProperty('_ecommerceType');
  });

  it('uses SOURCE_DESCRIPTIONS for sourceLabel', () => {
    const push = buildPush(baseMsg);
    expect(push.sourceLabel).toBe('GTM');
  });

  it('uses sourceLabel override when provided', () => {
    const push = buildPush({ ...baseMsg, sourceLabel: 'GTM-GXXXXX' });
    expect(push.sourceLabel).toBe('GTM-GXXXXX');
  });

  it('detects ecommerce type', () => {
    const push = buildPush({ ...baseMsg, data: { event: 'purchase' } });
    expect(push._ecommerceType).toBe('purchase');
  });

  it('extracts event name', () => {
    const push = buildPush({ ...baseMsg, data: { event: 'click' } });
    expect(push._eventName).toBe('click');
  });

  it('defaults isReplay to false', () => {
    const push = buildPush(baseMsg);
    expect(push.isReplay).toBe(false);
  });

  it('sets isReplay to true when specified', () => {
    const push = buildPush({ ...baseMsg, isReplay: true });
    expect(push.isReplay).toBe(true);
  });

  it('generates unique IDs on sequential calls', () => {
    const push1 = buildPush(baseMsg);
    const push2 = buildPush(baseMsg);
    expect(push1.id).not.toBe(push2.id);
  });

  it('sets cumulativeState to empty object', () => {
    const push = buildPush(baseMsg);
    expect(push.cumulativeState).toEqual({});
  });
});
