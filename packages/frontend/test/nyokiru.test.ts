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

	test('handles empty text', () => {
		expect(createNyokiruText('')).toBe('2');
	});
});
