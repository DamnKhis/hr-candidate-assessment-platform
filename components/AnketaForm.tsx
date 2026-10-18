import React, { useState } from 'react';
import type { ProfileData } from '../gigachat';

interface Props {
  onSubmit: (profile: ProfileData) => void;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition';

const labelCls = 'block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide';

export default function AnketaForm({ onSubmit }: Props) {
  const [form, setForm] = useState<Record<string, string>>({
    fio: '', b_date: '', b_place: '', addr: '', phone: '',
    email: '', marital: '', langs: '', hobby: '', edu: '', exp: '', mot: '',
  });
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = Object.entries(form).filter(([, v]) => !v.trim());
    if (missing.length > 0) {
      setError('❌ Пожалуйста, заполните ВСЕ поля анкеты!');
      return;
    }
    setError('');
    onSubmit({
      ФИО: form.fio,
      'Дата рождения': form.b_date,
      'Место рождения': form.b_place,
      Адрес: form.addr,
      Телефон: form.phone,
      Email: form.email,
      Семья: form.marital,
      Языки: form.langs,
      Хобби: form.hobby,
      Образование: form.edu,
      Опыт: form.exp,
      Планы: form.mot,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Col 1 */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ФИО *</label>
            <input className={inputCls} placeholder="Иванов Иван Иванович" value={form.fio} onChange={set('fio')} />
          </div>
          <div>
            <label className={labelCls}>Дата рождения *</label>
            <input type="date" className={inputCls} value={form.b_date} onChange={set('b_date')} />
          </div>
          <div>
            <label className={labelCls}>Место рождения *</label>
            <input className={inputCls} placeholder="г. Казань" value={form.b_place} onChange={set('b_place')} />
          </div>
          <div>
            <label className={labelCls}>Адрес проживания *</label>
            <input className={inputCls} placeholder="ул. Пушкина, д. 10, кв. 5" value={form.addr} onChange={set('addr')} />
          </div>
          <div>
            <label className={labelCls}>Телефон *</label>
            <input className={inputCls} placeholder="+7 900 000-00-00" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} placeholder="example@mail.ru" value={form.email} onChange={set('email')} />
          </div>
        </div>

        {/* Col 2 */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Семейное положение *</label>
            <select className={inputCls} value={form.marital} onChange={set('marital')}>
              <option value="">— Выберите —</option>
              <option>Холост / Не замужем</option>
              <option>Женат / Замужем</option>
              <option>Разведён / Разведена</option>
              <option>Вдовец / Вдова</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Знание языков *</label>
            <input className={inputCls} placeholder="Русский (родной), Английский (B2)" value={form.langs} onChange={set('langs')} />
          </div>
          <div>
            <label className={labelCls}>Увлечения / Хобби *</label>
            <input className={inputCls} placeholder="Чтение, спорт..." value={form.hobby} onChange={set('hobby')} />
          </div>
          <div>
            <label className={labelCls}>Образование *</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="КФУ, 2018, Юриспруденция"
              value={form.edu}
              onChange={set('edu')}
            />
          </div>
          <div>
            <label className={labelCls}>Опыт работы *</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="2018–2022 — Специалист отдела кадров, ООО «Ромашка»"
              value={form.exp}
              onChange={set('exp')}
            />
          </div>
        </div>
      </div>

      {/* Full width */}
      <div>
        <label className={labelCls}>Причины интереса к работе и профессиональные планы *</label>
        <textarea
          className={inputCls}
          rows={4}
          placeholder="Опишите свою мотивацию и карьерные цели..."
          value={form.mot}
          onChange={set('mot')}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3 px-6 transition shadow-md shadow-blue-200"
      >
        Перейти к тестированию →
      </button>
    </form>
  );
}
