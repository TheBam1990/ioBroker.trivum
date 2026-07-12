import config from '@iobroker/eslint-config';
export default [
    { ignores: ['admin/admin.d.ts', 'lib/adapter-config.d.ts'] },
    ...config,
    {
        files: ['main.test.js', 'test/**/*.js'],
        languageOptions: { globals: { after: 'readonly', before: 'readonly', describe: 'readonly', it: 'readonly' } },
    },
];
