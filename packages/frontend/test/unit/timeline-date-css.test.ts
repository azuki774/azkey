/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileScript, compileStyleAsync, parse, registerTS } from 'vue/compiler-sfc';
import ts from 'typescript';
import { parseSync, transformSync } from 'rolldown/utils';
import { RolldownMagicString } from 'rolldown';
import { walk } from 'oxc-walker';
import { compileString } from 'sass-embedded';
import { unwindCssModuleClassName } from '../../lib/rollup-plugin-unwind-css-module-class-name.js';

registerTS(() => ts);

describe('timeline date separator in production output', () => {
	it.each(['MkNotesTimeline', 'MkStreamingNotesTimeline'])('preserves the date class in %s', async (component) => {
		const filename = resolve(import.meta.dirname, `../../src/components/${component}.vue`);
		const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
		const style = descriptor.styles.find((block) => block.module);
		if (!style) throw new Error('Timeline CSS module not found');
		// Derive the class map from the real stylesheet instead of maintaining a
		// list of unrelated spacing, animation, note, and advertisement classes.
		const css = await compileStyleAsync({
			filename,
			id: component,
			source: compileString(style.content, { url: pathToFileURL(filename) }).css,
			modules: true,
		});
		expect(css.errors).toEqual([]);
		const dateClass = css.modules?.date;
		expect(dateClass).toBeTruthy();

		const compiled = compileScript(descriptor, {
			id: component,
			genDefaultAs: '_sfc_main',
			inlineTemplate: true,
			isProd: true,
			fs: {
				fileExists: existsSync,
				readFile: (path) => readFileSync(path, 'utf8'),
				realpath: realpathSync,
			},
		});
		const javascript = transformSync('component.ts', compiled.content).code;
		const bundled = `${javascript}
const cssModules = { "$style": ${JSON.stringify(css.modules)} };
const _wrapped = _export_sfc(_sfc_main, [["__cssModules", cssModules]]);
`;
		const magicString = new RolldownMagicString(bundled);
		unwindCssModuleClassName(parseSync('component.js', bundled).program, magicString);
		// Check class attributes, not unused metadata or compiler-specific
		// variable names. Spacing selection is outside this regression's scope.
		const classes: string[] = [];
		walk(parseSync('output.js', magicString.toString()).program, {
			enter(node) {
				if (node.type !== 'Property') return;
				const key = node.key.type === 'Identifier' ? node.key.name : node.key.type === 'Literal' ? node.key.value : null;
				if (key !== 'class') return;
				walk(node.value, {
					enter(value) {
						if (value.type === 'Literal' && typeof value.value === 'string') {
							classes.push(...value.value.split(/\s+/));
						}
					},
				});
			},
		});
		expect(classes).toContain(dateClass);
	});
});
