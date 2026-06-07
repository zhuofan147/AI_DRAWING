import OpenAI from "openai";
import type { AIProvider, TextOptions, ImageOptions } from "../types";
import fs from "node:fs";
import path from "node:path";
import { id as genId } from "@/lib/id";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private defaultModel: string;
  private uploadDir: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(params?: { apiKey?: string; baseURL?: string; model?: string; uploadDir?: string; }) {
    this.apiKey = params?.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = params?.baseURL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
    this.defaultModel = params?.model || process.env.OPENAI_MODEL || "gpt-4o";
    this.uploadDir = params?.uploadDir || process.env.UPLOAD_DIR || "./uploads";
  }

  async generateText(prompt: string, options?: TextOptions): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }

    if (options?.images?.length) {
      const content: OpenAI.Chat.ChatCompletionContentPart[] = [];
      for (const imgPath of options.images) {
        try {
          const resolved = path.resolve(imgPath);
          if (fs.existsSync(resolved)) {
            const data = fs.readFileSync(resolved).toString("base64");
            const ext = path.extname(resolved).toLowerCase();
            const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
            content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } });
          }
        } catch { /* skip unreadable */ }
      }
      content.push({ type: "text", text: prompt });
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });
    return response.choices[0]?.message?.content || "";
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<string> {
    const model = options?.model || this.defaultModel;
    const isDallE = model.startsWith("dall-e");

    // Build extra params for non-DALL-E OpenAI-compatible providers (e.g. seedream, doubao).
    // These APIs typically accept `size` as "WxH" and/or `aspect_ratio` as "W:H".
    const compatParams: Record<string, unknown> = {};
    if (!isDallE) {
      if (options?.size) compatParams.size = options.size;
      if (options?.aspectRatio) compatParams.aspect_ratio = options.aspectRatio;
      if (!options?.size && !options?.aspectRatio) compatParams.aspect_ratio = "16:9";
    }

    const response = await ((this.client.images.generate as unknown) as (params: Record<string, unknown>) => Promise<OpenAI.ImagesResponse>)({
      model,
      prompt,
      ...(isDallE && {
        size: (["1024x1024", "1792x1024", "1024x1792"].includes(options?.size ?? "")
          ? options!.size
          : "1792x1024") as "1024x1024" | "1792x1024" | "1024x1792",
        quality: (options?.quality as "standard" | "hd") || "standard",
      }),
      ...compatParams,
      n: 1,
    });

    const firstItem = response.data?.[0];

    // ── Async task submission (e.g. APIMart, some OpenAI-compatible proxies) ──
    const taskId = (firstItem as Record<string, unknown> | undefined)?.task_id as string | undefined;
    const taskStatus = (firstItem as Record<string, unknown> | undefined)?.status as string | undefined;
    if (taskId && taskStatus && taskStatus !== "succeed" && taskStatus !== "completed") {
      console.log(`[OpenAI generateImage] Async task submitted: ${taskId} (status=${taskStatus})`);
      return await this.pollImageTask(taskId);
    }

    // ── Sync response with URL ──
    const imageUrl = firstItem?.url;
    const imageB64 = (firstItem as { b64_json?: string } | undefined)?.b64_json;

    if (!imageUrl && !imageB64) {
      console.error(
        "[OpenAI generateImage] Unexpected response format:",
        JSON.stringify(response).slice(0, 500)
      );
      throw new Error(
        "No image URL or b64_json returned from image provider. " +
        "The selected model may not support image generation, or the provider uses an unsupported response format."
      );
    }

    if (imageB64) {
      return await this.saveImageBuffer(Buffer.from(imageB64, "base64"));
    }
    return await this.downloadImage(imageUrl!);
  }

  /** Poll an async image generation task until completion, then download and save. */
  private async pollImageTask(taskId: string): Promise<string> {
    const base = this.baseUrl.replace(/\/+$/, "");

    // Try both common polling endpoints
    const pollUrls = [
      `${base}/images/generations/${taskId}`,
      `${base}/tasks/${taskId}`,
    ];

    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise((r) => setTimeout(r, 2000)); // 2s interval

      for (const pollUrl of pollUrls) {
        try {
          const res = await fetch(pollUrl, {
            headers: { Authorization: `Bearer ${this.apiKey}` },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) continue;

          const body = await res.json();
          // Handle different response shapes
          const data = body.data ?? body;
          const item = Array.isArray(data) ? data[0] : data;
          const status = item?.status ?? item?.task_status
            ?? (item?.progress === 100 ? "succeed" : undefined)
            ?? (body.status as string | undefined);
          console.log(`[OpenAI pollImageTask] ${taskId} attempt ${attempt + 1}: status=${status ?? `progress=${item?.progress}`}`);

          if (status === "succeed" || status === "completed" || status === "done") {
            // Try URL first — handle multiple response shapes:
            // APIMart:  { result: { images: [{ url: ["https://..."] }] } }
            // Kling:   { task_result: { images: [{ url: "https://..." }] } }
            // OpenAI:  { url: "https://..." }
            // Generic: { result_url | image_url | data[0].url }
            const resultImages = item?.result?.images ?? item?.task_result?.images;
            const firstResultImage = Array.isArray(resultImages) ? resultImages[0] : undefined;
            const resultUrlRaw = firstResultImage?.url;
            // url may be a string or an array of strings
            const resultUrl = Array.isArray(resultUrlRaw) ? resultUrlRaw[0] : resultUrlRaw;

            const url = item?.url ?? item?.result_url ?? item?.image_url
              ?? resultUrl
              ?? item?.task_result?.image_url;
            if (url) return await this.downloadImage(url);

            // Try b64_json
            const b64 = item?.b64_json ?? firstResultImage?.b64_json
              ?? item?.task_result?.images?.[0]?.b64_json;
            if (b64) return await this.saveImageBuffer(Buffer.from(b64, "base64"));

            throw new Error(`Task ${taskId} completed but no image found in: ${JSON.stringify(item).slice(0, 300)}`);
          }
          if (status === "failed" || status === "error") {
            const msgRaw = item?.message ?? item?.task_status_msg ?? item?.error ?? "Unknown error";
            // msgRaw may be an object (e.g. { code, message }) — ensure we produce a string
            const msg = typeof msgRaw === "string" ? msgRaw : (msgRaw?.message || msgRaw?.code || JSON.stringify(msgRaw));
            throw new Error(`Image generation task failed: ${msg}`);
          }
          // Still processing — continue polling
          break; // Found the right endpoint, stop trying other URLs
        } catch (err) {
          if (err instanceof Error && (err.message.startsWith("Image generation task failed")
            || err.message.includes("completed but no image"))) {
            throw err;
          }
          // Network errors on one endpoint — try the next
          continue;
        }
      }
    }
    throw new Error(`Image generation task ${taskId} timed out after 120 retries`);
  }

  /** Download an image from URL and save to disk. */
  private async downloadImage(imageUrl: string): Promise<string> {
    const imageResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return await this.saveImageBuffer(buffer);
  }

  /** Save an image buffer to disk. */
  private async saveImageBuffer(buffer: Buffer): Promise<string> {
    const filename = `${genId()}.png`;
    const dir = path.join(this.uploadDir, "frames");
    fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }
}
