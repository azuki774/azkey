/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, Scope } from '@nestjs/common';
import type { Packed } from '@/misc/json-schema.js';
import { MetaService } from '@/core/MetaService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { NoteStreamingHidingService } from '../NoteStreamingHidingService.js';
import { bindThis } from '@/decorators.js';
import { RoleService } from '@/core/RoleService.js';
import { isRenotePacked, isQuotePacked } from '@/misc/is-renote.js';
import type { JsonObject } from '@/misc/json-value.js';
import Channel, { type ChannelRequest } from '../channel.js';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class GlobalTimelineChannel extends Channel {
	public readonly chName = 'globalTimeline';
	public static shouldShare = false;
	public static requireCredential = false as const;
	private withRenotes: boolean;
	private withFiles: boolean;

	private canSee(note: Packed<'Note'>): boolean {
		// Global TL の API と同じ visibility ルールをストリーミングにも適用し、
		// 非公開ノートが権限のない接続に流出したり、逆に閲覧権のあるノートが欠落したりしないようにする。
		// まず public/followers/specified の共通ルールでフィルタしたあと、最後に home だけ追加条件（自分自身 or フォロー済み）を課している。
		if (note.visibility === 'public') return true;
		if (note.visibility === 'home') {
			if (!this.user) return false;
			return note.userId === this.user.id || Object.hasOwn(this.following, note.userId);
		}
		if (note.visibility === 'specified') {
			if (!this.user) return false;
			if (note.userId === this.user.id) return true;
			return note.visibleUserIds?.includes(this.user.id) ?? false;
		}
		if (note.visibility === 'followers') {
			if (!this.user) return false;
			if (note.userId === this.user.id) return true;
			if (note.reply && note.reply.userId === this.user.id) return true;
			if (note.mentions?.includes(this.user.id)) return true;
			return Object.hasOwn(this.following, note.userId);
		}
		return false;
	}

	constructor(
		@Inject(REQUEST)
		request: ChannelRequest,

		private metaService: MetaService,
		private roleService: RoleService,
		private noteEntityService: NoteEntityService,
		private noteStreamingHidingService: NoteStreamingHidingService,
	) {
		super(request);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: JsonObject) {
		const policies = await this.roleService.getUserPolicies(this.user ? this.user.id : null);
		if (!policies.gtlAvailable) return;

		this.withRenotes = !!(params.withRenotes ?? true);
		this.withFiles = !!(params.withFiles ?? false);

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		if (this.withFiles && (note.fileIds == null || note.fileIds.length === 0)) return;

		if (!this.canSee(note)) return;
		if (note.channelId != null) return;
		if (note.user.requireSigninToViewContents && this.user == null) return;
		if (note.renote && note.renote.user.requireSigninToViewContents && this.user == null) return;
		if (note.reply && note.reply.user.requireSigninToViewContents && this.user == null) return;

		if (isRenotePacked(note) && !isQuotePacked(note) && !this.withRenotes) return;

		if (this.isNoteMutedOrBlocked(note)) return;

		const { shouldSkip } = await this.noteStreamingHidingService.processHiding(note, this.user?.id ?? null);
		if (shouldSkip) return;

		if (this.user) {
			if (isRenotePacked(note) && !isQuotePacked(note)) {
				if (note.renote && Object.keys(note.renote.reactions).length > 0) {
					const myRenoteReaction = await this.noteEntityService.populateMyReaction(note.renote, this.user.id);
					note.renote.myReaction = myRenoteReaction;
				}
			}
		}

		this.send('note', note);
	}

	@bindThis
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}
