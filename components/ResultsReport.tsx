// react import not needed with new JSX transform
import { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, LabelList,
} from 'recharts';
import { FACTOR_NAMES } from '../constants';
import type { ProfileData } from '../gigachat';

interface Props {
  profile: ProfileData;
  scores: number[];
  aiConclusion: string;
  candidateId: number;
  onReset: () => void;
  onViewHistory: () => void;
}

const COLORS = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
  '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#0EA5E9', '#64748B',
];

function getTop3(scores: number[]): { name: string; score: number }[] {
  return scores
    .map((s, i) => ({ name: FACTOR_NAMES[i], score: s }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function interpretScore(_name: string, score: number): string {
  if (score >= 25) return 'очень высокий';
  if (score >= 18) return 'высокий';
  if (score >= 12) return 'средний';
  if (score >= 6) return 'ниже среднего';
  return 'низкий';
}

function formatDateTime(value: Date = new Date()): string {
  return value.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function makeSafeFileName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'report';
}

function buildWordDocument(profile: ProfileData, scores: number[], aiConclusion: string, candidateId: number) {
  const top3 = getTop3(scores);

  const profileRows = Object.entries(profile).map(([field, value]) => (
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: field, bold: true }),
              ],
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph(String(value)),
          ],
        }),
      ],
    })
  ));

  const scoreRows = FACTOR_NAMES.map((name, i) => (
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(String(i + 1))] }),
        new TableCell({ children: [new Paragraph(name)] }),
        new TableCell({ children: [new Paragraph(String(scores[i] ?? 0))] }),
        new TableCell({ children: [new Paragraph(interpretScore(name, scores[i] ?? 0))] }),
      ],
    })
  ));

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          new Paragraph({
            text: 'Итоговое заключение',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Кандидат: ${profile['ФИО']}`,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `ID кандидата: ${candidateId} · Сформировано: ${formatDateTime()}`,
              }),
            ],
            spacing: { after: 300 },
          }),

          new Paragraph({
            text: 'Ключевые мотиваторы',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 120 },
          }),
          ...top3.map((item, index) => (
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. ${item.name}: `, bold: true }),
                new TextRun({ text: `${item.score} (${interpretScore(item.name, item.score)})` }),
              ],
              spacing: { after: 60 },
            })
          )),

          new Paragraph({
            text: 'Анкетные данные кандидата',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: profileRows,
          }),

          new Paragraph({
            text: 'Результаты мотивационного профиля',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '№', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Фактор мотивации', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Балл', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Уровень', bold: true })] })] }),
                ],
              }),
              ...scoreRows,
            ],
          }),

          new Paragraph({
            text: 'AI-аналитика (GigaChat)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 120 },
          }),
          ...aiConclusion.split('\n').map((line) => (
            new Paragraph({
              text: line || ' ',
              spacing: { after: 80 },
            })
          )),
        ],
      },
    ],
  });
}

function exportWordReport(profile: ProfileData, scores: number[], aiConclusion: string, candidateId: number) {
  return Packer.toBlob(buildWordDocument(profile, scores, aiConclusion, candidateId)).then((blob) => {
    const fileName = `HR_Report_${makeSafeFileName(profile['ФИО'])}_${Date.now()}.docx`;
    saveAs(blob, fileName);
  });
}

export default function ResultsReport({
  profile, scores, aiConclusion, candidateId, onReset, onViewHistory,
}: Props) {
  const chartData = FACTOR_NAMES.map((name, i) => ({ name, score: scores[i] }));
  const top3 = getTop3(scores);

  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const [draftConclusion, setDraftConclusion] = useState(aiConclusion);
  const [isExportingWord, setIsExportingWord] = useState(false);

  useEffect(() => {
    setDraftProfile(profile);
    setDraftConclusion(aiConclusion);
    setIsEditing(false);
  }, [profile, aiConclusion, candidateId]);

  const editableProfileEntries = useMemo(
    () => Object.entries(draftProfile) as [keyof ProfileData, string][],
    [draftProfile]
  );

  const handlePrint = () => window.print();

  const handleExportJSON = () => {
    const data = {
      candidate: isEditing ? draftProfile : profile,
      scores: FACTOR_NAMES.map((n, i) => ({ factor: n, score: scores[i] })),
      conclusion: isEditing ? draftConclusion : aiConclusion,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Report_${(isEditing ? draftProfile : profile)['ФИО'].replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWord = async () => {
    try {
      setIsExportingWord(true);
      await exportWordReport(
        isEditing ? draftProfile : profile,
        scores,
        isEditing ? draftConclusion : aiConclusion,
        candidateId
      );
    } finally {
      setIsExportingWord(false);
    }
  };

  const displayedProfile = isEditing ? draftProfile : profile;
  const displayedConclusion = isEditing ? draftConclusion : aiConclusion;

  return (
    <div className="relative space-y-8 print:space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#083B77] via-blue-700 to-[#0F4C81] p-8 text-white shadow-[0_24px_60px_rgba(8,59,119,0.24)] print:bg-blue-700 print:rounded-none">
        <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 right-20 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/90">
          Команда Казани
        </div>
        <div className="relative mt-5 flex items-center gap-3 mb-3">
          <span className="text-3xl">📊</span>
          <h2 className="text-2xl md:text-3xl font-bold">Итоговое заключение</h2>
        </div>
        <p className="relative max-w-3xl text-sm md:text-base text-blue-100">
          Кандидат: <strong className="text-white">{displayedProfile['ФИО']}</strong> &nbsp;|&nbsp;
          Дата: <strong className="text-white">{new Date().toLocaleDateString('ru-RU')}</strong>
        </p>
      </div>

      {isEditing && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">
          Режим редактирования включен. Измените поля отчета и затем выгрузите его в Word.
        </div>
      )}

      {/* Profile summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3">
        {top3.map((f, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[24px] border border-blue-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              {i === 0 ? '🥇 Главный мотиватор' : i === 1 ? '🥈 2-й мотиватор' : '🥉 3-й мотиватор'}
            </div>
            <div className="text-base font-bold text-slate-800">{f.name}</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{f.score}</div>
            <div className="text-xs text-slate-500 mt-1">уровень: {interpretScore(f.name, f.score)}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <h3 className="mb-4 text-base font-bold text-slate-800">📈 Мотивационный профиль</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, Math.max(...scores) + 5]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(val) => [`${val} баллов`, 'Оценка']}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList dataKey="score" position="right" style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score table */}
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="px-6 py-3.5 bg-[#f4f7fb] border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">📋 Таблица результатов</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left px-4 py-2 text-slate-600 font-semibold">№</th>
                <th className="text-left px-4 py-2 text-slate-600 font-semibold">Фактор мотивации</th>
                <th className="text-right px-4 py-2 text-slate-600 font-semibold">Балл</th>
                <th className="text-left px-4 py-2 text-slate-600 font-semibold">Уровень</th>
              </tr>
            </thead>
            <tbody>
              {FACTOR_NAMES.map((name, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 text-slate-800 font-medium">{name}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: COLORS[i % COLORS.length] + '22',
                        color: COLORS[i % COLORS.length],
                      }}
                    >
                      {scores[i]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{interpretScore(name, scores[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Conclusion */}
      <div className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-[#f6faff] to-[#eef5ff] p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="text-base font-bold text-indigo-900">AI-аналитика (GigaChat)</h3>
        </div>
        {isEditing ? (
          <textarea
            value={draftConclusion}
            onChange={(e) => setDraftConclusion(e.target.value)}
            rows={10}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm leading-relaxed text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          />
        ) : (
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white/70 rounded-xl p-4 border border-indigo-100">
            {displayedConclusion}
          </div>
        )}
      </div>

      {/* Candidate details */}
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#f4f7fb] px-6 py-3.5">
          <h3 className="text-sm font-bold text-slate-800">👤 Анкетные данные кандидата</h3>
          {isEditing && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              Редактируется
            </span>
          )}
        </div>
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {editableProfileEntries.map(([key, value], i) => (
              <div
                key={String(key)}
                className={`px-5 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}
              >
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {String(key)}
                </label>
                <input
                  value={value}
                  onChange={(e) => {
                    setDraftProfile((prev) => ({ ...prev, [key]: e.target.value }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {Object.entries(displayedProfile).map(([k, v], i) => (
              <div key={k} className={`px-5 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
                <span className="text-xs text-slate-500 uppercase tracking-wide">{k}</span>
                <p className="text-sm text-slate-800 font-medium mt-0.5 leading-snug">{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
        >
          🖨️ Распечатать
        </button>
        <button
          onClick={() => setIsEditing((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 hover:shadow-sm"
        >
          ✏️ {isEditing ? 'Завершить редактирование' : 'Редактировать отчет'}
        </button>
        <button
          onClick={handleExportJSON}
          className="inline-flex items-center gap-2 rounded-full border border-green-300 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-100 hover:shadow-sm"
        >
          📥 Скачать JSON-отчёт
        </button>
        <button
          onClick={handleExportWord}
          disabled={isExportingWord}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#083B77] to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(8,59,119,0.18)] transition hover:-translate-y-0.5 hover:from-[#072e5c] hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isExportingWord ? '⏳ Подготовка Word...' : '📄 Скачать Word (.docx)'}
        </button>
        <button
          onClick={onViewHistory}
          className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
        >
          🗂️ База кандидатов
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full bg-[#083B77] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(8,59,119,0.22)] transition hover:-translate-y-0.5 hover:bg-[#072f5f] hover:shadow-[0_18px_36px_rgba(8,59,119,0.28)]"
        >
          + Новый кандидат
        </button>
      </div>
    </div>
  );
}
