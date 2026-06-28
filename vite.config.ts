import {defineConfig} from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts',
            userscript: {
                name: '長期照顧專業人員數位學習平臺',
                namespace: 'Paul.LTC',
                version: '0.1.1',
                author: 'Paul',
                description: '長期照顧專業人員數位學習平臺優化脚本.',
                icon: 'https://cdn-icons-png.flaticon.com/512/3712/3712589.png',
                match: [
                    'https://www.ltc-learning.org/*'
                ],
                grant: ['unsafeWindow'],
                noframes: true,
                'run-at': 'document-end',
            },
        }),
    ],
});
