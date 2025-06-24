"use client";

import { generateContentFromModel } from "@/app/utils/actions/gemini-actions";
import { ShortsScript } from "@/types/shorts-generator.types";
import { ContentListUnion } from "@google/genai";
import { useState } from "react";

const SYSTEM_INSTRUCTION = `당신은 유튜브 쇼츠 비디오 스크립트를 작성하는 전문 작가입니다.
주어진 주제에 대해 시청자의 흥미를 끌 수 있는 5개의 장면으로 구성된 스크립트를 작성해야 합니다.
각 장면은 다음 3가지 요소를 반드시 포함해야 합니다:

1.  **자막 (subtitle)**: 화면에 표시될 짧고 간결한 텍스트 (1~2문장)
2.  **이미지 프롬프트 (image_prompt)**: 장면에 어울리는 이미지를 생성하기 위한 상세한 프롬프트 (Dall-E 또는 Midjourney와 같은 이미지 생성 AI가 이해할 수 있는 형식)
3.  **나레이션 (narration)**: 성우가 읽을 대본 (1~3문장)

결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

\`\`\`json
{
  "scenes": [
    {
      "scene": 1,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    },
    {
      "scene": 2,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    },
    {
      "scene": 3,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    },
    {
      "scene": 4,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    },
    {
      "scene": 5,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    }
  ]
}
\`\`\`
`;

export default function ShortsGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState<ShortsScript | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("주제를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setScript(null);

    try {
      const contents: ContentListUnion = [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_INSTRUCTION}\n\n주제: ${topic}`,
            },
          ],
        },
      ];

      const resultText = await generateContentFromModel(contents);

      if (!resultText) {
        throw new Error("Gemini로부터 응답을 받지 못했습니다.");
      }

      // Gemini가 생성한 텍스트에서 JSON 부분만 추출
      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        // 때로는 마크다운 블록 없이 순수 JSON만 반환할 수 있으므로, 전체 텍스트를 파싱 시도
        try {
          const parsedResult: ShortsScript = JSON.parse(resultText);
          setScript(parsedResult);
        } catch {
          throw new Error("응답에서 유효한 JSON 스크립트를 찾을 수 없습니다.");
        }
      } else {
        const jsonString = jsonMatch[1];
        const parsedResult: ShortsScript = JSON.parse(jsonString);
        setScript(parsedResult);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-teal-400 mb-8">
        유튜브 쇼츠 스크립트 생성기
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
            {error}
          </div>
        )}
        <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-slate-200">주제 입력</h2>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 우주에 대한 10가지 놀라운 사실"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
            rows={3}
          />
        </div>

        <div className="flex justify-center mt-6">
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="px-8 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "생성 중..." : "스크립트 생성"}
          </button>
        </div>
      </form>

      {script && (
        <div className="mt-8 p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">
            생성된 스크립트
          </h2>
          {script.scenes.map((scene) => (
            <div
              key={scene.scene}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <h3 className="text-xl font-semibold text-teal-400 mb-3">
                장면 #{scene.scene}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    자막
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="flex-grow p-3 bg-slate-900 rounded-md whitespace-pre-wrap">
                      {scene.subtitle}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.subtitle, `subtitle-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center"
                    >
                      {copiedText === `subtitle-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    이미지 프롬프트
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="flex-grow p-3 bg-slate-900 rounded-md font-mono text-sm whitespace-pre-wrap">
                      {scene.image_prompt}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.image_prompt, `prompt-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center"
                    >
                      {copiedText === `prompt-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    나레이션
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="flex-grow p-3 bg-slate-900 rounded-md whitespace-pre-wrap">
                      {scene.narration}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.narration, `narration-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center"
                    >
                      {copiedText === `narration-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
