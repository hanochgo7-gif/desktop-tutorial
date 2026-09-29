"use server"

import { cookies } from "next/headers"

import { getModel, parseSettings } from "./catalog"
import type { GenerationPlane } from "./catalog/types"
import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  PLATFORM_KEY_COOKIE_OPTIONS,
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
} from "./credentials"
import { createHash } from "node:crypto"

import { PlatformError, createPlatformClient } from "./platform"
import type { QueuedGeneration, StatusResult } from "./platform"
import { toPlatform } from "./to-platform"

export async function savePlatformCredentials(data: unknown) {
  const { apiKey } = parseCredentialInput(data)
  const jar = await cookies()
  jar.set(
    PLATFORM_KEY_COOKIE,
    encodeCredentials(apiKey),
    PLATFORM_KEY_COOKIE_OPTIONS
  )
}

export async function clearPlatformCredentials() {
  const jar = await cookies()
  jar.set(PLATFORM_KEY_COOKIE, "", {
    ...PLATFORM_KEY_COOKIE_OPTIONS,
    maxAge: 0,
  })
}

export async function hasPlatformCredentials() {
  return (await readStoredCredentials()) !== null
}

/** Server actions return failures as values: Next.js replaces thrown error
    messages with an opaque digest in production builds. */
export type ActionResult<T> =
  { ok: true; value: T } | { ok: false; error: string }

/** Identical submissions from the same key within this window reuse the first
    request instead of starting (and paying for) a second generation. */
const DUPLICATE_WINDOW_MS = 10_000
const recentSubmits = new Map<
  string,
  { at: number; result: Promise<ActionResult<QueuedGeneration>> }
>()

export async function submitGeneration(
  plane: GenerationPlane
): Promise<ActionResult<QueuedGeneration>> {
  try {
    const model = getModel(plane.model)
    const parsed: GenerationPlane = {
      ...plane,
      settings: parseSettings(model, plane.settings),
    }
    const { path, body } = toPlatform(parsed)
    const credentials = await readCredentials()
    const now = Date.now()
    for (const [key, entry] of recentSubmits)
      if (now - entry.at > DUPLICATE_WINDOW_MS) recentSubmits.delete(key)
    const fingerprint = createHash("sha256")
      .update(credentials.apiKey)
      .update("\u0000")
      .update(path)
      .update("\u0000")
      .update(JSON.stringify(body))
      .digest("hex")
    const duplicate = recentSubmits.get(fingerprint)
    if (duplicate) return duplicate.result
    // No automatic retry: submissions have no idempotency key, so a repeated
    // POST after an ambiguous failure could start a second paid generation.
    const result = createPlatformClient(credentials)
      .submit(path, body)
      .then(
        (value): ActionResult<QueuedGeneration> => ({ ok: true, value }),
        (caught: unknown): ActionResult<QueuedGeneration> => {
          recentSubmits.delete(fingerprint)
          return { ok: false, error: describeFailure(caught) }
        }
      )
    recentSubmits.set(fingerprint, { at: now, result })
    return result
  } catch (caught) {
    return { ok: false, error: describeFailure(caught) }
  }
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit — the fan-out belongs on this side of the call, where it is
    genuinely parallel. */
export async function getGenerationStatuses(
  data: unknown
): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data)
  let client: ReturnType<typeof createPlatformClient>
  try {
    client = createPlatformClient(await readCredentials())
  } catch (caught) {
    const error = describeFailure(caught)
    return requestIds.map((requestId) => ({
      requestId,
      error,
      retryable: false,
    }))
  }
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        return { requestId, status: await client.status(requestId) }
      } catch (caught) {
        return {
          requestId,
          error: describeFailure(caught),
          retryable: isRetryable(caught),
        }
      }
    })
  )
}

export async function cancelGeneration(
  data: unknown
): Promise<ActionResult<null>> {
  try {
    const [requestId] = parseRequestIds(data)
    await createPlatformClient(await readCredentials()).cancel(requestId!)
    return { ok: true, value: null }
  } catch (caught) {
    if (caught instanceof PlatformError && caught.status === 400)
      return {
        ok: false,
        error:
          "This generation has already started and can no longer be canceled.",
      }
    return { ok: false, error: describeFailure(caught) }
  }
}

/** Status 5xx and network failures are worth another poll; the rest are final. */
function isRetryable(caught: unknown): boolean {
  if (caught instanceof PlatformError) return caught.status >= 500
  return !(caught instanceof MissingCredentialsError)
}

/** Messages for the documented error codes (docs.higgsfield.ai/docs/concepts/errors). */
function describeFailure(caught: unknown): string {
  if (caught instanceof MissingCredentialsError)
    return "Connect your Higgsfield API key in the sidebar to generate."
  if (caught instanceof PlatformError) {
    switch (caught.status) {
      case 401:
        return "Higgsfield rejected your API key. Replace it in the sidebar and try again."
      case 403:
        return "Your Higgsfield account doesn't have enough credits for this generation."
      case 404:
        return "This model or request isn't available to your Higgsfield account."
      case 422:
        return `The model rejected these settings: ${caught.message}`
      case 423:
        return "This model is temporarily blocked. Try again later or pick another model."
      case 503:
        return "This model is disabled or not ready right now. Try another model."
      default:
        if (caught.status >= 500)
          return "Higgsfield had a server error. Wait a moment and try again."
        return caught.message
    }
  }
  return caught instanceof Error ? caught.message : String(caught)
}

async function readStoredCredentials() {
  const jar = await cookies()
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value)
}

async function readCredentials() {
  const stored = await readStoredCredentials()
  if (!stored) throw new MissingCredentialsError()
  const baseUrl = process.env.HF_API_BASE_URL
  if (!baseUrl) throw new Error("Missing HF_API_BASE_URL")
  return { ...stored, baseUrl }
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload")
  const requestIds = payload.requestIds
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids")
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId)
      throw new Error("Invalid request id")
    return requestId
  })
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data))
    throw new Error(message)
  return data as Record<string, unknown>
}
