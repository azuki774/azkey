/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { h, render } from 'vue';
import { describe, expect, test, vi } from 'vitest';
import { createMfmRenderer } from '@@/js/mfm-renderer.js';

function renderEmojiNote(text: string, options: { isNote?: boolean; advancedMfm?: boolean; enlargeEmojiOnlyNotes?: boolean } = {}) {
	const Emoji = (props: { emoji?: string; name?: string }) => h('span', { class: 'emoji' }, props.emoji ?? `:${props.name}:`);
	const Mfm = createMfmRenderer({
		components: () => ({ Url: Emoji, Link: Emoji, Mention: Emoji, A: Emoji, Time: Emoji, Emoji, CustomEmoji: Emoji }),
		getOptions: () => ({ advancedMfm: options.advancedMfm ?? true, animatedMfm: false }),
		enlargeEmojiOnlyNotes: options.enlargeEmojiOnlyNotes ?? true,
	});
	const container = document.createElement('div');
	render(Mfm({ text, isNote: options.isNote ?? true }, { emit: vi.fn() }) ?? null, container);
	const result = {
		enlarged: container.querySelectorAll('.mfm-x3 > .emoji').length,
		emojis: container.querySelectorAll('.emoji').length,
	};
	render(null, container);
	return result;
}

describe('MFM emoji-only note enlargement', () => {
	test('enlarges up to five mixed custom and Unicode emoji, ignoring whitespace and zero-width spaces', () => {
		expect(renderEmojiNote('😀 :blob: \u200B😀\n:blob: 😀')).toEqual({ enlarged: 5, emojis: 5 });
	});

	test('does not enlarge six emoji', () => {
		expect(renderEmojiNote('😀 😀 😀 😀 😀 😀')).toEqual({ enlarged: 0, emojis: 6 });
	});

	test('does not enlarge emoji mixed with text or formatting', () => {
		expect(renderEmojiNote('hello 😀')).toEqual({ enlarged: 0, emojis: 1 });
		expect(renderEmojiNote('**😀**')).toEqual({ enlarged: 0, emojis: 1 });
	});

	test('does not enlarge non-note content or when advanced MFM is disabled', () => {
		expect(renderEmojiNote('😀', { isNote: false })).toEqual({ enlarged: 0, emojis: 1 });
		expect(renderEmojiNote('😀', { advancedMfm: false })).toEqual({ enlarged: 0, emojis: 1 });
	});

	test('leaves renderers that do not opt in at normal size', () => {
		expect(renderEmojiNote('😀', { enlargeEmojiOnlyNotes: false })).toEqual({ enlarged: 0, emojis: 1 });
	});
});
