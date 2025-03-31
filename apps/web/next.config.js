const nextConfig = {
    env: {
        KINDE_SITE_URL: process.env.KINDE_SITE_URL ?? `https://fedjobs.vercel.app`,
        KINDE_POST_LOGOUT_REDIRECT_URL:
            process.env.KINDE_POST_LOGOUT_REDIRECT_URL ?? `https://fedjobs.vercel.app`,
        KINDE_POST_LOGIN_REDIRECT_URL:
            process.env.KINDE_POST_LOGIN_REDIRECT_URL ??
            `https://fedjobs.vercel.app/dashboard`
    },
    experimental: {
        serverMinification: false,
        serverActions: {
            bodySizeLimit: '15mb'
        }
    },
    // Add watchOptions to reduce the number of watched files
    webpack: (config, { isServer }) => {
        // Optimize file watching
        config.watchOptions = {
            poll: 2000,
            aggregateTimeout: 500,
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/package-lock.json',
                '**/pnpm-lock.yaml',
                '**/yarn.lock',
                '**/.next/**',
                '**/dist/**',
                '**/.cache/**',
                '**/public/**'
            ]
        };
        
        // Handle browser-specific dependencies
        if (!isServer) {
            // These packages are used on the server side and aren't needed in the browser
            config.resolve.alias = {
                ...config.resolve.alias,
                'puppeteer': false,
                'puppeteer-core': false,
                'playwright': false,
                'playwright-core': false,
                'electron': false,
                'chromium-bidi': false
            };
        }
        
        return config;
    },
};

module.exports = nextConfig;