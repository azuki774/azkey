/*
 * SPDX-FileCopyrightText: 2026 azuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';

const nyokiruSuffixes = ['', ' ', '\n'] as const;

function incrementAsciiInteger(digits: string): string {
	let carry = 1;
	let result = '';

	for (let i = digits.length - 1; i >= 0; i--) {
		const sum = (digits.charCodeAt(i) - 48) + carry;
		result = String(sum % 10) + result;
		carry = sum >= 10 ? 1 : 0;
	}

	if (carry > 0) {
		result = '1' + result;
	}

	return result.replace(/^0+/, '') || '0';
}

function fullWidthDigitsToAscii(digits: string): string {
	return digits.replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xFF10));
}

function asciiDigitsToFullWidth(digits: string): string {
	return digits.replace(/[0-9]/g, digit => String.fromCharCode(digit.charCodeAt(0) + 0xFF10 - 0x30));
}

function isSameMfmNode(a: mfm.MfmNode, b: mfm.MfmNode): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

function keepsParsedPrefix(base: mfm.MfmNode[], candidate: mfm.MfmNode[]): boolean {
	if (base.length === 0 || candidate.length < base.length) return false;

	for (let i = 0; i < base.length - 1; i++) {
		if (!isSameMfmNode(base[i], candidate[i])) return false;
	}

	const baseLast = base[base.length - 1];
	const candidateLast = candidate[base.length - 1];
	if (isSameMfmNode(baseLast, candidateLast)) return true;

	return baseLast.type === 'text' &&
		candidateLast.type === 'text' &&
		candidateLast.props.text.startsWith(baseLast.props.text);
}

function getNyokiruSuffix(text: string): typeof nyokiruSuffixes[number] {
	const base = mfm.parse(text);

	for (const suffix of nyokiruSuffixes) {
		if (keepsParsedPrefix(base, mfm.parse(`${text}${suffix}2`))) {
			return suffix;
		}
	}

	return '';
}

function shouldIncrementTrailingNumber(text: string, trailingNumber: string): boolean {
	const nodes = mfm.parse(text);
	const lastNode = nodes.at(-1);
	return lastNode?.type === 'text' && lastNode.props.text.endsWith(trailingNumber);
}

export function createNyokiruText(text: string): string {
	const match = /^(.*?)([0-9]+|[０-９]+)$/s.exec(text);
	if (!match) return `${text}${getNyokiruSuffix(text)}2`;
	if (!shouldIncrementTrailingNumber(text, match[2])) return `${text}${getNyokiruSuffix(text)}2`;

	const trailingNumber = match[2];
	const incremented = incrementAsciiInteger(fullWidthDigitsToAscii(trailingNumber));
	return `${match[1]}${/^[０-９]+$/.test(trailingNumber) ? asciiDigitsToFullWidth(incremented) : incremented}`;
}
