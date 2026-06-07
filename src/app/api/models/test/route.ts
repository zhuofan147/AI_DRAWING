import { NextResponse } from "next/server";
import crypto from "node:crypto";

interface TestRequest {
  protocol: string;
  baseUrl: string;
  apiKey: string;
  secretKey?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  latency_ms: number;
}

// ─── Kling JWT ────────────────────────────────────────────
function generateKlingToken(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

// ─── URL helpers ──────────────────────────────────────────
function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  // If baseUrl already ends with /v1, don't duplicate it
  if (base.endsWith("/v1")) {
    return base + path;
  }
  return base + "/v1" + path;
}

// ─── OpenAI-compatible test ───────────────────────────────
async function testOpenAI(baseUrl: string, apiKey: string): Promise<TestResult> {
  const start = Date.now();
  const url = buildUrl(baseUrl, "/models?limit=1");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  const latency = Date.now() - start;

  if (res.ok) {
    return { success: true, message: "连接成功 — OpenAI 兼容接口正常", latency_ms: latency };
  }
  if (res.status === 401 || res.status === 403) {
    return { success: false, message: `认证失败 (${res.status}) — 请检查 API Key`, latency_ms: latency };
  }
  if (res.status === 404) {
    // Some proxies don't expose /v1/models — try /v1/chat/completions with a minimal request
    const chatUrl = buildUrl(baseUrl, "/chat/completions");
    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const chatLatency = Date.now() - start;
    if (chatRes.ok || chatRes.status === 400) {
      // 400 with valid auth means the endpoint works, just model name wrong
      return { success: true, message: "连接成功 — 端点可访问 (models 接口不可用，但 chat 接口正常)", latency_ms: chatLatency };
    }
    return { success: false, message: `端点不可用 (${chatRes.status})`, latency_ms: chatLatency };
  }
  const text = await res.text().catch(() => "");
  return { success: false, message: `请求失败 (${res.status}): ${text.slice(0, 200)}`, latency_ms: latency };
}

// ─── Gemini test ──────────────────────────────────────────
async function testGemini(baseUrl: string, apiKey: string): Promise<TestResult> {
  const start = Date.now();
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const latency = Date.now() - start;

  if (res.ok) return { success: true, message: "连接成功 — Gemini 接口正常", latency_ms: latency };
  if (res.status === 401 || res.status === 403) {
    return { success: false, message: `认证失败 (${res.status}) — 请检查 API Key`, latency_ms: latency };
  }
  const text = await res.text().catch(() => "");
  return { success: false, message: `请求失败 (${res.status}): ${text.slice(0, 200)}`, latency_ms: latency };
}

// ─── Kling test ───────────────────────────────────────────
async function testKling(baseUrl: string, apiKey: string, secretKey?: string): Promise<TestResult> {
  const start = Date.now();
  const base = baseUrl.replace(/\/+$/, "");

  let authHeader: string;
  if (secretKey) {
    authHeader = `Bearer ${generateKlingToken(apiKey, secretKey)}`;
  } else {
    authHeader = `Bearer ${apiKey}`;
  }

  // Try to list a non-existent task — auth check only
  const url = `${base}/v1/images/generations/nonexistent-test-id`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(15000),
  });
  const latency = Date.now() - start;

  // 401/403 = bad auth. 404/400/422 = auth passed, endpoint just doesn't have that task
  if (res.status === 401 || res.status === 403) {
    return { success: false, message: `认证失败 (${res.status}) — 请检查 Access Key / Secret Key`, latency_ms: latency };
  }
  if (res.ok || res.status === 404 || res.status === 400 || res.status === 422) {
    return { success: true, message: "连接成功 — Kling 接口认证通过", latency_ms: latency };
  }
  const text = await res.text().catch(() => "");
  return { success: false, message: `请求失败 (${res.status}): ${text.slice(0, 200)}`, latency_ms: latency };
}

// ─── Seedance test ────────────────────────────────────────
async function testSeedance(baseUrl: string, apiKey: string): Promise<TestResult> {
  const start = Date.now();
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/api/v3/contents/generations/tasks/nonexistent-test-id`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  const latency = Date.now() - start;

  if (res.status === 401 || res.status === 403) {
    return { success: false, message: `认证失败 (${res.status}) — 请检查 API Key`, latency_ms: latency };
  }
  // 404/400/422 = auth passed
  return { success: true, message: "连接成功 — Seedance 接口认证通过", latency_ms: latency };
}

// ─── UCloud Seedance test ─────────────────────────────────
async function testUCloudSeedance(baseUrl: string, apiKey: string): Promise<TestResult> {
  const start = Date.now();
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/v1/tasks/status?task_id=nonexistent-test-id`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey }, // UCloud uses raw API key, no "Bearer" prefix
    signal: AbortSignal.timeout(15000),
  });
  const latency = Date.now() - start;

  if (res.status === 401 || res.status === 403) {
    return { success: false, message: `认证失败 (${res.status}) — 请检查 API Key`, latency_ms: latency };
  }
  return { success: true, message: "连接成功 — UCloud Seedance 接口认证通过", latency_ms: latency };
}

// ─── Wan / DashScope test ─────────────────────────────────
async function testDashScope(baseUrl: string, apiKey: string): Promise<TestResult> {
  const start = Date.now();
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/tasks/nonexistent-test-id`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  const latency = Date.now() - start;

  if (res.status === 401 || res.status === 403) {
    return { success: false, message: `认证失败 (${res.status}) — 请检查 API Key`, latency_ms: latency };
  }
  return { success: true, message: "连接成功 — DashScope 接口认证通过", latency_ms: latency };
}

// ─── Route handler ────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestRequest;

    if (!body.protocol) {
      return NextResponse.json({ error: "Protocol is required" }, { status: 400 });
    }
    if (!body.baseUrl) {
      return NextResponse.json({ error: "Base URL is required" }, { status: 400 });
    }

    let result: TestResult;

    switch (body.protocol) {
      case "openai":
        if (!body.apiKey) {
          return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }
        result = await testOpenAI(body.baseUrl, body.apiKey);
        break;

      case "gemini":
        if (!body.apiKey) {
          return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }
        result = await testGemini(body.baseUrl, body.apiKey);
        break;

      case "kling":
        if (!body.apiKey) {
          return NextResponse.json({ error: "Access Key (AK) is required" }, { status: 400 });
        }
        result = await testKling(body.baseUrl, body.apiKey, body.secretKey);
        break;

      case "seedance":
        if (!body.apiKey) {
          return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }
        result = await testSeedance(body.baseUrl, body.apiKey);
        break;

      case "ucloud-seedance":
        if (!body.apiKey) {
          return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }
        result = await testUCloudSeedance(body.baseUrl, body.apiKey);
        break;

      case "wan":
      case "dashscope":
        if (!body.apiKey) {
          return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }
        result = await testDashScope(body.baseUrl, body.apiKey);
        break;

      default:
        return NextResponse.json({ error: `Unsupported protocol: ${body.protocol}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json({
        success: false,
        message: "连接超时 — 请检查 Base URL 是否正确，或网络是否可达",
        latency_ms: 0,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[models/test] Error:", message);
    return NextResponse.json({
      success: false,
      message: `网络错误: ${message}`,
      latency_ms: 0,
    }, { status: 502 });
  }
}
