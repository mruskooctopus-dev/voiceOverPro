FROM nodered/node-red:3.1

# Copy configuration and flows to a staging area first
# (because the /data volume mount would overwrite direct copies)
COPY settings.js /tmp/defaults/settings.js
COPY flows/flows.json /tmp/defaults/flows.json
COPY public /tmp/defaults/public

# Create entrypoint wrapper that copies defaults on first run
# Must run as root so we can write to the fresh Docker volume
USER root
RUN echo '#!/bin/sh' > /tmp/init.sh && \
    echo 'if [ ! -f /data/.initialized ]; then' >> /tmp/init.sh && \
    echo '  echo "First run: copying default config files..."' >> /tmp/init.sh && \
    echo '  mkdir -p /data/audio-output' >> /tmp/init.sh && \
    echo '  cp -n /tmp/defaults/settings.js /data/settings.js 2>/dev/null || true' >> /tmp/init.sh && \
    echo '  cp -n /tmp/defaults/flows.json /data/flows.json 2>/dev/null || true' >> /tmp/init.sh && \
    echo '  cp -rn /tmp/defaults/public /data/public 2>/dev/null || true' >> /tmp/init.sh && \
    echo '  touch /data/.initialized' >> /tmp/init.sh && \
    echo 'fi' >> /tmp/init.sh && \
    echo 'exec npm --no-update-notifier --no-fund start --cache /data/.npm -- --userDir /data' >> /tmp/init.sh && \
    chmod +x /tmp/init.sh

EXPOSE 1880

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:1880/health || exit 1

# Use ENTRYPOINT (not CMD) so init.sh runs instead of being passed as an arg
ENTRYPOINT ["/tmp/init.sh"]
