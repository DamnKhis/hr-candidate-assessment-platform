import { useState, useCallback } from 'react';
import AnketaForm from './components/AnketaForm';
import TestForm from './components/TestForm';
import ResultsReport from './components/ResultsReport';
import HistoryView from './components/HistoryView';
import { TEST_KEYS } from './constants';
import { getAIConclusion, type ProfileData } from './gigachat';
import {
  insertCandidate,
  insertTestResult,
  getCandidateById,
  getResultByCandidate,
} from './db';

type Step = 'anketa' | 'test' | 'loading' | 'results' | 'history';

interface SessionData {
  profile: ProfileData;
  scores: number[];
  aiConclusion: string;
  candidateId: number;
}

function calcScores(responses: number[][]): number[] {
  const final = new Array(12).fill(0);
  for (let i = 0; i < responses.length; i++) {
    for (let j = 0; j < 4; j++) {
      final[TEST_KEYS[i][j] - 1] += responses[i][j];
    }
  }
  return final;
}

// Steps indicator
function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'anketa', label: 'Анкета', icon: '📋' },
    { key: 'test', label: 'Тестирование', icon: '🧠' },
    { key: 'results', label: 'Результаты', icon: '📊' },
  ];
  const activeIdx = steps.findIndex((s) => s.key === step);
  if (step === 'history' || step === 'loading') return null;
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition flex-1 justify-center ${
              i === activeIdx
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : i < activeIdx
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-4 flex-shrink-0 mx-1 ${i < activeIdx ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>('anketa');
  const [session, setSession] = useState<Partial<SessionData>>({});
  const [loadingMsg, setLoadingMsg] = useState('');

  // Step 1: Anketa submitted → save to DB, go to test
  const handleAnketaSubmit = useCallback((profile: ProfileData) => {
    const candidateId = insertCandidate({
      fio: profile['ФИО'],
      b_date: profile['Дата рождения'],
      b_place: profile['Место рождения'],
      addr: profile['Адрес'],
      phone: profile['Телефон'],
      email: profile['Email'],
      marital: profile['Семья'],
      langs: profile['Языки'],
      hobby: profile['Хобби'],
      edu: profile['Образование'],
      exp: profile['Опыт'],
      mot: profile['Планы'],
      created_at: new Date().toISOString(),
    });
    setSession({ profile, candidateId });
    setStep('test');
  }, []);

  // Step 2: Test submitted → calc scores, call AI, save to DB
  const handleTestSubmit = useCallback(
    async (responses: number[][]) => {
      const scores = calcScores(responses);
      setLoadingMsg('Вычисление мотивационного профиля...');
      setStep('loading');

      setTimeout(async () => {
        setLoadingMsg('🤖 AI анализирует профиль кандидата...');
        const profile = session.profile!;
        const candidateId = session.candidateId!;

        const aiConclusion = await getAIConclusion(profile, scores);

        insertTestResult({
          candidate_id: candidateId,
          factor_scores: JSON.stringify(scores),
          responses: JSON.stringify(responses),
          ai_conclusion: aiConclusion,
          created_at: new Date().toISOString(),
        });

        setSession((s) => ({ ...s, scores, aiConclusion }));
        setStep('results');
      }, 300);
    },
    [session]
  );

  // View a specific candidate from history
  const handleViewCandidate = useCallback((candidateId: number) => {
    const c = getCandidateById(candidateId);
    const r = getResultByCandidate(candidateId);
    if (!c || !r) return;
    const profile: ProfileData = {
      ФИО: c.fio,
      'Дата рождения': c.b_date,
      'Место рождения': c.b_place,
      Адрес: c.addr,
      Телефон: c.phone,
      Email: c.email,
      Семья: c.marital,
      Языки: c.langs,
      Хобби: c.hobby,
      Образование: c.edu,
      Опыт: c.exp,
      Планы: c.mot,
    };
    setSession({
      profile,
      candidateId,
      scores: JSON.parse(r.factor_scores),
      aiConclusion: r.ai_conclusion,
    });
    setStep('results');
  }, []);

  const handleReset = () => {
    setSession({});
    setStep('anketa');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow">
              🏛️
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 leading-tight">HR-Портал</div>
              <div className="text-xs text-slate-400 leading-tight">Мэрия Казани</div>
            </div>
          </div>
          <div className="flex-1" />
          {step !== 'history' && (
            <button
              onClick={() => setStep('history')}
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition"
            >
              🗂️ <span className="hidden sm:inline">База кандидатов</span>
            </button>
          )}
          {step === 'history' && (
            <button
              onClick={handleReset}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition"
            >
              + Новый кандидат
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* DB badge */}
        {step !== 'loading' && step !== 'history' && (
          <div className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            SQLite3 (localStorage) — данные сохранены локально
          </div>
        )}

        <StepBar step={step} />

        {/* Step panels */}
        {step === 'anketa' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">📋</span>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Анкета кандидата</h1>
                <p className="text-sm text-slate-500">Заполните все поля перед началом тестирования</p>
              </div>
            </div>
            <AnketaForm onSubmit={handleAnketaSubmit} />
          </div>
        )}

        {step === 'test' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🧠</span>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Мотивационный профиль</h1>
                <p className="text-sm text-slate-500">
                  33 вопроса · кандидат: <strong>{session.profile?.['ФИО']}</strong>
                </p>
              </div>
            </div>
            <TestForm
              onSubmit={handleTestSubmit}
              onBack={() => setStep('anketa')}
            />
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700">{loadingMsg}</p>
              <p className="text-sm text-slate-400 mt-1">Подождите, пожалуйста...</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {step === 'results' && session.scores && session.profile && (
          <ResultsReport
            profile={session.profile}
            scores={session.scores}
            aiConclusion={session.aiConclusion ?? ''}
            candidateId={session.candidateId ?? 0}
            onReset={handleReset}
            onViewHistory={() => setStep('history')}
          />
        )}

        {step === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <HistoryView
              onBack={handleReset}
              onViewCandidate={handleViewCandidate}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 print:hidden">
        HR-Портал Мэрии Казани · SQLite3 (localStorage) · GigaChat AI · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
