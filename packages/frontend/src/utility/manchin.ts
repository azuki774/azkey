/*
 * SPDX-FileCopyrightText: 2026 AgR4y
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';

function swapManchin(text: string): { result: string; changed: boolean } {
	let changed = false;
	const result = text
		.replace(/マン|チン/g, (m) => { changed = true; return m === 'マン' ? 'チン' : 'マン'; })
		.replace(/まん|ちん/g, (m) => { changed = true; return m === 'まん' ? 'ちん' : 'まん'; });
	return { result, changed };
}

function transformNodes(nodes: mfm.MfmNode[]): { nodes: mfm.MfmNode[]; changed: boolean } {
	let changed = false;
	const result = nodes.map((node) => {
		if (node.type === 'text') {
			const { result: newText, changed: nodeChanged } = swapManchin(node.props.text);
			if (nodeChanged) {
				changed = true;
				return { ...node, props: { text: newText } } as mfm.MfmNode;
			}
			return node;
		}
		if ('children' in node && node.children != null) {
			const { nodes: newChildren, changed: childChanged } = transformNodes(node.children as mfm.MfmNode[]);
			if (childChanged) {
				changed = true;
				return { ...node, children: newChildren } as mfm.MfmNode;
			}
		}
		return node;
	});
	return { nodes: result, changed };
}

export function createManchinText(text: string): string | null {
	if (text.length === 0) return null;
	const nodes = mfm.parse(text);
	const { nodes: transformed, changed } = transformNodes(nodes);
	if (!changed) return null;
	return mfm.toString(transformed);
}
