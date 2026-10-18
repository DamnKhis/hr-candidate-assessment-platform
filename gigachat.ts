import { AUTH_DATA, FACTOR_NAMES } from './constants';

// GigaChat uses self-signed certs — in browser we cannot disable SSL.
// We proxy via a CORS-friendly approach using fetch with mode:cors.
// NOTE: GigaChat API is only accessible from Russian networks;
// the app gracefully falls back to a local analysis if unreachable.

async function getToken(): Promise<string> {
  const res = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${AUTH_DATA}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'RqUID': crypto.randomUUID(),
    },
    body: 'scope=GIGACHAT_API_PERS',
    // Cannot set rejectUnauthorized in browser; CORS may also block this
  });
  if (!res.ok) throw new Error('Token fetch failed');
  const data = await res.json();
  return data.access_token as string;
}

export interface ProfileData {
  ФИО: string;
  'Дата рождения': string;
  'Место рождения': string;
  Адрес: string;
  Телефон: string;
  Email: string;
  Семья: string;
  Языки: string;
  Образование: string;
  Опыт: string;
  Хобби: string;
  Планы: string;
}

function buildPrompt(profile: ProfileData, scores: number[]): string {
  const scoreDetails = FACTOR_NAMES.map((n, i) => `${n}: ${scores[i]}`).join(', ');
  return (
    `Ты опытный HR-специалист Мэрии Казани. Проанализируй кандидата и дай подробное заключение.\n\n` +
    `== АНКЕТНЫЕ ДАННЫЕ ==\n` +
    `ФИО: ${profile['ФИО']}\n` +
    `Дата рождения: ${profile['Дата рождения']}\n` +
    `Место рождения: ${profile['Место рождения']}\n` +
    `Семейное положение: ${profile['Семья']}\n` +
    `Языки: ${profile['Языки']}\n` +
    `Образование: ${profile['Образование']}\n` +
    `Опыт работы: ${profile['Опыт']}\n` +
    `Хобби: ${profile['Хобби']}\n` +
    `Мотивация / профессиональные планы: ${profile['Планы']}\n\n` +
    `== МОТИВАЦИОННЫЙ ПРОФИЛЬ (тест Шейна) ==\n` +
    `${scoreDetails}\n\n` +
    `Дай структурированное заключение:\n` +
    `1. Краткий психологический портрет кандидата\n` +
    `2. Ключевые мотиваторы и их соответствие государственной службе\n` +
    `3. Потенциальные риски и зоны развития\n` +
    `4. Рекомендация: рекомендован / условно рекомендован / не рекомендован — с обоснованием`
  );
}

/** Local fallback analysis based on scores */
function localAnalysis(profile: ProfileData, scores: number[]): string {
  const sorted = scores
    .map((s, i) => ({ name: FACTOR_NAMES[i], score: s }))
    .sort((a, b) => b.score - a.score);

  const top3 = sorted.slice(0, 3);
  const low3 = sorted.slice(-3).reverse();

  const topStr = top3.map((f) => `«${f.name}» (${f.score})`).join(', ');
  const lowStr = low3.map((f) => `«${f.name}» (${f.score})`).join(', ');

  const total = scores.reduce((a, b) => a + b, 0);
  const avg = (total / scores.length).toFixed(1);

  // Basic recommendation logic
  // High «Стремление к достижениям», «Признание», «Самосовершенствование» = good for civil service
  const achievement = scores[6]; // index 6
  const recognition = scores[5]; // index 5
  const selfDev = scores[10];    // index 10
  const interestingWork = scores[11]; // index 11
  const goodScore = achievement + recognition + selfDev + interestingWork;

  let recommendation = '';
  if (goodScore >= 60) {
    recommendation = '✅ РЕКОМЕНДОВАН. Кандидат демонстрирует высокую ориентацию на достижения, профессиональный рост и интерес к содержательной работе — ключевые качества для государственной службы.';
  } else if (goodScore >= 35) {
    recommendation = '⚠️ УСЛОВНО РЕКОМЕНДОВАН. Кандидат имеет частичное соответствие профилю государственного служащего. Рекомендуется дополнительное собеседование.';
  } else {
    recommendation = '❌ ТРЕБУЕТ ДОПОЛНИТЕЛЬНОЙ ПРОВЕРКИ. Мотивационный профиль кандидата слабо соответствует требованиям государственной службы.';
  }

  return (
    `📋 АВТОМАТИЗИРОВАННОЕ ЗАКЛЮЧЕНИЕ (локальный анализ)\n\n` +
    `Кандидат: ${profile['ФИО']}\n` +
    `Средний балл по факторам: ${avg}\n\n` +
    `1. ПСИХОЛОГИЧЕСКИЙ ПОРТРЕТ\n` +
    `Ведущие мотиваторы кандидата: ${topStr}. ` +
    `Это свидетельствует о выраженной ориентации на ${top3[0].name.toLowerCase()}, ` +
    `что является ${goodScore >= 40 ? 'позитивным' : 'нейтральным'} сигналом для работы в органах власти.\n\n` +
    `2. КЛЮЧЕВЫЕ МОТИВАТОРЫ\n` +
    `Наиболее значимые для кандидата факторы: ${topStr}.\n` +
    `Наименее значимые факторы: ${lowStr}.\n\n` +
    `3. РИСКИ И ЗОНЫ РАЗВИТИЯ\n` +
    `Низкая выраженность факторов ${lowStr} может указывать на недостаточную мотивацию ` +
    `в соответствующих аспектах служебной деятельности. ` +
    `Рекомендуется уточнить карьерные ожидания кандидата.\n\n` +
    `4. РЕКОМЕНДАЦИЯ\n${recommendation}`
  );
}

export async function getAIConclusion(
  profile: ProfileData,
  scores: number[]
): Promise<string> {
  try {
    const token = await getToken();
    const prompt = buildPrompt(profile, scores);

    const res = await fetch(
      'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      }
    );

    if (!res.ok) throw new Error('GigaChat API error');
    const data = await res.json();
    return data.choices[0].message.content as string;
  } catch {
    // Fallback to local analysis
    return localAnalysis(profile, scores);
  }
}
