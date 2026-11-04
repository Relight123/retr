/** Настройки: счёт (сброс/комиссия/плечо), вид, язык, звуки, DEX, данные, о приложении. */
import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import { useTrading } from '../store/trading'
import { useMarket } from '../store/market'
import { exportAll, importAll, exportFileName } from '../store/backup'
import { Header } from '../components/Atomics'
import { Seg, Sheet, TapButton } from '../components/ui'
import { useToasts } from '../store/toasts'
import { useI18n } from '../lib/i18n'
import { fmtUsd } from '../lib/format'
import { requestPersistentStorage } from '../lib/platform'

export function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const s = useSettings()
  const trading = useTrading()
  const market = useMarket((st) => st.providerId)
  const snap = trading.snap

  const [resetOpen, setResetOpen] = useState(false)
  const [fee, setFee] = useState(String(s.feePct))
  const [persist, setPersist] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersist).catch(() => setPersist(null))
  }, [])

  const doReset = () => {
    trading.resetAccount(String(snap?.startBalance ?? '10000'))
    setResetOpen(false)
    useToasts.getState().push('success', t('settings.resetDone'))
  }

  const doExport = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName()
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    useToasts.getState().push('success', t('settings.exported'))
  }

  const doImport = async (file: File) => {
    const text = await file.text()
    const ok = await importAll(text)
    useToasts.getState().push(ok ? 'success' : 'error', ok ? t('settings.importDone') : t('settings.importFail'))
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={t('settings.title')} />

      <div className="scroll flex-1" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 84px)' }}>
        <Group title={t('settings.account')}>
          <Row label={t('settings.startBalance')} trailing={<span className="tnum font-semibold">{fmtUsd(snap?.startBalance ?? '0')}</span>} />
          <Row
            label={t('settings.reset')}
            labelCls="text-down"
            trailing={
              <button className="rounded-full bg-surface-3 px-3 py-1.5 text-[12.5px] font-semibold text-down" onClick={() => setResetOpen(true)}>
                {t('settings.reset')}
              </button>
            }
          />
          <div className="px-4 py-3">
            <div className="text-[12.5px] text-muted">{t('settings.fee')}</div>
            <input
              className="inp mt-1 w-24"
              inputMode="decimal"
              value={fee}
              onFocus={() => setFee(String(s.feePct))}
              onBlur={() => s.setFeePct(parseFloat(fee.replace(',', '.')))}
              onChange={(e) => {
                setFee(e.target.value)
                const v = parseFloat(e.target.value.replace(',', '.'))
                if (isFinite(v)) s.setFeePct(v)
              }}
            />
            <div className="mt-1 text-[11px] leading-snug text-faint">{t('settings.feeHint')}</div>
          </div>
          <Toggle label={t('settings.leverage')} hint={t('settings.leverageHint')} on={s.leverageEnabled} onChange={s.setLeverageEnabled} />
        </Group>

        <Group title={t('settings.appearance')}>
          <Row label={t('settings.theme')}>
            <Seg
              size="sm"
              value={s.theme}
              onChange={s.setTheme}
              options={[
                { value: 'dark', label: t('settings.theme.dark') },
                { value: 'light', label: t('settings.theme.light') },
                { value: 'system', label: t('settings.theme.system') },
              ]}
            />
          </Row>
          <Row label={t('settings.language')}>
            <Seg
              size="sm"
              value={lang}
              onChange={(v) => setLang(v as 'ru' | 'en')}
              options={[
                { value: 'ru', label: 'RU' },
                { value: 'en', label: 'EN' },
              ]}
            />
          </Row>
          <Toggle label={t('settings.sounds')} hint={null} on={s.sounds} onChange={s.setSounds} />
          <Toggle label={t('settings.dex')} hint={t('settings.dexHint')} on={s.dexEnabled} onChange={s.setDexEnabled} />
        </Group>

        <Group title={t('settings.data')}>
          <Row label={t('settings.export')}>
            <button className="rounded-full bg-surface3 px-3 py-1.5 text-[12.5px] font-semibold" onClick={doExport}>
              {t('settings.export')}
            </button>
          </Row>
          <Row
            label={t('settings.import')}
            trailing={
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void doImport(f)
                    e.currentTarget.value = ''
                  }}
                />
                <button className="rounded-full bg-surface-3 px-3 py-1.5 text-[12.5px] font-semibold" onClick={() => fileRef.current?.click()}>
                  {t('settings.import')}
                </button>
              </>
            }
          />
          <Row label={t('settings.persistStatus')} trailing={<span className={`text-[12px] font-semibold ${persist ? 'text-up' : 'text-muted'}`}>{persist ? t('settings.persistGranted') : t('settings.persistDenied')}</span>} onClick={() => void requestPersistentStorage().then(() => navigator.storage?.persisted?.().then(setPersist))} />
          <Row label={t('settings.provider')} trailing={<span className="text-[12px] font-semibold text-muted">{market ?? '—'}</span>} />
        </Group>

        <div className="mx-3 mt-4 rounded-[22px] border border-line bg-surface p-4">
          <div className="text-[13px] font-semibold">{t('settings.about')}</div>
          <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-faint">
            {t('settings.aboutText')}
          </p>
        </div>
        <p className="px-8 pt-3 pb-4 text-center text-[10.5px] text-faint">{t('app.disclaimer')}</p>
      </div>

      <Sheet open={resetOpen} onOpenChange={setResetOpen} title={t('settings.resetConfirm')}>
        <div className="pb-2 text-[13px] leading-relaxed text-faint">{t('settings.resetWarning')}</div>
        <div className="flex gap-2 pb-2">
          <button className="flex-1 rounded-2xl bg-surface-3 py-3 text-[14px] font-semibold" onClick={() => setResetOpen(false)}>
            {t('settings.cancel')}
          </button>
          <button className="btn-solid btn-down flex-1" onClick={doReset}>
            {t('settings.resetButton')}
          </button>
        </div>
      </Sheet>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-3 mt-3 rounded-[22px] border border-line bg-surface">
      <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</div>
      <div className="pb-1">{children}</div>
    </div>
  )
}

function Row({
  label,
  trailing,
  children,
  hint,
  labelCls,
  onClick,
}: {
  label: string
  trailing?: React.ReactNode
  children?: React.ReactNode
  hint?: string | null
  labelCls?: string
  onClick?: () => void
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div>
        <div className={`text-[13.5px] font-medium ${labelCls ?? ''}`}>{label}</div>
        {hint && <div className="text-[11px] leading-snug text-faint">{hint}</div>}
      </div>
      {trailing ?? children}
    </div>
  )
}

/** iOS-стиль switch. */
function Toggle({ label, hint, on, onChange }: { label: string; hint?: string | null; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => onChange(!on)}>
      <div>
        <div className="text-[13.5px] font-medium">{label}</div>
        {hint && <div className="text-[11px] leading-snug text-faint">{hint}</div>}
      </div>
      <span
        className="relative inline-block h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200"
        style={{ background: on ? 'var(--accent)' : 'var(--surface-3)' }}
      >
        <span
          className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow"
          style={{ left: on ? 23 : 3, transition: 'left .2s cubic-bezier(.3,.9,.4,1)' }}
        />
      </span>
    </button>
  )
}
