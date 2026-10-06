import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseIssueTitle } from './series-issue';

test('splits masthead, number and headline around the separator', () => {
  assert.deepEqual(parseIssueTitle('FE Bits Vol.35 | Deno 2.8 发布，CSS 2026 新特性梳理'), {
    masthead: 'FE Bits',
    number: '35',
    headline: 'Deno 2.8 发布，CSS 2026 新特性梳理',
  });
  assert.deepEqual(parseIssueTitle('余弦杂谈 Vol.36 | 给自己充个电'), {
    masthead: '余弦杂谈',
    number: '36',
    headline: '给自己充个电',
  });
});

test('keeps separators inside the headline', () => {
  assert.equal(parseIssueTitle('Weekly #12 - React 20 | RSC 再谈').headline, 'React 20 | RSC 再谈');
  assert.equal(parseIssueTitle('周刊第 3 期：A：B').headline, 'A：B');
});

test('falls back to the whole title without a headline or a number', () => {
  assert.deepEqual(parseIssueTitle('FE Bits Vol.16'), { masthead: 'FE Bits', number: '16', headline: 'FE Bits Vol.16' });
  assert.deepEqual(parseIssueTitle('周刊第 1 期'), { masthead: '周刊', number: '1', headline: '周刊第 1 期' });
  assert.equal(parseIssueTitle('Nano 3').number, null);
  assert.deepEqual(parseIssueTitle('一次随手记'), { masthead: '', number: null, headline: '一次随手记' });
});
