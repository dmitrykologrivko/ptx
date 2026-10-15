const PLACEHOLDER = '%%';
const ESCAPED_PLACEHOLDER = '\\%%';

export function substitute(command, args = [], options = {}) {
    const { normalize = true } = options;

    const parts = parseCommand(command);
    const placeholders = parts.filter((part) => part.type === 'placeholder');

    let result;

    if (placeholders.length === 0) {
        result = parts.map((part) => part.value).join('');
    } else if (placeholders.length === 1) {
        result = replaceSingle(parts, args);
    } else {
        result = replaceMany(parts, args);
    }

    return normalize ? normalizeSpaces(result) : result;
}

export function parseCommand(command) {
    const parts = [];
    let text = '';
    let index = 0;

    while (index < command.length) {
        if (command[index] === '\\' && command.startsWith(PLACEHOLDER, index + 1)) {
            text += PLACEHOLDER;
            index += ESCAPED_PLACEHOLDER.length;
            continue;
        }

        if (command.startsWith(PLACEHOLDER, index)) {
            if (text !== '') {
                parts.push({ type: 'text', value: text });
                text = '';
            }

            const parsed = parseDefault(command, index + PLACEHOLDER.length);
            parts.push({ type: 'placeholder', default: parsed.default });
            index = parsed.next;
            continue;
        }

        text += command[index];
        index += 1;
    }

    if (text !== '') {
        parts.push({ type: 'text', value: text });
    }

    return parts;
}

export function normalizeSpaces(value) {
    return value.replace(/[ \t]+/g, ' ').trim();
}

function parseDefault(command, start) {
    if (command.startsWith('{{', start)) {
        const end = command.indexOf('}}', start + 2);
        if (end !== -1) {
            return { default: command.slice(start + 2, end), next: end + 2 };
        }
    }

    return { default: undefined, next: start };
}

function replaceSingle(parts, args) {
    const index = parts.findIndex((part) => part.type === 'placeholder');
    const placeholder = parts[index];
    const isTrailing = parts
        .slice(index + 1)
        .every((part) => part.type === 'text' && part.value.trim() === '');

    let value;
    if (isTrailing) {
        value = args.length > 0 ? args.join(' ') : (placeholder.default ?? '');
    } else {
        value = args[0] ?? placeholder.default ?? '';
    }

    return parts.map((part, position) => (position === index ? value : (part.value ?? ''))).join('');
}

function replaceMany(parts, args) {
    let cursor = 0;

    return parts.map((part) => {
        if (part.type === 'text') {
            return part.value;
        }

        const value = args[cursor] ?? part.default ?? '';
        cursor += 1;
        return value;
    }).join('');
}
