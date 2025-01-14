import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'
import { Button } from 'src/components/buttons/Button'
import { TextArea } from 'src/components/input/TextArea'
import { Box } from 'src/components/layout/Box'
import { useSagaStatus } from 'src/components/modal/useSagaStatusModal'
import { ImportWalletWarning } from 'src/features/onboarding/import/ImportWalletWarning'
import {
  importWalletActions,
  importWalletSagaName,
  isValidMnemonic,
} from 'src/features/wallet/importWallet'
import { Color } from 'src/styles/Color'
import { Font } from 'src/styles/fonts'
import { Stylesheet } from 'src/styles/types'
import { SagaStatus } from 'src/utils/saga'

export function ImportWalletForm() {
  const [hasShownWarning, setHasShownWarning] = useState(false)
  const [mnemonic, setMnemonic] = useState('')
  const [isMnemonicValid, setIsMnemonicValid] = useState(true)
  const dispatch = useDispatch()

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIsMnemonicValid(true)
    setMnemonic(e.target.value)
  }

  const onClickImport = () => {
    if (!isValidMnemonic(mnemonic)) {
      setIsMnemonicValid(false)
      return
    }

    dispatch(importWalletActions.trigger(mnemonic))
  }

  const navigate = useNavigate()
  const onSuccess = () => {
    navigate('/setup/set-pin', { state: { pageNumber: 4 } })
  }
  const status = useSagaStatus(
    importWalletSagaName,
    'Error Importing Wallet',
    'Something went wrong when importing your wallet, sorry! Please check your account key and try again.',
    onSuccess
  )

  return (
    <Box direction="column" align="center">
      {!hasShownWarning && (
        <Box direction="column" align="center" styles={style.warningBox}>
          <ImportWalletWarning />
          <Button onClick={() => setHasShownWarning(true)} margin="2em 0 0 0">
            I Understand
          </Button>
        </Box>
      )}
      {hasShownWarning && (
        <Box direction="column" align="center" margin="-1em 0 0 0">
          <p css={style.description}>Enter your account key (mnemonic phrase).</p>
          <p css={style.description}>Only import on devices you trust.</p>
          <Box direction="column" align="center" margin="2em 0 0 0">
            <TextArea
              name="mnemonic"
              value={mnemonic}
              error={!isMnemonicValid}
              helpText={!isMnemonicValid ? 'Invalid account key' : undefined}
              placeholder="fish boot jump hand..."
              onChange={onInputChange}
              minWidth="calc(min(22em, 85vw))"
              maxWidth="26em"
              minHeight="6.5em"
              maxHeight="8em"
            />
            <Button
              onClick={onClickImport}
              margin="2em 0 0 0"
              disabled={status === SagaStatus.Started}
              size="l"
            >
              Import Account
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

const style: Stylesheet = {
  warningBox: {
    borderRadius: 4,
    padding: '0 1em 1em 1em',
    background: `${Color.accentBlue}11`,
  },
  description: {
    ...Font.body,
    textAlign: 'center',
    margin: '1em 0 0 0',
  },
}
