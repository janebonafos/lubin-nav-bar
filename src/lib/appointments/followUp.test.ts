import { describe, expect, test } from 'bun:test';
import { followUpStatus, followUpTotal } from './followUp';
describe('provider-booked follow-up rules', () => {
  test('free appointments confirm automatically', () => expect(followUpStatus(0)).toBe('confirmed'));
  test('paid appointments wait for client payment', () => expect(followUpStatus(1500)).toBe('awaiting-payment'));
  test('available promo reduces the amount due', () => expect(followUpTotal(1500, 'FOLLOWUP20')).toBe(1200));
  test('client promo covering the full fee needs no payment', () => expect(followUpTotal(1500, 'CARE100')).toBe(0));
  test('unrecognized promo never discounts the fee', () => expect(followUpTotal(1500, 'invalid')).toBe(1500));
});