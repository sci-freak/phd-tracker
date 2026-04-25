#!/usr/bin/env node
/**
 * Static check: every relative import/require in the mobile source tree must
 * resolve to a real file on disk (matching Metro's resolution rules).
 *
 * This exists because the mobile package has no bundler invoked during
 * `npm run verify`, so a missing screen file (like RefereesScreen going
 * AWOL in Apr 2026) slips through until a developer actually runs Metro.
 *
 * Runs in zero dependencies; regex-based parser is good enough for JS/JSX.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(__dirname, '..', 'phd-tracker-v2', 'mobile');
const SCAN_ROOTS = [
    path.join(MOBILE_ROOT, 'App.js'),
    path.join(MOBILE_ROOT, 'index.js'),
    path.join(MOBILE_ROOT, 'src')
];
const IGNORED_DIRS = new Set(['node_modules', '.expo', 'android', 'ios', 'build', 'dist']);
const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
// Metro tries these suffixes before falling through to '' (directory / index)
const RESOLVE_SUFFIXES = [
    '',
    '.native.js', '.native.jsx', '.native.ts', '.native.tsx',
    '.ios.js', '.ios.jsx', '.ios.ts', '.ios.tsx',
    '.android.js', '.android.jsx', '.android.ts', '.android.tsx',
    '.web.js', '.web.jsx', '.web.ts', '.web.tsx',
    '.js', '.jsx', '.ts', '.tsx',
    '.json'
];
const INDEX_SUFFIXES = ['index.js', 'index.jsx', 'index.ts', 'index.tsx'];

const collectFiles = async (target) => {
    const files = [];
    const walk = async (entry) => {
        let info;
        try {
            info = await stat(entry);
        } catch {
            return;
        }
        if (info.isFile()) {
            if (CODE_EXTENSIONS.includes(path.extname(entry))) {
                files.push(entry);
            }
            return;
        }
        if (!info.isDirectory()) return;

        const children = await readdir(entry);
        await Promise.all(children.map(async (name) => {
            if (IGNORED_DIRS.has(name)) return;
            await walk(path.join(entry, name));
        }));
    };
    await walk(target);
    return files;
};

const IMPORT_REGEX = /(?:import\s+(?:[\s\S]*?)\s+from\s*|import\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*|require\s*\(\s*)(['"])([^'"\n]+)\1/g;

const extractRelativeSpecifiers = (source) => {
    const results = [];
    let match;
    // Strip comments cheaply to avoid matching inside them
    const cleaned = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
    while ((match = IMPORT_REGEX.exec(cleaned)) !== null) {
        const specifier = match[2];
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
            results.push(specifier);
        }
    }
    return results;
};

const resolveSpecifier = (fromFile, specifier) => {
    const base = path.resolve(path.dirname(fromFile), specifier);

    for (const suffix of RESOLVE_SUFFIXES) {
        const candidate = suffix ? `${base}${suffix}` : base;
        if (existsSync(candidate) && statSync(candidate).isFile()) {
            return candidate;
        }
    }

    if (existsSync(base) && statSync(base).isDirectory()) {
        for (const indexName of INDEX_SUFFIXES) {
            const candidate = path.join(base, indexName);
            if (existsSync(candidate) && statSync(candidate).isFile()) {
                return candidate;
            }
        }
    }

    return null;
};

const main = async () => {
    const targetFiles = [];
    for (const root of SCAN_ROOTS) {
        const found = await collectFiles(root);
        targetFiles.push(...found);
    }

    const errors = [];
    for (const file of targetFiles) {
        const source = await readFile(file, 'utf8');
        const specifiers = extractRelativeSpecifiers(source);
        for (const specifier of specifiers) {
            const resolved = resolveSpecifier(file, specifier);
            if (!resolved) {
                errors.push({ file, specifier });
            }
        }
    }

    if (errors.length > 0) {
        console.error(`\nUnresolved relative imports in mobile source (${errors.length}):\n`);
        for (const { file, specifier } of errors) {
            const rel = path.relative(MOBILE_ROOT, file).replace(/\\/g, '/');
            console.error(`  ${rel}  ->  ${specifier}`);
        }
        console.error('');
        process.exit(1);
    }

    console.log(`OK: ${targetFiles.length} mobile source files, all relative imports resolve.`);
};

main().catch((error) => {
    console.error('check-mobile-imports failed:', error);
    process.exit(1);
});
