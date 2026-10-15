import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeSpaces, parseCommand, substitute } from '../src/substitution.js';

describe('substitute: single trailing %%', () => {
    it('injects all arguments', () => {
        assert.equal(
            substitute('python manage.py runserver %%', ['0.0.0.0', '--settings=production']),
            'python manage.py runserver 0.0.0.0 --settings=production',
        );
    });

    it('injects one argument', () => {
        assert.equal(
            substitute('python manage.py runserver %%', ['0.0.0.0']),
            'python manage.py runserver 0.0.0.0',
        );
    });

    it('drops the placeholder and trailing space when there are no arguments', () => {
        assert.equal(substitute('python manage.py runserver %%', []), 'python manage.py runserver');
    });

    it('falls back to the default when there are no arguments', () => {
        assert.equal(substitute('python manage.py runserver %%{{0.0.0.0}}', []), 'python manage.py runserver 0.0.0.0');
    });
});

describe('substitute: single non-trailing %%', () => {
    it('injects only the first argument', () => {
        assert.equal(
            substitute('python manage.py runserver %% --settings=production', ['0.0.0.0']),
            'python manage.py runserver 0.0.0.0 --settings=production',
        );
    });

    it('drops extra arguments', () => {
        assert.equal(
            substitute('python manage.py runserver %% --settings=production', ['0.0.0.0', '--settings=staging']),
            'python manage.py runserver 0.0.0.0 --settings=production',
        );
    });

    it('removes surrounding space when there are no arguments', () => {
        assert.equal(
            substitute('python manage.py runserver %% --settings=production', []),
            'python manage.py runserver --settings=production',
        );
    });
});

describe('substitute: no placeholder', () => {
    it('returns the command unchanged', () => {
        assert.equal(substitute('python manage.py runserver', ['ignored']), 'python manage.py runserver');
    });
});

describe('substitute: multiple %%', () => {
    it('uses defaults when there are no arguments', () => {
        assert.equal(
            substitute('python manage.py runserver %%{{0.0.0.0}} --settings=%%{{production}}', []),
            'python manage.py runserver 0.0.0.0 --settings=production',
        );
    });

    it('replaces positionally', () => {
        assert.equal(
            substitute('python manage.py runserver %%{{0.0.0.0}} --settings=%%{{production}}', ['198.4.1.4', 'staging']),
            'python manage.py runserver 198.4.1.4 --settings=staging',
        );
    });

    it('drops extra arguments', () => {
        assert.equal(substitute('a %% b %%', ['1', '2', '3']), 'a 1 b 2');
    });

    it('falls back to empty when neither argument nor default is given', () => {
        assert.equal(substitute('a %% b %%{{x}}', ['1']), 'a 1 b x');
        assert.equal(substitute('a %% b %%', ['1']), 'a 1 b');
    });
});

describe('substitute: escaping', () => {
    it('turns \\%% into a literal %%', () => {
        assert.equal(substitute('echo \\%%', []), 'echo %%');
    });

    it('keeps escaped placeholders untouched', () => {
        assert.equal(substitute('echo \\%% and %%', ['x']), 'echo %% and x');
    });
});

describe('parseCommand', () => {
    it('splits text and placeholders with defaults', () => {
        assert.deepEqual(parseCommand('a %%{{d}} b %%'), [
            { type: 'text', value: 'a ' },
            { type: 'placeholder', default: 'd' },
            { type: 'text', value: ' b ' },
            { type: 'placeholder', default: undefined },
        ]);
    });
});

describe('normalizeSpaces', () => {
    it('collapses runs of spaces and tabs and trims', () => {
        assert.equal(normalizeSpaces('  a  \t b '), 'a b');
    });
});
