import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from 'src/app/rootReducer'
import { isSignerLedger } from 'src/blockchain/signer'
import { Address } from 'src/components/Address'
import { Button } from 'src/components/buttons/Button'
import { HelpIcon } from 'src/components/icons/HelpIcon'
import SendPaymentIcon from 'src/components/icons/send_payment.svg'
import { Box } from 'src/components/layout/Box'
import { ScreenContentFrame } from 'src/components/layout/ScreenContentFrame'
import { useModal } from 'src/components/modal/useModal'
import { MoneyValue } from 'src/components/MoneyValue'
import { Notification } from 'src/components/Notification'
import { estimateFeeActions } from 'src/features/fees/estimateFee'
import { useFee } from 'src/features/fees/utils'
import { SignatureRequiredModal } from 'src/features/ledger/animation/SignatureRequiredModal'
import { sendCanceled, sendSucceeded } from 'src/features/send/sendSlice'
import { sendTokenActions } from 'src/features/send/sendToken'
import { TransactionType } from 'src/features/types'
import { Color } from 'src/styles/Color'
import { Font } from 'src/styles/fonts'
import { mq } from 'src/styles/mediaQueries'
import { Stylesheet } from 'src/styles/types'
import { SagaStatus } from 'src/utils/saga'

export function SendConfirmationScreen() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { transaction: tx, transactionError: txError, transactionSigned: txSigned } = useSelector(
    (state: RootState) => state.send
  )

  useEffect(() => {
    // Make sure we belong on this screen
    if (!tx) {
      navigate('/send')
      return
    }

    const type = tx.comment
      ? TransactionType.StableTokenTransferWithComment
      : TransactionType.StableTokenTransfer
    dispatch(estimateFeeActions.trigger({ txs: [{ type }] }))
  }, [tx])

  const { amount, total, feeAmount, feeCurrency, feeEstimates } = useFee(tx?.amountInWei)

  const onGoBack = () => {
    dispatch(sendTokenActions.reset())
    dispatch(sendCanceled())
    navigate(-1)
  }

  const onSend = () => {
    if (!tx || !feeEstimates) return
    dispatch(sendTokenActions.trigger({ ...tx, feeEstimate: feeEstimates[0] }))
  }

  // TODO: DRY up code below with Exchange conf screen into singer-loader-fail/success modal hook
  const { status: sagaStatus, error: sagaError } = useSelector(
    (state: RootState) => state.saga.sendToken
  )

  const isSagaWorking = sagaStatus === SagaStatus.Started

  const { showSuccessModal, showErrorModal, showWorkingModal, showModalWithContent } = useModal()

  const onNeedSignature = () => {
    const modalText = ['Confirm the transaction on your Ledger']
    showModalWithContent(
      'Signature Required',
      <SignatureRequiredModal text={modalText} />,
      null,
      null,
      null,
      false
    )
  }

  const onConfirm = () => {
    showSuccessModal('Payment Sent!', 'Your payment has been sent successfully')
    dispatch(sendTokenActions.reset())
    dispatch(sendSucceeded())
    navigate('/')
  }

  const onFailure = (error: string | undefined) => {
    showErrorModal('Payment Failed', 'Your payment could not be processed', error)
  }

  const onClose = () => {
    navigate('/')
  }

  useEffect(() => {
    if (sagaStatus === SagaStatus.Started) {
      if (isSignerLedger() && !txSigned) onNeedSignature()
      else showWorkingModal('Sending Payment...')
    } else if (sagaStatus === SagaStatus.Success) {
      onConfirm()
    } else if (sagaStatus === SagaStatus.Failure) {
      onFailure(sagaError?.toString())
    }
  }, [sagaStatus, sagaError, txSigned])

  if (!tx) return null

  return (
    <ScreenContentFrame onClose={onClose}>
      {txError && <Notification message={txError.toString()} color={Color.borderError} />}
      <div css={style.content}>
        <h1 css={Font.h2Green}>Review Payment</h1>

        <Box align="center" styles={style.inputRow} justify="between">
          <label css={style.labelCol}>To</label>
          <Box direction="row" align="center" justify="end" styles={style.valueCol}>
            <Address address={tx.recipient} />
          </Box>
        </Box>

        {tx.comment && (
          <Box direction="row" styles={style.inputRow} justify="between">
            <label css={style.labelCol}>Comment</label>
            <label css={[style.valueLabel, style.valueCol]}>{tx.comment}</label>
          </Box>
        )}

        <Box direction="row" styles={style.inputRow} justify="between">
          <label css={style.labelCol}>Value</label>
          <Box justify="end" align="end" styles={style.valueCol}>
            <MoneyValue amountInWei={amount} currency={tx.currency} baseFontSize={1.2} />
          </Box>
        </Box>

        <Box
          direction="row"
          styles={{ ...style.inputRow, ...style.bottomBorder }}
          align="end"
          justify="between"
        >
          <Box
            direction="row"
            justify="between"
            align="end"
            styles={{ ...style.labelCol, width: '10em' }}
          >
            <label>
              Fee{' '}
              <HelpIcon
                tooltip={{
                  content: "Fees, or 'gas', keep the network secure.",
                  position: 'topRight',
                }}
              />
            </label>
          </Box>
          {feeAmount && feeCurrency ? (
            <Box justify="end" align="end" styles={style.valueCol}>
              <label>+</label>
              <MoneyValue
                amountInWei={feeAmount}
                currency={feeCurrency}
                baseFontSize={1.2}
                margin="0 0 0 0.25em"
              />
            </Box>
          ) : (
            // TODO a proper loader (need to update mocks)
            <div css={style.valueCol}>...</div>
          )}
        </Box>

        <Box direction="row" styles={style.inputRow} justify="between">
          <label css={[style.labelCol, style.totalLabel]}>Total</label>
          <Box justify="end" align="end" styles={style.valueCol}>
            <MoneyValue
              amountInWei={total}
              currency={tx.currency}
              baseFontSize={1.2}
              fontWeight={700}
            />
          </Box>
        </Box>

        <Box direction="row" justify="between" margin={'3em 0 0 0'}>
          <Button
            type="button"
            size="m"
            color={Color.altGrey}
            onClick={onGoBack}
            disabled={isSagaWorking || !feeAmount}
            margin="0 2em 0 0"
            width="5em"
          >
            Back
          </Button>
          <Button
            type="submit"
            size="m"
            onClick={onSend}
            icon={SendPaymentIcon}
            disabled={isSagaWorking || !feeAmount}
          >
            Send Payment
          </Button>
        </Box>
      </div>
    </ScreenContentFrame>
  )
}

const style: Stylesheet = {
  content: {
    width: '100%',
    maxWidth: '23em',
  },
  inputRow: {
    marginBottom: '1.4em',
    [mq[1200]]: {
      marginBottom: '1.6em',
    },
  },
  labelCol: {
    ...Font.inputLabel,
    color: Color.primaryGrey,
    width: '9em',
    marginRight: '1em',
    [mq[1200]]: {
      width: '11em',
    },
  },
  valueCol: {
    width: '12em',
    textAlign: 'end',
  },
  totalLabel: {
    color: Color.primaryGrey,
    fontWeight: 600,
  },
  valueLabel: {
    color: Color.primaryBlack,
    fontSize: '1.2em',
    fontWeight: 400,
  },
  bottomBorder: {
    paddingBottom: '1.25em',
    borderBottom: `1px solid ${Color.borderMedium}`,
  },
  iconRight: {
    marginLeft: '0.5em',
  },
  icon: {
    marginBottom: '-0.3em',
  },
}
