FROM nodered/node-red:3.1

# Install additional Node-RED nodes
RUN npm install --no-optional \
    node-red-node-sqlite \
    node-red-contrib-fs

# Copy configuration
COPY settings.js /data/settings.js
COPY flows/flows.json /data/flows.json

# Copy frontend assets
COPY public /data/public

# Expose Node-RED port
EXPOSE 1880

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:1880/health || exit 1
