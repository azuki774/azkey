/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileScript, parse, registerTS } from 'vue/compiler-sfc';
import ts from 'typescript';
import { parseSync, transformSync } from 'rolldown/utils';
import { RolldownMagicString } from 'rolldown';
import { unwindCssModuleClassName } from '../../lib/rollup-plugin-unwind-css-module-class-name.js';

registerTS(() => ts);

const frontendRoot = resolve(import.meta.dirname, '../..');

function compileAndUnwind(filename: string, cssModuleKeys: string[]): string {
	const source = readFileSync(filename, 'utf8');
	const { descriptor, errors } = parse(source, { filename });
	if (errors.length > 0) throw errors[0];

	const compiled = compileScript(descriptor, {
		id: filename,
		genDefaultAs: '_sfc_main',
		inlineTemplate: true,
		isProd: true,
		fs: {
			fileExists: existsSync,
			readFile: (path: string) => readFileSync(path, 'utf8'),
			realpath: realpathSync,
		},
	});
	const javascript = transformSync('component.ts', compiled.content).code;
	const cssModule = cssModuleKeys
		.map((key) => `${JSON.stringify(key)}: ${JSON.stringify(`sentinel-${key}`)}`)
		.join(', ');
	const bundled = `${javascript}
const cssModules = { "$style": { ${cssModule} } };
const _wrapped = _export_sfc(_sfc_main, [["__cssModules", cssModules]]);
`;

	const ast = parseSync('component.js', bundled).program;
	const magicString = new RolldownMagicString(bundled);
	unwindCssModuleClassName(ast, magicString);
	const output = magicString.toString();
	expect(output).not.toContain('__cssModules');
	// Inspect the component, not the unused metadata containing every sentinel.
	return output.slice(0, output.indexOf('const cssModules ='));
}

describe('timeline CSS modules in production output', () => {
	it('keeps the date separator class in MkNotesTimeline', () => {
		const output = compileAndUnwind(resolve(frontendRoot, 'src/components/MkNotesTimeline.vue'), [
			'root',
			'noGap',
			'date',
			'note',
			'ad',
		]);

		expect(output).toContain('"sentinel-date"');
		expect(output).toContain('"sentinel-root"');
		expect(output).toContain('"sentinel-noGap"');
		expect(output).toContain('"_gaps"');
		expect(output).toContain('useGapMode.value');
		expect(output).not.toContain('useCssModule');
		expect(output).not.toContain('__cssModules');
		expect(output).not.toMatch(/\$style(?:\.|\[)/);
	});

	it('selects every static spacing class in MkStreamingNotesTimeline', () => {
		const output = compileAndUnwind(resolve(frontendRoot, 'src/components/MkStreamingNotesTimeline.vue'), [
			'new',
			'newBg1',
			'newBg2',
			'newButton',
			'notes',
			'spacing_extremelyNarrow',
			'spacing_narrow',
			'spacing_normal',
			'spacing_wide',
			'transition_x_enterActive',
			'transition_x_leaveActive',
			'transition_x_enterFrom',
			'transition_x_leaveTo',
			'transition_x_move',
			'date',
			'note',
			'ad',
			'more',
		]);

		for (const mode of ['extremelyNarrow', 'narrow', 'normal', 'wide']) {
			expect(output).toContain(`"sentinel-spacing_${mode}"`);
			expect(output).toMatch(new RegExp(`noteSpacing\\.value === ["']${mode}["']`));
		}
		expect(output).toContain('"sentinel-date"');
		expect(output).not.toContain('noteSpacingClass');
		expect(output).not.toContain('useCssModule');
		expect(output).not.toContain('__cssModules');
		expect(output).not.toMatch(/\$style(?:\.|\[)/);
	});
});
