import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const execFileAsync = promisify(execFile);

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

async function transcribeWithGroq(
  audioBlob: Blob,
  apiKey: string,
  lang?: string
): Promise<string | null> {
  try {
    const isoLang =
      typeof lang === "string" && /^[a-z]{2}(?:-[A-Z]{2})?$/i.test(lang.trim())
        ? lang.trim().split("-")[0].toLowerCase()
        : "en";

    const form = new FormData();
    form.append("file", audioBlob, "speech.wav");
    form.append("model", "whisper-large-v3-turbo");
    form.append("language", isoLang);

    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
        body: form,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.text?.trim() || null;
  } catch {
    return null;
  }
}

async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: new Uint8Array(audioBuffer),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function transcribeWithOpenAI(
  audioBlob: Blob,
  apiKey: string
): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("file", audioBlob, "speech.wav");
    form.append("model", "whisper-1");
    form.append("language", "en");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.text?.trim() || null;
  } catch {
    return null;
  }
}

async function transcribeWithWindowsSpeech(
  audioBuffer: Buffer
): Promise<string | null> {
  if (process.platform !== "win32") return null;

  const tmpWavPath = path.join(
    os.tmpdir(),
    `bolenglish-${crypto.randomUUID()}.wav`
  );

  try {
    await fs.writeFile(tmpWavPath, audioBuffer);

    const psScript = `
Add-Type -AssemblyName System.Speech
$wavPath = $env:BOL_WAV_PATH
$installed = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
if (-not $installed -or $installed.Count -eq 0) { exit 0 }
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine($installed[0].Culture)
$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
$rec.SetInputToWaveFile($wavPath)
$result = $rec.Recognize()
$rec.Dispose()
if ($result -and $result.Text) { Write-Output $result.Text }
`.trim();

    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      {
        env: { ...process.env, BOL_WAV_PATH: tmpWavPath },
        timeout: 15000,
      }
    );

    const text = stdout.trim();
    return text || null;
  } catch (err) {
    console.warn("Windows Speech fallback error:", err);
    return null;
  } finally {
    await fs.unlink(tmpWavPath).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioField = formData.get("audio");

    if (!audioField || !(audioField instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing audio file." },
        { status: 400 }
      );
    }

    if (audioField.size === 0 || audioField.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Invalid audio size." },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioField.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const langField = formData.get("lang");
    const lang = typeof langField === "string" ? langField : undefined;

    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      const text = await transcribeWithGroq(audioField, groqKey, lang);
      if (text) {
        return NextResponse.json({ transcript: text, engine: "groq-whisper" });
      }
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim();
    if (deepgramKey) {
      const text = await transcribeWithDeepgram(audioBuffer, deepgramKey);
      if (text) {
        return NextResponse.json({ transcript: text, engine: "deepgram" });
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const text = await transcribeWithOpenAI(audioField, openaiKey);
      if (text) {
        return NextResponse.json({ transcript: text, engine: "openai" });
      }
    }

    const winText = await transcribeWithWindowsSpeech(audioBuffer);
    if (winText) {
      return NextResponse.json({ transcript: winText, engine: "windows-speech" });
    }

    return NextResponse.json(
      { error: "Could not recognize speech. Please speak clearly and try again." },
      { status: 422 }
    );
  } catch (error) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { error: "Audio transcription failed." },
      { status: 500 }
    );
  }
}
