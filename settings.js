module.exports = {
    uiPort: process.env.PORT || 1880,
    credentialSecret: process.env.NODE_RED_CREDENTIAL_SECRET || "voiceflow-secret",
    httpAdminRoot: '/admin',
    httpNodeRoot: '/',
    httpStatic: '/data/public',
    httpStaticAuth: false,
    userDir: '/data',
    flowFile: 'flows.json',
    functionExternalModules: true,
    contextStorage: { default: { module: 'localfilesystem' } },
    functionGlobalContext: {
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
        GOOGLE_TTS_API_KEY: process.env.GOOGLE_TTS_API_KEY || '',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        OCTOPUS_API_URL: process.env.OCTOPUS_API_URL || '',
        OCTOPUS_API_KEY: process.env.OCTOPUS_API_KEY || '',
    },
    logging: { console: { level: "info", metrics: false, audit: false } },
    exportGlobalContextKeys: false,
    editorTheme: {
        page: { title: "VoiceFlow Pro - Admin" },
        header: { title: "VoiceFlow Pro" }
    }
};
