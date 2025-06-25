"use client";

import { generateContentFromModel } from "@/app/utils/actions/gemini-actions";
import { ShortsScript } from "@/types/shorts-generator.types";
import { ContentListUnion } from "@google/genai";
import { useState } from "react";

const SYSTEM_INSTRUCTION = `당신은 유튜브 쇼츠 비디오 스크립트를 작성하는 전문 작가입니다.
주어진 주제에 대해 시청자의 흥미를 끌 수 있는 최소 8개 이상의 장면으로 구성된 스크립트를 작성해야 합니다.
각 장면은 다음 5가지 요소를 반드시 포함해야 합니다:

1.  **자막 (subtitle)**: 화면에 표시될 짧고 간결한 텍스트 (1~2문장)
2.  **이미지 프롬프트 (image_prompt)**: 장면에 어울리는 이미지를 생성하기 위한 상세한 영어로 작성된 프롬프트 (Gemini, Dall-E 또는 Midjourney와 같은 이미지 생성 AI가 이해할 수 있는 형식)
3.  **나레이션 (narration)**: 성우가 읽을 대본 (1~3문장)
4.  **장면 (scene)**: 장면은 최소 8개 이상으로 구성해줘
5.  **쇼츠 설명 (shorts_description)**: 생성된 스크립트 내용을 바탕으로, 사람들의 흥미를 유발하고 클릭을 유도할 만한 유튜브 쇼츠 설명글을 1~2문장으로 작성해줘. (적절한 이모티콘과 줄바꿈 포함)

결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

# json 반환시 주의사항
- 반드시 json 형식에 맞도록 반환해줘

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
  ],
  "shorts_description": "..."
}
\`\`\`
`;

const RECOMMENDATION_SYSTEM_INSTRUCTION = `당신은 유튜브 쇼츠 콘텐츠 기획 전문가입니다.
사용자가 입력한 키워드나 문장을 바탕으로, 시청자들의 호기심을 자극하고 클릭을 유도할 수 있는 '후킹'이 강력한 유튜브 쇼츠 영상 주제 5개를 추천해주세요.
각 주제는 "절대 후회 안 하는 OOO 5가지" 또는 "99%가 모르는 OOO의 비밀"과 같은 형식으로, 구체적인 숫자나 강력한 표현을 사용하는 것이 좋습니다.
결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

\`\`\`json
{
  "topics": [
    "주제 1",
    "주제 2",
    "주제 3",
    "주제 4",
    "주제 5"
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

  // 공통 이미지 프롬프트 상태
  const [commonImagePrompt, setCommonImagePrompt] = useState(
    "모든 사람들이 편안하게 볼 수 있고, 익숙하고 귀여운 의인화된 강아지 캐릭터를 활용한 디즈니 애니메이션으로 스타일로 만들어줘"
  );

  // 주제 추천 기능 상태
  const [recommendationInput, setRecommendationInput] = useState("");
  const [recommendedTopics, setRecommendedTopics] = useState<string[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleScriptChange = (
    sceneIndex: number,
    field: "subtitle" | "image_prompt" | "narration",
    value: string
  ) => {
    if (!script) return;
    const updatedScenes = script.scenes.map((s, i) => {
      if (i === sceneIndex) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setScript({ ...script, scenes: updatedScenes });
  };

  const handleDescriptionChange = (value: string) => {
    if (!script) return;
    setScript({ ...script, shorts_description: value });
  };

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendationInput.trim()) {
      setRecommendationError("키워드를 입력해주세요.");
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError(null);
    setRecommendedTopics([]);

    try {
      const contents: ContentListUnion = [
        {
          role: "user",
          parts: [
            {
              text: `${RECOMMENDATION_SYSTEM_INSTRUCTION}\n\n키워드: ${recommendationInput}`,
            },
          ],
        },
      ];

      const resultText = await generateContentFromModel(contents);

      if (!resultText) {
        throw new Error("Gemini로부터 응답을 받지 못했습니다.");
      }

      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
      let parsedResult: { topics: string[] };

      if (!jsonMatch || !jsonMatch[1]) {
        try {
          parsedResult = JSON.parse(resultText);
        } catch {
          throw new Error("응답에서 유효한 JSON 형식을 찾을 수 없습니다.");
        }
      } else {
        const jsonString = jsonMatch[1];
        parsedResult = JSON.parse(jsonString);
      }

      if (parsedResult.topics && Array.isArray(parsedResult.topics)) {
        setRecommendedTopics(parsedResult.topics);
      } else {
        throw new Error("응답의 'topics' 필드가 유효하지 않습니다.");
      }
    } catch (err) {
      setRecommendationError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handleTopicSelect = (selectedTopic: string) => {
    setTopic(selectedTopic);
    document.getElementById("main-topic-input")?.focus();
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
      const prompt = `${SYSTEM_INSTRUCTION}\n\nA.주제: ${topic}${
        commonImagePrompt
          ? `\n\nB.공통 이미지 프롬프트
          1. 이미지에 텍스트는 포함시키지말아줘. 해당 규칙은 개별 프롬프트에 모두 추가해줘.
          2. 모든 이미지 프롬프트는 개별적으로 이미지 생성 ai에 쓰일거야. 따라서, 개별적으로 사용되더라도 통일성있는 이미지 생성을 위하여 최대 얼굴, 키, 몸무게, 덩치, 옷, 헤어스타일 등 이미지 생성에 필요한 모든 요소를 구체적인 설명을 포함시켜줘.
          3. ${commonImagePrompt}`
          : ""
      }`;

      const contents: ContentListUnion = [
        {
          role: "user",
          parts: [{ text: prompt }],
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

      <form onSubmit={handleRecommend} className="space-y-4 mb-12">
        <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-slate-200">✨ AI 주제 추천</h2>
          <p className="text-slate-400">
            어떤 주제로 쇼츠를 만들지 막막하신가요? 키워드를 입력하면 AI가
            매력적인 주제를 추천해 드립니다.
          </p>
          <textarea
            value={recommendationInput}
            onChange={(e) => setRecommendationInput(e.target.value)}
            placeholder="예: 강아지, 우주, 코딩 꿀팁"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
            rows={2}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={recommendationLoading || !recommendationInput.trim()}
              className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {recommendationLoading ? "추천받는 중..." : "추천받기"}
            </button>
          </div>
        </div>
        {recommendationError && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {recommendationError}
          </div>
        )}
        {recommendedTopics.length > 0 && (
          <div className="p-4 bg-slate-800/30 rounded-xl space-y-3">
            <h3 className="text-lg font-semibold text-slate-300">추천 주제:</h3>
            <div className="flex flex-wrap gap-2">
              {recommendedTopics.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleTopicSelect(item)}
                  className="px-4 py-2 bg-teal-500/20 text-teal-300 rounded-full hover:bg-teal-500/40 hover:text-white transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
            {error}
          </div>
        )}
        <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-slate-200">주제 입력</h2>
          <textarea
            id="main-topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 우주에 대한 10가지 놀라운 사실"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
            rows={3}
          />
          <h3 className="text-lg font-bold text-slate-300 pt-2">
            공통 이미지 프롬프트 (선택)
          </h3>
          <p className="text-sm text-slate-400 -mt-2">
            모든 장면에 공통적으로 적용될 이미지 스타일이나 요소를 입력해주세요.
            (예: &quot;cinematic, hyper-realistic, 8k&quot;)
          </p>
          <textarea
            id="common-prompt-input"
            value={commonImagePrompt}
            onChange={(e) => setCommonImagePrompt(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-200">
              생성된 스크립트 (수정 가능)
            </h2>
            <button
              type="button"
              onClick={() =>
                handleCopy(JSON.stringify(script, null, 2), "full-script")
              }
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {copiedText === "full-script"
                ? "✅ 복사 완료!"
                : "📜 전체 스크립트 복사 (JSON)"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                쇼츠 설명
              </label>
              <div className="flex items-start space-x-2">
                <textarea
                  value={script.shorts_description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(script.shorts_description, `shorts-description`)
                  }
                  className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                >
                  {copiedText === `shorts-description` ? "✅" : "📋"}
                </button>
              </div>
            </div>
          </div>

          {script.scenes.map((scene, index) => (
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
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={scene.subtitle}
                      onChange={(e) =>
                        handleScriptChange(index, "subtitle", e.target.value)
                      }
                      className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.subtitle, `subtitle-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                    >
                      {copiedText === `subtitle-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    이미지 프롬프트
                  </label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={scene.image_prompt}
                      onChange={(e) =>
                        handleScriptChange(
                          index,
                          "image_prompt",
                          e.target.value
                        )
                      }
                      className="w-full flex-grow p-3 bg-slate-900 rounded-md font-mono text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.image_prompt, `prompt-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                    >
                      {copiedText === `prompt-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    나레이션
                  </label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={scene.narration}
                      onChange={(e) =>
                        handleScriptChange(index, "narration", e.target.value)
                      }
                      className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.narration, `narration-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
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
