import { NETWORK_ICON } from '../../constants/networks'
import { useModalOpen, useViralAmountModalToggle } from '../../state/application/hooks'
import { BigNumber } from 'ethers'

import { ApplicationModal } from '../../state/application/actions'
import { ChainId } from '@sushiswap/sdk'
import Modal from '../Modal'
import ModalHeader from '../ModalHeader'
import React, {useState, useCallback, useEffect} from 'react'
import { useActiveWeb3React } from '../../hooks/useActiveWeb3React'

const commaNumber = require('comma-number')

export default function ViralAmountModal(): JSX.Element | null {
    const { chainId, library, account } = useActiveWeb3React()
    const viralModalOpen = useModalOpen(ApplicationModal.VIRAL_AMOUNT)
    const toggleViralAmountModal = useViralAmountModalToggle()

    const [polymaticValue, setPolyMaticValue] = useState<string>("0")
    const [ethValue, setEthValue] = useState<string>("0")
    const [bscValue, setBscValue] = useState<string>("0")
    
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
        fetchCoinValue()
        setInterval(() => {
            fetchCoinValue()
        }, 10000)
    }, [])

    if (!chainId) return null

    return (
        <Modal isOpen={viralModalOpen} onDismiss={toggleViralAmountModal}>
            <ModalHeader className="flex justify-center" onClose={toggleViralAmountModal} title="Viral Balances" />
            <div className="flex items-center h-full w-full p-3">
                <div className="text-primary font-bold">Total: </div>
            </div>
            <div className="items-center h-full w-full p-3">
                <span style={{color: '#13BFC6', fontFamily: `'Open Sans', sans-serif`, fontWeight: 700}}>{commaNumber(Math.round(BigNumber.from(ethValue).div(BigNumber.from(10).pow(18)).add(BigNumber.from(bscValue).div(BigNumber.from(10).pow(18))).add(BigNumber.from(polymaticValue).div(BigNumber.from(10).pow(18))).toNumber()).toString())}</span>
            </div>
            <div className="flex items-center h-full w-full p-3">
                <div className="text-primary font-bold">On Ethereum: </div>
                <img
                    src={NETWORK_ICON[ChainId.MAINNET]}
                    alt="Switch Network"
                    className="rounded-md ml-3 w-8 h-8"
                />
            </div>
            <div className="items-center h-full w-full p-3">
                <span style={{color: '#13BFC6', fontFamily: `'Open Sans', sans-serif`, fontWeight: 700}}>{commaNumber(Math.round(BigNumber.from(ethValue).div(BigNumber.from(10).pow(18)).toNumber()).toString())}</span>
            </div>
            <div className="flex items-center h-full w-full p-3">
                <div className="text-primary font-bold">On Binance Smart Chain: </div>
                <img
                    src={NETWORK_ICON[ChainId.BSC]}
                    alt="Switch Network"
                    className="rounded-md ml-3 w-8 h-8"
                />
            </div>
            <div className="items-center h-full w-full p-3">
                <span style={{color: '#13BFC6', fontFamily: `'Open Sans', sans-serif`, fontWeight: 700}}>{commaNumber(Math.round(BigNumber.from(bscValue).div(BigNumber.from(10).pow(18)).toNumber()).toString())}</span>
            </div>
            <div className="flex items-center h-full w-full p-3">
                <div className="text-primary font-bold">On Polygon: </div>
                <img
                    src={NETWORK_ICON[ChainId.MATIC]}
                    alt="Switch Network"
                    className="rounded-md ml-3 w-8 h-8"
                />
            </div>
            <div className="items-center h-full w-full p-3">
                <span style={{color: '#13BFC6', fontFamily: `'Open Sans', sans-serif`, fontWeight: 700}}>{commaNumber(Math.round(BigNumber.from(polymaticValue).div(BigNumber.from(10).pow(18)).toNumber()).toString())}</span>
            </div>
        </Modal>
    )
}
