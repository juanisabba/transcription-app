import type {
  IExternalApiService,
  JobStatus,
} from "../../../application/ports/IExternalApiService";

const SPEECHMATICS_BASE_URL =
  process.env.SPEECHMATICS_BASE_URL ?? "https://eu1.asr.api.speechmatics.com/v2";

const SPEECHMATICS_MANAGEMENT_URL =
  process.env.SPEECHMATICS_MANAGEMENT_URL ?? "https://mp.speechmatics.com/v1";

const SPEECHMATICS_RT_WS_URL =
  process.env.SPEECHMATICS_RT_WS_URL ?? "wss://eu2.rt.speechmatics.com/v2/";

interface SpeechmaticsRealtimeTokenResponse {
  key_value: string;
}

interface SpeechmaticsJobResponse {
  id: string;
}

interface SpeechmaticsJobStatusResponse {
  job: { id: string; status: string };
}

interface SpeechmaticsTranscriptResult {
  alternatives?: Array<{ content: string }>;
  type: string;
}

interface SpeechmaticsTranscriptResponse {
  results?: SpeechmaticsTranscriptResult[];
}

/**
 * Speechmatics Batch API implementation of IExternalApiService.
 *
 * Uses the free tier at eu1.asr.api.speechmatics.com.
 * Requires SPEECHMATICS_API_KEY and optionally SPEECHMATICS_WEBHOOK_URL.
 */
export class SpeechMaticsAdapter implements IExternalApiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly webhookUrl: string;

  constructor(
    apiKey?: string,
    baseUrl?: string,
    webhookUrl?: string
  ) {
    this.apiKey = apiKey ?? process.env.SPEECHMATICS_API_KEY ?? "";
    this.baseUrl = baseUrl ?? SPEECHMATICS_BASE_URL;
    this.webhookUrl =
      webhookUrl ?? process.env.SPEECHMATICS_WEBHOOK_URL ?? "";
  }

  private async request<T>(
    method: string,
    path: string,
    body?: FormData | null
  ): Promise<{ status: number; data: T }> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(30000),
    };

    if (body) {
      init.body = body;
    }

    const response = await fetch(url, init);
    const data = (await response.json().catch(() => ({}))) as T;
    return { status: response.status, data };
  }

  async submitJob(
    s3Url: string,
    language: string = "en"
  ): Promise<{ jobId: string }> {
    const config: Record<string, unknown> = {
      type: "transcription",
      transcription_config: { language },
      fetch_data: { url: s3Url },
    };

    if (this.webhookUrl?.trim()) {
      config.notification_config = [
        {
          url: this.webhookUrl.trim(),
          contents: ["transcript"],
          method: "post",
        },
      ];
    }

    const formData = new FormData();
    formData.append("config", JSON.stringify(config));

    const { status, data } = await this.request<SpeechmaticsJobResponse>(
      "POST",
      "/jobs",
      formData
    );

    if (status !== 201 || !(data as SpeechmaticsJobResponse).id) {
      throw new Error(
        `Speechmatics submit job failed: ${status} ${JSON.stringify(data)}`
      );
    }

    return { jobId: (data as SpeechmaticsJobResponse).id };
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const { data } = await this.request<SpeechmaticsJobStatusResponse>(
      "GET",
      `/jobs/${jobId}`
    );

    const status = (data as SpeechmaticsJobStatusResponse).job?.status ?? "running";
    return this.normalizeStatus(status);
  }

  async getResult(jobId: string): Promise<{ transcript: string }> {
    const { data } = await this.request<SpeechmaticsTranscriptResponse>(
      "GET",
      `/jobs/${jobId}/transcript`
    );

    const results = (data as SpeechmaticsTranscriptResponse).results ?? [];
    const transcript = results
      .filter(
        (r: SpeechmaticsTranscriptResult) =>
          r.type === "word" && r.alternatives?.[0]?.content
      )
      .map((r: SpeechmaticsTranscriptResult) => r.alternatives![0].content)
      .join(" ")
      .trim();

    return { transcript };
  }

  async createRealtimeToken(ttl: number = 60): Promise<{ token: string; wsUrl: string }> {
    const url = `${SPEECHMATICS_MANAGEMENT_URL}/api_keys?type=rt`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Speechmatics realtime token creation failed: ${response.status} ${body}`
      );
    }

    const data = (await response.json()) as SpeechmaticsRealtimeTokenResponse;

    if (!data.key_value) {
      throw new Error("Speechmatics did not return a realtime token");
    }

    return { token: data.key_value, wsUrl: SPEECHMATICS_RT_WS_URL };
  }

  private normalizeStatus(status: string): JobStatus {
    const s = status.toLowerCase();
    if (s === "done" || s === "complete") return "done";
    if (s === "rejected" || s === "failed") return "rejected";
    if (s === "expired") return "expired";
    return "running";
  }
}
