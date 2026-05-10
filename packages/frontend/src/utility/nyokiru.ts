/*
 * SPDX-FileCopyrightText: 2026 azuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

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

export function createNyokiruText(text: string): string {
	const match = /^(.*?)([0-9]+|[０-９]+)$/s.exec(text);
	if (!match) {
		return `${text}2`;
	}

	const trailingNumber = match[2];
	const incremented = incrementAsciiInteger(fullWidthDigitsToAscii(trailingNumber));
	return `${match[1]}${/^[０-９]+$/.test(trailingNumber) ? asciiDigitsToFullWidth(incremented) : incremented}`;
}
