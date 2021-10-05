import { ChainId, Currency, NATIVE, SUSHI_ADDRESS } from '@sushiswap/sdk'
import React, { useEffect, useState, useCallback } from 'react'
import { BigNumber } from 'ethers'

import { ANALYTICS_URL } from '../../constants'
import ExternalLink from '../ExternalLink'
import LanguageSwitch from '../LanguageSwitch'
import Link from 'next/link'
import More from './More'
import NavLink from '../NavLink'
import { Popover } from '@headlessui/react'
import QuestionHelper from '../QuestionHelper'
import Web3Network from '../Web3Network'
import Web3Status from '../Web3Status'
import { t } from '@lingui/macro'
import { useActiveWeb3React } from '../../hooks/useActiveWeb3React'
import { useLingui } from '@lingui/react'
import { isMobile } from 'react-device-detect'
import { shortenViralValue } from '../../functions/validate'
import ViralAmountModal from '../ViralAmountModal'

import { useNetworkModalToggle, useWalletModalToggle, useViralAmountModalToggle } from '../../state/application/hooks'
import { useETHBalances } from '../../state/wallet/hooks'

function AppBar(): JSX.Element {
  const { i18n } = useLingui()
  const { account, chainId, library } = useActiveWeb3React()
  const userEthBalance = useETHBalances(account ? [account] : [])?.[account ?? '']

  const toggleViralAmountModal = useViralAmountModalToggle()
  const toggleWalletModal = useWalletModalToggle()

  // const [polymaticValue, setPolyMaticValue] = useState<string>("0")
  // const [ethValue, setEthValue] = useState<string>("0")
  // const [bscValue, setBscValue] = useState<string>("0")
  // const [viralBalance, setViralBalance] = useState(0)
  // const viral = useViralContract()
  // viral.balanceOf(account).then((data) => {
  //   setViralBalance(data.toNumber())
  // })

  // const fetchCoinValue = useCallback(async () => {
  //     try {
  //         let polymaticValue : any = localStorage.getItem("polymaticValue") ? (localStorage.getItem("polymaticValue")) : "0"
  //         setPolyMaticValue(polymaticValue)
  //         let ethValue : any = localStorage.getItem("ethValue") ? (localStorage.getItem("ethValue")) : "0"
  //         setEthValue(ethValue)
  //         let bscValue : any = localStorage.getItem("bscValue") ? (localStorage.getItem("bscValue")) : "0"
  //         setBscValue(bscValue)
  //     } catch (error) {
  //         throw error
  //     }
  // }, [])

  useEffect(() => {
      // fetchCoinValue()
      setInterval(() => {
          // fetchCoinValue()
          console.log("balance : ", userEthBalance)
      }, 10000)
  }, [])

  return (
    //     // <header className="flex flex-row justify-between w-screen flex-nowrap">
    <header className="flex flex-row flex-nowrap justify-between w-screen" style={isMobile ? {position: 'absolute'} : {position: 'absolute', paddingLeft: '8rem', paddingRight: '8rem'}}>
      <Popover as="nav" className="w-screen bg-transparent z-10 backdrop-filter">
        {({ open }) => (
          <>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img src="/images/viral/viral_logo.png" alt="Sushi" className="h-8 w-auto ml-6" />
                  </div>
                  <div className="hidden sm:block sm:ml-4">
                    <div className="flex space-x-2">
                      {/* <Buy /> */}
                      {/* <NavLink href="/swap">
                        <a
                          id={`swap-nav-link`}
                          className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                        >
                          {i18n._(t`Swap`)}
                        </a>
                      </NavLink>
                      <NavLink href="/pool">
                        <a
                          id={`pool-nav-link`}
                          className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                        >
                          {i18n._(t`Pool`)}
                        </a>
                      </NavLink>
                      {chainId && [ChainId.MAINNET, ChainId.MATIC, ChainId.BSC].includes(chainId) && (
                        <NavLink href={'/migrate'}>
                          <a
                            id={`migrate-nav-link`}
                            className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                          >
                            {i18n._(t`Migrate`)}
                          </a>
                        </NavLink>
                      )}
                      {chainId && featureEnabled(Feature.LIQUIDITY_MINING, chainId) && (
                        <NavLink href={'/farm'}>
                          <a
                            id={`farm-nav-link`}
                            className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                          >
                            {i18n._(t`Farm`)}
                          </a>
                        </NavLink>
                      )}
                      {chainId && featureEnabled(Feature.KASHI, chainId) && (
                        <>
                          <NavLink href={'/lend'}>
                            <a
                              id={`lend-nav-link`}
                              className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                            >
                              {i18n._(t`Lend`)}
                            </a>
                          </NavLink>
                          <NavLink href={'/borrow'}>
                            <a
                              id={`borrow-nav-link`}
                              className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                            >
                              {i18n._(t`Borrow`)}
                            </a>
                          </NavLink>
                        </>
                      )}
                      {chainId && featureEnabled(Feature.STAKING, chainId) && (
                        <NavLink href={'/stake'}>
                          <a
                            id={`stake-nav-link`}
                            className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                          >
                            {i18n._(t`Stake`)}
                          </a>
                        </NavLink>
                      )} */}
                    </div>
                  </div>
                </div>

                <div className="fixed bottom-0 left-0 z-10 flex flex-row items-center justify-center w-full p-4 lg:w-auto bg-dark-1000 lg:relative lg:p-0 lg:bg-transparent">
                  <div className="flex items-center justify-between w-full space-x-2 sm:justify-end">
                    {/* {chainId && [ChainId.MAINNET].includes(chainId) && library && library.provider.isMetaMask && (
                      <>
                        <QuestionHelper text={i18n._(t`Add xSUSHI to your MetaMask wallet`)}>
                          <div
                            className="hidden p-0.5 rounded-md cursor-pointer sm:inline-flex bg-dark-900 hover:bg-dark-800"
                            onClick={() => {
                              if (library && library.provider.isMetaMask && library.provider.request) {
                                const params: any = {
                                  type: 'ERC20',
                                  options: {
                                    address: '0x8798249c2e607446efb7ad49ec89dd1865ff4272',
                                    symbol: 'XSUSHI',
                                    decimals: 18,
                                    image:
                                      'https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/ethereum/assets/0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272/logo.png',
                                  },
                                }
                                library.provider
                                  .request({
                                    method: 'wallet_watchAsset',
                                    params,
                                  })
                                  .then((success) => {
                                    if (success) {
                                      console.log('Successfully added XSUSHI to MetaMask')
                                    } else {
                                      throw new Error('Something went wrong.')
                                    }
                                  })
                                  .catch(console.error)
                              }
                            }}
                          >
                            <Image
                              src="/images/tokens/xsushi-square.jpg"
                              alt="xSUSHI"
                              width="38px"
                              height="38px"
                              objectFit="contain"
                              className="rounded-md"
                            />
                          </div>
                        </QuestionHelper>
                      </>
                    )} */}

                    {/* {chainId && chainId in SUSHI_ADDRESS && library && library.provider.isMetaMask && (
                      <>
                        <QuestionHelper text={i18n._(t`Add SUSHI to your MetaMask wallet`)}>
                          <div
                            className="hidden rounded-md cursor-pointer sm:inline-flex bg-dark-900 hover:bg-dark-800 p-0.5"
                            onClick={() => {
                              const params: any = {
                                type: 'ERC20',
                                options: {
                                  address: SUSHI_ADDRESS[chainId],
                                  symbol: 'SUSHI',
                                  decimals: 18,
                                  image:
                                    'https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/ethereum/assets/0x6B3595068778DD592e39A122f4f5a5cF09C90fE2/logo.png',
                                },
                              }
                              if (library && library.provider.isMetaMask && library.provider.request) {
                                library.provider
                                  .request({
                                    method: 'wallet_watchAsset',
                                    params,
                                  })
                                  .then((success) => {
                                    if (success) {
                                      console.log('Successfully added SUSHI to MetaMask')
                                    } else {
                                      throw new Error('Something went wrong.')
                                    }
                                  })
                                  .catch(console.error)
                              }
                            }}
                          >
                            <Image
                              src="/images/tokens/sushi-square.jpg"
                              alt="SUSHI"
                              width="38px"
                              height="38px"
                              objectFit="contain"
                              className="rounded-md"
                            />
                          </div>
                        </QuestionHelper>
                      </>
                    )} */}

                  {chainId && [ChainId.MAINNET, ChainId.BSC, ChainId.MATIC].includes(chainId) &&
                    library &&
                    library.provider.isMetaMask && (
                        <>
                            {!isMobile &&
                                <>
                                    <a style={{width: '150px', height: '40px', lineHeight: '40px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#13BFC6', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                                        href="#refer"
                                    >
                                        Refer Buyers
                                    </a>
                                    <a style={{width: '150px', height: '40px', lineHeight: '40px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#13BFC6', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                                        href="#buy"
                                    >
                                        Buy Now
                                    </a>
                                </>
                            }
                            <QuestionHelper text={i18n._(t`Add ViralCoin to your Metamask wallet`)}>
                                <div
                                    className="sm:inline-block rounded-md bg-dark-900 hover:bg-dark-800 cursor-pointer"
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
                                    }}
                                >
                                    <img
                                        src="/viral_token_coin.png"
                                        alt="Switch Network"
                                        style={{
                                            minWidth: 36,
                                            minHeight: 36,
                                            maxWidth: 36,
                                            maxHeight: 36
                                        }}
                                        className="rounded-md object-contain"
                                    />
                                </div>
                            </QuestionHelper>
                        </>
                    )}

                    {library && library.provider.isMetaMask && (
                      <div className="hidden sm:inline-block">
                        <Web3Network />
                      </div>
                    )}

                    <div className="w-auto flex items-center rounded p-0.5 whitespace-nowrap text-sm font-bold cursor-pointer select-none pointer-events-auto">
                      {account && chainId && userEthBalance && (
                        <QuestionHelper text={i18n._(t`View All Viral Balances`)}>
                            <div className="py-2 px-3 text-primary text-bold" onClick={() => toggleViralAmountModal()}>
                                {localStorage.setItem('user_address', account)}
                                {userEthBalance?.toSignificant(4)} {'VIRAL'}
                                {/* {chainId === ChainId.MAINNET ? shortenViralValue(Math.round(BigNumber.from(ethValue).div(BigNumber.from(10).pow(18)).toNumber()).toString()) : chainId === ChainId.BSC ? shortenViralValue(Math.round(BigNumber.from(bscValue).div(BigNumber.from(10).pow(18)).toNumber()).toString()) : chainId === ChainId.MATIC ? shortenViralValue(Math.round(BigNumber.from(polymaticValue).div(BigNumber.from(10).pow(18)).toNumber()).toString()) : viralBalance}{' '} */}
                                {/* {Currency.getNativeCurrencySymbol(chainId)} */}
                            </div>
                        </QuestionHelper>
                      )}
                      <Web3Status />
                      <ViralAmountModal />
                    </div>
                    {/* <div className="hidden md:block">
                      <LanguageSwitch />
                    </div>
                    <More /> */}
                  </div>
                </div>
                <div className="flex -mr-2 sm:hidden">
                  {/* Mobile menu button */}
                  {/* <Popover.Button className="inline-flex items-center justify-center p-2 rounded-md text-primary hover:text-high-emphesis focus:outline-none">
                    <span className="sr-only">{i18n._(t`Open main menu`)}</span>
                    {open ? (
                      <svg
                        className="block w-6 h-6"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      // <X title="Close" className="block w-6 h-6" aria-hidden="true" />
                      <svg
                        className="block w-6 h-6"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                      // <Burger title="Burger" className="block w-6 h-6" aria-hidden="true" />
                    )}
                  </Popover.Button> */}
                        {(library &&
                          library.provider.isMetaMask) ? (
                              <>
                                  <a style={{fontSize: '0.8em', width: '100px', height: '40px', lineHeight: '40px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#13BFC6', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                                      href="#refer"
                                  >
                                      Refer Buyers
                                  </a>
                                  <a style={{fontSize: '0.8em', width: '100px', height: '40px', lineHeight: '40px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#13BFC6', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                                      href="#buy"
                                  >
                                      Buy Now
                                  </a>
                              </>
                          ):(
                              <>
                                  <button style={{fontSize: '0.8em', width: '100px', height: '40px', lineHeight: '40px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#13BFC6', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                                      onClick={toggleWalletModal}
                                  >
                                      Refer Buyers
                                  </button>
                                  <button style={{fontSize: '0.8em', width: '100px', height: '40px', lineHeight: '40px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#13BFC6', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                                      onClick={toggleWalletModal}
                                  >
                                      Buy Now
                                  </button>
                              </>
                          )
                  }
                </div>
              </div>
            </div>

            <Popover.Panel className="sm:hidden">
              <div className="flex flex-col px-4 pt-2 pb-3 space-y-1">
                <Link href={'/swap'}>
                  <a
                    id={`swap-nav-link`}
                    className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                  >
                    {i18n._(t`Swap`)}
                  </a>
                </Link>
                <Link href={'/pool'}>
                  <a
                    id={`pool-nav-link`}
                    className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                  >
                    {i18n._(t`Pool`)}
                  </a>
                </Link>

                <Link href={'/migrate'}>
                  <a
                    id={`migrate-nav-link`}
                    className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                  >
                    {i18n._(t`Migrate`)}
                  </a>
                </Link>

                {chainId &&
                  [ChainId.MAINNET, ChainId.MATIC, ChainId.HARMONY, ChainId.XDAI, ChainId.ARBITRUM].includes(
                    chainId
                  ) && (
                    <Link href={'/farm'}>
                      <a
                        id={`farm-nav-link`}
                        className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                      >
                        {' '}
                        {i18n._(t`Farm`)}
                      </a>
                    </Link>
                  )}

                {chainId &&
                  [
                    ChainId.MAINNET,
                    ChainId.KOVAN,
                    ChainId.BSC,
                    ChainId.MATIC,
                    ChainId.ARBITRUM,
                    ChainId.AVALANCHE,
                  ].includes(chainId) && (
                    <>
                      <Link href={'/lend'}>
                        <a
                          id={`lend-nav-link`}
                          className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                        >
                          {i18n._(t`Lend`)}
                        </a>
                      </Link>

                      <Link href={'/borrow'}>
                        <a
                          id={`borrow-nav-link`}
                          className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                        >
                          {i18n._(t`Borrow`)}
                        </a>
                      </Link>
                    </>
                  )}
                {chainId === ChainId.MAINNET && (
                  <Link href={'/stake'}>
                    <a
                      id={`stake-nav-link`}
                      className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                    >
                      {i18n._(t`Stake`)}
                    </a>
                  </Link>
                )}
                {chainId &&
                  [ChainId.MAINNET, ChainId.BSC, ChainId.XDAI, ChainId.FANTOM, ChainId.MATIC].includes(chainId) && (
                    <ExternalLink
                      id={`analytics-nav-link`}
                      href={ANALYTICS_URL[chainId] || 'https://analytics.sushi.com'}
                      className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                    >
                      {i18n._(t`Analytics`)}
                    </ExternalLink>
                  )}

                {chainId === ChainId.MAINNET && (
                  <Link href={'/miso'}>
                    <a
                      id={`stake-nav-link`}
                      className="p-2 text-baseline text-primary hover:text-high-emphesis focus:text-high-emphesis md:p-3 whitespace-nowrap"
                    >
                      {i18n._(t`Miso`)}
                    </a>
                  </Link>
                )}
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
    </header>
  )
}

export default AppBar
