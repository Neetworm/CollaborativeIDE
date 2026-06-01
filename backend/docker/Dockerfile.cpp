FROM alpine:3.19

# Install compiler
RUN apk add --no-cache g++ libc-dev bash

# Create user FIRST
RUN addgroup -S sandbox && \
    adduser -S sandbox -G sandbox

# Create folder and set ownership
RUN mkdir -p /sandbox && \
    chown -R sandbox:sandbox /sandbox && \
    chmod 755 /sandbox

USER sandbox
WORKDIR /sandbox

CMD ["./main"]