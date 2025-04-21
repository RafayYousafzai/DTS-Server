export default function getTotalInvoicePrice(bookings) {
  // Assuming bookings is an array of objects with a 'price' property
  const totalPrice = bookings.reduce((accumulator, invoice) => {
    return accumulator + parseInt(invoice.totalPrice);
  }, 0);
  const totalGst = bookings.reduce((accumulator, invoice) => {
    return accumulator + invoice.gst;
  }, 0);
  const totalTolls = bookings.reduce((accumulator, invoice) => {
    return accumulator + Number(invoice.totalTollsCost || 0) || 0;
  }, 0);
  const totalUnloading = bookings.reduce((accumulator, invoice) => {
    return accumulator + invoice.unloading || 0;
  }, 0);

  const totalPriceWithGST = bookings.reduce((accumulator, invoice) => {
    return accumulator + invoice.totalPriceWithGST || 0;
  }, 0);

  return {
    totalPrice: totalPrice.toFixed(2),
    totalGst: totalGst.toFixed(2),
    totalTolls: Number(totalTolls).toFixed(2),
    totalUnloading: totalUnloading.toFixed(2),
    totalPriceWithGST: totalPriceWithGST.toFixed(2),
  };
}
