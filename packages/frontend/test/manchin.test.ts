/*
 * SPDX-FileCopyrightText: 2026 AgR4y
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { createManchinText } from '@/utility/manchin.js';

describe('createManchinText', () => {
	test('マン のみ → チン', () => {
		expect(createManchinText('マン')).toBe('チン');
	});

	test('チン のみ → マン', () => {
		expect(createManchinText('チン')).toBe('マン');
	});

	test('まん のみ → ちん', () => {
		expect(createManchinText('まん')).toBe('ちん');
	});

	test('ちん のみ → まん', () => {
		expect(createManchinText('ちん')).toBe('まん');
	});

	test('マンチン → チンマン（相互入れ替え）', () => {
		expect(createManchinText('マンチン')).toBe('チンマン');
	});

	test('まんちん → ちんまん（相互入れ替え）', () => {
		expect(createManchinText('まんちん')).toBe('ちんまん');
	});

	test('カタカナとひらがな混在: マンとちん → チンとまん', () => {
		expect(createManchinText('マンとちん')).toBe('チンとまん');
	});

	test('該当なし → null を返す', () => {
		expect(createManchinText('全然関係ない文章')).toBeNull();
	});

	test('空文字列 → null を返す', () => {
		expect(createManchinText('')).toBeNull();
	});

	test('ハッシュタグ内の文字は変換されない', () => {
		expect(createManchinText('#マンガ大好き')).toBeNull();
	});

	test('ハッシュタグとテキストの混在', () => {
		expect(createManchinText('#マンガ マンが好き')).toBe('#マンガ チンが好き');
	});

	test('URL 部分（mfm-js が URL と認識する範囲）は変換されない', () => {
		expect(createManchinText('https://example.com/マン マンを見て')).toBe('https://example.com/マン チンを見て');
	});

	test('英数字のみの URL は完全に保全される', () => {
  		expect(createManchinText('https://example.com/page マンが好き')).toBe('https://example.com/page チンが好き');
	});

	test('メンション内は変換されない', () => {
		expect(createManchinText('@manuser まんが好き')).toBe('@manuser ちんが好き');
	});

	test('すべて特殊ノードのみの場合は null を返す', () => {
		expect(createManchinText('#マンガ @manuser')).toBeNull();
	});

	test('MFM 太字内のテキストは変換される', () => {
		expect(createManchinText('**マンが好き**')).toBe('**チンが好き**');
	});

	test('MFM スケール内のテキストは変換される', () => {
		expect(createManchinText('$[scale.x=2 マン]')).toBe('$[scale.x=2 チン]');
	});
});
