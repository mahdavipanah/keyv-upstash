import { describe, test, expect, beforeEach } from "vitest"
import { delay } from "@keyv/test-suite"
import { KeyvUpstash } from "../src/index"
import { createKeyv, createKeyvUpstash, createUpstash } from "./helpers"

describe("KeyvUpstash", () => {
  beforeEach(async () => {
    const keyvUpstash = createKeyvUpstash()
    await keyvUpstash.client.flushdb()
  })

  test("should be a class", () => {
    expect(KeyvUpstash).toBeInstanceOf(Function)
  })

  test("should have a client property", () => {
    const keyvUpstash = createKeyvUpstash()
    expect(keyvUpstash.client).toBeDefined()
  })

  test("should be able to create Keyv instance", async () => {
    const keyv = createKeyv()

    expect(keyv).toBeDefined()

    await keyv.set("my key", "my value")
    await keyv.set("my key2", { foo: "bar" })
    const value = await keyv.get<string>("my key")
    expect(value).toBe("my value")

    const value2 = await keyv.get("my key2")
    expect(value2).toEqual({ foo: "bar" })
  })

  test("should be able to set the client property", () => {
    const keyvUpstash = createKeyvUpstash()
    const client = createUpstash()

    keyvUpstash.client = client
    expect(keyvUpstash.client).toBe(client)
  })

  test("should be able to pass in a client to constructor", () => {
    const client = createUpstash()

    const keyvUpstash = new KeyvUpstash({ upstashRedis: client })
    expect(keyvUpstash.client).toBe(client)
  })

  test("should be able to pass in the url and options to constructor", () => {
    const url = "https://localhost:6379"
    const token = "my secret token"
    const keyvUpstash = new KeyvUpstash({ url, token, namespace: "test" })

    expect(keyvUpstash.opts?.url).toBe(url)
    expect(keyvUpstash.namespace).toBe("test")
  })

  test("should be able to pass in the url and options to constructor", () => {
    const options = {
      url: "https://localhost:6379",
      token: "my secret token",
      namespace: "test",
      keyPrefixSeparator: "->",
      clearBatchSize: 100,
      useUnlink: true,
    }
    const keyvUpstash = new KeyvUpstash(options)
    expect(keyvUpstash.namespace).toBe("test")
    expect(keyvUpstash.keyPrefixSeparator).toBe("->")
    expect(keyvUpstash.clearBatchSize).toBe(100)
    expect(keyvUpstash.useUnlink).toBe(true)
  })

  test("should be able to get and set properties", () => {
    const keyvUpstash = new KeyvUpstash({
      url: "https://localhost:6379",
      token: "my secret token",
    })
    keyvUpstash.namespace = "test"
    keyvUpstash.keyPrefixSeparator = "->"
    keyvUpstash.clearBatchSize = 1001
    keyvUpstash.useUnlink = false

    expect(keyvUpstash.namespace).toBe("test")
    expect(keyvUpstash.keyPrefixSeparator).toBe("->")
    expect(keyvUpstash.clearBatchSize).toBe(1001)
    expect(keyvUpstash.useUnlink).toBe(false)
  })

  describe("KeyvUpstash Methods", () => {
    test("should be able to set, and delete", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.set("foo", "bar")
      const value = await keyvUpstash.get("foo")
      expect(value).toBe("bar")

      const deleted = await keyvUpstash.delete("foo")
      expect(deleted).toBe(true)
    })

    test("should be able to set, and delete using useUnlink to false", async () => {
      const keyvUpstash = createKeyvUpstash()
      keyvUpstash.useUnlink = false

      await keyvUpstash.set("foo", "bar")
      const value = await keyvUpstash.get("foo")
      expect(value).toBe("bar")
      const deleted = await keyvUpstash.delete("foo")
      expect(deleted).toBe(true)
    })

    test("should be able to set a ttl", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.set("foo76", "bar", 10)
      await delay(15)
      const value = await keyvUpstash.get("foo76")
      expect(value).toBeUndefined()
    })

    test("should return false on delete if key does not exist", async () => {
      const keyvUpstash = createKeyvUpstash()

      const deleted = await keyvUpstash.delete("foo")
      expect(deleted).toBe(false)
    })

    test("if there is a namespace on key", async () => {
      const keyvUpstash = createKeyvUpstash()

      keyvUpstash.namespace = "ns1"
      const key = keyvUpstash.getKeyName("foo77")
      expect(key).toBe("ns1::foo77")
    })

    test("if no namespace on key prefix and no default namespace", async () => {
      const keyvUpstash = createKeyvUpstash()

      keyvUpstash.namespace = undefined
      const key = keyvUpstash.getKeyName("foo78")
      expect(key).toBe("foo78")
    })

    test("should do nothing if no keys on clear", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.client.flushdb()
      await keyvUpstash.clear()
      keyvUpstash.namespace = "ns1"
      await keyvUpstash.clear()
    })

    test("should return true on has if key exists", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.set("has foo 189", "bar")
      const exists = await keyvUpstash.has("has foo 189")
      expect(exists).toBe(true)
    })

    test("should return false on has if key does not exist", async () => {
      const keyvUpstash = createKeyvUpstash()

      const exists = await keyvUpstash.has("has foo2")
      expect(exists).toBe(false)
    })

    test("should be able to set many keys", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.setMany([
        { key: "foo-many1", value: "bar" },
        { key: "foo-many2", value: "bar2" },
        { key: "foo-many3", value: "bar3", ttl: 5 },
      ])
      const value = await keyvUpstash.get("foo-many1")
      expect(value).toBe("bar")
      const value2 = await keyvUpstash.get("foo-many2")
      expect(value2).toBe("bar2")
      await delay(10)
      const value3 = await keyvUpstash.get("foo-many3")
      expect(value3).toBeUndefined()
    })

    test("should be able to has many keys", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.setMany([
        { key: "foo-has-many1", value: "bar" },
        { key: "foo-has-many2", value: "bar2" },
        { key: "foo-has-many3", value: "bar3", ttl: 5 },
      ])
      await delay(10)
      const exists = await keyvUpstash.hasMany([
        "foo-has-many1",
        "foo-has-many2",
        "foo-has-many3",
      ])
      expect(exists).toEqual([true, true, false])
    })

    test("should be able to get many keys", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.setMany([
        { key: "foo-get-many1", value: "bar" },
        { key: "foo-get-many2", value: "bar2" },
        { key: "foo-get-many3", value: "bar3", ttl: 5 },
      ])
      await delay(10)
      const values = await keyvUpstash.getMany([
        "foo-get-many1",
        "foo-get-many2",
        "foo-get-many3",
      ])
      expect(values).toEqual(["bar", "bar2", undefined])
    })

    test("should be able to delete many with namespace", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.setMany([
        { key: "foo-dm1", value: "bar" },
        { key: "foo-dm2", value: "bar2" },
        { key: "foo-dm3", value: "bar3", ttl: 5 },
      ])
      await keyvUpstash.deleteMany(["foo-dm2", "foo-dm3"])
      const value = await keyvUpstash.get("foo-dm1")
      expect(value).toBe("bar")

      const value2 = await keyvUpstash.get("foo-dm2")
      expect(value2).toBeUndefined()

      const value3 = await keyvUpstash.get("foo-dm3")
      expect(value3).toBeUndefined()
    })

    test("should be able to delete many with namespace with useUnlink false", async () => {
      const keyvUpstash = createKeyvUpstash()
      keyvUpstash.useUnlink = false

      await keyvUpstash.setMany([
        { key: "foo-dm1", value: "bar" },
        { key: "foo-dm2", value: "bar2" },
        { key: "foo-dm3", value: "bar3", ttl: 5 },
      ])
      await keyvUpstash.deleteMany(["foo-dm2", "foo-dm3"])
      const value = await keyvUpstash.get("foo-dm1")
      expect(value).toBe("bar")

      const value2 = await keyvUpstash.get("foo-dm2")
      expect(value2).toBeUndefined()

      const value3 = await keyvUpstash.get("foo-dm3")
      expect(value3).toBeUndefined()
    })
  })

  describe("KeyvRedis Namespace", () => {
    test("should clear with no namespace", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.set("foo90", "bar")
      await keyvUpstash.set("foo902", "bar2")
      await keyvUpstash.set("foo903", "bar3")
      await keyvUpstash.clear()
      const value = await keyvUpstash.get("foo90")
      expect(value).toBeUndefined()
    })

    test("should clear with no namespace and useUnlink to false", async () => {
      const keyvUpstash = createKeyvUpstash()
      keyvUpstash.useUnlink = false

      await keyvUpstash.set("foo90", "bar")
      await keyvUpstash.set("foo902", "bar2")
      await keyvUpstash.set("foo903", "bar3")
      await keyvUpstash.clear()
      const value = await keyvUpstash.get("foo90")
      expect(value).toBeUndefined()
    })

    test("should clear all with no namespace ", async () => {
      const keyvUpstash = createKeyvUpstash()

      keyvUpstash.namespace = "ns1"
      await keyvUpstash.set("foo91", "bar")
      keyvUpstash.namespace = undefined
      await keyvUpstash.set("foo912", "bar2")
      await keyvUpstash.set("foo913", "bar3")
      await keyvUpstash.clear()
      keyvUpstash.namespace = "ns1"
      const value = await keyvUpstash.get("foo91")
      expect(value).toBeUndefined()
    })

    test("should clear namespace but not other ones", async () => {
      const keyvUpstash = createKeyvUpstash()

      keyvUpstash.namespace = "ns1"
      await keyvUpstash.set("foo921", "bar")
      keyvUpstash.namespace = "ns2"
      await keyvUpstash.set("foo922", "bar2")
      await keyvUpstash.clear()
      keyvUpstash.namespace = "ns1"
      const value = await keyvUpstash.get("foo921")
      expect(value).toBe("bar")
    })

    test("should be able to set many keys with namespace", async () => {
      const keyvUpstash = createKeyvUpstash()
      keyvUpstash.namespace = "ns-many1"

      await keyvUpstash.setMany([
        { key: "foo-many1", value: "bar" },
        { key: "foo-many2", value: "bar2" },
        { key: "foo-many3", value: "bar3", ttl: 5 },
      ])
      const value = await keyvUpstash.get("foo-many1")
      expect(value).toBe("bar")

      const value2 = await keyvUpstash.get("foo-many2")
      expect(value2).toBe("bar2")

      await delay(10)

      const value3 = await keyvUpstash.get("foo-many3")
      expect(value3).toBeUndefined()
    })

    test("should be able to has many keys with namespace", async () => {
      const keyvUpstash = createKeyvUpstash()
      keyvUpstash.namespace = "ns-many2"

      await keyvUpstash.setMany([
        { key: "foo-has-many1", value: "bar" },
        { key: "foo-has-many2", value: "bar2" },
        { key: "foo-has-many3", value: "bar3", ttl: 5 },
      ])
      await delay(10)
      const exists = await keyvUpstash.hasMany([
        "foo-has-many1",
        "foo-has-many2",
        "foo-has-many3",
      ])
      expect(exists).toEqual([true, true, false])
    })

    test("should be able to delete many with namespace", async () => {
      const keyvUpstash = createKeyvUpstash()
      keyvUpstash.namespace = "ns-dm1"

      await keyvUpstash.setMany([
        { key: "foo-delete-many1", value: "bar" },
        { key: "foo-delete-many2", value: "bar2" },
        { key: "foo-delete-many3", value: "bar3", ttl: 5 },
      ])
      await keyvUpstash.deleteMany(["foo-delete-many2", "foo-delete-many3"])
      await delay(10)
      const value = await keyvUpstash.get("foo-delete-many1")
      expect(value).toBe("bar")

      const value2 = await keyvUpstash.get("foo-delete-many2")
      expect(value2).toBeUndefined()

      const value3 = await keyvUpstash.get("foo-delete-many3")
      expect(value3).toBeUndefined()
    })
  })

  describe("KeyvUpstash Iterators", () => {
    test("should be able to iterate over keys", async () => {
      const keyvUpstash = createKeyvUpstash()

      await keyvUpstash.set("foo95", "bar")
      await keyvUpstash.set("foo952", "bar2")
      await keyvUpstash.set("foo953", "bar3")
      const keys = []
      for await (const [key] of keyvUpstash.iterator()) {
        keys.push(key)
      }
      expect(keys).toContain("foo95")
      expect(keys).toContain("foo952")
      expect(keys).toContain("foo953")
    })

    test("should be able to iterate over keys by namespace", async () => {
      const keyvUpstash = createKeyvUpstash()

      const namespace = "ns1"
      await keyvUpstash.set("foo96", "bar")
      await keyvUpstash.set("foo962", "bar2")
      await keyvUpstash.set("foo963", "bar3")
      keyvUpstash.namespace = namespace
      await keyvUpstash.set("foo961", "bar")
      await keyvUpstash.set("foo9612", "bar2")
      await keyvUpstash.set("foo9613", "bar3")
      const keys = []
      const values = []
      for await (const [key, value] of keyvUpstash.iterator(namespace)) {
        keys.push(key)
        values.push(value)
      }
      expect(keys).toContain("foo961")
      expect(keys).toContain("foo9612")
      expect(keys).toContain("foo9613")
      expect(values).toContain("bar")
      expect(values).toContain("bar2")
      expect(values).toContain("bar3")
    })
  })
})
