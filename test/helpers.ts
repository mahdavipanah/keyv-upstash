/**
 * Helper functions for testing. This file is excluded from vitest.
 */

import { Keyv } from "keyv"
import { KeyvUpstash } from "../src/index"
import { Redis } from "@upstash/redis"

const UPSTASH_URL = "https://relevant-elephant-23683.upstash.io"
const TOKEN = "AVyDAAIjcDE3NDlkMDkxOTYyNDY0NzNlODZhMjhlYTM0NThkNGI0MXAxMA"

export const createKeyvUpstash = () =>
  new KeyvUpstash({ url: UPSTASH_URL, token: TOKEN })

export const createKeyv = () => new Keyv({ store: createKeyvUpstash() })

export const createUpstash = () => new Redis({ url: UPSTASH_URL, token: TOKEN })
