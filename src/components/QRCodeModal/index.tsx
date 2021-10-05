import React, { useCallback, useEffect, useRef, forwardRef } from 'react'
import Modal from '../Modal'
import ModalHeader from '../ModalHeader'
import QRCodeStyling from 'qr-code-styling';

const qrCode = new QRCodeStyling({
    width: 256,
    height: 256,
    type: "svg",
    image: '/images/viral/icon_qr.jpg',
    dotsOptions: {
        type: "square",
        gradient: {
            type: 'linear',
            rotation: 3.14/2, 
            colorStops: [{ offset: 0, color: '#228d91' }, { offset: 1, color: '#4e00ff' }]
        }
    },
    backgroundOptions: {
        color: "#FFFFFF",
    },
    imageOptions: {
        crossOrigin: "anonymous",
        margin: 10
    }
});


export default function QRCodeModal({
    isOpen,
    referralLink,
    onDismiss,
    onClose,
}: {
    isOpen: boolean
    referralLink: string
    onDismiss: () => void
    onClose: () => void
}) {

    const ref = useRef(null as any)

    useEffect(() => {
        console.log("ref : ", ref.current)
        if(ref.current) {
            qrCode.append(ref.current);
        }
    }, [])

    useEffect(() => {
        if(isOpen) {
            console.log("ref : ", ref.current)
            if(ref.current) {
                qrCode.append(ref.current);
            }
            if(referralLink != '') {
                console.log("referralLink : ", referralLink)
                qrCode.update({
                    data: referralLink
                });
                console.log("qrCode : ", qrCode)
            }
        }
    }, [referralLink, isOpen])

    const handleDownload = useCallback(() => {
        qrCode.download({
            extension: "png"
        });
    }, [])

    const QRCodeViewer = forwardRef<HTMLDivElement>((props, ref) => {
        const myRef = useRef<HTMLDivElement>(null);
        useEffect(() => {
            const node = myRef.current;
            if(node) {
                qrCode.append(node);
            }
          }, [ref]);
        
          return (
            <div ref={myRef}></div>
          );
    });

    return (
        <Modal isOpen={isOpen} onDismiss={() => onDismiss()}>
            <ModalHeader className="flex justify-center" onClose={() =>onClose()} title="Refer a Friend" />
            <div className="flex flex-row space-y-5" style={{padding: '2rem 0', marginTop: '5px', marginBottom: '5px', justifyContent: 'center', alignItems: 'center'}}>
                {/* <QRCode id="referCode" value={referralLink} size={256} level={'H'} imageSettings={{src: `${ViralMarkImg}`, width: 100, height: 100}} style={{alignSelf: 'center'}}>
                </QRCode> */}
                <QRCodeViewer />
            </div>
            <button type="button" style={{display: 'flex', flexDirection: 'row', padding: '0 0.8rem', fontSize: '0.8em', width: 'auto', height: '40px', lineHeight: '40px', borderRadius: '10px', alignSelf: 'flex-end', backgroundColor: 'rgb(19, 191, 198)', color: '#fff', textAlign: 'center', alignItems: 'center'}}
                onClick={() => handleDownload()}
            >
                <svg style={{width: '0.875em', marginTop: '2px', marginRight: '5px'}} aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrow-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" data-fa-i2svg=""><path fill="currentColor" d="M413.1 222.5l22.2 22.2c9.4 9.4 9.4 24.6 0 33.9L241 473c-9.4 9.4-24.6 9.4-33.9 0L12.7 278.6c-9.4-9.4-9.4-24.6 0-33.9l22.2-22.2c9.5-9.5 25-9.3 34.3.4L184 343.4V56c0-13.3 10.7-24 24-24h32c13.3 0 24 10.7 24 24v287.4l114.8-120.5c9.3-9.8 24.8-10 34.3-.4z"></path></svg>
                Download A QR Code
            </button>
        </Modal>
    )
}
