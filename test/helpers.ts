/**
 * Helper functions for testing. This file is excluded from vitest.
 */

import { Keyv } from "keyv"
import { KeyvUpstash } from "../src/index"
import { Redis } from "@upstash/redis"

const UPSTASH_URL = "http://localhost:8079"
const TOKEN = "example_token"

export const createKeyvUpstash = () =>
  new KeyvUpstash({ url: UPSTASH_URL, token: TOKEN })

export const createKeyv = () => new Keyv({ store: createKeyvUpstash() })

export const createUpstash = () => new Redis({ url: UPSTASH_URL, token: TOKEN })
