import EventEmitter from "events"
import { RedisConfigNodejs, Redis } from "@upstash/redis"
import { type KeyvStoreAdapter } from "keyv"
import { MergeExclusive, RequiredKeysOf } from "type-fest"

type RedisConfigNodejsRequiredKeys = Pick<
  RedisConfigNodejs,
  RequiredKeysOf<RedisConfigNodejs>
>

type CommonOptions = {
  namespace?: string
  keyPrefixSeparator?: string
  defaultTtl?: number
  useUnlink?: boolean
  clearBatchSize?: number
  noNamespaceAffectsAll?: boolean
} & Omit<RedisConfigNodejs, keyof RedisConfigNodejsRequiredKeys>

type OptionWithRedis = { upstashRedis: Redis } & CommonOptions

type OptionWithoutRedis = Pick<
  RedisConfigNodejs,
  RequiredKeysOf<RedisConfigNodejs>
> &
  CommonOptions

/**
 * Options for configuring the Keyv Upstash Redis adapter.
 *
 * You must provide either the `upstashRedis` instance or both `url` and `token` for connecting to Upstash Redis.
 *
 * All the options from the Upstash Redis Node.js SDK are supported.
 * IMPORTANT: The `automaticDeserialization` option is set to `false` by default and it is not recommended to change it
 * because it can cause issues with storing and retrieving special types of values like Buffers, BigInt, etc.
 *
 * @typedef {Object} KeyvUpstashOptions
 *
 * @property {Redis} [upstashRedis] - An existing Upstash Redis instance.
 * @property {string} [url] - The Upstash Redis REST API URL.
 * @property {string} [token] - The Upstash Redis REST API token.
 * @property {string} [namespace] - An optional namespace to prefix all keys with.
 * @property {string} [keyPrefixSeparator="::"] - A custom separator to use between the namespace and the key.
 * @property {number} [defaultTtl] - The default time-to-live (TTL) for keys, in milliseconds.
 * @property {boolean} [useUnlink=true] - Whether to use the UNLINK command instead of DEL for deleting keys.
 * @property {number} [clearBatchSize=1000] - The number of keys to delete in a single batch when clearing the cache.
 * @property {boolean} [noNamespaceAffectsAll=false] - Whether to allow clearing all keys when no namespace is set.
 */
export type KeyvUpstashOptions = MergeExclusive<
  OptionWithRedis,
  OptionWithoutRedis
>

export type KeyvUpstashEntry<T> = {
  /**
   * Key to set.
   */
  key: string
  /**
   * Value to set.
   */
  value: T
  /**
   * Time to live in milliseconds.
   */
  ttl?: number
}

/**
 * Checks if the provided options object contains an Upstash Redis instance.
 *
 * @param options - The options object to check.
 * @returns A boolean indicating whether the options object contains an Upstash Redis instance.
 */
function optionsHasRedis(
  options: KeyvUpstashOptions
): options is OptionWithRedis {
  return !!options.upstashRedis
}

/**
 * Provides an adapter for Keyv to use Upstash Redis as the storage backend.
 * It extends EventEmitter and implements KeyvStoreAdapter.
 *
 * @template T - The type of the values to be stored. Defaults to `any`.
 */
export class KeyvUpstash<T = any>
  extends EventEmitter
  implements KeyvStoreAdapter
{
  /**
   * The Upstash Redis client instance.
   */
  client: Redis

  /**
   * The namespace to use for keys. Optional.
   */
  namespace?: string

  /**
   * The separator to use between the namespace and the key. Defaults to "::".
   */
  keyPrefixSeparator: string

  /**
   * The default time to live (TTL) for keys in milliseconds. Optional.
   */
  defaultTtl?: number

  /**
   * Whether to use the `unlink` method for deleting keys. Defaults to `true`.
   */
  useUnlink: boolean

  /**
   * The batch size for clearing keys. Defaults to 1000.
   */
  clearBatchSize: number

  /**
   * Whether to allow clearing all keys when no namespace is set.
   * If set to true and no namespace is set, iterate() will return all keys.
   * Defaults to `false`.
   */
  noNamespaceAffectsAll: boolean

  /**
   * The initial options provided to the constructor.
   */
  private readonly initialOptions: KeyvUpstashOptions

  /**
   * Creates an instance of KeyvUpstash.
   *
   * @param {KeyvUpstashOptions} options - The configuration options for KeyvUpstash.
   *
   * @throws {Error} Throws an error if the options are invalid.
   */
  constructor(options: KeyvUpstashOptions) {
    super()

    this.initialOptions = { ...options }

    this.keyPrefixSeparator = options.keyPrefixSeparator ?? "::"
    this.namespace = options.namespace
    this.defaultTtl = options.defaultTtl
    this.useUnlink = options.useUnlink ?? true
    this.clearBatchSize = options.clearBatchSize ?? 1000
    this.noNamespaceAffectsAll = options.noNamespaceAffectsAll ?? false

    if (optionsHasRedis(options)) {
      this.client = options.upstashRedis
    } else {
      this.client = new Redis({
        ...options,
        automaticDeserialization: false,
      })
    }
  }

  /**
   * Get the options for the adapter.
   */
  get opts() {
    return {
      ...this.initialOptions,

      // Important for some of Keyv functionalities to work properly, e.g. iterator.
      dialect: "redis",

      upstashRedis: this.client,
      namespace: this.namespace,
      keyPrefixSeparator: this.keyPrefixSeparator,
      defaultTtl: this.defaultTtl,
      useUnlink: this.useUnlink,
      clearBatchSize: this.clearBatchSize,
      noNamespaceAffectsAll: this.noNamespaceAffectsAll,
    }
  }

  /**
   * Constructs the full key name by combining the namespace, key prefix separator, and the provided key.
   * If the namespace is not defined, it returns the provided key as is.
   */
  getKeyName = (key: string): string => {
    if (this.namespace) {
      return `${this.namespace}${this.keyPrefixSeparator}${key}`
    }

    return key
  }

  /**
   * Set a key value pair in the store. TTL is in milliseconds.
   *
   * @param {string} key - the key to set
   * @param {string} value - the value to set
   * @param {number} [ttl] - the time to live in milliseconds
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    key = this.getKeyName(key)

    const finalTtl = ttl ?? this.defaultTtl
    if (finalTtl != undefined) {
      await this.client.set(key, value, { px: finalTtl })
    } else {
      await this.client.set(key, value)
    }
  }

  /**
   * Will set many key value pairs in the store. TTL is in milliseconds. This will be done as a single transaction.
   *
   * @param {Array<KeyvRedisEntry<string>>} entries - the key value pairs to set with optional ttl
   */
  async setMany(entries: Array<KeyvUpstashEntry<string>>): Promise<void> {
    const multi = this.client.multi()

    for (const { key, value, ttl } of entries) {
      const prefixedKey = this.getKeyName(key)
      const finalTtl = ttl ?? this.defaultTtl

      if (finalTtl !== undefined) {
        multi.set(prefixedKey, value, { px: finalTtl })
      } else {
        multi.set(prefixedKey, value)
      }
    }

    await multi.exec()
  }

  /**
   * Check if a key exists in the store.
   *
   * @param {string} key - the key to check
   * @returns {Promise<boolean>} - true if the key exists, false if not
   */
  async has(key: string): Promise<boolean> {
    key = this.getKeyName(key)
    const exists: number = await this.client.exists(key)

    return exists === 1
  }

  /**
   * Check if many keys exist in the store. This will be done as a single transaction.
   *
   * @param {Array<string>} keys - the keys to check
   * @returns {Promise<Array<boolean>>} - array of booleans for each key if it exists
   */
  async hasMany(keys: string[]): Promise<boolean[]> {
    const multi = this.client.multi()

    for (const key of keys) {
      const prefixedKey = this.getKeyName(key)
      multi.exists(prefixedKey)
    }

    const results = await multi.exec()

    return results.map((result) => result === 1)
  }

  /**
   * Get a value from the store. If the key does not exist, it will return undefined.
   *
   * @template U - the type of the value to be returned. Defaults to `T`.
   * @param {string} key - the key to get
   * @returns {Promise<U | undefined>} - the value or undefined if the key does not exist
   */
  async get<U = T>(key: string): Promise<U | undefined> {
    key = this.getKeyName(key)

    const value = await this.client.get<T>(key)

    return (value as U) ?? undefined
  }

  /**
   * Get many values from the store. If a key does not exist, it will return undefined.
   *
   * @param {Array<string>} keys - the keys to get
   * @returns {Promise<Array<U | undefined>>} - array of values or undefined if the key does not exist
   */
  async getMany<U = T>(keys: string[]): Promise<Array<U | undefined>> {
    keys = keys.map(this.getKeyName)
    const values = await this.client.mget(keys)

    return values.map((value) => (value as U) ?? undefined)
  }

  /**
   * Deletes the specified key(s) from the storage.
   *
   * @param key - A single key or an array of keys to be deleted.
   * @returns A promise that resolves to a boolean indicating whether any key was deleted.
   *
   * @remarks
   * If `useUnlink` is set to true, the `unlink` method of the client will be used to delete the keys.
   * Otherwise, the `del` method of the client will be used.
   *
   * @private
   */
  private async genericDelete(key: string | string[]): Promise<boolean> {
    let keys = Array.isArray(key) ? key : [key]
    keys = keys.map(this.getKeyName)

    let deleted = 0
    if (this.useUnlink) {
      deleted = await this.client.unlink(...keys)
    } else {
      deleted = await this.client.del(...keys)
    }

    return deleted > 0
  }

  /**
   * Delete a key from the store.
   *
   * @param {string} key - the key to delete
   * @returns {Promise<boolean>} - true if the key was deleted, false if not
   */
  async delete(key: string): Promise<boolean> {
    return this.genericDelete(key)
  }

  /**
   * Delete many keys from the store. This will be done as a single transaction.
   *
   * @param {Array<string>} keys - the keys to delete
   * @returns {Promise<boolean>} - true if any key was deleted, false if not
   */
  async deleteMany(keys: string[]): Promise<boolean> {
    return this.genericDelete(keys)
  }

  /**
   * Clear all keys in the store.
   *
   * IMPORTANT: this can cause performance issues if there are a large number of keys in the store. Use with caution as not recommended for production.
   *
   * If a namespace is not set it will clear all keys.
   * If a namespace is set it will clear all keys with that namespace (`FLUSHDB`).
   *
   * @remarks
   * If `useUnlink` is set to true, the `unlink` method of the client will be used to delete the keys.
   * Otherwise, the `del` method of the client will be used.
   *
   * @returns {Promise<void>}
   */
  async clear(): Promise<void> {
    if (!this.namespace && this.noNamespaceAffectsAll) {
      await this.client.flushdb()
    } else {
      try {
        let cursor = "0"
        const match = this.namespace
          ? `${this.namespace}${this.keyPrefixSeparator}*`
          : "*"

        do {
          const result = await this.client.scan(Number.parseInt(cursor, 10), {
            match,
            count: this.clearBatchSize,
            type: "string",
          })

          cursor = result[0]
          let keys = result[1]

          if (keys.length === 0) {
            continue
          }

          // If no namespace is provided, filter out keys with a namespace.
          if (!this.namespace) {
            keys = keys.filter((key) => !key.includes(this.keyPrefixSeparator))
          }

          if (keys.length > 0) {
            if (this.useUnlink) {
              await this.client.unlink(...keys)
            } else {
              await this.client.del(...keys)
            }
          }
        } while (cursor !== "0")
        /* c8 ignore next 3 */
      } catch (error) {
        this.emit("error", error)
      }
    }
  }

  /**
   * Get an async iterator for the keys and values in the store. If a namespace is provided, it will only iterate over keys with that namespace.
   * If not namespace is provided, it will iterate over all keys in the Redis DB.
   *
   * @param {string} [namespace] - the namespace to iterate over
   * @returns {AsyncGenerator<[string, U | undefined], void, unknown>} - async iterator with key value pairs
   */
  public async *iterator<U = T>(
    namespace?: string
  ): AsyncGenerator<[string, U | undefined], void, unknown> {
    const getKeyWithoutPrefix = (key: string) => {
      if (!namespace) return key

      return key.replace(`${namespace}${this.keyPrefixSeparator}`, "")
    }

    const match = namespace ? `${namespace}${this.keyPrefixSeparator}*` : "*"
    let cursor = "0"
    do {
      const result = await this.client.scan(Number.parseInt(cursor, 10), {
        match,
        type: "string",
      })
      cursor = result[0]
      let keys = result[1]

      // If no namespace is provided, filter out keys with a namespace.
      if (!namespace && !this.noNamespaceAffectsAll) {
        keys = keys.filter((key) => !key.includes(this.keyPrefixSeparator))
      }

      if (keys.length > 0) {
        const values = await this.client.mget(keys)
        for (const [i] of keys.entries()) {
          const key = getKeyWithoutPrefix(keys[i])

          /* c8 ignore next 1 */
          let value = values ? values[i] : undefined

          if (value != undefined) yield [key, value as U | undefined]
        }
      }
    } while (cursor !== "0")
  }
}
