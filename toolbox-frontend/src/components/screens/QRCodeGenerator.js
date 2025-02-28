import React from 'react'
// import QRCodeStyling
import QRCodeStyling from 'qr-code-styling';
export default function QRCodeGenerator() {
    const generateQR = (value) => {

    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      data: value,
        // image: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
        dotsOptions: {
            color: "#4267B2",
            type: "rounded"
            },
            backgroundOptions: {
                color: "#e0e0e0",
            },
            imageOptions: {
                crossOrigin: "anonymous",
                margin: 20,
            },
        });
        qrCode.append(document.getElementById("qr-code"));
        qrCode.download({ name: "qr", extension: "svg" });

        console.log(qrCode);
    }
  return (
    <>
    {/* generate QR code for input */}
    <div>
      <h1>QR Code Generator</h1>
      <input type="text" id="qr-input" placeholder="Enter text to generate QR code" />
      <button id="generate" onClick={generateQR}>Generate</button>
      <div id="qr-code"></div>

    </div>

    </>
    // 
  )
}
