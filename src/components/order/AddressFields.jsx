function AddressFields({ title, value, onChange }) {
  const setField = (field) => (event) => {
    onChange(field, event.target.value);
  };

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-4">
      <h3 className="text-sm font-bold tracking-[0.04em] text-[var(--navy)]">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[var(--muted)]">
          이름
          <input
            value={value?.name || ''}
            onChange={setField('name')}
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
            placeholder="홍길동"
          />
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">
          연락처
          <input
            value={value?.phone || ''}
            onChange={setField('phone')}
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
            placeholder="01012345678"
          />
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.55fr]">
        <label className="text-xs font-semibold text-[var(--muted)]">
          주소
          <input
            value={value?.address || ''}
            onChange={setField('address')}
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
            placeholder="서울시 강남구 ..."
          />
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">
          상세주소
          <input
            value={value?.addressDetail || ''}
            onChange={setField('addressDetail')}
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
            placeholder="101동 202호"
          />
        </label>
      </div>
    </section>
  );
}

export default AddressFields;
