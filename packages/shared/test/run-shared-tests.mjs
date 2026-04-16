import assert from 'node:assert/strict';
import {
    applyManualSortOrder,
    compareApplicationsByDeadline,
    compareApplicationsByStatus,
    createApplicationSubmission,
    createEmptyApplicationDraft,
    createFirestorePayload,
    createImportedApplications,
    createLocalApplication,
    normalizeImportedApplication,
    normalizeRequirements,
    sortApplications
} from '../src/applications.js';
import {
    formatDeadlineDate,
    formatReadableDate,
    formatReadableTime,
    getBackupDateStamp,
    getDaysUntilDeadline,
    toDateInputValue
} from '../src/dates.js';
import { mapImportedCsvRow, parseImportedJson } from '../src/imports.js';
import {
    APPLICATION_STATUSES,
    STATUS_COLORS,
    STATUS_FILTER_OPTIONS,
    getStatusColor
} from '../src/statuses.js';

const tests = [];

const test = (name, fn) => {
    tests.push({ name, fn });
};

test('createEmptyApplicationDraft returns the canonical blank draft', () => {
    assert.deepEqual(createEmptyApplicationDraft(), {
        university: '',
        program: '',
        department: '',
        country: '',
        status: 'Not Started',
        deadline: '',
        website: '',
        qsRanking: '',
        requirements: [],
        notes: '',
        refereeEmail: '',
        documents: []
    });
});

test('normalizeRequirements trims arrays and comma-separated strings', () => {
    assert.deepEqual(normalizeRequirements([' TOEFL ', '', 'GRE']), ['TOEFL', 'GRE']);
    assert.deepEqual(normalizeRequirements(' TOEFL, GRE , '), ['TOEFL', 'GRE']);
    assert.deepEqual(normalizeRequirements(null), []);
});

test('normalizeImportedApplication validates required fields and normalizes shape', () => {
    assert.equal(normalizeImportedApplication({ university: 'Only one field' }), null);

    assert.deepEqual(
        normalizeImportedApplication({
            university: ' MIT ',
            program: ' CS ',
            requirements: ' TOEFL, GRE ',
            website: ' example.com ',
            country: ' USA '
        }),
        {
            university: 'MIT',
            program: 'CS',
            deadline: '',
            status: 'Not Started',
            notes: '',
            country: 'USA',
            department: '',
            website: 'example.com',
            qsRanking: '',
            requirements: ['TOEFL', 'GRE'],
            refereeEmail: '',
            documents: [],
            sortOrder: undefined
        }
    );
});

test('createApplicationSubmission normalizes payload and applies timestamps', () => {
    const now = new Date('2026-03-20T10:00:00.000Z');
    const submission = createApplicationSubmission(
        {
            university: 'Stanford',
            program: 'Physics',
            requirements: ' TOEFL, GRE '
        },
        {
            now,
            file: { name: 'cv.pdf' }
        }
    );

    assert.deepEqual(submission, {
        university: 'Stanford',
        program: 'Physics',
        deadline: '',
        status: 'Not Started',
        notes: '',
        country: '',
        department: '',
        website: '',
        qsRanking: '',
        requirements: ['TOEFL', 'GRE'],
        refereeEmail: '',
        documents: [],
        sortOrder: undefined,
        createdAt: '2026-03-20T10:00:00.000Z',
        updatedAt: '2026-03-20T10:00:00.000Z',
        file: { name: 'cv.pdf' }
    });
});

test('createLocalApplication and createFirestorePayload apply fallback sort order', () => {
    assert.deepEqual(
        createLocalApplication({ university: 'A' }, { id: '1', fallbackSortOrder: 3 }),
        { university: 'A', sortOrder: 3, id: '1' }
    );

    assert.deepEqual(
        createFirestorePayload({ id: '1', university: 'A' }, 4),
        { university: 'A', sortOrder: 4 }
    );
});

test('createImportedApplications and applyManualSortOrder assign deterministic sort order', () => {
    const imported = createImportedApplications(
        [{ university: 'A' }, { university: 'B', sortOrder: 9 }],
        {
            startingSortOrder: 5,
            idFactory: (index) => `generated-${index}`
        }
    );

    assert.deepEqual(imported, [
        { university: 'A', id: 'generated-0', sortOrder: 5 },
        { university: 'B', sortOrder: 9, id: 'generated-1' }
    ]);

    assert.deepEqual(
        applyManualSortOrder([{ id: 'b' }, { id: 'a', sortOrder: 99 }]),
        [{ id: 'b', sortOrder: 0 }, { id: 'a', sortOrder: 1 }]
    );
});

test('sortApplications and comparators sort consistently', () => {
    const apps = [
        { id: '2', sortOrder: 2, deadline: '2026-04-01', status: 'Submitted' },
        { id: '1', sortOrder: 1, deadline: '2026-03-01', status: 'Accepted' },
        { id: '3', deadline: '', status: 'Rejected' }
    ];

    assert.deepEqual(sortApplications(apps).map((app) => app.id), ['1', '2', '3']);
    assert.ok(compareApplicationsByDeadline(apps[1], apps[0], 'asc') < 0);
    assert.ok(compareApplicationsByStatus(apps[1], apps[0], 'asc') < 0);
});

test('date helpers format stable strings', () => {
    const date = new Date('2026-03-20T10:15:00.000Z');

    assert.equal(getBackupDateStamp(date), '2026-03-20');
    assert.equal(toDateInputValue(date), '2026-03-20');
    assert.equal(formatDeadlineDate('2026-03-20'), '20-03-2026');
});

test('readable date/time helpers handle fallback cases', () => {
    assert.equal(formatReadableDate('invalid', 'Fallback'), 'Fallback');
    assert.equal(formatReadableTime('invalid', false, 'Fallback'), 'Fallback');
    assert.equal(formatReadableTime('2026-03-20T10:15:00.000Z', true), 'All Day');
});

test('getDaysUntilDeadline returns day delta or null', () => {
    const now = new Date('2026-03-20T00:00:00.000Z');

    assert.equal(getDaysUntilDeadline('2026-03-21T00:00:00.000Z', now), 1);
    assert.equal(getDaysUntilDeadline('', now), null);
    assert.equal(getDaysUntilDeadline('invalid', now), null);
});

test('parseImportedJson returns arrays and falls back to empty array for objects', () => {
    assert.deepEqual(parseImportedJson('[{"university":"MIT"}]'), [{ university: 'MIT' }]);
    assert.deepEqual(parseImportedJson('{"university":"MIT"}'), []);
});

test('mapImportedCsvRow maps valid rows and rejects empty ones', () => {
    assert.equal(mapImportedCsvRow({ University: '' }), null);

    assert.deepEqual(
        mapImportedCsvRow({
            Name: 'Cambridge',
            Program: 'Physics',
            Deadline: '2026-12-01',
            Status: 'Submitted',
            Notes: 'Priority'
        }),
        {
            university: 'Cambridge',
            program: 'Physics',
            deadline: '2026-12-01',
            status: 'Submitted',
            notes: 'Priority',
            files: []
        }
    );
});

test('status exports stay aligned', () => {
    assert.equal(APPLICATION_STATUSES[0], 'Not Started');
    assert.deepEqual(STATUS_FILTER_OPTIONS, ['All', ...APPLICATION_STATUSES]);
    assert.equal(STATUS_COLORS.Accepted, '#22c55e');
    assert.equal(getStatusColor('Submitted'), '#3b82f6');
    assert.equal(getStatusColor('Unknown'), '#64748b');
});

let failures = 0;

for (const { name, fn } of tests) {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`FAIL ${name}`);
        console.error(error);
    }
}

if (failures > 0) {
    console.error(`\n${failures} shared test(s) failed.`);
    process.exit(1);
}

console.log(`\nAll ${tests.length} shared tests passed.`);
