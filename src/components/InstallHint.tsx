/** При непосредственном открытии в Safari показывает подсказку «на домашний экран». */
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share } from 'lucide-react'
import { isIos, isStandalone } from '../lib/platform'
import { useSettings } from '../store/settings'
import { useToasts } from '../store/toasts'
import { useI18n } from '../lib/i18n'

export function InstallHint() {
  const { t } = useI18n()
  const settings = useSettings()
  const [show, setShow] = useState(false)
  const toast = useToasts()

  useEffect(() => {
    if (!isIos() || isStandalone()) return
    const week = 7 * 24 * 3600_000
    const dismissed = Date.now() - settings.installHintTs < week
    if (!dismissed) {
      setShow(true)
      if (settings.installHintTs === 0) toast.push('order', t('toast.install'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="card mx-4 mt-3 flex flex-col gap-2 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl chip-accent">
              <Share size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">{t('install.title')}</div>
              <div className="text-[11px] text-faint">
                {isStandalone() ? '' : 'Safari → Share …'}
              </div>
            </div>
            <button
              className="text-[12px] font-medium text-muted"
              onClick={() => {
                setShow(false)
                settings.dismissInstallHint()
              }}
            >
              {t('install.dismiss')}
            </button>
          </div>
          <ol className="list-inside list-decimal space-y-0.5 pl-1 text-[12px] text-muted tnum">
            <li>{t('install.step1')}</li>
            <li>{t('install.step2')}</li>
            <li>{t('install.step3')}</li>
          </ol>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
