import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const PRIMARY_GEMINI_MODEL = 'gemini-3-pro-image-preview';
const STORAGE_BUCKET = 'thumbnail-assets';

type GenerateRequestBody = {
  prompt?: string;
  aspectRatio?: string;
  imageSize?: string;
};

type GeminiPart = {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

async function requestGeminiImage({
  apiKey,
  model,
  prompt,
  aspectRatio,
  imageSize,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  aspectRatio: string;
  imageSize?: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const config =
    model === PRIMARY_GEMINI_MODEL
      ? {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio,
            imageSize: imageSize || '1K',
          },
        }
      : {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio,
          },
        };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: config,
    }),
  });

  const raw = await response.text();
  let json: unknown = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  return { ok: response.ok, status: response.status, model, raw, json };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });
    }

    const body = (await request.json()) as GenerateRequestBody;
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY.' }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase env is not configured.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 });
    }

    const aspectRatio = body.aspectRatio || '16:9';
    const imageSize = body.imageSize || '1K';

    const geminiResult = await requestGeminiImage({
      apiKey: geminiApiKey,
      model: PRIMARY_GEMINI_MODEL,
      prompt,
      aspectRatio,
      imageSize,
    });

    if (!geminiResult.ok) {
      const errorText =
        (geminiResult.json as { error?: { message?: string } } | null)?.error?.message ||
        geminiResult.raw;
      const isQuotaError =
        geminiResult.status === 429 ||
        /quota|rate limit|billing|free_tier|please retry/i.test(errorText);

      if (isQuotaError) {
        return NextResponse.json(
          {
            error: 'Gemini quota exceeded.',
            detail:
              'Gemini API 쿼터/결제 한도에 도달했습니다. Google AI Studio에서 Billing/Quota를 활성화하거나 키를 교체한 뒤 다시 시도해주세요.',
            providerMessage: errorText,
            model: geminiResult.model,
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error: 'Gemini request failed.',
          detail: errorText,
          model: geminiResult.model,
        },
        { status: geminiResult.status || 500 },
      );
    }

    const geminiJson = geminiResult.json as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
    const parts: GeminiPart[] = geminiJson?.candidates?.[0]?.content?.parts || [];

    const generatedImagePart = [...parts]
      .reverse()
      .find((part) => {
        if (part.thought) return false;
        const inlineData = part.inlineData || part.inline_data;
        const mimeType = inlineData?.mimeType || inlineData?.mime_type;
        return Boolean(inlineData?.data && mimeType?.startsWith('image/'));
      });

    if (!generatedImagePart) {
      return NextResponse.json({ error: 'No generated image found in response.' }, { status: 502 });
    }

    const inlineData = generatedImagePart.inlineData || generatedImagePart.inline_data;
    const mimeType = inlineData?.mimeType || inlineData?.mime_type || 'image/png';
    const base64Data = inlineData?.data || '';
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileExt = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
    const fileName = `${Date.now()}-${randomUUID()}.${fileExt}`;
    const storagePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload image to storage.', detail: uploadError.message },
        { status: 500 },
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    if (signedUrlError) {
      return NextResponse.json(
        { error: 'Failed to create signed URL.', detail: signedUrlError.message },
        { status: 500 },
      );
    }

    const { data: thumbnailRow, error: insertError } = await supabase
      .from('thumbnails')
      .insert({
        user_id: user.id,
        title: prompt.slice(0, 80),
        prompt,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size_bytes: imageBuffer.byteLength,
      })
      .select('id, storage_bucket, storage_path, created_at')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save thumbnail metadata.', detail: insertError.message },
        { status: 500 },
      );
    }

    const textOutputs = parts
      .filter((part) => typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('\n')
      .trim();

    return NextResponse.json({
      thumbnail: thumbnailRow,
      imageUrl: signedUrlData.signedUrl,
      model: geminiResult.model,
      text: textOutputs || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Unexpected server error.', detail: message }, { status: 500 });
  }
}
