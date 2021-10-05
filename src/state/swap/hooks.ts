import { AppDispatch, AppState } from '../index'
import { ChainId, Currency, CurrencyAmount, JSBI, Percent, TradeType, Trade as V2Trade, WNATIVE } from '@sushiswap/sdk'
import { DEFAULT_ARCHER_ETH_TIP, DEFAULT_ARCHER_GAS_ESTIMATE } from '../../constants'
import {
  EstimatedSwapCall,
  SuccessfulCall,
  swapErrorToUserReadableMessage,
  useSwapCallArguments,
} from "../../hooks/useSwapCallback";
import { Field, replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput } from './actions'
import { isAddress, isZero } from '../../functions/validate'
import { useAppDispatch, useAppSelector } from '../hooks'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useV2TradeExactIn as useTradeExactIn, useV2TradeExactOut as useTradeExactOut } from '../../hooks/useV2Trades'
import {
  useExpertModeManager,
  useUserArcherETHTip,
  useUserArcherGasEstimate,
  useUserArcherGasPrice,
  useUserArcherTipManualOverride,
  useUserSingleHopOnly,
  useUserSlippageTolerance,
} from '../user/hooks'

import { ParsedQs } from 'qs'
import { SwapState } from './reducer'
import { t } from '@lingui/macro'
import { tryParseAmount } from '../../functions/parse'
import { useActiveWeb3React } from '../../hooks/useActiveWeb3React'
import { useCurrency } from '../../hooks/Tokens'
import { useCurrencyBalances } from '../wallet/hooks'
import useENS from '../../hooks/useENS'
import { useLingui } from '@lingui/react'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import useSwapSlippageTolerance from '../../hooks/useSwapSlippageTollerence'

import { ApolloClient, InMemoryCache, gql, ApolloQueryResult } from '@apollo/client'
import { BigNumber } from 'ethers'
import axios from 'axios'

export function useSwapState(): AppState['swap'] {
  return useAppSelector((state) => state.swap)
}

export function useSwapActionHandlers(): {
  onCurrencySelection: (field: Field, currency: Currency) => void
  onSwitchTokens: () => void
  onUserInput: (field: Field, typedValue: string) => void
  onChangeRecipient: (recipient: string | null) => void
} {
  const dispatch = useAppDispatch()
  const onCurrencySelection = useCallback(
    (field: Field, currency: Currency) => {
      dispatch(
        selectCurrency({
          field,
          currencyId: currency.isToken
            ? currency.address
            : currency.isNative && currency.chainId !== ChainId.CELO
            ? 'ETH'
            : '',
        })
      )
    },
    [dispatch]
  )

  const onSwitchTokens = useCallback(() => {
    dispatch(switchCurrencies())
  }, [dispatch])

  const onUserInput = useCallback(
    (field: Field, typedValue: string) => {
      dispatch(typeInput({ field, typedValue }))
    },
    [dispatch]
  )

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      dispatch(setRecipient({ recipient }))
    },
    [dispatch]
  )

  return {
    onSwitchTokens,
    onCurrencySelection,
    onUserInput,
    onChangeRecipient,
  }
}

// TODO: Swtich for ours...
const BAD_RECIPIENT_ADDRESSES: { [chainId: string]: { [address: string]: true } } = {
  [ChainId.MAINNET]: {
    '0xda51bc834202B3dfB73E1fC0B3c191725Db0a714': true, // v2 factory
    '0x7c5A6470aD95e55AA341a6B2462f6EA2189b8135': true, // v2 router 02
  },
}

/**
 * Returns true if any of the pairs or tokens in a trade have the given checksummed address
 * @param trade to check for the given address
 * @param checksummedAddress address to check in the pairs and tokens
 */
function involvesAddress(trade: V2Trade<Currency, Currency, TradeType>, checksummedAddress: string): boolean {
  const path = trade.route.path
  return (
    path.some((token) => token.address === checksummedAddress) ||
    (trade instanceof V2Trade
      ? trade.route.pairs.some((pair) => pair.liquidityToken.address === checksummedAddress)
      : false)
  )
}

// from the current swap inputs, compute the best trade and return it.
export function useDerivedSwapInfo(doArcher = false): {
  currencies: { [field in Field]?: Currency }
  currencyBalances: { [field in Field]?: CurrencyAmount<Currency> }
  parsedAmount: CurrencyAmount<Currency> | undefined
  inputError?: string
  v2Trade: V2Trade<Currency, Currency, TradeType> | undefined
  allowedSlippage: Percent
} {
  const { i18n } = useLingui()

  const { account, chainId, library } = useActiveWeb3React()

  const [singleHopOnly] = useUserSingleHopOnly()

  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = useSwapState()

  const inputCurrency = useCurrency(inputCurrencyId)

  const outputCurrency = useCurrency(outputCurrencyId)

  const recipientLookup = useENS(recipient ?? undefined)

  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(account ?? undefined, [
    inputCurrency ?? undefined,
    outputCurrency ?? undefined,
  ])

  const isExactIn: boolean = independentField === Field.INPUT
  const parsedAmount = tryParseAmount(typedValue, (isExactIn ? inputCurrency : outputCurrency) ?? undefined)

  const bestTradeExactIn = useTradeExactIn(isExactIn ? parsedAmount : undefined, outputCurrency ?? undefined, {
    maxHops: singleHopOnly ? 1 : undefined,
  })

  const bestTradeExactOut = useTradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmount : undefined, {
    maxHops: singleHopOnly ? 1 : undefined,
  })

  const v2Trade = isExactIn ? bestTradeExactIn : bestTradeExactOut

  const currencyBalances = {
    [Field.INPUT]: relevantTokenBalances[0],
    [Field.OUTPUT]: relevantTokenBalances[1],
  }

  const currencies: { [field in Field]?: Currency } = {
    [Field.INPUT]: inputCurrency ?? undefined,
    [Field.OUTPUT]: outputCurrency ?? undefined,
  }

  let inputError: string | undefined
  if (!account) {
    inputError = 'Connect Wallet'
  }

  if (!parsedAmount) {
    inputError = inputError ?? i18n._(t`BUY`)
  }

  if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
    inputError = inputError ?? i18n._(t`Select a token`)
  }

  const formattedTo = isAddress(to)
  if (!to || !formattedTo) {
    inputError = inputError ?? i18n._(t`Enter a recipient`)
  } else {
    if (
      BAD_RECIPIENT_ADDRESSES?.[chainId]?.[formattedTo] ||
      (bestTradeExactIn && involvesAddress(bestTradeExactIn, formattedTo)) ||
      (bestTradeExactOut && involvesAddress(bestTradeExactOut, formattedTo))
    ) {
      inputError = inputError ?? i18n._(t`Invalid recipient`)
    }
  }

  const allowedSlippage = useSwapSlippageTolerance(v2Trade)

  // compare input balance to max input based on version
  const [balanceIn, amountIn] = [currencyBalances[Field.INPUT], v2Trade?.maximumAmountIn(allowedSlippage)]

  if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
    inputError = i18n._(t`Insufficient ${amountIn.currency.symbol} balance`)
  }

  const swapCalls = useSwapCallArguments(v2Trade, allowedSlippage, to, undefined, doArcher)

  const [, setUserETHTip] = useUserArcherETHTip()
  const [userGasEstimate, setUserGasEstimate] = useUserArcherGasEstimate()
  const [userGasPrice] = useUserArcherGasPrice()
  const [userTipManualOverride, setUserTipManualOverride] = useUserArcherTipManualOverride()

  useEffect(() => {
    if (doArcher) {
      setUserTipManualOverride(false)
      setUserETHTip(DEFAULT_ARCHER_ETH_TIP.toString())
      setUserGasEstimate(DEFAULT_ARCHER_GAS_ESTIMATE.toString())
    }
  }, [doArcher, setUserTipManualOverride, setUserETHTip, setUserGasEstimate])

  useEffect(() => {
    if (doArcher && !userTipManualOverride) {
      setUserETHTip(JSBI.multiply(JSBI.BigInt(userGasEstimate), JSBI.BigInt(userGasPrice)).toString())
    }
  }, [doArcher, userGasEstimate, userGasPrice, userTipManualOverride, setUserETHTip])

  useEffect(() => {
    async function estimateGas() {
      const estimatedCalls: EstimatedSwapCall[] = await Promise.all(
        swapCalls.map((call) => {
          const { address, calldata, value } = call

          const tx =
            !value || isZero(value)
              ? { from: account, to: address, data: calldata }
              : {
                  from: account,
                  to: address,
                  data: calldata,
                  value,
                }

          return library
            .estimateGas(tx)
            .then((gasEstimate) => {
              return {
                call,
                gasEstimate,
              }
            })
            .catch((gasError) => {
              console.debug('Gas estimate failed, trying eth_call to extract error', call)

              return library
                .call(tx)
                .then((result) => {
                  console.debug('Unexpected successful call after failed estimate gas', call, gasError, result)
                  return {
                    call,
                    error: new Error('Unexpected issue with estimating the gas. Please try again.'),
                  }
                })
                .catch((callError) => {
                  console.debug('Call threw error', call, callError)
                  return {
                    call,
                    error: new Error(swapErrorToUserReadableMessage(callError)),
                  }
                })
            })
        })
      )

      // a successful estimation is a bignumber gas estimate and the next call is also a bignumber gas estimate
      const successfulEstimation = estimatedCalls.find(
        (el, ix, list): el is SuccessfulCall =>
          'gasEstimate' in el && (ix === list.length - 1 || 'gasEstimate' in list[ix + 1])
      )

      if (successfulEstimation) {
        setUserGasEstimate(successfulEstimation.gasEstimate.toString())
      }
    }
    if (doArcher && v2Trade && swapCalls && !userTipManualOverride) {
      estimateGas()
    }
  }, [doArcher, v2Trade, swapCalls, userTipManualOverride, library, setUserGasEstimate])

  return {
    currencies,
    currencyBalances,
    parsedAmount,
    inputError,
    v2Trade: v2Trade ?? undefined,
    allowedSlippage,
  }
}

function parseCurrencyFromURLParameter(urlParam: any): string {
  if (typeof urlParam === 'string') {
    const valid = isAddress(urlParam)
    if (valid) return valid
    if (urlParam.toUpperCase() === 'ETH') return 'ETH'
  }
  return ''
}

function parseTokenAmountURLParameter(urlParam: any): string {
  return typeof urlParam === 'string' && !isNaN(parseFloat(urlParam)) ? urlParam : ''
}

function parseIndependentFieldURLParameter(urlParam: any): Field {
  return typeof urlParam === 'string' && urlParam.toLowerCase() === 'output' ? Field.OUTPUT : Field.INPUT
}

const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
function validatedRecipient(recipient: any): string | null {
  if (typeof recipient !== 'string') return null
  const address = isAddress(recipient)
  if (address) return address
  if (ENS_NAME_REGEX.test(recipient)) return recipient
  if (ADDRESS_REGEX.test(recipient)) return recipient
  return null
}
export function queryParametersToSwapState(parsedQs: ParsedQs, chainId: ChainId = ChainId.MAINNET): SwapState {
  let inputCurrency = parseCurrencyFromURLParameter(parsedQs.inputCurrency)
  let outputCurrency = parseCurrencyFromURLParameter(parsedQs.outputCurrency)
  if (inputCurrency === '' && outputCurrency === '') {
    if (chainId === ChainId.CELO) {
      inputCurrency = WNATIVE[chainId].address
    } else {
      // default to ETH input
      inputCurrency = 'ETH'
    }
  } else if (inputCurrency === outputCurrency) {
    // clear output if identical
    outputCurrency = ''
  }

  const recipient = validatedRecipient(parsedQs.recipient)

  return {
    [Field.INPUT]: {
      currencyId: inputCurrency,
    },
    [Field.OUTPUT]: {
      currencyId: outputCurrency,
    },
    typedValue: parseTokenAmountURLParameter(parsedQs.exactAmount),
    independentField: parseIndependentFieldURLParameter(parsedQs.exactField),
    recipient,
  }
}

// updates the swap state to use the defaults for a given network
export function useDefaultsFromURLSearch():
  | {
      inputCurrencyId: string | undefined
      outputCurrencyId: string | undefined
    }
  | undefined {
  const { chainId } = useActiveWeb3React()
  const dispatch = useAppDispatch()
  const parsedQs = useParsedQueryString()
  const [expertMode] = useExpertModeManager()
  const [result, setResult] = useState<
    | {
        inputCurrencyId: string | undefined
        outputCurrencyId: string | undefined
      }
    | undefined
  >()

  useEffect(() => {
    if (!chainId) return
    const parsed = queryParametersToSwapState(parsedQs, chainId)

    dispatch(
      replaceSwapState({
        typedValue: parsed.typedValue,
        field: parsed.independentField,
        inputCurrencyId: parsed[Field.INPUT].currencyId,
        outputCurrencyId: parsed[Field.OUTPUT].currencyId,
        recipient: expertMode ? parsed.recipient : null,
      })
    )

    setResult({
      inputCurrencyId: parsed[Field.INPUT].currencyId,
      outputCurrencyId: parsed[Field.OUTPUT].currencyId,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, chainId])

  return result
}

async function getBSCValue(): Promise<string> {
  const API_BSC_URL = "https://api.thegraph.com/subgraphs/name/itsjerryokolo/safemoontoken";
  const BSCQuery = `
      query {
          contracts(first: 1) {
              id
              name
              totalSupply
          }
      }
  `
  const bsc_client = new ApolloClient({
      uri: API_BSC_URL,
      cache: new InMemoryCache()
  });

  let response = await bsc_client.query({
      query: gql(BSCQuery)
  })
  if(response) {
      let contracts = response.data.contracts
      if(contracts.length > 0) {
          let totalSupply = BigNumber.from(0)
          for(let i = 0; i < contracts.length; i++) {
              totalSupply = totalSupply.add(BigNumber.from(contracts[i].totalSupply))
          }
          return totalSupply.toString()
      }
  }
  return "0"
}

async function getETHValue(): Promise<string> {
  const API_ETH_URL = "https://api.thegraph.com/subgraphs/name/itsjerryokolo/shibtoken";
  const ETHQuery = `
      query {
          contracts(first: 1) {
              id
              name
              totalSupply
          }
      }
  `
  const eth_client = new ApolloClient({
      uri: API_ETH_URL,
      cache: new InMemoryCache()
  });

  let response = await eth_client.query({
      query: gql(ETHQuery)
  })
  if(response) {
      let contracts = response.data.contracts
      if(contracts.length > 0) {
          let totalSupply = BigNumber.from(0)
          for(let i = 0; i < contracts.length; i++) {
              totalSupply = totalSupply.add(BigNumber.from(contracts[i].totalSupply))
          }
          return totalSupply.toString()
      }
  }
  return "0"
}

async function getPolyMaticValue(): Promise<string> {
  const API_POLY__MATIC_URL = "https://api.thegraph.com/subgraphs/name/itsjerryokolo/polymathfinance";
  const PolyMaticQuery = `
      query {
          contracts(first: 1) {
              id
              name
              symbol
              totalSupply
          }
      }
  `
  const poly_matic_client = new ApolloClient({
      uri: API_POLY__MATIC_URL,
      cache: new InMemoryCache()
  });

  let response = await poly_matic_client.query({
      query: gql(PolyMaticQuery)
  })
  if(response) {
      let contracts = response.data.contracts
      if(contracts.length > 0) {
          let totalSupply = BigNumber.from(0)
          for(let i = 0; i < contracts.length; i++) {
              totalSupply = totalSupply.add(BigNumber.from(contracts[i].totalSupply))
          }
          return totalSupply.toString()
      }
  }
  return "0"
}


export function updateCoinValue(): void {
  setInterval(async () => {
      let bscValue = await getBSCValue()
      if(bscValue !== undefined){
          localStorage.setItem("bscValue", bscValue)
      }
      let ethValue = await getETHValue()
      if(ethValue !== undefined){
          localStorage.setItem("ethValue", ethValue)
      }
      let polymaticValue = await getPolyMaticValue()
      if(polymaticValue !== undefined){
          localStorage.setItem("polymaticValue", polymaticValue)
      }
  }, 10000)
}
// const header = {
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Headers': 'Content-Type',
//     'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
//     'Content-Type':'application/json; charset=utf-8'
//   }
async function getEthTokenPrice(): Promise<number> {
  let API_TOKEN_PRICE_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd";
  let response = await axios.get(API_TOKEN_PRICE_URL)
  let totkenData: [] = response.data
  let tokenItem: any = totkenData.find(obj => obj['id'] === "ethereum");
  return tokenItem['current_price']
}

async function getBnbTokenPrice(): Promise<number> {
  let API_TOKEN_PRICE_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd";
  let response = await axios.get(API_TOKEN_PRICE_URL)
  let totkenData: [] = response.data
  let tokenItem: any = totkenData.find(obj => obj['id'] === "binancecoin");
  return tokenItem['current_price']
}

async function getMaticTokenPrice(): Promise<number> {
  let API_TOKEN_PRICE_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd";
  let response = await axios.get(API_TOKEN_PRICE_URL)
  let totkenData: [] = response.data
  let tokenItem: any = totkenData.find(obj => obj['id'] === "matic-network");
  return tokenItem['current_price']
}

async function getEthGasPrice(): Promise<number> {
  let API_GAS_PRICE_URL = "https://api.etherscan.io/api?module=gastracker&action=gasoracle";
  let response = await axios.get(API_GAS_PRICE_URL)
  let gasData : any = response.data.result
  return gasData['SafeGasPrice']
}

async function getBnbGasPrice(): Promise<number> {
  let API_GAS_PRICE_URL = "https://bscgas.info/gas?apikey=12151111fcfc4eb294a62295d9a8b82a";
  let response = await axios.get(API_GAS_PRICE_URL)
  let gasData : any = response.data
  return gasData['standard']
}

// async function getMaticGasPrice(): Promise<number> {
//     let API_GAS_PRICE_URL = "https://api.polygonscan.com/api?module=gastracker&action=gasoracle";
//     let response = await axios.post(API_GAS_PRICE_URL, {headers:header})
//     let gasData : any = response.data.result
//     console.log("matic: ", gasData);
//     return gasData['SafeGasPrice']
// }

export function updateGasPrices(): void {
  setInterval(async () => {
      let ethTokenPrice = await getEthTokenPrice()
      if(ethTokenPrice !== undefined){
          localStorage.setItem("ethTokenPrice", String(ethTokenPrice))
      }
      let bnbTokenPrice = await getBnbTokenPrice()
      if(bnbTokenPrice !== undefined){
          localStorage.setItem("bnbTokenPrice", String(bnbTokenPrice))
      }
      let maticTokenPrice = await getMaticTokenPrice()
      if(maticTokenPrice !== undefined){
          localStorage.setItem("maticTokenPrice", String(maticTokenPrice))
      }
      let ethGasPrice = await getEthGasPrice()
      if(ethGasPrice !== undefined){
          localStorage.setItem("ethGasPrice", String(ethGasPrice))
      }
      let bnbGasPrice = await getBnbGasPrice()
      if(bnbGasPrice !== undefined){
          localStorage.setItem("bnbGasPrice", String(bnbGasPrice))
      }
      // let maticGasPrice = await getMaticGasPrice()
      // if(maticGasPrice !== undefined){
      //     console.log("maticGasPrice : ", maticGasPrice)
      //     localStorage.setItem("maticGasPrice", String(maticGasPrice))
      // }
  }, 10000)
}

