import { useMemo, useState } from 'react';

function AddressBookSection({ title, type, entries, onApply, onSave, onUpdate, onDelete }) {
  const [selectedId, setSelectedId] = useState('');
  const [label, setLabel] = useState('');

  const filtered = useMemo(() => entries.filter((entry) => entry.type === type), [entries, type]);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-4">
      <h4 className="text-xs font-bold tracking-[0.08em] text-[var(--muted)]">{title} 배송지 저장</h4>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="h-9 min-w-[190px] rounded-md border border-[var(--line)] px-2 text-xs text-[var(--ink)]"
        >
          <option value="">저장된 배송지 선택</option>
          {filtered.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label || entry.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            const picked = filtered.find((entry) => entry.id === selectedId);
            if (picked) {
              onApply(picked);
            }
          }}
          className="h-9 rounded-md border border-[var(--navy)] px-3 text-xs font-semibold text-[var(--navy)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          불러오기
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            onUpdate(selectedId, label);
            setLabel('');
          }}
          className="h-9 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          선택 수정
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            onDelete(selectedId);
            setSelectedId('');
          }}
          className="h-9 rounded-md border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          선택 삭제
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="배송지 이름 (예: 본사, 창고)"
          className="h-9 min-w-[220px] flex-1 rounded-md border border-[var(--line)] px-3 text-xs text-[var(--ink)]"
        />
        <button
          type="button"
          onClick={() => {
            onSave(label);
            setLabel('');
          }}
          className="h-9 rounded-md bg-[var(--gold)] px-3 text-xs font-bold text-[#101a2f]"
        >
          현재 입력값 저장
        </button>
      </div>
    </section>
  );
}

export default AddressBookSection;
