// PM2 ecosystem configuration
// Environment variables should be loaded from .env file before running PM2
// Use: export $(cat /root/evm/.env | grep -v '^#' | xargs) && pm2 start ecosystem.config.js

module.exports = {
    apps: [
        {
            name: 'evm-api',
            cwd: '/root/evm/api',
            script: 'pnpm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                PORT: process.env.API_PORT || process.env.PORT || 4000,
                HOST: process.env.HOST || '0.0.0.0',
                SQLITE_PATH: process.env.SQLITE_PATH || '/root/evm/api/sqlite/evm.sqlite',
                DRIZZLE_MIGRATE: process.env.DRIZZLE_MIGRATE || 'true',
                CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://cyberelka2077.ru'
            },
            error_file: '/root/evm/logs/api-error.log',
            out_file: '/root/evm/logs/api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            instances: 1,
            exec_mode: 'fork'
        },
        {
            name: 'evm-web',
            cwd: '/root/evm/web',
            script: 'pnpm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                PORT: process.env.WEB_PORT || process.env.PORT || 3000,
                HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
                NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://cyberelka2077.ru/api'
            },
            error_file: '/root/evm/logs/web-error.log',
            out_file: '/root/evm/logs/web-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            instances: 1,
            exec_mode: 'fork'
        },
        {
            name: 'evm-telegram-bot',
            cwd: '/root/evm/telegram-bot',
            script: 'pnpm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                BOT_TOKEN: process.env.BOT_TOKEN || '',
                API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
                API_TIMEOUT: process.env.API_TIMEOUT || '10000',
                API_RETRY_ATTEMPTS: process.env.API_RETRY_ATTEMPTS || '3',
                API_RETRY_DELAY: process.env.API_RETRY_DELAY || '1000'
            },
            error_file: '/root/evm/logs/bot-error.log',
            out_file: '/root/evm/logs/bot-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            watch: false,
            instances: 1,
            exec_mode: 'fork'
        }
    ]
};

