/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-FileCopyrightText: 2025 azuki774
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { AsyncLocalStorage } from 'node:async_hooks';

type TraceStore = {
	traceId?: string;
};

const traceContext = new AsyncLocalStorage<TraceStore>();

export function runWithTraceId<T>(traceId: string, callback: () => T): T {
	return traceContext.run({ traceId }, callback);
}

export function getCurrentTraceId(): string | undefined {
	return traceContext.getStore()?.traceId;
}
