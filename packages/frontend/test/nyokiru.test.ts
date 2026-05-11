/*
 * SPDX-FileCopyrightText: 2026 azuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { createNyokiruText } from '@/utility/nyokiru.js';

describe('createNyokiruText', () => {
	test('adds 2 when text has no trailing number', () => {
		expect(createNyokiruText('あいうえお')).toBe('あいうえお2');
	});

	test('increments a trailing 2', () => {
		expect(createNyokiruText('あいうえお2')).toBe('あいうえお3');
	});

	test('increments a trailing full-width 2 as full-width', () => {
		expect(createNyokiruText('あいうえお２')).toBe('あいうえお３');
	});

	test('carries a trailing 9', () => {
		expect(createNyokiruText('あいうえお9')).toBe('あいうえお10');
	});

	test('carries a trailing full-width 9 as full-width', () => {
		expect(createNyokiruText('あいうえお９')).toBe('あいうえお１０');
	});

	test('increments multiple digits', () => {
		expect(createNyokiruText('abc123')).toBe('abc124');
	});

	test('increments multiple full-width digits', () => {
		expect(createNyokiruText('abc１２３')).toBe('abc１２４');
	});

	test('does not preserve leading zeroes', () => {
		expect(createNyokiruText('abc02')).toBe('abc3');
	});

	test('does not preserve full-width leading zeroes', () => {
		expect(createNyokiruText('abc０２')).toBe('abc３');
	});

	test('ignores numbers that are not at the end', () => {
		expect(createNyokiruText('abc123def')).toBe('abc123def2');
	});

	test('adds 2 with a space after a custom emoji', () => {
		expect(createNyokiruText(':hoge:')).toBe(':hoge: 2');
	});

	test('adds 2 with a space after a hyphenated custom emoji', () => {
		expect(createNyokiruText(':hoge-foo:')).toBe(':hoge-foo: 2');
	});

	test('adds 2 with a space after text ending with a custom emoji', () => {
		expect(createNyokiruText('abc :hoge:')).toBe('abc :hoge: 2');
	});

	test('increments a number after a custom emoji when separated by a space', () => {
		expect(createNyokiruText(':hoge: 2')).toBe(':hoge: 3');
	});

	test('adds 2 with a space after a URL', () => {
		expect(createNyokiruText('https://example.com')).toBe('https://example.com 2');
	});

	test('adds 2 with a space after an http URL', () => {
		expect(createNyokiruText('http://example.com')).toBe('http://example.com 2');
	});

	test('adds 2 with a space after a URL ending with a number', () => {
		expect(createNyokiruText('https://example.com/path/1')).toBe('https://example.com/path/1 2');
	});

	test('adds 2 with a space after a mention', () => {
		expect(createNyokiruText('@alice')).toBe('@alice 2');
	});

	test('adds 2 with a space after a remote mention ending with a number', () => {
		expect(createNyokiruText('@alice@example.com2')).toBe('@alice@example.com2 2');
	});

	test('adds 2 with a space after a hashtag', () => {
		expect(createNyokiruText('#tag')).toBe('#tag 2');
	});

	test('adds 2 with a newline after a quote', () => {
		expect(createNyokiruText('> quote')).toBe('> quote\n2');
	});

	test('adds 2 with a newline after a code block', () => {
		expect(createNyokiruText('```\ncode\n```')).toBe('```\ncode\n```\n2');
	});

	test('adds 2 with a newline after a math block', () => {
		expect(createNyokiruText('\\[x+1\\]')).toBe('\\[x+1\\]\n2');
	});

	test('adds 2 with a newline after a search syntax', () => {
		expect(createNyokiruText('検索 [search]')).toBe('検索 [search]\n2');
	});

	test('adds 2 with a newline after a center tag', () => {
		expect(createNyokiruText('<center>text</center>')).toBe('<center>text</center>\n2');
	});

	test('handles empty text', () => {
		expect(createNyokiruText('')).toBe('2');
	});
});
