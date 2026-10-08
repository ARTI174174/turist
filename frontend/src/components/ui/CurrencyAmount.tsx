export function CurrencyAmount({ amount, currency }: { amount: number; currency: 'coins' | 'crystals' }) {
  const label = currency === 'coins' ? 'золота' : 'бриллиантов';
  return <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold" aria-label={`${amount.toLocaleString('ru-RU')} ${label}`}>
    <span aria-hidden="true">{amount.toLocaleString('ru-RU')}</span>
    <img src={currency === 'coins' ? '/assets/icons/coin.png' : '/assets/icons/diamond.png'} alt="" aria-hidden="true" className="h-5 w-5 shrink-0 object-contain" />
  </span>;
}
