/*
 * SPDX-FileCopyrightText: 2026 azuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { domainToASCII } from 'node:url';
import { describe, test, vi } from 'vitest';
import { ApNoteService } from '@/core/activitypub/models/ApNoteService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import type { IApEmoji, IObject } from '@/core/activitypub/type.js';

const emoji = (host: string, originalUrl = 'https://origin.example/emoji.png') => ({
	id: 'emoji-id', host, name: 'blob', uri: 'https://origin.example/emojis/blob',
	originalUrl, publicUrl: originalUrl, updatedAt: new Date('2020-01-01'), aliases: [], license: null,
});

function service(existing: ReturnType<typeof emoji> | null = null, local = new Map()) {
	const repository = {
		findOneBy: vi.fn().mockResolvedValue(existing),
		findOneByOrFail: vi.fn().mockResolvedValue(existing),
		update: vi.fn(),
		insertOne: vi.fn().mockImplementation(async value => value),
	};
	const instance = Object.assign(Object.create(ApNoteService.prototype), {
		emojisRepository: repository,
		utilityService: {
			toPuny: (host: string) => domainToASCII(host.toLowerCase()),
			toPunyNullable: (host: string | null) => host == null ? null : domainToASCII(host.toLowerCase()),
			isSelfHost: (host: string | null) => host === 'local.test',
		},
		customEmojiService: { localEmojisCache: { fetch: vi.fn().mockResolvedValue(local) } },
		idService: { gen: () => 'new-id' },
		logger: { info: vi.fn() },
	}) as ApNoteService;
	return { instance, repository };
}

const tag = (overrides: Partial<IApEmoji> = {}): IApEmoji => ({
	type: 'Emoji', name: ':blob:', updated: '2025-01-01T00:00:00.000Z',
	icon: { url: 'https://origin.example/emoji.png' }, ...overrides,
});

describe('ApNoteService.resolveReactionEmoji', () => {
	test('uses tag.host and does not let a relay overwrite an existing emoji', async () => {
		const { instance, repository } = service(emoji('origin.example', 'https://origin.example/current.png'));
		const result = await instance.resolveReactionEmoji(tag({ host: 'origin.example' }), ':blob:', 'relay.example');
		assert.strictEqual(result?.host, 'origin.example');
		assert.strictEqual(repository.update.mock.calls.length, 0);
	});

	test('allows the origin host to refresh its emoji metadata', async () => {
		const { instance, repository } = service(emoji('origin.example', 'https://origin.example/old.png'));
		await instance.resolveReactionEmoji(tag({ host: 'origin.example' }), ':blob:', 'origin.example');
		assert.strictEqual(repository.update.mock.calls.length, 1);
	});

	test('falls back from an invalid host to the Emoji URI host', async () => {
		const { instance } = service();
		const result = await instance.resolveReactionEmoji(tag({ host: '', id: 'https://origin.example/emojis/blob' }), ':blob:', 'relay.example');
		assert.strictEqual(result?.host, 'origin.example');
	});

	test('treats @. as the remote actor host', async () => {
		const { instance } = service();
		const result = await instance.resolveReactionEmoji(tag({ name: ':blob@.:' }), ':blob@.:', 'origin.example');
		assert.strictEqual(result?.host, 'origin.example');
	});

	test('rejects ambiguous and non-Emoji tags', async () => {
		const { instance, repository } = service();
		const result = await instance.resolveReactionEmoji([
			tag({ host: 'one.example' }), tag({ host: 'two.example' }), { type: 'Hashtag', name: ':blob:' },
		], ':blob:', 'relay.example');
		assert.strictEqual(result, null);
		assert.strictEqual(repository.insertOne.mock.calls.length, 0);
	});

	test('uses tag.name host, then actor host when no origin is present', async () => {
		const { instance } = service();
		assert.strictEqual((await instance.resolveReactionEmoji(tag({ name: ':blob@origin.example:' }), ':blob:', 'relay.example'))?.host, 'origin.example');
		assert.strictEqual((await instance.resolveReactionEmoji(tag({ id: undefined }), ':blob:', 'actor.example'))?.host, 'actor.example');
	});

	test('does not register a self-host emoji that is not already local', async () => {
		const { instance, repository } = service();
		const result = await instance.resolveReactionEmoji(tag({ host: 'local.test' }), ':blob:', 'relay.example');
		assert.strictEqual(result, null);
		assert.strictEqual(repository.insertOne.mock.calls.length, 0);
	});

	test('returns the concurrently inserted emoji without updating it', async () => {
		const existing = emoji('origin.example');
		const { instance, repository } = service();
		repository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
		repository.insertOne.mockRejectedValueOnce(new Error('duplicate'));
		assert.strictEqual(await instance.resolveReactionEmoji(tag({ host: 'origin.example' }), ':blob:', 'relay.example'), existing);
		assert.strictEqual(repository.update.mock.calls.length, 0);
	});

	test('ignores Unicode and mismatched-host tags while retaining one valid Emoji tag', async () => {
		const { instance } = service();
		assert.strictEqual(await instance.resolveReactionEmoji(tag(), '👍', 'relay.example'), null);
		const nonEmoji: IObject = { type: 'Hashtag', name: ':blob:' };
		assert.strictEqual((await instance.resolveReactionEmoji([
			tag({ name: ':blob@other.example:', icon: { url: 'x' } }), tag({ host: 'origin.example', icon: { url: 'x' } }), nonEmoji,
		], ':blob@origin.example:', 'relay.example'))?.host, 'origin.example');
	});
});

describe('ApRendererService remote reaction tags', () => {
	test('keeps the origin URI and host while sending :name: for Like and Undo', async () => {
		const remote = { ...emoji('origin.example'), localOnly: false, type: 'image/png' };
		const renderer = Object.assign(Object.create(ApRendererService.prototype), {
			config: { url: 'https://local.test' },
			utilityService: { isUriLocal: () => true },
			userEntityService: { genLocalUserUri: (id: string) => `https://local.test/users/${id}` },
			emojisRepository: { findOneBy: vi.fn().mockResolvedValue(remote) },
			customEmojiService: { localEmojisCache: { fetch: vi.fn().mockResolvedValue(new Map()) } },
		}) as ApRendererService;
		const like = await renderer.renderLike({ id: 'reaction', reaction: ':blob@origin.example:' } as any, { uri: 'https://note.example/note' });
		assert.strictEqual(like.content, ':blob:');
		assert.ok(Array.isArray(like.tag));
		const emojiTag = like.tag[0] as IApEmoji;
		assert.strictEqual(emojiTag.host, 'origin.example');
		assert.strictEqual(emojiTag.id, 'https://origin.example/emojis/blob');
		const undo = renderer.renderUndo(like, { id: 'user' } as any);
		if (typeof undo.object === 'string') throw new Error('Undo object must be the Like object');
		assert.strictEqual(undo.object.content, ':blob:');
	});
});
