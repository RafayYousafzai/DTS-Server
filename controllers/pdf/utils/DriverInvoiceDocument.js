import getTotalInvoicePrice from "./getTotalInvoicePrice.js";

export default function DriverInvoiceDocument(
  user,
  datesRange,
  pdfId,
  bookings
) {
  const { start, end } = datesRange;
  const { totalPriceWithGST, totalGst } = getTotalInvoicePrice(bookings);

  const paymentPercentage = Number(user?.paymentPercentage) || 1;
  const useGst = user?.includeGst;
  const totalFinalPayment = useGst
    ? Number(totalPriceWithGST)
    : Number(totalPriceWithGST) - Number(totalGst);

  const formattedDate = new Date().toLocaleDateString();

  const calcDayPayment = (bookings) => {
    let totalWithGst = 0;
    let totalWithoutGst = 0;

    bookings.forEach((booking) => {
      totalWithGst += booking.totalPriceWithGST;
      totalWithoutGst += booking.totalPriceWithGST - booking.gst;
    });

    const final = (
      ((useGst ? totalWithGst : totalWithoutGst || 0) / 100) *
      paymentPercentage
    ).toFixed(2);

    return final;
  };

  const bookingsByDate = bookings.reduce((acc, booking) => {
    const formattedDate = new Date(booking.date).toLocaleDateString();
    if (!acc[formattedDate]) {
      acc[formattedDate] = [];
    }
    acc[formattedDate].push(booking);
    return acc;
  }, {});

  const sortedDates = Object.keys(bookingsByDate).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const final_driver_pay = (
    ((totalFinalPayment || 0) / 100) *
    paymentPercentage
  ).toFixed(2);

  return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 30px;
            line-height: 1.4;
            font-size: 13px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: white;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 30px;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .logo-section {
            display: flex;
            flex-direction: column;
          }
          .header img {
            width: 180px;
            height: auto;
            margin-bottom: 15px;
          }
          .company-details {
            display: flex;
            flex-direction: column;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .invoice-details {
            text-align: right;
          }
          .contact-info {
            font-size: 12px;
            line-height: 1.4;
            margin-top: 8px;
          }
          .header-title {
            font-size: 20px;
            margin-bottom: 5px;
          }
          .header-subtitle {
            font-size: 14px;
            margin-bottom: 3px;
          }
          .driver-info {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
          }
          .driver-info h3 {
            font-size: 14px;
            margin: 0 0 10px 0;
          }
          .driver-info div {
            margin-bottom: 4px;
          }
          .table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 15px 0;
            border-radius: 10px;
            overflow: hidden;
          }
          .table th,
          .table td {
            border: 1px solid #e0e0e0;
            padding: 12px;
            text-align: left;
          }
          .table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .table td:last-child,
          .table th:last-child {
            text-align: right;
          }
          .grand-total {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            text-align: right;
          }
          .grand-total-label {
            font-size: 16px;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .grand-total-amount {
            color: #ff0000;
            font-size: 20px;
            font-weight: bold;
          }
          h3 {
            font-size: 16px;
            margin: 20px 0 15px 0;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="container">
            <div class="header">
            <div class="logo-section">
              <img src="https://portal.dts-couriers.com.au/_next/image?url=https%3A%2F%2Fdirecttransport.com.au%2Fwp-content%2Fuploads%2F2023%2F11%2FDirect-Transport-Solutions-2.png&w=384&q=75" alt="Direct Transport Solutions Logo" />
              <div class="contact-info">
                bookings@directtransport.com.au<br />
                1353 The Horsley Dr Wetherill Park NSW 2164<br />
                TEL: (02) 9030 0333
              </div>
            </div>
            <div class="company-details">
              <div class="header-title">Direct Transport Solutions Pty Ltd</div>
              <div class="header-subtitle">ABN 87 658 348 808</div>
              <div class="header-subtitle">RECIPIENT GENERATED INVOICE</div>
            </div>
            <div class="invoice-details">
              <div>Invoice Number: #${pdfId}</div>
              <div>Invoice Date: ${formattedDate}</div>
              <div>Invoice Period: ${start} - ${end}</div>
            </div>
          </div>

          <div class="driver-info">
            <h3>Driver Info</h3>
            <div><strong>Driver:</strong> ${user.firstName || ""}</div>
            <div><strong>Address:</strong> ${
              user.companyAddress || "mian haider ST"
            }</div>
            <div><strong>ABN:</strong> 87 658 348 808</div>
          </div>

          <h3>Bookings</h3>
          <table class="table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>JOBS</th>
                <th>AMOUNT CASH HELD</th>
              </tr>
            </thead>
            <tbody>
              ${sortedDates
                .map(
                  (date) => `
                    <tr>
                      <td>${date}</td>
                      <td>${bookingsByDate[date].length}</td>
                      <td>$${calcDayPayment(bookingsByDate[date])}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>

          <div class="grand-total">
            <div class="grand-total-label">Grand Total</div>
            <div class="grand-total-amount">$${final_driver_pay}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}
