import React, { useEffect, useState } from 'react'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import { fortmatic, injected, portis } from '../../connectors'
import { useModalOpen, useWalletModalToggle } from '../../state/application/hooks'

import { AbstractConnector } from '@web3-react/abstract-connector'
import { TorusConnector } from '@web3-react/torus-connector'
import AccountDetails from '../../components/AccountDetails'
import { ApplicationModal } from '../../state/application/actions'
import { ButtonError } from '../../components/Button'
import ExternalLink from '../../components/ExternalLink'
import Image from 'next/image'
import Modal from '../../components/Modal'
import ModalHeader from '../../components/ModalHeader'
import { OVERLAY_READY } from '../../connectors/Fortmatic'
import Option from './Option'
import PendingView from './PendingView'
import ReactGA from 'react-ga'
import { SUPPORTED_WALLETS } from '../../constants'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { XIcon } from '@heroicons/react/outline'
import { isMobile, isAndroid } from 'react-device-detect'
import styled from 'styled-components'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import usePrevious from '../../hooks/usePrevious'

import { domainURL, domainDAppURL } from '../../constants';

const base64 = require('base-64');

const CloseIcon = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const OptionGrid = styled.div`
    display: grid;
    grid-gap: 10px;
    ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    grid-gap: 10px;
  `};
`

const HeaderRow = styled.div`
  margin-bottom: 1rem;
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const ContentWrapper = styled.div`
  /*background-color: ${({ theme }) => theme.bg2}; */
  /*padding: 2rem;*/
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  // ${({ theme }) => theme.mediaWidth.upToMedium`padding: 1rem`};
`


const HoverText = styled.div`
    :hover {
        cursor: pointer;
    }
`

const WALLET_VIEWS = {
  OPTIONS: 'options',
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending',
  TRUST_GUIDE: 'trust_guide',
  METAMASK_GUIDE: 'metamask_guide'
}

const mobileconnector = new TorusConnector({
  chainId: 1
})
export default function WalletModal({
  pendingTransactions,
  confirmedTransactions,
  ENSName,
}: {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}) {
  // console.log({ ENSName })
  // important that these are destructed from the account-specific web3-react context
  const { active, account, connector, activate, error, deactivate } = useWeb3React()

  const { i18n } = useLingui()

  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)

  const [pendingWallet, setPendingWallet] = useState<AbstractConnector | undefined>()

  const [pendingError, setPendingError] = useState<boolean>()

  const walletModalOpen = useModalOpen(ApplicationModal.WALLET)

  const toggleWalletModal = useWalletModalToggle()

  const previousAccount = usePrevious(account)

  let userAccount = localStorage.getItem('user_address')
  const userEncoding = base64.encode(userAccount)

  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)
  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector && connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [setWalletView, active, error, connector, walletModalOpen, activePrevious, connectorPrevious])

  const tryActivation = async (connector: (() => Promise<AbstractConnector>) | AbstractConnector | undefined) => {
    let name = ''
    let conn = typeof connector === 'function' ? await connector() : connector

    Object.keys(SUPPORTED_WALLETS).map((key) => {
      if (connector === SUPPORTED_WALLETS[key].connector) {
        return (name = SUPPORTED_WALLETS[key].name)
      }
      return true
    })
    // log selected wallet
    ReactGA.event({
      category: 'Wallet',
      action: 'Change Wallet',
      label: name,
    })
    setPendingWallet(conn) // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING)

    // if the connector is walletconnect and the user has already tried to connect, manually reset the connector
    if (conn instanceof WalletConnectConnector && conn.walletConnectProvider?.wc?.uri) {
      conn.walletConnectProvider = undefined
    }

    conn &&
      activate(conn, undefined, true).catch((error) => {
        if (error instanceof UnsupportedChainIdError) {
          activate(conn) // a little janky...can't use setError because the connector isn't set
        } else {
          setPendingError(true)
        }
      })
  }

  // close wallet modal if fortmatic modal is active
  useEffect(() => {
    fortmatic.on(OVERLAY_READY, () => {
      toggleWalletModal()
    })
  }, [toggleWalletModal])

  // get wallets user can switch too, depending on device/browser
  function getOptions() {
    const isMetamask = window.ethereum && window.ethereum.isMetaMask
    return Object.keys(SUPPORTED_WALLETS).map((key) => {
      const option = SUPPORTED_WALLETS[key]

      // check for mobile options
      if (isMobile) {
        // disable portis on mobile for now
        if (option.connector === portis) {
          return null
        }

        if (!window.web3 && !window.ethereum && option.mobile) {
          return (
            <Option
              onClick={() => {
                if(option.connector === mobileconnector) {
                  if(option.name === "Trust Wallet Mobile") {
                      setWalletView(WALLET_VIEWS.TRUST_GUIDE)
                  }else {
                      setWalletView(WALLET_VIEWS.METAMASK_GUIDE)
                  }
                }else{
                    option.connector !== connector && !option.href && tryActivation(option.connector)
                }
              }}
              id={`connect-${key}`}
              key={key}
              active={option.connector && option.connector === connector}
              color={option.color}
              link={option.href}
              header={option.name}
              subheader={null}
              icon={'/images/wallets/' + option.iconName}
            />
          )
        }
        return null
      }

      // overwrite injected when needed
      if (option.connector === injected) {
        // don't show injected if there's no injected provider
        if (!(window.web3 || window.ethereum)) {
          if (option.name === 'MetaMask') {
            return (
              <Option
                id={`connect-${key}`}
                key={key}
                color={'#E8831D'}
                header={'Install Metamask'}
                subheader={null}
                link={'https://metamask.io/'}
                icon="/images/wallets/metamask.png"
              />
            )
          } else {
            return null // dont want to return install twice
          }
        }
        // don't return metamask if injected provider isn't metamask
        else if (option.name === 'MetaMask' && !isMetamask) {
          return null
        }
        // likewise for generic
        else if (option.name === 'Injected' && isMetamask) {
          return null
        }
      }

      // return rest of options
      return (
        !isMobile &&
        !option.mobileOnly && (
          <Option
            id={`connect-${key}`}
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector)
            }}
            key={key}
            active={option.connector === connector}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={null} // use option.descriptio to bring back multi-line
            icon={'/images/wallets/' + option.iconName}
          />
        )
      )
    })
  }

  function getModalContent() {
    if (error) {
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <XIcon width="24px" height="24px" />
          </CloseIcon>
          <HeaderRow style={{ paddingLeft: 0, paddingRight: 0 }}>
            {error instanceof UnsupportedChainIdError ? i18n._(t`Wrong Network`) : i18n._(t`Error connecting`)}
          </HeaderRow>
          <div>
            {error instanceof UnsupportedChainIdError ? (
              <h5>{i18n._(t`Please connect to the appropriate Ethereum network.`)}</h5>
            ) : (
              i18n._(t`Error connecting. Try refreshing the page.`)
            )}
            <div style={{ marginTop: '1rem' }} />
            <ButtonError error={true} size="sm" onClick={deactivate}>
              {i18n._(t`Disconnect`)}
            </ButtonError>
          </div>
        </UpperSection>
      )
    }
    if (account && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
        />
      )
    }

    function renderSwitch(param) {
      switch(param) {
        case WALLET_VIEWS.PENDING:
          return (
            <PendingView
              connector={pendingWallet}
              error={pendingError}
              setPendingError={setPendingError}
              tryActivation={tryActivation}
            />
          )
        case WALLET_VIEWS.TRUST_GUIDE:
          return (
            <div>
              <span>Trust Wallet Android:</span> <br/>
              <span>First Time Trust Wallet Users:</span> <br/>
              <ExternalLink href={`https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp&referrer=utm_source=website`}>Step #1: Download From the App Store</ExternalLink> <br/>
              <ExternalLink href={`https://link.trustwallet.com/open_url?coin_id=60&url=https://viralcoin.com?${userEncoding}`}>Step #2: Click the link on this page</ExternalLink> <br/>
              <span>Returning Trust Wallet Users:</span> <br/>
              <ExternalLink href={`https://link.trustwallet.com/open_url?coin_id=60&url=https://viralcoin.com?${userEncoding}`}>Step #1: Click the link on this page</ExternalLink> <br/><br/>
              <span>Trust Wallet iOS:</span> <br/>
              <span>First Time Trust Wallet Users:</span> <br/>
              <ExternalLink href={`https://apps.apple.com/app/apple-store/id1288339409?pt=1324988&ct=website&mt=8`}>Step #1: Download From the App Store</ExternalLink> <br/>
              <ExternalLink href={`https://link.trustwallet.com/browser_enable`}>Step #2: Click the link on this page</ExternalLink> <br/>
              <ExternalLink href={`https://link.trustwallet.com/open_url?coin_id=60&url=https://viralcoin.com?${userEncoding}`}>Step #3: Click the link on this page</ExternalLink> <br/>
              <span>Returning Trust Wallet Users:</span> <br/>
              <ExternalLink href={`https://link.trustwallet.com/open_url?coin_id=60&url=https://viralcoin.com?${userEncoding}`}>Step #1: Click the link on this page</ExternalLink> <br/>
          </div>
          )
        case WALLET_VIEWS.METAMASK_GUIDE:
          return (
            <div>
                <span>{isMobile ? isAndroid ? `MetaMask Android:` : `MetaMask iOS:`: `MetaMask iOS and Android:`}</span> <br/>
                {isMobile ? 
                    isAndroid ?
                        <div>
                            <ExternalLink href={`https://play.google.com/store/apps/details?id=io.metamask`}>Step #1: Download MetaMask From the App Store and setup your wallet.</ExternalLink> <br/>
                            <ExternalLink href={`${domainDAppURL}?r=${userEncoding}`}>Step #2: Click the link on this page</ExternalLink> <br/>
                        </div>
                        :
                        <div>
                            <ExternalLink href={`https://apps.apple.com/us/app/metamask/id1438144202`}>Step #1: Download MetaMask From the App Store </ExternalLink> <br/>
                            <ExternalLink href={`${domainDAppURL}?r=${userEncoding}`}>Step #2: Click the link on this page</ExternalLink> <br/>
                        </div>
                    :
                    <div>
                        <ExternalLink href={`https://metamask.io/download`}>Step #1: Download From the App Store and setup your wallet.</ExternalLink> <br/>
                        <ExternalLink href={`${domainDAppURL}?r=${userEncoding}`}>Step #2: Click the link on this page</ExternalLink> <br/>
                    </div>
                }
            </div>
          )
        default:
          return (
            <div className="flex flex-col space-y-5 overflow-y-auto">{getOptions()}</div>
          );
      }
    }
    return (
      // <div className="flex flex-col space-y-4">
      //   <ModalHeader title="Connect to a wallet" onClose={toggleWalletModal} />
      //   <div className="flex flex-col space-y-6">
      //     {renderSwitch(walletView)}
      //   </div>
      // </div>
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <XIcon width="24px" height="24px" />
        </CloseIcon>
        {walletView !== WALLET_VIEWS.ACCOUNT ? (
          <HeaderRow color="blue">
              <HoverText
                  onClick={() => {
                      setPendingError(false)
                      setWalletView(WALLET_VIEWS.ACCOUNT)
                  }}
              >
                  Back
              </HoverText>
          </HeaderRow>
        ) : (
          <HeaderRow>
              <HoverText>Connect to a wallet</HoverText>
          </HeaderRow>
        )}
        <ContentWrapper>
          {renderSwitch(walletView)}
        </ContentWrapper>
      </UpperSection>
    )
  }

  return (
    <Modal isOpen={walletModalOpen} onDismiss={toggleWalletModal} minHeight={0} maxHeight={90}>
      {getModalContent()}
    </Modal>
  )
}
