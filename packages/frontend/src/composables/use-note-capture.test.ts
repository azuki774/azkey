/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';

vi.mock('@@/js/interval.js', () => ({ createVisibilityAwareInterval: vi.fn() }));
vi.mock('@/stream.js', () => ({ useStream: vi.fn() }));
vi.mock('@/i.js', () => ({ $i: { id: 'me' } }));
vi.mock('@/store.js', () => ({ store: { s: { realtimeMode: true } } }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));
vi.mock('@/preferences.js', () => ({ prefer: { s: { pollingInterval: 3 } } }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: vi.fn() } }));

import { noteEvents, useNoteCapture } from './use-note-capture.js';

const note = {
	id: 'note', createdAt: new Date().toISOString(), reactions: { ':old@origin.example:': 1 }, reactionCount: 1,
	reactionEmojis: { old: 'https://origin.example/old.png' }, myReaction: ':old@origin.example:', poll: null,
} as any;

describe('useNoteCapture reaction state', () => {
	test('keeps a snapshot reaction when a delayed unreacted event targets the previous reaction', () => {
		const { $note } = useNoteCapture({ note, parentNote: null, mock: true });
		noteEvents.emit('reactionState:note', {
			reactions: { ':new@origin.example:': 1 },
			reactionEmojis: { new: 'https://origin.example/new.png' },
			myReaction: ':new@origin.example:',
		});
		noteEvents.emit('unreacted:note', { userId: 'me', reaction: ':old@origin.example:' });

		expect($note.myReaction).toBe(':new@origin.example:');
		expect($note.reactions).toEqual({ ':new@origin.example:': 1 });
	});

	test('does not double count a stream event already represented by the snapshot', () => {
		const { $note } = useNoteCapture({ note, parentNote: null, mock: true });
		noteEvents.emit('reacted:note', { userId: 'me', reaction: ':new@origin.example:' });
		noteEvents.emit('reactionState:note', {
			reactions: { ':new@origin.example:': 1 }, reactionEmojis: {}, myReaction: ':new@origin.example:',
		});
		noteEvents.emit('reacted:note', { userId: 'me', reaction: ':new@origin.example:' });
		expect($note.reactionCount).toBe(1);
		expect($note.myReaction).toBe(':new@origin.example:');
	});

	test('uses a fallback result from the snapshot and applies a confirmed cancellation', () => {
		const { $note } = useNoteCapture({ note, parentNote: null, mock: true });
		noteEvents.emit('reactionState:note', {
			reactions: { '❤': 1 }, reactionEmojis: {}, myReaction: '❤',
		});
		noteEvents.emit('unreacted:note', { userId: 'me', reaction: '❤' });
		expect($note.myReaction).toBeNull();
		expect($note.reactionCount).toBe(0);
	});
});
