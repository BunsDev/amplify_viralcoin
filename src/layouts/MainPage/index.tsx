import React, {useState, useEffect, useCallback, useMemo} from 'react'
import { useLingui } from '@lingui/react'
import { ChainId, Currency, CurrencyAmount, JSBI, Token, TradeType, Trade as V2Trade } from '@sushiswap/sdk'
import { isMobile, isIOS } from 'react-device-detect'
import CountUp from 'react-countup';
import { BigNumber } from 'ethers'
import Collapsible from 'react-collapsible';
import { AnimateKeyframes }  from 'react-simple-animate';
import { Helmet } from 'react-helmet'
import ReactGA from 'react-ga'
import Lottie from 'lottie-react'
import dynamic from 'next/dynamic'
import { FaTwitter, FaTelegramPlane, FaDiscord, FaRedditAlien } from 'react-icons/fa';


import { ApprovalState, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import { useNetworkModalToggle, useToggleSettingsMenu, useWalletModalToggle } from '../../state/application/hooks'
import { useActiveWeb3React } from '../../hooks/useActiveWeb3React'
import { updateCoinValue, updateGasPrices, useDefaultsFromURLSearch, useDerivedSwapInfo, useSwapActionHandlers, useSwapState } from '../../state/swap/hooks'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'
import {
    useExpertModeManager,
    useUserArcherETHTip,
    useUserArcherGasPrice,
    useUserArcherUseRelay,
    useUserSingleHopOnly,
    useUserSlippageTolerance,
    useUserTransactionTTL,
  } from '../../state/user/hooks'

import useENSAddress from '../../hooks/useENSAddress'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import useCopyClipboard from '../../hooks/useCopyClipboard'

import { NETWORK_ICON } from '../../constants/networks'
import { domainURL, domainDAppURL } from '../../constants';

import QuestionHelper from '../../components/QuestionHelper'
import ModalHeader from '../../components/ModalHeader'
import Modal from '../../components/Modal' 
import TokenWarningModal from '../../modals/TokenWarningModal'
import DoubleGlowShadow from '../../components/DoubleGlowShadow'
import SwapHeader from '../../components/ExchangeHeader'
import { Field } from '../../state/swap/actions'
import ConfirmSwapModal from '../../features/swap/ConfirmSwapModal'
import { maxAmountSpend } from '../../functions/currency'
import { useSwapCallback } from '../../hooks/useSwapCallback'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import { computeFiatValuePriceImpact } from '../../functions/trade'
import confirmPriceImpactWithoutFee from '../../features/swap/confirmPriceImpactWithoutFee'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import Column, { AutoColumn } from '../../components/Column'
import { classNames } from '../../functions'
import swapArrowsAnimationData from '../../animation/swap-arrows.json'
import Button from '../../components/Button'
import TradePrice from '../../features/swap/TradePrice'
import { ButtonConfirmed, ButtonError } from '../../components/Button'
import AddressInputPanel from '../../components/AddressInputPanel'
import Alert from '../../components/Alert'
import { ArrowWrapper, BottomGrouping, SwapCallbackError } from '../../features/swap/styleds'
import Web3Connect from '../../components/Web3Connect'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { warningSeverity } from '../../functions/prices'
import Loader from '../../components/Loader'
import ProgressSteps from '../../components/ProgressSteps'
import UnsupportedCurrencyFooter from '../../features/swap/UnsupportedCurrencyFooter'
import Tooltip from '../../components/Tooltip'

const base64 = require('base-64');
const commaNumber = require('comma-number')

const QRCodeModal = dynamic(() => import('../../components/QRCodeModal'), { ssr: false })

export default function MainPage() {
    const { i18n } = useLingui()
    const { account, chainId, library } = useActiveWeb3React()
    let owner_account = account

    const [isExpertMode] = useExpertModeManager()
    const [ttl] = useUserTransactionTTL()
    const [archerETHTip] = useUserArcherETHTip()

    const doArcher = undefined
    const { independentField, typedValue, recipient } = useSwapState()

    const {
        v2Trade,
        currencyBalances,
        parsedAmount,
        currencies,
        inputError: swapInputError,
        allowedSlippage,
      } = useDerivedSwapInfo(doArcher)
    
      const {
        wrapType,
        execute: onWrap,
        inputError: wrapInputError,
      } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
    
    const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
    const { address: recipientAddress } = useENSAddress(recipient)
    const trade = showWrap ? undefined : v2Trade

    const parsedAmounts = useMemo(
        () =>
          showWrap
            ? {
                [Field.INPUT]: parsedAmount,
                [Field.OUTPUT]: parsedAmount,
              }
            : {
                [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
                [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
              },
        [independentField, parsedAmount, showWrap, trade]
      )
    
      const fiatValueInput = useUSDCValue(parsedAmounts[Field.INPUT])
      const fiatValueOutput = useUSDCValue(parsedAmounts[Field.OUTPUT])
      const priceImpact = computeFiatValuePriceImpact(fiatValueInput, fiatValueOutput)
    
      const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()

      const isValid = !swapInputError

      const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

      const handleTypeInput = useCallback(
        (value: string) => {
          onUserInput(Field.INPUT, value)
        },
        [onUserInput]
      )
    
      const handleTypeOutput = useCallback(
        (value: string) => {
          onUserInput(Field.OUTPUT, value)
        },
        [onUserInput]
      )
    
    const loadedUrlParams = useDefaultsFromURLSearch()

    const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
        showConfirm: boolean
        tradeToConfirm: V2Trade<Currency, Currency, TradeType> | undefined
        attemptingTxn: boolean
        swapErrorMessage: string | undefined
        txHash: string | undefined
      }>({
        showConfirm: false,
        tradeToConfirm: undefined,
        attemptingTxn: false,
        swapErrorMessage: undefined,
        txHash: undefined,
      })
    
      const formattedAmounts = {
        [independentField]: typedValue,
        [dependentField]: showWrap
          ? parsedAmounts[independentField]?.toExact() ?? ''
          : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
      }
    
    
      const userHasSpecifiedInputOutput = Boolean(
        currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
      )
    
      const routeNotFound = !trade?.route
    
      const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
      const [approvalState, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage, doArcher)

      const handleApprove = useCallback(async () => {
        await approveCallback()
        // if (signatureState === UseERC20PermitState.NOT_SIGNED && gatherPermitSignature) {
        //   try {
        //     await gatherPermitSignature()
        //   } catch (error) {
        //     // try to approve if gatherPermitSignature failed for any reason other than the user rejecting it
        //     if (error?.code !== 4001) {
        //       await approveCallback()
        //     }
        //   }
        // } else {
        //   await approveCallback()
        // }
      }, [approveCallback])
    
      // mark when a user has submitted an approval, reset onTokenSelection for input field
      useEffect(() => {
        if (approvalState === ApprovalState.PENDING) {
          setApprovalSubmitted(true)
        }
      }, [approvalState, approvalSubmitted])

      const maxInputAmount: CurrencyAmount<Currency> | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
      const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))
      const signatureData = undefined

        // the callback to execute the swap
        const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
            trade,
            allowedSlippage,
            recipient,
            signatureData,
            doArcher ? ttl : undefined
        )

        const [singleHopOnly] = useUserSingleHopOnly()
      const handleSwap = useCallback(() => {
        if (!swapCallback) {
          return
        }
        if (priceImpact && !confirmPriceImpactWithoutFee(priceImpact)) {
          return
        }
        setSwapState({
          attemptingTxn: true,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: undefined,
          txHash: undefined,
        })
        swapCallback()
          .then((hash) => {
            setSwapState({
              attemptingTxn: false,
              tradeToConfirm,
              showConfirm,
              swapErrorMessage: undefined,
              txHash: hash,
            })
    
            ReactGA.event({
              category: 'Swap',
              action:
                recipient === null
                  ? 'Swap w/o Send'
                  : (recipientAddress ?? recipient) === account
                  ? 'Swap w/o Send + recipient'
                  : 'Swap w/ Send',
              label: [
                trade?.inputAmount?.currency?.symbol,
                trade?.outputAmount?.currency?.symbol,
                singleHopOnly ? 'SH' : 'MH',
              ].join('/'),
            })
    
            ReactGA.event({
              category: 'Routing',
              action: singleHopOnly ? 'Swap with multihop disabled' : 'Swap with multihop enabled',
            })
          })
          .catch((error) => {
            setSwapState({
              attemptingTxn: false,
              tradeToConfirm,
              showConfirm,
              swapErrorMessage: error.message,
              txHash: undefined,
            })
          })
      }, [
        swapCallback,
        priceImpact,
        tradeToConfirm,
        showConfirm,
        recipient,
        recipientAddress,
        account,
        trade?.inputAmount?.currency?.symbol,
        trade?.outputAmount?.currency?.symbol,
        singleHopOnly,
      ])
    
      const priceImpactSeverity = useMemo(() => {
        const executionPriceImpact = trade?.priceImpact
        return warningSeverity(
          executionPriceImpact && priceImpact
            ? executionPriceImpact.greaterThan(priceImpact)
              ? executionPriceImpact
              : priceImpact
            : executionPriceImpact ?? priceImpact
        )
      }, [priceImpact, trade])
    
      const [showInverted, setShowInverted] = useState<boolean>(false)
      const isArgentWallet = useIsArgentWallet()

      const showApproveFlow =
      !isArgentWallet &&
      !swapInputError &&
      (approvalState === ApprovalState.NOT_APPROVED ||
        approvalState === ApprovalState.PENDING ||
        (approvalSubmitted && approvalState === ApprovalState.APPROVED)) &&
      !(priceImpactSeverity > 3 && !isExpertMode)
  
      const handleConfirmDismiss = useCallback(() => {
        setSwapState({
          showConfirm: false,
          tradeToConfirm,
          attemptingTxn,
          swapErrorMessage,
          txHash,
        })
        // if there was a tx hash, we want to clear the input
        if (txHash) {
          onUserInput(Field.INPUT, '')
        }
      }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])
    
      const handleAcceptChanges = useCallback(() => {
        setSwapState({
          tradeToConfirm: trade,
          swapErrorMessage,
          txHash,
          attemptingTxn,
          showConfirm,
        })
      }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])
    
      const handleInputSelect = useCallback(
        (inputCurrency) => {
          setApprovalSubmitted(false) // reset 2 step UI for approvals
          onCurrencySelection(Field.INPUT, inputCurrency)
        },
        [onCurrencySelection]
      )
    
      const handleMaxInput = useCallback(() => {
        maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
      }, [maxInputAmount, onUserInput])
    
      const handleOutputSelect = useCallback(
        (outputCurrency) => onCurrencySelection(Field.OUTPUT, outputCurrency),
        [onCurrencySelection]
      )

      const swapIsUnsupported = useIsSwapUnsupported(currencies?.INPUT, currencies?.OUTPUT)

    // token warning stuff
    const [loadedInputCurrency, loadedOutputCurrency] = [
        useCurrency(loadedUrlParams?.inputCurrencyId),
        useCurrency(loadedUrlParams?.outputCurrencyId)
    ]
    const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
    const urlLoadedTokens: Token[] = useMemo(
        () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
        [loadedInputCurrency, loadedOutputCurrency]
    )
    const handleConfirmTokenWarning = useCallback(() => {
        setDismissTokenWarning(true)
    }, [])

    const [animateSwapArrows, setAnimateSwapArrows] = useState<boolean>(false)


    const defaultTokens = useAllTokens()
    const importTokensNotInDefault =
        urlLoadedTokens &&
        urlLoadedTokens.filter((token: Token) => {
            return !Boolean(token.address in defaultTokens)
        })



    const toggleWalletModal = useWalletModalToggle()
    const [chartGuideShow, setChartGuideShow] = useState<boolean>(false)
    const [networkGuideShow, setNetworkGuideShow] = useState<boolean>(false)
    const [qrcodeShow, setQRCodeShow] = useState<boolean>(false)
    const [referralLink, setReferralLink] = useState<string>(``)
    const [isCopied, setCopied] = useCopyClipboard()

    const handleShareWithFriends = () => {
        if (navigator.share) {
            navigator.share({
                title: 'ViralCoin.com',
                text: `Let's Go Viral Together`,
                url: `${referralLink}`,
            })
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing', error));
        }
    }

    const [polymaticValue, setPolyMaticValue] = useState<string>("0")
    const [ethValue, setEthValue] = useState<string>("0")
    const [bscValue, setBscValue] = useState<string>("0")

    const [showHBV_Ethereum, setShowHBVEthereum] = useState<boolean>(true)
    const [showHBV_Bsc, setShowHBVBsc] = useState<boolean>(false)
    const [showHBV_Matic, setShowHBVMatic] = useState<boolean>(false)

    const onShowHBV_Ethereum = () => {
        setShowHBVEthereum(true)
        setShowHBVBsc(false)
        setShowHBVMatic(false)
    }
    const onShowHBV_Bsc = () => {
        setShowHBVEthereum(false)
        setShowHBVBsc(true)
        setShowHBVMatic(false)
    }
    const onShowHBV_Matic = () => {
        setShowHBVEthereum(false)
        setShowHBVBsc(false)
        setShowHBVMatic(true)
    }

    const gasamount = 45000

    const [fullEthGasPrice, setFullEthGasPrice] = useState<number>(0)
    const [fullBnbGasPrice, setFullBnbGasPrice] = useState<number>(0)
    const [fullMaticGasPrice, setFullMaticGasPrice] = useState<number>(2)

    const [halfEthGasPrice, setHalfEthGasPrice] = useState<number>(0)
    const [halfBnbGasPrice, setHalfBnbGasPrice] = useState<number>(0)
    const [halfMaticGasPrice, setHalfMaticGasPrice] = useState<number>(1)

    const fetchCoinValue = useCallback(async () => {
        try {
            let polymaticValue : any = localStorage.getItem("polymaticValue") ? (localStorage.getItem("polymaticValue")) : "0"
            setPolyMaticValue(polymaticValue)
            let ethValue : any = localStorage.getItem("ethValue") ? (localStorage.getItem("ethValue")) : "0"
            setEthValue(ethValue)
            let bscValue : any = localStorage.getItem("bscValue") ? (localStorage.getItem("bscValue")) : "0"
            setBscValue(bscValue)
        } catch (error) {
            throw error
        }
    }, [])

    useEffect(() => {
        updateCoinValue()
        fetchCoinValue()
        setInterval(() => {
            fetchCoinValue()
        }, 10000)
    }, [])

    const fetchFullPrice = useCallback(async () => {
        try {
            let ethTokenPrice : number = localStorage.getItem("ethTokenPrice") ? Number(localStorage.getItem("ethTokenPrice")) : 0
            let ethGasPrice : number = localStorage.getItem("ethGasPrice") ? Number(localStorage.getItem("ethGasPrice")) : 0
            let full_eth_gas = ethTokenPrice * 0.000000001 * ethGasPrice * gasamount * 2;
            let half_eth_gas = ethTokenPrice * 0.000000001 * ethGasPrice * gasamount;
            setFullEthGasPrice(full_eth_gas)
            setHalfEthGasPrice(half_eth_gas)
            let bnbTokenPrice : number = localStorage.getItem("bnbTokenPrice") ? Number(localStorage.getItem("bnbTokenPrice")) : 0
            let bnbGasPrice : number = localStorage.getItem("bnbGasPrice") ? Number(localStorage.getItem("bnbGasPrice")) : 0
            let full_bnb_gas = bnbTokenPrice * 0.000000001 * bnbGasPrice * gasamount * 2;
            let half_bnb_gas = bnbTokenPrice * 0.000000001 * bnbGasPrice * gasamount;
            setFullBnbGasPrice(full_bnb_gas)
            setHalfBnbGasPrice(half_bnb_gas)
            // let maticTokenPrice : number = localStorage.getItem("maticTokenPrice") ? Number(localStorage.getItem("maticTokenPrice")) : 0
            // let maticGasPrice : number = localStorage.getItem("maticGasPrice") ? Number(localStorage.getItem("maticGasPrice")) : 0
            // let full_matic_gas = maticTokenPrice * 0.000000001 * maticGasPrice * gasamount * 2;
            // setFullMaticGasPrice(full_matic_gas)
        } catch (error) {
            throw error
        }
    }, [])

    useEffect(() => {
        updateGasPrices()
        fetchFullPrice()
        setInterval(() => {
            fetchFullPrice()
        }, 10000)
    }, [])

    return (
        <main>
            {isMobile &&   
                <Modal isOpen={networkGuideShow} onDismiss={() => setNetworkGuideShow(false)} maxHeight={100}>
                    <ModalHeader className="flex justify-center" onClose={() =>setNetworkGuideShow(false)} title="" />
                    <div className="flex flex-col space-y-3" style={{marginTop: '5px', marginBottom: '5px'}}>
                        <div className="text-primary font-bold">{`1. Click the 3 dots "..." in the bottom right of MetaMask`}</div>
                        <div className="text-primary font-bold">{`2. Click "Switch network"`}</div>
                        <div className="text-primary font-bold">{`3. Select "Ethereum Main Network"`}</div>
                    </div>
                    <img src='/images/viral/switch-networks-guide.gif'></img>
                </Modal>
            }
            {
                <QRCodeModal
                    isOpen={qrcodeShow}
                    referralLink={referralLink}
                    onDismiss={() => setQRCodeShow(false)}
                    onClose={() =>setQRCodeShow(false)}
                />
            }
            {
                <Modal isOpen={chartGuideShow} onDismiss={() => setChartGuideShow(false)} maxHeight={100}>
                    <ModalHeader className="flex justify-center" onClose={() =>setChartGuideShow(false)} title="" />
                    <div className="flex flex-col space-y-3 mt-5">
                        <div className="flex items-center h-full w-full p-3">
                            <a href="https://dex.guru/token/0xF8056FF433aebFb55A450EB1bb098Ab7B238092b-bsc" target="_blank" rel="noreferrer" style={{padding: '5px', flex: '1'}}>Viralcoin (Viral) on Binance Smart Chain (BNB)</a>
                            <img
                                style={{marginLeft: 'auto'}}
                                src={NETWORK_ICON[ChainId.BSC]}
                                alt="Switch Network"
                                className="rounded-md ml-3 w-8 h-8"
                            />
                        </div>
                        <div className="flex items-center h-full w-full p-3">
                            <a href="https://dex.guru/token/0xF8056FF433aebFb55A450EB1bb098Ab7B238092b-eth" target="_blank" rel="noreferrer" style={{padding: '5px', flex: '1'}}>Viralcoin (Viral) on Ethereum (ETH)</a>
                            <img
                                style={{marginLeft: 'auto'}}
                                src={NETWORK_ICON[ChainId.MAINNET]}
                                alt="Switch Network"
                                className="rounded-md ml-3 w-8 h-8"
                            />
                        </div>
                        <div className="flex items-center h-full w-full p-3">
                            <a href="https://dex.guru/token/0xF8056FF433aebFb55A450EB1bb098Ab7B238092b-polygon" target="_blank" rel="noreferrer" style={{padding: '5px', flex: '1'}}>Viralcoin (Viral) on Polygon (Matic)</a>
                            <img
                                style={{marginLeft: 'auto'}}
                                src={NETWORK_ICON[ChainId.MATIC]}
                                alt="Switch Network"
                                className="rounded-md ml-3 w-8 h-8"
                            />
                        </div>
                    </div>
                </Modal>
            }
            {owner_account ?
                <section id="buy" className='heroAccountSection'>
                    <div className="relative md:flex flex-col justify-center items-center" style={{marginTop: '7rem' }}>
                        <div className={isMobile ? 'heroAccountMobileDiv1' : 'heroAccountDiv1'}>
                            <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>Buy Now</h2>
                            <div className="mb-10 align-center">
                                <div className="flex justify-center"><p>Available On:</p></div>
                                <div className="flex justify-center">
                                    <div className='heroAvailableDiv'>
                                        <QuestionHelper text={i18n._(`Ethereum (ETH)`)}>
                                            <button onClick={() =>{
                                                const params = {
                                                    chainId: '0x1',
                                                    chainName: 'Ethereum',
                                                    nativeCurrency: {
                                                        name: 'Ethereum',
                                                        symbol: 'ETH',
                                                        decimals: 18
                                                    },
                                                    rpcUrls: ['https://mainnet.infura.io/v3/949ae8da62964d9682469cb45b745b12'],
                                                    blockExplorerUrls: ['https://etherscan.com']
                                                }
                                                if(isMobile) {
                                                    {chainId && chainId != ChainId.MAINNET && setNetworkGuideShow(true)}
                                                }else{
                                                    library?.send('wallet_switchEthereumChain', [{ chainId: '0x1' }, owner_account])
                                                }
                                            }}>
                                                <img src='/images/viral/eth.png' alt="" />
                                            </button>
                                        </QuestionHelper>
                                    </div>
                                    <div className='heroAvailableDiv'>
                                        <QuestionHelper text={i18n._(`Polygon (Matic)`)}>
                                            <button onClick={() =>{
                                                const params = {
                                                    chainId: '0x89',
                                                    chainName: 'Matic',
                                                    nativeCurrency: {
                                                        name: 'Matic',
                                                        symbol: 'MATIC',
                                                        decimals: 18
                                                    },
                                                    rpcUrls: [
                                                        //'https://matic-mainnet.chainstacklabs.com/'
                                                        'https://rpc-mainnet.maticvigil.com'
                                                    ],
                                                    blockExplorerUrls: ['https://explorer-mainnet.maticvigil.com']
                                                }
                                                library?.send('wallet_addEthereumChain', [params, owner_account])
                                            }}>
                                                <img src='/images/viral/matic.png' alt="" />
                                            </button>
                                        </QuestionHelper>
                                    </div>                                    
                                    <div className='heroAvailableDiv'>
                                        <QuestionHelper text={i18n._(`Binance Smart Chain (BNB)`)}>
                                            <button onClick={() =>{
                                                const params = {
                                                    chainId: '0x38',
                                                    chainName: 'Binance Smart Chain',
                                                    nativeCurrency: {
                                                        name: 'Binance Coin',
                                                        symbol: 'BNB',
                                                        decimals: 18
                                                    },
                                                    rpcUrls: ['https://bsc-dataseed.binance.org'],
                                                    blockExplorerUrls: ['https://bscscan.com']
                                                }
                                                library?.send('wallet_addEthereumChain', [params, owner_account])
                                            }}>
                                                <img src='/images/viral/binance.png' alt="" />
                                            </button>
                                        </QuestionHelper>
                                    </div>
                                </div>
                            </div>
                            <Helmet>
                                <title>ViralCoin | {i18n._(`Swap`)}</title>
                                <meta
                                    name="description"
                                    content="ViralCoin allows for swapping of ERC20 compatible tokens across multiple networks"
                                />
                            </Helmet>
                            <TokenWarningModal
                                isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
                                tokens={importTokensNotInDefault}
                                onConfirm={handleConfirmTokenWarning}
                            />
                            <DoubleGlowShadow>
                                <div className="p-4 space-y-4 rounded bg-dark-900 z-1">
                                <SwapHeader
                                    input={currencies[Field.INPUT]}
                                    output={currencies[Field.OUTPUT]}
                                    allowedSlippage={allowedSlippage}
                                />

                                <ConfirmSwapModal
                                    isOpen={showConfirm}
                                    trade={trade}
                                    originalTrade={tradeToConfirm}
                                    onAcceptChanges={handleAcceptChanges}
                                    attemptingTxn={attemptingTxn}
                                    txHash={txHash}
                                    recipient={recipient}
                                    allowedSlippage={allowedSlippage}
                                    onConfirm={handleSwap}
                                    swapErrorMessage={swapErrorMessage}
                                    onDismiss={handleConfirmDismiss}
                                    minerBribe={doArcher ? archerETHTip : undefined}
                                />
                                <div>
                                    <CurrencyInputPanel
                                    // priceImpact={priceImpact}
                                    label={
                                        independentField === Field.OUTPUT && !showWrap ? i18n._(`Swap From (est.):`) : i18n._(`Swap From:`)
                                    }
                                    value={formattedAmounts[Field.INPUT]}
                                    showMaxButton={showMaxButton}
                                    currency={currencies[Field.INPUT]}
                                    onUserInput={handleTypeInput}
                                    onMax={handleMaxInput}
                                    fiatValue={fiatValueInput ?? undefined}
                                    onCurrencySelect={handleInputSelect}
                                    otherCurrency={currencies[Field.OUTPUT]}
                                    showCommonBases={true}
                                    id="swap-currency-input"
                                    />
                                    <AutoColumn justify="space-between" className="py-3">
                                    <div
                                        className={classNames(isExpertMode ? 'justify-between' : 'flex-start', 'px-4 flex-wrap w-full flex')}
                                    >
                                        <button
                                        className="z-10 -mt-6 -mb-6 rounded-full"
                                        onClick={() => {
                                            setApprovalSubmitted(false) // reset 2 step UI for approvals
                                            onSwitchTokens()
                                        }}
                                        >
                                        <div className="rounded-full bg-dark-900 p-3px">
                                            <div
                                            className="p-3 rounded-full bg-dark-800 hover:bg-dark-700"
                                            onMouseEnter={() => setAnimateSwapArrows(true)}
                                            onMouseLeave={() => setAnimateSwapArrows(false)}
                                            >
                                            <Lottie
                                                animationData={swapArrowsAnimationData}
                                                autoplay={animateSwapArrows}
                                                loop={false}
                                                style={{ width: 32, height: 32 }}
                                            />
                                            </div>
                                        </div>
                                        </button>
                                        {isExpertMode ? (
                                        recipient === null && !showWrap ? (
                                            <Button variant="link" size="none" id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                                            + Add recipient (optional)
                                            </Button>
                                        ) : (
                                            <Button
                                            variant="link"
                                            size="none"
                                            id="remove-recipient-button"
                                            onClick={() => onChangeRecipient(null)}
                                            >
                                            - {i18n._(`Remove recipient`)}
                                            </Button>
                                        )
                                        ) : null}
                                    </div>
                                    </AutoColumn>

                                    <div>
                                    <CurrencyInputPanel
                                        value={formattedAmounts[Field.OUTPUT]}
                                        onUserInput={handleTypeOutput}
                                        label={independentField === Field.INPUT && !showWrap ? i18n._(`Swap To (est.):`) : i18n._(`Swap To:`)}
                                        showMaxButton={false}
                                        hideBalance={false}
                                        fiatValue={fiatValueOutput ?? undefined}
                                        priceImpact={priceImpact}
                                        currency={currencies[Field.OUTPUT]}
                                        onCurrencySelect={handleOutputSelect}
                                        otherCurrency={currencies[Field.INPUT]}
                                        showCommonBases={true}
                                        id="swap-currency-output"
                                    />
                                    {Boolean(trade) && (
                                        <div className="p-1 -mt-2 cursor-pointer rounded-b-md bg-dark-800">
                                        <TradePrice
                                            price={trade?.executionPrice}
                                            showInverted={showInverted}
                                            setShowInverted={setShowInverted}
                                            className="bg-dark-900"
                                        />
                                        </div>
                                    )}
                                    </div>
                                </div>

                                {recipient !== null && !showWrap && (
                                    <>
                                    <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
                                    {recipient !== account && (
                                        <Alert
                                        type="warning"
                                        dismissable={false}
                                        showIcon
                                        message={i18n._(
                                            `Please note that the recipient address is different from the connected wallet address.`
                                        )}
                                        />
                                    )}
                                    </>
                                )}

                                {/* {showWrap ? null : (
                                    <div
                                    style={{
                                        padding: showWrap ? '.25rem 1rem 0 1rem' : '0px',
                                    }}
                                    >
                                    <div className="px-5 mt-1">{doArcher && userHasSpecifiedInputOutput && <MinerTip />}</div>
                                    </div>
                                )} */}
                                {/*
                                {trade && (
                                    <div className="p-5 rounded bg-dark-800">
                                    <AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} />
                                    </div>
                                )} */}

                                <BottomGrouping>
                                    {swapIsUnsupported ? (
                                    <Button color="red" size="lg" disabled>
                                        {i18n._(`Unsupported Asset`)}
                                    </Button>
                                    ) : !account ? (
                                    <Web3Connect size="lg" color="blue" className="w-full" />
                                    ) : showWrap ? (
                                    <Button color="gradient" size="lg" disabled={Boolean(wrapInputError)} onClick={onWrap}>
                                        {wrapInputError ??
                                        (wrapType === WrapType.WRAP
                                            ? i18n._(`Wrap`)
                                            : wrapType === WrapType.UNWRAP
                                            ? i18n._(`Unwrap`)
                                            : null)}
                                    </Button>
                                    ) : routeNotFound && userHasSpecifiedInputOutput ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="mb-1">{i18n._(`Insufficient liquidity for this trade`)}</div>
                                        {singleHopOnly && <div className="mb-1">{i18n._(`Try enabling multi-hop trades`)}</div>}
                                    </div>
                                    ) : showApproveFlow ? (
                                    <div>
                                        {approvalState !== ApprovalState.APPROVED && (
                                        <ButtonConfirmed
                                            onClick={handleApprove}
                                            disabled={approvalState !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                                            size="lg"
                                        >
                                            {approvalState === ApprovalState.PENDING ? (
                                            <div className="flex items-center justify-center h-full space-x-2">
                                                <div>Approving</div>
                                                <Loader stroke="white" />
                                            </div>
                                            ) : (
                                            i18n._(`Approve ${currencies[Field.INPUT]?.symbol}`)
                                            )}
                                        </ButtonConfirmed>
                                        )}
                                        {approvalState === ApprovalState.APPROVED && (
                                        <ButtonError
                                            onClick={() => {
                                            if (isExpertMode) {
                                                handleSwap()
                                            } else {
                                                setSwapState({
                                                tradeToConfirm: trade,
                                                attemptingTxn: false,
                                                swapErrorMessage: undefined,
                                                showConfirm: true,
                                                txHash: undefined,
                                                })
                                            }
                                            }}
                                            style={{
                                            width: '100%',
                                            backgroundColor: '#13BFC6',
                                            color: '#fff'
                                            }}
                                            id="swap-button"
                                            disabled={
                                            !isValid || approvalState !== ApprovalState.APPROVED || (priceImpactSeverity > 3 && !isExpertMode)
                                            }
                                            error={isValid && priceImpactSeverity > 2}
                                        >
                                            {priceImpactSeverity > 3 && !isExpertMode
                                            ? i18n._(`Price Impact High`)
                                            : priceImpactSeverity > 2
                                            ? i18n._(`Swap Anyway`)
                                            : i18n._(`Swap`)}
                                        </ButtonError>
                                        )}
                                    </div>
                                    ) : (
                                    <ButtonError
                                        style={{backgroundColor: '#13BFC6', color: '#fff'}}
                                        onClick={() => {
                                        if (isExpertMode) {
                                            handleSwap()
                                        } else {
                                            setSwapState({
                                            tradeToConfirm: trade,
                                            attemptingTxn: false,
                                            swapErrorMessage: undefined,
                                            showConfirm: true,
                                            txHash: undefined,
                                            })
                                        }
                                        }}
                                        id="swap-button"
                                        disabled={!isValid || (priceImpactSeverity > 3 && !isExpertMode) || !!swapCallbackError}
                                        error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
                                    >
                                        {swapInputError
                                        ? swapInputError
                                        : priceImpactSeverity > 3 && !isExpertMode
                                        ? i18n._(`Price Impact Too High`)
                                        : priceImpactSeverity > 2
                                        ? i18n._(`Swap Anyway`)
                                        : i18n._(`Swap`)}
                                    </ButtonError>
                                    )}
                                    {showApproveFlow && (
                                    <Column style={{ marginTop: '1rem' }}>
                                        <ProgressSteps steps={[approvalState === ApprovalState.APPROVED]} />
                                    </Column>
                                    )}
                                    {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
                                </BottomGrouping>
                                {/* {!swapIsUnsupported ? (
                                <AdvancedSwapDetailsDropdown trade={trade} />
                            ) : (
                                <UnsupportedCurrencyFooter
                                show={swapIsUnsupported}
                                currencies={[currencies.INPUT, currencies.OUTPUT]}
                                />
                            )} */}

                                {!swapIsUnsupported ? null : (
                                    <UnsupportedCurrencyFooter show={swapIsUnsupported} currencies={[currencies.INPUT, currencies.OUTPUT]} />
                                )}
                                </div>
                            </DoubleGlowShadow>
                            
                        </div>
                    </div>
                </section>
                :
                <section id="buy" className='heroSection'>
                    <div className="mx-auto text-center">
                        <img src='/images/viral/hero.png' className='heroImage' alt="" />
                        <div className='heroContent'>
                            <h5 className='heroGo'>{`Let's go`}</h5>
                            <h3 className='heroViralTogether'>Viral together</h3>
                            <p className='heroGo'>Refer People To Buy The Most ViralCoin Ever.</p>
                        </div>
                        <div className="align-center">
                            <div>
                                <p className='heroAvailable'>Available On:</p>
                            </div>
                            <div className="flex justify-center">
                                <div className='heroAvailableDiv'>
                                    <QuestionHelper text={i18n._(`Ethereum (ETH)`)}>
                                        <button onClick={toggleWalletModal}>
                                            <img src='/images/viral/eth.png' alt="" />
                                        </button>
                                    </QuestionHelper>
                                </div>
                                <div className='heroAvailableDiv'>
                                    <QuestionHelper text={i18n._(`Polygon (Matic)`)}>
                                        <button onClick={toggleWalletModal}>
                                            <img src='/images/viral/matic.png' alt="" />
                                        </button>
                                    </QuestionHelper>
                                </div>
                                <div className='heroAvailableDiv'>
                                    <QuestionHelper text={i18n._(`Binance Smart Chain (BNB)`)}>
                                        <button onClick={toggleWalletModal}>
                                            <img src='/images/viral/binance.png' alt="" />
                                        </button>
                                    </QuestionHelper>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-lg-12 text-center">
                                <nav className="justify-center">
                                    <a className='heroAvailableSelectButton' aria-current="page" href="#viral">Viral Mission</a>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#hworks">How it Works</a>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#vm">Viral Map</a>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#faq">{`FAQ & Audit`}</a>
                                    <button className='heroAvailableNoSelectButton' onClick={() =>{setChartGuideShow(true)}}>Charts</button>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#hbuy">How to Buy Viral</a>
                                </nav>
                            </div>
                        </div>
                    </div>
                </section>
            }
            {
                <section id="refer" className='referViralSection' style={{display: owner_account ? 'block' : 'none'}}>
                    <div className="relative md:flex flex-col justify-center items-center">
                        <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>Refer a Friend</h2>
                        <h3 className='referViralH3'>Referral Rewards: <span className='referViralSpan'>5555555555 VIRAL</span></h3>
                        {(chainId && chainId == ChainId.BSC) ?
                            (
                                <h4 className='referViralH4' >You can earn 1% of all purchases when your Friends buy ViralCoin (Viral) if you send them your Referral link. When you decide to sell ViralCoin (Viral), you will need at least ${Math.round(halfBnbGasPrice * 100) / 100} worth of BNB in your wallet to pay for gas fees. Spread the word!</h4>
                            ) : (chainId && chainId == ChainId.MAINNET) ? (
                                <h4 className='referViralH4' >You can earn 1% of all purchases when your Friends buy ViralCoin (Viral) if you send them your Referral link. When you decide to sell ViralCoin (Viral), you will need at least ${Math.round(halfEthGasPrice * 100) / 100} worth of ETH in your wallet to pay for gas fees. Spread the word!</h4>
                            ) : (
                                <h4 className='referViralH4' >You can earn 1% of all purchases when your Friends buy ViralCoin (Viral) if you send them your Referral link. When you decide to sell ViralCoin (Viral), you will need at least ${Math.round(halfMaticGasPrice * 100) / 100} worth of MATIC in your wallet to pay for gas fees. Spread the word!</h4>
                            )
                        }
                        <div className='referViralDiv1'>
                            <div className='referViralDiv2'>
                                <div className='referViralDiv3'>
                                    <label className='referViralLabel'>Referral Link: </label>
                                    {isMobile && <img src="https://img.icons8.com/fluent/24/000000/share-3.png" onClick={()=>handleShareWithFriends()} />}
                                </div>
                                <div className='referViralDiv4'>
                                    {owner_account && referralLink === '' && setReferralLink(`${domainURL}/?r=${base64.encode(owner_account)}`)}
                                    <input
                                        type="text"
                                        id="disabledTextInput"
                                        placeholder={owner_account ? `${domainURL}/?r=${base64.encode(owner_account)}` : ``}
                                        onChange={e => setReferralLink(e.target.value)}
                                        value={referralLink}
                                        aria-label="Amount (to the nearest dollar)"
                                        onFocus={e => {e.target.select(); console.log("focus")}}
                                        className='referViralInput'
                                    />
                                    <Tooltip text={i18n._(`Copied to Clipboard!`)} show={isCopied}>
                                        <span onClick={() =>{
                                            setCopied(referralLink);
                                            if(referralLink.length > 0) {
                                                let linkIndex = referralLink.indexOf(`${domainURL}/?r=`)
                                                if(linkIndex > 0) {
                                                    let newAccount = referralLink.replace(`${domainURL}/?r=`, '')
                                                    localStorage.setItem('user_address', base64.decode(newAccount))
                                                }else{
                                                    localStorage.setItem('user_address', '')
                                                }
                                            } 
                                            }} className='referViralSpan1'>
                                            <img src='/images/viral/copy-black.svg' className='referViralIcon' />
                                        </span>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className='referViralDiv5'>
                                <img src='/images/viral/qr_code.png' alt="" onClick={()=>setQRCodeShow(true)} />
                            </div>
                        </div>
                        <div className="row mt-12">
                            <div className="col-lg-12 text-center">
                                <nav className="justify-center">
                                    <a className='heroAvailableSelectButton' aria-current="page" href="#viral">Viral Mission</a>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#hworks">How it Works</a>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#vm">Viral Map</a>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#faq">{`FAQ & Audit`}</a>
                                    <button className='heroAvailableNoSelectButton' onClick={() =>{setChartGuideShow(true)}}>Charts</button>
                                    <a className='heroAvailableNoSelectButton' aria-current="page" href="#hbuy">How to Buy Viral</a>
                                </nav>
                            </div>
                        </div>
                    </div>
                </section>
            }
            {
                <section id="viral" className='viralSection'>
                    <div className="relative md:flex flex-col justify-center items-center">
                        <div className={isMobile? 'viralSectionMobileDiv' : 'viralSectionDiv'}>
                            <div className='viralSectionDiv1'>
                                <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>Viral Mission</h2>
                                <p className='viralSectionP1'>
                                    {`Viralcoin's goal is to increase the mass adoption of cryptocurrency to every person on earth, whether it’s through sharing the knowledge and referring others to ViralCoin and earning tokens passively with no purchase required, or by purchasing themselves. Once the max total supply has been reached, there will be millions of holders, each of whom had an equal opportunity to participate, and the token will potentially flourish forever.`}
                                </p>
                                <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'} >Why is Viral the Supreme Fairness Token?</h2>
                                <ul className='viralSectionUl'>
                                    <li className='viralSectionLi'>
                                        ViralCoin invented the first ever <span className='viralSectionLiSpan'>Fair Balanced Launch (FBL)</span>. The FBL rebalances the liquidity pool on every buy/swap until all of ViralCoin has been minted. ViralCoin’s FBL keeps the price relatively consistent for every purchaser until the ViralVault is empty.
                                    </li>
                                    <li className='viralSectionLi'>No tokens have been given in advance to anyone. This is the definition of Fair.</li>
                                    <li className='viralSectionLi'>No need for Liquidity Providers.</li>
                                    <li className='viralSectionLi'>Reputable ViralTrustees are in the process of being evaluated and will be given control of the liquidity pool. This resolves a common concern with many other DeFi tokens. You can learn more here:</li>
                                    <li className='viralSectionLi'>We believe burning tokens at launch is a gimmick and adds no value unless it occurs over time, which we will consider at a later date through Governance.</li>
                                    <li className='viralSectionLi'>The ViralTeam Wallet does not receive any auto-redistributed tokens, nor does the liquidity pool. The success is the hands of the community.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="relative md:flex flex-col justify-center items-center mt-12 mb-12">
                        <div className={isMobile? 'totalViralMobileDiv1' : 'totalViralDiv1'}>
                            <div className="mx-auto">
                                <div className='totalViralDiv2'>
                                    <h5 className='totalViralH5'>Total Viral Remaining To Be Minted</h5>
                                    <div className={isMobile ? 'totalViralMobileDiv3' : 'totalViralDiv3'}>
                                        <CountUp start={0} end={Math.round(BigNumber.from(1000000000000000).sub(BigNumber.from(ethValue).div(BigNumber.from(10).pow(18))).sub(BigNumber.from(bscValue).div(BigNumber.from(10).pow(18))).sub(BigNumber.from(polymaticValue).div(BigNumber.from(10).pow(18))).toNumber())} duration={5} separator="," useEasing={true}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={isMobile ? 'totalViralMobileDiv4' : 'totalViralDiv4'}>
                            <div className="mx-auto relative md:flex flex-col justify-center items-center">
                                <ul className='viralSectionUl'>
                                    <li className='totalViralLi'>Total Viral Supply: <span className='totalViralSpan'>{commaNumber(Math.round(BigNumber.from(ethValue).div(BigNumber.from(10).pow(18)).add(BigNumber.from(bscValue).div(BigNumber.from(10).pow(18))).add(BigNumber.from(polymaticValue).div(BigNumber.from(10).pow(18))).toNumber()).toString())}</span> of <span className='totalViralSpan'>{commaNumber('1000000000000000')}</span></li>
                                    <li className='totalViralLi'>Total Viral Ethereum (ETH) Supply: <span className='totalViralSpan'>{commaNumber(Math.round(BigNumber.from(ethValue).div(BigNumber.from(10).pow(18)).toNumber()).toString())}</span></li>
                                    <li className='totalViralLi'>Total Viral Binance Smart Contract (BNB) Supply: <span className='totalViralSpan'>{commaNumber(Math.round(BigNumber.from(bscValue).div(BigNumber.from(10).pow(18)).toNumber()).toString())}</span></li>
                                    <li className='totalViralLi'>Viral Polygon (Matic) Supply: <span className='totalViralSpan'>{commaNumber(Math.round(BigNumber.from(polymaticValue).div(BigNumber.from(10).pow(18)).toNumber()).toString())}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            }
            {
                <section id="hbuy" className='buyViralSection'>
                    <div className="relative md:flex flex-col justify-center items-center">
                        <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>How to Buy Viral</h2>
                        <div className="row">
                            <div className="col-lg-12 text-center">
                                <nav className="justify-center">
                                    <button style={{background: showHBV_Ethereum ? '#13BFC6' : 'none', borderColor: '#13BFC6', padding: '1rem 2rem', borderRadius: '2rem', display: 'inline-block', marginBottom: '1rem', marginLeft: '1rem', color: '#fff'}} onClick={() => onShowHBV_Ethereum()}>Ethereum (ETH)</button>
                                    <button style={{background: showHBV_Matic ? '#13BFC6' : 'none', borderColor: '#13BFC6', padding: '1rem 2rem', borderRadius: '2rem', display: 'inline-block', marginBottom: '1rem', marginLeft: '1rem', color: '#fff'}} onClick={() => onShowHBV_Matic()}>Polygon (Matic)</button>
                                    <button style={{background: showHBV_Bsc ? '#13BFC6' : 'none', borderColor: '#13BFC6', padding: '1rem 2rem', borderRadius: '2rem', display: 'inline-block', marginBottom: '1rem', color: '#fff'}} onClick={() => onShowHBV_Bsc()} >Binance Smart Chain (BNB)</button>
                                </nav>
                            </div>
                        </div>
                        <div className={isMobile ? 'buyViralMobileDiv1' : 'buyViralDiv1'}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#fff', padding: '0.5rem 0', marginBottom: '4px', textAlign: 'left', display: showHBV_Bsc ? 'block' : 'none'}}>
                                {isMobile ? isIOS ? `Cheaper and Fast Method using Binance Smart Chain (BNB) to swap for Viral.` : `Cheaper and Fast Method using Binance Smart Chain (BNB) to swap for Viral` : `Cheaper and Fast Method using Binance Smart Chain (BNB) to swap for Viral`}
                            </h3>
                            <ol style={{ display: showHBV_Bsc ? 'block' : 'none', backgroundColor: 'rgba(72, 64, 142, 0.5)', padding: '1rem 3rem', borderRadius: '2rem', listStyleType: 'none', listStylePosition: 'outside', textAlign: 'left', marginBlockStart: '1em', marginBlockEnd: '1em', marginInlineStart: '0px', marginInlineEnd: '0px', paddingInlineStart: '40px', marginBottom: '2rem'}}>
                                <li className='buyViralLi' >
                                    {isMobile ?  
                                        isIOS ? 
                                            <>1. <a className='buyViralA' href="https://apps.apple.com/us/app/metamask/id1438144202">Install Metamask</a> and setup your wallet.</>
                                        : 
                                            <>1. <a className='buyViralA' href="https://play.google.com/store/apps/details?id=io.metamask">Install Metamask</a> and setup your wallet.</>
                                    : 
                                        <>1. <a className='buyViralA' href="https://chrome.google.com/webstore/detail/nkbihfbeogaeaoehlefnkodbefgpgknn">Install Metamask</a> and setup your wallet.</>
                                    }
                                </li>
                                <li className='buyViralLi'>
                                    <>2. <a className='buyViralA' aria-current="page" href="#buy">Click Here</a> to switch to the Binance Smart Chain Network in MetaMask.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>3. Click the 0x… address in the top right of the webpage, which is your wallet address, and it will copy to your clipboard.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>4. If you do not own BNB, you can <a className='buyViralA' href="https://buy.moonpay.io/?defaultCurrencyCode=BNB">Buy BNB here</a> and paste your address when asked, to proceed with the purchase. Regardless of how much ViralCoin you buy, you need to budget for a gas fee. Add ${Math.round(fullBnbGasPrice * 100) / 100} to whatever amount you purchase so that you can pay the gas when you buy and when you sell in the future. Example: If you wanted $500 ViralCoin your total BNB needs to be approximately ${500 + Math.round(fullBnbGasPrice * 100) / 100}</>
                                </li>
                                <li className='buyViralLi'>
                                    {isMobile ?  
                                        isIOS ? 
                                            <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(owner_account)}`}>Load ViralCoin.com in MetaMask Automatically</a></>
                                        : 
                                            <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(owner_account)}`}>Load ViralCoin.com in MetaMask Automatically</a></>
                                    : 
                                        <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(owner_account)}`}>Re-Visit ViralCoin.com</a></>
                                    }
                                </li>
                                <li className='buyViralLi'>
                                    <>6. If you are Connected in MetaMask, you will see the BUY form to swap BNB for Viral. Enter the amount you prefer and press ‘Unlock’. This will charge a few cents to give you permanent access to the ViralSwap exchange on the BSC Network.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>7. When the ‘Unlock’ button says ‘Swap’, press it, and complete your acquisition.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>8. Your purchase will be complete in a few seconds. To see Viral within MetaMask, <a className='buyViralA' 
                                        onClick={() => {
                                            let address: string | undefined
                                            switch (chainId) {
                                                case ChainId.MAINNET:
                                                    address =
                                                        '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'
                                                    break
                                                case ChainId.BSC:
                                                    address =
                                                        '0x947950BcC74888a40Ffa2593C5798F11Fc9124C4'
                                                    break
                                                case ChainId.MATIC:
                                                    address =
                                                        '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a'
                                                    break
                                            }
                                            const params: any = {
                                                type: 'ERC20',
                                                options: {
                                                    address: address,
                                                    symbol: 'ViralCoin',
                                                    decimals: 18,
                                                    image:
                                                        'http://54.196.255.82/logo.png'
                                                }
                                            }

                                            if (
                                                library &&
                                                library.provider.isMetaMask &&
                                                library.provider.request
                                            ) {
                                                library.provider
                                                    .request({
                                                        method: 'wallet_watchAsset',
                                                        params
                                                    })
                                                    .then(success => {
                                                        if (success) {
                                                            console.log(
                                                                'Successfully added ViralCoin to MetaMask'
                                                            )
                                                        } else {
                                                            throw new Error('Something went wrong.')
                                                        }
                                                    })
                                                    .catch(console.error)
                                            }
                                        }}>Click Here</a>. If you are on android or have issues, you may need to manually add Viral to MetaMask. <a style={{color: '#13BFC6', fontSize: '1rem', fontWeight: 400}} href="#">Click Here</a> for instructions.</>
                                </li>
                            </ol>
                            <h3 style={{ display: showHBV_Ethereum ? 'block' : 'none', fontSize: '1rem', fontWeight: 500, color: '#fff', padding: '0.5rem 0', marginBottom: '4px', textAlign: 'left'}}>
                                {isMobile ? isIOS ? `Fastest Method, slightly more expensive method (until further notice) using Ethereum (ETH) to swap for Viral.` : `Fastest Method, slightly more expensive method (until further notice) using Ethereum (ETH) to swap for Viral.` : `Fastest Method, slightly more expensive method (until further notice) using Ethereum (ETH) to swap for Viral.`}
                            </h3>
                            <ol style={{ display: showHBV_Ethereum ? 'block' : 'none', backgroundColor: 'rgba(72, 64, 142, 0.5)', padding: '1rem 3rem', borderRadius: '2rem', listStyleType: 'none', listStylePosition: 'outside', textAlign: 'left', marginBlockStart: '1em', marginBlockEnd: '1em', marginInlineStart: '0px', marginInlineEnd: '0px', paddingInlineStart: '40px', marginBottom: '2rem'}}>
                                <li className='buyViralLi' >
                                    {isMobile ?  
                                        isIOS ? 
                                            <>1. <a className='buyViralA' href="https://apps.apple.com/us/app/metamask/id1438144202">Install Metamask</a> and setup your wallet.</>
                                        : 
                                            <>1. <a className='buyViralA' href="https://play.google.com/store/apps/details?id=io.metamask">Install Metamask</a> and setup your wallet.</>
                                    : 
                                        <>1. <a className='buyViralA' href="https://chrome.google.com/webstore/detail/nkbihfbeogaeaoehlefnkodbefgpgknn">Install Metamask</a> and setup your wallet.</>
                                    }
                                </li>
                                <li className='buyViralLi'>
                                    <>2. Make sure it says “Ethereum Main Network” within your MetaMask. If it doesn’t, click the top center of MetaMask and select “Ethereum Main Network”.</>
                                </li>
                                <li className='buyViralLi'>
                                    3. Click the 0x… address in the top right of the webpage, which is your wallet address, and it will copy to your clipboard.
                                </li>
                                <li className='buyViralLi'>
                                    4. If you do not own ETH, you can <a className='buyViralA' href="https://buy.moonpay.io/?defaultCurrencyCode=ETH">Buy ETH here</a> and paste your address when asked, to proceed with the purchase. Regardless of how much ViralCoin you buy, you need to budget for a gas fee. Add ${Math.round(fullEthGasPrice * 100) / 100} to whatever amount you purchase so that you can pay the gas when you buy and when you sell in the future. Example: If you wanted $500 ViralCoin your total ETH needs to be approximately ${500 + Math.round(fullEthGasPrice * 100) / 100}
                                </li>
                                <li className='buyViralLi'>
                                    {isMobile ?  
                                        isIOS ? 
                                            <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(owner_account)}`}>Load ViralCoin.com in MetaMask Automatically</a></>
                                        : 
                                            <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(owner_account)}`}>Load ViralCoin.com in MetaMask Automatically</a></>
                                    : 
                                        <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(owner_account)}`}>Re-Visit ViralCoin.com</a></>
                                    }
                                </li>
                                <li className='buyViralLi'>
                                    <>6. If you are Connected in MetaMask, you will see the BUY form to swap ETH for Viral. Enter the amount you prefer and press ‘Unlock’. This will charge a few cents to give you permanent access to the ViralSwap exchange on the Ethereum Network.</>
                                </li>
                                <li className='buyViralLi'>
                                    7. When the ‘Unlock’ button says ‘Swap’, press it, and complete your acquisition.
                                </li>
                                <li className='buyViralLi'>
                                    <>8. Your purchase will be complete in a few seconds. To see Viral within MetaMask, <a className='buyViralA' 
                                        onClick={() => {
                                            let address: string | undefined
                                            switch (chainId) {
                                                case ChainId.MAINNET:
                                                    address =
                                                        '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'
                                                    break
                                                case ChainId.BSC:
                                                    address =
                                                        '0x947950BcC74888a40Ffa2593C5798F11Fc9124C4'
                                                    break
                                                case ChainId.MATIC:
                                                    address =
                                                        '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a'
                                                    break
                                            }
                                            const params: any = {
                                                type: 'ERC20',
                                                options: {
                                                    address: address,
                                                    symbol: 'ViralCoin',
                                                    decimals: 18,
                                                    image:
                                                        'http://54.196.255.82/logo.png'
                                                }
                                            }

                                            if (
                                                library &&
                                                library.provider.isMetaMask &&
                                                library.provider.request
                                            ) {
                                                library.provider
                                                    .request({
                                                        method: 'wallet_watchAsset',
                                                        params
                                                    })
                                                    .then(success => {
                                                        if (success) {
                                                            console.log(
                                                                'Successfully added ViralCoin to MetaMask'
                                                            )
                                                        } else {
                                                            throw new Error('Something went wrong.')
                                                        }
                                                    })
                                                    .catch(console.error)
                                            }
                                        }}>Click Here</a>. If you are on android or have issues, you may need to manually add Viral to MetaMask. <a className='buyViralA' href="#">Click Here</a> for instructions.</>
                                </li>
                            </ol>
                            <h3 style={{ display: showHBV_Matic ? 'block' : 'none', fontSize: '1rem', fontWeight: 500, color: '#fff', padding: '0.5rem 0', marginBottom: '4px', textAlign: 'left'}}>
                                Cheapest and Fast Method using Polygon (MATIC) to swap for Viral.
                            </h3>
                            <ol style={{ display: showHBV_Matic ? 'block' : 'none', backgroundColor: 'rgba(72, 64, 142, 0.5)', padding: '1rem 3rem', borderRadius: '2rem', listStyleType: 'none', listStylePosition: 'outside', textAlign: 'left', marginBlockStart: '1em', marginBlockEnd: '1em', marginInlineStart: '0px', marginInlineEnd: '0px', paddingInlineStart: '40px', marginBottom: '2rem'}}>
                                <li className='buyViralLi' >
                                    {isMobile ?  
                                        isIOS ? 
                                            <>1. <a className='buyViralA' href="https://apps.apple.com/us/app/metamask/id1438144202">Install Metamask</a> and setup your wallet.</>
                                        : 
                                            <>1. <a className='buyViralA' href="https://play.google.com/store/apps/details?id=io.metamask">Install Metamask</a> and setup your wallet.</>
                                    : 
                                        <>1. <a className='buyViralA' href="https://chrome.google.com/webstore/detail/nkbihfbeogaeaoehlefnkodbefgpgknn">Install Metamask</a> and setup your wallet.</>
                                    }
                                </li>
                                <li className='buyViralLi'>
                                    <>2. <a className='buyViralA' href="#buy">Click Here</a> to switch to the Poloygon (Matic) Network in MetaMask.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>3. Click the 0x… address in the top right of the webpage, which is your wallet address, and it will copy to your clipboard.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>4. If you do not own MATIC, you can <a className='buyViralA' href="https://buy.moonpay.io/?defaultCurrencyCode=matic_polygon">Buy MATIC here</a> and paste your address when asked, to proceed with the purchase. Regardless of how much ViralCoin you buy, you need to budget for a gas fee. Add ${Math.round(fullMaticGasPrice * 100) / 100} to whatever amount you purchase so that you can pay the gas when you buy and when you sell in the future. Example: If you wanted $500 ViralCoin your total MATIC needs to be approximately ${500 + Math.round(fullMaticGasPrice * 100) / 100}</>
                                </li>
                                <li className='buyViralLi'>
                                    {isMobile ?  
                                        isIOS ? 
                                            <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(localStorage.getItem('user_address'))}`}>Load ViralCoin.com in MetaMask Automatically</a></>
                                        : 
                                            <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(localStorage.getItem('user_address'))}`}>Load ViralCoin.com in MetaMask Automatically</a></>
                                    : 
                                        <>5. <a className='buyViralA' href={`${domainDAppURL}?ref=${base64.encode(localStorage.getItem('user_address'))}`}>Re-Visit ViralCoin.com</a></>
                                    }
                                </li>
                                <li className='buyViralLi'>
                                    <>6. If you are Connected in MetaMask, you will see the BUY form to swap MATIC for Viral. Enter the amount you prefer and press ‘Unlock’. This will charge a few cents to give you permanent access to the ViralSwap exchange on the Matic Network.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>7. When the ‘Unlock’ button says ‘Swap’, press it, and complete your acquisition.</>
                                </li>
                                <li className='buyViralLi'>
                                    <>8. Your purchase will be complete in a few seconds. To see Viral within MetaMask, <a className='buyViralA' 
                                        onClick={() => {
                                            let address: string | undefined
                                            switch (chainId) {
                                                case ChainId.MAINNET:
                                                    address =
                                                        '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'
                                                    break
                                                case ChainId.BSC:
                                                    address =
                                                        '0x947950BcC74888a40Ffa2593C5798F11Fc9124C4'
                                                    break
                                                case ChainId.MATIC:
                                                    address =
                                                        '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a'
                                                    break
                                            }
                                            const params: any = {
                                                type: 'ERC20',
                                                options: {
                                                    address: address,
                                                    symbol: 'ViralCoin',
                                                    decimals: 18,
                                                    image:
                                                        'http://54.196.255.82/logo.png'
                                                }
                                            }

                                            if (
                                                library &&
                                                library.provider.isMetaMask &&
                                                library.provider.request
                                            ) {
                                                library.provider
                                                    .request({
                                                        method: 'wallet_watchAsset',
                                                        params
                                                    })
                                                    .then(success => {
                                                        if (success) {
                                                            console.log(
                                                                'Successfully added ViralCoin to MetaMask'
                                                            )
                                                        } else {
                                                            throw new Error('Something went wrong.')
                                                        }
                                                    })
                                                    .catch(console.error)
                                            }
                                        }}>Click Here</a>. If you are on android or have issues, you may need to manually add Viral to MetaMask. <a className='buyViralA' href="#">Click Here</a> for instructions.</>
                                </li>
                            </ol>
                        </div>
                    </div>
                </section>
            }
            {
                <section id="hworks" className='worksViralSection'>
                    <div className="relative md:flex flex-col justify-center items-center">
                        <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>How It Works</h2>
                        <div className={isMobile ? 'worksViralMobileDiv1' : 'worksViralDiv1'}>
                            <div className={isMobile ? 'worksViralMobileDiv2' : 'worksViralDiv2'}>
                                <Collapsible 
                                    triggerStyle={{borderTopLeftRadius: '10px', borderTopRightRadius: '10px', backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none'}}
                                    transitionTime={400}
                                    trigger="There are 2 Ways to Get ViralCoins:"
                                    open={true}
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>Connect Your Wallet to Purchase tokens directly from ViralCoin. You are required to pay the fractional gas fee to participate, and it is paid directly to the blockchain.</li>
                                        <li className='worksViralLi'>Refer Buyers and receive 1% anytime they buy ViralCoin, at no cost to you. You can connect your wallet and be issued your referral link and begin immediately.</li>
                                    </ul>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Total Max Supply: 1,000,000,000,000,000 ViralCoin:"
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>The reason that we mint tokens, instead of pre-mint, is this allows ViralCoin to continuously launch on multiple networks until we reach our predefined maximum token supply. It is challenging for a smart contract like ETH to know the current total supply of tokens on another network like BSC.  Our solution is to integrate with Chainlink to monitor when the total max supply is almost reached on each network and stop minting on the smart contracts. If any challenges arise, ViralTrustees will manually turn off minting at the optimal time.</li>
                                    </ul>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Tokenomics - On Every Buy / Sell / Transfer:"
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>Price starts and is balanced at $0.00001 until the ViralVault is empty then the price will change.</li>
                                        <li className='worksViralLi'>Anyone can buy or sell Viral with most popular available tokens. To get the best rate with the least amount of gas and slippage, use USDC.</li>
                                        <li className='worksViralLi'>Global Holder Re-distributed: 3% is sent to all pre-existing holders weighted by the % of the total circulation they hold, excluding the Team Wallet.</li>
                                        <li className='worksViralLi'>ViralTeam Wallet: Receives 1% on every Buy / Sell / Transfer, and is blocked from receiving any re-distributions, however is excluded from taxes during transfers.</li>
                                        <li className='worksViralLi'>Referrer: 1% is sent to the referrer of every buy. If you someone does not have a referrer, or if someone tries to refer themself, the 1% will be given to the ViralCoin team wallet.</li>
                                    </ul>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Commerce Enhancement:"
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>We can exclude certain wallets per transaction type from paying the ViralCoin tax when transferring tokens to an approved commerce partner.  Governance will announce and open a vote to accept these merchants prior to to delegating these privileges, which allows us to gauge the community’s preference. This will potentially allow users to send Viral to pay a bill, without fees.</li>
                                    </ul>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Governance:"
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>At this moment, the ViralTeam controls the LP. We are actively seeking reputable Multi-Sig guardians (ViralTrustees) to protect the ViralCoin mission and oversee the fulfillment of all future milestones. If you have a recommendation, comment here: Once Governance is enabled, votes will occur on Snapshot.org.</li>
                                    </ul>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Centralized Exchanges:"
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>Often times an exchange integrates a defi token in which buyers and sellers do not receive the auto-redistribution rewards and other tokenomic benefits.  It could also be speculated that if the trading volume and other token metrics from those type of exchanges were included in market analysis websites, then it could misrepresent how the tokens actually circulated over a given period of time. It has been decided that it would not be beneficial for ViralCoin to participate in these types of exchanges.  If we are approached with a positive tokenomic plan that benefits the ViralCoin community, Governance will vote on the implementation.</li>
                                    </ul>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{backgroundColor: 'rgba(68, 33, 138, 0.9)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Block From Re-Distribution:"
                                >
                                    <ul className='worksViralUl'>
                                        <li className='worksViralLi'>If an exchange or liquidity pool begins harvesting re-distribution tokens in a way that is negligent towards our community, Governance will open a vote to block them from receiving any further re-distributions.</li>
                                    </ul>
                                </Collapsible>
                            </div>
                            <div className='worksViralDiv3'>
                                <img src="/images/viral/hiwImage.png" alt="" />
                            </div>
                        </div>
                    </div>
                </section>
            }
            {
                <section id="vm" className='vmViralSection'>
                    <div className="relative md:flex flex-col justify-center items-center">
                        <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>Viral Map</h2>
                        <div className={isMobile ? 'vmViralMobileDiv1' : 'vmViralDiv1'}>
                            <div className='vmViralDiv2'>
                                <img src="/images/viral/check-green-icon.svg" />
                                <div className='vmViralDiv3'>First Audit</div>
                            </div>
                            <div className={isMobile ? 'vmViralMobileDiv2' : 'vmViralDiv2'}>
                                <img src="/images/viral/check-green-icon.svg" />
                                <div className='vmViralDiv3'>ViralSwap Launches</div>
                            </div>
                        </div>
                        <div className={isMobile ? 'vmViralMobileDiv1' : 'vmViralDiv1'}>
                            <div className='vmViralDiv2'>
                                <img src="/images/viral/check-green-icon.svg" />
                                <div className='vmViralDiv3'>Begin Viral Marketing Campaign</div>
                            </div>
                            <div className={isMobile ? 'vmViralMobileDiv2' : 'vmViralDiv2'}>
                                <img src="/images/viral/check-green-icon.svg" />
                                <div className='vmViralDiv3'>Connect With Popular Listing Services</div>
                            </div>
                        </div>
                        <div className={isMobile ? 'vmViralMobileDiv1' : 'vmViralDiv1'}>
                            <div className={isMobile ? 'vmViralMobileDiv4' : 'vmViralDiv4'}>
                                <div className='vmViralDiv5'>
                                    <li className='vmViralLi'>Appoint ViralTrustees</li>
                                    <li className='vmViralLi'>Continuously integrate additional EVM compliant networks</li>
                                    <li className='vmViralLi'>Release Governance Protocol</li>
                                </div>
                                <div className='vmViralDiv5'>
                                    <li className='vmViralLi'>Release ViralWallet including Subscription Support</li>
                                    <li className='vmViralLi'>Integrate Commerce Merchants</li>
                                    <li className='vmViralLi'>Release Smart Contract Bridge</li>
                                    <li className='vmViralLi'>Launch Stablecoin</li>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            }
            {
                <section id="faq" className='faqViralSection'>
                    <div className="relative md:flex flex-col justify-center items-center">
                        <h2 className={isMobile ? 'viralMobileSectionH2' : 'viralSectionH2'}>Faq And Audit</h2>
                        <div className={isMobile ? 'faqViralMobileDiv1' : 'faqViralDiv1'}>
                            <AnimateKeyframes 
                                play
                                iterationCount="infinite"
                                duration={2}
                                direction="alternate"
                                easeType="cubic-bezier(0.65, 0.05, 0.36, 1)"
                                keyframes={['transform: rotate(-30deg);', 'transform: scale(.95);', 'transform: rotate(30deg)', 'transform: scale(.95)']}
                            >
                                <img
                                    src='/images/viral/vcoin_gold.png'
                                    alt="SweetLandia"
                                    id="sweetlandia"
                                    style={{maxWidth: '100%', height: 'auto'}}
                                />
                            </AnimateKeyframes>
                            <div className={isMobile ? 'faqViralMobileDiv2' : 'faqViralDiv2'}>
                                <Collapsible 
                                    triggerStyle={{borderTopLeftRadius: '10px', borderTopRightRadius: '10px', borderColor: '#fff', borderWidth: '1px', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none'}}
                                    transitionTime={400}
                                    trigger="Were the Viral Smart Contracts Audited?"
                                >
                                    <div className='faqViralDiv3'>Yes, a link can be found here: https://www.google.com/</div>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{borderColor: '#fff', borderWidth: '1px', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Who are the Team Members?"
                                >
                                    <div className='faqViralDiv3'>ViralCoin is a Decentralized Autonomous Organization that was built for the People, by the People. The founding team does not seek notoriety for their participation, therefore once Governance is established, ViralCoin will thrive on its own. The ViralSwap Liquidity Pool will be controlled by ViralTrustees, nominated here: HTTP://twitter and will keep the Liquidity Pools safe. Governance on Snapshot.org will be launched to vote on changes to the contract.</div>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{borderColor: '#fff', borderWidth: '1px', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="What is the ViralVault?"
                                >
                                    <div className='faqViralDiv3'>The ViralVault creates ViralCoins on every purchase from ViralSwap to pair and add tokens to the liquidity pool. This is to keep the price from exceeding $0.00001 until all Viral are minted. When there is an unbalanced amount of USDC during minting, the ViralVault holds the excess and it is spent at the discretion of the ViralTeam. When we launch on additional networks, such as Polkadot, Cardano, or xDai, tokens from the ViralVault will be created until the Total Maximum Supply across all available networks is reached.</div>
                                </Collapsible>
                                <Collapsible 
                                    triggerStyle={{borderColor: '#fff', borderWidth: '1px', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '1rem 1.25rem', fontSize: '1rem', textAlign: 'left', overflowAnchor: 'none', marginTop: '2px'}}
                                    transitionTime={400}
                                    trigger="Is ViralCoin a token or a coin?"
                                >
                                    <div className='faqViralDiv3'>It is a token on any given network, however ViralCoin is blockchain agnostic, and will run on many networks until the max total supply has been reached, therefore as an overarching theme, it can be considered a hybrid coin as well.</div>
                                </Collapsible>
                            </div>
                        </div>
                        <div className='faqViralDiv4' />
                    </div>
                </section>
            }
            <div className='social'>
                <ul className='fsocial'>
                    <li className='social-twitter'><a href="https://twitter.com/viralcoindotcom" target="_blank" rel="noreferrer"><FaTwitter className='social-button' /></a></li>
                    <li className='social-telegram'><a href="https://t.me/joinchat/M5ubh4pVRENiNTFh" target="_blank" rel="noreferrer"><FaTelegramPlane /></a></li>
                    <li className='social-discord'><a href="https://discord.com/invite/5K33YC7x" target="_blank" rel="noreferrer"><FaDiscord /></a></li>
                    <li className='social-reddit'><a href="https://www.reddit.com/r/viralcoindotcom" target="_blank" rel="noreferrer"><FaRedditAlien /></a></li>
                </ul>
            </div>
        </main>
    )
}