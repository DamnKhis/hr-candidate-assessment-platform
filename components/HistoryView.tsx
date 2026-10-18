import { useState, useEffect } from 'react';
import {
  getAllCandidates, getAllResults, deleteCandidate, getDBStats, exportDBJSON,
  type Candidate, type TestResult,
} from '../db';
import { FACTOR_NAMES } from '../constants';

interface Props {
  onBack: () => void;
  onViewCandidate: (candidateId: number) => void;
}

export default function HistoryView({ onBack, onViewCandidate }: Props) {
  const [candidates, setCandidates] = useState<(Candidate & { id: number })[]>([]);
  const [results, setResults] = useState<(TestResult & { id: number })[]>([]);
  const [stats, setStats] = useState({ candidates: 0, results: 0 });
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const refresh = () => {
    setCandidates(getAllCandidates());
    setResults(getAllResults());
    setStats(getDBStats());
  };

  useEffect(() => { refresh(); }, []);

  const filtered = candidates.filter(
    (c) =>
      c.fio.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getResultForCandidate = (id: number) =>
    results.find((r) => r.candidate_id === id);

  const handleDelete = (id: number) => {
    deleteCandidate(id);
    setConfirmDelete(null);
    refresh();
  };

  const handleExport = () => {
    const json = exportDBJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Database_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTopFactor = (result: TestResult & { id: number }): string => {
    const scores: number[] = JSON.parse(result.factor_scores);
    const maxIdx = scores.indexOf(Math.max(...scores));
    return FACTOR_NAMES[maxIdx] ?? '—';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 text-sm transition"
        >
          ← Назад
        </button>
        <h2 className="text-xl font-bold text-slate-800 flex-1">🗂️ База кандидатов</h2>
        <button
          onClick={handleExport}
          className="rounded-xl border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-4 text-sm transition"
        >
          📥 Экспорт БД (JSON)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Всего кандидатов', value: stats.candidates, icon: '👤' },
          { label: 'Тестов проведено', value: stats.results, icon: '📝' },
          { label: 'Протестировано, %', value: stats.candidates > 0 ? Math.round((stats.results / stats.candidates) * 100) : 0, icon: '📊' },
          { label: 'Записей в БД', value: stats.candidates + stats.results, icon: '🗃️' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-blue-600">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО или Email..."
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-slate-400 text-lg">📭 Нет кандидатов в базе</p>
          <p className="text-slate-400 text-sm mt-1">Заполните анкету и пройдите тест, чтобы добавить запись</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">ФИО</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Дата</th>
                  <th className="text-left px-4 py-3">Тест</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Топ-фактор</th>
                  <th className="text-right px-4 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const res = getResultForCandidate(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{c.fio}</div>
                        <div className="text-xs text-slate-400 md:hidden">{c.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{c.email}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">
                        {new Date(c.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        {res ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            ✅ Пройден
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            ⏳ Не пройден
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {res ? getTopFactor(res) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {res && (
                            <button
                              onClick={() => onViewCandidate(c.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition"
                            >
                              Отчёт
                            </button>
                          )}
                          {confirmDelete === c.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="text-xs px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
                              >
                                Да, удалить
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(c.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
