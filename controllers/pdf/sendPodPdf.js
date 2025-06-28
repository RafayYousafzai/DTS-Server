import { getFirestore, doc as firestoreDoc, getDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import PDFDocument from "pdfkit"
import axios from "axios"
import app, { authenticate } from "../../lib/firebase/firebaseConfig.js"
import { Resend } from "resend"

const resend = new Resend("re_PFXtcaog_JKb5YwCbLfq2epPBK729Tgja")
const db = getFirestore(app)
const storage = getStorage(app)

const fetchImageBuffer = async (url) => {
  const res = await axios.get(url, { responseType: "arraybuffer" })
  return Buffer.from(res.data, "binary")
}

const sendPodPdf = async (req, res, next) => {
  try {
    const { bookingId } = req.body
    await authenticate()

    const bookingRef = firestoreDoc(db, "place_bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return res.status(404).json({ message: "Booking not found" })
    }

    const booking = bookingSnap.data()

    if (booking.currentStatus !== "delivered") {
      return res.status(400).json({ message: "Booking is not delivered yet" })
    }

    const userRef = firestoreDoc(db, "users", booking.userEmail)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "user not found" })
    }

    const user = userSnap.data()

    if (booking.currentStatus !== "delivered" || user.sendPodEmails !== true || !user.podsEmail) {
      return res.status(400).json({ message: "Booking is not delivered yet" })
    }

    console.log("User POD email are active", user.podsEmail)

    // FIXED PDF - PREVENT AUTOMATIC PAGE BREAKS
    const pdfDoc = new PDFDocument({
      size: "A4",
      margin: 50,
      autoFirstPage: false, // Prevent automatic page creation
      info: {
        Title: `Proof of Delivery - ${booking.docId}`,
        Author: "Direct Transport Solutions",
        Subject: "Proof of Delivery Document",
        Creator: "Direct Transport Solutions",
      },
    })

    // Manually add the first page
    pdfDoc.addPage()

    const buffers = []
    pdfDoc.on("data", buffers.push.bind(buffers))
    pdfDoc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers)
      const fileName = `pods/${bookingId}.pdf`
      const storageRef = ref(storage, fileName)

      await uploadBytes(storageRef, pdfBuffer, {
        contentType: "application/pdf",
      })

      const downloadURL = await getDownloadURL(storageRef)

      // Email HTML (same as original)
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Proof of Delivery - ${booking.docId}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #2c3e50;
                    background-color: #f8f9fa;
                }
                .email-container {
                    max-width: 650px;
                    margin: 20px auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                }
                .header {
                    background: linear-gradient(135deg, #3498db 0%, #2280bf 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                }
                .header h1 {
                    color: #ffffff;
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    position: relative;
                    z-index: 1;
                }
                .header p {
                    color: rgba(255,255,255,0.9);
                    font-size: 16px;
                    position: relative;
                    z-index: 1;
                }
                .content {
                    padding: 40px 30px;
                }
                .booking-badge {
                    background: linear-gradient(135deg, #2280bf 0%, #3498db 100%);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 50px;
                    font-weight: 700;
                    font-size: 18px;
                    text-align: center;
                    margin: 0 auto 30px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                }
                .greeting {
                    font-size: 18px;
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-weight: 600;
                }
                .message {
                    font-size: 16px;
                    color: #5a6c7d;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .details-card {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 4px solid #3498db;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 15px;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                }
                .detail-label {
                    font-size: 12px;
                    color: #7f8c8d;
                    text-transform: uppercase;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .detail-value {
                    font-size: 14px;
                    color: #2c3e50;
                    font-weight: 500;
                }
                .cta-section {
                    text-align: center;
                    margin: 35px 0;
                }
                .download-btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #2280bf 0%, #3498db 100%);
                    color: white;
                    padding: 16px 32px;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 700;
                    font-size: 16px;
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                    transition: all 0.3s ease;
                }
                .footer {
                    background: #2c3e50;
                    padding: 30px;
                    text-align: center;
                }
                .footer h3 {
                    color: #ffffff;
                    font-size: 20px;
                    margin-bottom: 10px;
                }
                .footer p {
                    color: #bdc3c7;
                    font-size: 14px;
                    margin-bottom: 5px;
                }
                .footer .disclaimer {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #34495e;
                    font-size: 12px;
                    color: #95a5a6;
                }
                @media (max-width: 600px) {
                    .details-grid { grid-template-columns: 1fr; }
                    .content { padding: 25px 20px; }
                    .header { padding: 30px 20px; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>✅ Delivery Completed</h1>
                    <p>Your package has been successfully delivered</p>
                </div>
                
                <div class="content">
                    <div style="text-align: center;">
                        <div class="booking-badge">Job #${booking.docId}</div>
                    </div>
                    
                    <div class="greeting">Hello ${booking.userName},</div>
                    
                    <div class="message">
                        We're delighted to confirm that your delivery has been completed successfully. 
                        Your Proof of Delivery document is ready and attached to this email for your records.
                    </div>
                    
                    <div class="details-card">
                        <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">📦 Delivery Summary</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <div class="detail-label">Pickup</div>
                                <div class="detail-value">${booking.pickupSuburb}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Delivery</div>
                                <div class="detail-value">${booking.deliverySuburb}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Internal Reference 1</div>
                                <div class="detail-value">${booking.internalReference || "N/A"}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Internal Reference 2</div>
                                <div class="detail-value">${booking.internalReference2 || "N/A"}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="cta-section">
                        <a href="${downloadURL}" class="download-btn">
                            📄 Download POD Document
                        </a>
                    </div>
                    
                    <div class="message">
                        If you have any questions about your delivery or need additional assistance, 
                        please don't hesitate to contact our customer service team.
                    </div>
                </div>
                
                <div class="footer">
                    <h3>Direct Transport Solutions</h3>
                    <p>Direct Transport Solutions</p>
                    <p>📧 bookings@directtransport.com.au</p>
                    
                    <div class="disclaimer">
                        This is an automated message generated upon successful delivery completion. 
                        Please do not reply directly to this email. For support, contact our customer service team.
                    </div>
                </div>
            </div>
        </body>
        </html>
      `

      // Send email via Resend
      const emailRes = await resend.emails.send({
        from: "Direct Transport <bookings@directtransport.com.au>",
        to: user.podsEmail,
        subject: `✅ Delivery Complete - POD for Job #${booking.docId}`,
        html: emailHtml,
        attachments: [
          {
            filename: `POD-${booking.docId}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      })

      console.log("Email sent:", emailRes)
      return res.status(200).json({
        message: "POD PDF created and email sent",
        downloadURL,
        emailHtml,
      })
    })

    // CONTROLLED PDF GENERATION - NO AUTOMATIC PAGE BREAKS
    const pageWidth = pdfDoc.page.width
    const pageHeight = pdfDoc.page.height
    const margin = 50
    const contentWidth = pageWidth - margin * 2

    let currentY = 0

    console.log("Starting controlled PDF generation...")

    // === PAGE 1 CONTENT ===

    // Header
    pdfDoc.fillColor("#3498db").rect(0, 0, pageWidth, 100).fill()
    pdfDoc.fillColor("#ffffff").fontSize(24).font("Helvetica-Bold").text("DIRECT TRANSPORT SOLUTIONS", margin, 30)
    currentY = 120

    // Job Badge
    const badgeWidth = 200
    const badgeHeight = 40
    const badgeX = (pageWidth - badgeWidth) / 2
    pdfDoc.fillColor("#2280bf").roundedRect(badgeX, currentY, badgeWidth, badgeHeight, 20).fill()
    pdfDoc
      .fillColor("#ffffff")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`JOB #${booking.docId}`, badgeX, currentY + 13, { width: badgeWidth, align: "center" })
    currentY += 70

    // Customer Information Section
    pdfDoc
      .fillColor("#f8f9fa")
      .rect(margin - 10, currentY - 5, contentWidth + 20, 30)
      .fill()
    pdfDoc
      .fillColor("#2280bf")
      .rect(margin - 10, currentY - 5, 4, 30)
      .fill()
    pdfDoc
      .fillColor("#2c3e50")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("CUSTOMER INFORMATION", margin + 10, currentY + 5)
    currentY += 40

    // Customer Details - CONTROLLED TEXT PLACEMENT
    pdfDoc.fillColor("#2c3e50").fontSize(11).font("Helvetica")
    pdfDoc.text(`Customer Name: ${booking.userName}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Email Address: ${booking.userEmail}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Booking Date: ${booking.date} at ${booking.time}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Job Status: COMPLETED ✓`, margin, currentY, { lineBreak: false })
    currentY += 40

    // Service Details Section
    pdfDoc
      .fillColor("#f8f9fa")
      .rect(margin - 10, currentY - 5, contentWidth + 20, 30)
      .fill()
    pdfDoc
      .fillColor("#2280bf")
      .rect(margin - 10, currentY - 5, 4, 30)
      .fill()
    pdfDoc
      .fillColor("#2c3e50")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("SERVICE DETAILS", margin + 10, currentY + 5)
    currentY += 40

    // Format date helper
    const formatDateTime = (dateString) => {
      if (!dateString) return "Not Available"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid Date"
      return date.toLocaleString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }

    // Service Details - CONTROLLED TEXT PLACEMENT
    pdfDoc.fillColor("#2c3e50").fontSize(11).font("Helvetica")
    pdfDoc.text(`Pickup Company: ${booking?.pickupCompanyName || "N/A"}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Pickup Address: ${booking?.address?.Origin?.label || "N/A"}`, margin, currentY, {
      width: contentWidth,
      height: 20,
      ellipsis: true,
    })
    currentY += 20
    pdfDoc.text(`Delivery Company: ${booking?.dropCompanyName || "N/A"}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Delivery Address: ${booking?.address?.Destination?.label || "N/A"}`, margin, currentY, {
      width: contentWidth,
      height: 20,
      ellipsis: true,
    })
    currentY += 20
    pdfDoc.text(`Internal Reference 1: ${booking?.internalReference || "N/A"}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Internal Reference 2: ${booking?.internalReference2 || "N/A"}`, margin, currentY, { lineBreak: false })
    currentY += 20
    pdfDoc.text(`Pickup Completed: ${formatDateTime(booking?.progressInformation?.pickedup)}`, margin, currentY, {
      lineBreak: false,
    })
    currentY += 20
    pdfDoc.text(`Delivery Completed: ${formatDateTime(booking?.progressInformation?.delivered)}`, margin, currentY, {
      lineBreak: false,
    })
    currentY += 40

    // Signature Section - ONLY IF THERE'S SPACE
    if (booking.signUrl && currentY + 180 < pageHeight - 60) {
      pdfDoc
        .fillColor("#f8f9fa")
        .rect(margin - 10, currentY - 5, contentWidth + 20, 30)
        .fill()
      pdfDoc
        .fillColor("#2280bf")
        .rect(margin - 10, currentY - 5, 4, 30)
        .fill()
      pdfDoc
        .fillColor("#2c3e50")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("CUSTOMER SIGNATURE", margin + 10, currentY + 5)
      currentY += 40

      try {
        const signBuffer = await fetchImageBuffer(booking.signUrl)

        // Signature box
        pdfDoc
          .fillColor("#ffffff")
          .strokeColor("#e1e8ed")
          .lineWidth(1)
          .rect(margin, currentY, contentWidth, 100)
          .fillAndStroke()

        // Signature image
        pdfDoc.image(signBuffer, margin + 10, currentY + 10, {
          fit: [contentWidth - 20, 80],
          align: "center",
          valign: "center",
        })

        currentY += 110

        // Signature details - CONTROLLED PLACEMENT
        pdfDoc.fillColor("#2c3e50").fontSize(10).font("Helvetica")
        pdfDoc.text(`Signed by: ${booking.userName}`, margin, currentY, { lineBreak: false })
        pdfDoc.text(`Date: ${formatDateTime(booking?.progressInformation?.delivered)}`, margin, currentY + 15, {
          lineBreak: false,
        })
        currentY += 40

        console.log("Signature added to page 1")
      } catch (err) {
        console.warn("Signature failed to load:", err.message)
        pdfDoc
          .fillColor("#e53e3e")
          .fontSize(11)
          .font("Helvetica")
          .text("⚠ Signature could not be loaded", margin, currentY, { lineBreak: false })
        currentY += 30
      }
    }

    // Add footer to page 1 - CONTROLLED PLACEMENT
    const footerY = pageHeight - 100
    pdfDoc
      .strokeColor("#2280bf")
      .lineWidth(1)
      .moveTo(margin, footerY)
      .lineTo(pageWidth - margin, footerY)
      .stroke()
    pdfDoc.fillColor("#5a6c7d").fontSize(8).font("Helvetica")
    pdfDoc.text("Direct Transport Solutions | bookings@directtransport.com.au", margin, footerY + 10, {
      lineBreak: false,
    })
    pdfDoc.text("Page 1", pageWidth - margin - 50, footerY + 10, { width: 50, align: "right", lineBreak: false })

    // Images Section - ONLY ADD PAGE 2 IF IMAGES EXIST
    if (Array.isArray(booking.images) && booking.images.length > 0) {
      console.log(`Adding page 2 for ${booking.images.length} images...`)

      // MANUALLY add page 2
      pdfDoc.addPage()
      currentY = 50

      // Add section header
      pdfDoc
        .fillColor("#f8f9fa")
        .rect(margin - 10, currentY - 5, contentWidth + 20, 30)
        .fill()
      pdfDoc
        .fillColor("#2280bf")
        .rect(margin - 10, currentY - 5, 4, 30)
        .fill()
      pdfDoc
        .fillColor("#2c3e50")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("DELIVERY PHOTOGRAPHS", margin + 10, currentY + 5)
      currentY += 40

      const imageWidth = (contentWidth - 20) / 2 // 2 images per row
      const imageHeight = imageWidth * 0.6

      // Process images in pairs - NO ADDITIONAL PAGE BREAKS
      for (let i = 0; i < booking.images.length; i += 2) {
        // Process up to 2 images in this row
        for (let j = 0; j < 2 && i + j < booking.images.length; j++) {
          const imageIndex = i + j
          const imageUrl = booking.images[imageIndex]
          const imageX = margin + j * (imageWidth + 20)

          try {
            const imgBuffer = await fetchImageBuffer(imageUrl)

            // Image border
            pdfDoc
              .fillColor("#ffffff")
              .strokeColor("#e1e8ed")
              .lineWidth(1)
              .rect(imageX, currentY, imageWidth, imageHeight + 30)
              .fillAndStroke()

            // Image
            pdfDoc.image(imgBuffer, imageX + 5, currentY + 5, {
              fit: [imageWidth - 10, imageHeight - 10],
              align: "center",
              valign: "center",
            })

            // Caption - CONTROLLED PLACEMENT
            pdfDoc
              .fillColor("#2c3e50")
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(`Photo ${imageIndex + 1}`, imageX + 5, currentY + imageHeight + 10, {
                width: imageWidth - 10,
                align: "center",
                lineBreak: false,
              })

            console.log(`Image ${imageIndex + 1} added successfully`)
          } catch (err) {
            console.warn(`Image ${imageIndex + 1} failed to load:`, err.message)

            // Error placeholder
            pdfDoc
              .fillColor("#fff5f5")
              .strokeColor("#fed7d7")
              .lineWidth(1)
              .rect(imageX, currentY, imageWidth, imageHeight + 30)
              .fillAndStroke()
            pdfDoc
              .fillColor("#e53e3e")
              .fontSize(10)
              .font("Helvetica")
              .text(`Photo ${imageIndex + 1}\nUnavailable`, imageX + 10, currentY + imageHeight / 2, {
                width: imageWidth - 20,
                align: "center",
                lineBreak: false,
              })
          }
        }

        currentY += imageHeight + 50 // Move to next row
      }

      // Add footer to page 2 - CONTROLLED PLACEMENT
      const footerY2 = pageHeight - 100
      pdfDoc
        .strokeColor("#2280bf")
        .lineWidth(1)
        .moveTo(margin, footerY2)
        .lineTo(pageWidth - margin, footerY2)
        .stroke()
      pdfDoc.fillColor("#5a6c7d").fontSize(8).font("Helvetica")
      pdfDoc.text("Direct Transport Solutions | bookings@directtransport.com.au", margin, footerY2 + 10, {
        lineBreak: false,
      })
      pdfDoc.text("Page 2", pageWidth - margin - 50, footerY2 + 10, { width: 50, align: "right", lineBreak: false })
    } else {
      console.log("No images to process, staying on page 1")
    }

    console.log("PDF generation complete - Should be exactly 1-2 pages")
    pdfDoc.end()
  } catch (error) {
    console.error("Error in sendPodPdf:", error)
    return res.status(500).json({ message: error.message })
  }
}

export default sendPodPdf
