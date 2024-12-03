# keyv-upstash

Upstash Redis storage adapter for Keyv.

# Mention the difference between this adapter and the official Redis adapter

1. The clear method on this adapter will remove all keys (basically a `FLUSHDB`) when no namespace is provided. https://github.com/jaredwray/keyv/issues/1222

# IMPORTANT

The `automaticDeserialization` option is set to `false` by default and it is not recommended to change it because it can cause issues with storing and retrieving special types of values like Buffers, BigInt, etc.

# TODOs

- dockerized tests
- type tests
- CI/CD pipelines
- README
- publish on npm
