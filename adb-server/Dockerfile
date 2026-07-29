FROM alpine:3.18

# Install adb
RUN apk add --no-cache android-tools

# Expose the default ADB server port
EXPOSE 5037

# Start ADB server in foreground listening on all interfaces
CMD ["adb", "-a", "-P", "5037", "nodaemon", "server", "start"]
