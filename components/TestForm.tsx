import React, { useState, useRef } from 'react';
import { QUESTIONS } from '../constants';

interface Props {
  onSubmit: (responses: number[][]) => void;
  onBack: () => void;
}

const VARIANT_KEYS = ['a', 'b', 'v', 'g'] as const;
const VARIANT_LABELS = ['а', 'б', 'в', 'г'];

function initResponses(): number[][] {
  return QUESTIONS.map(() => [0, 0, 0, 0]);
}

export default function TestForm({ onSubmit, onBack }: Props) {
  const [responses, setResponses] = useState<number[][]>(initResponses);
  const [errors, setErrors] = useState<number[]>([]);
  const [globalError, setGlobalError] = useState('');
  const topRef = useRef<HTMLFormElement>(null);

  const setVal = (qi: number, vi: number, val: number) => {
    setResponses((prev) => {
      const next = prev.map((r) => [...r]);
      next[qi][vi] = Math.max(0, Math.min(11, val));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bad = responses
      .map((r, i) => ({ i, sum: r.reduce((a, b) => a + b, 0) }))
      .filter(({ sum }) => sum !== 11)
      .map(({ i }) => i + 1);

    if (bad.length > 0) {
      setErrors(bad);
      setGlobalError(
        `❌ Ошибка в вопросах № ${bad.join(', ')}. В каждом вопросе сумма баллов должна быть ровно 11!`
      );
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setErrors([]);
    setGlobalError('');
    onSubmit(responses);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2" ref={topRef} id="test-form">
      <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-5 py-3 text-sm text-blue-800">
        💡 <strong>Инструкция:</strong> Распределите строго <strong>11 баллов</strong> между четырьмя вариантами ответа
        (а, б, в, г). Можно поставить 0 одному варианту и все 11 другому, или распределить иначе — главное сумма = 11.
      </div>

      {globalError && (
        <div className="rounded-xl bg-red-50 border border-red-300 px-5 py-3 text-sm text-red-700 font-medium">
          {globalError}
        </div>
      )}

      {QUESTIONS.map((item, qi) => {
        const rowSum = responses[qi].reduce((a, b) => a + b, 0);
        const hasError = errors.includes(qi + 1);

        return (
          <div
            key={qi}
            className={`rounded-xl border p-4 transition ${
              hasError
                ? 'border-red-400 bg-red-50'
                : rowSum === 11
                ? 'border-green-300 bg-green-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-800 leading-snug">{item.q}</p>
              <span
                className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                  rowSum === 11
                    ? 'bg-green-100 text-green-700'
                    : hasError
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {rowSum} / 11
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {VARIANT_KEYS.map((key, vi) => {
                const textKey = key === 'v' ? 'v' : key;
                const text = item[textKey as keyof typeof item];
                return (
                  <div key={vi} className="flex flex-col gap-1">
                    <div
                      className="text-xs text-slate-500 leading-snug"
                      style={{ minHeight: '3.5rem' }}
                    >
                      <span className="font-bold text-slate-700">({VARIANT_LABELS[vi]})</span>{' '}
                      {text}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setVal(qi, vi, responses[qi][vi] - 1)}
                        className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center transition"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={11}
                        value={responses[qi][vi]}
                        onChange={(e) => setVal(qi, vi, parseInt(e.target.value) || 0)}
                        className="w-12 text-center rounded-md border border-slate-300 bg-white py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => setVal(qi, vi, responses[qi][vi] + 1)}
                        className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white/90 backdrop-blur border-t border-slate-200 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 transition"
        >
          ← Назад к анкете
        </button>
        <button
          type="submit"
          className="flex-[2] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition shadow-md shadow-blue-200"
        >
          Рассчитать результат →
        </button>
      </div>
    </form>
  );
}
