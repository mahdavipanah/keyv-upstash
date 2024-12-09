# keyv-upstash <img width="100" align="right" src="https://jaredwray.com/images/keyv-symbol.svg" alt="keyv">

Upstash Redis storage adapter for [Keyv](https://github.com/jaredwray/keyv).

[![build](https://github.com/mahdavipanah/keyv-upstash/actions/workflows/tests.yaml/badge.svg)](https://github.com/mahdavipanah/keyv-upstash/actions/workflows/tests.yaml)
[![codecov](https://codecov.io/gh/mahdavipanah/keyv-upstash/branch/main/graph/badge.svg?token=3ZQZQ2ZQ2D)](https://codecov.io/gh/mahdavipanah/keyv-upstash)
[![npm](https://img.shields.io/npm/v/keyv-upstash)](https://www.npmjs.com/package/keyv-upstash)

[Upstash](https://upstash.com/) Redis storage adapter for Keyv.

## Features

- Built on top of [Upstash Redis](https://github.com/upstash/redis-js).
  - Is fully compatible with [serverless-redis-http](https://github.com/hiett/serverless-redis-http) so you can setup your own serverless Redis and use this adapter with it.
- TTL is handled directly by Upstash Redis.
- Supports namespaces for key management.
- Compatible with Keyv's official Redis adapter where possible.
- Provides access to the Upstash Redis client for advanced use cases.
- Written in TypeScript with type definitions included.
- Supports both CommonJS and ES Modules.

## Important

For the [Upstash client](https://github.com/upstash/redis-js) the `automaticDeserialization` option is set to `false` by default and **it is not recommended to change it** because it can cause issues with storing and retrieving special types of values like Buffers, BigInt, etc.

In case you are passing a custom Upstash client instance, make sure to pass an instance that has been constructed with the `automaticDeserialization` option to `false`. (see the [Usage](#usage) section for an example)

## Table of Contents

- [Usage](#usage)
- [Namespaces](#namespaces)
- [Options](#options)
- [Performance Considerations](#performance-considerations)
- [Using Cacheable with Upstash Redis](#using-cacheable-with-upstash-redis)
- [API](#api)
- [Differences from @keyv/redis](#differences-from-keyvredis)
- [License](#license)

## Usage

Here is a standard use case where we implement `Keyv` with `keyv-upstash`:

```typescript
import Keyv from "keyv"
import { KeyvUpstash } from "keyv-upstash"

const keyv = new Keyv({
  store: new KeyvUpstash({
    url: "your-upstash-redis-url",
    token: "your-upstash-redis-token",
  }),
})

await keyv.set("foo", "bar")
const value = await keyv.get("foo")
console.log(value) // 'bar'
```

Alternatively, if you already have an Upstash Redis client instance:

```typescript
import Keyv from "keyv"
import { KeyvUpstash } from "keyv-upstash"
import { Redis } from "@upstash/redis"

const upstashRedis = new Redis({
  url: "your-upstash-redis-url",
  token: "your-upstash-redis-token",

  /**
   * IMPORTANT: Set automaticDeserialization to false to prevent issues
   * with special value types
   */
  automaticDeserialization: false,
})

const keyv = new Keyv({
  store: new KeyvUpstash({ upstashRedis }),
})

await keyv.set("foo", "bar")
```

## Namespaces

You can set a namespace for your keys to manage them more effectively:

```typescript
const keyv = new Keyv({
  store: new KeyvUpstash({
    url: "your-upstash-redis-url",
    token: "your-upstash-redis-token",
    namespace: "my-namespace",
  }),
})

await keyv.set("foo", "bar")
```

This will prefix all keys with `my-namespace::`.

## Options

`KeyvUpstash` supports the following options:

- **url**: The Upstash Redis REST API URL.
- **token**: The Upstash Redis REST API token.
- **upstashRedis**: An existing Upstash Redis client instance.
- **namespace**: An optional namespace to prefix all keys with.
- **keyPrefixSeparator**: A custom separator between the namespace and the key (default is `::`).
- **defaultTtl**: The default time-to-live (TTL) for keys, in milliseconds.
- **useUnlink**: Whether to use the `UNLINK` command instead of `DEL` for deleting keys (default is `true`).
- **clearBatchSize**: The number of keys to delete in a single batch when clearing the cache (default is `1000`).
- **noNamespaceAffectsAll**: Whether to allow clearing all keys when no namespace is set (default is `false`).

## Performance Considerations

- **Clear Operations**: The `clear()` method uses the `SCAN` command to iterate over keys and delete them in batches. This can be slow if you have a large dataset. It's recommended to use namespaces to limit the keys being cleared. If you don't set namespaces, you can enable `noNamespaceAffectsAll` to clear all keys using the `FLUSHDB` command which is faster.
- **Delete Operations**: By default, `useUnlink` is set to `true`, which uses the non-blocking `UNLINK` command instead of `DEL`. This helps improve performance during deletion.
- **Batch Operations**: Methods like `setMany`, `getMany`, and `deleteMany` are more efficient than their singular counterparts and are recommended when dealing with multiple keys.

## Using Cacheable with Upstash Redis

To enhance performance further, you can use [Cacheable](https://www.npmjs.com/package/cacheable) for multi-layered caching:

```typescript
import { Cacheable } from "cacheable"
import { KeyvUpstash } from "keyv-upstash"

const secondary = new KeyvUpstash({
  url: "your-upstash-redis-url",
  token: "your-upstash-redis-token",
})

const cache = new Cacheable({ secondary })
```

## API

### KeyvUpstash(options)

Creates a new `KeyvUpstash` instance.

#### Options:

- **upstashRedis**: An existing Upstash Redis client instance.
- **url**: The Upstash Redis REST API URL.
- **token**: The Upstash Redis REST API token.
- **namespace**: An optional namespace to prefix all keys with.
- **keyPrefixSeparator**: A custom separator between the namespace and the key (default is `::`).
- **defaultTtl**: The default TTL for keys in milliseconds.
- **useUnlink**: Whether to use the `UNLINK` command instead of `DEL` for deleting keys (default is `true`).
- **clearBatchSize**: The number of keys to delete in a single batch when clearing the cache (default is `1000`).
- **noNamespaceAffectsAll**: Whether to allow clearing all keys when no namespace is set (default is `false`).

### Properties

- **client**: The Upstash Redis client instance.
- **namespace**: The namespace used for keys.
- **keyPrefixSeparator**: Separator used between namespace and key.
- **defaultTtl**: The default TTL for keys.
- **useUnlink**: Indicates if `UNLINK` is used for deletion.
- **clearBatchSize**: Batch size for clear operations.
- **noNamespaceAffectsAll**: Determines behavior when no namespace is set.

### Methods

- **set(key, value, ttl?)**: Set a value in the cache.
- **get(key)**: Get a value from the cache.
- **delete(key)**: Delete a key from the cache.
- **clear()**: Clear all keys in the cache (subject to namespaces).
- **setMany(entries)**: Set multiple values in the cache.
- **getMany(keys)**: Get multiple values from the cache.
- **deleteMany(keys)**: Delete multiple keys from the cache.
- **has(key)**: Check if a key exists in the cache.
- **hasMany(keys)**: Check if multiple keys exist in the cache.
- **iterator(namespace?)**: Get an async iterator over keys and values.

## Differences from @keyv/redis

- **Backend**: Uses [Upstash Redis](https://upstash.com/), an HTTP-based, serverless Redis service.
- **Connection**: Requires Upstash REST API URL and token instead of a traditional Redis connection URL.
- **Cluster Support**: Upstash Redis does not support Redis Clustering.
- **TLS and Sockets**: Connection options related to sockets and TLS are not applicable.
- **Automatic Serialization**: The `automaticDeserialization` option is set to `false` by default to prevent issues with special value types.
- **Compatibility**: Aims to be compatible with `@keyv/redis` where possible, but some differences exist due to the nature of Upstash Redis.

## License

[MIT @ Hamidreza Mahdavipanah](LICENSE)
