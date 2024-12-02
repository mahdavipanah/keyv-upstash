import * as test from "vitest"
import keyvTestSuite, { keyvIteratorTests } from "@keyv/test-suite"
import { Keyv } from "keyv"
import { createKeyvUpstash } from "./helpers"

test.afterAll(async () => {
  const adapter = createKeyvUpstash()
  await adapter.client.flushdb()
})

keyvTestSuite(test, Keyv, createKeyvUpstash)
keyvIteratorTests(test, Keyv, createKeyvUpstash)
