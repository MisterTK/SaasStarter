import { json, type RequestHandler } from "@sveltejs/kit"

export const GET: RequestHandler = async ({ fetch }) => {
  const results = []

  // Test 1: Basic fetch with string URL
  try {
    const response1 = await fetch("https://api.github.com/zen")
    results.push({
      test: "Basic fetch with string URL",
      url: "https://api.github.com/zen",
      status: response1.status,
      ok: response1.ok,
      text: await response1.text(),
    })
  } catch (error) {
    results.push({
      test: "Basic fetch with string URL",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 2: Fetch with URL object
  try {
    const urlObj = new URL("https://api.github.com/zen")
    const response2 = await fetch(urlObj)
    results.push({
      test: "Fetch with URL object",
      url: urlObj.toString(),
      status: response2.status,
      ok: response2.ok,
      text: await response2.text(),
    })
  } catch (error) {
    results.push({
      test: "Fetch with URL object",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 3: Google API with string URL
  try {
    const googleUrl = "https://mybusiness.googleapis.com/v4/accounts"
    const response3 = await fetch(googleUrl, {
      headers: {
        Authorization: "Bearer dummy-token",
      },
    })
    results.push({
      test: "Google API with string URL",
      url: googleUrl,
      status: response3.status,
      ok: response3.ok,
      headers: Object.fromEntries(response3.headers.entries()),
    })
  } catch (error) {
    results.push({
      test: "Google API with string URL",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 4: Google API with URL object
  try {
    const googleUrlObj = new URL(
      "https://mybusiness.googleapis.com/v4/accounts",
    )
    const response4 = await fetch(googleUrlObj, {
      headers: {
        Authorization: "Bearer dummy-token",
      },
    })
    results.push({
      test: "Google API with URL object",
      url: googleUrlObj.toString(),
      status: response4.status,
      ok: response4.ok,
      headers: Object.fromEntries(response4.headers.entries()),
    })
  } catch (error) {
    results.push({
      test: "Google API with URL object",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 5: URL construction with query parameters
  try {
    const baseUrl = "https://mybusiness.googleapis.com/v4/accounts"
    const params = new URLSearchParams({ pageSize: "100" })
    const fullUrl = `${baseUrl}?${params}`
    const response5 = await fetch(fullUrl, {
      headers: {
        Authorization: "Bearer dummy-token",
      },
    })
    results.push({
      test: "URL with query parameters (template literal)",
      url: fullUrl,
      status: response5.status,
      ok: response5.ok,
    })
  } catch (error) {
    results.push({
      test: "URL with query parameters (template literal)",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 6: URL object with searchParams
  try {
    const urlWithParams = new URL(
      "https://mybusiness.googleapis.com/v4/accounts",
    )
    urlWithParams.searchParams.set("pageSize", "100")
    const response6 = await fetch(urlWithParams, {
      headers: {
        Authorization: "Bearer dummy-token",
      },
    })
    results.push({
      test: "URL object with searchParams",
      url: urlWithParams.toString(),
      status: response6.status,
      ok: response6.ok,
    })
  } catch (error) {
    results.push({
      test: "URL object with searchParams",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 7: Different HTTP methods
  try {
    const response7 = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: true }),
    })
    results.push({
      test: "POST request to httpbin",
      url: "https://httpbin.org/post",
      status: response7.status,
      ok: response7.ok,
      data: await response7.json(),
    })
  } catch (error) {
    results.push({
      test: "POST request to httpbin",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 8: Check SvelteKit fetch vs global fetch
  const fetchType = {
    svelteKitFetch: fetch.toString(),
    globalFetch: globalThis.fetch
      ? globalThis.fetch.toString()
      : "not available",
    isNative: fetch.toString().includes("[native code]"),
    constructor: fetch.constructor.name,
  }

  return json({
    timestamp: new Date().toISOString(),
    fetchInfo: fetchType,
    results,
  })
}
