module.exports = {
    extends: ['@moralisweb3'],
    ignorePatterns: ['**/build/**/*'],
    env: {
        browser: true,
    },
    rules: {
        // Disables the rule. You can just remove it,
        // if it is not enabled by a parent config.
        'object-shorthand': 0,
        'no-console': ['warn', { allow: ['clear', 'info', 'error', 'dir', 'trace', 'log'] }],
    },
};
